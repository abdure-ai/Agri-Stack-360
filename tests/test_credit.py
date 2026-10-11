"""Lender credit profiles with farmer consent (checklist 1.13; M16)."""

from datetime import datetime, timedelta

import pytest

from backend import erasure
from tests.conftest import add_user

FARMER_PHONE = "0933000001"


@pytest.fixture
def credit(platform):
    farmer = add_user(platform, 1, phone=FARMER_PHONE, name="Abebe Farmer")
    platform.execute("INSERT INTO farms (user_id, field_name, crop_name, area_ha) VALUES (1, 'Plot A', 'wheat', 1.5)")
    platform.commit()
    lender = add_user(platform, 50, role="lender", name="PLACEHOLDER MFI officer")
    other = add_user(platform, 51, role="lender")
    return {"farmer": farmer, "lender": lender, "other": other}


def _request(c, phone=FARMER_PHONE):
    return c.post("/api/credit/requests", json={"phone": phone, "purpose": "Input loan for meher wheat"})


def test_request_reply_is_the_same_for_unknown_numbers(client_as, credit):
    l = client_as(credit["lender"])
    known, unknown = _request(l).json(), _request(l, "0999999999").json()
    assert known == unknown and _request(l).json() == known          # duplicates too
    rows = l.get("/api/credit/requests").json()
    assert len(rows) == 2 and {r["status"] for r in rows} == {"not_shared"}
    assert all(r["farmer_name"] is None for r in rows)


def test_no_report_without_approval_then_approve_read_revoke(client_as, credit, platform):
    l, f = client_as(credit["lender"]), client_as(credit["farmer"])
    _request(l)
    rid = l.get("/api/credit/requests").json()[0]["id"]
    assert l.get(f"/api/credit/requests/{rid}/report").status_code == 403

    mine = f.get("/api/users/credit-requests").json()
    assert mine[0]["lender"] == "PLACEHOLDER MFI officer" and mine[0]["status"] == "pending"
    assert f.post(f"/api/users/credit-requests/{rid}/revoke").status_code == 409
    ok = f.post(f"/api/users/credit-requests/{rid}/approve").json()
    assert ok["status"] == "approved" and ok["expires_at"]
    assert f.post(f"/api/users/credit-requests/{rid}/approve").status_code == 409

    rep = l.get(f"/api/credit/requests/{rid}/report").json()
    assert rep["farmer"]["name"] == "Abebe Farmer" and rep["farms"] == {"count": 1, "area_ha": 1.5, "crops": ["wheat"]}
    assert isinstance(rep["score"], int) and "no AI" in rep["method"]
    assert l.get("/api/credit/requests").json()[0]["farmer_name"] == "Abebe Farmer"
    assert platform.execute("SELECT COUNT(*) FROM audit_log WHERE action='credit_report.read'").fetchone()[0] == 1
    assert client_as(credit["other"]).get(f"/api/credit/requests/{rid}/report").status_code == 404   # other lender

    assert f.post(f"/api/users/credit-requests/{rid}/revoke").json()["status"] == "revoked"
    assert l.get(f"/api/credit/requests/{rid}/report").status_code == 403


def test_decline_looks_like_no_answer_and_approval_expires(client_as, credit, platform):
    l, f = client_as(credit["lender"]), client_as(credit["farmer"])
    _request(l)
    rid = l.get("/api/credit/requests").json()[0]["id"]
    f.post(f"/api/users/credit-requests/{rid}/decline")
    assert l.get("/api/credit/requests").json()[0]["status"] == "not_shared"
    assert l.get(f"/api/credit/requests/{rid}/report").status_code == 403

    _request(l)
    rid2 = l.get("/api/credit/requests").json()[0]["id"]
    f.post(f"/api/users/credit-requests/{rid2}/approve")
    past = (datetime.now() - timedelta(days=1)).isoformat(sep=" ", timespec="seconds")
    platform.execute("UPDATE credit_requests SET expires_at=? WHERE id=?", (past, rid2)); platform.commit()
    assert l.get("/api/credit/requests").json()[0]["status"] == "expired"
    assert l.get(f"/api/credit/requests/{rid2}/report").status_code == 403


def test_roles_and_erasure(client_as, credit, platform):
    assert client_as(credit["farmer"]).post("/api/credit/requests", json={"phone": FARMER_PHONE, "purpose": "x loan"}).status_code == 403
    assert client_as(credit["farmer"]).get("/api/credit/requests").status_code == 403
    _request(client_as(credit["lender"]))
    rid = platform.execute("SELECT id FROM credit_requests").fetchone()[0]
    assert client_as(credit["other"]).post(f"/api/users/credit-requests/{rid}/approve").status_code == 404   # not theirs
    erasure.erase(platform, 1)
    assert platform.execute("SELECT COUNT(*) FROM credit_requests").fetchone()[0] == 0
