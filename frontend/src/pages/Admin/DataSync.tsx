import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import StatCard from "@/components/common/StatCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import type {
  RetrainStatus,
  SyncProgress,
  SyncRun,
  SyncScope,
  SyncSettings,
  SyncStatus,
  SyncStatusResponse,
} from "@/types/api";
import { cn } from "@/utils";
import { daysSince, formatDateTime, formatDuration, formatFullDate, formatNumber } from "@/utils/formatters";
import { BrainCircuit, CalendarClock, CalendarDays, Clock, Database, RefreshCw, Store } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { tr, type MessageKey } from "@/i18n/core";

const SERVICE = "service.sync" as const;
const POLL_RUNNING_MS = 2500;
const POLL_IDLE_MS = 15000;

const STATUS: Record<SyncStatus, { color: "success" | "warning" | "error" | "info" | "light"; label: MessageKey }> = {
  running: { color: "info", label: "sync.status.running" },
  success: { color: "success", label: "sync.status.success" },
  partial: { color: "warning", label: "sync.status.partial" },
  failed: { color: "error", label: "sync.status.failed" },
  cancelled: { color: "light", label: "sync.status.cancelled" },
  interrupted: { color: "warning", label: "sync.status.interrupted" },
};

const RETRAIN: Record<RetrainStatus, { color: "success" | "warning" | "error" | "info" | "light"; label: MessageKey }> = {
  running: { color: "info", label: "sync.retrain.running" },
  success: { color: "success", label: "sync.retrain.success" },
  skipped: { color: "light", label: "sync.retrain.skipped" },
  failed: { color: "error", label: "sync.status.failed" },
  cancelled: { color: "light", label: "sync.status.cancelled" },
};

const PHASES: Record<SyncProgress["phase"], MessageKey> = {
  starting: "sync.phase.starting",
  catalog: "sync.phase.catalog",
  prices: "sync.phase.prices",
  export: "sync.phase.export",
  retrain: "sync.phase.retrain",
};

// Python weekday numbers: Monday = 0. The weekday.* keys use JavaScript's Sunday = 0.
const pythonWeekdayName = (i: number) => tr(`weekday.${(i + 1) % 7}` as MessageKey);
const scopeName = (scope: string) => tr(scope === "all" ? "sync.full" : "sync.quick");

const TH = "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const TD = "px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300 whitespace-nowrap";

const isResumable = (r: SyncRun | null | undefined) => !!r && (r.status === "cancelled" || r.status === "interrupted");

