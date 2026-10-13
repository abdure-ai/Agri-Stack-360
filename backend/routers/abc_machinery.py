"""
routers/abc_machinery.py — ABC machinery and services (milestone A8; rules in backend/abc_machinery.py).

People with a role in the ABC (per-company check; admins may act for any ABC):
  GET  /api/abc/machinery                        machines with utilisation and service due                 (view)
  POST /api/abc/machinery                        {name, kind, ownership, ...}                              (machinery)
  PUT  /api/abc/machinery/{id}                   condition, rates, hours, status                           (machinery)
  GET  /api/abc/machinery/bookings?all=          open bookings in route order                              (view)
  POST /api/abc/machinery/bookings               {farmer_id, service, farm_id?, area_ha?, requested_date}  (machinery)
  POST /api/abc/machinery/bookings/{id}/schedule {machine_id, scheduled_date}                              (machinery)
  POST /api/abc/machinery/bookings/{id}/cancel                                                             (machinery)
  GET  /api/abc/machinery/jobs                   POST {machine_id, booking_id?, hectares|hours, ...}       (machinery)
  GET  /api/abc/machinery/{id}/maintenance       POST {service_date, description, cost_etb, next_due?}     (machinery)
Members:
  GET  /api/abc/my/bookings                      POST {org_id, service, farm_id?, area_ha?, requested_date}
  POST /api/abc/my/bookings/{id}/cancel
"""

from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend import abc_company as core
from backend import abc_machinery as mac
from backend.auth import require_permission
from backend.permissions import P
from backend.platform_db import get_platform_connection

router = APIRouter(tags=["abc-machinery"])
_signed = require_permission(P.PROFILE_MANAGE)     # platform gate; the per-ABC role check follows
Service = Literal["ploughing", "planting", "spraying", "harvesting", "threshing", "transport", "other"]


@router.get("/abc/machinery")
async def list_machines(org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return {"machines": mac.machines(conn, ctx.org["id"]), "can_edit": ctx.can("machinery")}


class MachineIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    kind: Literal["tractor", "combine", "thresher", "truck", "pump", "planter", "sprayer", "other"]
    ownership: Literal["abc", "ati_provided", "rented"] = "abc"
    reg_no: str | None = Field(None, max_length=60)
    condition: Literal["good", "needs_repair", "out_of_service"] = "good"
    rate_per_ha_etb: float | None = Field(None, ge=0, le=1e6)
    rate_per_hour_etb: float | None = Field(None, ge=0, le=1e6)
    hours_per_week: float | None = Field(None, ge=0, le=168)
    note: str | None = Field(None, max_length=500)


@router.post("/abc/machinery", status_code=201)
async def add_machine(req: MachineIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "machinery")
    return mac.add_machine(conn, ctx, user, req.model_dump())


class MachineUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=120)
    reg_no: str | None = Field(None, max_length=60)
    condition: Literal["good", "needs_repair", "out_of_service"] | None = None
    rate_per_ha_etb: float | None = Field(None, ge=0, le=1e6)
    rate_per_hour_etb: float | None = Field(None, ge=0, le=1e6)
    hours_per_week: float | None = Field(None, ge=0, le=168)
    status: Literal["active", "retired"] | None = None
    note: str | None = Field(None, max_length=500)


@router.put("/abc/machinery/{machine_id}")
async def update_machine(machine_id: int, req: MachineUpdate, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "machinery")
    return mac.update_machine(conn, ctx, user, machine_id, req.model_dump(exclude_unset=True))


