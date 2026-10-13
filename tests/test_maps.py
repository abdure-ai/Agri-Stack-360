"""Map layers: who sees which layer, and the privacy rules (counts only, <5, consent, own farm only)."""

import sqlite3
from pathlib import Path

import pytest

from backend import admin_areas
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]
DEWA = "ET031001"


@pytest.fixture
def world(platform, monkeypatch):
    admin_areas.import_boundaries(platform)
    load_seed(platform, ROOT / "data" / "advisory_seed")
    for uid, consent in ((1, 1), (2, 1), (3, 0)):
        add_user(platform, uid, role="farmer", name=f"Farmer {uid}", latitude=10.78 + uid / 100, longitude=39.85,
                 consent_data=consent)
        platform.execute("UPDATE users SET woreda_pcode=?, zone_pcode=?, region_pcode=? WHERE id=?",
                         (DEWA, DEWA[:6], DEWA[:4], uid))
        platform.execute("INSERT INTO farms (user_id, field_name, crop_name, area_ha, status) VALUES (?, 'Plot', 'wheat', 0.5, 'healthy')",
                         (uid,))
    for i in range(6):
        platform.execute("INSERT INTO diagnoses (farmer_id, disease_key, confidence, source, created_at) "
                         "VALUES (1, 'yellow_rust', 0.9, 'model', datetime('now', 'localtime', ?))", (f"-{i} days",))
    shop = platform.execute("INSERT INTO organisations (name, type, woreda_pcode, verified) VALUES ('Shop A', 'agro_dealer', ?, 1)",
                            (DEWA,)).lastrowid
    platform.execute("INSERT INTO organisations (name, type, woreda_pcode) VALUES ('Shop B', 'agro_dealer', ?)", (DEWA,))
    pid = platform.execute("SELECT id FROM approved_products WHERE status='registered' LIMIT 1").fetchone()[0]
    platform.execute("INSERT INTO shop_products (org_id, product_id, in_stock, price_etb, pack_size) VALUES (?, ?, 1, 2400, '1 L')",
                     (shop, pid))
    platform.execute("INSERT INTO verifications (code, result, reason, woreda_pcode, created_at) "
                     "VALUES ('X', 'warning', 'unknown_code', ?, datetime('now', 'localtime'))", (DEWA,))
    da = add_user(platform, 10, role="agent", name="DA")
    platform.execute("UPDATE users SET region_pcode=?, region='Amhara' WHERE id=10", (DEWA[:4],))
    platform.execute("UPDATE farmer_profiles SET assigned_da_id=10 WHERE user_id IN (1, 2, 3)")
    gov = add_user(platform, 11, role="government")
    platform.execute("UPDATE users SET zone_pcode=? WHERE id=11", (DEWA[:6],))
    platform.commit()
    # A tiny NMIS price database for the market layer.
    nmis = sqlite3.connect(":memory:", check_same_thread=False)
    nmis.row_factory = sqlite3.Row
    nmis.executescript("""
        CREATE TABLE crops (id INTEGER PRIMARY KEY, crop_name TEXT);
        CREATE TABLE varieties (id INTEGER PRIMARY KEY, crop_id INTEGER, unit TEXT);
        CREATE TABLE markets (id INTEGER PRIMARY KEY, market_name TEXT, region TEXT);
        CREATE TABLE prices (market_id INTEGER, variety_id INTEGER, collection_date TEXT,
                             price_retail_min REAL, price_retail_max REAL);
        INSERT INTO crops VALUES (1, 'Wheat'); INSERT INTO varieties VALUES (1, 1, 'Quintal');
        INSERT INTO markets VALUES (7, 'Kemise', 'Amhara');
        INSERT INTO prices VALUES (7, 1, date('now'), 5000, 6000);
    """)
    from backend import database
    monkeypatch.setattr(database, "get_connection", lambda: nmis)
    platform.executescript("""CREATE TABLE IF NOT EXISTS market_locations (market_id INTEGER PRIMARY KEY, market_name TEXT,
        nmis_region TEXT, pcode TEXT, latitude REAL, longitude REAL, method TEXT);
        INSERT INTO market_locations VALUES (7, 'Kemise', 'Amhara', 'ET031006', 10.72, 39.87, 'name_match');
        INSERT INTO market_locations VALUES (8, 'Far market', 'Amhara', NULL, 11.5, 38.0, 'region_centre');""")
    platform.commit()
    return {"da": da, "gov": dict(platform.execute("SELECT * FROM users WHERE id=11").fetchone()),
            "farmer": dict(platform.execute("SELECT * FROM users WHERE id=1").fetchone()),
            "admin": add_user(platform, 12, role="admin"), "regulator": add_user(platform, 13, role="regulator")}


def test_farmer_sees_own_farm_disease_markets_and_shops(client_as, world):
    body = client_as(world["farmer"]).get("/api/map/layers").json()
    assert set(body["available"]) == {"disease", "markets", "shops", "farms"}
    farms = body["layers"]["farms"]
    assert farms["mode"] == "own" and [f["id"] for f in farms["farmers"]] == [1]
    assert farms["farmers"][0]["approximate"] is False
    hot = body["layers"]["disease"]["hotspots"]
    assert hot[0]["pcode"] == DEWA and hot[0]["scans"] == 6 and hot[0]["latitude"]
    m = {x["id"]: x for x in body["layers"]["markets"]["markets"]}
    assert m[7]["price_etb"] == 5500 and m[7]["price_per_quintal"] == 5500 and m[7]["approximate"] is False
    assert m[8]["price_etb"] is None and m[8]["approximate"] is True
    shops = {s["name"]: s for s in body["layers"]["shops"]["shops"]}
    assert shops["Shop A"]["verified"] and shops["Shop A"]["products"][0]["price_etb"] == 2400
    assert (shops["Shop A"]["latitude"], shops["Shop A"]["longitude"]) != (shops["Shop B"]["latitude"], shops["Shop B"]["longitude"])
    assert "counterfeits" not in body["layers"]["shops"]


def test_da_sees_consenting_farmers_with_priority(client_as, world):
    farms = client_as(world["da"]).get("/api/map/layers", params={"layers": "farms"}).json()["layers"]["farms"]
    assert farms["mode"] == "farmers"
    assert {f["id"] for f in farms["farmers"]} == {1, 2}            # farmer 3 gave no data consent
    assert all(f["farms"] and f["assigned_to_me"] for f in farms["farmers"])


def test_government_sees_only_counts_with_small_numbers_hidden(client_as, world):
    body = client_as(world["gov"]).get("/api/map/layers").json()
    farms = body["layers"]["farms"]
    assert farms["mode"] == "counts" and "farmers" not in farms
    row = farms["woredas"][0]
    assert row["pcode"] == DEWA and row["farmers"] == "<5" and row["hectares"] is None
    assert body["scope"]["pcode"] == DEWA[:6]
    assert "name" not in str(farms)                                  # no farmer names anywhere


def test_regulator_gets_counterfeits_and_unknown_layers_are_ignored(client_as, world):
    body = client_as(world["regulator"]).get("/api/map/layers", params={"layers": "shops,secret"}).json()
    assert list(body["layers"]) == ["shops"]
    assert body["layers"]["shops"]["counterfeits"][0]["warnings"] == 1


def test_admin_farms_are_counts_for_the_whole_country(client_as, world):
    farms = client_as(world["admin"]).get("/api/map/layers", params={"layers": "farms"}).json()["layers"]["farms"]
    assert farms["mode"] == "counts" and farms["woredas"][0]["farmers"] == "<5"
