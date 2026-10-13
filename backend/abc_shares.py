"""
abc_shares.py — ABC shares: pledges, payments, issued shares, certificates, transfers, rule checks (milestone A4).

Spec 2.2 / docs/abc-pilot-plan.md. Every threshold comes from the ABC rules (backend/abc_company.rule):
  * share value: one value for every share of the ABC, at least `share_value_min_etb`; fixed once shares exist;
  * minimum pledge: a member's first pledge ('minimum') is at least `min_shares_per_member` shares and must be paid
    in full (flagged until it is);
  * extra pledges: at least `pledge_upfront_fraction` paid with the pledge, the rest within
    `pledge_deadline_years` (due date on the pledge; reminders before and after the date);
  * ownership cap: shares held + still owed on pledges ≤ `max_ownership_fraction` × shares offered. A refused pledge
    or transfer says why with a code and values, so the screen explains it in the user's language.

Shares are issued as they are paid for (whole shares; each issue gets a certificate number). Reversing a payment
cancels shares no longer paid for. Transfers between members need a board approval (generic approval requests,
also used for purchases later); the person who asked cannot approve their own request.
Receipts go to the member (app, and Telegram when linked) as transactional messages. All changes are audited.
"""

from __future__ import annotations

import json
import math
import sqlite3
from datetime import date, datetime, timedelta

from fastapi import HTTPException

from backend import abc_company as core
from backend import audit

METHODS = ("cash", "bank", "telebirr", "mpesa", "other")
EPS = 0.005
# Other modules register what happens when a request of their kind is decided: fn(conn, ctx, approval, approved).
APPROVAL_HANDLERS: dict = {}

SCHEMA = """
CREATE TABLE IF NOT EXISTS abc_share_pledges (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id      INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    farmer_id   INTEGER NOT NULL REFERENCES users(id),
    kind        TEXT NOT NULL CHECK (kind IN ('minimum','extra')),
    shares      INTEGER NOT NULL CHECK (shares > 0),
    share_value REAL NOT NULL,
    pledged_on  TEXT NOT NULL,
    due_on      TEXT,                              -- extra pledges: last day to pay in full
    status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid','cancelled')),
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS abc_share_payments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id      INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    farmer_id   INTEGER NOT NULL REFERENCES users(id),
    pledge_id   INTEGER NOT NULL REFERENCES abc_share_pledges(id),
    amount_etb  REAL NOT NULL CHECK (amount_etb > 0),
    method      TEXT NOT NULL CHECK (method IN ('cash','bank','telebirr','mpesa','other')),
    reference   TEXT,
    paid_on     TEXT NOT NULL,
    receipt_no  TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','reversed')),
    reverse_reason TEXT,
    recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recorded_at TEXT NOT NULL,
    UNIQUE (org_id, receipt_no)
);
CREATE TABLE IF NOT EXISTS abc_share_ledger (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id         INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    farmer_id      INTEGER NOT NULL REFERENCES users(id),
    shares         INTEGER NOT NULL,               -- + issued / received, - cancelled / given
    reason         TEXT NOT NULL CHECK (reason IN ('issue','cancel','transfer_in','transfer_out')),
    certificate_no TEXT,
    pledge_id      INTEGER REFERENCES abc_share_pledges(id),
    payment_id     INTEGER REFERENCES abc_share_payments(id),
    transfer_id    INTEGER,
    created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_abc_share_ledger ON abc_share_ledger (org_id, farmer_id);
CREATE TABLE IF NOT EXISTS abc_share_transfers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id      INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    from_farmer INTEGER NOT NULL REFERENCES users(id),
    to_farmer   INTEGER NOT NULL REFERENCES users(id),
    shares      INTEGER NOT NULL CHECK (shares > 0),
    reason      TEXT NOT NULL,                     -- sale, inheritance, exit, ...
    status      TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','done','rejected')),
    created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS abc_approvals (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id       INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    kind         TEXT NOT NULL,                    -- 'share_transfer' (A4), 'purchase_order' (A7), ...
    ref_id       INTEGER NOT NULL,
    summary      TEXT NOT NULL,                    -- JSON shown to the approver
    amount_etb   REAL,
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    requested_at TEXT NOT NULL,
    decided_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    decided_at   TEXT,
    note         TEXT
);
"""


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    cols = {r[1] for r in conn.execute("PRAGMA table_info(abc_profiles)")}
    for col, decl in (("share_value_etb", "REAL"), ("shares_offered", "INTEGER")):
        if col not in cols:
            conn.execute(f"ALTER TABLE abc_profiles ADD COLUMN {col} {decl}")
    conn.commit()


