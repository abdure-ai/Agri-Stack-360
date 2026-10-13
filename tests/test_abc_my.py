"""My ABC (A9): a member sees their own shares, payments due, weight, plots, orders, bookings, account, meetings and
votes to confirm; nobody else's; non-members are refused; the menu flag follows membership."""

from datetime import date, timedelta

import pytest

from tests.conftest import add_user


@pytest.fixture
def world(platform, client_as):
    org = platform.execute("INSERT INTO organisations (name, type) VALUES ('Jiru ABC', 'abc')").lastrowid
    gm = add_user(platform, 2, phone="0911000002")
    platform.execute("INSERT INTO abc_roles (org_id, user_id, role, since) VALUES (?, 2, 'general_manager', 'x')", (org,))
    for uid in (10, 11):
        add_user(platform, uid, phone=f"09110000{uid}", name=f"Member {uid}")
        platform.execute("INSERT INTO abc_members (org_id, farmer_id, status, invited_at) VALUES (?, ?, 'active', 'x')", (org, uid))
        platform.execute("INSERT INTO farms (user_id, field_name, crop_name, area_ha) VALUES (?, 'Plot', 'wheat', 1.0)", (uid,))
    outsider = add_user(platform, 12, phone="0911000012")
    platform.commit()
    c = client_as(gm)
    c.put("/api/abc/shares/setup", json={"share_value_etb": 1000, "shares_offered": 100})
    c.post("/api/abc/shares/pledges", json={"farmer_id": 10, "shares": 5, "kind": "minimum",
                                            "first_payment": {"amount_etb": 5000, "method": "cash"}})
    c.post("/api/abc/shares/pledges", json={"farmer_id": 10, "shares": 4, "kind": "extra",
                                            "first_payment": {"amount_etb": 1000, "method": "cash"}})
    c.post("/api/abc/shares/pledges", json={"farmer_id": 11, "shares": 5, "kind": "minimum"})
    c.post("/api/abc/finance/members/10", json={"kind": "service_charge", "amount_etb": 1500, "description": "Ploughing"})
    c.post("/api/abc/meetings", json={"kind": "general_assembly", "title": "Annual assembly",
                                      "scheduled_at": (date.today() + timedelta(days=10)).isoformat() + "T09:00", "agenda": ["Budget"]})
    return {"org": org, "gm": c, 10: client_as(dict(platform.execute("SELECT * FROM users WHERE id=10").fetchone())),
            11: client_as(dict(platform.execute("SELECT * FROM users WHERE id=11").fetchone())), "out": client_as(outsider)}


def test_member_sees_own_records(world):
    s = world[10].get("/api/abc/my/summary", params={"org_id": world["org"]}).json()
    assert s["shares_held"] == 6 and len(s["certificates"]) == 2
    assert s["owed_on_shares_etb"] == 3000 and [p["kind"] for p in s["pledges"]] == ["minimum", "extra"]
    assert s["voting_weight"]["weight"] == 0.5 and s["voting_weight"]["land_ha"] == 1.0
    assert s["plots"][0]["field_name"] == "Plot" and s["account"]["balance_etb"] == 1500
    assert s["meetings"][0]["title"] == "Annual assembly" and s["meetings"][0]["agenda"] == ["Budget"]
    assert all(p["farmer_id"] == 10 for p in s["share_payments"])
    other = world[11].get("/api/abc/my/summary", params={"org_id": world["org"]}).json()
    assert other["shares_held"] == 0 and other["owed_on_shares_etb"] == 5000 and other["account"]["balance_etb"] == 0
    assert world["out"].get("/api/abc/my/summary", params={"org_id": world["org"]}).status_code == 403
    assert [c["org_id"] for c in world[10].get("/api/abc/my/companies").json()] == [world["org"]]


def test_menu_flag_follows_membership(world):
    assert "abc:shareholder" in world[10].get("/api/auth/me").json()["permissions"]
    assert "abc:shareholder" not in world["out"].get("/api/auth/me").json()["permissions"]
