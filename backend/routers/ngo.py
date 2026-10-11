"""
routers/ngo.py — NGO / development project workspace (checklist 1.12), organisation type 'ngo'.

NGO staff (ngo:manage), for their own organisation:
  GET/POST /api/ngo/projects                 projects     PUT /api/ngo/projects/{id}
  POST/DELETE /api/ngo/projects/{id}/areas   enrol / remove woredas (the project's area)
  POST /api/ngo/projects/{id}/broadcast      advisory message to farmers in the area (alert consent + weekly cap)
  GET  /api/ngo/projects/{id}/impact         reach and outcomes in the area since the project started
                                             (aggregated, small numbers hidden; reuses backend/reports.py)
  GET  /api/ngo/projects/{id}/impact.csv
"""

from __future__ import annotations

import csv
import io
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from backend import admin_areas, reports
from backend.advisory.config import local_now, setting_int
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection, pquery, pquery_one
from backend.routers.input_trust import org_for

router = APIRouter(prefix="/ngo", tags=["ngo"])
_ngo = require_permission(P.NGO_MANAGE)

SCHEMA = """
CREATE TABLE IF NOT EXISTS ngo_projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id      INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    start_date  TEXT NOT NULL,
    end_date    TEXT,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
    created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ngo_project_areas (
    project_id   INTEGER NOT NULL REFERENCES ngo_projects(id) ON DELETE CASCADE,
    woreda_pcode TEXT NOT NULL,
    PRIMARY KEY (project_id, woreda_pcode)
);
"""


def ensure_schema(conn) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def _now() -> str:
    return local_now().isoformat(sep=" ", timespec="seconds")


def _org(user: dict, org_id: int | None) -> dict:
    return org_for(user, org_id, "ngo")


def _project(org: dict, project_id: int) -> dict:
    p = pquery_one("SELECT * FROM ngo_projects WHERE id = ? AND org_id = ?", (project_id, org["id"]))
    if not p:
        raise HTTPException(404, "Project not found")
    return p


def _areas(project_id: int) -> list[dict]:
    return pquery("""SELECT a.woreda_pcode, w.name AS woreda, z.name AS zone FROM ngo_project_areas a
                     LEFT JOIN admin_areas w ON w.pcode = a.woreda_pcode LEFT JOIN admin_areas z ON z.pcode = w.parent_pcode
                     WHERE a.project_id = ? ORDER BY w.name""", (project_id,))


class ProjectIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: str | None = Field(None, max_length=1000)
    start_date: date
    end_date: date | None = None
    status: Literal["active", "closed"] = "active"


@router.get("/projects")
async def projects(org_id: int | None = None, user: dict = Depends(_ngo)):
    org = _org(user, org_id)
    rows = pquery("SELECT * FROM ngo_projects WHERE org_id = ? ORDER BY status, start_date DESC", (org["id"],))
    for r in rows:
        r["areas"] = _areas(r["id"])
    return {"org": org, "projects": rows}


@router.post("/projects", status_code=201)
async def create_project(req: ProjectIn, org_id: int | None = None, user: dict = Depends(_ngo)):
    org = _org(user, org_id)
    if req.end_date and req.end_date < req.start_date:
        raise HTTPException(400, "The end date must be after the start date.")
    conn = get_platform_connection()
    with conn:
        cur = conn.execute("""INSERT INTO ngo_projects (org_id, name, description, start_date, end_date, status, created_at)
                              VALUES (?,?,?,?,?,?,?)""",
                           (org["id"], req.name.strip(), req.description, req.start_date.isoformat(),
                            req.end_date.isoformat() if req.end_date else None, req.status, _now()))
    return pquery_one("SELECT * FROM ngo_projects WHERE id = ?", (cur.lastrowid,))


@router.put("/projects/{project_id}")
async def update_project(project_id: int, req: ProjectIn, org_id: int | None = None, user: dict = Depends(_ngo)):
    org = _org(user, org_id)
    _project(org, project_id)
    if req.end_date and req.end_date < req.start_date:
        raise HTTPException(400, "The end date must be after the start date.")
    conn = get_platform_connection()
    with conn:
        conn.execute("UPDATE ngo_projects SET name=?, description=?, start_date=?, end_date=?, status=? WHERE id=?",
                     (req.name.strip(), req.description, req.start_date.isoformat(),
                      req.end_date.isoformat() if req.end_date else None, req.status, project_id))
    return pquery_one("SELECT * FROM ngo_projects WHERE id = ?", (project_id,))


class AreaIn(BaseModel):
    woreda_pcode: str


