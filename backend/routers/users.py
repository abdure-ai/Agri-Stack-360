"""
routers/users.py — User profile and farms CRUD.
"""

from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from backend import admin_areas, consent, erasure
from backend.platform_db import get_platform_connection, pquery, pquery_one, pexecute
from backend.auth import get_current_user, require_permission, user_payload
from backend.access import farm_for_edit, farm_for_read, visible_farms
from backend.permissions import P, has_permission

router = APIRouter(prefix="/users", tags=["users"])

FARM_STATUSES = ("healthy", "warning", "critical")


class ProfileUpdate(BaseModel):
    name: str | None = None
    region: str | None = None
    zone: str | None = None
    woreda: str | None = None
    language: str | None = None
    area_pcode: str | None = None   # woreda (or zone/region) P-code; fills region/zone/woreda


class ConsentUpdate(BaseModel):
    data: bool | None = None      # extension agents may see my farms, diagnoses and questions
    alerts: bool | None = None    # the platform may send me alerts and reminders
    training: bool | None = None  # my crop photos may be kept to improve the disease check


class FarmIn(BaseModel):
    field_name: str
    crop_name: str
    variety: str | None = None
    area_ha: float | None = None
    planted_date: str | None = None
    status: str = "healthy"
    notes: str | None = None


@router.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    return user_payload(user, extra=("created_at", "last_login"))


@router.put("/profile")
async def update_profile(req: ProfileUpdate, user: dict = Depends(require_permission(P.PROFILE_MANAGE))):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if "language" in updates and updates["language"] not in ("en", "am", "om", "ti"):
        raise HTTPException(400, "Language must be one of: en, am, om, ti")
    if "area_pcode" in updates:
        try:
            updates.update(admin_areas.address_fields(get_platform_connection(), updates.pop("area_pcode")))
        except LookupError:
            raise HTTPException(400, "Unknown address. Choose your region, zone and woreda from the lists.")
    elif "region" in updates:
        # A region typed by hand no longer matches the stored P-codes.
        updates.update(region_pcode=None, zone_pcode=None, woreda_pcode=None)
    if not updates:
        raise HTTPException(400, "Nothing to update")
    # An agent's region decides whose farms they can see, so only an admin may move them.
    region_scoped = has_permission(user["role"], P.FARMS_READ_REGION) and not has_permission(user["role"], P.FARMS_MANAGE_ALL)
    if region_scoped and "region" in updates and updates["region"] != user.get("region"):
        raise HTTPException(403, "Your region decides which farms you support. Ask an administrator to change it.")
    set_clause = ", ".join(f"{k}=?" for k in updates)
    pexecute(f"UPDATE users SET {set_clause} WHERE id=?", (*updates.values(), user["id"]))
    return user_payload(pquery_one("SELECT * FROM users WHERE id=?", (user["id"],)))


@router.get("/consent")
async def get_consent(user: dict = Depends(require_permission(P.PROFILE_MANAGE))):
    return consent.get_consent(get_platform_connection(), user["id"])


@router.put("/consent")
async def update_consent(req: ConsentUpdate, user: dict = Depends(require_permission(P.PROFILE_MANAGE))):
    """The signed-in person changes their own consent; nobody else can do it here."""
    if req.data is None and req.alerts is None and req.training is None:
        raise HTTPException(400, "Nothing to update")
    return consent.set_consent(get_platform_connection(), user["id"], data=req.data, alerts=req.alerts,
                               training=req.training, by=user["id"], method="self")


@router.get("/my-data")
async def my_data(user: dict = Depends(require_permission(P.PROFILE_MANAGE))):
    """Everything stored about the signed-in person (data-subject access, Proclamation 1321/2024)."""
    return consent.export_my_data(get_platform_connection(), user["id"])


class EraseRequest(BaseModel):
    reason: str | None = Field(None, max_length=500)


