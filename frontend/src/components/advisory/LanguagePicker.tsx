import { LANGUAGE_NAMES, tr } from "@/i18n/core";
import type { AdvisoryLanguage } from "@/types/api";
import { cn } from "@/utils";

// Order shown in the picker.
const ORDER: AdvisoryLanguage[] = ["am", "om", "ti", "en"];

/** Language of advisory answers and plans. `null` means "detect from what I type". */
export function LanguagePicker({
  value,
  onChange,
  allowAuto = true,
  disabled,
}: {
  value: AdvisoryLanguage | null;
  onChange: (v: AdvisoryLanguage | null) => void;
  allowAuto?: boolean;
  disabled?: boolean;
}) {
  const options: [AdvisoryLanguage | null, string][] = [
    ...(allowAuto ? ([[null, tr("advisor.auto")]] as [null, string][]) : []),
    ...ORDER.map((code) => [code, LANGUAGE_NAMES[code]] as [AdvisoryLanguage, string]),
  ];
  return (
    <div role="radiogroup" aria-label={tr("advisor.answerLanguage")} className="inline-flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900">
      {options.map(([code, label]) => (
        <button
          key={code ?? "auto"}
          type="button"
          role="radio"
          aria-checked={value === code}
          disabled={disabled}
          onClick={() => onChange(code)}
          className={cn(
            "rounded-md px-3 py-1.5 text-theme-sm font-medium transition disabled:opacity-50",
            value === code
              ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
