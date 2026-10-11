import json
import shutil
import sqlite3
from pathlib import Path

import pytest

from backend.advisory.schema import ensure_schema
from backend.advisory.seed_loader import SeedError, load_seed

SEED = Path(__file__).resolve().parents[2] / "data" / "advisory_seed"
BASE = """
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT, name TEXT, role TEXT);
CREATE TABLE farms (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, crop_name TEXT);
"""


@pytest.fixture
def conn():
    c = sqlite3.connect(":memory:")
    c.executescript(BASE)
    ensure_schema(c)
    return c


def test_shipped_seed_loads_and_is_all_placeholder(conn):
    report = load_seed(conn, SEED)
    assert report.loaded["diseases"] == 6
    # Every agronomic row shipped in the repo must be a placeholder until an expert verifies it.
    for table in ("approved_products", "dosage_rules", "treatment_protocols"):
        assert report.loaded[table] > 0
        assert report.placeholders[table] == report.loaded[table], table
    labels = {r[0] for r in conn.execute("SELECT model_label FROM diseases")}
    assert labels == {"Brown Rust", "Yellow Rust", "Powdery Mildew", "Septoria", "Healthy", "Invalid"}


def test_reload_updates_in_place(conn):
    load_seed(conn, SEED)
    load_seed(conn, SEED)
    assert conn.execute("SELECT COUNT(*) FROM approved_products").fetchone()[0] == 4
    assert conn.execute("SELECT COUNT(*) FROM dosage_rules").fetchone()[0] == 4


def test_multi_value_cells_become_json_lists(conn):
    load_seed(conn, SEED)
    targets = conn.execute(
        "SELECT target_diseases FROM approved_products WHERE product_name='PLACEHOLDER_FUNGICIDE_A'"
    ).fetchone()[0]
    assert json.loads(targets) == ["yellow_rust", "leaf_rust"]


def test_bad_file_writes_nothing(conn, tmp_path):
    for f in SEED.glob("*.csv"):
        shutil.copy(f, tmp_path / f.name)
    bad = (tmp_path / "approved_products.csv").read_text(encoding="utf-8").replace(",registered,", ",approved,", 1)
    (tmp_path / "approved_products.csv").write_text(bad, encoding="utf-8")
    with pytest.raises(SeedError, match="status must be one of"):
        load_seed(conn, tmp_path)
    assert conn.execute("SELECT COUNT(*) FROM diseases").fetchone()[0] == 0


def test_dosage_for_unknown_product_rejected(conn, tmp_path):
    for f in SEED.glob("*.csv"):
        shutil.copy(f, tmp_path / f.name)
    with (tmp_path / "dosage_rules.csv").open("a", encoding="utf-8") as f:
        f.write("NOT_A_PRODUCT,X,wheat,yellow_rust,,,,,,,,,,,PLACEHOLDER_VERIFY\n")
    with pytest.raises(SeedError, match="not in approved_products"):
        load_seed(conn, tmp_path)


def test_calendar_template_rows_are_skipped(conn, tmp_path):
    for f in SEED.glob("*.csv"):
        shutil.copy(f, tmp_path / f.name)
    with (tmp_path / "crop_calendar_rules.csv").open("a", encoding="utf-8") as f:
        f.write("wheat,,,,irrigated,PLACEHOLDER_STAGE,PLACEHOLDER_VERIFY: stage name,,,PLACEHOLDER_VERIFY: action,"
                "PLACEHOLDER_VERIFY: doc,?,PLACEHOLDER_VERIFY\n")
    report = load_seed(conn, tmp_path)
    assert report.loaded["crop_calendar_rules"] == 18
    assert any("template row" in s for s in report.skipped)


def test_wheat_calendar_covers_each_altitude_band_without_gaps(conn):
    load_seed(conn, SEED)
    rows = conn.execute("""SELECT altitude_min_m, day_start, day_end, verification_status, source_page
                           FROM crop_calendar_rules WHERE crop='wheat' ORDER BY altitude_min_m, day_start""").fetchall()
    bands: dict = {}
    for lo, a, b, status, source in rows:
        bands.setdefault(lo, []).append((a, b))
        assert status == "PLACEHOLDER_VERIFY" and "p." in source and "p.p" not in source
    assert sorted(bands) == [0, 1000, 1700]
    for stages in bands.values():
        assert stages[0][0] == 0 and len(stages) == 6
        assert all(nxt[0] == cur[1] + 1 for cur, nxt in zip(stages, stages[1:]))
