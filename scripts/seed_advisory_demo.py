"""
Seed the advisory demo: one farmer and one Development Agent in Dewa Cheffa
woreda (ET031001, Oromo Nationality Administration, Amhara), with an irrigated
wheat plot and an active crop season.

    python scripts/seed_advisory_demo.py                  # wheat planted 35 days ago
    python scripts/seed_advisory_demo.py --days-after-planting 50
    python scripts/seed_advisory_demo.py --outbreak         # + simulated yellow-rust scans nearby (F7 demo)
    python scripts/seed_advisory_demo.py --reset --outbreak # clean slate for the pitch (clears the demo
                                                            # farmer's diagnoses, alerts and conversations)
    python scripts/seed_advisory_demo.py --da-inbox         # + a second demo farmer with two open cases
                                                            # in the DA's escalation inbox (DA Copilot demo)
    python scripts/seed_advisory_demo.py --input-trust      # + a placeholder supplier with one code batch

Safe to re-run: accounts are matched by phone and updated in place. Everything
is labelled DEMO. The kebele is a placeholder (the boundaries data stops at
woreda); the farm point is the woreda's official centre.

Logins:  farmer 0944000001 / demo1234      DA 0944000002 / demo1234
         second farmer (DA inbox demo) 0944000003 / demo1234
         woreda office, read-only reports (government role) 0944000004 / demo1234
         supplier staff (Input Trust demo) 0944000005 / demo1234
         agronomist / content reviewer 0944000006 / demo1234
         agro-dealer shop staff (Input Trust demo) 0944000007 / demo1234
         ABC manager (with --da-inbox: Demo Farmer 2 is a member) 0944000008 / demo1234
         commercial farm manager (with --input-trust) 0944000009 / demo1234
         regulator (EAA, read-only) 0944000010 / demo1234
         NGO project staff (with --input-trust) 0944000011 / demo1234
         lender / MFI officer (with --input-trust; asks Demo Farmer 2 to share) 0944000012 / demo1234
"""

import argparse
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend import admin_areas  # noqa: E402
from backend.advisory.schema import ensure_schema  # noqa: E402
from backend.auth import hash_password  # noqa: E402
from backend.platform_db import get_platform_connection  # noqa: E402

WOREDA = "ET031001"   # Dewa Cheffa
PASSWORD = "demo1234"
# Presentation accounts: fictional people with ordinary names (the sign-in page says the site holds sample records).
FARMER = {"phone": "0944000001", "name": "Ahmed Ali Yimer", "role": "farmer", "language": "am"}
DA = {"phone": "0944000002", "name": "Kedir Hussen", "role": "agent", "language": "am"}
NGO_STAFF = {"phone": "0944000011", "name": "Hanna Tesfaye", "role": "ngo_staff", "language": "en"}
LENDER = {"phone": "0944000012", "name": "Mekdes Alemu", "role": "lender", "language": "en"}
REGULATOR = {"phone": "0944000010", "name": "Dawit Bekele", "role": "regulator", "language": "en"}
FARM_MANAGER = {"phone": "0944000009", "name": "Solomon Girma", "role": "farm_manager", "language": "en"}
ABC_MANAGER = {"phone": "0944000008", "name": "Mohammed Seid", "role": "abc_manager", "language": "am"}
DEALER = {"phone": "0944000007", "name": "Fatuma Yimam", "role": "agro_dealer", "language": "am"}
AGRONOMIST = {"phone": "0944000006", "name": "Tsegaye Mekonnen", "role": "agronomist", "language": "en"}
SUPPLIER = {"phone": "0944000005", "name": "Yonas Haile", "role": "supplier", "language": "en"}
GOV = {"phone": "0944000004", "name": "Zeineba Abdu", "role": "government", "language": "am"}
FARMER_2 = {"phone": "0944000003", "name": "Amina Mohammed", "role": "farmer", "language": "am"}
NEIGHBOURS = ["Hussen Ahmed", "Zeyneb Ali", "Yimer Seid", "Mariam Hassen"]

