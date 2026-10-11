"""Diagnosis -> treatment plan (spec F5) and neighbourhood disease alerts (spec F7)."""

import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from backend import admin_areas
from backend.advisory.adapters.disease_service import DualPrediction, Prediction
from backend.advisory.adapters.weather import FixtureWeather
from backend.advisory.alerts import render, run_alert_cycle
from backend.advisory.diagnosis import build_plan, decide, diagnose_response, record_diagnosis
from backend.advisory.schema import ensure_schema
from backend.advisory.seed_loader import load_seed
from tests.advisory.test_context import make_weather

ROOT = Path(__file__).resolve().parents[2]
NOW = datetime(2026, 10, 5, 9, 0)
LAT0, LON0 = 10.77900542, 39.84749625


def pred(photo, conf, with_label=None, with_conf=None, out_of_range=()):
    return DualPrediction(
        "test-model", Prediction(photo, conf, {photo: conf}),
        Prediction(with_label, with_conf, {with_label: with_conf}) if with_label else None,
        {"altitude_m": 1641} if with_label else None, list(out_of_range))


@pytest.fixture
def conn():
    c = sqlite3.connect(":memory:", check_same_thread=False)
    c.executescript("""
        CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, role TEXT, language TEXT, is_active INTEGER DEFAULT 1,
                            woreda_pcode TEXT);
        CREATE TABLE farms (id INTEGER PRIMARY KEY, user_id INTEGER, field_name TEXT, crop_name TEXT);
    """)
    admin_areas.ensure_schema(c)
    ensure_schema(c)
    load_seed(c, ROOT / "data" / "advisory_seed")
    c.commit()
    return c


# ── decide() ────────────────────────────────────────────────────────────────

def test_invalid_photo(conn):
    d = decide(conn, pred("Invalid", 0.9, "Invalid", 0.95), 0.7)
    assert d.kind == "invalid_photo"


def test_agreement_uses_conditions(conn):
    d = decide(conn, pred("Yellow Rust", 0.8, "Yellow Rust", 0.95), 0.7)
    assert (d.kind, d.disease_key, d.mode, d.confidence) == ("disease", "yellow_rust", "photo_and_conditions", 0.95)


def test_disagreement_is_uncertain(conn):
    d = decide(conn, pred("Brown Rust", 1.0, "Powdery Mildew", 0.52), 0.7)
    assert (d.kind, d.mode, d.reason) == ("uncertain", "disagreement", "photo_conditions_disagree")
    assert (d.photo_label, d.conditions_label) == ("Brown Rust", "Powdery Mildew")


def test_out_of_range_falls_back_to_photo(conn):
    d = decide(conn, pred("Brown Rust", 0.99, "Yellow Rust", 1.0, [{"feature": "altitude_m"}]), 0.7)
    assert (d.kind, d.disease_key, d.mode, d.reason) == ("disease", "leaf_rust", "photo_only", "conditions_out_of_range")


def test_missing_conditions_falls_back_to_photo(conn):
    d = decide(conn, pred("Septoria", 0.9), 0.7)
    assert (d.kind, d.disease_key, d.reason) == ("disease", "septoria_tritici_blotch", "conditions_missing")


def test_low_confidence_is_uncertain(conn):
    d = decide(conn, pred("Septoria", 0.55, "Septoria", 0.6), 0.7)
    assert (d.kind, d.reason) == ("uncertain", "low_confidence")


def test_healthy(conn):
    assert decide(conn, pred("Healthy", 0.9, "Healthy", 0.92), 0.7).kind == "healthy"


# ── Treatment plan ──────────────────────────────────────────────────────────

def test_plan_matches_database_exactly(conn):
    """Spec F5: every product and dose in the plan matches the database exactly."""
    plan = build_plan(conn, "yellow_rust", "wheat", "en")
    db = {r[0]: r[1:] for r in conn.execute(
        """SELECT p.product_name, d.dose_per_ha, d.dose_per_knapsack, d.water_volume_l_per_ha, p.active_ingredient
           FROM approved_products p JOIN dosage_rules d ON d.product_id=p.id
           WHERE p.status='registered' AND d.target='yellow_rust'""")}
    assert {p.product_name for p in plan.products} == set(db) == {"PLACEHOLDER_FUNGICIDE_A"}
    for p in plan.products:
        assert (p.dose_per_ha, p.dose_per_knapsack, p.water_volume_l_per_ha, p.active_ingredient) == db[p.product_name]
    assert "PLACEHOLDER_BANNED_PRODUCT" not in {p.product_name for p in plan.products}
    assert plan.cultural_practices and plan.cultural_practices[0].startswith("PLACEHOLDER_VERIFY")
    assert plan.verified is False and plan.warnings          # placeholder data is flagged
    assert "gloves" in plan.safety and "seek medical help" in plan.safety


