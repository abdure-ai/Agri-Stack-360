# Agri-Stack 360 — AI Advisory pitch demo (Dewa Cheffa)

About 8 minutes. One farmer, one irrigated wheat plot, one story: **ask → check a sick leaf → get warned about the neighbourhood → follow up.**

## Before the pitch

| When | What |
|---|---|
| Day before | `powershell -ExecutionPolicy Bypass -File scripts\start_demo.ps1 -Reseed` (online). Click through the whole script once. |
| Day before | `python scripts\record_demo_answers.py --missing` until it reports **0 failed**. Read `docs\demo\recorded_answers.md`; have a native speaker check the Amharic and Afaan Oromoo answers. |
| Morning of | If the venue Wi-Fi is not reliable: `scripts\start_demo.ps1 -Reseed -Offline`. The advisor replays recorded answers; weather and prices come from the cache. |
| Morning of | Copy `data\demo\photos\leaf-rust.jpg` and `healthy-wheat.png` to the demo phone/laptop. Optional: add a yellow-rust photo from the training set. |
| Morning of | Open http://localhost:5173 and sign in as the farmer **0944000001 / demo1234**. Language in the profile: Amharic or English, whichever the audience understands. |

Offline mode answers only the recorded questions, and only word for word. Use the **Try asking** buttons — they are the recorded questions.

## The script

### 1. The farmer and the farm (1 min) — Dashboard

- "Our farmer grows half a hectare of irrigated wheat in **Dewa Cheffa woreda**, Oromo Nationality Administration, Amhara."
- Point at the alert at the top: **yellow rust reported on farms 2–7 km away this week**.
- Below it, **My crop calendar**: the wheat is at **tillering** (day 35), with this stage's tasks from the manual (page numbers shown). Stem elongation is next. "Timing is estimated from the manual; the DA confirms."
- "Nobody typed this. The platform knows his woreda (official P-code ET031001), his crop and his neighbours' scans."
- *Say plainly:* the neighbour scans are simulated for the demo.

### 2. Ask in his own language (2 min) — AI Advisory

1. Tap **በመስኖ ስንዴ ላይ ዩሪያ መቼ ልጨምር?** (or the English one).
2. While it answers: "The advisor only answers from Ministry of Agriculture guidelines — four wheat packages and manuals, 283 passages."
3. Tap the **S1** tag: the exact manual and page appear. "Every sentence has a source a DA can check."
4. Tap **🔊 Listen**: the answer is read aloud in Amharic (Gemini voice; Afaan Oromoo uses the local voice). For farmers who don't read easily.
5. Point out that the answer is for his **midland zone** (1641 m) and his **tillering stage** (day 35) — the advisor knows his altitude and planting date.
5. Tap **Can I spray Tilt on my wheat?** (type it): the advisor refuses — the product is not on the verified list — instead of guessing a dose. "Pesticide doses only ever come from the verified database, never from the AI."
6. Optional: tap **What is the wheat price at my nearest market?** — real NMIS prices, the nearest market and the trend.

### 3. Check a sick leaf (2.5 min) — Crop Health → Photo check

1. Upload `leaf-rust.jpg`. Result: **Leaf rust (brown rust)**.
2. Open **How the model decided**:
   - *Photo only*: Brown Rust ~100%.
   - *Photo + farm conditions*: the model also takes his altitude and last week's temperature, humidity and rain at his farm.
   - Today the box says the conditions are **outside what the model was trained on** (dry season, almost no rain), so the app **uses the photo only and says so**.
3. Key message — say it like this:
   > "Disease depends on weather: yellow rust needs cool, wet weeks; stem rust needs warm ones. Our model is built to combine the photo with the farm's altitude and weather. It checks every reading against what it was trained on, and when the photo and the weather disagree it does **not** pick one — it tells the farmer it is unsure and sends the case to his Development Agent. Phase 2 trains this on real field weather records from MoA and EIAR, so the weather input becomes as reliable as the photo."
4. Scroll the treatment plan: field steps from the manual, products marked **Placeholder — not verified**, nearest suppliers (sponsored ones are labelled and never ranked higher), spray-weather warning and safety.
5. "In 7 days he is asked: better, the same or worse? **Worse** goes straight to his DA."

### Optional: the Development Agent's side (1 min)

Sign in as the DA **0944000002 / demo1234** (second browser or phone).
- **DA Copilot**: the visit list puts the farmer with an unsure photo check first and says why. Only farmers who agreed to share their data are listed.
- **Escalations**: pick the right disease under the unsure photo check and save. Type an answer to the open question and send it. The farmer sees it among their alerts and can listen to it.
- *Say plainly:* the second farmer and their two cases are demo data.

### 4. Close (30 s)

- Same platform, same farmer: market prices, credit profile, input suppliers.
- Production: farmer and land records come from the **ATI Farmer Profile System**; addresses use the official boundaries everywhere.

## If something goes wrong

| Problem | Do this |
|---|---|
| Advisor says it is not available | You are offline or the question was typed differently. Use a **Try asking** button. |
| Photo check fails "model not available" | The disease model window (:8003) is closed. Re-run `start_demo.ps1`. |
| No alert on the dashboard | Run `python scripts\seed_advisory_demo.py --outbreak`, then as admin call *Run alerts* (`POST /api/advisory/admin/run-alerts`), or restart the API. |
| Someone asks "is the dose real?" | "No — every product and dose here is a placeholder until the Ministry's registered list is verified. The system refuses to show unverified doses as advice." |
| Someone uploads their own healthy photo and gets a disease *with conditions* | That is the known limit of the synthetic weather data — point to the "not sure, sent to your DA" result and the Phase 2 retraining. |

## Known limits (be honest if asked)

- Ecological training data is synthetic; the model over-weights weather. The app shows both results and escalates disagreements.
- Product, dose and crop-calendar timings are placeholders marked *verify*; stage day ranges are estimates scaled from the manual's days-to-maturity table.
- Amharic and Afaan Oromoo interface text and answers are drafts awaiting native review.
- Emergency contact number is a placeholder until confirmed.
