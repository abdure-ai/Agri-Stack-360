"""
routers/input_trust.py — Input Trust pilot API (see backend/input_trust.py for the rules).

Check (inputs:verify — farmer, agent, trader, admin)
  POST /api/trust/verify                     {code} -> Genuine / Warning + reason
  POST /api/trust/fake-reports               report a suspected fake (woreda from the profile)
  GET  /api/trust/products                   registered products (for the report form)

Supplier portal (supplier:manage — supplier staff for their own organisation; admins pass org_id)
  GET  /api/supplier/org                     organisation + catalogue
  POST /api/supplier/catalogue/{product_id}  add a registered product   DELETE removes it
  GET  /api/supplier/batches                 batches with check counts
  POST /api/supplier/batches                 new batch -> one code for the whole batch
  POST /api/supplier/batches/{id}/recall
  GET  /api/supplier/batches/{id}/label.svg  printable QR label
  GET  /api/supplier/report?days=30          checks by result, woreda, batch; fake reports

Organisations (orgs:manage — admin)
  GET/POST /api/admin/orgs   PATCH /api/admin/orgs/{id}   POST/DELETE /api/admin/orgs/{id}/members
"""

from __future__ import annotations

import re
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

from backend import input_trust
from backend.advisory.config import env
from backend.auth import require_permission
from backend.permissions import P, has_permission
from backend.platform_db import get_platform_connection, pquery, pquery_one

router = APIRouter(tags=["input-trust"])
_verify = require_permission(P.INPUTS_VERIFY)
_supplier = require_permission(P.SUPPLIER_MANAGE)
_orgs = require_permission(P.ORGS_MANAGE)


# ── Check a code ──────────────────────────────────────────────────────────────

class VerifyRequest(BaseModel):
    code: str = Field(..., min_length=4, max_length=300)


@router.post("/trust/verify")
async def verify(req: VerifyRequest, user: dict = Depends(_verify)):
    return input_trust.verify(get_platform_connection(), req.code, user_id=user["id"],
                              woreda_pcode=user.get("woreda_pcode"))


@router.get("/trust/products")
async def registered_products(_user=Depends(_verify)):
    return pquery("""SELECT id, product_name, active_ingredient, formulation, registration_number, category,
                            verification_status FROM approved_products WHERE status = 'registered' ORDER BY product_name""")


class FakeReport(BaseModel):
    code: str | None = Field(None, max_length=300)
    product_id: int | None = None
    product_text: str | None = Field(None, max_length=200)
    shop_text: str | None = Field(None, max_length=200)
    note: str | None = Field(None, max_length=1000)


@router.post("/trust/fake-reports", status_code=201)
async def report_fake(req: FakeReport, user: dict = Depends(_verify)):
    if not (req.code or req.product_id or (req.product_text or "").strip()):
        raise HTTPException(400, "Tell us the code or the product.")
    product_id = req.product_id
    code = input_trust.normalise(req.code) if req.code else None
    if code and not product_id:
        b = pquery_one("SELECT product_id FROM code_batches WHERE code = ?", (code,))
        product_id = b["product_id"] if b else None
    if product_id and not pquery_one("SELECT id FROM approved_products WHERE id = ?", (product_id,)):
        raise HTTPException(400, "Unknown product")
    conn = get_platform_connection()
    from backend.advisory.config import local_now

    with conn:
        cur = conn.execute(
            """INSERT INTO fake_reports (user_id, code, product_id, product_text, shop_text, note, woreda_pcode, created_at)
               VALUES (?,?,?,?,?,?,?,?)""",
            (user["id"], code, product_id, (req.product_text or "").strip() or None, (req.shop_text or "").strip() or None,
             (req.note or "").strip() or None, user.get("woreda_pcode"), local_now().isoformat(sep=" ", timespec="seconds")))
    return {"id": cur.lastrowid, "status": "open"}


# ── Supplier portal ───────────────────────────────────────────────────────────

