"""Crop calendar timeline, stage-start reminders and spray-rain warnings (Tier 1 M3)."""

from datetime import timedelta
from pathlib import Path

import pytest

from backend.advisory.adapters.weather import FixtureWeather
from backend.advisory.alerts import render, run_alert_cycle
from backend.advisory.calendar import calendar_rules, split_task, stage_timeline
from backend.advisory.seed_loader import load_seed
from tests.advisory.test_context import NOW, make_weather
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[2]
LAT, LON = 10.779, 39.847


@pytest.fixture
def seeded(platform):
    load_seed(platform, ROOT / "data" / "advisory_seed")
    return platform


def _farmer(conn, uid, consent=1, planted_days_ago=30):
    add_user(conn, uid, latitude=LAT, longitude=LON, altitude_m=1641, consent_alerts=consent)
    conn.execute("INSERT INTO farms (id, user_id, field_name, crop_name) VALUES (?, ?, 'Plot', 'wheat')", (uid, uid))
    conn.execute("INSERT INTO crop_seasons (farm_id, crop, planting_date, season) VALUES (?, 'wheat', ?, 'irrigated')",
                 (uid, (NOW.date() - timedelta(days=planted_days_ago)).isoformat()))
    conn.commit()


def _midland_start(conn, stage_key):
    return next(r["day_start"] for r in stage_timeline(calendar_rules(conn), "wheat", None, 1641, "irrigated")
                if r["stage_key"] == stage_key)


def test_timeline_is_ordered_and_split_task_keeps_the_source(seeded):
    stages = stage_timeline(calendar_rules(seeded), "wheat", None, 1641, "irrigated")
    assert [s["stage_key"] for s in stages][:2] == ["establishment", "tillering"]
    assert [s["day_start"] for s in stages] == sorted(s["day_start"] for s in stages)
    assert stage_timeline(calendar_rules(seeded), "maize", None, 1641, "irrigated") == []
    assert split_task("Hand weed 20-30 days after sowing [Manual p. 38]") == \
        {"text": "Hand weed 20-30 days after sowing", "source": "Manual p. 38"}


def test_stage_reminder_once_at_the_start_of_a_stage(seeded):
    start = _midland_start(seeded, "tillering")
    _farmer(seeded, 1, planted_days_ago=start)          # first day of tillering
    _farmer(seeded, 2, planted_days_ago=start + 5)      # in the middle of the stage: no reminder
    _farmer(seeded, 3, consent=0, planted_days_ago=start)
    r = run_alert_cycle(seeded, NOW)
    assert r.stage_reminders == 1 and r.skipped_no_consent == 1
    assert run_alert_cycle(seeded, NOW + timedelta(hours=2)).stage_reminders == 0          # dedupe
    alert = dict(seeded.execute("SELECT * FROM alerts WHERE type='stage_reminder'").fetchone())
    assert alert["farmer_id"] == 1
    assert "Tillering" in render(alert, "en", seeded) and "wheat" in render(alert, "en", seeded)
    assert "መዋለድ" in render(alert, "am", seeded) and "ስንዴ" in render(alert, "am", seeded)


def _diagnosed(conn, uid, outcome="unknown", days_ago=2, disease="leaf_rust"):
    conn.execute("INSERT INTO diagnoses (farmer_id, disease_key, confidence, outcome, created_at) VALUES (?,?,0.9,?,?)",
                 (uid, disease, outcome, (NOW - timedelta(days=days_ago)).isoformat(sep=" ", timespec="seconds")))
    conn.commit()


def test_spray_rain_warning_when_rain_expected(seeded):
    _farmer(seeded, 1, planted_days_ago=40)
    _diagnosed(seeded, 1)
    _farmer(seeded, 2, planted_days_ago=40)
    _diagnosed(seeded, 2, outcome="improved")              # better already: no warning
    _farmer(seeded, 3, planted_days_ago=40)
    _diagnosed(seeded, 3, days_ago=20)                     # too old
    _farmer(seeded, 4, planted_days_ago=40)
    _diagnosed(seeded, 4, disease="healthy")               # not a disease
    rainy = FixtureWeather(make_weather(future_rain_hours=(5, 6)))
    r = run_alert_cycle(seeded, NOW, weather=rainy)
    assert r.spray_warnings == 1
    alert = dict(seeded.execute("SELECT * FROM alerts WHERE type='spray_rain_warning'").fetchone())
    assert alert["farmer_id"] == 1 and alert["severity"] == "warning"
    text = render(alert, "en", seeded)
    assert "Rain is expected" in text and "14:00" in text and "rust" in text.lower()
    assert run_alert_cycle(seeded, NOW + timedelta(hours=1), weather=rainy).spray_warnings == 0   # once a day


def test_no_spray_warning_when_dry_or_without_weather_or_consent(seeded):
    _farmer(seeded, 1, planted_days_ago=40)
    _diagnosed(seeded, 1)
    _farmer(seeded, 2, consent=0, planted_days_ago=40)
    _diagnosed(seeded, 2)
    assert run_alert_cycle(seeded, NOW).spray_warnings == 0                               # no provider
    dry = FixtureWeather(make_weather(future_rain_hours=()))
    r = run_alert_cycle(seeded, NOW, weather=dry)
    assert r.spray_warnings == 0 and r.skipped_no_consent >= 1
