"""
routers/prices.py — Price data endpoints for NMIS Dashboard.

Endpoints:
  GET /api/prices    — filtered, server-aggregated time series per market
  GET /api/summary   — aggregated stats for filter set (cards above charts)
  GET /api/regional  — regional weekly averages across all 6 regions
  GET /api/spread    — producer-retail spread over time
"""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from backend.database import query, query_one, price_exprs, price_not_null_filter, PRICE_COLS
from backend.models import (
    PricesResponse, PricePoint,
    SummaryResponse,
    RegionalResponse, RegionalPoint,
    SpreadResponse, SpreadPoint,
)

router = APIRouter()

# Maximum raw data points to return to the frontend per series
MAX_POINTS = 500


# ── Shared filter builder ─────────────────────────────────────────────────────

def _build_filters(
    crop: Optional[str],
    variety: Optional[str],
    region: Optional[str],
    market_ids: Optional[str],
    start_date: Optional[str],
    end_date: Optional[str],
    price_level: str,
    require_price: bool = True,
) -> tuple[str, list]:
    """
    Build the WHERE clause and param list common to all price queries.
    Returns (where_clause_string, params_list).
    """
    clauses = []
    params = []

    if crop:
        clauses.append("c.crop_name = ?")
        params.append(crop)
    if variety:
        clauses.append("v.variety_name = ?")
        params.append(variety)
    if region:
        clauses.append("m.region = ?")
        params.append(region)
    if market_ids:
        ids = [int(x.strip()) for x in market_ids.split(",") if x.strip()]
        placeholders = ",".join("?" * len(ids))
        clauses.append(f"m.id IN ({placeholders})")
        params.extend(ids)
    if start_date:
        clauses.append("p.collection_date >= ?")
        params.append(start_date)
    if end_date:
        clauses.append("p.collection_date <= ?")
        params.append(end_date)
    if require_price:
        clauses.append(price_not_null_filter(price_level))

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return where, params


def _get_crop_meta(crop: Optional[str]) -> tuple[str, str, str]:
    """Return (unit, data_start, crop_name) for the queried crop."""
    if not crop:
        return ("Quintal", "2019-03-30", "")
    row = query_one("""
        SELECT v.unit, MIN(p.collection_date) AS min_date, c.crop_name
        FROM crops c
        JOIN varieties v ON v.crop_id = c.id
        LEFT JOIN prices p ON p.variety_id = v.id
        WHERE c.crop_name = ?
        GROUP BY c.id
    """, (crop,))
    if not row:
        raise HTTPException(status_code=404, detail=f"Crop '{crop}' not found")
    return row["unit"] or "Quintal", row["min_date"] or "2019-03-30", row["crop_name"]


# ── /api/prices ───────────────────────────────────────────────────────────────

