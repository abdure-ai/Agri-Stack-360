import { api } from "@/api/client";
import Card from "@/components/common/Card";
import { useAsync } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import type { DailyTip } from "@/types/api";
import { formatFullDate } from "@/utils/formatters";
import { Lightbulb } from "lucide-react";
import { Link } from "react-router";

/** One tip: title, text, its guideline sources, and a note when it is shown in English or is a draft translation. */
export function TipBody({ tip }: { tip: DailyTip }) {
  return (
    <div>
      <p className="font-semibold text-gray-800 dark:text-white/90">{tip.title}</p>
      <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-gray-700 dark:text-gray-300">{tip.body}</p>
      {tip.sources.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
          {tip.sources.map((s) => (
            <li key={s.ref}>
              [{s.ref}] {s.citation}
            </li>
          ))}
        </ul>
      )}
      {tip.language === "en" && <p className="mt-1 text-theme-xs italic text-gray-400">{tr("tips.englishOnly")}</p>}
    </div>
  );
}

/** Dashboard card: today's approved tips for the user's role and region (or the latest ones). */
export default function DailyTipCard() {
  const { lang } = useI18n();
  const tips = useAsync(() => api.tipsToday(lang), [lang]);
  if (!tips.data?.length) return null;
  const date = tips.data[0].tip_date;
  return (
    <Card
      className="mb-6"
      accent="amber"
      icon={<Lightbulb className="size-5" />}
      title={tr("tips.today")}
      description={date !== new Date().toISOString().slice(0, 10) ? tr("tips.from", { date: formatFullDate(date) }) : undefined}
      actions={
        <Link to="/tips" className="text-theme-sm font-medium text-brand-500 hover:text-brand-600">
          {tr("tips.all")}
        </Link>
      }
    >
      <div className="space-y-4">
        {tips.data.map((t) => (
          <TipBody key={t.id} tip={t} />
        ))}
      </div>
    </Card>
  );
}
