import { api } from "@/api/client";
import Card from "@/components/common/Card";
import DemoDataNotice from "@/components/common/DemoDataNotice";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import type { CodeBatch, RegistryProduct } from "@/types/api";
import { formatDateTime, formatFullDate } from "@/utils/formatters";
import { Boxes, Package, PieChart, Plus, Printer } from "lucide-react";
import { useState, type FormEvent } from "react";
import DemandCard from "./DemandCard";

const TH = "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const TD = "px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300";

/** Supplier portal: catalogue from the registered list, code batches with printable labels, check reports. */
export default function SupplierPortal() {
  const { can } = useAuth();
  const isAdmin = can("orgs:manage");
  const orgs = useAsync(() => (isAdmin ? api.adminOrgs("supplier") : Promise.resolve([])), [isAdmin]);
  const [picked, setPicked] = useState<number | null>(null);
  const orgId = isAdmin ? (picked ?? orgs.data?.[0]?.id ?? null) : null;
  const ready = !isAdmin || orgId != null;

  return (
    <>
      <PageMeta title={`${tr("nav.supplier")} | ${tr("app.name")}`} description={tr("supplier.description")} />
      <PageHeader
        title={tr("nav.supplier")}
        description={tr("supplier.description")}
        actions={
          isAdmin && orgs.data?.length ? (
            <div className="w-64">
              <Select
                aria-label={tr("supplier.chooseOrg")}
                options={orgs.data.map((o) => ({ value: String(o.id), label: o.name }))}
                value={orgId ? String(orgId) : ""}
                onChange={(v) => setPicked(Number(v))}
              />
            </div>
          ) : undefined
        }
      />
      <div className="mb-4">
        <DemoDataNotice message="demo.message.trust" />
      </div>
      {isAdmin && orgs.loading ? (
        <LoadingState />
      ) : isAdmin && !orgs.data?.length ? (
        <Card>
          <EmptyState title={tr("orgs.none")} />
        </Card>
      ) : ready ? (
        <Portal key={orgId ?? "mine"} orgId={orgId} />
      ) : null}
    </>
  );
}

