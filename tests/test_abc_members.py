"""ABC member registry (A3): enrol with consent, encrypted national ID, duplicates, bulk import, inclusion counts."""

import pytest

from backend import abc_formation as fm
from backend import abc_members as mem
from backend import admin_areas
from tests.conftest import add_user

DEWA = "ET031001"
FAYDA = "1234-5678-9012-3456"


@pytest.fixture
def world(platform, client_as, monkeypatch, tmp_path):
    monkeypatch.setattr(fm, "UPLOAD_ROOT", tmp_path)
    monkeypatch.setenv("ABC_ID_SECRET", "test-secret-for-ids")
    admin_areas.import_boundaries(platform)
    org = platform.execute("INSERT INTO organisations (name, type) VALUES ('Jiru ABC', 'abc')").lastrowid
    gm = add_user(platform, 2, phone="0911000002")
    board = add_user(platform, 3, phone="0911000003")
    for uid, role in ((2, "general_manager"), (3, "board_member")):
        platform.execute("INSERT INTO abc_roles (org_id, user_id, role, since) VALUES (?, ?, ?, 'x')", (org, uid, role))
    farmer = add_user(platform, 10, phone="0911000010", name="Existing Farmer")
    platform.execute("INSERT INTO farms (user_id, field_name, crop_name, area_ha, irrigated) VALUES (10, 'Plot A', 'wheat', 0.75, 1)")
    platform.execute("INSERT INTO farms (user_id, field_name, crop_name, area_ha, irrigated) VALUES (10, 'Plot B', 'teff', 0.5, 0)")
    trader = add_user(platform, 11, role="trader", phone="0911000011")
    platform.commit()
    return {"org": org, "gm": client_as(gm), "board": client_as(board), "farmer": client_as(farmer),
            "trader": trader, "platform": platform}


def test_enrol_existing_farmer_by_app_invitation_or_spoken_consent(world, platform):
    gm = world["gm"]
    r = gm.post("/api/abc/registry", json={"phone": "0911000010", "consent_method": "app", "gender": "female"})
    assert r.status_code == 201 and r.json()["status"] == "invited" and not r.json()["account_created"]
    inv = world["farmer"].get("/api/users/abc-invitations").json()
    assert inv[0]["org_id"] == world["org"] and inv[0]["status"] == "invited"
    r = gm.post("/api/abc/registry", json={"phone": "0911000010", "consent_method": "spoken", "age_group": "30-44"})
    assert r.json()["status"] == "active"
    row = gm.get("/api/abc/registry").json()["members"][0]
    assert row["member_no"] == 1 and row["gender"] == "female" and row["age_group"] == "30-44"
    assert row["consent_method"] == "spoken" and row["consent_recorded_by"] == "User 2"
    assert row["plots"] == 2 and row["area_ha"] == 1.25 and row["irrigated_plots"] == 1
    plots = gm.get("/api/abc/registry/10/plots").json()
    assert [p["field_name"] for p in plots] == ["Plot A", "Plot B"]
    assert gm.post("/api/abc/registry", json={"phone": "0911000011", "consent_method": "spoken"}).status_code == 400  # trader


def test_new_farmer_account_and_paper_consent(world, platform):
    gm = world["gm"]
    base = {"phone": "0911000020", "name": "New Member", "area_pcode": DEWA, "pin": "123456"}
    assert gm.post("/api/abc/registry", json={**base, "consent_method": "app"}).status_code == 400   # no app account yet
    assert gm.post("/api/abc/registry", json={**base, "consent_method": "paper"}).status_code == 400  # form missing
    form = gm.post("/api/abc/documents", data={"kind": "other", "title": "Consent form"},
                   files={"file": ("c.pdf", b"%PDF-1.4", "application/pdf")}).json()
    r = gm.post("/api/abc/registry", json={**base, "consent_method": "paper", "consent_doc_id": form["id"]})
    assert r.status_code == 201 and r.json()["account_created"] and r.json()["status"] == "active"
    u = platform.execute("SELECT role, woreda_pcode FROM users WHERE phone='0911000020'").fetchone()
    assert tuple(u) == ("farmer", DEWA)
    ev = platform.execute("SELECT method FROM consent_events WHERE user_id=?", (r.json()["farmer_id"],)).fetchall()
    assert {e[0] for e in ev} == {"abc_paper"}


