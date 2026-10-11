import { api } from "@/api/client";
import ListenButton from "@/components/advisory/ListenButton";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { errorMessage, useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import type { DaDisease, DaEscalation, EscalationStatus } from "@/types/api";
import { cn } from "@/utils";
import { formatDateTime } from "@/utils/formatters";
import { Inbox, Phone } from "lucide-react";
import { useState } from "react";

const STATUSES: EscalationStatus[] = ["open", "forwarded", "answered", "closed"];

/** Escalation inbox: answer the farmer, verify a photo check, forward or close. */
export default function Escalations() {
  const { lang } = useI18n();
  const [status, setStatus] = useState<EscalationStatus>("open");
  const list = useAsync(() => api.daEscalations(status, lang), [status, lang]);
  const diseases = useAsync(() => api.daDiseases(lang), [lang]);

  return (
    <>
      <PageMeta title={`${tr("nav.daInbox")} | ${tr("app.name")}`} description={tr("da.inboxDescription")} />
      <PageHeader title={tr("nav.daInbox")} description={tr("da.inboxDescription")} />

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
            {tr(`da.status.${s}`)}
          </button>
        ))}
      </div>

      {list.loading ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data?.length ? (
        <Card>
          <EmptyState icon={<Inbox className="size-6" />} title={tr("da.noEscalations")} />
        </Card>
      ) : (
        <div className="space-y-4">
          {list.data.map((e) => (
            <EscalationCard key={e.id} item={e} diseases={diseases.data ?? []} onChanged={list.reload} />
          ))}
        </div>
      )}
    </>
  );
}

function EscalationCard({ item, diseases, onChanged }: { item: DaEscalation; diseases: DaDisease[]; onChanged: () => void }) {
  const { lang } = useI18n();
  const [text, setText] = useState("");
  const [verifyKey, setVerifyKey] = useState(item.verified_disease ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedNote, setVerifiedNote] = useState<string | null>(null);
  const actionable = item.status === "open" || item.status === "forwarded";

  async function run(action: () => Promise<unknown>, reload = true) {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (reload) onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-gray-800 dark:text-white/90">{item.farmer_name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-theme-xs text-gray-500 dark:text-gray-400">
            {item.farmer_woreda && <span>{item.farmer_woreda}</span>}
            <a href={`tel:${item.farmer_phone}`} className="inline-flex items-center gap-1 hover:text-brand-600">
              <Phone className="size-3" aria-hidden="true" />
              {item.farmer_phone}
            </a>
            <span>{formatDateTime(item.created_at)}</span>
          </p>
        </div>
        <Badge size="sm" color={item.reason === "advice_failed" ? "error" : item.reason === "low_confidence" ? "warning" : "info"}>
          {tr(`da.esc.${item.reason}`)}
        </Badge>
      </div>

      <div className="mt-4 space-y-3 text-theme-sm text-gray-700 dark:text-gray-300">
        {item.question && (
          <div>
            <p className="text-theme-xs font-medium uppercase text-gray-500">{tr("da.question")}</p>
            <p>{item.question}</p>
          </div>
        )}
        {item.answer && (
          <div>
            <p className="text-theme-xs font-medium uppercase text-gray-500">{tr("da.aiAnswer")}</p>
            <p className="whitespace-pre-line text-gray-600 dark:text-gray-400">{item.answer}</p>
          </div>
        )}
        {item.diagnosis_id && (
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
            <p>
              {tr("da.diagnosis", {
                disease: item.disease_name ?? "—",
                pct: item.confidence != null ? Math.round(item.confidence * 100) : "—",
              })}
            </p>
            {(verifiedNote || item.verified_disease_name) && (
              <p className="mt-1 font-medium text-success-600 dark:text-success-500">
                {tr("da.verified", { disease: verifiedNote ?? item.verified_disease_name })}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="w-64">
                <Label>{tr("da.verifyLabel")}</Label>
                <Select
                  options={diseases.map((d) => ({ value: d.key, label: d.name }))}
                  placeholder="—"
                  value={verifyKey}
                  onChange={setVerifyKey}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!verifyKey || busy}
                onClick={() =>
                  run(async () => {
                    await api.daVerify(item.diagnosis_id!, verifyKey);
                    setVerifiedNote(diseases.find((d) => d.key === verifyKey)?.name ?? verifyKey);
                  }, false)
                }
              >
                {tr("da.verify")}
              </Button>
            </div>
          </div>
        )}
        {item.resolution && (
          <div>
            <p className="text-theme-xs font-medium uppercase text-gray-500">{tr("da.resolution")}</p>
            <div className="flex items-start gap-2">
              <p className="flex-1 whitespace-pre-line">{item.resolution}</p>
              <ListenButton text={item.resolution} language={lang} compact />
            </div>
          </div>
        )}
      </div>

      {error && <Alert className="mt-4" variant="error" message={error} />}

      {actionable && (
        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Label>{tr("da.answerLabel")}</Label>
          <TextArea rows={3} value={text} onChange={setText} placeholder="" hint={tr("da.answerHint")} disabled={busy} />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => api.daClose(item.id, text.trim()))}>
              {tr("da.close")}
            </Button>
            {item.status === "open" && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => api.daForward(item.id, text.trim()))}>
                {tr("da.forward")}
              </Button>
            )}
            <Button size="sm" loading={busy} disabled={text.trim().length < 2} onClick={() => run(() => api.daAnswer(item.id, text.trim()))}>
              {tr("da.send")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
