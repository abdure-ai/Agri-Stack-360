"""
market_answer.py — Answer "what is the price of X?" straight from NMIS market data.

A question that names an NMIS crop *and* asks about price (in Amharic, Afaan Oromoo, Tigrinya or English)
is answered from the price database, with no AI call:
  - the nearest markets with a recent price (farm point, or the woreda centre), else markets in the
    user's region, else the most recently reported markets in the country;
  - each market's latest retail price (average of the reported min and max), its week, and the
    4-week trend; the regional 4-week forecast when the forecast service has one.
The answer cites "NMIS market price data" and says that prices are reports, not a promise.

Other questions (growing, disease, fertilizer...) keep going to the guideline-based advisor.
"""

from __future__ import annotations

import re
import sqlite3
from datetime import date

from backend.advisory.ethiopian_calendar import format_dual
from backend.advisory.i18n import t

# NMIS crop name -> words that mean it, per language (stems; Ethiopic words also match inside longer forms).
# Longer terms are tried first, so "ነጭ ሽንኩርት" (garlic) wins over "ሽንኩርት" (onion).
CROP_TERMS: dict[str, dict[str, list[str]]] = {
    "Avocado": {"en": ["avocado"], "am": ["አቮካዶ", "አቦካዶ"], "om": ["avookaadoo", "avocado"], "ti": ["ኣቮካዶ", "አቮካዶ"]},
    "Banana": {"en": ["banana"], "am": ["ሙዝ"], "om": ["muuzii", "muuzi"], "ti": ["ባናና", "ሙዝ"]},
    "Bean": {"en": ["haricot", "bean"], "am": ["ቦሎቄ"], "om": ["boloqqee", "boloqee"], "ti": ["ፋጁሊ"]},
    "Garlic": {"en": ["garlic"], "am": ["ነጭ ሽንኩርት"], "om": ["qullubbii adii"], "ti": ["ጻዕዳ ሽጉርቲ"]},
    "Green Mung": {"en": ["mung"], "am": ["ማሾ"], "om": ["maashoo"], "ti": ["ማሾ"]},
    "Local Rice": {"en": ["rice"], "am": ["ሩዝ"], "om": ["ruuzii", "ruzii"], "ti": ["ሩዝ"]},
    "Maize": {"en": ["maize", "corn"], "am": ["በቆሎ"], "om": ["boqqolloo", "boqolloo"], "ti": ["ዕፉን"]},
    "Malt Barely": {"en": ["barley"], "am": ["ገብስ"], "om": ["garbuu"], "ti": ["ስገም"]},
    "Mango": {"en": ["mango"], "am": ["ማንጎ"], "om": ["maangoo", "mangoo"], "ti": ["ማንጎ"]},
    "Onion": {"en": ["onion"], "am": ["ቀይ ሽንኩርት", "ሽንኩርት"], "om": ["qullubbii diimaa", "qullubbii"],
              "ti": ["ቀይሕ ሽጉርቲ", "ሽጉርቲ"]},
    "Pineapple": {"en": ["pineapple"], "am": ["አናናስ"], "om": ["anaanaasii", "ananaasii"], "ti": ["ኣናናስ", "አናናስ"]},
    "Potato": {"en": ["potato"], "am": ["ድንች"], "om": ["dinnicha", "dinnichi"], "ti": ["ድንሽ", "ድንች"]},
    "Red Pepper": {"en": ["red pepper", "pepper", "chili"], "am": ["በርበሬ"], "om": ["barbaree", "mimmixa"],
                   "ti": ["በርበረ"]},
    "Sesame": {"en": ["sesame"], "am": ["ሰሊጥ"], "om": ["saliixa"], "ti": ["ሰሊጥ"]},
    "Sorghum": {"en": ["sorghum"], "am": ["ማሽላ"], "om": ["mishingaa", "mishinga"], "ti": ["ማሽላ"]},
    "Soybean": {"en": ["soybean", "soya"], "am": ["አኩሪ አተር"], "om": ["sooyaa"], "ti": ["ሶያ"]},
    "Teff": {"en": ["teff", "tef"], "am": ["ጤፍ"], "om": ["xaafii", "xaafi"], "ti": ["ጣፍ"]},
    "Tomato": {"en": ["tomato"], "am": ["ቲማቲም"], "om": ["timaatima", "timaatimii"], "ti": ["ኮሚደረ", "ቲማቲም"]},
    "Wheat": {"en": ["wheat"], "am": ["ስንዴ"], "om": ["qamadii"], "ti": ["ስርናይ"]},
}
# Display name per language (the web app's crop names).
CROP_NAMES: dict[str, dict[str, str]] = {
    "Avocado": {"am": "አቮካዶ", "om": "Avookaadoo", "ti": "ኣቮካዶ"}, "Banana": {"am": "ሙዝ", "om": "Muuzii", "ti": "ባናና"},
    "Bean": {"am": "ቦሎቄ", "om": "Boloqqee", "ti": "ፋጁሊ"}, "Garlic": {"am": "ነጭ ሽንኩርት", "om": "Qullubbii adii", "ti": "ጻዕዳ ሽጉርቲ"},
    "Green Mung": {"am": "ማሾ", "om": "Maashoo", "ti": "ማሾ"}, "Local Rice": {"am": "የአገር ውስጥ ሩዝ", "om": "Ruuzii biyya keessaa", "ti": "ናይ ዓዲ ሩዝ"},
    "Maize": {"am": "በቆሎ", "om": "Boqqolloo", "ti": "ዕፉን"}, "Malt Barely": {"en": "Malt barley", "am": "የቢራ ገብስ", "om": "Garbuu biiraa", "ti": "ናይ ቢራ ስገም"},
    "Mango": {"am": "ማንጎ", "om": "Maangoo", "ti": "ማንጎ"}, "Onion": {"am": "ቀይ ሽንኩርት", "om": "Qullubbii diimaa", "ti": "ቀይሕ ሽጉርቲ"},
    "Pineapple": {"am": "አናናስ", "om": "Anaanaasii", "ti": "ኣናናስ"}, "Potato": {"am": "ድንች", "om": "Dinnicha", "ti": "ድንሽ"},
    "Red Pepper": {"am": "በርበሬ", "om": "Barbaree", "ti": "በርበረ"}, "Sesame": {"am": "ሰሊጥ", "om": "Saliixa", "ti": "ሰሊጥ"},
    "Sorghum": {"am": "ማሽላ", "om": "Mishingaa", "ti": "ማሽላ"}, "Soybean": {"am": "አኩሪ አተር", "om": "Sooyaa biinii", "ti": "ሶያ"},
    "Teff": {"am": "ጤፍ", "om": "Xaafii", "ti": "ጣፍ"}, "Tomato": {"am": "ቲማቲም", "om": "Timaatima", "ti": "ኮሚደረ"},
    "Wheat": {"am": "ስንዴ", "om": "Qamadii", "ti": "ስርናይ"},
}
# Crops farmers ask about that NMIS does not report: answered with "no NMIS price", not escalated.
OTHER_CROP_TERMS: dict[str, dict[str, list[str]]] = {
    "coffee": {"en": ["coffee"], "am": ["ቡና"], "om": ["buna", "bunna"], "ti": ["ቡን"]},
    "khat": {"en": ["khat", "chat"], "am": ["ጫት"], "om": ["jimaa", "caatii"], "ti": ["ጫት"]},
    "enset": {"en": ["enset", "ensete"], "am": ["እንሰት"], "om": ["warqee"], "ti": ["እንሰት"]},
    "chickpea": {"en": ["chickpea"], "am": ["ሽምብራ"], "om": ["shumbura", "shimbira"], "ti": ["ሽምብራ", "ዓይኒ ዓተር"]},
    "lentil": {"en": ["lentil"], "am": ["ምስር"], "om": ["misira"], "ti": ["ብርስን"]},
    "faba_bean": {"en": ["faba bean", "broad bean"], "am": ["ባቄላ"], "om": ["baaqelaa"], "ti": ["ባልደንጓ"]},
    "linseed": {"en": ["linseed", "flax"], "am": ["ተልባ"], "om": ["talbaa"], "ti": ["ተልባ"]},
    "niger_seed": {"en": ["niger seed", "noug"], "am": ["ኑግ"], "om": ["nuugii"], "ti": ["ኑግ"]},
    "groundnut": {"en": ["groundnut", "peanut"], "am": ["ኦቾሎኒ"], "om": ["ocholoonii"], "ti": ["ኦቾሎኒ"]},
    "cabbage": {"en": ["cabbage", "kale"], "am": ["ጎመን"], "om": ["raafuu"], "ti": ["ካውሎ"]},
    "sugarcane": {"en": ["sugarcane", "sugar cane"], "am": ["ሸንኮራ"], "om": ["shankoraa"], "ti": ["ሸንኮራ"]},
}
OTHER_CROP_NAMES: dict[str, dict[str, str]] = {
    "coffee": {"en": "Coffee", "am": "ቡና", "om": "Buna", "ti": "ቡን"},
    "khat": {"en": "Khat", "am": "ጫት", "om": "Jimaa", "ti": "ጫት"},
    "enset": {"en": "Enset", "am": "እንሰት", "om": "Warqee", "ti": "እንሰት"},
    "chickpea": {"en": "Chickpea", "am": "ሽምብራ", "om": "Shumbura", "ti": "ሽምብራ"},
    "lentil": {"en": "Lentil", "am": "ምስር", "om": "Misira", "ti": "ብርስን"},
    "faba_bean": {"en": "Faba bean", "am": "ባቄላ", "om": "Baaqelaa", "ti": "ባልደንጓ"},
    "linseed": {"en": "Linseed", "am": "ተልባ", "om": "Talbaa", "ti": "ተልባ"},
    "niger_seed": {"en": "Niger seed", "am": "ኑግ", "om": "Nuugii", "ti": "ኑግ"},
    "groundnut": {"en": "Groundnut", "am": "ኦቾሎኒ", "om": "Ocholoonii", "ti": "ኦቾሎኒ"},
    "cabbage": {"en": "Cabbage", "am": "ጎመን", "om": "Raafuu", "ti": "ካውሎ"},
    "sugarcane": {"en": "Sugarcane", "am": "ሸንኮራ", "om": "Shankoraa", "ti": "ሸንኮራ"},
}

