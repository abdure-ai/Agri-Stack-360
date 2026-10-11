"""
sync.py — Incremental refresh of nmis_prices.db from nmis.et.

The original scraper (nmis_scraper.py) fetches each (market, variety) pair once
and then skips it forever, so re-running it never picks up new weekly prices.
A sync re-fetches pairs:

  scope="active"  pairs that reported a price in the last ACTIVE_DAYS days,
                  plus pairs never fetched before (new markets / varieties).
  scope="all"     every known pair — also catches markets that resumed reporting.

Only getMarketTable is called. It returns the same prices as getMarketTrend
plus the supply volume, so one request per pair is enough.

Runs are resumable: a pair whose `table` fetch succeeded after `cutoff` is
skipped, so restarting an interrupted run with its original cutoff carries on
where it stopped.
"""

import logging
import sqlite3
import time
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path
from typing import Callable, Optional

from scraper import config
from scraper.nmis_scraper import (
    BASE_URL,
    build_catalog,
    export_csv,
    get_db,
    get_json,
    log_fetch,
    make_session,
    save_table_records,
)

log = logging.getLogger(__name__)

# Progress is reported after each pair; the manager persists it periodically.
ProgressFn = Callable[[dict], None]
StopFn = Callable[[], bool]


@dataclass
class SyncResult:
    pairs_total: int = 0
    pairs_done: int = 0
    pairs_failed: int = 0
    pairs_skipped: int = 0          # already fetched by the run being resumed
    rows_added: int = 0
    fetch_seconds: float = 0.0
    latest_date_before: Optional[str] = None
    latest_date_after: Optional[str] = None
    stopped: bool = False
    errors: list = field(default_factory=list)


def open_db(path: Path = config.PRICES_DB) -> sqlite3.Connection:
    conn = get_db(str(path))
    conn.execute("PRAGMA busy_timeout=15000")
    return conn


def latest_price_date(conn: sqlite3.Connection) -> Optional[str]:
    return conn.execute("SELECT MAX(collection_date) FROM prices").fetchone()[0]


def max_price_rowid(conn: sqlite3.Connection) -> int:
    # prices is append-only, so the rowid delta equals rows inserted.
    return conn.execute("SELECT COALESCE(MAX(rowid), 0) FROM prices").fetchone()[0]


def active_since(days: int = config.ACTIVE_DAYS) -> str:
    return (date.today() - timedelta(days=days)).isoformat()


def select_pairs(conn: sqlite3.Connection, scope: str) -> list[sqlite3.Row]:
    """Return the (market, variety) pairs a sync of this scope should cover."""
    base = """
        SELECT mv.market_id, mv.variety_id, m.market_name, m.region, v.variety_name
        FROM market_varieties mv
        JOIN markets   m ON m.id = mv.market_id
        JOIN varieties v ON v.id = mv.variety_id
    """
    if scope == "all":
        return conn.execute(base + " ORDER BY mv.market_id, mv.variety_id").fetchall()

    return conn.execute(
        base + """
        WHERE EXISTS (
                SELECT 1 FROM prices p
                WHERE p.market_id = mv.market_id AND p.variety_id = mv.variety_id
                  AND p.collection_date >= ?)
           OR NOT EXISTS (
                SELECT 1 FROM fetch_log fl
                WHERE fl.market_id = mv.market_id AND fl.variety_id = mv.variety_id
                  AND fl.endpoint = 'table' AND fl.status = 'ok')
        ORDER BY mv.market_id, mv.variety_id
        """,
        (active_since(),),
    ).fetchall()


def fetched_since(conn: sqlite3.Connection, cutoff: str) -> set[tuple[int, int]]:
    rows = conn.execute(
        """SELECT market_id, variety_id FROM fetch_log
           WHERE endpoint = 'table' AND status = 'ok' AND fetched_at >= ?""",
        (cutoff,),
    ).fetchall()
    return {(r[0], r[1]) for r in rows}


