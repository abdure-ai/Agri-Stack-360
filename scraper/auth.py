"""
auth.py — Admin-only access for the sync service.

Accepts the same JWT access tokens the platform API (backend/) issues, signed
with the shared JWT_SECRET_KEY. The user's current role and active flag are
read from agri_platform.db (read-only), so a demoted or deactivated admin
loses access immediately rather than when their 24-hour token expires.
Access is the sync:manage permission from backend/permissions.py.
"""

import sqlite3
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from backend.permissions import P, has_permission
from scraper import config

bearer_scheme = HTTPBearer(auto_error=False)


def _lookup_user(user_id) -> Optional[dict]:
    uri = f"file:{config.PLATFORM_DB.as_posix()}?mode=ro"
    conn = sqlite3.connect(uri, uri=True, timeout=5)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            "SELECT id, name, role, is_active FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


async def require_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials:
        raise unauthorized
    try:
        payload = jwt.decode(credentials.credentials, config.JWT_SECRET_KEY,
                             algorithms=[config.JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise unauthorized
    if payload.get("type") != "access":
        raise unauthorized

    user = _lookup_user(user_id)
    if not user or not user["is_active"]:
        raise unauthorized
    if not has_permission(user["role"], P.SYNC_MANAGE):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Data sync is limited to admins")
    return user
