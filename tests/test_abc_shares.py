"""ABC shares (A4): share value, minimum pledge, upfront part, 15% cap, issue on payment, reversal, transfers with
board approval, receipts and reminders, audit."""

from datetime import date, datetime, timedelta

import pytest

from backend import abc_shares as sh
from tests.conftest import add_user


@pytest.fixture
def world(platform, client_as):
    org = platform.execute("INSERT INTO organisations (name, type) VALUES ('Jiru ABC', 'abc')").lastrowid
    gm, chair, board = add_user(platform, 2, phone="0911000002"), add_user(platform, 3, phone="0911000003"), add_user(platform, 4, phone="0911000004")
    for uid, role in ((2, "general_manager"), (3, "chair"), (4, "board_member")):
        platform.execute("INSERT INTO abc_roles (org_id, user_id, role, since) VALUES (?, ?, ?, 'x')", (org, uid, role))
    for uid in (10, 11, 12):
        add_user(platform, uid, phone=f"09110000{uid}", name=f"Member {uid}", consent_alerts=1)
        platform.execute("INSERT INTO abc_members (org_id, farmer_id, status, invited_at) VALUES (?, ?, 'active', 'x')", (org, uid))
    add_user(platform, 13, phone="0911000013")                                          # not a member
    platform.commit()
    return {"org": org, "gm": client_as(gm), "chair": client_as(chair), "board": client_as(board), "platform": platform}


def pledge(c, farmer, shares, kind="minimum", payment=None):
    body = {"farmer_id": farmer, "shares": shares, "kind": kind}
    if payment is not None:
        body["first_payment"] = {"amount_etb": payment, "method": "cash"}
    return c.post("/api/abc/shares/pledges", json=body)


def pay(c, pledge_id, amount, method="cash", reference=None):
    return c.post("/api/abc/shares/payments", json={"pledge_id": pledge_id, "amount_etb": amount, "method": method,
                                                    "reference": reference})


def code(r):
    return r.json()["detail"]["code"]


def test_setup_follows_the_rules(world):
    gm = world["gm"]
    assert pledge(gm, 10, 5).status_code == 400                                           # no share value yet
    r = gm.put("/api/abc/shares/setup", json={"share_value_etb": 500})
    assert r.status_code == 400 and code(r) == "share_value_min" and r.json()["detail"]["params"]["minimum"] == 1000
    assert gm.put("/api/abc/shares/setup", json={"share_value_etb": 1000, "shares_offered": 100}).status_code == 200
    assert world["chair"].put("/api/abc/shares/setup", json={"shares_offered": 200}).status_code == 403
    pledge(gm, 10, 5, payment=5000)
    assert gm.put("/api/abc/shares/setup", json={"share_value_etb": 2000}).status_code == 400   # fixed once pledged


def test_minimum_pledge_cap_and_issue_on_payment(world, platform):
    gm = world["gm"]
    gm.put("/api/abc/shares/setup", json={"share_value_etb": 1000, "shares_offered": 100})
    r = pledge(gm, 10, 4)
    assert code(r) == "min_shares" and r.json()["detail"]["params"]["minimum"] == 5        # crop_grain: 5
    assert pledge(gm, 13, 5).status_code == 400                                            # not a member
    r = pledge(gm, 10, 16)
    assert code(r) == "ownership_cap" and r.json()["detail"]["params"] == {"percent": 15.0, "offered": 100, "limit": 15, "after": 16}
    pid = pledge(gm, 10, 10).json()["pledge_id"]
    first = pay(gm, pid, 2500).json()
    assert first["shares_issued"] == 2 and first["receipt_no"].startswith("R") and first["remaining_etb"] == 7500
    assert pay(gm, pid, 100, method="telebirr").status_code == 400                         # reference required
    assert pay(gm, pid, 8000).status_code == 400                                           # more than owed
    assert pay(gm, pid, 7500, method="telebirr", reference="TB123").json()["shares_issued"] == 8
    ov = gm.get("/api/abc/shares").json()
    m = next(x for x in ov["members"] if x["id"] == 10)
    assert m["held"] == 10 and m["owed_etb"] == 0 and m["flags"] == []
    assert ov["totals"]["paid_etb"] == 10000 and ov["totals"]["issued_shares"] == 10 and ov["totals"]["subscribed_percent"] == 10.0
    certs = gm.get("/api/abc/shares/certificates", params={"farmer_id": 10}).json()["certificates"]
    assert [c["shares"] for c in certs] == [2, 8] and certs[0]["certificate_no"] != certs[1]["certificate_no"]
    receipts = platform.execute("SELECT message_key, status FROM alerts WHERE farmer_id=10 AND type='abc_receipt'").fetchall()
    assert len(receipts) == 2 and {r[1] for r in receipts} == {"queued"}
    assert pay(gm, pid, 1).status_code == 400                                              # already paid in full


