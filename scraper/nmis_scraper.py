#!/usr/bin/env python3
import sys
# Fix Windows CP1252 console — must happen before logging is configured
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
"""
NMIS Historical Price Scraper
==============================
Scrapes all historical agricultural market price data from the National Market
Information System (nmis.et), operated by Ethiopia's Agricultural Transformation
Institute (ATI).

This tool accesses the site's own public REST API with respectful rate limiting.
Data is public information intended for farmers, traders, and researchers.

For regular updates use the data sync service instead (scraper/api.py,
docs/06_data_sync.md): this script marks each pair done after its first fetch.

Usage:
    python nmis_scraper.py                      # Full historical fetch (all markets)
    python nmis_scraper.py --rate 0.5           # Faster: 2 req/sec
    python nmis_scraper.py --markets 296,327    # Specific market IDs only
    python nmis_scraper.py --skip-catalog       # Skip Phase 1 if catalog already built
    python nmis_scraper.py --export-csv         # Export to CSV after fetching

Output:
    nmis_prices.db              — SQLite database (primary output, project root)
    logs/nmis_scraper.log       — Detailed run log
"""

import argparse
import csv
import logging
import re
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ── Configuration ─────────────────────────────────────────────────────────────

BASE_URL = "https://www.nmis.et/api/web"
USER_AGENT = (
    "NMIS-Historical-Price-Scraper/1.0 "
    "(academic; Ethiopian agricultural market data research; "
    "respects server resources; rate-limited)"
)
ROOT_DIR = Path(__file__).resolve().parent.parent
LOG_DIR = ROOT_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

DEFAULT_DB = str(ROOT_DIR / "nmis_prices.db")
DEFAULT_CSV = str(ROOT_DIR / "data" / "exports" / "nmis_prices.csv")
DEFAULT_RATE = 1.0   # seconds between requests (1 req/sec)
MAX_RETRIES = 5
BACKOFF_FACTOR = 2.0

# ── Logging ───────────────────────────────────────────────────────────────────
# Handlers are attached by the caller: configure_cli_logging() for the CLI, or
# per-run handlers in the sync service (scraper/manager.py).

log = logging.getLogger(__name__)


def configure_cli_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(LOG_DIR / "nmis_scraper.log", encoding="utf-8"),
        ],
    )

# ── Database Schema ───────────────────────────────────────────────────────────

SCHEMA = """
-- Reference tables
CREATE TABLE IF NOT EXISTS markets (
    id          INTEGER PRIMARY KEY,
    market_name TEXT NOT NULL,
    region      TEXT
);

CREATE TABLE IF NOT EXISTS crops (
    id        INTEGER PRIMARY KEY,
    crop_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS varieties (
    id           INTEGER PRIMARY KEY,
    crop_id      INTEGER REFERENCES crops(id),
    variety_name TEXT NOT NULL,
    unit         TEXT   -- e.g. "Quintal", "KG"
);

-- Which varieties are traded at which markets
CREATE TABLE IF NOT EXISTS market_varieties (
    market_id  INTEGER REFERENCES markets(id),
    variety_id INTEGER REFERENCES varieties(id),
    PRIMARY KEY (market_id, variety_id)
);

-- Main price data table
CREATE TABLE IF NOT EXISTS prices (
    collection_date       TEXT NOT NULL,   -- ISO: YYYY-MM-DD (weekly)
    market_id             INTEGER NOT NULL REFERENCES markets(id),
    variety_id            INTEGER NOT NULL REFERENCES varieties(id),
    price_producer_min    REAL,            -- ETB, NULL = not reported
    price_producer_max    REAL,
    price_retail_min      REAL,
    price_retail_max      REAL,
    price_wholesale_min   REAL,
    price_wholesale_max   REAL,
    volume                TEXT,            -- "Sufficient" / "Under" / NULL
    PRIMARY KEY (collection_date, market_id, variety_id)
);

-- Idempotency / checkpoint log
CREATE TABLE IF NOT EXISTS fetch_log (
    market_id    INTEGER NOT NULL,
    variety_id   INTEGER NOT NULL,
    endpoint     TEXT NOT NULL,   -- "trend" or "table"
    fetched_at   TEXT NOT NULL,
    status       TEXT NOT NULL,   -- "ok" or "error"
    record_count INTEGER,
    error_msg    TEXT,
    PRIMARY KEY (market_id, variety_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_prices_date     ON prices(collection_date);
CREATE INDEX IF NOT EXISTS idx_prices_market   ON prices(market_id);
CREATE INDEX IF NOT EXISTS idx_prices_variety  ON prices(variety_id);
CREATE INDEX IF NOT EXISTS idx_prices_mk_var   ON prices(market_id, variety_id);

-- Tracks which markets have been fully catalogued (resumable catalog)
CREATE TABLE IF NOT EXISTS catalog_log (
    market_id  INTEGER PRIMARY KEY,
    catalogued_at TEXT NOT NULL
);
"""


