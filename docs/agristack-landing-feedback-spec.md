# Build Spec: Agri-Stack 360 Landing Page + Feedback Page

> **How to use:** save as `docs/landing-feedback-spec.md` in the repo and tell Claude Code:
> *"Read docs/landing-feedback-spec.md. Inspect the repo, propose a short plan, then build it. It must be live on agristack.debbal.com before October 29, 2026."*

---

## 0. Context and deadline

Agri-Stack 360 ranked **2nd of 20 finalists (from 372 applicants)** in the Ethiopian Agricultural Transformation Institute's (ATI) AgTech Innovation Challenge 2026. We are exhibiting at the **Ethiopia Agrifood Systems Transformation Exhibition** (side event of the FAO-ATI Africa Forum) on **Thursday, October 29, 2026**, at the Ethiopian Science Museum.

Visitors (government officials, FAO and international partners, investors, researchers, farmers' organisations) will scan two **already-printed QR codes**:
- `https://agristack.debbal.com/` → **landing page**
- `https://agristack.debbal.com/feedback` → **feedback page**

**These URLs must not change.** Both pages must work perfectly on a **phone over mobile data**.

### Instructions to Claude Code
1. Inspect the repo first. Reuse the existing stack, styling, i18n setup and backend if present (the platform already has a web app and a backend). Do not introduce a new framework unless there is no web app to extend; if so, propose the simplest option and ask.
2. The landing page and feedback page are **public** (no login). The existing app (dashboard, login) must keep working; add a clear "Log in" link to it.
3. Do not invent facts. Use only the content in Section 2. Never write "patented" or "built on OpenAgriNet" (use "designed for OpenAgriNet").
4. Ship the **MVP (Section 6)** first, deploy it, verify it, then improve.

---

## 1. Design requirements

- **Mobile-first:** most visitors arrive by QR on a phone. Test at 360px width. Large tap targets (≥44px), readable font (≥16px body).
- **Fast:** under 2 seconds on 4G. Compress images (WebP, under 200 KB each), lazy-load below the fold, no heavy animation libraries, and no layout shift.
- **Brand:** green primary (`#0B5D2E` or the existing brand green), white background, one accent (gold/orange). Use the existing logo.
- **Language:** English first (exhibition requirement). Add Amharic and Afaan Oromoo toggles **only if the existing i18n makes this cheap**; otherwise later.
- **Accessibility:** semantic HTML, alt text on all images, sufficient contrast, form labels, keyboard navigable.
- **SEO and sharing:** title, meta description, Open Graph image (for LinkedIn/Telegram sharing), favicon.
- **Analytics (privacy-friendly):** count page views and QR source (`?src=expo` query parameter supported). No third-party trackers that collect personal data.

---

## 2. Landing page content (`/`)

### 2.1 Header
Logo · nav links (How it works, Results, Partners, Contact) · **"Give Feedback"** button → `/feedback` · "Log in" link → existing app.

### 2.2 Hero
- **Headline:** *AI agricultural intelligence for Ethiopian farmers*
- **Subheadline:** *Know what's wrong with your crop, what to do, where to buy a genuine input, and when to sell. In Amharic, Afaan Oromoo, Tigrinya and English.*
- **Badge:** *🏆 2nd of 20 finalists, ATI AgTech Innovation Challenge 2026*
- **Buttons:** "See how it works" (scrolls) · "Partner with us" (scrolls to contact) · "Give feedback" (→ `/feedback`)
- **Visual:** phone mockup or a real field photo of DAs using the app (images provided in `/public/images/`; use placeholders if missing and list what's needed)

### 2.3 The problem (3 stat cards)
- **30–40%** of crops lost to pests and diseases in the field *(research estimate)*
- **11.8M tonnes** lost after harvest each year, enough to feed **46 million people** *(Ministry of Agriculture)*
- **1 DA for every ~250–300 farming households**
- Small source note under the cards: "Sources: Ministry of Agriculture Postharvest Management Strategy; SOAS Working Paper 234."

### 2.4 How it works (4 steps with icons)
1. **Capture:** photograph a sick leaf, or ask by text or voice
2. **Analyze:** AI trained on Ethiopian field data diagnoses the disease
3. **Recommend:** treatment from national guidelines, a genuine input nearby, the best time to sell
4. **Verify:** scan the product to confirm it's genuine; follow-up after 7 days

### 2.5 Features (6 cards)
- **AI disease detection:** wheat leaf rust, yellow rust, powdery mildew, septoria
- **AI advisory assistant:** answers only from Ministry of Agriculture guidelines, with the source cited; read-aloud for farmers who don't read easily
- **Outbreak alerts:** warns farmers when rust is reported within 10 km
- **Market intelligence:** crop price trends and forecasts
- **Input Trust:** anti-counterfeit verification for agro-chemicals
- **DA & Agribusiness tools:** support for Development Agents and farmer-owned Agribusiness Companies *(label: "coming soon")*

### 2.6 Results (big numbers)
- **1,000+** farmers reached in field pilot
- **30+** Development Agents testing
- **97%** disease detection accuracy *(research test data)*
- **4** languages

### 2.7 Inclusion & climate resilience (short section, 3 points)
- Free for farmers; works through DAs for farmers without smartphones; voice support
- Early detection and weather-aware advice reduce crop loss and unnecessary chemical use
- Genuine inputs protect farmers, soil and water

### 2.8 Who it's for (audience cards, each with a call to action)
- **Farmers & Development Agents** — free advice
- **Input suppliers** — protect your products from counterfeits, reach farmers
- **Agribusiness Companies & commercial farms** — manage members, inputs and disease monitoring
- **Government & development partners** — early-warning dashboards and DA tools

### 2.9 Partners & recognition
Logo row (only logos we have permission to use): ATI, UNDP, Ethiopian Diaspora Trust Fund, Ministry of Labor and Skills, Innovative Finance Lab. Caption: *"We have worked with"*.

### 2.10 Field gallery
4–6 field photos (pilot in Dawa Cheffa: DAs, farmers, training). Lightweight carousel or grid.

### 2.11 Team (optional, compact)
Leadership photos and roles (reuse team data if it exists), or link to a team section later.

### 2.12 Contact / Partner with us
- Phone: +251 935 444 997 · Email: [TO FILL] · Telegram link (if available)
- Short "Partner with us" form (name, organisation, email/phone, interest, message), **or** a button to `/feedback?type=partner`
- Address: Addis Ababa, Ethiopia

### 2.13 Footer
Logo · "Powered by Debbal" · links (Feedback, Log in, Privacy) · © 2026 Agri-Stack 360

---

## 3. Feedback page (`/feedback`)

### 3.1 Purpose
Collect visitor reactions **and contact leads** at the exhibition and afterwards. It must take **under 60 seconds** to complete on a phone.

### 3.2 Form fields
| Field | Type | Required |
|---|---|---|
| Name | text | yes |
| Organisation | text | no |
| Role / visitor type | select: Farmer · Development Agent · Government · Research/University · Development partner/NGO · Input supplier · Agribusiness/ABC · Investor · Media · Student · Other | yes |
| Email | email | one of email/phone required |
| Phone | tel (accept +251 / 09 formats) | one of email/phone required |
| Overall rating | 1–5 stars (large, tappable) | yes |
| What did you like most? | multi-select chips: Disease detection · AI advisory · Local languages · Input Trust · Market prices · Other | no |
| Comments / suggestions | textarea (max 1,000 chars) | no |
| I'm interested in | multi-select: Partnership · Pilot · Investment · Using the app · Media/interview · Just exploring | no |
| May we contact you? | checkbox | yes (must be shown, may be unchecked) |
| Consent | checkbox: "I agree that Agri-Stack 360 may store this information to respond to me" + link to privacy note | **required to submit** |

- Support prefill via query string: `?type=partner` preselects "Partnership"; `?src=expo` records the source.
- Hidden fields: source (`src`), timestamp, user agent (no IP stored long-term).

### 3.3 UX
- One page, no login, progress-free (short form).
- Inline validation with friendly messages.
- Submit button shows loading; double-submit prevented.
- **Thank-you screen:** "Thank you! We'll be in touch." + buttons: "Visit our website", "Share on Telegram/LinkedIn" (optional).
- If offline or failed: keep the entered data and show "Retry".

### 3.4 Backend
- `POST /api/feedback` (or the framework's equivalent), stored in the existing database: table `feedback` with the fields above + `created_at`, `source`, `status` (new / contacted / closed), `notes`.
- **Validation server-side** (lengths, email format, phone format, consent = true).
- **Spam protection:** honeypot field + rate limit (e.g. 5 submissions per IP per 10 minutes) + optional lightweight captcha only if spam appears. Do not block legitimate use on a shared venue Wi-Fi (many people on one IP): keep the rate limit reasonable.
- Optional: notify the team on each new submission (email or Telegram bot) via an environment-configured channel.

### 3.5 Admin view (inside the existing app, admin-only)
- List of feedback with filters (visitor type, interest, rating, date, source)
- Detail view; change status; add notes
- **Export CSV**
- Summary: count, average rating, top "liked" features, interest breakdown
- Permission checked server-side (existing role system)

---

## 4. Privacy & data protection
- Short **privacy note** page (`/privacy`): what we collect, why (to respond and improve), how long we keep it, how to request deletion (email), no selling of data. Written plainly.
- Personal data is never sent to external AI APIs.
- Follow Ethiopia's Personal Data Protection Proclamation No. 1321/2024 principles: consent, minimal data, deletion on request.

---

## 5. Quality checklist (acceptance)
- [ ] Both QR URLs (`/` and `/feedback`) load over HTTPS on Android and iPhone over mobile data in under 2 s
- [ ] Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 90, SEO ≥ 90
- [ ] Layout correct at 360px, 768px, 1280px
- [ ] Feedback submission stored, visible in admin, exportable to CSV
- [ ] Consent required; validation messages clear; honeypot and rate limit tested
- [ ] `?src=expo` and `?type=partner` work
- [ ] Existing app routes and login unaffected
- [ ] No placeholder text visible except clearly marked missing images
- [ ] Tests for the feedback endpoint (valid, invalid, spam, consent missing)

---

## 6. Phasing

### MVP: must be live by Wednesday, October 28, 2026 evening
- Landing sections 2.1–2.6, 2.9, 2.12, 2.13
- Feedback page (Section 3.1–3.4) with storage and CSV export (admin view can be a simple table)
- Privacy page
- Deployed at agristack.debbal.com with HTTPS

### After the exhibition
- Sections 2.7, 2.8, 2.10, 2.11
- Admin summary dashboard and notifications
- Amharic / Afaan Oromoo translations
- Partner form and blog/news section

---

## 7. Content still needed from me
- Contact email
- Logo files (SVG/PNG) and brand colours if different
- 4–6 field photos and 1 app screenshot or mockup
- Partner logos we have permission to use
- Telegram/LinkedIn links
