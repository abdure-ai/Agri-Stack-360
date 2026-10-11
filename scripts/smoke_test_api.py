import urllib.request, json, sys

def test(label, url):
    print(f"\n=== {label} ===")
    print(f"URL: {url}")
    try:
        r = urllib.request.urlopen(url, timeout=30)
        data = json.loads(r.read())
        return data
    except Exception as e:
        print(f"ERROR: {e}")
        return None

# Test 1: /api/meta
meta = test("/api/meta", "http://localhost:8000/api/meta")
if meta:
    print(f"Crops returned: {len(meta['crops'])}")
    for c in meta['crops'][:5]:
        n = c['name']
        mn = c['min_date']
        mx = c['max_date']
        rc = c['record_count']
        print(f"  {n}: {mn} to {mx} ({rc:,} records)")
    print("Regions:", meta['regions'])
    print("Coverage:", meta['price_level_coverage'])

# Test 2: /api/prices — Wheat / Oromia / wholesale / last 2 years
url2 = "http://localhost:8000/api/prices?crop=Wheat&region=Oromia&price_level=wholesale&start_date=2024-08-01&end_date=2026-08-11"
prices = test("/api/prices (Wheat/Oromia/wholesale/2024+)", url2)
if prices:
    print(f"Unit: {prices['unit']}, Level: {prices['price_level']}, Rows: {prices['row_count']}")
    for p in prices['data'][:5]:
        print(f"  {p['date']} | {p['market_name']} | avg={p['price_avg']} min={p['price_min']} max={p['price_max']}")

# Test 3: /api/summary — same filter
url3 = "http://localhost:8000/api/summary?crop=Wheat&region=Oromia&price_level=wholesale&start_date=2024-08-01"
summary = test("/api/summary (Wheat/Oromia/wholesale)", url3)
if summary:
    print(json.dumps(summary, indent=2))

# Test 4: /api/regional
url4 = "http://localhost:8000/api/regional?crop=Teff&price_level=retail&start_date=2025-01-01"
regional = test("/api/regional (Teff/retail/2025)", url4)
if regional:
    print(f"Regional rows: {len(regional['data'])}")
    for p in regional['data'][:4]:
        print(f"  {p['date']} | {p['region']} | avg={p['price_avg']}")
