"""
routers/estate.py — Commercial farms (checklist 1.9) on the organisation model (type 'commercial_farm').

Farm team (estate:manage; the farm's manager and agronomist staff are members of the organisation):
  GET  /api/estate/overview                 blocks with crop stage, latest scouting, disease activity nearby, alerts
  POST /api/estate/blocks                   add a field / block     PUT, DELETE /api/estate/blocks/{id}
  GET/POST /api/estate/blocks/{id}/scouting scouting observations (disease, severity, % plants affected)
  GET  /api/estate/report.csv               blocks, areas, stages and expected harvest month
Per-hectare subscriptions are not built (paid feature, product owner's decision).
"""

from __future__ import annotations

import csv
import io
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from backend import admin_areas
from backend.advisory.adapters.weather import cached_elevation
from backend.advisory.calendar import calendar_rules, season_calendar
from backend.advisory.config import local_now, setting_float, setting_int
from backend.advisory.context import nearby_disease_activity
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection, pquery, pquery_one
from backend.routers.input_trust import org_for

router = APIRouter(prefix="/estate", tags=["estate"])
_estate = require_permission(P.ESTATE_MANAGE)

SCHEMA = """
CREATE TABLE IF NOT EXISTS estate_blocks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id        INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    area_ha       REAL NOT NULL CHECK (area_ha > 0),
    crop          TEXT NOT NULL,
    variety       TEXT,
    season        TEXT NOT NULL DEFAULT 'irrigated' CHECK (season IN ('meher','belg','irrigated')),
    planting_date TEXT,
    expected_harvest_date TEXT,
    woreda_pcode  TEXT,
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','harvested','fallow')),
    created_at    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS estate_scouting (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id      INTEGER NOT NULL REFERENCES estate_blocks(id) ON DELETE CASCADE,
    disease_key   TEXT REFERENCES diseases(key),
    severity      TEXT NOT NULL CHECK (severity IN ('none','low','medium','high')),
    incidence_pct REAL CHECK (incidence_pct BETWEEN 0 AND 100),
    note          TEXT,
    recorded_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at    TEXT NOT NULL
);
"""


def ensure_schema(conn) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def _now() -> str:
    return local_now().isoformat(sep=" ", timespec="seconds")


def _org(user: dict, org_id: int | None) -> dict:
    return org_for(user, org_id, "commercial_farm")


class BlockIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    area_ha: float = Field(..., gt=0, le=100_000)
    crop: str = Field(..., min_length=2, max_length=40)
    variety: str | None = Field(None, max_length=60)
    season: Literal["meher", "belg", "irrigated"] = "irrigated"
    planting_date: date | None = None
    expected_harvest_date: date | None = None
    woreda_pcode: str | None = None
    status: Literal["active", "harvested", "fallow"] = "active"


def _check_block(req: BlockIn) -> None:
    if req.woreda_pcode:
        a = admin_areas.get_area(get_platform_connection(), req.woreda_pcode)
        if not a or a.level != 3:
            raise HTTPException(400, "Choose the block's woreda.")
    if req.planting_date and req.expected_harvest_date and req.expected_harvest_date <= req.planting_date:
        raise HTTPException(400, "Expected harvest must be after planting.")


def _block(org: dict, block_id: int) -> dict:
    b = pquery_one("SELECT * FROM estate_blocks WHERE id = ? AND org_id = ?", (block_id, org["id"]))
    if not b:
        raise HTTPException(404, "Block not found")
    return b


