"""
routers/abc_governance.py — ABC voting weights, meetings, quorum, weighted votes, minutes (milestone A5;
rules in backend/abc_governance.py).

People with a role in the ABC (per-company check; admins may act for any ABC):
  GET  /api/abc/voting/weights?season=              live weights + seasons + snapshots                      (view)
  POST /api/abc/voting/production                   {farmer_id, season, quantity_qt, source}                 (members)
  POST /api/abc/voting/snapshot                     {label, season?}                                         (meetings)
  GET  /api/abc/meetings                            POST {kind, title, scheduled_at, location?, agenda[]}    (meetings)
  GET  /api/abc/meetings/{id}                       voters, attendance, quorum, motions with tallies          (view)
  POST /api/abc/meetings/{id}/notify                notice to voters (app + Telegram)                        (meetings)
  PUT  /api/abc/meetings/{id}/attendance            {present: [user_id]}                                     (meetings)
  POST /api/abc/meetings/{id}/cancel                                                                          (meetings)
  POST /api/abc/meetings/{id}/motions               {title, text?}                                           (meetings)
  POST /api/abc/motions/{id}/votes                  {votes: [{user_id, choice}]}  (secretary enters)         (meetings)
  POST /api/abc/motions/{id}/close                                                                            (meetings)
  PUT  /api/abc/meetings/{id}/minutes               {text}                                                   (meetings)
  POST /api/abc/meetings/{id}/minutes/approve                                                                 (approve)
Members (any signed-in member):
  GET  /api/abc/my/votes                            POST /api/abc/my/votes/{id}/confirm {correct}
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend import abc_company as core
from backend import abc_governance as gov
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection

router = APIRouter(tags=["abc-governance"])
_signed = require_permission(P.PROFILE_MANAGE)     # platform gate; the per-ABC role check follows


@router.get("/abc/voting/weights")
async def weights(season: str | None = None, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    snaps = gov._rows(conn, "SELECT id, label, season, land_only, created_at FROM abc_weight_snapshots WHERE org_id=? "
                            "ORDER BY id DESC LIMIT 20", (ctx.org["id"],))
    return {**gov.compute_weights(conn, ctx, season), "seasons": gov.seasons(conn, ctx.org["id"]), "snapshots": snaps,
            "can_record": ctx.can("members"), "can_meet": ctx.can("meetings")}


class ProductionIn(BaseModel):
    farmer_id: int
    season: str = Field(..., min_length=2, max_length=60)
    quantity_qt: float = Field(..., ge=0, le=1e7)
    source: Literal["estimate", "delivered"] = "estimate"


@router.post("/abc/voting/production", status_code=201)
async def production(req: ProductionIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "members")
    gov.record_production(conn, ctx, user, req.farmer_id, req.season.strip(), req.quantity_qt, req.source)
    return gov.compute_weights(conn, ctx, req.season.strip())


class SnapshotIn(BaseModel):
    label: str = Field(..., min_length=2, max_length=120)
    season: str | None = None


@router.post("/abc/voting/snapshot", status_code=201)
async def take_snapshot(req: SnapshotIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "meetings")
    return {"snapshot_id": gov.snapshot(conn, ctx, user, req.label.strip(), req.season)}


@router.get("/abc/meetings")
async def list_meetings(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return {"meetings": gov.meetings(conn, ctx.org["id"]), "can_meet": ctx.can("meetings"), "can_approve": ctx.can("approve")}


class MeetingIn(BaseModel):
    kind: Literal["general_assembly", "board"]
    title: str = Field(..., min_length=3, max_length=200)
    scheduled_at: datetime
    location: str | None = Field(None, max_length=200)
    agenda: list[str] = Field(default_factory=list, max_length=30)


@router.post("/abc/meetings", status_code=201)
async def create_meeting(req: MeetingIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "meetings")
    return gov.create_meeting(conn, ctx, user, kind=req.kind, title=req.title, scheduled_at=req.scheduled_at,
                              location=req.location, agenda=req.agenda)


@router.get("/abc/meetings/{meeting_id}")
async def meeting(meeting_id: int, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return {**gov.meeting_detail(conn, ctx, meeting_id), "can_meet": ctx.can("meetings"), "can_approve": ctx.can("approve"),
            "official_record_note": core.OFFICIAL_RECORD_NOTE}


@router.post("/abc/meetings/{meeting_id}/notify")
async def notify(meeting_id: int, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "meetings")
    return {"sent": gov.notify(conn, ctx, user, meeting_id)}


class AttendanceIn(BaseModel):
    present: list[int] = Field(default_factory=list, max_length=20000)


@router.put("/abc/meetings/{meeting_id}/attendance")
async def attendance(meeting_id: int, req: AttendanceIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "meetings")
    return gov.set_attendance(conn, ctx, user, meeting_id, req.present)


@router.post("/abc/meetings/{meeting_id}/cancel")
async def cancel(meeting_id: int, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "meetings")
    gov.cancel_meeting(conn, ctx, user, meeting_id)
    return {"cancelled": True}


class MotionIn(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    text: str | None = Field(None, max_length=4000)


@router.post("/abc/meetings/{meeting_id}/motions", status_code=201)
async def motion(meeting_id: int, req: MotionIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "meetings")
    return {"motion_id": gov.add_motion(conn, ctx, user, meeting_id, req.title, req.text)}


class VoteIn(BaseModel):
    user_id: int
    choice: Literal["yes", "no", "abstain"]


class VotesIn(BaseModel):
    votes: list[VoteIn] = Field(..., min_length=1, max_length=20000)


@router.post("/abc/motions/{motion_id}/votes")
async def votes(motion_id: int, req: VotesIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "meetings")
    return gov.record_votes(conn, ctx, user, motion_id, [v.model_dump() for v in req.votes])


@router.post("/abc/motions/{motion_id}/close")
async def close(motion_id: int, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "meetings")
    return gov.close_motion(conn, ctx, user, motion_id)


class MinutesIn(BaseModel):
    text: str = Field(..., min_length=10, max_length=50000)


@router.put("/abc/meetings/{meeting_id}/minutes")
async def minutes(meeting_id: int, req: MinutesIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "meetings")
    gov.save_minutes(conn, ctx, user, meeting_id, req.text)
    return {"minutes_status": "draft"}


@router.post("/abc/meetings/{meeting_id}/minutes/approve")
async def approve_minutes(meeting_id: int, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "approve")
    gov.approve_minutes(conn, ctx, user, meeting_id)
    return {"minutes_status": "approved"}


@router.get("/abc/my/votes")
async def my_votes(user: dict = Depends(_signed)):
    return gov.my_votes(get_platform_connection(), user["id"])


class ConfirmIn(BaseModel):
    correct: bool = True


@router.post("/abc/my/votes/{vote_id}/confirm")
async def confirm(vote_id: int, req: ConfirmIn, user: dict = Depends(_signed)):
    gov.confirm_vote(get_platform_connection(), user, vote_id, req.correct)
    return {"confirmed": True, "correct": req.correct}
