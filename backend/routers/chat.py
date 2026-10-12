"""
routers/chat.py — AI chat endpoint for the NMIS Dashboard.

POST /api/chat
  Accepts a user message + conversation history.
  Queries the DB for a live price bulletin, builds a context-aware system prompt,
  and calls Google Gemini to generate a farmer-friendly reply.
  Retries up to 3 times on 503 UNAVAILABLE transient errors.
"""

import asyncio
from fastapi import APIRouter, Depends
from backend.auth import require_permission
from backend.permissions import P
from backend.database import query
from backend.models import ChatRequest, ChatResponse

router = APIRouter()

SETUP_MESSAGE = (
    "The chat assistant is not configured yet. "
    "To enable it: add a Gemini key (https://aistudio.google.com/app/apikey) or a DeepSeek key "
    "(https://platform.deepseek.com) on the AI API Keys admin page, or set GEMINI_API_KEY / DEEPSEEK_API_KEY in .env."
)


def _load_price_bulletin() -> str:
    """Query DB for the most recent retail prices per crop x region."""
    try:
        rows = query("""
            SELECT
                c.crop_name,
                v.unit,
                m.region,
                ROUND(AVG((p.price_retail_min + p.price_retail_max) / 2.0)) AS avg_price
            FROM prices p
            JOIN varieties v ON v.id = p.variety_id
            JOIN crops c     ON c.id = v.crop_id
            JOIN markets m   ON m.id = p.market_id
            WHERE p.price_retail_min IS NOT NULL
              AND p.price_retail_max IS NOT NULL
              AND p.collection_date >= date('now', '-30 days')
            GROUP BY c.crop_name, v.unit, m.region
            ORDER BY c.crop_name, m.region
        """)
    except Exception:
        return ""

    by_crop: dict[str, tuple[str, list[str]]] = {}
    for r in rows:
        crop = r["crop_name"]
        unit = r["unit"]
        region = r["region"]
        price = r["avg_price"]
        if price is None:
            continue
        if crop not in by_crop:
            by_crop[crop] = (unit, [])
        by_crop[crop][1].append(f"{region} ~{int(price):,}")

    if not by_crop:
        return ""

    lines = []
    for crop, (unit, entries) in sorted(by_crop.items()):
        lines.append(f"  {crop} (per {unit}): {' | '.join(entries)}")

    return (
        "NMIS Live Price Bulletin — retail prices, last 30 days, in ETB:\n"
        + "\n".join(lines)
    )


SYSTEM_PROMPT_TEMPLATE = """You are a friendly agricultural market advisor for Ethiopian farmers, traders, and extension agents. You work for NMIS — the National Market Information System.

Your job is to help people understand crop prices and make better decisions about buying, selling, and growing crops in Ethiopia.

What you know about NMIS:
- 19 crops tracked: Teff, Wheat, Maize, Sorghum, Barley, Malt Barley, Bean, Sesame, Soybean, Onion, Tomato, Potato, Garlic, Red Pepper, Banana, Mango, Avocado, Pineapple, Local Rice
- 6 regions covered: Oromia, Amhara, SNNP, Sidama, South West, Tigray
- Prices collected weekly from 309 markets across Ethiopia
- Data goes back to 2019, showing clear seasonal patterns
- Addis Ababa is NOT one of the NMIS regions. When asked about Addis Ababa prices, explain that Addis Ababa buyers get supplies mainly from Oromia and Amhara — use those prices as a reference.

{price_bulletin}

Rules:
- Keep replies SHORT — 2 to 4 sentences.
- Use simple, everyday words. No technical jargon.
- Focus on what the farmer or trader should DO.
- When you quote a price from the bulletin above, say it is the NMIS average for that region this month.
- If you need more information to help, ASK the user (e.g. "Which crop?" or "Which region are you in?").
- If someone writes in Amharic, reply in Amharic.
- If someone writes in Oromo or another Ethiopian language, try your best to reply in the same language.
- If asked about topics unrelated to Ethiopian agriculture or farming, politely redirect back to market topics.
"""


def _build_system_prompt() -> str:
    bulletin = _load_price_bulletin()
    if bulletin:
        return SYSTEM_PROMPT_TEMPLATE.format(price_bulletin=bulletin)
    return SYSTEM_PROMPT_TEMPLATE.format(
        price_bulletin="(Price data currently unavailable — answer based on general knowledge of Ethiopian markets.)"
    )


def _is_transient(err_str: str) -> bool:
    return any(kw in err_str for kw in ("503", "UNAVAILABLE", "overloaded", "Service Unavailable"))


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    _user: dict = Depends(require_permission(P.ADVISORY_USE)),  # signed-in users only: each call spends Gemini quota
) -> ChatResponse:
    try:
        from backend.advisory.providers import ChatTurn, ProviderError
        from backend.advisory.registry import generate_text

        history = [ChatTurn("assistant" if m.role == "assistant" else "user", m.content) for m in request.history[-10:]]
        # Selected AI engine (Gemini or DeepSeek, key pools with rotation). Blocking: run off the event loop.
        try:
            reply = await asyncio.to_thread(generate_text, request.message, system=_build_system_prompt(),
                                            history=history, temperature=0.7)
        except ProviderError as exc:
            if "API key is available" in str(exc):
                return ChatResponse(reply=SETUP_MESSAGE)
            raise
        return ChatResponse(reply=reply.strip())

    except Exception as exc:
        err = str(exc)
        if "API_KEY" in err or "api key" in err.lower() or "401" in err:
            return ChatResponse(
                reply="The API key is invalid or expired. An administrator can check it on the AI API Keys page.",
                error=err,
            )
        if "quota" in err.lower() or "429" in err:
            return ChatResponse(
                reply="Every AI key has reached its limit. Please try again later.",
                error=err,
            )
        if _is_transient(err):
            return ChatResponse(
                reply="The AI service is busy right now. Please send your message again in a moment.",
                error=err,
            )
        return ChatResponse(
            reply="Sorry, I could not get a response right now. Please try again.",
            error=err,
        )
