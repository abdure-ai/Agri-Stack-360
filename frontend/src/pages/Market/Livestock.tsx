// Livestock prices per head from NMIS livestock markets, and the 4-week outlook with its confidence and reasons.
import { api } from "@/api/client";
import { AXIS_PROPS, GRID_PROPS, LEGEND_PROPS, TOOLTIP_PROPS, Y_AXIS_PROPS } from "@/components/charts/chartTheme";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import StatCard from "@/components/common/StatCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, trTerm, type MessageKey } from "@/i18n/core";
import type { LivestockForecast, LivestockReason, LivestockSeries } from "@/types/livestock";
import { formatAxisDate, formatETB, formatFullDate } from "@/utils/formatters";
import { Beef, CalendarRange, Download, FileUp, Store, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ANIMAL_WORDS: Record<string, string[]> = {
  ox: ["ox", "oxen"], cow: ["cow", "cows"], bull: ["bull", "bulls"], heifer: ["heifer", "heifers"],
  calf: ["calf", "calves"], sheep: ["sheep", "ram", "lamb"], goat: ["goat", "goats"], camel: ["camel", "camels"],
  chicken: ["chicken", "hen", "poultry"],
};
const LINE_COLORS = ["#16a34a", "#2563eb", "#d97706", "#9333ea", "#dc2626", "#0891b2"];
const MAX_LINES = 6;

/** "Ox" -> "በሬ" in Amharic; names not in the list stay as NMIS writes them. */
function animalName(name: string): string {
  const words = name.toLowerCase().match(/[a-z]+/g) ?? [];
  const key = Object.keys(ANIMAL_WORDS).find((k) => words.some((w) => ANIMAL_WORDS[k].includes(w)));
  return key ? tr(`lv.animal.${key}` as MessageKey) : name;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86_400_000);
}

function grade(s: LivestockSeries): string {
  return [s.breed, s.sex, s.production_type, s.body_condition].filter(Boolean).join(" · ") || animalName(s.animal);
}

function reasonText(r: LivestockReason): string {
  const p = r.params;
  switch (r.code) {
    case "period":
      return tr("lv.reason.period", { reports: p.reports, markets: p.markets, start: formatFullDate(String(p.start)), end: formatFullDate(String(p.end)) });
    case "checked":
      return tr("lv.reason.checked", { pct: p.model_error_pct, naive: p.no_change_error_pct });
    case "no_trend":
      return tr("lv.reason.no_trend", { pct: p.model_error_pct, naive: p.no_change_error_pct });
    case "few_reports":
      return tr("lv.reason.few_reports", { reports: p.reports });
    case "stale":
      return tr("lv.reason.stale", { days: p.days });
    case "short_period":
      return tr("lv.reason.short_period", { days: p.days });
    case "no_season":
    case "not_checked":
    case "too_few":
    case "no_data":
      return tr(`lv.reason.${r.code}` as MessageKey);
    default:
      return r.text;
  }
}

const CONF_COLOR = { high: "success", medium: "warning", low: "error" } as const;

function OutlookCard({ f, region }: { f: LivestockForecast; region: string }) {
  const ok = f.status === "ok" && f.confidence;
  const Icon = f.direction === "up" ? TrendingUp : f.direction === "down" ? TrendingDown : Minus;
  return (
    <Card
      accent="green"
      icon={<Icon className="size-5" />}
      title={tr("lv.outlook.title")}
      description={f.region ? tr("lv.outlook.region", { region: trTerm("region", f.region) })
        : region ? tr("lv.outlook.countryFallback", { region: trTerm("region", region) }) : tr("lv.outlook.country")}
      actions={ok ? <Badge color={CONF_COLOR[f.confidence!]}>{tr(`lv.conf.${f.confidence}` as MessageKey)}</Badge> : undefined}
    >
      {ok ? (
        <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {tr(`lv.outlook.${f.direction ?? "flat"}` as MessageKey, { pct: Math.abs(f.change_pct ?? 0).toFixed(1) })}
          {f.range_pct && (
            <span className="ms-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              {tr("lv.outlook.range", { low: f.range_pct[0].toFixed(1), high: f.range_pct[1].toFixed(1) })}
            </span>
          )}
        </p>
      ) : (
        <p className="text-gray-700 dark:text-gray-300">{tr("lv.outlook.none")}</p>
      )}
      <h3 className="mt-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{tr("lv.outlook.why")}</h3>
      <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-gray-600 dark:text-gray-400">
        {f.reasons.map((r) => <li key={r.code}>{reasonText(r)}</li>)}
      </ul>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{tr("lv.outlook.note")}</p>
    </Card>
  );
}