export default function DataSync() {
  const overview = useAsync(() => api.syncOverview(), [], SERVICE);
  const runs = useAsync(() => api.syncRuns(25), [], SERVICE);
  const reloadRuns = runs.reload;
  const reloadOverview = overview.reload;

  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const wasRunning = useRef(false);

  const running = status?.running ?? null;

  const refreshStatus = useCallback(async () => {
    try {
      const s = await api.syncStatus();
      setStatus(s);
      setStatusError(null);
      // A run just finished: refresh history and database numbers
      if (wasRunning.current && !s.running) {
        reloadRuns();
        reloadOverview();
      }
      wasRunning.current = !!s.running;
    } catch (e) {
      setStatusError(errorMessage(e, SERVICE));
    }
  }, [reloadRuns, reloadOverview]);

  // Poll faster while a run is in progress
  const isRunning = !!running;
  useEffect(() => {
    const first = setTimeout(refreshStatus, 0);
    const id = setInterval(refreshStatus, isRunning ? POLL_RUNNING_MS : POLL_IDLE_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [refreshStatus, isRunning]);

  async function act(fn: () => Promise<unknown>) {
    setActionError(null);
    try {
      await fn();
      await refreshStatus();
      runs.reload();
    } catch (e) {
      setActionError(errorMessage(e, SERVICE));
    }
  }

  const db = overview.data?.database;
  const models = overview.data?.models;
  const age = daysSince(db?.latest_date);
  const lastRun = status?.last_run;

  return (
    <>
      <PageMeta title={`${tr("nav.dataSync")} | ${tr("app.name")}`} description={tr("sync.meta")} />
      <PageHeader title={tr("nav.dataSync")} description={tr("sync.description")} />

      {statusError && !status ? (
        <Card>
          <ErrorState title={tr("sync.unreachable")} message={statusError} onRetry={refreshStatus} />
        </Card>
      ) : (
        <div className="space-y-6">
          {actionError && <Alert variant="error" message={actionError} />}
          {statusError && status && <Alert variant="warning" message={tr("sync.livePaused", { error: statusError })} />}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
            <StatCard
              accent={age != null && age > 14 ? "amber" : "green"}
              icon={<CalendarDays className="size-6" />}
              label={tr("sync.latestDate")}
              loading={overview.loading}
              value={formatFullDate(db?.latest_date)}
              tone={age != null && age > 14 ? "warning" : "default"}
              footer={age != null && tr(age === 1 ? "sync.dayAgo" : "sync.daysAgo", { n: age })}
            />
            <StatCard
              accent="blue"
              icon={<Database className="size-6" />}
              label={tr("sync.priceRecords")}
              loading={overview.loading}
              value={formatNumber(db?.price_rows)}
              footer={db && tr("sync.since", { date: formatFullDate(db.earliest_date) })}
            />
            <StatCard
              accent="orange"
              icon={<Store className="size-6" />}
              label={tr("sync.marketsCrops")}
              loading={overview.loading}
              value={db ? `${formatNumber(db.markets)} · ${formatNumber(db.crops)}` : "—"}
              footer={db && tr("sync.varieties", { n: formatNumber(db.varieties) })}
            />
            <StatCard
              accent="violet"
              icon={<BrainCircuit className="size-6" />}
              label={tr("sync.forecastData")}
              loading={overview.loading}
              value={formatFullDate(models?.latest_data_date)}
              tone={models?.latest_data_date && db?.latest_date && models.latest_data_date < db.latest_date ? "warning" : "default"}
              footer={models?.last_retrained_at && tr("sync.retrained", { date: formatDateTime(models.last_retrained_at) })}
            />
          </div>
          {overview.error && <Alert variant="error" message={overview.error} />}

          {running ? (
            <RunningPanel progress={running} log={status?.live_log ?? []} onStop={() => act(() => api.syncStop())} />
          ) : (
            isResumable(lastRun) && (
              <Alert
                variant="warning"
                title={tr(lastRun!.status === "cancelled" ? "sync.runStopped" : "sync.runInterrupted", { id: lastRun!.id })}
                message={tr("sync.resumeHint", { done: formatNumber(lastRun!.pairs_done), total: formatNumber(lastRun!.pairs_total) })}
                action={
                  <Button size="sm" onClick={() => act(() => api.syncResume(lastRun!.id))}>
                    {tr("sync.resume")}
                  </Button>
                }
              />
            )
          )}

          <div className="grid grid-cols-12 gap-4 md:gap-6">
            <div className="col-span-12 xl:col-span-6">
              <StartCard
                disabled={!!running || !status}
                estimates={overview.data?.estimates_minutes}
                pairs={db?.pairs}
                onStart={(opts) => act(() => api.syncStart(opts))}
              />
            </div>
            <div className="col-span-12 xl:col-span-6">
              {status && <ScheduleCard schedule={status.schedule} onSaved={refreshStatus} />}
            </div>
          </div>

          <Card accent="teal" icon={<Clock className="size-5" />} title={tr("sync.history")} description={tr("sync.historyHint")} bodyClassName="px-0 sm:px-0 pb-2">
            {runs.loading && !runs.data ? (
              <LoadingState />
            ) : runs.error ? (
              <ErrorState message={runs.error} onRetry={runs.reload} />
            ) : !runs.data?.length ? (
              <EmptyState title={tr("sync.noRuns")} description={tr("sync.noRunsHint")} />
            ) : (
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                    <TableRow>
                      <TableCell isHeader className={`${TH} ps-5 sm:ps-6`}>{tr("sync.col.run")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("sync.col.started")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("sync.col.type")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("common.status")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("sync.col.pairs")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("sync.newPrices")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("sync.col.duration")}</TableCell>
                      <TableCell isHeader className={`${TH} pe-5 sm:pe-6`}>{tr("sync.forecasts")}</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {runs.data.map((r) => (
                      <RunRow key={r.id} run={r} onOpen={() => setDetailId(r.id)} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}

      {detailId != null && (
        <RunDetailModal
          runId={detailId}
          onClose={() => setDetailId(null)}
          onResume={(id) => {
            setDetailId(null);
            void act(() => api.syncResume(id));
          }}
          canResume={!running}
        />
      )}
    </>
  );
}

// ── Running ─────────────────────────────────────────────────────────────────

function RunningPanel({ progress: p, log, onStop }: { progress: SyncProgress; log: string[]; onStop: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const pct = p.pairs_total ? Math.min(100, (p.pairs_done / p.pairs_total) * 100) : 0;
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  return (
    <Card
      accent="green"
      title={
        <span className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-brand-500" />
          </span>
          {tr("sync.running", { id: p.run_id, scope: scopeName(p.scope) })}
        </span>
      }
      description={`${tr(PHASES[p.phase])}${p.current ? ` · ${p.current}` : ""}`}
      actions={
        <Button size="sm" variant="danger" disabled={p.stop_requested} onClick={() => setConfirm(true)}>
          {tr(p.stop_requested ? "sync.stopping" : "sync.stop")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex flex-wrap justify-between gap-2 text-theme-sm text-gray-600 dark:text-gray-400">
            <span>
              {formatNumber(p.pairs_done)} / {formatNumber(p.pairs_total)} pairs
              {p.pairs_failed > 0 && <span className="text-error-500"> · {p.pairs_failed} failed</span>}
              {" · "}
              {formatNumber(p.rows_added)} new prices
            </span>
            <span>{p.eta_seconds != null ? tr("sync.eta", { time: formatDuration(p.eta_seconds) }) : tr("sync.startedAt", { date: formatDateTime(p.started_at) })}</span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {log.length > 0 && (
          <pre
            ref={logRef}
            className="custom-scrollbar max-h-56 overflow-auto rounded-lg bg-gray-900 p-4 font-mono text-theme-xs leading-relaxed text-gray-300"
          >
            {log.join("\n")}
          </pre>
        )}
      </div>
      <ConfirmDialog
        isOpen={confirm}
        title={tr("sync.stopQ")}
        message={tr("sync.stopBody")}
        confirmLabel={tr("sync.stop")}
        destructive
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          await onStop();
          setBusy(false);
          setConfirm(false);
        }}
        onClose={() => setConfirm(false)}
      />
    </Card>
  );
}

// ── Start ───────────────────────────────────────────────────────────────────

function StartCard({
  disabled,
  estimates,
  pairs,
  onStart,
}: {
  disabled: boolean;
  estimates?: Record<SyncScope, number>;
  pairs?: Record<SyncScope, number>;
  onStart: (opts: { scope: SyncScope; refresh_catalog: boolean; export_csv: boolean; retrain: boolean }) => Promise<void>;
}) {
  const [scope, setScope] = useState<SyncScope>("active");
  const [refreshCatalog, setRefreshCatalog] = useState(false);
  const [exportCsv, setExportCsv] = useState(false);
  const [retrain, setRetrain] = useState(true);
  const [busy, setBusy] = useState(false);

  const options: { id: SyncScope; title: string; text: string }[] = [
    {
      id: "active",
      title: tr("sync.quickTitle"),
      text: `${tr("sync.quickText")}${pairs ? ` · ${tr("sync.pairsN", { n: formatNumber(pairs.active) })}` : ""}${
        estimates ? ` · ~${formatDuration(estimates.active * 60)}` : ""
      }`,
    },
    {
      id: "all",
      title: tr("sync.fullTitle"),
      text: `${tr("sync.fullText")}${pairs ? ` · ${tr("sync.pairsN", { n: formatNumber(pairs.all) })}` : ""}${estimates ? ` · ~${formatDuration(estimates.all * 60)}` : ""}`,
    },
  ];

  return (
    <Card className="h-full" accent="blue" icon={<RefreshCw className="size-5" />} title={tr("sync.now")} description={tr("sync.nowHint")}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label={tr("sync.type")}>
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={scope === o.id}
              onClick={() => setScope(o.id)}
              className={cn(
                "rounded-xl border p-4 text-start transition",
                scope === o.id
                  ? "border-brand-500 bg-brand-25 dark:border-brand-600 dark:bg-brand-500/10"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700",
              )}
            >
              <span className="block text-sm font-semibold text-gray-800 dark:text-white/90">{o.title}</span>
              <span className="mt-1 block text-theme-xs text-gray-500 dark:text-gray-400">{o.text}</span>
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <Checkbox checked={retrain} onChange={setRetrain} label={tr("sync.optRetrain")} />
          <Checkbox checked={refreshCatalog} onChange={setRefreshCatalog} label={tr("sync.optCatalog")} />
          <Checkbox checked={exportCsv} onChange={setExportCsv} label={tr("sync.optExport")} />
        </div>
        <div className="flex justify-end">
          <Button
            loading={busy}
            disabled={disabled}
            onClick={async () => {
              setBusy(true);
              await onStart({ scope, refresh_catalog: refreshCatalog, export_csv: exportCsv, retrain });
              setBusy(false);
            }}
          >
            {tr("sync.start", { scope: scopeName(scope) })}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── Schedule ────────────────────────────────────────────────────────────────

function ScheduleCard({ schedule, onSaved }: { schedule: SyncStatusResponse["schedule"]; onSaved: () => Promise<void> }) {
  const toSettings = (s: SyncSettings) => ({
    enabled: s.enabled,
    time: s.time,
    full_sync_weekday: s.full_sync_weekday,
    refresh_catalog_on_full: s.refresh_catalog_on_full,
    export_csv: s.export_csv,
    retrain_after_sync: s.retrain_after_sync,
    rate: s.rate,
  });
  const [form, setForm] = useState(() => toSettings(schedule));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [advanced, setAdvanced] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(toSettings(schedule));
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setMsg(null);
  };

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api.saveSyncSchedule(form);
      await onSaved();
      setMsg({ ok: true, text: tr("sync.scheduleSaved") });
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e, SERVICE) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      className="h-full"
      accent="amber"
      icon={<CalendarClock className="size-5" />}
      title={tr("sync.auto")}
      description={
        schedule.enabled && schedule.next_run
          ? tr("sync.next", { scope: scopeName(schedule.next_run.scope), date: formatDateTime(schedule.next_run.at) })
          : tr("sync.autoOff")
      }
      actions={<Switch checked={form.enabled} onChange={(v) => set("enabled", v)} label={tr(form.enabled ? "sync.on" : "sync.off")} />}
    >
      <div className="space-y-5">
        {msg && <Alert variant={msg.ok ? "success" : "error"} message={msg.text} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sch-time">{tr("sync.time")}</Label>
            <Input id="sch-time" type="time" value={form.time} disabled={!form.enabled} onChange={(e) => set("time", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sch-day">{tr("sync.fullOn")}</Label>
            <Select
              id="sch-day"
              disabled={!form.enabled}
              placeholder={tr("sync.never")}
              options={[0, 1, 2, 3, 4, 5, 6].map((i) => ({ value: String(i), label: pythonWeekdayName(i) }))}
              value={form.full_sync_weekday == null ? "" : String(form.full_sync_weekday)}
              onChange={(v) => set("full_sync_weekday", v === "" ? null : Number(v))}
            />
          </div>
        </div>
        <div className="space-y-3">
          <Checkbox
            checked={form.retrain_after_sync}
            disabled={!form.enabled}
            onChange={(v) => set("retrain_after_sync", v)}
            label={tr("sync.optRetrainEach")}
          />
          <Checkbox
            checked={form.refresh_catalog_on_full}
            disabled={!form.enabled}
            onChange={(v) => set("refresh_catalog_on_full", v)}
            label={tr("sync.optCatalogFull")}
          />
          <Checkbox checked={form.export_csv} disabled={!form.enabled} onChange={(v) => set("export_csv", v)} label={tr("sync.optExport")} />
        </div>
        <div>
          <button
            type="button"
            onClick={() => setAdvanced((a) => !a)}
            className="text-theme-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {tr(advanced ? "sync.hideAdvanced" : "sync.showAdvanced")}
          </button>
          {advanced && (
            <div className="mt-3 max-w-xs">
              <Label htmlFor="sch-rate">{tr("sync.rate")}</Label>
              <Input
                id="sch-rate"
                type="number"
                min="0.3"
                max="10"
                step={0.1}
                value={form.rate}
                onChange={(e) => set("rate", Number(e.target.value))}
                hint={tr("sync.rateHint")}
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          {dirty && (
            <Button size="sm" variant="outline" onClick={() => setForm(toSettings(schedule))} disabled={busy}>
              {tr("sync.undo")}
            </Button>
          )}
          <Button size="sm" onClick={save} loading={busy} disabled={!dirty}>
            {tr("sync.saveSchedule")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── History ─────────────────────────────────────────────────────────────────

function RunRow({ run: r, onOpen }: { run: SyncRun; onOpen: () => void }) {
  const st = STATUS[r.status];
  const rt = r.retrain_status ? RETRAIN[r.retrain_status] : null;
  const seconds = r.finished_at ? (new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000 : null;
  return (
    <TableRow className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]">
      <TableCell className={`${TD} ps-5 sm:ps-6`}>
        <button type="button" onClick={onOpen} className="font-medium text-brand-500 hover:underline dark:text-brand-400">
          #{r.id}
        </button>
      </TableCell>
      <TableCell className={TD}>{formatDateTime(r.started_at)}</TableCell>
      <TableCell className={TD}>
        {scopeName(r.scope)} · {tr(r.trigger === "schedule" ? "sync.scheduled" : "sync.manual")}
        {r.resumed_from && <span className="text-gray-400"> · {tr("sync.resumes", { id: r.resumed_from })}</span>}
      </TableCell>
      <TableCell className={TD}>
        <Badge size="sm" color={st.color}>
          {tr(st.label)}
        </Badge>
      </TableCell>
      <TableCell className={TD}>
        {formatNumber(r.pairs_done)} / {formatNumber(r.pairs_total)}
        {r.pairs_failed > 0 && <span className="text-error-500"> ({r.pairs_failed} failed)</span>}
      </TableCell>
      <TableCell className={TD}>{formatNumber(r.rows_added)}</TableCell>
      <TableCell className={TD}>{formatDuration(seconds)}</TableCell>
      <TableCell className={`${TD} pe-5 sm:pe-6`}>
        {rt ? (
          <span title={r.retrain_message ?? undefined}>
            <Badge size="sm" color={rt.color}>
              {tr(rt.label)}
            </Badge>
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function RunDetailModal({
  runId,
  onClose,
  onResume,
  canResume,
}: {
  runId: number;
  onClose: () => void;
  onResume: (id: number) => void;
  canResume: boolean;
}) {
  const detail = useAsync(() => api.syncRun(runId), [runId], SERVICE);
  const log = useAsync(() => api.syncRunLog(runId, 300), [runId], SERVICE);
  const r = detail.data;

  return (
    <Modal isOpen onClose={onClose} className="m-4 max-w-3xl p-6 sm:p-8">
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">{tr("sync.runTitle", { id: runId })}</h3>
      {detail.loading ? (
        <LoadingState />
      ) : detail.error || !r ? (
        <ErrorState message={detail.error} onRetry={detail.reload} />
      ) : (
        <div className="custom-scrollbar max-h-[70vh] space-y-5 overflow-y-auto pe-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={STATUS[r.status].color}>{tr(STATUS[r.status].label)}</Badge>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {scopeName(r.scope)} · {r.trigger === "schedule" ? tr("sync.scheduled") : tr("sync.startedBy", { name: r.triggered_by ?? "admin" })}
            </span>
            {isResumable(r) && canResume && (
              <Button size="xs" className="ms-auto" onClick={() => onResume(r.id)}>
                {tr("sync.resume")}
              </Button>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            {[
              [tr("sync.col.started"), formatDateTime(r.started_at)],
              [tr("sync.finished"), formatDateTime(r.finished_at)],
              [tr("sync.pairsFetched"), `${formatNumber(r.pairs_done)} / ${formatNumber(r.pairs_total)}`],
              [tr("sync.newPrices"), formatNumber(r.rows_added)],
              [tr("sync.latestBefore"), formatFullDate(r.latest_date_before)],
              [tr("sync.latestAfter"), formatFullDate(r.latest_date_after)],
              [tr("sync.fetchTime"), formatDuration(r.fetch_seconds)],
              [tr("sync.forecasts"), r.retrain_status ? tr(RETRAIN[r.retrain_status].label) : tr("sync.notRequested")],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">{k}</dt>
                <dd className="font-medium text-gray-800 dark:text-white/90">{v}</dd>
              </div>
            ))}
          </dl>

          {r.error && <Alert variant="error" title={tr("sync.error")} message={r.error} />}
          {r.retrain_message && <Alert variant="info" title={tr("sync.forecastUpdate")} message={r.retrain_message} />}

          {r.failed_pairs.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
                {tr("sync.failedPairs", { n: r.failed_pairs.length })}
              </h4>
              <ul className="max-h-40 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100 text-theme-xs dark:divide-gray-800 dark:border-gray-800">
                {r.failed_pairs.map((f) => (
                  <li key={`${f.market_id}-${f.variety_id}`} className="flex justify-between gap-3 px-3 py-2">
                    <span className="text-gray-800 dark:text-white/90">
                      {f.market_name} ({f.region}) · {f.variety_name}
                    </span>
                    <span className="truncate text-error-500">{f.error_msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">{tr("sync.log")}</h4>
            {log.loading ? (
              <LoadingState />
            ) : log.error ? (
              <p className="text-sm text-error-500">{log.error}</p>
            ) : (
              <pre className="custom-scrollbar max-h-72 overflow-auto rounded-lg bg-gray-900 p-4 font-mono text-theme-xs leading-relaxed text-gray-300">
                {log.data?.lines.length ? log.data.lines.join("\n") : tr("sync.noLog")}
              </pre>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
