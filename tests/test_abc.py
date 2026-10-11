"""ABC module and buy requests (checklist 1.8 / 1.5; M12): consent by accepting, contributions, planning,
member messages, ATI report, trader requests."""

from datetime import date, timedelta
from pathlib import Path

import pytest

from backend import admin_areas
from backend.advisory.alerts import render
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]
DEWA = "ET031001"


@pytest.fixture
def abc(platform, client_as):
    admin_areas.import_boundaries(platform)
    load_seed(platform, ROOT / "data" / "advisory_seed")
    admin = add_user(platform, 9, role="admin")
    mgr = add_user(platform, 50, role="abc_manager", name="ABC Manager", phone="0911000050")
    trader = add_user(platform, 60, role="trader", name="Trader T", phone="0911000060")
    f1 = add_user(platform, 1, name="Member One", phone="0922000001", consent_alerts=1, altitude_m=1641)
    f2 = add_user(platform, 2, name="Member Two", phone="0922000002", consent_alerts=0)
    add_user(platform, 3, name="Outsider", phone="0922000003")
    for fid in (1, 2, 3):
        platform.execute("INSERT INTO farms (id, user_id, field_name, crop_name, area_ha) VALUES (?, ?, 'F', 'wheat', 1.5)", (fid, fid))
        platform.execute("INSERT INTO crop_seasons (farm_id, crop, planting_date, season) VALUES (?, 'wheat', ?, 'irrigated')",
                         (fid, (date.today() - timedelta(days=30)).isoformat()))
    platform.commit()
    api = client_as(admin)
    org = api.post("/api/admin/orgs", json={"name": "PLACEHOLDER ABC", "type": "abc"}).json()["id"]
    assert api.post(f"/api/admin/orgs/{org}/members", json={"phone": "0911000050"}).status_code == 201
    platform.execute("UPDATE organisations SET woreda_pcode=? WHERE id=?", (DEWA, org))
    platform.commit()
    return {"mgr": mgr, "trader": trader, "f1": f1, "f2": f2, "org": org}


def _join(client_as, abc):
    m = client_as(abc["mgr"])
    assert m.post("/api/abc/members", json={"phone": "0922000001"}).status_code == 201
    assert m.post("/api/abc/members", json={"phone": "0922000002"}).status_code == 201
    assert m.post("/api/abc/members", json={"phone": "0911000060"}).status_code == 404      # not a farmer
    for f in ("f1", "f2"):
        assert client_as(abc[f]).post(f"/api/users/abc-invitations/{abc['org']}/accept").json()["status"] == "active"


def test_members_must_accept_before_the_abc_sees_them(client_as, abc):
    m = client_as(abc["mgr"])
    m.post("/api/abc/members", json={"phone": "0922000001"})
    ov = m.get("/api/abc/overview").json()
    assert ov["members"] == [] and [i["name"] for i in ov["invited"]] == ["Member One"] and ov["crops"] == []
    inv = client_as(abc["f1"]).get("/api/users/abc-invitations").json()
    assert inv[0]["name"] == "PLACEHOLDER ABC" and inv[0]["status"] == "invited"
    client_as(abc["f1"]).post(f"/api/users/abc-invitations/{abc['org']}/accept")
    ov = m.get("/api/abc/overview").json()
    assert [x["name"] for x in ov["members"]] == ["Member One"] and ov["crops"] == [{"crop": "wheat", "farms": 1, "area_ha": 1.5}]
    client_as(abc["f1"]).post(f"/api/users/abc-invitations/{abc['org']}/leave")
    assert m.get("/api/abc/overview").json()["members"] == []


def test_contributions_planning_and_report(client_as, abc):
    _join(client_as, abc)
    m = client_as(abc["mgr"])
    assert m.post("/api/abc/contributions", json={"farmer_id": 3, "kind": "land", "quantity": 1}).status_code == 400   # not a member
    assert m.post("/api/abc/contributions", json={"farmer_id": 1, "kind": "land", "quantity": 0.5, "unit": "ha"}).status_code == 201
    assert m.post("/api/abc/contributions", json={"farmer_id": 2, "kind": "cash"}).status_code == 422
    plan = m.get("/api/abc/planning").json()
    stages = {(r["crop"], r["stage_key"]): r for r in plan["by_stage"]}
    assert sum(r["farms"] for r in plan["by_stage"]) == 2 and "PLACEHOLDER_VERIFY" in plan["quantities_note"]
    assert any(r["area_ha"] == 1.5 for r in stages.values())
    csv_text = m.get("/api/abc/report.csv").text
    assert "members (accepted),2" in csv_text and "land,1,0.5,ha" in csv_text and "not a legal document" in csv_text
    assert "Member One" not in csv_text                                                    # counts only


def test_broadcast_respects_alert_consent(client_as, abc, platform):
    _join(client_as, abc)
    r = client_as(abc["mgr"]).post("/api/abc/broadcast", json={"text": "Meeting on Friday at the ABC store."}).json()
    assert r == {"sent": 1, "suppressed": 0, "no_consent": 1}
    alert = dict(platform.execute("SELECT * FROM alerts WHERE farmer_id=1").fetchone())
    assert render(alert, "en", platform) == "PLACEHOLDER ABC (your ABC): Meeting on Friday at the ABC store."
    assert platform.execute("SELECT COUNT(*) FROM alerts WHERE farmer_id=2").fetchone()[0] == 0


def test_buy_requests_between_traders_and_abcs(client_as, abc):
    t = client_as(abc["trader"])
    r = t.post("/api/trade/buy-requests", json={"crop": "Wheat", "quantity_qt": 200, "region_pcode": "ET03"})
    assert r.status_code == 201
    rid = r.json()["id"]
    assert t.post("/api/trade/buy-requests", json={"crop": "wheat", "quantity_qt": 5, "region_pcode": DEWA}).status_code == 400
    m = client_as(abc["mgr"])
    open_ = m.get("/api/abc/buy-requests").json()
    assert [x["id"] for x in open_] == [rid] and "Trader" not in str(open_)                 # trader not exposed
    assert m.post(f"/api/abc/buy-requests/{rid}/respond", json={"message": "We can supply 120 qt in January.", "quantity_qt": 120}).status_code == 201
    mine = t.get("/api/trade/buy-requests").json()
    assert mine[0]["responses"][0]["abc"] == "PLACEHOLDER ABC" and mine[0]["responses"][0]["quantity_qt"] == 120
    t.post(f"/api/trade/buy-requests/{rid}/close")
    assert m.get("/api/abc/buy-requests").json() == []
    assert client_as(abc["f1"]).get("/api/trade/buy-requests").status_code == 403
    assert client_as(abc["trader"]).get("/api/abc/overview").status_code == 403
