"""
manager.py — Runs one sync at a time in a background thread.

Owns the live progress shown in the UI, the per-run log file, and the stop
flag. The service must run as a single process (one uvicorn worker), because
this lock is what prevents two syncs writing to the database at once.
"""

import logging
import threading
import time
from collections import deque
from typing import Optional

from scraper import config, store
from scraper.retrain import needs_retrain, run_retrain
from scraper.sync import open_db, latest_price_date, run_sync

log = logging.getLogger(__name__)

LOG_FORMAT = "%(asctime)s [%(levelname)s] %(message)s"
PERSIST_EVERY_SECONDS = 5


class SyncBusyError(RuntimeError):
    pass


class _MemoryHandler(logging.Handler):
    def __init__(self, lines: deque):
        super().__init__(logging.INFO)
        self.lines = lines
        self.setFormatter(logging.Formatter(LOG_FORMAT, "%H:%M:%S"))

    def emit(self, record):
        self.lines.append(self.format(record))


class SyncManager:
    def __init__(self):
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self._progress: dict = {}
        self._log_lines: deque = deque(maxlen=300)

    # ── Queries ───────────────────────────────────────────────────────────────

    @property
    def busy(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def progress(self) -> Optional[dict]:
        if not self.busy:
            return None
        return {**self._progress, "stop_requested": self._stop.is_set()}

    def live_log(self) -> list[str]:
        return list(self._log_lines)

    @staticmethod
    def log_path(run_id: int):
        return config.RUN_LOG_DIR / f"run_{run_id}.log"

    # ── Commands ──────────────────────────────────────────────────────────────

    def start(self, *, trigger: str, triggered_by: str, scope: str,
              refresh_catalog: bool, export_csv: bool, retrain: bool, rate: float) -> int:
        return self._launch(trigger=trigger, triggered_by=triggered_by, scope=scope,
                            refresh_catalog=refresh_catalog, export_csv=export_csv,
                            retrain=retrain, rate=rate, cutoff=store.fetch_log_now(),
                            resumed_from=None)

    def resume(self, run_id: int, *, triggered_by: str, rate: float) -> int:
        old = store.get_run(run_id)
        if not old:
            raise LookupError(f"Sync run {run_id} not found")
        if old["status"] not in ("cancelled", "interrupted", "failed"):
            raise ValueError("Only stopped, interrupted or failed runs can be resumed")
        # Same cutoff: pairs the old run already fetched are skipped.
        return self._launch(trigger="manual", triggered_by=triggered_by, scope=old["scope"],
                            refresh_catalog=False, export_csv=bool(old["export_csv"]),
                            retrain=bool(old["retrain"]), rate=rate, cutoff=old["cutoff"],
                            resumed_from=run_id)

    def stop(self) -> bool:
        if not self.busy:
            return False
        self._stop.set()
        log.info("Stop requested — finishing the current request")
        return True

    def shutdown(self, timeout: float = 10):
        """Called when the service exits; the run is marked interrupted on next start."""
        self._stop.set()
        if self._thread:
            self._thread.join(timeout)

    # ── Internals ─────────────────────────────────────────────────────────────

    def _launch(self, **kw) -> int:
        with self._lock:
            if self.busy:
                raise SyncBusyError("A sync is already running")

            conn = open_db()
            try:
                latest_before = latest_price_date(conn)
            finally:
                conn.close()

            run_id = store.create_run(
                trigger=kw["trigger"], triggered_by=kw["triggered_by"], scope=kw["scope"],
                refresh_catalog=kw["refresh_catalog"], export_csv=kw["export_csv"],
                retrain=kw["retrain"], cutoff=kw["cutoff"], resumed_from=kw["resumed_from"],
                latest_date_before=latest_before,
            )
            self._stop.clear()
            self._log_lines.clear()
            self._progress = {
                "run_id": run_id, "scope": kw["scope"], "phase": "starting",
                "started_at": store.utc_now(), "pairs_total": 0, "pairs_done": 0,
                "pairs_failed": 0, "rows_added": 0, "current": None, "eta_seconds": None,
            }
            self._thread = threading.Thread(
                target=self._worker, args=(run_id, kw), name=f"sync-run-{run_id}", daemon=True
            )
            self._thread.start()
            return run_id

    def _retrain(self, run_id: int, rows_added: int, latest_date: Optional[str]):
        skip_reason = needs_retrain(rows_added, latest_date)
        if skip_reason:
            log.info("Retrain skipped: %s", skip_reason)
            store.update_run(run_id, retrain_status="skipped", retrain_message=skip_reason)
            return
        self._progress.update({"phase": "retrain", "current": None, "eta_seconds": None})
        store.update_run(run_id, retrain_status="running")
        try:
            status, message = run_retrain(self._stop.is_set)
        except Exception as e:  # noqa: BLE001 — a training failure must not fail the sync
            log.exception("Retrain could not start")
            status, message = "failed", f"Could not start training: {type(e).__name__}: {e}"
        store.update_run(run_id, retrain_status=status, retrain_message=message)

    def _worker(self, run_id: int, kw: dict):
        config.RUN_LOG_DIR.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(self.log_path(run_id), encoding="utf-8")
        file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
        file_handler.setLevel(logging.INFO)
        mem_handler = _MemoryHandler(self._log_lines)
        pkg_logger = logging.getLogger("scraper")
        pkg_logger.setLevel(logging.INFO)
        pkg_logger.addHandler(file_handler)
        pkg_logger.addHandler(mem_handler)

        last_persist = 0.0

        def on_progress(update: dict):
            nonlocal last_persist
            self._progress.update(update)
            now = time.monotonic()
            if now - last_persist >= PERSIST_EVERY_SECONDS:
                last_persist = now
                store.update_run(run_id, **{k: self._progress[k] for k in
                                            ("pairs_total", "pairs_done", "pairs_failed", "rows_added")})

        try:
            log.info("Sync #%d started by %s — scope=%s, catalog refresh=%s, retrain=%s, rate=%.2fs%s",
                     run_id, kw["triggered_by"], kw["scope"], kw["refresh_catalog"],
                     kw["retrain"], kw["rate"],
                     f", resuming #{kw['resumed_from']}" if kw["resumed_from"] else "")
            result = run_sync(
                scope=kw["scope"], cutoff=kw["cutoff"],
                refresh_catalog=kw["refresh_catalog"], export=kw["export_csv"],
                rate=kw["rate"], on_progress=on_progress, should_stop=self._stop.is_set,
            )
            if result.stopped:
                status = "cancelled"
            elif result.pairs_failed:
                status = "partial"
            else:
                status = "success"
            latest_after = result.latest_date_after or result.latest_date_before
            store.update_run(
                run_id, pairs_total=result.pairs_total, pairs_done=result.pairs_done,
                pairs_failed=result.pairs_failed, rows_added=result.rows_added,
                latest_date_after=latest_after, fetch_seconds=round(result.fetch_seconds, 1),
            )

            if kw["retrain"] and not result.stopped:
                self._retrain(run_id, result.rows_added, latest_after)

            store.update_run(run_id, status=status, finished_at=store.utc_now())
            log.info("Sync #%d finished: %s — %d new price rows, %d failed pairs",
                     run_id, status, result.rows_added, result.pairs_failed)
        except Exception as e:  # noqa: BLE001 — record any failure on the run
            log.exception("Sync #%d failed", run_id)
            store.update_run(run_id, status="failed", finished_at=store.utc_now(),
                             error=f"{type(e).__name__}: {e}",
                             **{k: self._progress.get(k, 0) for k in
                                ("pairs_total", "pairs_done", "pairs_failed", "rows_added")})
        finally:
            pkg_logger.removeHandler(file_handler)
            pkg_logger.removeHandler(mem_handler)
            file_handler.close()


manager = SyncManager()
