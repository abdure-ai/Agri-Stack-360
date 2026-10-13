"""
routers/maps.py — Map layers for the web map page and the mobile app (backend/maps.py has the rules).

Everyone signed in:
  GET /api/map/layers?layers=disease,markets,shops,farms&crop=Wheat&days=30&language=
      -> {available: [...], scope: {...}, layers: {<name>: {...}}}  (layers the user may not see are left out)
  GET /api/map/crops   crops with NMIS prices (for the market layer's crop picker)
Boundaries are static files: /geo/eth_adm1.json (regions), eth_adm2.json (zones), eth_adm3.json (woredas),
OCHA COD-AB Ethiopia v04 (CC BY-IGO), same P-codes as the platform.
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, Query

from backend import admin_areas, maps
from backend.advisory.config import local_now
from backend.advisory.diagnosis import disease_names
from backend.auth import get_current_user
from backend.permissions import P, has_permission
from backend.platform_db import get_platform_connection

router = APIRouter(prefix="/map", tags=["map"])
LANGS = ("en", "am", "om", "ti")


def _lang(user: dict, language: str | None) -> str:
    return language if language in LANGS else (user.get("language") if user.get("language") in LANGS else "en")


def _scope(conn, user: dict) -> dict:
    area = maps.area_scope(user)
    chain = admin_areas.lineage(conn, area) if area else []
    a = chain[-1] if chain else None
    return {"pcode": area or None, "names": [x.name for x in chain],
            "latitude": a.latitude if a else None, "longitude": a.longitude if a else None,
            "level": a.level if a else 0}


async def _farms(conn, user: dict) -> dict:
    role = user["role"]
    if has_permission(role, P.FARMS_MANAGE_ALL) or (has_permission(role, P.REPORTS_READ)
                                                   and not has_permission(role, P.DA_WORK)):
        area = maps.area_scope(user)
        return {"mode": "counts", "woredas": [] if area == "" else maps.farms_counts(conn, area or None)}
    if has_permission(role, P.DA_WORK):
        from backend.routers import da

        farmers = da._my_farmers(user)
        prio = {p["farmer"]["id"]: p for p in await da.priorities(user=user)}
        ids = [f["id"] for f in farmers]
        points, farms = maps.farmer_points(conn, ids), maps.farms_of(conn, ids)
        out = []
        for f in farmers:
            if f["id"] not in points:
                continue
            p = prio.get(f["id"])
            out.append({"id": f["id"], "name": f["name"], "phone": f["phone"], "kebele": f["kebele"],
                        **points[f["id"]], "farms": farms.get(f["id"], []),
                        "assigned_to_me": f["assigned_da_id"] == user["id"],
                        "priority": p["score"] if p else 0, "reasons": [r for r in (p["reasons"] if p else [])]})
        return {"mode": "farmers", "farmers": sorted(out, key=lambda x: -x["priority"])}
    point = maps.farmer_points(conn, [user["id"]]).get(user["id"])
    return {"mode": "own", "farmers": [{"id": user["id"], "name": user.get("name"), **point,
                                        "farms": maps.farms_of(conn, [user["id"]]).get(user["id"], [])}] if point else []}


@router.get("/layers")
async def layers(layers: str = "disease,markets,shops,farms", crop: str = "Wheat",
                 days: int = Query(30, ge=1, le=365), language: str | None = None,
                 user: dict = Depends(get_current_user)):
    conn = get_platform_connection()
    allowed = maps.available(user)
    wanted = [x for x in (s.strip() for s in layers.split(",")) if x in allowed]
    now = local_now()
    out: dict[str, dict] = {}
    if "disease" in wanted:
        names = disease_names(conn, _lang(user, language))
        out["disease"] = await asyncio.to_thread(maps.disease_layer, conn, user, days, now, names)
    if "markets" in wanted:
        out["markets"] = await asyncio.to_thread(maps.markets_layer, conn, crop, now.date())
    if "shops" in wanted:
        out["shops"] = await asyncio.to_thread(maps.shops_layer, conn, user, days, now)
    if "farms" in wanted:
        out["farms"] = await _farms(conn, user)
    return {"available": allowed, "scope": _scope(conn, user), "layers": out}


@router.get("/crops")
async def crops(_user: dict = Depends(get_current_user)):
    return await asyncio.to_thread(maps.market_crops)
