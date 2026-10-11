"""Admin thresholds, monitoring and audit log (checklist 1.4, Tier 1 M4)."""

from datetime import datetime
from pathlib import Path

import pytest

from backend import consent
from backend.advisory.config import setting_int
from backend.advisory.seed_loader import load_seed
from backend.auth import create_access_token
from backend.routers.advisory_admin import validate_setting
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def people(platform):
    load_seed(platform, ROOT / "data" / "advisory_seed")
    return {"admin": add_user(platform, 9, role="admin", name="Admin"),
            "agent": add_user(platform, 5, role="agent", name="Agent"),
            "farmer": add_user(platform, 1, name="Abebe Kebede", phone="0911223344")}


def _token(user):
    return {"Authorization": f"Bearer {create_access_token({'sub': user['id'], 'role': user['role']})}"}


# ── Thresholds ──

@pytest.mark.parametrize("key,value,expected", [
    ("outbreak_min_scans", "5", "5"), ("outbreak_radius_km", 12.5, "12.5"),
    ("outbreak_verified_only", True, "1"), ("strict_dose_policy", "0", "0"),
])
def test_valid_settings(key, value, expected):
    assert validate_setting(key, value) == expected


@pytest.mark.parametrize("key,value", [
    ("outbreak_min_scans", "1"), ("outbreak_min_scans", "3.5"), ("outbreak_radius_km", "abc"),
    ("diagnosis_confidence_threshold", 0.99), ("outbreak_verified_only", "maybe"), ("not_a_setting", "1"),
])
def test_invalid_settings(key, value):
    with pytest.raises(ValueError):
        validate_setting(key, value)


def test_settings_api_changes_the_engine(client_as, people, platform):
    api = client_as(people["admin"])
    rows = {r["key"]: r for r in api.get("/api/admin/advisory-settings").json()}
    assert rows["outbreak_min_scans"]["min"] == 2 and rows["outbreak_min_scans"]["default"] == "3"
    r = api.put("/api/admin/advisory-settings/outbreak_min_scans", json={"value": 5})
    assert r.status_code == 200 and r.json()["value"] == "5"
    assert setting_int("outbreak_min_scans", 3, platform) == 5
    assert api.put("/api/admin/advisory-settings/outbreak_min_scans", json={"value": 0}).status_code == 400
    assert api.put("/api/admin/advisory-settings/nope", json={"value": 1}).status_code == 404
    assert client_as(people["agent"]).get("/api/admin/advisory-settings").status_code == 403


# ── Monitoring ──

def test_monitoring_counts_without_personal_data(client_as, people, platform):
    now = datetime.now().isoformat(sep=" ", timespec="seconds")
    platform.execute("INSERT INTO conversations (id, user_id, language) VALUES (1, 1, 'am')")
    for lang, flags, esc, fb in (("am", '["no_sources"]', 1, None), ("am", "[]", 0, "helpful"), ("en", '["dose_blocked"]', 0, "not_helpful")):
        platform.execute("""INSERT INTO messages (conversation_id, question, language, answer, confidence, guardrail_flags,
                            escalated, feedback, created_at) VALUES (1, 'Abebe asks about urea', ?, 'a', 'high', ?, ?, ?, ?)""",
                         (lang, flags, esc, fb, now))
    for disease, verified, outcome in (("leaf_rust", "leaf_rust", "improved"), ("yellow_rust", "leaf_rust", "worse"),
                                       ("leaf_rust", None, "unknown")):
        platform.execute("INSERT INTO diagnoses (farmer_id, disease_key, confidence, verified_disease, outcome, created_at) "
                         "VALUES (1, ?, 0.8, ?, ?, ?)", (disease, verified, outcome, now))
    platform.execute("INSERT INTO diagnoses (farmer_id, disease_key, confidence, source, created_at) "
                     "VALUES (1, 'yellow_rust', 0.9, 'simulated', ?)", (now,))
    platform.execute("INSERT INTO escalations (farmer_id, reason, status, created_at, resolved_at) "
                     "VALUES (1, 'no_knowledge', 'answered', '2026-10-09 08:00:00', '2026-10-09 11:00:00')")
    platform.commit()
    consent.set_consent(platform, 1, data=True, by=1)
    r = client_as(people["admin"]).get("/api/admin/monitoring", params={"days": 7})
    assert r.status_code == 200
    m = r.json()
    assert m["questions"]["total"] == 3 and m["questions"]["by_language"] == {"am": 2, "en": 1}
    assert m["questions"]["escalation_rate"] == pytest.approx(0.333, abs=0.001)
    assert m["questions"]["guardrail_flags"] == {"no_sources": 1, "dose_blocked": 1}
    assert m["questions"]["feedback"] == {"helpful": 1, "not_helpful": 1}
    assert m["questions"]["by_confidence"] == {"high": 3}
    assert m["diagnoses"]["total"] == 3                              # simulated scans are left out
    assert m["diagnoses"]["verified"] == 2 and m["diagnoses"]["verified_agreement"] == 0.5
    assert m["escalations"]["median_hours_to_resolve"] == 3.0
    assert m["consent"] == {"farmers": 1, "data": 1, "alerts": 0}
    assert len(m["daily"]) == 7
    assert "Abebe" not in str(m) and "0911223344" not in str(m)


# ── Audit log ──

def test_change_requests_are_logged_with_actor_and_result(client_as, people, platform):
    admin = client_as(people["admin"])
    admin.put("/api/admin/advisory-settings/outbreak_min_scans", json={"value": 4}, headers=_token(people["admin"]))
    client_as(people["farmer"]).put("/api/admin/advisory-settings/outbreak_min_scans", json={"value": 9},
                                    headers=_token(people["farmer"]))
    admin.get("/api/admin/advisory-settings", headers=_token(people["admin"]))          # reads are not logged here
    rows = [dict(r) for r in platform.execute("SELECT * FROM audit_log ORDER BY id")]
    assert [(r["actor_id"], r["action"], r["target_type"], r["target_id"], r["status"]) for r in rows] == [
        (9, "PUT /api/admin/advisory-settings/{key}", "key", "outbreak_min_scans", 200),
        (1, "PUT /api/admin/advisory-settings/{key}", "key", "outbreak_min_scans", 403),
    ]
    assert "4" not in (rows[0]["detail"] or "")                           # request bodies are never stored


def test_reading_another_farmers_data_is_logged_once(client_as, people, platform):
    consent.set_consent(platform, 1, data=True, by=1)
    agent = client_as(people["agent"])
    for _ in range(3):
        assert agent.get("/api/advisory/calendar", params={"farmer_id": 1}).status_code == 200
    client_as(people["farmer"]).get("/api/advisory/calendar")                         # own data: not logged
    rows = [tuple(r) for r in platform.execute("SELECT actor_id, action, target_id FROM audit_log")]
    assert rows == [(5, "farmer_data.read", "1")]


def test_audit_log_api(client_as, people, platform):
    consent.set_consent(platform, 1, data=True, by=1)
    client_as(people["agent"]).get("/api/advisory/calendar", params={"farmer_id": 1})
    admin = client_as(people["admin"])
    rows = admin.get("/api/admin/audit-log", params={"action": "farmer_data"}).json()
    assert rows[0]["actor_name"] == "Agent" and rows[0]["target_id"] == "1"
    assert admin.get("/api/admin/audit-log", params={"action": "nothing-like-this"}).json() == []
    assert client_as(people["agent"]).get("/api/admin/audit-log").status_code == 403
