# Agri-Stack 360

A digital agriculture platform for Ethiopia: market intelligence, AI crop advisory and services for farmers and
everyone who works with them. Built on the NMIS national market price data (309 markets, 2019–2026), the Ministry
of Agriculture wheat guidelines and the official administrative boundaries.

> **Status:** pitch / pilot build. All people and activity in the demo data are fictional and labelled DEMO.
> Product, shop and partner names are placeholders (`PLACEHOLDER…`) until verified data is provided.

## What it does

| For | Features |
|---|---|
| Farmers | Advisor in Amharic, Afaan Oromoo, Tigrinya and English (text or voice) that cites MoA guidelines and says when it doesn't know · photo crop-health check (wheat rusts, mildew, septoria) with a treatment plan · crop calendar · outbreak alerts · daily tips · product authenticity check (QR) · market prices and forecasts · consent and data rights · Telegram bot · offline mode |
| Development Agents | Farmers who agreed to share data, visit list, escalated questions, verify photo checks, register farmers with spoken consent |
| Agronomists | Review queue, knowledge base, content tables, daily tips approval, photo labels and training dataset, translation review |
| Government, NGOs | Aggregated area reports and impact (small numbers hidden), outbreak maps, project messaging |
| Suppliers, dealers, regulator | Code batches and labels, checks at sale, counterfeit map, registered-product list |
| ABCs, commercial farms, traders, lenders | Member planning and buyer requests, block scouting, harvest outlook, credit profile with the farmer's consent |

Every route checks a permission on the server (`backend/permissions.py`, enforced by `tests/test_rbac.py`); no
personal data is sent to the AI (`tests/advisory/test_privacy.py`).

## Architecture

| Service | Port | Code |
|---|---|---|
| Platform API (FastAPI, SQLite `agri_platform.db`) | 8000 | `backend/` |
| Price forecast API | 8001 | `serving/predict_api.py`, `models/` |
| NMIS data sync | 8002 | `scraper/` (`nmis_prices.db`) |
| Disease model (TensorFlow) | 8003 | `serving/disease_api.py`, `New_model_with_dropout_256_20_32.keras` |
| Local voice (optional) | 8004 | `serving/tts_api.py` |
| Web app (React 19, Vite, Tailwind) | 5173 | `frontend/` |
| Telegram bot (optional) | — | `backend/telegram_bot.py` |

AI: written answers by Google Gemini or DeepSeek (an admin chooses on the AI API Keys page, with automatic
fallback to the other); embeddings and speech always by Gemini. Keys sit in an admin-managed, encrypted pool. The
advisor only answers from the ingested MoA documents (`data/knowledge/moa`).

## Run it (Windows)

```powershell
# 1. Python 3.12+ environments
python -m venv .venv;          .venv\Scripts\pip install -r requirements.txt -r requirements-dev.txt
python -m venv .venv-disease;  .venv-disease\Scripts\pip install -r requirements-disease.txt
# optional local voice:  python -m venv .venv-tts; .venv-tts\Scripts\pip install -r requirements-tts.txt

# 2. Settings
copy .env.example .env         # set JWT_SECRET_KEY, AI_KEYS_SECRET and GEMINI_API_KEY

# 3. Web app
cd frontend; npm install; cd ..

# 4. Reference data, knowledge base and demo data
.venv\Scripts\python scripts\import_admin_boundaries.py
.venv\Scripts\python scripts\load_advisory_seed.py
.venv\Scripts\python scripts\ingest_knowledge.py        # embeds the MoA PDFs (uses Gemini)

# 5. Start everything (the -Reseed flag loads the demo data)
powershell -ExecutionPolicy Bypass -File scripts\start_demo.ps1 -Reseed
```

Open http://localhost:5173. In development builds the sign-in page lists a one-tap demo account for every role
(farmer `0944000001`, DA `0944000002`, admin `0900000001` and others; demo passwords only). Production builds hide
that list. Add `-Offline` to replay recorded answers without internet.

Tests: `.venv\Scripts\python -m pytest tests -q`. Frontend checks: `cd frontend; npx tsc --noEmit -p tsconfig.app.json; npm run lint`.

## Documentation

- `docs/deployment.md`: production deployment: folders per service, data to back up, settings, go-live checklist
- `docs/checklist-audit.md`: what is built, per role, with evidence and open items
- `docs/agri-stack-advisory-module-spec.md`: advisory module specification
- `docs/mobile/`: Flutter guide for the Farmer + DA app, OpenAPI contract, translation files
- `docs/integrations.md`: OpenAgriNet/Beckn and ATI Farmer Profile settings
- `docs/demo/`: pitch demo script
- Live API docs while running: http://localhost:8000/api/docs

## Data and licences

- **Market prices:** National Market Information System (NMIS), `nmis_prices.db` and `data/exports/`.
- **Guidelines:** Ministry of Agriculture wheat production manuals and packages (`data/knowledge/moa`). They remain
  the Ministry's documents.
- **Boundaries:** Ethiopia administrative boundaries (`data/reference/eth_admin_boundaries.xlsx`).
- **Voice:** the optional local voice service uses Meta MMS models (CC BY-NC 4.0, non-commercial). Replace them
  before any commercial use.
- **Web template:** based on TailAdmin (`frontend/TEMPLATE-LICENSE.md`).
- Weather and elevation: Open-Meteo.

## Security notes

- Never commit `.env`; the platform database (`agri_platform.db`), uploaded photos and the training dataset are
  excluded from git on purpose.
- Set a strong `JWT_SECRET_KEY` before exposing any service: without it the code falls back to an insecure default.
- Change or remove the demo accounts before real use.
