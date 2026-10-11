# Advisory seed data

Loaded with `python scripts/load_advisory_seed.py`. Nothing is written if any file has an error.

| File | What | Who fills it |
|---|---|---|
| `diseases.csv` | Disease keys, the disease model's class labels, names, pathogens | Done; review local names |
| `approved_products.csv` | Registered / banned / expired products (EAA list) | **You** — all rows are `PLACEHOLDER_VERIFY` |
| `dosage_rules.csv` | Dose, water, intervals, pre-harvest interval, re-entry, rain-free period, PPE | **You** — from product labels / MoA |
| `treatment_protocols.csv` | Cultural practices and active ingredients per disease | **You** — from the MoA packages |
| `crop_calendar_rules.csv` | Crop stages by days after planting | **You** — from the MoA packages |
| `input_hub_offers.csv` | Input Hub stub offers (replace with the Input Hub API) | Placeholder |
| `pesticide_lexicon.csv` | Product / active-ingredient names the guardrails detect (detection only) | Extend as needed |

Rules:
- Never put a real-looking dose or registration number here unless it is verified. Unverified rows keep
  `verification_status = PLACEHOLDER_VERIFY`, and every answer that uses them says so.
- `drafts/` holds rows copied from MoA tables for an expert to verify; the loader never reads it.

Disease names (`diseases.csv`):
- Amharic names for yellow rust (ቢጫ ዋግ), leaf rust (የቅጠል ዋግ) and Septoria (ሴፕቶሪያ) are the terms used in the
  MoA Bread and Durum Wheat Package (2016 E.C.).
- ዱቄታማ ሻጋታ (powdery mildew), ጤናማ ስንዴ and ግልጽ ያልሆነ ፎቶ are drafts not taken from the package — review them.
- Afaan Oromo names are empty (English is shown) until a native speaker supplies them.
- `name_om` and `name_ti` in diseases.csv are DRAFT translations (Afaan Oromoo, Tigrinya) — review with native speakers.