def org_for(user: dict, org_id: int | None, org_type: str) -> dict:
    """The organisation of `org_type` this request acts for: the user's own membership, or (admins) org_id."""
    if has_permission(user["role"], P.ORGS_MANAGE):
        if not org_id:
            raise HTTPException(400, "Choose an organisation (org_id).")
        org = pquery_one("SELECT * FROM organisations WHERE id = ? AND type = ?", (org_id, org_type))
    else:
        org = pquery_one("""SELECT o.* FROM organisations o JOIN organisation_members m ON m.org_id = o.id
                            WHERE m.user_id = ? AND o.type = ? AND (? IS NULL OR o.id = ?) ORDER BY o.id LIMIT 1""",
                         (user["id"], org_type, org_id, org_id))
    if not org:
        raise HTTPException(403, "You are not a member of an organisation of this kind. Ask an administrator.")
    if org["status"] != "active" and not has_permission(user["role"], P.ORGS_MANAGE):
        raise HTTPException(403, "This organisation is suspended.")
    return org


def _org(user: dict, org_id: int | None) -> dict:
    return org_for(user, org_id, "supplier")


@router.get("/supplier/org")
async def my_org(org_id: int | None = None, user: dict = Depends(_supplier)):
    org = _org(user, org_id)
    catalogue = pquery("""SELECT p.id, p.product_name, p.active_ingredient, p.formulation, p.registration_number,
                                 p.category, p.status, p.verification_status
                          FROM org_products op JOIN approved_products p ON p.id = op.product_id
                          WHERE op.org_id = ? ORDER BY p.product_name""", (org["id"],))
    registry = pquery("""SELECT id, product_name, active_ingredient, registration_number, category, verification_status
                         FROM approved_products WHERE status = 'registered' ORDER BY product_name""")
    return {"org": org, "catalogue": catalogue, "registry": registry}


@router.post("/supplier/catalogue/{product_id}", status_code=201)
async def add_to_catalogue(product_id: int, org_id: int | None = None, user: dict = Depends(_supplier)):
    org = _org(user, org_id)
    p = pquery_one("SELECT status FROM approved_products WHERE id = ?", (product_id,))
    if not p:
        raise HTTPException(404, "Product not found")
    if p["status"] != "registered":
        raise HTTPException(400, "Only registered products can be listed.")
    conn = get_platform_connection()
    with conn:
        conn.execute("INSERT OR IGNORE INTO org_products (org_id, product_id) VALUES (?, ?)", (org["id"], product_id))
    return {"org_id": org["id"], "product_id": product_id}


@router.delete("/supplier/catalogue/{product_id}", status_code=204)
async def remove_from_catalogue(product_id: int, org_id: int | None = None, user: dict = Depends(_supplier)):
    org = _org(user, org_id)
    conn = get_platform_connection()
    with conn:
        conn.execute("DELETE FROM org_products WHERE org_id = ? AND product_id = ?", (org["id"], product_id))


class BatchIn(BaseModel):
    product_id: int
    batch_number: str = Field(..., min_length=1, max_length=60)
    units: int = Field(..., gt=0, le=10_000_000)
    manufactured_on: date | None = None
    expires_on: date | None = None


@router.get("/supplier/batches")
async def batches(org_id: int | None = None, user: dict = Depends(_supplier)):
    org = _org(user, org_id)
    return pquery("""SELECT b.*, p.product_name,
                            (SELECT COUNT(*) FROM verifications v WHERE v.batch_id = b.id) AS checks,
                            (SELECT COUNT(*) FROM verifications v WHERE v.batch_id = b.id AND v.result = 'warning') AS warnings
                     FROM code_batches b JOIN approved_products p ON p.id = b.product_id
                     WHERE b.org_id = ? ORDER BY b.id DESC""", (org["id"],))