function Portal({ orgId }: { orgId: number | null }) {
  const org = useAsync(() => api.supplierOrg(orgId), [orgId]);
  const batches = useAsync(() => api.supplierBatches(orgId), [orgId]);
  const report = useAsync(() => api.supplierReport(30, orgId), [orgId]);
  const [adding, setAdding] = useState("");
  const [creating, setCreating] = useState(false);
  const [recalling, setRecalling] = useState<CodeBatch | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, reload: () => void) {
    setError(null);
    try {
      await action();
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function printLabel(b: CodeBatch) {
    try {
      const url = URL.createObjectURL(await api.supplierLabel(b.id, orgId));
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (org.loading) return <LoadingState />;
  if (org.error || !org.data) return <ErrorState message={org.error} onRetry={org.reload} />;
  const { catalogue, registry } = org.data;
  const addable = registry.filter((p) => !catalogue.some((c) => c.id === p.id));
  const r = report.data;

  return (
    <div className="space-y-4 md:space-y-6">
      {error && <Alert variant="error" message={error} />}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 xl:col-span-5">
          <Card accent="green" icon={<Package className="size-5" />} title={tr("supplier.catalogue")} description={tr("supplier.catalogueHint")}>
            {!catalogue.length ? (
              <p className="mb-4 text-theme-sm text-gray-500">{tr("supplier.noProducts")}</p>
            ) : (
              <ul className="mb-4 divide-y divide-gray-100 dark:divide-gray-800">
                {catalogue.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                    <ProductLine p={p} />
                    <Button size="xs" variant="ghost" onClick={() => run(() => api.supplierRemoveProduct(p.id, orgId), org.reload)}>
                      {tr("supplier.remove")}
                    </Button>
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
                    options={addable.map((p) => ({ value: String(p.id), label: p.product_name }))}
                    value={adding}
                    onChange={setAdding}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!adding}
                  onClick={() =>
                    run(async () => {
                      await api.supplierAddProduct(Number(adding), orgId);
                      setAdding("");
                    }, org.reload)
                  }
                >
                  {tr("supplier.addProduct")}
                </Button>
              </div>
            )}
          </Card>
        </div>

        <div className="col-span-12 xl:col-span-7">
          <Card
            accent="blue"
            icon={<Boxes className="size-5" />}
            title={tr("supplier.batches")}
            description={tr("supplier.batchesHint")}
            actions={
              <Button size="sm" startIcon={<Plus className="size-4" />} disabled={!catalogue.length} onClick={() => setCreating(true)}>
                {tr("supplier.newBatch")}
              </Button>
            }
            bodyClassName="p-0"
          >
            {batches.loading ? (
              <LoadingState />
            ) : batches.error ? (
              <ErrorState message={batches.error} onRetry={batches.reload} />
            ) : !batches.data?.length ? (
              <EmptyState title={tr("supplier.noBatches")} />
            ) : (
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                    <TableRow>
                      <TableCell isHeader className={`${TH} ps-5`}>{tr("supplier.batchNumber")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("trust.codeLabel")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("supplier.units")}</TableCell>
                      <TableCell isHeader className={TH}>{tr("supplier.checks")}</TableCell>
                      <TableCell isHeader className={`${TH} pe-5 text-end`}> </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {batches.data.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className={`${TD} ps-5`}>
                          <p className="font-medium text-gray-800 dark:text-white/90">{b.batch_number}</p>
                          <p className="text-theme-xs text-gray-500">{b.product_name}</p>
                          {b.expires_on && <p className="text-theme-xs text-gray-400">{tr("trust.expires")}: {formatFullDate(b.expires_on)}</p>}
                        </TableCell>
                        <TableCell className={`${TD} font-mono text-theme-xs`}>{b.code}</TableCell>
                        <TableCell className={TD}>{b.units}</TableCell>
                        <TableCell className={TD}>
                          {b.checks}
                          {b.warnings > 0 && (
                            <span className="ms-2">
                              <Badge size="sm" color="error">
                                {b.warnings} {tr("supplier.warnings").toLowerCase()}
                              </Badge>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={`${TD} pe-5`}>
                          <div className="flex justify-end gap-2">
                            {b.status === "recalled" ? (
                              <Badge size="sm" color="error">
                                {tr("supplier.recalled")}
                              </Badge>
                            ) : (
                              <>
                                <Button size="xs" variant="outline" startIcon={<Printer className="size-4" />} onClick={() => printLabel(b)}>
                                  {tr("supplier.label")}
                                </Button>
                                <Button size="xs" variant="danger" onClick={() => setRecalling(b)}>
                                  {tr("supplier.recall")}
                                </Button>
                              </>
                            )}
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

      <DemandCard orgId={orgId} report={r ?? null} />

      <Card accent="violet" icon={<PieChart className="size-5" />} title={tr("supplier.report")} description={tr("supplier.reportHint", { n: 30 })}>
        {report.loading ? (
          <LoadingState />
        ) : report.error || !r ? (
          <ErrorState message={report.error} onRetry={report.reload} />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">{tr("supplier.byReason")}</h4>
              <p className="text-theme-sm text-gray-600 dark:text-gray-300">
                {tr("supplier.checks")}: <b>{r.checks}</b> · {tr("supplier.warnings")}: <b>{r.warnings}</b>
              </p>
              <ul className="mt-2 space-y-1 text-theme-sm">
                {Object.entries(r.by_reason).map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-2 text-gray-700 dark:text-gray-300">
                    <span>{k === "ok" ? tr("trust.genuine") : tr(`trust.warning`) + ": " + shortReason(k)}</span>
                    <span className="font-medium">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">{tr("supplier.byWoreda")}</h4>
              {!r.by_woreda.length ? (
                <p className="text-theme-sm text-gray-500">—</p>
              ) : (
                <ul className="space-y-1 text-theme-sm">
                  {r.by_woreda.map((w) => (
                    <li key={w.pcode} className="flex justify-between gap-2 text-gray-700 dark:text-gray-300">
                      <span>{w.woreda}</span>
                      <span>
                        {w.checks}
                        {w.warnings > 0 && <span className="ms-1 font-medium text-error-600">({w.warnings} ⚠)</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">{tr("supplier.fakes")}</h4>
              {!r.fake_reports.length ? (
                <p className="text-theme-sm text-gray-500">{tr("supplier.noFakes")}</p>
              ) : (
                <ul className="space-y-2">
                  {r.fake_reports.map((f) => (
                    <li key={f.id} className="rounded-lg border border-gray-200 p-2.5 text-theme-sm dark:border-gray-800">
                      <p className="font-medium text-gray-800 dark:text-white/90">{f.product_name}</p>
                      <p className="text-theme-xs text-gray-500">
                        {[f.woreda, f.shop_text, formatDateTime(f.created_at)].filter(Boolean).join(" · ")}
                      </p>
                      {f.note && <p className="mt-1 text-gray-700 dark:text-gray-300">{f.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>

      {creating && (
        <BatchModal
          products={catalogue}
          orgId={orgId}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            batches.reload();
          }}
        />
      )}
      <ConfirmDialog
        isOpen={!!recalling}
        title={tr("supplier.recall")}
        message={recalling ? tr("supplier.recallConfirm", { batch: recalling.batch_number }) : undefined}
        confirmLabel={tr("supplier.recall")}
        destructive
        onConfirm={() =>
          recalling &&
          run(async () => {
            await api.supplierRecall(recalling.id, orgId);
            setRecalling(null);
          }, () => {
            batches.reload();
            report.reload();
          })
        }
        onClose={() => setRecalling(null)}
      />
    </div>
  );
}

function shortReason(k: string) {
  // The farmer-facing reason text is long; the first sentence is enough here.
  return tr(`trust.reason.${k}` as MessageKey).split(/(?<=[.።])\s/)[0];
}

function ProductLine({ p }: { p: RegistryProduct }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{p.product_name}</p>
      <p className="text-theme-xs text-gray-500">
        {[p.active_ingredient, p.registration_number].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}

function BatchModal({
  products,
  orgId,
  onClose,
  onDone,
}: {
  products: RegistryProduct[];
  orgId: number | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({ product_id: String(products[0]?.id ?? ""), batch_number: "", units: "", manufactured_on: "", expires_on: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError(null);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.supplierCreateBatch(
        {
          product_id: Number(form.product_id),
          batch_number: form.batch_number.trim(),
          units: Number(form.units),
          manufactured_on: form.manufactured_on || null,
          expires_on: form.expires_on || null,
        },
        orgId,
      );
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="m-4 max-w-xl p-6 sm:p-8">
      <h3 className="mb-5 pe-12 text-lg font-semibold text-gray-800 dark:text-white/90">{tr("supplier.newBatch")}</h3>
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <Alert variant="error" message={error} />}
        <div>
          <Label htmlFor="nb-product">{tr("trust.product")}</Label>
          <Select
            id="nb-product"
            options={products.map((p) => ({ value: String(p.id), label: p.product_name }))}
            value={form.product_id}
            onChange={(v) => set("product_id", v)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="nb-number">{tr("supplier.batchNumber")}</Label>
            <Input id="nb-number" value={form.batch_number} onChange={(e) => set("batch_number", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="nb-units">{tr("supplier.units")}</Label>
            <Input id="nb-units" type="number" min={1} value={form.units} onChange={(e) => set("units", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="nb-made">{tr("supplier.manufactured")}</Label>
            <Input id="nb-made" type="date" value={form.manufactured_on} onChange={(e) => set("manufactured_on", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="nb-exp">{tr("supplier.expires")}</Label>
            <Input id="nb-exp" type="date" value={form.expires_on} onChange={(e) => set("expires_on", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            {tr("common.cancel")}
          </Button>
          <Button type="submit" size="sm" loading={busy} disabled={!form.batch_number.trim() || !(Number(form.units) > 0)}>
            {tr("supplier.create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
