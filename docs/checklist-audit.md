# Agri-Stack 360: Checklist audit

**Audit of:** `docs/agri-stack-roles-features-checklist.md` (Step 1)
**Date:** 2026-10-09
**Method:** read the code, list every API route and the permission it checks, run the tests. Every `[x]` item was checked against code, not taken from the checklist.
**Status:** **Done** = works end to end in code and has tests where it matters. **Partial** = some parts exist, gaps are named. **Missing** = nothing yet.

Tier 0 fixes made during this audit (no input from you was needed) are marked **(fixed 2026-10-09)**. They are listed in [Section 5](#5-tier-0-fixes-made-in-this-round).

**Not checked:** the screens were not clicked through in a browser in all 4 languages. This needs a person (Tier 0 #1).

---

## 1. Results per role

### 1.1 Farmer

| Item | Status | Evidence |
|---|---|---|
| Sign up / profile with official region, zone, woreda | **Done** | `POST /api/auth/register` (`backend/routers/auth_router.py:51`) and `PUT /api/users/profile` (`backend/routers/users.py:42`) accept `area_pcode`. `backend/admin_areas.py` `address_fields()`. UI: `components/form/AreaPicker.tsx` on SignUp and Profile. Test: `tests/advisory/test_admin_areas.py` |
| 4 interface languages, language follows profile | **Done** | `frontend/src/i18n/{en,am,om,ti}.ts`, `core.ts` `tr()`. Language is saved on the user and checked against en/am/om/ti (`users.py`, `auth_router.py`). Header switcher: `components/header/LanguageSwitcher.tsx`. am/om/ti are **drafts awaiting native review** |
| AI assistant (text), cited answers, "I don't know" escalates to DA | **Done** | `POST /api/advisory/ask` (`backend/routers/advisory.py:61`), `backend/advisory/assistant.py`, guardrails in `guardrails.py`. Escalation rows go to `escalations` with `assigned_to` = DA (`assistant.py`). Tests: `tests/advisory/test_assistant.py`, `test_guardrails.py`. Note: the DA has no screen to see escalations (see 1.2) |
| Read-aloud of answers, alerts, diagnoses | **Done** | `POST /api/advisory/tts` (`advisory.py:306`), `backend/advisory/tts.py`, `components/advisory/ListenButton.tsx` used in AnswerCard, AlertsPanel and PhotoDiagnosis. Test: `tests/advisory/test_tts.py` |
| Photo diagnosis + treatment plan + safety steps | **Done** | `POST /api/advisory/diagnose`, `/diagnosis-plan` (`advisory.py:177, 222`), `backend/advisory/diagnosis.py`, disease service `serving/disease_api.py`. UI `pages/CropHealth/PhotoDiagnosis.tsx`. Tests: `tests/advisory/test_diagnosis_alerts.py` (agreement, disagreement, out-of-range, plan, PPE) |
| 7-day follow-up; "worse" goes to DA | **Done** | `POST /api/advisory/diagnoses/{id}/outcome` (`advisory.py:247`), follow-up scheduled in `diagnosis.py`, due follow-ups in `alerts.py`. Tests: `test_record_schedules_follow_up`, `test_follow_ups_become_due`. Gap: follow-up alerts do not check `consent_alerts` (Section 4) |
| Rust alert when ≥3 reports within 10 km in 14 days | **Done** | `backend/advisory/alerts.py` `run_alert_cycle`. Tests: `test_outbreak_alerts_only_inside_radius_with_crop`, `test_below_threshold_no_alert`, `test_weekly_cap_suppresses`, **new** `test_old_scans_outside_window_do_not_alert` (fixed 2026-10-09) |
| Dashboard: prices, selling advice, farm status | **Done** | `pages/Dashboard/Home.tsx`: forecast and selling advice (`:78`, `:190`), farms (`:93`), alerts panel (`:131`) |
| Voice question input (speech-to-text), not only read-aloud | **Done (M7), quality flagged** | Microphone button in the advisor and the floating chat (`components/chat/MicButton.tsx`); the text fills the box for the farmer to check before sending. `POST /api/advisory/stt` (`backend/advisory/stt.py`), Gemini via the key pool, audio never stored, privacy note shown while recording. **Afaan Oromoo also uses Gemini** (your choice, 2026-10-10; the local MMS engine is in the code but switched off). Round trip test: English exact, Amharic missed a word, Afaan Oromoo was wrong (synthetic test voice), so only English is marked verified and Afaan Oromoo needs a native-speaker test. Needs https (or localhost) for the microphone. Tests `tests/advisory/test_stt.py` |
| Crop calendar view: my stage, next tasks, reminders | **Done (M3)** | Dashboard card `components/advisory/CropCalendarCard.tsx`: stage timeline with Gregorian + Ethiopian dates, this stage's tasks with manual/page, next stage, "estimated timing" badge. `GET /api/advisory/calendar` (`backend/advisory/calendar.py`). Stage-start reminders in the alert cycle (once per season and stage, alert consent, weekly cap). Tests `tests/test_seasons.py`, `tests/advisory/test_calendar_alerts.py`. **Task text is English** (as written in the manuals); stage names are translated |
| Weather-smart advice ("rain expected, don't spray") | **Done (M3)** | Treatment plan rain check (as before) **plus** a proactive daily alert: a farmer with a disease found in the last 14 days (not yet better) is warned when rain is expected at the farm in the next 24 h (`alerts.py` `_spray_rain_warnings`, weather lookups outside the DB transaction). Test `test_spray_rain_warning_when_rain_expected` |
| Nearby approved suppliers for an active ingredient, by distance, no paid ranking | **Partial** | Treatment plan lists offers nearest first, registered products only, sponsored shown but not promoted (`adapters/platform.py` `StubInputHub`, test `test_context_inputs_registered_only_nearest_first`). **Offers are stub data** (`data/advisory_seed/input_hub_offers.csv`). Separate Input Suppliers screen (`/api/suppliers`) is seeded demo data, labelled |
| Input Trust: scan QR / PIN → Genuine / Warning / Already used | **Done (M6), batch QR** | Page **Check a product** (`pages/Trust/VerifyProduct.tsx`): type the code or scan the QR (browser QR reader where available; a phone's own camera opens the page from the label). `POST /api/trust/verify` (`backend/input_trust.py`). **Per your choice of one code per batch, "Already used" is replaced by a *possible copy* warning** (more checks than packs, or checks in more than 3 woredas in 30 days). Other warnings: unknown code, recalled, expired, not registered, supplier suspended. Read-aloud of the result. Tests `tests/test_input_trust.py` |
| Report a suspected fake product (with location) | **Done (M6)** | Form on the same page; `POST /api/trust/fake-reports`; location = the farmer's woreda from the profile (no GPS); the supplier sees it without the farmer's name. Test `test_fake_report_reaches_the_supplier_report` |
| My plots and crop seasons | **Done (M3)** | Plots as before; seasons `GET/POST/PUT/DELETE /api/users/farms/{id}/seasons` (crop, variety, planting date, meher/belg/irrigated, expected harvest, status; one growing crop per field; the farm's summary fields follow the active season). "Seasons" dialog on each farm in My Profile (`components/profile/SeasonsModal.tsx`). Tests `tests/test_seasons.py` |
| Consent screen + opt-out + "my data" view | **Done (M1, 2026-10-09)** | Two consents, both off by default: data sharing with agents, alerts. Sign-up checkboxes (`pages/AuthPages/SignUp.tsx`), Profile card with switches, history and "Download my data" (`components/profile/ConsentCard.tsx`). API `GET/PUT /api/users/consent`, `GET /api/users/my-data` (`backend/routers/users.py`, `backend/consent.py`); append-only `consent_events`. **Wording is a `PLACEHOLDER_VERIFY` draft awaiting legal review.** Tests `tests/test_consent.py` |
| Offline mode (cached calendar, plans; queued questions/photos) | **Done (M17)** | Hand-written service worker `frontend/public/sw.js` (no build plugin): the app opens without a connection, and the user's own data (crop calendar, alerts, farms and seasons, profile, consent, past advisor conversations, credit score, area lists) shows from the last saved copy (network first; after 8 s on a slow line). Questions and photo checks made offline wait in an IndexedDB outbox (`src/offline/outbox.ts`) and are sent when the connection is back (banner `components/common/OfflineBanner.tsx`, retry every 15 s); the last 10 photo-check results with their treatment plans are kept on the phone (Crop health → "Recent photo checks on this phone"). **Sign-out deletes** the saved copies, results and unsent items (shared phones). Tested in a real browser (Chromium, production build): offline reload, queued question answered after reconnect, queued photo checked after reconnect and readable offline, sign-out clears. **Limits:** browsers allow this only on https or localhost, so a phone opening `http://<pc-address>:5173` stays online-only; the Vite dev server can't be fully cached (use the built app for offline); the sign-in itself needs a connection (the session lasts while the tab is open) |
| Telegram bot | **Done, waiting for your bot token** | `backend/telegram_bot.py` (long polling, no extra library; started by `start_demo.ps1` when `TELEGRAM_BOT_TOKEN` is in `.env`). Link by sharing **one's own** registered phone number (farmers only); text and voice-note questions to the same cited advisor (`channel='telegram'`, conversation kept per chat); product-code checks (also without linking); alerts pushed to linked farmers (created after linking, each once); /language, /help, /stop. Private chats only; photo checks stay in the app. Tests `tests/test_telegram_bot.py` (9, fake Telegram API) |
| SMS alerts and keyword commands | **Missing** | `channel` accepts `"sms"`; no gateway |

### 1.2 Development Agent (DA)

| Item | Status | Evidence |
|---|---|---|
| Receives escalations ("I don't know", diagnosis "worse") | **Done (M2)** | Escalation inbox `GET /api/da/escalations` (`backend/routers/da.py`), screen `pages/DA/Escalations.tsx`. Tests `tests/test_da.py` |
| DA Copilot dashboard | **Done (M2)** | `GET /api/da/farmers`: my farmers (assigned or same region, **with data consent**) with crop, stage, last photo check, open items. Screen `pages/DA/Copilot.tsx` |
| Visit priority list | **Done (M2)** | Pure, deterministic `backend/advisory/priorities.py` (fixed weights: worse 100, unsure photo check 60, overdue follow-up 40, outbreak nearby 30, open question 20; ties: longest waiting, then id). `GET /api/da/priorities`. Tests `tests/advisory/test_priorities.py`, `test_visit_list_order_and_reasons` |
| Escalation inbox (answer, forward, close) | **Done (M2)** | `POST /api/da/escalations/{id}/answer` (reaches the farmer as an in-app alert they can listen to), `/forward` (to an admin until an agronomist role exists), `/close`. Only the assigned DA or an admin |
| Register / onboard a farmer on their behalf (with consent capture) | **Done (M2)** | `POST /api/da/farmers`: own region only; consent recorded as `da_verbal` with the DA's id. "Register a farmer" form on the Copilot page |
| Ask the assistant / run a diagnosis on behalf of a farmer | **Done (M2)** | "Asking for" picker on AI Advisory (`pages/Advisory/Advisory.tsx`). Photo check on a farmer's field is now recorded for that farmer (was recorded for the DA; fixed in `advisory.py` `_subject_farmer`). Test `test_diagnosis_on_a_farmers_field_is_recorded_for_that_farmer` |
| Verify or correct a diagnosis | **Done (M2)** | `POST /api/da/diagnoses/{id}/verify` (known disease keys only); control on each photo-check escalation. Outbreak counting uses the corrected disease. Test `test_verify_diagnosis` |
| Outbreak hotspot map for my kebeles | **Partial (M5)** | Hotspot map on **Area reports** (`pages/Reports/AreaReports.tsx`, `GET /api/reports/outbreaks`) for the DA's region, at **woreda** level: the official boundaries stop at woreda, so kebele-level needs kebele boundaries (data you would need to source) |
| Weekly woreda report, PDF/CSV export | **Done (M5)** | **Area reports** page, default period 7 days: farmers reached, photo checks by disease, follow-up outcomes, outbreak alerts, cases sent to a DA, per woreda; **Export CSV** and **Print or save as PDF** (browser print, page chrome hidden). Tests `tests/test_reports.py` |

### 1.3 Agronomist / Content Reviewer

Role `agronomist` (M9): `knowledge:manage` + new `content:review`; page **Content review** (`pages/Review/ReviewWorkspace.tsx`, `backend/routers/review.py`). Demo login 0944000006 / demo1234.

| Item | Status | Evidence |
|---|---|---|
| Knowledge base: upload, archive, restore, re-index, test retrieval | **Done** | `backend/routers/knowledge_admin.py` (upload `:61`, archive/restore via PATCH `:122`, reindex `:154`, search `:176`). UI `pages/Admin/KnowledgeBase.tsx`. Tests `tests/advisory/test_knowledge.py`. 4 MoA wheat documents, 283 passages |
| Review queue for escalated questions | **Done (M9)** | DA *Forward* now goes to an agronomist (admin only if none); queue `GET /api/review/escalations`; the answer reaches the farmer as an alert ("An agronomist … answered"). Test `test_forwarded_case_reaches_the_agronomist_and_the_answer_reaches_the_farmer` |
| Promote a reviewed answer into the KB | **Done (M9)** | Tick "also add to the knowledge base" and write the question in general wording (no names/places); stored as "Agronomist-reviewed answer #N" and cited as such. Test `test_reviewed_answer_can_join_the_knowledge_base` |
| Manage protocols, calendar rules, dosage tables (CSV import + edit) | **Done (M9), CSV round trip** | Download CSV, edit in a spreadsheet, upload: validated by the existing seed loader (rows without a source stay PLACEHOLDER_VERIFY). No in-browser cell editing (the spreadsheet is the editor). Test `test_content_tables_round_trip_and_validation` |
| Review diagnosis corrections, label images | **Done (M9)** | Photo checks where the DA disagreed with the model, with the photo; confirm the label; export `training_labels.csv` (image file + label + model prediction). Test `test_corrections_and_training_labels` |
| Approve translations | **Done (M9)** | Screens and advisor messages side by side with English; approve or suggest a better text (`translation_reviews`); export CSV for merging into the files. Test `test_translation_reviews` |

### 1.4 Platform Administrator

| Item | Status | Evidence |
|---|---|---|
| User management incl. last admin protected | **Done** | `backend/routers/admin.py:156–236` (list, edit, password, role, active, region). Last-admin and self guards `admin.py:52, 134–145, 230`. UI `pages/Admin/Users.tsx`. **No automated test** of the last-admin guard |
| Roles & permissions pages | **Done** | `GET /api/admin/roles`, `/permissions`. UI `pages/Admin/Roles.tsx`, `Permissions.tsx` |
| AI API key pool (encrypted, auto-switch) | **Done** | `backend/ai_keys.py`, `routers/ai_keys_admin.py`, UI `pages/Admin/AiKeys.tsx`. Test `tests/advisory/test_gemini_retry.py` |
| Configurable thresholds | **Done (M4)** | Admin page **Advisory settings** (`pages/Admin/AdvisorySettings.tsx`); `GET/PUT /api/admin/advisory-settings` with allowed ranges (`SETTING_LIMITS` in `backend/advisory/schema.py`); read live by the engine, no restart. Tests `tests/test_advisory_admin.py` |
| Monitoring dashboard | **Done (M4)** | Admin page **Monitoring** (`pages/Admin/Monitoring.tsx`), `GET /api/admin/monitoring?days=`: questions by language/confidence, escalation rate, safety checks triggered, feedback, photo checks by disease, follow-up outcomes, DA agreement rate, median time to answer, alerts, consent share, per-day chart. Totals only; test checks no names/phones leak. *Topic* breakdown not available: questions are not tagged by topic yet |
| Audit log | **Done (M4)** | `backend/audit.py`: middleware logs every change request under `/api/admin`, `/api/advisory/admin`, `/api/da` (actor, route, record, result; never request bodies), plus each opening of another person's farmer data (`backend/access.py`, once per 10 min per actor and farmer). New permission `audit:read` (admin). Page **Audit log** (`pages/Admin/AuditLog.tsx`). Tests in `tests/test_advisory_admin.py` |
| Organisation management | **Partial (M6)** | **Organisations** page (`pages/Admin/Organisations.tsx`, `/api/admin/orgs`): create, suspend, add/remove users. **Supplier** type only so far (your choice); ABCs, commercial farms, NGOs and agro-dealers reuse the same model later |

### 1.5 Trader / Buyer

| Item | Status | Evidence |
|---|---|---|
| Market Intel: trends, regional, heatmap, gap, 2–12 week forecasts | **Done** | `pages/Market/MarketIntel.tsx`, `HeatmapView.tsx`; `/api/prices`, `/summary`, `/regional`, `/spread` (`backend/routers/prices.py`); forecast service `serving/predict_api.py` (:8001) |
| Supply/harvest forecast by zone (aggregated, anonymous) | **Done (M11)** | **Harvest outlook by zone** card on Market Intel (`components/market/SupplyOutlookCard.tsx`, `GET /api/reports/supply-outlook`, `backend/insights.py`): farms, area (hidden under 5 farms) and expected harvest month by zone and crop, CSV export. From recorded crop seasons; month from the farmer's expected harvest date, else (wheat) the MoA calendar maturity stage, marked estimated. **No yields estimated.** Test `tests/test_insights.py` |
| Post buy requests | **Done (M12)** | **Buy requests to ABCs** card on Market Intel (permission `trade:request`): crop, quantity, region, date; ABCs in the region answer with their contact; the trader's own name and phone are not shown to ABCs |

### 1.10 Government (Woreda / Regional Bureau / ATI / MoA), read-only (M5)

| Item | Status | Evidence |
|---|---|---|
| Aggregated dashboard: farmers reached, diagnoses by disease, outbreaks map, alert coverage | **Done (M5)** | New role `government` (permissions: market prices, own profile, `reports:read`; no advisor, no farm data). **Area reports** page: totals and per-woreda table, photo checks by disease, outbreak alerts, follow-up outcomes, dot map. Scope = the area on the account (woreda / zone / region; none = national), checked on the server (`backend/reports.py` `resolve_area`) |
| Early-warning view by zone/woreda | **Done (M5)** | Outbreak early warning: disease scans per woreda and disease in the outbreak window, placed at the woreda centre, banded (≥10, 5–9, <5); demo data only when switched on and labelled |
| Export reports; no individual farmer identities | **Done (M5)** | CSV export and print/PDF; only counts per woreda, any count 1–4 shown as "<5". Test `test_summary_counts_and_suppression` checks no names or phones |

### 1.6 Input Supplier / Importer (M6)

| Item | Status | Evidence |
|---|---|---|
| Organisation account with supplier users | **Done** | `organisations`, `organisation_members`; role `supplier` (permission `supplier:manage`); every supplier route is limited to the user's own organisation (`_org` in `backend/routers/input_trust.py`). Test `test_suppliers_only_see_their_own_batches` |
| Product catalogue linked to registered products | **Done (placeholder registry)** | Catalogue from `approved_products` (registered only; banned refused); registration numbers are `PLACEHOLDER_REG_*` until the EAA list is imported. Test `test_catalogue_only_registered_products` |
| Input Trust: codes, printing, verification and duplicate-scan reports | **Done (batch level)** | One code per batch, printable SVG label with QR + typed code (`/api/supplier/batches/{id}/label.svg`, `segno`), recall, report by result / woreda / batch, possible-copy warnings |
| Counterfeit hotspot map for their products | **Done (M11)** | Map on the supplier's **Demand by zone** card: code warnings for their products by woreda (shared `components/charts/DotMap.tsx`) |
| Demand intelligence dashboard | **Done (M11)** | **Demand by zone** (`pages/Supplier/DemandCard.tsx`, `GET /api/supplier/demand`): last 90 days of photo checks for the diseases their products target and farms/area growing the target crops, by zone, small numbers hidden. Test `test_supplier_demand_by_zone_is_suppressed` |
| Referral/sales tracking for commission | **Missing** | Needs your pricing/commission rules |
| Subscription status and invoices | **Missing** | Needs your pricing |

### 1.7 Agro-dealer (M10)

| Item | Status | Evidence |
|---|---|---|
| Shop profile (location, products, stock flags) | **Done** | Organisation type `agro_dealer`, role `agro_dealer` (permission `dealer:manage`); page **My shop** (`pages/Dealer/DealerPortal.tsx`, `backend/routers/dealer.py`): woreda, phone, registered products with in-stock switch. Tests `tests/test_dealer.py` |
| Verify product at purchase (scan), record referred sale | **Partial** | *Check a pack before selling*: Input Trust check logged for the shop and counted in the shop's woreda. **Referred-sale recording for commission skipped** (paid feature, your decision) |
| Verified-seller badge | **Done** | Admin switch on **Organisations**; only verified, active shops are listed to farmers (Input Suppliers page and under a Check-a-product result, "verified shops with this product in stock", nearest first, no paid ranking) |

The organisations table was rebuilt once (kept all rows) to allow all planned types: supplier, agro-dealer, ABC, commercial farm, NGO. Demo shop **0944000007 / demo1234**.

### 1.8 ABC Manager (M12)

| Item | Status | Evidence |
|---|---|---|
| ABC organisation with member list (linked farmer profiles) | **Done** | Organisation type `abc`, role `abc_manager` (`abc:manage`); page **My ABC** (`pages/Abc/AbcPortal.tsx`, `backend/routers/abc.py`). The manager invites by phone; **the farmer accepts in My Profile** before any of their data is visible. Tests `tests/test_abc.py` |
| Shareholder contribution record (land, livestock, labour) | **Done** | Contributions tab, labelled "a record kept by the ABC, not a legal document"; only for accepted members |
| Input demand aggregation | **Partial** | Members' area by crop and current stage, and stages starting in the next 3 weeks. **Quantities not calculated**: there is no verified fertilizer-rate table yet (PLACEHOLDER_VERIFY, "ask the DA") |
| Harvest forecast for members; output aggregation planning | **Done** | Harvest month and area per crop (farmer's date, else MoA calendar maturity, estimated); buyer requests tab for output sales |
| Member advisory and alert broadcast | **Done** | Message to accepted members as an alert ("<ABC> (your ABC): …"), respecting alert consent and weekly limits |
| ABC dashboard and report for ATI | **Done** | Dashboard tiles + **Report for ATI (CSV)**: counts and areas only, no member names |

Demo: ABC manager **0944000008 / demo1234**; Demo Farmer 2 is an accepted member; one DEMO buy request.

### 1.9 Commercial Farm Manager (M13)

| Item | Status | Evidence |
|---|---|---|
| Farm organisation with fields/blocks (hectares, crop, planting date) | **Done** | Organisation type `commercial_farm`, role `farm_manager` (`estate:manage`); page **My farm (commercial)** (`pages/Estate/EstatePortal.tsx`, `backend/routers/estate.py`): blocks with area, crop, variety, season, planting and harvest dates, woreda, status. Tests `tests/test_estate.py` |
| Field-level disease monitoring and alerts | **Done** | Scouting per block (disease, severity, % plants affected); alerts list = own medium/high scouting + disease reports at or above the outbreak threshold near each block; crop stage per block from the MoA calendar |
| Agronomist team accounts on the farm | **Done** | Team = organisation members (owner / staff), added by an admin; each farm sees only its own blocks (test `test_farms_are_isolated`) |
| Per-hectare subscription status | **Missing (your decision)** | Paid feature skipped |
| Yield / harvest forecast export | **Done (harvest, no yields)** | CSV export of blocks, areas, stages and expected harvest (estimated from the calendar when no date is set). No yield figures are invented |

Demo: farm manager **0944000009 / demo1234**, two DEMO wheat blocks.

### 1.11 Regulator (EAA) (M14)

| Item | Status | Evidence |
|---|---|---|
| Registered-product registry view (import from official list) | **Done** | Role `regulator` (`registry:manage`); page **Regulator (EAA)** (`pages/Regulator/RegulatorPortal.tsx`, `backend/routers/regulator.py`): list with status and verification, CSV download, **import of the official list** (validated by the seed loader; adds/updates, never deletes; verified only when the file says so). Tests `tests/test_regulator.py` |
| National counterfeit hotspot map (failed / duplicate verifications) | **Done** | Failed checks by reason (unknown code, possible copy, recalled, expired …) and fake reports per woreda, last 90 days, on the shared dot map |
| Supplier code-issuance overview | **Done** | Per supplier: products listed, batches, packs covered, checks, warnings, recalls |

Demo: regulator **0944000010 / demo1234**.

### 1.12 NGO / Development Project (M15)

| Item | Status | Evidence |
|---|---|---|
| Project workspace: enrol a farmer group/area, deploy advisory, impact report (reach, outcomes) | **Done** | Organisation type `ngo`, role `ngo_staff` (`ngo:manage`); page **NGO projects** (`pages/Ngo/NgoPortal.tsx`, `backend/routers/ngo.py`): projects with start date, **woredas** as the project area, advisory message to farmers there (alert consent + weekly cap), **impact since the start** (farmers reached, questions, photo checks, outcomes, alerts) from the area-report figures, small numbers hidden, CSV. A project with no woredas never falls back to the whole country. Tests `tests/test_ngo.py`. Farmer *groups* can be covered via ABCs (M12) |

Demo: NGO staff **0944000011 / demo1234**.

### 1.13 Financial Institution

| Item | Status | Evidence |
|---|---|---|
| Financial screen with credit score and matching loans | **Done, labelled (fixed 2026-10-09)** | **Score is real:** fixed rules on the user's own profile and farms (`backend/routers/financial.py` `_compute_credit_score`). **Loan products and lenders are demo data** seeded in `backend/db_init.py`. API now returns `demo_data: true` (`/api/financial/loan-products`), and the screen shows a warning notice (`pages/Financial/Financial.tsx`, message `demo.message.loans`). Test `tests/test_financial_demo.py` |
| Consent-based credit profile request | **Done (M16)** | Role `lender` (`credit:request`); page **Credit requests** (`pages/Lender/LenderPortal.tsx`, `backend/routers/credit.py`). The lender enters a phone number and reason; the reply is the same whether or not the number is a registered farmer, and a decline shows as "Not shared", so lenders can't probe which numbers are farmers. The farmer sees the lender's name and reason in Profile (`components/profile/CreditRequestsCard.tsx`), approves for **30 days** or declines, and can **stop sharing** at any time. Requests are deleted with the farmer's data (erasure). Tests `tests/test_credit.py` |
| Risk report API | **Done (M16)** | `GET /api/credit/requests/{id}/report` (only while approved and not expired, else 403; another lender gets 404): rule-based score with factors (same rules as the farmer's Financial screen, no AI), farms count/area/crops, active seasons, name/phone/area. Every read goes into the audit log (`credit_report.read`); `/api/credit` changes are audited. Not a lending decision (stated in the report) |

Demo: lender **0944000012 / demo1234** (a waiting request to Demo Farmer 2, 0944000003, reset on each reseed).

---

## 2. Cross-cutting requirements

| Item | Status | Evidence |
|---|---|---|
| Server-side permission check on every request | **Done, now tested (fixed 2026-10-09)** | Every route uses `require_permission` or `get_current_user` (`backend/auth.py:92, 117`), plus object checks in `backend/access.py` (`farm_for_edit`, `farmer_for_read`). Public on purpose: health, sign-in/up/refresh, geo boundaries, market prices. **New** `tests/test_rbac.py` fails if any new route has no check, checks that admin routes need a permission (not just sign-in), and tests the role matrix. UI hides menu items via `can()` / `RequirePermission` |
| Demo data visibly labelled | **Done (fixed 2026-10-09)** | Was Partial: Financial loans were not labelled. Now every demo set is labelled; see [Section 3](#3-demo-data-and-stubs-register) |
| Safety rules: no pesticide doses, banned products refused, poisoning message | **Done** | `backend/advisory/guardrails.py` (dose numbers must come from the DB or a cited passage, banned / unlisted products refused, fixed poisoning text). Tests `tests/advisory/test_guardrails.py`, `test_assistant.py` (Tilt refusal) |
| Emergency contact number | **Missing (needs you)** | `EMERGENCY_CONTACT_PLACEHOLDER = "PLACEHOLDER_VERIFY_EMERGENCY_CONTACT"` (`backend/advisory/config.py:33`), set via `ADVISORY_EMERGENCY_CONTACT` in `.env` once you give the number |
| No personal data to external AI | **Done, now tested (fixed 2026-10-09)** | Was failing: the farmer's **name** went to Gemini in the credit-score explanation, **field names** in the advisor context and the old crop-health prompt, **kebele** in the advisor context. All removed; the AI now gets woreda/zone/region, altitude, crop, stage, weather, market and nearby activity only. Phone and GPS were never sent. **New** `tests/advisory/test_privacy.py` runs the real context and `ask()` and fails if name, phone, kebele, field name or coordinates appear |
| Consent records + opt-out + data-subject access | **Done (M1 + M8)** | Consent, opt-out, history and data export (M1). **Deletion on request (M8):** farmer asks in My Profile → admin reviews on *Data deletion requests* → approval deletes farms, seasons, questions, alerts, escalations, photos, profile, Telegram and organisation links, detaches diagnoses (kept as anonymous counts) and anonymises the account (`backend/erasure.py`, tests `tests/test_erasure.py`). Consent history and audit log kept as the legal record. **Wording and retention periods are drafts for legal review.** Correction requests: people edit their own profile and farms |
| Organisation (multi-tenant) model | **Done (M6–M15)** | Organisations of type supplier, agro-dealer, ABC, commercial farm and NGO, with members; each portal's data is scoped to the member's own organisation on the server (`org_for` in `backend/routers/input_trust.py`), admins create organisations and add members (`pages/Admin/Organisations.tsx`) |
| OpenAgriNet (Beckn) adapter | **Built, not connected (M18)** | Provider endpoint `POST /api/beckn/search` → ACK, then signed `on_search` with the advisory catalogue to the app that asked (`backend/beckn.py`, `backend/routers/beckn.py`). ed25519 / BLAKE2b-512 signatures checked on the way in and added on the way out; off unless `BECKN_ENABLED=1`; keys from `.env` (`scripts/beckn_keygen.py`). No farmer data, no prices. Tested with a fake gateway (`tests/test_beckn.py`). Settings: `docs/integrations.md`. **Still needed:** network choice and registration, domain code, registry key lookup, sandbox certification; `select/init/confirm` not built (no orders) |
| Farmer Profile System integration | **Built, not connected (M18)** | `ATIFarmerProfileSource` (`backend/advisory/adapters/platform.py`) calls a configurable REST contract (`GET {url}/farmers?phone=`, bearer key, field mapping in `.env`; PLACEHOLDER_VERIFY until ATI publishes it), fills the local record with ATI's fields, keeps consent and DA local, falls back to the local record on outage (or fails in strict mode). Tested against a mock server (`tests/test_ati_profile.py`). `ADVISORY_PROFILE_PROVIDER=local` stays the default. **Needs:** ATI's real contract and credentials |
| Phone access on LAN + cloud demo | **Partial** | Server side done: API uses the page's host, CORS allows private IPs, servers bind `0.0.0.0`, `start_demo.ps1` prints the LAN address. **Windows firewall rule not created** (needs admin on your PC). No cloud deployment |
| Replace Meta MMS voice before commercial launch | **Missing (by design for now)** | MMS (CC-BY-NC) used for Afaan Oromoo and as fallback (`serving/tts_api.py`, licence noted in `/health`) |
| Paid AI API billing | **Missing (needs you)** | Rotating free-tier key pool today (`backend/ai_keys.py`). Decision on billing account is yours |
| Manual browser click-through in 4 languages | **Missing (needs a person)** | Typecheck and build pass; no browser automation here |

---

## 3. Demo data and stubs register

| What | Where | Labelled in UI? |
|---|---|---|
| Loan products and lenders | `backend/db_init.py` (seed) → `/api/financial/loan-products` | **Yes (fixed 2026-10-09)**: `demo_data: true` + warning notice |
| Input suppliers, products, prices | `backend/db_init.py` (seed) → `/api/suppliers` | Yes: `DemoDataNotice` (`demo.subject.suppliers`) |
| Text-based crop-health diagnosis library | `backend/routers/crop_health.py` (built-in list, `demo_data: True`) | Yes: `demo.subject.textDiagnosis` |
| Product names, doses, protocols | `data/advisory_seed/*.csv`, names `PLACEHOLDER_*`, `PLACEHOLDER_VERIFY` | Yes: "Placeholder — not verified" on the treatment plan |
| Input-hub offers (shops, stock, prices near the farm) | `data/advisory_seed/input_hub_offers.csv`, `StubInputHub` | Yes, via product placeholders; offers are neutral, nearest first |
| Crop-calendar day ranges | `data/advisory_seed` calendar rules (estimated from the manual's maturity table) | Shown to the AI as "estimated timing"; no calendar screen yet |
| Emergency contact | `backend/advisory/config.py:33` | Shown literally as `PLACEHOLDER_VERIFY_EMERGENCY_CONTACT` |
| Neighbour scans for the outbreak alert | `scripts/seed_advisory_demo.py --outbreak` (`source='simulated'`) | Said aloud in the demo script; not labelled on screen |
| ATI Farmer Profile source | `ATIFarmerProfileSource` (built, PLACEHOLDER contract, off by default) | Not user-facing |
| Disease model's ecological training data | Synthetic (model over-weights weather) | The app shows photo-only vs photo+conditions and escalates disagreements |
| Recorded demo answers (offline mode) | `data/cache` replay, `scripts/record_demo_answers.py` | Only in offline mode |
| Translations am / om / ti | `frontend/src/i18n/*.ts`, `data/advisory_i18n/*.json` | File headers say draft; not shown in UI |

---

## 4. Findings beyond the checklist

1. **`market:read` is defined but not enforced.** Price and meta routes are public on purpose (allow-list in `tests/test_rbac.py`). Decide: keep public, or require sign-in.
2. ~~Consent is not enforced.~~ **Fixed in M1:** agents need data consent; follow-up reminders need alert consent.
3. **Tables without an API:** none of the advisory tables any more (`advisory_settings` M4, `crop_seasons` M3, `escalations`, `farmer_profiles`, diagnosis verification M1–M2).
4. **`GET /api/advisory/farmers/{id}/context`** returns phone and coordinates to authorised users. Since M1 an agent also needs the farmer's data consent.
5. **Disease (:8003) and voice (:8004) services have no login.** They are bound to `127.0.0.1` only, so they can't be reached from the network. Keep it that way, or add a service token before any cloud deployment.
6. **Object-level checks** (`farm_for_edit`, `farmer_for_read` in `backend/access.py`) and the last-admin guard have no tests yet.
7. **Free-tier AI quota** (≈20 requests/day per Google project) is the main live-demo risk. The offline replay covers the demo questions only.

---

## 5. Tier 0 fixes made in this round

| Fix | Files | Test |
|---|---|---|
| Financial loans labelled as demo (Tier 0 #3) | `backend/routers/financial.py`, `frontend/src/pages/Financial/Financial.tsx`, `components/common/DemoDataNotice.tsx`, `types/api.ts` | `tests/test_financial_demo.py` |
| No personal data to external AI (Tier 0 #5) | `backend/advisory/assistant.py` (`context_summary`), `backend/routers/financial.py` (`score_explanation_prompt`), `backend/routers/crop_health.py` (`explanation_prompt`) | `tests/advisory/test_privacy.py` (4 tests) |
| Server-side permission check proven for every route | — | `tests/test_rbac.py` (11 tests) |
| Alert 14-day window tested | — | `test_old_scans_outside_window_do_not_alert` |
| Last English strings on the photo result translated ("out of stock", "Sources:", ETB, km, L/ha) | `frontend/src/pages/CropHealth/PhotoDiagnosis.tsx` | Typecheck |

New UI text (`demo.message.loans`, `photo.outOfStock`, `photo.sources`, `unit.km`, `unit.lPerHa`) is added in all 4 language files. am / om / ti lines are marked `// draft – needs native review`.

**Verification:** 161 backend tests pass (145 before + 16 new). Frontend typecheck, lint on changed files and production build pass. Live API: loan products return `demo_data: true`; a farmer gets 403 on `/api/admin/users`; the advisor still answers with citations and zone-specific advice after the privacy change.

---

## 5b. Tier 1 progress: M1 Consent and M2 DA Copilot (2026-10-09)

| Milestone | What | Tests |
|---|---|---|
| M1 Consent | `backend/consent.py`, `consent_events` table, `/api/users/consent`, `/api/users/my-data`, consent on sign-up, enforcement in `backend/access.py`, crop-health report list and follow-up reminders; Profile "My data and consent" card | `tests/test_consent.py` (8) |
| M2 DA Copilot | New permission `da:work` (agent, admin). `backend/routers/da.py` (farmers, priorities, escalation inbox, verify, register on behalf), `backend/advisory/priorities.py`, admin "Development Agent" field on users (`PUT /api/admin/users/{id}/da`). Screens `pages/DA/Copilot.tsx`, `pages/DA/Escalations.tsx`; "Asking for" picker; DA answers appear in the farmer's alerts | `tests/test_da.py` (10), `tests/advisory/test_priorities.py` (5), RBAC test covers `/api/da` |

**Behaviour change to know about:** agents now see only farmers who gave data consent. Existing farmers have no consent until they turn it on (or a DA records it), so agents will see fewer farms in Crop Health than before. The demo farmers are seeded with consent.

**Demo:** `scripts/seed_advisory_demo.py --da-inbox` (included in `start_demo.ps1 -Reseed`) adds a second demo farmer (0944000003) with two open DA cases, kept off the pitch farmer so the recorded answers don't change. DA login 0944000002 / demo1234.

**Verification:** 185 backend tests pass; frontend typecheck, lint and build pass; live API checked as farmer, DA and admin; offline replay of the recorded answers 17/17 after the privacy change.

New text: `consent.*`, `signup.consent*`, `da.*`, `nav.da*`, `perm.da_work*`, `users.da*` in all 4 UI languages, and the `da_answer` alert in `data/advisory_i18n/*.json`. Every am/om/ti string is a draft. Amharic and Afaan Oromoo backend files are otherwise native-reviewed, so `da_answer` is listed under `_meta.draft_keys` there.

## 5c. Tier 1 progress: M3 Plots, seasons and crop calendar (2026-10-09)

| What | Where | Tests |
|---|---|---|
| Crop seasons on farms | `backend/routers/users.py` (`/users/farms/{id}/seasons`), `components/profile/SeasonsModal.tsx` | `tests/test_seasons.py` (9) |
| Crop calendar | `backend/advisory/calendar.py` (`farmer_calendar`, `stage_timeline`, `farmer_point`), `GET /api/advisory/calendar`, `components/advisory/CropCalendarCard.tsx` on the dashboard; DA farmer list uses the same code | `test_calendar_endpoint`, `test_timeline_is_ordered_and_split_task_keeps_the_source` |
| Stage reminders and spray-rain warnings | `backend/advisory/alerts.py` (`_stage_reminders`, `_spray_rain_warnings`); the hourly scheduler and "run alerts" pass the weather provider | `tests/advisory/test_calendar_alerts.py` (4) |

Altitude for the calendar = profile altitude, else the terrain elevation stored with the cached forecast at the farm (no extra network calls), so the dashboard, the DA list and the advisor agree on the stage.

New text: `stage.*`, `season.*`, `calendar.*`, `seasons.*` (UI) and `stage_reminder`, `spray_rain_warning`, `stage_*`, `crop_wheat` (backend messages), all drafts in am/om/ti.

**Verification:** 198 backend tests pass; frontend typecheck, lint, build pass; live: demo farmer's calendar shows tillering (day 35, midland 1641 m), next stem elongation in 6 days, 4 cited tasks.

## 5d. Tier 1 progress: M4 Admin (2026-10-09)

| What | Where | Tests |
|---|---|---|
| Thresholds | `backend/routers/advisory_admin.py`, `SETTING_LIMITS`, page Advisory settings | `test_valid_settings`, `test_invalid_settings`, `test_settings_api_changes_the_engine` |
| Monitoring | `GET /api/admin/monitoring`, page Monitoring (recharts) | `test_monitoring_counts_without_personal_data` |
| Audit log | `backend/audit.py` (middleware + `record_read`), `audit_log` table, `GET /api/admin/audit-log`, permission `audit:read`, page Audit log | `test_change_requests_are_logged_with_actor_and_result`, `test_reading_another_farmers_data_is_logged_once`, `test_audit_log_api` |

Notes: the setting ranges are product limits, not agronomic facts (said on the page). Answer confidence is normalised to high/medium/low in the report. Audit entries store ids and route patterns only.

**Verification:** 213 backend tests pass; frontend typecheck, lint, build pass; live: settings change and an out-of-range value (400) both appear in the audit log, a DA gets 403 on settings and the audit log, a DA opening a farmer's calendar is logged.

## 5e. Tier 1 progress: M5 Government reports (2026-10-09)

| What | Where | Tests |
|---|---|---|
| Role `government`, permission `reports:read` (also agent, admin) | `backend/permissions.py`; role shown in Users/Roles pages | `tests/test_rbac.py` role matrix |
| Area summary + outbreak hotspots | `backend/reports.py`, `backend/routers/reports.py` (`/api/reports/scope`, `/summary`, `/outbreaks`) | `tests/test_reports.py` (4): suppression, scopes (government woreda, agent region, farmer refused), hotspots, demo data only when asked |
| Area reports page | `pages/Reports/AreaReports.tsx` (period, totals, per-woreda table, dot map, CSV, print) | typecheck/lint/build |

Demo: `seed_advisory_demo.py` adds a woreda-office login **0944000004 / demo1234** (government, Dewa Cheffa). With only the demo farmers, most counts show "<5": that is the privacy rule working.

## 5f. Tier 1 progress: M6 Organisations + Input Trust pilot (2026-10-10)

Your decisions: placeholder products now; **one QR code per batch**; supplier organisations only.

| What | Where | Tests |
|---|---|---|
| Rules, codes, labels, reports | `backend/input_trust.py` (code alphabet without 0/O/1/I, `verify`, `supplier_report`, `label_svg`) | `tests/test_input_trust.py` (10) |
| API | `backend/routers/input_trust.py`: `/api/trust/*` (inputs:verify), `/api/supplier/*` (supplier:manage), `/api/admin/orgs` (orgs:manage); supplier changes go to the audit log | RBAC test covers `/api/supplier`, `/api/trust` |
| Screens | Check a product, Supplier portal, Organisations | typecheck/lint/build |

Limits: one code per batch cannot prove a single pack is original (said on the result); copy detection is statistical. QR scanning in the page needs HTTPS or localhost; over plain LAN http the phone's camera app opens the check page from the QR instead. Product data are placeholders and say so.

Demo: `seed_advisory_demo.py --input-trust` (in `start_demo.ps1 -Reseed`): supplier **0944000005 / demo1234**, organisation "PLACEHOLDER Demo Supplier PLC", batch DEMO-2026-01 (the code is printed by the script).

Test helper fix: `client_as` now sets the signed-in user on every request (earlier clients silently switched user); all tests still pass with the stricter helper.

## 5g. Tier 1 progress: M7 Voice questions (2026-10-10)

Your decision: voice now (Gemini for am/en/ti, local MMS for om), Telegram later.

- `backend/advisory/stt.py` + `POST /api/advisory/stt` (advisory:use; 2 MB / about 1 minute; webm/ogg/mp4/wav); `MicButton` in the Composer used by the advisor page and the floating chat.
- **Afaan Oromoo uses Gemini** (your decision after the MMS download proved slow). The local MMS engine (`/transcribe` in `serving/tts_api.py`) stays in the code, switched off; `ENGINES` in `stt.py` is the switch.
- **Privacy:** the recording goes to Google Gemini (your choice) and is not stored; the farmer is told while recording; only the text is kept, like a typed question.
- **Quality:** live round trip (platform voice → speech-to-text): English exact; Amharic dropped "when"; Afaan Oromoo came back wrong ("Kamaa dhiyeessii…" for "Qamadii jallisiirratti…"). Every language except English shows "check the text carefully". **Test Afaan Oromoo with a real speaker before relying on it.**
- Microphone and in-page QR scanning need https or localhost; on a phone over plain LAN http they explain that typing is needed.

## 5h. Tier 1: Telegram bot (2026-10-10)

Built and tested with a fake Telegram API; it goes live once you create a bot with @BotFather and put `TELEGRAM_BOT_TOKEN=...` in `.env` (never in the code). Runs on this PC by long polling, so no public address is needed. Telegram is a third party: questions and answers pass through it like any Telegram message. Bot texts are in `data/advisory_i18n/*.json` (`tg_*`, `trust_*`; drafts in am/om/ti).

## 5i. Tier 2 progress: M8 Data rights + crop records (2026-10-10)

- Admin-reviewed deletion (your choice): see the cross-cutting row above. Admins can't request deletion of their own account this way or decide their own request.
- Crop records only (your choice): mango added to the season crop list (maize, onion, tomato already there); any crop other than wheat shows "no crop calendar or advice yet, it comes when the Ministry manuals are added".

## 5j. Tier 2 progress: M16 lenders, M17 offline, M18 integrations (2026-10-10)

- **M16:** see 1.13. Lenders never learn whether a phone number is registered or that a farmer said no ("Not shared" covers both). The score is the rule-based one the farmer already sees on Financial; it is labelled "not a lending decision". Demo lender **0944000012 / demo1234**.
- **M17:** see the Offline row in 1.1. **For an offline demo use the built app** (`npm run build`, then `npx vite preview --port 4173` and open http://localhost:4173); the dev server on 5173 works online as before but can't be fully saved for offline. Phones need https for offline (not plain LAN http).
- **M18:** see the Beckn and Farmer Profile rows in 2 and `docs/integrations.md`. Both are off by default and change nothing in the demo.

**Verification:** 298 backend tests pass (new: `test_credit.py`, `test_beckn.py`, `test_ati_profile.py`); frontend typecheck, lint (changed files), build pass; live API as lender and farmer (request → 403 → approve → report → withdraw → 403); real-browser offline test on the built app (offline reload shows farms; queued question answered and queued photo checked after reconnect; saved check readable offline; sign-out clears saved data). Demo reseeded afterwards.

## 5k. 2026-10-11: demo data everywhere, daily tips, photo dataset, mobile guide

Your decisions: realistic demo data from real sources (placeholders stay for products and partners); AI drafts the
daily tips and an expert approves them; a separate opt-in for keeping photos for training; Flutter for the mobile app.

- **Demo data:** `scripts/seed_full_demo.py` (also run by `start_demo.ps1 -Reseed`). 40 DEMO farmers in 12 real wheat
  woredas (Amhara, Oromia, SNNP), terrain elevation from Open-Meteo, seasons at realistic stages (irrigated lowland
  wheat planted Sep–Oct, meher highland wheat Jul–Aug), 53 simulated photo checks with DA cases, 3 code batches each
  sold in its own 3 woredas (copied labels of one batch turn up in Gonder Zuria and the real engine flags them),
  dealer checks at sale, ABC members and contributions, buyer requests, estate scouting, two NGO projects, lender
  requests, and alerts from the real alert engine. Two more DA logins: 0945000201 (Oromia), 0945000202 (SNNP).
  Farmers 0945000001–040 / demo1234. Safe to re-run; the pitch farmer and the pitch product code are unchanged.
- **Daily tips:** `backend/tips.py`, `backend/routers/tips.py`. Topics come from current crop stages by region,
  recent diseases and a rotating list. The AI writes a cited tip in 4 languages from the MoA guidelines, checked by
  the advisor's guardrails, with a crop-calendar fallback when the AI is unavailable. Drafted each morning for the
  next day (settings `daily_tips_auto`, `daily_tips_per_day`). **Only an agronomist or admin can publish**
  (Review → Daily tips). Shown on every dashboard, a Daily tips page, the mobile API and Telegram `/tip`.
  Tests `tests/test_tips.py`.
- **Photo dataset:** a third consent, `training` (profile, sign-up, DA registration; history kept). With it, every
  photo check (camera or gallery) is copied to `data/training/images`, re-encoded with all metadata (GPS, phone)
  removed, with coarse context only. Withdrawing the consent or deleting the account removes the photos.
  Review → Training dataset: counts, label, exclude with a reason, ZIP export (images by label + metadata.csv, no
  names, phones or GPS). Tests `tests/test_training_data.py`.
- **Mobile:** `docs/mobile/flutter-developer-guide.md`, plus `openapi-mobile.json` and ARB translation files from
  `scripts/export_mobile_kit.py`.

**Verification:** 311 backend tests pass; frontend typecheck, lint and build pass; live: one AI tip drafted from the
real knowledge base (cited, 4 languages); demo seed run twice (idempotent), every portal checked with its demo login.

## 5l. 2026-10-12: selectable AI engine (Gemini or DeepSeek)

- Admin → AI API Keys: **Engine for written answers** (Gemini or DeepSeek). It covers the advisor, the daily tips, the
  Telegram answers and the short AI explanations (credit score, crop health, suppliers, chat). Voice and the
  knowledge-base search always use Gemini (DeepSeek has no speech or embeddings), so a Gemini key stays needed.
- DeepSeek keys sit in the same encrypted pool (provider per key, rotation, cooldown when out of credit or rate
  limited, test button); `DEEPSEEK_API_KEY` in `.env` is the last fallback. Setting `llm_fallback` (on by default):
  if the chosen engine fails, the other answers when it has a usable key.
- Same guardrails and privacy for both: the same anonymised prompt, citation checks, no pesticide doses. DeepSeek
  processes data in China (stated on the page).
- Code: `backend/advisory/adapters/deepseek.py`, `backend/advisory/registry.py` (`text_llm`, `FallbackLLM`),
  `backend/ai_keys.py` (`call_pool`), `backend/routers/ai_keys_admin.py`. Tests `tests/advisory/test_deepseek.py`;
  317 backend tests pass.

## 6. Summary of gaps

| Role / area | Done | Partial | Missing |
|---|---|---|---|
| 1.1 Farmer (19) | 17 | 1 | 1 |
| 1.2 DA (9) | 8 | 1 | 0 |
| 1.3 Agronomist (6) | 6 | 0 | 0 |
| 1.4 Admin (7) | 6 | 1 | 0 |
| 1.5 Trader (3) | 3 | 0 | 0 |
| 1.10 Government (3) | 3 | 0 | 0 |
| 1.6 Input supplier (7) | 5 | 0 | 2 |
| 1.7 Agro-dealer (3) | 2 | 1 | 0 |
| 1.8 ABC (6) | 5 | 1 | 0 |
| 1.9 Commercial farm (5) | 4 | 0 | 1 |
| 1.11 Regulator (3) | 3 | 0 | 0 |
| 1.12 NGO (1) | 1 | 0 | 0 |
| 1.13 Financial institution (3) | 3 | 0 | 0 |
| 2. Cross-cutting (13) | 6 | 3 (incl. 2 built, not connected) | 4 |

### Tier 0 (before the pitch, Oct 13–15)

| # | Item | Status |
|---|---|---|
| 1 | Browser click-through of the demo script, twice | **Needs a person** |
| 2 | Diagnosis classes and accuracy match the pitch deck | **Needs you**: send the deck figures; the model has 5 classes (leaf rust, yellow rust, powdery mildew, septoria, healthy) |
| 3 | Label Financial as demo | **Done** |
| 4 | Verified emergency number | **Needs you** |
| 5 | No personal data to the AI | **Done**, with tests |
| 6 | Input Trust concept screen (optional) | **Needs your go-ahead** |
| — | Windows firewall rule for phone access | **Needs you** (admin PowerShell, one command) |

### Tier 1 (pilot), in a sensible build order
1. ~~**Consent and opt-out**~~ **Done (M1).**
2. ~~**DA Copilot**~~ **Done (M2)**, except the outbreak hotspot map and weekly woreda report (moved to M5 with the government dashboard).
3. ~~**Plots and crop seasons API + crop calendar view with reminders**~~ **Done (M3)**, with the rain warning from item 7.
4. ~~**Thresholds screen** (`advisory_settings`) and **monitoring dashboard**~~ **Done (M4)**, plus the audit log.
5. ~~**Organisation model**, then **Input Trust MVP**~~ **Done (M6)** for suppliers, with batch QR codes.
6. ~~**Government read-only dashboard**~~ **Done (M5)**, with the DA weekly report and the woreda-level outbreak map.
7. ~~**Weather-smart alerts**~~ **Done (M3)**; ~~**voice input**~~ **Done (M7)**; ~~**Telegram**~~ **Done**, needs your bot token to go live.

### Open decisions that are yours
Pricing per organisation type; SMS / Telegram / hosting providers; source of the EAA registered-product list; who signs off translations and agronomy content; paid AI billing; emergency number; whether market prices stay public.
