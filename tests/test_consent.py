"""Consent, opt-out and "my data" (checklist 1.1 / cross-cutting; Proclamation 1321/2024)."""

from datetime import datetime

from backend import consent
from backend.advisory.alerts import run_alert_cycle
from tests.conftest import add_user


def _farm(conn, fid, owner):
    conn.execute("INSERT INTO farms (id, user_id, field_name, crop_name) VALUES (?,?,?, 'wheat')", (fid, owner, f"F{fid}"))
    conn.commit()


def test_consent_is_off_by_default_and_changes_are_recorded(platform):
    add_user(platform, 1)
    assert consent.get_consent(platform, 1)["data"] is False
    consent.set_consent(platform, 1, data=True, alerts=True, by=1)
    consent.set_consent(platform, 1, data=True, alerts=False, by=1)        # only 'alerts' really changes
    c = consent.get_consent(platform, 1)
    assert (c["data"], c["alerts"]) == (True, False)
    assert [(h["kind"], h["granted"]) for h in c["history"]] == [("alerts", False), ("alerts", True), ("data", True)]
    assert all("PLACEHOLDER_VERIFY" in h["text_version"] for h in c["history"])


def test_consent_api_is_self_only(client_as, platform):
    farmer = add_user(platform, 1)
    api = client_as(farmer)
    assert api.get("/api/users/consent").json()["data"] is False
    r = api.put("/api/users/consent", json={"data": True})
    assert r.status_code == 200 and r.json()["data"] is True and r.json()["alerts"] is False
    assert api.put("/api/users/consent", json={}).status_code == 400


def test_register_without_ticks_gives_no_consent(client_as, platform):
    api = client_as({})
    r = api.post("/api/auth/register", json={"phone": "0911111111", "name": "New", "password": "secret1"})
    assert r.status_code == 201
    uid = r.json()["user"]["id"]
    assert consent.get_consent(platform, uid)["data"] is False
    r = api.post("/api/auth/register", json={"phone": "0911111112", "name": "New 2", "password": "secret1",
                                              "consent_data": True, "consent_alerts": True})
    c = consent.get_consent(platform, r.json()["user"]["id"])
    assert c["data"] and c["alerts"] and c["history"][0]["method"] == "self"


def test_my_data_contains_only_own_records_and_no_password(client_as, platform):
    me, other = add_user(platform, 1, name="Me"), add_user(platform, 2, name="Other")
    _farm(platform, 10, 1)
    _farm(platform, 20, 2)
    data = client_as(me).get("/api/users/my-data").json()
    assert data["account"]["name"] == "Me" and "password_hash" not in data["account"]
    assert [f["id"] for f in data["farms"]] == [10]
    assert other["name"] not in str(data)


def test_agent_needs_farmer_consent(client_as, platform):
    agent = add_user(platform, 5, role="agent")
    add_user(platform, 1, consent_data=0)
    add_user(platform, 2, consent_data=1)
    _farm(platform, 10, 1)
    _farm(platform, 20, 2)
    api = client_as(agent)
    assert [f["id"] for f in api.get("/api/users/farms").json()] == [20]
    assert api.get("/api/crop-health/reports", params={"farm_id": 10}).status_code == 403
    assert api.get("/api/crop-health/reports", params={"farm_id": 20}).status_code == 200
    r = api.post("/api/advisory/ask", json={"question": "How much urea?", "farmer_id": 1})
    assert r.status_code == 403 and "not agreed" in r.json()["detail"]


def test_withdrawing_consent_removes_agent_access(client_as, platform):
    agent = add_user(platform, 5, role="agent")
    add_user(platform, 1)
    _farm(platform, 10, 1)
    consent.set_consent(platform, 1, data=True, by=1)
    api = client_as(agent)
    assert [f["id"] for f in api.get("/api/users/farms").json()] == [10]
    consent.set_consent(platform, 1, data=False, by=1)
    assert api.get("/api/users/farms").json() == []


def test_admin_keeps_access_without_consent(client_as, platform):
    admin = add_user(platform, 9, role="admin")
    add_user(platform, 1)
    _farm(platform, 10, 1)
    assert client_as(admin).get("/api/crop-health/reports", params={"farm_id": 10}).status_code == 200


def test_follow_up_reminder_needs_alert_consent(platform):
    add_user(platform, 1, consent_alerts=1)
    add_user(platform, 2, consent_alerts=0)
    add_user(platform, 3)                                  # no profile at all
    for fid in (1, 2, 3):
        platform.execute("INSERT INTO alerts (type, farmer_id, message_key, status, dedupe_key, scheduled_for) "
                         "VALUES ('follow_up', ?, 'follow_up', 'scheduled', ?, '2026-10-01')", (fid, f"follow_up:{fid}"))
    platform.commit()
    report = run_alert_cycle(platform, datetime(2026, 10, 9, 9))
    status = dict(platform.execute("SELECT farmer_id, status FROM alerts"))
    assert status == {1: "queued", 2: "suppressed", 3: "suppressed"}
    assert report.follow_ups_due == 1 and report.skipped_no_consent == 2
