"""
abc_formation.py — ABC formation and registration (milestone A2, docs/abc-pilot-plan.md; spec 2.1).

* Documents (document vault, first part): recognition letter, founding agreement, business plan, capital deposit
  proof, registration certificate, other. Files are stored under data/uploads/abc/<org>/ with a SHA-256; a new
  upload of the same kind is a new version, older versions stay.
* Readiness checklist: every threshold comes from the ABC rules table (backend/abc_company.rule), for the ABC's
  type, on today's date. Items: organizing committee size, recognition, founding members, paid capital, share of
  declared capital paid, board elected, business plan (3-5 years), capital deposit proof, founding agreement signed.
* Founding agreement: members confirm in the app (digital confirmation) or the manager records a signed scan.
* Registration: authority, number, date and certificate; only when every item is ready, unless an administrator
  registers with a written reason (e.g. an ABC registered before it joined the platform). Audited.

The platform keeps support records; the official record is held by the ABC and the registering authority.
"""

from __future__ import annotations

import hashlib
import re
import sqlite3
from datetime import date, datetime
from pathlib import Path

from fastapi import HTTPException

from backend import abc_company as core
from backend import audit

ROOT = Path(__file__).resolve().parents[1]
UPLOAD_ROOT = ROOT / "data" / "uploads" / "abc"
MAX_BYTES = 10 * 1024 * 1024
FILE_TYPES = {"application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png"}
DOC_KINDS = ("recognition", "founding_agreement", "business_plan", "capital_deposit", "registration_certificate",
             "minutes", "other")

SCHEMA = """
CREATE TABLE IF NOT EXISTS abc_documents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id        INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    kind          TEXT NOT NULL,
    title         TEXT NOT NULL,
    filename      TEXT NOT NULL,
    stored_path   TEXT NOT NULL,           -- relative to data/uploads/abc
    content_type  TEXT NOT NULL,
    size_bytes    INTEGER NOT NULL,
    sha256        TEXT NOT NULL,
    version       INTEGER NOT NULL,
    plan_years    INTEGER,                 -- business plan: number of years covered
    uploaded_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_abc_documents ON abc_documents (org_id, kind, version);
CREATE TABLE IF NOT EXISTS abc_formation (
    org_id                 INTEGER PRIMARY KEY REFERENCES organisations(id) ON DELETE CASCADE,
    recognition_authority  TEXT,
    recognized_on          TEXT,
    recognition_doc_id     INTEGER REFERENCES abc_documents(id),
    registration_authority TEXT,
    registration_number    TEXT,
    registered_on          TEXT,
    certificate_doc_id     INTEGER REFERENCES abc_documents(id),
    override_reason        TEXT,
    registered_by          INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS abc_agreement_signatures (
    org_id      INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    farmer_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doc_id      INTEGER NOT NULL REFERENCES abc_documents(id),
    method      TEXT NOT NULL CHECK (method IN ('app','scan')),
    scan_doc_id INTEGER REFERENCES abc_documents(id),
    recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    signed_at   TEXT NOT NULL,
    PRIMARY KEY (org_id, farmer_id, doc_id)
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


def _one(conn, sql, params=()) -> dict | None:
    rows = _rows(conn, sql, params)
    return rows[0] if rows else None


# ── Documents ─────────────────────────────────────────────────────────────────

def save_document(conn: sqlite3.Connection, ctx: core.AbcContext, user: dict, *, kind: str, title: str, filename: str,
                  content_type: str, data: bytes, plan_years: int | None = None) -> dict:
    if kind not in DOC_KINDS:
        raise HTTPException(400, f"Unknown document kind '{kind}'.")
    ctype = (content_type or "").split(";")[0].strip().lower()
    if ctype not in FILE_TYPES:
        raise HTTPException(400, "Upload a PDF, JPEG or PNG file.")
    if not data:
        raise HTTPException(400, "The file is empty.")
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "The file is larger than 10 MB.")
    if kind == "business_plan" and not plan_years:
        raise HTTPException(400, "Say how many years the business plan covers.")
    digest = hashlib.sha256(data).hexdigest()
    org = ctx.org["id"]
    version = (conn.execute("SELECT MAX(version) FROM abc_documents WHERE org_id=? AND kind=?", (org, kind)).fetchone()[0]
               or 0) + 1
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", Path(filename or "file").stem)[:60] or "file"
    rel = f"{org}/{kind}-v{version}-{digest[:10]}-{safe}{FILE_TYPES[ctype]}"
    path = UPLOAD_ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    with conn:
        did = conn.execute("""INSERT INTO abc_documents (org_id, kind, title, filename, stored_path, content_type,
                              size_bytes, sha256, version, plan_years, uploaded_by, uploaded_at)
                              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                           (org, kind, title.strip(), filename or path.name, rel, ctype, len(data), digest, version,
                            plan_years, user["id"], _now())).lastrowid
    audit.record(conn, actor_id=user["id"], actor_role=user["role"], action="abc.document.upload", target_type="abc",
                 target_id=org, status=201, detail={"before": None, "after": {"document_id": did, "kind": kind,
                                                                              "version": version, "sha256": digest}})
    return document(conn, org, did)


