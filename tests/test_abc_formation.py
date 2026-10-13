"""ABC formation and registration (A2): rules-driven readiness, documents, agreement signatures, registration."""

from datetime import date, timedelta

import pytest

from backend import abc_formation as fm
from tests.conftest import add_user

PDF = b"%PDF-1.4 test document"


@pytest.fixture
def world(platform, client_as, monkeypatch, tmp_path):
    monkeypatch.setattr(fm, "UPLOAD_ROOT", tmp_path)
    org = platform.execute("INSERT INTO organisations (name, type) VALUES ('Jiru ABC', 'abc')").lastrowid
    gm = add_user(platform, 2, phone="0911000002")
    admin = add_user(platform, 1, role="admin")
    platform.execute("INSERT INTO abc_roles (org_id, user_id, role, since) VALUES (?, 2, 'general_manager', 'x')", (org,))
    farmers = []
    for uid in range(10, 16):
        farmers.append(add_user(platform, uid, phone=f"09110000{uid}"))
        platform.execute("INSERT INTO abc_members (org_id, farmer_id, status, invited_at) VALUES (?, ?, 'active', 'x')",
                         (org, uid))
    outsider = add_user(platform, 30, phone="0911000030")
    platform.commit()
    return {"org": org, "gm": client_as(gm), "admin": client_as(admin), "farmers": [client_as(f) for f in farmers],
            "outsider": client_as(outsider)}


def upload(client, kind, title="Doc", plan_years=None, data=PDF, ctype="application/pdf", org_id=None):
    form = {"kind": kind, "title": title, **({"plan_years": str(plan_years)} if plan_years else {})}
    return client.post("/api/abc/documents", params={"org_id": org_id} if org_id else None, data=form,
                       files={"file": ("doc.pdf", data, ctype)})


def items(client, **params):
    body = client.get("/api/abc/formation", params=params).json()
    return body, {i["key"]: i for i in body["readiness"]["items"]}


def test_checklist_follows_the_rules(world, platform):
    gm = world["gm"]
    body, it = items(gm)
    assert body["status"] == "formation" and body["readiness"]["ready"] is False
    assert it["members"]["have"] == 6 and it["members"]["need"] == 300
    assert it["members"]["rules"][0]["verification_status"] == "PLACEHOLDER_VERIFY"
    assert it["committee"]["need"] == "5-13" and not it["committee"]["ok"]
    # Lower the member minimum by a new rule row: the checklist follows without code changes.
    world["admin"].post("/api/admin/abc-rules", json={"key": "min_founding_members", "abc_type": "crop_grain", "value": 6,
                                                       "effective_from": date.today().isoformat(), "source": "Test directive"})
    assert items(gm)[1]["members"]["ok"]


def test_documents_versions_and_limits(world):
    gm = world["gm"]
    assert upload(gm, "business_plan").status_code == 400                         # years required
    first = upload(gm, "business_plan", plan_years=2).json()
    second = upload(gm, "business_plan", plan_years=4).json()
    assert (first["version"], second["version"]) == (1, 2) and "stored_path" not in second
    _, it = items(gm)
    assert it["business_plan"]["ok"] and it["business_plan"]["have"] == 4         # latest version, 3-5 years
    docs = gm.get("/api/abc/documents").json()
    assert [d["latest"] for d in docs if d["kind"] == "business_plan"] == [True, False]
    assert gm.get(f"/api/abc/documents/{first['id']}/file").content == PDF
    assert upload(gm, "other", data=b"MZ...", ctype="application/x-msdownload").status_code == 400
    assert upload(gm, "secret_kind").status_code == 400
    assert upload(world["farmers"][0], "other", org_id=world["org"]).status_code == 403   # members can't upload
    assert world["outsider"].get(f"/api/abc/documents/{first['id']}/file", params={"org_id": world["org"]}).status_code == 403


