import { api } from "@/api/client";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import { formatDateTime } from "@/utils/formatters";
import { useState } from "react";

/** "Delete my data": request (an administrator reviews it), see its status, cancel while pending. */
export default function EraseRequestBox() {
  const current = useAsync(() => api.myErasureRequest(), []);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const req = current.data;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setConfirming(false);
      current.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (current.loading) return null;
  return (
    <div className="space-y-3">
      <p className="text-theme-sm text-gray-600 dark:text-gray-300">{tr("erase.hint")}</p>
      {req?.status === "pending" ? (
        <Alert variant="warning" title={tr("erase.pending")} message={tr("erase.since", { date: formatDateTime(req.created_at) })}>
          <div className="mt-2">
            <Button size="xs" variant="outline" disabled={busy} onClick={() => run(() => api.cancelErasure())}>
              {tr("erase.cancel")}
            </Button>
          </div>
        </Alert>
      ) : (
        <>
          {req?.status === "rejected" && (
            <Alert variant="info" message={tr("erase.rejected", { note: req.decision_note || "—" })} />
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input placeholder={tr("erase.reason")} aria-label={tr("erase.reason")} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <Button size="sm" variant="danger" onClick={() => setConfirming(true)}>
              {tr("erase.request")}
            </Button>
          </div>
        </>
      )}
      {error && <Alert variant="error" message={error} />}
      <p className="text-theme-xs italic text-gray-500 dark:text-gray-400">{tr("erase.legalDraft")}</p>
      <ConfirmDialog
        isOpen={confirming}
        title={tr("erase.request")}
        message={tr("erase.confirm")}
        confirmLabel={tr("erase.request")}
        destructive
        busy={busy}
        onConfirm={() => run(() => api.requestErasure(reason.trim()))}
        onClose={() => setConfirming(false)}
      />
    </div>
  );
}
