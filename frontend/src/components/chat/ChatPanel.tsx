import { ChatIcon, CloseIcon } from "@/icons";
import { tr } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import { AnswerCard } from "@/pages/Advisory/AnswerCard";
import { useAdvisor } from "@/pages/Advisory/useAdvisor";
import { Maximize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Composer, TypingBubble } from "./ChatThread";

/**
 * Floating farm advisor on every app page. Same advisor and conversation as the
 * AI Advisory page (cited MoA guidelines, farm context, guardrails); the
 * language is detected from what the farmer types.
 */
export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const { turns, loading, restoring, ask, rate, reset } = useAdvisor();
  const { lang } = useI18n();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [open, turns, loading]);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={tr(open ? "advisor.close" : "advisor.open")}
        aria-expanded={open}
        className="fixed inset-e-5 bottom-5 z-99 flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-theme-lg transition hover:bg-brand-600 sm:inset-e-6 sm:bottom-6"
      >
        {open ? <CloseIcon className="size-6" /> : <ChatIcon className="size-6" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={tr("advisor.chat")}
          className="fixed inset-e-4 bottom-24 z-99 flex h-[min(600px,calc(100vh-8rem))] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl sm:inset-e-6 dark:border-gray-800 dark:bg-gray-dark"
        >
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">{tr("advisor.title")}</h3>
              <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                {tr("advisor.panelSubtitle")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={reset}
                disabled={!turns.length || loading}
                className="rounded-lg px-2.5 py-1.5 text-theme-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
              >
                {tr("advisor.newChat")}
              </button>
              <Link
                to="/advisory"
                onClick={() => setOpen(false)}
                aria-label={tr("advisor.openFull")}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
              >
                <Maximize2 className="size-4" />
              </Link>
            </div>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4" aria-live="polite">
            {!restoring && turns.length === 0 && (
              <div className="max-w-[92%] rounded-2xl rounded-ss-sm bg-gray-100 px-4 py-3 text-sm text-gray-800 dark:bg-white/5 dark:text-white/90">
                {tr("advisor.panelWelcome")}
              </div>
            )}
            <div className="flex flex-col gap-3">
              {turns.map((t) => (
                <div key={t.key} className="flex flex-col gap-2">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-ee-sm bg-brand-500 px-4 py-2.5 text-sm whitespace-pre-wrap text-white">
                      {t.question}
                    </div>
                  </div>
                  {t.result && <AnswerCard turn={t} onRate={(r) => rate(t, r)} />}
                  {t.queued && (
                    <div className="max-w-[92%] rounded-2xl rounded-ss-sm bg-gray-100 px-4 py-2.5 text-sm text-gray-700 dark:bg-white/5 dark:text-gray-300">
                      {tr("offline.queuedQuestion")}
                    </div>
                  )}
                  {t.error && (
                    <div className="max-w-[92%] rounded-2xl rounded-ss-sm bg-error-50 px-4 py-2.5 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
                      {t.error}
                    </div>
                  )}
                </div>
              ))}
              {loading && <TypingBubble />}
            </div>
            <div ref={endRef} />
          </div>

          <div className="border-t border-gray-200 p-3 dark:border-gray-800">
            <Composer ref={inputRef} onSend={(q) => ask(q, null)} disabled={loading || restoring} placeholder={tr("advisor.typeQuestion")} voiceLanguage={lang} />
          </div>
        </div>
      )}
    </>
  );
}
