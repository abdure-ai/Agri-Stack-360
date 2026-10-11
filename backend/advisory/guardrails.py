"""
guardrails.py — Non-negotiable safety rules for every advisory answer (spec §6).

 1. Products, active ingredients, doses, intervals, PHI, PPE come from the
    database only. LLM text is post-processed: sentences naming a pesticide
    product, a formulation code (250 EC, 80WP ...) or a pesticide dose are
    removed unless they match approved, registered data allowed for this answer.
 2. Banned / expired / unregistered products are never recommended; asking
    for one gets a refusal plus registered alternatives.
 3. Agronomic answers must cite a provided source ([S1].., [M], [C]);
    otherwise they are replaced by "I don't know, I will ask your DA".
 5. Safety text (from translation files) accompanies any chemical advice.
 6. Poisoning questions get "seek medical help immediately" + emergency
    contact, never medical advice.
 8. User text and document text are data: they are delimited in the prompt
    and instruction-like phrases are flagged (never obeyed).

Fertilizer and seed rates (urea, NPS, DAP, seed kg/ha) follow the
'document' dose policy by default: a number may be quoted only if it appears
verbatim in a cited guideline passage. Setting strict_dose_policy=1 requires
every dose to be in dosage_rules.
"""

from __future__ import annotations

import csv
import json
import logging
import re
import sqlite3
from dataclasses import dataclass, field

from backend.advisory.config import ROOT
from backend.advisory.i18n import t

LEXICON_FILE = ROOT / "data" / "advisory_seed" / "pesticide_lexicon.csv"
# Product names that are also ordinary English words: matched only when capitalised.
_CASE_SENSITIVE = {"topic", "opera", "bravo", "bumper", "natura", "atlantis", "pallas"}

_ETHIOPIC = r"ሀ-᎟ⶀ-⷟"
FORMULATION_RE = re.compile(
    r"\b\d{1,4}(?:[.,]\d+)?\s?%?\s?(?:EC|SC|WP|WG|EW|SL|DS|WS|SE|OD|CS|ME|DC|GR|SP|FS)\b"
    r"|\d{1,4}\s?(?:ኢሲ|ኢ\s?ሲ|ኤስሲ|ኤስ\s?ሲ|ኢው|ደብሊውፒ|ደብሊው\s?ፒ|ኤስ\s?ኤል)",
)
log = logging.getLogger(__name__)

_NUM = r"\d+(?:[.,]\d+)?(?:\s?(?:-|–|to|እስከ)\s?\d+(?:[.,]\d+)?)?"
_UNIT = (r"(?:ml|mL|millilit(?:er|re)s?|l(?:it(?:er|re)s?)?|lt|g(?:rams?)?|gm|kg|kilograms?|cc|quintals?|qt|"
         r"ሚ\.?\s?ሊ(?:ትር)?|ሊትር|ሊ|ግራም|ግ|ኪ\.?\s?ግ|ኪሎ(?:\s?ግራም)?|ሲሲ|ኩንታል|ኩ)")
DOSE_RE = re.compile(rf"(?<![\w.]){_NUM}\s?{_UNIT}(?:\s?(?:/|per|በ|ለ)\s?(?:ha|hectare|ሄክታር|ሄ|ሄ\.)\b)?", re.IGNORECASE)
PESTICIDE_CONTEXT_RE = re.compile(
    r"\b(?:fungicide|insecticide|herbicide|pesticide|spray|chemical|ppe)\w*|ፀረ|ጸረ|ርጭት|መርጨት|ኬሚካል|"
    # Afaan Oromoo: biifuu = to spray (NOT facaasuu, which means to sow).
    r"\b(?:farra|qoricha|keemikaala|biif)\w*", re.IGNORECASE)
CITATION_RE = re.compile(r"\[(S\d+|M|C)\]")
_TAG = r"(?:S\d+|M|C)"
COMBINED_CITATION_RE = re.compile(rf"\[\s*({_TAG}(?:\s*[,،፣;]\s*{_TAG})+)\s*\]")


def split_combined_citations(text: str) -> str:
    """'[S1, S2]' -> '[S1][S2]' so every tag is checked and shown as its own source."""
    return COMBINED_CITATION_RE.sub(
        lambda m: "".join(f"[{p.strip()}]" for p in re.split(r"[,،፣;]", m.group(1))), text)
INJECTION_RE = re.compile(
    r"ignore (?:all |the )?(?:previous|above|prior) (?:instructions|rules)|system prompt|you are now|"
    r"disregard (?:your|the) (?:rules|instructions)|developer mode|jailbreak", re.IGNORECASE)
POISONING_RE = re.compile(
    r"poison|swallow|drank|ingest|vomit|faint|unconscious|chemical (?:in|on) (?:eye|skin|mouth)|"
    r"መርዝ|ተመረዝ|ዋጠ|ዋጥ|አስመለሰ|ራሱን ሳተ|summii|summaa'|liqimse|qoricha dhuge|haqqisuu", re.IGNORECASE)