def _now() -> str:
    return datetime.now().isoformat(sep=" ", timespec="seconds")


def _rows(conn, sql, params=()) -> list[dict]:
    cur = conn.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


class RuleError(HTTPException):
    """A refused action with a code and values, so the screen explains it in the user's language."""

    def __init__(self, code: str, message: str, **params):
        super().__init__(400, {"code": code, "params": params, "message": message})


def _rule(conn, ctx: core.AbcContext, key: str, on: date | None = None) -> float:
    return core.rule(conn, key, ctx.profile["abc_type"], on).value


def _active_member(conn, org_id: int, farmer_id: int) -> None:
    if not conn.execute("SELECT 1 FROM abc_members WHERE org_id=? AND farmer_id=? AND status='active'",
                        (org_id, farmer_id)).fetchone():
        raise HTTPException(400, "Only active members can hold shares.")


# ── Setup ─────────────────────────────────────────────────────────────────────

def setup(conn, ctx: core.AbcContext, actor: dict, share_value: float | None, shares_offered: int | None) -> dict:
    org = ctx.org["id"]
    p = core.profile(conn, org)
    changes: dict = {}
    if share_value is not None and share_value != p.get("share_value_etb"):
        if conn.execute("SELECT 1 FROM abc_share_pledges WHERE org_id=? AND status != 'cancelled' LIMIT 1", (org,)).fetchone():
            raise HTTPException(400, "The share value is fixed once members have pledged shares.")
        minimum = _rule(conn, ctx, "share_value_min_etb")
        if share_value < minimum - EPS:
            raise RuleError("share_value_min", f"A share must be worth at least {minimum:,.0f} birr.", minimum=minimum)
        changes["share_value_etb"] = round(share_value, 2)
    if shares_offered is not None and shares_offered != p.get("shares_offered"):
        if shares_offered < held_total(conn, org):
            raise HTTPException(400, "Fewer shares than members already hold or owe.")
        changes["shares_offered"] = shares_offered
    if changes:
        return core.update_profile(conn, actor, org, changes)
    return p


# ── Positions ─────────────────────────────────────────────────────────────────

def _paid_for(conn, pledge_id: int) -> float:
    return float(conn.execute("SELECT COALESCE(SUM(amount_etb), 0) FROM abc_share_payments WHERE pledge_id=? "
                              "AND status='confirmed'", (pledge_id,)).fetchone()[0])


def _issued_for(conn, pledge_id: int) -> int:
    return int(conn.execute("SELECT COALESCE(SUM(shares), 0) FROM abc_share_ledger WHERE pledge_id=? "
                            "AND reason IN ('issue','cancel')", (pledge_id,)).fetchone()[0])


def holdings(conn, org_id: int, farmer_id: int) -> int:
    return int(conn.execute("SELECT COALESCE(SUM(shares), 0) FROM abc_share_ledger WHERE org_id=? AND farmer_id=?",
                            (org_id, farmer_id)).fetchone()[0])


