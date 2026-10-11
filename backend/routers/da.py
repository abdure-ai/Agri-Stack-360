"""
routers/da.py — DA Copilot: a Development Agent's farmers, visit list and escalation inbox.

Every route needs da:work. An agent works only with farmers who are assigned to them or live
in their region, and who agreed to share their data (consent_data); admins see everyone.
The same rule as backend/access.py farmer_for_read, which every per-farmer action calls.

  GET  /api/da/farmers                       my farmers: crop, stage, latest check, open items
  POST /api/da/farmers                       register a farmer on their behalf (consent recorded)
  GET  /api/da/priorities                    who to visit first (backend/advisory/priorities.py)
  GET  /api/da/escalations?status=open       escalation inbox
  POST /api/da/escalations/{id}/answer       answer the farmer (arrives as an alert in their app)
  POST /api/da/escalations/{id}/forward      pass to an administrator / agronomist
  POST /api/da/escalations/{id}/close        close without an answer
  POST /api/da/diagnoses/{id}/verify         confirm or correct a photo diagnosis
"""

from __future__ import annotations

import json
import re
from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend import admin_areas, consent
from backend.access import farmer_for_read
from backend.advisory.calendar import active_seasons, calendar_rules, farmer_point, season_calendar
from backend.advisory.config import local_now
from backend.advisory.diagnosis import disease_names
from backend.advisory.priorities import Item, rank
from backend.auth import hash_password, require_permission
from backend.permissions import P, has_permission
from backend.platform_db import get_platform_connection, pquery, pquery_one

router = APIRouter(prefix="/da", tags=["da"])
_da = require_permission(P.DA_WORK)
LANGS = ("en", "am", "om", "ti")
ESCALATION_STATUSES = ("open", "answered", "forwarded", "closed")
QUESTION_REASONS = ("no_knowledge", "guardrail_block", "asked_for_person")


def _lang(user: dict, requested: str | None) -> str:
    if requested in LANGS:
        return requested
    return user.get("language") if user.get("language") in LANGS else "en"


def _sees_everyone(user: dict) -> bool:
    return has_permission(user["role"], P.FARMS_MANAGE_ALL)


def _scope(user: dict) -> tuple[str, tuple]:
    """SQL condition on users u / farmer_profiles p for the farmers this user works with."""
    if _sees_everyone(user):
        return "u.role = 'farmer' AND u.is_active = 1", ()
    return ("u.role = 'farmer' AND u.is_active = 1 AND p.consent_data = 1 AND (p.assigned_da_id = ? "
            "OR (? IS NOT NULL AND u.region_pcode = ?) OR (? IS NOT NULL AND u.region = ?))",
            (user["id"], user.get("region_pcode"), user.get("region_pcode"), user.get("region"), user.get("region")))


def _my_farmers(user: dict) -> list[dict]:
    where, params = _scope(user)
    return pquery(
        f"""SELECT u.id, u.name, u.phone, u.language, u.region, u.zone, u.woreda, u.woreda_pcode,
                   p.kebele, p.assigned_da_id, p.consent_alerts
            FROM users u LEFT JOIN farmer_profiles p ON p.user_id = u.id
            WHERE {where} ORDER BY u.name""", params)


# ── My farmers ────────────────────────────────────────────────────────────────

