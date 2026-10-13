"""
abc_members.py — ABC member and shareholder registry (milestone A3, docs/abc-pilot-plan.md; spec 2.2).

* Enrol a member: link an existing farmer account (by phone) or create one (the ABC staff give a temporary PIN,
  as DAs do). Consent is recorded for every member: in the app (the farmer accepts the invitation), spoken
  (recorded by the staff member, who is named in the record) or on paper (a signed form in the documents).
* National ID (Fayda or kebele ID): encrypted with a server key (ABC_ID_SECRET in .env; else derived from
  JWT_SECRET_KEY with its own label), only the last 4 digits are shown; a keyed hash finds duplicates without
  decrypting; every full view is written to the audit log; never exported.
* Gender and age group are kept for inclusion reporting (aggregated only).
* Bulk import (CSV): validated row by row, duplicates found within the file, against existing members and by ID
  number; a dry run reports what would happen; only the import itself writes.
* Plots: the members' own farms (area, crop, irrigation) as they recorded them in the platform.
"""

from __future__ import annotations

import base64
import csv
import hashlib
import hmac
import io
import re
import sqlite3
from datetime import datetime

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException

from backend import abc_company as core
from backend import admin_areas, audit, consent
from backend.advisory.config import env
from backend.auth import hash_password

GENDERS = ("female", "male")
AGE_GROUPS = ("15-29", "30-44", "45-59", "60+")
ID_TYPES = ("fayda", "kebele_id", "other")
CONSENT_METHODS = ("app", "spoken", "paper")
PHONE = re.compile(r"0[79]\d{8}")
CSV_COLUMNS = ["phone", "name", "woreda_pcode", "kebele", "gender", "age_group", "id_type", "id_number",
               "consent_method", "pin"]

SCHEMA = """
CREATE TABLE IF NOT EXISTS abc_member_details (
    org_id              INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    farmer_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_no           INTEGER NOT NULL,
    gender              TEXT CHECK (gender IN ('female','male')),
    age_group           TEXT CHECK (age_group IN ('15-29','30-44','45-59','60+')),
    id_type             TEXT CHECK (id_type IN ('fayda','kebele_id','other')),
    id_encrypted        TEXT,
    id_last4            TEXT,
    id_hash             TEXT,
    consent_method      TEXT NOT NULL CHECK (consent_method IN ('app','spoken','paper')),
    consent_recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    consent_recorded_at TEXT NOT NULL,
    consent_doc_id      INTEGER,
    enrolled_at         TEXT NOT NULL,
    PRIMARY KEY (org_id, farmer_id),
    UNIQUE (org_id, member_no)
);
CREATE INDEX IF NOT EXISTS ix_abc_member_id_hash ON abc_member_details (org_id, id_hash);
"""


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def _now() -> str:
    return datetime.now().isoformat(sep=" ", timespec="seconds")


def _secret() -> bytes:
    own = env("ABC_ID_SECRET")
    if own:
        return own.encode()
    jwt = env("JWT_SECRET_KEY")
    if not jwt:
        raise HTTPException(500, "Set ABC_ID_SECRET in the server's .env to store national ID numbers.")
    return hashlib.sha256(b"agri-stack-360/abc-member-id/" + jwt.encode()).digest()


def _fernet() -> Fernet:
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(_secret()).digest()))


def _normal_id(number: str) -> str:
    return re.sub(r"[\s-]", "", number or "").upper()


def id_hash(number: str) -> str:
    return hmac.new(_secret(), _normal_id(number).encode(), hashlib.sha256).hexdigest()


def encrypt_id(number: str) -> tuple[str, str, str]:
    n = _normal_id(number)
    if not 4 <= len(n) <= 40:
        raise HTTPException(400, "The ID number looks wrong (4-40 letters or digits).")
    return _fernet().encrypt(n.encode()).decode(), n[-4:], id_hash(n)


