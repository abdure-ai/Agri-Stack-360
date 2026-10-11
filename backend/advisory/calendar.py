"""
calendar.py — A farmer's crop calendar: where each active crop season is now and what comes next.

Built from crop_calendar_rules (MoA wheat manuals; day ranges are estimates, marked as such) and
the farm's altitude: the profile's, else the terrain elevation from a cached forecast at the farm
point or woreda centre (no network calls). Used by the dashboard calendar card, the DA farmer list
and the stage-start reminders in the alert cycle.
"""

from __future__ import annotations

import re
import sqlite3
from datetime import date, timedelta

from backend.advisory.adapters.weather import cached_elevation
from backend.advisory.context import _applies, _specificity, compute_stage
from backend.advisory.ethiopian_calendar import format_dual

_REF_RE = re.compile(r"\s*\[([^\]]*)\]")


def _rows(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> list[dict]:
    cur = conn.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def calendar_rules(conn: sqlite3.Connection) -> list[dict]:
    return _rows(conn, "SELECT * FROM crop_calendar_rules")


def farmer_point(conn: sqlite3.Connection, farmer_id: int) -> tuple[float | None, float | None, float | None]:
    """(latitude, longitude, altitude_m) for the farmer's farm: profile point or woreda centre."""
    rows = _rows(conn, """SELECT COALESCE(p.latitude, a.latitude) AS lat, COALESCE(p.longitude, a.longitude) AS lon,
                                 p.altitude_m AS alt
                          FROM users u LEFT JOIN farmer_profiles p ON p.user_id = u.id
                          LEFT JOIN admin_areas a ON a.pcode = u.woreda_pcode WHERE u.id = ?""", (farmer_id,))
    if not rows:
        return None, None, None
    lat, lon, alt = rows[0]["lat"], rows[0]["lon"], rows[0]["alt"]
    if alt is None and lat is not None:
        alt = cached_elevation(lat, lon)
    return lat, lon, alt


def stage_timeline(rules: list[dict], crop: str, variety: str | None, altitude: float | None,
                   season: str | None) -> list[dict]:
    """All stages of the most specific matching rule set, in order (same choice as compute_stage)."""
    candidates = [r for r in rules if _applies(r, crop, variety, altitude, season)]
    if not candidates:
        return []
    top = max(_specificity(r) for r in candidates)
    return sorted((r for r in candidates if _specificity(r) == top), key=lambda r: r["day_start"])


def split_task(action: str) -> dict:
    """'Hand weed 20-30 days after sowing [Manual p. 38]' -> text + source."""
    sources = _REF_RE.findall(action)
    return {"text": _REF_RE.sub("", action).strip(), "source": "; ".join(sources) or None}


def _dates(planted: date, start: int, end: int) -> dict:
    s, e = planted + timedelta(days=start), planted + timedelta(days=end)
    return {"start_date": s.isoformat(), "end_date": e.isoformat(),
            "start_display": format_dual(s), "end_display": format_dual(e)}


def season_calendar(rules: list[dict], season: dict, altitude: float | None, today: date) -> dict:
    planted = date.fromisoformat(season["planting_date"])
    dap = (today - planted).days
    st = compute_stage(rules, season["crop"], season.get("variety"), altitude, season["season"], dap)
    timeline = stage_timeline(rules, season["crop"], season.get("variety"), altitude, season["season"])
    stages = []
    for r in timeline:
        status = "current" if r["stage_key"] == st.stage_key else ("past" if r["day_end"] < dap else "upcoming")
        stages.append({"stage_key": r["stage_key"], "stage_name": r["stage_name"], "day_start": r["day_start"],
                       "day_end": r["day_end"], "status": status, **_dates(planted, r["day_start"], r["day_end"])})
    current = None
    if st.stage_key and st.day_start is not None:
        current = {"stage_key": st.stage_key, "stage_name": st.stage_name, "day_start": st.day_start,
                   "day_end": st.day_end, "tasks": [split_task(a) for a in st.actions],
                   "verification_status": st.verification_status, **_dates(planted, st.day_start, st.day_end)}
    elif st.stage_key == "past_last_stage":
        current = {"stage_key": "past_last_stage", "stage_name": st.stage_name, "tasks": []}
    nxt = None
    if st.next_stage_key:
        nxt = {"stage_key": st.next_stage_key, "stage_name": st.next_stage_name, "in_days": st.days_to_next_stage,
               "start_date": (today + timedelta(days=st.days_to_next_stage)).isoformat()}
    return {
        "season_id": season["id"], "farm_id": season["farm_id"], "field_name": season.get("field_name"),
        "crop": season["crop"], "variety": season.get("variety"), "season": season["season"],
        "planting_date": season["planting_date"], "planting_date_display": format_dual(planted),
        "days_after_planting": dap, "altitude_m": altitude, "calendar_known": bool(stages),
        "timing_estimated": any(r.get("verification_status") != "verified" for r in timeline),
        "current_stage": current, "next_stage": nxt, "stages": stages,
    }


def active_seasons(conn: sqlite3.Connection, farmer_id: int) -> list[dict]:
    return _rows(conn, """SELECT s.*, f.field_name FROM crop_seasons s JOIN farms f ON f.id = s.farm_id
                          WHERE f.user_id = ? AND s.status = 'active' ORDER BY s.planting_date DESC""", (farmer_id,))


def farmer_calendar(conn: sqlite3.Connection, farmer_id: int, today: date) -> list[dict]:
    rules = calendar_rules(conn)
    _, _, altitude = farmer_point(conn, farmer_id)
    return [season_calendar(rules, s, altitude, today) for s in active_seasons(conn, farmer_id)]