@router.get("/farmers")
async def my_farmers(language: str | None = None, user: dict = Depends(_da)):
    conn = get_platform_connection()
    names = disease_names(conn, _lang(user, language))
    rules = calendar_rules(conn)
    today = local_now().date()
    out = []
    for f in _my_farmers(user):
        # Same altitude as the advisor's context (backend/advisory/calendar.py farmer_point; no network).
        _, _, altitude = farmer_point(conn, f["id"])
        crops = []
        for s in active_seasons(conn, f["id"]):
            c = season_calendar(rules, s, altitude, today)
            st, nxt = c["current_stage"] or {}, c["next_stage"] or {}
            crops.append({"crop": c["crop"], "season": c["season"], "planting_date": c["planting_date"],
                          "days_after_planting": c["days_after_planting"], "stage_key": st.get("stage_key"),
                          "stage_name": st.get("stage_name"), "next_stage_name": nxt.get("stage_name"),
                          "days_to_next_stage": nxt.get("in_days")})
        last = pquery_one("""SELECT id, disease_key, confidence, verified_disease, outcome, created_at FROM diagnoses
                             WHERE farmer_id = ? AND source != 'simulated' ORDER BY created_at DESC LIMIT 1""",
                          (f["id"],))
        if last:
            key = last["verified_disease"] or last["disease_key"]
            last["disease"] = names.get(key, key) if key else None
        open_esc = pquery_one("SELECT COUNT(*) AS n FROM escalations WHERE farmer_id = ? AND status = 'open'",
                              (f["id"],))["n"]
        overdue = pquery_one("""SELECT COUNT(*) AS n FROM diagnoses WHERE farmer_id = ? AND outcome = 'unknown'
                                AND follow_up_date IS NOT NULL AND follow_up_date < ?""",
                             (f["id"], today.isoformat()))["n"]
        out.append({**f, "assigned_to_me": f["assigned_da_id"] == user["id"], "crops": crops,
                    "latest_diagnosis": last, "open_escalations": open_esc, "overdue_follow_ups": overdue})
    return out


