"""
presentation_data.py — Replace the pilot product and protocol stand-ins with what the MoA wheat manual says.

Run by scripts/demo_setup.py on a presentation site (DEMO_MODE=1), after the demo seeds.

  - Products: the fungicides the MoA Bread and Durum Wheat Production Manual (2016 E.C., p. 36) lists as
    registered for wheat diseases, with their active ingredients. No registration numbers (the manual has
    none) and NO DOSES: the manual's spray rates are not shown until checked against the product label and
    the current EAA register. The products stay "not verified" in the data, so the app says to check the
    EAA register and follow the label.
  - Treatment protocols: practices and symptoms from the same manual (pp. 33-36) and the Production Package
    (pp. 10-13), translated from Amharic and cited by page.
  - The pilot's example banned product is removed.

Safe to run again. Re-running scripts/load_advisory_seed.py afterwards would add the pilot rows back.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.advisory.schema import PLACEHOLDER  # noqa: E402
from backend.platform_db import get_platform_connection  # noqa: E402

MANUAL = "MoA Bread and Durum Wheat Production Manual, 2016 E.C."
PACKAGE = "MoA Bread and Durum Wheat Production Package, 2016 E.C."
LIST_SOURCE = f"{MANUAL}, p. 36 (registered fungicides for wheat diseases)"
PPE = ["gloves", "mask", "long_sleeves", "boots", "goggles"]

# (name, active ingredient, formulation, target diseases) — MoA manual p. 36. Pilot rows are renamed in place
# (same ids, so code batches and shop stock keep working); the rest are added.
PRODUCTS = [
    ("PLACEHOLDER_FUNGICIDE_A", ("Tilt 250 EC", "Propiconazole", "EC", ["yellow_rust"])),
    ("PLACEHOLDER_FUNGICIDE_B", ("Natura 250 EW", "Tebuconazole", "EW", ["yellow_rust"])),
    ("PLACEHOLDER_FUNGICIDE_C", ("Bravo 500", "Chlorothalonil", "SC", ["septoria_tritici_blotch"])),
    (None, ("Amistar Xtra 280 SC", "Azoxystrobin + Cyproconazole", "SC", ["yellow_rust"])),
    (None, ("Nativo 300 SC", "Trifloxystrobin + Tebuconazole", "SC", ["yellow_rust"])),
    (None, ("Bumper 25 EC", "Propiconazole", "EC", ["leaf_rust"])),
]

PROTOCOLS = {
    "yellow_rust": {
        "practices": [
            "Grow rust-resistant wheat varieties: the cheapest protection, and it avoids chemical costs.",
            "If a variety loses its resistance and yellow rust hits it hard, stop growing that variety.",
            "Before spraying: scout the field, confirm it is yellow rust, judge how much of the field is affected "
            "and the crop stage, then choose the right registered fungicide and spray time with your Development Agent.",
        ],
        "ais": ["Propiconazole", "Tebuconazole", "Azoxystrobin + Cyproconazole", "Trifloxystrobin + Tebuconazole"],
        "scouting": "Look for yellow stripes running in straight lines along the leaves; in a heavy attack the ear "
                    "is also infected. Losses can reach 100% on susceptible varieties.",
        "source": f"{MANUAL}, p. 34; {PACKAGE}, pp. 11-13",
    },
    "leaf_rust": {
        "practices": [
            "Grow leaf-rust resistant varieties: the better option than spraying.",
            "Before spraying: scout the field, confirm the disease, judge how much of the field is affected and the "
            "crop stage, then decide with your Development Agent.",
        ],
        "ais": ["Propiconazole"],
        "scouting": "Look for bright orange to brown pustules on the upper side of the leaves (not on the back of "
                    "the leaf), like stem rust but brighter in colour.",
        "source": f"{MANUAL}, p. 34; {PACKAGE}, pp. 12-13",
    },
    "septoria_tritici_blotch": {
        "practices": [
            "Grow resistant varieties and rotate crops: the low-cost way to control septoria.",
            "Avoid growing wheat on the same field year after year: the disease survives on crop residue and "
            "attacks the next wheat crop.",
            "Before spraying: scout the field and decide with your Development Agent.",
        ],
        "ais": ["Chlorothalonil"],
        "scouting": "Symptoms start on the lower leaves and move up to the ear over time. Long cloudy, rainy "
                    "spells spread it fast. Losses of 25-60% on susceptible varieties.",
        "source": f"{MANUAL}, p. 36",
    },
    "powdery_mildew": {
        "practices": [
            "Use disease-resistant varieties.",
            "Rotate crops: many wheat diseases survive on stubble, straw and in the soil after harvest.",
            "Scout the field regularly and ask your Development Agent before using any chemical.",
        ],
        "ais": [],
        "scouting": "Check leaves and stems for white, powdery patches, starting with the lower leaves.",
        "source": f"{PACKAGE}, pp. 10-11",
    },
}


def main() -> int:
    conn = get_platform_connection()
    ids = []
    with conn:
        for old, (name, ai, form, targets) in PRODUCTS:
            row = conn.execute("SELECT id FROM approved_products WHERE product_name IN (?, ?)", (old or name, name)).fetchone()
            values = (name, ai, form, None, "fungicide", json.dumps(["wheat"]), json.dumps(targets), "registered",
                      LIST_SOURCE, PLACEHOLDER)
            if row:
                conn.execute("""UPDATE approved_products SET product_name=?, active_ingredient=?, formulation=?,
                                registration_number=?, category=?, target_crops=?, target_diseases=?, status=?, source=?,
                                verification_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?""", (*values, row[0]))
                pid = row[0]
            else:
                pid = conn.execute("""INSERT INTO approved_products (product_name, active_ingredient, formulation,
                                      registration_number, category, target_crops, target_diseases, status, source,
                                      verification_status) VALUES (?,?,?,?,?,?,?,?,?,?)""", values).lastrowid
            ids.append(pid)
            conn.execute("DELETE FROM dosage_rules WHERE product_id=?", (pid,))
            for target in targets:      # no doses: follow the label (rates in the manual are not verified here)
                conn.execute("""INSERT INTO dosage_rules (product_id, crop, target, ppe_required, source, verification_status)
                                VALUES (?, 'wheat', ?, ?, 'Follow the product label and your Development Agent', ?)""",
                             (pid, target, json.dumps(PPE), PLACEHOLDER))
        banned = [r[0] for r in conn.execute("SELECT id FROM approved_products WHERE product_name='PLACEHOLDER_BANNED_PRODUCT'")]
        for pid in banned:
            conn.execute("DELETE FROM dosage_rules WHERE product_id=?", (pid,))
            conn.execute("DELETE FROM approved_products WHERE id=?", (pid,))
        for key, p in PROTOCOLS.items():
            conn.execute("""INSERT INTO treatment_protocols (disease_key, crop, cultural_practices, recommended_active_ingredients,
                                                            scouting_advice, source, verification_status)
                            VALUES (?, 'wheat', ?, ?, ?, ?, ?)
                            ON CONFLICT(disease_key, crop) DO UPDATE SET cultural_practices=excluded.cultural_practices,
                              recommended_active_ingredients=excluded.recommended_active_ingredients,
                              scouting_advice=excluded.scouting_advice, source=excluded.source,
                              verification_status=excluded.verification_status""",
                         (key, json.dumps(p["practices"]), json.dumps(p["ais"]), p["scouting"], p["source"], PLACEHOLDER))
    print(f"Products: {len(ids)} fungicides from the MoA wheat manual (p. 36), no doses; "
          f"{len(PROTOCOLS)} treatment protocols from the manual; {len(banned)} pilot example removed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
