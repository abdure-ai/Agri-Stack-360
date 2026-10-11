"""
routers/advisory.py — AI Advisory module API (spec §9).

  GET  /api/advisory/farmers/{id}/context      context object (debugging and DA view)
  POST /api/advisory/ask                       ask-anything assistant (text)
  POST /api/advisory/feedback                  helpful / not helpful on an answer
  GET  /api/advisory/conversations/{id}        a conversation's messages (own conversations only)
"""

from __future__ import annotations

import asyncio
import json
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.access import farmer_for_read
from backend.advisory import registry
from backend.advisory.assistant import ask, record_feedback
from backend.advisory.context import build_context
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection, pquery, pquery_one

router = APIRouter(prefix="/advisory", tags=["advisory"])
_advisory = require_permission(P.ADVISORY_USE)


def _context(farmer_id: int):
    conn = get_platform_connection()
    return build_context(
        conn, farmer_id,
        profiles=registry.farmer_profiles(conn),
        weather=registry.weather(),
        market=registry.market(conn),
        input_hub=registry.input_hub(conn),
    )


@router.get("/farmers/{farmer_id}/context")
async def farmer_context(farmer_id: int, user: dict = Depends(_advisory)):
    farmer_for_read(user, farmer_id)
    try:
        # Weather, forecast and market lookups block; keep them off the event loop.
        ctx = await asyncio.to_thread(_context, farmer_id)
    except LookupError:
        raise HTTPException(404, "Farmer not found")
    return ctx.to_dict()


@router.get("/calendar")
async def crop_calendar(farmer_id: int | None = None, user: dict = Depends(_advisory)):
    """Crop calendar for each active season: current stage and tasks, next stage, the full timeline.
    Stage day ranges are estimates from the MoA manuals (timing_estimated)."""
    from backend.advisory.calendar import farmer_calendar
    from backend.advisory.config import local_now as _now

    farmer_id = farmer_id or user["id"]
    if farmer_id != user["id"]:
        farmer_for_read(user, farmer_id)
    return farmer_calendar(get_platform_connection(), farmer_id, _now().date())


class AskRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=2000)
    farmer_id: int | None = Field(None, description="Ask on behalf of this farmer (DA / admin). Defaults to yourself.")
    language: Literal["am", "om", "en", "ti"] | None = Field(None, description="Override language detection")
    conversation_id: int | None = None
    channel: Literal["app", "telegram", "sms", "ivr"] = "app"


@router.post("/ask")
async def ask_question(req: AskRequest, user: dict = Depends(_advisory)):
    farmer_id = req.farmer_id or user["id"]
    if farmer_id != user["id"]:
        farmer_for_read(user, farmer_id)
    conn = get_platform_connection()
    result = await asyncio.to_thread(
        ask, conn, user=user, question=req.question, farmer_id=farmer_id, llm=registry.llm(),
        embedder=registry.embedder(), build_ctx=_context, language=req.language,
        conversation_id=req.conversation_id, channel=req.channel,
    )
    return result.to_dict()


class FeedbackRequest(BaseModel):
    message_id: int
    rating: Literal["helpful", "not_helpful"]
    comment: str | None = Field(None, max_length=1000)


@router.post("/feedback")
async def feedback(req: FeedbackRequest, user: dict = Depends(_advisory)):
    if not record_feedback(get_platform_connection(), req.message_id, user["id"], req.rating, req.comment):
        raise HTTPException(404, "Message not found")
    return {"message_id": req.message_id, "rating": req.rating}


@router.get("/conversations/{conversation_id}")
async def conversation(conversation_id: int, user: dict = Depends(_advisory)):
    conv = pquery_one("SELECT * FROM conversations WHERE id=?", (conversation_id,))
    if not conv or conv["user_id"] != user["id"]:
        raise HTTPException(404, "Conversation not found")
    rows = pquery(
        """SELECT id, question, language, answer, sources, confidence, guardrail_flags, escalated, feedback, created_at
           FROM messages WHERE conversation_id=? ORDER BY id""", (conversation_id,))
    for r in rows:
        r["sources"] = json.loads(r["sources"] or "[]")
        r["guardrail_flags"] = json.loads(r["guardrail_flags"] or "[]")
    return {**conv, "messages": rows}


# ── Diagnosis -> treatment plan (F5) ──────────────────────────────────────────

import sqlite3  # noqa: E402
import uuid  # noqa: E402
from datetime import datetime as _dt  # noqa: E402

from fastapi import File, Form, UploadFile  # noqa: E402

