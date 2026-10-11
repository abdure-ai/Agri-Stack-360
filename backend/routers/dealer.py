"""
routers/dealer.py — Agro-dealer shops (checklist 1.7) on the shared organisation model (type 'agro_dealer').

Shop staff (dealer:manage)
  GET  /api/dealer/shop                      shop profile, products carried, verified badge
  PUT  /api/dealer/shop                      location (woreda P-code), phone, note
  PUT  /api/dealer/products/{product_id}     carry a registered product / set in-stock
  DELETE /api/dealer/products/{product_id}
  POST /api/dealer/check                     check a product code at sale (Input Trust), logged for the shop
  GET  /api/dealer/checks                    the shop's recent checks

Farmers and others (inputs:verify)
  GET  /api/trust/shops?product_id=&area=    verified, active shops with the product in stock, nearest areas first
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend import admin_areas, input_trust
from backend.advisory.config import local_now
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection, pquery, pquery_one
from backend.routers.input_trust import org_for

router = APIRouter(tags=["dealer"])
_dealer = require_permission(P.DEALER_MANAGE)
_verify = require_permission(P.INPUTS_VERIFY)


def _now() -> str:
    return local_now().isoformat(sep=" ", timespec="seconds")


def _shop(user: dict, org_id: int | None) -> dict:
    return org_for(user, org_id, "agro_dealer")


@router.get("/dealer/shop")
async def shop(org_id: int | None = None, user: dict = Depends(_dealer)):
    org = _shop(user, org_id)
    products = pquery("""SELECT p.id, p.product_name, p.active_ingredient, p.registration_number, p.category,
                                p.verification_status, sp.in_stock, sp.updated_at
                         FROM shop_products sp JOIN approved_products p ON p.id = sp.product_id
                         WHERE sp.org_id = ? ORDER BY p.product_name""", (org["id"],))
    registry = pquery("""SELECT id, product_name, active_ingredient, registration_number, category FROM approved_products
                         WHERE status = 'registered' ORDER BY product_name""")
    chain = admin_areas.lineage(get_platform_connection(), org["woreda_pcode"]) if org.get("woreda_pcode") else []
    return {"org": {**org, "area": [a.name for a in chain]}, "products": products, "registry": registry}


class ShopIn(BaseModel):
    area_pcode: str | None = None
    phone: str | None = Field(None, max_length=20)
    note: str | None = Field(None, max_length=500)


@router.put("/dealer/shop")
async def update_shop(req: ShopIn, org_id: int | None = None, user: dict = Depends(_dealer)):
    org = _shop(user, org_id)
    conn = get_platform_connection()
    changes = {}
    if req.area_pcode is not None:
        area = admin_areas.get_area(conn, req.area_pcode)
        if not area or area.level != 3:
            raise HTTPException(400, "Choose the shop's woreda.")
        changes["woreda_pcode"] = area.pcode
    if req.phone is not None:
        changes["phone"] = req.phone.strip() or None
    if req.note is not None:
        changes["note"] = req.note.strip() or None
    if changes:
        with conn:
            conn.execute(f"UPDATE organisations SET {', '.join(f'{k}=?' for k in changes)} WHERE id = ?",
                         (*changes.values(), org["id"]))
    return pquery_one("SELECT * FROM organisations WHERE id = ?", (org["id"],))


class StockIn(BaseModel):
    in_stock: bool = True


@router.put("/dealer/products/{product_id}")
async def set_product(product_id: int, req: StockIn, org_id: int | None = None, user: dict = Depends(_dealer)):
    org = _shop(user, org_id)
    p = pquery_one("SELECT status FROM approved_products WHERE id = ?", (product_id,))
    if not p:
        raise HTTPException(404, "Product not found")
    if p["status"] != "registered":
        raise HTTPException(400, "Only registered products can be listed.")
    conn = get_platform_connection()
    with conn:
        conn.execute("""INSERT INTO shop_products (org_id, product_id, in_stock, updated_at) VALUES (?,?,?,?)
                        ON CONFLICT(org_id, product_id) DO UPDATE SET in_stock=excluded.in_stock, updated_at=excluded.updated_at""",
                     (org["id"], product_id, int(req.in_stock), _now()))
    return {"product_id": product_id, "in_stock": req.in_stock}


@router.delete("/dealer/products/{product_id}", status_code=204)
async def remove_product(product_id: int, org_id: int | None = None, user: dict = Depends(_dealer)):
    org = _shop(user, org_id)
    conn = get_platform_connection()
    with conn:
        conn.execute("DELETE FROM shop_products WHERE org_id = ? AND product_id = ?", (org["id"], product_id))


class CheckIn(BaseModel):
    code: str = Field(..., min_length=4, max_length=300)


@router.post("/dealer/check")
async def check_at_sale(req: CheckIn, org_id: int | None = None, user: dict = Depends(_dealer)):
    """Check a pack before selling it. Logged as a normal check (in the shop's woreda) and for the shop."""
    org = _shop(user, org_id)
    conn = get_platform_connection()
    result = input_trust.verify(conn, req.code, user_id=user["id"], woreda_pcode=org.get("woreda_pcode"))
    vid = conn.execute("SELECT MAX(id) FROM verifications WHERE user_id = ?", (user["id"],)).fetchone()[0]
    with conn:
        conn.execute("INSERT INTO dealer_checks (org_id, verification_id, created_by, created_at) VALUES (?,?,?,?)",
                     (org["id"], vid, user["id"], _now()))
    return result


@router.get("/dealer/checks")
async def checks(org_id: int | None = None, user: dict = Depends(_dealer)):
    org = _shop(user, org_id)
    return pquery("""SELECT c.id, c.created_at, v.code, v.result, v.reason, p.product_name, b.batch_number
                     FROM dealer_checks c LEFT JOIN verifications v ON v.id = c.verification_id
                     LEFT JOIN code_batches b ON b.id = v.batch_id LEFT JOIN approved_products p ON p.id = b.product_id
                     WHERE c.org_id = ? ORDER BY c.id DESC LIMIT 100""", (org["id"],))


@router.get("/trust/shops")
async def verified_shops(product_id: int | None = None, area: str | None = None, user: dict = Depends(_verify)):
    """Shops with the verified-seller badge (and, if asked, the product in stock), nearest areas first:
    same woreda, then same zone, then same region, then elsewhere."""
    here = area or user.get("woreda_pcode") or user.get("zone_pcode") or user.get("region_pcode") or ""
    rows = pquery(f"""SELECT o.id, o.name, o.phone, o.woreda_pcode, o.verified_at, w.name AS woreda, z.name AS zone,
                             {'sp.in_stock' if product_id else 'NULL'} AS in_stock
                      FROM organisations o
                      LEFT JOIN admin_areas w ON w.pcode = o.woreda_pcode LEFT JOIN admin_areas z ON z.pcode = w.parent_pcode
                      {'JOIN shop_products sp ON sp.org_id = o.id AND sp.product_id = ? AND sp.in_stock = 1' if product_id else ''}
                      WHERE o.type = 'agro_dealer' AND o.status = 'active' AND o.verified = 1""",
                  (product_id,) if product_id else ())

    def distance(r: dict) -> int:
        p = r["woreda_pcode"] or ""
        for rank, n in enumerate((len(here), 6, 4)):
            if here and p and p[:n] == here[:n] and len(here) >= n:
                return rank
        return 3

    return sorted(rows, key=lambda r: (distance(r), r["name"]))[:20]
