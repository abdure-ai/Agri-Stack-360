# Agri-Stack 360 mobile app: developer guide (Flutter)

This guide covers the Android app for **farmers** and **Development Agents (DAs)**. The backend, the web app and every API
below already exist and are tested. The mobile app is a new client on the same API: it must not change any rule
about access, consent or safety. Those rules are enforced on the server and repeated here so the app shows them
correctly.

Contents: 1 Scope · 2 Hand-off kit · 3 Environments · 4 Sign-in and session · 5 Roles and screens ·
6 Farmer screens · 7 DA screens · 8 Key flows in detail · 9 Offline (required) · 10 Languages ·
11 Privacy and safety rules · 12 Errors, limits and timeouts · 13 Suggested packages ·
14 Not in the API yet · 15 Definition of done · 16 Questions to settle with the product owner

---

## 1. Scope

One app, two experiences chosen by the signed-in user's role:

| Role (`user.role`) | Who | Main jobs in the app |
|---|---|---|
| `farmer` | Smallholder farmer | Ask the advisor (text or voice), photo crop check, crop calendar, alerts, daily tips, check a product code, market prices, consent and data rights, credit and ABC requests |
| `agent` | Development Agent | Farmers who agreed to share data, today's visit list, escalated questions, verify photo checks, register a farmer (with spoken consent), ask or check on a farmer's behalf |

Other roles (agronomist, supplier, government and so on) use the web app. If another role signs in, show a short
"Please use the web app at …" screen.

Target: Android 8.0+ (API 26+), low-end phones (2 GB RAM), slow or intermittent networks. iOS can come later on the
same Flutter code.

## 2. Hand-off kit

All of this is in the repository under `docs/mobile/`:

| File | What it is |
|---|---|
| `flutter-developer-guide.md` | This guide |
| `openapi-mobile.json` | OpenAPI 3 contract of the 56 endpoints the app uses, generated from the server code. Generate a Dart client with `openapi-generator-cli generate -g dart-dio -i openapi-mobile.json`, or use it as reference |
| `l10n/app_en.arb`, `app_am.arb`, `app_om.arb`, `app_ti.arb` | All texts of the web app in English, Amharic, Afaan Oromoo and Tigrinya, as Flutter ARB files. Keys are camelCase versions of the web keys (the original is in each `description`). Strings with `"x-draft": true` still need a native-speaker review |

To regenerate both after backend changes, run `.venv/Scripts/python.exe scripts/export_mobile_kit.py`.

The live, interactive API docs are at `http://<server>:8000/api/docs` (Swagger, try calls with a token) and `http://<server>:8000/api/redoc` (reading view) while the backend runs.

### Demo accounts (password `demo1234` unless noted)

| Phone | Role | Use it for |
|---|---|---|
| 0944000001 | farmer | The pitch farmer: irrigated wheat in Dewa Cheffa, alerts, calendar |
| 0944000003 | farmer | Has open DA cases and a waiting credit request |
| 0945000023 | farmer | Farmer in Tiyo, Oromia, app language Afaan Oromoo |
| 0945000001 … 0945000040 | farmer | 40 demo farmers in 12 woredas (Amhara, Oromia, SNNP) with farms, seasons and photo checks |
| 0944000002 | agent | DA for Amhara (Dewa Cheffa and nearby) |
| 0945000201 / 0945000202 | agent | DAs for Oromia / SNNP |
| 0944000006 | agronomist | Approves and publishes daily tips (web) |
| 0900000001 / `admin123` | admin | Publishes daily tips (web: *Publish tips*), everything else |

The web sign-in page lists every demo account as a one-tap button (development and demo builds only).

All demo people and records are labelled DEMO. Product, shop and partner names are placeholders
(`PLACEHOLDER…`). Show them as they come; never replace them with real-looking names.

## 3. Environments

