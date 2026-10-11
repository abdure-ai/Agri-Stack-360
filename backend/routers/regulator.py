"""
routers/regulator.py — Regulator view (EAA, checklist 1.11). Read-only except importing the official list.

  GET  /api/regulator/registry             registered-product list with status and verification
  GET  /api/regulator/registry.csv         export (same columns as approved_products.csv)
  POST /api/regulator/registry             import the official list (CSV, validated by the seed loader)
  GET  /api/regulator/counterfeits?days=   failed / copied / unknown code checks and fake reports by woreda
  GET  /api/regulator/issuance             per supplier: batches, packs, checks, warnings, recalls
All need registry:manage (regulator, admin).
"""

from __future__ import annotations

import csv
import io
import json
import tempfile
from datetime import timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response

from backend.advisory.config import local_now
from backend.advisory.schema import VERIFIED
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection, pquery

router = APIRouter(prefix="/regulator", tags=["regulator"])
_reg = require_permission(P.REGISTRY_MANAGE)
COLUMNS = ["product_name", "active_ingredient", "formulation", "registration_number", "category", "target_crops",
           "target_diseases", "status", "source", "verification_status"]


@router.get("/registry")
async def registry(_user=Depends(_reg)):
    rows = pquery("SELECT * FROM approved_products ORDER BY status, product_name")
    for r in rows:
        r["target_crops"] = json.loads(r["target_crops"] or "[]")
        r["target_diseases"] = json.loads(r["target_diseases"] or "[]")
    summary = {"total": len(rows),
               "registered": sum(r["status"] == "registered" for r in rows),
               "banned": sum(r["status"] == "banned" for r in rows),
               "expired": sum(r["status"] == "expired" for r in rows),
               "placeholder": sum(r["verification_status"] != VERIFIED for r in rows)}
    return {"summary": summary, "products": rows}


@router.get("/registry.csv")
async def registry_csv(_user=Depends(_reg)):
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=COLUMNS)
    w.writeheader()
    for r in pquery(f"SELECT {', '.join(COLUMNS)} FROM approved_products ORDER BY product_name"):
        for k in ("target_crops", "target_diseases"):
            r[k] = "|".join(json.loads(r[k] or "[]"))
        w.writerow(r)
    return Response("﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="approved_products.csv"'})


@router.post("/registry")
async def import_registry(file: UploadFile = File(...), _user=Depends(_reg)):
    """Add or update products by name + formulation. Rows count as verified only if the file says so;
    products not in the file are left as they are (an official list import never deletes)."""
    from backend.advisory.seed_loader import SeedError, load_seed

    data = await file.read(5 * 1024 * 1024 + 1)
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(413, "File too large (5 MB max).")
    with tempfile.TemporaryDirectory() as tmp:
        (Path(tmp) / "approved_products.csv").write_bytes(data)
        try:
            report = load_seed(get_platform_connection(), Path(tmp))
        except SeedError as e:
            raise HTTPException(400, str(e))
    return {"loaded": report.loaded.get("approved_products", 0), "placeholders": report.placeholders.get("approved_products", 0)}


@router.get("/counterfeits")
async def counterfeits(days: int = Query(90, ge=1, le=365), _user=Depends(_reg)):
    since = (local_now() - timedelta(days=days)).isoformat(sep=" ", timespec="seconds")
    checks = pquery("""SELECT v.woreda_pcode AS pcode, v.reason, COUNT(*) AS n FROM verifications v
                       WHERE v.created_at >= ? AND v.result = 'warning' AND v.woreda_pcode IS NOT NULL
                       GROUP BY v.woreda_pcode, v.reason""", (since,))
    fakes = pquery("""SELECT woreda_pcode AS pcode, COUNT(*) AS n FROM fake_reports
                      WHERE created_at >= ? AND woreda_pcode IS NOT NULL GROUP BY woreda_pcode""", (since,))
    per: dict[str, dict] = {}
    for c in checks:
        w = per.setdefault(c["pcode"], {"warnings": 0, "by_reason": {}, "fake_reports": 0})
        w["warnings"] += c["n"]
        w["by_reason"][c["reason"]] = c["n"]
    for f in fakes:
        per.setdefault(f["pcode"], {"warnings": 0, "by_reason": {}, "fake_reports": 0})["fake_reports"] = f["n"]
    names = {r["pcode"]: r for r in pquery(
        f"""SELECT w.pcode, w.name AS woreda, z.name AS zone, rg.name AS region, w.latitude, w.longitude FROM admin_areas w
            LEFT JOIN admin_areas z ON z.pcode = w.parent_pcode LEFT JOIN admin_areas rg ON rg.pcode = w.region_pcode
            WHERE w.pcode IN ({','.join('?' * len(per)) or "''"})""", tuple(per))}
    rows = [{"pcode": k, **{x: names.get(k, {}).get(x) for x in ("woreda", "zone", "region", "latitude", "longitude")}, **v}
            for k, v in per.items()]
    rows.sort(key=lambda r: -(r["warnings"] + r["fake_reports"]))
    return {"days": days, "woredas": rows,
            "totals": {"warnings": sum(r["warnings"] for r in rows), "fake_reports": sum(r["fake_reports"] for r in rows)}}


@router.get("/issuance")
async def issuance(_user=Depends(_reg)):
    return pquery("""SELECT o.id, o.name, o.status,
                            COUNT(DISTINCT b.id) AS batches, COALESCE(SUM(b.units), 0) AS units,
                            SUM(b.status = 'recalled') AS recalled,
                            (SELECT COUNT(*) FROM verifications v JOIN code_batches bb ON bb.id = v.batch_id WHERE bb.org_id = o.id) AS checks,
                            (SELECT COUNT(*) FROM verifications v JOIN code_batches bb ON bb.id = v.batch_id
                              WHERE bb.org_id = o.id AND v.result = 'warning') AS warnings,
                            (SELECT COUNT(*) FROM org_products op WHERE op.org_id = o.id) AS products
                     FROM organisations o LEFT JOIN code_batches b ON b.org_id = o.id
                     WHERE o.type = 'supplier' GROUP BY o.id ORDER BY o.name""")
