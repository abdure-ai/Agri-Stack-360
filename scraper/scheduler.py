"""
scheduler.py — Starts the daily sync at the configured local time.

Checks every 30 seconds. If the service was down at the scheduled time, the
sync runs as soon as it comes back up the same day. On the configured weekday
the run covers every pair (full sweep); on other days only active pairs.
"""

import logging
import threading
from datetime import date, datetime, time as dtime, timedelta, timezone
from typing import Optional

from scraper import store
from scraper.manager import SyncBusyError, manager

log = logging.getLogger(__name__)

CHECK_INTERVAL_SECONDS = 30


def _scheduled_time(settings: dict) -> dtime:
    hh, mm = settings["time"].split(":")
    return dtime(int(hh), int(mm))


def scope_for(day: date, settings: dict) -> str:
    return "all" if settings["full_sync_weekday"] == day.weekday() else "active"


def mark_today_handled_if_past(settings: dict) -> dict:
    """
    When the schedule is switched on or its time changed after today's slot has
    passed, the first run should be the next slot, not an immediate catch-up.
    """
    now = datetime.now()
    if now.time() >= _scheduled_time(settings):
        settings["last_scheduled_date"] = now.date().isoformat()
    return settings


def next_run(settings: dict) -> Optional[dict]:
    if not settings["enabled"]:
        return None
    now = datetime.now()
    today_slot = datetime.combine(now.date(), _scheduled_time(settings))
    handled_today = settings["last_scheduled_date"] == now.date().isoformat()

    if not handled_today and now >= today_slot:
        at = now                          # due now (catch-up)
    elif now < today_slot and not handled_today:
        at = today_slot
    else:
        at = today_slot + timedelta(days=1)
    return {
        "at": at.astimezone().isoformat(timespec="seconds"),
        "scope": scope_for(at.date(), settings),
    }


def _already_synced_today(scope: str) -> bool:
    """True if a successful run today already covered this scope."""
    # started_at is stored in UTC, so compare against local midnight in UTC.
    midnight = datetime.combine(date.today(), dtime.min).astimezone(timezone.utc)
    for run in store.runs_started_since(midnight.isoformat(timespec="seconds")):
        if run["status"] in ("success", "partial") and (run["scope"] == "all" or run["scope"] == scope):
            return True
    return False


def _tick():
    settings = store.get_settings()
    if not settings["enabled"]:
        return
    now = datetime.now()
    today = now.date().isoformat()
    if settings["last_scheduled_date"] == today or now.time() < _scheduled_time(settings):
        return
    if manager.busy:
        return  # try again once the current run finishes

    scope = scope_for(now.date(), settings)
    store.save_settings(last_scheduled_date=today)
    if _already_synced_today(scope):
        log.info("Scheduled %s sync skipped — already synced today", scope)
        return
    try:
        manager.start(
            trigger="schedule", triggered_by="scheduler", scope=scope,
            refresh_catalog=scope == "all" and settings["refresh_catalog_on_full"],
            export_csv=settings["export_csv"], retrain=settings["retrain_after_sync"],
            rate=settings["rate"],
        )
    except SyncBusyError:
        store.save_settings(last_scheduled_date=None)  # retry on next tick


class Scheduler:
    def __init__(self):
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self):
        self._thread = threading.Thread(target=self._loop, name="sync-scheduler", daemon=True)
        self._thread.start()

    def stop(self):
        self._stop.set()
        if self._thread:
            self._thread.join(5)

    def _loop(self):
        while not self._stop.is_set():
            try:
                _tick()
            except Exception:  # noqa: BLE001 — never let the scheduler thread die
                log.exception("Scheduler tick failed")
            self._stop.wait(CHECK_INTERVAL_SECONDS)


scheduler = Scheduler()
