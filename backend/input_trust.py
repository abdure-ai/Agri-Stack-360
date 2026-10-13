"""
input_trust.py — Input Trust pilot: anti-counterfeit verification of agro-inputs.

Model (pilot, chosen with the product owner):
  * supplier organisations (with their own users) list products from the registered-product list
    (approved_products; pilot data are PLACEHOLDER_VERIFY until the official EAA list is imported);
  * a supplier creates a **batch** and gets ONE code for it (printed as a QR on every pack of that batch);
  * anyone signed in checks a code: Genuine or Warning, with the reason.

Because one code covers a whole batch, a single scan cannot prove one pack is original. Copies are
detected statistically instead: a batch checked more times than it has units, or in many different
woredas within 30 days, turns into a Warning ("possible copied code") and shows on the supplier's report.

Only the checker's woreda (from their profile) is stored with a check, never GPS or names in reports.
"""

from __future__ import annotations

import secrets
import sqlite3
from datetime import datetime, timedelta

ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"     # no 0/O/1/I: easy to read and type
COPY_WINDOW_DAYS = 30
COPY_MAX_WOREDAS = 3

# Organisation types (one model for all; features per type live in their own routers).
ORG_TYPES = ("supplier", "agro_dealer", "abc", "commercial_farm", "ngo")

ORGANISATIONS_SQL = """
CREATE TABLE IF NOT EXISTS {name} (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    type         TEXT NOT NULL DEFAULT 'supplier' CHECK (type IN ('supplier','agro_dealer','abc','commercial_farm','ngo')),
    status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    note         TEXT,
    created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
    woreda_pcode TEXT,                    -- shop / office location (official P-code)
    phone        TEXT,                    -- business phone (shown to farmers for shops)
    verified     INTEGER NOT NULL DEFAULT 0,   -- verified-seller badge (agro-dealers), set by an admin
    verified_at  TEXT
);
"""

SCHEMA = ORGANISATIONS_SQL.format(name="organisations") + """
CREATE TABLE IF NOT EXISTS organisation_members (
    org_id     INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_role TEXT NOT NULL DEFAULT 'staff' CHECK (member_role IN ('owner','staff')),
    PRIMARY KEY (org_id, user_id)
);
CREATE TABLE IF NOT EXISTS org_products (
    org_id     INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES approved_products(id) ON DELETE CASCADE,
    PRIMARY KEY (org_id, product_id)
);
CREATE TABLE IF NOT EXISTS code_batches (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id          INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES approved_products(id),
    batch_number    TEXT NOT NULL,
    units           INTEGER NOT NULL CHECK (units > 0),
    manufactured_on TEXT,
    expires_on      TEXT,
    code            TEXT NOT NULL UNIQUE,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','recalled')),
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (org_id, product_id, batch_number)
);
CREATE TABLE IF NOT EXISTS verifications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    code         TEXT NOT NULL,
    batch_id     INTEGER REFERENCES code_batches(id) ON DELETE SET NULL,
    user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    result       TEXT NOT NULL CHECK (result IN ('genuine','warning')),
    reason       TEXT NOT NULL,
    woreda_pcode TEXT,
    created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_verifications_batch ON verifications(batch_id, created_at);
CREATE TABLE IF NOT EXISTS shop_products (
    org_id     INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES approved_products(id) ON DELETE CASCADE,
    in_stock   INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT,
    PRIMARY KEY (org_id, product_id)
);
CREATE TABLE IF NOT EXISTS dealer_checks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id          INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    verification_id INTEGER REFERENCES verifications(id) ON DELETE SET NULL,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS fake_reports (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    code         TEXT,
    product_id   INTEGER REFERENCES approved_products(id) ON DELETE SET NULL,
    product_text TEXT,
    shop_text    TEXT,
    note         TEXT,
    woreda_pcode TEXT,
    status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed')),
    created_at   TEXT NOT NULL
);
"""


def _migrate_organisations(conn: sqlite3.Connection) -> None:
    """Older databases allowed only type 'supplier' and lacked shop fields: rebuild the table once."""
    row = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='organisations'").fetchone()
    if not row or "agro_dealer" in row[0]:
        return
    conn.commit()
    conn.execute("PRAGMA foreign_keys=OFF")
    try:
        conn.executescript(ORGANISATIONS_SQL.format(name="organisations_new") + """
            INSERT INTO organisations_new (id, name, type, status, note, created_at)
              SELECT id, name, type, status, note, created_at FROM organisations;
            DROP TABLE organisations;
            ALTER TABLE organisations_new RENAME TO organisations;
        """)
        conn.commit()
    finally:
        conn.execute("PRAGMA foreign_keys=ON")


