"""
routers/website.py — Public website content (backend/website.py): the partner list and logos.

Public (the landing page):
  GET /api/site/partners                 partners shown on the website, in order: [{id, name, logo_url}]
  GET /api/site/partners/{id}/logo       the logo (PNG); the ?v= in logo_url changes with each new logo
Admins (site:manage):
  GET    /api/admin/partners             all partners, hidden ones too
  POST   /api/admin/partners             form: name, logo (optional file)
  PATCH  /api/admin/partners/{id}        {"name": ..., "active": true|false}
  POST   /api/admin/partners/{id}/logo   form: logo (file) — replaces the logo
  DELETE /api/admin/partners/{id}/logo   remove the logo (the name is shown instead)
  PUT    /api/admin/partners/order       {"ids": [3, 1, 2]}
  DELETE /api/admin/partners/{id}
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend import website
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection

router = APIRouter(tags=["website"])
_manage = require_permission(P.SITE_MANAGE)


@router.get("/site/partners")
async def public_partners():
    return website.list_partners(get_platform_connection(), public=True)


@router.get("/site/partners/{partner_id}/logo")
async def partner_logo(partner_id: int):
    path = website.logo_file(get_platform_connection(), partner_id)
    if not path:
        raise HTTPException(404, "No logo")
    # The address carries ?v=<hash of the file>, so a new logo gets a new address.
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": "public, max-age=31536000, immutable"})


async def _read_logo(logo: UploadFile | None) -> bytes | None:
    if logo is None or not logo.filename:
        return None
    return await logo.read(website.MAX_LOGO_BYTES + 1)


@router.get("/admin/partners")
async def admin_list(_user=Depends(_manage)):
    return website.list_partners(get_platform_connection(), public=False)


@router.post("/admin/partners", status_code=201)
async def admin_create(name: str = Form(...), logo: UploadFile | None = File(None), _user=Depends(_manage)):
    try:
        return website.create(get_platform_connection(), name, await _read_logo(logo))
    except ValueError as e:
        raise HTTPException(400, str(e))


class PartnerUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    active: bool | None = None


class PartnerOrder(BaseModel):
    ids: list[int] = Field(max_length=200)


# Declared before /{partner_id} routes so "order" is never read as an id.
@router.put("/admin/partners/order")
async def admin_reorder(req: PartnerOrder, _user=Depends(_manage)):
    return website.reorder(get_platform_connection(), req.ids)


@router.patch("/admin/partners/{partner_id}")
async def admin_update(partner_id: int, req: PartnerUpdate, _user=Depends(_manage)):
    try:
        out = website.update(get_platform_connection(), partner_id, name=req.name, active=req.active)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not out:
        raise HTTPException(404, "Partner not found")
    return out


@router.post("/admin/partners/{partner_id}/logo")
async def admin_set_logo(partner_id: int, logo: UploadFile = File(...), _user=Depends(_manage)):
    data = await _read_logo(logo)
    if not data:
        raise HTTPException(400, "Choose a logo file.")
    try:
        out = website.set_logo(get_platform_connection(), partner_id, data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not out:
        raise HTTPException(404, "Partner not found")
    return out


@router.delete("/admin/partners/{partner_id}/logo")
async def admin_remove_logo(partner_id: int, _user=Depends(_manage)):
    out = website.set_logo(get_platform_connection(), partner_id, None)
    if not out:
        raise HTTPException(404, "Partner not found")
    return out


@router.delete("/admin/partners/{partner_id}", status_code=204)
async def admin_delete(partner_id: int, _user=Depends(_manage)):
    if not website.delete(get_platform_connection(), partner_id):
        raise HTTPException(404, "Partner not found")
    return Response(status_code=204)
