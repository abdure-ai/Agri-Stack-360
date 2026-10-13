// ABC machinery (A8): register with utilisation and service dates, booking queue in route order, job log charged to
// the member's account, maintenance. Changes need the machinery role.
import { api } from "@/api/client";
import Card from "@/components/common/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import type { AbcBooking, AbcMachine } from "@/types/abc";
import { formatETB, formatFullDate } from "@/utils/formatters";
import { CalendarDays, Tractor, Wrench } from "lucide-react";
import { useState } from "react";

const KINDS = ["tractor", "combine", "thresher", "truck", "pump", "planter", "sprayer", "other"] as const;
const today = () => new Date().toISOString().slice(0, 10);

function useRun(onDone: () => void) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (action: () => Promise<unknown>, okText?: string) => {
    setMsg(null);
    try {
      await action();
      if (okText) setMsg({ ok: true, text: okText });
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  };
  return { msg, run };
}

function MachineRow({ m, orgId, canEdit, onChanged }: { m: AbcMachine; orgId: number; canEdit: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ date: today(), what: "", cost: "", next: "", condition: m.condition });
  const { msg, run } = useRun(onChanged);
  const util = m.utilisation_percent ?? 0;
  return (
    <li className="py-2.5">
      <button type="button" className="flex w-full flex-wrap items-center justify-between gap-2 text-start" onClick={() => setOpen((o) => !o)}>
        <span>
          <span className="text-sm font-medium text-gray-800 dark:text-white/90">{m.name}</span>
          <span className="block text-theme-xs text-gray-500">
            {tr(`abc.mac.kind.${m.kind}` as MessageKey)} · {tr(`abc.mac.own.${m.ownership}` as MessageKey)}
            {m.rate_per_ha_etb ? ` · ${formatETB(m.rate_per_ha_etb)}/${tr("unit.ha")}` : ""}{m.rate_per_hour_etb ? ` · ${formatETB(m.rate_per_hour_etb)}/h` : ""}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {m.service_due && <Badge size="sm" color="warning">{tr("abc.mac.serviceDue")}</Badge>}
          <Badge size="sm" color={m.condition === "good" ? "success" : m.condition === "needs_repair" ? "warning" : "error"}>
            {tr(`abc.mac.cond.${m.condition}` as MessageKey)}
          </Badge>
        </span>
      </button>
      <div className="mt-1.5 flex items-center gap-2 text-theme-xs text-gray-500">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-full bg-brand-500" style={{ width: `${Math.min(100, util)}%` }} />
        </div>
        {tr("abc.mac.util", { pct: util, hours: m.hours_30d, available: m.available_hours_30d, ha: m.hectares_30d })}
      </div>
      {open && canEdit && (
        <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
          {msg && <Alert variant={msg.ok ? "success" : "error"} message={msg.text} />}
          <p className="text-theme-xs text-gray-500">
            {m.last_service ? tr("abc.mac.lastService", { date: formatFullDate(m.last_service) }) : tr("abc.mac.noService")}
            {m.next_service ? ` · ${tr("abc.mac.nextService", { date: formatFullDate(m.next_service) })}` : ""}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-36"><Label>{tr("abc.form.date")}</Label><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div className="min-w-0 flex-1"><Label>{tr("abc.mac.work")}</Label><Input value={f.what} onChange={(e) => setF({ ...f, what: e.target.value })} /></div>
            <div className="w-28"><Label>{tr("abc.mac.cost")}</Label><Input inputMode="decimal" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></div>
            <div className="w-36"><Label>{tr("abc.mac.next")}</Label><Input type="date" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></div>
            <div className="w-40"><Label>{tr("abc.mac.condition")}</Label>
              <Select value={f.condition} onChange={(v) => setF({ ...f, condition: v as AbcMachine["condition"] })}
                options={(["good", "needs_repair", "out_of_service"] as const).map((c) => ({ value: c, label: tr(`abc.mac.cond.${c}` as MessageKey) }))} /></div>
            <Button size="sm" variant="outline" startIcon={<Wrench className="size-4" />} disabled={f.what.trim().length < 3}
              onClick={() => run(() => api.abcMaintenance(orgId, m.id, { service_date: f.date, description: f.what.trim(),
                cost_etb: Number(f.cost || 0), next_due: f.next || null, condition: f.condition }), tr("abc.fin.posted"))}>{tr("abc.mac.addService")}</Button>
          </div>
        </div>
      )}
    </li>
  );
}