def document(conn: sqlite3.Connection, org_id: int, doc_id: int) -> dict:
    d = _one(conn, """SELECT d.id, d.kind, d.title, d.filename, d.content_type, d.size_bytes, d.sha256, d.version,
                             d.plan_years, d.uploaded_at, u.name AS uploaded_by, d.stored_path
                      FROM abc_documents d LEFT JOIN users u ON u.id = d.uploaded_by WHERE d.org_id=? AND d.id=?""",
             (org_id, doc_id))
    if not d:
        raise HTTPException(404, "Document not found")
    return d


def documents(conn: sqlite3.Connection, org_id: int) -> list[dict]:
    rows = _rows(conn, """SELECT d.id, d.kind, d.title, d.filename, d.content_type, d.size_bytes, d.sha256, d.version,
                                 d.plan_years, d.uploaded_at, u.name AS uploaded_by
                          FROM abc_documents d LEFT JOIN users u ON u.id = d.uploaded_by
                          WHERE d.org_id=? ORDER BY d.kind, d.version DESC""", (org_id,))
    latest: set[str] = set()
    for r in rows:
        r["latest"] = r["kind"] not in latest
        latest.add(r["kind"])
    return rows


def latest_document(conn: sqlite3.Connection, org_id: int, kind: str) -> dict | None:
    return _one(conn, """SELECT id, version, plan_years, uploaded_at FROM abc_documents WHERE org_id=? AND kind=?
                         ORDER BY version DESC LIMIT 1""", (org_id, kind))


def file_path(doc: dict) -> Path:
    path = (UPLOAD_ROOT / doc["stored_path"]).resolve()
    if UPLOAD_ROOT.resolve() not in path.parents or not path.exists():
        raise HTTPException(404, "File not found")
    return path


# ── Formation record ──────────────────────────────────────────────────────────

def formation(conn: sqlite3.Connection, org_id: int) -> dict:
    row = _one(conn, "SELECT * FROM abc_formation WHERE org_id=?", (org_id,))
    if row is None:                       # first use only: reads do not take the write lock
        with conn:
            conn.execute("INSERT OR IGNORE INTO abc_formation (org_id) VALUES (?)", (org_id,))
        row = _one(conn, "SELECT * FROM abc_formation WHERE org_id=?", (org_id,))
    return row


def set_recognition(conn, ctx: core.AbcContext, user: dict, authority: str, recognized_on: date,
                    doc_id: int | None) -> dict:
    if doc_id:
        document(conn, ctx.org["id"], doc_id)
    before = formation(conn, ctx.org["id"])
    with conn:
        conn.execute("UPDATE abc_formation SET recognition_authority=?, recognized_on=?, recognition_doc_id=? WHERE org_id=?",
                     (authority.strip(), recognized_on.isoformat(), doc_id, ctx.org["id"]))
    after = formation(conn, ctx.org["id"])
    audit.record(conn, actor_id=user["id"], actor_role=user["role"], action="abc.formation.recognition",
                 target_type="abc", target_id=ctx.org["id"], status=200,
                 detail={"before": {k: before[k] for k in ("recognition_authority", "recognized_on", "recognition_doc_id")},
                         "after": {k: after[k] for k in ("recognition_authority", "recognized_on", "recognition_doc_id")}})
    return after


