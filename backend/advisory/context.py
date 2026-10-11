"""
context.py — Context Builder (spec F2).

Assembles everything the advisor needs to know about one farmer:
  profile        language, location (region/zone/woreda/kebele, point, altitude), farms
  crops          active crop seasons with days after planting and current stage
  weather        current, 7-day forecast, past-week conditions (disease-model inputs)
  diagnoses      this farmer's diagnoses in the last N days (default 60)
  nearby         disease scans within R km in the last D days (default 10 km / 14 days)
  inputs         approved, registered products for current risks, from the Input Hub
  market         price, trend and forecast for the farmer's crops at the nearest markets

Each section degrades on its own: a provider failure marks that section
'unavailable' instead of failing the whole context.
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta

from backend import admin_areas
from backend.advisory.config import local_now, setting_float, setting_int
from backend.advisory.ethiopian_calendar import format_dual
from backend.advisory.providers import FarmerProfile, ProviderError


# ── Crop stage ─────────────────────────────────────────────────────────────────

@dataclass
class StageInfo:
    stage_key: str | None
    stage_name: str | None
    days_after_planting: int
    day_start: int | None = None
    day_end: int | None = None
    next_stage_key: str | None = None
    next_stage_name: str | None = None
    days_to_next_stage: int | None = None
    actions: list[str] = field(default_factory=list)
    verification_status: str | None = None
    source: str | None = None


def _specificity(rule: dict) -> int:
    return (4 if rule.get("variety") else 0) + (2 if rule.get("altitude_min_m") is not None
                                                 or rule.get("altitude_max_m") is not None else 0) \
        + (1 if rule.get("season") else 0)


def _applies(rule: dict, crop: str, variety: str | None, altitude: float | None, season: str | None) -> bool:
    if rule["crop"].lower() != crop.lower():
        return False
    if rule.get("variety") and (not variety or rule["variety"].lower() != variety.lower()):
        return False
    if rule.get("season") and rule["season"] != season:
        return False
    lo, hi = rule.get("altitude_min_m"), rule.get("altitude_max_m")
    if (lo is not None or hi is not None) and altitude is None:
        return False
    if lo is not None and altitude < lo:
        return False
    if hi is not None and altitude > hi:
        return False
    return True


def compute_stage(rules: list[dict], crop: str, variety: str | None, altitude: float | None, season: str | None,
                  days_after_planting: int) -> StageInfo:
    """Current and next stage from crop_calendar_rules; the most specific matching rule set wins."""
    candidates = [r for r in rules if _applies(r, crop, variety, altitude, season)]
    if not candidates:
        return StageInfo(None, None, days_after_planting)
    top = max(_specificity(r) for r in candidates)
    stages = sorted((r for r in candidates if _specificity(r) == top), key=lambda r: r["day_start"])
    current = next((r for r in stages if r["day_start"] <= days_after_planting <= r["day_end"]), None)
    upcoming = next((r for r in stages if r["day_start"] > days_after_planting), None)
    info = StageInfo(None, None, days_after_planting)
    if current:
        info = StageInfo(current["stage_key"], current["stage_name"], days_after_planting, current["day_start"],
                         current["day_end"], actions=json.loads(current.get("actions") or "[]"),
                         verification_status=current.get("verification_status"), source=current.get("source_page"))
    elif days_after_planting > max(r["day_end"] for r in stages):
        info = StageInfo("past_last_stage", "Past the last calendar stage", days_after_planting)
    if upcoming:
        info.next_stage_key = upcoming["stage_key"]
        info.next_stage_name = upcoming["stage_name"]
        info.days_to_next_stage = upcoming["day_start"] - days_after_planting
    return info


# ── Disease activity ───────────────────────────────────────────────────────────

def _disease_names(conn: sqlite3.Connection) -> dict[str, str]:
    return {r[0]: r[1] for r in conn.execute("SELECT key, name_en FROM diseases")}


def nearby_disease_activity(conn: sqlite3.Connection, latitude: float, longitude: float, now: datetime, *,
                            radius_km: float, days: int, verified_only: bool = False,
                            exclude_farmer_id: int | None = None) -> list[dict]:
    """Scans of each disease within `radius_km` in the last `days`, nearest first per disease.

    Only real diseases count (not 'healthy' / 'invalid_image'). A scan counts by its
    verified disease when a DA corrected it. Returns counts, never farmer identities.
    """
    since = (now - timedelta(days=days)).isoformat(sep=" ")
    rows = conn.execute(
        """SELECT d.farmer_id, COALESCE(d.verified_disease, d.disease_key) AS disease, d.latitude, d.longitude,
                  d.verified_by, d.created_at
           FROM diagnoses d JOIN diseases s ON s.key = COALESCE(d.verified_disease, d.disease_key)
           WHERE s.is_disease = 1 AND d.latitude IS NOT NULL AND d.created_at >= ?""",
        (since,),
    ).fetchall()
    names = _disease_names(conn)
    out: dict[str, dict] = {}
    for farmer, disease, lat, lon, verified_by, created in rows:
        if exclude_farmer_id is not None and farmer == exclude_farmer_id:
            continue
        if verified_only and verified_by is None:
            continue
        dist = admin_areas.distance_km(latitude, longitude, lat, lon)
        if dist > radius_km:
            continue
        e = out.setdefault(disease, {"disease_key": disease, "disease": names.get(disease, disease), "scans": 0,
                                     "farms": set(), "nearest_km": None, "latest": None})
        e["scans"] += 1
        e["farms"].add(farmer)
        e["nearest_km"] = round(dist, 1) if e["nearest_km"] is None else round(min(e["nearest_km"], dist), 1)
        e["latest"] = max(e["latest"] or created, created)
    result = []
    for e in out.values():
        e["farms"] = len(e["farms"])
        result.append(e)
    return sorted(result, key=lambda e: (-e["scans"], e["nearest_km"]))


def recent_diagnoses(conn: sqlite3.Connection, farmer_id: int, now: datetime, days: int) -> list[dict]:
    since = (now - timedelta(days=days)).isoformat(sep=" ")
    cur = conn.cursor()
    cur.row_factory = sqlite3.Row
    rows = cur.execute(
        """SELECT d.id, d.farm_id, COALESCE(d.verified_disease, d.disease_key) AS disease_key, s.name_en AS disease,
                  d.confidence, d.outcome, d.follow_up_date, d.created_at, d.verified_by IS NOT NULL AS verified
           FROM diagnoses d LEFT JOIN diseases s ON s.key = COALESCE(d.verified_disease, d.disease_key)
           WHERE d.farmer_id = ? AND d.created_at >= ? ORDER BY d.created_at DESC""",
        (farmer_id, since),
    ).fetchall()
    return [dict(r) for r in rows]


# ── Context ────────────────────────────────────────────────────────────────────

@dataclass
class Section:
    status: str                      # 'ok' | 'unavailable' | 'empty'
    data: object = None
    message: str | None = None


@dataclass
class FarmerContext:
    farmer_id: int
    generated_at: str
    profile: dict
    farms: list[dict]
    crops: list[dict]
    weather: Section
    diagnoses: Section
    nearby: Section
    inputs: Section
    market: Section

    def to_dict(self) -> dict:
        return asdict(self)


def _farms_and_seasons(conn: sqlite3.Connection, farmer_id: int) -> tuple[list[dict], list[dict]]:
    cur = conn.cursor()
    cur.row_factory = sqlite3.Row
    farms = [dict(r) for r in cur.execute(
        "SELECT id, field_name, crop_name, variety, area_ha, irrigated, soil_type, status FROM farms WHERE user_id=?",
        (farmer_id,))]
    seasons = [dict(r) for r in cur.execute(
        """SELECT s.*, f.field_name FROM crop_seasons s JOIN farms f ON f.id = s.farm_id
           WHERE f.user_id = ? AND s.status = 'active' ORDER BY s.planting_date DESC""", (farmer_id,))]
    return farms, seasons


def build_context(conn: sqlite3.Connection, farmer_id: int, *, profiles, weather, market, input_hub,
                  now: datetime | None = None) -> FarmerContext:
    now = now or local_now()
    profile: FarmerProfile | None = profiles.get(farmer_id)
    if profile is None:
        raise LookupError(f"Farmer {farmer_id} not found")
    farms, seasons = _farms_and_seasons(conn, farmer_id)
    has_point = profile.latitude is not None and profile.longitude is not None

    # Weather first: altitude falls back to the forecast's terrain elevation.
    weather_section = Section("unavailable", message="No location for this farmer.")
    elevation = None
    if has_point:
        try:
            from backend.advisory.adapters.weather import past_week_conditions, rain_in_next_hours

            wf = weather.forecast(profile.latitude, profile.longitude)
            elevation = getattr(wf, "elevation_m", None)
            today = now.date()
            weather_section = Section("ok", {
                "source": wf.source,
                "fetched_at": wf.fetched_at.isoformat(),
                "current": asdict(wf.current) if wf.current else None,
                "past_week": past_week_conditions(wf, now),
                "rain_hours_next_24h": len(rain_in_next_hours(wf, now, 24)),
                "rain_hours_next_48h": len(rain_in_next_hours(wf, now, 48)),
                "daily_forecast": [asdict(d) for d in wf.daily if d.day >= today][:7],
            })
        except ProviderError as e:
            weather_section = Section("unavailable", message=str(e))
    altitude = profile.altitude_m if profile.altitude_m is not None else elevation

    cur = conn.cursor()
    cur.row_factory = sqlite3.Row
    rules = [dict(r) for r in cur.execute("SELECT * FROM crop_calendar_rules")]
    crops = []
    for s in seasons:
        planted = date.fromisoformat(s["planting_date"])
        dap = (now.date() - planted).days
        stage = compute_stage(rules, s["crop"], s.get("variety"), altitude, s["season"], dap)
        crops.append({
            "crop_season_id": s["id"], "farm_id": s["farm_id"], "field_name": s["field_name"], "crop": s["crop"],
            "variety": s.get("variety"), "season": s["season"], "planting_date": s["planting_date"],
            "planting_date_display": format_dual(planted), "days_after_planting": dap, "stage": asdict(stage),
            "stage_known": stage.stage_key is not None,
        })

    history_days = setting_int("diagnosis_history_days", 60, conn)
    diag = recent_diagnoses(conn, farmer_id, now, history_days)
    diagnoses_section = Section("ok" if diag else "empty", diag)

    nearby_section = Section("unavailable", message="No location for this farmer.")
    if has_point:
        radius = setting_float("outbreak_radius_km", 10, conn)
        window = setting_int("outbreak_window_days", 14, conn)
        activity = nearby_disease_activity(conn, profile.latitude, profile.longitude, now, radius_km=radius,
                                           days=window, verified_only=setting_int("outbreak_verified_only", 0, conn) == 1,
                                           exclude_farmer_id=farmer_id)
        nearby_section = Section("ok" if activity else "empty",
                                 {"radius_km": radius, "window_days": window, "diseases": activity})

    # Inputs for current risks: diseases this farmer has had recently or that are active nearby.
    risks = {d["disease_key"] for d in diag if d.get("disease_key")}
    if nearby_section.status == "ok":
        risks |= {d["disease_key"] for d in nearby_section.data["diseases"]}
    inputs_section = Section("empty", {"risks": sorted(risks), "offers": []})
    if risks:
        products = conn.execute(
            "SELECT id, target_diseases FROM approved_products WHERE status='registered'").fetchall()
        ids = [pid for pid, targets in products if risks & set(json.loads(targets or "[]"))]
        try:
            offers = input_hub.offers(ids, profile.latitude, profile.longitude, profile.region)
            inputs_section = Section("ok" if offers else "empty",
                                     {"risks": sorted(risks), "offers": [asdict(o) for o in offers]})
        except ProviderError as e:
            inputs_section = Section("unavailable", {"risks": sorted(risks)}, str(e))

    market_section = Section("unavailable", message="No location for this farmer.")
    if has_point:
        try:
            quotes = []
            for crop in sorted({s["crop"] for s in seasons} or {f["crop_name"] for f in farms}):
                for q, m in market.quotes_near(crop, profile.latitude, profile.longitude, 3):
                    quotes.append({**asdict(q), "distance_km": m["distance_km"], "location_method": m["method"]})
            market_section = Section("ok" if quotes else "empty", quotes)
        except Exception as e:  # price DB or forecast API problems must not break advice
            market_section = Section("unavailable", message=f"Market data unavailable: {e}")

    return FarmerContext(
        farmer_id=farmer_id,
        generated_at=now.isoformat(timespec="minutes"),
        profile={**asdict(profile), "altitude_m": altitude,
                 "altitude_source": "profile" if profile.altitude_m is not None else ("terrain" if elevation else None)},
        farms=farms,
        crops=crops,
        weather=weather_section,
        diagnoses=diagnoses_section,
        nearby=nearby_section,
        inputs=inputs_section,
        market=market_section,
    )