class RegisterFarmer(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    phone: str
    pin: str = Field(..., min_length=6, max_length=64, description="Temporary password the farmer changes later")
    area_pcode: str
    language: Literal["en", "am", "om", "ti"] = "am"
    kebele: str | None = Field(None, max_length=120)
    consent_data: bool                    # asked aloud and recorded as the farmer's spoken agreement
    consent_alerts: bool
    consent_training: bool = False        # crop photos may be kept to improve the disease check


@router.post("/farmers", status_code=201)
async def register_farmer(req: RegisterFarmer, user: dict = Depends(_da)):
    phone = req.phone.strip()
    if not re.fullmatch(r"0\d{9}", phone):
        raise HTTPException(400, "Phone must be 10 digits starting with 0.")
    if pquery_one("SELECT id FROM users WHERE phone = ?", (phone,)):
        raise HTTPException(409, "Phone number already registered")
    conn = get_platform_connection()
    try:
        address = admin_areas.address_fields(conn, req.area_pcode)
    except LookupError:
        raise HTTPException(400, "Unknown address. Choose the region, zone and woreda from the lists.")
    if not _sees_everyone(user):
        mine = user.get("region_pcode") or None
        if (mine and address.get("region_pcode") != mine) or (not mine and address.get("region") != user.get("region")):
            raise HTTPException(403, "You can only register farmers in your own region.")
    cols = ("phone", "name", "password_hash", "role", "language", *address)
    with conn:
        cur = conn.execute(f"INSERT INTO users ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
                           (phone, req.name.strip(), hash_password(req.pin), "farmer", req.language, *address.values()))
        farmer_id = cur.lastrowid
        conn.execute("INSERT INTO farmer_profiles (user_id, kebele, assigned_da_id) VALUES (?,?,?)",
                     (farmer_id, req.kebele, None if _sees_everyone(user) else user["id"]))
    consent.set_consent(conn, farmer_id, data=req.consent_data, alerts=req.consent_alerts,
                        training=req.consent_training, by=user["id"], method="da_verbal")
    return {"id": farmer_id, "name": req.name.strip(), "phone": phone, **address,
            "consent": consent.get_consent(conn, farmer_id)}


# ── Visit priority list ───────────────────────────────────────────────────────

@router.get("/priorities")
async def priorities(user: dict = Depends(_da)):
    farmers = {f["id"]: f for f in _my_farmers(user)}
    if not farmers:
        return []
    ids = tuple(farmers)
    marks = ",".join("?" * len(ids))
    now = local_now()
    items: list[Item] = []
    for e in pquery(f"""SELECT e.id, e.farmer_id, e.reason, e.created_at, d.verified_disease
                        FROM escalations e LEFT JOIN diagnoses d ON d.id = e.diagnosis_id
                        WHERE e.status = 'open' AND e.farmer_id IN ({marks})""", ids):
        if e["reason"] == "advice_failed":
            items.append(Item(e["farmer_id"], "worse", e["created_at"], e["id"]))
        elif e["reason"] == "low_confidence":
            if e["verified_disease"] is None:
                items.append(Item(e["farmer_id"], "uncertain_diagnosis", e["created_at"], e["id"]))
        else:
            items.append(Item(e["farmer_id"], "open_question", e["created_at"], e["id"]))
    for d in pquery(f"""SELECT id, farmer_id, follow_up_date FROM diagnoses WHERE outcome = 'unknown'
                        AND follow_up_date IS NOT NULL AND follow_up_date < ? AND farmer_id IN ({marks})""",
                    (now.date().isoformat(), *ids)):
        items.append(Item(d["farmer_id"], "overdue_follow_up", d["follow_up_date"], d["id"]))
    since = (now - timedelta(days=14)).isoformat(sep=" ", timespec="seconds")
    for a in pquery(f"""SELECT MIN(id) AS id, farmer_id, MIN(created_at) AS created_at FROM alerts
                        WHERE type = 'neighborhood_disease' AND created_at >= ? AND farmer_id IN ({marks})
                        GROUP BY farmer_id""", (since, *ids)):
        items.append(Item(a["farmer_id"], "outbreak_nearby", a["created_at"], a["id"]))
    return [{"farmer": {k: farmers[v.farmer_id][k] for k in ("id", "name", "phone", "woreda", "kebele")},
             "score": v.score, "oldest": v.oldest, "reasons": v.reasons} for v in rank(items)]


# ── Escalation inbox ──────────────────────────────────────────────────────────

@router.get("/escalations")
async def escalations(status: str = "open", language: str | None = None, user: dict = Depends(_da)):
    if status not in ESCALATION_STATUSES:
        raise HTTPException(400, f"status must be one of: {', '.join(ESCALATION_STATUSES)}")
    where, params = _scope(user)
    mine = "" if _sees_everyone(user) else "AND (e.assigned_to = ? OR e.assigned_to IS NULL)"
    rows = pquery(
        f"""SELECT e.id, e.reason, e.status, e.resolution, e.created_at, e.resolved_at, e.assigned_to,
                   e.message_id, e.diagnosis_id, u.id AS farmer_id, u.name AS farmer_name, u.phone AS farmer_phone,
                   u.woreda AS farmer_woreda, m.question, m.answer, m.language AS question_language,
                   d.disease_key, d.confidence, d.verified_disease, d.outcome, d.created_at AS diagnosed_at
            FROM escalations e JOIN users u ON u.id = e.farmer_id
            LEFT JOIN farmer_profiles p ON p.user_id = u.id
            LEFT JOIN messages m ON m.id = e.message_id
            LEFT JOIN diagnoses d ON d.id = e.diagnosis_id
            WHERE e.status = ? AND {where} {mine}
            ORDER BY e.created_at ASC LIMIT 200""",
        (status, *params, *(() if _sees_everyone(user) else (user["id"],))))
    names = disease_names(get_platform_connection(), _lang(user, language))
    for r in rows:
        r["disease_name"] = names.get(r["disease_key"], r["disease_key"]) if r["disease_key"] else None
        r["verified_disease_name"] = names.get(r["verified_disease"], r["verified_disease"]) if r["verified_disease"] else None
    return rows


def _escalation_for_action(user: dict, escalation_id: int) -> dict:
    e = pquery_one("SELECT * FROM escalations WHERE id = ?", (escalation_id,))
    if not e:
        raise HTTPException(404, "Escalation not found")
    farmer_for_read(user, e["farmer_id"])
    if not _sees_everyone(user) and e["assigned_to"] not in (None, user["id"]):
        raise HTTPException(403, "This case is assigned to another Development Agent.")
    if e["status"] not in ("open", "forwarded"):
        raise HTTPException(409, f"This case is already {e['status']}.")
    return e


class AnswerRequest(BaseModel):
    text: str = Field(..., min_length=2, max_length=2000)


class NoteRequest(BaseModel):
    note: str | None = Field(None, max_length=1000)


def _resolve(escalation_id: int, status: str, resolution: str | None, assigned_to: int | None) -> None:
    conn = get_platform_connection()
    stamp = local_now().isoformat(sep=" ", timespec="seconds")
    with conn:
        conn.execute("UPDATE escalations SET status = ?, resolution = ?, assigned_to = ?, resolved_at = ? WHERE id = ?",
                     (status, resolution, assigned_to, None if status == "forwarded" else stamp, escalation_id))


@router.post("/escalations/{escalation_id}/answer")
async def answer(escalation_id: int, req: AnswerRequest, user: dict = Depends(_da)):
    """The answer reaches the farmer as an in-app alert: a reply to their own question, so it is
    delivered even without alert consent (that consent covers unrequested alerts and reminders)."""
    e = _escalation_for_action(user, escalation_id)
    send_answer(e, req.text.strip(), user, "da_answer")
    return {"id": escalation_id, "status": "answered"}


def send_answer(e: dict, text: str, responder: dict, message_key: str) -> None:
    """Close the case as answered and deliver the answer to the farmer as an in-app alert
    (also used by the agronomist review queue with message_key 'expert_answer')."""
    _resolve(e["id"], "answered", text, e["assigned_to"] or responder["id"])
    conn = get_platform_connection()
    payload = {"text": text, "da_name": responder.get("name") or "", "escalation_id": e["id"]}
    with conn:
        conn.execute("""INSERT OR IGNORE INTO alerts (type, farmer_id, severity, message_key, payload, channel, status,
                                                      dedupe_key, created_at)
                        VALUES ('da_answer', ?, 'info', ?, ?, 'app', 'queued', ?, ?)""",
                     (e["farmer_id"], message_key, json.dumps(payload, ensure_ascii=False), f"da_answer:{e['id']}",
                      local_now().isoformat(sep=" ", timespec="seconds")))


@router.post("/escalations/{escalation_id}/forward")
async def forward(escalation_id: int, req: NoteRequest, user: dict = Depends(_da)):
    """Pass a case the DA cannot answer to an agronomist (the review queue), or an administrator if there is none."""
    _escalation_for_action(user, escalation_id)
    expert = pquery_one("""SELECT id FROM users WHERE is_active = 1 AND id != ? AND role IN ('agronomist', 'admin')
                           ORDER BY role = 'admin', id LIMIT 1""", (user["id"],))
    if not expert:
        raise HTTPException(409, "There is no agronomist or administrator to forward to.")
    _resolve(escalation_id, "forwarded", req.note, expert["id"])
    return {"id": escalation_id, "status": "forwarded", "assigned_to": expert["id"]}


@router.post("/escalations/{escalation_id}/close")
async def close(escalation_id: int, req: NoteRequest, user: dict = Depends(_da)):
    e = _escalation_for_action(user, escalation_id)
    _resolve(escalation_id, "closed", req.note, e["assigned_to"] or user["id"])
    return {"id": escalation_id, "status": "closed"}


# ── Diagnosis verification ────────────────────────────────────────────────────

class VerifyRequest(BaseModel):
    disease_key: str = Field(..., description="A key from the diseases table, including 'healthy'")


@router.post("/diagnoses/{diagnosis_id}/verify")
async def verify(diagnosis_id: int, req: VerifyRequest, user: dict = Depends(_da)):
    """Confirm or correct what the photo check found. Outbreak counting uses the corrected disease,
    and the record is kept for retraining the model."""
    d = pquery_one("SELECT farmer_id FROM diagnoses WHERE id = ?", (diagnosis_id,))
    if not d:
        raise HTTPException(404, "Diagnosis not found")
    farmer_for_read(user, d["farmer_id"])
    if not pquery_one("SELECT key FROM diseases WHERE key = ?", (req.disease_key,)):
        raise HTTPException(400, "Unknown disease. Choose one from the list.")
    conn = get_platform_connection()
    with conn:
        conn.execute("UPDATE diagnoses SET verified_disease = ?, verified_by = ? WHERE id = ?",
                     (req.disease_key, user["id"], diagnosis_id))
    return {"id": diagnosis_id, "verified_disease": req.disease_key, "verified_by": user["id"]}


@router.get("/diseases")
async def diseases(language: str | None = None, user: dict = Depends(_da)):
    """Choices for the verify control, in the DA's language."""
    names = disease_names(get_platform_connection(), _lang(user, language))
    return [{"key": r["key"], "name": names.get(r["key"], r["key"]), "is_disease": bool(r["is_disease"])}
            for r in pquery("SELECT key, is_disease FROM diseases ORDER BY is_disease, key")]
