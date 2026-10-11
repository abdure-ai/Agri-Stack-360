import { api } from "@/api/client";
import { LanguagePicker } from "@/components/advisory/LanguagePicker";
import { Composer, TypingBubble } from "@/components/chat/ChatThread";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import PageMeta from "@/components/common/PageMeta";
import { Spinner } from "@/components/common/States";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { RegenerateIcon } from "@/icons";
import { tr } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import type { AdvisoryLanguage } from "@/types/api";
import { BookOpen, Lightbulb, MessageCircle, Sprout } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnswerCard } from "./AnswerCard";
import { useAdvisor } from "./useAdvisor";

// Example questions per answer language. The am/om/en ones are recorded for offline replay,
// so keep them word for word in step with scripts/record_demo_answers.py. Tigrinya: draft.
const SUGGESTIONS: Record<AdvisoryLanguage, string[]> = {
  en: [
    "When should I apply urea on irrigated wheat?",
    "My wheat leaves have yellow stripes. What should I do?",
    "How much wheat seed do I need for one hectare?",
    "How often should I irrigate wheat?",
    "What is the wheat price at my nearest market?",
  ],
  am: [
    "በመስኖ ስንዴ ላይ ዩሪያ መቼ ልጨምር?",
    "የስንዴ ቅጠሌ ላይ ቢጫ መስመር አለ። ምን ላድርግ?",
    "ለአንድ ሄክታር ስንዴ ስንት ኪሎ ዘር ያስፈልጋል?",
    "ስንዴን በስንት ቀን ልዩነት ማጠጣት አለብኝ?",
    "በአቅራቢያዬ ገበያ የስንዴ ዋጋ ስንት ነው?",
  ],
  om: [
    "Qamadii jallisiirratti yuuriyaa yoom naquu qaba?",
    "Baalli qamadii koo sarara keelloo qaba. Maal gochuu qaba?",
    "Hektaara tokkoof sanyii qamadii kiiloo meeqa barbaada?",
    "Gatiin qamadii gabaa natti dhihoo jirutti meeqa?",
  ],
  ti: [
    "ኣብ ብመስኖ ዝለምዕ ስርናይ ዩሪያ መዓስ ክውስኽ ኣለኒ?",
    "ቆጽሊ ስርናየይ ብጫ መስመር ኣለዎ። እንታይ ክገብር?",
    "ንሓደ ሄክታር ስርናይ ክንደይ ኪሎ ዘርኢ የድልየኒ?",
    "ኣብ ጥቓይ ዘሎ ዕዳጋ ዋጋ ስርናይ ክንደይ እዩ?",
  ],
};

const PLACEHOLDER: Record<AdvisoryLanguage, string> = {
  en: "Ask about your wheat, fertilizer, disease or prices…",
  am: "ስለ ስንዴዎ፣ ማዳበሪያ፣ በሽታ ወይም ዋጋ ይጠይቁ…",
  om: "Waa'ee qamadii, xaa'oo, dhukkuba ykn gatii gaafadhu…",
  ti: "ብዛዕባ ስርናይኩም፣ ማዳበርያ፣ ሕማም ወይ ዋጋ ሕተቱ…",
};

/** DA only: choose the farmer the questions are about (their farm context is used). */
function FarmerPicker({ value, onChange, disabled }: { value: number | null; onChange: (id: number | null) => void; disabled?: boolean }) {
  const farmers = useAsync(() => api.daFarmers(), []);
  return (
    <div className="flex items-center gap-2">
      <span className="text-theme-xs text-gray-500 dark:text-gray-400">{tr("da.actingFor")}</span>
      <div className="w-44">
        <Select
          aria-label={tr("da.actingFor")}
          options={[{ value: "", label: tr("da.myself") }, ...(farmers.data ?? []).map((f) => ({ value: String(f.id), label: f.name }))]}
          value={value ? String(value) : ""}
          disabled={disabled}
          onChange={(v) => onChange(v ? Number(v) : null)}
        />
      </div>
    </div>
  );
}

