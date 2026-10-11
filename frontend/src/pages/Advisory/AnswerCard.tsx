import ListenButton from "@/components/advisory/ListenButton";
import Badge from "@/components/ui/badge/Badge";
import { tr, type MessageKey } from "@/i18n/core";
import type { AdvisorySource, AskResult } from "@/types/api";
import { cn } from "@/utils";
import { AlertTriangle, BookOpen, ExternalLink, PhoneCall, ShieldAlert, ThumbsDown, ThumbsUp, UserRound } from "lucide-react";
import { Fragment, useState } from "react";
import type { Turn } from "./useAdvisor";

const CITATION_RE = /\[(S\d+|M|C)\]/g;

/** Answer text with [S1] / [M] / [C] tags turned into small source chips. */
function CitedText({ text, onCite, active }: { text: string; onCite: (ref: string) => void; active: string | null }) {
  const parts: (string | { ref: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(CITATION_RE)) {
    parts.push(text.slice(last, m.index));
    parts.push({ ref: m[1] });
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(text.slice(last));
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-white/90">
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onCite(p.ref)}
            className={cn(
              "mx-0.5 inline-flex items-center rounded px-1.5 align-baseline text-[11px] leading-5 font-semibold transition",
              active === p.ref
                ? "bg-brand-500 text-white"
                : "bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-400",
            )}
            aria-label={tr("advisor.sourceRef", { ref: p.ref })}
          >
            {p.ref}
          </button>
        ),
      )}
    </p>
  );
}

function SourceList({ sources, active }: { sources: AdvisorySource[]; active: string | null }) {
  return (
    <ul className="space-y-1.5">
      {sources.map((s) => (
        <li
          key={s.ref}
          className={cn(
            "flex gap-2 rounded-lg px-2.5 py-2 text-theme-xs transition",
            active === s.ref ? "bg-brand-50 dark:bg-brand-500/10" : "bg-gray-50 dark:bg-white/[0.03]",
          )}
        >
          <span className="shrink-0 font-semibold text-brand-600 dark:text-brand-400">{s.ref}</span>
          <span className="min-w-0 text-gray-600 dark:text-gray-400">
            {s.citation}
            {s.section && <span className="block truncate text-gray-500 dark:text-gray-500">§ {s.section}</span>}
          </span>
          {s.source_url && (
            <a
              href={s.source_url}
              target="_blank"
              rel="noreferrer"
              className="ms-auto shrink-0 text-gray-400 hover:text-brand-500"
              aria-label={tr("advisor.openSource")}
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

const CONFIDENCE: Record<AskResult["confidence"], { label: MessageKey; color: "success" | "warning" | "light" }> = {
  high: { label: "confidence.high", color: "success" },
  medium: { label: "confidence.medium", color: "warning" },
  low: { label: "confidence.low", color: "light" },
};

/** Banner for answers that are not a normal cited answer. */
function KindBanner({ result }: { result: AskResult }) {
  const banners: Partial<Record<AskResult["kind"], { icon: React.ReactNode; text: string; tone: string }>> = {
    poisoning: {
      icon: <ShieldAlert className="size-4" />,
      text: tr("advisor.kind.poisoning"),
      tone: "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400",
    },
    product_refusal: {
      icon: <AlertTriangle className="size-4" />,
      text: tr("advisor.kind.refusal"),
      tone: "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-orange-400",
    },
    dont_know: {
      icon: <BookOpen className="size-4" />,
      text: tr("advisor.kind.dontKnow"),
      tone: "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300",
    },
    person: {
      icon: <UserRound className="size-4" />,
      text: tr("advisor.kind.person"),
      tone: "border-blue-light-200 bg-blue-light-50 text-blue-light-700 dark:border-blue-light-500/30 dark:bg-blue-light-500/10 dark:text-blue-light-400",
    },
    unavailable: {
      icon: <AlertTriangle className="size-4" />,
      text: tr("advisor.kind.unavailable"),
      tone: "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300",
    },
  };
  const b = banners[result.kind];
  if (!b) return null;
  return (
    <div className={cn("mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-theme-xs font-medium", b.tone)}>
      {b.icon}
      {b.text}
    </div>
  );
}

export function AnswerCard({ turn, onRate }: { turn: Turn; onRate: (rating: "helpful" | "not_helpful") => void }) {
  const [active, setActive] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const r = turn.result;
  if (!r) return null;
  const cited = r.sources.length > 0;

  return (
    <div className="max-w-[92%] rounded-2xl rounded-ss-sm border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <KindBanner result={r} />
      <CitedText
        text={r.answer}
        active={active}
        onCite={(ref) => {
          setShowSources(true);
          setActive((a) => (a === ref ? null : ref));
        }}
      />

      {r.escalated && (
        <p className="mt-3 flex items-center gap-1.5 text-theme-xs font-medium text-teal-700 dark:text-teal-400">
          <PhoneCall className="size-3.5" />
          {tr("advisor.escalated")}
        </p>
      )}

      {cited && showSources && (
        <div className="mt-3">
          <SourceList sources={r.sources} active={active} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        {r.kind === "answer" && (
          <Badge size="sm" color={CONFIDENCE[r.confidence].color}>
            {tr(CONFIDENCE[r.confidence].label)}
          </Badge>
        )}
        {cited && (
          <button
            type="button"
            onClick={() => setShowSources((s) => !s)}
            className="inline-flex items-center gap-1 text-theme-xs font-medium text-gray-500 hover:text-brand-500 dark:text-gray-400"
          >
            <BookOpen className="size-3.5" />
            {showSources ? tr("advisor.hideSources") : tr(r.sources.length > 1 ? "advisor.sources" : "advisor.source", { n: r.sources.length })}
          </button>
        )}
        <ListenButton text={r.answer} language={r.language} />
        <div className="ms-auto flex items-center gap-1">
          {turn.feedback ? (
            <span className="text-theme-xs text-gray-500 dark:text-gray-400">{tr("advisor.thanks")}</span>
          ) : (
            <>
              <span className="me-1 text-theme-xs text-gray-400">{tr("advisor.helpful?")}</span>
              <button
                type="button"
                onClick={() => onRate("helpful")}
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-success-50 hover:text-success-600 dark:hover:bg-success-500/10"
                aria-label={tr("advisor.helpful")}
              >
                <ThumbsUp className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onRate("not_helpful")}
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10"
                aria-label={tr("advisor.notHelpful")}
              >
                <ThumbsDown className="size-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