def owed_shares(conn, org_id: int, farmer_id: int) -> int:
    """Shares pledged but not yet issued (open pledges)."""
    total = 0
    for p in _rows(conn, "SELECT id, shares FROM abc_share_pledges WHERE org_id=? AND farmer_id=? AND status='open'",
                   (org_id, farmer_id)):
        total += p["shares"] - _issued_for(conn, p["id"])
    return total


def held_total(conn, org_id: int) -> int:
    held = int(conn.execute("SELECT COALESCE(SUM(shares), 0) FROM abc_share_ledger WHERE org_id=?", (org_id,)).fetchone()[0])
    owed = sum(p["shares"] - _issued_for(conn, p["id"]) for p in _rows(
        conn, "SELECT id, shares FROM abc_share_pledges WHERE org_id=? AND status='open'", (org_id,)))
    return held + owed


def _check_cap(conn, ctx: core.AbcContext, farmer_id: int, extra_shares: int) -> None:
    offered = ctx.profile.get("shares_offered") or core.profile(conn, ctx.org["id"]).get("shares_offered")
    if not offered:
        raise HTTPException(400, "Set the number of shares offered first.")
    cap_fraction = _rule(conn, ctx, "max_ownership_fraction")
    limit = math.floor(cap_fraction * offered + 1e-9)
    after = holdings(conn, ctx.org["id"], farmer_id) + owed_shares(conn, ctx.org["id"], farmer_id) + extra_shares
    if after > limit:
        raise RuleError("ownership_cap", f"No member may hold more than {cap_fraction:.0%} of the {offered:,} shares "
                                         f"offered ({limit:,} shares). This would make {after:,}.",
                        percent=round(cap_fraction * 100, 1), offered=offered, limit=limit, after=after)


def _next_certificate(conn, org_id: int) -> str:
    n = conn.execute("SELECT COUNT(*) FROM abc_share_ledger WHERE org_id=? AND certificate_no IS NOT NULL",
                     (org_id,)).fetchone()[0] + 1
    return f"ABC{org_id}-{n:05d}"


def _next_receipt(conn, org_id: int) -> str:
    n = conn.execute("SELECT COUNT(*) FROM abc_share_payments WHERE org_id=?", (org_id,)).fetchone()[0] + 1
    return f"R{org_id}-{n:06d}"


def _settle(conn, org_id: int, pledge: dict, payment_id: int | None) -> int:
    """Issue (or cancel) whole shares so issued = paid ÷ share value; returns the change in shares."""
    paid = _paid_for(conn, pledge["id"])
    target = min(pledge["shares"], int(math.floor(paid / pledge["share_value"] + EPS)))
    change = target - _issued_for(conn, pledge["id"])
    if change:
        conn.execute("""INSERT INTO abc_share_ledger (org_id, farmer_id, shares, reason, certificate_no, pledge_id,
                        payment_id, created_at) VALUES (?,?,?,?,?,?,?,?)""",
                     (org_id, pledge["farmer_id"], change, "issue" if change > 0 else "cancel",
                      _next_certificate(conn, org_id) if change > 0 else None, pledge["id"], payment_id, _now()))
    paid_full = paid >= pledge["shares"] * pledge["share_value"] - EPS
    conn.execute("UPDATE abc_share_pledges SET status=? WHERE id=?", ("paid" if paid_full else "open", pledge["id"]))
    return change


# ── Pledges and payments ──────────────────────────────────────────────────────

