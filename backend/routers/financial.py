"""
routers/financial.py — Credit profile + loan product matching.
"""

import asyncio
import time
import json
from fastapi import APIRouter, Depends
from backend.platform_db import pquery, pquery_one
from backend.auth import require_permission
from backend.permissions import P

router = APIRouter(prefix="/financial", tags=["financial"])


def _compute_credit_score(user: dict) -> tuple[int, list[dict], list[dict]]:
    """
    Deterministic credit score. Never uses LLM.
    Returns (score, positive_factors, risk_factors).
    """
    score = 50
    positive = []
    risks = []

    farms = pquery("SELECT * FROM farms WHERE user_id=?", (user["id"],))
    if farms:
        score += 10
        positive.append({"code": "farm_records", "value": len(farms), "label": "Documented Farm Records", "points": "+10", "detail": f"{len(farms)} farm(s) on record"})

    if user.get("region"):
        score += 5
        positive.append({"code": "region", "value": user["region"], "label": "Regional Presence", "points": "+5", "detail": f"Registered in {user['region']}"})

    if user.get("zone"):
        score += 3
        positive.append({"code": "zone", "value": user["zone"], "label": "Zone Registration", "points": "+3", "detail": f"Zone: {user['zone']}"})

    # Check farm health
    open_reports = pquery(
        "SELECT hr.* FROM health_reports hr JOIN farms f ON f.id=hr.farm_id WHERE f.user_id=? AND hr.resolved=0",
        (user["id"],),
    )
    critical = [r for r in open_reports if r["severity"] in ("critical", "high")]
    moderate = [r for r in open_reports if r["severity"] == "moderate"]

    if critical:
        score -= 15
        risks.append({"code": "critical_reports", "value": len(critical), "label": "Unresolved Critical Disease Reports", "points": "-15", "detail": f"{len(critical)} critical health report(s) open"})
    if moderate:
        score -= 5
        risks.append({"code": "moderate_reports", "value": len(moderate), "label": "Active Disease Warnings", "points": "-5", "detail": f"{len(moderate)} moderate report(s) pending follow-up"})

    # Resolved reports show accountability
    resolved_reports = pquery(
        "SELECT COUNT(*) as cnt FROM health_reports hr JOIN farms f ON f.id=hr.farm_id WHERE f.user_id=? AND hr.resolved=1",
        (user["id"],),
    )
    if resolved_reports and resolved_reports[0]["cnt"] > 0:
        score += 5
        positive.append({"code": "track_record", "value": resolved_reports[0]["cnt"], "label": "Track Record", "points": "+5", "detail": f"{resolved_reports[0]['cnt']} resolved health report(s)"})

    # Farming area bonus
    total_area = sum(f.get("area_ha") or 0 for f in farms)
    if total_area >= 2.0:
        score += 7
        positive.append({"code": "farm_scale", "value": round(total_area, 1), "label": "Farm Scale", "points": "+7", "detail": f"{total_area:.1f} ha of documented farmland"})
    elif total_area > 0:
        score += 3
        positive.append({"code": "smallholder", "value": round(total_area, 1), "label": "Smallholder Farm", "points": "+3", "detail": f"{total_area:.1f} ha registered"})

    score = max(0, min(100, score))
    return score, positive, risks


# The explanation only changes when the score or its factors change, and the Gemini key is on
# a small daily free quota shared with the advisory module, so cache it for a day per user.
_EXPLANATION_TTL_SECONDS = 24 * 3600
_explanations: dict[tuple, tuple[float, str]] = {}


async def _get_score_explanation(score: int, user: dict, positive: list, risks: list) -> str:
    key = (user["id"], score, tuple(f["label"] for f in positive), tuple(r["label"] for r in risks))
    hit = _explanations.get(key)
    if hit and time.monotonic() - hit[0] < _EXPLANATION_TTL_SECONDS:
        return hit[1]
    text = await _generate_score_explanation(score, user, positive, risks)
    if text is not None:
        _explanations[key] = (time.monotonic(), text)
        return text
    level = "good" if score >= 60 else "moderate" if score >= 40 else "low"
    return f"Your credit score of {score} is {level}. Complete your farm records and resolve any open disease reports to improve your score and unlock larger loans."


def score_explanation_prompt(score: int, user: dict, positive: list, risks: list) -> str:
    """Prompt for the external AI. Anonymised: region only, never the farmer's name or phone."""
    pos_text = "; ".join(f["label"] for f in positive) if positive else "none yet"
    risk_text = "; ".join(r["label"] for r in risks) if risks else "none"
    return (
        f"You are a financial advisor helping Ethiopian smallholder farmers. "
        f"A farmer in {user.get('region') or 'Ethiopia'} has a credit score of {score}/100. "
        f"Positive factors: {pos_text}. Risk factors: {risk_text}.\n\n"
        f"Write 2–3 plain-language sentences explaining:\n"
        f"1. What this score means for loan access\n"
        f"2. One specific thing they can do to improve it\n"
        f"Be encouraging and practical. Avoid financial jargon."
    )


async def _generate_score_explanation(score: int, user: dict, positive: list, risks: list) -> str | None:
    """Gemini explanation, or None when the service is unavailable (not cached, so it retries later)."""
    try:
        from backend.advisory.registry import generate_text

        prompt = score_explanation_prompt(score, user, positive, risks)
        # Selected AI engine (Gemini or DeepSeek); blocking, so off the event loop
        return (await asyncio.to_thread(generate_text, prompt)).strip()
    except Exception:
        return None


@router.get("/profile")
async def credit_profile(user: dict = Depends(require_permission(P.FINANCIAL_READ))):
    score, positive, risks = _compute_credit_score(user)
    explanation = await _get_score_explanation(score, user, positive, risks)
    return {
        "score": score,
        "max_score": 100,
        "positive_factors": positive,
        "risk_factors": risks,
        "ai_explanation": explanation,
    }


@router.get("/loan-products")
async def loan_products(user: dict = Depends(require_permission(P.FINANCIAL_READ))):
    score, _, _ = _compute_credit_score(user)
    role = user["role"]

    all_products = pquery("SELECT * FROM loan_products WHERE active=1 ORDER BY interest_rate ASC")
    matched = []
    ineligible = []

    for p in all_products:
        eligible_roles = p.get("eligible_roles") or "[]"
        if isinstance(eligible_roles, str):
            try:
                eligible_roles = json.loads(eligible_roles)
            except Exception:
                eligible_roles = []

        p["eligible_roles"] = eligible_roles
        p["monthly_payment"] = None

        if p.get("interest_rate") and p.get("max_amount") and p.get("term_months"):
            r = (p["interest_rate"] / 100) / 12
            n = p["term_months"]
            principal = p["max_amount"]
            if r > 0:
                p["monthly_payment"] = round(principal * r * (1 + r) ** n / ((1 + r) ** n - 1))
            else:
                p["monthly_payment"] = round(principal / n)

        if role not in eligible_roles:
            p["match_status"] = "ineligible_role"
            ineligible.append(p)
        elif score < (p.get("min_credit_score") or 0):
            p["match_status"] = "score_too_low"
            p["score_gap"] = (p.get("min_credit_score") or 0) - score
            ineligible.append(p)
        else:
            p["match_status"] = "eligible"
            matched.append(p)

    return {
        "credit_score": score,
        "matched": matched,
        "ineligible": ineligible,
        # Lenders and products are seeded examples (backend/db_init.py), not real offers.
        # The credit score itself is real: rules applied to the user's own profile and farms.
        "demo_data": True,
        "demo_note": "Loan products and lenders are examples for demonstration only, not real offers.",
    }