def test_extra_pledge_upfront_due_date_and_reminders(world, platform):
    gm = world["gm"]
    gm.put("/api/abc/shares/setup", json={"share_value_etb": 1000, "shares_offered": 1000})
    assert pledge(gm, 11, 5, kind="extra", payment=5000).status_code == 400               # minimum pledge first
    pledge(gm, 11, 5, payment=5000)
    r = pledge(gm, 11, 20, kind="extra", payment=4000)
    assert code(r) == "pledge_upfront" and r.json()["detail"]["params"]["amount"] == 5000  # 25% of 20 000
    ok = pledge(gm, 11, 20, kind="extra", payment=5000).json()
    due = date.fromisoformat(ok["due_on"])
    assert (due - date.today()).days in (730, 731)                                         # 2 years
    m = next(x for x in gm.get("/api/abc/shares").json()["members"] if x["id"] == 11)
    assert m["held"] == 10 and m["owed_etb"] == 15000
    platform.execute("UPDATE abc_share_pledges SET due_on=? WHERE id=?", ((date.today() + timedelta(days=10)).isoformat(),
                                                                           ok["pledge_id"]))
    platform.commit()
    assert sh.send_reminders(platform, datetime.now()) == 1
    assert sh.send_reminders(platform, datetime.now()) == 0                                # once a week
    platform.execute("UPDATE abc_share_pledges SET due_on='2026-01-01' WHERE id=?", (ok["pledge_id"],))
    platform.commit()
    flags = next(x for x in gm.get("/api/abc/shares").json()["members"] if x["id"] == 11)["flags"]
    assert flags == ["overdue"]
    keys = [r[0] for r in platform.execute("SELECT message_key FROM alerts WHERE farmer_id=11 AND type='abc_share_due'")]
    assert keys == ["abc_share_due"]


def test_reversal_cancels_shares_and_needs_finance_role(world, platform):
    gm = world["gm"]
    gm.put("/api/abc/shares/setup", json={"share_value_etb": 1000, "shares_offered": 100})
    pid = pledge(gm, 10, 5).json()["pledge_id"]
    p1 = pay(gm, pid, 3000).json()["payment_id"]
    assert world["chair"].post(f"/api/abc/shares/payments/{p1}/reverse", json={"reason": "bounced"}).status_code == 403
    r = gm.post(f"/api/abc/shares/payments/{p1}/reverse", json={"reason": "Bank transfer bounced"})
    assert r.json()["shares_change"] == -3
    assert sh.holdings(platform, world["org"], 10) == 0
    rows = gm.get("/api/abc/shares/payments").json()
    assert rows[0]["status"] == "reversed" and rows[0]["reverse_reason"] == "Bank transfer bounced"
    flags = next(x for x in gm.get("/api/abc/shares").json()["members"] if x["id"] == 10)["flags"]
    assert "minimum_unpaid" in flags


def test_transfer_needs_another_board_member(world, platform):
    gm, chair, board = world["gm"], world["chair"], world["board"]
    gm.put("/api/abc/shares/setup", json={"share_value_etb": 1000, "shares_offered": 100})
    pledge(gm, 10, 10, payment=10000)
    pledge(gm, 12, 5, payment=5000)
    assert gm.post("/api/abc/shares/transfers", json={"from_farmer": 10, "to_farmer": 12, "shares": 11,
                                                       "reason": "sale"}).status_code == 400   # holds only 10
    r = gm.post("/api/abc/shares/transfers", json={"from_farmer": 12, "to_farmer": 10, "shares": 6, "reason": "sale"})
    assert r.status_code == 400                                                              # holds only 5
    r = chair.post("/api/abc/shares/transfers", json={"from_farmer": 10, "to_farmer": 12, "shares": 4, "reason": "inheritance"})
    assert r.status_code == 403                                                              # chair can't record shares
    aid = gm.post("/api/abc/shares/transfers", json={"from_farmer": 10, "to_farmer": 12, "shares": 4,
                                                      "reason": "Sale between members"}).json()["approval_id"]
    assert gm.post(f"/api/abc/approvals/{aid}/approve", json={}).status_code == 403          # GM can't approve
    pending = board.get("/api/abc/approvals", params={"status": "pending"}).json()
    assert pending["can_approve"] and pending["approvals"][0]["summary"]["shares"] == 4
    assert chair.post(f"/api/abc/approvals/{aid}/approve", json={"note": "Board meeting 12 Oct"}).status_code == 200
    assert sh.holdings(platform, world["org"], 10) == 6 and sh.holdings(platform, world["org"], 12) == 9
    assert chair.post(f"/api/abc/approvals/{aid}/reject", json={}).status_code == 404        # already decided
    actions = [h["action"] for h in gm.get("/api/abc/history").json()]
    assert {"abc.share.pledge", "abc.share.payment", "abc.share.transfer_request", "abc.approval.decide"} <= set(actions)


def test_member_with_shares_cannot_simply_leave(world, platform):
    gm = world["gm"]
    gm.put("/api/abc/shares/setup", json={"share_value_etb": 1000, "shares_offered": 100})
    pledge(gm, 10, 5, payment=5000)
    r = gm.post("/api/abc/registry/10/remove", json={"reason": "moving"})
    assert r.status_code == 400 and "transfer" in r.json()["detail"]
