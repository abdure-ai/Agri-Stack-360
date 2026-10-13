"""
routers/abc_finance.py — ABC finance basics (milestone A6; rules in backend/abc_finance.py).

People with a role in the ABC (per-company check; admins may act for any ABC):
  GET  /api/abc/finance/summary?start=&end=           share capital, income, expenses, assets, loans, cash, owed (finance_read)
  GET  /api/abc/finance/ledger?start=&end=            POST {kind, category, amount_etb, ...}                  (finance)
  POST /api/abc/finance/ledger/{id}/void              {reason}                                                 (finance)
  GET  /api/abc/finance/members                       member accounts with balances                            (finance_read)
  GET  /api/abc/finance/members/{farmer_id}           statement with running balance                           (finance_read)
  POST /api/abc/finance/members/{farmer_id}           {kind, amount_etb, ...}: credit, charge, repayment, ...  (finance)
  POST /api/abc/finance/member-txns/{id}/void         {reason}                                                 (finance)
  GET  /api/abc/finance/export.xlsx                   summary, ledger, member accounts, share payments         (finance_read)
Members:
  GET  /api/abc/my/statement?org_id=                  my own account statement and shares
"""

from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from backend import abc_company as core
from backend import abc_finance as fin
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection

router = APIRouter(tags=["abc-finance"])
_signed = require_permission(P.PROFILE_MANAGE)     # platform gate; the per-ABC role check follows
Method = Literal["cash", "bank", "telebirr", "mpesa", "other"]


@router.get("/abc/finance/summary")
async def summary(start: date | None = None, end: date | None = None, org_id: int | None = None,
                  user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "finance_read")
    return {**fin.summary(conn, ctx.org["id"], start, end), "can_edit": ctx.can("finance"),
            "approval_limit_etb": core.profile(conn, ctx.org["id"]).get("board_approval_limit_etb"),
            "official_record_note": core.OFFICIAL_RECORD_NOTE}


@router.get("/abc/finance/ledger")
async def ledger(start: date | None = None, end: date | None = None, org_id: int | None = None,
                 user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "finance_read")
    return fin.ledger(conn, ctx.org["id"], start, end)


class EntryIn(BaseModel):
    kind: Literal["income", "expense", "asset", "liability"]
    category: str = Field(..., min_length=2, max_length=80)
    amount_etb: float = Field(..., gt=0, le=1e11)
    entry_date: date | None = None
    description: str | None = Field(None, max_length=500)
    direction: Literal["in", "out"] = "in"
    method: Method | None = None
    reference: str | None = Field(None, max_length=80)
    counterparty: str | None = Field(None, max_length=200)


@router.post("/abc/finance/ledger", status_code=201)
async def add_entry(req: EntryIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "finance")
    return fin.add_entry(conn, ctx, user, **req.model_dump())


class ReasonIn(BaseModel):
    reason: str = Field(..., min_length=3, max_length=300)


@router.post("/abc/finance/ledger/{entry_id}/void")
async def void_entry(entry_id: int, req: ReasonIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "finance")
    fin.void_entry(conn, ctx, user, entry_id, req.reason.strip())
    return {"voided": True}


@router.get("/abc/finance/members")
async def accounts(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "finance_read")
    return fin.member_accounts(conn, ctx.org["id"])


@router.get("/abc/finance/members/{farmer_id}")
async def statement(farmer_id: int, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "finance_read")
    return {**fin.statement(conn, ctx.org["id"], farmer_id), "org": ctx.org["name"],
            "official_record_note": core.OFFICIAL_RECORD_NOTE}


class TxnIn(BaseModel):
    kind: Literal["input_credit", "service_charge", "repayment", "produce_deduction", "adjustment"]
    amount_etb: float = Field(..., ge=-1e10, le=1e10)
    description: str | None = Field(None, max_length=500)
    txn_date: date | None = None
    method: Method | None = None
    reference: str | None = Field(None, max_length=80)


@router.post("/abc/finance/members/{farmer_id}", status_code=201)
async def add_txn(farmer_id: int, req: TxnIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "finance")
    return fin.member_txn(conn, ctx, user, farmer_id=farmer_id, **req.model_dump())


@router.post("/abc/finance/member-txns/{txn_id}/void")
async def void_txn(txn_id: int, req: ReasonIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "finance")
    fin.void_txn(conn, ctx, user, txn_id, req.reason.strip())
    return {"voided": True}


@router.get("/abc/finance/export.xlsx")
async def export(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "finance_read")
    data = fin.export_xlsx(conn, ctx)
    return Response(data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="abc-{ctx.org["id"]}-finance-{date.today()}.xlsx"'})


@router.get("/abc/my/statement")
async def my_statement(org_id: int, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    if not conn.execute("SELECT 1 FROM abc_members WHERE org_id=? AND farmer_id=? AND status='active'",
                        (org_id, user["id"])).fetchone():
        raise HTTPException(403, "You are not a member of this ABC.")
    name = conn.execute("SELECT name FROM organisations WHERE id=?", (org_id,)).fetchone()
    return {**fin.statement(conn, org_id, user["id"]), "org": name[0] if name else None,
            "official_record_note": core.OFFICIAL_RECORD_NOTE}
