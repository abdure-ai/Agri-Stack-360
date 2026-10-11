"""
routers/tips.py — Daily agricultural tips (backend/tips.py).

Everyone signed in (web and mobile):
  GET  /api/tips/today?language=      today's approved tips for my role and region (else the latest ones)
  GET  /api/tips?days=30&language=    approved tips of the last days
Reviewers (content:review — agronomist, admin):
  GET  /api/review/tips?status=draft  drafts / approved / rejected
  POST /api/review/tips/draft         draft tips now for a date (AI from the MoA guidelines, else crop calendar)
  POST /api/review/tips               write a tip by hand ("publish": true = approve at once; the writer is the reviewer)
  PUT  /api/review/tips/{id}          edit (back to draft, or "publish": true to approve the edited text)
  POST /api/review/tips/{id}/approve | reject
"""

from __future__ import annotations

import asyncio
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend import tips
from backend.advisory.config import local_now
from backend.auth import get_current_user, require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection

router = APIRouter(tags=["tips"])
_review = require_permission(P.CONTENT_REVIEW)
Lang = Literal["en", "am", "om", "ti"]


def _lang(user: dict, language: str | None) -> str:
    return language if language in tips.LANGS else (user.get("language") if user.get("language") in tips.LANGS else "en")


@router.get("/tips/today")
async def today(language: Lang | None = None, user: dict = Depends(get_current_user)):
    return tips.today_or_recent(get_platform_connection(), user, _lang(user, language))


@router.get("/tips")
async def recent(days: int = 30, language: Lang | None = None, user: dict = Depends(get_current_user)):
    return tips.published(get_platform_connection(), user, _lang(user, language), days=max(1, min(days, 365)), limit=200)


@router.get("/review/tips")
async def review_list(status: Literal["draft", "approved", "rejected"] | None = None, _user=Depends(_review)):
    return tips.list_for_review(get_platform_connection(), status)


class DraftIn(BaseModel):
    tip_date: date | None = None       # default: tomorrow
    count: int | None = Field(None, ge=1, le=5)


@router.post("/review/tips/draft")
async def draft_now(req: DraftIn, user: dict = Depends(_review)):
    from backend.advisory import registry

    day = req.tip_date or (local_now().date() + timedelta(days=1))
    conn = get_platform_connection()
    ids = await asyncio.to_thread(tips.draft_day, conn, day, llm=registry.llm(), embedder=registry.embedder(),
                                  count=req.count, created_by=user["id"])
    return {"tip_date": day.isoformat(), "created": len(ids), "tips": [tips.get(conn, i) for i in ids]}


class TipIn(BaseModel):
    tip_date: date
    title: dict[Lang, str]
    body: dict[Lang, str]
    audience: list[str] = ["all"]
    region_pcode: str | None = Field(None, max_length=20)
    crop: str | None = Field(None, max_length=40)
    publish: bool = False   # the reviewer wrote or checked the text: approve it in the same step


def _save(tip_id: int | None, req: TipIn, user: dict) -> dict:
    if any(len(v) > 1200 for v in req.body.values()) or any(len(v) > 120 for v in req.title.values()):
        raise HTTPException(400, "Title at most 120 and text at most 1200 characters")
    conn = get_platform_connection()
    try:
        tip = tips.save(conn, tip_id, {**req.model_dump(), "tip_date": req.tip_date.isoformat()}, user["id"])
    except ValueError as e:
        raise HTTPException(400, str(e))
    if req.publish:
        tip = tips.decide(conn, tip["id"], True, user["id"], "published by the writer")
    return tip


@router.post("/review/tips", status_code=201)
async def create(req: TipIn, user: dict = Depends(_review)):
    return _save(None, req, user)


@router.put("/review/tips/{tip_id}")
async def edit(tip_id: int, req: TipIn, user: dict = Depends(_review)):
    if not tips.get(get_platform_connection(), tip_id):
        raise HTTPException(404, "Tip not found")
    return _save(tip_id, req, user)


class DecisionIn(BaseModel):
    note: str | None = Field(None, max_length=300)


@router.post("/review/tips/{tip_id}/{decision}")
async def decide(tip_id: int, decision: Literal["approve", "reject"], req: DecisionIn | None = None,
                 user: dict = Depends(_review)):
    conn = get_platform_connection()
    tip = tips.get(conn, tip_id)
    if not tip:
        raise HTTPException(404, "Tip not found")
    return tips.decide(conn, tip_id, decision == "approve", user["id"], (req.note if req else None))