| | Base URL | Notes |
|---|---|---|
| Local / demo PC | `http://<pc-lan-ip>:8000/api` | The PC prints its address when `scripts/start_demo.ps1` starts. Windows firewall must allow port 8000 |
| Production | `https://<to be decided>/api` | HTTPS only |

- Put the base URL in a build flavor or `--dart-define=API_BASE=...`. Never hard-code it.
- Android blocks plain `http://` by default. For **debug builds only**, allow cleartext to the LAN demo PC with a
  `network_security_config.xml`. Release builds must be HTTPS-only.
- All JSON is UTF-8. Dates are ISO strings (`2026-10-11`, `2026-10-11 08:26:59`, local Ethiopian time, UTC+3).
  Some responses also carry an Ethiopian-calendar display string (for example `planting_date_display`). Show that
  string as it is.

## 4. Sign-in and session

| Call | Body | Returns |
|---|---|---|
| `POST /auth/login` | `{phone, password}` | `{access_token, refresh_token, token_type, user}` |
| `POST /auth/register` | `{phone, name, password, role: "farmer", area_pcode, language, consent_data, consent_alerts, consent_training}` | Same as login. Farmers only: DA accounts are created by an admin |
| `POST /auth/refresh` | `{refresh_token}` | `{access_token}` |
| `GET /auth/me` | — | `user` with `permissions[]` |

- Send `Authorization: Bearer <access_token>` on every call.
- The access token lasts **24 h** and the refresh token **7 days**. On a `401`, call `/auth/refresh` once and repeat
  the request. If that fails, sign the user out.
- Keep tokens in `flutter_secure_storage` only, never in plain shared preferences or logs.
- Call `/auth/me` on start and when the app comes back to the foreground. An admin may have changed the role or
  disabled the account.
- **Shared phones:** signing out must delete the tokens, the local cache, the saved photo results and any unsent
  items (section 9). Say so in the sign-out confirmation when items are waiting.
- Phone numbers are 10 digits starting with `0` (`09xxxxxxxx`). Passwords are at least 6 characters.
- **Demo-login picker (debug and demo builds only):** under the sign-in form, show the farmer and DA demo
  accounts from section 2 as buttons that sign in with one tap. The texts are `signin.demoAccounts`,
  `signin.demoHint`, `signin.demo.pitchFarmer`, `signin.demo.farmerCases` and `signin.demo.oromiaFarmer`.
  Compile it out of release builds (for example `const bool.fromEnvironment('DEMO_LOGINS')`): it contains passwords.
- The sign-up address is a P-code chosen from three lists (region → zone → woreda) from `GET /geo/areas?parent=<pcode>`
  (no parent: regions). These lists are public and safe to cache.
- Sign-up consents are three separate, unticked checkboxes. Use the texts `signup.consentData`,
  `signup.consentAlerts` and `signup.consentTraining`.

## 5. Roles and screens

Decide visibility from `user.permissions`, not from the role name, exactly like the web app:

| Permission | Unlocks |
|---|---|
| `advisory:use` | Advisor chat, voice, alerts |
| `crop_health:use` | Photo check |
| `farms:manage_own` | My farms and seasons, crop calendar |
| `inputs:verify` | Check a product code, report a suspected fake |
| `financial:read` | Credit score and loan options (loans are DEMO data, see 11) |
| `market:read` | Market prices |
| `da:work` | All DA screens |
| `profile:manage` | Profile, consent, my data, deletion request, credit and ABC requests |

Daily tips (`/tips/today`) are for everyone signed in.

The server checks every permission again on every request. Hiding a screen is for convenience, not security.

## 6. Farmer screens

