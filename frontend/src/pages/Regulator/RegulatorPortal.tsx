import { api } from "@/api/client";
import DotMap, { type MapDot } from "@/components/charts/DotMap";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/common/States";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Tabs from "@/components/ui/tabs/Tabs";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import {
  Download,
  FileUp,
  Landmark,
  MapPinned,
  ScrollText,
} from "lucide-react";
import { useState } from "react";

type Tab = "registry" | "counterfeits" | "issuance";
const TH =
  "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const TD = "px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300";
const STATUS_COLOR = {
  registered: "success",
  banned: "error",
  expired: "warning",
} as const;

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(url);
}

/** Regulator (EAA): registered products (import the official list), national counterfeit map, code issuance. */
export default function RegulatorPortal() {
  const [tab, setTab] = useState<Tab>("registry");
  return (
    <>
      <PageMeta
        title={`${tr("nav.regulator")} | ${tr("app.name")}`}
        description={tr("regulator.description")}
      />
      <PageHeader
        title={tr("nav.regulator")}
        description={tr("regulator.description")}
      />
      <Tabs
        variant="underline"
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "registry", label: tr("regulator.tab.registry") },
          { id: "counterfeits", label: tr("regulator.tab.counterfeits") },
          { id: "issuance", label: tr("regulator.tab.issuance") },
        ]}
      />
      {tab === "registry" && <Registry />}
      {tab === "counterfeits" && <Counterfeits />}
      {tab === "issuance" && <Issuance />}
    </>
  );
}

