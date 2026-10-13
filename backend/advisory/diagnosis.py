"""
diagnosis.py — Diagnosis -> treatment plan with follow-up (spec F5).

decide() turns the disease model's two predictions into one decision:
  invalid photo           -> ask for a new photo
  conditions missing / out of the model's training range
                          -> use the photo-only prediction, and say so
  photo vs conditions disagree
                          -> uncertain: safe general advice + escalate to the DA
  confidence < threshold  -> uncertain: safe general advice + escalate
  healthy                 -> no plan
  otherwise               -> treatment plan built from the database

The plan never contains LLM text: cultural practices, products, doses,
intervals and safety come from treatment_protocols, approved_products,
dosage_rules and the translation files.
"""

from __future__ import annotations

import json
import re
import sqlite3
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta

from backend.advisory.adapters.disease_service import DualPrediction
from backend.advisory.config import setting_float, setting_int
from backend.advisory.ethiopian_calendar import format_dual
from backend.advisory.guardrails import safety_block
from backend.advisory.i18n import t
from backend.advisory.schema import PLACEHOLDER

INVALID_LABEL = "Invalid"


@dataclass
class Decision:
    kind: str                         # 'invalid_photo' | 'healthy' | 'disease' | 'uncertain'
    model_label: str | None
    disease_key: str | None
    confidence: float
    mode: str                         # 'photo_and_conditions' | 'photo_only' | 'disagreement'
    reason: str | None = None         # why photo-only or uncertain
    photo_label: str | None = None
    conditions_label: str | None = None


def disease_names(conn: sqlite3.Connection, lang: str) -> dict[str, str]:
    """Disease name by key and by model label, in `lang` (English when no local name exists)."""
    col = {"am": "name_am", "om": "name_om", "ti": "name_ti"}.get(lang, "NULL")
    out = {}
    for key, label, en, local in conn.execute(f"SELECT key, model_label, name_en, {col} FROM diseases"):
        out[key] = local or en
        if label:
            out[label] = local or en
    return out


def label_to_disease(conn: sqlite3.Connection, label: str | None) -> tuple[str | None, bool]:
    row = conn.execute("SELECT key, is_disease FROM diseases WHERE model_label=?", (label,)).fetchone()
    return (row[0], bool(row[1])) if row else (None, False)


def decide(conn: sqlite3.Connection, pred: DualPrediction, threshold: float) -> Decision:
    photo = pred.photo_only
    if photo.label == INVALID_LABEL:
        return Decision("invalid_photo", photo.label, None, photo.confidence, "photo_only", "invalid_photo",
                        photo.label, None)

    mode, reason, final = "photo_only", None, photo
    if pred.with_conditions is None:
        reason = "conditions_missing"
    elif pred.out_of_range:
        reason = "conditions_out_of_range"
    elif pred.with_conditions.label != photo.label:
        return Decision("uncertain", None, None, min(photo.confidence, pred.with_conditions.confidence),
                        "disagreement", "photo_conditions_disagree", photo.label, pred.with_conditions.label)
    else:
        mode, final = "photo_and_conditions", pred.with_conditions

    key, is_disease = label_to_disease(conn, final.label)
    if key is None:
        return Decision("uncertain", final.label, None, final.confidence, mode, "unknown_label", photo.label,
                        pred.with_conditions.label if pred.with_conditions else None)
    if final.confidence < threshold:
        return Decision("uncertain", final.label, key, final.confidence, mode, "low_confidence", photo.label,
                        pred.with_conditions.label if pred.with_conditions else None)
    return Decision("disease" if is_disease else "healthy", final.label, key, final.confidence, mode, reason,
                    photo.label, pred.with_conditions.label if pred.with_conditions else None)


# ── Treatment plan from the database ──────────────────────────────────────────

@dataclass
class ProductCard:
    product_id: int
    product_name: str
    active_ingredient: str
    registration_number: str | None
    dose_per_ha: str | None
    dose_per_knapsack: str | None
    water_volume_l_per_ha: str | None
    max_applications: int | None
    interval_days: int | None
    pre_harvest_interval_days: int | None
    re_entry_hours: int | None
    rain_free_hours: int | None
    ppe_required: list[str]
    source: str | None
    verified: bool
    dose_cited: bool = False              # rate copied from a cited MoA document (not yet checked on the label/EAA)
    amount_for_plot: str | None = None    # rate × the farmer's plot area, e.g. '0.25 L for 0.5 ha'


@dataclass
class TreatmentPlan:
    disease_key: str
    disease_name: str
    pathogen: str | None
    cultural_practices: list[str]
    scouting_advice: str | None
    recommended_active_ingredients: list[str]
    products: list[ProductCard]
    offers: list[dict]
    weather_advice: str | None
    safety: str
    sources: list[str]
    verified: bool                   # every agronomic row used is expert-verified
    warnings: list[str] = field(default_factory=list)


