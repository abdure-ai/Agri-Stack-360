"""
languages.py — Language detection for questions and documents.

Supported (spec §7): Amharic 'am' and Tigrinya 'ti' (Ge'ez script), Afaan
Oromo 'om' (Latin, Qubee), English 'en'. Ge'ez script alone cannot tell
Amharic from Tigrinya; Phase 1 serves Amharic, so Ge'ez text defaults to 'am'
unless the user's saved preference says 'ti'. Users can always override.
"""

from __future__ import annotations

import re
import unicodedata

SUPPORTED = ("am", "om", "en", "ti")
LANGUAGE_NAMES = {"am": "Amharic", "om": "Afaan Oromo", "en": "English", "ti": "Tigrinya"}

# Frequent Afaan Oromo function words and farming terms (lower-case).
_OROMO_WORDS = {
    "fi", "kan", "akka", "maal", "maaliif", "eessa", "yoom", "hangam", "meeqa", "isa", "ishee", "isaan",
    "keessa", "irratti", "keessatti", "jira", "jiru", "qaba", "qabu", "dha", "ta'e", "ta'u", "malee",
    "qonna", "qonnaan", "bultoota", "qamadii", "midhaan", "dhukkuba", "dhukkubni", "xaa'oo", "xaa'oon",
    "biqiltuu", "lafa", "bishaan", "roobni", "rooba", "facaasuu", "sanyii", "gatii", "gabaa", "baala",
    "akkamitti", "na", "nu", "koo", "keenya", "kee", "gargaarsa", "fayyadamuu", "yeroo",
}
_OROMO_PATTERNS = re.compile(r"(aa|ee|ii|oo|uu|dh|ch|ny|ph|x|q)")
_ENGLISH_WORDS = {
    "the", "and", "is", "are", "what", "how", "when", "which", "my", "for", "of", "to", "in", "on",
    "should", "can", "do", "does", "much", "many", "wheat", "disease", "fertilizer", "price", "with",
}


def _ethiopic_ratio(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    eth = sum(1 for c in letters if "ETHIOPIC" in unicodedata.name(c, ""))
    return eth / len(letters)


def detect_language(text: str, preferred: str | None = None) -> str:
    """Best guess of the language of `text`; `preferred` breaks ties (e.g. 'ti' for Ge'ez)."""
    if _ethiopic_ratio(text) >= 0.5:
        return "ti" if preferred == "ti" else "am"
    words = re.findall(r"[a-zA-Z']+", text.lower())
    if not words:
        return preferred if preferred in SUPPORTED else "en"
    om = sum(1 for w in words if w in _OROMO_WORDS) + 0.5 * sum(1 for w in words if _OROMO_PATTERNS.search(w))
    en = sum(1 for w in words if w in _ENGLISH_WORDS) * 1.5
    if om > en:
        return "om"
    if en > om:
        return "en"
    return preferred if preferred in ("om", "en") else "en"


def answer_language(question: str, requested: str | None, preferred: str | None = None) -> str:
    """Language to answer in. A requested language is used unless the question is written in the other script:
    an app that always sends its screen language ("en") must not answer an Amharic question in English.
    Within one script the request decides (am vs ti, en vs om)."""
    if requested not in SUPPORTED:
        return detect_language(question, preferred=preferred)
    ethiopic = _ethiopic_ratio(question) >= 0.5
    latin = bool(re.search(r"[a-zA-Z]{3,}", question)) and _ethiopic_ratio(question) < 0.2
    if ethiopic and requested in ("en", "om"):
        return detect_language(question, preferred=preferred if preferred in ("am", "ti") else None)
    if latin and requested in ("am", "ti"):
        return detect_language(question, preferred=preferred if preferred in ("en", "om") else None)
    return requested


def document_language(text: str) -> str:
    """'am' for Ge'ez-script documents, else 'en' (documents are not in Afaan Oromo yet)."""
    r = _ethiopic_ratio(text)
    if r >= 0.6:
        return "am"
    if r >= 0.15:
        return "mixed"
    return "en"
