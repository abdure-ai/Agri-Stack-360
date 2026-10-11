import { api } from "@/api/client";
import AlertsPanel from "@/components/advisory/AlertsPanel";
import CropCalendarCard from "@/components/advisory/CropCalendarCard";
import DailyTipCard from "@/components/advisory/DailyTipCard";
import Card from "@/components/common/Card";
import PageMeta from "@/components/common/PageMeta";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { tr, trTerm, type MessageKey } from "@/i18n/core";
import { useAsync } from "@/hooks/useAsync";
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from "@/icons";
import { visibleNav, type NavItem } from "@/layout/navigation";
import type { FarmStatus, SummaryResponse } from "@/types/api";
import { roleLabel } from "@/utils/constants";
import { formatETB, formatFullDate, formatPct, todayISO } from "@/utils/formatters";
import { buildForecastRecommendation } from "@/utils/insights";
import StatCard from "@/components/common/StatCard";
import { cn } from "@/utils";
import { ACCENTS, cropAccent, PAGE_ACCENTS } from "@/utils/accents";
import {
  Bean,
  Leaf,
  MapPin,
  Sparkles,
  Sprout,
  Tractor,
  TrendingDown,
  TrendingUp,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

const KEY_CROPS = ["Teff", "Maize", "Wheat", "Sorghum"];
const FORECAST_CROP = "Teff";

const FARM_STATUS: Record<FarmStatus, { color: "success" | "warning" | "error"; label: MessageKey }> = {
  healthy: { color: "success", label: "farm.status.healthy" },
  warning: { color: "warning", label: "farm.status.warning" },
  critical: { color: "error", label: "farm.status.critical" },
};

const CROP_ICONS: Record<string, LucideIcon> = {
  Teff: Leaf,
  Maize: Sprout,
  Wheat: Wheat,
  Sorghum: Bean,
};

function todayLong() {
  return `${tr(`weekday.${new Date().getDay()}` as MessageKey)}, ${formatFullDate(todayISO())}`;
}

function greeting(name: string) {
  const h = new Date().getHours();
  return tr(h < 12 ? "dash.morning" : h < 18 ? "dash.afternoon" : "dash.evening", { name });
}

export default function Home() {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const region = user?.region || "Oromia";

  const prices = useAsync(
    () =>
      Promise.all(
        KEY_CROPS.map((crop) =>
          api
            .summary({ crop, region, price_level: "retail" })
            .then((s) => ({ crop, summary: s as SummaryResponse | null }))
            .catch(() => ({ crop, summary: null })),
        ),
      ),
    [region],
    "service.market",
  );

  const forecast = useAsync(() => api.forecast(FORECAST_CROP, region, 4), [region], "service.forecast");
  const showFarms = can("farms:manage:own", "farms:read:region", "farms:manage:all");
  const ownsFarms = can("farms:manage:own") && !can("farms:manage:all", "farms:read:region");
  const farmScope = can("farms:manage:all")
    ? { title: tr("dash.allFarms"), manageLabel: tr("nav.cropHealth"), manageTo: "/crop-health", empty: tr("dash.noFarmsAll") }
    : can("farms:read:region")
      ? {
          title: user?.region ? tr("dash.farmsIn", { region: trTerm("region", user.region) }) : tr("dash.farmsInYourRegion"),
          manageLabel: tr("nav.cropHealth"),
          manageTo: "/crop-health",
          empty: user?.region
            ? tr("dash.noFarmsRegion", { region: trTerm("region", user.region) })
            : tr("dash.askRegion"),
        }
      : { title: tr("dash.myFarms"), manageLabel: tr("dash.manage"), manageTo: "/profile", empty: "" };
  const farms = useAsync(() => (showFarms ? api.getFarms() : Promise.resolve([])), [showFarms]);

  const teffNow = prices.data?.find((p) => p.crop === FORECAST_CROP)?.summary;
  const rec = buildForecastRecommendation(forecast.data, teffNow?.latest_price ?? null, teffNow?.unit ?? "");
  const shortcuts = visibleNav(can)
    .flatMap((g) => g.items)
    .filter((i) => i.path !== "/");

  return (
    <>
      <PageMeta title={`${tr("nav.dashboard")} | ${tr("app.name")}`} description={tr("dash.meta")} />

      {/* Welcome banner */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-linear-to-br from-brand-600 via-emerald-600 to-teal-600 p-6 text-white shadow-theme-md sm:p-8">
        <Wheat className="pointer-events-none absolute -end-6 -bottom-8 size-48 rotate-12 text-white/10" aria-hidden="true" />
        <Sprout className="pointer-events-none absolute end-40 -top-6 hidden size-28 -rotate-12 text-white/10 md:block" aria-hidden="true" />
        <div className="relative">
          <p className="text-sm font-medium text-emerald-100">{todayLong()}</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
            {greeting(user?.name?.split(" ")[0] ?? "")}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/15 px-3 py-1 font-medium backdrop-blur-sm">
              {user ? roleLabel(user.role) : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-medium backdrop-blur-sm">
              <MapPin className="size-4" aria-hidden="true" />
              {trTerm("region", region)}
            </span>
            {!user?.region && (
              <Link to="/profile" className="rounded-full bg-white px-3 py-1 font-medium text-brand-700 hover:bg-emerald-50">
                {tr("dash.setRegion")}
              </Link>
            )}
          </div>
        </div>
      </div>

      <DailyTipCard />
      {can("advisory:use") && <AlertsPanel />}
      {ownsFarms && (
        <div className="mb-6">
          <CropCalendarCard />
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Key crop prices */}
        <div className="col-span-12">
          {prices.loading ? (
            <Card>
              <LoadingState label={tr("dash.loadingPrices")} />
            </Card>
          ) : prices.error ? (
            <Card>
              <ErrorState message={prices.error} onRetry={prices.reload} />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
              {prices.data?.map(({ crop, summary }) => {
                const pct = formatPct(summary?.wow_change_pct);
                const CropIcon = CROP_ICONS[crop] ?? Sprout;
                return (
                  <StatCard
                    key={crop}
                    accent={cropAccent(crop)}
                    icon={<CropIcon className="size-6" aria-hidden="true" />}
                    label={`${trTerm("crop", crop)} · ${tr("price.retail")}`}
                    value={summary?.latest_price != null ? formatETB(summary.latest_price) : "—"}
                    onClick={() => navigate("/market")}
                    footer={
                      summary?.latest_price != null ? (
                        <>
                          {summary.wow_change_pct != null && (
                            <Badge
                              size="sm"
                              color={pct.direction === "up" ? "success" : pct.direction === "down" ? "error" : "light"}
                              startIcon={
                                pct.direction === "up" ? (
                                  <ArrowUpIcon className="size-3" />
                                ) : pct.direction === "down" ? (
                                  <ArrowDownIcon className="size-3" />
                                ) : undefined
                              }
                            >
                              {pct.text}
                            </Badge>
                          )}
                          <span>
                            {tr("price.perUnit", { unit: trTerm("unit", summary.unit) })} · {formatFullDate(summary.latest_date)}
                          </span>
                        </>
                      ) : (
                        tr("dash.noRecentPrices", { region: trTerm("region", region) })
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Selling advice */}
        <div className="col-span-12 xl:col-span-7">
          <Card
            className="h-full"
            accent={rec && rec.changePct < -3 ? "orange" : "green"}
            icon={rec && rec.changePct < -3 ? <TrendingDown className="size-5" /> : <TrendingUp className="size-5" />}
            title={tr("dash.sellingAdvice", { crop: trTerm("crop", FORECAST_CROP), region: trTerm("region", region) })}
            description={tr("dash.basedOnForecast")}
            actions={
              <Button size="xs" variant="outline" onClick={() => navigate("/market")} endIcon={<ArrowRightIcon className="size-4" />}>
                {tr("dash.fullForecast")}
              </Button>
            }
          >
            {forecast.loading || prices.loading ? (
              <LoadingState label={tr("dash.checkingForecast")} />
            ) : forecast.error ? (
              <ErrorState title={tr("dash.forecastUnavailable")} message={forecast.error} onRetry={forecast.reload} />
            ) : !rec ? (
              <EmptyState title={tr("dash.notEnoughData")} description={tr("dash.cannotForecast", { crop: trTerm("crop", FORECAST_CROP), region: trTerm("region", region) })} />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="rounded-xl px-4 py-2 text-lg font-bold" style={{ background: rec.bg, color: rec.color }}>
                    {rec.label}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {tr("dash.todayToForecast", { now: formatETB(rec.currentPrice), later: formatETB(rec.forecastPrice) })} (
                    <span style={{ color: rec.changeColor }}>{formatPct(rec.changePct).text}</span>)
                  </span>
                </div>
                <p className="text-sm text-gray-800 dark:text-white/90">{rec.headline}</p>
                <ul className="space-y-2">
                  {rec.bullets.slice(0, 2).map((b) => (
                    <li key={b} className="flex gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        {/* Farms or shortcuts */}
        <div className="col-span-12 xl:col-span-5">
          {showFarms ? (
            <Card
              className="h-full"
              accent="teal"
              icon={<Tractor className="size-5" />}
              title={farmScope.title}
              actions={
                <Button size="xs" variant="outline" onClick={() => navigate(farmScope.manageTo)}>
                  {farmScope.manageLabel}
                </Button>
              }
            >
              {farms.loading ? (
                <LoadingState />
              ) : farms.error ? (
                <ErrorState message={farms.error} onRetry={farms.reload} />
              ) : !farms.data?.length ? (
                ownsFarms ? (
                  <EmptyState
                    title={tr("dash.noFarmsYet")}
                    description={tr("dash.addFieldsHint")}
                    action={
                      <Button size="sm" onClick={() => navigate("/profile")}>
                        {tr("dash.addFarm")}
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState title={tr("dash.noFarmsToShow")} description={farmScope.empty} />
                )
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {farms.data.slice(0, 5).map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{f.field_name}</p>
                        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                          {!ownsFarms && f.owner_name ? `${f.owner_name} · ` : ""}
                          {trTerm("crop", f.crop_name)}
                          {f.area_ha ? ` · ${f.area_ha} ${tr("unit.ha")}` : ""}
                        </p>
                      </div>
                      <Badge size="sm" color={FARM_STATUS[f.status]?.color ?? "light"}>
                        {FARM_STATUS[f.status] ? tr(FARM_STATUS[f.status].label) : f.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : (
            <ShortcutCard items={shortcuts} />
          )}
        </div>

        {showFarms && (
          <div className="col-span-12">
            <ShortcutCard items={shortcuts} />
          </div>
        )}
      </div>
    </>
  );
}

function ShortcutCard({ items }: { items: NavItem[] }) {
  return (
    <Card className="h-full" title={tr("dash.quickLinks")} icon={<Sparkles className="size-5" />} accent="violet">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {items.map((i) => {
          const a = ACCENTS[PAGE_ACCENTS[i.path] ?? "green"];
          return (
            <Link
              key={i.path}
              to={i.path}
              className={cn(
                "group flex flex-col items-center gap-2.5 rounded-xl border p-4 text-center text-sm font-medium text-gray-700 transition hover:-translate-y-0.5 dark:text-gray-300",
                a.border,
                a.surface,
                a.hover,
              )}
            >
              <span className={cn("flex size-11 items-center justify-center rounded-xl transition group-hover:scale-110", a.tile)}>
                {i.icon}
              </span>
              {tr(i.name)}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
