"""
insights.py — Aggregated market intelligence (checklist 1.6 demand dashboard, 1.5 supply outlook).

Same privacy rules as backend/reports.py: counts per zone only, any count 1-4 shown as "<5", and an
area total is hidden when fewer than 5 farms make it up. No yields are invented: the harvest month
comes from the farmer's expected harvest date, else (wheat) the end of the crop-calendar maturity
stage for the farm's altitude band, marked as estimated.
"""

from __future__ import annotations

import json
import sqlite3
from collections import defaultdict
from datetime import date, datetime, timedelta

from backend.reports import SUPPRESS_BELOW, suppress


def _rows(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> list[dict]:
    cur = conn.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def _zone_names(conn: sqlite3.Connection, pcodes) -> dict[str, dict]:
    pcodes = [p for p in pcodes if p]
    if not pcodes:
        return {}
    return {r["pcode"]: r for r in _rows(
        conn, f"""SELECT z.pcode, z.name AS zone, r.name AS region, z.latitude, z.longitude FROM admin_areas z
                  LEFT JOIN admin_areas r ON r.pcode = z.region_pcode WHERE z.pcode IN ({','.join('?' * len(pcodes))})""",
        tuple(pcodes))}


def _area(farms: int, hectares: float) -> float | None:
    return round(hectares, 1) if farms >= SUPPRESS_BELOW else None


def supplier_demand(conn: sqlite3.Connection, org_id: int, days: int, now: datetime) -> dict:
    """For the diseases and crops this supplier's products target: photo checks and crop area by zone."""
    diseases, crops = set(), set()
    for p in _rows(conn, """SELECT p.target_crops, p.target_diseases FROM org_products op
                            JOIN approved_products p ON p.id = op.product_id WHERE op.org_id = ?""", (org_id,)):
        diseases |= set(json.loads(p["target_diseases"] or "[]"))
        crops |= {c.lower() for c in json.loads(p["target_crops"] or "[]")}
    since = (now - timedelta(days=days)).isoformat(sep=" ", timespec="seconds")
    per = defaultdict(lambda: {"checks": defaultdict(int), "farms": set(), "hectares": 0.0})
    if diseases:
        marks = ",".join("?" * len(diseases))
        for r in _rows(conn, f"""SELECT u.zone_pcode AS z, COALESCE(d.verified_disease, d.disease_key) AS dk
                                 FROM diagnoses d JOIN users u ON u.id = d.farmer_id
                                 WHERE d.created_at >= ? AND d.source != 'simulated' AND u.zone_pcode IS NOT NULL
                                   AND COALESCE(d.verified_disease, d.disease_key) IN ({marks})""",
                       (since, *sorted(diseases))):
            per[r["z"]]["checks"][r["dk"]] += 1
    if crops:
        marks = ",".join("?" * len(crops))
        for r in _rows(conn, f"""SELECT u.zone_pcode AS z, f.id AS farm_id, COALESCE(f.area_ha, 0) AS ha
                                 FROM crop_seasons s JOIN farms f ON f.id = s.farm_id JOIN users u ON u.id = f.user_id
                                 WHERE s.status = 'active' AND u.zone_pcode IS NOT NULL AND lower(s.crop) IN ({marks})
                                 GROUP BY f.id""", tuple(sorted(crops))):
            per[r["z"]]["farms"].add(r["farm_id"])
            per[r["z"]]["hectares"] += r["ha"]
    names = _zone_names(conn, per)
    zones = []
    for z, v in per.items():
        n = names.get(z, {})
        zones.append({"pcode": z, "zone": n.get("zone") or z, "region": n.get("region"),
                      "latitude": n.get("latitude"), "longitude": n.get("longitude"),
                      "photo_checks": {k: suppress(c) for k, c in sorted(v["checks"].items())},
                      "photo_checks_total": suppress(sum(v["checks"].values())),
                      "farms_growing": suppress(len(v["farms"])), "area_ha": _area(len(v["farms"]), v["hectares"])})
    zones.sort(key=lambda r: -sum(c if isinstance(c, int) else 0 for c in r["photo_checks"].values()))
    return {"days": days, "diseases": sorted(diseases), "crops": sorted(crops), "zones": zones}


def _harvest_month(season: dict, maturity_end: dict[str, int]) -> tuple[str | None, bool]:
    """(YYYY-MM, estimated?) for one active season."""
    if season.get("expected_harvest_date"):
        return season["expected_harvest_date"][:7], False
    days = maturity_end.get(season["crop"].lower())
    if days is None:
        return None, True
    return (date.fromisoformat(season["planting_date"]) + timedelta(days=days)).isoformat()[:7], True


def supply_outlook(conn: sqlite3.Connection, crop: str | None, area: str | None) -> dict:
    """Active crop seasons by zone and crop: farms, area and expected harvest month (all aggregated)."""
    # Typical end of the maturity stage per crop from the MoA calendar (latest day_end of 'maturity').
    maturity_end = {r["crop"].lower(): int(r["d"]) for r in _rows(
        conn, "SELECT crop, MAX(day_end) AS d FROM crop_calendar_rules WHERE stage_key = 'maturity' GROUP BY crop")}
    where, params = "", ()
    if crop:
        where += " AND lower(s.crop) = ?"
        params += (crop.lower(),)
    if area:
        where += " AND u.woreda_pcode LIKE ?"
        params += (f"{area}%",)
    seasons = _rows(conn, f"""SELECT u.zone_pcode AS z, lower(s.crop) AS crop, s.planting_date, s.expected_harvest_date,
                                     f.id AS farm_id, COALESCE(f.area_ha, 0) AS ha
                              FROM crop_seasons s JOIN farms f ON f.id = s.farm_id JOIN users u ON u.id = f.user_id
                              WHERE s.status = 'active' AND u.zone_pcode IS NOT NULL{where}""", params)
    groups = defaultdict(lambda: {"farms": set(), "hectares": 0.0, "months": defaultdict(set), "estimated": False})
    for s in seasons:
        g = groups[(s["z"], s["crop"])]
        g["farms"].add(s["farm_id"])
        g["hectares"] += s["ha"]
        month, estimated = _harvest_month(s, maturity_end)
        g["months"][month or "unknown"].add(s["farm_id"])
        g["estimated"] |= estimated
    names = _zone_names(conn, {z for z, _ in groups})
    rows = []
    for (z, c), g in groups.items():
        n = names.get(z, {})
        rows.append({"pcode": z, "zone": n.get("zone") or z, "region": n.get("region"), "crop": c,
                     "farms": suppress(len(g["farms"])), "area_ha": _area(len(g["farms"]), g["hectares"]),
                     "harvest_months": {m: suppress(len(f)) for m, f in sorted(g["months"].items())},
                     "harvest_estimated": g["estimated"]})
    rows.sort(key=lambda r: (r["crop"], r["region"] or "", r["zone"]))
    return {"rows": rows, "suppress_below": SUPPRESS_BELOW}
