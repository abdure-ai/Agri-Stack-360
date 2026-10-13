"""
abc_finance.py — ABC finance basics (milestone A6, docs/abc-pilot-plan.md; spec 2.4).

* Share capital: what members paid for shares (backend/abc_shares.py), shown in the summary, not entered twice.
* Ledger (single entry): income, expense, asset (e.g. a store, a tractor), liability (e.g. a loan received or repaid),
  with category, counterparty, method and reference. An expense or asset purchase above the board approval limit
  (ABC profile) waits for a board decision (approval queue shared with share transfers) before it counts.
  Entries are never deleted: a wrong entry is voided with a reason.
* Member accounts: what each member owes the ABC (input credit, service charges) less what they paid back
  (repayments, produce deductions); positive balance = the member owes. Repayments get a numbered receipt, sent to the
  member in the app and on Telegram, and are booked as ledger income ('member repayment').
* Export: one Excel file (summary, ledger, member accounts, share payments) for the accountant, auditors and banks.
Not tax advice; budgets, invoices to buyers and dividends are Phase 2. All changes are audited.
"""

from __future__ import annotations

import io
import json
import sqlite3
from datetime import date, datetime

from fastapi import HTTPException

from backend import abc_company as core
from backend import abc_shares, audit

LEDGER_KINDS = ("income", "expense", "asset", "liability")
MEMBER_KINDS = ("input_credit", "service_charge", "repayment", "produce_deduction", "adjustment")
OWES = {"input_credit": 1, "service_charge": 1, "repayment": -1, "produce_deduction": -1}   # sign of the balance effect

SCHEMA = """
CREATE TABLE IF NOT EXISTS abc_ledger (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id       INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    entry_date   TEXT NOT NULL,
    kind         TEXT NOT NULL CHECK (kind IN ('income','expense','asset','liability')),
    category     TEXT NOT NULL,
    description  TEXT,
    amount_etb   REAL NOT NULL CHECK (amount_etb > 0),
    direction    TEXT NOT NULL DEFAULT 'in' CHECK (direction IN ('in','out')),   -- liability: loan in / repaid out
    method       TEXT,
    reference    TEXT,
    counterparty TEXT,
    source       TEXT NOT NULL DEFAULT 'manual',   -- manual | member_account | stock (A7) | machinery (A8)
    source_id    INTEGER,
    status       TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','pending','rejected','void')),
    void_reason  TEXT,
    recorded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recorded_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_abc_ledger ON abc_ledger (org_id, entry_date);
CREATE TABLE IF NOT EXISTS abc_member_txns (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id      INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    farmer_id   INTEGER NOT NULL REFERENCES users(id),
    txn_date    TEXT NOT NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('input_credit','service_charge','repayment','produce_deduction','adjustment')),
    amount_etb  REAL NOT NULL,                    -- adjustment may be negative; others positive
    balance_effect REAL NOT NULL,                 -- + member owes more, - member owes less
    description TEXT,
    method      TEXT,
    reference   TEXT,
    receipt_no  TEXT,
    source      TEXT NOT NULL DEFAULT 'manual',
    source_id   INTEGER,
    status      TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','void')),
    void_reason TEXT,
    recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recorded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_abc_member_txns ON abc_member_txns (org_id, farmer_id);
"""


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def _now() -> str:
    return datetime.now().isoformat(sep=" ", timespec="seconds")


def _rows(conn, sql, params=()) -> list[dict]:
    cur = conn.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def _audit(conn, actor, action, org, before, after, status=200):
    audit.record(conn, actor_id=actor["id"], actor_role=actor["role"], action=action, target_type="abc", target_id=org,
                 status=status, detail={"before": before, "after": after})


# ── Ledger ────────────────────────────────────────────────────────────────────

