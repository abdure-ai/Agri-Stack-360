"""
routers/admin.py — Admin-only user management and platform statistics.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend import admin_areas, erasure
from backend.platform_db import get_platform_connection, pquery, pquery_one, pexecute
from backend.auth import hash_password, require_permission
from backend.permissions import (
    P, PERMISSION_INFO, ROLE_DESCRIPTIONS, ROLES, SELF_REGISTER_ROLES, has_permission, sorted_permissions,
)
from backend.routers.auth_router import REGIONS

router = APIRouter(prefix="/admin", tags=["admin"])

_stats_dep = require_permission(P.PLATFORM_STATS)
_users_dep = require_permission(P.USERS_MANAGE)


class RoleUpdate(BaseModel):
    role: str


class ActiveUpdate(BaseModel):
    is_active: bool


class RegionUpdate(BaseModel):
    region: str | None = None


class UserUpdate(BaseModel):
    """Any subset of a user's editable fields; omitted fields stay as they are."""
    name: str | None = None
    role: str | None = None
    region: str | None = None
    zone: str | None = None
    woreda: str | None = None
    language: str | None = None
    is_active: bool | None = None
    area_pcode: str | None = None   # woreda (or zone/region) P-code; fills region/zone/woreda


class PasswordReset(BaseModel):
    new_password: str


LANGUAGES = ("en", "am", "om", "ti")


def _other_active_admins(user_id: int) -> int:
    """Active users, other than `user_id`, who can still manage users."""
    rows = pquery("SELECT role FROM users WHERE is_active=1 AND id != ?", (user_id,))
    return sum(1 for r in rows if has_permission(r["role"], P.USERS_MANAGE))


@router.get("/stats")
async def platform_stats(_user=Depends(_stats_dep)):
    users_by_role = pquery("SELECT role, COUNT(*) as count FROM users GROUP BY role")
    total_users = pquery_one("SELECT COUNT(*) as cnt FROM users")
    total_farms = pquery_one("SELECT COUNT(*) as cnt FROM farms")
    open_reports = pquery_one("SELECT COUNT(*) as cnt FROM health_reports WHERE resolved=0")
    resolved_reports = pquery_one("SELECT COUNT(*) as cnt FROM health_reports WHERE resolved=1")
    return {
        "total_users": total_users["cnt"] if total_users else 0,
        "users_by_role": {r["role"]: r["count"] for r in users_by_role},
        "total_farms": total_farms["cnt"] if total_farms else 0,
        "open_health_reports": open_reports["cnt"] if open_reports else 0,
        "resolved_health_reports": resolved_reports["cnt"] if resolved_reports else 0,
    }


@router.get("/roles")
async def list_roles(_user=Depends(_users_dep)):
    """Each role, what it is for, how many users hold it and the permissions it grants."""
    counts = {
        r["role"]: (r["total"], r["active"])
        for r in pquery("SELECT role, COUNT(*) AS total, SUM(is_active) AS active FROM users GROUP BY role")
    }
    return [
        {
            "role": role,
            "description": ROLE_DESCRIPTIONS[role],
            "self_register": role in SELF_REGISTER_ROLES,
            "user_count": counts.get(role, (0, 0))[0],
            "active_count": counts.get(role, (0, 0))[1] or 0,
            "permissions": sorted_permissions(role),
        }
        for role in ROLES
    ]


@router.get("/permissions")
async def list_permissions(_user=Depends(_users_dep)):
    """Every permission with its area, plain-language text and the roles that hold it."""
    return [
        {
            "name": perm,
            "area": area,
            "label": label,
            "description": description,
            "roles": [role for role in ROLES if has_permission(role, perm)],
        }
        for perm, (area, label, description) in PERMISSION_INFO.items()
    ]


_USER_FIELDS = """
    u.id, u.phone, u.name, u.role, u.region, u.zone, u.woreda, u.language, u.is_active,
    u.region_pcode, u.zone_pcode, u.woreda_pcode,
    u.created_at, u.last_login, COUNT(f.id) AS farm_count,
    (SELECT p.assigned_da_id FROM farmer_profiles p WHERE p.user_id = u.id) AS assigned_da_id
"""


