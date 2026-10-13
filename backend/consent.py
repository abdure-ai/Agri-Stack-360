"""
consent.py — Farmer consent records (Personal Data Protection Proclamation No. 1321/2024).

Three separate consents, all off until the farmer (or their DA, with the farmer's spoken
agreement) turns them on:

  data      — extension agents may see this farmer's farms, diagnoses and questions
  alerts    — the platform may send alerts and reminders (outbreaks, follow-ups)
  training  — crop photos may be kept in the training dataset to improve the disease model;
              withdrawing removes this farmer's photos from the dataset (backend/training_data.py)

The current state lives on farmer_profiles; every change is also written to the
append-only consent_events table, so the history can be shown and audited.
"""

from __future__ import annotations

import sqlite3

# The wording shown to farmers is a draft until legal review; the version is stored with
# every consent so we know which text the farmer agreed to.
CONSENT_TEXT_VERSION = "draft-2026-10-09 PLACEHOLDER_VERIFY legal review"
METHODS = ("self", "da_verbal", "admin", "abc_spoken", "abc_paper")


def get_consent(conn: sqlite3.Connection, user_id: int) -> dict:
    row = conn.execute(
        "SELECT consent_data, consent_alerts, consent_recorded_at, consent_training FROM farmer_profiles WHERE user_id=?",
        (user_id,)).fetchone()
    history = conn.execute(
        """SELECT e.kind, e.granted, e.method, e.text_version, e.created_at, u.name AS recorded_by_name,
                  e.recorded_by
           FROM consent_events e LEFT JOIN users u ON u.id = e.recorded_by
           WHERE e.user_id=? ORDER BY e.id DESC""", (user_id,)).fetchall()
    return {
        "data": bool(row[0]) if row else False,
        "alerts": bool(row[1]) if row else False,
        "training": bool(row[3]) if row else False,
        "recorded_at": row[2] if row else None,
        "text_version": CONSENT_TEXT_VERSION,
        "history": [
            {"kind": h[0], "granted": bool(h[1]), "method": h[2], "text_version": h[3], "created_at": h[4],
             "recorded_by": None if h[6] == user_id else h[5]}
            for h in history
        ],
    }


def set_consent(conn: sqlite3.Connection, user_id: int, *, data: bool | None = None, alerts: bool | None = None,
                training: bool | None = None, by: int, method: str = "self") -> dict:
    """Change one or both consents; only real changes are written to the history."""
    if method not in METHODS:
        raise ValueError(f"Unknown consent method: {method}")
    current = get_consent(conn, user_id)
    changes = {k: v for k, v in (("data", data), ("alerts", alerts), ("training", training))
               if v is not None and v != current[k]}
    with conn:
        conn.execute("INSERT OR IGNORE INTO farmer_profiles (user_id) VALUES (?)", (user_id,))
        for kind, granted in changes.items():
            conn.execute(f"UPDATE farmer_profiles SET consent_{kind}=?, consent_recorded_at=CURRENT_TIMESTAMP, "
                         "updated_at=CURRENT_TIMESTAMP WHERE user_id=?", (int(granted), user_id))
            conn.execute("INSERT INTO consent_events (user_id, kind, granted, recorded_by, method, text_version) "
                         "VALUES (?,?,?,?,?,?)", (user_id, kind, int(granted), by, method, CONSENT_TEXT_VERSION))
    if changes.get("training") is False:
        from backend import training_data

        training_data.remove_farmer(conn, user_id)
    return get_consent(conn, user_id)


def has_training_consent(conn: sqlite3.Connection, user_id: int) -> bool:
    row = conn.execute("SELECT consent_training FROM farmer_profiles WHERE user_id=?", (user_id,)).fetchone()
    return bool(row and row[0])


def has_data_consent(conn: sqlite3.Connection, user_id: int) -> bool:
    row = conn.execute("SELECT consent_data FROM farmer_profiles WHERE user_id=?", (user_id,)).fetchone()
    return bool(row and row[0])


def _rows(conn: sqlite3.Connection, sql: str, params: tuple) -> list[dict]:
    cur = conn.execute(sql, params)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def export_my_data(conn: sqlite3.Connection, user_id: int) -> dict:
    """Everything the platform stores about this person (data-subject access request)."""
    user = _rows(conn, "SELECT * FROM users WHERE id=?", (user_id,))
    for u in user:
        u.pop("password_hash", None)
    farm_ids = "(SELECT id FROM farms WHERE user_id=?)"
    conv_ids = "(SELECT id FROM conversations WHERE user_id=? OR subject_farmer_id=?)"
    return {
        "account": user[0] if user else None,
        "farmer_profile": next(iter(_rows(conn, "SELECT * FROM farmer_profiles WHERE user_id=?", (user_id,))), None),
        "consent_history": _rows(conn, "SELECT kind, granted, method, text_version, created_at FROM consent_events "
                                       "WHERE user_id=? ORDER BY id", (user_id,)),
        "farms": _rows(conn, "SELECT * FROM farms WHERE user_id=?", (user_id,)),
        "crop_seasons": _rows(conn, f"SELECT * FROM crop_seasons WHERE farm_id IN {farm_ids}", (user_id,)),
        "health_reports": _rows(conn, "SELECT * FROM health_reports WHERE user_id=?", (user_id,)),
        "diagnoses": _rows(conn, "SELECT id, farm_id, disease_key, confidence, verified_disease, outcome, "
                                 "follow_up_date, created_at FROM diagnoses WHERE farmer_id=?", (user_id,)),
        "questions": _rows(conn, f"SELECT conversation_id, question, language, answer, created_at FROM messages "
                                 f"WHERE conversation_id IN {conv_ids} ORDER BY id", (user_id, user_id)),
        "alerts": _rows(conn, "SELECT type, message_key, payload, status, created_at FROM alerts WHERE farmer_id=?",
                        (user_id,)),
        "training_photos": _rows(conn, "SELECT id, capture_source, crop, model_label, status, created_at FROM training_images "
                                       "WHERE farmer_id=?", (user_id,)) if conn.execute(
            "SELECT 1 FROM sqlite_master WHERE name='training_images'").fetchone() else [],
    }
