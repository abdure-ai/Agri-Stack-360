"""
reports.py — Aggregated area reports for government users, DAs (weekly woreda report) and admins.

Privacy rules:
  * only counts per woreda, never names, phones, farms or coordinates of farmers;
  * any count of 1-4 is shown as "<5" (small-number suppression), so a single farmer
    cannot be singled out; 0 stays 0;
  * outbreak hotspots are placed at the woreda centre, not at farm points.

Scope: admins see the whole country (or any area they pick); government users see the area on their
account (woreda, zone or region; none = national); agents see their region. A requested sub-area
must lie inside the user's scope. Official P-codes nest (ET03 > ET0310 > ET031001), so "inside" is
a prefix match.
"""

from __future__ import annotations

import sqlite3
from collections import defaultdict
from datetime import datetime, timedelta

from backend.permissions import P, has_permission

SUPPRESS_BELOW = 5


class ScopeError(Exception):
    pass


def suppress(n: int) -> int | str:
    return "<5" if 0 < n < SUPPRESS_BELOW else n


def user_scope(user: dict) -> str | None:
    """P-code prefix this user may report on; None = whole country."""
    if has_permission(user["role"], P.FARMS_MANAGE_ALL):
        return None
    if user["role"] == "government":
        return user.get("woreda_pcode") or user.get("zone_pcode") or user.get("region_pcode") or None
    if not user.get("region_pcode"):
        raise ScopeError("Your region is not set. Ask an administrator to set it.")
    return user["region_pcode"]


def resolve_area(user: dict, requested: str | None) -> str | None:
    scope = user_scope(user)
    if not requested:
        return scope
    if scope and not requested.startswith(scope):
        raise ScopeError("That area is outside the area you can report on.")
    return requested


