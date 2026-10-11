import { api } from "@/api/client";
import Card from "@/components/common/Card";
import InsightPanel from "@/components/common/InsightPanel";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import Tabs from "@/components/ui/tabs/Tabs";
import { useAsync } from "@/hooks/useAsync";
import { tr, trTerm } from "@/i18n/core";
import { DownloadIcon } from "@/icons";
import type { MarketFilters } from "@/types/api";
import { HEAT_GRADIENT_CSS, heatColor, normalize } from "@/utils/colors";
import { exportCsv } from "@/utils/exportCsv";
import { formatAxisDate, formatETB, formatFullDate, weekOf } from "@/utils/formatters";
import type { Insight } from "@/utils/insights";
import { Layers } from "lucide-react";
import { useMemo, useState } from "react";

/** Most markets shown at once; more rows stop being readable. */
const MAX_MARKETS = 40;
/** Most recent weeks shown (about a year). */
const MAX_WEEKS = 52;
/** Weeks used for the "recent price" comparison. */
const RECENT_WEEKS = 4;

const CELL_H = 18;
const LABEL_W = 168;

type SortBy = "price" | "name";

interface MarketRow {
  name: string;
  /** week -> average price that week */
  cells: Map<string, number>;
  /** Average over the last RECENT_WEEKS weeks with data, or null. */
  recent: number | null;
}

interface Matrix {
  weeks: string[];
  markets: MarketRow[];
  totalMarkets: number;
  /** Colour scale bounds (5th–95th percentile, so one outlier does not wash out the rest). */
  lo: number;
  hi: number;
}

function avg(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[i];
}

function buildMatrix(rows: { date: string; market_name?: string | null; price_avg?: number | null }[], sortBy: SortBy): Matrix {
  const byMarket = new Map<string, Map<string, number[]>>();
  const allWeeks = new Set<string>();
  for (const r of rows) {
    if (r.price_avg == null || !r.market_name) continue;
    const week = weekOf(r.date);
    allWeeks.add(week);
    const weeks = byMarket.get(r.market_name) ?? new Map<string, number[]>();
    (weeks.get(week) ?? weeks.set(week, []).get(week)!).push(r.price_avg);
    byMarket.set(r.market_name, weeks);
  }

  const weeks = [...allWeeks].sort().slice(-MAX_WEEKS);
  const shown = new Set(weeks);
  const recentWeeks = new Set(weeks.slice(-RECENT_WEEKS));

  let markets: MarketRow[] = [...byMarket.entries()].map(([name, w]) => {
    const cells = new Map<string, number>();
    for (const [week, ps] of w) if (shown.has(week)) cells.set(week, avg(ps));
    const recentVals = [...cells.entries()].filter(([wk]) => recentWeeks.has(wk)).map(([, v]) => v);
    return { name, cells, recent: recentVals.length ? avg(recentVals) : null };
  });
  markets = markets.filter((m) => m.cells.size > 0);
  const totalMarkets = markets.length;

  // Keep the markets that report most often, then order for display
  markets = markets.sort((a, b) => b.cells.size - a.cells.size).slice(0, MAX_MARKETS);
  if (sortBy === "name") {
    markets.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    const level = (m: MarketRow) => m.recent ?? avg([...m.cells.values()]);
    markets.sort((a, b) => level(b) - level(a));
  }

  const values = markets.flatMap((m) => [...m.cells.values()]).sort((a, b) => a - b);
  return { weeks, markets, totalMarkets, lo: percentile(values, 5), hi: percentile(values, 95) };
}

function heatmapInsight(m: Matrix, filters: MarketFilters, unit: string): Insight | null {
  const withRecent = m.markets.filter((r) => r.recent != null) as (MarketRow & { recent: number })[];
  if (withRecent.length < 2) return null;
  const sorted = [...withRecent].sort((a, b) => b.recent - a.recent);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const gap = top.recent - bottom.recent;
  const gapPct = bottom.recent ? (gap / bottom.recent) * 100 : 0;
  const per = unit ? trTerm("unit", unit) : tr("ins.unit");

  const bullets = [
    tr("heat.ins.recent", {
      weeks: RECENT_WEEKS, top: top.name, topPrice: formatETB(top.recent, unit), bottom: bottom.name, bottomPrice: formatETB(bottom.recent, unit),
    }),
    tr("heat.ins.difference", { diff: formatETB(gap), unit: per, pct: gapPct.toFixed(0) }),
  ];
  if (gapPct > 25) {
    bullets.push(tr("heat.ins.bigGap"));
  } else if (gapPct < 10) {
    bullets.push(tr("heat.ins.similar"));
  }
  if (sorted.length >= 3) {
    bullets.push(tr("heat.ins.others", { markets: sorted.slice(1, 3).map((r) => r.name).join(" · ") }));
  }

  return {
    headline: tr("heat.ins.headline", { market: top.name, crop: trTerm("crop", filters.crop), region: trTerm("region", filters.region) }),
    bullets,
  };
}

