"""
alerts.py — Alert engine (spec F7 neighbourhood disease alerts; F5 follow-ups).

run_alert_cycle() is called on a schedule (and by the admin "run now" endpoint):
  * outbreak alerts: when scans of a disease within R km in the last D days
    reach T, every consenting farmer growing that disease's crop inside the
    radius gets one alert per disease per ISO week (dedupe_key);
  * follow-ups: scheduled follow-up alerts whose date has come are queued;
  * stage reminders: when an active crop season enters a new crop-calendar stage
    (once per season and stage);
  * spray-rain warnings: a farmer with a disease found in the last 14 days (not yet
    better) gets one warning per day when rain is expected at the farm in the next
    24 hours (needs a weather provider; skipped without one).
Every alert needs the farmer's alert consent (farmer_profiles.consent_alerts).
Weekly caps (farmer_profiles.max_alerts_per_week) turn extra alerts into
'suppressed' rows instead of messages. Messages are rendered from the
translation files in the farmer's language when shown.
"""

from __future__ import annotations

import json
import logging
import sqlite3
import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from backend.advisory.config import local_now, setting_float, setting_int
from backend.advisory.context import nearby_disease_activity
from backend.advisory.i18n import t

log = logging.getLogger(__name__)


@dataclass
class CycleReport:
    outbreak_alerts: int = 0
    suppressed: int = 0
    follow_ups_due: int = 0
    skipped_no_consent: int = 0
    stage_reminders: int = 0
    spray_warnings: int = 0
    details: list[str] = field(default_factory=list)


def _sent_last_week(conn: sqlite3.Connection, farmer_id: int, now: datetime) -> int:
    since = (now - timedelta(days=7)).isoformat(sep=" ", timespec="seconds")
    return conn.execute(
        "SELECT COUNT(*) FROM alerts WHERE farmer_id=? AND status IN ('queued','sent','delivered','read') AND created_at>=?",
        (farmer_id, since)).fetchone()[0]


def _candidates(conn: sqlite3.Connection) -> list[dict]:
    """Farmers with a location and an active crop season."""
    cur = conn.cursor()
    cur.row_factory = sqlite3.Row
    return [dict(r) for r in cur.execute(
        """SELECT u.id AS farmer_id, u.language, p.latitude, p.longitude, p.consent_alerts, p.max_alerts_per_week,
                  p.alert_channel, lower(s.crop) AS crop
           FROM users u JOIN farmer_profiles p ON p.user_id = u.id
           JOIN farms f ON f.user_id = u.id JOIN crop_seasons s ON s.farm_id = f.id AND s.status = 'active'
           WHERE u.is_active = 1 AND p.latitude IS NOT NULL
           GROUP BY u.id, lower(s.crop)""")]