def count_pairs(conn: sqlite3.Connection) -> dict:
    """Pair counts per scope, used for run-time estimates in the UI."""
    total = conn.execute("SELECT COUNT(*) FROM market_varieties").fetchone()[0]
    return {"all": total, "active": len(select_pairs(conn, "active"))}


def run_sync(
    *,
    scope: str,
    cutoff: str,
    refresh_catalog: bool = False,
    export: bool = False,
    rate: float = 1.0,
    on_progress: ProgressFn = lambda p: None,
    should_stop: StopFn = lambda: False,
) -> SyncResult:
    """
    Run one sync. Blocking — the service calls this from a worker thread.

    cutoff: naive-UTC ISO timestamp in fetch_log's format. Pairs fetched OK at
            or after it are treated as done (this is what makes resume work).
    """
    result = SyncResult()
    conn = open_db()
    try:
        session = make_session(rate)
        result.latest_date_before = latest_price_date(conn)
        rowid_before = max_price_rowid(conn)

        # ── Catalog: always pick up new markets; full re-read when asked ─────
        on_progress({"phase": "catalog"})
        log.info("Checking nmis.et for new markets%s",
                 " and re-reading every market's crop list" if refresh_catalog else "")
        build_catalog(session, conn, full=refresh_catalog, should_stop=should_stop)
        if should_stop():
            result.stopped = True
            return result

        # ── Prices ────────────────────────────────────────────────────────────
        pairs = select_pairs(conn, scope)
        done = fetched_since(conn, cutoff)
        todo = [p for p in pairs if (p["market_id"], p["variety_id"]) not in done]
        result.pairs_total = len(pairs)
        result.pairs_skipped = len(pairs) - len(todo)
        result.pairs_done = result.pairs_skipped
        log.info("Prices: %d pairs in scope '%s', %d already done, %d to fetch",
                 len(pairs), scope, result.pairs_skipped, len(todo))

        started = time.monotonic()
        for i, pair in enumerate(todo, 1):
            if should_stop():
                result.stopped = True
                log.info("Stop requested — %d of %d pairs fetched", i - 1, len(todo))
                break

            market_id, variety_id = pair["market_id"], pair["variety_id"]
            label = f"{pair['market_name']} ({pair['region']}) · {pair['variety_name']}"
            url = f"{BASE_URL}/getMarketTable/'{market_id}'/'{variety_id}'/null/null/null"
            data = get_json(session, url)

            if isinstance(data, list):
                save_table_records(conn, market_id, variety_id, data, prefer_incoming=True)
                log_fetch(conn, market_id, variety_id, "table", "ok", len(data))
            else:
                result.pairs_failed += 1
                log_fetch(conn, market_id, variety_id, "table", "error",
                          error="No data or non-list response")
                log.warning("Failed: %s (market=%s variety=%s)", label, market_id, variety_id)
            result.pairs_done += 1

            elapsed = time.monotonic() - started
            per_pair = elapsed / i
            on_progress({
                "phase": "prices",
                "pairs_total": result.pairs_total,
                "pairs_done": result.pairs_done,
                "pairs_failed": result.pairs_failed,
                "rows_added": max_price_rowid(conn) - rowid_before,
                "current": label,
                "eta_seconds": round(per_pair * (len(todo) - i)),
            })
            if i % 100 == 0:
                log.info("Progress: %d/%d pairs, %d failed, %d new price rows",
                         result.pairs_done, result.pairs_total, result.pairs_failed,
                         max_price_rowid(conn) - rowid_before)

        result.fetch_seconds = time.monotonic() - started
        result.rows_added = max_price_rowid(conn) - rowid_before
        result.latest_date_after = latest_price_date(conn)
        log.info("Prices done: %d new rows, latest price date %s → %s",
                 result.rows_added, result.latest_date_before, result.latest_date_after)

        # ── Optional CSV export ───────────────────────────────────────────────
        if export and not result.stopped:
            on_progress({"phase": "export"})
            config.CSV_EXPORT.parent.mkdir(parents=True, exist_ok=True)
            export_csv(conn, str(config.CSV_EXPORT))

        return result
    finally:
        conn.close()