# Organisations: (current name, earlier names it may still have in an existing database, note).
ORG_SUPPLIER = ("Abay Agro-Inputs PLC", ("PLACEHOLDER Demo Supplier PLC",), "Crop protection and seed supplier")
ORG_SHOP = ("Kemise Farmers' Agro Shop", ("PLACEHOLDER Demo Agro Shop",), "Agro-input retail shop")
ORG_ABC = ("Dewa Cheffa Irrigated Wheat ABC", ("PLACEHOLDER Demo ABC (Dewa Cheffa)",), "Farmers' agribusiness company")
ORG_ESTATE = ("Borkena Valley Farm PLC", ("PLACEHOLDER Demo Estate",), "Irrigated wheat farm")
ORG_NGO = ("Rural Harvest Initiative", ("PLACEHOLDER Demo NGO",), "Agricultural development NGO")
BATCH_1 = ("AB-2026-01", "DEMO-2026-01")      # current and earlier batch number
PLOT = ("Irrigated wheat plot", "Demo irrigated wheat plot")
PLOT_2 = ("Wheat plot by the canal", "Demo plot 2")


def kebele(n: int) -> str:
    return f"{n:02d} Kebele"


def org_id_for(conn, org: tuple, type_: str) -> int:
    """The organisation by its current or an earlier name (renamed if needed), else a new one."""
    name, old, note = org
    names = (name, *old)
    row = conn.execute(f"SELECT id FROM organisations WHERE name IN ({','.join('?' * len(names))}) ORDER BY id",
                       names).fetchone()
    if row:
        conn.execute("UPDATE organisations SET name=?, note=? WHERE id=?", (name, note, row[0]))
        return row[0]
    return conn.execute("INSERT INTO organisations (name, type, note) VALUES (?, ?, ?)", (name, type_, note)).lastrowid


