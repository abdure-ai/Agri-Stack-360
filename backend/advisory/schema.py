"""
schema.py — Advisory module tables in agri_platform.db.

Adapts the spec's data model (docs/agri-stack-advisory-module-spec.md §4) to
the existing schema:
  farmers  -> users (role 'farmer') + farmer_profiles (location, DA, consent)
  DAs      -> users (role 'agent'); assignment via farmer_profiles.assigned_da_id
  plots    -> farms (+ irrigated, soil_type columns)

Every table holding agronomic facts (products, doses, protocols, calendar
rules) has verification_status. Seed rows start as 'PLACEHOLDER_VERIFY' and
only an expert changes them to 'verified'; the advisory output says so when
it uses unverified data.

ensure_schema() is idempotent and runs on API startup.
"""

import sqlite3

VERIFIED = "verified"
PLACEHOLDER = "PLACEHOLDER_VERIFY"

ADVISORY_SCHEMA = """
CREATE TABLE IF NOT EXISTS farmer_profiles (
    user_id             INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    kebele              TEXT,
    latitude            REAL,
    longitude           REAL,
    altitude_m          REAL,
    assigned_da_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    consent_data        INTEGER NOT NULL DEFAULT 0,
    consent_alerts      INTEGER NOT NULL DEFAULT 0,
    consent_training    INTEGER NOT NULL DEFAULT 0,   -- crop photos may be kept to improve the disease model
    consent_recorded_at TEXT,
    alert_channel       TEXT    NOT NULL DEFAULT 'app',
    max_alerts_per_week INTEGER NOT NULL DEFAULT 3,
    updated_at          TEXT    DEFAULT CURRENT_TIMESTAMP
);

-- Append-only history of consent changes (Proclamation 1321/2024); current state is on farmer_profiles.
CREATE TABLE IF NOT EXISTS consent_events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind         TEXT    NOT NULL CHECK (kind IN ('data','alerts','training')),
    granted      INTEGER NOT NULL,
    recorded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    method       TEXT    NOT NULL CHECK (method IN ('self','da_verbal','admin')),
    text_version TEXT    NOT NULL,
    created_at   TEXT    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_consent_events_user ON consent_events(user_id, id);

CREATE TABLE IF NOT EXISTS crop_seasons (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id               INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    crop                  TEXT    NOT NULL,
    variety               TEXT,
    planting_date         TEXT    NOT NULL,          -- ISO Gregorian
    season                TEXT    NOT NULL CHECK (season IN ('meher','belg','irrigated')),
    expected_harvest_date TEXT,
    status                TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','harvested','failed')),
    created_at            TEXT    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_crop_seasons_farm ON crop_seasons(farm_id, status);

-- Diseases the advisory knows about; model_label maps disease-model classes.
CREATE TABLE IF NOT EXISTS diseases (
    key          TEXT PRIMARY KEY,          -- e.g. 'yellow_rust'
    crop         TEXT NOT NULL,
    model_label  TEXT UNIQUE,               -- class name from the disease model
    name_en      TEXT NOT NULL,
    name_am      TEXT,
    name_om      TEXT,
    name_ti      TEXT,
    pathogen     TEXT,
    is_disease   INTEGER NOT NULL DEFAULT 1  -- 0 for 'Healthy' / 'Invalid' classes
);

CREATE TABLE IF NOT EXISTS diagnoses (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    farm_id          INTEGER REFERENCES farms(id) ON DELETE SET NULL,
    crop_season_id   INTEGER REFERENCES crop_seasons(id) ON DELETE SET NULL,
    disease_key      TEXT    REFERENCES diseases(key),
    model_label      TEXT,
    confidence       REAL    NOT NULL,      -- 0..1
    probabilities    TEXT,                  -- JSON {label: p}
    ecological_input TEXT,                  -- JSON {altitude_m, temperature_c, humidity_pct, precipitation_mm}
    image_ref        TEXT,
    latitude         REAL,
    longitude        REAL,
    source           TEXT    NOT NULL DEFAULT 'model' CHECK (source IN ('model','manual','simulated')),
    verified_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    verified_disease TEXT,
    outcome          TEXT    NOT NULL DEFAULT 'unknown' CHECK (outcome IN ('improved','same','worse','unknown')),
    follow_up_date   TEXT,
    created_at       TEXT    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_diagnoses_farmer ON diagnoses(farmer_id, created_at);
CREATE INDEX IF NOT EXISTS ix_diagnoses_disease_time ON diagnoses(disease_key, created_at);

CREATE TABLE IF NOT EXISTS knowledge_documents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT    NOT NULL,
    source_url    TEXT,
    file_path     TEXT,
    file_sha256   TEXT    UNIQUE,
    language      TEXT    NOT NULL,         -- 'am', 'en', 'om', 'mixed'
    crops         TEXT    NOT NULL DEFAULT '[]',   -- JSON list
    topics        TEXT    NOT NULL DEFAULT '[]',   -- JSON list
    version_label TEXT,                     -- e.g. '2016 E.C.'
    page_count    INTEGER,
    status        TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
    uploaded_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id     INTEGER NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,
    text            TEXT    NOT NULL,
    page_start      INTEGER,
    page_end        INTEGER,
    section         TEXT,
    language        TEXT,
    crop            TEXT,
    topic           TEXT,
    crop_stage      TEXT,
    token_estimate  INTEGER,
    embedding       BLOB,                   -- float32 vector
    embedding_model TEXT,
    UNIQUE (document_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS ix_chunks_doc ON knowledge_chunks(document_id);

CREATE TABLE IF NOT EXISTS crop_calendar_rules (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    crop                TEXT    NOT NULL,
    variety             TEXT,               -- NULL = any variety
    altitude_min_m      REAL,
    altitude_max_m      REAL,
    season              TEXT,               -- NULL = any season
    stage_key           TEXT    NOT NULL,
    stage_name          TEXT    NOT NULL,
    day_start           INTEGER NOT NULL,   -- days after planting
    day_end             INTEGER NOT NULL,
    actions             TEXT    NOT NULL DEFAULT '[]',   -- JSON list of action keys / text
    source_document_id  INTEGER REFERENCES knowledge_documents(id) ON DELETE SET NULL,
    source_page         TEXT,
    verification_status TEXT    NOT NULL DEFAULT '__PLACEHOLDER__'
);

CREATE TABLE IF NOT EXISTS approved_products (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name        TEXT    NOT NULL,
    active_ingredient   TEXT    NOT NULL,
    formulation         TEXT,
    registration_number TEXT,
    category            TEXT    NOT NULL CHECK (category IN ('fungicide','insecticide','herbicide','fertilizer','seed')),
    target_crops        TEXT    NOT NULL DEFAULT '[]',   -- JSON list
    target_diseases     TEXT    NOT NULL DEFAULT '[]',   -- JSON list of disease keys / pests
    status              TEXT    NOT NULL CHECK (status IN ('registered','banned','expired')),
    source              TEXT,
    verification_status TEXT    NOT NULL DEFAULT '__PLACEHOLDER__',
    updated_at          TEXT    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_name, formulation)
);

CREATE TABLE IF NOT EXISTS dosage_rules (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id                INTEGER NOT NULL REFERENCES approved_products(id) ON DELETE CASCADE,
    crop                      TEXT    NOT NULL,
    target                    TEXT    NOT NULL,   -- disease key or pest
    dose_per_ha               TEXT,               -- kept as text, e.g. '0.5 L'
    dose_per_knapsack         TEXT,
    water_volume_l_per_ha     TEXT,
    max_applications          INTEGER,
    interval_days             INTEGER,
    pre_harvest_interval_days INTEGER,
    re_entry_hours            INTEGER,
    rain_free_hours           INTEGER,
    ppe_required              TEXT    NOT NULL DEFAULT '[]',   -- JSON list of PPE keys
    source                    TEXT,
    verification_status       TEXT    NOT NULL DEFAULT '__PLACEHOLDER__',
    UNIQUE (product_id, crop, target)
);

CREATE TABLE IF NOT EXISTS treatment_protocols (
    id                             INTEGER PRIMARY KEY AUTOINCREMENT,
    disease_key                    TEXT    NOT NULL REFERENCES diseases(key),
    crop                           TEXT    NOT NULL,
    cultural_practices             TEXT    NOT NULL DEFAULT '[]',   -- JSON list of text
    recommended_active_ingredients TEXT    NOT NULL DEFAULT '[]',   -- JSON list
    scouting_advice                TEXT,
    source                         TEXT,
    verification_status            TEXT    NOT NULL DEFAULT '__PLACEHOLDER__',
    UNIQUE (disease_key, crop)
);

CREATE TABLE IF NOT EXISTS alerts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    type          TEXT    NOT NULL,         -- 'neighborhood_disease', 'follow_up', 'weather', ...
    farmer_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    area          TEXT,                     -- JSON for area-wide alerts
    severity      TEXT    NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
    message_key   TEXT    NOT NULL,         -- translation key
    payload       TEXT    NOT NULL DEFAULT '{}',  -- JSON values for the template
    channel       TEXT    NOT NULL DEFAULT 'app',
    status        TEXT    NOT NULL DEFAULT 'queued' CHECK (status IN ('scheduled','queued','sent','delivered','failed','suppressed','read')),
    dedupe_key    TEXT    UNIQUE,           -- prevents duplicate alerts
    scheduled_for TEXT,
    created_at    TEXT    DEFAULT CURRENT_TIMESTAMP,
    sent_at       TEXT
);
CREATE INDEX IF NOT EXISTS ix_alerts_farmer ON alerts(farmer_id, created_at);

CREATE TABLE IF NOT EXISTS conversations (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- who is typing
    subject_farmer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,          -- whose farm (DA asking for a farmer)
    channel           TEXT    NOT NULL DEFAULT 'app',
    language          TEXT,
    created_at        TEXT    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id     INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    question            TEXT    NOT NULL,
    language            TEXT,
    retrieved_chunk_ids TEXT    NOT NULL DEFAULT '[]',
    context_snapshot    TEXT,
    answer              TEXT,
    sources             TEXT    NOT NULL DEFAULT '[]',
    confidence          REAL,
    guardrail_flags     TEXT    NOT NULL DEFAULT '[]',
    escalated           INTEGER NOT NULL DEFAULT 0,
    feedback            TEXT    CHECK (feedback IN ('helpful','not_helpful')),
    feedback_comment    TEXT,
    created_at          TEXT    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_messages_conv ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS escalations (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id   INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    diagnosis_id INTEGER REFERENCES diagnoses(id) ON DELETE SET NULL,
    farmer_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason       TEXT    NOT NULL CHECK (reason IN ('low_confidence','no_knowledge','guardrail_block','advice_failed','asked_for_person')),
    assigned_to  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status       TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered','forwarded','closed')),
    resolution   TEXT,
    created_at   TEXT    DEFAULT CURRENT_TIMESTAMP,
    resolved_at  TEXT
);

CREATE TABLE IF NOT EXISTS advisory_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT
);
""".replace("__PLACEHOLDER__", PLACEHOLDER)