PRICE_WORDS = {
    "en": ["price", "cost", "how much", "birr", "etb", "market rate", "selling for", "sells for"],
    "am": ["ዋጋ", "ስንት ብር", "ስንት ገባ", "ስንት ነው", "ብር ገባ", "ስንት ይሸጣል", "ስንት ደረሰ", "በስንት"],
    "om": ["gatii", "gatiin", "meeqa", "qarshii", "hammam gurgurama"],
    "ti": ["ዋጋ", "ክንደይ", "ብር", "ብኽንደይ"],
}
_ETHIOPIC = re.compile(r"[ሀ-᎟]")


def _has(text: str, term: str) -> bool:
    if _ETHIOPIC.search(term):
        return term in text                              # Ethiopic: affixes attach, so match inside words
    return re.search(rf"\b{re.escape(term)}", text) is not None   # Latin: word start ("onions", "gatiin")


def crops_in(question: str, lexicon: dict[str, dict[str, list[str]]] | None = None) -> list[str]:
    """Crops named in the question (NMIS crops by default), in order of first mention."""
    text = question.lower()
    terms = sorted(((term.lower(), crop) for crop, by_lang in (lexicon or CROP_TERMS).items()
                    for words in by_lang.values() for term in words), key=lambda x: -len(x[0]))
    found: dict[str, int] = {}
    for term, crop in terms:
        if crop in found:
            continue
        idx = text.find(term) if _ETHIOPIC.search(term) else (m.start() if (m := re.search(rf"\b{re.escape(term)}", text)) else -1)
        if idx >= 0:
            found[crop] = idx
            text = text[:idx] + " " * len(term) + text[idx + len(term):]   # "ነጭ ሽንኩርት" is not also onion
    return sorted(found, key=found.get)


