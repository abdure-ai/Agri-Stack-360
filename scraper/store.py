"""
store.py — Sync run history and schedule settings.

Stored in nmis_prices.db next to fetch_log, so the price data and the record
of how it was collected travel together.
"""

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Optional

from scraper import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS sync_runs (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    trigger            TEXT NOT NULL,     -- manual | schedule
    triggered_by       TEXT,              -- user name, or 'scheduler'
    scope              TEXT NOT NULL,     -- active | all
    refresh_catalog    INTEGER NOT NULL DEFAULT 0,
    export_csv         INTEGER NOT NULL DEFAULT 0,
    retrain            INTEGER NOT NULL DEFAULT 0,
    retrain_status     TEXT,              -- NULL | running | success | skipped | failed | cancelled
    retrain_message    TEXT,
    status             TEXT NOT NULL,     -- running | success | partial | failed | cancelled | interrupted
    started_at         TEXT NOT NULL,     -- UTC ISO with offset
    finished_at        TEXT,
    cutoff             TEXT NOT NULL,     -- naive UTC ISO, compared with fetch_log.fetched_at
    resumed_from       INTEGER REFERENCES sync_runs(id),
    pairs_total        INTEGER NOT NULL DEFAULT 0,
    pairs_done         INTEGER NOT NULL DEFAULT 0,
    pairs_failed       INTEGER NOT NULL DEFAULT 0,
    rows_added         INTEGER NOT NULL DEFAULT 0,
    fetch_seconds      REAL,              -- time spent fetching prices (excludes retrain/export)
    latest_date_before TEXT,
    latest_date_after  TEXT,
    error              TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_runs_started ON sync_runs(started_at);

CREATE TABLE IF NOT EXISTS sync_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL               -- JSON
);
"""

DEFAULT_SETTINGS: dict[str, Any] = {
    "enabled": False,            # off until an admin turns it on
    "time": "02:00",             # server local time
    "full_sync_weekday": 6,      # 0=Mon … 6=Sun; None = never run a full sweep
    "refresh_catalog_on_full": True,
    "export_csv": False,
    "retrain_after_sync": True,  # update price forecasts when new data arrived
    "rate": 1.0,                 # seconds between requests to nmis.et
    "last_scheduled_date": None, # local date the scheduler last fired
}

FINISHED = ("success", "partial", "failed", "cancelled", "interrupted")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def fetch_log_now() -> str:
    """Current time in fetch_log.fetched_at's format (naive UTC ISO)."""
    return datetime.now(timezone.utc).replace(tzinfo=None).isoformat()


@contextmanager
def connect():
    conn = sqlite3.connect(str(config.PRICES_DB), timeout=15)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# Columns added after the first release; created on existing databases by init().
_ADDED_COLUMNS = {
    "retrain":         "INTEGER NOT NULL DEFAULT 0",
    "retrain_status":  "TEXT",
    "retrain_message": "TEXT",
    "fetch_seconds":   "REAL",
}


def init():
    with connect() as conn:
        conn.executescript(SCHEMA)
        existing = {r["name"] for r in conn.execute("PRAGMA table_info(sync_runs)")}
        for col, decl in _ADDED_COLUMNS.items():
            if col not in existing:
                conn.execute(f"ALTER TABLE sync_runs ADD COLUMN {col} {decl}")
        # Anything still "running" belongs to a process that died.
        conn.execute(
            """UPDATE sync_runs SET status='interrupted', finished_at=?,
                      retrain_status = CASE WHEN retrain_status='running' THEN 'cancelled'
                                            ELSE retrain_status END
               WHERE status='running'""",
            (utc_now(),),
        )


# ── Runs ──────────────────────────────────────────────────────────────────────

def create_run(*, trigger: str, triggered_by: str, scope: str, refresh_catalog: bool,
               export_csv: bool, retrain: bool, cutoff: str, resumed_from: Optional[int] = None,
               latest_date_before: Optional[str] = None) -> int:
    with connect() as conn:
        cur = conn.execute(
            """INSERT INTO sync_runs
               (trigger, triggered_by, scope, refresh_catalog, export_csv, retrain, status,
                started_at, cutoff, resumed_from, latest_date_before)
               VALUES (?,?,?,?,?,?,'running',?,?,?,?)""",
            (trigger, triggered_by, scope, int(refresh_catalog), int(export_csv), int(retrain),
             utc_now(), cutoff, resumed_from, latest_date_before),
        )
        return cur.lastrowid


