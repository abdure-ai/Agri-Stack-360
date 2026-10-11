"""'Delete my data' requests, admin-reviewed (checklist cross-cutting data-subject rights; M8)."""

from pathlib import Path

import pytest

from backend import admin_areas, consent, erasure
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user


@pytest.fixture
def people(platform, tmp_path, monkeypatch):
    admin_areas.import_boundaries(platform)
    load_seed(platform, Path(__file__).resolve().parents[1] / "data" / "advisory_seed")
    monkeypatch.setattr(erasure, "UPLOADS", tmp_path)
    (tmp_path / "diagnoses").mkdir()
    (tmp_path / "diagnoses" / "leaf.jpg").write_bytes(b"jpeg")
    admin = add_user(platform, 9, role="admin", name="Admin")
    farmer = add_user(platform, 1, name="Abebe Kebede", phone="0911223344", consent_data=1, kebele="K1")
    other = add_user(platform, 2, name="Other Farmer")
    platform.execute("UPDATE users SET region_pcode='ET03', zone_pcode='ET0310', woreda_pcode='ET031001' WHERE id=1")
    platform.execute("INSERT INTO farms (id, user_id, field_name, crop_name) VALUES (10, 1, 'Plot A', 'wheat'), (20, 2, 'B', 'wheat')")
    platform.execute("INSERT INTO crop_seasons (farm_id, crop, planting_date, season) VALUES (10, 'wheat', '2026-09-01', 'irrigated')")
    platform.execute("INSERT INTO conversations (id, user_id) VALUES (5, 1)")
    platform.execute("INSERT INTO messages (conversation_id, question, answer) VALUES (5, 'my urea question', 'a')")
    platform.execute("INSERT INTO alerts (type, farmer_id, message_key) VALUES ('follow_up', 1, 'follow_up_question')")
    platform.execute("INSERT INTO escalations (farmer_id, reason) VALUES (1, 'no_knowledge')")
    platform.execute("""INSERT INTO diagnoses (id, farmer_id, farm_id, disease_key, confidence, latitude, longitude, image_ref)
                        VALUES (30, 1, 10, 'leaf_rust', 0.9, 10.7, 39.8, 'diagnoses/leaf.jpg')""")
    platform.commit()
    consent.set_consent(platform, 1, alerts=True, by=1)
    return {"admin": admin, "farmer": farmer, "other": other, "uploads": tmp_path}


def test_request_cancel_and_duplicates(client_as, people):
    api = client_as(people["farmer"])
    assert api.get("/api/users/my-data/erase-request").json() is None
    assert api.post("/api/users/my-data/erase-request", json={"reason": "I stopped farming"}).status_code == 201
    assert api.post("/api/users/my-data/erase-request", json={}).status_code == 409
    assert api.post("/api/users/my-data/erase-request/cancel").json()["status"] == "cancelled"
    assert api.get("/api/users/my-data/erase-request").json()["status"] == "cancelled"
    assert client_as(people["admin"]).post("/api/users/my-data/erase-request", json={}).status_code == 400


def test_approval_deletes_personal_data_and_keeps_anonymous_counts(client_as, people, platform):
    rid = client_as(people["farmer"]).post("/api/users/my-data/erase-request", json={}).json()["id"]
    admin = client_as(people["admin"])
    assert [r["id"] for r in admin.get("/api/admin/erasure-requests").json()] == [rid]
    r = admin.post(f"/api/admin/erasure-requests/{rid}/approve", json={"note": "checked by phone"})
    assert r.status_code == 200 and r.json()["status"] == "approved"
    q = lambda sql: platform.execute(sql).fetchone()[0]  # noqa: E731
    assert q("SELECT COUNT(*) FROM farms WHERE user_id=1") == 0 and q("SELECT COUNT(*) FROM crop_seasons") == 0
    assert q("SELECT COUNT(*) FROM messages") == 0 and q("SELECT COUNT(*) FROM conversations") == 0
    assert q("SELECT COUNT(*) FROM alerts") == 0 and q("SELECT COUNT(*) FROM escalations") == 0
    assert q("SELECT COUNT(*) FROM farmer_profiles WHERE user_id=1") == 0
    d = platform.execute("SELECT disease_key, farm_id, latitude, image_ref FROM diagnoses WHERE id=30").fetchone()
    assert tuple(d) == ("leaf_rust", None, None, None)                      # still counted, points to nothing
    assert not (people["uploads"] / "diagnoses" / "leaf.jpg").exists()
    u = dict(platform.execute("SELECT * FROM users WHERE id=1").fetchone())
    assert (u["name"], u["phone"], u["is_active"], u["woreda_pcode"], u["region_pcode"]) == \
        ("Deleted user", "deleted-1", 0, None, "ET03")
    assert q("SELECT COUNT(*) FROM consent_events WHERE user_id=1") >= 1   # the legal record stays
    assert q("SELECT COUNT(*) FROM farms WHERE user_id=2") == 1             # nobody else touched
    assert admin.post(f"/api/admin/erasure-requests/{rid}/approve", json={}).status_code == 409


def test_reject_and_permissions(client_as, people, platform):
    rid = client_as(people["farmer"]).post("/api/users/my-data/erase-request", json={}).json()["id"]
    assert client_as(people["other"]).get("/api/admin/erasure-requests").status_code == 403
    assert client_as(people["other"]).post(f"/api/admin/erasure-requests/{rid}/approve", json={}).status_code == 403
    r = client_as(people["admin"]).post(f"/api/admin/erasure-requests/{rid}/reject", json={"note": "duplicate"})
    assert r.json()["status"] == "rejected"
    assert platform.execute("SELECT name FROM users WHERE id=1").fetchone()[0] == "Abebe Kebede"


def test_admin_cannot_decide_own_request(client_as, people, platform):
    platform.execute("INSERT INTO erasure_requests (id, user_id, created_at) VALUES (99, 9, '2026-10-10')")
    platform.commit()
    assert client_as(people["admin"]).post("/api/admin/erasure-requests/99/approve", json={}).status_code == 400
