"""
routers/abc_inputs.py — ABC input supply: demand, member orders, suppliers, purchase orders, stock (milestone A7;
rules in backend/abc_inputs.py).

People with a role in the ABC (per-company check; admins may act for any ABC):
  GET  /api/abc/inputs/products?crop=wheat           registered products with cited rates for the crop        (view)
  GET  /api/abc/inputs/plans                         POST {season, crop, product_id, target?}                 (stock|advisory)
  POST /api/abc/inputs/orders/{id}/confirm           {qty?}  staff confirm for a member (0 = declined)        (stock)
  GET  /api/abc/inputs/suppliers?product_id=         shops with the product, nearest first                    (view)
  GET  /api/abc/inputs/purchase-orders               POST {supplier, supplier_shop_id?, items[], plan_id?}    (stock)
  POST /api/abc/inputs/receive                       {po_id, product_id, qty, code?, batch_number?, expires_on?} (stock)
  GET  /api/abc/inputs/stock                         lots, status, expiry flags                               (view)
  POST /api/abc/inputs/stock/{id}/release            {reason}  quarantine cleared (only lots without a failed check) (stock)
  POST /api/abc/inputs/issue                         {lot_id, farmer_id, qty, price_etb, payment, order_id?}  (stock)
Members:
  GET  /api/abc/my/orders                            POST /api/abc/my/orders/{id}/confirm {qty?}
"""

from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend import abc_company as core
from backend import abc_inputs as inp
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection

router = APIRouter(tags=["abc-inputs"])
_signed = require_permission(P.PROFILE_MANAGE)     # platform gate; the per-ABC role check follows


@router.get("/abc/inputs/products")
async def products(crop: str = "wheat", org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    core.abc_for(conn, user, org_id, "view")
    return inp.plannable_products(conn, crop)


@router.get("/abc/inputs/plans")
async def list_plans(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return {"plans": inp.plans(conn, ctx.org["id"]), "can_stock": ctx.can("stock"),
            "can_plan": ctx.can("stock") or ctx.can("advisory")}


class PlanIn(BaseModel):
    season: str = Field(..., min_length=2, max_length=60)
    crop: str = Field(..., min_length=2, max_length=40)
    product_id: int
    target: str | None = Field(None, max_length=60)


@router.post("/abc/inputs/plans", status_code=201)
async def create_plan(req: PlanIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    if not (ctx.can("stock") or ctx.can("advisory")):
        raise HTTPException(403, "Your role in this ABC does not allow this (stock or advisory).")
    return inp.create_plan(conn, ctx, user, **req.model_dump())


class ConfirmIn(BaseModel):
    qty: float | None = Field(None, ge=0, le=1e7)


@router.post("/abc/inputs/orders/{order_id}/confirm")
async def staff_confirm(order_id: int, req: ConfirmIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "stock")
    return inp.confirm_order(conn, ctx.org["id"], order_id, req.qty, "staff", user)


@router.get("/abc/inputs/suppliers")
async def suppliers(product_id: int, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return inp.suppliers(conn, ctx.org["id"], product_id)


class LineIn(BaseModel):
    product_id: int
    qty: float = Field(..., gt=0, le=1e7)
    unit: str = Field(..., min_length=1, max_length=20)
    unit_price_etb: float | None = Field(None, ge=0, le=1e8)


class POIn(BaseModel):
    supplier: str = Field(..., min_length=2, max_length=200)
    supplier_shop_id: int | None = None
    items: list[LineIn] = Field(..., min_length=1, max_length=50)
    plan_id: int | None = None
    note: str | None = Field(None, max_length=500)


@router.get("/abc/inputs/purchase-orders")
async def list_pos(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return inp.purchase_orders(conn, ctx.org["id"])


@router.post("/abc/inputs/purchase-orders", status_code=201)
async def create_po(req: POIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "stock")
    return inp.create_po(conn, ctx, user, supplier=req.supplier, supplier_shop_id=req.supplier_shop_id,
                         items=[i.model_dump() for i in req.items], plan_id=req.plan_id, note=req.note)


class ReceiveIn(BaseModel):
    po_id: int
    product_id: int
    qty: float = Field(..., gt=0, le=1e7)
    code: str | None = Field(None, max_length=300)
    batch_number: str | None = Field(None, max_length=60)
    expires_on: date | None = None


@router.post("/abc/inputs/receive", status_code=201)
async def receive(req: ReceiveIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "stock")
    return inp.receive(conn, ctx, user, **req.model_dump())


@router.get("/abc/inputs/stock")
async def stock(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return {"lots": inp.stock(conn, ctx.org["id"]), "can_stock": ctx.can("stock")}


class ReasonIn(BaseModel):
    reason: str = Field(..., min_length=5, max_length=300)


@router.post("/abc/inputs/stock/{lot_id}/release")
async def release(lot_id: int, req: ReasonIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "stock")
    return inp.release(conn, ctx, user, lot_id, req.reason.strip())


class IssueIn(BaseModel):
    lot_id: int
    farmer_id: int
    qty: float = Field(..., gt=0, le=1e7)
    price_etb: float = Field(0, ge=0, le=1e8, description="Price per unit charged to the member")
    payment: Literal["cash", "credit"] = "credit"
    order_id: int | None = None


@router.post("/abc/inputs/issue", status_code=201)
async def issue(req: IssueIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "stock")
    return inp.issue(conn, ctx, user, **req.model_dump())


@router.get("/abc/my/orders")
async def my_orders(user: dict = Depends(_signed)):
    return inp.my_orders(get_platform_connection(), user["id"])


@router.post("/abc/my/orders/{order_id}/confirm")
async def my_confirm(order_id: int, req: ConfirmIn, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    row = conn.execute("SELECT pl.org_id FROM abc_input_orders o JOIN abc_input_plans pl ON pl.id = o.plan_id WHERE o.id=?",
                       (order_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Order not found")
    return inp.confirm_order(conn, row[0], order_id, req.qty, "member", user)
