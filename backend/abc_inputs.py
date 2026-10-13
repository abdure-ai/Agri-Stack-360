"""
abc_inputs.py — ABC input supply to members (milestone A7, docs/abc-pilot-plan.md; spec 2.5, 2.6).

* Demand plan: one registered product for one crop and season. Each member's suggested quantity = the cited rate per
  hectare (dosage_rules with a source; MoA manual rates are 'moa_cited') × the member's area under that crop. Without a
  cited rate there is no quantity ("ask your DA"), never an invented one. Members confirm or change their order in the
  app; staff can confirm for a member who agreed in person.
* Supplier comparison: agro-dealer shops in the platform with the product in stock, nearest to the ABC first; the
  verified-seller badge and price are shown, never used to reorder (neutral advice, spec rule 6).
* Purchase orders: draft -> approved (board approval when above the ABC's limit) -> received. Only registered products.
* Receipt: every pack code is checked with Input Trust. Genuine -> stock 'available'. Warning (unknown, copy, recalled,
  expired, not registered) or a code already received by this ABC -> 'quarantined': cannot be issued.
* Stock: lots with expiry; expired lots cannot be issued; lots expiring within 60 days are flagged.
* Issue to members: for cash (ledger income 'input sales') or on credit (member account 'input credit', A6).
All changes are audited; received goods with a price are booked as a ledger expense 'input purchase'.
"""

from __future__ import annotations

import json
import re
import sqlite3
from datetime import date, datetime, timedelta

from fastapi import HTTPException

from backend import abc_company as core
from backend import abc_finance, abc_shares, admin_areas, audit, input_trust

_RATE = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*(ml|l|kg|g)(?![a-z])", re.I)
EXPIRY_WARNING_DAYS = 60