def test_national_id_is_encrypted_masked_audited_and_unique(world, platform):
    gm = world["gm"]
    gm.post("/api/abc/registry", json={"phone": "0911000010", "consent_method": "spoken", "id_type": "fayda",
                                       "id_number": FAYDA})
    stored = platform.execute("SELECT id_encrypted, id_last4, id_hash FROM abc_member_details").fetchone()
    assert "1234" not in stored[0] and stored[1] == "3456" and len(stored[2]) == 64
    row = gm.get("/api/abc/registry").json()["members"][0]
    assert row["id_masked"] == "•••• 3456" and "id_encrypted" not in row and "id_hash" not in row
    assert world["board"].post("/api/abc/registry/10/id", json={"reason": "check"}).status_code == 403
    full = gm.post("/api/abc/registry/10/id", json={"reason": "Bank account opening"})
    assert full.json()["id_number"] == "1234567890123456"
    assert platform.execute("SELECT COUNT(*) FROM audit_log WHERE action='abc.member.id_view'").fetchone()[0] == 1
    r = gm.post("/api/abc/registry", json={"phone": "0911000020", "name": "Other", "area_pcode": DEWA, "pin": "123456",
                                           "consent_method": "spoken", "id_type": "fayda", "id_number": "1234 5678 9012 3456"})
    assert r.status_code == 409                                                   # same ID, other spacing
    assert gm.put("/api/abc/registry/10", json={"gender": "male"}).json()["gender"] == "male"


def test_bulk_import_dry_run_then_import(world, platform):
    gm = world["gm"]
    csv = "\n".join([
        ",".join(mem.CSV_COLUMNS),
        f"0911000010,,,,female,45-59,fayda,{FAYDA},spoken,",                     # existing farmer
        f"0911000030,Abebe Kebede,{DEWA},01,male,15-29,,,spoken,123456",          # new account
        "0911000030,Dup Phone,ET031001,,male,,,,spoken,123456",                    # duplicate phone in file
        f"0911000031,Same ID,{DEWA},,female,,fayda,{FAYDA},spoken,123456",       # duplicate ID in file
        "0911000032,No Pin,ET031001,,,,,,spoken,",                                 # new farmer without pin
        "12345,Bad Phone,ET031001,,,,,,spoken,123456",
        "0911000011,Trader,,,,,,,spoken,",                                         # not a farmer
        "0911000033,Bad Gender,ET031001,,x,,,,spoken,123456",
        "0911000034,No Consent,ET031001,,,,,,,123456",
    ])
    files = {"file": ("m.csv", csv, "text/csv")}
    dry = gm.post("/api/abc/registry/import", params={"dry_run": "true"}, files=files).json()
    assert (dry["rows"], dry["ok"], dry["new_accounts"]) == (9, 2, 1)
    assert {e["line"] for e in dry["errors"]} == {4, 5, 6, 7, 8, 9, 10}
    assert gm.get("/api/abc/registry").json()["members"] == []                   # dry run wrote nothing
    real = gm.post("/api/abc/registry/import", params={"dry_run": "false"}, files=files).json()
    assert real["ok"] == 2
    members = {m["phone"]: m for m in gm.get("/api/abc/registry").json()["members"]}
    assert set(members) == {"0911000010", "0911000030"} and members["0911000010"]["id_masked"] == "•••• 3456"
    inc = gm.get("/api/abc/registry/inclusion").json()
    assert inc == {"total": 2, "gender": {"female": 1, "male": 1}, "age_group": {"45-59": 1, "15-29": 1},
                   "unknown_gender": 0, "unknown_age": 0}
    assert world["board"].post("/api/abc/registry/import", files=files).status_code == 403
    assert gm.get("/api/abc/registry/template.csv").text.strip() == ",".join(mem.CSV_COLUMNS)


def test_member_leaves_and_records_stay(world, platform):
    gm = world["gm"]
    gm.post("/api/abc/registry", json={"phone": "0911000010", "consent_method": "spoken"})
    assert gm.post("/api/abc/registry/10/remove", json={"reason": "Moved away"}).status_code == 204
    assert gm.get("/api/abc/registry").json()["members"] == []
    assert platform.execute("SELECT COUNT(*) FROM abc_member_details WHERE farmer_id=10").fetchone()[0] == 1
    assert gm.post("/api/abc/registry/10/remove", json={"reason": "again"}).status_code == 404
    gm.post("/api/abc/registry", json={"phone": "0911000010", "consent_method": "spoken"})   # can come back
    assert gm.get("/api/abc/registry").json()["members"][0]["member_no"] == 1             # same member number