def ensure_schema(conn: sqlite3.Connection) -> None:
    _migrate_organisations(conn)
    conn.executescript(SCHEMA)
    cols = {r[1] for r in conn.execute("PRAGMA table_info(shop_products)")}
    for col, decl in (("price_etb", "REAL"), ("pack_size", "TEXT"), ("price_is_sample", "INTEGER NOT NULL DEFAULT 0"),
                      ("price_updated_at", "TEXT")):
        if col not in cols:      # shop price per pack, set by the dealer (added after the first release)
            conn.execute(f"ALTER TABLE shop_products ADD COLUMN {col} {decl}")
    conn.commit()


def normalise(code: str) -> str:
    """Accept 'ab3d-ef7h-...' or a scanned URL ending in ?code=...; return 'AB3D-EF7H-JK9M'."""
    raw = code.strip()
    if "code=" in raw:
        raw = raw.split("code=", 1)[1].split("&", 1)[0]
    s = "".join(c for c in raw.upper() if c.isalnum())
    return "-".join(s[i:i + 4] for i in range(0, len(s), 4))


def new_code(conn: sqlite3.Connection) -> str:
    while True:
        s = "".join(secrets.choice(ALPHABET) for _ in range(12))
        code = "-".join(s[i:i + 4] for i in range(0, 12, 4))
        if not conn.execute("SELECT 1 FROM code_batches WHERE code=?", (code,)).fetchone():
            return code


def _row(conn: sqlite3.Connection, sql: str, params: tuple) -> dict | None:
    cur = conn.execute(sql, params)
    r = cur.fetchone()
    return dict(zip([d[0] for d in cur.description], r)) if r else None


def verify(conn: sqlite3.Connection, code: str, *, user_id: int | None, woreda_pcode: str | None,
           now: datetime | None = None) -> dict:
    """Check a code and log the check. Result 'genuine' or 'warning' with a reason key."""
    now = now or datetime.now()
    code = normalise(code)
    b = _row(conn, """SELECT b.*, p.product_name, p.active_ingredient, p.formulation, p.registration_number,
                             p.status AS product_status, p.verification_status, o.name AS org_name, o.status AS org_status
                      FROM code_batches b JOIN approved_products p ON p.id = b.product_id
                      JOIN organisations o ON o.id = b.org_id WHERE b.code = ?""", (code,))
    reason = "ok"
    if not b:
        reason = "unknown_code"
    elif b["status"] == "recalled":
        reason = "recalled"
    elif b["org_status"] != "active":
        reason = "supplier_suspended"
    elif b["product_status"] != "registered":
        reason = "not_registered"
    elif b["expires_on"] and b["expires_on"] < now.date().isoformat():
        reason = "expired"
    else:
        since = (now - timedelta(days=COPY_WINDOW_DAYS)).isoformat(sep=" ", timespec="seconds")
        total = conn.execute("SELECT COUNT(*) FROM verifications WHERE batch_id=? AND created_at>=?",
                             (b["id"], since)).fetchone()[0]
        places = {r[0] for r in conn.execute(
            "SELECT DISTINCT woreda_pcode FROM verifications WHERE batch_id=? AND created_at>=? AND woreda_pcode IS NOT NULL",
            (b["id"], since))}
        if woreda_pcode:
            places.add(woreda_pcode)
        if total + 1 > b["units"] or len(places) > COPY_MAX_WOREDAS:
            reason = "possible_copy"
    result = "genuine" if reason == "ok" else "warning"
    with conn:
        conn.execute("INSERT INTO verifications (code, batch_id, user_id, result, reason, woreda_pcode, created_at) "
                     "VALUES (?,?,?,?,?,?,?)", (code, b["id"] if b else None, user_id, result, reason, woreda_pcode,
                                                now.isoformat(sep=" ", timespec="seconds")))
    out = {"code": code, "result": result, "reason": reason}
    if b:
        out.update({k: b[k] for k in ("product_id", "product_name", "active_ingredient", "formulation", "registration_number",
                                      "verification_status", "org_name", "batch_number", "expires_on", "manufactured_on")})
        out["placeholder"] = b["verification_status"] != "verified"
    return out


