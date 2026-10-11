"""
audit.py — Audit log of administrative actions and access to farmers' data.

Two sources:
  * AuditMiddleware records every change request (POST/PUT/PATCH/DELETE) under the audited
    prefixes (admin, advisory admin, DA Copilot, supplier portal): who, which route, which record, the result.
    Request bodies are never stored, so passwords and API keys cannot end up in the log.
  * record_read() is called when someone opens another person's farmer data (DA or admin);
    repeated reads of the same farmer by the same person are logged once per 10 minutes.

Only ids, roles, route templates and status codes are stored (no names, phones or content).
"""

from __future__ import annotations

import json
import logging
import sqlite3
from datetime import datetime, timedelta

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

log = logging.getLogger(__name__)

AUDITED_PREFIXES = ("/api/admin", "/api/advisory/admin", "/api/da", "/api/supplier", "/api/review", "/api/dealer", "/api/abc", "/api/trade", "/api/estate", "/api/regulator", "/api/ngo", "/api/credit")
CHANGE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
READ_THROTTLE = timedelta(minutes=10)

SCHEMA = """
CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id    INTEGER,
    actor_role  TEXT,
    action      TEXT NOT NULL,          -- 'PUT /api/admin/users/{user_id}/role' or 'farmer_data.read'
    target_type TEXT,
    target_id   TEXT,
    status      INTEGER,                -- HTTP status for requests
    detail      TEXT,                   -- small JSON, never request bodies
    created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_audit_time ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS ix_audit_actor ON audit_log(actor_id, created_at);
"""


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def _now() -> str:
    return datetime.now().isoformat(sep=" ", timespec="seconds")


def record(conn: sqlite3.Connection, *, actor_id: int | None, actor_role: str | None, action: str,
           target_type: str | None = None, target_id: str | int | None = None, status: int | None = None,
           detail: dict | None = None) -> None:
    try:
        with conn:
            conn.execute(
                """INSERT INTO audit_log (actor_id, actor_role, action, target_type, target_id, status, detail, created_at)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (actor_id, actor_role, action, target_type, None if target_id is None else str(target_id), status,
                 json.dumps(detail) if detail else None, _now()))
    except sqlite3.Error:
        log.exception("audit log write failed")      # never break the request because of the log


def record_read(conn: sqlite3.Connection, user: dict, farmer_id: int, what: str = "farmer_data") -> None:
    """Someone opened another person's farmer data. Throttled per actor + farmer."""
    if user.get("id") == farmer_id:
        return
    since = (datetime.now() - READ_THROTTLE).isoformat(sep=" ", timespec="seconds")
    try:
        seen = conn.execute(
            "SELECT 1 FROM audit_log WHERE actor_id=? AND action=? AND target_id=? AND created_at>=? LIMIT 1",
            (user.get("id"), f"{what}.read", str(farmer_id), since)).fetchone()
    except sqlite3.Error:
        return
    if not seen:
        record(conn, actor_id=user.get("id"), actor_role=user.get("role"), action=f"{what}.read",
               target_type="farmer", target_id=farmer_id)


def _actor(request: Request) -> tuple[int | None, str | None]:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return None, None
    try:
        from backend.auth import decode_token

        payload = decode_token(auth.split(" ", 1)[1])
        return int(payload.get("sub")), payload.get("role")
    except Exception:
        return None, None


class AuditMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, conn_factory):
        super().__init__(app)
        self.conn_factory = conn_factory

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if request.method in CHANGE_METHODS and path.startswith(AUDITED_PREFIXES):
            route = request.scope.get("route")
            template = getattr(route, "path", path)
            params = request.scope.get("path_params") or {}
            target_key = next(iter(params), None)
            actor_id, role = _actor(request)
            record(self.conn_factory(), actor_id=actor_id, actor_role=role, action=f"{request.method} {template}",
                   target_type=target_key, target_id=params.get(target_key) if target_key else None,
                   status=response.status_code)
        return response
