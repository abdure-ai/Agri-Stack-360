"""
routers/ai_keys_admin.py — Manage the Gemini API keys the platform rotates through.

  GET    /api/admin/ai-keys            list keys (masked) + the .env fallback
  POST   /api/admin/ai-keys            add a key
  PATCH  /api/admin/ai-keys/{id}       rename, enable/disable, change priority
  POST   /api/admin/ai-keys/{id}/test  send one tiny request with this key
  POST   /api/admin/ai-keys/{id}/reset clear its cooldown / invalid mark
  DELETE /api/admin/ai-keys/{id}       remove it
  POST   /api/admin/ai-keys/env/reset  clear the .env key's cooldown

The full key is accepted on create only and never returned.
"""

from __future__ import annotations

import asyncio
import sqlite3

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend import ai_keys
from backend.advisory.config import env
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection, pquery, pquery_one

router = APIRouter(prefix="/admin/ai-keys", tags=["ai-keys"])
_admin = require_permission(P.ADVISORY_ADMIN)

FIELDS = """id, label, key_last4, priority, enabled, status, cooldown_until, last_error, last_used_at,
            uses_today, usage_date, created_at"""
TEST_MODEL_DEFAULT = "gemini-3.6-flash"


def _out(row: dict) -> dict:
    row = dict(row)
    row["enabled"] = bool(row["enabled"])
    if row.get("usage_date") != ai_keys._now().date().isoformat():
        row["uses_today"] = 0
    return row


def _load(key_id: int) -> dict:
    row = pquery_one(f"SELECT {FIELDS} FROM ai_api_keys WHERE id=?", (key_id,))
    if not row:
        raise HTTPException(404, "Key not found")
    return row


@router.get("")
async def list_keys(_user=Depends(_admin)):
    keys = [_out(r) for r in pquery(f"SELECT {FIELDS} FROM ai_api_keys WHERE provider='gemini' ORDER BY priority, id")]
    usable, soonest = await asyncio.to_thread(ai_keys.usable_keys)
    return {
        "keys": keys,
        "env_key": ai_keys.env_key_state(),
        "usable_now": len(usable),
        "next_available_at": ai_keys._iso(soonest),
        "model": env("ADVISORY_LLM_MODEL", TEST_MODEL_DEFAULT),
    }


class KeyCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=80)
    api_key: str = Field(..., min_length=20, max_length=300)
    priority: int | None = Field(None, ge=0, le=10000)


@router.post("", status_code=201)
async def add_key(req: KeyCreate, user=Depends(_admin)):
    api_key = req.api_key.strip()
    if any(ch.isspace() for ch in api_key):
        raise HTTPException(400, "The key must not contain spaces or line breaks.")
    conn = get_platform_connection()
    if req.priority is None:
        row = conn.execute("SELECT COALESCE(MAX(priority), 0) FROM ai_api_keys").fetchone()
        priority = int(row[0]) + 10
    else:
        priority = req.priority
    try:
        with conn:
            cur = conn.execute(
                """INSERT INTO ai_api_keys (label, key_encrypted, key_hash, key_last4, priority, created_by)
                   VALUES (?,?,?,?,?,?)""",
                (req.label.strip(), ai_keys.encrypt(api_key), ai_keys.key_hash(api_key), api_key[-4:], priority,
                 user["id"]))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "This key has already been added.")
    return _out(_load(cur.lastrowid))


class KeyUpdate(BaseModel):
    label: str | None = Field(None, min_length=1, max_length=80)
    enabled: bool | None = None
    priority: int | None = Field(None, ge=0, le=10000)


@router.patch("/{key_id}")
async def update_key(key_id: int, req: KeyUpdate, _user=Depends(_admin)):
    _load(key_id)
    changes = req.model_dump(exclude_unset=True, exclude_none=True)
    if "enabled" in changes:
        changes["enabled"] = 1 if changes["enabled"] else 0
    if "label" in changes:
        changes["label"] = changes["label"].strip()
    if changes:
        conn = get_platform_connection()
        with conn:
            # Column names come from KeyUpdate, never from the request body.
            conn.execute(f"UPDATE ai_api_keys SET {', '.join(f'{k}=?' for k in changes)} WHERE id=?",
                         (*changes.values(), key_id))
    return _out(_load(key_id))


# Declared before /{key_id}/... so 'env' is not parsed as a key id.
@router.post("/env/reset")
async def reset_env_key(_user=Depends(_admin)):
    ai_keys.reset_env_key()
    return ai_keys.env_key_state()


@router.post("/{key_id}/reset")
async def reset_key(key_id: int, _user=Depends(_admin)):
    _load(key_id)
    conn = get_platform_connection()
    with conn:
        conn.execute("UPDATE ai_api_keys SET status='unknown', cooldown_until=NULL, last_error=NULL WHERE id=?",
                     (key_id,))
    return _out(_load(key_id))


@router.post("/{key_id}/test")
async def test_key(key_id: int, _user=Depends(_admin)):
    """One tiny request with this key only; updates its status. Uses one request of its quota."""
    row = pquery_one("SELECT key_encrypted FROM ai_api_keys WHERE id=?", (key_id,))
    if not row:
        raise HTTPException(404, "Key not found")
    try:
        api_key = ai_keys.decrypt(row["key_encrypted"])
    except Exception:
        raise HTTPException(409, "The key cannot be decrypted (the server secret changed). Delete it and add it again.")
    model = env("ADVISORY_LLM_MODEL", TEST_MODEL_DEFAULT)
    try:
        await asyncio.to_thread(ai_keys.call_with_key, api_key,
                                lambda c: c.models.generate_content(model=model, contents="Reply with the word OK."))
    except Exception as e:
        f = ai_keys.classify(e)
        status = f.kind if f.kind in ("quota", "rate_limited", "invalid") else "error"
        ai_keys._record(key_id, status=status, cooldown=f.cooldown, error=f.message)
        return {"ok": False, "status": status, "message": f.message, "key": _out(_load(key_id))}
    ai_keys._record(key_id, status="ok", used=True)
    return {"ok": True, "status": "ok", "message": None, "key": _out(_load(key_id))}


@router.delete("/{key_id}", status_code=204)
async def delete_key(key_id: int, _user=Depends(_admin)):
    _load(key_id)
    conn = get_platform_connection()
    with conn:
        conn.execute("DELETE FROM ai_api_keys WHERE id=?", (key_id,))
