import { PaperPlaneIcon } from "@/icons";
import { tr } from "@/i18n/core";
import type { AdvisoryLanguage } from "@/types/api";
import { forwardRef, useState } from "react";
import MicButton, { type VoiceState } from "./MicButton";

export function TypingBubble() {
  return (
    <div className="flex justify-start" aria-label={tr("advisor.typing")}>
      <div className="flex gap-1 rounded-2xl rounded-ss-sm bg-gray-100 px-4 py-3.5 dark:bg-white/5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-typing-dot rounded-full bg-gray-500 dark:bg-gray-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Show the microphone: the spoken question is transcribed in this language into the box. */
  voiceLanguage?: AdvisoryLanguage | null;
}

/** Enter sends, Shift+Enter adds a new line. */
export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(
  function Composer(
    {
      onSend,
      disabled,
      placeholder = tr("advisor.typeQuestion"),
      voiceLanguage,
    },
    ref,
  ) {
    const [text, setText] = useState("");
    const [voice, setVoice] = useState<VoiceState>("idle");
    const [note, setNote] = useState<{ error: boolean; text: string } | null>(
      null,
    );

    function submit() {
      if (!text.trim() || disabled) return;
      onSend(text);
      setText("");
    }

    return (
      <div>
        <div className="flex items-end gap-2">
          <textarea
            ref={ref}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            aria-label={tr("advisor.message")}
            className="max-h-40 min-h-11 flex-1 resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
          <button
            type="button"
            onClick={submit}
            disabled={disabled || !text.trim()}
            aria-label={tr("advisor.send")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PaperPlaneIcon className="size-5 rtl:-scale-x-100" />
          </button>
          {voiceLanguage && (
            <MicButton
              language={voiceLanguage}
              disabled={disabled}
              onState={(s) => {
                setVoice(s);
                if (s !== "idle") setNote(null);
              }}
              onText={(heard, verified) => {
                setText((t) => (t.trim() ? `${t.trim()} ${heard}` : heard));
                setNote({
                  error: false,
                  text: verified ? tr("voice.check") : tr("voice.unverified"),
                });
              }}
              onError={(message) => setNote({ error: true, text: message })}
            />
          )}
        </div>
        {voiceLanguage && (voice !== "idle" || note) && (
          <p
            className={`mt-1.5 text-theme-xs ${note?.error ? "text-error-600 dark:text-error-500" : "text-gray-500 dark:text-gray-400"}`}
          >
            {voice === "recording"
              ? tr("voice.privacy")
              : voice === "working"
                ? tr("voice.working")
                : note?.text}
          </p>
        )}
      </div>
    );
  },
);