PERSON_RE = re.compile(
    r"talk to (?:a |an )?(?:person|human|expert|agent|da)\b|speak to (?:a |an )?(?:person|human|expert)|"
    r"real person|call me|human help|ባለሙያ (?:ያነጋግረኝ|ያግኘኝ)|ሰው ያነጋግረኝ|የልማት ጣቢያ ሰራተኛ ያግኘኝ|"
    r"nama (?:waliin|na) (?:haasofsiisi|quunnamsiisi)|ogeessa na quunnamsiisi", re.IGNORECASE)
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?።])\s+|\n+")


# ── Lexicon ────────────────────────────────────────────────────────────────────

def _key(term: str) -> str:
    """Lookup key: case- and space-insensitive ('Round up' == 'Roundup')."""
    return re.sub(r"\s+", "", term.lower())

@dataclass
class LexEntry:
    term: str
    kind: str                    # 'product' | 'active_ingredient'
    status: str                  # 'registered' | 'banned' | 'expired' | 'unregistered'
    product_ids: tuple[int, ...] = ()
    canonical: str = ""


@dataclass
class Lexicon:
    entries: list[LexEntry]
    pattern: re.Pattern

    def find(self, text: str) -> list[LexEntry]:
        found: dict[str, LexEntry] = {}
        by_key = {_key(e.term): e for e in self.entries}
        for m in self.pattern.finditer(text):
            word = m.group(0)
            e = by_key.get(_key(word))
            if e is None:
                continue
            if e.term.lower() in _CASE_SENSITIVE and not word[:1].isupper():
                continue
            found[e.canonical or e.term] = e
        return list(found.values())