def _load_user(user_id: int) -> dict:
    target = pquery_one(
        f"SELECT {_USER_FIELDS} FROM users u LEFT JOIN farms f ON f.user_id = u.id WHERE u.id = ? GROUP BY u.id",
        (user_id,),
    )
    if not target:
        raise HTTPException(404, "User not found")
    return target


# ── Safety rules shared by every endpoint that changes a user ─────────────────

def _check_role_change(target: dict, new_role: str, current_user: dict) -> None:
    if new_role not in ROLES:
        raise HTTPException(400, f"Invalid role: {new_role}. Must be one of: {', '.join(ROLES)}")
    if new_role == target["role"]:
        return
    if target["id"] == current_user["id"]:
        raise HTTPException(400, "You cannot change your own role. Ask another administrator.")
    losing_admin = has_permission(target["role"], P.USERS_MANAGE) and not has_permission(new_role, P.USERS_MANAGE)
    if losing_admin and target["is_active"] and _other_active_admins(target["id"]) == 0:
        raise HTTPException(409, "This is the last active administrator. Make someone else an admin first.")


def _check_active_change(target: dict, is_active: bool, current_user: dict) -> None:
    if is_active or not target["is_active"]:
        return
    if target["id"] == current_user["id"]:
        raise HTTPException(400, "You cannot deactivate your own account.")
    if has_permission(target["role"], P.USERS_MANAGE) and _other_active_admins(target["id"]) == 0:
        raise HTTPException(409, "This is the last active administrator and cannot be deactivated.")


def _check_region(region: str | None) -> None:
    if region is not None and region not in REGIONS:
        raise HTTPException(400, f"Invalid region. Must be one of: {', '.join(REGIONS)}")


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(_user=Depends(_users_dep)):
    return pquery(
        f"SELECT {_USER_FIELDS} FROM users u LEFT JOIN farms f ON f.user_id = u.id "
        "GROUP BY u.id ORDER BY u.created_at DESC"
    )


@router.put("/users/{user_id}")
async def update_user(user_id: int, req: UserUpdate, current_user=Depends(_users_dep)):
    """Change any of a user's details in one step. All checks run before anything is saved."""
    target = _load_user(user_id)
    changes = req.model_dump(exclude_unset=True)

    if "name" in changes:
        changes["name"] = (changes["name"] or "").strip()
        if not changes["name"]:
            raise HTTPException(400, "Name cannot be empty.")
    for field in ("zone", "woreda"):
        if field in changes:
            changes[field] = (changes[field] or "").strip() or None
    if changes.get("area_pcode"):
        try:
            changes.update(admin_areas.address_fields(get_platform_connection(), changes.pop("area_pcode")))
        except LookupError:
            raise HTTPException(400, "Unknown area. Choose the region, zone and woreda from the lists.")
    else:
        changes.pop("area_pcode", None)
        if "region" in changes:
            changes["region"] = changes["region"] or None
            _check_region(changes["region"])
            # A region typed by hand no longer matches the stored P-codes.
            changes.update(region_pcode=None, zone_pcode=None, woreda_pcode=None)
    if "language" in changes and changes["language"] not in LANGUAGES:
        raise HTTPException(400, f"Language must be one of: {', '.join(LANGUAGES)}")
    if changes.get("role") is not None:
        _check_role_change(target, changes["role"], current_user)
    else:
        changes.pop("role", None)
    if changes.get("is_active") is not None:
        _check_active_change(target, changes["is_active"], current_user)
        changes["is_active"] = 1 if changes["is_active"] else 0
    else:
        changes.pop("is_active", None)

    if changes:
        # Column names come from the UserUpdate model, never from the request body.
        set_clause = ", ".join(f"{k}=?" for k in changes)
        pexecute(f"UPDATE users SET {set_clause} WHERE id=?", (*changes.values(), user_id))
    return _load_user(user_id)