@router.post("/blocks", status_code=201)
async def add_block(req: BlockIn, org_id: int | None = None, user: dict = Depends(_estate)):
    org = _org(user, org_id)
    _check_block(req)
    conn = get_platform_connection()
    with conn:
        cur = conn.execute(
            """INSERT INTO estate_blocks (org_id, name, area_ha, crop, variety, season, planting_date, expected_harvest_date,
                 woreda_pcode, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (org["id"], req.name.strip(), req.area_ha, req.crop.strip().lower(), req.variety, req.season,
             req.planting_date.isoformat() if req.planting_date else None,
             req.expected_harvest_date.isoformat() if req.expected_harvest_date else None,
             req.woreda_pcode or org.get("woreda_pcode"), req.status, _now()))
    return pquery_one("SELECT * FROM estate_blocks WHERE id = ?", (cur.lastrowid,))


@router.put("/blocks/{block_id}")
async def update_block(block_id: int, req: BlockIn, org_id: int | None = None, user: dict = Depends(_estate)):
    org = _org(user, org_id)
    _block(org, block_id)
    _check_block(req)
    conn = get_platform_connection()
    with conn:
        conn.execute(
            """UPDATE estate_blocks SET name=?, area_ha=?, crop=?, variety=?, season=?, planting_date=?, expected_harvest_date=?,
                 woreda_pcode=?, status=? WHERE id=?""",
            (req.name.strip(), req.area_ha, req.crop.strip().lower(), req.variety, req.season,
             req.planting_date.isoformat() if req.planting_date else None,
             req.expected_harvest_date.isoformat() if req.expected_harvest_date else None,
             req.woreda_pcode or org.get("woreda_pcode"), req.status, block_id))
    return pquery_one("SELECT * FROM estate_blocks WHERE id = ?", (block_id,))


@router.delete("/blocks/{block_id}", status_code=204)
async def delete_block(block_id: int, org_id: int | None = None, user: dict = Depends(_estate)):
    org = _org(user, org_id)
    _block(org, block_id)
    conn = get_platform_connection()
    with conn:
        conn.execute("DELETE FROM estate_blocks WHERE id = ?", (block_id,))


class ScoutIn(BaseModel):
    disease_key: str | None = None
    severity: Literal["none", "low", "medium", "high"]
    incidence_pct: float | None = Field(None, ge=0, le=100)
    note: str | None = Field(None, max_length=500)


@router.post("/blocks/{block_id}/scouting", status_code=201)
async def scout(block_id: int, req: ScoutIn, org_id: int | None = None, user: dict = Depends(_estate)):
    org = _org(user, org_id)
    _block(org, block_id)
    if req.disease_key and not pquery_one("SELECT key FROM diseases WHERE key = ?", (req.disease_key,)):
        raise HTTPException(400, "Unknown disease")
    if req.severity != "none" and not req.disease_key:
        raise HTTPException(400, "Choose the disease you saw.")
    conn = get_platform_connection()
    with conn:
        cur = conn.execute("""INSERT INTO estate_scouting (block_id, disease_key, severity, incidence_pct, note, recorded_by, created_at)
                              VALUES (?,?,?,?,?,?,?)""",
                           (block_id, req.disease_key, req.severity, req.incidence_pct, req.note, user["id"], _now()))
    return pquery_one("SELECT * FROM estate_scouting WHERE id = ?", (cur.lastrowid,))


@router.get("/blocks/{block_id}/scouting")
async def scouting(block_id: int, org_id: int | None = None, user: dict = Depends(_estate)):
    org = _org(user, org_id)
    _block(org, block_id)
    return pquery("""SELECT s.*, u.name AS recorded_by_name FROM estate_scouting s LEFT JOIN users u ON u.id = s.recorded_by
                     WHERE s.block_id = ? ORDER BY s.id DESC LIMIT 100""", (block_id,))


def overview_data(org: dict) -> dict:
    conn = get_platform_connection()
    rules = calendar_rules(conn)
    now = local_now()
    radius = setting_float("outbreak_radius_km", 10, conn)
    window = setting_int("outbreak_window_days", 14, conn)
    threshold = setting_int("outbreak_min_scans", 3, conn)
    blocks, alerts = [], []
    for b in pquery("SELECT * FROM estate_blocks WHERE org_id = ? ORDER BY status, name", (org["id"],)):
        area = admin_areas.get_area(conn, b["woreda_pcode"]) if b["woreda_pcode"] else None
        altitude = cached_elevation(area.latitude, area.longitude) if area and area.latitude is not None else None
        cal = None
        if b["status"] == "active" and b["planting_date"]:
            cal = season_calendar(rules, {"id": b["id"], "farm_id": None, "field_name": b["name"], "crop": b["crop"],
                                          "variety": b["variety"], "season": b["season"], "planting_date": b["planting_date"]},
                                  altitude, now.date())
        last = pquery_one("""SELECT disease_key, severity, incidence_pct, created_at FROM estate_scouting
                             WHERE block_id = ? ORDER BY id DESC LIMIT 1""", (b["id"],))
        nearby = []
        if area and area.latitude is not None:
            nearby = [a for a in nearby_disease_activity(conn, area.latitude, area.longitude, now, radius_km=radius, days=window)
                      if a["scans"] >= threshold]
        stage = (cal or {}).get("current_stage") or {}
        harvest = b["expected_harvest_date"] or ((cal or {}).get("stages") or [{}])[-1].get("end_date")
        row = {**b, "woreda": area.name if area else None, "stage_key": stage.get("stage_key"),
               "days_after_planting": (cal or {}).get("days_after_planting"),
               "next_stage": (cal or {}).get("next_stage"), "expected_harvest": harvest,
               "harvest_estimated": not b["expected_harvest_date"] and bool(harvest),
               "last_scouting": last, "nearby": [{"disease_key": a["disease_key"], "disease": a["disease"], "farms": a["farms"],
                                                 "nearest_km": a["nearest_km"]} for a in nearby]}
        blocks.append(row)
        if last and last["severity"] in ("medium", "high"):
            alerts.append({"block_id": b["id"], "block": b["name"], "kind": "scouting", "disease_key": last["disease_key"],
                           "severity": last["severity"], "date": last["created_at"]})
        for a in row["nearby"]:
            alerts.append({"block_id": b["id"], "block": b["name"], "kind": "nearby", "disease_key": a["disease_key"],
                           "disease": a["disease"], "farms": a["farms"], "nearest_km": a["nearest_km"]})
    team = pquery("""SELECT u.id, u.name, u.phone, m.member_role FROM organisation_members m JOIN users u ON u.id = m.user_id
                     WHERE m.org_id = ? ORDER BY m.member_role DESC, u.name""", (org["id"],))
    active = [b for b in blocks if b["status"] == "active"]
    return {"org": org, "blocks": blocks, "alerts": alerts, "team": team,
            "totals": {"blocks": len(active), "area_ha": round(sum(b["area_ha"] for b in active), 1)}}


@router.get("/diseases")
async def diseases(language: str | None = None, user: dict = Depends(_estate)):
    """Choices for scouting, in the user's language."""
    from backend.advisory.diagnosis import disease_names

    names = disease_names(get_platform_connection(), language or user.get("language") or "en")
    return [{"key": r["key"], "name": names.get(r["key"], r["key"]), "is_disease": bool(r["is_disease"])}
            for r in pquery("SELECT key, is_disease FROM diseases WHERE is_disease = 1 ORDER BY key")]


@router.get("/overview")
async def overview(org_id: int | None = None, user: dict = Depends(_estate)):
    return overview_data(_org(user, org_id))


@router.get("/report.csv")
async def report(org_id: int | None = None, user: dict = Depends(_estate)):
    data = overview_data(_org(user, org_id))
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["block", "status", "crop", "variety", "season", "area_ha", "planting_date", "days_after_planting", "stage",
                "expected_harvest", "harvest_estimated", "woreda", "last_scouting", "last_severity"])
    for b in data["blocks"]:
        ls = b["last_scouting"] or {}
        w.writerow([b["name"], b["status"], b["crop"], b["variety"] or "", b["season"], b["area_ha"], b["planting_date"] or "",
                    b["days_after_planting"] if b["days_after_planting"] is not None else "", b["stage_key"] or "",
                    b["expected_harvest"] or "", "yes" if b["harvest_estimated"] else "no", b["woreda"] or "",
                    ls.get("disease_key") or "", ls.get("severity") or ""])
    return Response("﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="farm-blocks.csv"'})

