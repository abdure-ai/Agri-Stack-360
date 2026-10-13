// ABC inputs (A7): demand plans from cited rates × members' area, member orders, suppliers (nearest first),
// purchase orders (board approval above the limit), receipt with the product check, stock and issue to members.
import { api } from "@/api/client";
import Card from "@/components/common/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, trTerm, type MessageKey } from "@/i18n/core";
import type { AbcInputPlan, AbcPurchaseOrder, AbcStockLot } from "@/types/abc";
import { formatDateTime, formatETB, formatFullDate } from "@/utils/formatters";
import { ClipboardList, PackageCheck, ShoppingCart, Warehouse } from "lucide-react";
import { useState } from "react";

function useRun(onDone: () => void) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (action: () => Promise<unknown>, okText?: string) => {
    setMsg(null);
    try {
      await action();
      if (okText) setMsg({ ok: true, text: okText });
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  };
  return { msg, run };
}

const qtyText = (q: number | null | undefined, unit: string | null) => (q == null ? "—" : `${q.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${unit ?? ""}`.trim());

function NewPlan({ orgId, onDone }: { orgId: number; onDone: () => void }) {
  const [crop, setCrop] = useState("wheat");
  const [season, setSeason] = useState("");
  const [pick, setPick] = useState("");
  const products = useAsync(() => api.abcPlannable(orgId, crop), [orgId, crop]);
  const { msg, run } = useRun(onDone);
  const options = (products.data ?? []).map((p) => ({ value: `${p.product_id}|${p.target}`,
    label: `${p.product_name} · ${trTerm("model", p.target)} · ${p.dose_per_ha ? `${p.dose_per_ha}/ha` : tr("abc.inp.noRate")}` }));
  return (
    <Card icon={<ClipboardList className="size-5" />} title={tr("abc.inp.newPlan")} description={tr("abc.inp.newPlanHint")}>
      {msg && <Alert className="mb-3" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <Label>{tr("market.crop")}</Label>
          <Select value={crop} onChange={(v) => { setCrop(v); setPick(""); }}
            options={["wheat", "teff", "maize", "barley", "onion", "tomato"].map((c) => ({ value: c, label: trTerm("crop", c) }))} />
        </div>
        <div>
          <Label>{tr("abc.vote.season")}</Label>
          <Input value={season} placeholder="2019 E.C. irrigated" onChange={(e) => setSeason(e.target.value)} />
        </div>
        <div>
          <Label>{tr("abc.inp.product")}</Label>
          <Select value={pick} placeholder="—" onChange={setPick} options={options} />
        </div>
      </div>
      {!products.loading && !options.length && <p className="mt-2 text-theme-xs text-gray-500">{tr("abc.inp.noProducts")}</p>}
      <Button className="mt-3" size="sm" disabled={!pick || season.trim().length < 2}
        onClick={() => run(async () => {
          const [pid, target] = pick.split("|");
          await api.abcCreatePlan(orgId, { season: season.trim(), crop, product_id: Number(pid), target });
          setPick("");
        }, tr("abc.inp.planCreated"))}>{tr("abc.inp.createPlan")}</Button>
    </Card>
  );
}

function PlanCard({ p, orgId, canStock, onChanged }: { p: AbcInputPlan; orgId: number; canStock: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [buy, setBuy] = useState(false);
  const shops = useAsync(() => (buy ? api.abcSuppliers(orgId, p.product_id) : Promise.resolve(null)), [buy]);
  const [po, setPo] = useState({ shop: "", qty: String(p.totals.confirmed_qty || p.totals.suggested_qty || ""), price: "" });
  const { msg, run } = useRun(onChanged);
  const t = p.totals;
  return (
    <li className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <button type="button" className="flex w-full flex-wrap items-start justify-between gap-2 text-start" onClick={() => setOpen((o) => !o)}>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-gray-800 dark:text-white/90">{p.product_name} · {trTerm("crop", p.crop)} · {p.season}</span>
          <span className="text-theme-xs text-gray-500">
            {p.rate_text ? tr("abc.inp.rateLine", { rate: p.rate_text, source: p.rate_source ?? "—" }) : tr("abc.inp.noRateLine")}
          </span>
        </span>
        <span className="text-end text-theme-xs text-gray-600 dark:text-gray-400">
          {tr("abc.inp.totals", { members: t.members, ha: t.area_ha, suggested: qtyText(t.suggested_qty, p.unit),
            confirmed: qtyText(t.confirmed_qty, p.unit), n: t.confirmed_members })}
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {msg && <Alert variant={msg.ok ? "success" : "error"} message={msg.text} />}
          <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
            {p.orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span>{o.member_no ? `#${o.member_no} ` : ""}{o.name} <span className="text-theme-xs text-gray-500">· {o.area_ha} {tr("unit.ha")}</span></span>
                <span className="flex items-center gap-2">
                  <span className="text-theme-xs text-gray-600">{tr("abc.inp.suggested")}: {qtyText(o.suggested_qty, p.unit)}</span>
                  {o.status !== "suggested" && <span className="text-theme-xs font-medium">{tr("abc.inp.confirmed")}: {qtyText(o.confirmed_qty ?? 0, p.unit)}</span>}
                  <Badge size="sm" color={o.status === "confirmed" || o.status === "delivered" ? "success" : o.status === "declined" ? "light" : "warning"}>
                    {tr(`abc.inp.status.${o.status}` as MessageKey)}{o.confirmed_by ? ` (${tr(`abc.inp.by.${o.confirmed_by}` as MessageKey)})` : ""}
                  </Badge>
                  {canStock && o.status === "suggested" && (
                    <Button size="xs" variant="ghost" onClick={() => run(() => api.abcConfirmOrder(orgId, o.id, o.suggested_qty))}>{tr("abc.inp.confirmForMember")}</Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {canStock && (
            <div>
              <Button size="sm" variant="outline" startIcon={<ShoppingCart className="size-4" />} onClick={() => setBuy((b) => !b)}>{tr("abc.inp.buy")}</Button>
              {buy && (
                <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
                  {shops.data?.length ? (
                    <ul className="text-sm">
                      {shops.data.map((s) => (
                        <li key={s.shop_id}>
                          <label className="flex items-center gap-2">
                            <input type="radio" name={`shop-${p.id}`} checked={po.shop === String(s.shop_id)}
                              onChange={() => setPo({ ...po, shop: String(s.shop_id), price: s.price_etb ? String(s.price_etb) : po.price })} />
                            <span className="flex-1">{s.name}{s.verified ? ` · ✓ ${tr("photo.shop.verified")}` : ""}
                              <span className="text-theme-xs text-gray-500"> · {s.woreda ?? "—"}{s.distance_km != null ? ` · ${s.distance_km} ${tr("unit.km")}` : ""}</span></span>
                            <span className="text-theme-xs">{s.price_etb != null ? `${formatETB(s.price_etb)}${s.pack_size ? ` / ${s.pack_size}` : ""}${s.price_is_sample ? ` (${tr("photo.shop.samplePrice")})` : ""}` : tr("photo.shop.askPrice")}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-theme-xs text-gray-500">{tr("photo.shop.none")}</p>}
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="w-28"><Label>{tr("abc.inp.qty")} ({p.unit ?? "—"})</Label>
                      <Input inputMode="decimal" value={po.qty} onChange={(e) => setPo({ ...po, qty: e.target.value })} /></div>
                    <div className="w-32"><Label>{tr("abc.inp.unitPrice")}</Label>
                      <Input inputMode="decimal" value={po.price} onChange={(e) => setPo({ ...po, price: e.target.value })} /></div>
                    <Button size="sm" disabled={!po.shop || !Number(po.qty)} onClick={() => run(async () => {
                      const shop = shops.data!.find((s) => String(s.shop_id) === po.shop)!;
                      const r = await api.abcCreatePO(orgId, { supplier: shop.name, supplier_shop_id: shop.shop_id, plan_id: p.id,
                        items: [{ product_id: p.product_id, qty: Number(po.qty), unit: p.unit ?? "unit", unit_price_etb: po.price ? Number(po.price) : null }] });
                      setBuy(false);
                      return r;
                    }, tr("abc.inp.poCreated"))}>{tr("abc.inp.createPO")}</Button>
                  </div>
                  <p className="text-theme-xs text-gray-500">{tr("abc.inp.neutral")}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function PurchaseOrders({ orgId, canStock, version, onChanged }: { orgId: number; canStock: boolean; version: number; onChanged: () => void }) {
  const list = useAsync(() => api.abcPurchaseOrders(orgId), [orgId, version]);
  const [recv, setRecv] = useState<Record<number, { qty: string; code: string; batch: string; exp: string }>>({});
  const [warn, setWarn] = useState<string | null>(null);
  const { msg, run } = useRun(onChanged);
  if (!list.data?.length) return null;
  const color = (s: AbcPurchaseOrder["status"]) => (s === "received" || s === "approved" ? "success" : s === "pending" ? "warning" : "error");
  return (
    <Card icon={<ShoppingCart className="size-5" />} title={tr("abc.inp.pos")}>
      {warn ? <Alert className="mb-3" variant="warning" message={warn} />
        : msg && <Alert className="mb-3" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      <ul className="space-y-3">
        {list.data.map((po) => (
          <li key={po.id} className="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-gray-800 dark:text-white/90">PO {po.id} · {po.supplier}</span>
              <span className="flex items-center gap-2">
                <span>{formatETB(po.total_etb)}</span>
                <Badge size="sm" color={color(po.status)}>{tr(`abc.inp.po.${po.status}` as MessageKey)}</Badge>
              </span>
            </div>
            <p className="text-theme-xs text-gray-500">
              {po.items.map((i) => `${i.qty} ${i.unit} ${i.product_name}`).join(", ")} · {formatDateTime(po.created_at)}
            </p>
            {canStock && (po.status === "approved" || po.status === "received") && po.items.map((i) => {
              const key = po.id * 100000 + i.product_id;
              const v = recv[key] ?? { qty: String(i.qty), code: "", batch: "", exp: "" };
              return (
                <div key={i.product_id} className="mt-2 flex flex-wrap items-end gap-2">
                  <div className="w-24"><Label>{tr("abc.inp.qty")}</Label>
                    <Input inputMode="decimal" value={v.qty} onChange={(e) => setRecv({ ...recv, [key]: { ...v, qty: e.target.value } })} /></div>
                  <div className="w-44"><Label>{tr("trust.codeLabel")}</Label>
                    <Input value={v.code} className="font-mono uppercase" onChange={(e) => setRecv({ ...recv, [key]: { ...v, code: e.target.value } })} /></div>
                  <div className="w-28"><Label>{tr("trust.batch")}</Label>
                    <Input value={v.batch} onChange={(e) => setRecv({ ...recv, [key]: { ...v, batch: e.target.value } })} /></div>
                  <div className="w-40"><Label>{tr("trust.expires")}</Label>
                    <Input type="date" value={v.exp} onChange={(e) => setRecv({ ...recv, [key]: { ...v, exp: e.target.value } })} /></div>
                  <Button size="sm" variant="outline" startIcon={<PackageCheck className="size-4" />} disabled={!Number(v.qty)}
                    onClick={() => run(async () => {
                      const lot = await api.abcReceive(orgId, { po_id: po.id, product_id: i.product_id, qty: Number(v.qty), code: v.code.trim() || null,
                        batch_number: v.batch.trim() || null, expires_on: v.exp || null });
                      setWarn(lot.status === "quarantined"
                        ? tr("abc.inp.quarantined", { reason: tr(`abc.inp.reason.${lot.trust_reason}` as MessageKey) }) : null);
                    }, tr("abc.inp.received"))}>{tr("abc.inp.receive")}</Button>
                </div>
              );
            })}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-theme-xs text-gray-500">{tr("abc.inp.receiveHint")}</p>
    </Card>
  );
}

function Stock({ orgId, version, onChanged }: { orgId: number; version: number; onChanged: () => void }) {
  const st = useAsync(() => api.abcStock(orgId), [orgId, version]);
  const members = useAsync(() => api.abcRegistry(orgId).then((r) => r.members.filter((m) => m.status === "active")), [orgId]);
  const [issue, setIssue] = useState<Record<number, { farmer: string; qty: string; price: string; payment: string }>>({});
  const { msg, run } = useRun(onChanged);
  if (st.loading && !st.data) return <LoadingState />;
  if (st.error || !st.data) return <ErrorState message={st.error} onRetry={st.reload} />;
  const badge = (l: AbcStockLot) => l.expired ? ["error", "abc.inp.lot.expired"] : l.status === "quarantined" ? ["error", "abc.inp.lot.quarantined"]
    : l.qty_remaining <= 0 ? ["light", "abc.inp.lot.empty"] : l.expires_soon ? ["warning", "abc.inp.lot.expiresSoon"] : ["success", "abc.inp.lot.available"];
  return (
    <Card icon={<Warehouse className="size-5" />} title={tr("abc.inp.stock")}>
      {msg && <Alert className="mb-3" variant={msg.ok ? "success" : "error"} message={msg.text} />}
      {st.data.lots.length ? (
        <ul className="space-y-2 text-sm">
          {st.data.lots.map((l) => {
            const [color, key] = badge(l);
            const v = issue[l.id] ?? { farmer: "", qty: "", price: l.unit_cost_etb ? String(l.unit_cost_etb) : "", payment: "credit" };
            return (
              <li key={l.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-800 dark:text-white/90">{l.product_name}</span>
                  <span className="flex items-center gap-2">
                    <span>{qtyText(l.qty_remaining, l.unit)} / {qtyText(l.qty_received, l.unit)}</span>
                    <Badge size="sm" color={color as "error" | "warning" | "success" | "light"}>{tr(key as MessageKey)}</Badge>
                  </span>
                </div>
                <p className="text-theme-xs text-gray-500">
                  {l.code ? `${l.code} · ` : ""}{l.batch_number ? `${tr("trust.batch")} ${l.batch_number} · ` : ""}
                  {l.expires_on ? `${tr("trust.expires")} ${formatFullDate(l.expires_on)} · ` : ""}
                  {l.trust_reason ? tr(`abc.inp.reason.${l.trust_reason}` as MessageKey) : ""}
                </p>
                {st.data!.can_stock && l.status === "quarantined" && !l.expired && ["no_code", "expired"].includes(l.trust_reason ?? "") && (
                  <Button size="xs" variant="ghost" onClick={() => {
                    const reason = window.prompt(tr("abc.inp.releaseReason"));
                    if (reason && reason.trim().length >= 5) void run(() => api.abcReleaseLot(orgId, l.id, reason.trim()));
                  }}>{tr("abc.inp.release")}</Button>
                )}
                {st.data!.can_stock && l.issuable && (
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <div className="w-44"><Label>{tr("abc.form.member")}</Label>
                      <Select value={v.farmer} placeholder="—" onChange={(x) => setIssue({ ...issue, [l.id]: { ...v, farmer: x } })}
                        options={(members.data ?? []).map((m) => ({ value: String(m.farmer_id), label: m.name }))} /></div>
                    <div className="w-24"><Label>{tr("abc.inp.qty")}</Label>
                      <Input inputMode="decimal" value={v.qty} onChange={(e) => setIssue({ ...issue, [l.id]: { ...v, qty: e.target.value } })} /></div>
                    <div className="w-28"><Label>{tr("abc.inp.unitPrice")}</Label>
                      <Input inputMode="decimal" value={v.price} onChange={(e) => setIssue({ ...issue, [l.id]: { ...v, price: e.target.value } })} /></div>
                    <div className="w-32"><Label>{tr("abc.inp.payment")}</Label>
                      <Select value={v.payment} onChange={(x) => setIssue({ ...issue, [l.id]: { ...v, payment: x } })}
                        options={[{ value: "credit", label: tr("abc.inp.onCredit") }, { value: "cash", label: tr("abc.pay.cash") }]} /></div>
                    <Button size="sm" disabled={!v.farmer || !Number(v.qty)} onClick={() => run(() => api.abcIssue(orgId, {
                      lot_id: l.id, farmer_id: Number(v.farmer), qty: Number(v.qty), price_etb: Number(v.price || 0), payment: v.payment }),
                      tr("abc.inp.issued"))}>{tr("abc.inp.issue")}</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : <EmptyState title={tr("abc.inp.noStock")} />}
    </Card>
  );
}

export default function InputsTab({ orgId }: { orgId: number }) {
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const plans = useAsync(() => api.abcInputPlans(orgId), [orgId, version]);
  if (plans.loading && !plans.data) return <LoadingState />;
  if (plans.error || !plans.data) return <ErrorState message={plans.error} onRetry={plans.reload} />;
  const d = plans.data;
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-4 xl:col-span-7">
        {d.can_plan && <NewPlan orgId={orgId} onDone={reload} />}
        <Card icon={<ClipboardList className="size-5" />} title={tr("abc.inp.plans")} description={tr("abc.inp.plansHint")}>
          {d.plans.length ? (
            <ul className="space-y-3">{d.plans.map((p) => <PlanCard key={p.id} p={p} orgId={orgId} canStock={d.can_stock} onChanged={reload} />)}</ul>
          ) : <EmptyState title={tr("abc.inp.noPlans")} />}
        </Card>
      </div>
      <div className="col-span-12 space-y-4 xl:col-span-5">
        <PurchaseOrders orgId={orgId} canStock={d.can_stock} version={version} onChanged={reload} />
        <Stock orgId={orgId} version={version} onChanged={reload} />
      </div>
    </div>
  );
}
