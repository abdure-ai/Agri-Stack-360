import { api } from "@/api/client";
import ListenButton from "@/components/advisory/ListenButton";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import { OutcomeButtons } from "@/pages/CropHealth/PhotoDiagnosis";
import type { AdvisoryAlert, AdvisoryLanguage } from "@/types/api";
import { cn } from "@/utils";
import { formatDateTime } from "@/utils/formatters";
import { BellRing, CalendarDays, ClipboardCheck, CloudRain, UserCheck, X } from "lucide-react";
import { Link } from "react-router";

const UNREAD = new Set(["queued", "sent", "delivered"]);

function AlertRow({ alert, lang, onRead }: { alert: AdvisoryAlert; lang: string; onRead: () => void }) {
  const outbreak = alert.type === "neighborhood_disease";
  const warning = outbreak || alert.type === "spray_rain_warning";
  const diagnosisId = typeof alert.payload.diagnosis_id === "number" ? alert.payload.diagnosis_id : null;
  return (
    <li
      className={cn(
        "flex gap-3 rounded-xl border p-4",
        warning
          ? "border-warning-200 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/10"
          : "border-blue-light-200 bg-blue-light-50 dark:border-blue-light-500/30 dark:bg-blue-light-500/10",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          warning
            ? "bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-orange-400"
            : "bg-blue-light-100 text-blue-light-700 dark:bg-blue-light-500/20 dark:text-blue-light-400",
        )}
        aria-hidden="true"
      >
        {outbreak ? (
          <BellRing className="size-5" />
        ) : alert.type === "spray_rain_warning" ? (
          <CloudRain className="size-5" />
        ) : alert.type === "stage_reminder" ? (
          <CalendarDays className="size-5" />
        ) : alert.type === "da_answer" ? (
          <UserCheck className="size-5" />
        ) : (
          <ClipboardCheck className="size-5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="flex-1 text-sm text-gray-800 dark:text-white/90">{alert.message}</p>
          <ListenButton text={alert.message} language={lang} compact />
        </div>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">{formatDateTime(alert.created_at)}</p>
        <div className="mt-2">
          {outbreak ? (
            <Link to="/crop-health" className="text-theme-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              {tr("alerts.checkWithPhoto")} →
            </Link>
          ) : (
            diagnosisId && <OutcomeButtons diagnosisId={diagnosisId} />
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onRead}
        className="h-fit rounded-md p-1 text-gray-400 hover:bg-white/60 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-gray-200"
        aria-label={tr("alerts.dismiss")}
      >
        <X className="size-4" />
      </button>
    </li>
  );
}

/** Unread outbreak warnings and follow-up questions; renders nothing when there are none. */
export default function AlertsPanel() {
  const { user } = useAuth();
  const lang: AdvisoryLanguage | null =
    user?.language === "am" || user?.language === "om" || user?.language === "en" || user?.language === "ti"
      ? user.language
      : null;
  const alerts = useAsync(() => api.advisoryAlerts(lang), [lang]);
  const unread = (alerts.data ?? []).filter((a) => UNREAD.has(a.status));
  if (!unread.length) return null;

  async function markRead(id: number) {
    alerts.setData((list) => list?.map((a) => (a.id === id ? { ...a, status: "read" } : a)) ?? null);
    try {
      await api.markAlertRead(id);
    } catch {
      alerts.reload();
    }
  }

  return (
    <section aria-label={tr("alerts.label")} className="mb-6">
      <ul className="space-y-3">
        {unread.map((a) => (
          <AlertRow key={a.id} alert={a} lang={lang ?? "en"} onRead={() => markRead(a.id)} />
        ))}
      </ul>
    </section>
  );
}