from backend.advisory.adapters.disease_service import DiseaseServiceClient, DualPrediction, Prediction  # noqa: E402
from backend.advisory.alerts import render, run_alert_cycle  # noqa: E402
from backend.advisory.config import ROOT, local_now  # noqa: E402
from backend.advisory.diagnosis import (  # noqa: E402
    build_plan, confidence_threshold, decide, diagnose_response, record_diagnosis,
)
from backend.advisory.languages import SUPPORTED  # noqa: E402
from backend.advisory.providers import EcologicalInput, ProviderError  # noqa: E402

UPLOADS = ROOT / "data" / "uploads" / "diagnoses"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
_advisory_admin = require_permission(P.ADVISORY_ADMIN)


def _active_season(conn, farmer_id: int, farm_id: int | None) -> dict | None:
    cur = conn.cursor()
    cur.row_factory = sqlite3.Row
    sql = ("SELECT s.*, f.user_id FROM crop_seasons s JOIN farms f ON f.id = s.farm_id "
           "WHERE f.user_id = ? AND s.status = 'active'" + (" AND f.id = ?" if farm_id else "") +
           " ORDER BY s.planting_date DESC LIMIT 1")
    row = cur.execute(sql, (farmer_id, farm_id) if farm_id else (farmer_id,)).fetchone()
    return dict(row) if row else None


def _escalate(conn, diagnosis_id: int, farmer_id: int, reason: str, now) -> None:
    da = conn.execute("SELECT assigned_da_id FROM farmer_profiles WHERE user_id=?", (farmer_id,)).fetchone()
    with conn:
        conn.execute(
            "INSERT INTO escalations (diagnosis_id, farmer_id, reason, assigned_to, created_at) VALUES (?,?,?,?,?)",
            (diagnosis_id, farmer_id, reason, da[0] if da else None, now.isoformat(sep=" ", timespec="seconds")))


def _plan_and_record(conn, *, user: dict, farmer_id: int, farm_id: int | None, pred: DualPrediction, ctx,
                     lang: str, image_ref: str | None, source: str = "model") -> dict:
    now = local_now()
    decision = decide(conn, pred, confidence_threshold(conn))
    season = _active_season(conn, farmer_id, farm_id)
    crop = (season or {}).get("crop") or "wheat"
    profile = ctx.profile if ctx else {}
    plan = None
    if decision.kind == "disease":
        forecast = None
        if profile.get("latitude") is not None:
            try:
                forecast = registry.weather().forecast(profile["latitude"], profile["longitude"])
            except ProviderError:
                forecast = None
        plan = build_plan(conn, decision.disease_key, crop, lang, weather_forecast=forecast, now=now,
                          input_hub=registry.input_hub(conn), latitude=profile.get("latitude"),
                          longitude=profile.get("longitude"), region=profile.get("region"))
    did, follow_up = record_diagnosis(
        conn, farmer_id=farmer_id, farm_id=farm_id or (season or {}).get("farm_id"),
        crop_season_id=(season or {}).get("id"), decision=decision, pred=pred, latitude=profile.get("latitude"),
        longitude=profile.get("longitude"), image_ref=image_ref, now=now, source=source)
    escalated = decision.kind == "uncertain"
    if escalated:
        _escalate(conn, did, farmer_id, "low_confidence", now)
    return diagnose_response(conn, decision=decision, pred=pred, lang=lang, plan=plan, diagnosis_id=did,
                             follow_up=follow_up, escalated=escalated)


def _lang(user: dict, requested: str | None) -> str:
    if requested in SUPPORTED:
        return requested
    return user.get("language") if user.get("language") in SUPPORTED else "en"


def _subject_farmer(user: dict, farmer_id: int | None, farm_id: int | None) -> int:
    """Whose crop this is: the farm's owner when a farm is given (a DA checking a farmer's field),
    otherwise farmer_id, otherwise the caller. Access is checked for anyone but the caller."""
    if farm_id:
        farm = pquery_one("SELECT user_id FROM farms WHERE id=?", (farm_id,))
        if not farm:
            raise HTTPException(404, "Farm not found")
        if farmer_id and farmer_id != farm["user_id"]:
            raise HTTPException(400, "This farm belongs to a different farmer.")
        farmer_id = farm["user_id"]
    farmer_id = farmer_id or user["id"]
    if farmer_id != user["id"]:
        farmer_for_read(user, farmer_id)
    return farmer_id


