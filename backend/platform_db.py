"""
platform_db.py — SQLite connection for agri_platform.db.

Manages users, farms, health reports, suppliers, and loan products.
Runs alongside nmis_prices.db (read-only price data).
"""

import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).parent.parent / "agri_platform.db"

_conn: sqlite3.Connection | None = None


def get_platform_connection() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA foreign_keys=ON")
    return _conn


def pquery(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    conn = get_platform_connection()
    cur = conn.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def pquery_one(sql: str, params: tuple = ()) -> dict[str, Any] | None:
    conn = get_platform_connection()
    cur = conn.execute(sql, params)
    if not cur.description:
        return None
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    return dict(zip(cols, row)) if row else None


def pexecute(sql: str, params: tuple = ()) -> int:
    """Execute INSERT/UPDATE/DELETE. Returns lastrowid."""
    conn = get_platform_connection()
    cur = conn.execute(sql, params)
    conn.commit()
    return cur.lastrowid
