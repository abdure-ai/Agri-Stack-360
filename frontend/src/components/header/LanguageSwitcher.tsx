import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { LANGUAGE_NAMES, LANGUAGES } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/utils";
import { Check, Languages } from "lucide-react";
import { useState } from "react";

/** Interface language menu. Signed-in users keep the choice in their profile. */
export default function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("lang.choose")}
        className="dropdown-toggle flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 text-theme-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        <Languages className="size-5 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">{LANGUAGE_NAMES[lang]}</span>
      </button>
      <Dropdown
        isOpen={open}
        onClose={() => setOpen(false)}
        className="absolute inset-e-0 mt-2 w-48 rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <p className="px-3 pt-1 pb-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400">{t("lang.label")}</p>
        <ul role="menu">
          {LANGUAGES.map((code) => (
            <li key={code}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={lang === code}
                lang={code}
                onClick={() => {
                  setOpen(false);
                  setLang(code);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-theme-sm transition",
                  lang === code
                    ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-400"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
                )}
              >
                {LANGUAGE_NAMES[code]}
                {lang === code && <Check className="size-4" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </Dropdown>
    </div>
  );
}