def test_agreement_signed_in_app_or_on_paper(world):
    gm, org = world["gm"], world["org"]
    assert world["farmers"][0].post("/api/abc/my/agreement/sign", params={"org_id": org}).status_code == 400  # no agreement yet
    agreement = upload(gm, "founding_agreement").json()
    mine = world["farmers"][0].get("/api/abc/my/memberships").json()
    assert mine[0]["org_id"] == org and mine[0]["signed"] is None
    assert world["farmers"][0].get("/api/abc/my/agreement/file", params={"org_id": org}).content == PDF
    for f in world["farmers"][:5]:
        assert f.post("/api/abc/my/agreement/sign", params={"org_id": org}).status_code == 200
    scan = upload(gm, "other", title="Signed copy, farmer 15").json()
    r = gm.post("/api/abc/agreement/signatures", json={"farmer_id": 15, "scan_doc_id": scan["id"]})
    assert r.status_code == 201 and r.json()["signed"] == 6
    assert items(gm)[1]["agreement"]["ok"]
    assert world["outsider"].post("/api/abc/my/agreement/sign", params={"org_id": org}).status_code == 400
    assert world["outsider"].get("/api/abc/my/agreement/file", params={"org_id": org}).status_code == 403
    # A new version of the agreement needs new signatures.
    upload(gm, "founding_agreement", title="Amended")
    _, it = items(gm)
    assert not it["agreement"]["ok"] and it["agreement"]["have"] == 0
    assert agreement["version"] == 1


def test_registration_needs_a_complete_checklist_or_an_admin_reason(world, platform):
    gm, org = world["gm"], world["org"]
    cert = upload(gm, "registration_certificate").json()
    body = {"authority": "Ministry of Agriculture", "number": "ABC/001/2026", "registered_on": "2026-10-10",
            "certificate_doc_id": cert["id"]}
    r = gm.post("/api/abc/registration", json=body)
    assert r.status_code == 400 and "members" in r.json()["detail"]
    assert gm.post("/api/abc/registration", json={**body, "override_reason": "already registered offline"}).status_code == 403
    admin = world["admin"]
    assert admin.post("/api/abc/registration", params={"org_id": org}, json={**body, "override_reason": "short"}).status_code == 400
    ok = admin.post("/api/abc/registration", params={"org_id": org},
                    json={**body, "override_reason": "Registered by MoA on 10 Oct 2026 before joining the platform"})
    assert ok.status_code == 200 and ok.json()["registration_number"] == "ABC/001/2026"
    assert gm.get("/api/abc/company").json()["profile"]["status"] == "registered"
    assert gm.post("/api/abc/registration", json=body).status_code == 400            # only once
    entry = [h for h in gm.get("/api/abc/history").json() if h["action"] == "abc.registration"][0]
    assert entry["detail"]["after"]["checklist_complete"] is False and entry["detail"]["after"]["override_reason"]


def test_full_checklist_registers_without_override(world, platform):
    gm, org = world["gm"], world["org"]
    for key, value in (("min_founding_members", 6), ("min_paid_capital_etb", 0), ("committee_min", 1),
                       ("board_min_members", 1)):
        world["admin"].post("/api/admin/abc-rules", json={"key": key, "value": value, "abc_type": "*" if key != "min_founding_members" else "crop_grain",
                                                           "effective_from": (date.today() - timedelta(days=1)).isoformat(),
                                                           "source": "Test values"})
    gm.put("/api/abc/company", json={"declared_capital_etb": 0.0})
    platform.execute("INSERT INTO abc_roles (org_id, user_id, role, since) VALUES (?, 10, 'organizing_committee', 'x')", (org,))
    platform.execute("INSERT INTO abc_roles (org_id, user_id, role, since) VALUES (?, 11, 'chair', 'x')", (org,))
    platform.commit()
    rec = upload(gm, "recognition").json()
    assert gm.put("/api/abc/formation/recognition", json={"authority": "Amhara BoA", "recognized_on": "2026-09-01",
                                                          "doc_id": rec["id"]}).status_code == 200
    upload(gm, "business_plan", plan_years=3)
    upload(gm, "capital_deposit")
    upload(gm, "founding_agreement")
    for f in world["farmers"]:
        f.post("/api/abc/my/agreement/sign", params={"org_id": org})
    body, it = items(gm)
    assert [k for k, v in it.items() if not v["ok"]] == ["declared_paid"]           # declared capital 0: not counted
    gm.put("/api/abc/company", json={"declared_capital_etb": 20000.0})
    gm.put("/api/abc/shares/setup", json={"share_value_etb": 1000, "shares_offered": 1000})
    r = gm.post("/api/abc/shares/pledges", json={"farmer_id": 10, "shares": 5, "kind": "minimum",
                                                 "first_payment": {"amount_etb": 5000, "method": "cash"}})
    assert r.status_code == 201                                   # 5 000 of 20 000 declared = the 25% needed
    assert items(gm)[0]["readiness"]["ready"]
    cert = upload(gm, "registration_certificate").json()
    r = gm.post("/api/abc/registration", json={"authority": "MoA", "number": "N1", "registered_on": "2026-10-12",
                                               "certificate_doc_id": cert["id"]})
    assert r.status_code == 200 and r.json()["override_reason"] is None