# Thresholds the spec says must be configurable (§10). Values are product
# decisions, not agronomic facts; admins can change them.
DEFAULT_SETTINGS = {
    "diagnosis_confidence_threshold": ("0.70", "Below this model confidence, a diagnosis is treated as uncertain and escalated."),
    "follow_up_days": ("7", "Days after a diagnosis before asking whether it improved."),
    "outbreak_radius_km": ("10", "Radius for neighbourhood disease activity and alerts."),
    "outbreak_window_days": ("14", "Look-back window for neighbourhood disease activity."),
    "outbreak_min_scans": ("3", "Scans of one disease within the radius and window that trigger an alert."),
    "outbreak_verified_only": ("0", "1 = count only DA-verified scans for outbreak alerts."),
    "diagnosis_history_days": ("60", "How far back the context builder reads a farmer's diagnoses."),
    "max_alerts_per_week": ("3", "Default cap on alerts per farmer per week."),
    "strict_dose_policy": ("0", "0 = fertilizer/seed rates may be quoted when the exact figure is in a cited MoA passage; "
                                "1 = every dose must come from dosage_rules. Pesticide doses are database-only either way."),
    "daily_tips_auto": ("1", "1 = draft tomorrow's agricultural tips every morning for review (nothing is published "
                             "until an agronomist or admin approves it)."),
    "daily_tips_per_day": ("3", "How many tips to draft per day (each AI draft uses one Gemini request)."),
}

