"""
routers/abc_shares.py — ABC shares and board approvals (milestone A4; rules in backend/abc_shares.py).

People with a role in the ABC (per-company check; admins may act for any ABC):
  GET  /api/abc/shares?org_id=                    setup, rules in force, every member's position and flags   (view)
  PUT  /api/abc/shares/setup                      {share_value_etb, shares_offered}                           (shares)
  POST /api/abc/shares/pledges                    {farmer_id, shares, kind, first_payment?}                   (shares)
  POST /api/abc/shares/payments                   {pledge_id, amount_etb, method, reference?, paid_on?}       (shares)
  POST /api/abc/shares/payments/{id}/reverse      {reason}                                                    (finance)
  GET  /api/abc/shares/payments?farmer_id=        payments and receipts                                       (finance_read)
  GET  /api/abc/shares/certificates?farmer_id=    certificate numbers                                         (view)
  POST /api/abc/shares/transfers                  {from_farmer, to_farmer, shares, reason} -> board approval  (shares)
  POST /api/abc/shares/reminders                  send payment reminders now (they also run with the alerts)  (shares)
  GET  /api/abc/approvals?status=                 approval requests                                           (view)
  POST /api/abc/approvals/{id}/approve|reject     {note}                                                      (approve)
"""

from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend import abc_company as core
from backend import abc_shares as sh
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection

router = APIRouter(tags=["abc-shares"])
_signed = require_permission(P.PROFILE_MANAGE)     # platform gate; the per-ABC role check follows
Method = Literal["cash", "bank", "telebirr", "mpesa", "other"]


@router.get("/abc/shares")
async def overview(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    out = sh.overview(conn, ctx)
    out["can_edit"], out["can_finance"], out["can_approve"] = ctx.can("shares"), ctx.can("finance"), ctx.can("approve")
    return out


class SetupIn(BaseModel):
    share_value_etb: float | None = Field(None, gt=0, le=1e9)
    shares_offered: int | None = Field(None, gt=0, le=1e9)


@router.put("/abc/shares/setup")
async def setup(req: SetupIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "shares")
    return sh.setup(conn, ctx, user, req.share_value_etb, req.shares_offered)


class PaymentIn(BaseModel):
    amount_etb: float = Field(..., gt=0, le=1e9)
    method: Method
    reference: str | None = Field(None, max_length=80)
    paid_on: date | None = None


class PledgeIn(BaseModel):
    farmer_id: int
    shares: int = Field(..., gt=0, le=10_000_000)
    kind: Literal["minimum", "extra"]
    pledged_on: date | None = None
    first_payment: PaymentIn | None = None


@router.post("/abc/shares/pledges", status_code=201)
async def pledge(req: PledgeIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "shares")
    return sh.pledge(conn, ctx, user, farmer_id=req.farmer_id, shares=req.shares, kind=req.kind,
                     pledged_on=req.pledged_on, first_payment=req.first_payment.model_dump() if req.first_payment else None)


class PayIn(PaymentIn):
    pledge_id: int


@router.post("/abc/shares/payments", status_code=201)
async def pay(req: PayIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "shares")
    return sh.pay(conn, ctx, user, **req.model_dump())


class ReasonIn(BaseModel):
    reason: str = Field(..., min_length=3, max_length=300)


@router.post("/abc/shares/payments/{payment_id}/reverse")
async def reverse(payment_id: int, req: ReasonIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "finance")
    return sh.reverse(conn, ctx, user, payment_id, req.reason.strip())


@router.get("/abc/shares/payments")
async def payments(farmer_id: int | None = None, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "finance_read")
    return sh.payments(conn, ctx.org["id"], farmer_id)


@router.get("/abc/shares/certificates")
async def certificates(farmer_id: int | None = None, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return {"certificates": sh.certificates(conn, ctx.org["id"], farmer_id), "org": ctx.org["name"],
            "share_value_etb": core.profile(conn, ctx.org["id"]).get("share_value_etb"),
            "official_record_note": core.OFFICIAL_RECORD_NOTE}


class TransferIn(BaseModel):
    from_farmer: int
    to_farmer: int
    shares: int = Field(..., gt=0)
    reason: str = Field(..., min_length=3, max_length=300)


@router.post("/abc/shares/transfers", status_code=201)
async def transfer(req: TransferIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "shares")
    return sh.request_transfer(conn, ctx, user, req.from_farmer, req.to_farmer, req.shares, req.reason.strip())


@router.post("/abc/shares/reminders")
async def reminders(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    core.abc_for(conn, user, org_id, "shares")
    return {"sent": sh.send_reminders(conn)}


@router.get("/abc/approvals")
async def list_approvals(status: Literal["pending", "approved", "rejected"] | None = None, org_id: int | None = None,
                         user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return {"approvals": sh.approvals(conn, ctx.org["id"], status), "can_approve": ctx.can("approve")}


class DecisionIn(BaseModel):
    note: str | None = Field(None, max_length=500)


@router.post("/abc/approvals/{approval_id}/{decision}")
async def decide(approval_id: int, decision: Literal["approve", "reject"], req: DecisionIn,
                 org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "approve")
    return sh.decide(conn, ctx, user, approval_id, decision == "approve", req.note)
