"""
routers/abc.py — Farmer Agribusiness Companies (ABCs, checklist 1.8) and trader buy requests (1.5).

ABC manager (abc:manage), for their own organisation (type 'abc'):
  GET  /api/abc/overview                     members, area by crop, contributions, harvest outlook (dashboard)
  POST /api/abc/members                      invite a farmer by phone (the farmer must accept in the app)
  DELETE /api/abc/members/{farmer_id}
  GET/POST /api/abc/contributions            shareholder contributions: land / livestock / labour (a record only)
  GET  /api/abc/planning                     members' crops by stage and upcoming stages (input planning)
  POST /api/abc/broadcast                    message to accepted members (alert consent + weekly cap apply)
  GET  /api/abc/report.csv                   ABC report for ATI (counts and areas only)
  GET  /api/abc/buy-requests                 open trader requests in the ABC's region; POST .../{id}/respond
Farmer (profile:manage):
  GET  /api/users/abc-invitations            POST /api/users/abc-invitations/{org_id}/accept|decline
Trader (trade:request):
  GET/POST /api/trade/buy-requests           own requests with ABC responses; POST /{id}/close
"""

from __future__ import annotations

import csv
import io
from collections import defaultdict
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from backend.advisory.config import local_now, setting_int
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection, pquery, pquery_one
from backend.routers.input_trust import org_for

router = APIRouter(tags=["abc"])
_abc = require_permission(P.ABC_MANAGE)
_farmer = require_permission(P.PROFILE_MANAGE)
_trade = require_permission(P.TRADE_REQUEST)

SCHEMA = """
CREATE TABLE IF NOT EXISTS abc_members (
    org_id     INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    farmer_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','declined')),
    invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    invited_at TEXT NOT NULL,
    joined_at  TEXT,
    PRIMARY KEY (org_id, farmer_id)
);
CREATE TABLE IF NOT EXISTS abc_contributions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id      INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    farmer_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK (kind IN ('land','livestock','labour')),
    description TEXT,
    quantity    REAL,
    unit        TEXT,
    recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS buy_requests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    trader_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    crop         TEXT NOT NULL,
    quantity_qt  REAL NOT NULL CHECK (quantity_qt > 0),
    region_pcode TEXT,
    needed_by    TEXT,
    note         TEXT,
    status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
    created_at   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS buy_request_responses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id  INTEGER NOT NULL REFERENCES buy_requests(id) ON DELETE CASCADE,
    org_id      INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    quantity_qt REAL,
    message     TEXT NOT NULL,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TEXT NOT NULL
);
"""


def ensure_schema(conn) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def _now() -> str:
    return local_now().isoformat(sep=" ", timespec="seconds")


def _org(user: dict, org_id: int | None) -> dict:
    return org_for(user, org_id, "abc")


def _active_members(org_id: int) -> list[dict]:
    return pquery("""SELECT u.id, u.name, u.phone, u.woreda, m.joined_at FROM abc_members m JOIN users u ON u.id = m.farmer_id
                     WHERE m.org_id = ? AND m.status = 'active' AND u.is_active = 1 ORDER BY u.name""", (org_id,))


# ── Members ───────────────────────────────────────────────────────────────────

class InviteIn(BaseModel):
    phone: str


@router.post("/abc/members", status_code=201)
async def invite(req: InviteIn, org_id: int | None = None, user: dict = Depends(_abc)):
    """Invite a registered farmer; nothing about them is visible to the ABC until they accept."""
    org = _org(user, org_id)
    f = pquery_one("SELECT id, role FROM users WHERE phone = ? AND is_active = 1", (req.phone.strip(),))
    if not f or f["role"] != "farmer":
        raise HTTPException(404, "No farmer with this phone number. Ask the DA to register the farmer first.")
    conn = get_platform_connection()
    existing = pquery_one("SELECT status FROM abc_members WHERE org_id = ? AND farmer_id = ?", (org["id"], f["id"]))
    if existing and existing["status"] == "active":
        raise HTTPException(409, "Already a member.")
    with conn:
        conn.execute("""INSERT INTO abc_members (org_id, farmer_id, status, invited_by, invited_at) VALUES (?,?, 'invited', ?, ?)
                        ON CONFLICT(org_id, farmer_id) DO UPDATE SET status='invited', invited_by=excluded.invited_by,
                          invited_at=excluded.invited_at, joined_at=NULL""", (org["id"], f["id"], user["id"], _now()))
    return {"farmer_id": f["id"], "status": "invited"}


@router.delete("/abc/members/{farmer_id}", status_code=204)
async def remove_member(farmer_id: int, org_id: int | None = None, user: dict = Depends(_abc)):
    org = _org(user, org_id)
    conn = get_platform_connection()
    with conn:
        conn.execute("DELETE FROM abc_members WHERE org_id = ? AND farmer_id = ?", (org["id"], farmer_id))