def _rows(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> list[dict]:
    cur = conn.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def _area_filter(area: str | list[str] | None, column: str = "u.woreda_pcode") -> tuple[str, tuple]:
    """One area prefix, or a list of them (e.g. the woredas of an NGO project)."""
    if not area:
        return "", ()
    areas = [area] if isinstance(area, str) else list(area)
    return f" AND ({' OR '.join(f'{column} LIKE ?' for _ in areas)})", tuple(f"{a}%" for a in areas)


def area_summary(conn: sqlite3.Connection, area: str | list[str] | None, days: int, now: datetime) -> dict:
    """Per-woreda figures for the period, plus totals for the whole area (all suppressed)."""
    since = (now - timedelta(days=days)).isoformat(sep=" ", timespec="seconds")
    where, params = _area_filter(area)
    per = defaultdict(lambda: {"farmers": 0, "reached": set(), "questions": 0, "diagnoses": 0, "by_disease": defaultdict(int),
                               "improved": 0, "same": 0, "worse": 0, "outbreak_alerts": 0, "escalations": 0})

    for r in _rows(conn, f"""SELECT u.woreda_pcode AS w, COUNT(*) AS n FROM users u
                             WHERE u.role = 'farmer' AND u.is_active = 1 AND u.woreda_pcode IS NOT NULL {where}
                             GROUP BY u.woreda_pcode""", params):
        per[r["w"]]["farmers"] = r["n"]
    for r in _rows(conn, f"""SELECT u.woreda_pcode AS w, u.id AS fid FROM messages m
                             JOIN conversations c ON c.id = m.conversation_id
                             JOIN users u ON u.id = COALESCE(c.subject_farmer_id, c.user_id)
                             WHERE u.role = 'farmer' AND m.created_at >= ? AND u.woreda_pcode IS NOT NULL {where}""",
                     (since, *params)):
        per[r["w"]]["questions"] += 1
        per[r["w"]]["reached"].add(r["fid"])
    for r in _rows(conn, f"""SELECT u.woreda_pcode AS w, u.id AS fid, COALESCE(d.verified_disease, d.disease_key) AS dk,
                                    d.outcome FROM diagnoses d JOIN users u ON u.id = d.farmer_id
                             WHERE d.created_at >= ? AND d.source != 'simulated' AND u.woreda_pcode IS NOT NULL {where}""",
                     (since, *params)):
        w = per[r["w"]]
        w["diagnoses"] += 1
        w["reached"].add(r["fid"])
        w["by_disease"][r["dk"] or "uncertain"] += 1
        if r["outcome"] in ("improved", "same", "worse"):
            w[r["outcome"]] += 1
    for r in _rows(conn, f"""SELECT u.woreda_pcode AS w, a.type FROM alerts a JOIN users u ON u.id = a.farmer_id
                             WHERE a.created_at >= ? AND a.type = 'neighborhood_disease'
                               AND a.status IN ('queued','sent','delivered','read') AND u.woreda_pcode IS NOT NULL {where}""",
                     (since, *params)):
        per[r["w"]]["outbreak_alerts"] += 1
    for r in _rows(conn, f"""SELECT u.woreda_pcode AS w FROM escalations e JOIN users u ON u.id = e.farmer_id
                             WHERE e.created_at >= ? AND u.woreda_pcode IS NOT NULL {where}""", (since, *params)):
        per[r["w"]]["escalations"] += 1

    names = {r["pcode"]: r for r in _rows(
        conn, f"""SELECT w.pcode, w.name AS woreda, z.name AS zone, rg.name AS region, w.latitude, w.longitude
                  FROM admin_areas w LEFT JOIN admin_areas z ON z.pcode = w.parent_pcode
                  LEFT JOIN admin_areas rg ON rg.pcode = w.region_pcode
                  WHERE w.pcode IN ({','.join('?' * len(per)) or "''"})""", tuple(per))}

    def shape(w: dict) -> dict:
        return {"farmers": suppress(w["farmers"]), "farmers_reached": suppress(len(w["reached"])),
                "questions": suppress(w["questions"]), "photo_checks": suppress(w["diagnoses"]),
                "by_disease": {k: suppress(v) for k, v in sorted(w["by_disease"].items())},
                "outcome_improved": suppress(w["improved"]), "outcome_same": suppress(w["same"]),
                "outcome_worse": suppress(w["worse"]), "outbreak_alerts": suppress(w["outbreak_alerts"]),
                "escalations": suppress(w["escalations"])}

    total = {"farmers": 0, "reached": set(), "questions": 0, "diagnoses": 0, "by_disease": defaultdict(int),
             "improved": 0, "same": 0, "worse": 0, "outbreak_alerts": 0, "escalations": 0}
    rows = []
    for pcode, w in per.items():
        for k in ("farmers", "questions", "diagnoses", "improved", "same", "worse", "outbreak_alerts", "escalations"):
            total[k] += w[k]
        total["reached"] |= w["reached"]
        for k, v in w["by_disease"].items():
            total["by_disease"][k] += v
        n = names.get(pcode, {})
        rows.append({"pcode": pcode, "woreda": n.get("woreda") or pcode, "zone": n.get("zone"), "region": n.get("region"),
                     **shape(w)})
    rows.sort(key=lambda r: (r["region"] or "", r["zone"] or "", r["woreda"]))
    return {"area": area if isinstance(area, str) or area is None else ",".join(area), "days": days, "since": since[:10], "suppress_below": SUPPRESS_BELOW,
            "totals": shape(total), "woredas": rows}


def outbreak_hotspots(conn: sqlite3.Connection, area: str | None, days: int, now: datetime,
                      include_simulated: bool = False) -> list[dict]:
    """Disease scans per woreda and disease in the window, at the woreda centre (early warning)."""
    since = (now - timedelta(days=days)).isoformat(sep=" ", timespec="seconds")
    where, params = _area_filter(area)
    sim = "" if include_simulated else " AND d.source != 'simulated'"
    rows = _rows(conn, f"""SELECT u.woreda_pcode AS pcode, COALESCE(d.verified_disease, d.disease_key) AS disease_key,
                                  COUNT(*) AS scans, SUM(d.source = 'simulated') AS simulated, MAX(d.created_at) AS latest
                           FROM diagnoses d JOIN users u ON u.id = d.farmer_id
                           JOIN diseases ds ON ds.key = COALESCE(d.verified_disease, d.disease_key) AND ds.is_disease = 1
                           WHERE d.created_at >= ? AND u.woreda_pcode IS NOT NULL{sim} {where}
                           GROUP BY u.woreda_pcode, COALESCE(d.verified_disease, d.disease_key)""", (since, *params))
    if not rows:
        return []
    areas = {r["pcode"]: r for r in _rows(
        conn, f"""SELECT w.pcode, w.name AS woreda, z.name AS zone, w.latitude, w.longitude FROM admin_areas w
                  LEFT JOIN admin_areas z ON z.pcode = w.parent_pcode
                  WHERE w.pcode IN ({','.join('?' * len(rows))})""", tuple(r["pcode"] for r in rows))}
    out = []
    for r in rows:
        a = areas.get(r["pcode"], {})
        out.append({"pcode": r["pcode"], "woreda": a.get("woreda") or r["pcode"], "zone": a.get("zone"),
                    "latitude": a.get("latitude"), "longitude": a.get("longitude"), "disease_key": r["disease_key"],
                    "scans": suppress(r["scans"]), "scans_band": "high" if r["scans"] >= 10 else "medium" if r["scans"] >= 5 else "low",
                    "includes_simulated": bool(r["simulated"]), "latest": r["latest"][:10]})
    return sorted(out, key=lambda x: (x["scans_band"] != "high", x["scans_band"] != "medium", x["woreda"]))
