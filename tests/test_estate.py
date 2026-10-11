"""Commercial farms (checklist 1.9; M13): blocks, stage, scouting, disease alerts near blocks, team, export."""

from datetime import date, datetime, timedelta
from pathlib import Path

import pytest

from backend import admin_areas
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]
DEWA = "ET031001"


@pytest.fixture
def farm(platform, client_as):
    admin_areas.import_boundaries(platform)
    load_seed(platform, ROOT / "data" / "advisory_seed")
    admin = add_user(platform, 9, role="admin")
    manager = add_user(platform, 70, role="farm_manager", name="Farm Manager", phone="0911000070")
    agro = add_user(platform, 71, role="farm_manager", name="Farm Agronomist", phone="0911000071")
    other = add_user(platform, 72, role="farm_manager", phone="0911000072")
    api = client_as(admin)
    org = api.post("/api/admin/orgs", json={"name": "PLACEHOLDER Estate", "type": "commercial_farm"}).json()["id"]
    api.post(f"/api/admin/orgs/{org}/members", json={"phone": "0911000070", "member_role": "owner"})
    api.post(f"/api/admin/orgs/{org}/members", json={"phone": "0911000071"})
    org2 = api.post("/api/admin/orgs", json={"name": "Other Estate", "type": "commercial_farm"}).json()["id"]
    api.post(f"/api/admin/orgs/{org2}/members", json={"phone": "0911000072"})
    return {"manager": manager, "agro": agro, "other": other}


def _block(api, **kw):
    body = {"name": "Block A", "area_ha": 25, "crop": "Wheat", "planting_date": (date.today() - timedelta(days=30)).isoformat(),
            "woreda_pcode": DEWA, **kw}
    r = api.post("/api/estate/blocks", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_blocks_scouting_and_alerts(client_as, farm, platform):
    m = client_as(farm["manager"])
    assert m.post("/api/estate/blocks", json={"name": "X", "area_ha": 1, "crop": "wheat", "woreda_pcode": "ET03"}).status_code == 400
    b = _block(m)
    _block(m, name="Block B", area_ha=10, status="fallow")
    a = client_as(farm["agro"])                                                   # team member, same farm
    assert a.post(f"/api/estate/blocks/{b['id']}/scouting", json={"severity": "high"}).status_code == 400   # disease required
    assert a.post(f"/api/estate/blocks/{b['id']}/scouting", json={"severity": "high", "disease_key": "yellow_rust",
                                                                  "incidence_pct": 20}).status_code == 201
    lat, lon = 10.779, 39.847
    for i in range(3):                                                            # 3 scans near the block (threshold 3)
        add_user(platform, 100 + i)
        platform.execute("INSERT INTO diagnoses (farmer_id, disease_key, confidence, latitude, longitude, created_at) VALUES (?, 'leaf_rust', 0.9, ?, ?, ?)",
                         (100 + i, lat + 0.01 * i, lon, datetime.now().isoformat(sep=" ", timespec="seconds")))
    platform.commit()
    ov = m.get("/api/estate/overview").json()
    assert ov["totals"] == {"blocks": 1, "area_ha": 25.0}
    blk = [x for x in ov["blocks"] if x["name"] == "Block A"][0]
    assert blk["crop"] == "wheat" and blk["days_after_planting"] == 30 and blk["woreda"] == "Dewa Cheffa"
    assert blk["last_scouting"]["severity"] == "high"
    kinds = {(x["kind"], x["disease_key"]) for x in ov["alerts"]}
    assert ("scouting", "yellow_rust") in kinds and ("nearby", "leaf_rust") in kinds
    assert {t["name"] for t in ov["team"]} == {"Farm Manager", "Farm Agronomist"}
    assert "yellow_rust" in {x["key"] for x in m.get("/api/estate/diseases").json()}
    csv_text = m.get("/api/estate/report.csv").text
    assert "Block A,active,wheat" in csv_text and "yellow_rust,high" in csv_text


def test_farms_are_isolated(client_as, farm):
    b = _block(client_as(farm["manager"]))
    o = client_as(farm["other"])
    assert o.get("/api/estate/overview").json()["blocks"] == []
    assert o.post(f"/api/estate/blocks/{b['id']}/scouting", json={"severity": "none"}).status_code == 404
    assert o.delete(f"/api/estate/blocks/{b['id']}").status_code == 404
    assert client_as({"id": 999, "role": "farmer"}).get("/api/estate/overview").status_code == 403
