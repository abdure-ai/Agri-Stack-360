"""
ai_keys.py — Pool of Gemini API keys managed by administrators.

Admins add keys on the "AI API Keys" page; they are stored encrypted in
agri_platform.db. Every Gemini call goes through `call_gemini(fn)`, which uses the
first usable key (lowest priority number) and moves on to the next one when a key
  * runs out of quota  -> cooled down until Gemini says it resets (retryDelay),
  * is rate limited    -> cooled down for the seconds Gemini asks,
  * is rejected        -> marked invalid until an admin tests or resets it.
The GEMINI_API_KEY in .env stays as a last fallback so existing setups keep working.

Keys are encrypted with a key derived from AI_KEYS_SECRET (or JWT_SECRET_KEY);
the full key is never sent back to the browser, only its last 4 characters.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import re
import sqlite3
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable, TypeVar

from cryptography.fernet import Fernet, InvalidToken

from backend.advisory.config import env, offline
from backend.advisory.providers import ProviderError
from backend.platform_db import DB_PATH

log = logging.getLogger(__name__)
T = TypeVar("T")

SCHEMA = """
CREATE TABLE IF NOT EXISTS ai_api_keys (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    provider        TEXT    NOT NULL DEFAULT 'gemini',
    label           TEXT    NOT NULL,
    key_encrypted   TEXT    NOT NULL,
    key_hash        TEXT    NOT NULL UNIQUE,     -- sha256, to refuse duplicates without decrypting
    key_last4       TEXT    NOT NULL,
    priority        INTEGER NOT NULL DEFAULT 100, -- lower is tried first
    enabled         INTEGER NOT NULL DEFAULT 1,
    status          TEXT    NOT NULL DEFAULT 'unknown', -- unknown | ok | quota | rate_limited | invalid | error
    cooldown_until  TEXT,                         -- UTC ISO time; skipped until then
    last_error      TEXT,
    last_used_at    TEXT,
    uses_today      INTEGER NOT NULL DEFAULT 0,
    usage_date      TEXT,
    created_by      INTEGER,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
"""

QUOTA = ("RESOURCE_EXHAUSTED", "quota")
TRANSIENT = ("503", "UNAVAILABLE", "overloaded", "DEADLINE")
INVALID = ("API_KEY_INVALID", "API key not valid", "PERMISSION_DENIED", "API_KEY_SERVICE_BLOCKED",
           "401", "403", "UNAUTHENTICATED")
MAX_WAIT_SECONDS = 30.0          # wait for a key that frees up this soon instead of failing
DEFAULT_DAILY_COOLDOWN = timedelta(hours=6)
_RETRY_DELAY_RE = re.compile(r"retryDelay['\"]?\s*[:=]\s*['\"]?(\d+(?:\.\d+)?)s")
ENV_KEY_ID = 0                   # the .env fallback key

# Cooldown of the .env key lives in memory (it has no database row).
_env_state: dict[str, object] = {"cooldown_until": None, "status": "unknown", "last_error": None}
_lock = threading.Lock()


# ── Storage ──────────────────────────────────────────────────────────────────

def _connect() -> sqlite3.Connection:
    """A short-lived connection: calls come from worker threads."""
    c = sqlite3.connect(str(DB_PATH), timeout=10)
    c.row_factory = sqlite3.Row
    return c


def ensure_schema(conn: sqlite3.Connection | None = None) -> None:
    c = conn or _connect()
    c.executescript(SCHEMA)
    c.commit()


def _fernet() -> Fernet:
    secret = env("AI_KEYS_SECRET") or env("JWT_SECRET_KEY")
    if not secret:
        raise ProviderError("Set AI_KEYS_SECRET (or JWT_SECRET_KEY) to store API keys.")
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest()))


def key_hash(api_key: str) -> str:
    return hashlib.sha256(api_key.strip().encode()).hexdigest()


def encrypt(api_key: str) -> str:
    return _fernet().encrypt(api_key.strip().encode()).decode()


def decrypt(token: str) -> str:
    return _fernet().decrypt(token.encode()).decode()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat(timespec="seconds") if dt else None


def _parse(ts: str | None) -> datetime | None:
    if not ts:
        return None
    dt = datetime.fromisoformat(ts)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


# ── Error classification ─────────────────────────────────────────────────────

@dataclass
class Failure:
    kind: str                     # quota | rate_limited | invalid | transient | other
    cooldown: timedelta | None
    message: str


def classify(error: Exception | str) -> Failure:
    msg = str(error)
    short = msg[:300]
    if any(q in msg for q in QUOTA):
        m = _RETRY_DELAY_RE.search(msg)
        delay = timedelta(seconds=float(m.group(1)) + 1) if m else None
        if "PerMinute" in msg or "per minute" in msg.lower():
            return Failure("rate_limited", delay or timedelta(seconds=60), short)
        # Daily (or unknown-period) quota: wait for the reset Gemini reports.
        return Failure("quota", delay or DEFAULT_DAILY_COOLDOWN, short)
    if any(s in msg for s in INVALID):
        return Failure("invalid", None, short)
    if any(s in msg for s in TRANSIENT):
        return Failure("transient", None, short)
    return Failure("other", None, short)


# ── Pool ─────────────────────────────────────────────────────────────────────

@dataclass
class PoolKey:
    id: int                       # 0 = .env fallback
    label: str
    api_key: str


def _env_key() -> str | None:
    k = env("GEMINI_API_KEY")
    return k.strip() if k else None


def usable_keys(now: datetime | None = None) -> tuple[list[PoolKey], datetime | None]:
    """Keys to try now, best first, and the soonest time a cooled-down key frees up."""
    now = now or _now()
    soonest: datetime | None = None
    keys: list[PoolKey] = []
    stored_hashes: set[str] = set()
    c = _connect()
    try:
        ensure_schema(c)
        rows = c.execute(
            "SELECT * FROM ai_api_keys WHERE provider='gemini' AND enabled=1 ORDER BY priority, id").fetchall()
        for r in rows:
            stored_hashes.add(r["key_hash"])
            if r["status"] == "invalid":
                continue
            until = _parse(r["cooldown_until"])
            if until and until > now:
                soonest = until if soonest is None or until < soonest else soonest
                continue
            try:
                keys.append(PoolKey(r["id"], r["label"], decrypt(r["key_encrypted"])))
            except InvalidToken:
                c.execute("UPDATE ai_api_keys SET status='invalid', last_error=? WHERE id=?",
                          ("Cannot decrypt: AI_KEYS_SECRET / JWT_SECRET_KEY changed. Delete and add the key again.",
                           r["id"]))
                c.commit()
    finally:
        c.close()
    env_key = _env_key()
    if env_key and key_hash(env_key) not in stored_hashes and _env_state["status"] != "invalid":
        until = _env_state["cooldown_until"]
        if isinstance(until, datetime) and until > now:
            soonest = until if soonest is None or until < soonest else soonest
        else:
            keys.append(PoolKey(ENV_KEY_ID, ".env GEMINI_API_KEY", env_key))
    return keys, soonest


def _record(key_id: int, *, status: str, cooldown: timedelta | None = None, error: str | None = None,
            used: bool = False) -> None:
    now = _now()
    until = now + cooldown if cooldown else None
    if key_id == ENV_KEY_ID:
        with _lock:
            _env_state.update(status=status, cooldown_until=until, last_error=error)
        return
    c = _connect()
    try:
        if used:
            today = now.date().isoformat()
            c.execute(
                """UPDATE ai_api_keys SET status=?, cooldown_until=NULL, last_error=NULL, last_used_at=?,
                          uses_today = CASE WHEN usage_date=? THEN uses_today + 1 ELSE 1 END, usage_date=?
                   WHERE id=?""", (status, _iso(now), today, today, key_id))
        else:
            c.execute("UPDATE ai_api_keys SET status=?, cooldown_until=?, last_error=? WHERE id=?",
                      (status, _iso(until), error, key_id))
        c.commit()
    finally:
        c.close()


def env_key_state() -> dict:
    """Status of the .env fallback key, for the admin page."""
    env_key = _env_key()
    if not env_key:
        return {"configured": False}
    until = _env_state["cooldown_until"]
    return {"configured": True, "key_last4": env_key[-4:], "status": _env_state["status"],
            "cooldown_until": _iso(until) if isinstance(until, datetime) else None,
            "last_error": _env_state["last_error"]}


def reset_env_key() -> None:
    with _lock:
        _env_state.update(status="unknown", cooldown_until=None, last_error=None)


def call_with_key(api_key: str, fn: Callable[[object], T]) -> T:
    from google import genai

    return fn(genai.Client(api_key=api_key))


def call_gemini(fn: Callable[[object], T], *, sleep: Callable[[float], None] = time.sleep,
                transient_retries: int = 2, _waited: bool = False) -> T:
    """Run fn(client) with the first usable key, rotating past exhausted or rejected keys."""
    if offline():
        raise ProviderError("Offline mode: Gemini is not called.")
    keys, soonest = usable_keys()
    last: Failure | None = None
    for k in keys:
        for attempt in range(transient_retries + 1):
            try:
                result = call_with_key(k.api_key, fn)
            except Exception as e:  # the SDK raises several error types
                f = classify(e)
                last = f
                if f.kind == "transient" and attempt < transient_retries:
                    sleep(1.5 * (attempt + 1))
                    continue
                if f.kind in ("quota", "rate_limited"):
                    log.warning("Gemini key %s (%s) %s; trying the next key", k.id, k.label, f.kind)
                    _record(k.id, status=f.kind, cooldown=f.cooldown, error=f.message)
                    soonest = min(filter(None, [soonest, _now() + f.cooldown]))
                    break
                if f.kind == "invalid":
                    log.warning("Gemini key %s (%s) rejected; trying the next key", k.id, k.label)
                    _record(k.id, status="invalid", error=f.message)
                    break
                # Overloaded after retries, or an error that another key would not fix.
                _record(k.id, status="error", error=f.message)
                raise ProviderError(f"Gemini request failed: {f.message}") from e
            else:
                _record(k.id, status="ok", used=True)
                return result
    # Every key is cooling down: wait once if one frees up within seconds (per-minute limits).
    if soonest and not _waited:
        wait = (soonest - _now()).total_seconds()
        if 0 < wait <= MAX_WAIT_SECONDS:
            log.warning("All Gemini keys are rate limited; waiting %.0f s", wait)
            sleep(wait)
            return call_gemini(fn, sleep=sleep, transient_retries=transient_retries, _waited=True)
    if not keys and soonest is None:
        raise ProviderError("No Gemini API key is available. Add one on the AI API Keys admin page.")
    when = f" The first key frees up at {soonest.astimezone().strftime('%H:%M')}." if soonest else ""
    kind = last.kind if last else "quota"
    raise ProviderError(f"Gemini quota exhausted on every key ({kind}).{when}")
