"""
routers/feedback.py — Public website feedback and page views (backend/feedback.py).

Public (no sign-in; the landing and feedback pages):
  POST /api/feedback                  submit feedback (consent required; honeypot + rate limit)
  POST /api/visits                    count a page view: {"path": "/", "source": "expo"}
Admins (feedback:manage):
  GET   /api/admin/feedback           list, filters: visitor_type, interest, min_rating, source, status, date_from, date_to
  GET   /api/admin/feedback/summary   count, average rating, liked features, interests, page views
  GET   /api/admin/feedback/export.csv
  PATCH /api/admin/feedback/{id}      {"status": "contacted", "notes": "..."}
"""

from __future__ import annotations

import csv
import io
from datetime import date
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

from backend import feedback
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection

router = APIRouter(tags=["feedback"])
_manage = require_permission(P.FEEDBACK_MANAGE)


def client_ip(request: Request) -> str:
    """The visitor's address for the rate limit only (never stored). Behind Caddy and nginx the first
    X-Forwarded-For entry is the visitor."""
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() or (request.client.host if request.client else "unknown")


class FeedbackIn(BaseModel):
    # Loosely typed on purpose: backend/feedback.py validates and answers with friendly messages per field.
    name: Any = None
    organisation: Any = None
    visitor_type: Any = None
    email: Any = None
    phone: Any = None
    rating: Any = None
    liked: Any = None
    comments: Any = None
    interests: Any = None
    may_contact: Any = None
    consent: Any = None
    source: Any = None
    website: Any = None          # honeypot: hidden from people, filled in by bots


def _text(v: Any) -> str | None:
    return v if isinstance(v, str) else None


@router.post("/feedback", status_code=201)
async def submit(req: FeedbackIn, request: Request):
    if req.website:              # a bot: looks accepted, nothing stored
        return {"ok": True}
    if not feedback.submit_limiter.allow(client_ip(request)):
        raise HTTPException(429, "Too many submissions from this network. Please try again in a few minutes.")
    data = {k: (_text(v) if k in ("name", "organisation", "visitor_type", "email", "phone", "comments", "source") else v)
            for k, v in req.model_dump().items()}
    data["user_agent"] = request.headers.get("user-agent")
    row, errors = feedback.validate(data)
    if errors:
        raise HTTPException(400, {"message": "Please check the form.", "fields": errors})
    return {"ok": True, "id": feedback.submit(get_platform_connection(), row)}


class VisitIn(BaseModel):
    path: str = Field(max_length=40)
    source: str | None = Field(None, max_length=60)


@router.post("/visits", status_code=204)
async def visit(req: VisitIn, request: Request):
    if feedback.view_limiter.allow(client_ip(request)):
        feedback.record_view(get_platform_connection(), req.path, req.source)
    return Response(status_code=204)


class FilterParams:
    """Query-string filters shared by the list, summary and CSV export."""

    def __init__(self, visitor_type: str | None = None, interest: str | None = None, min_rating: int | None = None,
                 source: str | None = None, status: str | None = None, date_from: date | None = None,
                 date_to: date | None = None):
        self.value = {"visitor_type": visitor_type, "interest": interest, "min_rating": min_rating, "source": source,
                      "status": status, "date_from": date_from.isoformat() if date_from else None,
                      "date_to": date_to.isoformat() if date_to else None}


@router.get("/admin/feedback")
async def admin_list(f: FilterParams = Depends(), _user=Depends(_manage)):
    return feedback.list_feedback(get_platform_connection(), f.value)


@router.get("/admin/feedback/summary")
async def admin_summary(f: FilterParams = Depends(), _user=Depends(_manage)):
    return feedback.summary(get_platform_connection(), f.value)


@router.get("/admin/feedback/export.csv")
async def admin_export(f: FilterParams = Depends(), _user=Depends(_manage)):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(feedback.CSV_COLUMNS)
    w.writerows(feedback.csv_rows(get_platform_connection(), f.value))
    # BOM so Excel opens names in Ethiopic script correctly
    return Response("﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="agristack-feedback.csv"'})


class FeedbackUpdate(BaseModel):
    status: Literal["new", "contacted", "closed"] | None = None
    notes: str | None = Field(None, max_length=2000)


@router.patch("/admin/feedback/{feedback_id}")
async def admin_update(feedback_id: int, req: FeedbackUpdate, _user=Depends(_manage)):
    out = feedback.update(get_platform_connection(), feedback_id, req.status, req.notes)
    if not out:
        raise HTTPException(404, "Feedback not found")
    return out
