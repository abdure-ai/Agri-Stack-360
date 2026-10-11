"""Probe markets list and crop catalog from NMIS API."""
import sys
sys.stdout.reconfigure(encoding="utf-8")

import requests
import json
from pathlib import Path

SAMPLES_DIR = Path(__file__).resolve().parents[2] / "data" / "samples"

BASE = "https://www.nmis.et/api/web"
UA = "NMIS-Research-Scraper/1.0 (academic; Ethiopian agricultural price data study)"
headers = {"User-Agent": UA}

print("=" * 60)
print("GET /listMarketPlaces/null/0 — ALL MARKETS")
r = requests.get(f"{BASE}/listMarketPlaces/null/0", headers=headers, timeout=20)
markets = r.json()
print(f"Total markets: {len(markets)}")
print(json.dumps(markets[:5], indent=2, ensure_ascii=False))
print("...\nAll market IDs + names:")
for m in markets:
    print(f"  id={m.get('id') or m.get('marketId') or m.get('mId')}  |  keys={list(m.keys())}  |  {json.dumps(m, ensure_ascii=False)}")

# Save full market list
with open(SAMPLES_DIR / "nmis_markets.json", "w", encoding="utf-8") as f:
    json.dump(markets, f, indent=2, ensure_ascii=False)
print(f"\nSaved {len(markets)} markets to nmis_markets.json")

# Now get all crops for the first market
if markets:
    market_id = markets[0].get("marketId") or markets[0].get("id") or markets[0].get("mId") or list(markets[0].values())[0]
    print(f"\n{'='*60}")
    print(f"GET /getMarketCrop/{market_id}/null — CROPS for market {market_id}")
    r2 = requests.get(f"{BASE}/getMarketCrop/{market_id}/null", headers=headers, timeout=20)
    crops = r2.json()
    print(f"Total crops: {len(crops)}")
    print(json.dumps(crops, indent=2, ensure_ascii=False)[:3000])
    with open(SAMPLES_DIR / "nmis_crops_sample.json", "w", encoding="utf-8") as f:
        json.dump(crops, f, indent=2, ensure_ascii=False)
    print(f"\nSaved crops to nmis_crops_sample.json")

    # Get crop varieties for first market/crop combo
    if crops:
        crop_id = crops[0].get("cropId") or crops[0].get("id") or crops[0].get("cId") or list(crops[0].values())[0]
        print(f"\n{'='*60}")
        print(f"GET /getMarketCropVariety/{market_id}/{crop_id} — VARIETIES")
        r3 = requests.get(f"{BASE}/getMarketCropVariety/{market_id}/{crop_id}", headers=headers, timeout=20)
        varieties = r3.json()
        print(json.dumps(varieties, indent=2, ensure_ascii=False)[:2000])
        with open(SAMPLES_DIR / "nmis_varieties_sample.json", "w", encoding="utf-8") as f:
            json.dump(varieties, f, indent=2, ensure_ascii=False)

        # Test getMarketTrend with date params
        variety_id = varieties[0].get("varietyId") or varieties[0].get("id") or list(varieties[0].values())[0] if varieties else crop_id
        print(f"\n{'='*60}")
        print(f"GET /getMarketTrend/{market_id}/{variety_id}/null/null — TREND (no date filter)")
        r4 = requests.get(f"{BASE}/getMarketTrend/{market_id}/{variety_id}/null/null", headers=headers, timeout=20)
        trend = r4.json()
        print(f"Trend records: {len(trend)}")
        print(json.dumps(trend[:3], indent=2, ensure_ascii=False))
        if trend:
            print(f"\nDate range: {trend[0].get('collectionDate')} -> {trend[-1].get('collectionDate')}")

        # Test with explicit date range
        print(f"\n{'='*60}")
        print(f"GET /getMarketTrend/{market_id}/{variety_id}/2022-01-01/2022-12-31 — TREND with dates")
        r5 = requests.get(f"{BASE}/getMarketTrend/{market_id}/{variety_id}/2022-01-01/2022-12-31", headers=headers, timeout=20)
        print(f"Status: {r5.status_code}")
        try:
            trend2 = r5.json()
            print(f"Records: {len(trend2)}")
            print(json.dumps(trend2[:2], indent=2, ensure_ascii=False))
        except:
            print(r5.text[:500])