| Screen | Endpoints |
|---|---|
| Home | `GET /tips/today?language=`, `GET /advisory/alerts?language=`, `GET /advisory/calendar`, `GET /summary` (prices) |
| Advisor chat | `POST /advisory/ask`, `GET /advisory/conversations/{id}`, `POST /advisory/feedback`, `POST /advisory/stt`, `POST /advisory/tts` |
| Photo check | `POST /advisory/diagnose` (multipart), `POST /advisory/diagnoses/{id}/outcome` |
| Crop calendar | `GET /advisory/calendar` |
| Alerts | `GET /advisory/alerts`, `POST /advisory/alerts/{id}/read` |
| Daily tips | `GET /tips?days=30&language=` |
| My farms and seasons | `GET/POST /users/farms`, `PUT/DELETE /users/farms/{id}`, `GET/POST /users/farms/{id}/seasons`, `PUT/DELETE …/seasons/{sid}` |
| Check a product | `POST /trust/verify {code}`, `POST /trust/fake-reports`, `GET /trust/shops` |
| Market prices | `GET /summary`, `GET /prices?crop=&region=&price_level=retail`, `GET /markets`, `GET /meta` |
| Livestock prices | `GET /livestock/summary`, `GET /livestock/prices?animal=&region=` (see 8.10) |
| Map | `GET /map/layers`, `GET /map/crops`, boundary files `/geo/eth_adm{1,2,3}.json` (see 8.11) |
| Credit | `GET /financial/profile`, `GET /financial/loan-products` |
| Requests to me | `GET /users/credit-requests`, `POST /users/credit-requests/{id}/approve\|decline\|revoke`; `GET /users/abc-invitations`, `POST /users/abc-invitations/{org_id}/accept\|decline\|leave` |
| ABC membership | `GET /users/abc-invitations` (accept/decline/leave), `GET /abc/my/memberships`, `GET /abc/my/agreement/file?org_id=`, `POST /abc/my/agreement/sign?org_id=` (read, then confirm the founding agreement) |
| Profile and privacy | `GET/PUT /users/profile`, `GET/PUT /users/consent`, `GET /users/my-data`, `GET/POST /users/my-data/erase-request`, `POST …/erase-request/cancel` |

## 7. DA screens

| Screen | Endpoints |
|---|---|
| Today's visits | `GET /da/priorities`. Each item has `farmer`, `score` and `reasons[]` (`worse`, `uncertain_diagnosis`, `overdue_follow_up`, `outbreak_nearby`, `open_question`) |
| My farmers | `GET /da/farmers?language=`. Only farmers in the DA's region who gave data consent |
| Farmer detail | `GET /advisory/calendar?farmer_id=` |
| Escalated questions | `GET /da/escalations?status=open&language=`, `POST /da/escalations/{id}/answer {text}`, `…/forward {note}` (to an agronomist), `…/close` |
| Verify a photo check | `GET /da/diseases`, `POST /da/diagnoses/{id}/verify {disease_key}` |
| Register a farmer | `POST /da/farmers {name, phone, pin, area_pcode, language, kebele, consent_data, consent_alerts, consent_training}` |
| Ask or check for a farmer | `POST /advisory/ask {…, farmer_id}`, `POST /advisory/diagnose` with form field `farmer_id` |

**Registering a farmer:** read each consent question aloud and tick it only if the farmer says yes. The server
records it as spoken consent given to that DA. Without data consent the farmer won't appear in the DA's list, and
the app must say so (`da.consentNoData`). The `pin` is a temporary password the farmer changes later.

## 8. Key flows in detail

### 8.1 Advisor question

`POST /advisory/ask` with `{question, language?, conversation_id?, farmer_id?, channel: "app"}`. It can take
10–20 s: show a typing indicator and use a 60 s timeout.

Response (`AskResult`): `message_id, conversation_id, kind, language, answer, sources[], confidence, escalated,
escalation_reason, guardrail_flags[]`.

- `kind`: `answer`, `dont_know` (the farmer's DA was told), `poisoning` (fixed emergency text), `person` (passed to a
  DA), `product_refusal`, `unavailable` (AI service down). Show every kind as an answer bubble, never as an error.
- The answer contains citation markers `[S1]`, `[C]` and `[M]`. Show `sources[]` under the answer
  (`citation`, for example "MoA Irrigated Wheat Production Manual, 2016 E.C., p. 10"). Never strip the citations.