@router.get("/prices", response_model=PricesResponse)
def get_prices(
    crop: Optional[str] = Query(None),
    variety: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    market: Optional[str] = Query(None, description="Comma-separated market IDs"),
    price_level: str = Query("retail", regex="^(retail|producer|wholesale)$"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """
    Return filtered, server-aggregated weekly price data per market.
    Auto-aggregates to weekly averages when result set would exceed MAX_POINTS per market.
    """
    unit, data_start, crop_name = _get_crop_meta(crop)
    where, params = _build_filters(
        crop, variety, region, market,
        start_date, end_date, price_level
    )

    col_min, col_max = PRICE_COLS.get(price_level, PRICE_COLS["retail"])

    sql = f"""
        SELECT
            p.collection_date                    AS date,
            m.id                                 AS market_id,
            m.market_name,
            m.region,
            AVG(({col_min} + {col_max}) / 2.0)  AS price_avg,
            MIN({col_min})                        AS price_min,
            MAX({col_max})                        AS price_max,
            MAX(p.volume)                         AS volume
        FROM prices p
        JOIN markets m ON m.id = p.market_id
        JOIN varieties v ON v.id = p.variety_id
        JOIN crops c ON c.id = v.crop_id
        {where}
        GROUP BY p.collection_date, m.id
        ORDER BY p.collection_date, m.market_name
    """

    rows = query(sql, tuple(params))

    data = [
        PricePoint(
            date=r["date"],
            market_id=r["market_id"],
            market_name=r["market_name"],
            region=r["region"],
            price_avg=round(r["price_avg"], 2) if r["price_avg"] is not None else None,
            price_min=r["price_min"],
            price_max=r["price_max"],
            volume=r["volume"],
        )
        for r in rows
    ]

    return PricesResponse(
        unit=unit,
        price_level=price_level,
        crop=crop_name,
        data_start=data_start,
        data=data,
        row_count=len(data),
        aggregated=False,
    )


# ── /api/summary ──────────────────────────────────────────────────────────────

@router.get("/summary", response_model=SummaryResponse)
def get_summary(
    crop: Optional[str] = Query(None),
    variety: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    market: Optional[str] = Query(None),
    price_level: str = Query("retail", regex="^(retail|producer|wholesale)$"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """
    Return aggregated stats for the current filter set:
    latest price, week-over-week %, 4-week avg, supply signal.
    """
    unit, data_start, crop_name = _get_crop_meta(crop)
    where, params = _build_filters(
        crop, variety, region, market,
        start_date, end_date, price_level
    )

    col_min, col_max = PRICE_COLS.get(price_level, PRICE_COLS["retail"])
    price_mid = f"({col_min} + {col_max}) / 2.0"

    # Overall stats
    stats = query_one(f"""
        SELECT
            COUNT(*)                     AS obs_count,
            AVG({price_mid})             AS avg_all,
            MIN({col_min})               AS price_min_period,
            MAX({col_max})               AS price_max_period,
            MAX(p.collection_date)       AS latest_date
        FROM prices p
        JOIN markets m ON m.id = p.market_id
        JOIN varieties v ON v.id = p.variety_id
        JOIN crops c ON c.id = v.crop_id
        {where}
    """, tuple(params))

    if not stats or not stats["latest_date"]:
        return SummaryResponse(
            latest_price=None, latest_date=None,
            wow_change_pct=None, avg_4week=None, avg_all=None,
            price_min_period=None, price_max_period=None,
            volume_signal=None, obs_count=0,
            data_start=data_start, unit=unit, price_level=price_level,
        )

    latest_date = stats["latest_date"]

    # Latest week avg price + volume signal
    latest_week = query_one(f"""
        SELECT
            AVG({price_mid})  AS latest_price,
            MAX(p.volume)     AS volume_signal
        FROM prices p
        JOIN markets m ON m.id = p.market_id
        JOIN varieties v ON v.id = p.variety_id
        JOIN crops c ON c.id = v.crop_id
        {where}
        AND p.collection_date = ?
    """, tuple(params) + (latest_date,))

    # Previous week for WoW calculation
    prev_week_row = query_one(f"""
        SELECT MAX(p.collection_date) AS prev_date
        FROM prices p
        JOIN markets m ON m.id = p.market_id
        JOIN varieties v ON v.id = p.variety_id
        JOIN crops c ON c.id = v.crop_id
        {where}
        AND p.collection_date < ?
    """, tuple(params) + (latest_date,))

    wow_change_pct = None
    if prev_week_row and prev_week_row["prev_date"]:
        prev_week = query_one(f"""
            SELECT AVG({price_mid}) AS prev_price
            FROM prices p
            JOIN markets m ON m.id = p.market_id
            JOIN varieties v ON v.id = p.variety_id
            JOIN crops c ON c.id = v.crop_id
            {where}
            AND p.collection_date = ?
        """, tuple(params) + (prev_week_row["prev_date"],))
        if prev_week and prev_week["prev_price"] and latest_week and latest_week["latest_price"]:
            prev_p = prev_week["prev_price"]
            curr_p = latest_week["latest_price"]
            if prev_p != 0:
                wow_change_pct = round((curr_p - prev_p) / prev_p * 100, 2)

    # 4-week average — get last 4 distinct collection dates
    dates_4w = query(f"""
        SELECT DISTINCT p.collection_date
        FROM prices p
        JOIN markets m ON m.id = p.market_id
        JOIN varieties v ON v.id = p.variety_id
        JOIN crops c ON c.id = v.crop_id
        {where}
        ORDER BY p.collection_date DESC
        LIMIT 4
    """, tuple(params))

    avg_4week = None
    if dates_4w:
        d_list = [r["collection_date"] for r in dates_4w]
        placeholders = ",".join("?" * len(d_list))
        avg4 = query_one(f"""
            SELECT AVG({price_mid}) AS avg_4w
            FROM prices p
            JOIN markets m ON m.id = p.market_id
            JOIN varieties v ON v.id = p.variety_id
            JOIN crops c ON c.id = v.crop_id
            {where}
            AND p.collection_date IN ({placeholders})
        """, tuple(params) + tuple(d_list))
        if avg4:
            avg_4week = avg4["avg_4w"]

    return SummaryResponse(
        latest_price=round(latest_week["latest_price"], 2) if latest_week and latest_week["latest_price"] else None,
        latest_date=latest_date,
        wow_change_pct=wow_change_pct,
        avg_4week=round(avg_4week, 2) if avg_4week else None,
        avg_all=round(stats["avg_all"], 2) if stats["avg_all"] else None,
        price_min_period=stats["price_min_period"],
        price_max_period=stats["price_max_period"],
        volume_signal=latest_week["volume_signal"] if latest_week else None,
        obs_count=stats["obs_count"] or 0,
        data_start=data_start,
        unit=unit,
        price_level=price_level,
    )


# ── /api/regional ─────────────────────────────────────────────────────────────

@router.get("/regional", response_model=RegionalResponse)
def get_regional(
    crop: Optional[str] = Query(None),
    variety: Optional[str] = Query(None),
    price_level: str = Query("retail", regex="^(retail|producer|wholesale)$"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """
    Weekly regional averages for all 6 regions — powers the Regional Comparison chart.
    Always aggregated; ignores market filter.
    """
    unit, data_start, crop_name = _get_crop_meta(crop)
    where, params = _build_filters(
        crop, variety, None, None,
        start_date, end_date, price_level
    )

    col_min, col_max = PRICE_COLS.get(price_level, PRICE_COLS["retail"])

    rows = query(f"""
        SELECT
            p.collection_date                    AS date,
            m.region,
            AVG(({col_min} + {col_max}) / 2.0)  AS price_avg,
            MIN({col_min})                        AS price_min,
            MAX({col_max})                        AS price_max,
            COUNT(DISTINCT m.id)                  AS market_count
        FROM prices p
        JOIN markets m ON m.id = p.market_id
        JOIN varieties v ON v.id = p.variety_id
        JOIN crops c ON c.id = v.crop_id
        {where}
        GROUP BY p.collection_date, m.region
        ORDER BY p.collection_date, m.region
    """, tuple(params))

    data = [
        RegionalPoint(
            date=r["date"],
            region=r["region"],
            price_avg=round(r["price_avg"], 2) if r["price_avg"] is not None else None,
            price_min=r["price_min"],
            price_max=r["price_max"],
            market_count=r["market_count"],
        )
        for r in rows
    ]

    return RegionalResponse(unit=unit, price_level=price_level, crop=crop_name, data=data)


# ── /api/spread ───────────────────────────────────────────────────────────────

@router.get("/spread", response_model=SpreadResponse)
def get_spread(
    crop: Optional[str] = Query(None),
    variety: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    market: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """
    Producer-retail spread over time (retail avg − producer avg).
    Uses the same market/region filters but always compares producer vs retail.
    """
    unit, data_start, crop_name = _get_crop_meta(crop)

    clauses = []
    params = []
    if crop:
        clauses.append("c.crop_name = ?")
        params.append(crop)
    if variety:
        clauses.append("v.variety_name = ?")
        params.append(variety)
    if region:
        clauses.append("m.region = ?")
        params.append(region)
    if market:
        ids = [int(x.strip()) for x in market.split(",") if x.strip()]
        placeholders = ",".join("?" * len(ids))
        clauses.append(f"m.id IN ({placeholders})")
        params.extend(ids)
    if start_date:
        clauses.append("p.collection_date >= ?")
        params.append(start_date)
    if end_date:
        clauses.append("p.collection_date <= ?")
        params.append(end_date)
    # Require at least one of retail or producer
    clauses.append("(p.price_retail_min IS NOT NULL OR p.price_producer_min IS NOT NULL)")

    where = "WHERE " + " AND ".join(clauses)

    rows = query(f"""
        SELECT
            p.collection_date AS date,
            m.market_name,
            m.region,
            AVG((p.price_retail_min    + p.price_retail_max)    / 2.0) AS retail_avg,
            AVG((p.price_producer_min  + p.price_producer_max)  / 2.0) AS producer_avg
        FROM prices p
        JOIN markets m ON m.id = p.market_id
        JOIN varieties v ON v.id = p.variety_id
        JOIN crops c ON c.id = v.crop_id
        {where}
        GROUP BY p.collection_date, m.id
        ORDER BY p.collection_date
    """, tuple(params))

    # Calculate producer coverage
    cov_row = query_one(f"""
        SELECT
            1.0 * SUM(CASE WHEN p.price_producer_min IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*) AS cov
        FROM prices p
        JOIN markets m ON m.id = p.market_id
        JOIN varieties v ON v.id = p.variety_id
        JOIN crops c ON c.id = v.crop_id
        {where}
    """, tuple(params))
    producer_coverage = cov_row["cov"] if cov_row and cov_row["cov"] else 0.0

    data = []
    for r in rows:
        retail = r["retail_avg"]
        producer = r["producer_avg"]
        if retail is not None and producer is not None:
            spread = retail - producer
            spread_pct = (spread / producer * 100) if producer != 0 else None
        else:
            spread = None
            spread_pct = None
        data.append(SpreadPoint(
            date=r["date"],
            retail_avg=round(retail, 2) if retail is not None else None,
            producer_avg=round(producer, 2) if producer is not None else None,
            spread=round(spread, 2) if spread is not None else None,
            spread_pct=round(spread_pct, 2) if spread_pct is not None else None,
            market_name=r["market_name"],
            region=r["region"],
        ))

    return SpreadResponse(
        unit=unit,
        crop=crop_name,
        data=data,
        producer_coverage_pct=round(producer_coverage * 100, 1),
    )
