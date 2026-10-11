"""Agro-dealer shops (checklist 1.7; M10): profile, stock, checks at sale, verified-seller badge, migration."""

import sqlite3
from datetime import date, timedelta
from pathlib import Path

import pytest

from backend import admin_areas, input_trust
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]
DEWA = "ET031001"


def test_old_organisations_table_is_migrated_with_its_data():
    conn = sqlite3.connect(":memory:")
    conn.executescript("""
        CREATE TABLE users (id INTEGER PRIMARY KEY);
        CREATE TABLE approved_products (id INTEGER PRIMARY KEY);
        CREATE TABLE organisations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'supplier' CHECK (type IN ('supplier')),
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
            note TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
        INSERT INTO organisations (id, name) VALUES (4, 'Old supplier');
    """)
    input_trust.ensure_schema(conn)
    assert conn.execute("SELECT id, name, type, verified FROM organisations").fetchall() == [(4, "Old supplier", "supplier", 0)]
    conn.execute("INSERT INTO organisations (name, type) VALUES ('Shop', 'agro_dealer')")        # new type allowed
    input_trust.ensure_schema(conn)                                                             # idempotent


@pytest.fixture
def world(platform, client_as):
    admin_areas.import_boundaries(platform)
    load_seed(platform, ROOT / "data" / "advisory_seed")
    admin = add_user(platform, 9, role="admin")
    dealer = add_user(platform, 30, role="agro_dealer", name="Shop staff", phone="0911000030")
    supplier = add_user(platform, 20, role="supplier", phone="0911000020")
    farmer = add_user(platform, 1)
    platform.execute("UPDATE users SET woreda_pcode=?, zone_pcode=?, region_pcode=? WHERE id=1",
                     (DEWA, DEWA[:6], DEWA[:4]))
    platform.commit()
    farmer = dict(platform.execute("SELECT * FROM users WHERE id=1").fetchone())
    api = client_as(admin)
    shop = api.post("/api/admin/orgs", json={"name": "PLACEHOLDER Shop", "type": "agro_dealer"}).json()["id"]
    assert api.post(f"/api/admin/orgs/{shop}/members", json={"phone": "0911000020"}).status_code == 400   # wrong role
    assert api.post(f"/api/admin/orgs/{shop}/members", json={"phone": "0911000030"}).status_code == 201
    sup = api.post("/api/admin/orgs", json={"name": "PLACEHOLDER Supplier"}).json()["id"]
    api.post(f"/api/admin/orgs/{sup}/members", json={"phone": "0911000020"})
    pid = platform.execute("SELECT id FROM approved_products WHERE product_name='PLACEHOLDER_FUNGICIDE_A'").fetchone()[0]
    s = client_as(supplier)
    s.post(f"/api/supplier/catalogue/{pid}")
    code = s.post("/api/supplier/batches", json={"product_id": pid, "batch_number": "B1", "units": 100,
                                                "expires_on": (date.today() + timedelta(days=300)).isoformat()}).json()["code"]
    return {"admin": admin, "dealer": dealer, "farmer": farmer, "shop": shop, "sup_org": sup, "pid": pid, "code": code}


def test_shop_profile_stock_and_check_at_sale(client_as, world, platform):
    d = client_as(world["dealer"])
    assert d.put("/api/dealer/shop", json={"area_pcode": "ET03"}).status_code == 400               # must be a woreda
    assert d.put("/api/dealer/shop", json={"area_pcode": DEWA, "phone": "0911999999"}).json()["woreda_pcode"] == DEWA
    banned = platform.execute("SELECT id FROM approved_products WHERE status='banned'").fetchone()[0]
    assert d.put(f"/api/dealer/products/{banned}", json={}).status_code == 400
    assert d.put(f"/api/dealer/products/{world['pid']}", json={"in_stock": True}).status_code == 200
    info = d.get("/api/dealer/shop").json()
    assert [p["id"] for p in info["products"]] == [world["pid"]] and info["org"]["area"][-1] == "Dewa Cheffa"
    r = d.post("/api/dealer/check", json={"code": world["code"]}).json()
    assert r["result"] == "genuine"
    checks = d.get("/api/dealer/checks").json()
    assert checks[0]["code"] == world["code"] and checks[0]["product_name"] == "PLACEHOLDER_FUNGICIDE_A"
    assert platform.execute("SELECT woreda_pcode FROM verifications").fetchone()[0] == DEWA      # counted at the shop


def test_dealers_cannot_use_other_portals(client_as, world):
    d = client_as(world["dealer"])
    assert d.get("/api/supplier/batches").status_code == 403
    assert client_as(world["farmer"]).get("/api/dealer/shop").status_code == 403


def test_verified_badge_controls_the_shop_list(client_as, world):
    d = client_as(world["dealer"])
    d.put("/api/dealer/shop", json={"area_pcode": DEWA})
    d.put(f"/api/dealer/products/{world['pid']}", json={"in_stock": True})
    farmer = client_as(world["farmer"])
    assert farmer.get("/api/trust/shops", params={"product_id": world["pid"]}).json() == []        # not verified yet
    admin = client_as(world["admin"])
    assert admin.patch(f"/api/admin/orgs/{world['sup_org']}", json={"verified": True}).status_code == 400   # suppliers: no badge
    assert admin.patch(f"/api/admin/orgs/{world['shop']}", json={"verified": True}).json()["verified"] == 1
    shops = farmer.get("/api/trust/shops", params={"product_id": world["pid"]}).json()
    assert [s["name"] for s in shops] == ["PLACEHOLDER Shop"] and shops[0]["woreda"] == "Dewa Cheffa"
    d.put(f"/api/dealer/products/{world['pid']}", json={"in_stock": False})
    assert farmer.get("/api/trust/shops", params={"product_id": world["pid"]}).json() == []        # out of stock
    assert len(farmer.get("/api/trust/shops").json()) == 1                                          # all verified shops
    admin.patch(f"/api/admin/orgs/{world['shop']}", json={"status": "suspended"})
    assert farmer.get("/api/trust/shops").json() == []