function AddMachine({ orgId, onDone }: { orgId: number; onDone: () => void }) {
  const [f, setF] = useState({ name: "", kind: "tractor", ownership: "ati_provided", reg: "", perHa: "", perHour: "", hours: "40" });
  const { msg, run } = useRun(onDone);
  return (
    <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
      {msg && <Alert className="mb-2" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="sm:col-span-2"><Label>{tr("abc.mac.name")}</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><Label>{tr("abc.mac.kind")}</Label><Select value={f.kind} onChange={(v) => setF({ ...f, kind: v })}
          options={KINDS.map((k) => ({ value: k, label: tr(`abc.mac.kind.${k}` as MessageKey) }))} /></div>
        <div><Label>{tr("abc.mac.ownership")}</Label><Select value={f.ownership} onChange={(v) => setF({ ...f, ownership: v })}
          options={(["abc", "ati_provided", "rented"] as const).map((o) => ({ value: o, label: tr(`abc.mac.own.${o}` as MessageKey) }))} /></div>
        <div><Label>{tr("abc.mac.reg")}</Label><Input value={f.reg} onChange={(e) => setF({ ...f, reg: e.target.value })} /></div>
        <div><Label>{tr("abc.mac.perHa")}</Label><Input inputMode="decimal" value={f.perHa} onChange={(e) => setF({ ...f, perHa: e.target.value })} /></div>
        <div><Label>{tr("abc.mac.perHour")}</Label><Input inputMode="decimal" value={f.perHour} onChange={(e) => setF({ ...f, perHour: e.target.value })} /></div>
        <div><Label>{tr("abc.mac.hours")}</Label><Input inputMode="decimal" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></div>
      </div>
      <Button className="mt-2" size="sm" disabled={f.name.trim().length < 2} onClick={() => run(async () => {
        await api.abcAddMachine(orgId, { name: f.name.trim(), kind: f.kind, ownership: f.ownership, reg_no: f.reg.trim() || null,
          rate_per_ha_etb: f.perHa ? Number(f.perHa) : null, rate_per_hour_etb: f.perHour ? Number(f.perHour) : null,
          hours_per_week: f.hours ? Number(f.hours) : null });
        setF({ ...f, name: "", reg: "" });
      }, tr("abc.mac.added"))}>{tr("abc.mac.add")}</Button>
    </div>
  );
}

function BookingRow({ b, machines, orgId, canEdit, onChanged }: { b: AbcBooking; machines: AbcMachine[]; orgId: number; canEdit: boolean; onChanged: () => void }) {
  const [machine, setMachine] = useState(b.machine_id ? String(b.machine_id) : "");
  const [date, setDate] = useState(b.scheduled_date ?? b.requested_date);
  const [job, setJob] = useState({ ha: b.area_ha ? String(b.area_ha) : "", hours: "", operator: "", fuel: "", fuelCost: "" });
  const { msg, run } = useRun(onChanged);
  const usable = machines.filter((m) => m.status === "active" && m.condition !== "out_of_service");
  return (
    <li className="py-2.5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <span className="font-medium text-gray-800 dark:text-white/90">{b.name}</span>
          <span className="block text-theme-xs text-gray-500">
            {tr(`abc.mac.svc.${b.service}` as MessageKey)}{b.area_ha ? ` · ${b.area_ha} ${tr("unit.ha")}` : ""}{b.field_name ? ` · ${b.field_name}` : ""}
            {b.kebele ? ` · ${tr("map.kebele", { kebele: b.kebele })}` : ""}{b.distance_km != null ? ` · ${b.distance_km} ${tr("unit.km")}` : ""}
            {` · ${formatFullDate(b.scheduled_date ?? b.requested_date)}`}{b.requested_by === "member" ? ` · ${tr("abc.inp.by.member")}` : ""}
          </span>
        </span>
        <Badge size="sm" color={b.status === "scheduled" ? "success" : "warning"}>{tr(`abc.mac.status.${b.status}` as MessageKey)}{b.machine ? ` · ${b.machine}` : ""}</Badge>
      </div>
      {msg && <Alert className="mt-2" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      {canEdit && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="w-44"><Select value={machine} placeholder={tr("abc.mac.chooseMachine")} onChange={setMachine}
            options={usable.map((m) => ({ value: String(m.id), label: m.name }))} /></div>
          <div className="w-36"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <Button size="xs" variant="outline" disabled={!machine} onClick={() => run(() => api.abcScheduleBooking(orgId, b.id, Number(machine), date))}>
            {tr("abc.mac.schedule")}</Button>
          <Button size="xs" variant="ghost" onClick={() => run(() => api.abcCancelBooking(orgId, b.id))}>{tr("abc.meet.cancel")}</Button>
        </div>
      )}
      {canEdit && b.status === "scheduled" && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-2 dark:bg-white/[0.03]">
          <div className="w-20"><Label>{tr("unit.ha")}</Label><Input inputMode="decimal" value={job.ha} onChange={(e) => setJob({ ...job, ha: e.target.value })} /></div>
          <div className="w-20"><Label>{tr("abc.mac.hoursWorked")}</Label><Input inputMode="decimal" value={job.hours} onChange={(e) => setJob({ ...job, hours: e.target.value })} /></div>
          <div className="w-32"><Label>{tr("abc.mac.operator")}</Label><Input value={job.operator} onChange={(e) => setJob({ ...job, operator: e.target.value })} /></div>
          <div className="w-20"><Label>{tr("abc.mac.fuel")}</Label><Input inputMode="decimal" value={job.fuel} onChange={(e) => setJob({ ...job, fuel: e.target.value })} /></div>
          <div className="w-24"><Label>{tr("abc.mac.fuelCost")}</Label><Input inputMode="decimal" value={job.fuelCost} onChange={(e) => setJob({ ...job, fuelCost: e.target.value })} /></div>
          <Button size="xs" disabled={!job.ha && !job.hours} onClick={() => run(() => api.abcLogJob(orgId, {
            machine_id: b.machine_id, booking_id: b.id, job_date: today(), service: b.service, hectares: job.ha ? Number(job.ha) : null,
            hours: job.hours ? Number(job.hours) : null, operator: job.operator.trim() || null, fuel_litres: job.fuel ? Number(job.fuel) : null,
            fuel_cost_etb: job.fuelCost ? Number(job.fuelCost) : null }), tr("abc.mac.jobLogged"))}>{tr("abc.mac.done")}</Button>
        </div>
      )}
    </li>
  );
}