@router.post("/projects/{project_id}/areas", status_code=201)
async def add_area(project_id: int, req: AreaIn, org_id: int | None = None, user: dict = Depends(_ngo)):
    org = _org(user, org_id)
    _project(org, project_id)
    a = admin_areas.get_area(get_platform_connection(), req.woreda_pcode)
    if not a or a.level != 3:
        raise HTTPException(400, "Choose a woreda.")
    conn = get_platform_connection()
    with conn:
        conn.execute("INSERT OR IGNORE INTO ngo_project_areas (project_id, woreda_pcode) VALUES (?, ?)", (project_id, a.pcode))
    return {"project_id": project_id, "areas": _areas(project_id)}


@router.delete("/projects/{project_id}/areas/{woreda_pcode}", status_code=204)
async def remove_area(project_id: int, woreda_pcode: str, org_id: int | None = None, user: dict = Depends(_ngo)):
    org = _org(user, org_id)
    _project(org, project_id)
    conn = get_platform_connection()
    with conn:
        conn.execute("DELETE FROM ngo_project_areas WHERE project_id = ? AND woreda_pcode = ?", (project_id, woreda_pcode))


class BroadcastIn(BaseModel):
    text: str = Field(..., min_length=3, max_length=500)


@router.post("/projects/{project_id}/broadcast")
async def broadcast(project_id: int, req: BroadcastIn, org_id: int | None = None, user: dict = Depends(_ngo)):
    """One alert per active farmer in the project's woredas who has alert consent; weekly caps apply."""
    from backend.advisory.alerts import CycleReport, _insert_alert

    org = _org(user, org_id)
    project = _project(org, project_id)
    areas = [a["woreda_pcode"] for a in _areas(project_id)]
    if not areas:
        raise HTTPException(400, "Add the project's woredas first.")
    if project["status"] != "active":
        raise HTTPException(409, "This project is closed.")
    conn = get_platform_connection()
    farmers = pquery(f"""SELECT u.id, p.consent_alerts, p.max_alerts_per_week, p.alert_channel
                         FROM users u LEFT JOIN farmer_profiles p ON p.user_id = u.id
                         WHERE u.role = 'farmer' AND u.is_active = 1 AND u.woreda_pcode IN ({','.join('?' * len(areas))})""",
                     tuple(areas))
    report = CycleReport()
    now = local_now()
    stamp = now.strftime("%Y%m%d%H%M%S")
    default_cap = setting_int("max_alerts_per_week", 3, conn)
    sent = 0
    with conn:
        for f in farmers:
            status = _insert_alert(conn, report, now, farmer_id=f["id"], type_="ngo_message", severity="info",
                                   message_key="ngo_message", payload={"org": org["name"], "project": project["name"],
                                                                       "text": req.text.strip()},
                                   dedupe=f"ngo:{project_id}:{f['id']}:{stamp}", consent=bool(f["consent_alerts"]),
                                   cap=f["max_alerts_per_week"], default_cap=default_cap, channel=f["alert_channel"])
            sent += status == "queued"
    return {"sent": reports.suppress(sent), "farmers_in_area": reports.suppress(len(farmers)),
            "not_sent": reports.suppress(report.skipped_no_consent + report.suppressed)}


def impact(project: dict) -> dict:
    areas = [a["woreda_pcode"] for a in _areas(project["id"])]
    if not areas:
        return {"project": project, "areas": [], "summary": None}
    start = date.fromisoformat(project["start_date"])
    days = max(1, (local_now().date() - start).days + 1)
    summary = reports.area_summary(get_platform_connection(), areas, days, local_now())
    return {"project": project, "areas": _areas(project["id"]), "summary": summary}


@router.get("/projects/{project_id}/impact")
async def get_impact(project_id: int, org_id: int | None = None, user: dict = Depends(_ngo)):
    return impact(_project(_org(user, org_id), project_id))


@router.get("/projects/{project_id}/impact.csv")
async def impact_csv(project_id: int, org_id: int | None = None, user: dict = Depends(_ngo)):
    data = impact(_project(_org(user, org_id), project_id))
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["project", data["project"]["name"], "since", data["project"]["start_date"]])
    cols = ["farmers", "farmers_reached", "questions", "photo_checks", "outcome_improved", "outcome_same", "outcome_worse",
            "outbreak_alerts", "escalations"]
    w.writerow(["woreda", "zone", *cols])
    for r in (data["summary"] or {}).get("woredas", []):
        w.writerow([r["woreda"], r["zone"], *[r[c] for c in cols]])
    if data["summary"]:
        w.writerow(["TOTAL", "", *[data["summary"]["totals"][c] for c in cols]])
    w.writerow(["Counts of 1-4 are shown as <5 so no farmer can be identified."])
    return Response("﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="impact-project-{project_id}.csv"'})