DOSE_CITED = "moa_cited"     # dosage_rules.verification_status: copied verbatim from a cited MoA manual page
_RATE = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*(ml|l|kg|g)(?![a-z])", re.I)


def amount_for_area(dose_per_ha: str | None, area_ha: float | None) -> str | None:
    """'0.5 L' per ha × 0.5 ha -> '250 mL for 0.5 ha'. None when the rate or the area is unknown."""
    m = _RATE.match(dose_per_ha or "")
    if not m or not area_ha or area_ha <= 0:
        return None
    qty, unit = float(m.group(1)) * area_ha, m.group(2).lower()
    if unit in ("l", "kg") and qty < 1:
        qty, unit = qty * 1000, {"l": "mL", "kg": "g"}[unit]
    else:
        unit = {"l": "L", "kg": "kg", "g": "g", "ml": "mL"}[unit]
    text = f"{qty:.0f}" if qty >= 100 else f"{qty:.2f}".rstrip("0").rstrip(".")
    return f"{text} {unit} / {area_ha:g} ha"


def build_plan(conn: sqlite3.Connection, disease_key: str, crop: str, lang: str, *, weather_forecast=None,
               now: datetime | None = None, input_hub=None, latitude=None, longitude=None, region=None,
               area_ha: float | None = None, area_pcode: str | None = None) -> TreatmentPlan:
    cur = conn.cursor()
    cur.row_factory = sqlite3.Row
    disease = cur.execute("SELECT * FROM diseases WHERE key=?", (disease_key,)).fetchone()
    proto = cur.execute("SELECT * FROM treatment_protocols WHERE disease_key=? AND lower(crop)=lower(?)",
                        (disease_key, crop)).fetchone()
    rows = cur.execute(
        """SELECT p.*, d.dose_per_ha, d.dose_per_knapsack, d.water_volume_l_per_ha, d.max_applications, d.interval_days,
                  d.pre_harvest_interval_days, d.re_entry_hours, d.rain_free_hours, d.ppe_required,
                  d.source AS dose_source, d.verification_status AS dose_status
           FROM approved_products p JOIN dosage_rules d ON d.product_id = p.id
           WHERE p.status = 'registered' AND d.target = ? AND lower(d.crop) = lower(?)
           ORDER BY p.product_name""",
        (disease_key, crop),
    ).fetchall()
    products = [ProductCard(
        r["id"], r["product_name"], r["active_ingredient"], r["registration_number"], r["dose_per_ha"],
        r["dose_per_knapsack"], r["water_volume_l_per_ha"], r["max_applications"], r["interval_days"],
        r["pre_harvest_interval_days"], r["re_entry_hours"], r["rain_free_hours"], json.loads(r["ppe_required"] or "[]"),
        r["dose_source"] or r["source"],
        r["verification_status"] != PLACEHOLDER and r["dose_status"] not in (PLACEHOLDER, DOSE_CITED),
        dose_cited=r["dose_status"] == DOSE_CITED and bool(r["dose_per_ha"]),
        amount_for_plot=amount_for_area(r["dose_per_ha"], area_ha),
    ) for r in rows]

    statuses = [p.verified for p in products] + ([proto["verification_status"] != PLACEHOLDER] if proto else [])
    verified = bool(statuses) and all(statuses)
    cited = any(p.dose_cited for p in products)
    warnings = [] if verified else [t("cited_dose_warning" if cited else "placeholder_warning", lang)]
    if not products:
        warnings.append(t("no_registered_product", lang))

    weather_advice = None
    if weather_forecast is not None and now is not None and products:
        from backend.advisory.adapters.weather import rain_in_next_hours

        windows = [p.rain_free_hours for p in products if p.rain_free_hours]
        if windows:
            hours = min(windows)
            if rain_in_next_hours(weather_forecast, now, hours):
                weather_advice = t("rain_wait", lang, hours=hours)
        elif rain_in_next_hours(weather_forecast, now, 24):
            weather_advice = t("rain_check_label", lang, hours=24)

    offers = []
    if input_hub is not None and products:
        ids = [p.product_id for p in products]
        try:
            found = input_hub.offers(ids, latitude, longitude, region, area_pcode=area_pcode)
        except TypeError:      # input hubs without the area argument
            found = input_hub.offers(ids, latitude, longitude, region)
        offers = [asdict(o) for o in found]

    sources = [s for s in ([proto["source"]] if proto and proto["source"] else []) +
               sorted({p.source for p in products if p.source})]
    return TreatmentPlan(
        disease_key=disease_key,
        disease_name=disease["name_en"] if disease else disease_key,
        pathogen=disease["pathogen"] if disease else None,
        cultural_practices=json.loads(proto["cultural_practices"]) if proto else [],
        scouting_advice=proto["scouting_advice"] if proto else None,
        recommended_active_ingredients=json.loads(proto["recommended_active_ingredients"]) if proto else [],
        products=products,
        offers=offers,
        weather_advice=weather_advice,
        safety=safety_block(lang, [{"ppe_required": json.dumps(p.ppe_required),
                                    "pre_harvest_interval_days": p.pre_harvest_interval_days,
                                    "re_entry_hours": p.re_entry_hours} for p in products]),
        sources=sources,
        verified=verified,
        warnings=warnings,
    )


