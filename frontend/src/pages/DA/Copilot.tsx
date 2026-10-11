import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import AreaPicker, { areaPcode, EMPTY_AREA } from "@/components/form/AreaPicker";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { LANGUAGE_NAMES, LANGUAGES, tr, trTerm } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import type { DaVisit, PriorityReason } from "@/types/api";
import { formatDateTime } from "@/utils/formatters";
import { ClipboardList, MapPin, Phone, UserPlus, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";

const TH = "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const TD = "px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300";

const REASON_COLOR: Record<PriorityReason, "error" | "warning" | "info" | "light"> = {
  worse: "error",
  uncertain_diagnosis: "warning",
  overdue_follow_up: "warning",
  outbreak_nearby: "info",
  open_question: "light",
};

/** DA Copilot: who to visit first, and the DA's farmers (only those who agreed to share their data). */
export default function Copilot() {
  const { lang } = useI18n();
  const visits = useAsync(() => api.daPriorities(), []);
  const farmers = useAsync(() => api.daFarmers(lang), [lang]);
  const [registering, setRegistering] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <>
      <PageMeta title={`${tr("nav.daCopilot")} | ${tr("app.name")}`} description={tr("da.meta")} />
      <PageHeader title={tr("nav.daCopilot")} description={tr("da.description")} />
      {notice && <Alert className="mb-4" variant="success" message={notice} />}

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 xl:col-span-5">
          <Card accent="rose" icon={<ClipboardList className="size-5" />} title={tr("da.visits")} description={tr("da.visitsHint")}>
            {visits.loading ? (
              <LoadingState />
            ) : visits.error ? (
              <ErrorState message={visits.error} onRetry={visits.reload} />
            ) : !visits.data?.length ? (
              <EmptyState title={tr("da.noVisits")} />
            ) : (
              <ol className="space-y-3">
                {visits.data.map((v, i) => (
                  <VisitRow key={v.farmer.id} visit={v} rank={i + 1} />
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="col-span-12 xl:col-span-7">
          <Card
            accent="teal"
            icon={<Users className="size-5" />}
            title={tr("da.farmers")}
            description={tr("da.farmersHint")}
            actions={
              <Button size="sm" startIcon={<UserPlus className="size-4" />} onClick={() => setRegistering(true)}>
                {tr("da.register")}
              </Button>
            }
            bodyClassName="p-0"
          >
            {farmers.loading ? (
              <LoadingState />
            ) : farmers.error ? (
              <ErrorState message={farmers.error} onRetry={farmers.reload} />
            ) : !farmers.data?.length ? (
              <EmptyState title={tr("da.noFarmers")} />
            ) : (
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                    <TableRow>
                      <TableCell isHeader className={`${TH} ps-5`}>{tr("da.col.farmer")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("da.col.crop")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("da.col.lastCheck")}</TableCell>
                      <TableCell isHeader className={`${TH} pe-5`}>{tr("da.col.open")}</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {farmers.data.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className={`${TD} ps-5`}>
                          <p className="font-medium text-gray-800 dark:text-white/90">{f.name}</p>
                          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                            {[f.kebele, f.woreda].filter(Boolean).join(", ")} · {f.phone}
                          </p>
                          {f.assigned_to_me && (
                            <span className="mt-1 inline-block">
                              <Badge size="sm" color="success">
                                {tr("da.assignedToMe")}
                              </Badge>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={TD}>
                          {f.crops.length ? (
                            f.crops.map((c, i) => (
                              <p key={i}>
                                {trTerm("crop", c.crop)} · {tr("da.day", { n: c.days_after_planting })}
                                {c.stage_name && <span className="block text-theme-xs text-gray-500">{c.stage_name}</span>}
                              </p>
                            ))
                          ) : (
                            <span className="text-gray-400">{tr("da.noCrop")}</span>
                          )}
                        </TableCell>
                        <TableCell className={TD}>
                          {f.latest_diagnosis ? (
                            <>
                              <p>{f.latest_diagnosis.disease ?? "—"}</p>
                              <p className="text-theme-xs text-gray-500">{formatDateTime(f.latest_diagnosis.created_at)}</p>
                            </>
                          ) : (
                            <span className="text-gray-400">{tr("da.noCheck")}</span>
                          )}
                        </TableCell>
                        <TableCell className={`${TD} pe-5`}>
                          <div className="flex flex-wrap gap-1">
                            {f.open_escalations > 0 && (
                              <Badge size="sm" color="error">
                                {tr("da.openCount", { n: f.open_escalations })}
                              </Badge>
                            )}
                            {f.overdue_follow_ups > 0 && (
                              <Badge size="sm" color="warning">
                                {tr("da.overdueCount", { n: f.overdue_follow_ups })}
                              </Badge>
                            )}
                            {!f.open_escalations && !f.overdue_follow_ups && <span className="text-gray-400">—</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {registering && (
        <RegisterFarmerModal
          onClose={() => setRegistering(false)}
          onDone={(name) => {
            setRegistering(false);
            setNotice(tr("da.registered", { name }));
            farmers.reload();
          }}
        />
      )}
    </>
  );
}

function VisitRow({ visit, rank }: { visit: DaVisit; rank: number }) {
  return (
    <li className="flex gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 dark:bg-white/5 dark:text-gray-300">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium text-gray-800 dark:text-white/90">{visit.farmer.name}</p>
          <span className="text-theme-xs text-gray-500 dark:text-gray-400">{tr("da.points", { n: visit.score })}</span>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-theme-xs text-gray-500 dark:text-gray-400">
          {(visit.farmer.kebele || visit.farmer.woreda) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden="true" />
              {[visit.farmer.kebele, visit.farmer.woreda].filter(Boolean).join(", ")}
            </span>
          )}
          <a href={`tel:${visit.farmer.phone}`} className="inline-flex items-center gap-1 hover:text-brand-600">
            <Phone className="size-3" aria-hidden="true" />
            {visit.farmer.phone}
          </a>
          <span>{tr("da.waitingSince", { date: formatDateTime(visit.oldest) })}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {visit.reasons.map((r, i) => (
            <Badge key={i} size="sm" color={REASON_COLOR[r.reason]}>
              {tr(`da.reason.${r.reason}`)}
            </Badge>
          ))}
        </div>
        {visit.reasons.some((r) => r.reason !== "outbreak_nearby" && r.reason !== "overdue_follow_up") && (
          <Link to="/da/escalations" className="mt-2 inline-block text-theme-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            {tr("nav.daInbox")} →
          </Link>
        )}
      </div>
    </li>
  );
}

function RegisterFarmerModal({ onClose, onDone }: { onClose: () => void; onDone: (name: string) => void }) {
  const { lang } = useI18n();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    pin: "",
    area: EMPTY_AREA,
    language: lang as string,
    kebele: "",
    consentData: false,
    consentAlerts: false,
    consentTraining: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError(null);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError(tr("signup.errName"));
    if (!/^0\d{9}$/.test(form.phone.trim())) return setError(tr("signup.errPhone"));
    if (form.pin.length < 6) return setError(tr("signup.errPassword"));
    if (!form.area.woreda_pcode) return setError(tr("signup.errRegion"));
    setBusy(true);
    try {
      const res = await api.daRegisterFarmer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        pin: form.pin,
        area_pcode: areaPcode(form.area),
        language: form.language,
        kebele: form.kebele.trim() || null,
        consent_data: form.consentData,
        consent_alerts: form.consentAlerts,
        consent_training: form.consentTraining,
      });
      onDone(res.name);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="m-4 max-w-2xl p-6 sm:p-8">
      <h3 className="pe-12 text-lg font-semibold text-gray-800 dark:text-white/90">{tr("da.register")}</h3>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{tr("da.registerHint")}</p>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && <Alert variant="error" message={error} />}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="rf-name">{tr("form.fullName")}</Label>
            <Input id="rf-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rf-phone">{tr("form.phone")}</Label>
            <Input id="rf-phone" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rf-pin">{tr("da.pin")}</Label>
            <Input id="rf-pin" value={form.pin} hint={tr("da.pinHint")} onChange={(e) => set("pin", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rf-lang">{tr("form.language")}</Label>
            <Select
              id="rf-lang"
              options={LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))}
              value={form.language}
              onChange={(v) => set("language", v)}
            />
          </div>
          <div className="sm:col-span-2">
            <AreaPicker idPrefix="rf" required value={form.area} onChange={(v) => set("area", v)} />
          </div>
          <div>
            <Label htmlFor="rf-kebele">{tr("da.kebele")}</Label>
            <Input id="rf-kebele" value={form.kebele} onChange={(e) => set("kebele", e.target.value)} />
          </div>
        </div>
        <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <Checkbox id="rf-consent-data" checked={form.consentData} onChange={(v) => set("consentData", v)} label={tr("da.consentDataAsk")} />
          <Checkbox id="rf-consent-alerts" checked={form.consentAlerts} onChange={(v) => set("consentAlerts", v)} label={tr("da.consentAlertsAsk")} />
          <Checkbox id="rf-consent-training" checked={form.consentTraining} onChange={(v) => set("consentTraining", v)} label={tr("da.consentTrainingAsk")} />
          {!form.consentData && <p className="text-theme-xs text-warning-600 dark:text-warning-400">{tr("da.consentNoData")}</p>}
          <p className="text-theme-xs italic text-gray-500 dark:text-gray-400">{tr("consent.legalDraft")}</p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            {tr("common.cancel")}
          </Button>
          <Button type="submit" size="sm" loading={busy}>
            {tr("da.register")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
