// i18n/core.ts — current language, dictionaries and tr(), usable outside React
// (formatters, insight builders). Components use useI18n() so they re-render on change.

import { en, type MessageKey } from "./en";

export const LANGUAGES = ["en", "am", "om", "ti"] as const;
export type Lang = (typeof LANGUAGES)[number];

/** Each language's own name, as shown in the language switcher. */
export const LANGUAGE_NAMES: Record<Lang, string> = {
  en: "English",
  am: "አማርኛ",
  om: "Afaan Oromoo",
  ti: "ትግርኛ",
};

// English is built in; the others (≈150 kB compressed together) are fetched when first used, so the
// public website and English users don't download them. Until one arrives, tr() falls back to English.
const DICTIONARIES: Partial<Record<Lang, Record<MessageKey, string>>> = { en };
const LOADERS: Record<Exclude<Lang, "en">, () => Promise<Record<MessageKey, string>>> = {
  am: () => import("./am").then((m) => m.am),
  om: () => import("./om").then((m) => m.om),
  ti: () => import("./ti").then((m) => m.ti),
};
const loading: Partial<Record<Lang, Promise<void>>> = {};

export function dictionaryLoaded(lang: Lang): boolean {
  return lang in DICTIONARIES;
}

/** Fetch a language's dictionary once; resolves when tr() can use it. */
export function loadDictionary(lang: Lang): Promise<void> {
  if (lang === "en" || dictionaryLoaded(lang)) return Promise.resolve();
  loading[lang] ??= LOADERS[lang]().then(
    (dict) => {
      DICTIONARIES[lang] = dict;
    },
    (err) => {
      delete loading[lang];   // try again next time (offline, new deploy)
      throw err;
    },
  );
  return loading[lang];
}

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
  const text = DICTIONARIES[lang]?.[key] ?? en[key] ?? key;
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