def decrypt_id(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        raise HTTPException(500, "The ID number cannot be read with the current server key.") from None


def _rows(conn, sql, params=()) -> list[dict]:
    cur = conn.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


# ── Registry ──────────────────────────────────────────────────────────────────

def registry(conn: sqlite3.Connection, org_id: int) -> list[dict]:
    """Every member (accepted or invited) with details, masked ID and plot totals."""
    rows = _rows(conn, """SELECT u.id AS farmer_id, u.name, u.phone, u.woreda, u.woreda_pcode, p.kebele,
                                 m.status, m.invited_at, m.joined_at,
                                 d.member_no, d.gender, d.age_group, d.id_type, d.id_last4, d.consent_method,
                                 d.consent_recorded_at, d.consent_doc_id, r.name AS consent_recorded_by
                          FROM abc_members m JOIN users u ON u.id = m.farmer_id
                          LEFT JOIN farmer_profiles p ON p.user_id = u.id
                          LEFT JOIN abc_member_details d ON d.org_id = m.org_id AND d.farmer_id = m.farmer_id
                          LEFT JOIN users r ON r.id = d.consent_recorded_by
                          WHERE m.org_id = ? AND m.status != 'declined'
                          ORDER BY COALESCE(d.member_no, 999999), u.name""", (org_id,))
    plots = {r["user_id"]: r for r in _rows(conn, """SELECT f.user_id, COUNT(*) AS plots, ROUND(SUM(COALESCE(f.area_ha, 0)), 2) AS ha,
                                                          SUM(COALESCE(f.irrigated, 0)) AS irrigated
                                                   FROM farms f JOIN abc_members m ON m.farmer_id = f.user_id AND m.org_id = ?
                                                   GROUP BY f.user_id""", (org_id,))}
    for r in rows:
        p = plots.get(r["farmer_id"], {})
        r["plots"], r["area_ha"], r["irrigated_plots"] = p.get("plots", 0), p.get("ha", 0.0), p.get("irrigated", 0)
        r["id_masked"] = f"•••• {r['id_last4']}" if r.get("id_last4") else None
        r.pop("id_last4", None)
    return rows


def member_plots(conn, org_id: int, farmer_id: int) -> list[dict]:
    if not conn.execute("SELECT 1 FROM abc_members WHERE org_id=? AND farmer_id=? AND status='active'",
                        (org_id, farmer_id)).fetchone():
        raise HTTPException(404, "Not an active member of this ABC")
    return _rows(conn, """SELECT f.id, f.field_name, f.crop_name, f.area_ha, f.irrigated, f.soil_type, f.status,
                                 (SELECT s.crop || ' · ' || s.season FROM crop_seasons s WHERE s.farm_id = f.id
                                  AND s.status = 'active' ORDER BY s.planting_date DESC LIMIT 1) AS active_season
                          FROM farms f WHERE f.user_id = ? ORDER BY f.id""", (farmer_id,))


def _next_member_no(conn, org_id: int) -> int:
    return (conn.execute("SELECT MAX(member_no) FROM abc_member_details WHERE org_id=?", (org_id,)).fetchone()[0] or 0) + 1


def _check_duplicate_id(conn, org_id: int, farmer_id: int | None, hashed: str) -> None:
    row = conn.execute("SELECT farmer_id FROM abc_member_details WHERE org_id=? AND id_hash=?", (org_id, hashed)).fetchone()
    if row and row[0] != farmer_id:
        raise HTTPException(409, "This ID number is already registered for another member of this ABC.")


def enrol(conn: sqlite3.Connection, ctx: core.AbcContext, actor: dict, *, phone: str, name: str | None = None,
          area_pcode: str | None = None, kebele: str | None = None, language: str = "am", pin: str | None = None,
          gender: str | None = None, age_group: str | None = None, id_type: str | None = None,
          id_number: str | None = None, consent_method: str = "app", consent_doc_id: int | None = None,
          consent_data: bool = True, consent_alerts: bool = True) -> dict:
    """Add (or update) a member. 'app' = the farmer is invited and accepts in the app; 'spoken'/'paper' = staff record
    the farmer's agreement and the member is active at once."""
    org = ctx.org["id"]
    phone = (phone or "").strip()
    if not PHONE.fullmatch(phone):
        raise HTTPException(400, "Phone must be 10 digits starting with 09 or 07.")
    if consent_method not in CONSENT_METHODS:
        raise HTTPException(400, "Consent must be recorded: app, spoken or paper.")
    if consent_method == "paper":
        if not consent_doc_id:
            raise HTTPException(400, "Attach the signed consent form (upload it to the documents first).")
        if not conn.execute("SELECT 1 FROM abc_documents WHERE org_id=? AND id=?", (org, consent_doc_id)).fetchone():
            raise HTTPException(400, "The consent form is not among this ABC's documents.")
    for value, allowed, label in ((gender, GENDERS, "gender"), (age_group, AGE_GROUPS, "age group"), (id_type, ID_TYPES, "ID type")):
        if value is not None and value not in allowed:
            raise HTTPException(400, f"Unknown {label} '{value}'.")
    enc = encrypt_id(id_number) if id_number else None
    if enc and not id_type:
        raise HTTPException(400, "Say which kind of ID this is.")
    user = conn.execute("SELECT id, role, name FROM users WHERE phone = ?", (phone,)).fetchone()
    created = False
    if user:
        farmer_id = user[0]
        if user[1] != "farmer":
            raise HTTPException(400, "This phone belongs to an account that is not a farmer.")
    else:
        if not (name and name.strip() and area_pcode and pin and len(pin) >= 6):
            raise HTTPException(400, "New farmer: give the name, woreda and a temporary PIN of at least 6 digits.")
        if consent_method == "app":
            raise HTTPException(400, "A new farmer has no app account yet: record spoken or paper consent.")
        try:
            address = admin_areas.address_fields(conn, area_pcode)
        except LookupError:
            raise HTTPException(400, "Unknown woreda. Choose it from the list.") from None
        cols = ("phone", "name", "password_hash", "role", "language", *address)
        with conn:
            farmer_id = conn.execute(f"INSERT INTO users ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
                                     (phone, name.strip(), hash_password(pin), "farmer", language, *address.values())).lastrowid
            conn.execute("INSERT INTO farmer_profiles (user_id, kebele) VALUES (?, ?)", (farmer_id, kebele))
        consent.set_consent(conn, farmer_id, data=consent_data, alerts=consent_alerts, training=False, by=actor["id"],
                            method="abc_" + consent_method)
        created = True
    if enc:
        _check_duplicate_id(conn, org, farmer_id, enc[2])
    existing = conn.execute("SELECT status FROM abc_members WHERE org_id=? AND farmer_id=?", (org, farmer_id)).fetchone()
    status = "invited" if consent_method == "app" and (not existing or existing[0] != "active") else "active"
    now = _now()
    with conn:
        if existing:
            if existing[0] != "active" or status == "active":
                conn.execute("UPDATE abc_members SET status=?, joined_at=COALESCE(joined_at, ?) WHERE org_id=? AND farmer_id=?",
                             (status, now if status == "active" else None, org, farmer_id))
        else:
            conn.execute("""INSERT INTO abc_members (org_id, farmer_id, status, invited_by, invited_at, joined_at)
                            VALUES (?,?,?,?,?,?)""", (org, farmer_id, status, actor["id"], now, now if status == "active" else None))
        has = conn.execute("SELECT member_no FROM abc_member_details WHERE org_id=? AND farmer_id=?", (org, farmer_id)).fetchone()
        values = {"gender": gender, "age_group": age_group, "id_type": id_type if enc else None,
                  "consent_method": consent_method, "consent_recorded_by": actor["id"], "consent_recorded_at": now,
                  "consent_doc_id": consent_doc_id}
        if enc:
            values.update(id_encrypted=enc[0], id_last4=enc[1], id_hash=enc[2])
        if has:
            sets = {k: v for k, v in values.items() if v is not None or k in ("consent_doc_id",)}
            conn.execute(f"UPDATE abc_member_details SET {', '.join(f'{k}=?' for k in sets)} WHERE org_id=? AND farmer_id=?",
                         (*sets.values(), org, farmer_id))
        else:
            values.update(org_id=org, farmer_id=farmer_id, member_no=_next_member_no(conn, org), enrolled_at=now)
            conn.execute(f"INSERT INTO abc_member_details ({', '.join(values)}) VALUES ({', '.join('?' * len(values))})",
                         tuple(values.values()))
    audit.record(conn, actor_id=actor["id"], actor_role=actor["role"], action="abc.member.enrol", target_type="abc",
                 target_id=org, status=201,
                 detail={"before": {"status": existing[0]} if existing else None,
                         "after": {"farmer_id": farmer_id, "status": status, "consent_method": consent_method,
                                   "account_created": created, "id_recorded": bool(enc)}})
    return {"farmer_id": farmer_id, "status": status, "account_created": created}


def update_details(conn, ctx: core.AbcContext, actor: dict, farmer_id: int, changes: dict) -> dict:
    org = ctx.org["id"]
    row = conn.execute("SELECT gender, age_group, id_type, id_last4 FROM abc_member_details WHERE org_id=? AND farmer_id=?",
                       (org, farmer_id)).fetchone()
    if not row:
        raise HTTPException(404, "Member not found in this ABC's registry")
    before = dict(zip(("gender", "age_group", "id_type", "id_last4"), row))
    sets: dict = {}
    for key, allowed in (("gender", GENDERS), ("age_group", AGE_GROUPS), ("id_type", ID_TYPES)):
        if key in changes:
            if changes[key] is not None and changes[key] not in allowed:
                raise HTTPException(400, f"Unknown {key} '{changes[key]}'.")
            sets[key] = changes[key]
    if changes.get("id_number"):
        enc = encrypt_id(changes["id_number"])
        _check_duplicate_id(conn, org, farmer_id, enc[2])
        sets.update(id_encrypted=enc[0], id_last4=enc[1], id_hash=enc[2])
        if not (sets.get("id_type") or before["id_type"]):
            raise HTTPException(400, "Say which kind of ID this is.")
    if sets:
        with conn:
            conn.execute(f"UPDATE abc_member_details SET {', '.join(f'{k}=?' for k in sets)} WHERE org_id=? AND farmer_id=?",
                         (*sets.values(), org, farmer_id))
        after = {k: v for k, v in sets.items() if k not in ("id_encrypted", "id_hash")}
        audit.record(conn, actor_id=actor["id"], actor_role=actor["role"], action="abc.member.update", target_type="abc",
                     target_id=org, status=200, detail={"before": {"farmer_id": farmer_id, **before},
                                                        "after": {"farmer_id": farmer_id, **after}})
    return next(r for r in registry(conn, org) if r["farmer_id"] == farmer_id)


def view_id(conn, ctx: core.AbcContext, actor: dict, farmer_id: int, reason: str) -> dict:
    row = conn.execute("SELECT id_type, id_encrypted FROM abc_member_details WHERE org_id=? AND farmer_id=?",
                       (ctx.org["id"], farmer_id)).fetchone()
    if not row or not row[1]:
        raise HTTPException(404, "No ID number recorded for this member")
    number = decrypt_id(row[1])
    audit.record(conn, actor_id=actor["id"], actor_role=actor["role"], action="abc.member.id_view", target_type="abc",
                 target_id=ctx.org["id"], status=200, detail={"before": None, "after": {"farmer_id": farmer_id, "reason": reason}})
    return {"farmer_id": farmer_id, "id_type": row[0], "id_number": number}


def remove(conn, ctx: core.AbcContext, actor: dict, farmer_id: int, reason: str) -> None:
    """The member leaves the ABC (exit). Records stay for history; holders of shares cannot leave this way."""
    row = conn.execute("SELECT status FROM abc_members WHERE org_id=? AND farmer_id=?", (ctx.org["id"], farmer_id)).fetchone()
    if not row or row[0] == "declined":
        raise HTTPException(404, "Not a member of this ABC")
    held = conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='abc_share_ledger'").fetchone()
    if held and conn.execute("SELECT COALESCE(SUM(shares), 0) FROM abc_share_ledger WHERE org_id=? AND farmer_id=?",
                             (ctx.org["id"], farmer_id)).fetchone()[0] > 0:
        raise HTTPException(400, "This member holds shares: transfer them first (with board approval).")
    with conn:
        conn.execute("UPDATE abc_members SET status='declined' WHERE org_id=? AND farmer_id=?", (ctx.org["id"], farmer_id))
    audit.record(conn, actor_id=actor["id"], actor_role=actor["role"], action="abc.member.remove", target_type="abc",
                 target_id=ctx.org["id"], status=204,
                 detail={"before": {"farmer_id": farmer_id, "status": row[0]}, "after": {"status": "left", "reason": reason}})


# ── Bulk import ───────────────────────────────────────────────────────────────

def import_csv(conn, ctx: core.AbcContext, actor: dict, text: str, dry_run: bool) -> dict:
    reader = csv.DictReader(io.StringIO(text.lstrip("﻿")))
    header = [(h or "").strip().lower() for h in reader.fieldnames or []]
    if "phone" not in header:
        raise HTTPException(400, "The CSV needs at least a 'phone' column. Columns: " + ",".join(CSV_COLUMNS))
    seen_phones: dict[str, int] = {}
    seen_ids: dict[str, int] = {}
    report = {"rows": 0, "ok": 0, "new_accounts": 0, "already_members": 0, "errors": [], "dry_run": dry_run}
    members = {r[0] for r in conn.execute("SELECT u.phone FROM abc_members m JOIN users u ON u.id = m.farmer_id "
                                          "WHERE m.org_id=? AND m.status='active'", (ctx.org["id"],))}
    for line, raw in enumerate(reader, start=2):
        report["rows"] += 1
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw.items()}
        phone = row.get("phone", "")
        problems = []
        if not PHONE.fullmatch(phone):
            problems.append("phone must be 10 digits starting with 09 or 07")
        if phone in seen_phones:
            problems.append(f"same phone as line {seen_phones[phone]}")
        seen_phones.setdefault(phone, line)
        if row.get("id_number"):
            h = id_hash(row["id_number"])
            if h in seen_ids:
                problems.append(f"same ID number as line {seen_ids[h]}")
            seen_ids.setdefault(h, line)
            dup = conn.execute("SELECT farmer_id FROM abc_member_details WHERE org_id=? AND id_hash=?",
                               (ctx.org["id"], h)).fetchone()
            other = conn.execute("SELECT id FROM users WHERE phone=?", (phone,)).fetchone()
            if dup and (not other or dup[0] != other[0]):
                problems.append("ID number already registered for another member")
        for key, allowed in (("gender", GENDERS), ("age_group", AGE_GROUPS), ("id_type", ID_TYPES),
                             ("consent_method", ("spoken", "paper"))):
            if row.get(key) and row[key] not in allowed:
                problems.append(f"{key} must be one of: {', '.join(allowed)}")
        if not row.get("consent_method"):
            problems.append("consent_method is required (spoken or paper; app invitations are sent one by one)")
        exists = conn.execute("SELECT role FROM users WHERE phone=?", (phone,)).fetchone()
        if exists and exists[0] != "farmer":
            problems.append("phone belongs to an account that is not a farmer")
        if not exists and not (row.get("name") and row.get("woreda_pcode") and len(row.get("pin", "")) >= 6):
            problems.append("new farmer: name, woreda_pcode and a pin of at least 6 digits are required")
        if problems:
            report["errors"].append({"line": line, "phone": phone, "problems": problems})
            continue
        report["ok"] += 1
        report["new_accounts"] += 0 if exists else 1
        report["already_members"] += phone in members
        if not dry_run:
            try:
                enrol(conn, ctx, actor, phone=phone, name=row.get("name") or None, area_pcode=row.get("woreda_pcode") or None,
                      kebele=row.get("kebele") or None, pin=row.get("pin") or None, gender=row.get("gender") or None,
                      age_group=row.get("age_group") or None, id_type=row.get("id_type") or None,
                      id_number=row.get("id_number") or None, consent_method=row["consent_method"],
                      consent_doc_id=int(row["consent_doc_id"]) if row.get("consent_doc_id", "").isdigit() else None)
            except HTTPException as exc:
                report["ok"] -= 1
                report["errors"].append({"line": line, "phone": phone, "problems": [str(exc.detail)]})
    report["errors"] = report["errors"][:200]
    if not dry_run:
        audit.record(conn, actor_id=actor["id"], actor_role=actor["role"], action="abc.member.import", target_type="abc",
                     target_id=ctx.org["id"], status=200,
                     detail={"before": None, "after": {k: report[k] for k in ("rows", "ok", "new_accounts")}})
    return report


def inclusion(conn, org_id: int) -> dict:
    """Active members by gender and age group (counts only)."""
    out = {"total": 0, "gender": {}, "age_group": {}, "unknown_gender": 0, "unknown_age": 0}
    for g, a in conn.execute("""SELECT d.gender, d.age_group FROM abc_members m LEFT JOIN abc_member_details d
                                ON d.org_id = m.org_id AND d.farmer_id = m.farmer_id
                                WHERE m.org_id=? AND m.status='active'""", (org_id,)):
        out["total"] += 1
        if g:
            out["gender"][g] = out["gender"].get(g, 0) + 1
        else:
            out["unknown_gender"] += 1
        if a:
            out["age_group"][a] = out["age_group"].get(a, 0) + 1
        else:
            out["unknown_age"] += 1
    return out
