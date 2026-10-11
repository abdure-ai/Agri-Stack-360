import { api } from "@/api/client";
import DotMap, { type MapDot } from "@/components/charts/DotMap";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Select from "@/components/form/Select";
import Switch from "@/components/form/switch/Switch";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import type { AreaSummary, Hotspot, ReportCount, ReportFigures } from "@/types/api";
import { exportCsv } from "@/utils/exportCsv";
import { formatFullDate } from "@/utils/formatters";
import { BarChart3, Download, MapPinned, Printer } from "lucide-react";
import { useState } from "react";

const PERIODS = [7, 30, 90];
const TH = "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const TD = "px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300";

const FIGURES: { key: keyof Omit<ReportFigures, "by_disease">; label: MessageKey }[] = [
  { key: "farmers", label: "reports.farmers" },
  { key: "farmers_reached", label: "reports.reached" },
  { key: "questions", label: "reports.questions" },
  { key: "photo_checks", label: "reports.photoChecks" },
  { key: "outbreak_alerts", label: "reports.outbreakAlerts" },
  { key: "escalations", label: "reports.escalations" },
];

/**
 * Area reports: government dashboard, and the DA's weekly woreda report (7 days, print or CSV).
 * Aggregates only; counts of 1-4 arrive from the server as "<5".
 */
export default function AreaReports() {
  const { lang } = useI18n();
  const [days, setDays] = useState(7);
  const [demo, setDemo] = useState(false);
  const scope = useAsync(() => api.reportScope(), []);
  const summary = useAsync(() => api.reportSummary(days, null, lang), [days, lang]);
  const outbreaks = useAsync(() => api.reportOutbreaks(Math.min(days, 90), { include_simulated: demo, language: lang }), [days, demo, lang]);
  const areaName = scope.data?.names.length ? scope.data.names.join(" › ") : tr("reports.country");

  function exportRows(s: AreaSummary) {
    exportCsv(
      s.woredas.map((w) => ({
        region: w.region,
        zone: w.zone,
        woreda: w.woreda,
        pcode: w.pcode,
        farmers: w.farmers,
        farmers_reached: w.farmers_reached,
        questions: w.questions,
        photo_checks: w.photo_checks,
        ...Object.fromEntries(Object.entries(w.by_disease).map(([k, v]) => [`photo_checks_${k}`, v])),
        follow_up_better: w.outcome_improved,
        follow_up_same: w.outcome_same,
        follow_up_worse: w.outcome_worse,
        outbreak_alerts: w.outbreak_alerts,
        cases_sent_to_da: w.escalations,
      })),
      `area-report-${s.since}-${days}d.csv`,
    );
  }

  return (
    <>
      <PageMeta title={`${tr("nav.reports")} | ${tr("app.name")}`} description={tr("reports.description")} />
      <PageHeader
        title={tr("nav.reports")}
        description={tr("reports.description")}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="w-40">
              <Select
                aria-label={tr("reports.period", { n: days })}
                options={PERIODS.map((n) => ({ value: String(n), label: tr("reports.period", { n }) }))}
                value={String(days)}
                onChange={(v) => setDays(Number(v))}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              startIcon={<Download className="size-4" />}
              disabled={!summary.data?.woredas.length}
              onClick={() => summary.data && exportRows(summary.data)}
            >
              {tr("reports.export")}
            </Button>
            <Button size="sm" variant="outline" startIcon={<Printer className="size-4" />} onClick={() => window.print()}>
              {tr("reports.print")}
            </Button>
          </div>
        }
      />
      <p className="mb-4 text-theme-sm font-medium text-gray-700 dark:text-gray-300">
        {tr("reports.scope", { area: areaName })} · {tr("reports.period", { n: days })}
      </p>

      {summary.loading ? (
        <LoadingState />
      ) : summary.error || !summary.data ? (
        <ErrorState message={summary.error} onRetry={summary.reload} />
      ) : (
        <SummaryView s={summary.data} />
      )}

      <div className="mt-4 md:mt-6">
        <Card
          accent="rose"
          icon={<MapPinned className="size-5" />}
          title={tr("reports.map")}
          description={tr("reports.mapHint", { n: outbreaks.data?.days ?? days })}
          actions={<Switch checked={demo} onChange={setDemo} label={tr("reports.demo")} />}
        >
          {outbreaks.loading ? (
            <LoadingState />
          ) : outbreaks.error || !outbreaks.data ? (
            <ErrorState message={outbreaks.error} onRetry={outbreaks.reload} />
          ) : !outbreaks.data.hotspots.length ? (
            <EmptyState title={tr("reports.noOutbreaks")} />
          ) : (
            <HotspotMap spots={outbreaks.data.hotspots} />
          )}
        </Card>
      </div>
    </>
  );
}