@router.get("/abc/machinery/bookings")
async def list_bookings(all: bool = False, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return mac.bookings(conn, ctx.org["id"], include_closed=all)


class BookingIn(BaseModel):
    farmer_id: int
    service: Service
    farm_id: int | None = None
    area_ha: float | None = Field(None, gt=0, le=10000)
    requested_date: date
    note: str | None = Field(None, max_length=300)


@router.post("/abc/machinery/bookings", status_code=201)
async def staff_book(req: BookingIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "machinery")
    return mac.book(conn, ctx.org["id"], user, by="staff", **req.model_dump())


class ScheduleIn(BaseModel):
    machine_id: int
    scheduled_date: date


@router.post("/abc/machinery/bookings/{booking_id}/schedule")
async def schedule(booking_id: int, req: ScheduleIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "machinery")
    return mac.schedule(conn, ctx, user, booking_id, req.machine_id, req.scheduled_date)


@router.post("/abc/machinery/bookings/{booking_id}/cancel")
async def cancel(booking_id: int, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "machinery")
    mac.cancel_booking(conn, ctx.org["id"], user, booking_id, member_only=False)
    return {"cancelled": True}


@router.get("/abc/machinery/jobs")
async def list_jobs(machine_id: int | None = None, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return mac.jobs(conn, ctx.org["id"], machine_id)


class JobIn(BaseModel):
    machine_id: int
    booking_id: int | None = None
    farmer_id: int | None = None
    job_date: date
    service: Service = "ploughing"
    hectares: float | None = Field(None, gt=0, le=10000)
    hours: float | None = Field(None, gt=0, le=1000)
    operator: str | None = Field(None, max_length=120)
    fuel_litres: float | None = Field(None, ge=0, le=100000)
    fuel_cost_etb: float | None = Field(None, ge=0, le=1e7)
    charge_etb: float | None = Field(None, ge=0, le=1e7)
    note: str | None = Field(None, max_length=300)


@router.post("/abc/machinery/jobs", status_code=201)
async def log_job(req: JobIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "machinery")
    return mac.log_job(conn, ctx, user, **req.model_dump())


@router.get("/abc/machinery/{machine_id}/maintenance")
async def get_maintenance(machine_id: int, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "view")
    return mac.maintenance_log(conn, ctx.org["id"], machine_id)


class MaintenanceIn(BaseModel):
    service_date: date
    description: str = Field(..., min_length=3, max_length=500)
    parts: str | None = Field(None, max_length=500)
    cost_etb: float = Field(0, ge=0, le=1e8)
    next_due: date | None = None
    condition: Literal["good", "needs_repair", "out_of_service"] | None = None


@router.post("/abc/machinery/{machine_id}/maintenance", status_code=201)
async def add_maintenance(machine_id: int, req: MaintenanceIn, org_id: int | None = None, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    ctx = core.abc_for(conn, user, org_id, "machinery")
    return mac.maintenance(conn, ctx, user, machine_id=machine_id, **req.model_dump())


def _my_org(conn, user: dict, org_id: int) -> int:
    if not conn.execute("SELECT 1 FROM abc_members WHERE org_id=? AND farmer_id=? AND status='active'",
                        (org_id, user["id"])).fetchone():
        raise HTTPException(403, "You are not a member of this ABC.")
    return org_id


@router.get("/abc/my/bookings")
async def my_bookings(user: dict = Depends(_signed)):
    conn = get_platform_connection()
    out = []
    for (org_id, name) in conn.execute("""SELECT o.id, o.name FROM abc_members m JOIN organisations o ON o.id = m.org_id
                                          WHERE m.farmer_id=? AND m.status='active'""", (user["id"],)).fetchall():
        for b in mac.bookings(conn, org_id, farmer_id=user["id"], include_closed=True)[-20:]:
            out.append({**{k: b[k] for k in ("id", "service", "area_ha", "requested_date", "scheduled_date", "status",
                                            "machine", "field_name")}, "org_id": org_id, "org": name})
    return out


class MyBookingIn(BaseModel):
    org_id: int
    service: Service
    farm_id: int | None = None
    area_ha: float | None = Field(None, gt=0, le=10000)
    requested_date: date
    note: str | None = Field(None, max_length=300)


@router.post("/abc/my/bookings", status_code=201)
async def my_book(req: MyBookingIn, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    org = _my_org(conn, user, req.org_id)
    return mac.book(conn, org, user, farmer_id=user["id"], service=req.service, farm_id=req.farm_id, area_ha=req.area_ha,
                    requested_date=req.requested_date, by="member", note=req.note)


@router.post("/abc/my/bookings/{booking_id}/cancel")
async def my_cancel(booking_id: int, user: dict = Depends(_signed)):
    conn = get_platform_connection()
    row = conn.execute("SELECT org_id FROM abc_machine_bookings WHERE id=?", (booking_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Booking not found")
    mac.cancel_booking(conn, row[0], user, booking_id, member_only=True)
    return {"cancelled": True}
