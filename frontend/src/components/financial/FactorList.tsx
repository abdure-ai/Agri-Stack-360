import Badge from "@/components/ui/badge/Badge";
import { tr, trTerm, type MessageKey } from "@/i18n/core";
import type { ScoreFactor } from "@/types/api";

const FACTOR_CODES = ["farm_records", "region", "zone", "critical_reports", "moderate_reports", "track_record", "farm_scale", "smallholder"];

/** Factor name in the interface language (older servers send only the English label). */
function factorLabel(f: ScoreFactor): string {
  return f.code && FACTOR_CODES.includes(f.code) ? tr(`fin.factor.${f.code}` as MessageKey) : f.label;
}

function factorDetail(f: ScoreFactor): string {
  if (!f.code || !FACTOR_CODES.includes(f.code)) return f.detail ?? "";
  const value = f.code === "region" ? trTerm("region", String(f.value ?? "")) : f.value;
  return tr(`fin.factor.${f.code}.detail` as MessageKey, { value });
}

/** Credit score factors (helping or holding back), shared by the farmer and lender screens. */
export default function FactorList({ title, factors, positive }: { title: string; factors: ScoreFactor[]; positive?: boolean }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">{title}</h4>
      {!factors.length ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{tr(positive ? "fin.nothingYet" : "fin.nothingWellDone")}</p>
      ) : (
        <ul className="space-y-3">
          {factors.map((f) => (
            <li key={f.label} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-gray-800 dark:text-white/90">{factorLabel(f)}</p>
                {f.detail && <p className="text-theme-xs text-gray-500 dark:text-gray-400">{factorDetail(f)}</p>}
              </div>
              <Badge size="sm" color={positive ? "success" : "error"}>
                {f.points}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