def test_plan_without_products_says_so(conn):
    conn.execute("DELETE FROM dosage_rules")
    plan = build_plan(conn, "yellow_rust", "wheat", "en")
    assert plan.products == [] and any("No registered product" in w for w in plan.warnings)


def test_plan_advises_waiting_for_rain(conn):
    conn.execute("UPDATE dosage_rules SET rain_free_hours=6")
    wf = FixtureWeather(make_weather(future_rain_hours=(3,))).forecast(LAT0, LON0)
    plan = build_plan(conn, "yellow_rust", "wheat", "en", weather_forecast=wf, now=NOW)
    assert plan.weather_advice and "within 6 hours" in plan.weather_advice
    dry = FixtureWeather(make_weather(future_rain_hours=(30,))).forecast(LAT0, LON0)
    assert build_plan(conn, "yellow_rust", "wheat", "en", weather_forecast=dry, now=NOW).weather_advice is None


def test_record_schedules_follow_up(conn):
    d = decide(conn, pred("Yellow Rust", 0.8, "Yellow Rust", 0.95), 0.7)
    did, follow_up = record_diagnosis(conn, farmer_id=1, farm_id=None, crop_season_id=None, decision=d,
                                      pred=pred("Yellow Rust", 0.8, "Yellow Rust", 0.95), latitude=LAT0,
                                      longitude=LON0, image_ref=None, now=NOW)
    assert follow_up == (NOW + timedelta(days=7)).date()
    alert = conn.execute("SELECT type, status, scheduled_for, dedupe_key FROM alerts").fetchone()
    assert alert == ("follow_up", "scheduled", follow_up.isoformat(), f"follow_up:{did}")
    out = diagnose_response(conn, decision=d, pred=pred("Yellow Rust", 0.8, "Yellow Rust", 0.95), lang="en",
                            plan=None, diagnosis_id=did, follow_up=follow_up, escalated=False)
    assert out["model"]["photo_only"]["label"] == "Yellow Rust" and any("E.C." in n for n in out["notes"])


def test_uncertain_diagnosis_has_no_follow_up_and_explains_disagreement(conn):
    p = pred("Brown Rust", 1.0, "Powdery Mildew", 0.52)
    d = decide(conn, p, 0.7)
    did, follow_up = record_diagnosis(conn, farmer_id=1, farm_id=None, crop_season_id=None, decision=d, pred=p,
                                      latitude=LAT0, longitude=LON0, image_ref=None, now=NOW)
    assert follow_up is None
    out = diagnose_response(conn, decision=d, pred=p, lang="en", plan=None, diagnosis_id=did, follow_up=None,
                            escalated=True)
    assert "Leaf rust" in out["notes"][0] and "Powdery mildew" in out["notes"][0]
    assert len(out["general_advice"]) == 3


# ── Neighbourhood alerts (F7) ───────────────────────────────────────────────

def _farmer(conn, fid, km_north, crop="wheat", consent=1, cap=3, lang="en"):
    conn.execute("INSERT INTO users (id, name, role, language) VALUES (?, ?, 'farmer', ?)", (fid, f"F{fid}", lang))
    conn.execute("""INSERT INTO farmer_profiles (user_id, latitude, longitude, consent_alerts, max_alerts_per_week)
                    VALUES (?,?,?,?,?)""", (fid, LAT0 + km_north / 111.0, LON0, consent, cap))
    conn.execute("INSERT INTO farms (id, user_id, field_name, crop_name) VALUES (?,?,?,?)", (fid, fid, "plot", crop))
    conn.execute("INSERT INTO crop_seasons (farm_id, crop, planting_date, season) VALUES (?,?, '2026-08-31', 'irrigated')",
                 (fid, crop))


def _scan(conn, fid, km_north, disease="yellow_rust", days_ago=1):
    conn.execute(
        """INSERT INTO diagnoses (farmer_id, disease_key, confidence, latitude, longitude, source, created_at)
           VALUES (?,?,0.9,?,?, 'simulated', ?)""",
        (fid, disease, LAT0 + km_north / 111.0, LON0, (NOW - timedelta(days=days_ago)).isoformat(sep=" ")))


@pytest.fixture
def village(conn):
    _farmer(conn, 10, 0)                 # wheat, at the outbreak centre
    _farmer(conn, 11, 8)                 # wheat, 8 km away (inside 10 km)
    _farmer(conn, 12, 30)                # wheat, 30 km away (outside)
    _farmer(conn, 13, 1, crop="maize")   # inside, but grows maize
    _farmer(conn, 14, 2, consent=0)      # inside, wheat, no alert consent
    for i, km in enumerate((0.5, 1, 2)):                     # 3 scans near the centre (threshold 3)
        _scan(conn, 100 + i, km)
    conn.commit()
    return conn