# Allowed values for the admin settings screen: (type, min, max). Product limits that keep the
# engine sensible (e.g. no 0 km radius), not agronomic facts.
SETTING_LIMITS = {
    "diagnosis_confidence_threshold": ("float", 0.3, 0.95),
    "follow_up_days": ("int", 1, 30),
    "outbreak_radius_km": ("float", 1, 50),
    "outbreak_window_days": ("int", 3, 60),
    "outbreak_min_scans": ("int", 2, 50),
    "outbreak_verified_only": ("bool", 0, 1),
    "diagnosis_history_days": ("int", 7, 365),
    "max_alerts_per_week": ("int", 0, 21),
    "strict_dose_policy": ("bool", 0, 1),
    "daily_tips_auto": ("bool", 0, 1),
    "daily_tips_per_day": ("int", 1, 5),
}

# Columns added to existing tables (SQLite has no ADD COLUMN IF NOT EXISTS).
_FARM_COLUMNS = {
    "irrigated": "INTEGER NOT NULL DEFAULT 0",
    "soil_type": "TEXT",
}
# Columns added to tables created by an earlier version of this schema.
_DISEASE_COLUMNS = {"name_ti": "TEXT"}


def _migrate_consent(conn: sqlite3.Connection) -> None:
    """2026-10-11: third consent ('training'). Adds the column and widens the consent_events CHECK."""
    if "consent_training" not in {r[1] for r in conn.execute("PRAGMA table_info(farmer_profiles)")}:
        conn.execute("ALTER TABLE farmer_profiles ADD COLUMN consent_training INTEGER NOT NULL DEFAULT 0")
    sql = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='consent_events'").fetchone()
    if sql and "'training'" not in sql[0]:
        cols = "id, user_id, kind, granted, recorded_by, method, text_version, created_at"
        with conn:
            conn.execute("ALTER TABLE consent_events RENAME TO consent_events_old")
            conn.execute("DROP INDEX IF EXISTS ix_consent_events_user")
            conn.executescript(ADVISORY_SCHEMA)   # recreates consent_events (and its index) with the new CHECK
            conn.execute(f"INSERT INTO consent_events ({cols}) SELECT {cols} FROM consent_events_old")
            conn.execute("DROP TABLE consent_events_old")


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(ADVISORY_SCHEMA)
    _migrate_consent(conn)
    existing = {r[1] for r in conn.execute("PRAGMA table_info(farms)")}
    for col, decl in _FARM_COLUMNS.items():
        if col not in existing:
            conn.execute(f"ALTER TABLE farms ADD COLUMN {col} {decl}")
    existing = {r[1] for r in conn.execute("PRAGMA table_info(diseases)")}
    for col, decl in _DISEASE_COLUMNS.items():
        if col not in existing:
            conn.execute(f"ALTER TABLE diseases ADD COLUMN {col} {decl}")
    conn.executemany(
        "INSERT OR IGNORE INTO advisory_settings (key, value, description) VALUES (?, ?, ?)",
        [(k, v, d) for k, (v, d) in DEFAULT_SETTINGS.items()],
    )
    conn.commit()
