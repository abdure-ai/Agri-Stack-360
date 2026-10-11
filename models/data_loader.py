"""
models/data_loader.py
─────────────────────
Shared data loading and preprocessing used by all training stages.

Aggregation unit: (crop, region) weekly median retail midpoint.
- Retail midpoint = (price_retail_min + price_retail_max) / 2
- For Sesame/Amhara, retail coverage is only 3.3%; falls back to producer midpoint.
- Weekly series is reindexed to a full weekly spine, then forward-filled up to MAX_FILL weeks.
"""

import os
import sqlite3
import pandas as pd
import numpy as np
from pathlib import Path

# Overridable so the data sync service can retrain against the database it syncs.
DB_PATH = Path(os.environ.get("NMIS_PRICES_DB") or Path(__file__).parent.parent / "nmis_prices.db")

MAX_FILL_WEEKS = 3          # forward-fill at most 3 consecutive missing weeks
TRAIN_CUTOFF   = "2025-12-31"
TEST_START     = "2026-01-01"
MIN_TRAIN_WEEKS = 40        # minimum weeks required in training set
MIN_TEST_WEEKS  = 4         # minimum weeks required in test set for evaluation

# Volume ordinal encoding
VOLUME_MAP = {"Sufficient": 1, "Under": -1}  # None → 0

# (crop, region) pairs excluded from Stage 2 due to < 100 dates or < 3 markets
STAGE2_LONG_HISTORY_CROPS = {"Teff", "Maize", "Wheat", "Bean", "Sesame"}

# Special case: Sesame/Amhara has only ~3% retail coverage → use producer midpoint
PRODUCER_FALLBACK = {("Sesame", "Amhara")}

# Excluded from all stages (< 20 usable dates)
EXCLUDE_SERIES = {
    ("Green Mung", "South West"),   # 6 total dates
    ("Sesame", "Tigray"),           # 9 dates, 0% retail
    ("Sesame", "Sidama"),           # 5 dates
}


def load_series_index(conn: sqlite3.Connection) -> pd.DataFrame:
    """
    Returns a DataFrame with metadata for every (crop, region) series,
    including data_start, n_total_weeks, n_markets, and whether it
    qualifies for Stage 2.
    """
    df = pd.read_sql_query("""
        SELECT
            c.crop_name,
            m.region,
            MIN(p.collection_date)                          AS data_start,
            MAX(p.collection_date)                          AS data_end,
            COUNT(DISTINCT p.collection_date)               AS n_collection_dates,
            COUNT(DISTINCT m.id)                            AS n_markets
        FROM prices p
        JOIN markets m ON m.id = p.market_id
        JOIN varieties v ON v.id = p.variety_id
        JOIN crops c ON c.id = v.crop_id
        GROUP BY c.crop_name, m.region
        ORDER BY c.crop_name, m.region
    """, conn)

    # Exclude degenerate series
    df["excluded"] = df.apply(
        lambda r: (r.crop_name, r.region) in EXCLUDE_SERIES, axis=1
    )
    df = df[~df["excluded"]].copy()

    # Stage 2 eligibility
    df["stage2_eligible"] = (
        df["crop_name"].isin(STAGE2_LONG_HISTORY_CROPS)
        & (df["n_collection_dates"] >= 100)
        & (df["n_markets"] >= 3)
    )

    return df.reset_index(drop=True)


def load_weekly_series(
    conn: sqlite3.Connection,
    crop: str,
    region: str,
) -> pd.DataFrame:
    """
    Returns a DataFrame indexed by a complete weekly spine with columns:
        price  — retail midpoint (or producer midpoint for Sesame/Amhara)
        volume — ordinal-encoded volume signal (-1 / 0 / +1)

    Missing weeks in the spine are forward-filled (up to MAX_FILL_WEEKS),
    then remaining NaNs are left as NaN (not zero-filled).
    """
    use_producer = (crop, region) in PRODUCER_FALLBACK

    if use_producer:
        price_expr = "(p.price_producer_min + p.price_producer_max) / 2.0"
        price_filter = "p.price_producer_min IS NOT NULL AND p.price_producer_max IS NOT NULL"
    else:
        price_expr = "(p.price_retail_min + p.price_retail_max) / 2.0"
        price_filter = "p.price_retail_min IS NOT NULL AND p.price_retail_max IS NOT NULL"

    query = f"""
        SELECT
            p.collection_date                           AS date,
            -- median across markets via average of weekly market-level medians
            AVG({price_expr})                           AS price_raw,
            -- volume: 'Sufficient' if majority of reporters say so, else 'Under', else NULL
            CASE
                WHEN SUM(CASE WHEN p.volume = 'Sufficient' THEN 1 ELSE 0 END) >
                     SUM(CASE WHEN p.volume = 'Under'      THEN 1 ELSE 0 END)
                THEN 'Sufficient'
                WHEN SUM(CASE WHEN p.volume = 'Under' THEN 1 ELSE 0 END) > 0
                THEN 'Under'
                ELSE NULL
            END AS volume_agg
        FROM prices p
        JOIN markets m ON m.id = p.market_id
        JOIN varieties v ON v.id = p.variety_id
        JOIN crops c ON c.id = v.crop_id
        WHERE c.crop_name = ?
          AND m.region    = ?
          AND {price_filter}
        GROUP BY p.collection_date
        ORDER BY p.collection_date
    """
    df = pd.read_sql_query(query, conn, params=(crop, region))
    if df.empty:
        return pd.DataFrame(columns=["date", "price", "volume"])

    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()

    # Encode volume to numeric before resampling (collection dates span all weekdays)
    df["vol_num"] = df["volume_agg"].map(lambda v: VOLUME_MAP.get(v, 0))

    # Resample to weekly (W-SUN: week ending Sunday).
    # This aggregates ALL collection dates within the same calendar week into one
    # observation — avoiding the data loss that occurs when reindexing to a Sunday
    # spine and discarding records that don't fall exactly on Sunday.
    weekly = df.resample("W").agg(
        price_raw=("price_raw", "mean"),
        vol_num=("vol_num", "mean"),
    )
    weekly.index.name = "date"

    # Forward-fill price gaps (up to MAX_FILL_WEEKS consecutive missing weeks)
    weekly["price"] = weekly["price_raw"].ffill(limit=MAX_FILL_WEEKS)

    # Round averaged volume signal back to the nearest ordinal (-1 / 0 / +1)
    weekly["volume"] = weekly["vol_num"].fillna(0).round().astype(int).clip(-1, 1)

    return weekly[["price", "volume"]].reset_index()


def build_all_series(conn: sqlite3.Connection) -> dict:
    """
    Returns dict keyed by (crop, region) → DataFrame with weekly series.
    Only includes non-excluded series with at least MIN_TRAIN_WEEKS in training set.
    """
    index = load_series_index(conn)
    series_dict = {}
    for _, row in index.iterrows():
        key = (row.crop_name, row.region)
        df = load_weekly_series(conn, row.crop_name, row.region)
        if df.empty:
            continue
        train = df[df["date"] <= TRAIN_CUTOFF]
        test  = df[df["date"] >= TEST_START]
        if len(train.dropna(subset=["price"])) < MIN_TRAIN_WEEKS:
            continue
        if len(test.dropna(subset=["price"])) < MIN_TEST_WEEKS:
            continue
        series_dict[key] = df

    return series_dict


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA cache_size=-65536")  # 64 MB
    return conn