# ── Founding agreement signatures ─────────────────────────────────────────────

def active_members(conn, org_id: int) -> list[dict]:
    return _rows(conn, """SELECT u.id, u.name, u.phone FROM abc_members m JOIN users u ON u.id = m.farmer_id
                          WHERE m.org_id=? AND m.status='active' ORDER BY u.name""", (org_id,))


def signatures(conn, org_id: int) -> dict:
    doc = latest_document(conn, org_id, "founding_agreement")
    members = active_members(conn, org_id)
    signed = {}
    if doc:
        signed = {r["farmer_id"]: r for r in _rows(conn, """SELECT farmer_id, method, signed_at, scan_doc_id
                                                           FROM abc_agreement_signatures WHERE org_id=? AND doc_id=?""",
                                                   (org_id, doc["id"]))}
    return {"document": doc, "members": [{**m, "signature": signed.get(m["id"])} for m in members],
            "signed": sum(1 for m in members if m["id"] in signed), "total": len(members)}


def sign(conn, org_id: int, farmer_id: int, user: dict, method: str, scan_doc_id: int | None = None) -> dict:
    doc = latest_document(conn, org_id, "founding_agreement")
    if not doc:
        raise HTTPException(400, "The founding agreement has not been uploaded yet.")
    if not any(m["id"] == farmer_id for m in active_members(conn, org_id)):
        raise HTTPException(400, "Only members who accepted can sign the founding agreement.")
    if method == "scan":
        if not scan_doc_id:
            raise HTTPException(400, "Attach the signed scan.")
        document(conn, org_id, scan_doc_id)
    with conn:
        conn.execute("""INSERT OR REPLACE INTO abc_agreement_signatures (org_id, farmer_id, doc_id, method, scan_doc_id,
                        recorded_by, signed_at) VALUES (?,?,?,?,?,?,?)""",
                     (org_id, farmer_id, doc["id"], method, scan_doc_id, user["id"], _now()))
    audit.record(conn, actor_id=user["id"], actor_role=user["role"], action="abc.agreement.sign", target_type="abc",
                 target_id=org_id, status=201, detail={"before": None, "after": {"farmer_id": farmer_id, "method": method,
                                                                                "agreement_version": doc["version"]}})
    return signatures(conn, org_id)


# ── Readiness checklist ───────────────────────────────────────────────────────

def paid_capital(conn, org_id: int) -> float:
    """Share capital paid so far (share payments arrive with milestone A4; 0 until then)."""
    exists = conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='abc_share_payments'").fetchone()
    if not exists:
        return 0.0
    return float(conn.execute("SELECT COALESCE(SUM(amount_etb), 0) FROM abc_share_payments WHERE org_id=? "
                              "AND status='confirmed'", (org_id,)).fetchone()[0])


def _item(key: str, ok: bool, have, need, rules: list[core.Rule] = ()) -> dict:
    return {"key": key, "ok": bool(ok), "have": have, "need": need,
            "rules": [{"key": r.key, "value": r.value, "source": r.source, "verification_status": r.verification_status}
                      for r in rules]}


