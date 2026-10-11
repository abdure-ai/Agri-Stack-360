"""
routers/reports.py — Aggregated area reports (government dashboard, DA weekly woreda report).

  GET /api/reports/summary?days=7&area=<pcode>       per-woreda figures + totals, small numbers hidden
  GET /api/reports/outbreaks?days=14&area=<pcode>    disease scans per woreda (woreda centre), early warning
  GET /api/reports/scope                              the area this user may report on

All need reports:read (government, agent, admin). See backend/reports.py for the privacy rules.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from backend import admin_areas, reports
from backend.advisory.config import local_now, setting_int
from backend.advisory.diagnosis import disease_names
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection

router = APIRouter(prefix="/reports", tags=["reports"])
_reports = require_permission(P.REPORTS_READ)
LANGS = ("en", "am", "om", "ti")


def _area(user: dict, area: str | None) -> str | None:
    try:
        return reports.resolve_area(user, area)
    except reports.ScopeError as e:
        raise HTTPException(403, str(e))


@router.get("/scope")
async def scope(user: dict = Depends(_reports)):
    area = _area(user, None)
    chain = admin_areas.lineage(get_platform_connection(), area) if area else []
    return {"area": area, "names": [a.name for a in chain], "level": chain[-1].level_name if chain else "country"}


@router.get("/summary")
async def summary(days: int = Query(7, ge=1, le=365), area: str | None = None, language: str | None = None,
                  user: dict = Depends(_reports)):
    conn = get_platform_connection()
    out = reports.area_summary(conn, _area(user, area), days, local_now())
    names = disease_names(conn, language if language in LANGS else (user.get("language") or "en"))
    out["disease_names"] = {k: names.get(k, k) for k in out["totals"]["by_disease"]}
    return out


@router.get("/supply-outlook", dependencies=[Depends(require_permission(P.MARKET_READ))])
async def supply_outlook(crop: str | None = None, area: str | None = None):
    """Expected harvests by zone and crop (aggregated, small numbers hidden). For traders and planners."""
    from backend import insights

    return insights.supply_outlook(get_platform_connection(), crop, area)


@router.get("/outbreaks")
async def outbreaks(days: int | None = Query(None, ge=1, le=90), area: str | None = None,
                    include_simulated: bool = False, language: str | None = None, user: dict = Depends(_reports)):
    conn = get_platform_connection()
    window = days or setting_int("outbreak_window_days", 14, conn)
    rows = reports.outbreak_hotspots(conn, _area(user, area), window, local_now(), include_simulated)
    names = disease_names(conn, language if language in LANGS else (user.get("language") or "en"))
    for r in rows:
        r["disease"] = names.get(r["disease_key"], r["disease_key"])
    return {"days": window, "hotspots": rows}
