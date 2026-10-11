"""
routers/advisory_admin.py — Admin screens for the advisory: thresholds, monitoring, audit log.

  GET  /api/admin/advisory-settings          thresholds with their allowed ranges   (advisory:admin)
  PUT  /api/admin/advisory-settings/{key}    change one value (validated)           (advisory:admin)
  GET  /api/admin/monitoring?days=30         aggregate figures only, no personal data (advisory:admin)
  GET  /api/admin/audit-log                  who changed what / opened whose data   (audit:read)
"""

from __future__ import annotations

import json
from collections import Counter
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from backend.advisory.config import local_now
from backend.advisory.schema import DEFAULT_SETTINGS, SETTING_LIMITS
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection, pquery, pquery_one

router = APIRouter(prefix="/admin", tags=["advisory-admin"])
_advisory_admin = require_permission(P.ADVISORY_ADMIN)


# ── Thresholds ────────────────────────────────────────────────────────────────

def _setting_out(row: dict) -> dict:
    kind, lo, hi = SETTING_LIMITS.get(row["key"], ("text", None, None))
    return {**row, "type": kind, "min": lo, "max": hi, "default": DEFAULT_SETTINGS.get(row["key"], (None,))[0]}


@router.get("/advisory-settings")
async def list_settings(_user=Depends(_advisory_admin)):
    return [_setting_out(r) for r in pquery("SELECT key, value, description FROM advisory_settings ORDER BY key")]


class SettingUpdate(BaseModel):
    value: str | float | int | bool


def validate_setting(key: str, value) -> str:
    """Normalised string value, or ValueError with a plain-language reason."""
    if key not in SETTING_LIMITS:
        raise ValueError("This setting cannot be changed here.")
    kind, lo, hi = SETTING_LIMITS[key]
    if kind == "bool":
        if str(value).lower() in ("1", "true"):
            return "1"
        if str(value).lower() in ("0", "false"):
            return "0"
        raise ValueError("Must be on or off.")
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValueError("Must be a number.")
    if kind == "int" and number != int(number):
        raise ValueError("Must be a whole number.")
    if not lo <= number <= hi:
        raise ValueError(f"Must be between {lo:g} and {hi:g}.")
    return str(int(number)) if kind == "int" else f"{number:g}"


@router.put("/advisory-settings/{key}")
async def update_setting(key: str, req: SettingUpdate, _user=Depends(_advisory_admin)):
    if not pquery_one("SELECT key FROM advisory_settings WHERE key=?", (key,)):
        raise HTTPException(404, "Unknown setting")
    try:
        value = validate_setting(key, req.value)
    except ValueError as e:
        raise HTTPException(400, str(e))
    conn = get_platform_connection()
    with conn:
        conn.execute("UPDATE advisory_settings SET value=? WHERE key=?", (value, key))
    return _setting_out(pquery_one("SELECT key, value, description FROM advisory_settings WHERE key=?", (key,)))


# ── Monitoring (aggregates only) ──────────────────────────────────────────────

