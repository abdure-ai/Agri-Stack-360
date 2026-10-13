"""Disease → treatment → product with cited rate → nearest shop with price → pack check against the plan."""

from datetime import date, timedelta
from pathlib import Path

import pytest

from backend import admin_areas
from backend.advisory.adapters.platform import ShopInputHub
from backend.advisory.diagnosis import DOSE_CITED, amount_for_area, build_plan
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]
DEWA, KEMISE, KOMBOLCHA = "ET031001", "ET031006", "ET030417"


def test_amount_for_the_plot():
    assert amount_for_area("0.5 L", 0.5) == "250 mL / 0.5 ha"
    assert amount_for_area("1.13 kg", 2) == "2.26 kg / 2 ha"
    assert amount_for_area("0.65", 1) is None            # no unit: not calculated
    assert amount_for_area("0.5 L", None) is None


@pytest.fixture
def chain(platform, client_as):
    admin_areas.import_boundaries(platform)
    load_seed(platform, ROOT / "data" / "advisory_seed")
    pid = platform.execute("SELECT id FROM approved_products WHERE product_name='PLACEHOLDER_FUNGICIDE_A'").fetchone()[0]
    other = platform.execute("SELECT id FROM approved_products WHERE product_name='PLACEHOLDER_FUNGICIDE_C'").fetchone()[0]
    platform.execute("UPDATE dosage_rules SET dose_per_ha='0.5 L', source='MoA manual, p. 36', verification_status=? "
                     "WHERE product_id=? AND target='yellow_rust'", (DOSE_CITED, pid))
    shops = {}
    for name, pcode, verified in (("Near shop", DEWA, 0), ("Town shop", KEMISE, 1), ("Far shop", KOMBOLCHA, 1),
                                  ("Closed shop", DEWA, 1)):
        shops[name] = platform.execute("INSERT INTO organisations (name, type, woreda_pcode, verified, status) "
                                       "VALUES (?, 'agro_dealer', ?, ?, ?)",
                                       (name, pcode, verified, "suspended" if name == "Closed shop" else "active")).lastrowid
    for name, price in (("Near shop", 2400), ("Town shop", None), ("Far shop", 2300), ("Closed shop", 2000)):
        platform.execute("INSERT INTO shop_products (org_id, product_id, in_stock, price_etb, pack_size, price_is_sample) "
                         "VALUES (?, ?, 1, ?, '1 L', 1)", (shops[name], pid, price))
    platform.execute("INSERT INTO shop_products (org_id, product_id, in_stock) VALUES (?, ?, 0)", (shops["Far shop"], other))
    farmer = add_user(platform, 1)
    dealer = add_user(platform, 30, role="agro_dealer", phone="0911000030")
    platform.execute("INSERT INTO organisation_members (org_id, user_id, member_role) VALUES (?, 30, 'owner')",
                     (shops["Near shop"],))
    platform.commit()
    return {"pid": pid, "other": other, "shops": shops, "farmer": farmer, "dealer": dealer}


def _point(conn, pcode):
    a = admin_areas.get_area(conn, pcode)
    return a.latitude, a.longitude


def test_plan_shows_the_cited_rate_the_plot_amount_and_the_nearest_shops(platform, chain):
    lat, lon = _point(platform, DEWA)
    plan = build_plan(platform, "yellow_rust", "wheat", "en", input_hub=ShopInputHub(platform), latitude=lat,
                      longitude=lon, area_ha=0.5, area_pcode=DEWA)
    product = next(p for p in plan.products if p.product_id == chain["pid"])
    assert product.dose_per_ha == "0.5 L" and product.dose_cited and product.amount_for_plot == "250 mL / 0.5 ha"
    assert not product.verified                           # MoA rate, not yet checked against the EAA register
    assert "EAA register" in plan.warnings[0] and "label" in plan.warnings[0]
    shops = [o["supplier"] for o in plan.offers]
    assert shops == ["Near shop", "Town shop", "Far shop"]   # nearest first; suspended shop left out (max 4 shops)
    near, town = plan.offers[0], plan.offers[1]
    assert near["price_etb"] == 2400 and near["price_is_sample"] and not near["verified_seller"]
    assert town["price_etb"] is None and town["verified_seller"]
    assert all(o["product_id"] == chain["pid"] for o in plan.offers)   # out-of-stock product not offered


def test_dealer_price_replaces_the_sample_and_a_stock_change_keeps_it(client_as, chain, platform):
    shop = client_as(chain["dealer"])
    pid = chain["pid"]
    assert shop.put(f"/api/dealer/products/{pid}", json={"in_stock": True, "price_etb": 2550, "pack_size": "1 L"}).status_code == 200
    row = platform.execute("SELECT price_etb, price_is_sample, price_updated_at FROM shop_products WHERE org_id=? AND product_id=?",
                           (chain["shops"]["Near shop"], pid)).fetchone()
    assert row[0] == 2550 and row[1] == 0 and row[2]
    assert shop.put(f"/api/dealer/products/{pid}", json={"in_stock": False}).json()["price_etb"] == 2550
    assert tuple(platform.execute("SELECT price_etb, in_stock FROM shop_products WHERE org_id=? AND product_id=?",
                            (chain["shops"]["Near shop"], pid)).fetchone()) == (2550, 0)
    assert shop.put(f"/api/dealer/products/{pid}", json={"price_etb": -5}).status_code == 422


def test_pack_check_says_if_the_product_is_on_the_plan(client_as, chain, platform):
    org = platform.execute("INSERT INTO organisations (name, type) VALUES ('Maker', 'supplier')").lastrowid
    expires = (date.today() + timedelta(days=300)).isoformat()
    for pid, code in ((chain["pid"], "AAAA-BBBB-CCCC"), (chain["other"], "DDDD-EEEE-FFFF")):
        platform.execute("INSERT INTO code_batches (org_id, product_id, batch_number, units, expires_on, code) "
                         "VALUES (?, ?, ?, 100, ?, ?)", (org, pid, code[:4], expires, code))
    did = platform.execute("INSERT INTO diagnoses (farmer_id, disease_key, confidence, created_at) "
                           "VALUES (1, 'yellow_rust', 0.9, '2026-10-13 09:00:00')").lastrowid
    platform.commit()
    farmer = client_as(chain["farmer"])
    ok = farmer.post("/api/trust/verify", json={"code": "AAAA-BBBB-CCCC", "diagnosis_id": did}).json()
    assert ok["result"] == "genuine" and ok["plan_match"]["matches"] is True
    wrong = farmer.post("/api/trust/verify", json={"code": "DDDD-EEEE-FFFF", "diagnosis_id": did}).json()
    assert wrong["plan_match"]["matches"] is False and "PLACEHOLDER_FUNGICIDE_A" in wrong["plan_match"]["recommended"]
    assert "plan_match" not in farmer.post("/api/trust/verify", json={"code": "AAAA-BBBB-CCCC"}).json()
    stranger = client_as(add_user(platform, 2))
    assert stranger.post("/api/trust/verify", json={"code": "AAAA-BBBB-CCCC", "diagnosis_id": did}).status_code == 403