function PriceChart({ series }: { series: LivestockSeries[] }) {
  const shown = series.filter((s) => s.points.length > 1).slice(0, MAX_LINES);
  const rows = useMemo(() => {
    const byDate = new Map<string, Record<string, number | string>>();
    shown.forEach((s, i) => s.points.forEach((p) => {
      const row = byDate.get(p.date) ?? { date: p.date };
      row[`s${i}`] = p.avg;
      byDate.set(p.date, row);
    }));
    return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [shown]);
  if (!shown.length) return null;
  return (
    <Card title={tr("lv.chart.title")} description={tr("lv.chart.description", { n: shown.length })}>
      <div className="-ms-2 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={(d) => formatAxisDate(String(d))} />
            <YAxis {...Y_AXIS_PROPS} />
            <Tooltip {...TOOLTIP_PROPS} labelFormatter={(l) => formatFullDate(String(l))}
              formatter={(v, name) => [formatETB(Number(v)), `${shown[Number(String(name).slice(1))].market} · ${grade(shown[Number(String(name).slice(1))])}`]} />
            <Legend {...LEGEND_PROPS} formatter={(v) => { const s = shown[Number(String(v).slice(1))]; return `${s.market} · ${grade(s)}`; }} />
            {shown.map((_, i) => (
              <Line key={i} dataKey={`s${i}`} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot connectNulls isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function PriceTable({ series }: { series: LivestockSeries[] }) {
  return (
    <Card title={tr("lv.table.title")} description={tr("lv.table.description")}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-start text-gray-500 dark:border-gray-800 dark:text-gray-400">
              {(["lv.table.market", "lv.table.grade", "lv.table.latest", "lv.table.date", "lv.table.change", "lv.table.outlook"] as MessageKey[]).map((k) => (
                <th key={k} className="px-3 py-2 text-start font-medium">{tr(k)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {series.map((s) => (
              <tr key={`${s.market}|${s.grade}`} className="text-gray-700 dark:text-gray-300">
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-800 dark:text-white/90">{s.market}</div>
                  <div className="text-xs text-gray-500">{trTerm("region", s.region)}</div>
                </td>
                <td className="px-3 py-2">{grade(s)}</td>
                <td className="whitespace-nowrap px-3 py-2">{formatETB(s.latest.min)} – {formatETB(s.latest.max)}</td>
                <td className="whitespace-nowrap px-3 py-2">{formatFullDate(s.latest.date)}</td>
                <td className="whitespace-nowrap px-3 py-2">{s.change_pct == null ? "—" : `${s.change_pct > 0 ? "+" : ""}${s.change_pct.toFixed(1)}%`}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {s.outlook ? `${formatETB(s.outlook.low)} – ${formatETB(s.outlook.high)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

function ImportCard({ onDone }: { onDone: () => void }) {
  const { can } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string; errors?: string[] } | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await api.livestockImport(file);
      setMessage({ ok: r.rejected === 0, text: tr("lv.import.result", { added: r.added, updated: r.updated, rejected: r.rejected, forecasts: r.forecasts }), errors: r.errors });
      onDone();
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function retrain() {
    setBusy(true);
    try {
      const r = await api.livestockTrain();
      setMessage({ ok: true, text: tr("lv.import.trained", { trained: r.trained, forecasts: r.forecasts }) });
      onDone();
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card accent="blue" icon={<FileUp className="size-5" />} title={tr("lv.import.title")} description={tr("lv.import.description")}>
      {message && (
        <Alert className="mb-4" variant={message.ok ? "success" : "warning"} message={message.text}>
          {!!message.errors?.length && (
            <ul className="mt-2 list-disc ps-5 text-xs">{message.errors.slice(0, 10).map((e) => <li key={e}>{e}</li>)}</ul>
          )}
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" startIcon={<Download className="size-4" />}
          onClick={async () => saveBlob(await api.livestockTemplate(), "livestock-prices-template.csv")}>
          {tr("lv.import.template")}
        </Button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">
          <FileUp className="size-4" aria-hidden="true" />
          {busy ? tr("common.loading") : tr("lv.import.upload")}
          <input type="file" accept=".csv,text/csv" className="hidden" disabled={busy}
            onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {can("models:retrain") && (
          <Button size="sm" variant="outline" disabled={busy} onClick={retrain}>{tr("lv.import.retrain")}</Button>
        )}
      </div>
    </Card>
  );
}

export default function Livestock() {
  const { can } = useAuth();
  const summary = useAsync(() => api.livestockSummary(), []);
  const [picked, setPicked] = useState("");
  const [region, setRegion] = useState("");
  const animal = picked || summary.data?.animals[0]?.animal || "";
  const prices = useAsync(
    () => (animal ? api.livestockPrices(animal, region) : Promise.resolve(null)),
    [animal, region],
  );
  const s = summary.data;
  const info = s?.animals.find((a) => a.animal === animal);

  return (
    <>
      <PageMeta title={`${tr("nav.livestock")} | ${tr("app.name")}`} description={tr("lv.description")} />
      <PageHeader title={tr("nav.livestock")} description={tr("lv.description")} />
      <div className="space-y-6">
        {summary.loading ? (
          <LoadingState />
        ) : summary.error ? (
          <ErrorState message={summary.error} onRetry={summary.reload} />
        ) : !s?.reports ? (
          <Card>
            <EmptyState icon={<Beef className="size-8" />} title={tr("lv.empty.title")} description={tr("lv.empty.description")} />
          </Card>
        ) : (
          <>
            <Card>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="lv-animal">{tr("lv.animal")}</Label>
                  <Select id="lv-animal" value={animal} onChange={setPicked}
                    options={s.animals.map((a) => ({ value: a.animal, label: `${animalName(a.animal)} (${a.reports})` }))} />
                </div>
                <div>
                  <Label htmlFor="lv-region">{tr("common.region")}</Label>
                  <Select id="lv-region" value={region} onChange={setRegion} placeholder={tr("market.allRegions")} placeholderSelectable
                    options={s.regions.map((r) => ({ value: r, label: trTerm("region", r) }))} />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                {tr("lv.sourceLine", { start: formatFullDate(s.first_date), end: formatFullDate(s.last_date) })}{" "}
                <a href={s.source_url} target="_blank" rel="noreferrer" className="underline">nmis.et/livestock</a>
              </p>
            </Card>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={<Beef className="size-6" />} label={tr("lv.stat.reports")} value={String(info?.reports ?? 0)} />
              <StatCard icon={<Store className="size-6" />} label={tr("lv.stat.markets")} value={String(info?.markets ?? 0)} />
              <StatCard icon={<CalendarRange className="size-6" />} label={tr("lv.stat.period")}
                value={info ? tr("lv.stat.days", { n: daysBetween(info.first_date, info.last_date) }) : "—"}
                footer={info && `${formatFullDate(info.first_date)} – ${formatFullDate(info.last_date)}`} />
            </div>
            {prices.loading ? (
              <LoadingState />
            ) : prices.error ? (
              <ErrorState message={prices.error} onRetry={prices.reload} />
            ) : prices.data && (
              <>
                <OutlookCard f={prices.data.forecast} region={region} />
                {prices.data.series.length ? (
                  <>
                    <PriceChart series={prices.data.series} />
                    <PriceTable series={prices.data.series} />
                  </>
                ) : (
                  <Card><EmptyState title={tr("lv.noSeries")} /></Card>
                )}
              </>
            )}
          </>
        )}
        {can("sync:manage") && <ImportCard onDone={() => { summary.reload(); prices.reload(); }} />}
      </div>
    </>
  );
}
