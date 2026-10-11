import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Input from "@/components/form/input/InputField";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import type { AuditEntry } from "@/types/api";
import { roleLabel } from "@/utils/constants";
import { formatDateTime } from "@/utils/formatters";
import { ScrollText } from "lucide-react";
import { useEffect, useState } from "react";

const TH = "px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400";
const TD = "px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300";
const PAGE = 100;

/** Audit log: admin changes and access to farmers' data (ids and routes only; no request contents). */
export default function AuditLog() {
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const first = useAsync(() => api.auditLog({ action: query || undefined, limit: PAGE }), [query]);
  // Pages loaded with "Load more", kept per filter so a new filter starts a fresh list.
  const [more, setMore] = useState<{ query: string; rows: AuditEntry[]; done: boolean }>({ query: "", rows: [], done: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const extra = more.query === query ? more : { rows: [], done: false };
  const rows = [...(first.data ?? []), ...extra.rows];

  useEffect(() => {
    const t = setTimeout(() => setQuery(filter.trim()), 400);
    return () => clearTimeout(t);
  }, [filter]);

  async function loadMore() {
    const last = rows[rows.length - 1];
    if (!last) return;
    setBusy(true);
    setError(null);
    try {
      const next = await api.auditLog({ action: query || undefined, before_id: last.id, limit: PAGE });
      setMore({ query, rows: [...extra.rows, ...next], done: next.length < PAGE });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageMeta title={`${tr("nav.auditLog")} | ${tr("app.name")}`} description={tr("audit.description")} />
      <PageHeader title={tr("nav.auditLog")} description={tr("audit.description")} />
      <Card
        accent="teal"
        icon={<ScrollText className="size-5" />}
        title={tr("nav.auditLog")}
        actions={
          <div className="w-64">
            <Input placeholder={tr("audit.filter")} aria-label={tr("audit.filter")} value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
        }
        bodyClassName="p-0"
      >
        {first.loading ? (
          <LoadingState />
        ) : first.error ? (
          <ErrorState message={first.error} onRetry={first.reload} />
        ) : !rows.length ? (
          <EmptyState title={tr("audit.none")} />
        ) : (
          <>
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    <TableCell isHeader className={`${TH} ps-5`}>{tr("audit.when")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("audit.who")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("audit.action")}</TableCell>
                    <TableCell isHeader className={TH}>{tr("audit.target")}</TableCell>
                    <TableCell isHeader className={`${TH} pe-5`}>{tr("audit.result")}</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className={`${TD} whitespace-nowrap ps-5`}>{formatDateTime(r.created_at)}</TableCell>
                      <TableCell className={TD}>
                        {r.actor_name ?? (r.actor_id ? `#${r.actor_id}` : tr("audit.unknownActor"))}
                        {r.actor_role && <span className="block text-theme-xs text-gray-400">{roleLabel(r.actor_role)}</span>}
                      </TableCell>
                      <TableCell className={`${TD} font-mono text-theme-xs`}>
                        {r.action === "farmer_data.read" ? <span className="font-sans text-theme-sm">{tr("audit.read")}</span> : r.action}
                      </TableCell>
                      <TableCell className={TD}>{r.target_id ? `${r.target_type ?? ""} ${r.target_id}`.trim() : "—"}</TableCell>
                      <TableCell className={`${TD} pe-5`}>
                        {r.status == null ? (
                          "—"
                        ) : (
                          <Badge size="sm" color={r.status < 300 ? "success" : r.status < 500 ? "warning" : "error"}>
                            {r.status}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {error && <p className="px-5 pt-3 text-theme-sm text-error-600">{error}</p>}
            {!extra.done && (first.data?.length ?? 0) >= PAGE && (
              <div className="flex justify-center p-4">
                <Button size="sm" variant="outline" loading={busy} onClick={loadMore}>
                  {tr("audit.loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