def add_entry(conn, ctx: core.AbcContext, actor: dict, *, kind: str, category: str, amount_etb: float,
              entry_date: date | None = None, description: str | None = None, direction: str = "in",
              method: str | None = None, reference: str | None = None, counterparty: str | None = None,
              source: str = "manual", source_id: int | None = None) -> dict:
    org = ctx.org["id"]
    if kind not in LEDGER_KINDS:
        raise HTTPException(400, f"Unknown entry kind '{kind}'.")
    if kind in ("income",):
        direction = "in"
    elif kind in ("expense", "asset"):
        direction = "out"
    limit = core.profile(conn, org).get("board_approval_limit_etb")
    needs_board = kind in ("expense", "asset") and limit is not None and amount_etb > limit + 0.005 and source == "manual"
    with conn:
        eid = conn.execute("""INSERT INTO abc_ledger (org_id, entry_date, kind, category, description, amount_etb, direction,
                              method, reference, counterparty, source, source_id, status, recorded_by, recorded_at)
                              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                           (org, (entry_date or date.today()).isoformat(), kind, category.strip(), description,
                            round(amount_etb, 2), direction, method, reference, counterparty, source, source_id,
                            "pending" if needs_board else "posted", actor["id"], _now())).lastrowid
        approval = None
        if needs_board:
            approval = conn.execute("""INSERT INTO abc_approvals (org_id, kind, ref_id, summary, amount_etb, requested_by,
                                       requested_at) VALUES (?, 'expense', ?, ?, ?, ?, ?)""",
                                    (org, eid, json.dumps({"kind": kind, "category": category, "description": description,
                                                           "counterparty": counterparty, "amount_etb": round(amount_etb, 2)}),
                                     round(amount_etb, 2), actor["id"], _now())).lastrowid
    _audit(conn, actor, "abc.ledger.add", org, None,
           {"entry_id": eid, "kind": kind, "category": category, "amount_etb": round(amount_etb, 2),
            "status": "pending" if needs_board else "posted", "approval_id": approval}, 201)
    return {"entry_id": eid, "status": "pending" if needs_board else "posted", "approval_id": approval}


def _decide_expense(conn, ctx, approval: dict, approved: bool) -> None:
    conn.execute("UPDATE abc_ledger SET status=? WHERE id=? AND org_id=? AND status='pending'",
                 ("posted" if approved else "rejected", approval["ref_id"], ctx.org["id"]))


abc_shares.APPROVAL_HANDLERS["expense"] = _decide_expense


def void_entry(conn, ctx: core.AbcContext, actor: dict, entry_id: int, reason: str) -> None:
    org = ctx.org["id"]
    row = conn.execute("SELECT status, source FROM abc_ledger WHERE id=? AND org_id=?", (entry_id, org)).fetchone()
    if not row or row[0] in ("void", "rejected"):
        raise HTTPException(404, "Entry not found")
    if row[1] != "manual":
        raise HTTPException(400, "This entry comes from another record: correct it there (e.g. void the member payment).")
    with conn:
        conn.execute("UPDATE abc_ledger SET status='void', void_reason=? WHERE id=?", (reason, entry_id))
    _audit(conn, actor, "abc.ledger.void", org, {"entry_id": entry_id, "status": row[0]},
           {"entry_id": entry_id, "status": "void", "reason": reason})


def ledger(conn, org_id: int, start: date | None = None, end: date | None = None) -> list[dict]:
    where, params = "WHERE l.org_id=?", [org_id]
    if start:
        where += " AND l.entry_date >= ?"
        params.append(start.isoformat())
    if end:
        where += " AND l.entry_date <= ?"
        params.append(end.isoformat())
    return _rows(conn, f"""SELECT l.*, u.name AS recorded_by_name FROM abc_ledger l LEFT JOIN users u ON u.id = l.recorded_by
                           {where} ORDER BY l.entry_date DESC, l.id DESC LIMIT 2000""", tuple(params))


# ── Member accounts ───────────────────────────────────────────────────────────

def _next_receipt(conn, org_id: int) -> str:
    n = conn.execute("SELECT COUNT(*) FROM abc_member_txns WHERE org_id=? AND receipt_no IS NOT NULL", (org_id,)).fetchone()[0] + 1
    return f"M{org_id}-{n:06d}"


def member_txn(conn, ctx: core.AbcContext, actor: dict, *, farmer_id: int, kind: str, amount_etb: float,
               description: str | None = None, txn_date: date | None = None, method: str | None = None,
               reference: str | None = None, source: str = "manual", source_id: int | None = None) -> dict:
    org = ctx.org["id"]
    if kind not in MEMBER_KINDS:
        raise HTTPException(400, f"Unknown kind '{kind}'.")
    if not conn.execute("SELECT 1 FROM abc_members WHERE org_id=? AND farmer_id=?", (org, farmer_id)).fetchone():
        raise HTTPException(400, "Not a member of this ABC.")
    if kind != "adjustment" and amount_etb <= 0:
        raise HTTPException(400, "The amount must be more than 0.")
    if kind == "adjustment" and not (description and description.strip()):
        raise HTTPException(400, "Say why the account is adjusted.")
    if kind == "repayment" and method in ("bank", "telebirr", "mpesa") and not (reference and reference.strip()):
        raise HTTPException(400, "Give the bank or mobile-money reference.")
    effect = amount_etb if kind == "adjustment" else OWES[kind] * amount_etb
    receipt = _next_receipt(conn, org) if kind == "repayment" else None
    day = (txn_date or date.today()).isoformat()
    with conn:
        tid = conn.execute("""INSERT INTO abc_member_txns (org_id, farmer_id, txn_date, kind, amount_etb, balance_effect,
                              description, method, reference, receipt_no, source, source_id, recorded_by, recorded_at)
                              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                           (org, farmer_id, day, kind, round(amount_etb, 2), round(effect, 2), description, method,
                            reference, receipt, source, source_id, actor["id"], _now())).lastrowid
    if kind == "repayment":
        name = conn.execute("SELECT name FROM users WHERE id=?", (farmer_id,)).fetchone()[0]
        add_entry(conn, ctx, actor, kind="income", category="member repayment", amount_etb=amount_etb,
                  entry_date=date.fromisoformat(day), description=f"Receipt {receipt}", method=method, reference=reference,
                  counterparty=name, source="member_account", source_id=tid)
        _receipt(conn, ctx.org["name"], org, farmer_id, receipt, amount_etb, balance(conn, org, farmer_id))
    _audit(conn, actor, "abc.member_account.add", org, None,
           {"txn_id": tid, "farmer_id": farmer_id, "kind": kind, "amount_etb": round(amount_etb, 2), "receipt_no": receipt}, 201)
    return {"txn_id": tid, "receipt_no": receipt, "balance_etb": balance(conn, org, farmer_id)}