def _no_admin(user: dict) -> None:
    if has_permission(user["role"], P.USERS_MANAGE):
        raise HTTPException(400, "Administrator accounts cannot be deleted this way. Ask another administrator.")


@router.get("/my-data/erase-request")
async def my_erase_request(user: dict = Depends(require_permission(P.PROFILE_MANAGE))):
    return pquery_one("SELECT id, status, reason, created_at, decided_at, decision_note FROM erasure_requests "
                      "WHERE user_id=? ORDER BY id DESC LIMIT 1", (user["id"],))


@router.post("/my-data/erase-request", status_code=201)
async def ask_erasure(req: EraseRequest, user: dict = Depends(require_permission(P.PROFILE_MANAGE))):
    """Ask for all my data to be deleted; an administrator reviews the request."""
    _no_admin(user)
    try:
        return erasure.request(get_platform_connection(), user["id"], req.reason)
    except ValueError as e:
        raise HTTPException(409, str(e))


@router.post("/my-data/erase-request/cancel")
async def cancel_erasure(user: dict = Depends(require_permission(P.PROFILE_MANAGE))):
    conn = get_platform_connection()
    with conn:
        n = conn.execute("UPDATE erasure_requests SET status='cancelled' WHERE user_id=? AND status='pending'",
                         (user["id"],)).rowcount
    if not n:
        raise HTTPException(404, "No pending request")
    return {"status": "cancelled"}


@router.get("/farms")
async def list_farms(
    user: dict = Depends(require_permission(P.FARMS_MANAGE_OWN, P.FARMS_READ_REGION, P.FARMS_MANAGE_ALL)),
):
    """Own farms for farmers, farms in their region for agents, every farm for admins."""
    return visible_farms(user)


def _validate(req: FarmIn) -> None:
    if req.status not in FARM_STATUSES:
        raise HTTPException(400, "status must be healthy, warning, or critical")
    if not req.field_name.strip() or not req.crop_name.strip():
        raise HTTPException(400, "Field name and crop are required")
    if req.area_ha is not None and req.area_ha <= 0:
        raise HTTPException(400, "Area must be a positive number of hectares")


@router.post("/farms", status_code=201)
async def add_farm(req: FarmIn, user: dict = Depends(require_permission(P.FARMS_MANAGE_OWN, P.FARMS_MANAGE_ALL))):
    _validate(req)
    farm_id = pexecute(
        "INSERT INTO farms (user_id, field_name, crop_name, variety, area_ha, planted_date, status, notes) VALUES (?,?,?,?,?,?,?,?)",
        (user["id"], req.field_name, req.crop_name, req.variety, req.area_ha, req.planted_date, req.status, req.notes),
    )
    return pquery_one("SELECT * FROM farms WHERE id=?", (farm_id,))


@router.put("/farms/{farm_id}")
async def update_farm(farm_id: int, req: FarmIn, user: dict = Depends(get_current_user)):
    farm_for_edit(user, farm_id)
    _validate(req)
    pexecute(
        "UPDATE farms SET field_name=?, crop_name=?, variety=?, area_ha=?, planted_date=?, status=?, notes=? WHERE id=?",
        (req.field_name, req.crop_name, req.variety, req.area_ha, req.planted_date, req.status, req.notes, farm_id),
    )
    return pquery_one("SELECT * FROM farms WHERE id=?", (farm_id,))


@router.delete("/farms/{farm_id}", status_code=204)
async def delete_farm(farm_id: int, user: dict = Depends(get_current_user)):
    farm_for_edit(user, farm_id)
    pexecute("DELETE FROM farms WHERE id=?", (farm_id,))


# ── Crop seasons on a farm (what is planted when; drives the crop calendar) ──────

class SeasonIn(BaseModel):
    crop: str = Field(..., min_length=2, max_length=40)
    variety: str | None = Field(None, max_length=60)
    planting_date: date
    season: Literal["meher", "belg", "irrigated"]
    expected_harvest_date: date | None = None
    status: Literal["active", "harvested", "failed"] = "active"