@router.get("/users/abc-invitations")
async def my_invitations(user: dict = Depends(_farmer)):
    return pquery("""SELECT o.id AS org_id, o.name, m.status, m.invited_at, m.joined_at FROM abc_members m
                     JOIN organisations o ON o.id = m.org_id WHERE m.farmer_id = ? AND m.status IN ('invited','active')
                     ORDER BY m.invited_at DESC""", (user["id"],))


@router.post("/users/abc-invitations/{org_id}/{decision}")
async def decide_invitation(org_id: int, decision: Literal["accept", "decline", "leave"], user: dict = Depends(_farmer)):
    """Accepting shares my plots, crop seasons and contributions with this ABC's managers. Leaving stops it."""
    m = pquery_one("SELECT status FROM abc_members WHERE org_id = ? AND farmer_id = ?", (org_id, user["id"]))
    if not m:
        raise HTTPException(404, "No invitation")
    status = {"accept": "active", "decline": "declined", "leave": "declined"}[decision]
    conn = get_platform_connection()
    with conn:
        conn.execute("UPDATE abc_members SET status = ?, joined_at = ? WHERE org_id = ? AND farmer_id = ?",
                     (status, _now() if status == "active" else None, org_id, user["id"]))
    return {"org_id": org_id, "status": status}


# ── Contributions ─────────────────────────────────────────────────────────────

class ContributionIn(BaseModel):
    farmer_id: int
    kind: Literal["land", "livestock", "labour"]
    description: str | None = Field(None, max_length=300)
    quantity: float | None = Field(None, ge=0)
    unit: str | None = Field(None, max_length=30)


@router.get("/abc/contributions")
async def contributions(org_id: int | None = None, user: dict = Depends(_abc)):
    org = _org(user, org_id)
    return pquery("""SELECT c.*, u.name AS farmer_name FROM abc_contributions c JOIN users u ON u.id = c.farmer_id
                     WHERE c.org_id = ? ORDER BY c.id DESC""", (org["id"],))


@router.post("/abc/contributions", status_code=201)
async def add_contribution(req: ContributionIn, org_id: int | None = None, user: dict = Depends(_abc)):
    org = _org(user, org_id)
    if not any(m["id"] == req.farmer_id for m in _active_members(org["id"])):
        raise HTTPException(400, "Only members who accepted can have contributions recorded.")
    conn = get_platform_connection()
    with conn:
        cur = conn.execute("""INSERT INTO abc_contributions (org_id, farmer_id, kind, description, quantity, unit, recorded_by, created_at)
                              VALUES (?,?,?,?,?,?,?,?)""",
                           (org["id"], req.farmer_id, req.kind, req.description, req.quantity, req.unit, user["id"], _now()))
    return pquery_one("SELECT * FROM abc_contributions WHERE id = ?", (cur.lastrowid,))


# ── Planning: crops by stage, harvest outlook ─────────────────────────────────

def _member_seasons(org_id: int) -> list[dict]:
    return pquery("""SELECT s.*, f.user_id AS farmer_id, COALESCE(f.area_ha, 0) AS area_ha, f.field_name
                     FROM crop_seasons s JOIN farms f ON f.id = s.farm_id
                     JOIN abc_members m ON m.farmer_id = f.user_id AND m.org_id = ? AND m.status = 'active'
                     WHERE s.status = 'active'""", (org_id,))


def planning(org_id: int) -> dict:
    """Area by crop and current stage, stages starting in the next 21 days, harvest months. No quantities."""
    from backend.advisory.calendar import calendar_rules, farmer_point, season_calendar

    conn = get_platform_connection()
    rules = calendar_rules(conn)
    today = local_now().date()
    by_stage = defaultdict(lambda: {"farms": 0, "area_ha": 0.0})
    upcoming = defaultdict(lambda: {"farms": 0, "area_ha": 0.0, "first_date": None})
    harvest = defaultdict(lambda: {"farms": 0, "area_ha": 0.0})
    altitude: dict[int, float | None] = {}
    for s in _member_seasons(org_id):
        if s["farmer_id"] not in altitude:
            altitude[s["farmer_id"]] = farmer_point(conn, s["farmer_id"])[2]
        cal = season_calendar(rules, s, altitude[s["farmer_id"]], today)
        stage = (cal["current_stage"] or {}).get("stage_key") or "unknown"
        g = by_stage[(s["crop"], stage)]
        g["farms"] += 1
        g["area_ha"] += s["area_ha"]
        nxt = cal["next_stage"]
        if nxt and nxt["in_days"] <= 21:
            u = upcoming[(s["crop"], nxt["stage_key"])]
            u["farms"] += 1
            u["area_ha"] += s["area_ha"]
            u["first_date"] = min(filter(None, [u["first_date"], nxt["start_date"]]))
        month = s["expected_harvest_date"][:7] if s.get("expected_harvest_date") else (
            cal["stages"][-1]["end_date"][:7] if cal["stages"] else "unknown")
        h = harvest[(s["crop"], month)]
        h["farms"] += 1
        h["area_ha"] += s["area_ha"]
    pack = lambda d, *names: [  # noqa: E731
        {**dict(zip(names, k)), **{kk: (round(vv, 1) if isinstance(vv, float) else vv) for kk, vv in v.items()}}
        for k, v in sorted(d.items())]
    return {"by_stage": pack(by_stage, "crop", "stage_key"), "upcoming": pack(upcoming, "crop", "stage_key"),
            "harvest": pack(harvest, "crop", "month"), "quantities_note": "PLACEHOLDER_VERIFY: input quantities need the MoA rates; ask the DA"}


