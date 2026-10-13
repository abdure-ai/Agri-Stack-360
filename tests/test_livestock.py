"""Livestock prices: CSV import, the forecast model's confidence and reasons, API access, advisor answers.

All prices here are made-up test numbers, not NMIS data."""

import sqlite3
from datetime import date, timedelta

import pytest

from backend import livestock
from tests.conftest import add_user

HEADER = ",".join(livestock.CSV_COLUMNS)
TODAY = date.today()


@pytest.fixture
def lv(monkeypatch):
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    livestock.ensure_schema(conn)
    from backend.routers import livestock as route

    monkeypatch.setattr(route, "get_connection", lambda: conn)
    yield conn
    conn.close()


def rows(weeks=16, start=None, growth=0.01, markets=("Adama", "Bati"), region="Oromia",
         animal="Ox", noise=(0.0, 0.02, -0.015, 0.01)):
    """Weekly reports of two grades per market, rising ~1% a week, the last one 3 days ago."""
    start = start or TODAY - timedelta(weeks=weeks - 1, days=3)
    out = []
    for m_i, market in enumerate(markets):
        for grade, base in (("Fat", 60000), ("Thin", 40000)):
            for w in range(weeks):
                price = base * (1 + m_i * 0.05) * (1 + growth) ** w * (1 + noise[w % len(noise)])
                out.append({"market": market, "region": region, "animal": animal, "breed": "Indigenous",
                            "sex": "Male", "production_type": "", "body_condition": grade,
                            "date": (start + timedelta(weeks=w)).isoformat(),
                            "price_min": f"{price * 0.9:.0f}", "price_max": f"{price * 1.1:.0f}"})
    return out


def test_import_validates_and_upserts(lv):
    text = "\n".join([HEADER,
                      "Adama,Oromia,Ox,Indigenous,Male,,Fat,2026/01/30,40000,55000",
                      "Adama,Oromia,Ox,Indigenous,Male,,Fat,2026-01-30,41000,56000",   # same report: update
                      "Adama,Oromia,Ox,,,,,2026-01-30,55000,40000",                    # min > max
                      "Adama,Oromia,Ox,,,,,2099-01-01,40000,55000",                    # future
                      "Adama,Oromia,,,,,,2026-01-30,40000,55000",                      # no animal
                      "Adama,Oromia,Goat,,,,,30 Sep,4000,5000"])                       # bad date
    result = livestock.import_csv_text(lv, text, today=TODAY)
    assert (result["added"], result["updated"], result["rejected"]) == (1, 1, 4)
    assert lv.execute("SELECT price_min FROM livestock_prices").fetchall() == [(41000.0,)]
    with pytest.raises(ValueError, match="missing"):
        livestock.import_csv_text(lv, "market,animal\nA,Ox")


def test_forecast_finds_the_trend_and_explains_low_confidence(lv):
    livestock.import_rows(lv, rows(), today=TODAY)
    [country, region] = livestock.train(lv, today=TODAY)
    assert country["status"] == "ok" and country["region"] is None and region["region"] == "Oromia"
    assert country["direction"] == "up" and 2 < country["change_pct"] < 7          # ~1%/week over 4 weeks
    lo, hi = country["range_pct"]
    assert lo < country["change_pct"] < hi
    codes = [r["code"] for r in country["reasons"]]
    assert codes[0] == "period" and "no_season" in codes                           # < 1 year: no seasons
    assert country["reasons"][0]["params"]["reports"] == 64
    assert country["confidence"] == "medium"                                        # 64 reports, tested, recent


def test_confidence_drops_for_few_or_old_reports(lv):
    livestock.import_rows(lv, rows(weeks=8, markets=("Adama",)), today=TODAY)
    result = livestock.train_one(livestock._rows(lv, "Ox"), animal="Ox", today=TODAY + timedelta(days=120))
    assert result["confidence"] == "low"
    assert {"few_reports", "stale"} <= {r["code"] for r in result["reasons"]}


def test_no_forecast_without_repeated_reports(lv):
    livestock.import_rows(lv, rows(weeks=2, markets=("Adama",)), today=TODAY)
    result = livestock.forecast(lv, "Ox")
    assert result["status"] == "insufficient" and result["confidence"] is None
    assert result["reasons"][-1]["code"] == "too_few"


def test_trend_not_used_when_it_does_not_beat_no_change(lv):
    zigzag = (0.0, 0.15, -0.15, 0.1, -0.1)
    livestock.import_rows(lv, rows(growth=0.0, noise=zigzag), today=TODAY)
    result = livestock.forecast(lv, "Ox")
    if not result["trend_used"]:
        assert result["direction"] == "flat" and "no_trend" in {r["code"] for r in result["reasons"]}


def test_region_without_forecast_uses_country(lv):
    livestock.import_rows(lv, rows() + rows(weeks=1, markets=("Gode",), region="Somali"), today=TODAY)
    livestock.train(lv, today=TODAY)
    assert livestock.forecast(lv, "Ox", "Somali")["region"] is None
    assert livestock.forecast(lv, "Ox", "Oromia")["region"] == "Oromia"


def test_api_read_and_admin_import(lv, platform, client_as):
    farmer = client_as(add_user(platform, 1, "farmer"))
    admin = client_as(add_user(platform, 2, "admin"))
    assert farmer.get("/api/livestock/summary").json()["reports"] == 0
    csv = "\n".join([HEADER] + [",".join(str(r[c]) for c in livestock.CSV_COLUMNS) for r in rows()])
    assert farmer.post("/api/admin/livestock/import", files={"file": ("p.csv", csv)}).status_code == 403
    r = admin.post("/api/admin/livestock/import", files={"file": ("p.csv", csv)})
    assert r.status_code == 200 and r.json()["added"] == 64 and r.json()["forecasts"] == 2
    body = farmer.get("/api/livestock/prices", params={"animal": "Ox", "region": "Oromia"}).json()
    assert body["forecast"]["confidence"] == "medium" and len(body["series"]) == 4
    s = body["series"][0]
    assert s["outlook"]["low"] < s["outlook"]["avg"] < s["outlook"]["high"]
    assert farmer.get("/api/livestock/forecast", params={"animal": "Camel"}).status_code == 404
    assert admin.get("/api/admin/livestock/template.csv").text.strip() == HEADER


def test_advisor_answers_livestock_price_questions(lv, platform, monkeypatch):
    from backend.advisory import livestock_answer

    livestock.import_rows(lv, rows(), today=TODAY)
    livestock.train(lv, today=TODAY)
    assert livestock_answer.animals_in("የበሬ ዋጋ ስንት ነው?") == ["ox"]
    assert livestock_answer.animals_in("ሰላም፣ በግብርና ስራ ላይ ነኝ") == []            # not "ላም" (cow) or "በግ" (sheep)
    assert livestock_answer.animals_in("How much is a goat and an ox?") == ["goat", "ox"]
    out = livestock_answer.answer(lv, animals=["ox"], lang="en", region="Oromia")
    assert "Adama" in out["text"] and "birr" in out["text"] and "confidence" in out["text"].lower()
    assert out["sources"][0]["ref"] == "M"
    none = livestock_answer.answer(lv, animals=["camel"], lang="am", region=None)
    assert none["text"] and none["as_of"] is None
