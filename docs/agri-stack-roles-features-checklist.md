# Agri-Stack 360: Roles, Features & Remaining Work (Checklist Spec)

> **How to use:** save as `docs/roles-features-checklist.md` in the repo and tell Claude Code:
> *"Read docs/roles-features-checklist.md. Do Step 1 (audit) only and give me the report. Do not write feature code until I approve the plan."*

---

## 0. Instructions to Claude Code

You are working on **Agri-Stack 360**, an AI agricultural intelligence platform for Ethiopia (wheat disease detection, AI advisory in Amharic / Afaan Oromoo / Tigrinya / English, market intelligence, Input Trust anti-counterfeit verification), designed to run on ATI's OpenAgriNet.

The platform already has: 4 roles (farmer, extension agent, trader, administrator) with 15 permissions, dashboard, Market Intel, Crop Health, Input Suppliers, Financial screens, knowledge base (4 MoA wheat documents, 283 passages), cited AI assistant, photo diagnosis (leaf rust, yellow rust, powdery mildew, septoria, healthy), 10 km rust alerts, 7-day follow-up, wheat crop calendar, official region/zone/woreda codes, 4 interface languages, read-aloud, AI key pool, offline demo kit, 145 backend tests.

### Step 1: Audit (do this first, no feature code)
1. Explore the repository and map existing roles, permissions, screens, APIs, models and tests.
2. For **every checklist item** below, mark it **Done / Partial / Missing** with evidence (file paths, endpoints, test names).
3. Produce `docs/checklist-audit.md` with a table per role and a summary of gaps.
4. Flag anything that is **demo data or a stub** (must be visibly labelled in the UI).
5. Stop and wait for approval.

### Step 2: Plan
Propose an implementation plan grouped by the priority tiers in Section 3. Reuse existing patterns (permission checks, i18n files, labelled demo data, cited answers). Do not introduce a new stack.

### Step 3: Build (after approval, one tier at a time)
- Every new role = new permissions checked **on the server** for every request; UI hides what the user can't open.
- Every new screen and message in all 4 languages via the existing translation files (mark new strings as "draft – needs native review").
- Every new feature has backend tests; keep all existing tests passing.
- Never invent real product names, doses, registration numbers, prices, or partner data. Use labelled placeholders (`PLACEHOLDER_VERIFY`).
- Personal data (names, phones, national ID) must never be sent to external AI APIs; send only anonymised farm context.
- Ask me before any decision that is mine (pricing, providers, legal text).

---

## 1. Roles and their features (checklist)

Legend: `[x]` reported done · `[ ]` to verify or build. **Claude Code must verify every `[x]` in the audit**; reported done does not mean verified.

### 1.1 Farmer (free user)
- [x] Sign up / profile with official region, zone, woreda
- [x] Interface in English, Amharic, Afaan Oromoo, Tigrinya; language follows profile
- [x] Ask the AI assistant (text), answers cited to MoA pages, "I don't know" escalates to DA
- [x] Read-aloud of answers, alerts, diagnoses
- [x] Photo diagnosis + treatment plan + safety steps
- [x] 7-day follow-up ("better / same / worse"); "worse" goes to DA
- [x] Rust alert when ≥3 reports within 10 km in 14 days
- [x] Dashboard: prices, selling advice, farm status
- [ ] Voice question input (speech-to-text), not only read-aloud
- [ ] Crop calendar view: my stage and next tasks, with reminders
- [ ] Weather-smart advice ("rain expected, don't spray today")
- [ ] Nearby approved suppliers for a recommended active ingredient, sorted by distance (neutral, no paid ranking)
- [ ] **Input Trust:** scan QR / enter scratch PIN → Genuine / Warning / Already used
- [ ] Report a suspected fake product (with location)
- [ ] My plots and crop seasons (add plot, crop, variety, planting date)
- [ ] Consent screen + opt-out (data protection) and "my data" view
- [ ] Offline mode: cached calendar, tasks, treatment plans; queue questions/photos
- [ ] Telegram bot access (same core service)
- [ ] SMS alerts and keyword commands (HELP, STOP, language)

### 1.2 Development Agent (DA)
- [x] Receives escalations ("I don't know", diagnosis "worse")
- [ ] **DA Copilot dashboard:** list of my farmers with crop, stage, latest status
- [ ] Visit priority list (open diagnoses, low-confidence cases, outbreaks, overdue follow-ups), deterministic and tested
- [ ] Escalation inbox: answer, forward to agronomist, close
- [ ] Register / onboard a farmer on their behalf (with consent capture)
- [ ] Ask the assistant / run a diagnosis on behalf of a farmer
- [ ] Verify or correct a diagnosis (stored for model retraining)
- [ ] Outbreak hotspot map for my kebeles
- [ ] Weekly woreda report (farmers reached, diagnoses by disease, alerts, outcomes), export PDF/CSV

### 1.3 Agronomist / Content Reviewer
- [x] Knowledge base: upload, archive, restore, re-index, test retrieval
- [ ] Review queue for escalated questions DAs couldn't answer
- [ ] Promote a reviewed answer into the knowledge base
- [ ] Manage treatment protocols, crop calendar rules, dosage tables (CSV import + edit), all with source citation
- [ ] Review diagnosis corrections and label images for retraining
- [ ] Approve translations (mark strings as native-reviewed)

