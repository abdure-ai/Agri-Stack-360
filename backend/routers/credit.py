"""
routers/credit.py — Consent-based credit profiles for banks / MFIs (checklist 1.13).

Lender (credit:request):
  POST /api/credit/requests                 ask a farmer (by phone) to share their credit profile
  GET  /api/credit/requests                 own requests; farmer name only after approval
  GET  /api/credit/requests/{id}/report     risk report (the API): only while approved and not expired
Farmer (profile:manage):
  GET  /api/users/credit-requests           requests addressed to me
  POST /api/users/credit-requests/{id}/approve | decline | revoke

The farmer's yes is the consent: an approval lasts 30 days and can be withdrawn at any time.
A lender learns nothing (not even whether the phone number is registered) until the farmer approves.
Every report read is written to the audit log. The score is the platform's rule-based score
(backend/routers/financial.py), never an AI estimate.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend import audit
from backend.advisory.config import local_now
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection, pquery, pquery_one

router = APIRouter(tags=["credit"])
_lender = require_permission(P.CREDIT_REQUEST)
_farmer = require_permission(P.PROFILE_MANAGE)
APPROVAL_DAYS = 30

SCHEMA = """
CREATE TABLE IF NOT EXISTS credit_requests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    lender_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    farmer_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,     -- NULL when the phone is not a farmer
    phone        TEXT NOT NULL,
    purpose      TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined','revoked')),
    requested_at TEXT NOT NULL,
    decided_at   TEXT,
    expires_at   TEXT
);
"""


def ensure_schema(conn) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def _now() -> datetime:
    return local_now()


def _stamp(dt: datetime) -> str:
    return dt.isoformat(sep=" ", timespec="seconds")


def _effective(r: dict) -> str:
    if r["status"] == "approved" and r["expires_at"] and r["expires_at"] < _stamp(_now()):
        return "expired"
    return r["status"]


class CreditRequestIn(BaseModel):
    phone: str = Field(..., min_length=9, max_length=20)
    purpose: str = Field(..., min_length=3, max_length=300)


@router.post("/credit/requests", status_code=201)
async def request_profile(req: CreditRequestIn, user: dict = Depends(_lender)):
    phone = req.phone.strip()
    neutral = {"ok": True, "message": "If this number belongs to a registered farmer, they will see your request in their app."}
    if pquery_one("SELECT 1 AS x FROM credit_requests WHERE lender_id = ? AND phone = ? AND status = 'pending'",
                  (user["id"], phone)):
        return neutral                                      # one waiting request per number is enough
    f = pquery_one("SELECT id FROM users WHERE phone = ? AND role = 'farmer' AND is_active = 1", (phone,))
    conn = get_platform_connection()
    with conn:
        conn.execute("""INSERT INTO credit_requests (lender_id, farmer_id, phone, purpose, requested_at) VALUES (?,?,?,?,?)""",
                     (user["id"], f["id"] if f else None, phone, req.purpose.strip(), _stamp(_now())))
    # Same answer whether or not the number belongs to a farmer.
    return neutral


@router.get("/credit/requests")
async def my_requests(user: dict = Depends(_lender)):
    rows = pquery("""SELECT c.id, c.phone, c.purpose, c.status, c.requested_at, c.decided_at, c.expires_at, u.name AS farmer_name
                     FROM credit_requests c LEFT JOIN users u ON u.id = c.farmer_id
                     WHERE c.lender_id = ? ORDER BY c.id DESC""", (user["id"],))
    for r in rows:
        r["status"] = _effective(r)
        # A decline looks like no answer, so a lender cannot tell which numbers are registered farmers.
        if r["status"] in ("pending", "declined"):
            r["status"] = "not_shared"
        if r["status"] != "approved":
            r["farmer_name"] = None
    return rows


@router.get("/credit/requests/{request_id}/report")
async def report(request_id: int, user: dict = Depends(_lender)):
    """Risk report, available only while the farmer's approval is valid."""
    from backend.routers.financial import _compute_credit_score

    r = pquery_one("SELECT * FROM credit_requests WHERE id = ? AND lender_id = ?", (request_id, user["id"]))
    if not r:
        raise HTTPException(404, "Request not found")
    if _effective(r) != "approved":
        raise HTTPException(403, "The farmer has not approved this request, or the approval has ended.")
    farmer = pquery_one("SELECT * FROM users WHERE id = ? AND is_active = 1", (r["farmer_id"],))
    if not farmer:
        raise HTTPException(404, "Farmer not found")
    score, positive, risks = _compute_credit_score(farmer)
    farms = pquery("""SELECT crop_name, area_ha, status FROM farms WHERE user_id = ?""", (farmer["id"],))
    seasons = pquery("""SELECT s.crop, s.season, s.planting_date, s.expected_harvest_date FROM crop_seasons s
                        JOIN farms f ON f.id = s.farm_id WHERE f.user_id = ? AND s.status = 'active'""", (farmer["id"],))
    audit.record_read(get_platform_connection(), user, farmer["id"], what="credit_report")
    return {
        "request_id": request_id, "valid_until": r["expires_at"], "purpose": r["purpose"],
        "farmer": {"name": farmer["name"], "phone": farmer["phone"], "region": farmer["region"], "zone": farmer["zone"],
                   "woreda": farmer["woreda"]},
        "score": score, "positive_factors": positive, "risk_factors": risks,
        "farms": {"count": len(farms), "area_ha": round(sum(f["area_ha"] or 0 for f in farms), 2),
                  "crops": sorted({f["crop_name"] for f in farms if f["crop_name"]})},
        "active_seasons": seasons,
        "method": "Rule-based score from the farmer's own platform records (no AI). Not a lending decision.",
    }


@router.get("/users/credit-requests")
async def requests_to_me(user: dict = Depends(_farmer)):
    rows = pquery("""SELECT c.id, c.purpose, c.status, c.requested_at, c.decided_at, c.expires_at, l.name AS lender
                     FROM credit_requests c JOIN users l ON l.id = c.lender_id
                     WHERE c.farmer_id = ? ORDER BY c.id DESC""", (user["id"],))
    for r in rows:
        r["status"] = _effective(r)
    return rows


@router.post("/users/credit-requests/{request_id}/{decision}")
async def decide(request_id: int, decision: Literal["approve", "decline", "revoke"], user: dict = Depends(_farmer)):
    r = pquery_one("SELECT * FROM credit_requests WHERE id = ? AND farmer_id = ?", (request_id, user["id"]))
    if not r:
        raise HTTPException(404, "Request not found")
    now = _now()
    if decision == "revoke":
        if r["status"] != "approved":
            raise HTTPException(409, "Only an approved request can be withdrawn.")
        status, expires = "revoked", None
    else:
        if r["status"] != "pending":
            raise HTTPException(409, f"This request is already {r['status']}.")
        status = "approved" if decision == "approve" else "declined"
        expires = _stamp(now + timedelta(days=APPROVAL_DAYS)) if status == "approved" else None
    conn = get_platform_connection()
    with conn:
        conn.execute("UPDATE credit_requests SET status = ?, decided_at = ?, expires_at = ? WHERE id = ?",
                     (status, _stamp(now), expires, request_id))
    return {"id": request_id, "status": status, "expires_at": expires}