def void_txn(conn, ctx: core.AbcContext, actor: dict, txn_id: int, reason: str) -> None:
    org = ctx.org["id"]
    row = conn.execute("SELECT status, kind, source FROM abc_member_txns WHERE id=? AND org_id=?", (txn_id, org)).fetchone()
    if not row or row[0] == "void":
        raise HTTPException(404, "Transaction not found")
    with conn:
        conn.execute("UPDATE abc_member_txns SET status='void', void_reason=? WHERE id=?", (reason, txn_id))
        conn.execute("UPDATE abc_ledger SET status='void', void_reason=? WHERE org_id=? AND source='member_account' "
                     "AND source_id=?", (reason, org, txn_id))
    _audit(conn, actor, "abc.member_account.void", org, {"txn_id": txn_id, "status": "posted"},
           {"txn_id": txn_id, "status": "void", "reason": reason})


def balance(conn, org_id: int, farmer_id: int) -> float:
    return round(float(conn.execute("SELECT COALESCE(SUM(balance_effect), 0) FROM abc_member_txns WHERE org_id=? "
                                    "AND farmer_id=? AND status='posted'", (org_id, farmer_id)).fetchone()[0]), 2)


def member_accounts(conn, org_id: int) -> list[dict]:
    return _rows(conn, """SELECT u.id AS farmer_id, u.name, u.phone, d.member_no,
                                 ROUND(COALESCE(SUM(CASE WHEN t.status='posted' THEN t.balance_effect END), 0), 2) AS balance_etb,
                                 ROUND(COALESCE(SUM(CASE WHEN t.status='posted' AND t.kind='input_credit' THEN t.amount_etb END), 0), 2) AS input_credit_etb,
                                 ROUND(COALESCE(SUM(CASE WHEN t.status='posted' AND t.kind='service_charge' THEN t.amount_etb END), 0), 2) AS services_etb,
                                 ROUND(COALESCE(SUM(CASE WHEN t.status='posted' AND t.kind IN ('repayment','produce_deduction') THEN t.amount_etb END), 0), 2) AS repaid_etb,
                                 MAX(t.txn_date) AS last_txn
                          FROM abc_members m JOIN users u ON u.id = m.farmer_id
                          LEFT JOIN abc_member_details d ON d.org_id = m.org_id AND d.farmer_id = m.farmer_id
                          LEFT JOIN abc_member_txns t ON t.org_id = m.org_id AND t.farmer_id = m.farmer_id
                          WHERE m.org_id=? AND m.status='active'
                          GROUP BY u.id ORDER BY COALESCE(d.member_no, 99999), u.name""", (org_id,))


