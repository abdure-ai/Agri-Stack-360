"""
routers/geo.py — Ethiopian administrative areas for address pickers.

Public (no login), because sign-up needs it. Read-only reference data.
"""

from fastapi import APIRouter, HTTPException, Query

from backend import admin_areas
from backend.platform_db import get_platform_connection

router = APIRouter(prefix="/geo", tags=["geo"])


def _out(a: admin_areas.Area) -> dict:
    return {
        "pcode": a.pcode,
        "name": a.name,
        "level": a.level_name,
        "parent_pcode": a.parent_pcode,
        "latitude": a.latitude,
        "longitude": a.longitude,
    }


@router.get("/areas")
def list_areas(parent: str | None = Query(None, description="Parent P-code; omit for regions")):
    """Regions (no parent), zones of a region, or woredas of a zone."""
    conn = get_platform_connection()
    if parent and not admin_areas.get_area(conn, parent):
        raise HTTPException(404, "Area not found")
    return [_out(a) for a in admin_areas.children(conn, parent)]


@router.get("/areas/{pcode}")
def get_area(pcode: str):
    """An area with its full lineage (region > zone > woreda)."""
    conn = get_platform_connection()
    chain = admin_areas.lineage(conn, pcode)
    if not chain:
        raise HTTPException(404, "Area not found")
    return {**_out(chain[-1]), "lineage": [_out(a) for a in chain],
            "nmis_region": admin_areas.nmis_region(chain[0].name)}


@router.get("/search")
def search(q: str = Query(..., min_length=2), limit: int = Query(20, ge=1, le=50)):
    """Find areas by name, e.g. 'Dewa' -> Dewa Cheffa, Dewa Harewa."""
    conn = get_platform_connection()
    return [get_area(a.pcode) for a in admin_areas.search(conn, q, limit)]