def pledge(conn, ctx: core.AbcContext, actor: dict, *, farmer_id: int, shares: int, kind: str,
           first_payment: dict | None, pledged_on: date | None = None) -> dict:
    org = ctx.org["id"]
    _active_member(conn, org, farmer_id)
    p = core.profile(conn, org)
    value = p.get("share_value_etb")
    if not value:
        raise HTTPException(400, "Set the share value first.")
    ctx.profile = p
    day = pledged_on or date.today()
    has_minimum = conn.execute("SELECT 1 FROM abc_share_pledges WHERE org_id=? AND farmer_id=? AND kind='minimum' "
                               "AND status != 'cancelled'", (org, farmer_id)).fetchone()
    if kind == "minimum":
        if has_minimum:
            raise HTTPException(400, "This member already has a minimum pledge: add an extra pledge.")
        minimum = int(_rule(conn, ctx, "min_shares_per_member", day))
        if shares < minimum:
            raise RuleError("min_shares", f"A member's first pledge must be at least {minimum} shares.", minimum=minimum)
    else:
        if not has_minimum:
            raise HTTPException(400, "Record the member's minimum pledge first.")
        upfront = _rule(conn, ctx, "pledge_upfront_fraction", day)
        need = round(upfront * shares * value, 2)
        if not first_payment or first_payment.get("amount_etb", 0) < need - EPS:
            raise RuleError("pledge_upfront", f"Extra shares need at least {upfront:.0%} paid at pledge: {need:,.2f} birr.",
                            percent=round(upfront * 100, 1), amount=need)
    _check_cap(conn, ctx, farmer_id, shares)
    due = None
    if kind == "extra":
        years = _rule(conn, ctx, "pledge_deadline_years", day)
        due = (day + timedelta(days=round(365.25 * years))).isoformat()
    with conn:
        pid = conn.execute("""INSERT INTO abc_share_pledges (org_id, farmer_id, kind, shares, share_value, pledged_on,
                              due_on, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)""",
                           (org, farmer_id, kind, shares, value, day.isoformat(), due, actor["id"], _now())).lastrowid
    audit.record(conn, actor_id=actor["id"], actor_role=actor["role"], action="abc.share.pledge", target_type="abc",
                 target_id=org, status=201, detail={"before": None, "after": {"pledge_id": pid, "farmer_id": farmer_id,
                                                                             "kind": kind, "shares": shares, "due_on": due}})
    out = {"pledge_id": pid, "due_on": due}
    if first_payment:
        out["payment"] = pay(conn, ctx, actor, pledge_id=pid, **first_payment)
    return out


def pay(conn, ctx: core.AbcContext, actor: dict, *, pledge_id: int, amount_etb: float, method: str,
        reference: str | None = None, paid_on: date | None = None) -> dict:
    org = ctx.org["id"]
    rows = _rows(conn, "SELECT * FROM abc_share_pledges WHERE id=? AND org_id=?", (pledge_id, org))
    if not rows:
        raise HTTPException(404, "Pledge not found")
    p = rows[0]
    if p["status"] != "open":
        raise HTTPException(400, "This pledge is already paid in full." if p["status"] == "paid" else "This pledge was cancelled.")
    if method not in METHODS:
        raise HTTPException(400, f"Unknown payment method '{method}'.")
    if method in ("bank", "telebirr", "mpesa") and not (reference and reference.strip()):
        raise HTTPException(400, "Give the bank or mobile-money reference.")
    remaining = round(p["shares"] * p["share_value"] - _paid_for(conn, pledge_id), 2)
    if amount_etb > remaining + EPS:
        raise HTTPException(400, f"More than what is still owed on this pledge ({remaining:,.2f} birr).")
    with conn:
        receipt = _next_receipt(conn, org)
        pay_id = conn.execute("""INSERT INTO abc_share_payments (org_id, farmer_id, pledge_id, amount_etb, method, reference,
                                 paid_on, receipt_no, recorded_by, recorded_at) VALUES (?,?,?,?,?,?,?,?,?,?)""",
                              (org, p["farmer_id"], pledge_id, round(amount_etb, 2), method,
                               (reference or "").strip() or None, (paid_on or date.today()).isoformat(), receipt,
                               actor["id"], _now())).lastrowid
        issued = _settle(conn, org, p, pay_id)
    audit.record(conn, actor_id=actor["id"], actor_role=actor["role"], action="abc.share.payment", target_type="abc",
                 target_id=org, status=201,
                 detail={"before": None, "after": {"payment_id": pay_id, "receipt_no": receipt, "farmer_id": p["farmer_id"],
                                                   "amount_etb": round(amount_etb, 2), "method": method,
                                                   "shares_issued": issued}})
    _receipt_message(conn, org, ctx.org["name"], p["farmer_id"], receipt, amount_etb, issued,
                     holdings(conn, org, p["farmer_id"]))
    return {"payment_id": pay_id, "receipt_no": receipt, "shares_issued": issued,
            "remaining_etb": round(remaining - amount_etb, 2)}


