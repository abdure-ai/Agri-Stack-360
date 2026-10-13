# ABC module: audit, spec review and Pilot MVP plan

Response to `docs/agri-stack-abc-module-spec.md` (Section 0: "audit what exists, propose a plan for the Pilot MVP,
no code until approved"). Status: **Pilot MVP built 2026-10-13: A1 → A10 done, tested and live** (decisions in section 4, what was built in section 5).

---

## 1. What already exists (built as M12, 2026-10-10)

| Spec item | Today | Gap for the Pilot MVP |
|---|---|---|
| ABC as an organisation | Organisation type `abc`; demo "Dewa Cheffa Irrigated Wheat ABC" with 9 members | No ABC type (crop/horticulture/…), no formation/registered status, no kebele |
| Roles inside an ABC | One role `abc_manager`; organisation members are `owner` or `staff` | GM, board/chair, accountant, store keeper, machinery coordinator, ABC agronomist, auditor, organizing committee, ATI officer |
| 2.1 Formation & registration | — | Everything: committee, readiness checklist, registration record |
| 2.2 Member registry | Invite by phone, the farmer accepts in the app (consent by acceptance); members' farms and seasons come from their own profile | Fayda ID (masked), gender / age group, bulk import, duplicate check |
| 2.2 Contributions | Land / livestock / labour as free-text records ("a record only") | Cash shares, share ledger, certificates, transfers, rule checks, valuation-pending flag |
| 2.2 Voting weights | — | Formula, snapshots per season |
| 2.3 Governance | — | Meetings, quorum, weighted votes, minutes, approvals |
| 2.4 Finance | — | Share payments, member accounts, simple ledger, receipts |
| 2.5 Planning & advisory | Area by crop and stage, stages in the next 21 days, harvest months; broadcast to members (alert consent + weekly cap); members already use advisor, photo check, outbreak alerts | Choose members for a broadcast; ABC agronomist task list (reuse DA Copilot) |
| 2.6 Input supply | Input Trust codes, agro-dealer shops with price, **MoA-cited spray rates (new 2026-10-13)** | Demand quantities, orders, purchase orders, stock with expiry, issue to members |
| 2.7 Machinery | — | Everything |
| 2.12 ATI / government view | `GET /api/abc/report.csv` (counts and areas) per ABC; government Area reports; new Map page | Cross-ABC ATI dashboard, ABCs on the map, woreda officer view without names |
| 2.13 "My ABC" (farmer) | Accept / decline / leave an invitation | Shares, payments, votes, bookings, statement |
| 2.14 Cross-cutting | Server-side permissions + RBAC test, 4 languages, audit log for `/api/abc` changes, offline outbox, Ethiopian calendar dates | Audit with before/after values for share and finance changes; ABC-scoped (multi-tenant) checks for each new ABC role |
| Trader buy requests (not in spec) | Traders post buy requests to ABCs in their region; ABCs respond | Keep; link to 2.9 sales contracts in Phase 2 |

## 2. Review of the spec

Things to fix or decide before building. None blocks the plan; each has a proposed default.

1. **Legal facts can't be verified here.** The Proclamation date (26 June 2026), the Jiru launch (26 July 2026) and
   the draft numbers are after my reference information. The spec already treats the numbers as configurable; I
   propose every rule row stores a **source reference** and starts as `PLACEHOLDER_VERIFY` until someone checks it
   against the published proclamation or directive.
2. **SMS is in the MVP (2.13 "SMS receipts"), but SMS was skipped on 2026-10-10** (no provider chosen). Proposal:
   receipts and notices go to the app and Telegram now; an SMS adapter with a fake sender is built so a provider
   can be switched on later. *Decision 1.*
3. **The voting-weight formula is not defined** ("land and production, configurable"). Proposal: weight =
   a × (member's registered land ÷ total land) + b × (member's last-season delivered or estimated production ÷
   total), with a = b = 0.5 as admin-editable rules, recalculated per season and frozen per meeting. *Decision 2.*
4. **Fayda / national ID is sensitive.** Proposal: store it encrypted with a key held only in the server's `.env`,
   show the last 4 digits, record every view in the audit log, never export it. *Decision 3.*
5. **Subscription billing (2.14) is a paid feature; paid features were skipped on 2026-10-10.** Proposal: keep it
   out of the MVP.
6. **Fiscal year is missing.** Dividends, budgets and annual reports need one. Proposal: the Ethiopian fiscal year
   (1 Hamle – 30 Sene), as an ABC setting.
7. **Ledger depth.** "Simple ledger" can mean single-entry. Proposal: single-entry income / expense / asset /
   liability lines with categories plus member sub-accounts. A full chart of accounts is for the accountant's own
   software (Excel export).
8. **Input demand (2.6) needs quantities.** Fungicide rates are now in the system from the MoA manual (cited).
   Fertilizer and seed rates are not loaded yet. Proposal: calculate only where a cited rate exists, otherwise show
   area and "ask the DA" (same rule as today).
9. **Cooperative conversion (2.1)** needs the cooperative's member list. Proposal: in the MVP this is the CSV bulk
   import; the asset mapping follows in Phase 2.
10. **Minimum 300 members.** The demo ABC has 9. For the pilot the readiness checklist will show "9 of 300". The
    demo seed can add a realistic member count for a presentation if you want it.
11. **Pitch timing.** Today is 13 Oct, inside the pitch window (13–15 Oct). Proposal: start building after the
    pitch, or behind a switch so the live demo site doesn't change during the pitch. *Decision 4.*
12. Small: the "How to use" note at the top says to save the file as `docs/abc-module-spec.md`; it is saved as
    `docs/agri-stack-abc-module-spec.md`. No change needed.

Missing from the spec that the plan adds: consent for sharing member data with ATI (aggregates only by default);
member exit refund rules as an ABC policy field; rounding rule for money (to the cent, remainder to reserves);
document storage limits.

## 3. Pilot MVP plan (spec section 6)

Built one milestone at a time with tests, in the platform's existing patterns (server-side permissions, 4
languages with drafts marked, audit log, demo data labelled). Each milestone ends with: full test suite, typecheck
and build, live smoke test with demo accounts, mobile guide and API kit updated, and a short report.

