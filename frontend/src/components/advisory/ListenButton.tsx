import { api } from "@/api/client";
import { errorMessage } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import type { AdvisoryLanguage } from "@/types/api";
import { cn } from "@/utils";
import { Loader2, Square, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// One clip at a time across the whole app: starting a new one stops the previous.
let current: { audio: HTMLAudioElement; stop: () => void } | null = null;

// Audio already fetched this session, keyed by language + text (the server caches too).
const blobs = new Map<string, string>();

const SPEAKABLE = new Set<string>(["am", "om", "ti", "en"]);

/** 🔊 Reads `text` aloud in `language`. Renders nothing for languages without a voice. */
export default function ListenButton({
  text,
  language,
  compact,
  className,
}: {
  text: string;
  language: string | null | undefined;
  compact?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const mine = useRef<HTMLAudioElement | null>(null);

  // Stop this clip if the button disappears (new chat, page change).
  useEffect(
    () => () => {
      if (current && current.audio === mine.current) current.stop();
    },
    [],
  );

  if (!language || !SPEAKABLE.has(language) || !text.trim()) return null;

  function stop() {
    mine.current?.pause();
    if (current?.audio === mine.current) current = null;
    setState("idle");
  }

  async function play() {
    current?.stop();
    setError(null);
    const key = `${language}|${text}`;
    try {
      let url = blobs.get(key);
      if (!url) {
        setState("loading");
        url = URL.createObjectURL(await api.advisoryTts(text, language as AdvisoryLanguage));
        blobs.set(key, url);
      }
      const audio = new Audio(url);
      mine.current = audio;
      current = { audio, stop };
      audio.onended = () => {
        if (current?.audio === audio) current = null;
        setState("idle");
      };
      await audio.play();
      setState("playing");
    } catch (e) {
      setError(errorMessage(e));
      setState("error");
    }
  }

  const label =
    state === "playing" ? tr("tts.stop") : state === "loading" ? tr("tts.loading") : state === "error" ? tr("tts.failed") : tr("tts.listen");
  const Icon = state === "playing" ? Square : state === "loading" ? Loader2 : state === "error" ? VolumeX : Volume2;

  return (
    <button
      type="button"
      onClick={() => (state === "playing" ? stop() : play())}
      disabled={state === "loading"}
      title={error ?? label}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md text-theme-xs font-medium transition disabled:cursor-wait",
        compact ? "p-1.5" : "px-2 py-1",
        state === "playing"
          ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
          : state === "error"
            ? "text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
            : "text-gray-500 hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-white/5",
        className,
      )}
    >
      <Icon className={cn("size-4", state === "loading" && "animate-spin", state === "playing" && "fill-current")} />
      {!compact && <span>{label}</span>}
    </button>
  );
}
