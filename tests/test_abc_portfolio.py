"""ABC portfolio (A10): ATI sees every ABC, government only its area, both only aggregates; compliance alerts follow the
rules; CSV export; map layer; farmers and ABC staff are refused."""

from datetime import date, timedelta

import pytest

from backend import admin_areas
from tests.conftest import add_user

DEWA, KOMBOLCHA = "ET031001", "ET030417"


@pytest.fixture
def world(platform, client_as):
    admin_areas.import_boundaries(platform)
    a = platform.execute("INSERT INTO organisations (name, type, woreda_pcode) VALUES ('Jiru ABC', 'abc', ?)", (DEWA,)).lastrowid
    b = platform.execute("INSERT INTO organisations (name, type, woreda_pcode) VALUES ('Kombolcha ABC', 'abc', ?)", (KOMBOLCHA,)).lastrowid
    for uid in range(10, 17):
        add_user(platform, uid, phone=f"09110000{uid}", name=f"Secret Name {uid}")
        platform.execute("INSERT INTO abc_members (org_id, farmer_id, status, invited_at) VALUES (?, ?, 'active', 'x')", (a, uid))
        platform.execute("INSERT INTO abc_member_details (org_id, farmer_id, member_no, gender, age_group, consent_method, "
                         "consent_recorded_at, enrolled_at) VALUES (?, ?, ?, ?, ?, 'spoken', 'x', 'x')",
                         (a, uid, uid, "female" if uid < 13 else "male", "15-29" if uid == 10 else "30-44"))
    add_user(platform, 20, phone="0911000020")
    platform.execute("INSERT INTO abc_members (org_id, farmer_id, status, invited_at) VALUES (?, 20, 'active', 'x')", (b,))
    platform.execute("INSERT INTO abc_share_pledges (org_id, farmer_id, kind, shares, share_value, pledged_on, due_on, created_at) "
                     "VALUES (?, 10, 'extra', 5, 1000, '2025-01-01', ?, 'x')", (a, (date.today() - timedelta(days=5)).isoformat()))
    ati = add_user(platform, 1, role="ati_officer")
    gov = add_user(platform, 2, role="government")
    platform.execute("UPDATE users SET zone_pcode=? WHERE id=2", (DEWA[:6],))
    farmer = add_user(platform, 3, role="farmer", phone="0911000003")
    manager = add_user(platform, 4, role="abc_manager", phone="0911000004")
    platform.commit()
    return {"a": a, "b": b, "ati": client_as(ati), "gov": client_as(dict(platform.execute("SELECT * FROM users WHERE id=2").fetchone())),
            "farmer": client_as(farmer), "manager": client_as(manager)}


def test_ati_sees_all_with_alerts_and_no_names(world):
    r = world["ati"].get("/api/abc/portfolio").json()
    rows = {x["name"]: x for x in r["abcs"]}
    assert set(rows) == {"Jiru ABC", "Kombolcha ABC"} and r["totals"]["abcs"] == 2
    jiru = rows["Jiru ABC"]
    assert jiru["members"] == 7 and jiru["women_percent"] == 43 and jiru["youth_percent"] == 14
    assert {"members_below_minimum", "capital_below_minimum", "overdue_pledges"} <= set(jiru["alerts"])
    assert jiru["overdue_pledges"] == "<5"
    kombolcha = rows["Kombolcha ABC"]
    assert kombolcha["members"] == "<5" and kombolcha["women_percent"] is None      # small numbers hidden
    assert "Secret Name" not in str(r) and "0911000010" not in str(r)
    csv = world["ati"].get("/api/abc/portfolio.csv").text
    assert "Jiru ABC" in csv and "members_below_minimum" in csv and "Secret Name" not in csv


def test_government_sees_only_its_area_and_others_are_refused(world):
    names = [x["name"] for x in world["gov"].get("/api/abc/portfolio").json()["abcs"]]
    assert names == ["Jiru ABC"]
    assert [x["name"] for x in world["gov"].get("/api/abc/portfolio", params={"area": "ET03"}).json()["abcs"]] == ["Jiru ABC"]
    assert world["farmer"].get("/api/abc/portfolio").status_code == 403
    assert world["manager"].get("/api/abc/portfolio").status_code == 403
    layer = world["ati"].get("/api/map/layers", params={"layers": "abcs"}).json()["layers"]["abcs"]["abcs"]
    assert {x["name"] for x in layer} == {"Jiru ABC", "Kombolcha ABC"} and all(x["latitude"] for x in layer)
    assert "abcs" not in world["farmer"].get("/api/map/layers", params={"layers": "abcs"}).json()["available"]


def test_ati_officer_area_reports_are_national(world):
    assert world["ati"].get("/api/reports/scope").json()["level"] == "country"
