"""
auth.py — JWT helpers and FastAPI auth dependencies.

Usage:
  from backend.auth import get_current_user, require_permission, create_access_token
  from backend.permissions import P

  @router.get("/thing")
  async def thing(user: dict = Depends(require_permission(P.INPUTS_READ))): ...
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from backend.permissions import ALL_PERMISSIONS, has_permission, sorted_permissions
from backend.platform_db import pquery_one

# ── Config ────────────────────────────────────────────────────────────────────

def _load_secret() -> str:
    key = os.environ.get("JWT_SECRET_KEY")
    if key:
        return key
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    try:
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("JWT_SECRET_KEY="):
                    return line.split("=", 1)[1].strip()
    except FileNotFoundError:
        pass
    return "changeme-insecure-default-key"

SECRET_KEY = _load_secret()
ALGORITHM = "HS256"
ACCESS_EXPIRE_MINUTES = 60 * 24      # 24 hours
REFRESH_EXPIRE_DAYS = 7

bearer_scheme = HTTPBearer(auto_error=False)


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── Token creation ────────────────────────────────────────────────────────────

def _claims(data: dict) -> dict:
    payload = data.copy()
    # JWT requires "sub" to be a string; python-jose rejects tokens otherwise.
    if "sub" in payload:
        payload["sub"] = str(payload["sub"])
    return payload


def create_access_token(data: dict) -> str:
    payload = _claims(data)
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRE_MINUTES)
    payload["type"] = "access"
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    payload = _claims(data)
    payload["exp"] = datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRE_DAYS)
    payload["type"] = "refresh"
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


# ── FastAPI Dependencies ──────────────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    """Decode JWT, fetch user row, raise 401 if anything is wrong."""
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials:
        raise exc
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise exc
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise exc

    user = pquery_one("SELECT * FROM users WHERE id = ? AND is_active = 1", (user_id,))
    if not user:
        raise exc
    return user


def require_permission(*perms: str):
    """
    Return a Depends that allows the request when the user's role holds at
    least one of `perms` (see backend/permissions.py), otherwise 403.
    """
    unknown = set(perms) - ALL_PERMISSIONS
    if unknown:
        raise ValueError(f"Unknown permission(s): {sorted(unknown)}")

    async def _check(user: dict = Depends(get_current_user)) -> dict:
        if not has_permission(user["role"], *perms):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this feature.",
            )
        return user
    return _check


PUBLIC_USER_FIELDS = ("id", "name", "phone", "role", "region", "zone", "woreda", "language",
                      "region_pcode", "zone_pcode", "woreda_pcode")


def user_payload(user: dict, extra: tuple[str, ...] = ()) -> dict:
    """User fields safe to send to the browser, plus their permissions."""
    out = {k: user.get(k) for k in PUBLIC_USER_FIELDS + extra}
    out["permissions"] = sorted_permissions(user.get("role"))
    if user.get("id"):
        # Roles inside ABCs (per company, any platform role: a farmer can be a board member). "abc:member"
        # only shows the ABC screens; every ABC request is checked per company on the server.
        from backend import abc_company
        from backend.platform_db import get_platform_connection

        try:
            out["abc_companies"] = abc_company.my_abcs(get_platform_connection(), user)
        except Exception:      # table not created yet (first start)
            out["abc_companies"] = []
        if out["abc_companies"]:
            out["permissions"] = sorted({*out["permissions"], "abc:member"})
    return out


def require_role(*roles: str):
    """Return a Depends that raises 403 if user's role is not in roles.

    Prefer require_permission(); this remains for callers that truly mean a role.
    """
    async def _check(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access requires one of: {', '.join(roles)}",
            )
        return user
    return _check