def upsert_user(conn, u: dict, chain: list) -> int:
    region, zone, woreda = chain
    row = conn.execute("SELECT id FROM users WHERE phone=?", (u["phone"],)).fetchone()
    values = (u["name"], u["role"], region.name, zone.name, woreda.name, u["language"],
              region.pcode, zone.pcode, woreda.pcode)
    if row:
        conn.execute("""UPDATE users SET name=?, role=?, region=?, zone=?, woreda=?, language=?, region_pcode=?,
                        zone_pcode=?, woreda_pcode=?, is_active=1 WHERE id=?""", (*values, row[0]))
        return row[0]
    return conn.execute(
        """INSERT INTO users (phone, password_hash, name, role, region, zone, woreda, language,
                              region_pcode, zone_pcode, woreda_pcode) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (u["phone"], hash_password(PASSWORD), *values),
    ).lastrowid


def seed_outbreak(conn, chain, woreda) -> None:
    """Simulated yellow-rust scans on demo neighbour farms north of the demo farm (replaced on each run)."""
    from datetime import datetime, timedelta

    now = datetime.now()
    with conn:
        conn.execute("DELETE FROM diagnoses WHERE source='simulated' AND farmer_id IN "
                     "(SELECT id FROM users WHERE phone LIKE '094400010_')")
        for i, km in enumerate((2.0, 3.5, 5.0, 6.5), start=1):
            neighbour = {"phone": f"09440001{i:02d}", "name": NEIGHBOURS[(i - 1) % len(NEIGHBOURS)], "role": "farmer",
                         "language": "am"}
            nid = upsert_user(conn, neighbour, chain)
            conn.execute("UPDATE users SET is_active=0 WHERE id=?", (nid,))   # cannot sign in
            conn.execute(
                """INSERT INTO diagnoses (farmer_id, disease_key, model_label, confidence, latitude, longitude, source,
                                          created_at)
                   VALUES (?, 'yellow_rust', 'Yellow Rust', 0.9, ?, ?, 'simulated', ?)""",
                (nid, woreda.latitude + km / 111.0, woreda.longitude,
                 (now - timedelta(days=i)).isoformat(sep=" ", timespec="seconds")),
            )
    print("Simulated outbreak: 4 yellow-rust scans 2-7 km north of the demo farm (source='simulated').")


def seed_da_inbox(conn, chain, woreda, da_id: int) -> None:
    """A second demo farmer with two open cases for the DA (replaced on each run). Kept off the main demo
    farmer so the pitch farmer's advisor context and recorded answers do not change."""
    from datetime import datetime, timedelta

    now = datetime.now()
    stamp = lambda days: (now - timedelta(days=days)).isoformat(sep=" ", timespec="seconds")  # noqa: E731
    with conn:
        fid = upsert_user(conn, FARMER_2, chain)
        # Altitude: the terrain elevation already cached for the woreda centre (same band as the demo farm).
        from backend.advisory.adapters.weather import cached_elevation

        altitude = cached_elevation(woreda.latitude, woreda.longitude)
        conn.execute(
            """INSERT INTO farmer_profiles (user_id, kebele, latitude, longitude, altitude_m, assigned_da_id, consent_data,
                                            consent_alerts, consent_recorded_at)
               VALUES (?, '03 Kebele', ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)
               ON CONFLICT(user_id) DO UPDATE SET assigned_da_id=excluded.assigned_da_id, altitude_m=excluded.altitude_m,
                 kebele=excluded.kebele,
                 consent_data=1, consent_alerts=1, updated_at=CURRENT_TIMESTAMP""",
            (fid, woreda.latitude + 0.01, woreda.longitude, altitude, da_id))
        # A demo irrigated wheat plot (planted 50 days ago) so the ABC and DA screens have a crop to show.
        farm = conn.execute("SELECT id FROM farms WHERE user_id=? AND field_name IN (?, ?)", (fid, *PLOT_2)).fetchone()
        farm_id = farm[0] if farm else conn.execute(
            """INSERT INTO farms (user_id, field_name, crop_name, area_ha, planted_date, status, notes, irrigated)
               VALUES (?, ?, 'wheat', 0.75, date('now', '-50 days'), 'healthy', NULL, 1)""",
            (fid, PLOT_2[0])).lastrowid
        conn.execute("UPDATE farms SET field_name=?, notes=NULL WHERE id=?", (PLOT_2[0], farm_id))
        conn.execute("DELETE FROM crop_seasons WHERE farm_id=?", (farm_id,))
        conn.execute("INSERT INTO crop_seasons (farm_id, crop, planting_date, season, status) "
                     "VALUES (?, 'wheat', date('now', '-50 days'), 'irrigated', 'active')", (farm_id,))
        for table, col in (("escalations", "farmer_id"), ("diagnoses", "farmer_id"), ("alerts", "farmer_id")):
            conn.execute(f"DELETE FROM {table} WHERE {col}=?", (fid,))
        conn.execute("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id=?)", (fid,))
        conn.execute("DELETE FROM conversations WHERE user_id=?", (fid,))
        if not conn.execute("SELECT 1 FROM consent_events WHERE user_id=?", (fid,)).fetchone():
            from backend.consent import CONSENT_TEXT_VERSION
            for kind in ("data", "alerts"):
                conn.execute("INSERT INTO consent_events (user_id, kind, granted, recorded_by, method, text_version) "
                             "VALUES (?,?,1,?, 'da_verbal', ?)", (fid, kind, da_id, CONSENT_TEXT_VERSION))
        # 1) An unsure photo check (photo and farm conditions disagreed) -> the DA should look and verify.
        did = conn.execute(
            """INSERT INTO diagnoses (farmer_id, disease_key, model_label, confidence, latitude, longitude, source,
                                      created_at) VALUES (?, 'septoria_tritici_blotch', 'Septoria', 0.48, ?, ?,
                                      'simulated', ?)""", (fid, woreda.latitude + 0.01, woreda.longitude, stamp(2))).lastrowid
        conn.execute("INSERT INTO escalations (diagnosis_id, farmer_id, reason, assigned_to, created_at) "
                     "VALUES (?, ?, 'low_confidence', ?, ?)", (did, fid, da_id, stamp(2)))
        # 2) A question the manuals do not answer.
        cid = conn.execute("INSERT INTO conversations (user_id, subject_farmer_id, channel, language, created_at) "
                           "VALUES (?, ?, 'app', 'en', ?)", (fid, fid, stamp(1))).lastrowid
        mid = conn.execute(
            """INSERT INTO messages (conversation_id, question, language, answer, confidence, escalated, created_at)
               VALUES (?, 'Can I keep my harvested wheat in plastic bags, or do I need hermetic bags?', 'en',
                       'I could not answer this from the approved guidelines. Your question has been sent to your Development Agent.', 'low', 1, ?)""", (cid, stamp(1))).lastrowid
        conn.execute("INSERT INTO escalations (message_id, farmer_id, reason, assigned_to, created_at) "
                     "VALUES (?, ?, 'no_knowledge', ?, ?)", (mid, fid, da_id, stamp(1)))
    seed_abc(conn, chain, fid)
    print(f"DA inbox demo: farmer {FARMER_2['phone']} with 2 open cases for the DA (simulated photo check + question).")


def seed_abc(conn, chain, member_id: int) -> None:
    """A demo ABC in Dewa Cheffa with Demo Farmer 2 as an accepted member, and one demo buy request."""
    from backend.routers import abc

    abc.ensure_schema(conn)
    with conn:
        mid = upsert_user(conn, ABC_MANAGER, chain)
        org_id = org_id_for(conn, ORG_ABC, "abc")
        conn.execute("UPDATE organisations SET status='active', woreda_pcode=? WHERE id=?", (chain[-1].pcode, org_id))
        conn.execute("INSERT OR IGNORE INTO organisation_members (org_id, user_id, member_role) VALUES (?,?, 'owner')", (org_id, mid))
        conn.execute("""INSERT INTO abc_members (org_id, farmer_id, status, invited_by, invited_at, joined_at)
                        VALUES (?, ?, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        ON CONFLICT(org_id, farmer_id) DO UPDATE SET status='active'""", (org_id, member_id, mid))
        trader = conn.execute("SELECT id FROM users WHERE role='trader' AND is_active=1 ORDER BY id LIMIT 1").fetchone()
        conn.execute("UPDATE buy_requests SET note='Clean, dry grain; delivery to Kombolcha' WHERE note='DEMO request'")
        if trader and not conn.execute("SELECT 1 FROM buy_requests WHERE trader_id=? AND quantity_qt=50", (trader[0],)).fetchone():
            conn.execute("""INSERT INTO buy_requests (trader_id, crop, quantity_qt, region_pcode, note, created_at)
                            VALUES (?, 'wheat', 50, ?, 'Clean, dry grain; delivery to Kombolcha', CURRENT_TIMESTAMP)""",
                         (trader[0], chain[0].pcode))


def seed_input_trust(conn, chain) -> None:
    """A placeholder supplier with two products and one batch code (kept across runs)."""
    from backend import input_trust

    input_trust.ensure_schema(conn)
    with conn:
        uid = upsert_user(conn, SUPPLIER, chain)
        org_id = org_id_for(conn, ORG_SUPPLIER, "supplier")
        conn.execute("UPDATE organisations SET status='active' WHERE id=?", (org_id,))
        conn.execute("INSERT OR IGNORE INTO organisation_members (org_id, user_id, member_role) VALUES (?,?, 'owner')",
                     (org_id, uid))
        products = [r[0] for r in conn.execute(
            "SELECT id FROM approved_products WHERE status='registered' AND category='fungicide' ORDER BY id LIMIT 2")]
        for pid in products:
            conn.execute("INSERT OR IGNORE INTO org_products (org_id, product_id) VALUES (?, ?)", (org_id, pid))
        conn.execute("UPDATE code_batches SET batch_number=? WHERE org_id=? AND batch_number=?", (*BATCH_1[:1], org_id, BATCH_1[1]))
        batch = conn.execute("SELECT code FROM code_batches WHERE org_id=? AND batch_number=?", (org_id, BATCH_1[0])).fetchone()
        if not batch and products:
            code = input_trust.new_code(conn)
            conn.execute(
                """INSERT INTO code_batches (org_id, product_id, batch_number, units, manufactured_on, expires_on, code,
                                           created_by) VALUES (?, ?, ?, 500, date('now', '-30 days'),
                                           date('now', '+700 days'), ?, ?)""", (org_id, products[0], BATCH_1[0], code, uid))
            batch = (code,)
        conn.execute("UPDATE code_batches SET status='active' WHERE org_id=? AND batch_number=?", (org_id, BATCH_1[0]))
        # A verified demo shop in Dewa Cheffa selling the first placeholder product.
        did = upsert_user(conn, DEALER, chain)
        shop_id = org_id_for(conn, ORG_SHOP, "agro_dealer")
        conn.execute("UPDATE organisations SET status='active', verified=1, verified_at=CURRENT_TIMESTAMP, woreda_pcode=? "
                     "WHERE id=?", (chain[-1].pcode, shop_id))
        conn.execute("INSERT OR IGNORE INTO organisation_members (org_id, user_id, member_role) VALUES (?,?, 'owner')",
                     (shop_id, did))
        if products:
            conn.execute("INSERT OR REPLACE INTO shop_products (org_id, product_id, in_stock, updated_at) "
                         "VALUES (?, ?, 1, CURRENT_TIMESTAMP)", (shop_id, products[0]))
    print(f"Input Trust demo: supplier {SUPPLIER['phone']}, batch {BATCH_1[0]}, code {batch[0] if batch else '-'} "
          "(try a typo of it to see a warning).")


def seed_estate(conn, chain) -> None:
    """A demo commercial farm in Dewa Cheffa with two wheat blocks (kept across runs)."""
    from backend.routers import estate

    estate.ensure_schema(conn)
    with conn:
        uid = upsert_user(conn, FARM_MANAGER, chain)
        org_id = org_id_for(conn, ORG_ESTATE, "commercial_farm")
        conn.execute("UPDATE estate_blocks SET name='Block A - North' WHERE org_id=? AND name='Block A (DEMO)'", (org_id,))
        conn.execute("UPDATE estate_blocks SET name='Block B - River' WHERE org_id=? AND name='Block B (DEMO)'", (org_id,))
        conn.execute("UPDATE organisations SET status='active', woreda_pcode=? WHERE id=?", (chain[-1].pcode, org_id))
        conn.execute("INSERT OR IGNORE INTO organisation_members (org_id, user_id, member_role) VALUES (?,?, 'owner')", (org_id, uid))
        if not conn.execute("SELECT 1 FROM estate_blocks WHERE org_id=?", (org_id,)).fetchone():
            for name, ha, days in (("Block A - North", 40, 40), ("Block B - River", 25, 20)):
                conn.execute("""INSERT INTO estate_blocks (org_id, name, area_ha, crop, season, planting_date, woreda_pcode,
                                  status, created_at) VALUES (?, ?, ?, 'wheat', 'irrigated', date('now', ?), ?, 'active',
                                  CURRENT_TIMESTAMP)""", (org_id, name, ha, f"-{days} days", chain[-1].pcode))
    print(f"Commercial farm demo: manager {FARM_MANAGER['phone']}, 2 wheat blocks.")


def seed_ngo(conn, chain) -> None:
    """A demo NGO with one project covering Dewa Cheffa (kept across runs)."""
    from backend.routers import ngo

    ngo.ensure_schema(conn)
    with conn:
        uid = upsert_user(conn, NGO_STAFF, chain)
        org_id = org_id_for(conn, ORG_NGO, "ngo")
        conn.execute("""UPDATE ngo_projects SET name='Wheat Rust Awareness Programme',
                        description='Rust scouting and early-warning messages for irrigated wheat farmers'
                        WHERE org_id=? AND name='Wheat rust awareness (DEMO)'""", (org_id,))
        conn.execute("UPDATE organisations SET status='active' WHERE id=?", (org_id,))
        conn.execute("INSERT OR IGNORE INTO organisation_members (org_id, user_id, member_role) VALUES (?,?, 'owner')", (org_id, uid))
        project = conn.execute("SELECT id FROM ngo_projects WHERE org_id=?", (org_id,)).fetchone()
        pid = project[0] if project else conn.execute(
            """INSERT INTO ngo_projects (org_id, name, description, start_date, created_at)
               VALUES (?, 'Wheat Rust Awareness Programme',
                       'Rust scouting and early-warning messages for irrigated wheat farmers', date('now', '-60 days'),
                       CURRENT_TIMESTAMP)""",
            (org_id,)).lastrowid
        conn.execute("INSERT OR IGNORE INTO ngo_project_areas (project_id, woreda_pcode) VALUES (?, ?)", (pid, chain[-1].pcode))
    print(f"NGO demo: staff {NGO_STAFF['phone']}, project covering {chain[-1].name}.")


def seed_lender(conn, chain) -> None:
    """A demo lender with one waiting credit-profile request to Demo Farmer 2 (reset to waiting each run)."""
    from backend.routers import credit

    credit.ensure_schema(conn)
    with conn:
        uid = upsert_user(conn, LENDER, chain)
        conn.execute("DELETE FROM credit_requests WHERE lender_id=?", (uid,))
        farmer2 = conn.execute("SELECT id FROM users WHERE phone='0944000003' AND is_active=1").fetchone()
        if farmer2:
            conn.execute("""INSERT INTO credit_requests (lender_id, farmer_id, phone, purpose, requested_at)
                            VALUES (?, ?, '0944000003', 'Input loan for the next season', datetime('now', 'localtime'))""",
                         (uid, farmer2[0]))
    print(f"Lender demo: {LENDER['phone']}" + (", waiting request to Demo Farmer 2." if farmer2 else "."))


def reset_activity(conn, farmer_id: int) -> None:
    """Remove the demo farmer's history so the pitch starts clean. Recorded LLM answers are kept."""
    with conn:
        counts = {
            "escalations": conn.execute("DELETE FROM escalations WHERE farmer_id=?", (farmer_id,)).rowcount,
            "alerts": conn.execute("DELETE FROM alerts WHERE farmer_id=?", (farmer_id,)).rowcount,
            "diagnoses": conn.execute("DELETE FROM diagnoses WHERE farmer_id=?", (farmer_id,)).rowcount,
            "messages": conn.execute("DELETE FROM messages WHERE conversation_id IN "
                                     "(SELECT id FROM conversations WHERE user_id=?)", (farmer_id,)).rowcount,
            "conversations": conn.execute("DELETE FROM conversations WHERE user_id=?", (farmer_id,)).rowcount,
        }
    print("Reset demo farmer: " + ", ".join(f"{n} {k}" for k, n in counts.items()))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days-after-planting", type=int, default=35)
    ap.add_argument("--outbreak", action="store_true",
                    help="add simulated yellow-rust scans on 4 demo neighbour farms within 2-7 km (source='simulated')")
    ap.add_argument("--da-inbox", action="store_true",
                    help="add a second demo farmer with two open cases in the DA's escalation inbox")
    ap.add_argument("--input-trust", action="store_true",
                    help="add a placeholder supplier organisation with one code batch (Input Trust demo)")
    ap.add_argument("--reset", action="store_true",
                    help="clear the demo farmer's diagnoses, alerts, escalations and conversations first")
    args = ap.parse_args()

    conn = get_platform_connection()
    admin_areas.ensure_schema(conn)
    ensure_schema(conn)
    chain = admin_areas.lineage(conn, WOREDA)
    if len(chain) != 3:
        print("Admin boundaries are not imported. Run scripts/import_admin_boundaries.py first.")
        return 1
    woreda = chain[-1]

    with conn:
        farmer_id = upsert_user(conn, FARMER, chain)
        da_id = upsert_user(conn, DA, chain)
        upsert_user(conn, GOV, chain)          # reports for Dewa Cheffa woreda only, aggregated
        upsert_user(conn, AGRONOMIST, chain)   # receives cases DAs forward
        upsert_user(conn, REGULATOR, chain)    # national counterfeit map, registry, code issuance
        conn.execute(
            """INSERT INTO farmer_profiles (user_id, kebele, latitude, longitude, altitude_m, assigned_da_id,
                                            consent_data, consent_alerts, consent_recorded_at, alert_channel)
               VALUES (?, '03 Kebele', ?, ?, NULL, ?, 1, 1, CURRENT_TIMESTAMP, 'app')
               ON CONFLICT(user_id) DO UPDATE SET latitude=excluded.latitude, longitude=excluded.longitude,
                 kebele=excluded.kebele,
                 assigned_da_id=excluded.assigned_da_id, consent_data=1, consent_alerts=1,
                 updated_at=CURRENT_TIMESTAMP""",
            (farmer_id, woreda.latitude, woreda.longitude, da_id),
        )
        farm = conn.execute("SELECT id FROM farms WHERE user_id=? AND field_name IN (?, ?)",
                            (farmer_id, *PLOT)).fetchone()
        planted = date.today() - timedelta(days=args.days_after_planting)
        if farm:
            farm_id = farm[0]
            conn.execute("UPDATE farms SET planted_date=?, irrigated=1, field_name=?, notes=NULL WHERE id=?",
                         (planted.isoformat(), PLOT[0], farm_id))
        else:
            farm_id = conn.execute(
                """INSERT INTO farms (user_id, field_name, crop_name, variety, area_ha, planted_date, status, notes, irrigated)
                   VALUES (?, ?, 'wheat', NULL, 0.5, ?, 'healthy', NULL, 1)""",
                (farmer_id, PLOT[0], planted.isoformat()),
            ).lastrowid
        conn.execute("DELETE FROM crop_seasons WHERE farm_id=?", (farm_id,))
        conn.execute(
            "INSERT INTO crop_seasons (farm_id, crop, variety, planting_date, season, status) VALUES (?, 'wheat', NULL, ?, 'irrigated', 'active')",
            (farm_id, planted.isoformat()),
        )

    if args.reset:
        reset_activity(conn, farmer_id)
    if args.outbreak:
        seed_outbreak(conn, chain, woreda)
    if args.da_inbox:
        seed_da_inbox(conn, chain, woreda, da_id)
    if args.input_trust:
        seed_input_trust(conn, chain)
        seed_estate(conn, chain)
        seed_ngo(conn, chain)
        seed_lender(conn, chain)

    print(f"Demo farmer id {farmer_id} ({FARMER['phone']}), DA id {da_id} ({DA['phone']}), password {PASSWORD}")
    print(f"Farm {farm_id} in {' > '.join(a.name for a in chain)} at {woreda.latitude:.4f}, {woreda.longitude:.4f}; "
          f"wheat planted {planted} ({args.days_after_planting} days ago, irrigated)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
