"""
routers/abc_portfolio.py — ATI / government portfolio of ABCs (milestone A10; rules in backend/abc_portfolio.py).

abc:portfolio (ATI programme officer: all ABCs; government: their area; admin: all):
  GET /api/abc/portfolio?area=          ABCs with status, members, inclusion, capital, machinery, compliance alerts
  GET /api/abc/portfolio.csv?area=      the same as CSV (no member identities)
"""

from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from backend import abc_company as core
from backend import abc_portfolio as pf
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection

router = APIRouter(tags=["abc-portfolio"])
_portfolio = require_permission(P.ABC_PORTFOLIO)

COLUMNS = ["name", "abc_type", "status", "region", "zone", "woreda", "members", "members_min", "women_percent",
           "youth_percent", "capital_pledged_etb", "capital_paid_etb", "capital_min_etb", "shares_issued",
           "subscribed_percent", "machines", "machine_hours_30d", "machine_hectares_30d", "machine_utilisation_percent",
           "stock_blocked_lots", "overdue_pledges", "last_general_assembly", "alerts"]


@router.get("/abc/portfolio")
async def portfolio(area: str | None = None, user: dict = Depends(_portfolio)):
    return {**pf.portfolio(get_platform_connection(), user, area), "official_record_note": core.OFFICIAL_RECORD_NOTE}


@router.get("/abc/portfolio.csv")
async def portfolio_csv(area: str | None = None, user: dict = Depends(_portfolio)):
    data = pf.portfolio(get_platform_connection(), user, area)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(COLUMNS)
    for r in data["abcs"]:
        w.writerow([";".join(r[c]) if c == "alerts" else r[c] for c in COLUMNS])
    w.writerow([])
    w.writerow([core.OFFICIAL_RECORD_NOTE])
    return Response("﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="abc-portfolio.csv"'})