def reverse(conn, ctx: core.AbcContext, actor: dict, payment_id: int, reason: str) -> dict:
    org = ctx.org["id"]
    rows = _rows(conn, "SELECT * FROM abc_share_payments WHERE id=? AND org_id=?", (payment_id, org))
    if not rows or rows[0]["status"] != "confirmed":
        raise HTTPException(404, "Confirmed payment not found")
    pay_row = rows[0]
    p = _rows(conn, "SELECT * FROM abc_share_pledges WHERE id=?", (pay_row["pledge_id"],))[0]
    with conn:
        conn.execute("UPDATE abc_share_payments SET status='reversed', reverse_reason=? WHERE id=?", (reason, payment_id))
        if p["status"] == "paid":
            conn.execute("UPDATE abc_share_pledges SET status='open' WHERE id=?", (p["id"],))
            p["status"] = "open"
        need_cancel = _issued_for(conn, p["id"]) - int(math.floor(_paid_for(conn, p["id"]) / p["share_value"] + EPS))
        if need_cancel > 0 and holdings(conn, org, p["farmer_id"]) < need_cancel:
            raise HTTPException(400, "The shares paid by this payment were already transferred: reverse the transfer first.")
        change = _settle(conn, org, p, payment_id)
    audit.record(conn, actor_id=actor["id"], actor_role=actor["role"], action="abc.share.payment_reverse",
                 target_type="abc", target_id=org, status=200,
                 detail={"before": {"payment_id": payment_id, "status": "confirmed", "amount_etb": pay_row["amount_etb"]},
                         "after": {"status": "reversed", "reason": reason, "shares_change": change}})
    return {"payment_id": payment_id, "shares_change": change}


# ── Transfers and approvals ───────────────────────────────────────────────────

def request_transfer(conn, ctx: core.AbcContext, actor: dict, from_farmer: int, to_farmer: int, shares: int,
                     reason: str) -> dict:
    org = ctx.org["id"]
    if from_farmer == to_farmer:
        raise HTTPException(400, "Choose two different members.")
    _active_member(conn, org, to_farmer)
    if holdings(conn, org, from_farmer) < shares:
        raise HTTPException(400, "The member does not hold that many issued shares.")
    _check_cap(conn, ctx, to_farmer, shares)
    names = dict(conn.execute("SELECT id, name FROM users WHERE id IN (?, ?)", (from_farmer, to_farmer)).fetchall())
    with conn:
        tid = conn.execute("""INSERT INTO abc_share_transfers (org_id, from_farmer, to_farmer, shares, reason, created_at)
                              VALUES (?,?,?,?,?,?)""", (org, from_farmer, to_farmer, shares, reason, _now())).lastrowid
        aid = conn.execute("""INSERT INTO abc_approvals (org_id, kind, ref_id, summary, requested_by, requested_at)
                              VALUES (?, 'share_transfer', ?, ?, ?, ?)""",
                           (org, tid, json.dumps({"from": names.get(from_farmer), "to": names.get(to_farmer),
                                                  "shares": shares, "reason": reason}), actor["id"], _now())).lastrowid
    audit.record(conn, actor_id=actor["id"], actor_role=actor["role"], action="abc.share.transfer_request",
                 target_type="abc", target_id=org, status=201,
                 detail={"before": None, "after": {"transfer_id": tid, "approval_id": aid, "from": from_farmer,
                                                   "to": to_farmer, "shares": shares, "reason": reason}})
    return {"transfer_id": tid, "approval_id": aid}


