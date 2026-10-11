"""
database.py — SQLite connection management for NMIS dashboard API.

Uses one WAL-mode connection per worker thread. A single sqlite3 connection
must not run statements from several threads at once (concurrent requests
fail with "bad parameter or other API misuse"); FastAPI runs sync endpoints
in a bounded thread pool, so per-thread connections stay few and are reused.
WAL mode lets these connections read concurrently.
"""

import sqlite3
import threading
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).parent.parent / "nmis_prices.db"

_local = threading.local()


def get_connection() -> sqlite3.Connection:
    """Return this thread's SQLite connection, initializing it if needed."""
    conn = getattr(_local, "conn", None)
    if conn is None:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA cache_size=-65536")   # 64 MB page cache
        conn.execute("PRAGMA temp_store=MEMORY")
        conn.execute("PRAGMA mmap_size=134217728")  # 128 MB memory-mapped I/O
        _local.conn = conn
    return conn


def query(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    """Execute a SELECT and return rows as plain dicts."""
    conn = get_connection()
    cur = conn.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def query_one(sql: str, params: tuple = ()) -> dict[str, Any] | None:
    """Execute a SELECT and return a single row as a dict, or None."""
    conn = get_connection()
    cur = conn.execute(sql, params)
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


# ── PRICE LEVEL HELPERS ───────────────────────────────────────────────────────

PRICE_COLS = {
    "retail":    ("price_retail_min",    "price_retail_max"),
    "producer":  ("price_producer_min",  "price_producer_max"),
    "wholesale": ("price_wholesale_min", "price_wholesale_max"),
}


def price_exprs(level: str, alias_prefix: str = "price") -> str:
    """Return SQL expressions for AVG/MIN/MAX for a given price level."""
    col_min, col_max = PRICE_COLS.get(level, PRICE_COLS["retail"])
    return f"""
        AVG(({col_min} + {col_max}) / 2.0) AS {alias_prefix}_avg,
        MIN({col_min})                      AS {alias_prefix}_min,
        MAX({col_max})                      AS {alias_prefix}_max
    """.strip()


def price_not_null_filter(level: str) -> str:
    """Return a WHERE clause fragment requiring non-null prices for the level."""
    col_min, _ = PRICE_COLS.get(level, PRICE_COLS["retail"])
    return f"{col_min} IS NOT NULL"
