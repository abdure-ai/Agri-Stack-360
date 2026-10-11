"""
erasure.py — "Delete my data" requests (Personal Data Protection Proclamation 1321/2024), admin-reviewed.

A farmer asks for deletion in the app; an administrator approves or rejects it. Approving:
  * deletes farms (and their crop seasons and health reports), conversations and messages, alerts,
    escalations, the farmer profile, Telegram links and organisation memberships;
  * deletes photo-check images from disk and detaches the diagnoses (no farm, no point, no image),
    so national disease counts stay correct without pointing to anyone;
  * unlinks the person from Input Trust checks and fake reports (the checks stay as anonymous counts);
  * anonymises the account: name "Deleted user", phone "deleted-<id>", no password, inactive,
    and only the region kept (zone and woreda cleared).
The consent history and the audit log are kept as the legal record of what was agreed and done.
Retention periods are a legal decision (wording marked PLACEHOLDER_VERIFY).
"""

from __future__ import annotations

import secrets
import sqlite3
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UPLOADS = ROOT / "data" / "uploads"
POLICY_VERSION = "draft-2026-10-10 PLACEHOLDER_VERIFY legal review"

SCHEMA = """
CREATE TABLE IF NOT EXISTS erasure_requests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason       TEXT,
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
    decided_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    decision_note TEXT,
    created_at   TEXT NOT NULL,
    decided_at   TEXT,
    summary      TEXT                    -- what was deleted (counts only)
);
"""


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def _now() -> str:
    return datetime.now().isoformat(sep=" ", timespec="seconds")


def _table_exists(conn: sqlite3.Connection, name: str) -> bool:
    return conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone() is not None


def request(conn: sqlite3.Connection, user_id: int, reason: str | None) -> dict:
    if conn.execute("SELECT 1 FROM erasure_requests WHERE user_id=? AND status='pending'", (user_id,)).fetchone():
        raise ValueError("You already have a deletion request waiting for review.")
    with conn:
        cur = conn.execute("INSERT INTO erasure_requests (user_id, reason, created_at) VALUES (?,?,?)",
                           (user_id, (reason or "").strip()[:500] or None, _now()))
    return get(conn, cur.lastrowid)


def get(conn: sqlite3.Connection, request_id: int) -> dict | None:
    cur = conn.execute("SELECT * FROM erasure_requests WHERE id=?", (request_id,))
    row = cur.fetchone()
    return dict(zip([d[0] for d in cur.description], row)) if row else None


def erase(conn: sqlite3.Connection, user_id: int) -> dict:
    """Delete / anonymise one person's data (see the module docstring). Returns counts."""
    counts: dict[str, int] = {}

    def run(label: str, sql: str, params: tuple = (user_id,)) -> None:
        counts[label] = counts.get(label, 0) + conn.execute(sql, params).rowcount

    images = [r[0] for r in conn.execute("SELECT image_ref FROM diagnoses WHERE farmer_id=? AND image_ref IS NOT NULL",
                                         (user_id,))]
    from backend import training_data

    if _table_exists(conn, "training_images"):
        counts["training_photos"] = training_data.remove_farmer(conn, user_id)
    with conn:
        run("messages", """DELETE FROM messages WHERE conversation_id IN
                           (SELECT id FROM conversations WHERE user_id=? OR subject_farmer_id=?)""", (user_id, user_id))
        run("conversations", "DELETE FROM conversations WHERE user_id=? OR subject_farmer_id=?", (user_id, user_id))
        run("alerts", "DELETE FROM alerts WHERE farmer_id=?")
        run("escalations", "DELETE FROM escalations WHERE farmer_id=?")
        run("health_reports", "DELETE FROM health_reports WHERE user_id=? OR farm_id IN (SELECT id FROM farms WHERE user_id=?)",
            (user_id, user_id))
        run("diagnoses_detached", """UPDATE diagnoses SET farm_id=NULL, crop_season_id=NULL, latitude=NULL,
                                     longitude=NULL, image_ref=NULL, ecological_input=NULL WHERE farmer_id=?""")
        run("crop_seasons", "DELETE FROM crop_seasons WHERE farm_id IN (SELECT id FROM farms WHERE user_id=?)")
        run("farms", "DELETE FROM farms WHERE user_id=?")
        run("farmer_profile", "DELETE FROM farmer_profiles WHERE user_id=?")
        conn.execute("UPDATE farmer_profiles SET assigned_da_id=NULL WHERE assigned_da_id=?", (user_id,))
        for table, sql in (
            ("telegram_links", "DELETE FROM telegram_links WHERE user_id=?"),
            ("credit_requests", "DELETE FROM credit_requests WHERE farmer_id=?"),
            ("organisation_members", "DELETE FROM organisation_members WHERE user_id=?"),
            ("verifications", "UPDATE verifications SET user_id=NULL WHERE user_id=?"),
            ("fake_reports", "UPDATE fake_reports SET user_id=NULL WHERE user_id=?"),
        ):
            if _table_exists(conn, table):
                run(table, sql)
        conn.execute(
            """UPDATE users SET name='Deleted user', phone=?, password_hash=?, is_active=0, zone=NULL, woreda=NULL,
                                zone_pcode=NULL, woreda_pcode=NULL, last_login=NULL WHERE id=?""",
            (f"deleted-{user_id}", "!" + secrets.token_hex(16), user_id))
    removed = 0
    for ref in images:
        path = (UPLOADS / ref).resolve()
        if UPLOADS.resolve() in path.parents and path.exists():
            path.unlink()
            removed += 1
    counts["photos"] = removed
    return {k: v for k, v in counts.items() if v}


def decide(conn: sqlite3.Connection, request_id: int, *, approve: bool, admin_id: int, note: str | None) -> dict:
    import json

    req = get(conn, request_id)
    if not req:
        raise LookupError("Request not found")
    if req["status"] != "pending":
        raise ValueError(f"This request is already {req['status']}.")
    summary = erase(conn, req["user_id"]) if approve else None
    with conn:
        conn.execute("""UPDATE erasure_requests SET status=?, decided_by=?, decision_note=?, decided_at=?, summary=?
                        WHERE id=?""", ("approved" if approve else "rejected", admin_id, (note or "").strip() or None,
                                        _now(), json.dumps(summary) if summary is not None else None, request_id))
    return get(conn, request_id)
