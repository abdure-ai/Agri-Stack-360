"""
db_init.py — Initialize agri_platform.db with schema + seed data.

Run once:  python backend/db_init.py
Safe to re-run — uses CREATE TABLE IF NOT EXISTS.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.platform_db import get_platform_connection
from backend.auth import hash_password

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    phone         TEXT    UNIQUE NOT NULL,
    name          TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'farmer',
    region        TEXT,
    zone          TEXT,
    woreda        TEXT,
    language      TEXT    DEFAULT 'en',
    is_active     INTEGER DEFAULT 1,
    created_at    TEXT    DEFAULT CURRENT_TIMESTAMP,
    last_login    TEXT
);

CREATE TABLE IF NOT EXISTS farms (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_name   TEXT    NOT NULL,
    crop_name    TEXT    NOT NULL,
    variety      TEXT,
    area_ha      REAL,
    planted_date TEXT,
    status       TEXT    DEFAULT 'healthy',
    notes        TEXT,
    created_at   TEXT    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS health_reports (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id            INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id            INTEGER NOT NULL REFERENCES users(id),
    disease            TEXT    NOT NULL,
    pathogen           TEXT,
    severity           TEXT    NOT NULL,
    confidence         REAL,
    visual_cues        TEXT,
    recommended_action TEXT,
    follow_up_date     TEXT,
    resolved           INTEGER DEFAULT 0,
    ai_explanation     TEXT,
    created_at         TEXT    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    name               TEXT    NOT NULL,
    region             TEXT    NOT NULL,
    zone               TEXT,
    phone              TEXT,
    product_categories TEXT,
    products           TEXT,
    rating             REAL    DEFAULT 4.0,
    distance_km        REAL,
    active             INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS loan_products (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    lender           TEXT    NOT NULL,
    product_name     TEXT    NOT NULL,
    max_amount       REAL    NOT NULL,
    interest_rate    REAL    NOT NULL,
    term_months      INTEGER NOT NULL,
    min_credit_score INTEGER DEFAULT 0,
    eligible_roles   TEXT    DEFAULT '["farmer","agent"]',
    active           INTEGER DEFAULT 1
);
"""

SEED_USERS = [
    {
        "phone": "0900000001",
        "name": "Admin User",
        "password": "admin123",
        "role": "admin",
        "region": "Oromia",
    },
    {
        "phone": "0911234567",
        "name": "Abdurezak Gemechu",
        "password": "farmer123",
        "role": "farmer",
        "region": "Oromia",
        "zone": "Jimma",
        "woreda": "Gomma",
    },
    {
        "phone": "0922345678",
        "name": "Tigist Alemu",
        "password": "agent123",
        "role": "agent",
        "region": "Amhara",
        "zone": "North Gondar",
    },
    {
        "phone": "0933456789",
        "name": "Dawit Bekele",
        "password": "trader123",
        "role": "trader",
        "region": "Oromia",
        "zone": "West Hararghe",
    },
]

SEED_FARMS = [
    # Abdurezak's farms (user_id=2)
    {
        "user_id": 2,
        "field_name": "Field 1 — Hirna",
        "crop_name": "Maize",
        "variety": "BH660",
        "area_ha": 2.0,
        "planted_date": "2026-07-04",
        "status": "warning",
        "notes": "Northern Leaf Blight detected",
    },
    {
        "user_id": 2,
        "field_name": "Field 2 — Kersa",
        "crop_name": "Coffee",
        "variety": "Jimma 74110",
        "area_ha": 1.5,
        "planted_date": "2024-06-20",
        "status": "healthy",
        "notes": "Year 2 — harvest expected Oct 2026",
    },
]

SEED_HEALTH_REPORTS = [
    {
        "farm_id": 1,
        "user_id": 2,
        "disease": "Northern Leaf Blight (NLB)",
        "pathogen": "Exserohilum turcicum",
        "severity": "moderate",
        "confidence": 87.0,
        "visual_cues": json.dumps([
            "Long, cigar-shaped gray-green lesions on lower leaves",
            "Lesions with wavy, diffuse borders (not angular)",
            "Older lesions turning tan/brown with dark spore masses",
            "Progressive upward movement from lower canopy",
        ]),
        "recommended_action": "Apply Mancozeb 80WP at 2.5g/litre water. Spray every 7–10 days for 2–3 applications.",
        "follow_up_date": "2026-08-28",
        "resolved": 0,
        "ai_explanation": "Northern Leaf Blight spreads rapidly in wet conditions and can reduce your maize yield by up to 50% if untreated. Apply the fungicide now and remove the most heavily infected lower leaves.",
    },
]

