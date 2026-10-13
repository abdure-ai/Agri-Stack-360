// ABC portfolio (A10): ATI programme officers see every ABC, government users the ABCs in their area. Aggregates only:
// no member names; small counts are shown as "<5". Compliance alerts follow the ABC rules.
import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { useAsync } from "@/hooks/useAsync";
import { tr, type MessageKey } from "@/i18n/core";
import { formatETB, formatFullDate } from "@/utils/formatters";
import { Download, Map as MapIcon } from "lucide-react";
import { Link } from "react-router";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

export default function AbcPortfolio() {
  const data = useAsync(() => api.abcPortfolio(), []);
  const d = data.data;
  return (
    <>
      <PageMeta title={`${tr("nav.abcPortfolio")} | ${tr("app.name")}`} description={tr("pf.description")} />
      <PageHeader title={tr("nav.abcPortfolio")} description={tr("pf.description")}
        actions={
          <span className="flex gap-2">
            <Link to="/map" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
              <MapIcon className="size-4" /> {tr("nav.map")}
            </Link>
            <Button size="sm" variant="outline" startIcon={<Download className="size-4" />}
              onClick={async () => saveBlob(await api.abcPortfolioCsv(), "abc-portfolio.csv")}>{tr("pf.export")}</Button>
          </span>
        } />
      {data.loading ? <LoadingState /> : data.error || !d ? <ErrorState message={data.error} onRetry={data.reload} /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {([["pf.abcs", String(d.totals.abcs)], ["pf.registered", String(d.totals.by_status.registered ?? 0)],
              ["pf.members", String(d.totals.members)], ["pf.capitalPaid", formatETB(d.totals.capital_paid_etb)],
              ["pf.withAlerts", String(d.totals.with_alerts)]] as [MessageKey, string][]).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03]">
                <p className="text-theme-xs text-gray-500">{tr(k)}</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-white/90">{v}</p>
              </div>
            ))}
          </div>
          <Card title={tr("pf.list")} description={tr("pf.listHint")}>
            {d.abcs.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-theme-xs text-gray-500 dark:border-gray-800">
                      {(["pf.col.abc", "pf.col.status", "pf.col.members", "pf.col.inclusion", "pf.col.capital", "pf.col.machinery", "pf.col.alerts"] as MessageKey[])
                        .map((k) => <th key={k} className="px-2 py-2 text-start font-medium">{tr(k)}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {d.abcs.map((r) => (
                      <tr key={r.org_id} className="align-top text-gray-700 dark:text-gray-300">
                        <td className="px-2 py-2">
                          <div className="font-medium text-gray-800 dark:text-white/90">{r.name}</div>
                          <div className="text-theme-xs text-gray-500">{[r.woreda, r.zone, r.region].filter(Boolean).join(", ")} · {tr(`abc.type.${r.abc_type}` as MessageKey)}</div>
                        </td>
                        <td className="px-2 py-2"><Badge size="sm" color={r.status === "registered" ? "success" : "warning"}>{tr(`abc.status.${r.status}` as MessageKey)}</Badge></td>
                        <td className="whitespace-nowrap px-2 py-2">{tr("pf.membersOf", { n: r.members, min: r.members_min })}</td>
                        <td className="whitespace-nowrap px-2 py-2 text-theme-xs">
                          {r.women_percent != null ? tr("pf.inclusion", { women: r.women_percent, youth: r.youth_percent ?? 0 }) : tr("pf.notRecorded")}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-theme-xs">
                          {tr("pf.capital", { paid: formatETB(r.capital_paid_etb), pledged: formatETB(r.capital_pledged_etb) })}
                          {r.subscribed_percent != null && <div>{tr("pf.subscribed", { pct: r.subscribed_percent })}</div>}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-theme-xs">
                          {r.machines ? tr("pf.machinery", { n: r.machines, ha: r.machine_hectares_30d, pct: r.machine_utilisation_percent ?? 0 }) : "—"}
                          {r.last_general_assembly && <div>{tr("pf.lastGA", { date: formatFullDate(r.last_general_assembly) })}</div>}
                        </td>
                        <td className="px-2 py-2">
                          <span className="flex flex-wrap gap-1">
                            {r.alerts.length ? r.alerts.map((a) => <Badge key={a} size="sm" color="warning">{tr(`pf.alert.${a}` as MessageKey)}</Badge>)
                              : <Badge size="sm" color="success">{tr("pf.noAlerts")}</Badge>}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState title={tr("pf.none")} />}
            <p className="mt-3 text-theme-xs text-gray-500">{d.official_record_note}</p>
          </Card>
        </div>
      )}
    </>
  );
}