- `confidence: "low"` comes with a warning sentence already in the text. Show it as it is.
- Keep `conversation_id` and send it with the next question so follow-ups have context.
- Thumbs up/down: `POST /advisory/feedback {message_id, rating: "helpful"|"not_helpful"}`.

### 8.2 Voice

- **Speech to text:** record at most about 1 minute, under 2 MB (m4a/AAC, ogg/opus, webm or wav).
  `POST /advisory/stt` multipart: `audio` (file) and `language` (`am|om|en|ti`). It returns
  `{text, language, engine, quality_verified}`. Put the text in the input box for the farmer to check before
  sending. When `quality_verified` is false, show `voice.unverified`. While recording, show `voice.privacy`:
  the recording goes to Google Gemini and is not stored.
- **Text to speech:** `POST /advisory/tts {text, language}` returns `audio/wav`. Play it with a "Listen" button
  on answers, tips and plans.

### 8.3 Photo crop check (and the training dataset)

1. Offer two buttons: **Take photo** (camera) and **Choose from gallery**.
2. Resize to at most 1600 px on the longest side and save as JPEG at about 85 % quality before upload. This keeps
   uploads small on 2G/3G. Re-encoding also drops the photo's EXIF data (GPS point, phone model): do this
   **on the device**, every time. The server limit is 10 MB.
3. `POST /advisory/diagnose` multipart with fields `image`, `farm_id` (optional), `language`,
   `capture_source` (`camera` or `gallery`) and, for a DA, `farmer_id`.
