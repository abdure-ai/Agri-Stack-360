// ABC member registry (A3): members with consent, gender / age group, masked national ID and plots; enrol one,
// or import many from a CSV (check first, then import). The server checks the person's role in the ABC.
import { api } from "@/api/client";
import Card from "@/components/common/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import AreaPicker, { type AreaValue } from "@/components/form/AreaPicker";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, trTerm, type MessageKey } from "@/i18n/core";
import type { AbcImportReport, AbcRegistryMember } from "@/types/abc";
import { formatFullDate } from "@/utils/formatters";
import { Download, FileUp, IdCard, UserPlus, Users } from "lucide-react";
import { useState, type FormEvent } from "react";

const GENDERS = ["female", "male"] as const;
const AGES = ["15-29", "30-44", "45-59", "60+"] as const;
const IDS = ["fayda", "kebele_id", "other"] as const;

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

function Inclusion({ orgId, version }: { orgId: number; version: number }) {
  const inc = useAsync(() => api.abcInclusion(orgId), [orgId, version]);
  const d = inc.data;
  if (!d || !d.total) return null;
  const pct = (n = 0) => `${Math.round((100 * n) / d.total)}%`;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        [tr("abc.reg.members"), String(d.total)],
        [tr("abc.reg.women"), `${d.gender.female ?? 0} (${pct(d.gender.female)})`],
        [tr("abc.reg.youth"), `${d.age_group["15-29"] ?? 0} (${pct(d.age_group["15-29"])})`],
        [tr("abc.reg.unknown"), String(Math.max(d.unknown_gender, d.unknown_age))],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
          <p className="text-theme-xs text-gray-500">{label}</p>
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">{value}</p>
        </div>
      ))}
    </div>
  );
}

