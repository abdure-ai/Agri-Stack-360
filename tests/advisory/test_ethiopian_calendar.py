from datetime import date, timedelta

import pytest

from backend.advisory.ethiopian_calendar import (
    EthiopianDate,
    days_in_month,
    ec_year_to_gregorian_span,
    format_dual,
    is_leap_year,
    to_ethiopian,
    to_gregorian,
)

# Anchors from published Ethiopian calendars.
KNOWN = [
    # (gregorian, (ec_year, ec_month, ec_day))
    (date(2024, 9, 11), (2017, 1, 1)),    # New Year 2017 E.C.
    (date(2023, 9, 12), (2016, 1, 1)),    # New Year 2016 E.C. (before Gregorian leap year 2024)
    (date(2025, 9, 11), (2018, 1, 1)),    # New Year 2018 E.C.
    (date(2026, 9, 11), (2019, 1, 1)),    # New Year 2019 E.C.
    (date(2025, 1, 7), (2017, 4, 29)),    # Genna (Christmas), 29 Tahsas
    (date(2024, 1, 7), (2016, 4, 28)),    # Genna in the year before a leap year: 28 Tahsas
    (date(2024, 9, 27), (2017, 1, 17)),   # Meskel, 17 Meskerem
    (date(2000, 9, 11), (1993, 1, 1)),
    (date(2007, 9, 12), (2000, 1, 1)),    # Ethiopian millennium
]


def test_new_year_and_holidays():
    for greg, ec in KNOWN:
        assert to_ethiopian(greg) == EthiopianDate(*ec), greg
        assert to_gregorian(*ec) == greg, ec


def test_pagume_length():
    # 2015 E.C. is a leap year (2015 % 4 == 3): Pagume has 6 days, ending 11 Sep 2023.
    assert is_leap_year(2015)
    assert days_in_month(2015, 13) == 6
    assert to_gregorian(2015, 13, 6) == date(2023, 9, 11)
    # 2016 E.C. is not: Pagume has 5 days, ending 10 Sep 2024.
    assert not is_leap_year(2016)
    assert days_in_month(2016, 13) == 5
    assert to_gregorian(2016, 13, 5) == date(2024, 9, 10)
    with pytest.raises(ValueError):
        EthiopianDate(2016, 13, 6)


def test_round_trip_every_day_for_30_years():
    d = date(2000, 1, 1)
    end = date(2030, 12, 31)
    prev = None
    while d <= end:
        ec = to_ethiopian(d)
        assert ec.to_gregorian() == d
        if prev is not None:
            # Consecutive Gregorian days are consecutive Ethiopian days.
            assert ec > prev
        prev = ec
        d += timedelta(days=1)


def test_invalid_dates_rejected():
    for bad in [(2017, 0, 1), (2017, 14, 1), (2017, 1, 0), (2017, 1, 31)]:
        with pytest.raises(ValueError):
            EthiopianDate(*bad)


def test_ec_year_span_for_2016_packages():
    start, end = ec_year_to_gregorian_span(2016)
    assert start == date(2023, 9, 12)
    assert end == date(2024, 9, 10)


def test_formatting():
    assert EthiopianDate(2017, 1, 1).format() == "1 Meskerem 2017 E.C."
    assert EthiopianDate(2017, 1, 1).format("am") == "1 መስከረም 2017 ዓ.ም."
    assert format_dual(date(2024, 9, 11)) == "11 Sep 2024 (1 Meskerem 2017 E.C.)"
