"""
platform.py — Farmer Profile and Input Hub adapters.

  LocalFarmerProfileSource  reads users + farmer_profiles + admin_areas in this
                            platform's database. Location falls back to the
                            woreda centre point when a farm has no GPS point.
  ATIFarmerProfileSource    the ATI Farmer Profile System API (complete farmer and land
                            records) over a configurable REST contract (PLACEHOLDER_VERIFY);
                            selected with ADVISORY_PROFILE_PROVIDER=ati. Local stays the default.
  StubInputHub              placeholder offers from data/advisory_seed/input_hub_offers.csv.
                            Only registered products are ever returned; distance
                            is computed from the supplier's woreda centre point.
"""

from __future__ import annotations

import csv
import sqlite3
from pathlib import Path

from backend import admin_areas
from backend.advisory.config import ROOT, env
from backend.advisory.providers import FarmerProfile, InputOffer, ProviderError

OFFERS_FILE = ROOT / "data" / "advisory_seed" / "input_hub_offers.csv"


class LocalFarmerProfileSource:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    def get(self, farmer_id: int) -> FarmerProfile | None:
        cur = self.conn.cursor()
        cur.row_factory = sqlite3.Row
        r = cur.execute(
            """SELECT u.id, u.name, u.phone, u.language, u.region, u.zone, u.woreda, u.woreda_pcode,
                      p.kebele, p.latitude, p.longitude, p.altitude_m, p.assigned_da_id,
                      p.consent_data, p.consent_alerts
               FROM users u LEFT JOIN farmer_profiles p ON p.user_id = u.id WHERE u.id = ?""",
            (farmer_id,),
        ).fetchone()
        if r is None:
            return None
        lat, lon = r["latitude"], r["longitude"]
        region, zone, woreda = r["region"], r["zone"], r["woreda"]
        if r["woreda_pcode"]:
            chain = admin_areas.lineage(self.conn, r["woreda_pcode"])
            if chain:
                names = {a.level_name: a.name for a in chain}
                region, zone, woreda = names.get("region", region), names.get("zone", zone), names.get("woreda", woreda)
                if lat is None:   # no GPS point: use the woreda centre
                    lat, lon = chain[-1].latitude, chain[-1].longitude
        return FarmerProfile(
            farmer_id=r["id"], name=r["name"], phone=r["phone"], language=r["language"] or "en",
            region=region, zone=zone, woreda=woreda, kebele=r["kebele"], latitude=lat, longitude=lon,
            altitude_m=r["altitude_m"], assigned_da_id=r["assigned_da_id"],
            consent_data=bool(r["consent_data"]), consent_alerts=bool(r["consent_alerts"]),
        )


