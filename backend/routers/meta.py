"""
routers/meta.py — Metadata endpoints for NMIS Dashboard.

Endpoints:
  GET /api/meta           — all crops, regions, varieties, markets (cached)
  GET /api/varieties      — varieties for a crop (cascading dropdown)
  GET /api/markets        — markets for a region (cascading dropdown)
"""

import time
from fastapi import APIRouter, Query, HTTPException
from backend.database import query, query_one
from backend.models import (
    MetaResponse, CropMeta, VarietyItem, MarketItem,
    PriceLevelCoverage,
)

router = APIRouter()

# The data sync service (scraper/) adds prices while this API runs, so the
# cache is rebuilt when the data changes — checked at most every 5 minutes.
META_RECHECK_SECONDS = 300
_meta_cache: dict = {"value": None, "fingerprint": None, "checked_at": 0.0}


def _data_fingerprint() -> tuple:
    """Cheap change detector: prices is append-only; catalog tables are small."""
    row = query_one("""
        SELECT (SELECT MAX(rowid) FROM prices)   AS max_price_rowid,
               (SELECT COUNT(*) FROM markets)    AS markets,
               (SELECT COUNT(*) FROM varieties)  AS varieties
    """)
    return (row["max_price_rowid"], row["markets"], row["varieties"])


def _get_meta() -> MetaResponse:
    now = time.monotonic()
    cache = _meta_cache
    if cache["value"] is not None and now - cache["checked_at"] < META_RECHECK_SECONDS:
        return cache["value"]
    fingerprint = _data_fingerprint()
    if cache["value"] is None or fingerprint != cache["fingerprint"]:
        cache["value"] = _build_meta()
        cache["fingerprint"] = fingerprint
    cache["checked_at"] = now
    return cache["value"]


def _build_meta() -> MetaResponse:
    """Build the full metadata payload (cached by _get_meta)."""

    # Crop list with actual date ranges from the prices table
    crop_rows = query("""
        SELECT c.id, c.crop_name,
               MIN(p.collection_date) AS min_date,
               MAX(p.collection_date) AS max_date,
               COUNT(*) AS record_count
        FROM crops c
        JOIN varieties v ON v.crop_id = c.id
        LEFT JOIN prices p ON p.variety_id = v.id
        GROUP BY c.id, c.crop_name
        ORDER BY min_date, c.crop_name
    """)

    crops = [
        CropMeta(
            id=r["id"],
            name=r["crop_name"],
            min_date=r["min_date"] or "2019-03-30",
            max_date=r["max_date"] or "2026-08-11",
            record_count=r["record_count"] or 0,
        )
        for r in crop_rows
    ]

    # All regions
    region_rows = query("SELECT DISTINCT region FROM markets ORDER BY region")
    regions = [r["region"] for r in region_rows]

    # All varieties grouped by crop name
    variety_rows = query("""
        SELECT v.id, v.crop_id, v.variety_name, v.unit, c.crop_name
        FROM varieties v
        JOIN crops c ON c.id = v.crop_id
        ORDER BY c.crop_name, v.variety_name
    """)
    varieties: dict[str, list[VarietyItem]] = {}
    for r in variety_rows:
        crop_name = r["crop_name"]
        varieties.setdefault(crop_name, []).append(
            VarietyItem(id=r["id"], crop_id=r["crop_id"],
                        name=r["variety_name"], unit=r["unit"])
        )

    # All markets grouped by region
    market_rows = query("SELECT id, market_name, region FROM markets ORDER BY region, market_name")
    markets: dict[str, list[MarketItem]] = {}
    for r in market_rows:
        markets.setdefault(r["region"], []).append(
            MarketItem(id=r["id"], name=r["market_name"], region=r["region"])
        )

    # Price level coverage across all rows
    cov = query_one("""
        SELECT
            1.0 * SUM(CASE WHEN price_retail_min    IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*) AS retail,
            1.0 * SUM(CASE WHEN price_producer_min  IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*) AS producer,
            1.0 * SUM(CASE WHEN price_wholesale_min IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*) AS wholesale
        FROM prices
    """)

    return MetaResponse(
        crops=crops,
        regions=regions,
        varieties=varieties,
        markets=markets,
        price_level_coverage=PriceLevelCoverage(
            retail=round(cov["retail"], 3),
            producer=round(cov["producer"], 3),
            wholesale=round(cov["wholesale"], 3),
        ),
    )


@router.get("/meta", response_model=MetaResponse)
def get_meta():
    """All crops (with date ranges), regions, varieties, markets. Cached."""
    return _get_meta()


@router.get("/varieties")
def get_varieties(crop: str = Query(..., description="Crop name")):
    """Return varieties for the given crop (for cascading dropdown)."""
    meta = _get_meta()
    result = meta.varieties.get(crop)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Crop '{crop}' not found")
    return result


@router.get("/markets")
def get_markets(region: str = Query(..., description="Region name")):
    """Return markets for the given region (for cascading dropdown)."""
    meta = _get_meta()
    result = meta.markets.get(region)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Region '{region}' not found")
    return result