@router.post("/supplier/batches", status_code=201)
async def create_batch(req: BatchIn, org_id: int | None = None, user: dict = Depends(_supplier)):
    org = _org(user, org_id)
    if not pquery_one("SELECT 1 AS x FROM org_products WHERE org_id = ? AND product_id = ?", (org["id"], req.product_id)):
        raise HTTPException(400, "Add the product to your catalogue first.")
    if req.manufactured_on and req.expires_on and req.expires_on <= req.manufactured_on:
        raise HTTPException(400, "Expiry must be after the manufacturing date.")
    batch_number = req.batch_number.strip()
    if not re.fullmatch(r"[\w./-]+", batch_number):
        raise HTTPException(400, "Batch number may contain letters, numbers, '-', '/', '.' and '_' only.")
    conn = get_platform_connection()
    if pquery_one("SELECT id FROM code_batches WHERE org_id=? AND product_id=? AND batch_number=?",
                  (org["id"], req.product_id, batch_number)):
        raise HTTPException(409, "This batch already exists for this product.")
    code = input_trust.new_code(conn)
    with conn:
        cur = conn.execute(
            """INSERT INTO code_batches (org_id, product_id, batch_number, units, manufactured_on, expires_on, code, created_by)
               VALUES (?,?,?,?,?,?,?,?)""",
            (org["id"], req.product_id, batch_number, req.units,
             req.manufactured_on.isoformat() if req.manufactured_on else None,
             req.expires_on.isoformat() if req.expires_on else None, code, user["id"]))
    return pquery_one("SELECT * FROM code_batches WHERE id = ?", (cur.lastrowid,))


def _batch(org: dict, batch_id: int) -> dict:
    b = pquery_one("""SELECT b.*, p.product_name FROM code_batches b JOIN approved_products p ON p.id = b.product_id
                      WHERE b.id = ? AND b.org_id = ?""", (batch_id, org["id"]))
    if not b:
        raise HTTPException(404, "Batch not found")
    return b


@router.post("/supplier/batches/{batch_id}/recall")
async def recall(batch_id: int, org_id: int | None = None, user: dict = Depends(_supplier)):
    org = _org(user, org_id)
    _batch(org, batch_id)
    conn = get_platform_connection()
    with conn:
        conn.execute("UPDATE code_batches SET status = 'recalled' WHERE id = ?", (batch_id,))
    return {"id": batch_id, "status": "recalled"}


def _public_base(request: Request) -> str:
    """Where the check page lives: APP_PUBLIC_URL, else the web app that asked for the label."""
    base = env("APP_PUBLIC_URL") or request.headers.get("origin") or ""
    if not base and (ref := request.headers.get("referer")):
        m = re.match(r"https?://[^/]+", ref)
        base = m.group(0) if m else ""
    return (base or "http://localhost:5173").rstrip("/")


@router.get("/supplier/batches/{batch_id}/label.svg")
async def label(batch_id: int, request: Request, org_id: int | None = None, user: dict = Depends(_supplier)):
    org = _org(user, org_id)
    b = _batch(org, batch_id)
    url = f"{_public_base(request)}/verify?code={b['code']}"
    svg = input_trust.label_svg(b["code"], url, b["product_name"], b["batch_number"], b["expires_on"], org["name"])
    return Response(svg, media_type="image/svg+xml",
                    headers={"Content-Disposition": f'inline; filename="label-{b["batch_number"]}.svg"'})


@router.get("/supplier/report")
async def report(days: int = 30, org_id: int | None = None, user: dict = Depends(_supplier)):
    org = _org(user, org_id)
    from backend.advisory.config import local_now

    return input_trust.supplier_report(get_platform_connection(), org["id"], max(1, min(days, 365)), local_now())


@router.get("/supplier/demand")
async def demand(days: int = 90, org_id: int | None = None, user: dict = Depends(_supplier)):
    """Photo checks of the diseases, and area of the crops, that this supplier's products target, by zone."""
    from backend import insights
    from backend.advisory.config import local_now

    org = _org(user, org_id)
    return insights.supplier_demand(get_platform_connection(), org["id"], max(7, min(days, 365)), local_now())


# ── Organisations (admin) ─────────────────────────────────────────────────────

ORG_ROLE = {"supplier": "supplier", "agro_dealer": "agro_dealer", "abc": "abc_manager",
            "commercial_farm": "farm_manager", "ngo": "ngo_staff"}


class OrgIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    note: str | None = Field(None, max_length=500)
    type: Literal["supplier", "agro_dealer", "abc", "commercial_farm", "ngo"] = "supplier"


