"""
seed_loader.py — Load verified (or placeholder) agronomic data from CSV.

Files in data/advisory_seed/ (one per table). Multi-value cells use '|',
e.g. target_diseases = "yellow_rust|leaf_rust". Re-running updates rows in
place. All files are validated before anything is written, so a bad file
never leaves the database half-loaded.

Usage: python scripts/load_advisory_seed.py [folder]
"""

from __future__ import annotations

import csv
import json
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path

from backend.advisory.schema import PLACEHOLDER, VERIFIED

PRODUCT_CATEGORIES = {"fungicide", "insecticide", "herbicide", "fertilizer", "seed"}
PRODUCT_STATUSES = {"registered", "banned", "expired"}
SEASONS = {"meher", "belg", "irrigated"}
VERIFICATION = {PLACEHOLDER, VERIFIED}


class SeedError(ValueError):
    """Raised with every problem found, one per line."""


@dataclass
class LoadReport:
    loaded: dict[str, int] = field(default_factory=dict)
    placeholders: dict[str, int] = field(default_factory=dict)
    skipped: list[str] = field(default_factory=list)

    def summary(self) -> str:
        lines = [f"{t}: {n} rows ({self.placeholders.get(t, 0)} still {PLACEHOLDER})" for t, n in self.loaded.items()]
        lines += [f"skipped: {s}" for s in self.skipped]
        return "\n".join(lines)


def _source_page(r: dict) -> str:
    page = (r.get("source_page") or "").strip()
    if page and not page.lower().startswith("p"):
        page = f"p. {page}"
    return f"{r.get('source_document', '')} {page}".strip()


def _read(folder: Path, name: str, required: list[str]) -> list[dict]:
    path = folder / name
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        missing = [c for c in required if c not in (reader.fieldnames or [])]
        if missing:
            raise SeedError(f"{name}: missing columns {missing}")
        return [{k: (v or "").strip() for k, v in row.items()} for row in reader]


def _list(cell: str) -> str:
    return json.dumps([p.strip() for p in cell.split("|") if p.strip()], ensure_ascii=False)


def _int(cell: str, where: str, errors: list[str]) -> int | None:
    if cell == "":
        return None
    try:
        return int(cell)
    except ValueError:
        errors.append(f"{where}: '{cell}' is not a whole number")
        return None


def _float(cell: str, where: str, errors: list[str]) -> float | None:
    if cell == "":
        return None
    try:
        return float(cell)
    except ValueError:
        errors.append(f"{where}: '{cell}' is not a number")
        return None


def _status(row: dict, where: str, errors: list[str]) -> str:
    v = row.get("verification_status") or PLACEHOLDER
    if v not in VERIFICATION:
        errors.append(f"{where}: verification_status must be {PLACEHOLDER} or {VERIFIED}")
    return v


