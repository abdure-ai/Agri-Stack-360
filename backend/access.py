"""
access.py — Record-level access checks that need the database.

Role permissions (backend/permissions.py) decide what a user may do; these
helpers load a record and decide whether this user may touch *that* record.
They raise 404 for a missing record and 403 when access is denied.
"""

from fastapi import HTTPException

from backend import audit
from backend.consent import has_data_consent
from backend.permissions import P, can_edit_farm, can_read_farm, has_permission
from backend.platform_db import get_platform_connection, pquery, pquery_one

NO_CONSENT = "This farmer has not agreed to share their data with extension agents."


def _needs_consent(user: dict, owner_id: int) -> bool:
    """Agents see another farmer's data only with that farmer's data consent; admins and owners always."""
    return owner_id != user["id"] and not has_permission(user["role"], P.FARMS_MANAGE_ALL)


def load_farm(farm_id: int) -> dict:
    """Farm row plus its owner's region (`owner_region`); 404 if missing."""
    farm = pquery_one(
        "SELECT f.*, u.region AS owner_region, u.name AS owner_name "
        "FROM farms f JOIN users u ON u.id = f.user_id WHERE f.id = ?",
        (farm_id,),
    )
    if not farm:
        raise HTTPException(404, "Farm not found")
    return farm


def farm_for_read(user: dict, farm_id: int) -> dict:
    farm = load_farm(farm_id)
    if not can_read_farm(user, farm, farm["owner_region"]):
        raise HTTPException(403, "You do not have access to this farm.")
    if _needs_consent(user, farm["user_id"]) and not has_data_consent(get_platform_connection(), farm["user_id"]):
        raise HTTPException(403, NO_CONSENT)
    audit.record_read(get_platform_connection(), user, farm["user_id"])
    return farm


def farm_for_edit(user: dict, farm_id: int) -> dict:
    farm = load_farm(farm_id)
    if not can_edit_farm(user, farm):
        raise HTTPException(403, "You can only change your own farms.")
    return farm


def visible_farms(user: dict) -> list[dict]:
    """Farms this user may see: all (admin), own region with the owner's data consent (agent) or own."""
    role = user["role"]
    if has_permission(role, P.FARMS_MANAGE_ALL):
        return pquery(
            "SELECT f.*, u.name AS owner_name, u.region AS owner_region "
            "FROM farms f JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC"
        )
    if has_permission(role, P.FARMS_READ_REGION):
        if not user.get("region"):
            return []
        return pquery(
            "SELECT f.*, u.name AS owner_name, u.region AS owner_region "
            "FROM farms f JOIN users u ON u.id = f.user_id "
            "LEFT JOIN farmer_profiles p ON p.user_id = u.id "
            "WHERE u.region = ? AND (u.id = ? OR p.consent_data = 1) ORDER BY f.created_at DESC",
            (user["region"], user["id"]),
        )
    return pquery(
        "SELECT f.*, u.name AS owner_name, u.region AS owner_region "
        "FROM farms f JOIN users u ON u.id = f.user_id "
        "WHERE f.user_id = ? ORDER BY f.created_at DESC",
        (user["id"],),
    )


def farmer_for_read(user: dict, farmer_id: int) -> dict:
    """A farmer's user row, if `user` may see that farmer's advisory data.

    Allowed: the farmer themself, admins, and extension agents assigned to the
    farmer or working in the farmer's region (same rule as farm records), when
    the farmer has given data consent.
    """
    farmer = pquery_one(
        "SELECT u.id, u.name, u.role, u.region, u.region_pcode, p.assigned_da_id "
        "FROM users u LEFT JOIN farmer_profiles p ON p.user_id = u.id WHERE u.id = ?",
        (farmer_id,),
    )
    if not farmer:
        raise HTTPException(404, "Farmer not found")
    role = user["role"]
    if farmer["id"] == user["id"]:
        return farmer
    if has_permission(role, P.FARMS_MANAGE_ALL):
        audit.record_read(get_platform_connection(), user, farmer["id"])
        return farmer
    if has_permission(role, P.FARMS_READ_REGION):
        same_region = (
            (user.get("region_pcode") and user.get("region_pcode") == farmer["region_pcode"])
            or (user.get("region") and user.get("region") == farmer["region"])
        )
        if farmer["assigned_da_id"] == user["id"] or same_region:
            if not has_data_consent(get_platform_connection(), farmer["id"]):
                raise HTTPException(403, NO_CONSENT)
            audit.record_read(get_platform_connection(), user, farmer["id"])
            return farmer
    raise HTTPException(403, "You do not have access to this farmer.")