def statement(conn, org_id: int, farmer_id: int) -> dict:
    txns = _rows(conn, """SELECT t.*, u.name AS recorded_by_name FROM abc_member_txns t LEFT JOIN users u ON u.id = t.recorded_by
                          WHERE t.org_id=? AND t.farmer_id=? ORDER BY t.txn_date, t.id""", (org_id, farmer_id))
    running = 0.0
    for t in txns:
        if t["status"] == "posted":
            running = round(running + t["balance_effect"], 2)
        t["running_balance_etb"] = running
    name = conn.execute("SELECT name FROM users WHERE id=?", (farmer_id,)).fetchone()
    return {"farmer_id": farmer_id, "name": name[0] if name else None, "transactions": txns, "balance_etb": running,
            "shares_held": abc_shares.holdings(conn, org_id, farmer_id)}


def _receipt(conn, org_name: str, org_id: int, farmer_id: int, receipt: str, amount: float, bal: float) -> None:
    channel = conn.execute("SELECT alert_channel FROM farmer_profiles WHERE user_id=?", (farmer_id,)).fetchone()
    with conn:
        conn.execute("""INSERT OR IGNORE INTO alerts (type, farmer_id, severity, message_key, payload, channel, status,
                        dedupe_key, created_at) VALUES ('abc_receipt', ?, 'info', 'abc_member_receipt', ?, ?, 'queued', ?, ?)""",
                     (farmer_id, json.dumps({"org": org_name, "receipt": receipt, "amount": f"{amount:,.2f}",
                                             "balance": f"{bal:,.2f}"}),
                      (channel[0] if channel else None) or "app", f"abc_member_receipt:{org_id}:{receipt}", _now()))


# ── Summary and export ────────────────────────────────────────────────────────