def _check_season(req: SeasonIn) -> None:
    today = date.today()
    if not today - timedelta(days=400) <= req.planting_date <= today + timedelta(days=90):
        raise HTTPException(400, "Planting date must be within the last 400 days or the next 90 days.")
    if req.expected_harvest_date and req.expected_harvest_date <= req.planting_date:
        raise HTTPException(400, "Expected harvest must be after planting.")


def _other_active(farm_id: int, season_id: int | None = None) -> bool:
    return pquery_one("SELECT id FROM crop_seasons WHERE farm_id=? AND status='active' AND id != ?",
                      (farm_id, season_id or 0)) is not None


def _sync_farm(farm_id: int, req: SeasonIn) -> None:
    """Keep the farm's summary fields (shown on older screens) in step with its active season."""
    if req.status == "active":
        pexecute("UPDATE farms SET crop_name=?, variety=?, planted_date=?, irrigated=? WHERE id=?",
                 (req.crop.strip().lower(), req.variety, req.planting_date.isoformat(),
                  int(req.season == "irrigated"), farm_id))


@router.get("/farms/{farm_id}/seasons")
async def list_seasons(farm_id: int, user: dict = Depends(get_current_user)):
    farm_for_read(user, farm_id)
    return pquery("SELECT * FROM crop_seasons WHERE farm_id=? ORDER BY planting_date DESC", (farm_id,))


@router.post("/farms/{farm_id}/seasons", status_code=201)
async def add_season(farm_id: int, req: SeasonIn, user: dict = Depends(get_current_user)):
    farm_for_edit(user, farm_id)
    _check_season(req)
    if req.status == "active" and _other_active(farm_id):
        raise HTTPException(409, "This field already has a crop growing. Mark it harvested first.")
    season_id = pexecute(
        "INSERT INTO crop_seasons (farm_id, crop, variety, planting_date, season, expected_harvest_date, status) "
        "VALUES (?,?,?,?,?,?,?)",
        (farm_id, req.crop.strip().lower(), req.variety, req.planting_date.isoformat(), req.season,
         req.expected_harvest_date.isoformat() if req.expected_harvest_date else None, req.status))
    _sync_farm(farm_id, req)
    return pquery_one("SELECT * FROM crop_seasons WHERE id=?", (season_id,))


def _season_for_edit(user: dict, farm_id: int, season_id: int) -> None:
    farm_for_edit(user, farm_id)
    if not pquery_one("SELECT id FROM crop_seasons WHERE id=? AND farm_id=?", (season_id, farm_id)):
        raise HTTPException(404, "Season not found")


@router.put("/farms/{farm_id}/seasons/{season_id}")
async def update_season(farm_id: int, season_id: int, req: SeasonIn, user: dict = Depends(get_current_user)):
    _season_for_edit(user, farm_id, season_id)
    _check_season(req)
    if req.status == "active" and _other_active(farm_id, season_id):
        raise HTTPException(409, "This field already has a crop growing. Mark it harvested first.")
    pexecute(
        "UPDATE crop_seasons SET crop=?, variety=?, planting_date=?, season=?, expected_harvest_date=?, status=? "
        "WHERE id=?",
        (req.crop.strip().lower(), req.variety, req.planting_date.isoformat(), req.season,
         req.expected_harvest_date.isoformat() if req.expected_harvest_date else None, req.status, season_id))
    _sync_farm(farm_id, req)
    return pquery_one("SELECT * FROM crop_seasons WHERE id=?", (season_id,))


@router.delete("/farms/{farm_id}/seasons/{season_id}", status_code=204)
async def delete_season(farm_id: int, season_id: int, user: dict = Depends(get_current_user)):
    _season_for_edit(user, farm_id, season_id)
    pexecute("DELETE FROM crop_seasons WHERE id=?", (season_id,))