class OrgPatch(BaseModel):
    status: Literal["active", "suspended"] | None = None
    name: str | None = Field(None, min_length=2, max_length=120)
    note: str | None = Field(None, max_length=500)
    verified: bool | None = None          # verified-seller badge (agro-dealers only)


class MemberIn(BaseModel):
    phone: str
    member_role: Literal["owner", "staff"] = "staff"


@router.get("/admin/orgs")
async def list_orgs(type: str | None = None, _user=Depends(_orgs)):
    orgs = pquery("""SELECT o.*, (SELECT COUNT(*) FROM organisation_members m WHERE m.org_id = o.id) AS members,
                            (SELECT COUNT(*) FROM code_batches b WHERE b.org_id = o.id) AS batches,
                            (SELECT name FROM admin_areas a WHERE a.pcode = o.woreda_pcode) AS woreda
                     FROM organisations o WHERE (? IS NULL OR o.type = ?) ORDER BY o.type, o.name""", (type, type))
    for o in orgs:
        o["member_list"] = pquery("""SELECT u.id, u.name, u.phone, u.role, m.member_role FROM organisation_members m
                                     JOIN users u ON u.id = m.user_id WHERE m.org_id = ? ORDER BY u.name""", (o["id"],))
    return orgs


@router.post("/admin/orgs", status_code=201)
async def create_org(req: OrgIn, _user=Depends(_orgs)):
    conn = get_platform_connection()
    with conn:
        cur = conn.execute("INSERT INTO organisations (name, note, type) VALUES (?, ?, ?)", (req.name.strip(), req.note, req.type))
    return pquery_one("SELECT * FROM organisations WHERE id = ?", (cur.lastrowid,))


@router.patch("/admin/orgs/{org_id}")
async def update_org(org_id: int, req: OrgPatch, _user=Depends(_orgs)):
    org = pquery_one("SELECT id, type FROM organisations WHERE id = ?", (org_id,))
    if not org:
        raise HTTPException(404, "Organisation not found")
    changes = {k: v for k, v in req.model_dump().items() if v is not None}
    if "verified" in changes:
        if org["type"] != "agro_dealer":
            raise HTTPException(400, "The verified-seller badge is for agro-dealers.")
        changes["verified"] = int(changes["verified"])
        from backend.advisory.config import local_now

        changes["verified_at"] = local_now().isoformat(sep=" ", timespec="seconds") if changes["verified"] else None
    if changes:
        conn = get_platform_connection()
        with conn:
            conn.execute(f"UPDATE organisations SET {', '.join(f'{k}=?' for k in changes)} WHERE id = ?",
                         (*changes.values(), org_id))
    return pquery_one("SELECT * FROM organisations WHERE id = ?", (org_id,))


@router.post("/admin/orgs/{org_id}/members", status_code=201)
async def add_member(org_id: int, req: MemberIn, _user=Depends(_orgs)):
    org = pquery_one("SELECT id, type FROM organisations WHERE id = ?", (org_id,))
    if not org:
        raise HTTPException(404, "Organisation not found")
    u = pquery_one("SELECT id, role FROM users WHERE phone = ?", (req.phone.strip(),))
    if not u:
        raise HTTPException(404, "No user with this phone number.")
    needed = ORG_ROLE[org["type"]]
    if u["role"] != needed:
        raise HTTPException(400, f"Change this user's role to '{needed}' first (Users page).")
    conn = get_platform_connection()
    with conn:
        conn.execute("INSERT OR REPLACE INTO organisation_members (org_id, user_id, member_role) VALUES (?,?,?)",
                     (org_id, u["id"], req.member_role))
    return {"org_id": org_id, "user_id": u["id"], "member_role": req.member_role}


@router.delete("/admin/orgs/{org_id}/members/{user_id}", status_code=204)
async def remove_member(org_id: int, user_id: int, _user=Depends(_orgs)):
    conn = get_platform_connection()
    with conn:
        conn.execute("DELETE FROM organisation_members WHERE org_id = ? AND user_id = ?", (org_id, user_id))
