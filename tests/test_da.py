"""DA Copilot (checklist 1.2): scoping by assignment/region/consent, visit list, inbox, verify, register."""

from datetime import timedelta
from pathlib import Path

import pytest

from backend import admin_areas, consent
from backend.advisory.config import local_now
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]
TODAY = local_now()


@pytest.fixture
def village(platform):
    load_seed(platform, ROOT / "data" / "advisory_seed")
    ids = {
        "admin": add_user(platform, 9, role="admin", name="Admin"),
        "da": add_user(platform, 5, role="agent", name="DA Five"),
        "other_da": add_user(platform, 6, role="agent", name="DA Six"),
    }
    add_user(platform, 1, name="Assigned", assigned_da_id=5, consent_data=1, altitude_m=1641)
    add_user(platform, 2, name="Same region", consent_data=1)
    add_user(platform, 3, name="No consent", consent_data=0, assigned_da_id=5)
    add_user(platform, 4, name="Other region", region="Oromia", consent_data=1)
    platform.execute("INSERT INTO farms (id, user_id, field_name, crop_name) VALUES (10, 1, 'Plot', 'wheat')")
    platform.execute("INSERT INTO crop_seasons (farm_id, crop, planting_date, season) VALUES (10, 'wheat', ?, 'irrigated')",
                     ((TODAY.date() - timedelta(days=30)).isoformat(),))
    platform.commit()
    return ids


def _ago(days):
    return (TODAY - timedelta(days=days)).isoformat(sep=" ", timespec="seconds")


def _diagnosis(conn, did, farmer, disease="leaf_rust", follow_up=None, verified=None):
    conn.execute("""INSERT INTO diagnoses (id, farmer_id, disease_key, confidence, follow_up_date, verified_disease,
                                           created_at) VALUES (?,?,?,0.5,?,?,?)""",
                 (did, farmer, disease, follow_up, verified, _ago(10)))


def _escalation(conn, eid, farmer, reason, days_ago, assigned=5, diagnosis=None):
    conn.execute("INSERT INTO escalations (id, farmer_id, reason, assigned_to, diagnosis_id, created_at) VALUES (?,?,?,?,?,?)",
                 (eid, farmer, reason, assigned, diagnosis, _ago(days_ago)))
    conn.commit()


def test_da_sees_only_consenting_farmers_in_scope(client_as, village):
    farmers = client_as(village["da"]).get("/api/da/farmers").json()
    assert [f["id"] for f in farmers] == [1, 2]                      # sorted by name: Assigned, Same region
    assert farmers[0]["assigned_to_me"] and not farmers[1]["assigned_to_me"]
    assert farmers[0]["crops"][0]["days_after_planting"] == 30 and farmers[0]["crops"][0]["stage_name"]
    assert {f["id"] for f in client_as(village["admin"]).get("/api/da/farmers").json()} == {1, 2, 3, 4}


def test_farmers_and_traders_cannot_use_the_copilot(client_as, village, platform):
    farmer = dict(platform.execute("SELECT * FROM users WHERE id=1").fetchone())
    assert client_as(farmer).get("/api/da/farmers").status_code == 403


def test_visit_list_order_and_reasons(client_as, village, platform):
    _diagnosis(platform, 100, 2, follow_up=(TODAY.date() - timedelta(days=3)).isoformat())   # overdue: 40
    _diagnosis(platform, 101, 2)
    _escalation(platform, 1, 2, "low_confidence", 6, diagnosis=101)                            # unsure: 60
    _escalation(platform, 2, 1, "advice_failed", 1)                                            # worse: 100
    _diagnosis(platform, 102, 1, verified="leaf_rust")
    _escalation(platform, 3, 1, "low_confidence", 2, diagnosis=102)                            # verified: 0
    _escalation(platform, 4, 3, "advice_failed", 9)                                            # no consent: hidden
    visits = client_as(village["da"]).get("/api/da/priorities").json()
    assert [(v["farmer"]["id"], v["score"]) for v in visits] == [(2, 100), (1, 100)]           # tie: older first
    assert [r["reason"] for r in visits[0]["reasons"]] == ["uncertain_diagnosis", "overdue_follow_up"]


def test_answer_reaches_the_farmer_once(client_as, village, platform):
    _escalation(platform, 1, 1, "no_knowledge", 1)
    assert client_as(village["other_da"]).post("/api/da/escalations/1/answer", json={"text": "x" * 5}).status_code == 403
    da = client_as(village["da"])
    assert [e["id"] for e in da.get("/api/da/escalations").json()] == [1]
    r = da.post("/api/da/escalations/1/answer", json={"text": "Weed first, then apply the second urea split."})
    assert r.status_code == 200
    assert da.post("/api/da/escalations/1/answer", json={"text": "again"}).status_code == 409
    farmer = dict(platform.execute("SELECT * FROM users WHERE id=1").fetchone())
    alerts = client_as(farmer).get("/api/advisory/alerts", params={"language": "en"}).json()
    assert alerts[0]["type"] == "da_answer"
    assert "DA Five" in alerts[0]["message"] and "second urea split" in alerts[0]["message"]