def _insert_alert(conn: sqlite3.Connection, report: CycleReport, now: datetime, *, farmer_id: int, type_: str,
                  severity: str, message_key: str, payload: dict, dedupe: str, consent: bool, cap: int | None,
                  default_cap: int, channel: str | None) -> str | None:
    """Queue one alert unless it exists already; no consent -> skipped, over the weekly cap -> suppressed."""
    if conn.execute("SELECT 1 FROM alerts WHERE dedupe_key=?", (dedupe,)).fetchone():
        return None
    if not consent:
        report.skipped_no_consent += 1
        return None
    cap = default_cap if cap is None else cap
    status = "queued" if _sent_last_week(conn, farmer_id, now) < cap else "suppressed"
    conn.execute(
        """INSERT INTO alerts (type, farmer_id, severity, message_key, payload, channel, status, dedupe_key, created_at)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (type_, farmer_id, severity, message_key, json.dumps(payload), channel or "app", status, dedupe,
         now.isoformat(sep=" ", timespec="seconds")))
    if status == "suppressed":
        report.suppressed += 1
    return status


def _stage_reminders(conn: sqlite3.Connection, report: CycleReport, now: datetime, default_cap: int) -> None:
    from backend.advisory.calendar import calendar_rules, farmer_point, season_calendar

    rules = calendar_rules(conn)
    cur = conn.cursor()
    cur.row_factory = sqlite3.Row
    seasons = [dict(r) for r in cur.execute(
        """SELECT s.*, f.user_id AS farmer_id, p.consent_alerts, p.max_alerts_per_week, p.alert_channel
           FROM crop_seasons s JOIN farms f ON f.id = s.farm_id JOIN users u ON u.id = f.user_id
           LEFT JOIN farmer_profiles p ON p.user_id = u.id
           WHERE s.status = 'active' AND u.is_active = 1""")]
    for s in seasons:
        _, _, altitude = farmer_point(conn, s["farmer_id"])
        cal = season_calendar(rules, s, altitude, now.date())
        st = cal["current_stage"]
        # Remind on the first days of a stage only (a missed hourly run still catches up).
        if not st or st.get("day_start") is None or not 0 <= cal["days_after_planting"] - st["day_start"] <= 2:
            continue
        status = _insert_alert(
            conn, report, now, farmer_id=s["farmer_id"], type_="stage_reminder", severity="info",
            message_key="stage_reminder", payload={"crop": s["crop"], "stage_key": st["stage_key"],
                                                   "day": cal["days_after_planting"], "season_id": s["id"]},
            dedupe=f"stage:{s['id']}:{st['stage_key']}", consent=bool(s["consent_alerts"]),
            cap=s["max_alerts_per_week"], default_cap=default_cap, channel=s["alert_channel"])
        if status == "queued":
            report.stage_reminders += 1


def _spray_rain_warnings(conn: sqlite3.Connection, report: CycleReport, now: datetime, weather,
                         default_cap: int) -> None:
    """Weather lookups happen outside any transaction; the inserts are one short transaction at the end."""
    from backend.advisory.adapters.weather import rain_in_next_hours
    from backend.advisory.calendar import farmer_point
    from backend.advisory.providers import ProviderError

    since = (now - timedelta(days=14)).isoformat(sep=" ", timespec="seconds")
    cur = conn.cursor()
    cur.row_factory = sqlite3.Row
    rows = [dict(r) for r in cur.execute(
        """SELECT d.farmer_id, COALESCE(d.verified_disease, d.disease_key) AS disease_key, MAX(d.created_at) AS at,
                  p.consent_alerts, p.max_alerts_per_week, p.alert_channel
           FROM diagnoses d JOIN diseases ds ON ds.key = COALESCE(d.verified_disease, d.disease_key)
           JOIN users u ON u.id = d.farmer_id LEFT JOIN farmer_profiles p ON p.user_id = u.id
           WHERE ds.is_disease = 1 AND d.source != 'simulated' AND d.created_at >= ?
             AND d.outcome IN ('unknown', 'same', 'worse') AND u.is_active = 1
           GROUP BY d.farmer_id""", (since,))]
    found = []
    for r in rows:
        dedupe = f"spray_rain:{r['farmer_id']}:{now.date().isoformat()}"
        if conn.execute("SELECT 1 FROM alerts WHERE dedupe_key=?", (dedupe,)).fetchone():
            continue
        if not r["consent_alerts"]:
            report.skipped_no_consent += 1
            continue
        lat, lon, _ = farmer_point(conn, r["farmer_id"])
        if lat is None:
            continue
        try:
            rain = rain_in_next_hours(weather.forecast(lat, lon), now, 24)
        except ProviderError as e:
            log.info("spray warning skipped for farmer %s: %s", r["farmer_id"], e)
            continue
        if rain:
            found.append((r, dedupe, rain[0].time.strftime("%H:00")))
    with conn:
        for r, dedupe, first in found:
            status = _insert_alert(
                conn, report, now, farmer_id=r["farmer_id"], type_="spray_rain_warning", severity="warning",
                message_key="spray_rain_warning",
                payload={"disease_key": r["disease_key"], "hours": 24, "time": first},
                dedupe=dedupe, consent=True, cap=r["max_alerts_per_week"], default_cap=default_cap,
                channel=r["alert_channel"])
            if status == "queued":
                report.spray_warnings += 1


def run_alert_cycle(conn: sqlite3.Connection, now: datetime | None = None, weather=None) -> CycleReport:
    """One pass of the alert engine. `weather`: a weather provider for spray-rain warnings (optional)."""
    now = now or local_now()
    report = CycleReport()
    radius = setting_float("outbreak_radius_km", 10, conn)
    window = setting_int("outbreak_window_days", 14, conn)
    threshold = setting_int("outbreak_min_scans", 3, conn)
    verified_only = setting_int("outbreak_verified_only", 0, conn) == 1
    default_cap = setting_int("max_alerts_per_week", 3, conn)
    crop_of = {k: c.lower() for k, c in conn.execute("SELECT key, crop FROM diseases WHERE is_disease=1")}
    iso_year, iso_week, _ = now.isocalendar()
    stamp = now.isoformat(sep=" ", timespec="seconds")

    with conn:
        for c in _candidates(conn):
            activity = nearby_disease_activity(conn, c["latitude"], c["longitude"], now, radius_km=radius,
                                               days=window, verified_only=verified_only)
            for a in activity:
                if crop_of.get(a["disease_key"]) != c["crop"] or a["scans"] < threshold:
                    continue
                dedupe = f"outbreak:{a['disease_key']}:{c['farmer_id']}:{iso_year}-W{iso_week:02d}"
                if conn.execute("SELECT 1 FROM alerts WHERE dedupe_key=?", (dedupe,)).fetchone():
                    continue
                if not c["consent_alerts"]:
                    report.skipped_no_consent += 1
                    continue
                cap = default_cap if c["max_alerts_per_week"] is None else c["max_alerts_per_week"]
                status = "queued" if _sent_last_week(conn, c["farmer_id"], now) < cap else "suppressed"
                payload = {"disease_key": a["disease_key"], "disease": a["disease"], "farms": a["farms"],
                           "scans": a["scans"], "radius": f"{radius:g}", "days": window, "nearest_km": a["nearest_km"]}
                conn.execute(
                    """INSERT INTO alerts (type, farmer_id, area, severity, message_key, payload, channel, status,
                                           dedupe_key, created_at)
                       VALUES ('neighborhood_disease', ?, ?, 'warning', 'outbreak_alert', ?, ?, ?, ?, ?)""",
                    (c["farmer_id"], json.dumps({"radius_km": radius}), json.dumps(payload), c["alert_channel"] or "app",
                     status, dedupe, stamp),
                )
                if status == "queued":
                    report.outbreak_alerts += 1
                else:
                    report.suppressed += 1
                report.details.append(f"{status}: {a['disease_key']} -> farmer {c['farmer_id']} ({a['scans']} scans)")

        # Follow-up reminders are alerts too: without alert consent they are suppressed, not sent.
        today = now.date().isoformat()
        no_consent = conn.execute(
            """UPDATE alerts SET status='suppressed' WHERE type='follow_up' AND status='scheduled' AND scheduled_for<=?
               AND farmer_id NOT IN (SELECT user_id FROM farmer_profiles WHERE consent_alerts=1)""", (today,))
        report.skipped_no_consent += no_consent.rowcount
        due = conn.execute(
            "UPDATE alerts SET status='queued' WHERE type='follow_up' AND status='scheduled' AND scheduled_for<=?",
            (today,))
        report.follow_ups_due = due.rowcount
        _stage_reminders(conn, report, now, default_cap)
    try:                                   # ABC share payments due / overdue (backend/abc_shares.py)
        from backend import abc_shares

        abc_shares.send_reminders(conn, now)
    except sqlite3.OperationalError:       # ABC tables not created (tests with a minimal schema)
        pass
    if weather is not None:
        _spray_rain_warnings(conn, report, now, weather, default_cap)
    return report


def render(alert: dict, lang: str, conn: sqlite3.Connection | None = None) -> str:
    """Alert text in the farmer's language: translation file + the disease name in that language."""
    payload = json.loads(alert.get("payload") or "{}")
    key = payload.get("disease_key")
    if key and conn is not None:
        from backend.advisory.diagnosis import disease_names

        payload["disease"] = disease_names(conn, lang).get(key, payload.get("disease") or key)
    payload.setdefault("disease", key or "")
    if payload.get("stage_key"):
        payload["stage"] = _label(f"stage_{payload['stage_key']}", lang, payload["stage_key"])
    if payload.get("crop"):
        payload["crop"] = _label(f"crop_{payload['crop']}", lang, payload["crop"])
    return t(alert["message_key"], lang, **payload)


def _label(key: str, lang: str, fallback: str) -> str:
    try:
        return t(key, lang)
    except KeyError:
        return fallback


# ── Scheduler (in-process, like the data-sync scheduler) ──────────────────────

class AlertScheduler:
    def __init__(self, conn_factory, interval_seconds: int = 3600, weather_factory=None):
        self.conn_factory = conn_factory
        self.weather_factory = weather_factory
        self.interval = interval_seconds
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._loop, name="advisory-alerts", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                weather = self.weather_factory() if self.weather_factory else None
                r = run_alert_cycle(self.conn_factory(), weather=weather)
                if r.outbreak_alerts or r.follow_ups_due or r.stage_reminders or r.spray_warnings:
                    log.info("alert cycle: %s outbreak, %s follow-ups, %s stage, %s spray-rain", r.outbreak_alerts,
                             r.follow_ups_due, r.stage_reminders, r.spray_warnings)
            except Exception:
                log.exception("alert cycle failed")
            self._stop.wait(self.interval)