def get_db(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-32000")   # 32 MB cache
    conn.executescript(SCHEMA)
    conn.commit()
    return conn


# ── HTTP Client ───────────────────────────────────────────────────────────────

def make_session(rate_limit: float) -> requests.Session:
    """Build a requests Session with rate limiting and retry logic."""
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    retry = Retry(
        total=MAX_RETRIES,
        backoff_factor=BACKOFF_FACTOR,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    # Attach rate-limit state to session object
    session._rate_limit = rate_limit
    session._last_request_time = 0.0
    return session


def get_json(session: requests.Session, url: str) -> Optional[list | dict]:
    """
    Rate-limited GET with exponential backoff retry.
    Returns parsed JSON data or None on unrecoverable error.
    """
    # Enforce rate limit
    elapsed = time.monotonic() - session._last_request_time
    wait = session._rate_limit - elapsed
    if wait > 0:
        time.sleep(wait)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            session._last_request_time = time.monotonic()
            r = session.get(url, timeout=30)
            if r.status_code == 200:
                return r.json()
            elif r.status_code in (429, 500, 502, 503, 504):
                backoff = BACKOFF_FACTOR ** attempt
                log.warning(
                    f"HTTP {r.status_code} — attempt {attempt}/{MAX_RETRIES} "
                    f"for {url} — backing off {backoff:.1f}s"
                )
                time.sleep(backoff)
            else:
                log.error(f"HTTP {r.status_code} (non-retryable) for {url}")
                return None
        except requests.RequestException as e:
            backoff = BACKOFF_FACTOR ** attempt
            log.warning(
                f"Request error ({e}) — attempt {attempt}/{MAX_RETRIES} "
                f"for {url} — backing off {backoff:.1f}s"
            )
            time.sleep(backoff)

    log.error(f"All {MAX_RETRIES} retries exhausted for {url}")
    return None


# ── Data Helpers ──────────────────────────────────────────────────────────────

def parse_region(market_name: str) -> tuple[str, str]:
    """
    Split 'Amhara - Shewa Robit' into ('Amhara', 'Shewa Robit').
    Markets without a region prefix get region='Addis Ababa'.
    """
    if " - " in market_name:
        region, name = market_name.split(" - ", 1)
        return region.strip(), name.strip()
    return "Addis Ababa", market_name.strip()


def parse_unit(variety_name: str) -> str:
    """
    Extract unit from variety name.
    'White Teff (Quintal)' → 'Quintal'
    'Onion (KG)'           → 'KG'
    """
    m = re.search(r'\(([^)]+)\)\s*$', variety_name)
    return m.group(1).strip() if m else ""


def normalize_date(raw: str) -> Optional[str]:
    """
    Normalize various date formats to ISO YYYY-MM-DD.
    Handles: '2022/12/17', '2022-12-03', '30 Apr 24', '11 Jul 26'
    """
    if not raw:
        return None
    raw = raw.strip()
    for fmt in ("%Y/%m/%d", "%Y-%m-%d", "%d %b %y", "%d %b %Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    log.warning(f"Could not parse date: {raw!r}")
    return raw   # return as-is rather than losing the data


def safe_float(value) -> Optional[float]:
    """
    Convert price string to float.
    Returns None for 0.00 — the API uses 0.00 to mean 'price type not
    reported at this market' (not a genuine zero price).
    """
    try:
        v = float(value)
        return None if v == 0.0 else v
    except (TypeError, ValueError):
        return None


# ── Phase 1: Build Catalog ────────────────────────────────────────────────────

def build_catalog(
    session: requests.Session,
    conn: sqlite3.Connection,
    full: bool = False,
    should_stop=None,
):
    """
    Fetch and store all markets, crops, and varieties.
    Safe to re-run — uses INSERT OR IGNORE throughout.

    By default only markets missing from catalog_log are catalogued (resumable).
    full=True re-reads every market so newly traded varieties are picked up.
    should_stop: optional callable; the loop exits early when it returns True.
    """
    log.info("=" * 60)
    log.info("PHASE 1 — Building market/crop/variety catalog")
    log.info("=" * 60)

    # ── 1a. All markets ───────────────────────────────────────────────────────
    url = f"{BASE_URL}/listMarketPlaces/null/0"
    log.info(f"Fetching markets: {url}")
    markets_raw = get_json(session, url) or []
    log.info(f"  -> {len(markets_raw)} markets found")

    for m in markets_raw:
        region, name = parse_region(m["marketName"])
        conn.execute(
            "INSERT OR IGNORE INTO markets(id, market_name, region) VALUES (?,?,?)",
            (m["id"], name, region),
        )
    conn.commit()

    # ── 1b. Crops and varieties per market ────────────────────────────────────
    all_market_ids = [m["id"] for m in markets_raw]
    total = len(all_market_ids)

    # Find which markets are already catalogued
    done_ids = {
        r[0] for r in conn.execute("SELECT market_id FROM catalog_log").fetchall()
    }
    if full:
        remaining = all_market_ids
    else:
        remaining = [mid for mid in all_market_ids if mid not in done_ids]
    log.info(f"  Markets to catalogue: {len(remaining)}/{total} "
             f"({len(done_ids)} already done)")

    for i, market_id in enumerate(remaining, 1):
        if should_stop and should_stop():
            log.info("  Catalog stopped early (stop requested)")
            return
        log.info(f"  Catalog [{i:>3}/{len(remaining)}] market_id={market_id}")

        # Crops for this market
        crops = get_json(session, f"{BASE_URL}/getMarketCrop/{market_id}/null") or []
        for c in crops:
            conn.execute(
                "INSERT OR IGNORE INTO crops(id, crop_name) VALUES (?,?)",
                (c["id"], c["cropName"]),
            )

        # All varieties traded at this market (crop_id=null = get all)
        varieties = get_json(
            session, f"{BASE_URL}/getMarketCropVariety/{market_id}/null"
        ) or []
        for v in varieties:
            unit = parse_unit(v["varietyName"])
            conn.execute(
                "INSERT OR IGNORE INTO varieties(id, crop_id, variety_name, unit) VALUES (?,?,?,?)",
                (v["id"], v.get("cropId"), v["varietyName"], unit),
            )
            conn.execute(
                "INSERT OR IGNORE INTO market_varieties(market_id, variety_id) VALUES (?,?)",
                (market_id, v["id"]),
            )

        # Mark this market as fully catalogued
        conn.execute(
            "INSERT OR REPLACE INTO catalog_log(market_id, catalogued_at) VALUES (?,?)",
            (market_id, datetime.now(timezone.utc).replace(tzinfo=None).isoformat()),
        )
        conn.commit()
        log.info(f"           -> {len(crops)} crops, {len(varieties)} varieties")

    # Summary
    n_m = conn.execute("SELECT COUNT(*) FROM markets").fetchone()[0]
    n_c = conn.execute("SELECT COUNT(*) FROM crops").fetchone()[0]
    n_v = conn.execute("SELECT COUNT(*) FROM varieties").fetchone()[0]
    n_mv = conn.execute("SELECT COUNT(*) FROM market_varieties").fetchone()[0]
    log.info(f"\nCatalog built: {n_m} markets, {n_c} crops, {n_v} varieties, {n_mv} market-variety pairs")
    log.info("Phase 1 complete.\n")


# ── Phase 2: Idempotency Helpers ──────────────────────────────────────────────

def is_fetched(conn: sqlite3.Connection, market_id: int, variety_id: int, endpoint: str) -> bool:
    """Return True if this (market, variety, endpoint) was already successfully fetched."""
    row = conn.execute(
        "SELECT status FROM fetch_log WHERE market_id=? AND variety_id=? AND endpoint=?",
        (market_id, variety_id, endpoint),
    ).fetchone()
    return row is not None and row["status"] == "ok"


def log_fetch(
    conn: sqlite3.Connection,
    market_id: int,
    variety_id: int,
    endpoint: str,
    status: str,
    count: int = 0,
    error: str = None,
):
    """Record fetch result in the checkpoint log."""
    conn.execute(
        """INSERT OR REPLACE INTO fetch_log
           (market_id, variety_id, endpoint, fetched_at, status, record_count, error_msg)
           VALUES (?,?,?,?,?,?,?)""",
        (
            market_id, variety_id, endpoint,
            datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
            status, count, error,
        ),
    )
    conn.commit()


# ── Phase 2: Save Price Records ───────────────────────────────────────────────

def save_trend_records(
    conn: sqlite3.Connection,
    market_id: int,
    variety_id: int,
    records: list,
) -> int:
    """
    Save records from getMarketTrend.
    Uses INSERT OR IGNORE to skip duplicates on re-runs.
    Returns number of records attempted.
    """
    saved = 0
    for rec in records:
        date = normalize_date(rec.get("collectionDate"))
        if not date:
            continue
        conn.execute(
            """INSERT OR IGNORE INTO prices
               (collection_date, market_id, variety_id,
                price_producer_min, price_producer_max,
                price_retail_min,   price_retail_max,
                price_wholesale_min, price_wholesale_max)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                date, market_id, variety_id,
                safe_float(rec.get("pmin")), safe_float(rec.get("pmax")),
                safe_float(rec.get("rmin")), safe_float(rec.get("rmax")),
                safe_float(rec.get("wmin")), safe_float(rec.get("wmax")),
            ),
        )
        saved += 1
    conn.commit()
    return saved


def save_table_records(
    conn: sqlite3.Connection,
    market_id: int,
    variety_id: int,
    records: list,
    prefer_incoming: bool = False,
) -> int:
    """
    Save records from getMarketTable.
    Uses UPSERT to add the `volume` field to rows already inserted by trend,
    and insert new rows if they don't already exist.

    prefer_incoming=False keeps stored prices and only fills gaps (initial
    scrape). prefer_incoming=True lets non-null API values replace stored ones,
    so corrections published by NMIS are applied (daily sync).
    Returns number of records attempted.
    """
    price_cols = (
        "price_producer_min", "price_producer_max",
        "price_retail_min", "price_retail_max",
        "price_wholesale_min", "price_wholesale_max",
    )
    if prefer_incoming:
        updates = ",\n".join(f"{c} = COALESCE(excluded.{c}, {c})" for c in price_cols)
    else:
        updates = ",\n".join(f"{c} = COALESCE({c}, excluded.{c})" for c in price_cols)
    sql = f"""INSERT INTO prices
               (collection_date, market_id, variety_id,
                price_producer_min, price_producer_max,
                price_retail_min,   price_retail_max,
                price_wholesale_min, price_wholesale_max,
                volume)
               VALUES (?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(collection_date, market_id, variety_id) DO UPDATE SET
                 volume = COALESCE(excluded.volume, volume),
                 {updates}
            """

    saved = 0
    for rec in records:
        date = normalize_date(rec.get("collectionDate"))
        if not date:
            continue
        conn.execute(
            sql,
            (
                date, market_id, variety_id,
                safe_float(rec.get("pmin")), safe_float(rec.get("pmax")),
                safe_float(rec.get("rmin")), safe_float(rec.get("rmax")),
                safe_float(rec.get("wmin")), safe_float(rec.get("wmax")),
                rec.get("volume"),
            ),
        )
        saved += 1
    conn.commit()
    return saved


# ── Phase 2: Main Price Fetch Loop ────────────────────────────────────────────

def fetch_prices(
    session: requests.Session,
    conn: sqlite3.Connection,
    market_ids: Optional[list] = None,
) -> tuple[int, list]:
    """
    Iterate all (market, variety) pairs and fetch price data from both
    getMarketTrend and getMarketTable endpoints.

    Already-fetched pairs are skipped (idempotent / resumable).

    Returns (total_records_attempted, list_of_error_descriptions).
    """
    log.info("=" * 60)
    log.info("PHASE 2 — Fetching historical price data")
    log.info("=" * 60)

    # Build the work list
    if market_ids:
        placeholders = ",".join("?" * len(market_ids))
        combos = conn.execute(
            f"""SELECT mv.market_id, mv.variety_id, m.market_name, m.region,
                       v.variety_name, v.unit, c.crop_name
                FROM market_varieties mv
                JOIN markets  m ON m.id = mv.market_id
                JOIN varieties v ON v.id = mv.variety_id
                LEFT JOIN crops c ON c.id = v.crop_id
                WHERE mv.market_id IN ({placeholders})
                ORDER BY mv.market_id, mv.variety_id""",
            market_ids,
        ).fetchall()
    else:
        combos = conn.execute(
            """SELECT mv.market_id, mv.variety_id, m.market_name, m.region,
                      v.variety_name, v.unit, c.crop_name
               FROM market_varieties mv
               JOIN markets  m ON m.id = mv.market_id
               JOIN varieties v ON v.id = mv.variety_id
               LEFT JOIN crops c ON c.id = v.crop_id
               ORDER BY mv.market_id, mv.variety_id"""
        ).fetchall()

    total_combos = len(combos)
    log.info(f"  {total_combos} market/variety pairs × 2 endpoints = {total_combos * 2} requests max")

    # Count already-done to show resumption status
    already_trend = conn.execute(
        "SELECT COUNT(*) FROM fetch_log WHERE endpoint='trend' AND status='ok'"
    ).fetchone()[0]
    already_table = conn.execute(
        "SELECT COUNT(*) FROM fetch_log WHERE endpoint='table' AND status='ok'"
    ).fetchone()[0]
    log.info(f"  Already fetched (from previous runs): {already_trend} trend, {already_table} table")

    errors = []
    total_records = 0
    run_start = time.monotonic()

    for i, row in enumerate(combos, 1):
        market_id  = row["market_id"]
        variety_id = row["variety_id"]
        mname      = (row["market_name"] or "")[:22]
        vname      = (row["variety_name"] or "")[:22]
        prefix     = f"[{i:>4}/{total_combos}] mkt={market_id}({mname}) var={variety_id}({vname})"

        # ETA estimate
        if i > 1:
            elapsed = time.monotonic() - run_start
            rate = (i - 1) / elapsed
            remaining = (total_combos - i) / rate if rate > 0 else 0
            eta = f"ETA {remaining/60:.0f}m"
        else:
            eta = "ETA ?"

        # ── Endpoint A: getMarketTrend ─────────────────────────────────────
        if not is_fetched(conn, market_id, variety_id, "trend"):
            url = f"{BASE_URL}/getMarketTrend/{market_id}/{variety_id}/null/null"
            data = get_json(session, url)
            if data is not None and isinstance(data, list):
                n = save_trend_records(conn, market_id, variety_id, data)
                total_records += n
                log_fetch(conn, market_id, variety_id, "trend", "ok", len(data))
                log.info(f"  {prefix} trend OK {len(data):>3} obs | {eta}")
            else:
                err = f"trend market={market_id} variety={variety_id}"
                errors.append(err)
                log_fetch(conn, market_id, variety_id, "trend", "error",
                          error="No data or non-list response")
                log.warning(f"  {prefix} trend FAILED")
        else:
            log.debug(f"  {prefix} trend (skip — already fetched)")

        # ── Endpoint B: getMarketTable ─────────────────────────────────────
        if not is_fetched(conn, market_id, variety_id, "table"):
            url = f"{BASE_URL}/getMarketTable/'{market_id}'/'{variety_id}'/null/null/null"
            data = get_json(session, url)
            if data is not None and isinstance(data, list):
                n = save_table_records(conn, market_id, variety_id, data)
                total_records += n
                log_fetch(conn, market_id, variety_id, "table", "ok", len(data))
                log.info(f"  {prefix} table OK {len(data):>3} obs | {eta}")
            else:
                err = f"table market={market_id} variety={variety_id}"
                errors.append(err)
                log_fetch(conn, market_id, variety_id, "table", "error",
                          error="No data or non-list response")
                log.warning(f"  {prefix} table FAILED")
        else:
            log.debug(f"  {prefix} table (skip — already fetched)")

    return total_records, errors


# ── CSV Export ────────────────────────────────────────────────────────────────

def export_csv(conn: sqlite3.Connection, out_path: str = DEFAULT_CSV):
    """
    Export the prices table joined with market/variety/crop metadata to CSV.
    Streams row-by-row to avoid holding everything in memory.
    """
    log.info(f"\nExporting to CSV: {out_path}")
    query = """
        SELECT
            p.collection_date            AS date,
            m.region                     AS region,
            m.id                         AS market_id,
            m.market_name                AS market,
            c.id                         AS crop_id,
            c.crop_name                  AS commodity,
            v.id                         AS variety_id,
            v.variety_name               AS variety,
            v.unit                       AS unit,
            p.price_producer_min         AS price_producer_min,
            p.price_producer_max         AS price_producer_max,
            p.price_retail_min           AS price_retail_min,
            p.price_retail_max           AS price_retail_max,
            p.price_wholesale_min        AS price_wholesale_min,
            p.price_wholesale_max        AS price_wholesale_max,
            p.volume                     AS volume
        FROM prices p
        JOIN markets   m ON m.id = p.market_id
        JOIN varieties v ON v.id = p.variety_id
        LEFT JOIN crops c ON c.id = v.crop_id
        ORDER BY p.collection_date, m.region, m.id, v.id
    """

    row_count = 0
    with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
        # UTF-8-sig = UTF-8 with BOM, so Excel opens Amharic names correctly
        writer = None
        cur = conn.execute(query)
        while True:
            rows = cur.fetchmany(5000)
            if not rows:
                break
            if writer is None:
                cols = [d[0] for d in cur.description]
                writer = csv.DictWriter(f, fieldnames=cols)
                writer.writeheader()
            for row in rows:
                writer.writerow(dict(zip(cols, row)))
                row_count += 1

    log.info(f"  → {row_count:,} rows exported to {out_path}")
    return row_count


# ── Summary ───────────────────────────────────────────────────────────────────

def print_summary(conn: sqlite3.Connection):
    log.info("\n" + "=" * 60)
    log.info("SCRAPE SUMMARY")
    log.info("=" * 60)

    total = conn.execute("SELECT COUNT(*) FROM prices").fetchone()[0]
    log.info(f"Total price rows in DB : {total:>10,}")

    dates = conn.execute(
        "SELECT MIN(collection_date), MAX(collection_date) FROM prices"
    ).fetchone()
    log.info(f"Date range             : {dates[0]} → {dates[1]}")

    n_markets = conn.execute(
        "SELECT COUNT(DISTINCT market_id) FROM prices"
    ).fetchone()[0]
    log.info(f"Markets with data      : {n_markets:>10,}")

    n_varieties = conn.execute(
        "SELECT COUNT(DISTINCT variety_id) FROM prices"
    ).fetchone()[0]
    log.info(f"Varieties with data    : {n_varieties:>10,}")

    n_dates = conn.execute(
        "SELECT COUNT(DISTINCT collection_date) FROM prices"
    ).fetchone()[0]
    log.info(f"Distinct dates         : {n_dates:>10,}")

    log.info("\nTop commodities by row count:")
    rows = conn.execute(
        """SELECT c.crop_name, COUNT(*) as n
           FROM prices p
           JOIN varieties v ON v.id = p.variety_id
           LEFT JOIN crops c ON c.id = v.crop_id
           GROUP BY c.crop_name ORDER BY n DESC LIMIT 15"""
    ).fetchall()
    for r in rows:
        bar = "#" * min(30, int(r["n"] / max(1, rows[0]["n"]) * 30))
        log.info(f"  {(r['crop_name'] or 'Unknown'):<20} {r['n']:>7,}  {bar}")

    log.info("\nMarkets by region:")
    rows = conn.execute(
        """SELECT m.region, COUNT(DISTINCT p.market_id) as n_markets, COUNT(*) as n_rows
           FROM prices p JOIN markets m ON m.id = p.market_id
           GROUP BY m.region ORDER BY n_rows DESC"""
    ).fetchall()
    for r in rows:
        log.info(f"  {(r['region'] or 'Unknown'):<25} {r['n_markets']:>4} markets  {r['n_rows']:>8,} rows")

    n_ok    = conn.execute("SELECT COUNT(*) FROM fetch_log WHERE status='ok'").fetchone()[0]
    n_error = conn.execute("SELECT COUNT(*) FROM fetch_log WHERE status='error'").fetchone()[0]
    log.info(f"\nFetch log: {n_ok} successful, {n_error} errors")
    if n_error > 0:
        log.warning("Failed fetches (first 20):")
        failed = conn.execute(
            """SELECT fl.market_id, m.market_name, fl.variety_id, v.variety_name,
                      fl.endpoint, fl.error_msg
               FROM fetch_log fl
               JOIN markets   m ON m.id = fl.market_id
               JOIN varieties v ON v.id = fl.variety_id
               WHERE fl.status = 'error' LIMIT 20"""
        ).fetchall()
        for f in failed:
            log.warning(
                f"  [{f['endpoint']}] market={f['market_id']}({f['market_name']}) "
                f"variety={f['variety_id']}({f['variety_name']}): {f['error_msg']}"
            )

    log.info("=" * 60)


# ── CLI Entry Point ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="NMIS Historical Agricultural Price Scraper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--db", default=DEFAULT_DB,
        help=f"SQLite output file (default: {DEFAULT_DB})",
    )
    parser.add_argument(
        "--rate", type=float, default=DEFAULT_RATE,
        help=f"Seconds between requests (default: {DEFAULT_RATE}). "
             "Lower = faster but less polite. Min recommended: 0.3",
    )
    parser.add_argument(
        "--markets", type=str, default=None,
        help="Comma-separated market IDs to fetch (default: all 309)",
    )
    parser.add_argument(
        "--skip-catalog", action="store_true",
        help="Skip Phase 1 catalog fetch (use when catalog already populated)",
    )
    parser.add_argument(
        "--export-csv", action="store_true",
        help="Export SQLite to CSV after fetching",
    )
    parser.add_argument(
        "--csv-out", default=DEFAULT_CSV,
        help="CSV output path (default: data/exports/nmis_prices.csv)",
    )
    parser.add_argument(
        "--summary-only", action="store_true",
        help="Skip fetching; just print summary of current DB contents",
    )
    args = parser.parse_args()
    configure_cli_logging()

    # Parse market filter
    market_ids = None
    if args.markets:
        market_ids = [int(m.strip()) for m in args.markets.split(",")]
        log.info(f"Market filter: {market_ids}")

    log.info(f"NMIS Scraper v1.0 | DB={args.db} | rate={args.rate}s/req")
    log.info(f"Started at: {datetime.now().isoformat()}")

    conn = get_db(args.db)

    if args.summary_only:
        print_summary(conn)
        conn.close()
        return

    session = make_session(args.rate)
    run_start = time.monotonic()

    # Phase 1: catalog
    if not args.skip_catalog:
        build_catalog(session, conn)
    else:
        log.info("Skipping catalog phase (--skip-catalog)")

    # Phase 2: price data
    total_records, errors = fetch_prices(session, conn, market_ids)

    elapsed = time.monotonic() - run_start
    log.info(f"\nRun time       : {elapsed / 60:.1f} minutes")
    log.info(f"Records touched: {total_records:,}")
    if errors:
        log.warning(f"Failed fetches : {len(errors)}")
    log.info(f"Finished at    : {datetime.now().isoformat()}")

    # Summary
    print_summary(conn)

    # Optional CSV export
    if args.export_csv:
        export_csv(conn, args.csv_out)

    conn.close()
    log.info(f"\nDone. Database saved to: {args.db}")


if __name__ == "__main__":
    main()