| # | Milestone | Main content | Spec |
|---|---|---|---|
| A1 | **Foundation** | ABC profile (type, status *formation / registered*, area codes, fiscal year); `abc_rules` table (draft numbers, effective dates, source, verification status) with an admin screen; per-ABC role assignments (organizing committee, GM, chair, board, accountant, store keeper, machinery coordinator, ABC agronomist, auditor); one user can hold roles in several ABCs; audit with before/after values | 0, 1, 2.14 |
| A2 | **Formation & registration** | Organizing committee (5–13 from the rules); recognition document upload; readiness checklist driven by the rules (members, paid capital, 25% paid, board, business plan file, deposit proof); registration record and certificate; status change | 2.1 |
| A3 | **Member registry** | Enrol (existing invite flow or create the farmer profile); Fayda ID encrypted and masked; gender and age group; consent record; CSV / Excel bulk import with validation and duplicate check; members' plots from their farms | 2.2 |
| A4 | **Shares** | Share value and minimum shares per ABC type (rules); pledges and payments (cash, bank, telebirr / M-Pesa reference); share ledger and certificate numbers; rule checks (minimum shares, 15% cap, 2-year deadline with reminders) explained in the member's language; transfers with board approval; land / livestock / labour contributions with "valuation pending directive" | 2.2 |
| A5 | **Voting & meetings** | Voting-weight formula (rules) and snapshots; general assembly and board meetings; agenda; notice by app and Telegram; attendance; quorum by weight; motions and weighted votes entered by the secretary; minutes draft → approved | 2.2, 2.3 |
| A6 | **Finance basics** | Share capital account; simple ledger; member accounts (input credit, service charges, deductions); receipts in 4 languages (app, Telegram, printable); Excel export | 2.4 |
| A7 | **Inputs & stock** | Demand from plots × crop × cited rates; members confirm orders; supplier comparison from the shops (neutral order, ABC shop labelled); purchase orders with board approval above the limit; receipt with Input Trust code check (unverified or copied codes block issue); stock with expiry warnings; issue to members as sale or credit; registered products only | 2.5, 2.6 |
| A8 | **Machinery** | Register; booking requests by members; calendar; job log (ha or hours, operator, fuel) charged to the member account; utilisation | 2.7 |
| A9 | **My ABC (farmer)** | Shares and certificates, voting weight, payments due, plots, orders, bookings, notices and vote confirmations, statement with read-aloud; web and mobile API | 2.13 |
| A10 | **ATI & government** | Role `ati_officer`: portfolio dashboard across ABCs (formation status, members, capital, machinery use, compliance alerts), ABCs as a layer on the Map page; woreda / regional officer view of ABC status without member names | 2.12 |

