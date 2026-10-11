"""Regulator (EAA) view (checklist 1.11; M14): registry import/export, counterfeit map, code issuance."""

from datetime import datetime
from pathlib import Path

import pytest

from backend import admin_areas, input_trust
from backend.advisory.seed_loader import load_seed
from tests.conftest import add_user

ROOT = Path(__file__).resolve().parents[1]
DEWA = "ET031001"


@pytest.fixture
def eaa(platform, client_as):
    admin_areas.import_boundaries(platform)
    load_seed(platform, ROOT / "data" / "advisory_seed")
    reg = add_user(platform, 80, role="regulator")
    supplier = add_user(platform, 20, role="supplier", phone="0911000020")
    admin = add_user(platform, 9, role="admin")
    a = client_as(admin)
    org = a.post("/api/admin/orgs", json={"name": "PLACEHOLDER Supplier"}).json()["id"]
    a.post(f"/api/admin/orgs/{org}/members", json={"phone": "0911000020"})
    pid = platform.execute("SELECT id FROM approved_products WHERE product_name='PLACEHOLDER_FUNGICIDE_A'").fetchone()[0]
    s = client_as(supplier)
    s.post(f"/api/supplier/catalogue/{pid}")
    code = s.post("/api/supplier/batches", json={"product_id": pid, "batch_number": "B1", "units": 1}).json()["code"]
    now = datetime.now()
    for _ in range(2):                                                   # second check exceeds 1 pack -> possible copy
        input_trust.verify(platform, code, user_id=None, woreda_pcode=DEWA, now=now)
    input_trust.verify(platform, "ZZZZ-ZZZZ-ZZZZ", user_id=None, woreda_pcode=DEWA, now=now)
    platform.execute("INSERT INTO fake_reports (code, product_text, woreda_pcode, created_at) VALUES (NULL, 'odd pack', ?, ?)",
                     (DEWA, now.isoformat(sep=" ", timespec="seconds")))
    platform.commit()
    return {"reg": reg, "supplier": supplier}


def test_counterfeit_map_and_issuance(client_as, eaa):
    r = client_as(eaa["reg"])
    m = r.get("/api/regulator/counterfeits").json()
    dewa = m["woredas"][0]
    assert dewa["woreda"] == "Dewa Cheffa" and dewa["latitude"]
    assert dewa["by_reason"] == {"possible_copy": 1, "unknown_code": 1} and dewa["fake_reports"] == 1
    iss = r.get("/api/regulator/issuance").json()
    assert iss[0]["name"] == "PLACEHOLDER Supplier" and iss[0]["batches"] == 1 and iss[0]["units"] == 1
    assert iss[0]["checks"] == 2 and iss[0]["warnings"] == 1 and iss[0]["products"] == 1


def test_registry_export_import_round_trip(client_as, eaa, platform):
    r = client_as(eaa["reg"])
    reg = r.get("/api/regulator/registry").json()
    assert reg["summary"]["banned"] == 1 and reg["summary"]["placeholder"] == reg["summary"]["total"]
    csv_text = r.get("/api/regulator/registry.csv").text
    assert csv_text.lstrip("﻿").startswith("product_name,active_ingredient")
    official = csv_text + "OFFICIAL_PRODUCT_X,ai,EC,REG-123,fungicide,wheat,leaf_rust,registered,EAA list 2026,verified\n"
    res = r.post("/api/regulator/registry", files={"file": ("approved_products.csv", official.encode("utf-8"), "text/csv")})
    assert res.status_code == 200, res.text
    row = platform.execute("SELECT registration_number, verification_status FROM approved_products WHERE product_name='OFFICIAL_PRODUCT_X'").fetchone()
    assert tuple(row) == ("REG-123", "verified")
    bad = "product_name\nx\n".encode()
    assert r.post("/api/regulator/registry", files={"file": ("x.csv", bad, "text/csv")}).status_code == 400


def test_only_regulators_and_admins(client_as, eaa):
    assert client_as(eaa["supplier"]).get("/api/regulator/registry").status_code == 403
