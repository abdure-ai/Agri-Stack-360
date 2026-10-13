"""
presentation_data.py — Replace the pilot product and protocol stand-ins with what the MoA wheat manual says.

Run by scripts/demo_setup.py on a presentation site (DEMO_MODE=1), after the demo seeds.

  - Products: the fungicides the MoA Bread and Durum Wheat Production Manual (2016 E.C., p. 36) lists as
    registered for wheat diseases, with their active ingredients and the manual's spray rate per hectare,
    copied as printed and cited by page (status 'moa_cited'). Water volume only where the MoA package gives
    it (Tilt 250 EC, p. 14), and the knapsack mix only where it follows from that. No registration numbers
    (the manual has none). The products stay "not checked against the EAA register", so the app says to
    check the register and follow the label; the label is final.
  - Agro-dealer shops: sample shops near the pitch woreda (Dewa Cheffa) carrying these products, each with a
    SAMPLE price per pack (price_is_sample = 1, shown as "sample price"). A price a dealer enters replaces it.
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
DOSE_CITED = "moa_cited"
RATE_SOURCE = f"{MANUAL}, p. 36 (spray rate per hectare); follow the product label"

# Spray rate per hectare, as printed in the MoA manual's table (p. 36; the same in the irrigated-wheat manual
# p. 44 and package p. 20). Water volume: MoA package Table 6 (p. 14) gives it for Tilt 250 EC only. Knapsack:
# 150-200 L water per ha = 7.5-10 loads of the 20 L knapsack (manual p. 39), so 0.5 L / ha = 50-67 mL per load.
DOSES = {
    "Tilt 250 EC": ("0.5 L", "150-200", "50-67 mL in a 20 L knapsack",
                    f"{MANUAL}, p. 36 (rate); {PACKAGE}, p. 14 (water); knapsack mix calculated from both"),
    "Natura 250 EW": ("0.65 L", None, None, RATE_SOURCE),
    "Amistar Xtra 280 SC": ("0.65 L", None, None, RATE_SOURCE),
    "Nativo 300 SC": ("0.75 L", None, None, RATE_SOURCE),
    "Bumper 25 EC": ("0.5 L", None, None, RATE_SOURCE),
    "Bravo 500": ("1.13 kg", None, None, RATE_SOURCE),
}

# Sample agro-dealer shops (presentation site): (name, woreda P-code, verified-seller badge).
SHOPS = [
    ("Kemise Farmers' Agro Shop", "ET031001", True),       # existing demo shop (dealer 0944000007)
    ("Kemise Town Agro-Input Centre", "ET031006", True),
    ("Senbete Farm Chemicals", "ET031008", False),
    ("Bati Agro Supply", "ET031099", True),
    ("Kombolcha Farm Inputs", "ET030417", True),
]
# SAMPLE prices per pack (birr) for the presentation, varied a little per shop. Not market prices.
SAMPLE_PRICES = {"Tilt 250 EC": (2450, "1 L"), "Natura 250 EW": (2150, "1 L"), "Amistar Xtra 280 SC": (3900, "1 L"),
                 "Nativo 300 SC": (3650, "1 L"), "Bumper 25 EC": (2300, "1 L"), "Bravo 500": (1700, "1 L")}

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
            dose, water, knapsack, dose_source = DOSES[name]
            for target in targets:      # the manual's rate, cited; the label and the EAA register stay final
                conn.execute("""INSERT INTO dosage_rules (product_id, crop, target, dose_per_ha, dose_per_knapsack,
                                    water_volume_l_per_ha, ppe_required, source, verification_status)
                                VALUES (?, 'wheat', ?, ?, ?, ?, ?, ?, ?)""",
                             (pid, target, dose, knapsack, water, json.dumps(PPE), dose_source, DOSE_CITED))
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
        shops = seed_shops(conn, ids)
    print(f"Products: {len(ids)} fungicides from the MoA wheat manual (p. 36) with the manual's rates; "
          f"{len(PROTOCOLS)} treatment protocols from the manual; {len(banned)} pilot example removed; "
          f"{shops} sample shops with sample prices.")
    return 0


def seed_shops(conn, product_ids: list[int]) -> int:
    """Sample agro-dealer shops with the MoA products in stock and SAMPLE prices (never over a dealer's own price)."""
    from backend import input_trust

    input_trust.ensure_schema(conn)          # shop price columns
    names = dict(conn.execute(f"SELECT id, product_name FROM approved_products WHERE id IN "
                              f"({','.join('?' * len(product_ids))})", product_ids).fetchall())
    for i, (shop, pcode, verified) in enumerate(SHOPS):
        row = conn.execute("SELECT id FROM organisations WHERE name=? AND type='agro_dealer'", (shop,)).fetchone()
        if row:
            oid = row[0]
            conn.execute("UPDATE organisations SET woreda_pcode=COALESCE(woreda_pcode, ?), status='active' WHERE id=?",
                         (pcode, oid))
        else:
            oid = conn.execute("""INSERT INTO organisations (name, type, status, note, woreda_pcode, verified, verified_at)
                                  VALUES (?, 'agro_dealer', 'active', 'Agro-input retail shop', ?, ?, ?)""",
                               (shop, pcode, int(verified), "2026-09-01 09:00:00" if verified else None)).lastrowid
        for j, pid in enumerate(product_ids):
            if (i + j) % 4 == 3:          # each shop lacks some products, as real shops do
                continue
            base, pack = SAMPLE_PRICES[names[pid]]
            price = round(base * (1 + ((i * 7 + j * 3) % 11 - 5) / 100), -1)
            keep = "shop_products.price_is_sample = 0 AND shop_products.price_etb IS NOT NULL"   # dealer's own price
            conn.execute(f"""INSERT INTO shop_products (org_id, product_id, in_stock, updated_at, price_etb, pack_size,
                                                        price_is_sample, price_updated_at)
                             VALUES (?, ?, 1, CURRENT_TIMESTAMP, ?, ?, 1, CURRENT_TIMESTAMP)
                             ON CONFLICT(org_id, product_id) DO UPDATE SET
                               price_etb = CASE WHEN {keep} THEN shop_products.price_etb ELSE excluded.price_etb END,
                               pack_size = CASE WHEN {keep} THEN shop_products.pack_size ELSE excluded.pack_size END,
                               price_is_sample = CASE WHEN {keep} THEN 0 ELSE 1 END""",
                         (oid, pid, price, pack))
    return len(SHOPS)


if __name__ == "__main__":
    raise SystemExit(main())
