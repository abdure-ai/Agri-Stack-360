import { api } from "@/api/client";
import Card from "@/components/common/Card";
import DemoDataNotice from "@/components/common/DemoDataNotice";
import VerifiedShopsCard from "@/components/trust/VerifiedShopsCard";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, trTerm } from "@/i18n/core";
import { CallIcon, StarFill } from "@/icons";
import type { Supplier } from "@/types/api";
import { REGIONS, SUPPLIER_CATEGORIES } from "@/utils/constants";
import { formatNumber } from "@/utils/formatters";
import { cn } from "@/utils";
import { Scale } from "lucide-react";
import { useState } from "react";

const MAX_COMPARE = 4;

type SupplierRow = Supplier & { product_categories?: string[] };

export default function InputSuppliers() {
  const { user, can } = useAuth();
  const [region, setRegion] = useState(user?.region ?? "");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [context, setContext] = useState("");
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<string | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  const suppliers = useAsync(
    () => api.getSuppliers({ region, category }) as Promise<SupplierRow[]>,
    [region, category],
  );

  const q = search.trim().toLowerCase();
  const visible = (suppliers.data ?? []).filter(
    (s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.zone?.toLowerCase().includes(q) ||
      s.products?.some((p) => p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q)),
  );

  function toggle(id: number, on: boolean) {
    setComparison(null);
    setSelected((sel) => (on ? [...sel, id].slice(-MAX_COMPARE) : sel.filter((x) => x !== id)));
  }

  async function compare() {
    setComparing(true);
    setCompareError(null);
    setComparison(null);
    try {
      const res = await api.compareSuppliers({ supplier_ids: selected, context: context.trim() || null });
      setComparison(res.comparison);
    } catch (err) {
      setCompareError(errorMessage(err));
    } finally {
      setComparing(false);
    }
  }

  return (
    <>
      <PageMeta title={`${tr("nav.inputs")} | ${tr("app.name")}`} description={tr("inputs.meta")} />
      <PageHeader title={tr("nav.inputs")} description={tr("inputs.description")} />

      <div className="space-y-6">
        {can("inputs:verify") && <VerifiedShopsCard compact />}
        <DemoDataNotice subject="demo.subject.suppliers" />
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="s-region">{tr("common.region")}</Label>
              <Select
                id="s-region"
                placeholder={user?.region ? tr("inputs.myRegion", { region: trTerm("region", user.region) }) : tr("market.allRegions")}
                options={REGIONS.map((r) => ({ value: r, label: trTerm("region", r) }))}
                value={region}
                onChange={(v) => {
                  setRegion(v);
                  setSelected([]);
                }}
              />
            </div>
            <div>
              <Label htmlFor="s-cat">{tr("inputs.productType")}</Label>
              <Select
                id="s-cat"
                placeholder={tr("inputs.allProducts")}
                options={SUPPLIER_CATEGORIES.map((c) => ({ value: c, label: trTerm("category", c) }))}
                value={category}
                onChange={setCategory}
              />
            </div>
            <div>
              <Label htmlFor="s-search">{tr("common.search")}</Label>
              <Input
                id="s-search"
                placeholder={tr("inputs.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {selected.length > 0 && (
          <Card
            accent="violet"
            icon={<Scale className="size-5" />}
            title={tr(selected.length > 1 ? "inputs.compareN" : "inputs.compare1", { n: selected.length })}
            description={tr(selected.length < 2 ? "inputs.tickMore" : "inputs.tellNeed")}
            actions={
              <Button size="xs" variant="ghost" onClick={() => setSelected([])}>
                {tr("inputs.clear")}
              </Button>
            }
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Input
                  aria-label={tr("inputs.whatNeed")}
                  placeholder={tr("inputs.needPlaceholder")}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
              </div>
              <Button size="sm" onClick={compare} loading={comparing} disabled={selected.length < 2}>
                {tr("inputs.compare")}
              </Button>
            </div>
            {compareError && <Alert variant="error" message={compareError} className="mt-4" />}
            {comparison && (
              <div className="mt-4 rounded-xl border border-brand-100 bg-brand-25 p-4 text-sm whitespace-pre-line text-gray-700 dark:border-brand-500/20 dark:bg-brand-500/5 dark:text-gray-300">
                {comparison}
              </div>
            )}
          </Card>
        )}

        {suppliers.loading ? (
          <Card>
            <LoadingState label={tr("inputs.finding")} />
          </Card>
        ) : suppliers.error ? (
          <Card>
            <ErrorState message={suppliers.error} onRetry={suppliers.reload} />
          </Card>
        ) : !visible.length ? (
          <Card>
            <EmptyState
              title={tr("inputs.none")}
              description={tr("inputs.noneHint")}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-6">
            {visible.map((s) => (
              <SupplierCard key={s.id} supplier={s} selected={selected.includes(s.id)} onToggle={(on) => toggle(s.id, on)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function SupplierCard({ supplier: s, selected, onToggle }: { supplier: SupplierRow; selected: boolean; onToggle: (on: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const products = s.products ?? [];
  const shown = expanded ? products : products.slice(0, 3);

  return (
    <Card accent={selected ? "green" : "orange"} className={cn("h-full", selected && "border-brand-400 dark:border-brand-700")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-800 dark:text-white/90">{s.name}</h3>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {[s.zone, s.region ? trTerm("region", s.region) : null].filter(Boolean).join(", ")}
            {s.distance_km != null && ` · ${tr("inputs.kmAway", { n: s.distance_km })}`}
          </p>
        </div>
        <Checkbox checked={selected} onChange={onToggle} label={tr("inputs.compare")} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {s.rating != null && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            <StarFill className="size-4 text-warning-400" aria-hidden="true" />
            {s.rating.toFixed(1)}
          </span>
        )}
        {s.product_categories?.map((c) => (
          <Badge key={c} size="sm" color="light">
            {trTerm("category", c)}
          </Badge>
        ))}
      </div>

      {products.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
          {shown.map((p, i) => (
            <li key={`${p.name}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-800 dark:text-white/90">{p.name}</p>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {[p.brand, p.stock && tr("inputs.stock", { stock: p.stock })].filter(Boolean).join(" · ")}
                </p>
              </div>
              {p.price != null && (
                <span className="shrink-0 text-sm font-medium text-gray-800 dark:text-white/90">
                  {formatNumber(p.price)} {tr("unit.etb")}{p.unit ? `/${trTerm("unit", p.unit)}` : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {products.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-theme-xs font-medium text-brand-500 hover:underline dark:text-brand-400"
        >
          {expanded ? tr("common.showLess") : tr("inputs.showAll", { n: products.length })}
        </button>
      )}

      {s.phone && (
        <a
          href={`tel:${s.phone}`}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          <CallIcon className="size-4" />
          {s.phone}
        </a>
      )}
    </Card>
  );
}
