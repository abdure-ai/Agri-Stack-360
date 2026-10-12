# Agri-Stack 360: production deployment guide

What to install on a production server, which folders of the repository each part needs, what data must be kept
and backed up, and the settings that must be in place before going live.

Repository: https://github.com/abdure-ai/Agri-Stack-360

---

## 1. The parts of the system

| Part | Port | Reached by | Code |
|---|---|---|---|
| Web app (static files) | 443 (HTTPS) | Browsers and phones | `frontend/` → built into `frontend/dist/` |
| Platform API | 8000 | Browsers, via the web server at `/api` | `backend/` |
| Price forecast API | 8001 | Browsers, via the web server at `/forecast` (the market screens call it directly) | `serving/predict_api.py`, `models/` |
| NMIS data sync | 8002 | Admin browsers, via the web server at `/sync` | `scraper/` |
| Disease model | 8003 | **Platform API only** (internal) | `serving/disease_api.py` |
| Telegram bot (optional) | none | Telegram servers (outgoing connection only) | `backend/telegram_bot.py` |
| Local voice (not for production) | 8004 | — | `serving/tts_api.py`: Meta MMS models, non-commercial licence |

Only port 443 (and 80 for the redirect) is open to the internet. The web server forwards `/api`, `/forecast` and
`/sync` to ports 8000–8002 on the same machine. Port 8003 is never exposed.

---

## 2. Folders to deploy

Deploy these from the repository:

| Folder / file | Needed by |
|---|---|
| `backend/` | Platform API, Telegram bot |
| `serving/` (without `tts_api.py`) | Forecast API, disease model |
| `scraper/` | Data sync |
| `models/` | Forecast API, data sync (retraining) |
| `New_model_with_dropout_256_20_32.keras` | Disease model |
| `data/advisory_seed/` | Crop calendar, treatment protocols, diseases, placeholder products (loaded at setup) |
| `data/advisory_i18n/` | Advisory messages in en/am/om/ti |
| `data/knowledge/moa/` | The MoA guideline PDFs the advisor answers from (ingested at setup) |
| `data/reference/` | Ethiopia administrative boundaries (imported at setup) |
| `nmis_prices.db` | Market prices (Platform API, forecast, data sync) |
| `requirements.txt`, `requirements-disease.txt` | Python packages |
| `scripts/import_admin_boundaries.py`, `scripts/load_advisory_seed.py`, `scripts/ingest_knowledge.py` | One-time setup |
| `scripts/beckn_keygen.py` | Only if the OpenAgriNet/Beckn connection is used |
| `frontend/` | Only to **build** the web app; the server serves `frontend/dist/` |

The simplest layout is to clone the whole repository to one server, e.g. `/opt/agristack`, and leave unused
folders in place; they are never run. For a slimmer install, copy only the table above.

### Not deployed

| Folder / file | Why |
|---|---|
| `tests/`, `docs/`, `archive/`, `evaluation/`, `.agents/` | Development only |
| `Hybrid.ipynb`, `Hybrid_Prediction.py` | Model research; the service uses the `.keras` file |
| `frontend/src/`, `frontend/node_modules/` | Only the built `frontend/dist/` is served |
| `scripts/start_demo.ps1`, `seed_advisory_demo.py`, `seed_full_demo.py`, `record_demo_answers.py`, `smoke_test_api.py` | Demo and testing only. **The demo seeds create accounts with public passwords**; never run them in production |
| `data/demo/`, `data/cache/llm/` | Demo photos and recorded pitch answers |
| `data/exports/` | CSV export; the data sync service recreates it |
| `serving/tts_api.py`, `requirements-tts.txt` | Non-commercial voice models. Voice works through Gemini without it |
| `.venv*`, `.env` | Created on the server; never copied |

---

## 3. Data kept on the server (create, protect and back up)

These are **not** in git and must live on persistent storage:

