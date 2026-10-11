// i18n/core.ts — current language, dictionaries and tr(), usable outside React
// (formatters, insight builders). Components use useI18n() so they re-render on change.

import { am } from "./am";
import { en, type MessageKey } from "./en";
import { om } from "./om";
import { ti } from "./ti";

export const LANGUAGES = ["en", "am", "om", "ti"] as const;
export type Lang = (typeof LANGUAGES)[number];

/** Each language's own name, as shown in the language switcher. */
export const LANGUAGE_NAMES: Record<Lang, string> = {
  en: "English",
  am: "አማርኛ",
  om: "Afaan Oromoo",
  ti: "ትግርኛ",
};

const DICTIONARIES: Record<Lang, Record<MessageKey, string>> = { en, am, om, ti };

export const LANG_STORAGE_KEY = "as360_lang";

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

let current: Lang = "en";

export function currentLang(): Lang {
  return current;
}

/** Called by I18nProvider; formatters and tr() follow it. */
export function setCurrentLang(lang: Lang) {
  current = lang;
}

export type Vars = Record<string, string | number | null | undefined>;

/** Translate a key in the current language: tr("dash.greeting", { name }) . */
export function tr(key: MessageKey, vars?: Vars, lang: Lang = current): string {
  const text = DICTIONARIES[lang][key] ?? en[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = vars[name];
    return v === null || v === undefined ? m : String(v);
  });
}

/** Translate a data value (crop, region, unit…) when the dictionary has it; otherwise show it as is. */
export function trTerm(
  prefix: "crop" | "region" | "unit" | "category" | "status" | "model" | "ppe" | "stage" | "season",
  value: string | null | undefined,
): string {
  if (!value) return "";
  const key = `${prefix}.${value.trim().toLowerCase().replace(/[\s/]+/g, "_")}` as MessageKey;
  return key in en ? tr(key) : value;
}

export type { MessageKey };
