"""
routers/abc_formation.py — ABC formation and registration (milestone A2; rules in backend/abc_formation.py).

People with a role in the ABC (per-company check; admins may act for any ABC):
  GET  /api/abc/formation?org_id=                 readiness checklist, recognition, registration, signatures, documents
  PUT  /api/abc/formation/recognition             {authority, recognized_on, doc_id}            (formation)
  GET  /api/abc/documents                         POST multipart {kind, title, plan_years?, file} (formation)
  GET  /api/abc/documents/{id}/file
  POST /api/abc/agreement/signatures              {farmer_id, scan_doc_id}: a signed paper copy  (formation)
  POST /api/abc/registration                      {authority, number, registered_on, certificate_doc_id,
                                                   override_reason? (admins only)}                 (formation)
Members (any signed-in farmer who accepted the ABC):
  GET  /api/abc/my/memberships                    my ABCs and whether I signed the founding agreement
  POST /api/abc/my/agreement/sign?org_id=         digital confirmation of the founding agreement
"""

from __future__ import annotations

import asyncio
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend import abc_company as core
from backend import abc_formation as fm
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection

router = APIRouter(tags=["abc-formation"])
_signed = require_permission(P.PROFILE_MANAGE)     # platform gate; the per-ABC role check follows


def _public_doc(d: dict) -> dict:
    return {k: v for k, v in d.items() if k != "stored_path"}


@router.get("/abc/formation")
async def get_formation(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return {"org_id": ctx.org["id"], "status": ctx.profile["status"], "readiness": fm.readiness(conn, ctx),
            "formation": fm.formation(conn, ctx.org["id"]), "signatures": fm.signatures(conn, ctx.org["id"]),
            "documents": fm.documents(conn, ctx.org["id"]), "can_edit": ctx.can("formation"),
            "is_admin": ctx.is_admin, "official_record_note": core.OFFICIAL_RECORD_NOTE}


class RecognitionIn(BaseModel):
    authority: str = Field(..., min_length=3, max_length=200)
    recognized_on: date
    doc_id: int | None = None


@router.put("/abc/formation/recognition")
async def recognition(req: RecognitionIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "formation")
    return fm.set_recognition(conn, ctx, user, req.authority, req.recognized_on, req.doc_id)


@router.get("/abc/documents")
async def list_documents(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return fm.documents(conn, ctx.org["id"])


@router.post("/abc/documents", status_code=201)
async def upload(kind: str = Form(...), title: str = Form(..., min_length=2, max_length=200),
                 plan_years: int | None = Form(None, ge=1, le=10), file: UploadFile = File(...),
                 org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "formation")
    data = await file.read(fm.MAX_BYTES + 1)
    doc = await asyncio.to_thread(fm.save_document, conn, ctx, user, kind=kind, title=title, filename=file.filename or "",
                                  content_type=file.content_type or "", data=data, plan_years=plan_years)
    return _public_doc(doc)


@router.get("/abc/documents/{doc_id}/file")
async def download(doc_id: int, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    doc = fm.document(conn, ctx.org["id"], doc_id)
    return FileResponse(fm.file_path(doc), media_type=doc["content_type"], filename=doc["filename"])


class ScanSignatureIn(BaseModel):
    farmer_id: int
    scan_doc_id: int


@router.post("/abc/agreement/signatures", status_code=201)
async def record_scan(req: ScanSignatureIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "formation")
    return fm.sign(conn, ctx.org["id"], req.farmer_id, user, "scan", req.scan_doc_id)


class RegistrationIn(BaseModel):
    authority: str = Field(..., min_length=3, max_length=200)
    number: str = Field(..., min_length=1, max_length=80)
    registered_on: date
    certificate_doc_id: int
    override_reason: str | None = Field(None, max_length=1000)


@router.post("/abc/registration")
async def registration(req: RegistrationIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "formation")
    if req.override_reason and not ctx.is_admin:
        raise HTTPException(403, "Only an administrator can register an ABC whose checklist is not complete.")
    return fm.register(conn, ctx, user, authority=req.authority, number=req.number, registered_on=req.registered_on,
                       certificate_doc_id=req.certificate_doc_id, override_reason=req.override_reason)


@router.get("/abc/my/memberships")
async def my_memberships(user: dict = Depends(_signed)):
    conn = get_platform_connection()
    out = []
    for org_id, name in conn.execute("""SELECT o.id, o.name FROM abc_members m JOIN organisations o ON o.id = m.org_id
                                        WHERE m.farmer_id = ? AND m.status = 'active' ORDER BY o.name""", (user["id"],)).fetchall():
        sig = fm.signatures(conn, org_id)
        mine = next((m["signature"] for m in sig["members"] if m["id"] == user["id"]), None)
        status = conn.execute("SELECT status FROM abc_profiles WHERE org_id=?", (org_id,)).fetchone()
        out.append({"org_id": org_id, "name": name, "status": status[0] if status else "formation",
                    "agreement": {"title": None, "version": sig["document"]["version"]} if sig["document"] else None,
                    "agreement_document_id": sig["document"]["id"] if sig["document"] else None,
                    "signed": mine})
    return out


@router.get("/abc/my/agreement/file")
async def my_agreement_file(org_id: int, user: dict = Depends(_signed)):
    """A member reads the founding agreement before confirming it."""
    conn = get_platform_connection()
    if not conn.execute("SELECT 1 FROM abc_members WHERE org_id=? AND farmer_id=? AND status='active'",
                        (org_id, user["id"])).fetchone():
        raise HTTPException(403, "You are not a member of this ABC.")
    latest = fm.latest_document(conn, org_id, "founding_agreement")
    if not latest:
        raise HTTPException(404, "The founding agreement has not been uploaded yet.")
    doc = fm.document(conn, org_id, latest["id"])
    return FileResponse(fm.file_path(doc), media_type=doc["content_type"], filename=doc["filename"])


@router.post("/abc/my/agreement/sign")
async def sign_mine(org_id: int, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    fm.sign(conn, org_id, user["id"], user, "app")
    return {"signed": True}