def approvals(conn, org_id: int, status: str | None = None) -> list[dict]:
    rows = _rows(conn, f"""SELECT a.*, r.name AS requested_by_name, d.name AS decided_by_name FROM abc_approvals a
                           LEFT JOIN users r ON r.id = a.requested_by LEFT JOIN users d ON d.id = a.decided_by
                           WHERE a.org_id=? {"AND a.status=?" if status else ""} ORDER BY a.id DESC""",
                   (org_id, status) if status else (org_id,))
    for r in rows:
        r["summary"] = json.loads(r["summary"])
    return rows


def decide(conn, ctx: core.AbcContext, actor: dict, approval_id: int, approve: bool, note: str | None) -> dict:
    org = ctx.org["id"]
    rows = _rows(conn, "SELECT * FROM abc_approvals WHERE id=? AND org_id=?", (approval_id, org))
    if not rows or rows[0]["status"] != "pending":
        raise HTTPException(404, "Pending approval not found")
    a = rows[0]
    if a["requested_by"] == actor["id"] and not ctx.is_admin:
        raise HTTPException(403, "Another board member must decide on a request you made.")
    with conn:
        if approve and a["kind"] == "share_transfer":
            t = _rows(conn, "SELECT * FROM abc_share_transfers WHERE id=?", (a["ref_id"],))[0]
            if holdings(conn, org, t["from_farmer"]) < t["shares"]:
                raise HTTPException(400, "The member no longer holds these shares.")
            _active_member(conn, org, t["to_farmer"])
            _check_cap(conn, ctx, t["to_farmer"], t["shares"])
            now = _now()
            conn.execute("""INSERT INTO abc_share_ledger (org_id, farmer_id, shares, reason, transfer_id, created_at)
                            VALUES (?,?,?, 'transfer_out', ?, ?)""", (org, t["from_farmer"], -t["shares"], t["id"], now))
            conn.execute("""INSERT INTO abc_share_ledger (org_id, farmer_id, shares, reason, certificate_no, transfer_id,
                            created_at) VALUES (?,?,?, 'transfer_in', ?, ?, ?)""",
                         (org, t["to_farmer"], t["shares"], _next_certificate(conn, org), t["id"], now))
            conn.execute("UPDATE abc_share_transfers SET status='done' WHERE id=?", (t["id"],))
        elif a["kind"] == "share_transfer":
            conn.execute("UPDATE abc_share_transfers SET status='rejected' WHERE id=?", (a["ref_id"],))
        elif a["kind"] in APPROVAL_HANDLERS:
            APPROVAL_HANDLERS[a["kind"]](conn, ctx, a, approve)
        conn.execute("UPDATE abc_approvals SET status=?, decided_by=?, decided_at=?, note=? WHERE id=?",
                     ("approved" if approve else "rejected", actor["id"], _now(), note, approval_id))
    audit.record(conn, actor_id=actor["id"], actor_role=actor["role"], action="abc.approval.decide", target_type="abc",
                 target_id=org, status=200,
                 detail={"before": {"approval_id": approval_id, "status": "pending"},
                         "after": {"status": "approved" if approve else "rejected", "kind": a["kind"], "note": note}})
    return approvals(conn, org)[0] if approvals(conn, org) else {}


# ── Overview and checks ───────────────────────────────────────────────────────

