import { api } from "@/api/client";
import Card from "@/components/common/Card";
import { ErrorState, LoadingState } from "@/components/common/States";
import Switch from "@/components/form/switch/Switch";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import type { ConsentState } from "@/types/api";
import { formatDateTime } from "@/utils/formatters";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
import EraseRequestBox from "./EraseRequestBox";
import { useState } from "react";

/**
 * The farmer's own consent switches, their history and a "download my data" button
 * (Personal Data Protection Proclamation 1321/2024). Wording is a draft until legal review.
 */
export default function ConsentCard() {
  const consent = useAsync(() => api.getConsent(), []);
  const [state, setState] = useState<ConsentState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const current = state ?? consent.data;

  async function change(kind: "data" | "alerts" | "training", value: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      setState(await api.updateConsent({ [kind]: value }));
      setMessage({ ok: true, text: tr("consent.saved") });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err, "service.platform") });
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    try {
      const data = await api.myData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: "my-agri-stack-data.json" });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err, "service.platform") });
    }
  }

  return (
    <Card accent="violet" icon={<ShieldCheck className="size-5" />} title={tr("consent.title")} description={tr("consent.description")}>
      {consent.loading ? (
        <LoadingState />
      ) : consent.error || !current ? (
        <ErrorState message={consent.error} onRetry={consent.reload} />
      ) : (
        <div className="space-y-5">
          {(["data", "alerts", "training"] as const).map((kind) => (
            <div key={kind}>
              <Switch checked={current[kind]} disabled={busy} onChange={(v) => change(kind, v)} label={tr(`consent.${kind}`)} />
              <p className="mt-1 ms-14 text-theme-xs text-gray-500 dark:text-gray-400">{tr(`consent.${kind}Hint`)}</p>
            </div>
          ))}
          {message && <Alert variant={message.ok ? "success" : "error"} message={message.text} />}
          <p className="text-theme-xs italic text-gray-500 dark:text-gray-400">{tr("consent.legalDraft")}</p>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">{tr("consent.history")}</h4>
            {current.history.length === 0 ? (
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">{tr("consent.noHistory")}</p>
            ) : (
              <ul className="space-y-1 text-theme-sm text-gray-600 dark:text-gray-300">
                {current.history.slice(0, 10).map((h, i) => (
                  <li key={i}>
                    {formatDateTime(h.created_at)} · {tr(`consent.kind.${h.kind}`)}:{" "}
                    {h.granted ? tr("consent.granted") : tr("consent.withdrawn")}
                    {h.recorded_by && ` (${tr("consent.byOther", { name: h.recorded_by })})`}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button size="sm" variant="outline" startIcon={<Download className="size-4" />} onClick={download}>
              {tr("consent.download")}
            </Button>
            <span className="text-theme-xs text-gray-500 dark:text-gray-400">{tr("consent.downloadHint")}</span>
          </div>
          <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
              <Trash2 className="size-4" aria-hidden="true" />
              {tr("erase.title")}
            </h4>
            <EraseRequestBox />
          </div>
        </div>
      )}
    </Card>
  );
}
