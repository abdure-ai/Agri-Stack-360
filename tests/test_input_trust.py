"""Input Trust pilot (checklist 1.1 / 1.6; Tier 1 M6): batch codes, checks, copies, recalls, supplier isolation."""

import re
from datetime import date, datetime, timedelta
from pathlib import Path

import pytest

from backend import input_trust
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]


def test_codes_are_readable_and_normalised(platform):
    code = input_trust.new_code(platform)
    assert re.fullmatch(r"[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}", code)
    assert input_trust.normalise(" ab3d ef7h-jk9m ") == "AB3D-EF7H-JK9M"
    assert input_trust.normalise("http://192.168.1.6:5173/verify?code=AB3D-EF7H-JK9M") == "AB3D-EF7H-JK9M"


@pytest.fixture
def world(platform, client_as):
    load_seed(platform, ROOT / "data" / "advisory_seed")
    admin = add_user(platform, 9, role="admin")
    sup_a = add_user(platform, 20, role="supplier", name="Supplier A staff", phone="0911000020")
    sup_b = add_user(platform, 21, role="supplier", name="Supplier B staff", phone="0911000021")
    farmer = add_user(platform, 1, phone="0911000001")
    api = client_as(admin)
    org_a = api.post("/api/admin/orgs", json={"name": "PLACEHOLDER Supplier A"}).json()["id"]
    org_b = api.post("/api/admin/orgs", json={"name": "PLACEHOLDER Supplier B"}).json()["id"]
    assert api.post(f"/api/admin/orgs/{org_a}/members", json={"phone": "0911000020", "member_role": "owner"}).status_code == 201
    assert api.post(f"/api/admin/orgs/{org_b}/members", json={"phone": "0911000021"}).status_code == 201
    assert api.post(f"/api/admin/orgs/{org_a}/members", json={"phone": "0911000001"}).status_code == 400   # not a supplier
    products = {r["product_name"]: r["id"] for r in platform.execute("SELECT id, product_name FROM approved_products")}
    return {"admin": admin, "a": sup_a, "b": sup_b, "farmer": farmer, "org_a": org_a, "org_b": org_b, "products": products}


def _batch(client_as, world, units=100, expires=None, number="B-001"):
    sup = client_as(world["a"])
    pid = world["products"]["PLACEHOLDER_FUNGICIDE_A"]
    sup.post(f"/api/supplier/catalogue/{pid}")
    r = sup.post("/api/supplier/batches", json={"product_id": pid, "batch_number": number, "units": units,
                                               "expires_on": expires or (date.today() + timedelta(days=365)).isoformat()})
    assert r.status_code == 201, r.text
    return r.json()


def test_catalogue_only_registered_products(client_as, world):
    sup = client_as(world["a"])
    assert sup.post(f"/api/supplier/catalogue/{world['products']['PLACEHOLDER_BANNED_PRODUCT']}").status_code == 400
    pid = world["products"]["PLACEHOLDER_FUNGICIDE_B"]
    r = sup.post("/api/supplier/batches", json={"product_id": pid, "batch_number": "X1", "units": 10})
    assert r.status_code == 400                                         # not in the catalogue yet
    assert sup.post(f"/api/supplier/catalogue/{pid}").status_code == 201
    assert [p["id"] for p in sup.get("/api/supplier/org").json()["catalogue"]] == [pid]


def test_genuine_then_recalled(client_as, world):
    b = _batch(client_as, world)
    farmer = client_as(world["farmer"])
    r = farmer.post("/api/trust/verify", json={"code": b["code"].lower()}).json()
    assert r["result"] == "genuine" and r["reason"] == "ok" and r["placeholder"] is True
    assert r["product_name"] == "PLACEHOLDER_FUNGICIDE_A" and r["org_name"] == "PLACEHOLDER Supplier A"
    client_as(world["a"]).post(f"/api/supplier/batches/{b['id']}/recall")
    farmer = client_as(world["farmer"])          # client_as() switches the signed-in user for every client
    assert farmer.post("/api/trust/verify", json={"code": b["code"]}).json()["reason"] == "recalled"