def summary(conn, org_id: int, start: date | None = None, end: date | None = None) -> dict:
    rows = [r for r in ledger(conn, org_id, start, end) if r["status"] == "posted"]
    by_kind: dict[str, float] = {k: 0.0 for k in LEDGER_KINDS}
    loans_in = loans_out = 0.0
    by_category: dict[str, float] = {}
    for r in rows:
        if r["kind"] == "liability":
            if r["direction"] == "in":
                loans_in += r["amount_etb"]
            else:
                loans_out += r["amount_etb"]
        else:
            by_kind[r["kind"]] += r["amount_etb"]
        key = f"{r['kind']}:{r['category']}"
        by_category[key] = by_category.get(key, 0.0) + r["amount_etb"]
    share_capital = float(conn.execute("SELECT COALESCE(SUM(amount_etb), 0) FROM abc_share_payments WHERE org_id=? "
                                       "AND status='confirmed'", (org_id,)).fetchone()[0])
    receivable = float(conn.execute("SELECT COALESCE(SUM(balance_effect), 0) FROM abc_member_txns WHERE org_id=? "
                                    "AND status='posted'", (org_id,)).fetchone()[0])
    cash = share_capital + by_kind["income"] - by_kind["expense"] - by_kind["asset"] + loans_in - loans_out
    return {"share_capital_etb": round(share_capital, 2), "income_etb": round(by_kind["income"], 2),
            "expense_etb": round(by_kind["expense"], 2), "assets_bought_etb": round(by_kind["asset"], 2),
            "loans_received_etb": round(loans_in, 2), "loans_repaid_etb": round(loans_out, 2),
            "result_etb": round(by_kind["income"] - by_kind["expense"], 2), "cash_estimate_etb": round(cash, 2),
            "members_owe_etb": round(receivable, 2),
            "pending_approval_etb": round(sum(r["amount_etb"] for r in ledger(conn, org_id, start, end) if r["status"] == "pending"), 2),
            "by_category": [{"kind": k.split(":", 1)[0], "category": k.split(":", 1)[1], "amount_etb": round(v, 2)}
                            for k, v in sorted(by_category.items())]}


def export_xlsx(conn, ctx: core.AbcContext) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font

    org = ctx.org["id"]
    wb = Workbook()
    ws = wb.active
    ws.title = "Summary"
    s = summary(conn, org)
    ws.append([ctx.org["name"], f"exported {date.today().isoformat()}"])
    ws.append([core.OFFICIAL_RECORD_NOTE])
    ws.append([])
    for k in ("share_capital_etb", "income_etb", "expense_etb", "assets_bought_etb", "loans_received_etb",
              "loans_repaid_etb", "result_etb", "cash_estimate_etb", "members_owe_etb", "pending_approval_etb"):
        ws.append([k.replace("_etb", "").replace("_", " "), s[k]])
    sheets = {
        "Ledger": (["date", "kind", "category", "description", "amount_etb", "direction", "method", "reference", "counterparty",
                    "source", "status", "void_reason", "recorded_by"],
                   [[r["entry_date"], r["kind"], r["category"], r["description"], r["amount_etb"], r["direction"], r["method"],
                     r["reference"], r["counterparty"], r["source"], r["status"], r["void_reason"], r["recorded_by_name"]]
                    for r in ledger(conn, org)]),
        "Member accounts": (["member_no", "name", "input_credit_etb", "services_etb", "repaid_etb", "balance_etb", "last"],
                            [[m["member_no"], m["name"], m["input_credit_etb"], m["services_etb"], m["repaid_etb"],
                              m["balance_etb"], m["last_txn"]] for m in member_accounts(conn, org)]),
        "Member transactions": (["date", "member", "kind", "amount_etb", "receipt_no", "method", "reference", "description",
                                 "status"],
                                [[t["txn_date"], t["name"], t["kind"], t["amount_etb"], t["receipt_no"], t["method"],
                                  t["reference"], t["description"], t["status"]] for t in _rows(
                                    conn, """SELECT t.*, u.name FROM abc_member_txns t JOIN users u ON u.id = t.farmer_id
                                             WHERE t.org_id=? ORDER BY t.txn_date, t.id""", (org,))]),
        "Share payments": (["receipt_no", "member", "amount_etb", "method", "reference", "paid_on", "status"],
                           [[p["receipt_no"], p["name"], p["amount_etb"], p["method"], p["reference"], p["paid_on"], p["status"]]
                            for p in abc_shares.payments(conn, org)]),
    }
    for title, (header, rows) in sheets.items():
        w = wb.create_sheet(title)
        w.append(header)
        for c in w[1]:
            c.font = Font(bold=True)
        for r in rows:
            w.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
