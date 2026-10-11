"""Supplier demand by zone and trader supply outlook (checklist 1.6 / 1.5; M11): aggregated and suppressed."""

from datetime import date, datetime, timedelta
from pathlib import Path

import pytest

from backend import admin_areas
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]
DEWA = "ET031001"


@pytest.fixture
def area(platform, client_as):
    admin_areas.import_boundaries(platform)
    load_seed(platform, ROOT / "data" / "advisory_seed")
    other = platform.execute("SELECT pcode FROM admin_areas WHERE level=3 AND region_pcode='ET04' ORDER BY pcode LIMIT 1").fetchone()[0]
    planted = (date.today() - timedelta(days=30)).isoformat()
    for uid in range(1, 8):                                  # 6 wheat farms in Dewa Cheffa, 1 in Oromia
        woreda = DEWA if uid <= 6 else other
        add_user(platform, uid, name=f"Farmer {uid}", phone=f"09220000{uid:02d}")
        chain = admin_areas.lineage(platform, woreda)
        platform.execute("UPDATE users SET region_pcode=?, zone_pcode=?, woreda_pcode=? WHERE id=?",
                         (chain[0].pcode, chain[1].pcode, chain[2].pcode, uid))
        platform.execute("INSERT INTO farms (id, user_id, field_name, crop_name, area_ha) VALUES (?, ?, 'F', 'wheat', 0.5)", (uid, uid))
        platform.execute("INSERT INTO crop_seasons (farm_id, crop, planting_date, season, expected_harvest_date) VALUES (?, 'wheat', ?, 'irrigated', ?)",
                         (uid, planted, "2026-12-20" if uid == 1 else None))
        platform.execute("INSERT INTO diagnoses (farmer_id, disease_key, confidence, created_at) VALUES (?, 'leaf_rust', 0.9, ?)",
                         (uid, datetime.now().isoformat(sep=" ", timespec="seconds")))
    platform.execute("INSERT INTO diagnoses (farmer_id, disease_key, confidence, source, created_at) VALUES (1, 'yellow_rust', 0.9, 'simulated', ?)",
                     (datetime.now().isoformat(sep=" ", timespec="seconds"),))
    supplier = add_user(platform, 20, role="supplier", phone="0911000020")
    admin = add_user(platform, 9, role="admin")
    org = client_as(admin).post("/api/admin/orgs", json={"name": "PLACEHOLDER Supplier"}).json()["id"]
    client_as(admin).post(f"/api/admin/orgs/{org}/members", json={"phone": "0911000020"})
    pid = platform.execute("SELECT id FROM approved_products WHERE product_name='PLACEHOLDER_FUNGICIDE_A'").fetchone()[0]
    client_as(supplier).post(f"/api/supplier/catalogue/{pid}")
    platform.commit()
    return {"supplier": supplier, "trader": add_user(platform, 30, role="trader"), "farmer": add_user(platform, 40)}


def test_supplier_demand_by_zone_is_suppressed(client_as, area):
    r = client_as(area["supplier"]).get("/api/supplier/demand").json()
    assert r["diseases"] == ["leaf_rust", "yellow_rust"] and r["crops"] == ["wheat"]
    zones = {z["zone"]: z for z in r["zones"]}
    dewa = zones["Oromo Nationality Administration"]
    assert dewa["photo_checks"] == {"leaf_rust": 6} and dewa["farms_growing"] == 6 and dewa["area_ha"] == 3.0
    small = [z for name, z in zones.items() if name != "Oromo Nationality Administration"][0]
    assert small["photo_checks"] == {"leaf_rust": "<5"} and small["farms_growing"] == "<5" and small["area_ha"] is None
    assert "Farmer" not in str(r)
    assert client_as(area["trader"]).get("/api/supplier/demand").status_code == 403


def test_supply_outlook_months_and_estimates(client_as, area):
    r = client_as(area["trader"]).get("/api/reports/supply-outlook", params={"crop": "wheat"}).json()
    dewa = [x for x in r["rows"] if x["zone"] == "Oromo Nationality Administration"][0]
    assert dewa["farms"] == 6 and dewa["area_ha"] == 3.0 and dewa["harvest_estimated"] is True
    months = dewa["harvest_months"]
    assert months.get("2026-12") in ("<5", 1) and sum(v for v in months.values() if isinstance(v, int)) <= 6
    only_dewa = client_as(area["farmer"]).get("/api/reports/supply-outlook", params={"area": DEWA}).json()["rows"]
    assert [x["zone"] for x in only_dewa] == ["Oromo Nationality Administration"]