_RUN_FIELDS = {"status", "finished_at", "pairs_total", "pairs_done", "pairs_failed",
               "rows_added", "latest_date_before", "latest_date_after", "error",
               "retrain_status", "retrain_message", "fetch_seconds"}


def update_run(run_id: int, **fields):
    bad = set(fields) - _RUN_FIELDS
    if bad:
        raise ValueError(f"Unknown sync_runs fields: {bad}")
    if not fields:
        return
    cols = ", ".join(f"{k}=?" for k in fields)
    with connect() as conn:
        conn.execute(f"UPDATE sync_runs SET {cols} WHERE id=?", (*fields.values(), run_id))


def get_run(run_id: int) -> Optional[dict]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM sync_runs WHERE id=?", (run_id,)).fetchone()
    return dict(row) if row else None


def list_runs(limit: int = 20) -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM sync_runs ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]


def last_finished_run() -> Optional[dict]:
    with connect() as conn:
        row = conn.execute(
            f"SELECT * FROM sync_runs WHERE status IN ({','.join('?' * len(FINISHED))}) "
            "ORDER BY id DESC LIMIT 1",
            FINISHED,
        ).fetchone()
    return dict(row) if row else None


def runs_started_since(utc_iso: str) -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM sync_runs WHERE started_at >= ? ORDER BY id", (utc_iso,)
        ).fetchall()
    return [dict(r) for r in rows]


def failed_pairs(cutoff: str, limit: int = 100) -> list[dict]:
    """Pairs whose latest fetch since `cutoff` failed."""
    with connect() as conn:
        rows = conn.execute(
            """SELECT fl.market_id, m.market_name, m.region, fl.variety_id,
                      v.variety_name, fl.fetched_at, fl.error_msg
               FROM fetch_log fl
               JOIN markets   m ON m.id = fl.market_id
               JOIN varieties v ON v.id = fl.variety_id
               WHERE fl.endpoint = 'table' AND fl.status = 'error' AND fl.fetched_at >= ?
               ORDER BY m.region, m.market_name LIMIT ?""",
            (cutoff, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def seconds_per_pair() -> float:
    """Average fetch time per pair over recent completed runs."""
    with connect() as conn:
        rows = conn.execute(
            """SELECT fetch_seconds, pairs_done FROM sync_runs
               WHERE status IN ('success', 'partial') AND pairs_done >= 100
                 AND fetch_seconds IS NOT NULL
               ORDER BY id DESC LIMIT 5"""
        ).fetchall()
    rates = [r["fetch_seconds"] / r["pairs_done"] for r in rows]
    return sum(rates) / len(rates) if rates else config.DEFAULT_SECONDS_PER_PAIR


# ── Settings ──────────────────────────────────────────────────────────────────

def get_settings() -> dict:
    with connect() as conn:
        rows = conn.execute("SELECT key, value FROM sync_settings").fetchall()
    settings = dict(DEFAULT_SETTINGS)
    settings.update({r["key"]: json.loads(r["value"]) for r in rows if r["key"] in DEFAULT_SETTINGS})
    return settings


def save_settings(**values):
    with connect() as conn:
        for key, value in values.items():
            if key not in DEFAULT_SETTINGS:
                raise ValueError(f"Unknown setting: {key}")
            conn.execute(
                "INSERT INTO sync_settings(key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, json.dumps(value)),
            )


# ── Database overview ─────────────────────────────────────────────────────────

def database_overview() -> dict:
    from scraper.sync import count_pairs  # avoid import cycle at module load

    with connect() as conn:
        row = conn.execute(
            """SELECT (SELECT COUNT(*) FROM prices)                AS price_rows,
                      (SELECT MAX(collection_date) FROM prices)    AS latest_date,
                      (SELECT MIN(collection_date) FROM prices)    AS earliest_date,
                      (SELECT COUNT(*) FROM markets)               AS markets,
                      (SELECT COUNT(*) FROM crops)                 AS crops,
                      (SELECT COUNT(*) FROM varieties)             AS varieties"""
        ).fetchone()
        pairs = count_pairs(conn)
    return {**dict(row), "pairs": pairs}
