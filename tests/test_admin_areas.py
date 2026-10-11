import sqlite3

import pytest

from backend.admin_areas import (
    SOURCE_FILE,
    address_fields,
    children,
    distance_km,
    get_area,
    import_boundaries,
    lineage,
    nmis_region,
)


@pytest.fixture(scope="module")
def conn():
    c = sqlite3.connect(":memory:")
    c.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, region TEXT)")
    counts = import_boundaries(c, SOURCE_FILE)
    assert counts["region"] == 15 and counts["zone"] == 107 and counts["woreda"] == 1148
    return c


def test_dewa_cheffa_lineage_and_centre(conn):
    chain = lineage(conn, "ET031001")
    assert [a.name for a in chain] == ["Amhara", "Oromo Nationality Administration", "Dewa Cheffa"]
    assert [a.level_name for a in chain] == ["region", "zone", "woreda"]
    w = chain[-1]
    assert w.latitude == pytest.approx(10.779, abs=0.01)
    assert w.longitude == pytest.approx(39.847, abs=0.01)


def test_children_are_scoped(conn):
    regions = children(conn, None)
    assert len(regions) == 15 and all(r.level == 1 for r in regions)
    zones = children(conn, "ET03")
    assert all(z.parent_pcode == "ET03" for z in zones)
    assert "Oromo Nationality Administration" in {z.name for z in zones}


def test_every_woreda_has_a_centre_point(conn):
    missing = conn.execute("SELECT COUNT(*) FROM admin_areas WHERE latitude IS NULL").fetchone()[0]
    assert missing == 0


def test_users_get_pcode_columns(conn):
    cols = {r[1] for r in conn.execute("PRAGMA table_info(users)")}
    assert {"region_pcode", "zone_pcode", "woreda_pcode"} <= cols


def test_nmis_region_crosswalk():
    assert nmis_region("Amhara") == "Amhara"
    assert nmis_region("Central Ethiopia") == "SNNP"
    assert nmis_region("South West Ethiopia") == "South West"
    assert nmis_region("SNNP") == "SNNP"        # legacy names pass through
    assert nmis_region("Afar") is None          # no NMIS market data
    assert get_area is not None


def test_distance_km():
    # Kemise (Dewa Cheffa) to Kombolcha is roughly 50 km.
    assert 35 < distance_km(10.72, 39.87, 11.08, 39.74) < 55


def test_address_fields_from_woreda_and_region(conn):
    a = address_fields(conn, "ET031001")
    assert a == {"region": "Amhara", "zone": "Oromo Nationality Administration", "woreda": "Dewa Cheffa",
                 "region_pcode": "ET03", "zone_pcode": "ET0310", "woreda_pcode": "ET031001"}
    r = address_fields(conn, "ET03")
    assert r["region_pcode"] == "ET03" and r["zone"] is None and r["woreda_pcode"] is None
    with pytest.raises(LookupError):
        address_fields(conn, "ET99999")