export default function HeatmapView({
  params,
  filters,
  unit,
  regions,
  onRegionChange,
}: {
  params: Record<string, string>;
  filters: MarketFilters;
  unit: string;
  regions: string[];
  onRegionChange: (r: string) => void;
}) {
  const [sortBy, setSortBy] = useState<SortBy>("price");
  const [hover, setHover] = useState<{ market: string; week: string; value: number | null; x: number; y: number } | null>(null);
  const hasRegion = !!filters.region;

  const prices = useAsync(
    () => (hasRegion ? api.prices(params) : Promise.resolve(null)),
    [hasRegion, JSON.stringify(params)],
  );

  const matrix = useMemo(() => buildMatrix(prices.data?.data ?? [], sortBy), [prices.data, sortBy]);
  const insight = useMemo(
    () => (hasRegion ? heatmapInsight(matrix, filters, unit) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matrix, hasRegion, unit],
  );

  const labelStep = Math.max(1, Math.ceil(matrix.weeks.length / 10));
  const csvRows = matrix.markets.flatMap((m) =>
    matrix.weeks.filter((w) => m.cells.has(w)).map((w) => ({ market: m.name, week_starting: w, price: Math.round(m.cells.get(w)!) })),
  );

  return (
    <Card
      accent="orange"
      icon={<Layers className="size-5" />}
      title={
        hasRegion
          ? tr("heat.titleRegion", { crop: trTerm("crop", filters.crop), region: trTerm("region", filters.region) })
          : tr("heat.title", { crop: trTerm("crop", filters.crop) })
      }
      description={tr("heat.description")}
      actions={
        hasRegion && (
          <>
            <Tabs
              aria-label={tr("heat.sort")}
              tabs={[
                { id: "price", label: tr("heat.sortPrice") },
                { id: "name", label: tr("heat.sortName") },
              ]}
              value={sortBy}
              onChange={setSortBy}
            />
            <Button
              size="xs"
              variant="outline"
              startIcon={<DownloadIcon className="size-4" />}
              disabled={!csvRows.length}
              onClick={() => exportCsv(csvRows, `${filters.crop}-${filters.region}-market-heatmap.csv`)}
            >
              CSV
            </Button>
          </>
        )
      }
    >
      {!hasRegion ? (
        <EmptyState
          title={tr("heat.chooseRegion")}
          description={tr("heat.chooseRegionHint")}
          action={
            <div className="w-56">
              <Select
                aria-label={tr("common.region")}
                placeholder={tr("area.chooseRegion")}
                placeholderSelectable={false}
                options={regions.map((r) => ({ value: r, label: trTerm("region", r) }))}
                value=""
                onChange={onRegionChange}
              />
            </div>
          }
        />
      ) : prices.loading ? (
        <LoadingState label={tr("heat.building")} />
      ) : prices.error ? (
        <ErrorState message={prices.error} onRetry={prices.reload} />
      ) : !matrix.markets.length ? (
        <EmptyState title={tr("heat.noPrices")} description={tr("heat.noPricesHint")} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-theme-xs text-gray-500 dark:text-gray-400">
            <span>
              {tr("heat.size", { markets: matrix.markets.length, weeks: matrix.weeks.length })}
              {matrix.totalMarkets > matrix.markets.length &&
                ` · ${tr("heat.showingTop", { n: MAX_MARKETS, total: matrix.totalMarkets })}`}
            </span>
            <span className="flex items-center gap-2">
              <span>{formatETB(matrix.lo)}</span>
              <span className="h-2.5 w-28 rounded-full" style={{ background: HEAT_GRADIENT_CSS }} aria-hidden="true" />
              <span>{formatETB(matrix.hi, unit)}</span>
              <span className="ms-2 inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: "var(--chart-empty-cell)" }} aria-hidden="true" />
                {tr("heat.noReport")}
              </span>
            </span>
          </div>

          <div className="custom-scrollbar max-w-full overflow-x-auto">
            <div
              className="grid min-w-full gap-px"
              style={{ gridTemplateColumns: `${LABEL_W}px repeat(${matrix.weeks.length}, minmax(10px, 1fr))` }}
              role="grid"
              aria-label={tr("heat.aria")}
              onMouseLeave={() => setHover(null)}
            >
              {/* Week header row */}
              <div />
              {matrix.weeks.map((w, i) => (
                <div key={w} className="relative h-6">
                  {i % labelStep === 0 && (
                    <span className="absolute bottom-1 left-0 text-[10px] whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {formatAxisDate(w)}
                    </span>
                  )}
                </div>
              ))}

              {/* Market rows */}
              {matrix.markets.map((m) => (
                <div key={m.name} className="contents" role="row">
                  <div
                    className="truncate pe-3 text-theme-xs leading-[18px] text-gray-700 dark:text-gray-300"
                    title={m.name}
                    role="rowheader"
                  >
                    {m.name}
                  </div>
                  {matrix.weeks.map((w) => {
                    const v = m.cells.get(w) ?? null;
                    return (
                      <div
                        key={w}
                        role="gridcell"
                        aria-label={`${m.name}, ${tr("market.weekOf", { date: formatFullDate(w) })}: ${v == null ? tr("heat.noReport") : formatETB(v, unit)}`}
                        className="cursor-crosshair rounded-[2px] transition-opacity hover:opacity-75"
                        style={{
                          height: CELL_H,
                          background: v == null ? "var(--chart-empty-cell)" : heatColor(normalize(v, matrix.lo, matrix.hi)),
                        }}
                        onMouseEnter={(e) => setHover({ market: m.name, week: w, value: v, x: e.clientX, y: e.clientY })}
                        onMouseMove={(e) => setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h))}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {hover && (
            <div
              className="pointer-events-none fixed z-99999 rounded-xl border px-3 py-2 text-theme-xs shadow-theme-md"
              style={{
                left: hover.x + 14,
                top: hover.y - 52,
                background: "var(--chart-tooltip-bg)",
                borderColor: "var(--chart-tooltip-border)",
              }}
            >
              <p className="font-medium text-gray-800 dark:text-white/90">{hover.market}</p>
              <p className="text-gray-500 dark:text-gray-400">{tr("market.weekOf", { date: formatFullDate(hover.week) })}</p>
              <p className="mt-0.5 font-semibold text-gray-800 dark:text-white/90">
                {hover.value == null ? tr("heat.noPriceReported") : formatETB(hover.value, unit)}
              </p>
            </div>
          )}

          <InsightPanel insight={insight} title={tr("heat.whereToSell")} />
        </div>
      )}
    </Card>
  );
}