4. Response (`AdvisoryDiagnosis`): `diagnosis_id, kind (disease|healthy|uncertain|invalid_photo), disease, confidence,
   reason, notes[], general_advice[], plan, follow_up_date, escalated, model{photo_only, with_conditions, …}`.
   - `uncertain`: say a DA will look at it (`escalated: true`).
   - `plan` (`TreatmentPlan`): `cultural_practices[]`, `scouting_advice`, `recommended_active_ingredients[]`,
     `products[]`, `offers[]`, `weather_advice`, `safety`, `sources[]`, `verified`, `warnings[]`. Show
     `safety` every time chemicals appear. When `verified` is false, show that the plan is not yet verified.
   - **The treatment chain on one screen**, in this order: what to do in the field → products with usage →
     where to buy → "Check the pack before you spray".
   - `products[]`: `product_name`, `active_ingredient`, `dose_per_ha` (e.g. `"0.5 L"`), `amount_for_plot`
     (`"250 mL / 0.5 ha"`, the rate × the farm's area; null when the farm has no area), `water_volume_l_per_ha`,
     `dose_per_knapsack` (only where the source gives the water volume), PPE, `source` and `dose_cited`.
     `dose_cited: true` means the rate is copied from the cited MoA manual page: show the badge `photo.p.cited`,
     the `source` line and `photo.p.followLabel`. Show only the fields that are not null; never calculate a
     dose in the app.
   - `offers[]` (nearest 4 shops, each with every plan product it has in stock, nearest first): `shop_id`,
     `supplier` (shop name), `woreda`, `distance_km` (hide when 0), `phone` (tap to call), `verified_seller`
     (badge `photo.shop.verified`), `product_name`, `price_etb` + `unit` (pack size; null price →
     `photo.shop.askPrice`), `price_is_sample` (show `photo.shop.samplePrice`), `price_updated_at`. Group the
     rows by `shop_id`. Never reorder by badge or price. Empty list → `photo.shop.none`.
   - The "Check the pack" button opens the product check with this `diagnosis_id` (8.7).
5. Seven days later the farmer gets a follow-up alert. Answer it with
   `POST /advisory/diagnoses/{id}/outcome {outcome: improved|same|worse}`. `worse` alerts the DA.

**Training dataset:** when the farmer has given the separate *training* consent (`GET /users/consent` → `training`),
the server keeps a copy of the photo, with metadata removed, for retraining the model. The app does nothing extra
except send `capture_source`. Never upload photos for training any other way, and never keep a hidden copy.

### 8.4 Crop calendar

`GET /advisory/calendar` returns one item per active season: `crop, season, planting_date(_display),
days_after_planting, current_stage{stage_name, tasks[{text, source}]}, next_stage{stage_name, in_days},
stages[], timing_estimated`. When `timing_estimated` is true, say the dates are estimates from the manuals.
When `calendar_known` is false (crops other than wheat), show `seasons.noGuidance`. Don't invent stages.

### 8.5 Alerts

`GET /advisory/alerts?language=` returns `{id, type, severity, status, message, payload, created_at}`. `message`
is already translated, so show it as it is. Types include `neighborhood_disease`, `follow_up`, `stage_reminder`,
`spray_rain_warning`, `da_answer` (a reply from a DA or an agronomist), `abc_message` and `ngo_message`. Mark one as read with
`POST /advisory/alerts/{id}/read`. Alerts are pulled. There is no push yet (section 14): poll on app start,
on resume and every 30 minutes while the app is open.

### 8.6 Daily tips

`GET /tips/today?language=` returns up to 3 tips: `{id, tip_date, title, body, sources[], language, origin}`. If
`language` differs from the one asked for, show `tips.englishOnly`. `GET /tips?days=30` gives the history.

Tips are written and published on the **web** only. An admin or agronomist either writes a tip and presses
*Save and publish*, or approves the drafts the system makes each morning from the MoA guidelines. The app only
reads published tips: there is no writing or approving in the mobile app, and no draft ever reaches it. When the
list is empty, show `tips.none`. Refresh on app start and on resume; a tip published during the day appears then.

### 8.7 Check a product code (QR)

Scan the QR on the pack, or type the 12-character code (`AB3D-EF7H-JK9M`). A QR may contain a URL ending in
`?code=…`: send the whole text, the server extracts the code. `POST /trust/verify {code}` returns `{result:
genuine|warning, reason, product_name, org_name, batch_number, expires_on, placeholder, …}`. Opened from a
treatment plan, send `{code, diagnosis_id}`: the answer then has `plan_match: {disease_key, matches,
recommended[]}`. `matches` and `genuine` → `verify.plan.match`; `matches` but `warning` →
`verify.plan.matchButWarning` (do not use the pack); not matching → `verify.plan.noMatch` with the `recommended`
names. The `reason` values
are `ok`, `unknown_code`, `recalled`, `supplier_suspended`, `not_registered`, `expired` and `possible_copy`. Use the
texts `trust.reason.<reason>`. When `placeholder` is true, show that the product data is a placeholder.
"Report a suspected fake" sends `POST /trust/fake-reports {code?, product_text?, shop_text?, note?}`.

### 8.8 Consent, my data, deletion

- `GET /users/consent` returns `{data, alerts, training, history[]}`. `PUT /users/consent` takes any of
  `{data, alerts, training}`. Show three switches with the texts `consent.<kind>` and `consent.<kind>Hint`.
  Turning training off deletes the farmer's photos from the dataset. Say so before switching.
- "Download my data": `GET /users/my-data` returns JSON. Share it with the system share sheet.
- Deletion: `POST /users/my-data/erase-request {reason?}`. An admin reviews it.
  `GET /users/my-data/erase-request` returns the status.

### 8.9 Credit and ABC requests

A bank or MFI can ask to see the farmer's credit profile. `GET /users/credit-requests` lists the requests:
`approve` shares the profile for 30 days, `decline` refuses, and `revoke` stops sharing at any time. ABC invitations
work the same way through `GET /users/abc-invitations`. Show both on the Profile screen only when the lists are
not empty.

### 8.10 Livestock prices

NMIS livestock market prices per head, with a 4-week outlook. Same data as the web page *Livestock prices*.

- `GET /livestock/summary` → `{reports, markets, first_date, last_date, animals: [{animal, reports, markets, …}],
  regions[]}`. `reports == 0`: show "No livestock prices loaded yet" and nothing else.
- `GET /livestock/prices?animal=Ox&region=Oromia` (region optional) →
  `{forecast, series: [{market, region, breed, sex, production_type, body_condition, latest: {date, min, max, avg},
  change_pct, points[], outlook: {date, low, avg, high} | null}]}`. Prices are birr **per head**.
- `forecast`: `status` (`ok` | `insufficient` | `no_data`), `confidence` (`high` | `medium` | `low` | null),
  `direction` (`up` | `down` | `flat`), `change_pct`, `range_pct: [low, high]` (80% range), and `reasons[]`.
  **Always show the confidence and the reasons next to the outlook**; with `status != ok` show "No outlook yet"
  and the reasons. Each reason is `{code, params, text}`: translate by `code` with the `lv.reason.*` texts in the
  ARB files (fill `{reports}`, `{markets}`, `{start}`, `{end}`, `{days}`, `{pct}`, `{naive}` from `params`;
  `model_error_pct` → `pct`, `no_change_error_pct` → `naive`), or show `text` (English) for an unknown code.
- When the region has too few reports, `forecast.region` is `null`: the outlook is for the whole country (say so).
- The advisor answers livestock price questions too ("የበሬ ዋጋ ስንት ነው?"): nothing to do in the app.

Import and retraining are web-only (admin). Cache the last response for offline like the crop prices.

### 8.11 Map

`GET /map/layers?layers=disease,markets,shops,farms&crop=Wheat&days=30&language=` returns `{available[], scope,
layers}`. Only the layers this user may see are in `layers`; build the layer switches from `available`.

- `scope`: `{pcode, names[], latitude, longitude, level}`: centre the map there (level 0 country, 1 region,
  2 zone, 3 woreda). A farmer: centre on their own farm (`layers.farms.farmers[0]`).
- `disease.hotspots[]`: per woreda and disease, at the woreda centre: `disease`, `scans` (a number or `"<5"`),
  `scans_band` (`low|medium|high` → circle size), `latest`. Never show these as farm points.
- `markets.markets[]`: `name, region, latitude, longitude, approximate, price_etb, unit, date,
  price_per_quintal`. Colour by `price_per_quintal` between `price_min` and `price_max` (values outside get the end
  colours); show `price_etb` / `unit` in the popup. `approximate: true` = at the region's centre (dashed marker).
  `GET /map/crops` gives the crop list.
- `shops.shops[]`: `name, verified, phone, woreda, latitude, longitude, products[{product_name, price_etb,
  pack_size, price_is_sample}]` (at the woreda centre, approximate). Regulators also get `shops.counterfeits[]`.
- `farms`: `mode: "own"` (the farmer's farm), `"farmers"` (a DA: consenting farmers with `priority` and
  `reasons[]`, texts `da.reason.*`) or `"counts"` (government/admin: `woredas[]` with `farmers`, `farms`,
  `hectares`, never names).
- Boundaries: download once and cache: `/geo/eth_adm1.json` (regions, 20 kB), `/geo/eth_adm2.json` (zones,
  250 kB), `/geo/eth_adm3.json` (woredas, 1.8 MB; load only when zoomed in). GeoJSON with `pcode` and `name`.
- Base map: OpenStreetMap tiles (e.g. `flutter_map`), with the credit "© OpenStreetMap contributors · Boundaries ©
  OCHA (CC BY-IGO)". Follow the OSM tile usage policy (set a User-Agent, no bulk downloads); for heavy use, a tile
  provider with a key.

## 9. Offline (required)

Many farmers have no signal in the field. The web app already behaves like this; the mobile app must match it.

**Read offline:** keep the last good response of these calls in a local database (drift or sqflite), per signed-in
user, and show it with an "offline, last saved copy" banner:
`/auth/me`, `/users/profile`, `/users/farms`, `/users/farms/{id}/seasons`, `/users/consent`, `/advisory/calendar`,
`/advisory/alerts`, `/advisory/conversations/{id}`, `/tips/today`, `/tips`, `/financial/profile`, `/geo/areas`,
`/summary`. For DAs, also `/da/priorities`, `/da/farmers` and `/da/escalations`. Use the network first; after
about 8 s on a slow line, show the saved copy.

**Send later (outbox):** if a question or photo check fails because there is no connection (not because the
server refused it), save it in an outbox table with the user id, the payload, the photo bytes and `capture_source`.
Tell the user "saved, will be sent when you are back online" (`offline.queuedQuestion`, `offline.queuedPhoto`).
Send the items in order when the connection returns (connectivity_plus plus a retry every 15 s while the app is
open, and WorkManager in the background):

- Only send the items of the signed-in user.
- On a 4xx answer, drop the item and tell the user why (`offline.notSent`). On 5xx or no network, keep it and
  retry later.
- Questions queued before any conversation existed share the conversation the first one creates.
- Keep the last 10 photo-check results with their plans on the phone so they can be read offline.

**Sign-out deletes** the cache, the saved results and the outbox.

DA registrations and verifications made offline are **not** queued in version 1. They need a connection, so
show that clearly.

## 10. Languages

- Four interface languages: `en`, `am` (Amharic), `om` (Afaan Oromoo) and `ti` (Tigrinya). Use the ARB files from
  section 2 with `flutter_localizations`. Default to the user's `language` from `/auth/me`, and let them change it
  in the app (save it with `PUT /users/profile {language}`).
- Pass `language` to the alerts, tips and DA calls (the screen language). For **`POST /advisory/ask`**, leave
  `language` out (or `null`) so the server answers in the language the question is written in; send it only when
  the user explicitly picks an answer language. (The server also corrects a screen language that clearly doesn't
  match the question's script, e.g. an Amharic question with `"en"`.)
- Amharic and Tigrinya use the Ethiopic script. Bundle **Noto Sans Ethiopic** and test on low-end Android phones.
- Many am/om/ti strings are still drafts (`x-draft`). Native speakers will review them, so don't edit them in the
  app; changes go back into the web files and are exported again.

## 11. Privacy and safety rules (non-negotiable)

1. **No personal data to third parties.** No analytics, crash or ads SDK may receive names, phone numbers, P-codes
   finer than region, GPS points, photos, recordings or question texts. If you add crash reporting, scrub those
   fields and ask the product owner first.
2. **No other AI on the device or the network.** All AI goes through the platform API, which removes personal data
   before calling Gemini. Don't call any AI service from the app.
3. **Never show a pesticide product, dose or interval** unless it comes from the API (`plan.products`, which only
   lists registered products). Never edit, summarise or translate API answers on the device.
4. **Always show sources** with answers, plans and tips, and the `safety` text whenever chemicals appear.
5. **Demo and placeholder labels stay visible:** loan products (`demo_data: true`), `PLACEHOLDER…` names and
   `placeholder: true` products.
6. **Consent is opt-in.** All consent switches and checkboxes start off. Never pre-tick them and never bundle them.
7. **Location:** the app doesn't need the phone's GPS in version 1 (the server uses the woreda centre). If GPS is
   added later, ask with a clear reason, and only for the farm point.
8. Tokens are kept only in secure storage; nothing personal goes in logs; sign-out clears everything (section 9).
9. Camera, microphone and storage permissions are asked for at the moment of use, with the reason shown.

## 12. Errors, limits and timeouts

- Errors come back as `{"detail": "<message>"}`, already in plain language, so show `detail`. A `422` has
  `detail` as a list of field errors.
- `401`: refresh, then sign out. `403`: "You don't have access to this" (an admin may have changed the role).
  `404`: the item is gone. `409`: already done (for example, already decided). `413`: file too large. `503`: a
  service (AI, disease model, voice) is down. Show "try again later" and, for questions and photos, offer the
  outbox.
- Limits: photo 10 MB, voice 2 MB (about 1 min), question text 2000 characters.
- Timeouts: 60 s for ask, diagnose, stt and tts; 20 s for everything else.

## 13. Suggested packages

| Need | Package |
|---|---|
| HTTP | `dio` (interceptor for the bearer token and refresh) |
| Secure token storage | `flutter_secure_storage` |
| Local database (cache and outbox) | `drift` (or `sqflite`) |
| Connectivity and background retry | `connectivity_plus`, `workmanager` |
| Camera, gallery and compression | `image_picker`, `flutter_image_compress` |
| QR scanning | `mobile_scanner` |
| Voice recording and playback | `record`, `just_audio` |
| Languages | `flutter_localizations`, `intl` (ARB) |
| Navigation and state | `go_router`; `riverpod` or `bloc` (your choice) |

## 14. Not in the API yet (backend work needed, ask before starting)

| Item | Status |
|---|---|
| Push notifications (FCM) | No device-token endpoint yet. Alerts are pulled (section 8.5). Adding FCM needs a `POST /users/devices` endpoint and a decision on what a notification may contain (no personal data) |
| App version check / forced update | Not built |
| On-device disease model | `POST /advisory/diagnosis-plan {disease, confidence, farm_id}` already accepts a result from an on-device model and returns the plan. No mobile model is packaged yet |
| SMS | Not built (product decision) |
| Offline DA registration | Not supported in version 1 |

## 15. Definition of done (version 1)

- [ ] Farmer and DA flows in sections 6–8 work against the demo server with the demo accounts.
- [ ] Offline: cached screens open with no network; a queued question and a queued photo are sent after reconnecting;
      sign-out clears everything.
- [ ] All four languages switch at runtime; Ethiopic text renders correctly on a low-end phone.
- [ ] Photos are resized and EXIF-free before upload; `capture_source` is sent.
- [ ] No personal data in logs or third-party SDKs; tokens only in secure storage.
- [ ] Sources, safety text, placeholder and demo labels are visible wherever the API sends them.
- [ ] Release build uses HTTPS only; debug cleartext is limited to the demo PC.
- [ ] Tested on at least one 2 GB RAM Android phone on a throttled (3G) connection.

## 16. Questions to settle with the product owner

1. Production server address and domain (for HTTPS and the release build).
2. Push notifications: wanted for version 1? If so, which alerts, and what the notification text may show.
3. Crash reporting: allowed, and with which tool (it must not receive personal data)?
4. Play Store listing: app name, owner account, privacy-policy URL (the consent texts are still drafts awaiting legal
   review).
5. iOS: in scope for version 1 or later?

---

## Changes to this guide

| Date | Change |
|---|---|
| 2026-10-11 | First version |
| 2026-10-11 | Admins can publish tips (web); demo accounts updated (Oromia farmer, admin); debug-only demo-login picker (4); 9 new and 1 changed texts in the ARB files. API contract for the app unchanged |
| 2026-10-12 | `/advisory/ask`: don't send the screen language; the answer follows the question's language (10). Server fixed too |
| 2026-10-13 | New: livestock prices and outlook (6, 8.10); `lv.*` texts in the ARB files. Nothing existing changed |
| 2026-10-13 | Treatment chain (8.3, 8.7): rates from the MoA manual with the amount for the plot, nearest shops with price, verified-seller badge and phone, pack check against the plan (`diagnosis_id`). New fields only; nothing removed |
| 2026-10-13 | New: map (6, 8.11): `/map/layers`, `/map/crops`, boundary files; `map.*` texts. Nothing existing changed |
| 2026-10-13 | ABC membership (6): read and confirm the founding agreement (`/abc/my/*`); `abcInv.*` texts. Nothing existing changed |