def overview(conn, ctx: core.AbcContext, today: date | None = None) -> dict:
    org = ctx.org["id"]
    today = today or date.today()
    p = core.profile(conn, org)
    ctx.profile = p
    value, offered = p.get("share_value_etb"), p.get("shares_offered")
    minimum = int(_rule(conn, ctx, "min_shares_per_member"))
    cap_fraction = _rule(conn, ctx, "max_ownership_fraction")
    limit = math.floor(cap_fraction * offered + 1e-9) if offered else None
    pledges = _rows(conn, """SELECT s.*, u.name FROM abc_share_pledges s JOIN users u ON u.id = s.farmer_id
                             WHERE s.org_id=? AND s.status != 'cancelled' ORDER BY s.pledged_on, s.id""", (org,))
    members = {}
    for m in _rows(conn, """SELECT u.id, u.name, u.phone, d.member_no FROM abc_members am JOIN users u ON u.id = am.farmer_id
                            LEFT JOIN abc_member_details d ON d.org_id = am.org_id AND d.farmer_id = am.farmer_id
                            WHERE am.org_id=? AND am.status='active' ORDER BY COALESCE(d.member_no, 99999), u.name""", (org,)):
        members[m["id"]] = {**m, "held": holdings(conn, org, m["id"]), "pledged": 0, "paid_etb": 0.0, "owed_etb": 0.0,
                            "pledges": [], "flags": []}
    for s in pledges:
        m = members.get(s["farmer_id"])
        if m is None:
            continue
        paid = _paid_for(conn, s["id"])
        total = s["shares"] * s["share_value"]
        row = {"id": s["id"], "kind": s["kind"], "shares": s["shares"], "pledged_on": s["pledged_on"], "due_on": s["due_on"],
               "status": s["status"], "paid_etb": round(paid, 2), "owed_etb": round(total - paid, 2)}
        if s["status"] == "open" and s["due_on"]:
            days = (date.fromisoformat(s["due_on"]) - today).days
            row["due_in_days"] = days
            if days < 0:
                m["flags"].append("overdue")
            elif days <= 60:
                m["flags"].append("due_soon")
        if s["kind"] == "minimum" and s["status"] == "open":
            m["flags"].append("minimum_unpaid")
        m["pledges"].append(row)
        m["pledged"] += s["shares"]
        m["paid_etb"] += paid
        m["owed_etb"] += total - paid
    for m in members.values():
        if not any(x["kind"] == "minimum" for x in m["pledges"]):
            m["flags"].append("no_minimum")
        if limit is not None and m["held"] + owed_shares(conn, org, m["id"]) > limit:
            m["flags"].append("over_cap")
        m["paid_etb"], m["owed_etb"] = round(m["paid_etb"], 2), round(m["owed_etb"], 2)
        m["flags"] = sorted(set(m["flags"]))
    issued = int(conn.execute("SELECT COALESCE(SUM(shares), 0) FROM abc_share_ledger WHERE org_id=?", (org,)).fetchone()[0])
    paid_total = float(conn.execute("SELECT COALESCE(SUM(amount_etb), 0) FROM abc_share_payments WHERE org_id=? "
                                    "AND status='confirmed'", (org,)).fetchone()[0])
    return {"share_value_etb": value, "shares_offered": offered, "min_shares": minimum,
            "cap_percent": round(cap_fraction * 100, 1), "cap_shares": limit,
            "upfront_percent": round(_rule(conn, ctx, "pledge_upfront_fraction") * 100, 1),
            "deadline_years": _rule(conn, ctx, "pledge_deadline_years"),
            "totals": {"pledged_shares": sum(m["pledged"] for m in members.values()), "issued_shares": issued,
                       "paid_etb": round(paid_total, 2),
                       "owed_etb": round(sum(m["owed_etb"] for m in members.values()), 2),
                       "subscribed_percent": round(100 * held_total(conn, org) / offered, 1) if offered else None},
            "members": list(members.values()), "pending_approvals": len(approvals(conn, org, "pending")),
            "official_record_note": core.OFFICIAL_RECORD_NOTE}


