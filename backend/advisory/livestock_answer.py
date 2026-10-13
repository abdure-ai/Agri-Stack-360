"""
livestock_answer.py — Answer "what is the price of an ox / goat / sheep?" from NMIS livestock data (no AI call).

Like market_answer.py for crops: the question must ask about price (market_answer.PRICE_WORDS) and name an
animal. The answer lists the latest reported price range per head for up to three grades (in the user's
region when it has reports, else the most recent in the country) and the 4-week outlook with its confidence
and the reasons for it (period of the data, missing seasons, age of the last report, test error).
"""

from __future__ import annotations

import re
import sqlite3
from datetime import date

from backend import livestock
from backend.advisory.ethiopian_calendar import format_dual
from backend.advisory.i18n import t

# Animal -> words per language. Ethiopic words are matched as whole words, with one prefix (የ/ለ/ከ/በ/እ) and
# common endings allowed, so "የበሬ" is ox but "ሰላም" is not cow and "በግብርና" is not sheep.
ANIMAL_TERMS: dict[str, dict[str, list[str]]] = {
    "ox": {"en": ["ox", "oxen"], "am": ["በሬ"], "om": ["qotiyyoo", "sangaa", "sanga"], "ti": ["ብዕራይ", "ኣብዑር"]},
    "cow": {"en": ["cow"], "am": ["ላም", "ላሞች"], "om": ["sa'a", "saa'a", "saawwan"], "ti": ["ላም"]},
    "bull": {"en": ["bull"], "am": ["ኮርማ"], "om": ["korma", "kormaa"], "ti": ["ኮርማ"]},
    "heifer": {"en": ["heifer"], "am": ["ጊደር"], "om": ["goromsa", "goromsaa"], "ti": ["ጊደር"]},
    "calf": {"en": ["calf", "calves"], "am": ["ጥጃ"], "om": ["jabbii", "jabbiilee"], "ti": ["ምራኽ"]},
    "sheep": {"en": ["sheep", "ram", "lamb"], "am": ["በግ", "በጎች", "ጠቦት"], "om": ["hoolaa", "hoolota"],
              "ti": ["በጊዕ", "ኣባጊዕ"]},
    "goat": {"en": ["goat"], "am": ["ፍየል", "ፍየሎች"], "om": ["re'ee", "ree'ee", "reeyyii"], "ti": ["ጤል", "ኣጣል"]},
    "camel": {"en": ["camel"], "am": ["ግመል", "ግመሎች"], "om": ["gaala", "gaalaa"], "ti": ["ገመል", "ኣግማል"]},
    "chicken": {"en": ["chicken", "hen", "poultry"], "am": ["ዶሮ"], "om": ["lukkuu", "lukuu", "handaaqqoo"],
                "ti": ["ደርሆ"]},
}
ANIMAL_NAMES: dict[str, dict[str, str]] = {
    "ox": {"en": "Ox", "am": "በሬ", "om": "Qotiyyoo", "ti": "ብዕራይ"},
    "cow": {"en": "Cow", "am": "ላም", "om": "Sa'a", "ti": "ላም"},
    "bull": {"en": "Bull", "am": "ኮርማ", "om": "Korma", "ti": "ኮርማ"},
    "heifer": {"en": "Heifer", "am": "ጊደር", "om": "Goromsa", "ti": "ጊደር"},
    "calf": {"en": "Calf", "am": "ጥጃ", "om": "Jabbii", "ti": "ምራኽ"},
    "sheep": {"en": "Sheep", "am": "በግ", "om": "Hoolaa", "ti": "በጊዕ"},
    "goat": {"en": "Goat", "am": "ፍየል", "om": "Re'ee", "ti": "ጤል"},
    "camel": {"en": "Camel", "am": "ግመል", "om": "Gaala", "ti": "ገመል"},
    "chicken": {"en": "Chicken", "am": "ዶሮ", "om": "Lukkuu", "ti": "ደርሆ"},
}
_PREFIXES = "የለከበእ"
_SUFFIXES = {"", "ን", "ና", "ም", "ች", "ቹ", "ው", "ዋ", "ዎ", "ዎች", "ዎቹ", "ዎችን", "ዎችም", "ውን", "ዋን", "ንም", "ዬ",
             "ህ", "ሽ", "ቱ", "ቷ", "ስ", "ኮ", "ማ"}
_ETHIOPIC_WORD = re.compile(r"[ሀ-᎟]+")
_ETHIOPIC = re.compile(r"[ሀ-᎟]")


