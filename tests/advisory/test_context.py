"""Context Builder (spec F2): crop stage, nearby scans, weather summary, inputs, degradation."""

import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path

import pytest

from backend import admin_areas
from backend.advisory.adapters.platform import LocalFarmerProfileSource, StubInputHub
from backend.advisory.adapters.weather import FixtureWeather, past_week_conditions, rain_in_next_hours
from backend.advisory.context import build_context, compute_stage, nearby_disease_activity
from backend.advisory.providers import MarketQuote, ProviderError
from backend.advisory.schema import ensure_schema
from backend.advisory.seed_loader import load_seed

ROOT = Path(__file__).resolve().parents[2]
NOW = datetime(2026, 10, 5, 9, 0)          # local time
DEWA_CHEFFA = "ET031001"                   # centre 10.779 N, 39.847 E

RULES = [
    # generic irrigated wheat calendar (fixture values, not agronomic advice)
    {"crop": "wheat", "variety": None, "altitude_min_m": None, "altitude_max_m": None, "season": "irrigated",
     "stage_key": "establishment", "stage_name": "Establishment", "day_start": 0, "day_end": 20, "actions": "[]"},
    {"crop": "wheat", "variety": None, "altitude_min_m": None, "altitude_max_m": None, "season": "irrigated",
     "stage_key": "tillering", "stage_name": "Tillering", "day_start": 21, "day_end": 45, "actions": '["scout"]'},
    {"crop": "wheat", "variety": None, "altitude_min_m": None, "altitude_max_m": None, "season": "irrigated",
     "stage_key": "heading", "stage_name": "Heading", "day_start": 46, "day_end": 80, "actions": "[]"},
    # variety-specific set (more specific, wins when the variety matches)
    {"crop": "wheat", "variety": "Kingbird", "altitude_min_m": None, "altitude_max_m": None, "season": None,
     "stage_key": "kb_vegetative", "stage_name": "Kingbird vegetative", "day_start": 0, "day_end": 50, "actions": "[]"},
    # altitude-limited set
    {"crop": "wheat", "variety": None, "altitude_min_m": 2400, "altitude_max_m": 3200, "season": None,
     "stage_key": "highland_tillering", "stage_name": "Highland tillering", "day_start": 0, "day_end": 60, "actions": "[]"},
]


# ── Crop stage ──────────────────────────────────────────────────────────────

def test_stage_current_and_next():
    s = compute_stage(RULES, "wheat", None, 1600, "irrigated", 30)
    assert (s.stage_key, s.next_stage_key, s.days_to_next_stage) == ("tillering", "heading", 16)
    assert s.actions == ["scout"]


def test_more_specific_rules_win():
    assert compute_stage(RULES, "wheat", "Kingbird", 1600, "irrigated", 30).stage_key == "kb_vegetative"
    assert compute_stage(RULES, "wheat", None, 2600, "meher", 10).stage_key == "highland_tillering"


def test_stage_edges():
    assert compute_stage(RULES, "wheat", None, 1600, "irrigated", 200).stage_key == "past_last_stage"
    assert compute_stage([], "wheat", None, 1600, "irrigated", 30).stage_key is None
    assert compute_stage(RULES, "maize", None, 1600, "irrigated", 30).stage_key is None


# ── Weather summaries ───────────────────────────────────────────────────────