SCHEMA = """
CREATE TABLE IF NOT EXISTS abc_input_plans (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id       INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    season       TEXT NOT NULL,
    crop         TEXT NOT NULL,
    product_id   INTEGER NOT NULL REFERENCES approved_products(id),
    target       TEXT,                     -- disease / pest the rate is for
    rate_text    TEXT,                     -- as cited, e.g. '0.5 L' per ha
    rate_per_ha  REAL,
    unit         TEXT,
    rate_source  TEXT,
    status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
    created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS abc_input_orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id       INTEGER NOT NULL REFERENCES abc_input_plans(id) ON DELETE CASCADE,
    farmer_id     INTEGER NOT NULL REFERENCES users(id),
    area_ha       REAL NOT NULL,
    suggested_qty REAL,
    confirmed_qty REAL,
    status        TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested','confirmed','declined','delivered')),
    confirmed_by  TEXT CHECK (confirmed_by IN ('member','staff')),
    confirmed_at  TEXT,
    delivered_qty REAL NOT NULL DEFAULT 0,
    UNIQUE (plan_id, farmer_id)
);
CREATE TABLE IF NOT EXISTS abc_purchase_orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id        INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    supplier      TEXT NOT NULL,
    supplier_shop_id INTEGER REFERENCES organisations(id),
    items         TEXT NOT NULL,           -- JSON [{product_id, product_name, qty, unit, unit_price_etb}]
    total_etb     REAL NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','received','cancelled')),
    approval_id   INTEGER,
    plan_id       INTEGER REFERENCES abc_input_plans(id),
    note          TEXT,
    created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS abc_stock_lots (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id         INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    product_id     INTEGER NOT NULL REFERENCES approved_products(id),
    po_id          INTEGER REFERENCES abc_purchase_orders(id),
    qty_received   REAL NOT NULL CHECK (qty_received > 0),
    qty_remaining  REAL NOT NULL,
    unit           TEXT NOT NULL,
    unit_cost_etb  REAL,
    code           TEXT,                   -- Input Trust code on the pack
    batch_number   TEXT,
    expires_on     TEXT,
    status         TEXT NOT NULL CHECK (status IN ('available','quarantined','released')),
    trust_result   TEXT,
    trust_reason   TEXT,
    received_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    received_at    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS abc_stock_txns (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_id     INTEGER NOT NULL REFERENCES abc_stock_lots(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL CHECK (kind IN ('receive','issue','adjust')),
    qty        REAL NOT NULL,              -- + in, - out
    farmer_id  INTEGER REFERENCES users(id),
    price_etb  REAL,
    payment    TEXT CHECK (payment IN ('cash','credit')),
    order_id   INTEGER REFERENCES abc_input_orders(id),
    note       TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
);
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


def _registered(conn, product_id: int) -> dict:
    rows = _rows(conn, "SELECT id, product_name, status FROM approved_products WHERE id=?", (product_id,))
    if not rows:
        raise HTTPException(404, "Product not found")
    if rows[0]["status"] != "registered":
        raise HTTPException(400, "Only registered products can be planned, bought or issued (banned or expired products are blocked).")
    return rows[0]


def rate(dose_per_ha: str | None) -> tuple[float, str] | None:
    """'0.5 L' -> (0.5, 'L'); '1.13 kg' -> (1.13, 'kg'); unknown -> None."""
    m = _RATE.match(dose_per_ha or "")
    if not m:
        return None
    unit = {"l": "L", "ml": "mL", "kg": "kg", "g": "g"}[m.group(2).lower()]
    return float(m.group(1)), unit


# ── Demand plans and member orders ────────────────────────────────────────────

def plannable_products(conn, crop: str) -> list[dict]:
    """Registered products with their cited rates for this crop (none without a source)."""
    return _rows(conn, """SELECT p.id AS product_id, p.product_name, p.active_ingredient, d.target, d.dose_per_ha,
                                 d.source, d.verification_status
                          FROM approved_products p JOIN dosage_rules d ON d.product_id = p.id
                          WHERE p.status='registered' AND lower(d.crop)=lower(?) ORDER BY p.product_name, d.target""", (crop,))


def member_crop_area(conn, org_id: int, crop: str) -> dict[int, float]:
    """Active members' area under the crop (active seasons; else farms recorded with that crop)."""
    rows = conn.execute("""SELECT f.user_id, SUM(COALESCE(f.area_ha, 0)) FROM farms f
                           JOIN abc_members m ON m.farmer_id = f.user_id AND m.org_id = ? AND m.status='active'
                           WHERE f.id IN (SELECT farm_id FROM crop_seasons WHERE status='active' AND lower(crop)=lower(?))
                              OR (lower(COALESCE(f.crop_name, '')) = lower(?)
                                  AND f.id NOT IN (SELECT farm_id FROM crop_seasons WHERE status='active'))
                           GROUP BY f.user_id""", (org_id, crop, crop)).fetchall()
    return {r[0]: round(r[1] or 0.0, 3) for r in rows if (r[1] or 0) > 0}