@router.post("/diagnose")
async def diagnose(image: UploadFile = File(...), farmer_id: int | None = Form(None), farm_id: int | None = Form(None),
                   language: str | None = Form(None), capture_source: str | None = Form(None),
                   user: dict = Depends(require_permission(P.CROP_HEALTH_USE))):
    """Photo + the farm's altitude and past-week weather -> disease model -> decision -> plan.

    capture_source: "camera" or "gallery" (sent by the app). With the farmer's training consent the
    photo is also added to the training dataset (backend/training_data.py)."""
    farmer_id = _subject_farmer(user, farmer_id, farm_id)
    data = await image.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image is larger than 10 MB.")
    conn = get_platform_connection()
    lang = _lang(user, language)
    try:
        ctx = await asyncio.to_thread(_context, farmer_id)
    except LookupError:
        raise HTTPException(404, "Farmer not found")
    eco = None
    past = ctx.weather.data.get("past_week") if ctx.weather.status == "ok" else None
    altitude = ctx.profile.get("altitude_m")
    if past and altitude is not None and None not in (past["temperature_c"], past["humidity_pct"],
                                                       past["precipitation_mm_per_week"]):
        eco = EcologicalInput(altitude, past["temperature_c"], past["humidity_pct"], past["precipitation_mm_per_week"])

    UPLOADS.mkdir(parents=True, exist_ok=True)
    ext = ((image.filename or "photo.jpg").rsplit(".", 1)[-1].lower()[:5]) or "jpg"
    name = f"{_dt.now():%Y%m%d}-{uuid.uuid4().hex[:12]}.{ext}"
    (UPLOADS / name).write_bytes(data)
    try:
        pred = await asyncio.to_thread(DiseaseServiceClient().predict_dual, data, image.filename or name, eco)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except ProviderError as e:
        raise HTTPException(503, f"The disease model is not available: {e}")
    result = await asyncio.to_thread(_plan_and_record, conn, user=user, farmer_id=farmer_id, farm_id=farm_id,
                                     pred=pred, ctx=ctx, lang=lang, image_ref=f"diagnoses/{name}")
    await asyncio.to_thread(_add_to_dataset, conn, farmer_id, farm_id, result, pred, data, capture_source, eco, altitude)
    return result


def _add_to_dataset(conn, farmer_id: int, farm_id: int | None, result: dict, pred: DualPrediction, data: bytes,
                    capture_source: str | None, eco: EcologicalInput | None, altitude: float | None) -> None:
    from backend import training_data

    crop = conn.execute("SELECT crop_name FROM farms WHERE id=? AND user_id=?", (farm_id, farmer_id)).fetchone() if farm_id else None
    woreda = conn.execute("SELECT woreda_pcode FROM users WHERE id=?", (farmer_id,)).fetchone()
    top = pred.with_conditions or pred.photo_only
    training_data.collect_safely(
        conn, farmer_id=farmer_id, diagnosis_id=result.get("diagnosis_id"), image=data,
        capture_source=capture_source or "unknown", crop=crop[0] if crop else None,
        woreda_pcode=woreda[0] if woreda else None, altitude_m=altitude,
        weather={"temperature_c": eco.temperature_c, "humidity_pct": eco.humidity_pct,
                 "precipitation_mm_per_week": eco.precipitation_mm} if eco else None,
        model_version=pred.model_version, model_label=top.label, model_confidence=top.confidence)


class DiagnosisPlanRequest(BaseModel):
    farmer_id: int | None = None
    farm_id: int | None = None
    disease: str = Field(..., description="Model class label (e.g. 'Yellow Rust') or disease key ('yellow_rust')")
    confidence: float = Field(..., ge=0, le=1)
    language: Literal["am", "om", "en", "ti"] | None = None


@router.post("/diagnosis-plan")
async def diagnosis_plan(req: DiagnosisPlanRequest, user: dict = Depends(require_permission(P.CROP_HEALTH_USE))):
    """Spec §9: a diagnosis produced elsewhere (e.g. an on-device model) -> treatment plan."""
    farmer_id = _subject_farmer(user, req.farmer_id, req.farm_id)
    conn = get_platform_connection()
    row = conn.execute("SELECT model_label FROM diseases WHERE model_label=? OR key=?",
                       (req.disease, req.disease)).fetchone()
    if not row:
        raise HTTPException(400, f"Unknown disease '{req.disease}'.")
    try:
        ctx = await asyncio.to_thread(_context, farmer_id)
    except LookupError:
        raise HTTPException(404, "Farmer not found")
    pred = DualPrediction("external", Prediction(row[0], req.confidence, {row[0]: req.confidence}), None, None, [])
    return await asyncio.to_thread(_plan_and_record, conn, user=user, farmer_id=farmer_id, farm_id=req.farm_id,
                                   pred=pred, ctx=ctx, lang=_lang(user, req.language), image_ref=None,
                                   source="manual")