function MemberRow({ m, orgId, canEdit, onChanged }: { m: AbcRegistryMember; orgId: number; canEdit: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [shownId, setShownId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const plots = useAsync(() => (open && m.status === "active" ? api.abcMemberPlots(orgId, m.farmer_id) : Promise.resolve(null)), [open]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <li className="py-2.5">
      <button type="button" className="flex w-full flex-wrap items-center justify-between gap-2 text-start" onClick={() => setOpen((o) => !o)}>
        <span className="min-w-0">
          <span className="text-sm font-medium text-gray-800 dark:text-white/90">
            {m.member_no ? `#${m.member_no} · ` : ""}{m.name}
          </span>
          <span className="block text-theme-xs text-gray-500">
            {m.phone}{m.woreda ? ` · ${m.woreda}` : ""}{m.kebele ? ` · ${m.kebele}` : ""}
            {` · ${tr("abc.reg.plots", { n: m.plots, ha: m.area_ha })}`}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {m.gender && <Badge size="sm" color="light">{tr(`abc.gender.${m.gender}` as MessageKey)}</Badge>}
          {m.age_group && <Badge size="sm" color="light">{m.age_group}</Badge>}
          {m.id_masked && <Badge size="sm" color="light">{m.id_masked}</Badge>}
          <Badge size="sm" color={m.status === "active" ? "success" : "warning"}>{tr(`abc.reg.status.${m.status}` as MessageKey)}</Badge>
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-white/[0.03]">
          {error && <Alert variant="error" message={error} />}
          {m.consent_method && (
            <p className="text-theme-xs text-gray-600 dark:text-gray-400">
              {tr("abc.reg.consentLine", { method: tr(`abc.consent.${m.consent_method}` as MessageKey), by: m.consent_recorded_by ?? "—",
                date: m.consent_recorded_at ? formatFullDate(m.consent_recorded_at.slice(0, 10)) : "—" })}
            </p>
          )}
          {plots.data && (
            plots.data.length ? (
              <ul className="text-theme-xs text-gray-600 dark:text-gray-400">
                {plots.data.map((p) => (
                  <li key={p.id}>
                    {p.field_name}: {p.crop_name ? trTerm("crop", p.crop_name) : "—"}{p.area_ha ? ` · ${p.area_ha} ${tr("unit.ha")}` : ""}
                    {p.irrigated ? ` · ${tr("abc.reg.irrigated")}` : ""}{p.active_season ? ` · ${p.active_season.split(" · ").map((x, i) => trTerm(i ? "season" : "crop", x)).join(" · ")}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-theme-xs text-gray-500">{tr("abc.reg.noPlots")}</p>
            )
          )}
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-32">
                <Label>{tr("abc.reg.gender")}</Label>
                <Select value={m.gender ?? ""} placeholder="—" onChange={(v) => run(() => api.abcUpdateMember(orgId, m.farmer_id, { gender: v || null }))}
                  options={GENDERS.map((g) => ({ value: g, label: tr(`abc.gender.${g}` as MessageKey) }))} />
              </div>
              <div className="w-32">
                <Label>{tr("abc.reg.age")}</Label>
                <Select value={m.age_group ?? ""} placeholder="—" onChange={(v) => run(() => api.abcUpdateMember(orgId, m.farmer_id, { age_group: v || null }))}
                  options={AGES.map((a) => ({ value: a, label: a }))} />
              </div>
              {m.id_masked && (
                <Button size="sm" variant="outline" startIcon={<IdCard className="size-4" />}
                  onClick={async () => {
                    const reason = window.prompt(tr("abc.reg.idReason"));
                    if (!reason || reason.trim().length < 5) return;
                    try {
                      setShownId((await api.abcViewId(orgId, m.farmer_id, reason.trim())).id_number);
                    } catch (err) {
                      setError(errorMessage(err));
                    }
                  }}>
                  {shownId ?? tr("abc.reg.showId")}
                </Button>
              )}
              <Button size="sm" variant="ghost"
                onClick={() => {
                  const reason = window.prompt(tr("abc.reg.removeReason"));
                  if (reason && reason.trim().length >= 3) void run(() => api.abcRemoveMemberRegistry(orgId, m.farmer_id, reason.trim()));
                }}>
                {tr("abc.reg.remove")}
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function EnrolForm({ orgId, onDone }: { orgId: number; onDone: () => void }) {
  const [f, setF] = useState({ phone: "", name: "", pin: "", kebele: "", gender: "", age_group: "", id_type: "fayda", id_number: "",
    consent_method: "spoken" });
  const [area, setArea] = useState<AreaValue>({ region_pcode: "", zone_pcode: "", woreda_pcode: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await api.abcEnrol(orgId, {
        phone: f.phone.trim(), name: f.name.trim() || null, pin: f.pin || null, kebele: f.kebele.trim() || null,
        area_pcode: area.woreda_pcode || null, gender: f.gender || null, age_group: f.age_group || null,
        id_type: f.id_number.trim() ? f.id_type : null, id_number: f.id_number.trim() || null, consent_method: f.consent_method,
      });
      setMsg({ ok: true, text: tr(r.status === "invited" ? "abc.reg.invited" : r.account_created ? "abc.reg.created" : "abc.reg.added") });
      setF({ ...f, phone: "", name: "", pin: "", kebele: "", id_number: "" });
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  }

  return (
    <Card icon={<UserPlus className="size-5" />} title={tr("abc.reg.enrol")} description={tr("abc.reg.enrolHint")}>
      {msg && <Alert className="mb-3" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="en-phone">{tr("abc.company.phone")}</Label>
          <Input id="en-phone" inputMode="tel" value={f.phone} placeholder="09…" onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="en-consent">{tr("abc.reg.consent")}</Label>
          <Select id="en-consent" value={f.consent_method} onChange={(v) => setF({ ...f, consent_method: v })}
            options={(["spoken", "app"] as const).map((c) => ({ value: c, label: tr(`abc.consent.${c}` as MessageKey) }))} />
        </div>
        <p className="text-theme-xs text-gray-500 sm:col-span-2">{tr("abc.reg.newHint")}</p>
        <div>
          <Label htmlFor="en-name">{tr("abc.reg.name")}</Label>
          <Input id="en-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="en-pin">{tr("abc.reg.pin")}</Label>
          <Input id="en-pin" inputMode="numeric" value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <AreaPicker idPrefix="en" value={area} onChange={setArea} />
        </div>
        <div>
          <Label htmlFor="en-gender">{tr("abc.reg.gender")}</Label>
          <Select id="en-gender" value={f.gender} placeholder="—" placeholderSelectable onChange={(v) => setF({ ...f, gender: v })}
            options={GENDERS.map((g) => ({ value: g, label: tr(`abc.gender.${g}` as MessageKey) }))} />
        </div>
        <div>
          <Label htmlFor="en-age">{tr("abc.reg.age")}</Label>
          <Select id="en-age" value={f.age_group} placeholder="—" placeholderSelectable onChange={(v) => setF({ ...f, age_group: v })}
            options={AGES.map((a) => ({ value: a, label: a }))} />
        </div>
        <div>
          <Label htmlFor="en-idtype">{tr("abc.reg.idType")}</Label>
          <Select id="en-idtype" value={f.id_type} onChange={(v) => setF({ ...f, id_type: v })}
            options={IDS.map((i) => ({ value: i, label: tr(`abc.idType.${i}` as MessageKey) }))} />
        </div>
        <div>
          <Label htmlFor="en-id">{tr("abc.reg.idNumber")}</Label>
          <Input id="en-id" value={f.id_number} autoComplete="off" onChange={(e) => setF({ ...f, id_number: e.target.value })} />
          <p className="mt-1 text-theme-xs text-gray-500">{tr("abc.reg.idHint")}</p>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={f.phone.trim().length !== 10}>{tr("abc.reg.enrolButton")}</Button>
        </div>
      </form>
    </Card>
  );
}

function ImportCard({ orgId, onDone }: { orgId: number; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<AbcImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(dryRun: boolean) {
    if (!file) return;
    setError(null);
    try {
      setReport(await api.abcImportMembers(orgId, file, dryRun));
      if (!dryRun) onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Card icon={<FileUp className="size-5" />} title={tr("abc.reg.import")} description={tr("abc.reg.importHint")}>
      {error && <Alert className="mb-3" variant="error" message={error} />}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" startIcon={<Download className="size-4" />}
          onClick={async () => saveBlob(await api.abcMembersTemplate(orgId), "abc-members-template.csv")}>
          {tr("lv.import.template")}
        </Button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">
          <FileUp className="size-4" aria-hidden="true" />
          {file ? file.name : tr("abc.form.chooseFile")}
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setReport(null); }} />
        </label>
        <Button size="sm" variant="outline" disabled={!file} onClick={() => run(true)}>{tr("abc.reg.check")}</Button>
        <Button size="sm" disabled={!file || !report?.dry_run || !report.ok} onClick={() => run(false)}>
          {tr("abc.reg.importButton", { n: report?.ok ?? 0 })}
        </Button>
      </div>
      {report && (
        <div className="mt-3 text-sm">
          <p className="text-gray-700 dark:text-gray-300">
            {tr(report.dry_run ? "abc.reg.checkResult" : "abc.reg.importResult",
              { rows: report.rows, ok: report.ok, created: report.new_accounts, errors: report.errors.length })}
          </p>
          {!!report.errors.length && (
            <ul className="mt-2 max-h-48 list-disc overflow-y-auto ps-5 text-theme-xs text-error-600">
              {report.errors.map((e) => (
                <li key={e.line}>{tr("abc.reg.line", { line: e.line })} ({e.phone || "—"}): {e.problems.join("; ")}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

export default function RegistryTab({ orgId }: { orgId: number }) {
  const [version, setVersion] = useState(0);
  const reg = useAsync(() => api.abcRegistry(orgId), [orgId, version]);
  const reload = () => setVersion((v) => v + 1);
  if (reg.loading && !reg.data) return <LoadingState />;
  if (reg.error || !reg.data) return <ErrorState message={reg.error} onRetry={reg.reload} />;
  const { members, can_edit } = reg.data;
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className={can_edit ? "col-span-12 space-y-4 xl:col-span-7" : "col-span-12 space-y-4"}>
        <Inclusion orgId={orgId} version={version} />
        <Card icon={<Users className="size-5" />} title={tr("abc.reg.title")} description={tr("abc.reg.hint", { n: members.length })}>
          {members.length ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {members.map((m) => (
                <MemberRow key={m.farmer_id} m={m} orgId={orgId} canEdit={can_edit} onChanged={reload} />
              ))}
            </ul>
          ) : (
            <EmptyState title={tr("abc.reg.none")} />
          )}
          <p className="mt-3 text-theme-xs text-gray-500">{reg.data.official_record_note}</p>
        </Card>
      </div>
      {can_edit && (
        <div className="col-span-12 space-y-4 xl:col-span-5">
          <EnrolForm orgId={orgId} onDone={reload} />
          <ImportCard orgId={orgId} onDone={reload} />
        </div>
      )}
    </div>
  );
}
