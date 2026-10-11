import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "nmis_prices.db"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

# Sample query: Wheat / Oromia / wholesale / last 2 years
rows = conn.execute("""
    SELECT 
        p.collection_date,
        m.market_name,
        m.region,
        c.crop_name,
        v.variety_name,
        v.unit,
        p.price_wholesale_min,
        p.price_wholesale_max,
        p.volume
    FROM prices p
    JOIN markets m ON m.id = p.market_id
    JOIN varieties v ON v.id = p.variety_id
    JOIN crops c ON c.id = v.crop_id
    WHERE c.crop_name = 'Wheat'
      AND m.region = 'Oromia'
      AND p.price_wholesale_min IS NOT NULL
      AND p.collection_date >= '2024-08-01'
    ORDER BY p.collection_date DESC, m.market_name
    LIMIT 10
""").fetchall()

for r in rows:
    print(dict(r))

print("\n--- crop date ranges ---")
ranges = conn.execute("""
    SELECT c.crop_name, MIN(p.collection_date) as min_date, MAX(p.collection_date) as max_date, COUNT(*) as total
    FROM prices p
    JOIN varieties v ON v.id = p.variety_id
    JOIN crops c ON c.id = v.crop_id
    GROUP BY c.id, c.crop_name
    ORDER BY min_date
""").fetchall()
for r in ranges:
    print(dict(r))

print("\n--- price_level nullity ---")
nulls = conn.execute("""
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN price_producer_min IS NOT NULL THEN 1 ELSE 0 END) as has_producer,
        SUM(CASE WHEN price_retail_min IS NOT NULL THEN 1 ELSE 0 END) as has_retail,
        SUM(CASE WHEN price_wholesale_min IS NOT NULL THEN 1 ELSE 0 END) as has_wholesale
    FROM prices
""").fetchone()
print(dict(nulls))

conn.close()
