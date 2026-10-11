import { tr } from "@/i18n/core";
import { Lightbulb } from "lucide-react";
import type { Insight } from "@/utils/insights";

/** Plain-language "what this means" box shown under a chart. */
export default function InsightPanel({ insight, title = tr("insight.title") }: { insight: Insight | null; title?: string }) {
  if (!insight) return null;
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-25 p-4 sm:p-5 dark:border-brand-500/20 dark:bg-brand-500/5">
      <div className="mb-2 flex items-center gap-2 text-theme-xs font-semibold tracking-wide text-brand-600 uppercase dark:text-brand-400">
        <Lightbulb className="size-4" aria-hidden="true" />
        {title}
      </div>
      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{insight.headline}</p>
      <ul className="mt-3 space-y-2">
        {insight.bullets.map((b) => (
          <li key={b} className="flex gap-2.5 text-sm text-gray-600 dark:text-gray-400">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
