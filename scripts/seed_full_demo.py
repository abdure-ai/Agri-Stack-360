"""
seed_full_demo.py — Fill every portal with realistic demo activity (run after seed_advisory_demo.py).

Real sources:   woredas and their centre points (eth_admin_boundaries), terrain elevation (Open-Meteo,
                one request), crop-calendar rules and the MoA knowledge base, NMIS market prices (already
                in the platform), the real disease model for the demo photos, and the platform's own
                engines for alerts, copy detection and tips.
Labelled DEMO:  every person ("(DEMO)" in the name, phones 0945000xxx), farm, season, photo check
                (source='simulated'), record and request. Products, shops and partners keep their
                PLACEHOLDER names. Nothing here is a real farmer, yield, price or partner.

Safe to run again: it removes what it made before (phones 0945000xxx and rows marked DEMO) first.
The pitch demo farmer (0944000001) is not touched.

    .venv/Scripts/python.exe scripts/seed_full_demo.py [--no-photos] [--no-elevation]
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend import admin_areas, consent, input_trust, tips, training_data  # noqa: E402
from backend.advisory.alerts import run_alert_cycle  # noqa: E402
from backend.advisory.config import local_now  # noqa: E402
from backend.auth import hash_password  # noqa: E402
from backend.platform_db import get_platform_connection  # noqa: E402

PHONE_PREFIX = "0945000"
PASSWORD = "demo1234"
rng = random.Random(20261011)

# Real wheat woredas. kind: irrigated lowland wheat (planted Sep-Oct) or meher highland wheat (planted Jul-Aug).
WOREDAS = [
    ("ET031001", "irrigated", 6), ("ET031002", "irrigated", 4), ("ET031004", "irrigated", 3),
    ("ET030407", "meher", 3), ("ET030606", "meher", 3), ("ET031110", "meher", 3),
    ("ET040816", "meher", 4), ("ET041109", "meher", 4), ("ET041104", "meher", 3),
    ("ET041706", "meher", 3), ("ET041704", "meher", 2), ("ET070403", "meher", 2),
]
# Plausible mixes for the demo only (not survey data): lowland irrigated wheat sees more leaf rust,
# the cool highlands more yellow rust and septoria.
DISEASE_MIX = {
    "irrigated": [("leaf_rust", 5), ("yellow_rust", 1), ("powdery_mildew", 2), ("septoria_tritici_blotch", 1), ("healthy", 4)],
    "meher": [("yellow_rust", 5), ("septoria_tritici_blotch", 3), ("leaf_rust", 2), ("powdery_mildew", 1), ("healthy", 3)],
}
FIRST = {
    "am": ["Almaz", "Tesfaye", "Mulugeta", "Yeshi", "Getachew", "Worknesh", "Abebe", "Tigist", "Kassahun", "Meseret",
           "Alemu", "Zewdu", "Bizunesh", "Mekonnen", "Asnakech", "Dawit", "Fantaye", "Gebeyehu"],
    "om": ["Chaltu", "Gemechu", "Tolera", "Bontu", "Lencho", "Ayantu", "Fayisa", "Hawi", "Dinka", "Obse", "Tadesse",
           "Galane", "Kebede", "Sena", "Boru", "Ebise"],
}
FATHER = ["Ali", "Mohammed", "Bekele", "Tadesse", "Ahmed", "Hussen", "Kebede", "Gutema", "Abdi", "Wolde", "Negash",
          "Teshome", "Dibaba", "Jemal", "Lemma", "Hailu", "Desta", "Yimer"]
OTHER_CROPS = ["teff", "maize", "barley", "sorghum"]
EXTRA_DAS = [("0945000201", "Demo DA Oromia (DEMO)", "ET040816"), ("0945000202", "Demo DA SNNP (DEMO)", "ET070403")]
DEMO_PHOTOS = [ROOT / "data" / "demo" / "photos" / "leaf-rust.jpg", ROOT / "data" / "demo" / "photos" / "healthy-wheat.png"]


def stamp(dt: datetime) -> str:
    return dt.isoformat(sep=" ", timespec="seconds")


def pick(weighted):
    items, weights = zip(*weighted)
    return rng.choices(items, weights=weights)[0]


def one(conn, sql, params=()):
    r = conn.execute(sql, params).fetchone()
    return r[0] if r else None


# ── Cleanup ──────────────────────────────────────────────────────────────────

def cleanup(conn) -> None:
    ids = [r[0] for r in conn.execute("SELECT id FROM users WHERE phone LIKE ?", (PHONE_PREFIX + "%",))]
    marks = ",".join("?" * len(ids)) or "NULL"
    for f in conn.execute(f"SELECT file FROM training_images WHERE farmer_id IN ({marks})", ids).fetchall():
        (training_data.DATASET_DIR / f[0]).unlink(missing_ok=True)
    with conn:
        for sql in (f"DELETE FROM dealer_checks WHERE verification_id IN (SELECT id FROM verifications WHERE user_id IN ({marks}))",
                    f"DELETE FROM verifications WHERE user_id IN ({marks})",
                    f"DELETE FROM fake_reports WHERE user_id IN ({marks})",
                    f"DELETE FROM training_images WHERE farmer_id IN ({marks})",
                    f"DELETE FROM escalations WHERE farmer_id IN ({marks})",
                    f"DELETE FROM credit_requests WHERE farmer_id IN ({marks})"):
            conn.execute(sql, ids)
        conn.execute("DELETE FROM verifications WHERE id IN (SELECT verification_id FROM dealer_checks d JOIN organisations o "
                     "ON o.id = d.org_id WHERE o.name LIKE 'PLACEHOLDER Demo%')")
        conn.execute("DELETE FROM dealer_checks WHERE verification_id IS NULL")
        conn.execute("DELETE FROM estate_scouting WHERE note LIKE 'DEMO%'")
        conn.execute("DELETE FROM abc_contributions WHERE description LIKE 'DEMO%'")
        conn.execute("DELETE FROM buy_requests WHERE note LIKE 'DEMO%'")
        conn.execute("DELETE FROM code_batches WHERE batch_number LIKE 'DEMO-2026-0%' AND batch_number != 'DEMO-2026-01'")
        conn.execute("DELETE FROM ngo_projects WHERE name = 'Highland wheat septoria pilot (DEMO)'")
        conn.execute("DELETE FROM daily_tips WHERE origin = 'calendar' AND status = 'draft'")
    with conn:
        conn.execute(f"DELETE FROM users WHERE id IN ({marks})", ids)       # cascades to farms, seasons, alerts, ...
    print(f"Removed the previous full demo ({len(ids)} people).")


# ── People and farms ─────────────────────────────────────────────────────────

def elevations(conn, points: dict[str, tuple[float, float]], online: bool) -> dict[str, float | None]:
    if not online:
        return {k: None for k in points}
    import httpx

    keys = list(points)
    try:
        r = httpx.get("https://api.open-meteo.com/v1/elevation",
                      params={"latitude": ",".join(f"{points[k][0]:.4f}" for k in keys),
                              "longitude": ",".join(f"{points[k][1]:.4f}" for k in keys)}, timeout=20)
        r.raise_for_status()
        return dict(zip(keys, r.json()["elevation"]))
    except Exception as e:  # noqa: BLE001 — the seed still works; stages then show as "unknown"
        print(f"Elevation lookup failed ({e.__class__.__name__}); altitude left empty.")
        return {k: None for k in points}


def add_person(conn, phone: str, name: str, role: str, pcode: str, language: str) -> int:
    addr = admin_areas.address_fields(conn, pcode)
    cols = ("phone", "name", "password_hash", "role", "language", *addr)
    cur = conn.execute(f"INSERT INTO users ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
                       (phone, name, hash_password(PASSWORD), role, language, *addr.values()))
    return cur.lastrowid


def seed_people(conn, online: bool) -> list[dict]:
    today = local_now().date()
    centre = {p: (a.latitude, a.longitude) for p, *_ in WOREDAS if (a := admin_areas.get_area(conn, p))}
    alt = elevations(conn, centre, online)
    da_amhara = one(conn, "SELECT id FROM users WHERE phone='0944000002'")
    with conn:
        das = {"ET03": da_amhara}
        for phone, name, pcode in EXTRA_DAS:
            das[pcode[:4]] = add_person(conn, phone, name, "agent", pcode, "om" if pcode.startswith("ET04") else "am")
    farmers, n = [], 0
    for pcode, kind, count in WOREDAS:
        lang = "om" if pcode.startswith("ET04") else "am"
        lat0, lon0 = centre[pcode]
        for _ in range(count):
            n += 1
            name = f"{rng.choice(FIRST[lang])} {rng.choice(FATHER)} (DEMO)"
            lat, lon = lat0 + rng.uniform(-0.04, 0.04), lon0 + rng.uniform(-0.04, 0.04)
            with conn:
                uid = add_person(conn, f"{PHONE_PREFIX}{n:03d}", name, "farmer", pcode, lang)
                conn.execute("""INSERT INTO farmer_profiles (user_id, kebele, latitude, longitude, altitude_m, assigned_da_id)
                                VALUES (?, 'PLACEHOLDER_VERIFY_KEBELE', ?, ?, ?, ?)""",
                             (uid, round(lat, 5), round(lon, 5), alt.get(pcode), das.get(pcode[:4])))
            consent.set_consent(conn, uid, data=rng.random() < 0.9, alerts=rng.random() < 0.8,
                                training=rng.random() < 0.5, by=das.get(pcode[:4]) or uid, method="da_verbal")
            area = round(rng.choice([0.25, 0.5, 0.5, 0.75, 1.0, 1.0, 1.25, 1.5, 2.0]), 2)
            planted = today - timedelta(days=rng.randint(12, 40) if kind == "irrigated" else rng.randint(72, 98))
            with conn:
                farm = conn.execute(
                    """INSERT INTO farms (user_id, field_name, crop_name, area_ha, planted_date, status, notes, irrigated)
                       VALUES (?, 'Main wheat plot (DEMO)', 'wheat', ?, ?, 'healthy', 'DEMO data', ?)""",
                    (uid, area, planted.isoformat(), int(kind == "irrigated"))).lastrowid
                season = conn.execute(
                    "INSERT INTO crop_seasons (farm_id, crop, planting_date, season, status) VALUES (?, 'wheat', ?, ?, 'active')",
                    (farm, planted.isoformat(), kind)).lastrowid
                if rng.random() < 0.6:
                    conn.execute("""INSERT INTO farms (user_id, field_name, crop_name, area_ha, status, notes)
                                    VALUES (?, 'Second plot (DEMO)', ?, ?, 'healthy', 'DEMO data')""",
                                 (uid, rng.choice(OTHER_CROPS), round(rng.choice([0.25, 0.5, 0.75]), 2)))
            farmers.append({"id": uid, "pcode": pcode, "kind": kind, "lat": lat, "lon": lon, "farm": farm,
                            "season": season, "area": area, "da": das.get(pcode[:4]), "lang": lang, "alt": alt.get(pcode)})
    print(f"{len(farmers)} demo farmers in {len(WOREDAS)} real woredas; 2 more DAs (Oromia, SNNP).")
    return farmers


def seed_photo_checks(conn, farmers: list[dict]) -> None:
    now = local_now()
    diag = 0
    for f in farmers:
        for _ in range(rng.choice([0, 1, 1, 2, 3])):
            when = now - timedelta(days=rng.randint(0, 27), hours=rng.randint(0, 10))
            disease = pick(DISEASE_MIX[f["kind"]])
            conf = round(rng.uniform(0.55, 0.98), 3)
            uncertain = conf < 0.70
            label = one(conn, "SELECT model_label FROM diseases WHERE key=?", (disease,))
            verified = disease if (not uncertain and rng.random() < 0.3) else None
            older = (now - when).days >= 7
            outcome = rng.choice(["improved", "improved", "same", "worse"]) if older and not uncertain and disease != "healthy" and rng.random() < 0.6 else "unknown"
            with conn:
                did = conn.execute(
                    """INSERT INTO diagnoses (farmer_id, farm_id, crop_season_id, disease_key, model_label, confidence,
                           probabilities, latitude, longitude, source, verified_by, verified_disease, outcome,
                           follow_up_date, created_at) VALUES (?,?,?,?,?,?,?,?,?, 'simulated', ?,?,?,?,?)""",
                    (f["id"], f["farm"], f["season"], None if uncertain else disease, label, conf,
                     json.dumps({label: conf}), round(f["lat"], 5), round(f["lon"], 5), f["da"] if verified else None,
                     verified, outcome,
                     (when + timedelta(days=7)).date().isoformat() if not uncertain and disease != "healthy" else None,
                     stamp(when))).lastrowid
                if uncertain or outcome == "worse":
                    status = rng.choice(["open", "open", "answered"])
                    conn.execute("""INSERT INTO escalations (diagnosis_id, farmer_id, reason, assigned_to, status, resolution,
                                    created_at, resolved_at) VALUES (?,?,?,?,?,?,?,?)""",
                                 (did, f["id"], "low_confidence" if uncertain else "advice_failed", f["da"], status,
                                  "DEMO: visited the plot and confirmed the advice." if status == "answered" else None,
                                  stamp(when), stamp(when + timedelta(days=1)) if status == "answered" else None))
            diag += 1
    print(f"{diag} simulated photo checks (last 4 weeks) with DA cases for uncertain or worse results.")


# ── Organisations ────────────────────────────────────────────────────────────

def org(conn, type_: str) -> int | None:
    return one(conn, "SELECT id FROM organisations WHERE type=? AND name LIKE 'PLACEHOLDER Demo%' ORDER BY id", (type_,))


def seed_input_trust(conn, farmers: list[dict]) -> None:
    now = local_now()
    supplier = org(conn, "supplier")
    sup_user = one(conn, "SELECT id FROM users WHERE phone='0944000005'")
    if not supplier:
        print("Input Trust demo missing: run seed_advisory_demo.py --input-trust first.")
        return
    products = [r[0] for r in conn.execute("SELECT product_id FROM org_products WHERE org_id=?", (supplier,))]
    codes = [r[0] for r in conn.execute("SELECT code FROM code_batches WHERE org_id=? AND status='active'", (supplier,))]
    with conn:
        for i, pid in enumerate(products[:2], start=2):
            code = input_trust.new_code(conn)
            conn.execute("""INSERT INTO code_batches (org_id, product_id, batch_number, units, manufactured_on, expires_on, code,
                            created_by) VALUES (?,?,?,?,?,?,?,?)""",
                         (supplier, pid, f"DEMO-2026-0{i}", rng.choice([500, 800, 1200]),
                          (now.date() - timedelta(days=60)).isoformat(), (now.date() + timedelta(days=640)).isoformat(),
                          code, sup_user))
            codes.append(code)
    # Farmers check packs. Each batch is sold in up to 3 woredas (as a real batch would be); copies of the
    # third batch's label also turn up in Gonder Zuria, which the real engine flags as possible copies.
    # The first batch (DEMO-2026-01, the code used in the live pitch demo) stays within its 3 woredas.
    sold_in = {0: {"ET031001", "ET031002", "ET031004"}, 1: {"ET040816", "ET041109", "ET041104"},
               2: {"ET041706", "ET041704", "ET070403"}}
    planned = []
    for f in rng.sample(farmers, k=min(30, len(farmers))):
        home = next((i for i, w in sold_in.items() if f["pcode"] in w and i < len(codes)), None)
        for _ in range(rng.choice([1, 1, 2])):
            if rng.random() < 0.08:
                code = input_trust.new_code(conn)                       # a code no supplier issued
            elif home is None:
                if f["pcode"] != "ET031110":
                    continue                                            # no supplier sells in this woreda yet
                code = codes[-1]                                        # copied label outside the sales area
            else:
                code = codes[home]
            planned.append((now - timedelta(days=rng.randint(0, 25), hours=rng.randint(0, 9)), code, f))
    for when, code, f in sorted(planned, key=lambda x: x[0]):
        input_trust.verify(conn, code, user_id=f["id"], woreda_pcode=f["pcode"], now=when)
    checks = len(planned)   # (skipped rows are not in `planned`)
    with conn:
        for f in rng.sample(farmers, k=4):
            conn.execute("""INSERT INTO fake_reports (user_id, product_text, shop_text, note, woreda_pcode, created_at)
                            VALUES (?, 'Fungicide pack with a smudged label (DEMO)', 'Weekly market stall (DEMO)',
                                    'DEMO report: price far below others, no batch number', ?, ?)""",
                         (f["id"], f["pcode"], stamp(now - timedelta(days=rng.randint(1, 20)))))
    shop = org(conn, "agro_dealer")
    dealer = one(conn, "SELECT id FROM users WHERE phone='0944000007'")
    if shop:
        with conn:
            for pid in [r[0] for r in conn.execute("SELECT id FROM approved_products WHERE status='registered'")]:
                conn.execute("INSERT OR REPLACE INTO shop_products (org_id, product_id, in_stock, updated_at) VALUES (?,?,?,?)",
                             (shop, pid, int(rng.random() < 0.75), stamp(now)))
        dealer_pcode = one(conn, "SELECT woreda_pcode FROM users WHERE id=?", (dealer,))
        for _ in range(12):
            input_trust.verify(conn, codes[0], user_id=dealer, woreda_pcode=dealer_pcode,
                               now=now - timedelta(days=rng.randint(0, 20)))
            vid = one(conn, "SELECT MAX(id) FROM verifications")
            with conn:
                conn.execute("INSERT INTO dealer_checks (org_id, verification_id, created_by, created_at) VALUES (?,?,?,?)",
                             (shop, vid, dealer, stamp(now - timedelta(days=rng.randint(0, 20)))))
    print(f"Input Trust: {len(codes)} code batches, {checks} farmer checks, 4 suspected-fake reports, 12 checks at sale.")


def seed_abc(conn, farmers: list[dict]) -> None:
    abc = org(conn, "abc")
    manager = one(conn, "SELECT id FROM users WHERE phone='0944000008'")
    trader = one(conn, "SELECT id FROM users WHERE phone='0933456789'")
    if not abc:
        return
    now = local_now()
    local = [f for f in farmers if f["pcode"] in ("ET031001", "ET031002")]
    with conn:
        for i, f in enumerate(local):
            status = "active" if i < len(local) - 2 else "invited"
            conn.execute("""INSERT OR REPLACE INTO abc_members (org_id, farmer_id, status, invited_by, invited_at, joined_at)
                            VALUES (?,?,?,?,?,?)""", (abc, f["id"], status, manager, stamp(now - timedelta(days=30)),
                                                       stamp(now - timedelta(days=25)) if status == "active" else None))
            if status == "active":
                conn.execute("""INSERT INTO abc_contributions (org_id, farmer_id, kind, description, quantity, unit, recorded_by,
                                created_at) VALUES (?,?, 'land', 'DEMO record: irrigated plot', ?, 'ha', ?, ?)""",
                             (abc, f["id"], f["area"], manager, stamp(now - timedelta(days=24))))
                conn.execute("""INSERT INTO abc_contributions (org_id, farmer_id, kind, description, quantity, unit, recorded_by,
                                created_at) VALUES (?,?, 'labour', 'DEMO record: weeding and canal cleaning', ?, 'days', ?, ?)""",
                             (abc, f["id"], rng.choice([4, 6, 8, 10]), manager, stamp(now - timedelta(days=20))))
        if trader:
            for crop, qt, days in (("wheat", 250, 75), ("wheat", 120, 60)):
                rid = conn.execute("""INSERT INTO buy_requests (trader_id, crop, quantity_qt, region_pcode, needed_by, note,
                                      created_at) VALUES (?,?,?, 'ET03', ?, 'DEMO request: clean, dry grain', ?)""",
                                   (trader, crop, qt, (now.date() + timedelta(days=days)).isoformat(),
                                    stamp(now - timedelta(days=3)))).lastrowid
            conn.execute("""INSERT INTO buy_request_responses (request_id, org_id, quantity_qt, message, created_by, created_at)
                            VALUES (?,?,?, 'DEMO: members expect to harvest in about 10 weeks; we can offer part of it.', ?, ?)""",
                         (rid, abc, 80, manager, stamp(now - timedelta(days=1))))
    print(f"ABC: {len(local)} members ({len(local) - 2} active), contributions, 2 buyer requests and an answer.")


def seed_estate(conn) -> None:
    blocks = [r[0] for r in conn.execute("SELECT id FROM estate_blocks WHERE name LIKE '%(DEMO)'")]
    manager = one(conn, "SELECT id FROM users WHERE phone='0944000009'")
    now = local_now()
    with conn:
        for b in blocks:
            for days in (20, 13, 6, 1):
                sev = rng.choice(["none", "none", "low", "medium"])
                conn.execute("""INSERT INTO estate_scouting (block_id, disease_key, severity, incidence_pct, note, recorded_by,
                                created_at) VALUES (?,?,?,?, 'DEMO scouting walk', ?, ?)""",
                             (b, None if sev == "none" else rng.choice(["leaf_rust", "powdery_mildew"]), sev,
                              0 if sev == "none" else rng.choice([2, 5, 8, 12]), manager, stamp(now - timedelta(days=days))))
    print(f"Commercial farm: {len(blocks) * 4} scouting records.")


def seed_ngo(conn) -> None:
    ngo = org(conn, "ngo")
    if not ngo:
        return
    with conn:
        pid = one(conn, "SELECT id FROM ngo_projects WHERE org_id=? ORDER BY id", (ngo,))
        for pcode in ("ET031002", "ET030407"):
            conn.execute("INSERT OR IGNORE INTO ngo_project_areas (project_id, woreda_pcode) VALUES (?,?)", (pid, pcode))
        second = conn.execute("""INSERT INTO ngo_projects (org_id, name, description, start_date, created_at)
                                 VALUES (?, 'Highland wheat septoria pilot (DEMO)', 'DEMO project', date('now', '-45 days'),
                                 CURRENT_TIMESTAMP)""", (ngo,)).lastrowid
        for pcode in ("ET040816", "ET041109", "ET041104"):
            conn.execute("INSERT OR IGNORE INTO ngo_project_areas (project_id, woreda_pcode) VALUES (?,?)", (second, pcode))
    print("NGO: first project now covers 3 woredas; second project in 3 Oromia woredas.")


def seed_lender(conn, farmers: list[dict]) -> None:
    lender = one(conn, "SELECT id FROM users WHERE phone='0944000012'")
    if not lender:
        return
    now = local_now()
    a, b, c = rng.sample(farmers, 3)
    with conn:
        for f, status in ((a, "approved"), (b, "declined"), (c, "pending")):
            phone = one(conn, "SELECT phone FROM users WHERE id=?", (f["id"],))
            conn.execute("""INSERT INTO credit_requests (lender_id, farmer_id, phone, purpose, status, requested_at, decided_at,
                            expires_at) VALUES (?,?,?, 'DEMO: input loan for the next season', ?, ?, ?, ?)""",
                         (lender, f["id"], phone, status, stamp(now - timedelta(days=4)),
                          stamp(now - timedelta(days=3)) if status != "pending" else None,
                          stamp(now + timedelta(days=27)) if status == "approved" else None))
    print("Lender: one shared report, one declined, one waiting.")


def seed_dataset(conn, farmers: list[dict]) -> None:
    """The two demo photos through the real disease model, kept for farmers who agreed to training use."""
    from backend.advisory.adapters.disease_service import DiseaseServiceClient
    from backend.advisory.providers import ProviderError

    agreed = [f for f in farmers if consent.has_training_consent(conn, f["id"])]
    added = 0
    for photo, f in zip(DEMO_PHOTOS, agreed):
        if not photo.exists():
            continue
        data = photo.read_bytes()
        try:
            pred = DiseaseServiceClient().predict_dual(data, photo.name, None)
            top = pred.photo_only
            version, label, conf = pred.model_version, top.label, top.confidence
        except (ProviderError, ValueError) as e:
            print(f"Disease model not reachable ({e}); photo stored without a model answer.")
            version = label = conf = None
        if training_data.collect(conn, farmer_id=f["id"], diagnosis_id=None, image=data, capture_source="camera",
                                 crop="wheat", woreda_pcode=f["pcode"], altitude_m=f["alt"], model_version=version,
                                 model_label=label, model_confidence=conf):
            added += 1
    print(f"Training dataset: {added} demo photo(s) from farmers who agreed "
          f"({len(agreed)} of {len(farmers)} demo farmers gave the training consent).")


def seed_tips(conn) -> None:
    """Today's tips from the cited crop calendar (no AI request), left as drafts for the agronomist."""
    made = tips.draft_day(conn, local_now().date(), llm=None, count=3)
    print(f"Daily tips: {len(made)} draft(s) for today from the crop calendar — approve them as the agronomist "
          f"(0944000006) to show them on the dashboards.")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-photos", action="store_true", help="skip the disease-model call for the dataset photos")
    ap.add_argument("--no-elevation", action="store_true", help="don't look up terrain elevation (offline)")
    args = ap.parse_args()
    conn = get_platform_connection()
    for m in (training_data, tips):
        m.ensure_schema(conn)
    if not admin_areas.get_area(conn, "ET031001"):
        print("Admin boundaries are not imported. Run scripts/import_admin_boundaries.py first.")
        return 1
    cleanup(conn)
    farmers = seed_people(conn, online=not args.no_elevation)
    seed_photo_checks(conn, farmers)
    seed_input_trust(conn, farmers)
    seed_abc(conn, farmers)
    seed_estate(conn)
    seed_ngo(conn)
    seed_lender(conn, farmers)
    if not args.no_photos:
        seed_dataset(conn, farmers)
    seed_tips(conn)
    r = run_alert_cycle(conn)          # the real alert engine on the new data
    print(f"Alert engine: {r.outbreak_alerts} outbreak, {r.follow_ups_due} follow-up, {r.stage_reminders} stage alerts.")
    print(f"Demo farmers sign in with {PHONE_PREFIX}001 … and password {PASSWORD}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
