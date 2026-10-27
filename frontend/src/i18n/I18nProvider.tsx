import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dictionaryLoaded, isLang, LANG_STORAGE_KEY, loadDictionary, setCurrentLang, tr, trTerm, type Lang, type MessageKey,
  type Vars } from "./core";

/** The public website (pages/Public): English only, shown without waiting for other languages. */
const PUBLIC_PATHS = ["/", "/feedback", "/privacy"];

type I18nContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  /** Crop, region, unit… names from data, translated when known. */
  term: typeof trTerm;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function readStored(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

function browserLang(): Lang {
  const prefs = typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : [];
  for (const p of prefs) {
    const code = p?.slice(0, 2).toLowerCase();
    if (isLang(code)) return code;
  }
  return "en";
}

/**
 * Interface language. A signed-in user's profile language wins (so it follows them
 * across devices); before sign-in the last choice on this device is used.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const [deviceLang, setDeviceLang] = useState<Lang>(() => readStored() ?? browserLang());
  const lang: Lang = isLang(user?.language) ? user.language : deviceLang;

  // Set during render so tr() and the formatters already use it in this render.
  setCurrentLang(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Amharic, Afaan Oromoo and Tigrinya text is fetched on first use (i18n/core.ts). App screens wait for
  // it rather than flash English; the public website is English and doesn't wait.
  const ready = dictionaryLoaded(lang);
  const [failed, setFailed] = useState<Lang | null>(null);
  const [, setLoaded] = useState(0);
  useEffect(() => {
    if (ready) return;
    let live = true;
    loadDictionary(lang).then(
      () => live && setLoaded((n) => n + 1),
      () => live && setFailed(lang),   // offline before it was ever saved: show English
    );
    return () => {
      live = false;
    };
  }, [lang, ready]);
  const waiting = !ready && failed !== lang && !PUBLIC_PATHS.includes(window.location.pathname);

  const setLang = useCallback(
    (next: Lang) => {
      setDeviceLang(next);
      try {
        localStorage.setItem(LANG_STORAGE_KEY, next);
      } catch {
        /* private window: the choice lasts for this visit only */
      }
      if (user && user.language !== next) {
        const previous = user.language;
        updateUser({ language: next });
        api.updateProfile({ language: next }).catch(() => updateUser({ language: previous }));
      }
    },
    [user, updateUser],
  );

  const value = useMemo(
    () => ({ lang, setLang, t: (key: MessageKey, vars?: Vars) => tr(key, vars, lang), term: trTerm }),
    [lang, setLang],
  );

  // Keyed by language: the whole app re-renders in the new language, including text built
  // with tr() outside components (formatters, insights). Saved state is restored on remount.
  return (
    <I18nContext.Provider value={value}>
      {waiting ? null : <Fragment key={lang}>{children}</Fragment>}
    </I18nContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
