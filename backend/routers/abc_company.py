"""
routers/abc_company.py — ABC company core (milestone A1, docs/abc-pilot-plan.md): profile, team roles, rules.

Anyone with a role in an ABC (checked per ABC in backend/abc_company.py; admins may act for any ABC):
  GET  /api/abc/companies                         ABCs I work in, with my roles
  GET  /api/abc/company?org_id=                   profile, my roles and capabilities, rules in force, team
  PUT  /api/abc/company?org_id=                   type, kebele, fiscal year, declared capital, approval limit (manage)
  GET  /api/abc/team?org_id=                      POST {phone, role} (team)   DELETE /api/abc/team/{user_id}/{role}
  GET  /api/abc/history?org_id=                   audit trail of this ABC (audit_read)
Everyone signed in:
  GET  /api/abc/rules?abc_type=&on=               legal rules in force (public information)
Admins (orgs:manage):
  GET  /api/admin/abc-rules                       every rule row (history)
  POST /api/admin/abc-rules                       new rule value from a date (old rows are kept)
"""

from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend import abc_company as core
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection

router = APIRouter(tags=["abc-company"])
_admin = require_permission(P.ORGS_MANAGE)
# Platform gate: anyone with an account profile (every role). The real check is per company: the person's roles
# in that ABC (backend/abc_company.abc_for), because board members and other officers are often farmers.
_signed = require_permission(P.PROFILE_MANAGE)

AbcType = Literal["crop_grain", "horticulture", "fruit", "livestock", "mixed"]
AbcRole = Literal["organizing_committee", "general_manager", "chair", "board_member", "secretary", "accountant",
                  "store_keeper", "machinery_coordinator", "agronomist", "auditor"]


def _caps(ctx: core.AbcContext) -> list[str]:
    return sorted(c for c in core.CAPABILITIES if ctx.can(c))


@router.get("/abc/companies")
async def companies(user: dict = Depends(_signed)):
    return core.my_abcs(get_platform_connection(), user)


@router.get("/abc/company")
async def company(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return {"org": {k: ctx.org[k] for k in ("id", "name", "status", "woreda_pcode", "phone", "note")},
            "profile": ctx.profile, "my_roles": sorted(ctx.roles), "capabilities": _caps(ctx),
            "rules": core.rules_in_force(conn, ctx.profile["abc_type"]), "team": core.team(conn, ctx.org["id"]),
            "official_record_note": core.OFFICIAL_RECORD_NOTE}


class ProfileIn(BaseModel):
    abc_type: AbcType | None = None
    kebele: str | None = Field(None, max_length=120)
    fiscal_year_start: Literal["hamle", "meskerem", "january"] | None = None
    declared_capital_etb: float | None = Field(None, ge=0, le=1e12)
    board_approval_limit_etb: float | None = Field(None, ge=0, le=1e12)
    exit_refund_policy: str | None = Field(None, max_length=2000)


@router.put("/abc/company")
async def update_company(req: ProfileIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "manage")
    changes = req.model_dump(exclude_unset=True)
    if "abc_type" in changes and ctx.profile["status"] != "formation" and changes["abc_type"] != ctx.profile["abc_type"]:
        raise HTTPException(400, "The ABC type can only change while the ABC is being formed.")
    return core.update_profile(conn, user, ctx.org["id"], changes)


@router.get("/abc/team")
async def get_team(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return core.team(conn, ctx.org["id"])


class TeamIn(BaseModel):
    phone: str = Field(..., min_length=9, max_length=20)
    role: AbcRole


@router.post("/abc/team", status_code=201)
async def add_team(req: TeamIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "team")
    row = conn.execute("SELECT id FROM users WHERE phone = ? AND is_active = 1", (req.phone.strip(),)).fetchone()
    if not row:
        raise HTTPException(404, "No active account with this phone number. The person must sign up first.")
    core.add_role(conn, ctx, user, row[0], req.role)
    return core.team(conn, ctx.org["id"])


@router.delete("/abc/team/{user_id}/{role}", status_code=204)
async def remove_team(user_id: int, role: AbcRole, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "team")
    core.remove_role(conn, ctx, user, user_id, role)


@router.get("/abc/history")
async def history(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "audit_read")
    return core.history(conn, ctx.org["id"])


@router.get("/abc/rules")
async def rules(abc_type: AbcType | None = None, on: date | None = None, _user: dict = Depends(_signed)):
    return core.rules_in_force(get_platform_connection(), abc_type or "*", on)


@router.get("/admin/abc-rules")
async def all_rules(_user: dict = Depends(_admin)):
    cur = get_platform_connection().execute("""SELECT r.*, u.name AS created_by_name FROM abc_rules r
                                               LEFT JOIN users u ON u.id = r.created_by
                                               ORDER BY r.key, r.abc_type, r.effective_from DESC, r.id DESC""")
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


class RuleIn(BaseModel):
    key: str = Field(..., min_length=3, max_length=60, pattern=r"^[a-z_]+$")
    abc_type: Literal["*", "crop_grain", "horticulture", "fruit", "livestock", "mixed"] = "*"
    value: float
    unit: str | None = Field(None, max_length=20)
    effective_from: date
    source: str = Field(..., min_length=5, max_length=500, description="Law, directive or decision, with article/page")
    verification_status: Literal["verified", "PLACEHOLDER_VERIFY", "platform_default"] = "PLACEHOLDER_VERIFY"
    note: str | None = Field(None, max_length=500)


@router.post("/admin/abc-rules", status_code=201)
async def add_rule(req: RuleIn, user: dict = Depends(_admin)):
    conn = get_platform_connection()
    if req.key not in {r[0] for r in conn.execute("SELECT DISTINCT key FROM abc_rules")}:
        raise HTTPException(400, f"Unknown rule '{req.key}'. New kinds of rules need a code change that uses them.")
    return core.add_rule(conn, user, **req.model_dump())
