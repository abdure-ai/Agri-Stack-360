"""
Probe the NMIS database to understand series structure before model design.
Outputs facts we need to answer before building the pipeline.
"""
import sqlite3
import pandas as pd
import sys
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "nmis_prices.db"

conn = sqlite3.connect(DB_PATH)

# ── 1. (crop, region) series inventory ─────────────────────────────────────
print("=" * 70)
print("1. SERIES INVENTORY — (crop, region) level")
print("=" * 70)
df = pd.read_sql_query("""
    SELECT
        c.crop_name,
        m.region,
        COUNT(DISTINCT p.collection_date)               AS n_weeks,
        MIN(p.collection_date)                          AS first_date,
        MAX(p.collection_date)                          AS last_date,
        COUNT(DISTINCT m.id)                            AS n_markets,
        -- midpoint retail
        ROUND(AVG((p.price_retail_min+p.price_retail_max)/2.0), 0) AS avg_retail_etb,
        -- coverage of each price level
        ROUND(100.0*SUM(CASE WHEN p.price_retail_min    IS NOT NULL THEN 1 ELSE 0 END)/COUNT(*),1) AS retail_pct,
        ROUND(100.0*SUM(CASE WHEN p.price_wholesale_min IS NOT NULL THEN 1 ELSE 0 END)/COUNT(*),1) AS wholesale_pct,
        ROUND(100.0*SUM(CASE WHEN p.price_producer_min  IS NOT NULL THEN 1 ELSE 0 END)/COUNT(*),1) AS producer_pct,
        ROUND(100.0*SUM(CASE WHEN p.volume IS NOT NULL  THEN 1 ELSE 0 END)/COUNT(*),1)            AS volume_pct
    FROM prices p
    JOIN markets m ON m.id = p.market_id
    JOIN varieties v ON v.id = p.variety_id
    JOIN crops c ON c.id = v.crop_id
    GROUP BY c.crop_name, m.region
    ORDER BY c.crop_name, m.region
""", conn)
print(df.to_string(index=False))

# ── 2. Weekly date frequency per (crop, region) — measure gap severity ──────
print("\n" + "=" * 70)
print("2. GAP ANALYSIS — Teff/Oromia as example long series")
print("=" * 70)

# Build full weekly spine and measure fill rate
teff_oromia = pd.read_sql_query("""
    SELECT p.collection_date, COUNT(*) as n_markets_reporting
    FROM prices p
    JOIN markets m ON m.id = p.market_id
    JOIN varieties v ON v.id = p.variety_id
    JOIN crops c ON c.id = v.crop_id
    WHERE c.crop_name = 'Teff' AND m.region = 'Oromia'
    GROUP BY p.collection_date
    ORDER BY p.collection_date
""", conn)
teff_oromia['date'] = pd.to_datetime(teff_oromia['collection_date'])
full_spine = pd.date_range(teff_oromia['date'].min(), teff_oromia['date'].max(), freq='W')
filled = teff_oromia.set_index('date').reindex(full_spine)
print(f"Teff/Oromia: {len(teff_oromia)} collection dates, "
      f"{len(full_spine)} weekly spine slots → "
      f"{filled['n_markets_reporting'].isna().sum()} missing weeks "
      f"({100*filled['n_markets_reporting'].isna().mean():.1f}% gaps)")

# ── 3. 2026 test period availability ────────────────────────────────────────
print("\n" + "=" * 70)
print("3. 2026 TEST PERIOD — weeks available per crop/region")
print("=" * 70)
test_weeks = pd.read_sql_query("""
    SELECT c.crop_name, m.region,
           COUNT(DISTINCT p.collection_date) AS test_weeks_2026
    FROM prices p
    JOIN markets m ON m.id = p.market_id
    JOIN varieties v ON v.id = p.variety_id
    JOIN crops c ON c.id = v.crop_id
    WHERE p.collection_date >= '2026-01-01'
    GROUP BY c.crop_name, m.region
    ORDER BY c.crop_name, m.region
""", conn)
print(test_weeks.pivot(index='crop_name', columns='region', values='test_weeks_2026').to_string())

# ── 4. Volume field value distribution ──────────────────────────────────────
print("\n" + "=" * 70)
print("4. VOLUME FIELD VALUES")
print("=" * 70)
vol = pd.read_sql_query("""
    SELECT volume, COUNT(*) as cnt,
           ROUND(100.0*COUNT(*)/445010, 2) as pct
    FROM prices
    GROUP BY volume
""", conn)
print(vol.to_string(index=False))

# ── 5. Price scale ranges per crop ──────────────────────────────────────────
print("\n" + "=" * 70)
print("5. RETAIL PRICE SCALE PER CROP (midpoint, national average)")
print("=" * 70)
scales = pd.read_sql_query("""
    SELECT c.crop_name, v.unit,
           ROUND(MIN((p.price_retail_min+p.price_retail_max)/2.0),0) as price_min_etb,
           ROUND(AVG((p.price_retail_min+p.price_retail_max)/2.0),0) as price_avg_etb,
           ROUND(MAX((p.price_retail_min+p.price_retail_max)/2.0),0) as price_max_etb,
           COUNT(*) as n_obs
    FROM prices p
    JOIN varieties v ON v.id = p.variety_id
    JOIN crops c ON c.id = v.crop_id
    WHERE p.price_retail_min IS NOT NULL
    GROUP BY c.crop_name, v.unit
    ORDER BY price_avg_etb DESC
""", conn)
print(scales.to_string(index=False))

conn.close()
print("\nDone.")
