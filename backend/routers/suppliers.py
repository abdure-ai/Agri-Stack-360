"""
routers/suppliers.py — Input supplier listings and AI comparison.
"""

import asyncio
import json
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from backend.platform_db import pquery, pquery_one
from backend.auth import require_permission
from backend.permissions import P

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def _parse_json_field(row: dict, field: str):
    if row.get(field) and isinstance(row[field], str):
        try:
            row[field] = json.loads(row[field])
        except Exception:
            pass
    return row


@router.get("")
async def list_suppliers(
    region: str | None = Query(None),
    category: str | None = Query(None),
    user: dict = Depends(require_permission(P.INPUTS_READ)),
):
    sql = "SELECT * FROM suppliers WHERE active=1"
    params = []

    if region:
        sql += " AND region=?"
        params.append(region)
    elif user.get("region"):
        sql += " AND region=?"
        params.append(user["region"])

    sql += " ORDER BY rating DESC"
    rows = pquery(sql, tuple(params))

    for row in rows:
        _parse_json_field(row, "product_categories")
        _parse_json_field(row, "products")

    if category:
        filtered = []
        for row in rows:
            cats = row.get("product_categories") or []
            if isinstance(cats, list) and any(category.lower() in c.lower() for c in cats):
                filtered.append(row)
        return filtered

    return rows


class CompareRequest(BaseModel):
    supplier_ids: list[int]
    context: str | None = None


@router.post("/compare")
async def compare_suppliers(req: CompareRequest, user: dict = Depends(require_permission(P.INPUTS_READ))):
    if len(req.supplier_ids) < 2:
        return {"comparison": "Select at least 2 suppliers to compare."}
    if len(req.supplier_ids) > 5:
        req.supplier_ids = req.supplier_ids[:5]

    suppliers = []
    for sid in req.supplier_ids:
        row = pquery_one("SELECT * FROM suppliers WHERE id=?", (sid,))
        if row:
            _parse_json_field(row, "product_categories")
            _parse_json_field(row, "products")
            suppliers.append(row)

    if not suppliers:
        return {"comparison": "No suppliers found."}

    summary_lines = []
    for s in suppliers:
        prods = s.get("products") or []
        prod_summary = "; ".join(
            f"{p.get('name','')} {p.get('price','')} ETB/{p.get('unit','')}" for p in prods[:3]
        )
        summary_lines.append(f"- {s['name']} ({s['region']}, {s.get('distance_km','?')}km, rating {s['rating']}): {prod_summary}")

    try:
        from backend.advisory.registry import generate_text

        context_note = f"Context: {req.context}" if req.context else ""
        prompt = (
            f"You are an agricultural advisor in Ethiopia. {context_note}\n"
            f"Compare these agricultural input suppliers for a farmer:\n"
            + "\n".join(summary_lines)
            + "\n\nWrite 2–3 sentences recommending which supplier to choose and why. "
            f"Consider price, distance, and product availability. Be direct and practical."
        )
        # Selected AI engine (Gemini or DeepSeek); blocking, so off the event loop
        comparison = await asyncio.to_thread(generate_text, prompt)
        return {"comparison": comparison.strip(), "suppliers": suppliers}
    except Exception as e:
        return {
            "comparison": f"Could not get AI comparison. Best rated: {suppliers[0]['name']}.",
            "suppliers": suppliers,
        }
