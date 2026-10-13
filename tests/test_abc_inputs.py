"""ABC inputs (A7): demand from cited rates x member area, member orders, neutral suppliers, purchase orders with
board approval, Input Trust check at receipt (unverified or duplicate codes block issue), expiry, issue on credit/cash."""

from datetime import date, timedelta
from pathlib import Path

import pytest

from backend import admin_areas
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]
DEWA = "ET031001"


@pytest.fixture
def world(platform, client_as):
    admin_areas.import_boundaries(platform)
    load_seed(platform, ROOT / "data" / "advisory_seed")
    pid = platform.execute("SELECT id FROM approved_products WHERE product_name='PLACEHOLDER_FUNGICIDE_A'").fetchone()[0]
    platform.execute("UPDATE dosage_rules SET dose_per_ha='0.5 L', source='MoA manual, p. 36', verification_status='moa_cited' "
                     "WHERE product_id=? AND lower(crop)='wheat'", (pid,))
    other = platform.execute("SELECT id FROM approved_products WHERE product_name='PLACEHOLDER_FUNGICIDE_C'").fetchone()[0]
    org = platform.execute("INSERT INTO organisations (name, type, woreda_pcode) VALUES ('Jiru ABC', 'abc', ?)", (DEWA,)).lastrowid
    users = {"gm": add_user(platform, 2, phone="0911000002"), "store": add_user(platform, 3, phone="0911000003"),
             "chair": add_user(platform, 4, phone="0911000004"), "agro": add_user(platform, 5, phone="0911000005")}
    for uid, role in ((2, "general_manager"), (3, "store_keeper"), (4, "chair"), (5, "agronomist")):
        platform.execute("INSERT INTO abc_roles (org_id, user_id, role, since) VALUES (?, ?, ?, 'x')", (org, uid, role))
    for uid, area in ((10, 1.0), (11, 0.5)):
        users[uid] = add_user(platform, uid, phone=f"09110000{uid}", name=f"Member {uid}")
        platform.execute("INSERT INTO abc_members (org_id, farmer_id, status, invited_at) VALUES (?, ?, 'active', 'x')", (org, uid))
        platform.execute("INSERT INTO farms (user_id, field_name, crop_name, area_ha) VALUES (?, 'Plot', 'wheat', ?)", (uid, area))
    platform.execute("INSERT OR IGNORE INTO abc_profiles (org_id, board_approval_limit_etb) VALUES (?, 10000)", (org,))
    # a supplier batch with a genuine code, and a shop that sells the product
    sup = platform.execute("INSERT INTO organisations (name, type) VALUES ('Maker', 'supplier')").lastrowid
    exp = (date.today() + timedelta(days=300)).isoformat()
    platform.execute("INSERT INTO code_batches (org_id, product_id, batch_number, units, expires_on, code) VALUES (?,?,?,?,?,?)",
                     (sup, pid, "B1", 500, exp, "GOOD-CODE-0001"))
    platform.execute("INSERT INTO code_batches (org_id, product_id, batch_number, units, expires_on, code) VALUES (?,?,?,?,?,?)",
                     (sup, pid, "B2", 500, (date.today() + timedelta(days=20)).isoformat(), "SOON-CODE-0002"))
    for name, pcode in (("Far shop", "ET030417"), ("Near shop", DEWA)):
        s = platform.execute("INSERT INTO organisations (name, type, woreda_pcode, verified) VALUES (?, 'agro_dealer', ?, ?)",
                             (name, pcode, int(name == "Far shop"))).lastrowid
        platform.execute("INSERT INTO shop_products (org_id, product_id, in_stock, price_etb, pack_size) VALUES (?, ?, 1, 2400, '1 L')",
                         (s, pid))
    platform.commit()
    return {"org": org, "pid": pid, "other": other, "platform": platform, **{k: client_as(v) for k, v in users.items()}}


def test_demand_from_cited_rate_and_member_confirmation(world):
    agro, pid = world["agro"], world["pid"]
    products = agro.get("/api/abc/inputs/products", params={"crop": "wheat"}).json()
    assert any(p["product_id"] == pid and p["dose_per_ha"] == "0.5 L" for p in products)
    plan = agro.post("/api/abc/inputs/plans", json={"season": "2019 irrigated", "crop": "wheat", "product_id": pid}).json()
    assert plan["rate_per_ha"] == 0.5 and plan["unit"] == "L" and plan["rate_source"] == "MoA manual, p. 36"
    orders = {o["farmer_id"]: o for o in plan["orders"]}
    assert orders[10]["suggested_qty"] == 0.5 and orders[11]["suggested_qty"] == 0.25
    mine = world[10].get("/api/abc/my/orders").json()
    assert mine[0]["product_name"] == "PLACEHOLDER_FUNGICIDE_A" and mine[0]["suggested_qty"] == 0.5
    assert world[10].post(f"/api/abc/my/orders/{mine[0]['id']}/confirm", json={"qty": 1.0}).json()["confirmed_qty"] == 1.0
    assert world[11].post(f"/api/abc/my/orders/{mine[0]['id']}/confirm", json={}).status_code == 404     # not theirs
    o11 = orders[11]["id"]
    assert world["store"].post(f"/api/abc/inputs/orders/{o11}/confirm", json={"qty": 0}).json()["status"] == "declined"
    p = world["gm"].get("/api/abc/inputs/plans").json()["plans"][0]
    assert p["totals"]["confirmed_qty"] == 1.0 and p["totals"]["confirmed_members"] == 1
    # a product without a cited rate: orders without quantities ("ask the DA")
    uncited = agro.post("/api/abc/inputs/plans", json={"season": "2019", "crop": "wheat", "product_id": world["other"]}).json()
    assert uncited["rate_per_ha"] is None and all(o["suggested_qty"] is None for o in uncited["orders"])


