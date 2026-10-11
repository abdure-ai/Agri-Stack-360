import { api } from "@/api/client";
import SupplyOutlookCard from "@/components/market/SupplyOutlookCard";
import BuyRequestsCard from "@/components/market/BuyRequestsCard";
import { AXIS_PROPS, GRID_PROPS, LEGEND_PROPS, TOOLTIP_PROPS, Y_AXIS_PROPS } from "@/components/charts/chartTheme";
import Card from "@/components/common/Card";
import InsightPanel from "@/components/common/InsightPanel";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import StatCard from "@/components/common/StatCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Tabs from "@/components/ui/tabs/Tabs";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { tr, trTerm, type MessageKey } from "@/i18n/core";
import { DownloadIcon } from "@/icons";
import type { Confidence, MarketFilters, PriceLevel } from "@/types/api";
import { PRICE_LEVEL_COLORS, REGION_COLORS } from "@/utils/colors";
import { exportCsv } from "@/utils/exportCsv";
import {
  formatETB,
  formatFullDate,
  formatNumber,
  formatPct,
  makeDateTickFormatter,
  weekOf,
} from "@/utils/formatters";
import { analyzeRegional, analyzeSpread, analyzeTimeSeries, buildForecastRecommendation } from "@/utils/insights";
import { useMemo, useState } from "react";
import HeatmapView from "./HeatmapView";
import {
  CalendarDays,
  ChartLine,
  CircleDollarSign,
  Database,
  MapPin,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type View = "trend" | "regional" | "heatmap" | "spread" | "forecast";

// Labels are message keys, translated when drawn (module constants load only once).
const VIEWS: { id: View; label: MessageKey }[] = [
  { id: "trend", label: "market.view.trend" },
  { id: "regional", label: "market.view.regional" },
  { id: "heatmap", label: "market.view.heatmap" },
  { id: "spread", label: "market.view.spread" },
  { id: "forecast", label: "market.view.forecast" },
];

const PRICE_LEVELS: { value: PriceLevel; label: MessageKey }[] = [
  { value: "retail", label: "market.level.retail" },
  { value: "wholesale", label: "market.level.wholesale" },
  { value: "producer", label: "market.level.producer" },
];

const RANGES: { value: string; label: MessageKey }[] = [
  { value: "3", label: "market.range.3" },
  { value: "6", label: "market.range.6" },
  { value: "12", label: "market.range.12" },
  { value: "24", label: "market.range.24" },
  { value: "all", label: "market.range.all" },
  { value: "custom", label: "market.range.custom" },
];

const CONFIDENCE_BADGE: Record<Confidence, { color: "success" | "info" | "warning" | "error"; label: MessageKey }> = {
  high: { color: "success", label: "confidence.high" },
  medium: { color: "info", label: "confidence.medium" },
  low: { color: "warning", label: "confidence.low" },
  very_low: { color: "error", label: "confidence.veryLow" },
};

const translated = <T extends { label: MessageKey }>(xs: T[]) => xs.map((x) => ({ ...x, label: tr(x.label) }));
const levelName = (level: string) => tr(`price.${level}` as MessageKey);

const CHART_HEIGHT = 340;

function monthsBefore(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function avg(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export default function MarketIntel() {
  const { user, can } = useAuth();
  const meta = useAsync(() => api.meta(), [], "service.market");

  const [view, setView] = useState<View>("trend");
  const [crop, setCrop] = useState("Teff");
  const [variety, setVariety] = useState("");
  const [region, setRegion] = useState(user?.region ?? "");
  const [priceLevel, setPriceLevel] = useState<PriceLevel>("retail");
  const [range, setRange] = useState("12");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [weeksAhead, setWeeksAhead] = useState("4");

  const cropMeta = meta.data?.crops.find((c) => c.name === crop);
  const varieties = meta.data?.varieties[crop] ?? [];

  const { startDate, endDate } = useMemo(() => {
    if (!cropMeta) return { startDate: "", endDate: "" };
    if (range === "custom") {
      return { startDate: customStart || cropMeta.min_date, endDate: customEnd || cropMeta.max_date };
    }
    if (range === "all") return { startDate: cropMeta.min_date, endDate: cropMeta.max_date };
    return { startDate: monthsBefore(cropMeta.max_date, Number(range)), endDate: cropMeta.max_date };
  }, [cropMeta, range, customStart, customEnd]);

  const filters: MarketFilters = {
    crop,
    variety,
    region,
    markets: [],
    price_level: priceLevel,
    start_date: startDate,
    end_date: endDate,
  };
  const params = { crop, variety, region, price_level: priceLevel, start_date: startDate, end_date: endDate };
  const ready = !!cropMeta;

  const summary = useAsync(
    () => (ready ? api.summary(params) : Promise.resolve(null)),
    [ready, crop, variety, region, priceLevel, startDate, endDate],
  );

  const unit = summary.data?.unit ?? varieties[0]?.unit ?? "";
  const pct = formatPct(summary.data?.wow_change_pct);

  return (
    <>
      <PageMeta title={`${tr("nav.market")} | ${tr("app.name")}`} description={tr("market.meta")} />
      <PageHeader title={tr("nav.market")} description={tr("market.description")} />

      {meta.loading ? (
        <Card>
          <LoadingState label={tr("market.loadingMeta")} />
        </Card>
      ) : meta.error || !meta.data ? (
        <Card>
          <ErrorState title={tr("market.unavailable")} message={meta.error} onRetry={meta.reload} />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div>
                <Label htmlFor="f-crop">{tr("market.crop")}</Label>
                <Select
                  id="f-crop"
                  options={meta.data.crops.map((c) => ({ value: c.name, label: trTerm("crop", c.name) }))}
                  value={crop}
                  onChange={(c) => {
                    setCrop(c);
                    setVariety("");
                  }}
                />
              </div>
              <div>
                <Label htmlFor="f-variety">{tr("market.variety")}</Label>
                <Select
                  id="f-variety"
                  placeholder={tr("market.allVarieties")}
                  options={varieties.map((v) => ({ value: v.name, label: v.name }))}
                  value={variety}
                  onChange={setVariety}
                />
              </div>
              <div>
                <Label htmlFor="f-region">{tr("common.region")}</Label>
                <Select
                  id="f-region"
                  placeholder={tr("market.allRegions")}
                  options={meta.data.regions.map((r) => ({ value: r, label: trTerm("region", r) }))}
                  value={region}
                  onChange={setRegion}
                />
              </div>
              <div>
                <Label htmlFor="f-level">{tr("market.priceType")}</Label>
                <Select
                  id="f-level"
                  options={translated(PRICE_LEVELS)}
                  value={priceLevel}
                  onChange={(v) => setPriceLevel(v as PriceLevel)}
                />
              </div>
              <div>
                <Label htmlFor="f-range">{tr("market.timePeriod")}</Label>
                <Select id="f-range" options={translated(RANGES)} value={range} onChange={setRange} />
              </div>
            </div>
            {range === "custom" && cropMeta && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:w-2/5">
                <div>
                  <Label htmlFor="f-start">{tr("market.from")}</Label>
                  <Input
                    id="f-start"
                    type="date"
                    min={cropMeta.min_date}
                    max={cropMeta.max_date}
                    value={customStart || cropMeta.min_date}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="f-end">{tr("market.to")}</Label>
                  <Input
                    id="f-end"
                    type="date"
                    min={cropMeta.min_date}
                    max={cropMeta.max_date}
                    value={customEnd || cropMeta.max_date}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </div>
              </div>
            )}
            {cropMeta && (
              <p className="mt-4 text-theme-xs text-gray-500 dark:text-gray-400">
                {tr("market.dataAvailable", {
                  crop: trTerm("crop", crop),
                  from: formatFullDate(cropMeta.min_date),
                  to: formatFullDate(cropMeta.max_date),
                  n: formatNumber(cropMeta.record_count),
                })}
              </p>
            )}
          </Card>

          {/* Headline numbers */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
            <StatCard
              accent="blue"
              icon={<CircleDollarSign className="size-6" />}
              label={tr("market.latestPrice", { level: levelName(priceLevel) })}
              loading={summary.loading}
              value={formatETB(summary.data?.latest_price)}
              footer={summary.data?.latest_date && `${tr("price.perUnit", { unit: unit ? trTerm("unit", unit) : tr("ins.unit") })} · ${tr("market.weekOf", { date: formatFullDate(summary.data.latest_date) })}`}
            />
            <StatCard
              accent={pct.direction === "down" ? "rose" : "green"}
              icon={pct.direction === "down" ? <TrendingDown className="size-6" /> : <TrendingUp className="size-6" />}
              label={tr("market.changeWeek")}
              loading={summary.loading}
              value={pct.text}
              tone={pct.direction === "up" ? "success" : pct.direction === "down" ? "error" : "default"}
              footer={tr(pct.direction === "up" ? "market.wentUp" : pct.direction === "down" ? "market.wentDown" : "market.noChange")}
            />
            <StatCard
              accent="violet"
              icon={<CalendarDays className="size-6" />}
              label={tr("market.avg4")}
              loading={summary.loading}
              value={formatETB(summary.data?.avg_4week)}
              footer={summary.data?.avg_all != null && `${tr("price.perUnit", { unit: unit ? trTerm("unit", unit) : tr("ins.unit") })} · ${tr("market.wholePeriod", { price: formatETB(summary.data.avg_all) })}`}
            />
            <StatCard
              accent="amber"
              icon={<Database className="size-6" />}
              label={tr("market.records")}
              loading={summary.loading}
              value={formatNumber(summary.data?.obs_count)}
              footer={summary.data?.volume_signal && tr("market.supplySignal", { signal: summary.data.volume_signal })}
            />
          </div>
          {summary.error && <Alert variant="error" message={summary.error} />}

          <Tabs variant="underline" tabs={translated(VIEWS)} value={view} onChange={setView} aria-label={tr("market.views")} />

          {ready &&
            (view === "trend" ? (
              <TrendView params={params} filters={filters} unit={unit} />
            ) : view === "regional" ? (
              <RegionalView params={params} filters={filters} unit={unit} />
            ) : view === "heatmap" ? (
              <HeatmapView
                params={params}
                filters={filters}
                unit={unit}
                regions={meta.data.regions}
                onRegionChange={setRegion}
              />
            ) : view === "spread" ? (
              <SpreadView params={params} filters={filters} unit={unit} />
            ) : (
              <ForecastView
                crop={crop}
                region={region}
                regions={meta.data.regions}
                onRegionChange={setRegion}
                weeksAhead={weeksAhead}
                onWeeksChange={setWeeksAhead}
              />
            ))}
        </div>
      )}
      <div className="mt-4 md:mt-6">
        <SupplyOutlookCard />
      </div>
      {can("trade:request") && (
        <div className="mt-4 md:mt-6">
          <BuyRequestsCard />
        </div>
      )}
    </>
  );
}

type ViewProps = {
  params: Record<string, string>;
  filters: MarketFilters;
  unit: string;
};

function ExportButton({ rows, name }: { rows: object[]; name: string }) {
  return (
    <Button
      size="xs"
      variant="outline"
      startIcon={<DownloadIcon className="size-4" />}
      disabled={!rows.length}
      onClick={() => exportCsv(rows, name)}
    >
      CSV
    </Button>
  );
}

// ── Price trend ─────────────────────────────────────────────────────────────

function TrendView({ params, filters, unit }: ViewProps) {
  const prices = useAsync(() => api.prices(params), [JSON.stringify(params)]);

  const series = useMemo(() => {
    const byDate = new Map<string, number[]>();
    for (const r of prices.data?.data ?? []) {
      if (r.price_avg == null) continue;
      const week = weekOf(r.date);
      const list = byDate.get(week) ?? [];
      list.push(r.price_avg);
      byDate.set(week, list);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, ps]) => ({
        date,
        average: Math.round(avg(ps)),
        range: [Math.round(Math.min(...ps)), Math.round(Math.max(...ps))] as [number, number],
        markets: ps.length,
      }));
  }, [prices.data]);

  const insight = useMemo(
    () => (prices.data ? analyzeTimeSeries(prices.data.data, filters, unit) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prices.data, unit],
  );
  const tick = makeDateTickFormatter(series.map((s) => s.date));
  const color = PRICE_LEVEL_COLORS[filters.price_level];

  return (
    <Card
      accent="blue"
      icon={<ChartLine className="size-5" />}
      title={tr("market.trend.title", { crop: trTerm("crop", filters.crop), level: levelName(filters.price_level) })}
      description={tr("market.trend.description", { region: filters.region ? trTerm("region", filters.region) : tr("market.allRegionsLower") })}
      actions={
        <ExportButton
          rows={series.map((s) => ({ date: s.date, average: s.average, lowest: s.range[0], highest: s.range[1], markets: s.markets }))}
          name={`${filters.crop}-prices.csv`}
        />
      }
    >
      {prices.loading ? (
        <LoadingState label={tr("market.loadingPrices")} />
      ) : prices.error ? (
        <ErrorState message={prices.error} onRetry={prices.reload} />
      ) : !series.length ? (
        <EmptyState title={tr("market.noPrices")} description={tr("market.noPricesHint")} />
      ) : (
        <div className="space-y-5">
          <div className="-ms-2" style={{ height: CHART_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={tick} interval={0} minTickGap={0} />
                <YAxis {...Y_AXIS_PROPS} />
                <Tooltip
                  {...TOOLTIP_PROPS}
                  labelFormatter={(l) => formatFullDate(String(l))}
                  formatter={(v, name) =>
                    Array.isArray(v)
                      ? [`${formatETB(Number(v[0]))} – ${formatETB(Number(v[1]), unit)}`, tr("market.marketRange")]
                      : [formatETB(Number(v), unit), name === "average" ? tr("market.averagePrice") : String(name)]
                  }
                />
                <Area dataKey="range" stroke="none" fill={color} fillOpacity={0.12} isAnimationActive={false} />
                <Line dataKey="average" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <InsightPanel insight={insight} />
        </div>
      )}
    </Card>
  );
}

// ── Regional comparison ─────────────────────────────────────────────────────

function RegionalView({ params, filters, unit }: ViewProps) {
  const { region: _region, ...rest } = params;
  void _region;
  const regional = useAsync(() => api.regional(rest), [JSON.stringify(rest)]);

  const { rows, regions } = useMemo(() => {
    const byWeek = new Map<string, Record<string, number[]>>();
    const seen = new Set<string>();
    for (const r of regional.data?.data ?? []) {
      if (r.price_avg == null) continue;
      seen.add(r.region);
      const week = weekOf(r.date);
      const entry = byWeek.get(week) ?? {};
      (entry[r.region] ??= []).push(r.price_avg);
      byWeek.set(week, entry);
    }
    return {
      rows: [...byWeek.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, byRegion]) => {
          const row: Record<string, number | string> = { date };
          for (const [region, ps] of Object.entries(byRegion)) row[region] = Math.round(avg(ps));
          return row;
        }),
      regions: [...seen].sort(),
    };
  }, [regional.data]);

  const insight = useMemo(
    () => (regional.data ? analyzeRegional(regional.data.data, filters, unit) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [regional.data, unit],
  );
  const tick = makeDateTickFormatter(rows.map((r) => String(r.date)));

  return (
    <Card
      accent="teal"
      icon={<MapPin className="size-5" />}
      title={tr("market.regional.title", { crop: trTerm("crop", filters.crop) })}
      description={tr("market.regional.description")}
      actions={<ExportButton rows={regional.data?.data ?? []} name={`${filters.crop}-regional.csv`} />}
    >
      {regional.loading ? (
        <LoadingState label={tr("market.comparingRegions")} />
      ) : regional.error ? (
        <ErrorState message={regional.error} onRetry={regional.reload} />
      ) : !rows.length ? (
        <EmptyState title={tr("market.noRegional")} description={tr("market.noRegionalHint")} />
      ) : (
        <div className="space-y-5">
          <div className="-ms-2" style={{ height: CHART_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={tick} interval={0} />
                <YAxis {...Y_AXIS_PROPS} />
                <Tooltip
                  {...TOOLTIP_PROPS}
                  labelFormatter={(l) => formatFullDate(String(l))}
                  formatter={(v, name) => [formatETB(Number(v), unit), trTerm("region", String(name))]}
                />
                <Legend {...LEGEND_PROPS} formatter={(v) => trTerm("region", String(v))} />
                {regions.map((r) => (
                  <Line
                    key={r}
                    dataKey={r}
                    stroke={REGION_COLORS[r] ?? "#98a2b3"}
                    strokeWidth={filters.region === r ? 3 : 1.75}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <InsightPanel insight={insight} />
        </div>
      )}
    </Card>
  );
}

// ── Retail vs producer spread ───────────────────────────────────────────────

function SpreadView({ params, filters, unit }: ViewProps) {
  const { price_level: _level, ...rest } = params;
  void _level;
  const spread = useAsync(() => api.spread(rest), [JSON.stringify(rest)]);

  const rows = useMemo(() => {
    const byDate = new Map<string, { retail: number[]; producer: number[] }>();
    for (const r of spread.data?.data ?? []) {
      if (r.retail_avg == null || r.producer_avg == null) continue;
      const week = weekOf(r.date);
      const e = byDate.get(week) ?? { retail: [], producer: [] };
      e.retail.push(r.retail_avg);
      e.producer.push(r.producer_avg);
      byDate.set(week, e);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, e]) => {
        const retail = Math.round(avg(e.retail));
        const producer = Math.round(avg(e.producer));
        return { date, retail, producer, gap: retail - producer };
      });
  }, [spread.data]);

  const insight = useMemo(
    () => (spread.data ? analyzeSpread(spread.data.data, filters, unit) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spread.data, unit],
  );
  const tick = makeDateTickFormatter(rows.map((r) => r.date));

  return (
    <Card
      accent="violet"
      icon={<Scale className="size-5" />}
      title={tr("market.spread.title")}
      description={tr("market.spread.description")}
      actions={<ExportButton rows={rows} name={`${filters.crop}-spread.csv`} />}
    >
      {spread.loading ? (
        <LoadingState label={tr("market.loadingSpread")} />
      ) : spread.error ? (
        <ErrorState message={spread.error} onRetry={spread.reload} />
      ) : !rows.length ? (
        <EmptyState
          title={tr("market.noSpread")}
          description={tr("market.noSpreadHint")}
        />
      ) : (
        <div className="space-y-5">
          {spread.data && spread.data.producer_coverage_pct < 50 && (
            <Alert
              variant="info"
              message={tr("market.coverage", { pct: spread.data.producer_coverage_pct.toFixed(0) })}
            />
          )}
          <div className="-ms-2" style={{ height: CHART_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={tick} interval={0} />
                <YAxis {...Y_AXIS_PROPS} />
                <Tooltip
                  {...TOOLTIP_PROPS}
                  labelFormatter={(l) => formatFullDate(String(l))}
                  formatter={(v, name) => [
                    formatETB(Number(v), unit),
                    tr(name === "retail" ? "market.shopPrice" : name === "producer" ? "market.farmPrice" : "market.gap"),
                  ]}
                />
                <Legend
                  {...LEGEND_PROPS}
                  formatter={(v) => tr(v === "retail" ? "market.shopPriceRetail" : "market.farmPriceProducer")}
                />
                <Line dataKey="retail" stroke={PRICE_LEVEL_COLORS.retail} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line dataKey="producer" stroke={PRICE_LEVEL_COLORS.producer} strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <InsightPanel insight={insight} />
        </div>
      )}
    </Card>
  );
}

// ── Forecast ────────────────────────────────────────────────────────────────

function ForecastView({
  crop,
  region,
  regions,
  onRegionChange,
  weeksAhead,
  onWeeksChange,
}: {
  crop: string;
  region: string;
  regions: string[];
  onRegionChange: (r: string) => void;
  weeksAhead: string;
  onWeeksChange: (w: string) => void;
}) {
  const fcRegion = region || (regions.includes("Oromia") ? "Oromia" : regions[0]);
  const forecast = useAsync(
    () => api.forecast(crop, fcRegion, Number(weeksAhead)),
    [crop, fcRegion, weeksAhead],
    "service.forecast",
  );
  const current = useAsync(
    () => api.summary({ crop, region: fcRegion, price_level: "retail" }),
    [crop, fcRegion],
  );

  const unit = forecast.data?.predictions[0]?.unit ?? current.data?.unit ?? "";
  const rec = useMemo(
    () => buildForecastRecommendation(forecast.data, current.data?.latest_price ?? null, unit),
    [forecast.data, current.data, unit],
  );

  const rows = useMemo(() => {
    if (!forecast.data) return [];
    const start =
      current.data?.latest_date && current.data.latest_price != null
        ? [{ date: current.data.latest_date, median: Math.round(current.data.latest_price), band: [Math.round(current.data.latest_price), Math.round(current.data.latest_price)] as [number, number] }]
        : [];
    return [
      ...start,
      ...forecast.data.predictions.map((p) => ({
        date: p.forecast_date,
        median: Math.round(p.price_median_etb),
        band: [Math.round(p.price_low_etb), Math.round(p.price_high_etb)] as [number, number],
      })),
    ];
  }, [forecast.data, current.data]);

  const conf = forecast.data ? CONFIDENCE_BADGE[forecast.data.confidence] : null;

  return (
    <Card
      accent="green"
      icon={<Sparkles className="size-5" />}
      title={tr("market.fc.title", { crop: trTerm("crop", crop), region: trTerm("region", fcRegion) })}
      description={tr("market.fc.description")}
      actions={
        <>
          <div className="w-40">
            <Select
              aria-label={tr("market.fc.region")}
              options={regions.map((r) => ({ value: r, label: trTerm("region", r) }))}
              value={fcRegion}
              onChange={onRegionChange}
            />
          </div>
          <div className="w-36">
            <Select
              aria-label={tr("market.fc.weeksAhead")}
              options={["2", "4", "8", "12"].map((w) => ({ value: w, label: tr("ins.time.weeks", { n: w }) }))}
              value={weeksAhead}
              onChange={onWeeksChange}
            />
          </div>
        </>
      }
    >
      {forecast.loading ? (
        <LoadingState label={tr("market.fc.calculating")} />
      ) : forecast.error ? (
        <ErrorState title={tr("market.fc.none")} message={forecast.error} onRetry={forecast.reload} />
      ) : !forecast.data || !rows.length ? (
        <EmptyState title={tr("market.fc.none")} description={tr("market.fc.noneHint")} />
      ) : (
        <div className="space-y-5">
          {rec && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl p-4" style={{ background: rec.bg }}>
                <p className="text-theme-xs font-medium text-gray-600 dark:text-gray-400">{tr("market.fc.ourAdvice")}</p>
                <p className="mt-1 text-xl font-bold" style={{ color: rec.color }}>
                  {rec.label}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">{tr("market.fc.priceToday")}</p>
                <p className="mt-1 text-xl font-bold text-gray-800 dark:text-white/90">{formatETB(rec.currentPrice, unit)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {tr("market.fc.expectedIn", { n: forecast.data.weeks_ahead })}
                </p>
                <p className="mt-1 text-xl font-bold text-gray-800 dark:text-white/90">
                  {formatETB(rec.forecastPrice, unit)}{" "}
                  <span className="text-sm font-semibold" style={{ color: rec.changeColor }}>
                    {formatPct(rec.changePct).text}
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="-ms-2" style={{ height: CHART_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="date" {...AXIS_PROPS} tickFormatter={(d) => formatFullDate(String(d))} />
                <YAxis {...Y_AXIS_PROPS} domain={["auto", "auto"]} />
                <Tooltip
                  {...TOOLTIP_PROPS}
                  labelFormatter={(l) => formatFullDate(String(l))}
                  formatter={(v) =>
                    Array.isArray(v)
                      ? [`${formatETB(Number(v[0]))} – ${formatETB(Number(v[1]), unit)}`, tr("market.fc.likelyRange")]
                      : [formatETB(Number(v), unit), tr("market.fc.expectedPrice")]
                  }
                />
                <Area dataKey="band" stroke="none" fill="#1f8a57" fillOpacity={0.15} isAnimationActive={false} />
                <Line
                  dataKey="median"
                  stroke="#1f8a57"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
            {conf && (
              <Badge size="sm" color={conf.color}>
                {tr(conf.label)}
              </Badge>
            )}
            <span>{forecast.data.confidence_note}</span>
            {forecast.data.model_used && <span>· {tr("market.fc.model", { model: forecast.data.model_used.replace(/_/g, " ") })}</span>}
            <span>· {tr("market.fc.levelPrices", { level: levelName(forecast.data.price_level) })}</span>
          </div>

          <InsightPanel insight={rec} title={tr("market.fc.shouldSell")} />
        </div>
      )}
    </Card>
  );
}