function Registry() {
  const reg = useAsync(() => api.regulatorRegistry(), []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    try {
      const r = await api.regulatorImport(file);
      setMsg({
        ok: true,
        text: tr("review.uploaded", { n: r.loaded, p: r.placeholders }),
      });
      reg.reload();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  }

  return (
    <Card
      accent="teal"
      icon={<Landmark className="size-5" />}
      title={tr("regulator.tab.registry")}
      description={tr("regulator.registryHint")}
      actions={
        <span className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            startIcon={<Download className="size-4" />}
            onClick={async () =>
              saveBlob(
                await api.regulatorRegistryCsv(),
                "approved_products.csv",
              )
            }
          >
            {tr("review.download")}
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">
            <FileUp className="size-4" aria-hidden="true" />
            {tr("regulator.import")}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
        </span>
      }
      bodyClassName="p-0"
    >
      {msg && (
        <Alert
          className="m-4"
          variant={msg.ok ? "success" : "error"}
          message={msg.text}
        />
      )}
      {reg.loading ? (
        <LoadingState />
      ) : reg.error || !reg.data ? (
        <ErrorState message={reg.error} onRetry={reg.reload} />
      ) : (
        <>
          <p className="px-5 pt-4 text-theme-sm text-gray-600 dark:text-gray-300">
            {tr("regulator.summary", {
              total: reg.data.summary.total,
              registered: reg.data.summary.registered,
              banned: reg.data.summary.banned,
              placeholder: reg.data.summary.placeholder,
            })}
          </p>
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className={`${TH} ps-5`}>
                    {tr("trust.product")}
                  </TableCell>
                  <TableCell isHeader className={TH}>
                    {tr("trust.ingredient")}
                  </TableCell>
                  <TableCell isHeader className={TH}>
                    {tr("trust.registration")}
                  </TableCell>
                  <TableCell isHeader className={`${TH} pe-5`}>
                    {tr("estate.statusLabel")}
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {reg.data.products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className={`${TD} ps-5`}>
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {p.product_name}
                      </span>
                      <span className="block text-theme-xs text-gray-400">
                        {[p.formulation, p.category]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </TableCell>
                    <TableCell className={TD}>{p.active_ingredient}</TableCell>
                    <TableCell className={TD}>
                      {p.registration_number ?? "—"}
                    </TableCell>
                    <TableCell className={`${TD} pe-5`}>
                      <Badge
                        size="sm"
                        color={
                          STATUS_COLOR[
                            (p.status ??
                              "registered") as keyof typeof STATUS_COLOR
                          ] ?? "light"
                        }
                      >
                        {tr(`regulator.status.${p.status}` as MessageKey)}
                      </Badge>{" "}
                      {p.verification_status !== "verified" && (
                        <Badge size="sm" color="light">
                          {tr("regulator.notVerified")}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </Card>
  );
}

function Counterfeits() {
  const data = useAsync(() => api.regulatorCounterfeits(90), []);
  if (data.loading) return <LoadingState />;
  if (data.error || !data.data)
    return <ErrorState message={data.error} onRetry={data.reload} />;
  const d = data.data;
  const dots: MapDot[] = d.woredas
    .filter((w) => w.latitude != null && w.longitude != null)
    .map((w) => {
      const n = w.warnings + w.fake_reports;
      return {
        key: w.pcode,
        latitude: w.latitude!,
        longitude: w.longitude!,
        size: n >= 10 ? "high" : n >= 5 ? "medium" : "low",
        group: "warnings",
        groupLabel: tr("regulator.warningsLegend"),
        title: `${w.woreda}: ${w.warnings} / ${w.fake_reports}`,
      };
    });
  return (
    <Card
      accent="rose"
      icon={<MapPinned className="size-5" />}
      title={tr("regulator.tab.counterfeits")}
      description={tr("regulator.counterfeitsHint", {
        n: d.days,
        warnings: d.totals.warnings,
        fakes: d.totals.fake_reports,
      })}
    >
      {!d.woredas.length ? (
        <EmptyState title={tr("regulator.noCounterfeits")} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          <DotMap dots={dots} label={tr("regulator.tab.counterfeits")} />
          <ul className="space-y-2">
            {d.woredas.map((w) => (
              <li
                key={w.pcode}
                className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
              >
                <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {w.woreda}{" "}
                  <span className="font-normal text-gray-500">· {w.zone}</span>
                </p>
                <p className="text-theme-xs text-gray-600 dark:text-gray-400">
                  {Object.entries(w.by_reason)
                    .map(
                      ([k, v]) =>
                        `${tr(`trust.reason.${k}` as MessageKey).split(/(?<=[.።])\s/)[0]} ${v}`,
                    )
                    .join(" · ")}
                  {w.fake_reports
                    ? ` · ${tr("regulator.fakeReports")} ${w.fake_reports}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Issuance() {
  const data = useAsync(() => api.regulatorIssuance(), []);
  return (
    <Card
      accent="violet"
      icon={<ScrollText className="size-5" />}
      title={tr("regulator.tab.issuance")}
      description={tr("regulator.issuanceHint")}
      bodyClassName="p-0"
    >
      {data.loading ? (
        <LoadingState />
      ) : !data.data?.length ? (
        <EmptyState title={tr("orgs.none")} />
      ) : (
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell isHeader className={`${TH} ps-5`}>
                  {tr("trust.supplier")}
                </TableCell>
                <TableCell isHeader className={TH}>
                  {tr("dealer.products")}
                </TableCell>
                <TableCell isHeader className={TH}>
                  {tr("supplier.batches")}
                </TableCell>
                <TableCell isHeader className={TH}>
                  {tr("supplier.units")}
                </TableCell>
                <TableCell isHeader className={TH}>
                  {tr("supplier.checks")}
                </TableCell>
                <TableCell isHeader className={TH}>
                  {tr("supplier.warnings")}
                </TableCell>
                <TableCell isHeader className={`${TH} pe-5`}>
                  {tr("supplier.recalled")}
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.data.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className={`${TD} ps-5`}>
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {o.name}
                    </span>
                    {o.status !== "active" && (
                      <Badge size="sm" color="error">
                        {tr("orgs.suspended")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className={TD}>{o.products}</TableCell>
                  <TableCell className={TD}>{o.batches}</TableCell>
                  <TableCell className={TD}>{o.units}</TableCell>
                  <TableCell className={TD}>{o.checks}</TableCell>
                  <TableCell className={TD}>{o.warnings}</TableCell>
                  <TableCell className={`${TD} pe-5`}>
                    {o.recalled ?? 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
