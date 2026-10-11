"""Quick API shape probe for discovered NMIS endpoints."""
import sys
sys.stdout.reconfigure(encoding="utf-8")

import requests
import json
from pathlib import Path

SAMPLES_DIR = Path(__file__).resolve().parents[2] / "data" / "samples"

BASE = "https://www.nmis.et/api/web"
UA = "NMIS-Research-Scraper/1.0 (academic; Ethiopian agricultural price data study)"
headers = {"User-Agent": UA}

endpoints = [
    "/listMarketPlaces/null/0",
    "/getMarketCrop/296/null",
    "/getMarketCropVariety/296/null",
    "/getMarketTrend/296/1/null/null",
    "/getMedianData/296/1/null/null",
    "/getMarketTable/'296'/'1'/null/null/null",
    "/getCurrentMarketData/296/null",
    "/getMarketComparison/'296,217'/1/null",
]

results = {}

for ep in endpoints:
    url = BASE + ep
    print(f"\n{'='*60}")
    print(f"GET {url}")
    try:
        r = requests.get(url, headers=headers, timeout=20)
        print(f"Status: {r.status_code}  |  Content-Type: {r.headers.get('content-type','')}")
        try:
            data = r.json()
            results[ep] = {"status": r.status_code, "data": data}
            preview = json.dumps(data, indent=2, ensure_ascii=False)
            print(preview[:2000])
            if len(preview) > 2000:
                print(f"... [{len(preview):,} chars total]")
        except Exception:
            print(r.text[:800])
            results[ep] = {"status": r.status_code, "raw": r.text[:800]}
    except Exception as e:
        print(f"ERROR: {e}")
        results[ep] = {"error": str(e)}

# Save full results
with open(SAMPLES_DIR / "nmis_api_probe.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"\n\nFull probe results saved to data/samples/nmis_api_probe.json")