class OutcomeRequest(BaseModel):
    outcome: Literal["improved", "same", "worse"]


@router.post("/diagnoses/{diagnosis_id}/outcome")
async def diagnosis_outcome(diagnosis_id: int, req: OutcomeRequest, user: dict = Depends(_advisory)):
    conn = get_platform_connection()
    row = conn.execute("SELECT farmer_id FROM diagnoses WHERE id=?", (diagnosis_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Diagnosis not found")
    if row[0] != user["id"]:
        farmer_for_read(user, row[0])
    with conn:
        conn.execute("UPDATE diagnoses SET outcome=? WHERE id=?", (req.outcome, diagnosis_id))
        conn.execute("UPDATE alerts SET status='read' WHERE dedupe_key=?", (f"follow_up:{diagnosis_id}",))
    if req.outcome == "worse":
        _escalate(conn, diagnosis_id, row[0], "advice_failed", local_now())
    return {"diagnosis_id": diagnosis_id, "outcome": req.outcome, "escalated": req.outcome == "worse"}


# ── Alerts (F7 neighbourhood, F5 follow-ups) ──────────────────────────────────

@router.get("/alerts")
async def my_alerts(language: str | None = None, user: dict = Depends(_advisory)):
    lang = _lang(user, language)
    rows = pquery(
        """SELECT id, type, severity, message_key, payload, status, created_at, scheduled_for FROM alerts
           WHERE farmer_id=? AND status IN ('queued','sent','delivered','read') ORDER BY created_at DESC LIMIT 50""",
        (user["id"],))
    return [{**{k: r[k] for k in ("id", "type", "severity", "status", "created_at", "scheduled_for")},
             "payload": json.loads(r["payload"] or "{}"), "message": render(r, lang, get_platform_connection())}
            for r in rows]


@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: int, user: dict = Depends(_advisory)):
    conn = get_platform_connection()
    with conn:
        n = conn.execute("UPDATE alerts SET status='read' WHERE id=? AND farmer_id=?", (alert_id, user["id"])).rowcount
    if not n:
        raise HTTPException(404, "Alert not found")
    return {"id": alert_id, "status": "read"}


@router.post("/admin/run-alerts")
async def run_alerts_now(_user=Depends(_advisory_admin)):
    r = await asyncio.to_thread(run_alert_cycle, get_platform_connection(), None, registry.weather())
    return {"outbreak_alerts": r.outbreak_alerts, "suppressed": r.suppressed, "follow_ups_due": r.follow_ups_due,
            "stage_reminders": r.stage_reminders, "spray_warnings": r.spray_warnings,
            "skipped_no_consent": r.skipped_no_consent, "details": r.details}


# ── Text-to-speech (read answers and alerts aloud) ────────────────────────────

from fastapi.responses import Response  # noqa: E402

from backend.advisory import tts  # noqa: E402


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    language: Literal["am", "om", "en", "ti"]


@router.post("/tts")
async def speak(req: SpeakRequest, _user: dict = Depends(_advisory)):
    """WAV audio of the text: Gemini TTS (am/ti/en) or the local MMS voice (om, and fallback)."""
    try:
        speech = await asyncio.to_thread(tts.synthesize, req.text, req.language)
    except ProviderError as e:
        raise HTTPException(503, str(e))
    return Response(speech.audio, media_type="audio/wav",
                    headers={"X-TTS-Engine": speech.engine, "X-TTS-Cached": str(speech.cached).lower(),
                             "Cache-Control": "private, max-age=86400"})


# ── Voice questions (speech-to-text) ─────────────────────────────────────────

from backend.advisory import stt  # noqa: E402


@router.post("/stt")
async def transcribe(audio: UploadFile = File(...), language: Literal["am", "om", "en", "ti"] = Form(...),
                     _user: dict = Depends(_advisory)):
    """Spoken question -> text for the farmer to check and send. The audio is not stored."""
    data = await audio.read(stt.MAX_BYTES + 1)
    try:
        t = await asyncio.to_thread(stt.transcribe, data, audio.content_type or "", language)
    except ValueError as e:
        raise HTTPException(413 if len(data) > stt.MAX_BYTES else 400, str(e))
    except ProviderError as e:
        raise HTTPException(503, str(e))
    return {"text": t.text, "language": t.language, "engine": t.engine, "quality_verified": t.quality_verified}
