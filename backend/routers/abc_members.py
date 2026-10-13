"""
routers/abc_members.py — ABC member registry (milestone A3; rules in backend/abc_members.py).

People with a role in the ABC (per-company check; admins may act for any ABC):
  GET  /api/abc/registry?org_id=                  members with details (ID masked), consent, plot totals  (view)
  GET  /api/abc/registry/inclusion                active members by gender and age group (counts)          (view)
  POST /api/abc/registry                          enrol: link a farmer by phone or create the account        (members)
  PUT  /api/abc/registry/{farmer_id}              gender, age group, ID type / number                       (members)
  GET  /api/abc/registry/{farmer_id}/plots        the member's farms                                         (view)
  POST /api/abc/registry/{farmer_id}/id           {reason}: show the full ID number once (audited)           (members)
  POST /api/abc/registry/{farmer_id}/remove       {reason}: the member leaves (records kept)                 (members)
  GET  /api/abc/registry/template.csv             import columns                                             (members)
  POST /api/abc/registry/import?dry_run=true      CSV bulk import: check first, then import                  (members)
"""

from __future__ import annotations

import asyncio
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from backend import abc_company as core
from backend import abc_members as mem
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection

router = APIRouter(tags=["abc-members"])
_signed = require_permission(P.PROFILE_MANAGE)     # platform gate; the per-ABC role check follows

Gender = Literal["female", "male"]
AgeGroup = Literal["15-29", "30-44", "45-59", "60+"]
IdType = Literal["fayda", "kebele_id", "other"]


@router.get("/abc/registry")
async def registry(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return {"members": mem.registry(conn, ctx.org["id"]), "can_edit": ctx.can("members"),
            "official_record_note": core.OFFICIAL_RECORD_NOTE}


@router.get("/abc/registry/inclusion")
async def inclusion(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return mem.inclusion(conn, ctx.org["id"])


class EnrolIn(BaseModel):
    phone: str = Field(..., min_length=10, max_length=10)
    name: str | None = Field(None, max_length=120)
    area_pcode: str | None = None
    kebele: str | None = Field(None, max_length=120)
    language: Literal["en", "am", "om", "ti"] = "am"
    pin: str | None = Field(None, min_length=6, max_length=64, description="Temporary password for a new account")
    gender: Gender | None = None
    age_group: AgeGroup | None = None
    id_type: IdType | None = None
    id_number: str | None = Field(None, max_length=60)
    consent_method: Literal["app", "spoken", "paper"]
    consent_doc_id: int | None = None
    consent_data: bool = True
    consent_alerts: bool = True


@router.post("/abc/registry", status_code=201)
async def enrol(req: EnrolIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "members")
    return mem.enrol(conn, ctx, user, **req.model_dump())


class DetailsIn(BaseModel):
    gender: Gender | None = None
    age_group: AgeGroup | None = None
    id_type: IdType | None = None
    id_number: str | None = Field(None, max_length=60)


@router.put("/abc/registry/{farmer_id}")
async def update(farmer_id: int, req: DetailsIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "members")
    return mem.update_details(conn, ctx, user, farmer_id, req.model_dump(exclude_unset=True))


@router.get("/abc/registry/template.csv")
async def template(org_id: int | None = None, user: dict = Depends(_signed)):
    core.abc_for(get_platform_connection(), user, org_id, "members")
    return Response(",".join(mem.CSV_COLUMNS) + "\n", media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="abc-members-template.csv"'})


@router.get("/abc/registry/{farmer_id}/plots")
async def plots(farmer_id: int, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return mem.member_plots(conn, ctx.org["id"], farmer_id)


class IdViewIn(BaseModel):
    reason: str = Field(..., min_length=5, max_length=300)


@router.post("/abc/registry/{farmer_id}/id")
async def view_id(farmer_id: int, req: IdViewIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "members")
    return mem.view_id(conn, ctx, user, farmer_id, req.reason.strip())


@router.post("/abc/registry/import")
async def import_members(dry_run: bool = True, file: UploadFile = File(...), org_id: int | None = None,
                         user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "members")
    data = await file.read(5 * 1024 * 1024 + 1)
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(413, "The file is larger than 5 MB.")
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(400, "Save the file as CSV (UTF-8).") from None
    return await asyncio.to_thread(mem.import_csv, conn, ctx, user, text, dry_run)


class RemoveIn(BaseModel):
    reason: str = Field(..., min_length=3, max_length=300)


@router.post("/abc/registry/{farmer_id}/remove", status_code=204)
async def remove(farmer_id: int, req: RemoveIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "members")
    mem.remove(conn, ctx, user, farmer_id, req.reason.strip())