@router.post("/users/{user_id}/password")
async def reset_password(user_id: int, req: PasswordReset, _user=Depends(_users_dep)):
    """Set a new password for someone who has forgotten theirs."""
    _load_user(user_id)
    if len(req.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")
    pexecute("UPDATE users SET password_hash=? WHERE id=?", (hash_password(req.new_password), user_id))
    return {"user_id": user_id, "password_reset": True}


@router.put("/users/{user_id}/role")
async def change_role(user_id: int, req: RoleUpdate, current_user=Depends(_users_dep)):
    target = _load_user(user_id)
    _check_role_change(target, req.role, current_user)
    pexecute("UPDATE users SET role=? WHERE id=?", (req.role, user_id))
    return {"user_id": user_id, "role": req.role, "permissions": sorted_permissions(req.role)}


@router.put("/users/{user_id}/active")
async def set_active(user_id: int, req: ActiveUpdate, current_user=Depends(_users_dep)):
    target = _load_user(user_id)
    if user_id == current_user["id"] and not req.is_active:
        raise HTTPException(400, "You cannot deactivate your own account.")
    _check_active_change(target, req.is_active, current_user)
    pexecute("UPDATE users SET is_active=? WHERE id=?", (1 if req.is_active else 0, user_id))
    return {"user_id": user_id, "is_active": req.is_active}


class DaAssignment(BaseModel):
    da_id: int | None = None      # None removes the assignment


@router.put("/users/{user_id}/da")
async def assign_da(user_id: int, req: DaAssignment, _user=Depends(_users_dep)):
    """Assign a farmer's Development Agent (receives their escalations, sees them first in the visit list)."""
    target = _load_user(user_id)
    if target["role"] != "farmer":
        raise HTTPException(400, "Only farmers have a Development Agent.")
    if req.da_id is not None:
        da = pquery_one("SELECT role, is_active FROM users WHERE id=?", (req.da_id,))
        if not da or not has_permission(da["role"], P.DA_WORK) or da["role"] == "admin" or not da["is_active"]:
            raise HTTPException(400, "Choose an active extension agent.")
    conn = get_platform_connection()
    with conn:
        conn.execute("INSERT OR IGNORE INTO farmer_profiles (user_id) VALUES (?)", (user_id,))
        conn.execute("UPDATE farmer_profiles SET assigned_da_id=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
                     (req.da_id, user_id))
    return {"user_id": user_id, "assigned_da_id": req.da_id}


@router.put("/users/{user_id}/region")
async def set_region(user_id: int, req: RegionUpdate, _user=Depends(_users_dep)):
    """Agents cannot move themselves (their region decides whose farms they see),
    so an admin assigns it here."""
    _check_region(req.region)
    target = _load_user(user_id)
    if req.region == target["region"]:
        return {"user_id": user_id, "region": req.region}
    # A different region invalidates the stored zone/woreda P-codes.
    pexecute("UPDATE users SET region=?, region_pcode=NULL, zone_pcode=NULL, woreda_pcode=NULL WHERE id=?",
             (req.region, user_id))
    return {"user_id": user_id, "region": req.region}


# ── "Delete my data" requests ──────────────────────────────────────────────────

class ErasureDecision(BaseModel):
    note: str | None = None


@router.get("/erasure-requests")
async def erasure_requests(status: str = "pending", _user=Depends(_users_dep)):
    return pquery("""SELECT e.*, u.name, u.phone, u.role, u.woreda, d.name AS decided_by_name
                     FROM erasure_requests e JOIN users u ON u.id = e.user_id
                     LEFT JOIN users d ON d.id = e.decided_by
                     WHERE e.status = ? ORDER BY e.id""", (status,))


def _decide(request_id: int, approve: bool, req: ErasureDecision, admin: dict) -> dict:
    r = erasure.get(get_platform_connection(), request_id)
    if not r:
        raise HTTPException(404, "Request not found")
    if r["user_id"] == admin["id"]:
        raise HTTPException(400, "You cannot decide on your own request.")
    try:
        return erasure.decide(get_platform_connection(), request_id, approve=approve, admin_id=admin["id"], note=req.note)
    except ValueError as e:
        raise HTTPException(409, str(e))


@router.post("/erasure-requests/{request_id}/approve")
async def approve_erasure(request_id: int, req: ErasureDecision, user=Depends(_users_dep)):
    """Deletes / anonymises the person's data now (see backend/erasure.py). Cannot be undone."""
    return _decide(request_id, True, req, user)


@router.post("/erasure-requests/{request_id}/reject")
async def reject_erasure(request_id: int, req: ErasureDecision, user=Depends(_users_dep)):
    return _decide(request_id, False, req, user)
