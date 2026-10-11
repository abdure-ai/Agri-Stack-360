"""Loan products are seeded examples: the API must say so, so the screen can label them (checklist Tier 0)."""

import asyncio

from backend.routers import financial


def test_loan_products_are_flagged_as_demo(monkeypatch):
    monkeypatch.setattr(financial, "_compute_credit_score", lambda user: (70, [], []))
    monkeypatch.setattr(financial, "pquery", lambda sql, *a: [
        {"id": 1, "product_name": "Example loan", "lender": "Example lender", "eligible_roles": '["farmer"]',
         "min_credit_score": 50, "interest_rate": 12.0, "max_amount": 10000, "term_months": 12},
    ])
    r = asyncio.run(financial.loan_products(user={"id": 1, "role": "farmer"}))
    assert r["demo_data"] is True and "demonstration" in r["demo_note"]
    assert r["credit_score"] == 70 and [p["match_status"] for p in r["matched"]] == ["eligible"]