SEED_SUPPLIERS = [
    {
        "name": "AgroServe Jimma",
        "region": "Oromia",
        "zone": "Jimma",
        "phone": "+251 47 334 5566",
        "product_categories": json.dumps(["Fungicide", "Fertilizer", "Seeds"]),
        "products": json.dumps([
            {"name": "Mancozeb 80WP", "brand": "Indofil", "unit": "500g", "price": 185, "stock": "In Stock", "category": "Fungicide"},
            {"name": "Urea Fertilizer 46%N", "brand": "EABC", "unit": "50kg bag", "price": 2400, "stock": "In Stock", "category": "Fertilizer"},
            {"name": "BH660 Maize Seed", "brand": "ETBC", "unit": "10kg bag", "price": 850, "stock": "In Stock", "category": "Seeds"},
        ]),
        "rating": 4.6,
        "distance_km": 4.2,
    },
    {
        "name": "Green Field Agro-Input",
        "region": "Oromia",
        "zone": "Jimma",
        "phone": "+251 91 778 2211",
        "product_categories": json.dumps(["Fungicide", "Herbicide"]),
        "products": json.dumps([
            {"name": "Mancozeb 80WP", "brand": "Dow AgroSciences", "unit": "500g", "price": 210, "stock": "In Stock", "category": "Fungicide"},
            {"name": "Glyphosate 41%", "brand": "Generic", "unit": "1L", "price": 320, "stock": "Low Stock", "category": "Herbicide"},
        ]),
        "rating": 4.4,
        "distance_km": 1.8,
    },
    {
        "name": "Oromia Agri-Input Cooperative",
        "region": "Oromia",
        "zone": "East Wellega",
        "phone": "+251 47 445 9900",
        "product_categories": json.dumps(["Fungicide", "Fertilizer", "Seeds"]),
        "products": json.dumps([
            {"name": "Mancozeb 75WP", "brand": "Generic (local)", "unit": "1kg", "price": 320, "stock": "Low Stock", "category": "Fungicide"},
            {"name": "DAP Fertilizer", "brand": "EABC", "unit": "50kg bag", "price": 2800, "stock": "In Stock", "category": "Fertilizer"},
        ]),
        "rating": 3.9,
        "distance_km": 9.5,
    },
    {
        "name": "Amhara Farm Input Hub",
        "region": "Amhara",
        "zone": "North Gondar",
        "phone": "+251 58 220 3344",
        "product_categories": json.dumps(["Fungicide", "Fertilizer", "Seeds", "Herbicide"]),
        "products": json.dumps([
            {"name": "Mancozeb 80WP", "brand": "Indofil", "unit": "500g", "price": 195, "stock": "In Stock", "category": "Fungicide"},
            {"name": "Urea Fertilizer 46%N", "brand": "EABC", "unit": "50kg bag", "price": 2350, "stock": "In Stock", "category": "Fertilizer"},
            {"name": "Teff Seed (Magna)", "brand": "Local", "unit": "10kg", "price": 650, "stock": "In Stock", "category": "Seeds"},
        ]),
        "rating": 4.5,
        "distance_km": 6.0,
    },
    {
        "name": "SNNP Agro Solutions",
        "region": "SNNP",
        "zone": "Wolaita",
        "phone": "+251 46 551 2233",
        "product_categories": json.dumps(["Fungicide", "Seeds"]),
        "products": json.dumps([
            {"name": "Copper Oxychloride", "brand": "Agriphar", "unit": "500g", "price": 240, "stock": "In Stock", "category": "Fungicide"},
            {"name": "Coffee Seedlings (74110)", "brand": "Jimma ARC", "unit": "100 seedlings", "price": 1200, "stock": "In Stock", "category": "Seeds"},
        ]),
        "rating": 4.2,
        "distance_km": 3.5,
    },
    {
        "name": "Tigray Agricultural Supplies",
        "region": "Tigray",
        "zone": "Central Tigray",
        "phone": "+251 34 441 5566",
        "product_categories": json.dumps(["Fertilizer", "Seeds", "Herbicide"]),
        "products": json.dumps([
            {"name": "Urea Fertilizer 46%N", "brand": "EABC", "unit": "50kg bag", "price": 2500, "stock": "In Stock", "category": "Fertilizer"},
            {"name": "Teff Seed (DZ-01-196)", "brand": "ATA", "unit": "10kg", "price": 700, "stock": "In Stock", "category": "Seeds"},
        ]),
        "rating": 4.1,
        "distance_km": 5.2,
    },
]