| Path | Contents | Backup |
|---|---|---|
| `agri_platform.db` | Users, farms, seasons, consent records, questions, photo checks, all portal data | **Daily**, kept off the server. Contains personal data: encrypt backups |
| `nmis_prices.db` | Market prices, kept current by the data sync | Weekly (can be rebuilt from NMIS, slowly) |
| `data/uploads/` | Photos from photo checks | Daily, with the database |
| `data/training/` | Training photos (only from farmers who gave the training consent) | Daily, with the database |
| `.env` | Secrets | Store in a password manager or secrets vault, not with the backups |
| `data/cache/` | Weather, embeddings, voice clips | Not needed; recreated automatically |
| `logs/` | Service logs | Rotate; keep 30 days |

SQLite note: back up with `sqlite3 agri_platform.db ".backup /backup/agri_platform-$(date +%F).db"` (safe while
the services run), not by copying the file.

---

## 4. Settings (`.env`)

Copy `.env.example` to `.env` and fill it in. **Required before going live:**

| Setting | Value |
|---|---|
| `JWT_SECRET_KEY` | Long random string (e.g. `openssl rand -hex 32`). **If it is missing, the code uses a default that is public on GitHub, and anyone could forge a sign-in.** |
| `AI_KEYS_SECRET` | Another long random string (encrypts the Gemini keys admins store). Keep it stable: changing it makes the stored keys unreadable |
| `GEMINI_API_KEY` | A fallback key; admins add more on the AI API Keys page. Gemini is always needed (voice and knowledge-base search) |
| `DEEPSEEK_API_KEY` | Optional. Only if DeepSeek writes the answers (chosen on the AI API Keys page). DeepSeek processes data in China; it receives only the anonymised text |
| `ADVISORY_OFFLINE` | `0` |
| `APP_PUBLIC_URL` | `https://<your-domain>` (used in QR codes and links) |
| `ADVISORY_EMERGENCY_CONTACT` | The verified emergency/poison number (still a placeholder) |
| `TELEGRAM_BOT_TOKEN` | Only if the bot runs. Use a new token for production |

Optional: the `ATI_*` and `BECKN_*` settings stay off until those partners are connected (see
`docs/integrations.md`).

### Web app build settings

Build the web app with the public addresses (all on the same domain, so no cross-site setup is needed):

```bash
cd frontend
npm ci
VITE_API_URL=https://<your-domain>/api \
VITE_FORECAST_URL=https://<your-domain>/forecast \
VITE_SYNC_URL=https://<your-domain>/sync \
npm run build          # output: frontend/dist/
```

Do **not** set `VITE_DEMO_LOGINS`: the sign-in page then hides the demo accounts.

---

## 5. Installation steps (Linux server, example)

Example for Ubuntu 24.04 with Python 3.12+, Node 20+ and nginx. Adjust paths to your server.

```bash
# 1. Code
sudo git clone https://github.com/abdure-ai/Agri-Stack-360.git /opt/agristack
cd /opt/agristack

# 2. Python environments
python3 -m venv .venv          && .venv/bin/pip install -r requirements.txt
python3 -m venv .venv-disease  && .venv-disease/bin/pip install -r requirements-disease.txt

# 3. Secrets
cp .env.example .env && chmod 600 .env && nano .env      # fill in section 4

# 4. Database and reference data (once)
.venv/bin/python -m backend.db_init                      # creates agri_platform.db (see step 7)
.venv/bin/python scripts/import_admin_boundaries.py
.venv/bin/python scripts/load_advisory_seed.py
.venv/bin/python scripts/ingest_knowledge.py             # embeds the MoA PDFs (uses Gemini)

# 5. Web app (section 4 build settings)
cd frontend && npm ci && VITE_API_URL=... npm run build && cd ..
```

**6. Run the services** (systemd, one unit per line; bind to `127.0.0.1` so only nginx can reach them):

| Unit | Command (working directory `/opt/agristack`) |
|---|---|
| `agristack-api` | `.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000` |
| `agristack-forecast` | `.venv/bin/python -m uvicorn serving.predict_api:app --host 127.0.0.1 --port 8001` |
| `agristack-sync` | `.venv/bin/python -m uvicorn scraper.api:app --host 127.0.0.1 --port 8002` |
| `agristack-disease` | `.venv-disease/bin/python -m uvicorn serving.disease_api:app --host 127.0.0.1 --port 8003` |
| `agristack-telegram` (optional) | `.venv/bin/python -m backend.telegram_bot` |