def test_suppliers_are_nearest_first_and_po_needs_the_board_above_the_limit(world):
    store, chair, pid = world["store"], world["chair"], world["pid"]
    shops = store.get("/api/abc/inputs/suppliers", params={"product_id": pid}).json()
    assert [s["name"] for s in shops] == ["Near shop", "Far shop"]                 # badge does not reorder
    small = store.post("/api/abc/inputs/purchase-orders", json={"supplier": "Near shop", "items": [
        {"product_id": pid, "qty": 2, "unit": "L", "unit_price_etb": 2400}]}).json()
    assert small["status"] == "approved" and small["total_etb"] == 4800
    big = store.post("/api/abc/inputs/purchase-orders", json={"supplier": "Near shop", "items": [
        {"product_id": pid, "qty": 10, "unit": "L", "unit_price_etb": 2400}]}).json()
    assert big["status"] == "pending"
    r = store.post("/api/abc/inputs/receive", json={"po_id": big["po_id"], "product_id": pid, "qty": 10, "code": "GOOD-CODE-0001"})
    assert r.status_code == 400                                                    # waiting for the board
    chair.post(f"/api/abc/approvals/{big['approval_id']}/approve", json={})
    assert store.post("/api/abc/inputs/receive", json={"po_id": big["po_id"], "product_id": pid, "qty": 10,
                                                       "code": "GOOD-CODE-0001"}).json()["status"] == "available"
    world["platform"].execute("UPDATE approved_products SET status='banned' WHERE id=?", (world["other"],))
    world["platform"].commit()
    assert store.post("/api/abc/inputs/purchase-orders", json={"supplier": "X shop", "items": [
        {"product_id": world["other"], "qty": 1, "unit": "L"}]}).status_code == 400  # banned product


def test_receipt_check_blocks_bad_codes_and_issue_posts_to_accounts(world, platform):
    store, gm, pid = world["store"], world["gm"], world["pid"]
    po = store.post("/api/abc/inputs/purchase-orders", json={"supplier": "Near shop", "items": [
        {"product_id": pid, "qty": 4, "unit": "L", "unit_price_etb": 2000}]}).json()["po_id"]
    good = store.post("/api/abc/inputs/receive", json={"po_id": po, "product_id": pid, "qty": 2, "code": "good-code-0001"}).json()
    assert good["status"] == "available" and good["trust_result"] == "genuine" and good["batch_number"] == "B1"
    dup = store.post("/api/abc/inputs/receive", json={"po_id": po, "product_id": pid, "qty": 1, "code": "GOOD-CODE-0001"}).json()
    assert dup["status"] == "quarantined" and dup["trust_reason"] == "duplicate_in_abc"
    fake = store.post("/api/abc/inputs/receive", json={"po_id": po, "product_id": pid, "qty": 1, "code": "FAKE-FAKE-FAKE"}).json()
    assert fake["status"] == "quarantined" and fake["trust_reason"] == "unknown_code"
    soon = store.post("/api/abc/inputs/receive", json={"po_id": po, "product_id": pid, "qty": 1, "code": "SOON-CODE-0002"}).json()
    assert soon["status"] == "available" and soon["expires_soon"]
    nocode = store.post("/api/abc/inputs/receive", json={"po_id": po, "product_id": pid, "qty": 1}).json()
    assert nocode["status"] == "quarantined" and nocode["trust_reason"] == "no_code"
    for lot in (dup, fake):
        r = store.post("/api/abc/inputs/issue", json={"lot_id": lot["id"], "farmer_id": 10, "qty": 1, "price_etb": 2400})
        assert r.status_code == 400 and "product check" in r.json()["detail"]
        assert store.post(f"/api/abc/inputs/stock/{lot['id']}/release", json={"reason": "looks fine"}).status_code == 400
    released = store.post(f"/api/abc/inputs/stock/{nocode['id']}/release", json={"reason": "Checked with the supplier invoice"}).json()
    assert released["status"] == "released" and released["issuable"]
    # issue on credit: member account; for cash: ledger income
    assert store.post("/api/abc/inputs/issue", json={"lot_id": good["id"], "farmer_id": 10, "qty": 3, "price_etb": 2400}).status_code == 400
    r = store.post("/api/abc/inputs/issue", json={"lot_id": good["id"], "farmer_id": 10, "qty": 1, "price_etb": 2400,
                                                  "payment": "credit"}).json()
    assert r["amount_etb"] == 2400 and r["remaining"] == 1
    store.post("/api/abc/inputs/issue", json={"lot_id": good["id"], "farmer_id": 11, "qty": 1, "price_etb": 2400, "payment": "cash"})
    acc = {a["farmer_id"]: a for a in gm.get("/api/abc/finance/members").json()}
    assert acc[10]["input_credit_etb"] == 2400 and acc[11]["balance_etb"] == 0
    s = gm.get("/api/abc/finance/summary").json()
    assert s["income_etb"] == 2400 and s["expense_etb"] == 2000 * 6                 # purchases booked at receipt
    lots = {l["id"]: l for l in gm.get("/api/abc/inputs/stock").json()["lots"]}
    assert lots[good["id"]]["qty_remaining"] == 0 and not lots[good["id"]]["issuable"]
    platform.execute("UPDATE abc_stock_lots SET expires_on='2026-01-01' WHERE id=?", (soon["id"],))
    platform.commit()
    r = store.post("/api/abc/inputs/issue", json={"lot_id": soon["id"], "farmer_id": 10, "qty": 1, "price_etb": 0})
    assert r.status_code == 400 and "expired" in r.json()["detail"]
    assert world["chair"].post("/api/abc/inputs/issue", json={"lot_id": released["id"], "farmer_id": 10, "qty": 1}).status_code == 403
