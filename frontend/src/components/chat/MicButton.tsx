import { api } from "@/api/client";
import { errorMessage } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import type { AdvisoryLanguage } from "@/types/api";
import { cn } from "@/utils";
import { LoaderCircle, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MAX_MS = 60_000;
const MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

export type VoiceState = "idle" | "recording" | "working";

/**
 * Records a spoken question (max 1 minute) and returns the text. The microphone needs HTTPS or
 * localhost; elsewhere the button explains that the farmer should type instead.
 */
export default function MicButton({
  language,
  disabled,
  onText,
  onError,
  onState,
}: {
  language: AdvisoryLanguage;
  disabled?: boolean;
  onText: (text: string, qualityVerified: boolean) => void;
  onError: (message: string) => void;
  onState?: (s: VoiceState) => void;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const change = (s: VoiceState) => {
    setState(s);
    onState?.(s);
  };

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
    },
    [],
  );

  async function start() {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      onError(tr("voice.unsupported"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m));
      const r = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        change("working");
        try {
          const res = await api.advisoryStt(
            new Blob(chunks, { type: r.mimeType || "audio/webm" }),
            language,
          );
          onText(res.text, res.quality_verified);
        } catch (err) {
          onError(errorMessage(err));
        } finally {
          change("idle");
        }
      };
      r.start();
      recorder.current = r;
      change("recording");
      timer.current = window.setTimeout(stop, MAX_MS);
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  function stop() {
    window.clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  const label =
    state === "recording"
      ? tr("voice.stop")
      : state === "working"
        ? tr("voice.working")
        : tr("voice.record");
  return (
    <button
      type="button"
      onClick={state === "recording" ? stop : start}
      disabled={disabled || state === "working"}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-50",
        state === "recording"
          ? "animate-pulse border-error-500 bg-error-500 text-white"
          : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5",
      )}
    >
      {state === "recording" ? (
        <Square className="size-4" />
      ) : state === "working" ? (
        <LoaderCircle className="size-5 animate-spin" />
      ) : (
        <Mic className="size-5" />
      )}
    </button>
  );
}