class ATIFarmerProfileSource:
    """
    ATI Farmer Profile System (production source of farmer and land records).

    The API contract is not published yet, so everything about it is configuration
    (PLACEHOLDER_VERIFY until ATI confirms it):
      ATI_FARMER_PROFILE_URL      base URL; the farmer is looked up with GET {url}/farmers?phone=<phone>
      ATI_FARMER_PROFILE_KEY      sent as "Authorization: Bearer <key>"
      ATI_FARMER_PROFILE_MAPPING  JSON {our field: "dotted.path.in.their.record"}; DEFAULT_MAPPING otherwise
      ATI_FARMER_PROFILE_STRICT   "1": fail when ATI can't answer; otherwise use the platform's own record

    The platform's own record is the base: ATI fills in the fields it has. Consent and the assigned
    DA always come from this platform (consent is recorded here). Only the phone number is sent to
    ATI to find the record; nothing goes to any AI service.
    """

    DEFAULT_MAPPING = {   # PLACEHOLDER_VERIFY: field names in the ATI response
        "name": "full_name", "region": "region_name", "zone": "zone_name",
        "woreda": "woreda_name", "kebele": "kebele_name", "latitude": "main_plot.latitude",
        "longitude": "main_plot.longitude", "altitude_m": "main_plot.altitude_m",
    }
    TEXT_FIELDS = ("name", "region", "zone", "woreda", "kebele")   # language stays the user's app choice
    NUMBER_FIELDS = ("latitude", "longitude", "altitude_m")

    def __init__(self, conn: sqlite3.Connection, base_url: str | None = None, api_key: str | None = None,
                 mapping: dict[str, str] | None = None, strict: bool | None = None, client=None, timeout_s: float = 8.0):
        import json

        self.local = LocalFarmerProfileSource(conn)
        self.base_url = (base_url or env("ATI_FARMER_PROFILE_URL") or "").rstrip("/")
        self.api_key = api_key or env("ATI_FARMER_PROFILE_KEY")
        configured = env("ATI_FARMER_PROFILE_MAPPING")
        self.mapping = mapping or (json.loads(configured) if configured else dict(self.DEFAULT_MAPPING))
        unknown = set(self.mapping) - set(self.TEXT_FIELDS) - set(self.NUMBER_FIELDS)
        if unknown:
            raise ValueError(f"ATI_FARMER_PROFILE_MAPPING has unknown fields: {sorted(unknown)}")
        self.strict = strict if strict is not None else env("ATI_FARMER_PROFILE_STRICT", "0") == "1"
        self.client = client
        self.timeout_s = timeout_s

    @staticmethod
    def _pick(record: dict, path: str):
        value = record
        for part in path.split("."):
            if not isinstance(value, dict):
                return None
            value = value.get(part)
        return value

    def _fetch(self, phone: str) -> dict | None:
        import httpx

        if not self.base_url:
            raise ProviderError("ATI_FARMER_PROFILE_URL is not set.")
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        client = self.client or httpx.Client(timeout=self.timeout_s)
        try:
            r = client.get(f"{self.base_url}/farmers", params={"phone": phone}, headers=headers)
        except httpx.HTTPError as e:
            raise ProviderError(f"ATI Farmer Profile System unreachable: {e.__class__.__name__}") from e
        finally:
            if self.client is None:
                client.close()
        if r.status_code == 404:
            return None
        if r.status_code != 200:
            raise ProviderError(f"ATI Farmer Profile System answered {r.status_code}")
        body = r.json()
        farmers = body.get("farmers") if isinstance(body, dict) else body
        if isinstance(farmers, list):
            return farmers[0] if len(farmers) == 1 else None    # none, or ambiguous: don't guess
        return body if isinstance(body, dict) else None

    def get(self, farmer_id: int) -> FarmerProfile | None:
        import dataclasses
        import logging

        base = self.local.get(farmer_id)
        if base is None or not base.phone:
            return base
        try:
            record = self._fetch(base.phone)
        except ProviderError:
            if self.strict:
                raise
            logging.getLogger(__name__).warning("ATI Farmer Profile System unavailable; using the platform record")
            return base
        if not record:
            return base
        updates = {}
        for field, path in self.mapping.items():
            value = self._pick(record, path)
            if value in (None, ""):
                continue
            if field in self.NUMBER_FIELDS:
                try:
                    updates[field] = float(value)
                except (TypeError, ValueError):
                    continue
            else:
                updates[field] = str(value)
        return dataclasses.replace(base, **updates)