def general_safe_advice(lang: str) -> list[str]:
    return [t("general_advice_1", lang), t("general_advice_2", lang), t("general_advice_3", lang)]


# ── Record + follow-up ─────────────────────────────────────────────────────────

def record_diagnosis(conn: sqlite3.Connection, *, farmer_id: int, farm_id: int | None, crop_season_id: int | None,
                     decision: Decision, pred: DualPrediction | None, latitude: float | None, longitude: float | None,
                     image_ref: str | None, now: datetime, source: str = "model") -> tuple[int, date | None]:
    """Store the diagnosis; diseases get a follow-up alert after follow_up_days."""
    follow_up = None
    if decision.kind == "disease":
        follow_up = now.date() + timedelta(days=setting_int("follow_up_days", 7, conn))
    probabilities = pred.with_conditions.probabilities if pred and pred.with_conditions and \
        decision.mode == "photo_and_conditions" else (pred.photo_only.probabilities if pred else None)
    with conn:
        did = conn.execute(
            """INSERT INTO diagnoses (farmer_id, farm_id, crop_season_id, disease_key, model_label, confidence,
                                      probabilities, ecological_input, image_ref, latitude, longitude, source,
                                      follow_up_date, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (farmer_id, farm_id, crop_season_id, decision.disease_key if decision.kind != "uncertain" else None,
             decision.model_label, decision.confidence, json.dumps(probabilities) if probabilities else None,
             json.dumps(pred.ecological_input) if pred and pred.ecological_input else None, image_ref, latitude,
             longitude, source, follow_up.isoformat() if follow_up else None, now.isoformat(sep=" ", timespec="seconds")),
        ).lastrowid
        if follow_up:
            conn.execute(
                """INSERT OR IGNORE INTO alerts (type, farmer_id, severity, message_key, payload, channel, status,
                                                 dedupe_key, scheduled_for, created_at)
                   VALUES ('follow_up', ?, 'info', 'follow_up_question', ?, 'app', 'scheduled', ?, ?, ?)""",
                (farmer_id, json.dumps({"diagnosis_id": did, "disease_key": decision.disease_key,
                                        "days": (follow_up - now.date()).days}),
                 f"follow_up:{did}", follow_up.isoformat(), now.isoformat(sep=" ", timespec="seconds")),
            )
    return did, follow_up


def diagnose_response(conn: sqlite3.Connection, *, decision: Decision, pred: DualPrediction | None, lang: str,
                      plan: TreatmentPlan | None, diagnosis_id: int, follow_up: date | None,
                      escalated: bool) -> dict:
    names = disease_names(conn, lang)
    notes = []
    if decision.kind == "invalid_photo":
        notes.append(t("invalid_photo", lang))
    elif decision.kind == "healthy":
        notes.append(t("healthy_result", lang))
    elif decision.kind == "uncertain":
        if decision.reason == "photo_conditions_disagree":
            notes.append(t("disagreement", lang, photo_disease=names.get(decision.photo_label, decision.photo_label),
                           conditions_disease=names.get(decision.conditions_label, decision.conditions_label)))
        notes.append(t("uncertain_diagnosis", lang))
    if decision.reason == "conditions_out_of_range":
        notes.append(t("conditions_out_of_range", lang))
    elif decision.mode == "photo_and_conditions":
        notes.append(t("conditions_used", lang))
    if follow_up:
        notes.append(t("follow_up_scheduled", lang, date=format_dual(follow_up, "am" if lang == "am" else "en")))

    def pred_out(p):
        return {"label": p.label, "disease": names.get(p.label, p.label), "confidence": round(p.confidence, 3),
                "probabilities": p.probabilities} if p else None

    return {
        "diagnosis_id": diagnosis_id,
        "kind": decision.kind,
        "language": lang,
        "disease_key": decision.disease_key,
        "disease": names.get(decision.model_label, decision.model_label) if decision.model_label else None,
        "confidence": round(decision.confidence, 3),
        "mode": decision.mode,
        "reason": decision.reason,
        "notes": notes,
        "general_advice": general_safe_advice(lang) if decision.kind == "uncertain" else [],
        "plan": asdict(plan) if plan else None,
        "follow_up_date": follow_up.isoformat() if follow_up else None,
        "escalated": escalated,
        "model": {
            "version": pred.model_version if pred else None,
            "photo_only": pred_out(pred.photo_only) if pred else None,
            "with_conditions": pred_out(pred.with_conditions) if pred else None,
            "ecological_input": pred.ecological_input if pred else None,
            "out_of_range": pred.out_of_range if pred else [],
        },
    }


def confidence_threshold(conn: sqlite3.Connection) -> float:
    return setting_float("diagnosis_confidence_threshold", 0.70, conn)