def load_seed(conn: sqlite3.Connection, folder: Path) -> LoadReport:
    errors: list[str] = []
    report = LoadReport()

    diseases = _read(folder, "diseases.csv", ["key", "crop", "model_label", "name_en", "pathogen", "is_disease"])
    products = _read(folder, "approved_products.csv", ["product_name", "active_ingredient", "formulation", "category", "status"])
    dosages = _read(folder, "dosage_rules.csv", ["product_name", "formulation", "crop", "target"])
    protocols = _read(folder, "treatment_protocols.csv", ["disease_key", "crop", "cultural_practices", "recommended_active_ingredients"])
    calendar = _read(folder, "crop_calendar_rules.csv", ["crop", "stage_key", "stage_name", "day_start", "day_end"])

    # ── Validate everything first ───────────────────────────────────────────
    disease_keys = {r["key"] for r in diseases} | {
        r[0] for r in conn.execute("SELECT key FROM diseases")
    }
    for i, r in enumerate(diseases, 2):
        if not r["key"] or not r["name_en"]:
            errors.append(f"diseases.csv line {i}: key and name_en are required")
        if r["is_disease"] not in {"0", "1"}:
            errors.append(f"diseases.csv line {i}: is_disease must be 0 or 1")

    product_keys = set()
    for i, r in enumerate(products, 2):
        where = f"approved_products.csv line {i}"
        if r["category"] not in PRODUCT_CATEGORIES:
            errors.append(f"{where}: category must be one of {sorted(PRODUCT_CATEGORIES)}")
        if r["status"] not in PRODUCT_STATUSES:
            errors.append(f"{where}: status must be one of {sorted(PRODUCT_STATUSES)}")
        if not r["product_name"] or not r["active_ingredient"]:
            errors.append(f"{where}: product_name and active_ingredient are required")
        for d in json.loads(_list(r.get("target_diseases", ""))):
            if d not in disease_keys:
                # Pests are allowed as free text; only flag snake_case keys that look like disease keys.
                if "_" in d and d.islower():
                    errors.append(f"{where}: unknown disease key '{d}'")
        _status(r, where, errors)
        product_keys.add((r["product_name"], r["formulation"]))
    product_keys |= {(r[0], r[1] or "") for r in conn.execute("SELECT product_name, formulation FROM approved_products")}

    for i, r in enumerate(dosages, 2):
        where = f"dosage_rules.csv line {i}"
        if (r["product_name"], r["formulation"]) not in product_keys:
            errors.append(f"{where}: product '{r['product_name']}' ({r['formulation']}) is not in approved_products")
        for col in ("max_applications", "interval_days", "pre_harvest_interval_days", "re_entry_hours", "rain_free_hours"):
            _int(r.get(col, ""), f"{where} {col}", errors)
        _status(r, where, errors)

    for i, r in enumerate(protocols, 2):
        where = f"treatment_protocols.csv line {i}"
        if r["disease_key"] not in disease_keys:
            errors.append(f"{where}: unknown disease_key '{r['disease_key']}'")
        _status(r, where, errors)

    usable_calendar = []
    for i, r in enumerate(calendar, 2):
        where = f"crop_calendar_rules.csv line {i}"
        if r["day_start"] == "" or r["day_end"] == "":
            report.skipped.append(f"{where}: no day range yet (template row)")
            continue
        start = _int(r["day_start"], f"{where} day_start", errors)
        end = _int(r["day_end"], f"{where} day_end", errors)
        if start is not None and end is not None and start > end:
            errors.append(f"{where}: day_start is after day_end")
        if r.get("season") and r["season"] not in SEASONS:
            errors.append(f"{where}: season must be one of {sorted(SEASONS)} or empty")
        _float(r.get("altitude_min_m", ""), f"{where} altitude_min_m", errors)
        _float(r.get("altitude_max_m", ""), f"{where} altitude_max_m", errors)
        _status(r, where, errors)
        usable_calendar.append(r)

    if errors:
        raise SeedError("\n".join(errors))

    # ── Write ───────────────────────────────────────────────────────────────
    with conn:
        for r in diseases:
            conn.execute(
                """INSERT INTO diseases (key, crop, model_label, name_en, name_am, name_om, name_ti, pathogen, is_disease)
                   VALUES (?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(key) DO UPDATE SET crop=excluded.crop, model_label=excluded.model_label,
                     name_en=excluded.name_en, name_am=excluded.name_am, name_om=excluded.name_om,
                     name_ti=excluded.name_ti, pathogen=excluded.pathogen, is_disease=excluded.is_disease""",
                (r["key"], r["crop"], r["model_label"] or None, r["name_en"], r.get("name_am") or None,
                 r.get("name_om") or None, r.get("name_ti") or None, r["pathogen"] or None, int(r["is_disease"])),
            )
        for r in products:
            conn.execute(
                """INSERT INTO approved_products (product_name, active_ingredient, formulation, registration_number,
                     category, target_crops, target_diseases, status, source, verification_status)
                   VALUES (?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(product_name, formulation) DO UPDATE SET active_ingredient=excluded.active_ingredient,
                     registration_number=excluded.registration_number, category=excluded.category,
                     target_crops=excluded.target_crops, target_diseases=excluded.target_diseases,
                     status=excluded.status, source=excluded.source,
                     verification_status=excluded.verification_status, updated_at=CURRENT_TIMESTAMP""",
                (r["product_name"], r["active_ingredient"], r["formulation"], r.get("registration_number") or None,
                 r["category"], _list(r.get("target_crops", "")), _list(r.get("target_diseases", "")),
                 r["status"], r.get("source") or None, r.get("verification_status") or PLACEHOLDER),
            )
        for r in dosages:
            pid = conn.execute(
                "SELECT id FROM approved_products WHERE product_name=? AND formulation=?",
                (r["product_name"], r["formulation"]),
            ).fetchone()[0]
            conn.execute(
                """INSERT INTO dosage_rules (product_id, crop, target, dose_per_ha, dose_per_knapsack,
                     water_volume_l_per_ha, max_applications, interval_days, pre_harvest_interval_days,
                     re_entry_hours, rain_free_hours, ppe_required, source, verification_status)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(product_id, crop, target) DO UPDATE SET dose_per_ha=excluded.dose_per_ha,
                     dose_per_knapsack=excluded.dose_per_knapsack, water_volume_l_per_ha=excluded.water_volume_l_per_ha,
                     max_applications=excluded.max_applications, interval_days=excluded.interval_days,
                     pre_harvest_interval_days=excluded.pre_harvest_interval_days, re_entry_hours=excluded.re_entry_hours,
                     rain_free_hours=excluded.rain_free_hours, ppe_required=excluded.ppe_required,
                     source=excluded.source, verification_status=excluded.verification_status""",
                (pid, r["crop"], r["target"], r.get("dose_per_ha") or None, r.get("dose_per_knapsack") or None,
                 r.get("water_volume_l_per_ha") or None,
                 *(int(r[c]) if r.get(c) else None for c in
                   ("max_applications", "interval_days", "pre_harvest_interval_days", "re_entry_hours", "rain_free_hours")),
                 _list(r.get("ppe_required", "")), r.get("source") or None, r.get("verification_status") or PLACEHOLDER),
            )
        for r in protocols:
            conn.execute(
                """INSERT INTO treatment_protocols (disease_key, crop, cultural_practices, recommended_active_ingredients,
                     scouting_advice, source, verification_status)
                   VALUES (?,?,?,?,?,?,?)
                   ON CONFLICT(disease_key, crop) DO UPDATE SET cultural_practices=excluded.cultural_practices,
                     recommended_active_ingredients=excluded.recommended_active_ingredients,
                     scouting_advice=excluded.scouting_advice, source=excluded.source,
                     verification_status=excluded.verification_status""",
                (r["disease_key"], r["crop"], _list(r["cultural_practices"]), _list(r["recommended_active_ingredients"]),
                 r.get("scouting_advice") or None, r.get("source") or None, r.get("verification_status") or PLACEHOLDER),
            )
        if usable_calendar:
            # Calendar rules have no natural key; the CSV is the full set for each crop it mentions.
            for crop in {r["crop"] for r in usable_calendar}:
                conn.execute("DELETE FROM crop_calendar_rules WHERE crop=?", (crop,))
            for r in usable_calendar:
                conn.execute(
                    """INSERT INTO crop_calendar_rules (crop, variety, altitude_min_m, altitude_max_m, season, stage_key,
                         stage_name, day_start, day_end, actions, source_page, verification_status)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (r["crop"], r.get("variety") or None,
                     float(r["altitude_min_m"]) if r.get("altitude_min_m") else None,
                     float(r["altitude_max_m"]) if r.get("altitude_max_m") else None,
                     r.get("season") or None, r["stage_key"], r["stage_name"], int(r["day_start"]), int(r["day_end"]),
                     _list(r.get("actions", "")),
                     _source_page(r),
                     r.get("verification_status") or PLACEHOLDER),
                )

    for table, rows in [("diseases", diseases), ("approved_products", products), ("dosage_rules", dosages),
                        ("treatment_protocols", protocols), ("crop_calendar_rules", usable_calendar)]:
        report.loaded[table] = len(rows)
        report.placeholders[table] = sum(1 for r in rows if (r.get("verification_status") or PLACEHOLDER) == PLACEHOLDER) \
            if table != "diseases" else 0
    return report
