"""
record_demo_answers.py — Record the pitch's advisor answers for offline replay (Day 7 demo kit).

Asks each demo question as the demo farmer through the running API (port 8000).
Every live answer is stored by the advisor under data/cache/llm/ (exact prompt and
"farmer|language|question" keys), so the same question replays with ADVISORY_OFFLINE=1.
A review file is written to docs/demo/recorded_answers.md.

The questions must match the "Try asking" buttons on the AI Advisory page word for word,
because offline replay looks answers up by the exact question text.

    python scripts/record_demo_answers.py                 # all questions
    python scripts/record_demo_answers.py --lang am       # one language
    python scripts/record_demo_answers.py --missing       # only questions without a recorded answer
    python scripts/record_demo_answers.py --pause 10      # seconds between Gemini calls (free tier)
    python scripts/record_demo_answers.py --api http://localhost:8010/api --no-review --pause 0
                                                          # replay check against an API started with ADVISORY_OFFLINE=1
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
API = "http://localhost:8000/api"
FARMER = {"phone": "0944000001", "password": "demo1234"}
LLM_CACHE = ROOT / "data" / "cache" / "llm"
REVIEW = ROOT / "docs" / "demo" / "recorded_answers.md"

# Same text as SUGGESTIONS in frontend/src/pages/Advisory/Advisory.tsx.
QUESTIONS: dict[str, list[str]] = {
    "en": [
        "When should I apply urea on irrigated wheat?",
        "My wheat leaves have yellow stripes. What should I do?",
        "How much wheat seed do I need for one hectare?",
        "How often should I irrigate wheat?",
        "What is the wheat price at my nearest market?",
    ],
    "am": [
        "በመስኖ ስንዴ ላይ ዩሪያ መቼ ልጨምር?",
        "የስንዴ ቅጠሌ ላይ ቢጫ መስመር አለ። ምን ላድርግ?",
        "ለአንድ ሄክታር ስንዴ ስንት ኪሎ ዘር ያስፈልጋል?",
        "ስንዴን በስንት ቀን ልዩነት ማጠጣት አለብኝ?",
        "በአቅራቢያዬ ገበያ የስንዴ ዋጋ ስንት ነው?",
    ],
    "om": [
        "Qamadii jallisiirratti yuuriyaa yoom naquu qaba?",
        "Baalli qamadii koo sarara keelloo qaba. Maal gochuu qaba?",
        "Hektaara tokkoof sanyii qamadii kiiloo meeqa barbaada?",
        "Gatiin qamadii gabaa natti dhihoo jirutti meeqa?",
    ],
}

# Safety moments for the pitch; answered by the guardrails without the LLM.
GUARDRAIL_QUESTIONS = [
    ("en", "Can I spray Tilt on my wheat?"),
    ("en", "I sprayed chemical and now I am vomiting and dizzy"),
    ("am", "ባለሙያ ያነጋግረኝ"),
]


def _recorded(farmer_id: int, lang: str, question: str) -> bool:
    key = hashlib.sha256(f"{farmer_id}|{lang}|{question}".encode()).hexdigest()[:32]
    return (LLM_CACHE / f"q_{key}.json").exists()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", choices=sorted(QUESTIONS))
    ap.add_argument("--missing", action="store_true", help="skip questions that already have a recorded answer")
    ap.add_argument("--pause", type=float, default=6.0, help="seconds between LLM questions")
    ap.add_argument("--api", default=API, help="platform API base URL")
    ap.add_argument("--no-review", action="store_true", help="do not rewrite docs/demo/recorded_answers.md")
    args = ap.parse_args()
    api = args.api.rstrip("/")

    try:
        login = requests.post(f"{api}/auth/login", json=FARMER, timeout=30).json()
    except requests.RequestException as e:
        print(f"The API is not reachable at {api} ({e}).")
        return 1
    headers = {"Authorization": f"Bearer {login['access_token']}"}
    farmer_id = login["user"]["id"]

    plan = [(lang, q, True) for lang, qs in QUESTIONS.items() if not args.lang or lang == args.lang for q in qs]
    plan += [(lang, q, False) for lang, q in GUARDRAIL_QUESTIONS if not args.lang or lang == args.lang]
    results, failed = [], 0
    for i, (lang, question, uses_llm) in enumerate(plan, 1):
        if args.missing and uses_llm and _recorded(farmer_id, lang, question):
            print(f"[{i}/{len(plan)}] skip (recorded) {lang}: {question}")
            continue
        t = time.time()
        r = requests.post(f"{api}/advisory/ask", headers=headers, timeout=240,
                          json={"question": question, "language": lang})
        body = r.json()
        ok = r.ok and body.get("kind") != "unavailable"
        failed += not ok
        print(f"[{i}/{len(plan)}] {'ok  ' if ok else 'FAIL'} {lang} {body.get('kind')} "
              f"({time.time() - t:.0f}s): {question}")
        results.append((lang, question, body))
        if uses_llm and i < len(plan):
            time.sleep(args.pause)

    if args.no_review:
        print(f"\n{len(results) - failed} answered, {failed} failed.")
        return 1 if failed else 0
    REVIEW.parent.mkdir(parents=True, exist_ok=True)
    with REVIEW.open("w", encoding="utf-8") as f:
        f.write(f"# Recorded demo answers\n\nRecorded {datetime.now():%Y-%m-%d %H:%M} for the demo farmer "
                f"(Dewa Cheffa, irrigated wheat). Check each answer before the pitch; Amharic and Afaan Oromoo "
                f"answers need a native speaker's review.\n")
        for lang, question, a in results:
            f.write(f"\n## [{lang}] {question}\n\n- kind: `{a.get('kind')}` · confidence: `{a.get('confidence')}` · "
                    f"escalated: `{a.get('escalated')}` · flags: `{', '.join(a.get('guardrail_flags') or []) or '-'}`\n\n")
            f.write("> " + (a.get("answer") or a.get("detail") or "").replace("\n", "\n> ") + "\n")
            for s in a.get("sources") or []:
                f.write(f"\n- {s['ref']}: {s['citation']}")
            f.write("\n")
    print(f"\n{len(results) - failed} answered, {failed} failed. Review: {REVIEW.relative_to(ROOT)}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