def monitoring(days: int) -> dict:
    now = local_now()
    since = (now - timedelta(days=days)).isoformat(sep=" ", timespec="seconds")
    msgs = pquery("SELECT language, confidence, guardrail_flags, escalated, feedback, created_at FROM messages "
                  "WHERE created_at >= ?", (since,))
    flags = Counter()
    for m in msgs:
        try:
            flags.update(json.loads(m["guardrail_flags"] or "[]"))
        except (TypeError, ValueError):
            pass
    diags = pquery("""SELECT disease_key, verified_disease, outcome, created_at FROM diagnoses
                      WHERE created_at >= ? AND source != 'simulated'""", (since,))
    verified = [d for d in diags if d["verified_disease"]]
    esc = pquery("SELECT reason, status, created_at, resolved_at FROM escalations WHERE created_at >= ?", (since,))
    hours = sorted(
        (_hours(e["created_at"], e["resolved_at"]) for e in esc if e["resolved_at"] and e["status"] in ("answered", "closed")))
    alerts = pquery("SELECT type, status FROM alerts WHERE created_at >= ?", (since,))
    consent = pquery_one("""SELECT COUNT(*) AS farmers, SUM(COALESCE(p.consent_data, 0)) AS data,
                                   SUM(COALESCE(p.consent_alerts, 0)) AS alerts
                            FROM users u LEFT JOIN farmer_profiles p ON p.user_id = u.id
                            WHERE u.role = 'farmer' AND u.is_active = 1""")
    day_list = [(now.date() - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]
    q_per_day = Counter(m["created_at"][:10] for m in msgs)
    d_per_day = Counter(d["created_at"][:10] for d in diags)
    n = len(msgs)
    return {
        "days": days,
        "questions": {
            "total": n,
            "by_language": dict(Counter(m["language"] or "unknown" for m in msgs)),
            "by_confidence": dict(Counter(_confidence_label(m["confidence"]) for m in msgs)),
            "escalated": sum(1 for m in msgs if m["escalated"]),
            "escalation_rate": round(sum(1 for m in msgs if m["escalated"]) / n, 3) if n else None,
            "guardrail_flags": dict(flags.most_common()),
            "feedback": dict(Counter(m["feedback"] for m in msgs if m["feedback"])),
        },
        "diagnoses": {
            "total": len(diags),
            "by_disease": dict(Counter(d["verified_disease"] or d["disease_key"] or "uncertain" for d in diags)),
            "outcomes": dict(Counter(d["outcome"] for d in diags)),
            "verified": len(verified),
            "verified_agreement": round(sum(1 for d in verified if d["verified_disease"] == d["disease_key"])
                                        / len(verified), 3) if verified else None,
        },
        "escalations": {
            "total": len(esc),
            "by_reason": dict(Counter(e["reason"] for e in esc)),
            "by_status": dict(Counter(e["status"] for e in esc)),
            "median_hours_to_resolve": hours[len(hours) // 2] if hours else None,
        },
        "alerts": {"by_type": dict(Counter(a["type"] for a in alerts)),
                   "by_status": dict(Counter(a["status"] for a in alerts))},
        "consent": {"farmers": consent["farmers"] or 0, "data": consent["data"] or 0, "alerts": consent["alerts"] or 0},
        "daily": [{"day": d, "questions": q_per_day.get(d, 0), "diagnoses": d_per_day.get(d, 0)} for d in day_list],
    }


def _confidence_label(value) -> str:
    """messages.confidence holds 0.9 / 0.6 / 0.3 (high / medium / low); older rows may hold the word."""
    try:
        x = float(value)
    except (TypeError, ValueError):
        return value or "none"
    return "high" if x >= 0.75 else "medium" if x >= 0.45 else "low"


def _hours(start: str, end: str) -> float:
    from datetime import datetime

    return round((datetime.fromisoformat(end) - datetime.fromisoformat(start)).total_seconds() / 3600, 1)


@router.get("/monitoring")
async def get_monitoring(days: int = Query(30, ge=1, le=365), _user=Depends(_advisory_admin)):
    return monitoring(days)


# ── Audit log ─────────────────────────────────────────────────────────────────

@router.get("/audit-log")
async def audit_log(actor_id: int | None = None, action: str | None = None, target_id: str | None = None,
                    limit: int = Query(100, ge=1, le=500), before_id: int | None = None,
                    _user=Depends(require_permission(P.AUDIT_READ))):
    where, params = ["1=1"], []
    if actor_id is not None:
        where.append("a.actor_id = ?")
        params.append(actor_id)
    if action:
        where.append("a.action LIKE ?")
        params.append(f"%{action}%")
    if target_id:
        where.append("a.target_id = ?")
        params.append(target_id)
    if before_id:
        where.append("a.id < ?")
        params.append(before_id)
    return pquery(
        f"""SELECT a.*, u.name AS actor_name FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
            WHERE {' AND '.join(where)} ORDER BY a.id DESC LIMIT ?""", (*params, limit))