Acceptance tests from spec section 4 are written in the milestone where the feature lands (A1 rule change, A4
ownership cap, A5 weights and quorum, A7 blocked stock issue, A6 member balances, A10 no names for the woreda
officer, A1 + every milestone: audit entries). The produce-payment and dividend tests belong to Phase 2.

Not in the MVP (spec Phase 2/3 or section 5): in-kind valuation formulas, produce intake and quality, produce
payments, sales contracts, dividends, compliance dashboard, annual report, business plan builder, processing,
traceability, loans, insurance, USSD/IVR, subscriptions, payment integrations.

## 4. Decisions (2026-10-13)

1. **SMS:** receipts and notices go to the app and Telegram; an SMS adapter (fake sender) is ready for a provider later.
2. **Voting weight:** 0.5 × share of registered land + 0.5 × share of production; both factors are ABC rules
   (admin-editable), recalculated per season and frozen per meeting.
3. **National ID:** encrypted with a server key in `.env`, last 4 digits shown, every full view audited, never exported.
4. **Start:** now; each milestone is pushed (and so deployed) when done.
5. **Order:** A1 → A10 as listed.

## 5. What was built (2026-10-13)

| # | Milestone | Where | Tests |
|---|---|---|---|
| A1 | Rules table, per-ABC roles, profile, audit with before/after | ABC office → Company; Admin → ABC rules | test_abc_company.py |
| A2 | Readiness checklist, recognition, documents, agreement signatures, registration | ABC office → Formation; Profile (members sign) | test_abc_formation.py |
| A3 | Member registry, consent, encrypted ID, CSV import, inclusion counts | ABC office → Members | test_abc_members.py |
| A4 | Shares, pledges, payments, certificates, cap / minimum / upfront / deadline rules, transfers, board approvals | ABC office → Shares | test_abc_shares.py |
| A5 | Voting weights, meetings, notices, weighted quorum and votes, minutes | ABC office → Meetings & votes | test_abc_governance.py |
| A6 | Ledger, board approval above the limit, member accounts, receipts, Excel export | ABC office → Finance | test_abc_finance.py |
| A7 | Demand from cited rates, member orders, suppliers, purchase orders, checked receipt, stock, issue | ABC office → Inputs & stock | test_abc_inputs.py |
| A8 | Machinery register, bookings, job log charged to accounts, maintenance, utilisation | ABC office → Machinery | test_abc_machinery.py |
| A9 | My ABC for members (web + mobile API, read-aloud) | My ABC | test_abc_my.py |
| A10 | ATI / government portfolio with compliance alerts, CSV, map layer; role `ati_officer` | ABC portfolio; Map | test_abc_portfolio.py |

Demo (presentation site): ABC team roles, member registry, sample share capital, a scheduled general assembly, sample
books, a Tilt demand plan, a tractor and pump with two bookings; ATI officer 0944000013 / demo1234.

Still open (Phase 2 or user decisions): in-kind valuation (directive), produce intake and payments, sales contracts,
dividends, annual report and business-plan builder, SMS provider, legal review of every draft rule
(PLACEHOLDER_VERIFY), native review of the Amharic, Afaan Oromoo and Tigrinya texts.