def readiness(conn: sqlite3.Connection, ctx: core.AbcContext, on: date | None = None) -> dict:
    org, t = ctx.org["id"], ctx.profile["abc_type"]
    r = lambda k: core.rule(conn, k, t, on)  # noqa: E731
    items = []
    cmin, cmax = r("committee_min"), r("committee_max")
    committee = conn.execute("SELECT COUNT(DISTINCT user_id) FROM abc_roles WHERE org_id=? AND role='organizing_committee'",
                             (org,)).fetchone()[0]
    items.append(_item("committee", cmin.value <= committee <= cmax.value, committee,
                       f"{cmin.value:g}-{cmax.value:g}", [cmin, cmax]))
    f = formation(conn, org)
    items.append(_item("recognition", bool(f["recognition_authority"] and f["recognized_on"] and f["recognition_doc_id"]),
                       f["recognized_on"], None))
    minm = r("min_founding_members")
    members = len(active_members(conn, org))
    items.append(_item("members", members >= minm.value, members, minm.value, [minm]))
    minc, frac = r("min_paid_capital_etb"), r("registration_paid_fraction")
    paid = paid_capital(conn, org)
    items.append(_item("paid_capital", paid >= minc.value, paid, minc.value, [minc]))
    declared = ctx.profile["declared_capital_etb"]
    items.append(_item("declared_paid", bool(declared) and paid >= frac.value * declared, paid,
                       frac.value * declared if declared else None, [frac]))
    chair = conn.execute("SELECT COUNT(*) FROM abc_roles WHERE org_id=? AND role='chair'", (org,)).fetchone()[0]
    board = conn.execute("SELECT COUNT(DISTINCT user_id) FROM abc_roles WHERE org_id=? AND role IN ('chair','board_member')",
                         (org,)).fetchone()[0]
    bmin = r("board_min_members")
    items.append(_item("board", chair >= 1 and board >= bmin.value, board, bmin.value, [bmin]))
    ymin, ymax = r("business_plan_years_min"), r("business_plan_years_max")
    plan = latest_document(conn, org, "business_plan")
    items.append(_item("business_plan", bool(plan) and ymin.value <= (plan["plan_years"] or 0) <= ymax.value,
                       plan["plan_years"] if plan else None, f"{ymin.value:g}-{ymax.value:g}", [ymin, ymax]))
    items.append(_item("capital_deposit", bool(latest_document(conn, org, "capital_deposit")), None, None))
    sig = signatures(conn, org)
    items.append(_item("agreement", bool(sig["document"]) and sig["total"] > 0 and sig["signed"] == sig["total"],
                       sig["signed"], sig["total"]))
    return {"ready": all(i["ok"] for i in items), "items": items, "status": ctx.profile["status"]}


# ── Registration ──────────────────────────────────────────────────────────────

def register(conn, ctx: core.AbcContext, user: dict, *, authority: str, number: str, registered_on: date,
             certificate_doc_id: int, override_reason: str | None) -> dict:
    if ctx.profile["status"] != "formation":
        raise HTTPException(400, "This ABC is already registered.")
    document(conn, ctx.org["id"], certificate_doc_id)
    check = readiness(conn, ctx)
    if not check["ready"]:
        if not ctx.is_admin:
            missing = ", ".join(i["key"] for i in check["items"] if not i["ok"])
            raise HTTPException(400, f"Not ready to register: {missing}.")
        if not (override_reason and len(override_reason.strip()) >= 10):
            raise HTTPException(400, "Give the reason for registering although the checklist is not complete.")
    formation(conn, ctx.org["id"])
    with conn:
        conn.execute("""UPDATE abc_formation SET registration_authority=?, registration_number=?, registered_on=?,
                        certificate_doc_id=?, override_reason=?, registered_by=? WHERE org_id=?""",
                     (authority.strip(), number.strip(), registered_on.isoformat(), certificate_doc_id,
                      None if check["ready"] else override_reason.strip(), user["id"], ctx.org["id"]))
        conn.execute("UPDATE abc_profiles SET status='registered', updated_at=? WHERE org_id=?", (_now(), ctx.org["id"]))
    audit.record(conn, actor_id=user["id"], actor_role=user["role"], action="abc.registration", target_type="abc",
                 target_id=ctx.org["id"], status=200,
                 detail={"before": {"status": "formation"},
                         "after": {"status": "registered", "authority": authority, "number": number,
                                   "registered_on": registered_on.isoformat(),
                                   "checklist_complete": check["ready"], "override_reason": override_reason}})
    return formation(conn, ctx.org["id"])
