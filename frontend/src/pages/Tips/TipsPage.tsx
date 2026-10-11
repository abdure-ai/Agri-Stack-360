import { api } from "@/api/client";
import { TipBody } from "@/components/advisory/DailyTipCard";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import type { DailyTip } from "@/types/api";
import { formatFullDate } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";
import { Lightbulb } from "lucide-react";
import { Link } from "react-router";

/** Approved daily tips of the last 30 days, grouped by date. */
export default function TipsPage() {
  const { lang } = useI18n();
  const { can } = useAuth();
  const tips = useAsync(() => api.tips(30, lang), [lang]);
  const byDate = new Map<string, DailyTip[]>();
  for (const t of tips.data ?? []) byDate.set(t.tip_date, [...(byDate.get(t.tip_date) ?? []), t]);

  return (
    <>
      <PageMeta title={`${tr("nav.tips")} | ${tr("app.name")}`} description={tr("tips.description")} />
      <PageHeader title={tr("nav.tips")} description={tr("tips.description")} />
      {tips.loading ? (
        <LoadingState />
      ) : tips.error ? (
        <ErrorState message={tips.error} onRetry={tips.reload} />
      ) : !byDate.size ? (
        <Card>
          <EmptyState title={tr("tips.none")} />
          {can("content:review") && (
            <p className="mt-2 text-center">
              <Link to="/admin/tips" className="text-theme-sm font-medium text-brand-500 hover:text-brand-600">
                {tr("tips.manage")}
              </Link>
            </p>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {[...byDate.entries()].map(([date, items]) => (
            <Card key={date} accent="amber" icon={<Lightbulb className="size-5" />} title={formatFullDate(date)}>
              <div className="space-y-4">
                {items.map((t) => (
                  <TipBody key={t.id} tip={t} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