def create_plan(conn, ctx: core.AbcContext, actor: dict, *, season: str, crop: str, product_id: int,
                target: str | None) -> dict:
    org = ctx.org["id"]
    _registered(conn, product_id)
    rules = [r for r in plannable_products(conn, crop) if r["product_id"] == product_id and (target is None or r["target"] == target)]
    cited = next((r for r in rules if r["source"] and rate(r["dose_per_ha"])), None)
    parsed = rate(cited["dose_per_ha"]) if cited else None
    areas = member_crop_area(conn, org, crop)
    with conn:
        pid = conn.execute("""INSERT INTO abc_input_plans (org_id, season, crop, product_id, target, rate_text, rate_per_ha,
                              unit, rate_source, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                           (org, season.strip(), crop.lower(), product_id, cited["target"] if cited else target,
                            cited["dose_per_ha"] if cited else None, parsed[0] if parsed else None,
                            parsed[1] if parsed else None, cited["source"] if cited else None, actor["id"], _now())).lastrowid
        for fid, area in areas.items():
            qty = round(parsed[0] * area, 3) if parsed else None
            conn.execute("INSERT INTO abc_input_orders (plan_id, farmer_id, area_ha, suggested_qty) VALUES (?,?,?,?)",
                         (pid, fid, area, qty))
    _audit(conn, actor, "abc.input.plan", org, None, {"plan_id": pid, "product_id": product_id, "crop": crop,
                                                     "members": len(areas), "rate": cited["dose_per_ha"] if cited else None}, 201)
    return plan(conn, org, pid)


def plan(conn, org_id: int, plan_id: int) -> dict:
    rows = _rows(conn, """SELECT pl.*, p.product_name FROM abc_input_plans pl JOIN approved_products p ON p.id = pl.product_id
                          WHERE pl.id=? AND pl.org_id=?""", (plan_id, org_id))
    if not rows:
        raise HTTPException(404, "Plan not found")
    p = rows[0]
    p["orders"] = _rows(conn, """SELECT o.*, u.name, d.member_no FROM abc_input_orders o JOIN users u ON u.id = o.farmer_id
                                 LEFT JOIN abc_member_details d ON d.org_id = ? AND d.farmer_id = o.farmer_id
                                 WHERE o.plan_id=? ORDER BY COALESCE(d.member_no, 99999), u.name""", (org_id, plan_id))
    confirmed = [o for o in p["orders"] if o["status"] in ("confirmed", "delivered")]
    p["totals"] = {"members": len(p["orders"]), "area_ha": round(sum(o["area_ha"] for o in p["orders"]), 2),
                   "suggested_qty": round(sum(o["suggested_qty"] or 0 for o in p["orders"]), 3),
                   "confirmed_members": len(confirmed), "confirmed_qty": round(sum(o["confirmed_qty"] or 0 for o in confirmed), 3),
                   "delivered_qty": round(sum(o["delivered_qty"] for o in p["orders"]), 3)}
    return p


def plans(conn, org_id: int) -> list[dict]:
    return [plan(conn, org_id, r[0]) for r in conn.execute("SELECT id FROM abc_input_plans WHERE org_id=? ORDER BY id DESC",
                                                           (org_id,)).fetchall()]


def confirm_order(conn, org_id: int, order_id: int, qty: float | None, by: str, actor: dict) -> dict:
    rows = _rows(conn, """SELECT o.*, pl.org_id, pl.status AS plan_status FROM abc_input_orders o
                          JOIN abc_input_plans pl ON pl.id = o.plan_id WHERE o.id=?""", (order_id,))
    if not rows or rows[0]["org_id"] != org_id:
        raise HTTPException(404, "Order not found")
    o = rows[0]
    if by == "member" and o["farmer_id"] != actor["id"]:
        raise HTTPException(404, "Order not found")
    if o["plan_status"] != "open" or o["status"] == "delivered":
        raise HTTPException(400, "This order can no longer change.")
    if qty is not None and qty < 0:
        raise HTTPException(400, "The quantity cannot be negative.")
    declined = qty == 0
    with conn:
        conn.execute("""UPDATE abc_input_orders SET status=?, confirmed_qty=?, confirmed_by=?, confirmed_at=? WHERE id=?""",
                     ("declined" if declined else "confirmed", None if declined else (qty if qty is not None else o["suggested_qty"]),
                      by, _now(), order_id))
    _audit(conn, actor, "abc.input.order_confirm", org_id, {"order_id": order_id, "status": o["status"]},
           {"order_id": order_id, "status": "declined" if declined else "confirmed", "qty": qty, "by": by})
    return _rows(conn, "SELECT * FROM abc_input_orders WHERE id=?", (order_id,))[0]


def my_orders(conn, user_id: int) -> list[dict]:
    return _rows(conn, """SELECT o.*, pl.season, pl.crop, pl.unit, pl.rate_text, pl.rate_source, pl.org_id, og.name AS org,
                                 p.product_name
                          FROM abc_input_orders o JOIN abc_input_plans pl ON pl.id = o.plan_id
                          JOIN approved_products p ON p.id = pl.product_id JOIN organisations og ON og.id = pl.org_id
                          WHERE o.farmer_id=? AND pl.status='open' ORDER BY o.id DESC""", (user_id,))


# ── Suppliers and purchase orders ─────────────────────────────────────────────

def suppliers(conn, org_id: int, product_id: int) -> list[dict]:
    """Shops with the product in stock, nearest to the ABC (its woreda centre) first; badge and price shown only."""
    org = _rows(conn, "SELECT woreda_pcode FROM organisations WHERE id=?", (org_id,))[0]
    here = admin_areas.get_area(conn, org["woreda_pcode"]) if org.get("woreda_pcode") else None
    rows = _rows(conn, """SELECT o.id AS shop_id, o.name, o.phone, o.verified, w.name AS woreda, w.latitude, w.longitude,
                                 sp.price_etb, sp.pack_size, sp.price_is_sample
                          FROM shop_products sp JOIN organisations o ON o.id = sp.org_id
                          LEFT JOIN admin_areas w ON w.pcode = o.woreda_pcode
                          WHERE sp.product_id=? AND sp.in_stock=1 AND o.type='agro_dealer' AND o.status='active'""", (product_id,))
    for r in rows:
        r["distance_km"] = (round(admin_areas.distance_km(here.latitude, here.longitude, r["latitude"], r["longitude"]), 1)
                            if here and here.latitude is not None and r["latitude"] is not None else None)
        r["verified"] = bool(r["verified"])
        r["price_is_sample"] = bool(r["price_is_sample"])
    return sorted(rows, key=lambda r: (r["distance_km"] is None, r["distance_km"] or 0, r["name"]))


def create_po(conn, ctx: core.AbcContext, actor: dict, *, supplier: str, supplier_shop_id: int | None, items: list[dict],
              plan_id: int | None, note: str | None) -> dict:
    org = ctx.org["id"]
    if not items:
        raise HTTPException(400, "Add at least one product.")
    lines = []
    for it in items:
        p = _registered(conn, it["product_id"])
        if it["qty"] <= 0:
            raise HTTPException(400, "Quantities must be more than 0.")
        lines.append({"product_id": p["id"], "product_name": p["product_name"], "qty": it["qty"], "unit": it["unit"],
                      "unit_price_etb": it.get("unit_price_etb")})
    total = round(sum((li["unit_price_etb"] or 0) * li["qty"] for li in lines), 2)
    limit = core.profile(conn, org).get("board_approval_limit_etb")
    needs_board = limit is not None and total > limit + 0.005
    with conn:
        po = conn.execute("""INSERT INTO abc_purchase_orders (org_id, supplier, supplier_shop_id, items, total_etb, status,
                             plan_id, note, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)""",
                          (org, supplier.strip(), supplier_shop_id, json.dumps(lines), total,
                           "pending" if needs_board else "approved", plan_id, note, actor["id"], _now())).lastrowid
        aid = None
        if needs_board:
            aid = conn.execute("""INSERT INTO abc_approvals (org_id, kind, ref_id, summary, amount_etb, requested_by, requested_at)
                                  VALUES (?, 'purchase_order', ?, ?, ?, ?, ?)""",
                               (org, po, json.dumps({"supplier": supplier, "items": [f"{li['qty']:g} {li['unit']} {li['product_name']}"
                                                                                     for li in lines], "total_etb": total}),
                                total, actor["id"], _now())).lastrowid
            conn.execute("UPDATE abc_purchase_orders SET approval_id=? WHERE id=?", (aid, po))
    _audit(conn, actor, "abc.input.po_create", org, None, {"po_id": po, "supplier": supplier, "total_etb": total,
                                                          "status": "pending" if needs_board else "approved", "approval_id": aid}, 201)
    return {"po_id": po, "status": "pending" if needs_board else "approved", "approval_id": aid, "total_etb": total}


def _decide_po(conn, ctx, approval: dict, approved: bool) -> None:
    conn.execute("UPDATE abc_purchase_orders SET status=? WHERE id=? AND org_id=? AND status='pending'",
                 ("approved" if approved else "rejected", approval["ref_id"], ctx.org["id"]))


abc_shares.APPROVAL_HANDLERS["purchase_order"] = _decide_po


def purchase_orders(conn, org_id: int) -> list[dict]:
    rows = _rows(conn, "SELECT * FROM abc_purchase_orders WHERE org_id=? ORDER BY id DESC", (org_id,))
    for r in rows:
        r["items"] = json.loads(r["items"])
    return rows


# ── Receiving and stock ───────────────────────────────────────────────────────

def receive(conn, ctx: core.AbcContext, actor: dict, *, po_id: int, product_id: int, qty: float, code: str | None,
            batch_number: str | None, expires_on: date | None) -> dict:
    org = ctx.org["id"]
    rows = _rows(conn, "SELECT * FROM abc_purchase_orders WHERE id=? AND org_id=?", (po_id, org))
    if not rows:
        raise HTTPException(404, "Purchase order not found")
    po = rows[0]
    if po["status"] not in ("approved", "received"):
        raise HTTPException(400, "Only approved purchase orders can be received." if po["status"] != "pending"
                            else "This purchase order is waiting for the board.")
    line = next((li for li in json.loads(po["items"]) if li["product_id"] == product_id), None)
    if not line:
        raise HTTPException(400, "This product is not on the purchase order.")
    _registered(conn, product_id)
    status, result, reason = "quarantined", None, "no_code"
    if code:
        normal = input_trust.normalise(code)
        dup = conn.execute("SELECT 1 FROM abc_stock_lots WHERE org_id=? AND code=?", (org, normal)).fetchone()
        woreda = ctx.org.get("woreda_pcode")
        check = input_trust.verify(conn, normal, user_id=actor["id"], woreda_pcode=woreda)
        result, reason = check["result"], check["reason"]
        if dup:
            reason = "duplicate_in_abc"
        elif check["result"] == "genuine" and check.get("product_id") != product_id:
            reason = "other_product"
        elif check["result"] == "genuine":
            status = "available"
        code = normal
        expires_on = expires_on or (date.fromisoformat(check["expires_on"]) if check.get("expires_on") else None)
        batch_number = batch_number or check.get("batch_number")
    if status == "available" and expires_on and expires_on < date.today():
        status, reason = "quarantined", "expired"
    with conn:
        lot = conn.execute("""INSERT INTO abc_stock_lots (org_id, product_id, po_id, qty_received, qty_remaining, unit,
                              unit_cost_etb, code, batch_number, expires_on, status, trust_result, trust_reason, received_by,
                              received_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                           (org, product_id, po_id, qty, qty, line["unit"], line.get("unit_price_etb"), code, batch_number,
                            expires_on.isoformat() if expires_on else None, status, result, reason, actor["id"],
                            _now())).lastrowid
        conn.execute("INSERT INTO abc_stock_txns (lot_id, kind, qty, created_by, created_at) VALUES (?, 'receive', ?, ?, ?)",
                     (lot, qty, actor["id"], _now()))
        conn.execute("UPDATE abc_purchase_orders SET status='received' WHERE id=?", (po_id,))
    if line.get("unit_price_etb"):
        abc_finance.add_entry(conn, ctx, actor, kind="expense", category="input purchase",
                              amount_etb=round(line["unit_price_etb"] * qty, 2), counterparty=po["supplier"],
                              description=f"{qty:g} {line['unit']} {line['product_name']} (PO {po_id})", source="stock",
                              source_id=lot)
    _audit(conn, actor, "abc.stock.receive", org, None, {"lot_id": lot, "po_id": po_id, "product_id": product_id, "qty": qty,
                                                        "status": status, "trust": reason}, 201)
    return stock_lot(conn, org, lot)


def release(conn, ctx: core.AbcContext, actor: dict, lot_id: int, reason: str) -> dict:
    """A quarantined lot cleared after a physical check with the supplier/regulator (e.g. the label had no code)."""
    org = ctx.org["id"]
    lot = stock_lot(conn, org, lot_id)
    if lot["status"] != "quarantined":
        raise HTTPException(400, "Only quarantined stock can be released.")
    if lot["trust_reason"] in ("possible_copy", "unknown_code", "recalled", "not_registered", "duplicate_in_abc", "other_product"):
        raise HTTPException(400, "Stock that failed the product check cannot be released: report it and return it.")
    if lot["expires_on"] and lot["expires_on"] < date.today().isoformat():
        raise HTTPException(400, "Expired stock cannot be released.")
    with conn:
        conn.execute("UPDATE abc_stock_lots SET status='released' WHERE id=?", (lot_id,))
    _audit(conn, actor, "abc.stock.release", org, {"lot_id": lot_id, "status": "quarantined"},
           {"lot_id": lot_id, "status": "released", "reason": reason})
    return stock_lot(conn, org, lot_id)


def stock_lot(conn, org_id: int, lot_id: int) -> dict:
    rows = _rows(conn, """SELECT l.*, p.product_name, p.status AS product_status FROM abc_stock_lots l
                          JOIN approved_products p ON p.id = l.product_id WHERE l.id=? AND l.org_id=?""", (lot_id, org_id))
    if not rows:
        raise HTTPException(404, "Stock lot not found")
    return _decorate(rows[0])


def _decorate(lot: dict) -> dict:
    today = date.today()
    exp = date.fromisoformat(lot["expires_on"]) if lot.get("expires_on") else None
    lot["expired"] = bool(exp and exp < today)
    lot["expires_soon"] = bool(exp and not lot["expired"] and exp <= today + timedelta(days=EXPIRY_WARNING_DAYS))
    lot["issuable"] = (lot["status"] in ("available", "released") and not lot["expired"] and lot["qty_remaining"] > 0
                       and lot.get("product_status") == "registered")
    return lot


def stock(conn, org_id: int) -> list[dict]:
    rows = _rows(conn, """SELECT l.*, p.product_name, p.status AS product_status FROM abc_stock_lots l
                          JOIN approved_products p ON p.id = l.product_id WHERE l.org_id=? ORDER BY l.id DESC""", (org_id,))
    return [_decorate(r) for r in rows]


def issue(conn, ctx: core.AbcContext, actor: dict, *, lot_id: int, farmer_id: int, qty: float, price_etb: float,
          payment: str, order_id: int | None) -> dict:
    org = ctx.org["id"]
    lot = stock_lot(conn, org, lot_id)
    if not lot["issuable"]:
        why = ("expired" if lot["expired"] else "blocked by the product check" if lot["status"] == "quarantined"
               else "product no longer registered" if lot.get("product_status") != "registered" else "none left")
        raise HTTPException(400, f"This stock cannot be issued: {why}.")
    if qty <= 0 or qty > lot["qty_remaining"] + 1e-9:
        raise HTTPException(400, f"Only {lot['qty_remaining']:g} {lot['unit']} left in this lot.")
    if not conn.execute("SELECT 1 FROM abc_members WHERE org_id=? AND farmer_id=? AND status='active'", (org, farmer_id)).fetchone():
        raise HTTPException(400, "Inputs go to active members only.")
    if order_id:
        o = _rows(conn, """SELECT o.* FROM abc_input_orders o JOIN abc_input_plans pl ON pl.id = o.plan_id
                           WHERE o.id=? AND pl.org_id=? AND o.farmer_id=?""", (order_id, org, farmer_id))
        if not o:
            raise HTTPException(400, "That order is not this member's.")
    name = conn.execute("SELECT name FROM users WHERE id=?", (farmer_id,)).fetchone()[0]
    with conn:
        conn.execute("UPDATE abc_stock_lots SET qty_remaining = qty_remaining - ? WHERE id=?", (qty, lot_id))
        tid = conn.execute("""INSERT INTO abc_stock_txns (lot_id, kind, qty, farmer_id, price_etb, payment, order_id,
                              created_by, created_at) VALUES (?, 'issue', ?, ?, ?, ?, ?, ?, ?)""",
                           (lot_id, -qty, farmer_id, price_etb, payment, order_id, actor["id"], _now())).lastrowid
        if order_id:
            conn.execute("""UPDATE abc_input_orders SET delivered_qty = delivered_qty + ?,
                            status = CASE WHEN delivered_qty + ? >= COALESCE(confirmed_qty, suggested_qty, 0) - 1e-9
                                          THEN 'delivered' ELSE status END WHERE id=?""", (qty, qty, order_id))
    amount = round(price_etb * qty, 2)
    text = f"{qty:g} {lot['unit']} {lot['product_name']}"
    if amount > 0:
        if payment == "credit":
            abc_finance.member_txn(conn, ctx, actor, farmer_id=farmer_id, kind="input_credit", amount_etb=amount,
                                   description=text, source="stock", source_id=tid)
        else:
            abc_finance.add_entry(conn, ctx, actor, kind="income", category="input sales", amount_etb=amount,
                                  counterparty=name, description=text, method="cash", source="stock", source_id=tid)
    _audit(conn, actor, "abc.stock.issue", org, None, {"lot_id": lot_id, "farmer_id": farmer_id, "qty": qty,
                                                      "amount_etb": amount, "payment": payment}, 201)
    return {"txn_id": tid, "amount_etb": amount, "remaining": round(lot["qty_remaining"] - qty, 3)}