def is_price_question(question: str) -> bool:
    text = question.lower()
    return any(_has(text, w.lower()) for words in PRICE_WORDS.values() for w in words)


def other_crops_in(question: str) -> list[str]:
    """Crops NMIS does not report (coffee, khat, ...) named in the question."""
    return crops_in(question, OTHER_CROP_TERMS)


def not_covered(crops: list[str], lang: str) -> dict:
    """'NMIS has no price for coffee; prices exist for: ...' (no escalation: a DA can't look it up either)."""
    sep = "፣ " if lang in ("am", "ti") else ", "
    names = sep.join(OTHER_CROP_NAMES[c].get(lang) or OTHER_CROP_NAMES[c]["en"] for c in crops)
    available = sep.join(sorted(crop_name(c, lang) for c in CROP_TERMS))
    return {"text": t("price_not_covered", lang, crop=names, crops=available), "sources": [], "as_of": None}


def crop_name(crop: str, lang: str) -> str:
    return CROP_NAMES.get(crop, {}).get(lang) or CROP_NAMES.get(crop, {}).get("en") or crop.title()


def _unit(unit: str | None, lang: str) -> str:
    return t("unit_kg" if (unit or "").lower() in ("kg", "kilogram") else "unit_quintal", lang)


def _trend(trend: str, lang: str) -> str:
    return t(f"price_trend_{trend}", lang) if trend in ("rising", "falling", "stable") else ""


