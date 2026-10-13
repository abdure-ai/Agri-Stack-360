"""
routers/abc_my.py — "My ABC" for a member (milestone A9; spec 2.13): one view of the member's own ABC records.

Members (any signed-in farmer who accepted the ABC; only their own records):
  GET /api/abc/my/summary?org_id=      shares and certificates, payments due, voting weight, plots, input orders,
                                       machinery bookings, account balance and statement, upcoming meetings,
                                       votes to confirm, founding agreement status
  GET /api/abc/my/companies            the ABCs I am a member of
"""

from __future__ import annotations

import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from backend import abc_company as core
from backend import abc_finance, abc_formation, abc_governance, abc_inputs, abc_machinery, abc_members, abc_shares
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection

router = APIRouter(tags=["abc-my"])
_signed = require_permission(P.PROFILE_MANAGE)


def _rows(conn, sql, params=()) -> list[dict]:
    cur = conn.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


@router.get("/abc/my/companies")
async def companies(user: dict = Depends(_signed)):
    return _rows(get_platform_connection(), """SELECT o.id AS org_id, o.name, COALESCE(p.status, 'formation') AS status
                                               FROM abc_members m JOIN organisations o ON o.id = m.org_id
                                               LEFT JOIN abc_profiles p ON p.org_id = o.id
                                               WHERE m.farmer_id=? AND m.status='active' ORDER BY o.name""", (user["id"],))


@router.get("/abc/my/summary")
async def summary(org_id: int, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    me = user["id"]
    if not conn.execute("SELECT 1 FROM abc_members WHERE org_id=? AND farmer_id=? AND status='active'", (org_id, me)).fetchone():
        raise HTTPException(403, "You are not a member of this ABC.")
    org = _rows(conn, "SELECT id, name, phone FROM organisations WHERE id=?", (org_id,))[0]
    profile = core.profile(conn, org_id)
    detail = _rows(conn, "SELECT member_no, consent_method, enrolled_at FROM abc_member_details WHERE org_id=? AND farmer_id=?",
                   (org_id, me))
    today = date.today()

    pledges = []
    for s in _rows(conn, "SELECT * FROM abc_share_pledges WHERE org_id=? AND farmer_id=? AND status != 'cancelled' "
                         "ORDER BY pledged_on", (org_id, me)):
        paid = float(conn.execute("SELECT COALESCE(SUM(amount_etb), 0) FROM abc_share_payments WHERE pledge_id=? "
                                  "AND status='confirmed'", (s["id"],)).fetchone()[0])
        owed = round(s["shares"] * s["share_value"] - paid, 2)
        pledges.append({"id": s["id"], "kind": s["kind"], "shares": s["shares"], "due_on": s["due_on"], "paid_etb": round(paid, 2),
                        "owed_etb": owed, "overdue": bool(s["due_on"] and owed > 0 and s["due_on"] < today.isoformat())})

    snap = conn.execute("SELECT id, label, created_at FROM abc_weight_snapshots WHERE org_id=? ORDER BY id DESC LIMIT 1",
                        (org_id,)).fetchone()
    weight = None
    if snap:
        w = conn.execute("SELECT weight, land_ha, production_qt FROM abc_weights WHERE snapshot_id=? AND farmer_id=?",
                         (snap[0], me)).fetchone()
        if w:
            weight = {"weight": w[0], "land_ha": w[1], "production_qt": w[2], "snapshot": snap[1], "as_of": snap[2]}

    meetings = _rows(conn, """SELECT id, kind, title, scheduled_at, location, agenda, status FROM abc_meetings
                              WHERE org_id=? AND status='scheduled' AND scheduled_at >= ? ORDER BY scheduled_at""",
                     (org_id, today.isoformat()))
    board = set(abc_governance.board_ids(conn, org_id))
    meetings = [m for m in meetings if m["kind"] == "general_assembly" or me in board]
    for m in meetings:
        m["agenda"] = json.loads(m["agenda"])

    sig = abc_formation.signatures(conn, org_id)
    mine = next((m["signature"] for m in sig["members"] if m["id"] == me), None)
    statement = abc_finance.statement(conn, org_id, me)
    return {
        "org": org, "status": profile["status"], "member_no": detail[0]["member_no"] if detail else None,
        "share_value_etb": profile.get("share_value_etb"),
        "shares_held": abc_shares.holdings(conn, org_id, me),
        "certificates": abc_shares.certificates(conn, org_id, me),
        "pledges": pledges, "owed_on_shares_etb": round(sum(p["owed_etb"] for p in pledges), 2),
        "share_payments": abc_shares.payments(conn, org_id, me)[:20],
        "voting_weight": weight,
        "plots": abc_members.member_plots(conn, org_id, me),
        "orders": [o for o in abc_inputs.my_orders(conn, me) if o["org_id"] == org_id],
        "bookings": abc_machinery.bookings(conn, org_id, farmer_id=me, include_closed=True)[-20:],
        "account": {"balance_etb": statement["balance_etb"], "transactions": statement["transactions"][-30:]},
        "meetings": meetings,
        "votes_to_confirm": [v for v in abc_governance.my_votes(conn, me) if not v["confirmed_at"]],
        "agreement": {"uploaded": bool(sig["document"]), "version": sig["document"]["version"] if sig["document"] else None,
                      "signed": mine},
        "official_record_note": core.OFFICIAL_RECORD_NOTE,
    }
