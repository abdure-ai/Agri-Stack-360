"""
NMIS Network Inspector v2 — fixed Windows CP1252 encoding issue
Step 1: Capture all XHR/fetch API calls made by nmis.et
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

OUTPUT_FILE = Path(__file__).resolve().parent.parent / "data" / "samples" / "nmis_network_log.json"
SITE_URL = "https://www.nmis.et/"

captured_requests = []


async def main():
    print(f"[{datetime.now()}] Starting NMIS network inspection...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent=(
                "NMIS-Research-Scraper/1.0 (academic; "
                "Ethiopian agricultural price data study)"
            ),
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        async def handle_request(request):
            resource_type = request.resource_type
            if resource_type in ("xhr", "fetch", "websocket"):
                entry = {
                    "type": "REQUEST",
                    "resource_type": resource_type,
                    "method": request.method,
                    "url": request.url,
                    "headers": dict(request.headers),
                    "post_data": request.post_data,
                    "timestamp": time.time(),
                }
                captured_requests.append(entry)
                print(f"  -> [{resource_type.upper()}] {request.method} {request.url}")

        async def handle_response(response):
            if response.request.resource_type in ("xhr", "fetch"):
                try:
                    body = await response.text()
                    try:
                        parsed = json.loads(body)
                        body_preview = json.dumps(parsed, indent=2, ensure_ascii=False)[:3000]
                        is_json = True
                    except Exception:
                        body_preview = body[:1000]
                        is_json = False

                    captured_requests.append(
                        {
                            "type": "RESPONSE",
                            "url": response.url,
                            "status": response.status,
                            "headers": dict(response.headers),
                            "is_json": is_json,
                            "body_preview": body_preview,
                            "timestamp": time.time(),
                        }
                    )
                    print(
                        f"  <- [{response.status}] {response.url[:100]} "
                        f"({'JSON' if is_json else 'text'})"
                    )
                except Exception as e:
                    print(f"  <- [ERR] {response.url[:80]}: {e}")

        page.on("request", handle_request)
        page.on("response", handle_response)

        # Load homepage
        print(f"\n[1/3] Loading {SITE_URL}")
        await page.goto(SITE_URL, wait_until="networkidle", timeout=60000)
        await asyncio.sleep(3)

        # Inspect DOM — safe ASCII-only print
        print("\n[2/3] Inspecting DOM...")
        nav_links = await page.evaluate(
            """() => {
            const links = [];
            document.querySelectorAll('a[href], [routerLink]').forEach(el => {
                const href = el.getAttribute('href') || el.getAttribute('routerLink') || '';
                const text = (el.innerText || el.textContent || '').trim().slice(0, 80);
                links.push({ tag: el.tagName, href, text });
            });
            return links.slice(0, 100);
        }"""
        )
        for link in nav_links:
            # Safe encode for Windows console
            text = link.get("text", "").encode("ascii", errors="replace").decode()
            href = link.get("href", "")
            if href or text:
                print(f"    [{link['tag']}] href={href!r} text={text!r}")

        # Click price/market related nav items
        print("\n[3/3] Clicking navigation items...")
        price_keywords = ["price", "market", "commodity", "teff", "retail", "wholesale", "data", "report"]
        clicked = set()
        for kw in price_keywords:
            for sel in [f"a:text-matches('{kw}', 'i')", f"button:text-matches('{kw}', 'i')"]:
                try:
                    els = await page.query_selector_all(sel)
                    for el in els[:2]:
                        text = (await el.inner_text()).strip()
                        if text and text not in clicked:
                            safe_text = text.encode("ascii", errors="replace").decode()
                            print(f"  Clicking: {safe_text!r}")
                            try:
                                await el.click(timeout=5000)
                                await asyncio.sleep(2)
                                clicked.add(text)
                                await page.wait_for_load_state("networkidle", timeout=10000)
                                await asyncio.sleep(1)
                            except Exception:
                                pass
                            break
                except Exception:
                    pass

        # DOM snapshot
        final_html = await page.content()
        with open("nmis_dom_snapshot.html", "w", encoding="utf-8") as f:
            f.write(final_html)
        print(f"\nDOM snapshot: nmis_dom_snapshot.html ({len(final_html):,} bytes)")

        await browser.close()

    # Save all captured requests
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(captured_requests, f, indent=2, ensure_ascii=False, default=str)

    print(f"\n{'='*60}")
    api_calls = [r for r in captured_requests if r["type"] == "REQUEST" and "nmis.et/api" in r["url"]]
    json_responses = [r for r in captured_requests if r.get("is_json") and "nmis.et/api" in r["url"]]

    print(f"NMIS API requests captured: {len(api_calls)}")
    print(f"NMIS JSON responses: {len(json_responses)}")

    print("\n-- All NMIS API Endpoints --")
    seen = set()
    for req in api_calls:
        key = f"{req['method']} {req['url']}"
        if key not in seen:
            print(f"  {req['method']:6s} {req['url']}")
            seen.add(key)

    print("\n-- JSON Response Previews --")
    for resp in json_responses[:10]:
        print(f"\n  URL: {resp['url']}")
        print(f"  Status: {resp['status']}")
        preview = resp["body_preview"][:800]
        print(f"  Preview:\n{preview}")

    print(f"\nFull log: {OUTPUT_FILE}")
    print(f"DOM snapshot: nmis_dom_snapshot.html")


if __name__ == "__main__":
    asyncio.run(main())