export default function MachineryTab({ orgId }: { orgId: number }) {
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const ms = useAsync(() => api.abcMachines(orgId), [orgId, version]);
  const bs = useAsync(() => api.abcBookings(orgId), [orgId, version]);
  const js = useAsync(() => api.abcJobs(orgId), [orgId, version]);
  if (ms.loading && !ms.data) return <LoadingState />;
  if (ms.error || !ms.data) return <ErrorState message={ms.error} onRetry={ms.reload} />;
  const { machines, can_edit } = ms.data;
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-4 xl:col-span-5">
        <Card icon={<Tractor className="size-5" />} title={tr("abc.mac.register")}>
          {machines.length ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {machines.map((m) => <MachineRow key={m.id} m={m} orgId={orgId} canEdit={can_edit} onChanged={reload} />)}
            </ul>
          ) : <EmptyState title={tr("abc.mac.none")} />}
          {can_edit && <AddMachine orgId={orgId} onDone={reload} />}
        </Card>
      </div>
      <div className="col-span-12 space-y-4 xl:col-span-7">
        <Card icon={<CalendarDays className="size-5" />} title={tr("abc.mac.bookings")} description={tr("abc.mac.bookingsHint")}>
          {bs.data?.length ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {bs.data.map((b) => <BookingRow key={`${b.id}-${b.status}`} b={b} machines={machines} orgId={orgId} canEdit={can_edit} onChanged={reload} />)}
            </ul>
          ) : <EmptyState title={tr("abc.mac.noBookings")} />}
        </Card>
        {!!js.data?.length && (
          <Card title={tr("abc.mac.jobs")}>
            <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
              {js.data.slice(0, 30).map((j) => (
                <li key={j.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                  <span>{formatFullDate(j.job_date)} · {j.machine} · {j.member ?? "—"} · {tr(`abc.mac.svc.${j.service}` as MessageKey)}
                    <span className="text-theme-xs text-gray-500">{j.hectares ? ` · ${j.hectares} ${tr("unit.ha")}` : ""}{j.hours ? ` · ${j.hours} h` : ""}{j.operator ? ` · ${j.operator}` : ""}</span></span>
                  <span className="font-medium">{formatETB(j.charge_etb)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