def make_weather(past_temp=18.0, past_hum=70.0, past_rain_per_hour=0.5, future_rain_hours=(5, 6)) -> dict:
    """Open-Meteo shaped fixture: 7 days back + 7 days ahead, hourly."""
    start = datetime(NOW.year, NOW.month, NOW.day) - timedelta(days=7)
    times, temp, hum, rain, prob = [], [], [], [], []
    for i in range(14 * 24):
        t = start + timedelta(hours=i)
        times.append(t.isoformat(timespec="minutes"))
        future = t > NOW
        temp.append(20.0 if future else past_temp)
        hum.append(60.0 if future else past_hum)
        hours_ahead = int((t - NOW).total_seconds() // 3600)
        rain.append(2.0 if future and hours_ahead in future_rain_hours else (0.0 if future else past_rain_per_hour))
        prob.append(80 if future and hours_ahead in future_rain_hours else 5)
    days = [(start + timedelta(days=d)).date().isoformat() for d in range(14)]
    return {
        "elevation": 1641.0,
        "current": {"time": NOW.isoformat(timespec="minutes"), "temperature_2m": 17.0, "relative_humidity_2m": 69,
                    "precipitation": 0.0},
        "hourly": {"time": times, "temperature_2m": temp, "relative_humidity_2m": hum, "precipitation": rain,
                   "precipitation_probability": prob},
        "daily": {"time": days, "temperature_2m_min": [12.0] * 14, "temperature_2m_max": [24.0] * 14,
                  "precipitation_sum": [1.0] * 14, "precipitation_probability_max": [30] * 14},
    }


def test_past_week_conditions_feed_the_disease_model():
    wf = FixtureWeather(make_weather(past_temp=18, past_hum=70, past_rain_per_hour=0.5)).forecast(10.78, 39.85)
    c = past_week_conditions(wf, NOW)
    assert c["temperature_c"] == 18 and c["humidity_pct"] == 70
    assert c["precipitation_mm_per_week"] == pytest.approx(0.5 * c["hours_covered"], abs=0.6)
    assert 160 <= c["hours_covered"] <= 170


def test_rain_in_next_hours():
    wf = FixtureWeather(make_weather(future_rain_hours=(5, 30))).forecast(10.78, 39.85)
    assert len(rain_in_next_hours(wf, NOW, 24)) == 1
    assert len(rain_in_next_hours(wf, NOW, 48)) == 2


# ── Full context on a fixture database ──────────────────────────────────────

class FakeMarket:
    def quotes_near(self, crop, lat, lon, n=3):
        q = MarketQuote(crop, "kombolcha kebele 03 Gebeya", "Amhara", 8850.0, "Quintal", date(2026, 8, 5),
                        "rising", -4.5, 4, "high")
        return [(q, {"distance_km": 37.9, "method": "name_match"})]


class DownWeather:
    name = "down"

    def forecast(self, *a, **k):
        raise ProviderError("network down")


@pytest.fixture(scope="module")
def db(tmp_path_factory):
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.executescript("""
        CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, phone TEXT, role TEXT, region TEXT, zone TEXT,
                            woreda TEXT, language TEXT);
        CREATE TABLE farms (id INTEGER PRIMARY KEY, user_id INTEGER, field_name TEXT, crop_name TEXT, variety TEXT,
                            area_ha REAL, planted_date TEXT, status TEXT DEFAULT 'healthy');
    """)
    admin_areas.import_boundaries(conn)
    ensure_schema(conn)
    load_seed(conn, ROOT / "data" / "advisory_seed")
    for r in RULES:
        conn.execute("""INSERT INTO crop_calendar_rules (crop, variety, altitude_min_m, altitude_max_m, season, stage_key,
                        stage_name, day_start, day_end, actions) VALUES (?,?,?,?,?,?,?,?,?,?)""",
                     (r["crop"], r["variety"], r["altitude_min_m"], r["altitude_max_m"], r["season"], r["stage_key"],
                      r["stage_name"], r["day_start"], r["day_end"], r["actions"]))
    conn.execute("INSERT INTO users (id, name, phone, role, language, woreda_pcode) VALUES (1, 'Demo Farmer', '0944', 'farmer', 'am', ?)",
                 (DEWA_CHEFFA,))
    conn.execute("INSERT INTO farmer_profiles (user_id, kebele, consent_data, consent_alerts) VALUES (1, 'PLACEHOLDER_KEBELE', 1, 1)")
    conn.execute("INSERT INTO farms (id, user_id, field_name, crop_name, variety, area_ha, irrigated) VALUES (10, 1, 'Plot A', 'wheat', NULL, 0.5, 1)")
    conn.execute("INSERT INTO crop_seasons (farm_id, crop, planting_date, season) VALUES (10, 'wheat', ?, 'irrigated')",
                 ((NOW.date() - timedelta(days=30)).isoformat(),))
    # Scans: (farmer, disease, km north of the farm, days ago, verified disease or None)
    other_farmers = [(2, "yellow_rust", 2, 3, None), (3, "yellow_rust", 6, 5, None), (4, "yellow_rust", 9, 1, None),
                     (5, "yellow_rust", 25, 2, None),        # outside 10 km
                     (6, "yellow_rust", 3, 20, None),        # older than 14 days
                     (7, "healthy", 1, 1, None),             # not a disease
                     (8, "septoria_tritici_blotch", 4, 2, "leaf_rust"),  # DA corrected to leaf rust
                     (1, "leaf_rust", 0, 4, None)]           # the farmer's own scan
    lat0, lon0 = 10.77900542, 39.84749625
    for i, (fid, disease, km, days_ago, verified) in enumerate(other_farmers):
        conn.execute(
            """INSERT INTO diagnoses (farmer_id, disease_key, confidence, latitude, longitude, verified_disease,
                                      verified_by, created_at, source) VALUES (?,?,?,?,?,?,?,?, 'simulated')""",
            (fid, disease, 0.9, lat0 + km / 111.0, lon0, verified, 99 if verified else None,
             (NOW - timedelta(days=days_ago)).isoformat(sep=" ", timespec="seconds")))
    offers = tmp_path_factory.mktemp("hub") / "offers.csv"
    offers.write_text((ROOT / "data" / "advisory_seed" / "input_hub_offers.csv").read_text(encoding="utf-8"),
                      encoding="utf-8")
    conn.commit()
    return conn, offers


def _context(db, weather=None):
    conn, offers = db
    return build_context(conn, 1, profiles=LocalFarmerProfileSource(conn),
                         weather=weather or FixtureWeather(make_weather()), market=FakeMarket(),
                         input_hub=StubInputHub(conn, offers), now=NOW)


def test_nearby_activity_counts_only_inside_radius_and_window(db):
    act = nearby_disease_activity(db[0], 10.77900542, 39.84749625, NOW, radius_km=10, days=14, exclude_farmer_id=1)
    by = {a["disease_key"]: a for a in act}
    assert by["yellow_rust"]["scans"] == 3 and by["yellow_rust"]["farms"] == 3
    assert by["yellow_rust"]["nearest_km"] == pytest.approx(2, abs=0.2)
    assert by["leaf_rust"]["scans"] == 1          # counted by the DA's corrected disease
    assert "healthy" not in by and "septoria_tritici_blotch" not in by


def test_nearby_verified_only(db):
    act = nearby_disease_activity(db[0], 10.77900542, 39.84749625, NOW, radius_km=10, days=14, verified_only=True)
    assert [a["disease_key"] for a in act] == ["leaf_rust"]


def test_context_profile_location_and_altitude(db):
    ctx = _context(db)
    p = ctx.profile
    assert (p["region"], p["zone"], p["woreda"]) == ("Amhara", "Oromo Nationality Administration", "Dewa Cheffa")
    assert p["latitude"] == pytest.approx(10.779, abs=0.001)      # woreda centre (no GPS point)
    assert p["altitude_m"] == 1641.0 and p["altitude_source"] == "terrain"
    assert ctx.farms[0]["irrigated"] == 1


def test_context_crop_stage(db):
    crop = _context(db).crops[0]
    assert crop["days_after_planting"] == 30
    # The seeded MoA calendar (altitude-specific) wins over the generic fixture rules:
    # 1641 m is the midland band, day 30 is tillering.
    assert crop["stage"]["stage_key"] == "tillering" and crop["stage"]["next_stage_key"] == "stem_elongation"
    assert "midland" in crop["stage"]["stage_name"]
    assert "E.C." in crop["planting_date_display"]


def test_context_inputs_registered_only_nearest_first(db):
    inputs = _context(db).inputs
    assert set(inputs.data["risks"]) == {"yellow_rust", "leaf_rust"}
    offers = inputs.data["offers"]
    names = {o["product_name"] for o in offers}
    assert "PLACEHOLDER_BANNED_PRODUCT" not in names
    assert names <= {"PLACEHOLDER_FUNGICIDE_A", "PLACEHOLDER_FUNGICIDE_B"}   # C targets powdery mildew only
    distances = [o["distance_km"] for o in offers]
    assert distances == sorted(distances)          # nearest first; the sponsored Kombolcha offer is not promoted
    assert offers[-1]["sponsored"] is True


def test_context_weather_and_market(db):
    ctx = _context(db)
    assert ctx.weather.status == "ok"
    assert ctx.weather.data["past_week"]["humidity_pct"] == 70
    assert ctx.market.data[0]["trend"] == "rising" and ctx.market.data[0]["forecast_change_pct"] == -4.5
    assert ctx.diagnoses.status == "ok" and ctx.diagnoses.data[0]["disease_key"] == "leaf_rust"


def test_context_degrades_when_weather_is_down(db):
    ctx = _context(db, weather=DownWeather())
    assert ctx.weather.status == "unavailable" and "network down" in ctx.weather.message
    assert ctx.profile["altitude_m"] is None          # no profile altitude and no terrain elevation
    assert ctx.market.status == "ok" and ctx.nearby.status == "ok"
