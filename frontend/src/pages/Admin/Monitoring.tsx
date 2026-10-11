import { api } from "@/api/client";
import { AXIS_PROPS, GRID_PROPS, TOOLTIP_PROPS, Y_AXIS_PROPS } from "@/components/charts/chartTheme";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { ErrorState, LoadingState } from "@/components/common/States";
import Select from "@/components/form/Select";
import { useAsync } from "@/hooks/useAsync";
import { LANGUAGE_NAMES, isLang, tr, type MessageKey } from "@/i18n/core";
import type { MonitoringReport } from "@/types/api";
import { formatFullDate } from "@/utils/formatters";
import { Activity } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PERIODS = [7, 30, 90];
const pct = (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x * 100)}%`);

/** Aggregate advisory figures for admins: no names, phones or message text. */
export default function Monitoring() {
  const [days, setDays] = useState(30);
  const report = useAsync(() => api.monitoring(days), [days]);
  const m = report.data;

  return (
    <>
      <PageMeta title={`${tr("nav.monitoring")} | ${tr("app.name")}`} description={tr("monitor.description")} />
      <PageHeader
        title={tr("nav.monitoring")}
        description={tr("monitor.description")}
        actions={
          <div className="w-40">
            <Select
              aria-label={tr("monitor.days", { n: days })}
              options={PERIODS.map((n) => ({ value: String(n), label: tr("monitor.days", { n }) }))}
              value={String(days)}
              onChange={(v) => setDays(Number(v))}
            />
          </div>
        }
      />
      {report.loading ? (
        <LoadingState />
      ) : report.error || !m ? (
        <ErrorState message={report.error} onRetry={report.reload} />
      ) : (
        <Body m={m} />
      )}
    </>
  );
}

function Body({ m }: { m: MonitoringReport }) {
  const stats: { label: MessageKey; value: string; sub?: string }[] = [
    { label: "monitor.questions", value: String(m.questions.total) },
    { label: "monitor.escalationRate", value: pct(m.questions.escalation_rate), sub: String(m.questions.escalated) },
    { label: "monitor.diagnoses", value: String(m.diagnoses.total) },
    { label: "monitor.agreement", value: pct(m.diagnoses.verified_agreement), sub: String(m.diagnoses.verified) },
    {
      label: "monitor.resolveTime",
      value: m.escalations.median_hours_to_resolve == null ? "—" : tr("monitor.hours", { n: m.escalations.median_hours_to_resolve }),
    },
    {
      label: "monitor.consentData",
      value: pct(m.consent.farmers ? m.consent.data / m.consent.farmers : null),
      sub: tr("monitor.ofFarmers", { n: m.consent.data, total: m.consent.farmers }),
    },
  ];
  const langName = (code: string) => (isLang(code) ? LANGUAGE_NAMES[code] : code);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">{tr(s.label)}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{s.value}</p>
            {s.sub && <p className="text-theme-xs text-gray-400">{s.sub}</p>}
          </div>
        ))}
      </div>

      <Card accent="sky" icon={<Activity className="size-5" />} title={tr("monitor.perDay")}>
        <div className="-ms-2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={m.daily}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="day" {...AXIS_PROPS} tickFormatter={(d: string) => d.slice(5)} minTickGap={12} />
              <YAxis {...Y_AXIS_PROPS} allowDecimals={false} />
              <Tooltip {...TOOLTIP_PROPS} labelFormatter={(l) => formatFullDate(String(l))} />
              <Legend />
              <Bar dataKey="questions" name={tr("monitor.questions")} fill="#0ba5ec" isAnimationActive={false} />
              <Bar dataKey="diagnoses" name={tr("monitor.diagnoses")} fill="#1f8a57" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
        <Breakdown title="monitor.byLanguage" data={m.questions.by_language} name={langName} />
        <Breakdown
          title="monitor.confidence"
          data={m.questions.by_confidence}
          name={(k) => (["high", "medium", "low"].includes(k) ? tr(`confidence.${k}` as MessageKey) : k)}
        />
        <Breakdown title="monitor.feedback" data={m.questions.feedback} />
        <Breakdown title="monitor.flags" data={m.questions.guardrail_flags} />
        <Breakdown title="monitor.byDisease" data={m.diagnoses.by_disease} name={(k) => (k === "uncertain" ? tr("monitor.uncertain") : k)} />
        <Breakdown title="monitor.outcomes" data={m.diagnoses.outcomes} />
        <Breakdown title="monitor.escReasons" data={m.escalations.by_reason} name={(k) => tr(`da.esc.${k}` as MessageKey)} />
        <Breakdown title="monitor.alerts" data={m.alerts.by_type} />
      </div>
    </div>
  );
}

function Breakdown({ title, data, name = (k) => k }: { title: MessageKey; data: Record<string, number>; name?: (k: string) => string }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, v]) => v));
  return (
    <Card title={tr(title)}>
      {!rows.length ? (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">{tr("monitor.none")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(([k, v]) => (
            <li key={k}>
              <div className="flex justify-between text-theme-sm text-gray-700 dark:text-gray-300">
                <span className="truncate">{name(k)}</span>
                <span className="font-medium">{v}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-white/5">
                <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(v / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