def test_outbreak_alerts_only_inside_radius_with_crop(village):
    """Spec F7 acceptance: simulated scans crossing the threshold alert only farmers inside the radius with the crop."""
    r = run_alert_cycle(village, NOW)
    alerted = {row[0] for row in village.execute("SELECT farmer_id FROM alerts WHERE type='neighborhood_disease'")}
    assert alerted == {10, 11}
    assert r.outbreak_alerts == 2 and r.skipped_no_consent == 1
    payload = json.loads(village.execute("SELECT payload FROM alerts WHERE farmer_id=10").fetchone()[0])
    assert payload["farms"] == 3 and payload["disease_key"] == "yellow_rust"


def test_no_duplicate_alerts(village):
    run_alert_cycle(village, NOW)
    second = run_alert_cycle(village, NOW + timedelta(hours=3))
    assert second.outbreak_alerts == 0
    assert village.execute("SELECT COUNT(*) FROM alerts WHERE farmer_id=10").fetchone()[0] == 1


def test_below_threshold_no_alert(conn):
    _farmer(conn, 10, 0)
    _scan(conn, 100, 1)
    _scan(conn, 101, 2)
    assert run_alert_cycle(conn, NOW).outbreak_alerts == 0


def test_weekly_cap_suppresses(village):
    village.execute("UPDATE farmer_profiles SET max_alerts_per_week=0 WHERE user_id=11")
    r = run_alert_cycle(village, NOW)
    status = village.execute("SELECT status FROM alerts WHERE farmer_id=11").fetchone()[0]
    assert status == "suppressed" and r.suppressed == 1


def test_follow_ups_become_due(conn):
    conn.execute("INSERT INTO farmer_profiles (user_id, consent_alerts) VALUES (1, 1)")   # see tests/test_consent.py
    conn.execute("""INSERT INTO alerts (type, farmer_id, message_key, payload, status, dedupe_key, scheduled_for)
                    VALUES ('follow_up', 1, 'follow_up_question', '{"disease": "Stripe rust", "days": 7}', 'scheduled',
                            'follow_up:1', ?)""", (NOW.date().isoformat(),))
    assert run_alert_cycle(conn, NOW).follow_ups_due == 1


def test_alert_rendered_in_farmers_language(village):
    run_alert_cycle(village, NOW)
    alert = dict(zip(("message_key", "payload"),
                     village.execute("SELECT message_key, payload FROM alerts WHERE farmer_id=10").fetchone()))
    assert render(alert, "en", village).startswith("Stripe rust (yellow rust) has been found on 3 farms within 10 km")
    am = render(alert, "am", village)
    assert am.startswith("ቢጫ ዋግ") and "ኪ.ሜ" in am          # disease name in Amharic, from diseases.name_am
    assert render(alert, "om", village).startswith("Waagii keelloo")  # diseases.name_om (draft)
    assert "ብጫ ዋግ" in render(alert, "ti", village)                   # diseases.name_ti + ti.json (draft)


def test_follow_up_shows_disease_name_not_key(conn):
    conn.execute("""INSERT INTO alerts (type, farmer_id, message_key, payload, status, dedupe_key)
                    VALUES ('follow_up', 1, 'follow_up_question', '{"disease_key": "leaf_rust", "days": 7}',
                            'queued', 'follow_up:x')""")
    alert = dict(zip(("message_key", "payload"), conn.execute(
        "SELECT message_key, payload FROM alerts WHERE dedupe_key='follow_up:x'").fetchone()))
    assert "leaf_rust" not in render(alert, "en", conn)
    assert "Leaf rust (brown rust)" in render(alert, "en", conn)
    assert "የቅጠል ዋግ" in render(alert, "am", conn)


def test_old_scans_outside_window_do_not_alert(conn):
    """Only scans from the last 14 days count: three 15-day-old scans must not trigger an outbreak alert."""
    _farmer(conn, 10, 0)
    for i, km in enumerate((0.5, 1, 2)):
        _scan(conn, 100 + i, km, days_ago=15)
    conn.commit()
    assert run_alert_cycle(conn, NOW).outbreak_alerts == 0
    _scan(conn, 103, 1, days_ago=13)       # still only one recent scan
    _scan(conn, 104, 1, days_ago=2)
    _scan(conn, 105, 1, days_ago=1)        # now three inside the window
    conn.commit()
    assert run_alert_cycle(conn, NOW).outbreak_alerts == 1
