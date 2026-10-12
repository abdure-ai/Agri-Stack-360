"""Fixed advisory messages: every language file matches English, and Tigrinya is wired through."""

import json
import re
import sqlite3
from pathlib import Path

import pytest

from backend.advisory.diagnosis import disease_names
from backend.advisory.i18n import I18N_DIR, t
from backend.advisory.languages import detect_language
from backend.advisory.schema import ensure_schema
from backend.advisory.seed_loader import load_seed

PH = re.compile(r"\{(\w+)\}")
EN = json.loads((I18N_DIR / "en.json").read_text(encoding="utf-8"))
SEED = Path(__file__).resolve().parents[2] / "data" / "advisory_seed"


@pytest.mark.parametrize("lang", ["am", "om", "ti"])
def test_language_file_has_every_key_and_placeholder(lang):
    other = json.loads((I18N_DIR / f"{lang}.json").read_text(encoding="utf-8"))
    keys = {k for k in EN if not k.startswith("_")}
    assert keys == {k for k in other if not k.startswith("_")}
    for k in keys:
        assert sorted(PH.findall(EN[k])) == sorted(PH.findall(other[k])), k
        assert other[k].strip() and other[k] != EN[k], k


def test_tigrinya_messages_render():
    msg = t("outbreak_alert", "ti", disease="ብጫ ዋግ", farms=4, radius="10", days=14)
    assert "ብጫ ዋግ" in msg and "10" in msg and "{" not in msg


def test_ethiopic_text_follows_the_users_language():
    assert detect_language("ስርናይ መዓስ ክዝራእ?", preferred="ti") == "ti"
    assert detect_language("ስንዴ መቼ ይዘራል?", preferred="am") == "am"
    assert detect_language("ስንዴ መቼ ይዘራል?") == "am"


def test_disease_names_in_every_language():
    c = sqlite3.connect(":memory:")
    c.executescript("CREATE TABLE users (id INTEGER PRIMARY KEY); CREATE TABLE farms (id INTEGER PRIMARY KEY);")
    ensure_schema(c)
    load_seed(c, SEED)
    for lang in ("am", "om", "ti"):
        names = disease_names(c, lang)
        assert names["yellow_rust"] != names["Yellow Rust"] or names["yellow_rust"]
        assert names["yellow_rust"] != disease_names(c, "en")["yellow_rust"], lang
    assert disease_names(c, "ti")["yellow_rust"] == "ብጫ ዋግ"


def test_old_diseases_table_gets_tigrinya_column():
    c = sqlite3.connect(":memory:")
    c.executescript("""CREATE TABLE users (id INTEGER PRIMARY KEY); CREATE TABLE farms (id INTEGER PRIMARY KEY);
        CREATE TABLE diseases (key TEXT PRIMARY KEY, crop TEXT NOT NULL, model_label TEXT UNIQUE, name_en TEXT NOT NULL,
                               name_am TEXT, name_om TEXT, pathogen TEXT, is_disease INTEGER NOT NULL DEFAULT 1);""")
    ensure_schema(c)
    assert "name_ti" in {r[1] for r in c.execute("PRAGMA table_info(diseases)")}


def test_answer_language_follows_the_script_of_the_question():
    from backend.advisory.languages import answer_language

    q_am = "የስንዴ ቅጠሌ ላይ ቢጫ መስመር አለ። ምን ላድርግ?"
    assert answer_language(q_am, "en") == "am"            # app sent its screen language
    assert answer_language(q_am, "om") == "am"
    assert answer_language(q_am, "ti") == "ti"            # same script: the request decides
    assert answer_language(q_am, None) == "am"
    assert answer_language("How do I control yellow rust on wheat?", "am") == "en"
    assert answer_language("Akkamittan dhukkuba qamadii to'achuu danda'a?", "am") == "om"
    assert answer_language("How do I control yellow rust on wheat?", "om") == "om"   # same script
    assert answer_language("ok", "am") == "am"            # too short to tell: keep the request
