import { api } from "@/api/client";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import type { ErasureRequest } from "@/types/api";
import { cn } from "@/utils";
import { roleLabel } from "@/utils/constants";
import { formatDateTime } from "@/utils/formatters";
import { UserX } from "lucide-react";
import { useState } from "react";

const STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;

/** Admin review of "delete my data" requests. Approving deletes / anonymises the person's data at once. */
export default function ErasureRequests() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
  const list = useAsync(() => api.adminErasureRequests(status), [status]);

  return (
    <>
      <PageMeta title={`${tr("nav.erasure")} | ${tr("app.name")}`} description={tr("erase.adminDescription")} />
      <PageHeader title={tr("nav.erasure")} description={tr("erase.adminDescription")} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={status === s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-theme-sm font-medium",
              status === s
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-white/5 dark:text-gray-300 dark:ring-gray-800",
            )}
          >
            {tr(`erase.status.${s}`)}
          </button>
        ))}
      </div>
      {list.loading ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data?.length ? (
        <Card>
          <EmptyState icon={<UserX className="size-6" />} title={tr("erase.none")} />
        </Card>
      ) : (
        <div className="space-y-4">
          {list.data.map((r) => (
            <RequestCard key={r.id} req={r} onChanged={list.reload} />
          ))}
        </div>
      )}
    </>
  );
}

function RequestCard({ req, onChanged }: { req: ErasureRequest; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setConfirming(false);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const summary = req.summary ? Object.entries(JSON.parse(req.summary) as Record<string, number>) : [];
  return (
    <Card
      title={req.name}
      description={[req.phone, req.role ? roleLabel(req.role) : null, req.woreda, formatDateTime(req.created_at)].filter(Boolean).join(" · ")}
    >
      {req.reason && <p className="mb-3 text-theme-sm text-gray-700 dark:text-gray-300">“{req.reason}”</p>}
      {req.status !== "pending" && (
        <p className="text-theme-sm text-gray-600 dark:text-gray-400">
          {tr(`erase.status.${req.status}`)} · {req.decided_by_name ?? ""} · {formatDateTime(req.decided_at)}
          {req.decision_note ? ` · ${req.decision_note}` : ""}
        </p>
      )}
      {summary.length > 0 && (
        <p className="mt-1 text-theme-xs text-gray-500">{summary.map(([k, v]) => `${k}: ${v}`).join(", ")}</p>
      )}
      {error && <Alert className="mt-3" variant="error" message={error} />}
      {req.status === "pending" && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input placeholder={tr("erase.note")} aria-label={tr("erase.note")} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => api.rejectErasure(req.id, note.trim()))}>
            {tr("erase.reject")}
          </Button>
          <Button size="sm" variant="danger" disabled={busy} onClick={() => setConfirming(true)}>
            {tr("erase.approve")}
          </Button>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirming}
        title={tr("erase.approve")}
        message={tr("erase.approveConfirm", { name: req.name ?? "" })}
        confirmLabel={tr("erase.approve")}
        destructive
        busy={busy}
        onConfirm={() => run(() => api.approveErasure(req.id, note.trim()))}
        onClose={() => setConfirming(false)}
      />
    </Card>
  );
}