export default function Advisory() {
  const { can } = useAuth();
  const [farmerId, setFarmerId] = useState<number | null>(null);
  const { turns, loading, restoring, ask, rate, reset } = useAdvisor(farmerId);
  const { lang } = useI18n();
  const [language, setLanguage] = useState<AdvisoryLanguage | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // "Auto" shows examples in the interface language.
  const shown: AdvisoryLanguage = language ?? lang;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, loading]);

  return (
    <>
      <PageMeta title={`${tr("nav.advisory")} | ${tr("app.name")}`} description={tr("advisor.meta")} />
      <PageHeader title={tr("nav.advisory")} description={tr("advisor.description")} />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <Card
          accent="sky"
          className="col-span-12 flex h-[calc(100vh-14rem)] min-h-[520px] flex-col xl:col-span-8"
          bodyClassName="flex min-h-0 flex-1 flex-col p-0 sm:p-0"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{tr("advisor.title")}</h3>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">{tr("advisor.subtitle")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {can("da:work") && (
                <FarmerPicker
                  value={farmerId}
                  disabled={loading}
                  onChange={(id) => {
                    reset();
                    setFarmerId(id);
                  }}
                />
              )}
              <LanguagePicker value={language} onChange={setLanguage} disabled={loading} />
              <Button
                size="xs"
                variant="ghost"
                onClick={reset}
                disabled={!turns.length || loading}
                startIcon={<RegenerateIcon className="size-4" />}
              >
                {tr("advisor.newChat")}
              </Button>
            </div>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5" aria-live="polite">
            {restoring ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : turns.length === 0 ? (
              <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center">
                <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                  <Sprout className="size-7" />
                </span>
                <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">{tr("advisor.emptyTitle")}</h4>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  {tr("advisor.emptyBody")}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {turns.map((t) => (
                  <div key={t.key} className="flex flex-col gap-3">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-ee-sm bg-brand-500 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white">
                        {t.question}
                      </div>
                    </div>
                    {t.result && (
                      <div className="flex justify-start">
                        <AnswerCard turn={t} onRate={(r) => rate(t, r)} />
                      </div>
                    )}
                    {t.queued && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl rounded-ss-sm bg-gray-100 px-4 py-3 text-sm text-gray-700 dark:bg-white/5 dark:text-gray-300">
                          {tr("offline.queuedQuestion")}
                        </div>
                      </div>
                    )}
                    {t.error && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl rounded-ss-sm bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
                          {t.error}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {loading && <TypingBubble />}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-gray-200 p-4 dark:border-gray-800">
            <Composer onSend={(q) => ask(q, language)} disabled={loading || restoring} placeholder={PLACEHOLDER[shown]} voiceLanguage={shown} />
          </div>
        </Card>

        <div className="col-span-12 space-y-4 md:space-y-6 xl:col-span-4">
          <Card accent="violet" icon={<MessageCircle className="size-5" />} title={tr("advisor.tryAsking")} description={tr("advisor.tapToSend")}>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS[shown].map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={loading || restoring}
                  onClick={() => ask(q, language)}
                  className="rounded-lg border border-gray-200 px-3.5 py-2.5 text-start text-sm text-gray-700 transition hover:border-brand-300 hover:bg-brand-25 disabled:opacity-50 dark:border-gray-800 dark:text-gray-300 dark:hover:border-brand-800 dark:hover:bg-brand-500/5"
                >
                  {q}
                </button>
              ))}
            </div>
          </Card>
          <Card accent="amber" icon={<Lightbulb className="size-5" />} title={tr("advisor.howItWorks")}>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex gap-2">
                <BookOpen className="mt-0.5 size-4 shrink-0 text-amber-500" />
                {tr("advisor.how1")}
              </li>
              <li>• {tr("advisor.how2")}</li>
              <li>• {tr("advisor.how3")}</li>
              <li>• {tr("advisor.how4")}</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
