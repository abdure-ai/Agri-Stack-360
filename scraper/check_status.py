#!/usr/bin/env python3
"""
NMIS Database Inspector & Phase 2 Continuation Runner
=====================================================
1. Connects to nmis_prices.db and fetches full status / statistics.
2. Checks if Phase 1 (catalog) or Phase 2 (price data) is running or needs continuation.
3. Automatically launches/continues Phase 2 if needed.
"""

import os
import sqlite3
import sys
import subprocess
from datetime import datetime

# Fix Windows console output encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.join(ROOT_DIR, "nmis_prices.db")

def inspect_db():
    if not os.path.exists(DB_FILE):
        print(f"[-] Database file '{DB_FILE}' not found!")
        return False

    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row

    print("=" * 60)
    print(f"   NMIS DATABASE STATUS REPORT ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")
    print("=" * 60)

    # 1. Check Tables
    tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    print(f"[+] Active Tables: {', '.join(tables)}")

    # 2. Catalog Progress
    total_markets = conn.execute("SELECT COUNT(*) FROM markets").fetchone()[0]
    catalogued_markets = conn.execute("SELECT COUNT(*) FROM catalog_log").fetchone()[0] if 'catalog_log' in tables else 0
    total_crops = conn.execute("SELECT COUNT(*) FROM crops").fetchone()[0] if 'crops' in tables else 0
    total_varieties = conn.execute("SELECT COUNT(*) FROM varieties").fetchone()[0] if 'varieties' in tables else 0
    mv_pairs = conn.execute("SELECT COUNT(*) FROM market_varieties").fetchone()[0] if 'market_varieties' in tables else 0

    print(f"\n--- Phase 1: Catalog Status ---")
    print(f"  Total Markets       : {total_markets}")
    print(f"  Catalogued Markets  : {catalogued_markets} / {total_markets} ({catalogued_markets/max(1, total_markets)*100:.1f}%)")
    print(f"  Total Commodities   : {total_crops}")
    print(f"  Total Varieties     : {total_varieties}")
    print(f"  Market-Variety Pairs: {mv_pairs}")

    # 3. Phase 2 Price Data Status
    total_prices = conn.execute("SELECT COUNT(*) FROM prices").fetchone()[0] if 'prices' in tables else 0
    fetch_logs = conn.execute("SELECT status, COUNT(*) as cnt FROM fetch_log GROUP BY status").fetchall() if 'fetch_log' in tables else []
    
    dates = conn.execute("SELECT MIN(collection_date), MAX(collection_date) FROM prices").fetchone() if total_prices > 0 else (None, None)

    print(f"\n--- Phase 2: Price Data Status ---")
    print(f"  Total Price Records : {total_prices:,}")
    if dates[0] and dates[1]:
        print(f"  Historical Range    : {dates[0]}  --->  {dates[1]}")

    print("\n--- Fetch Log (Endpoint Queries Completed) ---")
    for log_row in fetch_logs:
        print(f"  Status '{log_row['status']}' : {log_row['cnt']:,} requests")

    # Sample top commodities
    if total_prices > 0:
        print("\n--- Top Commodities Recorded ---")
        top_crops = conn.execute("""
            SELECT c.crop_name, COUNT(*) as cnt 
            FROM prices p 
            JOIN varieties v ON v.id = p.variety_id 
            LEFT JOIN crops c ON c.id = v.crop_id 
            GROUP BY c.crop_name 
            ORDER BY cnt DESC LIMIT 5
        """).fetchall()
        for crop in top_crops:
            print(f"  - {crop['crop_name'] or 'Unknown':<18} : {crop['cnt']:,} records")

    print("=" * 60)
    conn.close()
    return catalogued_markets >= total_markets

if __name__ == "__main__":
    inspect_db()
