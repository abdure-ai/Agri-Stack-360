import { api } from "@/api/client";
import Card from "@/components/common/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import Badge from "@/components/ui/badge/Badge";
import { useAsync } from "@/hooks/useAsync";
import { tr, trTerm } from "@/i18n/core";
import type { CropCalendar } from "@/types/api";
import { cn } from "@/utils";
import { CalendarDays } from "lucide-react";
import { Link } from "react-router";

/** Dashboard card: each growing crop's stage, this stage's tasks (from the MoA manuals) and what comes next. */
export default function CropCalendarCard() {
  const calendar = useAsync(() => api.cropCalendar(), []);

  return (
    <Card accent="green" icon={<CalendarDays className="size-5" />} title={tr("calendar.title")} description={tr("calendar.description")}>
      {calendar.loading ? (
        <LoadingState />
      ) : calendar.error ? (
        <ErrorState message={calendar.error} onRetry={calendar.reload} />
      ) : !calendar.data?.length ? (
        <EmptyState
          title={tr("calendar.empty")}
          action={
            <Link to="/profile" className="text-theme-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              {tr("calendar.addSeason")} →
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {calendar.data.map((c) => (
            <SeasonView key={c.season_id} cal={c} />
          ))}
        </div>
      )}
    </Card>
  );
}

function stageLabel(key: string | undefined | null, fallback: string | null | undefined) {
  const label = trTerm("stage", key);
  return label && label !== key ? label : fallback || key || "";
}

function SeasonView({ cal }: { cal: CropCalendar }) {
  const current = cal.current_stage;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-semibold text-gray-800 dark:text-white/90">
          {trTerm("crop", cal.crop)}
          {cal.field_name && <span className="font-normal text-gray-500"> · {cal.field_name}</span>}
        </h4>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {trTerm("season", cal.season)} · {tr("calendar.planted", { date: cal.planting_date_display })} ·{" "}
          {tr("calendar.day", { n: cal.days_after_planting })}
        </p>
      </div>

      {!cal.calendar_known ? (
        <p className="mt-3 text-theme-sm text-gray-500 dark:text-gray-400">{tr("calendar.unknown")}</p>
      ) : (
        <>
          <ol className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6" aria-label={tr("calendar.title")}>
            {cal.stages.map((s) => (
              <li
                key={s.stage_key}
                aria-current={s.status === "current" ? "step" : undefined}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-theme-xs",
                  s.status === "current"
                    ? "border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300"
                    : s.status === "past"
                      ? "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-white/[0.02]"
                      : "border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400",
                )}
              >
                <span className="block font-medium">{stageLabel(s.stage_key, s.stage_name)}</span>
                <span className="block">{s.start_display}</span>
                {s.status === "current" && <span className="mt-0.5 block font-semibold">{tr("calendar.now")}</span>}
              </li>
            ))}
          </ol>

          {current?.stage_key === "past_last_stage" ? (
            <p className="mt-3 text-theme-sm text-gray-600 dark:text-gray-300">{tr("calendar.pastLast")}</p>
          ) : (
            current && (
              <div className="mt-4">
                <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  {tr("calendar.tasks")}: {stageLabel(current.stage_key, current.stage_name)}
                </h5>
                <ul className="mt-2 space-y-2">
                  {current.tasks.map((task, i) => (
                    <li key={i} className="text-theme-sm text-gray-700 dark:text-gray-300">
                      <span className="me-1.5 text-brand-500" aria-hidden="true">✓</span>
                      {task.text}
                      {task.source && (
                        <span className="ms-1 text-theme-xs text-gray-400">({tr("calendar.source", { source: task.source })})</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-theme-xs italic text-gray-500 dark:text-gray-400">{tr("calendar.tasksNote")}</p>
              </div>
            )
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {cal.next_stage && (
              <span className="text-theme-sm text-gray-700 dark:text-gray-300">
                {tr("calendar.next", { stage: stageLabel(cal.next_stage.stage_key, cal.next_stage.stage_name), n: cal.next_stage.in_days })}
              </span>
            )}
            {cal.timing_estimated && (
              <Badge size="sm" color="warning">
                {tr("calendar.estimated")}
              </Badge>
            )}
          </div>
        </>
      )}
    </div>
  );
}