def test_forward_and_close(client_as, village, platform):
    _escalation(platform, 1, 1, "asked_for_person", 1)
    _escalation(platform, 2, 2, "no_knowledge", 1, assigned=None)
    da = client_as(village["da"])
    assert da.post("/api/da/escalations/1/forward", json={"note": "Needs an agronomist"}).json()["assigned_to"] == 9
    assert da.post("/api/da/escalations/2/close", json={}).json()["status"] == "closed"
    row = platform.execute("SELECT status, assigned_to, resolved_at FROM escalations WHERE id=2").fetchone()
    assert row[0] == "closed" and row[1] == 5 and row[2]           # unassigned case is taken by the DA
    assert [e["id"] for e in client_as(village["admin"]).get("/api/da/escalations", params={"status": "forwarded"}).json()] == [1]


def test_verify_diagnosis(client_as, village, platform):
    _diagnosis(platform, 100, 1, disease="septoria_tritici_blotch")
    _diagnosis(platform, 101, 3)
    platform.commit()
    da = client_as(village["da"])
    assert da.post("/api/da/diagnoses/100/verify", json={"disease_key": "not_a_disease"}).status_code == 400
    assert da.post("/api/da/diagnoses/101/verify", json={"disease_key": "leaf_rust"}).status_code == 403   # no consent
    assert da.post("/api/da/diagnoses/100/verify", json={"disease_key": "leaf_rust"}).status_code == 200
    assert tuple(platform.execute("SELECT verified_disease, verified_by FROM diagnoses WHERE id=100").fetchone()) == ("leaf_rust", 5)


def test_register_farmer_on_behalf_records_spoken_consent(client_as, village, platform):
    admin_areas.import_boundaries(platform)
    da = client_as(village["da"])
    body = {"name": "New Farmer", "phone": "0912345678", "pin": "123456", "area_pcode": "ET031001",
            "language": "am", "consent_data": True, "consent_alerts": False}
    r = da.post("/api/da/farmers", json=body)
    assert r.status_code == 201, r.text
    fid = r.json()["id"]
    c = consent.get_consent(platform, fid)
    assert c["data"] and not c["alerts"]
    assert c["history"][0]["method"] == "da_verbal" and c["history"][0]["recorded_by"] == "DA Five"
    assert platform.execute("SELECT assigned_da_id FROM farmer_profiles WHERE user_id=?", (fid,)).fetchone()[0] == 5
    assert da.post("/api/da/farmers", json=body).status_code == 409
    outside = {**body, "phone": "0912345679", "area_pcode": "ET04"}
    assert da.post("/api/da/farmers", json=outside).status_code == 403


def test_admin_assigns_a_farmers_da(client_as, village):
    admin = client_as(village["admin"])
    assert admin.put("/api/admin/users/2/da", json={"da_id": 6}).json()["assigned_da_id"] == 6
    assert admin.put("/api/admin/users/2/da", json={"da_id": 1}).status_code == 400      # not an agent
    assert admin.put("/api/admin/users/5/da", json={"da_id": 6}).status_code == 400      # not a farmer


def test_diagnosis_on_a_farmers_field_is_recorded_for_that_farmer(client_as, village, platform):
    """A DA checking farm 10 (farmer 1) records the diagnosis for farmer 1, not for the DA."""
    platform.execute("INSERT INTO farms (id, user_id, field_name, crop_name) VALUES (30, 3, 'Hidden', 'wheat')")
    platform.commit()
    da = client_as(village["da"])
    body = {"disease": "leaf_rust", "confidence": 0.9, "farm_id": 10, "language": "en"}
    r = da.post("/api/advisory/diagnosis-plan", json=body)
    assert r.status_code == 200, r.text
    assert platform.execute("SELECT farmer_id FROM diagnoses WHERE farm_id=10").fetchone()[0] == 1
    assert da.post("/api/advisory/diagnosis-plan", json={**body, "farm_id": 30}).status_code == 403   # no consent
    assert da.post("/api/advisory/diagnosis-plan", json={**body, "farmer_id": 2}).status_code == 400  # wrong owner


def test_cached_elevation_needs_no_network(tmp_path):
    from backend.advisory.adapters.weather import cached_elevation

    (tmp_path / "10.779_39.847.json").write_text('{"data": {"elevation": 1641.0}}', encoding="utf-8")
    assert cached_elevation(10.7790, 39.8475, tmp_path) == 1641.0
    assert cached_elevation(9.0, 38.7, tmp_path) is None