SEED_LOAN_PRODUCTS = [
    {
        "lender": "Oromia Cooperative Bank",
        "product_name": "Seasonal Input Loan",
        "max_amount": 25000,
        "interest_rate": 12.0,
        "term_months": 6,
        "min_credit_score": 40,
        "eligible_roles": json.dumps(["farmer", "agent"]),
    },
    {
        "lender": "Amhara Bank",
        "product_name": "Agricultural Micro-Loan",
        "max_amount": 50000,
        "interest_rate": 14.5,
        "term_months": 12,
        "min_credit_score": 50,
        "eligible_roles": json.dumps(["farmer", "agent", "trader"]),
    },
    {
        "lender": "Development Bank of Ethiopia",
        "product_name": "Medium-Term Farm Investment",
        "max_amount": 200000,
        "interest_rate": 8.5,
        "term_months": 36,
        "min_credit_score": 65,
        "eligible_roles": json.dumps(["farmer", "trader"]),
    },
    {
        "lender": "ATI Innovation Fund",
        "product_name": "Agri-Tech Starter Grant",
        "max_amount": 100000,
        "interest_rate": 0.0,
        "term_months": 24,
        "min_credit_score": 55,
        "eligible_roles": json.dumps(["farmer", "agent", "trader"]),
    },
]


def init_db():
    conn = get_platform_connection()
    conn.executescript(SCHEMA)
    conn.commit()
    print("✓ Schema created.")

    # Seed users (skip if phone already exists)
    for u in SEED_USERS:
        existing = conn.execute("SELECT id FROM users WHERE phone=?", (u["phone"],)).fetchone()
        if not existing:
            conn.execute(
                "INSERT INTO users (phone, name, password_hash, role, region, zone, woreda) VALUES (?,?,?,?,?,?,?)",
                (
                    u["phone"], u["name"], hash_password(u["password"]),
                    u["role"], u.get("region"), u.get("zone"), u.get("woreda"),
                ),
            )
            print(f"  + User: {u['name']} ({u['role']})")

    # Seed farms
    for f in SEED_FARMS:
        existing = conn.execute(
            "SELECT id FROM farms WHERE user_id=? AND field_name=?", (f["user_id"], f["field_name"])
        ).fetchone()
        if not existing:
            conn.execute(
                "INSERT INTO farms (user_id, field_name, crop_name, variety, area_ha, planted_date, status, notes) VALUES (?,?,?,?,?,?,?,?)",
                (f["user_id"], f["field_name"], f["crop_name"], f.get("variety"), f.get("area_ha"), f.get("planted_date"), f["status"], f.get("notes")),
            )
            print(f"  + Farm: {f['field_name']}")

    # Seed health reports
    for r in SEED_HEALTH_REPORTS:
        existing = conn.execute("SELECT id FROM health_reports WHERE farm_id=? AND disease=?", (r["farm_id"], r["disease"])).fetchone()
        if not existing:
            conn.execute(
                "INSERT INTO health_reports (farm_id, user_id, disease, pathogen, severity, confidence, visual_cues, recommended_action, follow_up_date, resolved, ai_explanation) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (r["farm_id"], r["user_id"], r["disease"], r.get("pathogen"), r["severity"], r.get("confidence"), r.get("visual_cues"), r.get("recommended_action"), r.get("follow_up_date"), r["resolved"], r.get("ai_explanation")),
            )
            print(f"  + Health report: {r['disease']}")

    # Seed suppliers
    for s in SEED_SUPPLIERS:
        existing = conn.execute("SELECT id FROM suppliers WHERE name=? AND region=?", (s["name"], s["region"])).fetchone()
        if not existing:
            conn.execute(
                "INSERT INTO suppliers (name, region, zone, phone, product_categories, products, rating, distance_km) VALUES (?,?,?,?,?,?,?,?)",
                (s["name"], s["region"], s.get("zone"), s.get("phone"), s.get("product_categories"), s.get("products"), s.get("rating", 4.0), s.get("distance_km")),
            )
            print(f"  + Supplier: {s['name']}")

    # Seed loan products
    for lp in SEED_LOAN_PRODUCTS:
        existing = conn.execute("SELECT id FROM loan_products WHERE lender=? AND product_name=?", (lp["lender"], lp["product_name"])).fetchone()
        if not existing:
            conn.execute(
                "INSERT INTO loan_products (lender, product_name, max_amount, interest_rate, term_months, min_credit_score, eligible_roles) VALUES (?,?,?,?,?,?,?)",
                (lp["lender"], lp["product_name"], lp["max_amount"], lp["interest_rate"], lp["term_months"], lp["min_credit_score"], lp["eligible_roles"]),
            )
            print(f"  + Loan product: {lp['product_name']} ({lp['lender']})")

    conn.commit()
    print("\n✓ agri_platform.db initialized successfully.")
    print("\nDemo accounts:")
    print("  Admin:   0900000001 / admin123")
    print("  Farmer:  0911234567 / farmer123")
    print("  Agent:   0922345678 / agent123")
    print("  Trader:  0933456789 / trader123")


if __name__ == "__main__":
    init_db()