def build_lexicon(conn: sqlite3.Connection, lexicon_file=LEXICON_FILE) -> Lexicon:
    entries: dict[str, LexEntry] = {}
    for pid, name, ai, status in conn.execute(
            "SELECT id, product_name, active_ingredient, status FROM approved_products"):
        for term, kind in ((name, "product"), (ai, "active_ingredient")):
            if not term:
                continue
            key = term.lower()
            prev = entries.get(key)
            ids = (prev.product_ids if prev else ()) + (pid,)
            # A term is 'registered' if any product carrying it is registered.
            best = "registered" if status == "registered" or (prev and prev.status == "registered") else status
            entries[key] = LexEntry(term, kind, best, ids, name if kind == "product" else ai)
    if lexicon_file.exists():
        with lexicon_file.open(encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                key = row["term"].strip().lower()
                # A short or numeric term (e.g. "2" from an unquoted "2,4-D") would match citation tags.
                if (len(key) < 3 or not re.search(r"[^\W\d_]", key)
                        or row.get("kind") not in ("product", "active_ingredient")):
                    log.warning("pesticide lexicon: skipped malformed row %r", row)
                    continue
                if key not in entries:
                    entries[key] = LexEntry(row["term"].strip(), row["kind"], "unregistered", (), row["term"].strip())
    terms = sorted((e.term for e in entries.values()), key=len, reverse=True)
    parts = []
    for term in terms:
        esc = re.escape(term).replace(r"\ ", r"\s?")
        if re.search(f"[{_ETHIOPIC}]", term):
            parts.append(esc)                         # Ge'ez: prefixes attach, so no word boundary
        else:
            parts.append(rf"(?<![\w-]){esc}(?![\w-])")
    pattern = re.compile("|".join(parts) if parts else r"(?!x)x", re.IGNORECASE)
    return Lexicon(list(entries.values()), pattern)


# ── Question pre-checks (before any LLM call) ─────────────────────────────────

@dataclass
class PreCheck:
    kind: str | None             # 'poisoning' | 'person' | 'product_refusal' | None
    message: str | None = None
    flags: list[str] = field(default_factory=list)
    escalate_reason: str | None = None


def registered_alternatives(conn: sqlite3.Connection, product_ids: tuple[int, ...]) -> list[str]:
    """Registered products for the same targets as the given (refused) products."""
    targets: set[str] = set()
    for pid in product_ids:
        row = conn.execute("SELECT target_diseases FROM approved_products WHERE id=?", (pid,)).fetchone()
        if row:
            targets |= set(json.loads(row[0] or "[]"))
    if not targets:
        return []
    out = []
    for name, tds in conn.execute("SELECT product_name, target_diseases FROM approved_products WHERE status='registered'"):
        if targets & set(json.loads(tds or "[]")):
            out.append(name)
    return sorted(out)


def pre_check(conn: sqlite3.Connection, question: str, lang: str, lexicon: Lexicon) -> PreCheck:
    flags = ["possible_prompt_injection"] if INJECTION_RE.search(question) else []
    if POISONING_RE.search(question):
        return PreCheck("poisoning", t("poisoning", lang), flags + ["poisoning_question"])
    if PERSON_RE.search(question):
        return PreCheck("person", t("asked_for_person", lang) + " " + t("hotline", lang),
                        flags + ["asked_for_person"], "asked_for_person")
    refused = [e for e in lexicon.find(question) if e.status != "registered"]
    if refused:
        parts = []
        alt_ids: tuple[int, ...] = ()
        for e in refused:
            key = "banned_product" if e.status in ("banned", "expired") else "unknown_product"
            parts.append(t(key, lang, product=e.canonical or e.term))
            alt_ids += e.product_ids
        alts = registered_alternatives(conn, alt_ids)
        parts.append(t("approved_alternatives", lang, products=", ".join(alts)) if alts else t("no_alternatives", lang))
        return PreCheck("product_refusal", " ".join(parts), flags + [f"refused_product:{e.term}" for e in refused])
    return PreCheck(None, flags=flags)


# ── Answer post-processing ─────────────────────────────────────────────────────

@dataclass
class GuardrailResult:
    text: str
    flags: list[str]
    removed: list[str]
    citations: list[str]
    chemical_mentioned: bool


def _norm_number(s: str) -> str:
    return re.sub(r"\s+", "", s.replace(",", ".").replace("–", "-")).lower()


def _numbers_in(text: str) -> set[str]:
    return {_norm_number(m.group(0)) for m in re.finditer(_NUM, text)}


def check_answer(text: str, *, lexicon: Lexicon, valid_citations: set[str], cited_source_text: dict[str, str],
                 allowed_product_ids: set[int] = frozenset(), allowed_db_doses: set[str] = frozenset(),
                 strict_dose_policy: bool = False) -> GuardrailResult:
    """Remove unsafe sentences, keep only valid citations, report what happened."""
    flags: list[str] = []
    removed: list[str] = []
    kept: list[str] = []
    chemical = False
    text = split_combined_citations(text)
    if INJECTION_RE.search(text):
        flags.append("injection_text_in_answer")

    for sentence in (s.strip() for s in _SENTENCE_SPLIT.split(text)):
        if not sentence:
            continue
        reason = None
        mentions = lexicon.find(sentence)
        for e in mentions:
            if e.status != "registered":
                reason = f"{e.status}_product:{e.term}"
                break
            if e.kind == "product" and not (set(e.product_ids) & set(allowed_product_ids)):
                reason = f"product_not_allowed:{e.term}"
                break
        if reason is None and FORMULATION_RE.search(sentence):
            reason = "formulation_code"
        is_pesticide = bool(mentions) or bool(PESTICIDE_CONTEXT_RE.search(sentence))
        if reason is None:
            cited = [c for c in CITATION_RE.findall(sentence) if c in valid_citations]
            cited_text = " ".join(cited_source_text.get(c, "") for c in cited)
            for m in DOSE_RE.finditer(sentence):
                num = _norm_number(re.match(_NUM, m.group(0)).group(0))
                if num in allowed_db_doses:
                    continue
                if is_pesticide or strict_dose_policy:
                    reason = "dose_not_in_database"
                    break
                if num not in _numbers_in(cited_text):
                    reason = "dose_not_in_cited_source"
                    break
        if reason:
            removed.append(sentence)
            flags.append(reason)
            continue
        if is_pesticide and mentions:
            chemical = True
        if PESTICIDE_CONTEXT_RE.search(sentence):
            chemical = True
        kept.append(sentence)

    cleaned = " ".join(kept)
    used = []
    for c in CITATION_RE.findall(cleaned):
        if c not in valid_citations:
            flags.append(f"invalid_citation:{c}")
        elif c not in used:
            used.append(c)
    cleaned = CITATION_RE.sub(lambda m: m.group(0) if m.group(1) in valid_citations else "", cleaned)
    return GuardrailResult(re.sub(r"\s{2,}", " ", cleaned).strip(), flags, removed, used, chemical)


def safety_block(lang: str, dosage_rules: list[dict] | None = None) -> str:
    """Safety text for chemical advice, from the translation files plus dosage_rules values."""
    rules = dosage_rules or []
    ppe = sorted({p for r in rules for p in json.loads(r.get("ppe_required") or "[]")})
    lines = [t("safety_title", lang) + ":",
             "• " + (t("safety_ppe", lang, ppe=", ".join(ppe)) if ppe else t("safety_ppe_default", lang)),
             "• " + t("safety_children_water", lang)]
    phis = [r["pre_harvest_interval_days"] for r in rules if r.get("pre_harvest_interval_days")]
    lines.append("• " + (t("safety_phi", lang, days=max(phis)) if phis else t("safety_phi_unknown", lang)))
    reentry = [r["re_entry_hours"] for r in rules if r.get("re_entry_hours")]
    if reentry:
        lines.append("• " + t("safety_reentry", lang, hours=max(reentry)))
    lines += ["• " + t("safety_disposal", lang), "• " + t("safety_poisoning", lang)]
    return "\n".join(lines)