@router.get("/abc/planning")
async def get_planning(org_id: int | None = None, user: dict = Depends(_abc)):
    return planning(_org(user, org_id)["id"])


@router.get("/abc/overview")
async def overview(org_id: int | None = None, user: dict = Depends(_abc)):
    org = _org(user, org_id)
    members = _active_members(org["id"])
    invited = pquery("""SELECT u.id, u.name, u.phone, m.invited_at FROM abc_members m JOIN users u ON u.id = m.farmer_id
                        WHERE m.org_id = ? AND m.status = 'invited'""", (org["id"],))
    contrib = pquery("""SELECT kind, COUNT(*) AS n, SUM(COALESCE(quantity, 0)) AS quantity, MAX(unit) AS unit
                        FROM abc_contributions WHERE org_id = ? GROUP BY kind""", (org["id"],))
    area = pquery("""SELECT lower(s.crop) AS crop, COUNT(DISTINCT f.id) AS farms, ROUND(SUM(COALESCE(f.area_ha, 0)), 1) AS area_ha
                     FROM crop_seasons s JOIN farms f ON f.id = s.farm_id
                     JOIN abc_members m ON m.farmer_id = f.user_id AND m.org_id = ? AND m.status = 'active'
                     WHERE s.status = 'active' GROUP BY lower(s.crop) ORDER BY area_ha DESC""", (org["id"],))
    return {"org": org, "members": members, "invited": invited, "contributions": contrib, "crops": area,
            "contributions_note": "A record kept by the ABC, not a legal document."}


# ── Messages to members ───────────────────────────────────────────────────────

class BroadcastIn(BaseModel):
    text: str = Field(..., min_length=3, max_length=500)


@router.post("/abc/broadcast")
async def broadcast(req: BroadcastIn, org_id: int | None = None, user: dict = Depends(_abc)):
    """One alert per accepted member; members without alert consent are skipped, weekly caps apply."""
    from backend.advisory.alerts import CycleReport, _insert_alert

    org = _org(user, org_id)
    conn = get_platform_connection()
    report = CycleReport()
    now = local_now()
    stamp = now.strftime("%Y%m%d%H%M%S")
    sent = 0
    default_cap = setting_int("max_alerts_per_week", 3, conn)
    with conn:
        for m in _active_members(org["id"]):
            p = pquery_one("SELECT consent_alerts, max_alerts_per_week, alert_channel FROM farmer_profiles WHERE user_id = ?",
                           (m["id"],)) or {}
            status = _insert_alert(conn, report, now, farmer_id=m["id"], type_="abc_message", severity="info",
                                   message_key="abc_message", payload={"org": org["name"], "text": req.text.strip()},
                                   dedupe=f"abc:{org['id']}:{m['id']}:{stamp}", consent=bool(p.get("consent_alerts")),
                                   cap=p.get("max_alerts_per_week"), default_cap=default_cap, channel=p.get("alert_channel"))
            sent += status == "queued"
    return {"sent": sent, "suppressed": report.suppressed, "no_consent": report.skipped_no_consent}


# ── Report for ATI ────────────────────────────────────────────────────────────