### 1.4 Platform Administrator
- [x] User management: list, edit, roles, regions, activate/deactivate, reset password; last admin protected
- [x] Roles & permissions pages
- [x] AI API key pool (encrypted, auto-switch)
- [ ] Configurable thresholds (diagnosis confidence, outbreak radius/count/days, alert caps)
- [ ] Monitoring dashboard: question volume by language/topic, escalation rate, guardrail blocks, feedback, diagnosis outcomes
- [ ] Audit log of admin actions and data access
- [ ] Organisation management (suppliers, ABCs, commercial farms, NGOs as organisations with their own users)

### 1.5 Trader / Buyer (existing role)
- [x] Market Intel: trends, regional comparison, heatmap, farm-vs-shop gap, 2–12 week forecasts
- [ ] Supply/harvest forecast by zone (aggregated, anonymous)
- [ ] Post buy requests to ABCs / farmer groups (Phase 2)

### 1.6 Input Supplier / Importer (paying)
- [ ] Organisation account with supplier users
- [ ] Product catalogue linked to registered products (registration no. = placeholder until verified)
- [ ] **Input Trust:** generate unique codes per batch, download for printing, see verification and duplicate-scan reports
- [ ] Counterfeit hotspot map for **their** products
- [ ] Demand intelligence dashboard (aggregated disease and demand by zone, no personal data)
- [ ] Referral/sales tracking (voucher/QR at shop) for commission
- [ ] Subscription status and invoices

### 1.7 Agro-dealer (retail shop)
- [ ] Shop profile (location, products, stock flags)
- [ ] Verify product at purchase (scan), record referred sale
- [ ] Verified-seller badge

### 1.8 ABC Manager (Farmer Agribusiness Company)
- [ ] ABC organisation with member list (linked farmer profiles)
- [ ] Shareholder contribution record (land, livestock, labour); a record only, not a legal document
- [ ] Input demand aggregation from members' plots and crop calendars
- [ ] Harvest forecast for members; output aggregation planning
- [ ] Member advisory and alert broadcast
- [ ] ABC dashboard and report for ATI

### 1.9 Commercial Farm Manager (paying)
- [ ] Farm organisation with fields/blocks (hectares, crop, planting date)
- [ ] Field-level disease monitoring and alerts
- [ ] Agronomist team accounts on the farm
- [ ] Per-hectare subscription status
- [ ] Yield / harvest forecast export

### 1.10 Government (Woreda / Regional Bureau / ATI / MoA), read-only
- [ ] Aggregated dashboard: farmers reached, diagnoses by disease, outbreaks map, alert coverage
- [ ] Early-warning view by zone/woreda
- [ ] Export reports; no individual farmer identities

### 1.11 Regulator (EAA)
- [ ] Registered-product registry view (import from official list)
- [ ] National counterfeit hotspot map (failed / duplicate verifications)
- [ ] Supplier code-issuance overview

### 1.12 NGO / Development Project
- [ ] Project workspace: enrol a farmer group/area, deploy advisory, impact report (reach, outcomes)

### 1.13 Financial Institution (bank / MFI), Phase 2+
- [x] Financial screen with credit score and matching loans (**verify: real logic or demo data? must be labelled**)
- [ ] Consent-based farmer credit profile request
- [ ] Risk report API (only with farmer consent)

---

## 2. Cross-cutting requirements (checklist)
- [x] Server-side permission check on every request
- [x] Demo data visibly labelled
- [x] Safety rules: no pesticide doses, banned products refused, fixed poisoning message
- [ ] Emergency contact number in safety messages (placeholder today; I will provide a verified number)
- [ ] No personal data sent to Gemini or any external AI (verify and test)
- [ ] Consent records + opt-out + data-subject access (Personal Data Protection Proclamation 1321/2024)
- [ ] Organisation (multi-tenant) model so suppliers, ABCs, farms, NGOs only see their own data
- [ ] OpenAgriNet provider adapter (Beckn `search` / `on_search`) for advisory, sandbox-ready (Phase 2)
- [ ] Farmer Profile System integration (Phase 2; stub interface now)
- [ ] Phone access on LAN (firewall rule) + optional cloud demo deployment
- [ ] Replace Meta MMS Afaan Oromoo voice before commercial launch (non-commercial licence)
- [ ] Paid AI API billing (no rotating free-tier keys to bypass quotas)
- [ ] Manual browser click-through of every screen in all 4 languages

---

## 3. Priority tiers

### Tier 0: Before the pitch (Oct 13–15, 2026). Fixes only, no big features
1. Verify every `[x]` item works in a browser end to end (demo script, twice)
2. Confirm diagnosis classes and accuracy figures match the pitch deck
3. Label the Financial screen as demo data if not real
4. Emergency contact placeholder → verified number (from me)
5. Confirm no personal data goes to the AI API
6. **Optional:** Input Trust **concept screen** (scan → Genuine / Warning) clearly labelled "Concept – pilot coming"

### Tier 1: Pilot (next 3 months)
DA Copilot (1.2), crop calendar view + reminders, weather-smart advice, Input Trust MVP for suppliers + farmers (1.6, 1.1), organisation model, consent & opt-out, government read-only dashboard (1.10), monitoring dashboard, voice input, Telegram.

### Tier 2: Scale (3–12 months)
ABC module (1.8), commercial farm module (1.9), agro-dealer (1.7), EAA view (1.11), NGO workspace (1.12), offline mode, SMS, OpenAgriNet adapter, Farmer Profile integration, new crops (tomato, onion, mango, maize).

### Tier 3: Later
Credit profiles with consent (1.13), trader buy requests, output aggregation, Tigrinya full review.

---

## 4. Open decisions for me
- Pricing and subscription rules per organisation type
- SMS gateway / Telegram bot ownership / hosting provider
- Source of the registered-product list (EAA)
- Who signs off translations and agronomy content
