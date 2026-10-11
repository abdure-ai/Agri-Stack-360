"""
ethiopian_calendar.py — Ethiopian (E.C.) <-> Gregorian date conversion.

The Ethiopian calendar has 12 months of 30 days and a 13th month (Pagume) of
5 days, or 6 in the year before a Gregorian leap year. Every 4th Ethiopian
year (year % 4 == 3) is a leap year. New Year (Meskerem 1) falls on
11 September, or 12 September before a Gregorian leap year.

Conversion goes through the "fixed day number" used by Python's
date.toordinal() (1 = 1 January 1 CE, proleptic Gregorian), following
Dershowitz & Reingold, *Calendrical Calculations*.

Dates are stored Gregorian everywhere; this module is only for display and
for reading E.C. dates found in documents (e.g. "2016 E.C." packages).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

# Fixed day number of Meskerem 1, year 1 E.C. (= 29 August 8 CE, Julian).
ETHIOPIC_EPOCH = 2796

MONTHS_EN = [
    "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit",
    "Miyazya", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume",
]
MONTHS_AM = [
    "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት", "መጋቢት",
    "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
]


@dataclass(frozen=True, order=True)
class EthiopianDate:
    year: int
    month: int  # 1..13
    day: int    # 1..30 (1..5 or 1..6 in Pagume)

    def __post_init__(self) -> None:
        if not 1 <= self.month <= 13:
            raise ValueError(f"Ethiopian month must be 1..13, got {self.month}")
        if not 1 <= self.day <= days_in_month(self.year, self.month):
            raise ValueError(
                f"Day {self.day} is out of range for {MONTHS_EN[self.month - 1]} {self.year} E.C."
            )

    def to_gregorian(self) -> date:
        return date.fromordinal(_fixed_from_ethiopic(self.year, self.month, self.day))

    def format(self, lang: str = "en") -> str:
        """'14 Meskerem 2017 E.C.' (en) or '14 መስከረም 2017 ዓ.ም.' (am)."""
        if lang == "am":
            return f"{self.day} {MONTHS_AM[self.month - 1]} {self.year} ዓ.ም."
        return f"{self.day} {MONTHS_EN[self.month - 1]} {self.year} E.C."


def is_leap_year(year: int) -> bool:
    """Ethiopian leap year: Pagume has 6 days."""
    return year % 4 == 3


def days_in_month(year: int, month: int) -> int:
    if month < 13:
        return 30
    return 6 if is_leap_year(year) else 5


def _fixed_from_ethiopic(year: int, month: int, day: int) -> int:
    return ETHIOPIC_EPOCH - 1 + 365 * (year - 1) + year // 4 + 30 * (month - 1) + day


def to_ethiopian(d: date) -> EthiopianDate:
    """Gregorian date -> Ethiopian date."""
    fixed = d.toordinal()
    year = (4 * (fixed - ETHIOPIC_EPOCH) + 1463) // 1461
    month = (fixed - _fixed_from_ethiopic(year, 1, 1)) // 30 + 1
    day = fixed + 1 - _fixed_from_ethiopic(year, month, 1)
    return EthiopianDate(year, month, day)


def to_gregorian(year: int, month: int, day: int) -> date:
    """Ethiopian date -> Gregorian date (validates the Ethiopian date)."""
    return EthiopianDate(year, month, day).to_gregorian()


def format_dual(d: date, lang: str = "en") -> str:
    """Both calendars, e.g. '11 Sep 2024 (1 Meskerem 2017 E.C.)'."""
    greg = d.strftime("%d %b %Y").lstrip("0")
    return f"{greg} ({to_ethiopian(d).format(lang)})"


def ec_year_to_gregorian_span(ec_year: int) -> tuple[date, date]:
    """First and last Gregorian day of an Ethiopian year, e.g. 2016 E.C. -> (2023-09-12, 2024-09-10)."""
    start = to_gregorian(ec_year, 1, 1)
    end = to_gregorian(ec_year, 13, days_in_month(ec_year, 13))
    return start, end