def supplier_report(conn: sqlite3.Connection, org_id: int, days: int, now: datetime | None = None) -> dict:
    """Checks of this supplier's batches: by result and reason, by woreda, per batch, and fake reports."""
    now = now or datetime.now()
    since = (now - timedelta(days=days)).isoformat(sep=" ", timespec="seconds")

    def rows(sql, params=()):
        cur = conn.execute(sql, params)
        return [dict(zip([d[0] for d in cur.description], r)) for r in cur.fetchall()]

    checks = rows("""SELECT v.result, v.reason, v.woreda_pcode, b.id AS batch_id FROM verifications v
                     JOIN code_batches b ON b.id = v.batch_id WHERE b.org_id=? AND v.created_at>=?""", (org_id, since))
    by_reason: dict[str, int] = {}
    by_woreda: dict[str, dict] = {}
    per_batch: dict[int, dict] = {}
    for c in checks:
        by_reason[c["reason"]] = by_reason.get(c["reason"], 0) + 1
        w = by_woreda.setdefault(c["woreda_pcode"] or "unknown", {"checks": 0, "warnings": 0})
        w["checks"] += 1
        w["warnings"] += c["result"] == "warning"
        pb = per_batch.setdefault(c["batch_id"], {"checks": 0, "warnings": 0, "woredas": set()})
        pb["checks"] += 1
        pb["warnings"] += c["result"] == "warning"
        if c["woreda_pcode"]:
            pb["woredas"].add(c["woreda_pcode"])
    names = {r["pcode"]: r for r in rows(
        f"""SELECT w.pcode, w.name AS woreda, z.name AS zone, w.latitude, w.longitude FROM admin_areas w
            LEFT JOIN admin_areas z ON z.pcode = w.parent_pcode
            WHERE w.pcode IN ({','.join('?' * len(by_woreda)) or "''"})""", tuple(by_woreda))}
    fakes = rows("""SELECT f.id, f.code, f.product_text, f.shop_text, f.note, f.woreda_pcode, f.status, f.created_at,
                           p.product_name FROM fake_reports f JOIN approved_products p ON p.id = f.product_id
                    JOIN org_products op ON op.product_id = f.product_id AND op.org_id = ?
                    WHERE f.created_at >= ? ORDER BY f.id DESC""", (org_id, since))
    for f in fakes:
        f["woreda"] = (names.get(f["woreda_pcode"]) or {}).get("woreda") or _woreda_name(conn, f["woreda_pcode"])
    return {
        "days": days,
        "checks": len(checks),
        "warnings": sum(c["result"] == "warning" for c in checks),
        "by_reason": by_reason,
        "by_woreda": [{"pcode": k, **(names.get(k) or {"woreda": k}), **v}
                      for k, v in sorted(by_woreda.items(), key=lambda kv: -kv[1]["warnings"])],
        "batches": {bid: {"checks": v["checks"], "warnings": v["warnings"], "woredas": len(v["woredas"])}
                    for bid, v in per_batch.items()},
        "fake_reports": fakes,
    }


def _woreda_name(conn: sqlite3.Connection, pcode: str | None) -> str | None:
    if not pcode:
        return None
    r = conn.execute("SELECT name FROM admin_areas WHERE pcode=?", (pcode,)).fetchone()
    return r[0] if r else pcode


def label_svg(code: str, url: str, product: str, batch: str, expires: str | None, org: str) -> str:
    """Printable label: QR (opens the check page) + the code in text for typing."""
    from html import escape

    import segno

    qr = segno.make(url, error="m")
    w, h, size = 360, 470, 300
    qr_svg = qr.svg_inline(border=2, omitsize=True).replace(
        "<svg ", f'<svg x="{(w - size) / 2}" y="66" width="{size}" height="{size}" ', 1)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
            f'font-family="Arial, sans-serif">'
            f'<rect width="{w}" height="{h}" fill="#fff" stroke="#222" stroke-width="2" rx="10"/>'
            f'<text x="{w / 2}" y="34" font-size="18" font-weight="bold" text-anchor="middle">Check this product</text>'
            f'<text x="{w / 2}" y="56" font-size="13" text-anchor="middle">Scan or type the code in Agri-Stack 360</text>'
            f'{qr_svg}'
            f'<text x="{w / 2}" y="392" font-size="26" font-weight="bold" letter-spacing="2" text-anchor="middle">{escape(code)}</text>'
            f'<text x="{w / 2}" y="418" font-size="13" text-anchor="middle">{escape(product)}</text>'
            f'<text x="{w / 2}" y="438" font-size="12" text-anchor="middle">Batch {escape(batch)}'
            f'{" · Expires " + escape(expires) if expires else ""}</text>'
            f'<text x="{w / 2}" y="458" font-size="11" text-anchor="middle" fill="#555">{escape(org)}</text></svg>')