function fmt(v: ReportCount | undefined) {
  return v === undefined ? "—" : String(v);
}

function SummaryView({ s }: { s: AreaSummary }) {
  const t = s.totals;
  const diseases = Object.entries(t.by_disease);
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {FIGURES.map((f) => (
          <div key={f.key} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">{tr(f.label)}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{fmt(t[f.key])}</p>
          </div>
        ))}
      </div>
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">{tr("reports.suppressedNote")}</p>

      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3">
        <Card icon={<BarChart3 className="size-5" />} accent="green" title={tr("reports.byDisease")}>
          {!diseases.length ? (
            <p className="text-theme-sm text-gray-500">{tr("reports.noData")}</p>
          ) : (
            <ul className="space-y-1.5 text-theme-sm">
              {diseases.map(([k, v]) => (
                <li key={k} className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>{s.disease_names[k] ?? k}</span>
                  <span className="font-medium">{fmt(v)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-theme-xs text-gray-500">{tr("reports.outcomes")}</p>
          <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
            {fmt(t.outcome_improved)} / {fmt(t.outcome_same)} / {fmt(t.outcome_worse)}
          </p>
        </Card>

        <Card className="xl:col-span-2" title={tr("reports.woredas")} bodyClassName="p-0">
          {!s.woredas.length ? (
            <EmptyState title={tr("reports.noData")} />
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    <TableCell isHeader className={`${TH} ps-5`}>{tr("reports.col.woreda")}</TableCell>
                    {FIGURES.map((f) => (
                      <TableCell key={f.key} isHeader className={TH}>
                        {tr(f.label)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {s.woredas.map((w) => (
                    <TableRow key={w.pcode}>
                      <TableCell className={`${TD} ps-5`}>
                        <span className="font-medium text-gray-800 dark:text-white/90">{w.woreda}</span>
                        <span className="block text-theme-xs text-gray-400">{[w.zone, w.region].filter(Boolean).join(", ")}</span>
                      </TableCell>
                      {FIGURES.map((f) => (
                        <TableCell key={f.key} className={TD}>
                          {fmt(w[f.key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/** Outbreak dots at woreda centres, with the list beside them. */
function HotspotMap({ spots }: { spots: Hotspot[] }) {
  const dots: MapDot[] = spots
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({
      key: `${s.pcode}-${s.disease_key}`,
      latitude: s.latitude!,
      longitude: s.longitude!,
      size: s.scans_band,
      group: s.disease_key,
      groupLabel: s.disease,
      title: `${s.woreda}: ${s.disease} (${s.scans})`,
      dashed: s.includes_simulated,
    }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
      <div>
        <DotMap dots={dots} label={tr("reports.map")} />
        <p className="mt-1 text-theme-xs text-gray-600 dark:text-gray-400">
          ● {tr("reports.band.high")} · • {tr("reports.band.medium")} · · {tr("reports.band.low")}
        </p>
      </div>
      <ul className="space-y-2">
        {spots.map((s) => (
          <li key={`${s.pcode}-${s.disease_key}`} className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{s.woreda}</span>
              <Badge size="sm" color={s.scans_band === "high" ? "error" : s.scans_band === "medium" ? "warning" : "light"}>
                {s.scans}
              </Badge>
            </div>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              {s.disease} · {s.zone} · {tr("reports.latest", { date: formatFullDate(s.latest) })}
            </p>
            {s.includes_simulated && (
              <Alert className="mt-1" variant="warning" message={tr("reports.demoBadge")} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