def _markets(market, conn: sqlite3.Connection, crop: str, point, region: str | None) -> tuple[list[dict], str]:
    """Markets to quote and where they are: ('near', 'region', 'country')."""
    lat, lon = point
    if lat is not None and lon is not None:
        near = market.nearest_markets(crop, lat, lon, 3)
        if near:
            return near, "near"
    if region:
        regional = market.recent_markets(crop, region=region, n=3)
        if regional:
            return regional, "region"
    return market.recent_markets(crop, region=None, n=3), "country"


def answer(conn: sqlite3.Connection, *, crops: list[str], lang: str, point, region: str | None, market) -> dict:
    """Text + sources for a price question. `point` = (lat, lon) or (None, None)."""
    parts: list[str] = []
    latest: date | None = None
    for crop in crops[:2]:
        markets, where = _markets(market, conn, crop, point, region)
        name = crop_name(crop, lang)
        if not markets:
            parts.append(t("price_none", lang, crop=name))
            continue
        where_text = t(f"price_where_{where}", lang, region=markets[0]["region"])
        lines = [t("price_intro", lang, crop=name, where=where_text)]
        forecast = None
        for m in markets:
            q = market.quote(crop, m)
            if q.price_etb is None:
                continue
            latest = max(filter(None, [latest, q.as_of])) if q.as_of else latest
            distance = t("price_distance", lang, km=f"{m['distance_km']:g}") if m.get("distance_km") is not None else ""
            lines.append(t("price_line", lang, market=q.market, distance=distance, price=f"{q.price_etb:,.0f}",
                           unit=_unit(q.unit, lang), date=format_dual(q.as_of, lang) if q.as_of else "—",
                           trend=_trend(q.trend, lang)))
            if forecast is None and q.forecast_change_pct is not None:
                forecast = q
        if forecast is not None:
            key = "price_forecast_up" if forecast.forecast_change_pct > 1 else (
                "price_forecast_down" if forecast.forecast_change_pct < -1 else "price_forecast_flat")
            lines.append(t(key, lang, region=forecast.region, pct=f"{abs(forecast.forecast_change_pct):g}"))
        parts.append("\n".join(lines))
    parts.append(t("price_note", lang))
    citation = t("market_source", lang) + (f", {format_dual(latest, lang)}" if latest else "")
    return {"text": "\n\n".join(parts), "sources": [{"ref": "M", "citation": citation}], "as_of": latest}
