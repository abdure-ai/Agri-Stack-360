"""
routers/auth_router.py — Registration, login, token refresh, profile.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from backend import admin_areas, consent
from backend.platform_db import get_platform_connection, pquery_one, pexecute
from backend.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    get_current_user, user_payload,
)
from backend.permissions import SELF_REGISTER_ROLES

router = APIRouter(prefix="/auth", tags=["auth"])

REGIONS = ["Oromia", "Amhara", "SNNP", "Sidama", "South West", "Tigray"]
# Interface languages (frontend src/i18n): English, Amharic, Afaan Oromoo, Tigrinya.
LANGUAGES = ("en", "am", "om", "ti")


class RegisterRequest(BaseModel):
    phone: str
    name: str
    password: str
    role: str = "farmer"
    region: str | None = None
    zone: str | None = None
    woreda: str | None = None
    area_pcode: str | None = None   # woreda (or zone/region) P-code; fills region/zone/woreda
    language: str | None = None     # interface language chosen before signing up: en / am / om / ti
    consent_data: bool = False      # extension agents may see my data (off unless ticked)
    consent_alerts: bool = False    # send me alerts and reminders (off unless ticked)
    consent_training: bool = False  # keep my crop photos to improve the disease check (off unless ticked)


class LoginRequest(BaseModel):
    phone: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(req: RegisterRequest):
    # Agent and admin accounts carry access to other people's data, so they are
    # granted by an admin after sign-up, never chosen on the public form.
    if req.role not in SELF_REGISTER_ROLES:
        raise HTTPException(
            403,
            f"You can sign up as: {', '.join(SELF_REGISTER_ROLES)}. "
            "Extension agent accounts are set up by an administrator.",
        )
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if not req.phone.strip():
        raise HTTPException(400, "Phone number is required")

    existing = pquery_one("SELECT id FROM users WHERE phone=?", (req.phone,))
    if existing:
        raise HTTPException(409, "Phone number already registered")

    address = {"region": req.region, "zone": req.zone, "woreda": req.woreda}
    if req.area_pcode:
        try:
            address = admin_areas.address_fields(get_platform_connection(), req.area_pcode)
        except LookupError:
            raise HTTPException(400, "Unknown address. Choose your region, zone and woreda from the lists.")
    language = req.language if req.language in LANGUAGES else "en"
    cols = ("phone", "name", "password_hash", "role", "language", *address)
    user_id = pexecute(
        f"INSERT INTO users ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
        (req.phone, req.name, hash_password(req.password), req.role, language, *address.values()),
    )

    if req.consent_data or req.consent_alerts or req.consent_training:
        consent.set_consent(get_platform_connection(), user_id, data=req.consent_data, alerts=req.consent_alerts,
                            training=req.consent_training, by=user_id, method="self")

    user = pquery_one("SELECT * FROM users WHERE id=?", (user_id,))
    token_data = {"sub": user_id, "role": user["role"]}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=user_payload(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    user = pquery_one("SELECT * FROM users WHERE phone=?", (req.phone,))
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid phone or password")
    if not user["is_active"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")

    pexecute("UPDATE users SET last_login=CURRENT_TIMESTAMP WHERE id=?", (user["id"],))

    token_data = {"sub": user["id"], "role": user["role"]}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=user_payload(user),
    )


@router.post("/refresh")
async def refresh(req: RefreshRequest):
    try:
        from jose import JWTError
        payload = decode_token(req.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid refresh token")
        user_id = payload.get("sub")
        user = pquery_one("SELECT id, role, is_active FROM users WHERE id=?", (user_id,))
        if not user or not user["is_active"]:
            raise HTTPException(401, "User not found or inactive")
        token_data = {"sub": user["id"], "role": user["role"]}
        return {"access_token": create_access_token(token_data), "token_type": "bearer"}
    except Exception:
        raise HTTPException(401, "Invalid or expired refresh token")


@router.get("/demo-accounts")
async def demo_accounts():
    """Demo deployment only (DEMO_MODE=1): one-tap demo sign-ins for the sign-in page. Never the admin."""
    from backend import demo
    from backend.platform_db import get_platform_connection

    accounts = demo.listed_accounts(get_platform_connection())
    return {"enabled": bool(accounts), "accounts": accounts}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """Current user and permissions. The frontend calls this on load, so role
    changes made by an admin show up without signing out."""
    return user_payload(user, extra=("created_at",))
