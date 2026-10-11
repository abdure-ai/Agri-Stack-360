import { api } from "@/api/client";
import Card from "@/components/common/Card";
import DemoDataNotice from "@/components/common/DemoDataNotice";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { ErrorState, LoadingState } from "@/components/common/States";
import AreaPicker, {
  areaPcode,
  type AreaValue,
} from "@/components/form/AreaPicker";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Switch from "@/components/form/switch/Switch";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import type { DealerShop, TrustResult } from "@/types/api";
import { formatDateTime } from "@/utils/formatters";
import { BadgeCheck, Package, ScanLine, Store } from "lucide-react";
import { useState, type FormEvent } from "react";

/** Agro-dealer shop: profile and location, products in stock, check a pack's code before selling it. */
export default function DealerPortal() {
  const shop = useAsync(() => api.dealerShop(), []);
  return (
    <>
      <PageMeta
        title={`${tr("nav.dealer")} | ${tr("app.name")}`}
        description={tr("dealer.description")}
      />
      <PageHeader
        title={tr("nav.dealer")}
        description={tr("dealer.description")}
      />
      <div className="mb-4">
        <DemoDataNotice message="demo.message.trust" />
      </div>
      {shop.loading ? (
        <LoadingState />
      ) : shop.error || !shop.data ? (
        <ErrorState message={shop.error} onRetry={shop.reload} />
      ) : (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 space-y-4 md:space-y-6 xl:col-span-5">
            <ProfileCard data={shop.data} onSaved={shop.reload} />
            <CheckCard />
          </div>
          <div className="col-span-12 xl:col-span-7">
            <ProductsCard data={shop.data} onChanged={shop.reload} />
          </div>
        </div>
      )}
    </>
  );
}

function ProfileCard({
  data,
  onSaved,
}: {
  data: DealerShop;
  onSaved: () => void;
}) {
  const org = data.org;
  const [area, setArea] = useState<AreaValue>({
    region_pcode: org.woreda_pcode?.slice(0, 4) ?? "",
    zone_pcode: org.woreda_pcode?.slice(0, 6) ?? "",
    woreda_pcode: org.woreda_pcode ?? "",
  });
  const [phone, setPhone] = useState(org.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.dealerUpdateShop({
        area_pcode: area.woreda_pcode ? areaPcode(area) : null,
        phone,
      });
      setMsg({ ok: true, text: tr("consent.saved") });
      onSaved();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      accent="green"
      icon={<Store className="size-5" />}
      title={org.name}
      actions={
        org.verified ? (
          <Badge
            color="success"
            startIcon={<BadgeCheck className="size-3.5" />}
          >
            {tr("shops.badge")}
          </Badge>
        ) : (
          <Badge color="light">{tr("dealer.notVerified")}</Badge>
        )
      }
    >
      <form onSubmit={save} noValidate className="space-y-4">
        <AreaPicker idPrefix="shop" value={area} onChange={setArea} />
        <div>
          <Label htmlFor="shop-phone">{tr("dealer.phone")}</Label>
          <Input
            id="shop-phone"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        {!org.verified && (
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {tr("dealer.badgeHint")}
          </p>
        )}
        {msg && (
          <Alert variant={msg.ok ? "success" : "error"} message={msg.text} />
        )}
        <Button
          type="submit"
          size="sm"
          loading={busy}
          disabled={!area.woreda_pcode}
        >
          {tr("common.saveChanges")}
        </Button>
      </form>
    </Card>
  );
}

function ProductsCard({
  data,
  onChanged,
}: {
  data: DealerShop;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState("");
  const [error, setError] = useState<string | null>(null);
  const addable = data.registry.filter(
    (p) => !data.products.some((x) => x.id === p.id),
  );

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
    <Card
      accent="blue"
      icon={<Package className="size-5" />}
      title={tr("dealer.products")}
      description={tr("dealer.productsHint")}
    >
      {error && <Alert className="mb-3" variant="error" message={error} />}
      {!data.products.length ? (
        <p className="mb-4 text-theme-sm text-gray-500">
          {tr("supplier.noProducts")}
        </p>
      ) : (
        <ul className="mb-4 divide-y divide-gray-100 dark:divide-gray-800">
          {data.products.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {p.product_name}
                </p>
                <p className="text-theme-xs text-gray-500">
                  {[p.active_ingredient, p.registration_number]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={!!p.in_stock}
                  onChange={(v) => run(() => api.dealerSetProduct(p.id, v))}
                  label={tr("dealer.inStock")}
                />
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => run(() => api.dealerRemoveProduct(p.id))}
                >
                  {tr("supplier.remove")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {addable.length > 0 && (
        <div className="flex gap-2">
          <div className="flex-1">
            <Select
              aria-label={tr("supplier.addProduct")}
              placeholder="—"
              options={addable.map((p) => ({
                value: String(p.id),
                label: p.product_name,
              }))}
              value={adding}
              onChange={setAdding}
            />
          </div>
          <Button
            size="sm"
            disabled={!adding}
            onClick={() =>
              run(async () => {
                await api.dealerSetProduct(Number(adding), true);
                setAdding("");
              })
            }
          >
            {tr("supplier.addProduct")}
          </Button>
        </div>
      )}
    </Card>
  );
}

function CheckCard() {
  const history = useAsync(() => api.dealerChecks(), []);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<TrustResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(await api.dealerCheck(code));
      history.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      accent="violet"
      icon={<ScanLine className="size-5" />}
      title={tr("dealer.check")}
      description={tr("dealer.checkHint")}
    >
      <form onSubmit={check} noValidate className="flex gap-2">
        <div className="flex-1">
          <Input
            aria-label={tr("trust.codeLabel")}
            placeholder={tr("trust.codePlaceholder")}
            className="font-mono uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          loading={busy}
          disabled={code.trim().length < 4}
        >
          {tr("trust.check")}
        </Button>
      </form>
      {error && <Alert className="mt-3" variant="error" message={error} />}
      {result && (
        <Alert
          className="mt-3"
          variant={result.result === "genuine" ? "success" : "error"}
          title={
            result.result === "genuine"
              ? tr("trust.genuine")
              : tr("trust.warning")
          }
          message={[
            result.product_name,
            result.batch_number,
            result.result === "warning"
              ? tr(`trust.reason.${result.reason}` as MessageKey)
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      )}
      {!!history.data?.length && (
        <ul className="mt-4 space-y-1 text-theme-xs text-gray-600 dark:text-gray-400">
          {history.data.slice(0, 8).map((c) => (
            <li key={c.id} className="flex justify-between gap-2">
              <span className="font-mono">{c.code}</span>
              <span>
                {c.result === "genuine"
                  ? tr("trust.genuine")
                  : tr("trust.warning")}{" "}
                · {formatDateTime(c.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