def test_unknown_and_expired_codes_warn(client_as, world):
    farmer = client_as(world["farmer"])
    assert farmer.post("/api/trust/verify", json={"code": "ZZZZ-ZZZZ-ZZZZ"}).json() == \
        {"code": "ZZZZ-ZZZZ-ZZZZ", "result": "warning", "reason": "unknown_code"}
    old = _batch(client_as, world, number="OLD", expires=(date.today() - timedelta(days=1)).isoformat())
    farmer = client_as(world["farmer"])
    assert farmer.post("/api/trust/verify", json={"code": old["code"]}).json()["reason"] == "expired"


def test_more_checks_than_units_means_possible_copy(client_as, world):
    b = _batch(client_as, world, units=2)
    farmer = client_as(world["farmer"])
    reasons = [farmer.post("/api/trust/verify", json={"code": b["code"]}).json()["reason"] for _ in range(3)]
    assert reasons == ["ok", "ok", "possible_copy"]


def test_checks_in_many_woredas_mean_possible_copy(world, platform):
    platform.execute("INSERT INTO org_products VALUES (?, ?)", (world["org_a"], world["products"]["PLACEHOLDER_FUNGICIDE_A"]))
    platform.execute("INSERT INTO code_batches (org_id, product_id, batch_number, units, code) VALUES (?,?,?,?,?)",
                     (world["org_a"], world["products"]["PLACEHOLDER_FUNGICIDE_A"], "W1", 1000, "AAAA-BBBB-CCCC"))
    platform.commit()
    now = datetime(2026, 10, 9, 9)
    results = [input_trust.verify(platform, "AAAA-BBBB-CCCC", user_id=1, woreda_pcode=f"ET0{i}", now=now)["reason"]
               for i in range(1, 6)]
    assert results == ["ok", "ok", "ok", "possible_copy", "possible_copy"]       # 4th distinct woreda in 30 days


def test_suppliers_only_see_their_own_batches(client_as, world):
    b = _batch(client_as, world)
    other = client_as(world["b"])
    assert other.get("/api/supplier/batches").json() == []
    assert other.post(f"/api/supplier/batches/{b['id']}/recall").status_code == 404
    assert other.get(f"/api/supplier/batches/{b['id']}/label.svg").status_code == 404
    assert client_as(world["farmer"]).get("/api/supplier/batches").status_code == 403
    assert client_as(world["a"]).post("/api/trust/verify", json={"code": b["code"]}).status_code == 403


def test_suspended_supplier(client_as, world):
    b = _batch(client_as, world)
    client_as(world["admin"]).patch(f"/api/admin/orgs/{world['org_a']}", json={"status": "suspended"})
    assert client_as(world["farmer"]).post("/api/trust/verify", json={"code": b["code"]}).json()["reason"] == "supplier_suspended"
    assert client_as(world["a"]).get("/api/supplier/batches").status_code == 403


def test_fake_report_reaches_the_supplier_report(client_as, world):
    b = _batch(client_as, world)
    farmer = client_as(world["farmer"])
    farmer.post("/api/trust/verify", json={"code": b["code"]})
    farmer.post("/api/trust/verify", json={"code": "ZZZZ-ZZZZ-ZZZZ"})            # unknown codes belong to no supplier
    assert farmer.post("/api/trust/fake-reports", json={}).status_code == 400
    r = farmer.post("/api/trust/fake-reports", json={"code": b["code"], "shop_text": "Market shop", "note": "Different colour"})
    assert r.status_code == 201
    rep = client_as(world["a"]).get("/api/supplier/report").json()
    assert rep["checks"] == 1 and rep["by_reason"] == {"ok": 1}
    assert rep["fake_reports"][0]["shop_text"] == "Market shop" and rep["fake_reports"][0]["product_name"] == "PLACEHOLDER_FUNGICIDE_A"
    assert client_as(world["b"]).get("/api/supplier/report").json()["fake_reports"] == []


def test_label_has_qr_and_code(client_as, world):
    b = _batch(client_as, world)
    r = client_as(world["a"]).get(f"/api/supplier/batches/{b['id']}/label.svg", headers={"Origin": "http://192.168.1.6:5173"})
    assert r.status_code == 200 and r.headers["content-type"].startswith("image/svg+xml")
    assert b["code"] in r.text and "<path" in r.text and "B-001" in r.text