class ShopInputHub:
    """Offers from the platform's agro-dealer shops: registered products in stock, with the shop's own price.

    Nearest first (woreda centre of the shop to the farm point, else same woreda / zone / region). Neither the
    verified-seller badge nor anything else changes the order (spec F8): the badge is shown next to the shop."""

    MAX_SHOPS = 4          # the nearest shops, each with every plan product it has in stock

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    def offers(self, product_ids: list[int], latitude: float | None, longitude: float | None,
               region: str | None, area_pcode: str | None = None) -> list[InputOffer]:
        if not product_ids:
            return []
        marks = ",".join("?" * len(product_ids))
        cur = self.conn.execute(
            f"""SELECT o.id AS shop_id, o.name, o.phone, o.verified, o.woreda_pcode, w.name AS woreda,
                       p.id AS product_id, p.product_name, sp.price_etb, sp.pack_size, sp.price_is_sample,
                       sp.price_updated_at
                FROM shop_products sp JOIN organisations o ON o.id = sp.org_id
                JOIN approved_products p ON p.id = sp.product_id
                LEFT JOIN admin_areas w ON w.pcode = o.woreda_pcode
                WHERE sp.product_id IN ({marks}) AND sp.in_stock = 1 AND p.status = 'registered'
                  AND o.type = 'agro_dealer' AND o.status = 'active'""", tuple(product_ids))
        cols = [d[0] for d in cur.description]
        out: list[tuple] = []
        for r in (dict(zip(cols, row)) for row in cur.fetchall()):
            dist = None
            area = admin_areas.get_area(self.conn, r["woreda_pcode"] or "") if r["woreda_pcode"] else None
            if area and area.latitude is not None and latitude is not None:
                dist = round(admin_areas.distance_km(latitude, longitude, area.latitude, area.longitude), 1)
            here, there = area_pcode or "", r["woreda_pcode"] or ""
            rank = next((i for i, n in enumerate((len(here), 6, 4)) if here and there and len(here) >= n
                         and here[:n] == there[:n]), 3)
            offer = InputOffer(
                product_id=r["product_id"], product_name=r["product_name"], supplier=r["name"], distance_km=dist,
                price_etb=r["price_etb"], unit=r["pack_size"], in_stock=True, shop_id=r["shop_id"], phone=r["phone"],
                woreda=r["woreda"], verified_seller=bool(r["verified"]), price_is_sample=bool(r["price_is_sample"]),
                price_updated_at=r["price_updated_at"])
            out.append(((dist is None, dist or 0.0, rank, r["name"], r["product_name"]), offer))
        ranked = [o for _, o in sorted(out, key=lambda x: x[0])]
        shops = list(dict.fromkeys(o.shop_id for o in ranked))[:self.MAX_SHOPS]
        return [o for o in ranked if o.shop_id in shops]


class StubInputHub:
    def __init__(self, conn: sqlite3.Connection, offers_file: Path = OFFERS_FILE):
        self.conn = conn
        self.offers_file = offers_file

    def _rows(self) -> list[dict]:
        if not self.offers_file.exists():
            return []
        with self.offers_file.open(encoding="utf-8-sig", newline="") as f:
            return list(csv.DictReader(f))

    def offers(self, product_ids: list[int], latitude: float | None, longitude: float | None,
               region: str | None) -> list[InputOffer]:
        if not product_ids:
            return []
        marks = ",".join("?" * len(product_ids))
        registered = {
            r[1]: r[0] for r in self.conn.execute(
                f"SELECT id, product_name FROM approved_products WHERE id IN ({marks}) AND status='registered'",
                tuple(product_ids))
        }
        out: list[InputOffer] = []
        for row in self._rows():
            pid = registered.get(row["product_name"])
            if pid is None:
                continue   # unknown, banned or expired products are never offered
            dist = None
            area = admin_areas.get_area(self.conn, row.get("supplier_woreda_pcode") or "")
            if area and area.latitude is not None and latitude is not None:
                dist = round(admin_areas.distance_km(latitude, longitude, area.latitude, area.longitude), 1)
            price = row.get("price_etb") or ""
            out.append(InputOffer(
                product_id=pid, product_name=row["product_name"], supplier=row["supplier"], distance_km=dist,
                price_etb=float(price) if price.replace(".", "", 1).isdigit() else None,
                unit=row.get("unit") or None, in_stock=(row.get("in_stock") or "").lower() in ("1", "yes", "true"),
                sponsored=(row.get("sponsored") or "").lower() in ("1", "yes", "true"),
            ))
        # Neutrality (spec F8): nearest first; sponsorship never affects order.
        return sorted(out, key=lambda o: (o.distance_km is None, o.distance_km or 0.0, o.product_name))
