import sqlite3

from backend.advisory.schema import DEFAULT_SETTINGS, ensure_schema

# Minimal copies of the existing platform tables the advisory schema references.
BASE = """
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT, name TEXT, role TEXT,
                    region TEXT, zone TEXT, woreda TEXT, language TEXT);
CREATE TABLE farms (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, field_name TEXT,
                    crop_name TEXT, variety TEXT, area_ha REAL, planted_date TEXT, status TEXT);
"""


def _db():
    conn = sqlite3.connect(":memory:")
    conn.executescript(BASE)
    return conn


def test_creates_tables_and_is_idempotent():
    conn = _db()
    ensure_schema(conn)
    ensure_schema(conn)  # second run must not fail or duplicate
    tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    for t in ["farmer_profiles", "crop_seasons", "diseases", "diagnoses", "knowledge_documents",
              "knowledge_chunks", "crop_calendar_rules", "approved_products", "dosage_rules",
              "treatment_protocols", "alerts", "conversations", "messages", "escalations",
              "advisory_settings"]:
        assert t in tables, t
    farm_cols = {r[1] for r in conn.execute("PRAGMA table_info(farms)")}
    assert {"irrigated", "soil_type"} <= farm_cols
    assert conn.execute("SELECT COUNT(*) FROM advisory_settings").fetchone()[0] == len(DEFAULT_SETTINGS)


def test_agronomic_rows_default_to_placeholder():
    conn = _db()
    ensure_schema(conn)
    conn.execute(
        "INSERT INTO approved_products (product_name, active_ingredient, category, status) "
        "VALUES ('X', 'Y', 'fungicide', 'registered')"
    )
    assert conn.execute("SELECT verification_status FROM approved_products").fetchone()[0] == "PLACEHOLDER_VERIFY"


def test_alert_dedupe_key_is_unique():
    conn = _db()
    ensure_schema(conn)
    conn.execute("INSERT INTO alerts (type, message_key, dedupe_key) VALUES ('t', 'k', 'same')")
    try:
        conn.execute("INSERT INTO alerts (type, message_key, dedupe_key) VALUES ('t', 'k', 'same')")
        raise AssertionError("duplicate alert accepted")
    except sqlite3.IntegrityError:
        pass