def payments(conn, org_id: int, farmer_id: int | None = None) -> list[dict]:
    return _rows(conn, f"""SELECT p.id, p.receipt_no, p.farmer_id, u.name, p.amount_etb, p.method, p.reference, p.paid_on,
                                  p.status, p.reverse_reason, r.name AS recorded_by, p.pledge_id
                           FROM abc_share_payments p JOIN users u ON u.id = p.farmer_id
                           LEFT JOIN users r ON r.id = p.recorded_by
                           WHERE p.org_id=? {"AND p.farmer_id=?" if farmer_id else ""} ORDER BY p.id DESC LIMIT 500""",
                 (org_id, farmer_id) if farmer_id else (org_id,))


def certificates(conn, org_id: int, farmer_id: int | None = None) -> list[dict]:
    return _rows(conn, f"""SELECT l.id, l.certificate_no, l.farmer_id, u.name, d.member_no, l.shares, l.reason, l.created_at
                           FROM abc_share_ledger l JOIN users u ON u.id = l.farmer_id
                           LEFT JOIN abc_member_details d ON d.org_id = l.org_id AND d.farmer_id = l.farmer_id
                           WHERE l.org_id=? AND l.certificate_no IS NOT NULL {"AND l.farmer_id=?" if farmer_id else ""}
                           ORDER BY l.id""", (org_id, farmer_id) if farmer_id else (org_id,))


# ── Member messages ───────────────────────────────────────────────────────────

def _receipt_message(conn, org_id: int, org_name: str, farmer_id: int, receipt: str, amount: float, issued: int,
                     held: int) -> None:
    """Transactional: a record of the member's own payment, sent whatever their weekly alert limit."""
    channel = conn.execute("SELECT alert_channel FROM farmer_profiles WHERE user_id=?", (farmer_id,)).fetchone()
    with conn:
        conn.execute("""INSERT OR IGNORE INTO alerts (type, farmer_id, severity, message_key, payload, channel, status,
                        dedupe_key, created_at) VALUES ('abc_receipt', ?, 'info', 'abc_share_receipt', ?, ?, 'queued', ?, ?)""",
                     (farmer_id, json.dumps({"org": org_name, "receipt": receipt, "amount": f"{amount:,.2f}",
                                             "issued": issued, "held": held}),
                      (channel[0] if channel else None) or "app", f"abc_receipt:{org_id}:{receipt}", _now()))


def send_reminders(conn, now: datetime | None = None) -> int:
    """Extra pledges due within 30 days or overdue: one reminder per pledge and week (alert consent, weekly cap)."""
    from backend.advisory.alerts import CycleReport, _insert_alert
    from backend.advisory.config import setting_int

    now = now or datetime.now()
    today = now.date()
    report = CycleReport()
    default_cap = setting_int("max_alerts_per_week", 3, conn)
    year, week, _ = now.isocalendar()
    sent = 0
    rows = _rows(conn, """SELECT s.*, o.name AS org_name, p.consent_alerts, p.max_alerts_per_week, p.alert_channel
                          FROM abc_share_pledges s JOIN organisations o ON o.id = s.org_id
                          LEFT JOIN farmer_profiles p ON p.user_id = s.farmer_id
                          WHERE s.status='open' AND s.due_on IS NOT NULL AND s.due_on <= ?""",
                  ((today + timedelta(days=30)).isoformat(),))
    with conn:
        for s in rows:
            owed = round(s["shares"] * s["share_value"] - _paid_for(conn, s["id"]), 2)
            if owed <= EPS:
                continue
            overdue = s["due_on"] < today.isoformat()
            status = _insert_alert(conn, report, now, farmer_id=s["farmer_id"], type_="abc_share_due",
                                   severity="warning" if overdue else "info",
                                   message_key="abc_share_overdue" if overdue else "abc_share_due",
                                   payload={"org": s["org_name"], "amount": f"{owed:,.2f}", "date": s["due_on"]},
                                   dedupe=f"abc_due:{s['id']}:{year}-{week}", consent=bool(s["consent_alerts"]),
                                   cap=s["max_alerts_per_week"], default_cap=default_cap, channel=s["alert_channel"])
            sent += status == "queued"
    return sent