def _ethiopic_index(text: str, form: str) -> int:
    """Index of the first word that is `form` (with an allowed prefix/ending), else -1."""
    for m in _ETHIOPIC_WORD.finditer(text):
        word = m.group()
        for cand in (word, word[1:] if len(word) > 1 and word[0] in _PREFIXES else None):
            if cand and cand.startswith(form) and cand[len(form):] in _SUFFIXES:
                return m.start()
    return -1


def _latin_index(text: str, term: str) -> int:
    m = re.search(rf"(?<![a-z']){re.escape(term)}(s|es)?(?![a-z'])", text)
    return m.start() if m else -1


def animals_in(question: str) -> list[str]:
    """Animals named in the question, in order of first mention."""
    text = question.lower()
    found: dict[str, int] = {}
    for key, by_lang in ANIMAL_TERMS.items():
        idx = [i for words in by_lang.values() for w in words
               if (i := (_ethiopic_index(text, w) if _ETHIOPIC.search(w) else _latin_index(text, w.lower()))) >= 0]
        if idx:
            found[key] = min(idx)
    return sorted(found, key=found.get)


def data_names(conn: sqlite3.Connection, key: str) -> list[str]:
    """Animal names in the loaded data that mean this animal ("Ox", "Oxen (Indigenous)" -> ox)."""
    words = set(ANIMAL_TERMS[key]["en"])
    out = []
    for name in livestock.animals(conn):
        tokens = set(re.findall(r"[a-z]+", name.lower()))
        if tokens & words or {w.rstrip("s") for w in tokens} & words:
            out.append(name)
    return out


def animal_name(key: str, lang: str) -> str:
    return ANIMAL_NAMES[key].get(lang) or ANIMAL_NAMES[key]["en"]


def _date(text: str, lang: str) -> str:
    return format_dual(date.fromisoformat(text), lang)


def reasons_text(result: dict, lang: str) -> str:
    out = []
    for r in result.get("reasons", []):
        p = r["params"]
        if r["code"] == "period":
            out.append(t("lv_reason_period", lang, reports=p["reports"], markets=p["markets"],
                         start=_date(p["start"], lang), end=_date(p["end"], lang)))
        elif r["code"] == "checked":
            out.append(t("lv_reason_checked", lang, pct=f"{p['model_error_pct']:g}"))
        elif r["code"] in ("no_season", "short_period", "stale", "few_reports", "no_trend", "not_checked", "too_few"):
            out.append(t(f"lv_reason_{r['code']}", lang, **{k: v for k, v in p.items() if k in ("days", "reports")}))
    return " ".join(out)


def outlook_text(result: dict, lang: str) -> str:
    if result.get("status") != "ok":
        return t("lv_no_forecast", lang) + " " + reasons_text(result, lang)
    key = {"up": "lv_forecast_up", "down": "lv_forecast_down"}.get(result["direction"], "lv_forecast_flat")
    where = t("lv_in_region", lang, region=result["region"]) if result.get("region") else ""
    head = t(key, lang, where=where, pct=f"{abs(result['change_pct']):g}",
             confidence=t(f"lv_conf_{result['confidence']}", lang))
    return head + " " + reasons_text(result, lang)


def answer(conn: sqlite3.Connection, *, animals: list[str], lang: str, region: str | None) -> dict:
    parts: list[str] = []
    latest: date | None = None
    for key in animals[:2]:
        names = data_names(conn, key)
        reports = livestock.latest_reports(conn, names[0], region, 3) if names else []
        if not reports:
            parts.append(t("lv_none", lang, animal=animal_name(key, lang)))
            continue
        where = (t("lv_where_region", lang, region=reports[0]["region"]) if reports[0]["where"] == "region"
                 else t("lv_where_country", lang))
        lines = [t("lv_intro", lang, animal=animal_name(key, lang), where=where)]
        for s in reports:
            p = s["latest"]
            d = date.fromisoformat(p["date"])
            latest = max(latest, d) if latest else d
            lines.append(t("lv_line", lang, market=s["market"], grade=" · ".join(s[f] for f in livestock.GRADE_FIELDS if s[f]) or s["animal"], low=f"{p['min']:,.0f}",
                           high=f"{p['max']:,.0f}", date=format_dual(d, lang)))
        lines.append(outlook_text(livestock.forecast(conn, names[0], region), lang))
        parts.append("\n".join(lines))
    parts.append(t("lv_note", lang))
    citation = t("livestock_source", lang) + (f", {format_dual(latest, lang)}" if latest else "")
    return {"text": "\n\n".join(parts), "sources": [{"ref": "M", "citation": citation}] if latest else [],
            "as_of": latest}