Run the Platform API with **one worker** (the default): it runs the hourly alert engine and the daily-tips drafting
in the background, and several workers would run them several times.

nginx (example, inside the HTTPS `server { }` block):

```nginx
root /opt/agristack/frontend/dist;
location /          { try_files $uri /index.html; }            # single-page app
location = /sw.js   { add_header Cache-Control "no-cache"; }   # offline mode updates
location /api/      { proxy_pass http://127.0.0.1:8000; client_max_body_size 12m; proxy_read_timeout 90s; }
location /forecast/ { proxy_pass http://127.0.0.1:8001/; }
location /sync/     { proxy_pass http://127.0.0.1:8002/sync/; }
```

(`client_max_body_size 12m` allows the 10 MB photo limit; `proxy_read_timeout 90s` covers slow AI answers.)
Get the HTTPS certificate with Let's Encrypt (`certbot --nginx`).

**7. Before opening to users:**

- `backend/db_init.py` creates default accounts with **known passwords** (`0900000001 / admin123`, plus a demo farmer,
  agent and trader). Sign in as admin, change the admin password, and disable or delete the other default accounts
  (Users page).
- Create the real admin, DA, agronomist and organisation accounts.
- Add the Gemini keys on the AI API Keys page.
- Check the advisory settings (Advisory settings page), and set the verified emergency number in `.env`.

---

## 6. Go-live checklist

- [ ] HTTPS works; port 80 redirects to 443; ports 8000–8003 are not reachable from outside.
- [ ] `JWT_SECRET_KEY` and `AI_KEYS_SECRET` set to strong random values; `.env` readable only by the service user.
- [ ] Default and demo accounts removed or their passwords changed; demo seed scripts never run.
- [ ] Web app built with the production URLs and without `VITE_DEMO_LOGINS`; the sign-in page shows no demo list.
- [ ] Knowledge base ingested; an advisor question returns an answer with MoA citations.
- [ ] Photo check works (disease model running); the training dataset only fills for farmers with the training
      consent.
- [ ] Daily backups of `agri_platform.db`, `data/uploads/` and `data/training/` run and a restore was tested.
- [ ] Data sync scheduled (admin: Data Sync page) so prices stay current.
- [ ] Logs rotate; disk space is monitored (photos and the price database grow).
- [ ] Open items from `docs/checklist-audit.md` reviewed: emergency number, legal review of consent texts,
      native-speaker review of am/om/ti texts, placeholder product data replaced with the official registry.

---

## 6a. Demo site (pitch only)

For a public demo, add to the server's `.env`:

```
DEMO_MODE=1
ADMIN_PASSWORD=<a new password of at least 10 characters, known only to you>
```

On the next deploy the workflow runs `scripts/demo_setup.py` once (marker `/state/.demo-seeded`). It adds the demo
accounts and the demo data (40 DEMO farmers in 12 woredas with their activity) and sets the administrator
`0900000001` password to `ADMIN_PASSWORD`. While `DEMO_MODE=1`, the sign-in page lists 14 demo accounts with their
passwords for one-tap sign-in. The administrator is never listed.

To re-seed later: `docker compose --profile demo run --rm demo`. After the demo, set `DEMO_MODE=0` and restart
(`docker compose up -d`): the list disappears. Then disable or delete the demo accounts (Users page) before real
users join, because their passwords are public.

## 7. Sizing (starting point)

| Resource | Minimum | Notes |
|---|---|---|
| CPU / RAM | 4 vCPU, 8 GB RAM | TensorFlow (disease model) uses about 2 GB; forecasting and the API the rest |
| Disk | 40 GB SSD | Code and models about 1 GB, price database about 100 MB, photos grow with use |
| Network | Outbound HTTPS | Gemini, DeepSeek (if used), Open-Meteo, NMIS (data sync) and Telegram |

A single server is enough for the pilot. Scale later by moving the disease model to its own machine (set
`ADVISORY_DISEASE_URL`) and SQLite to PostgreSQL when usage grows.