@router.get("/abc/report.csv")
async def report_csv(org_id: int | None = None, user: dict = Depends(_abc)):
    org = _org(user, org_id)
    ov = await overview(org_id, user)
    plan = planning(org["id"])
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["ABC report", org["name"], local_now().date().isoformat()])
    w.writerow(["members (accepted)", len(ov["members"])])
    w.writerow(["invitations pending", len(ov["invited"])])
    w.writerow([])
    w.writerow(["crop", "farms", "area_ha"])
    for c in ov["crops"]:
        w.writerow([c["crop"], c["farms"], c["area_ha"]])
    w.writerow([])
    w.writerow(["contribution kind", "records", "total quantity", "unit"])
    for c in ov["contributions"]:
        w.writerow([c["kind"], c["n"], c["quantity"], c["unit"] or ""])
    w.writerow([])
    w.writerow(["harvest: crop", "month", "farms", "area_ha"])
    for h in plan["harvest"]:
        w.writerow([h["crop"], h["month"], h["farms"], h["area_ha"]])
    w.writerow([])
    w.writerow([ov["contributions_note"]])
    return Response("﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="abc-report.csv"'})


# ── Buy requests (traders ↔ ABCs) ─────────────────────────────────────────────

class BuyRequestIn(BaseModel):
    crop: str = Field(..., min_length=2, max_length=40)
    quantity_qt: float = Field(..., gt=0, le=1_000_000)
    region_pcode: str | None = None
    needed_by: date | None = None
    note: str | None = Field(None, max_length=500)


@router.get("/trade/buy-requests")
async def my_buy_requests(user: dict = Depends(_trade)):
    rows = pquery("""SELECT b.*, r.name AS region FROM buy_requests b LEFT JOIN admin_areas r ON r.pcode = b.region_pcode
                     WHERE b.trader_id = ? ORDER BY b.id DESC""", (user["id"],))
    for b in rows:
        b["responses"] = pquery("""SELECT x.quantity_qt, x.message, x.created_at, o.name AS abc, o.phone FROM buy_request_responses x
                                   JOIN organisations o ON o.id = x.org_id WHERE x.request_id = ? ORDER BY x.id""", (b["id"],))
    return rows


@router.post("/trade/buy-requests", status_code=201)
async def create_buy_request(req: BuyRequestIn, user: dict = Depends(_trade)):
    if req.region_pcode and not pquery_one("SELECT 1 AS x FROM admin_areas WHERE pcode = ? AND level = 1", (req.region_pcode,)):
        raise HTTPException(400, "Choose a region.")
    conn = get_platform_connection()
    with conn:
        cur = conn.execute("""INSERT INTO buy_requests (trader_id, crop, quantity_qt, region_pcode, needed_by, note, created_at)
                              VALUES (?,?,?,?,?,?,?)""",
                           (user["id"], req.crop.strip().lower(), req.quantity_qt, req.region_pcode,
                            req.needed_by.isoformat() if req.needed_by else None, req.note, _now()))
    return pquery_one("SELECT * FROM buy_requests WHERE id = ?", (cur.lastrowid,))


@router.post("/trade/buy-requests/{request_id}/close")
async def close_buy_request(request_id: int, user: dict = Depends(_trade)):
    conn = get_platform_connection()
    with conn:
        n = conn.execute("UPDATE buy_requests SET status='closed' WHERE id = ? AND trader_id = ?", (request_id, user["id"])).rowcount
    if not n:
        raise HTTPException(404, "Request not found")
    return {"id": request_id, "status": "closed"}


@router.get("/abc/buy-requests")
async def open_requests(org_id: int | None = None, user: dict = Depends(_abc)):
    """Open requests for the ABC's region (or with no region). The trader's name and phone are not shown;
    the ABC answers here and the trader sees the ABC's contact."""
    org = _org(user, org_id)
    region = (org.get("woreda_pcode") or "")[:4] or None
    rows = pquery("""SELECT b.id, b.crop, b.quantity_qt, b.needed_by, b.note, b.created_at, r.name AS region,
                            (SELECT COUNT(*) FROM buy_request_responses x WHERE x.request_id = b.id AND x.org_id = ?) AS responded
                     FROM buy_requests b LEFT JOIN admin_areas r ON r.pcode = b.region_pcode
                     WHERE b.status = 'open' AND (b.region_pcode IS NULL OR ? IS NULL OR b.region_pcode = ?)
                     ORDER BY b.id DESC""", (org["id"], region, region))
    return rows


class RespondIn(BaseModel):
    message: str = Field(..., min_length=3, max_length=500)
    quantity_qt: float | None = Field(None, gt=0)


@router.post("/abc/buy-requests/{request_id}/respond", status_code=201)
async def respond(request_id: int, req: RespondIn, org_id: int | None = None, user: dict = Depends(_abc)):
    org = _org(user, org_id)
    b = pquery_one("SELECT status FROM buy_requests WHERE id = ?", (request_id,))
    if not b or b["status"] != "open":
        raise HTTPException(404, "This request is not open.")
    conn = get_platform_connection()
    with conn:
        conn.execute("""INSERT INTO buy_request_responses (request_id, org_id, quantity_qt, message, created_by, created_at)
                        VALUES (?,?,?,?,?,?)""", (request_id, org["id"], req.quantity_qt, req.message.strip(), user["id"], _now()))
    return {"request_id": request_id, "ok": True}

