import { api, ApiError } from "@/api/client";
import { tr } from "@/i18n/core";
import { queueQuestion, QUESTION_SENT_EVENT } from "@/offline/outbox";
import type { AdvisoryLanguage, AnswerConfidence, AnswerKind, AskResult, ConversationMessage } from "@/types/api";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Turn {
  /** Local key; the server message id once answered. */
  key: string;
  question: string;
  result?: AskResult;
  error?: string;
  /** Asked offline: kept on this phone and sent when the connection is back. */
  queued?: boolean;
  feedback?: "helpful" | "not_helpful" | null;
}

const CONVERSATION_KEY = "as360_advisory_conversation";

function readStored(): number | null {
  try {
    const v = Number(localStorage.getItem(CONVERSATION_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

function store(id: number | null) {
  try {
    if (id) localStorage.setItem(CONVERSATION_KEY, String(id));
    else localStorage.removeItem(CONVERSATION_KEY);
  } catch {
    /* private window: the conversation just isn't restored */
  }
}

/** Stored messages keep a numeric confidence (0.9 / 0.6 / 0.3) and no kind. */
function fromStored(m: ConversationMessage, conversationId: number): Turn {
  const confidence: AnswerConfidence =
    (m.confidence ?? 0) >= 0.85 ? "high" : (m.confidence ?? 0) >= 0.5 ? "medium" : "low";
  const kind: AnswerKind = m.guardrail_flags.includes("poisoning_question")
    ? "poisoning"
    : m.guardrail_flags.some((f) => f.startsWith("refused_product"))
      ? "product_refusal"
      : m.guardrail_flags.includes("asked_for_person")
        ? "person"
        : m.escalated
          ? "dont_know"
          : "answer";
  return {
    key: String(m.id),
    question: m.question,
    feedback: (m.feedback as Turn["feedback"]) ?? null,
    result: {
      message_id: m.id,
      conversation_id: conversationId,
      kind,
      language: m.language,
      answer: m.answer,
      sources: m.sources,
      confidence,
      escalated: !!m.escalated,
      escalation_reason: null,
      guardrail_flags: m.guardrail_flags,
    },
  };
}

/**
 * Conversation with the cited advisor (POST /advisory/ask), restored across reloads.
 * `farmerId`: a DA asking on behalf of one of their farmers (null = the signed-in user).
 */
export function useAdvisor(farmerId: number | null = null) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(() => readStored() !== null);
  const busy = useRef(false);

  useEffect(() => {
    const id = readStored();
    if (!id) return;
    api
      .advisoryConversation(id)
      .then((c) => {
        setConversationId(id);
        setTurns(c.messages.map((m) => fromStored(m, id)));
      })
      .catch(() => store(null))
      .finally(() => setRestoring(false));
  }, []);

  const ask = useCallback(
    async (text: string, language: AdvisoryLanguage | null) => {
      const question = text.trim();
      if (!question || busy.current) return;
      busy.current = true;
      const key = `pending-${Date.now()}`;
      setTurns((prev) => [...prev, { key, question }]);
      setLoading(true);
      try {
        const result = await api.advisoryAsk({ question, language, conversation_id: conversationId, farmer_id: farmerId });
        setConversationId(result.conversation_id);
        store(result.conversation_id);
        setTurns((prev) => prev.map((t) => (t.key === key ? { ...t, key: String(result.message_id), result } : t)));
      } catch (e) {
        if (!(e instanceof ApiError) && (await queueQuestion({ question, language, conversationId, farmerId }))) {
          setTurns((prev) => prev.map((t) => (t.key === key ? { ...t, queued: true } : t)));
          return;
        }
        const error =
          e instanceof ApiError
            ? e.message
            : tr("advisor.unreachable");
        setTurns((prev) => prev.map((t) => (t.key === key ? { ...t, error } : t)));
      } finally {
        busy.current = false;
        setLoading(false);
      }
    },
    [conversationId, farmerId],
  );

  // A question asked offline was answered: show the conversation it went into.
  useEffect(() => {
    const onSent = (e: Event) => {
      const id = (e as CustomEvent<{ conversationId: number }>).detail.conversationId;
      if (conversationId !== null && conversationId !== id) return;
      api
        .advisoryConversation(id)
        .then((c) => {
          setConversationId(id);
          store(id);
          setTurns(c.messages.map((m) => fromStored(m, id)));
        })
        .catch(() => undefined);
    };
    window.addEventListener(QUESTION_SENT_EVENT, onSent);
    return () => window.removeEventListener(QUESTION_SENT_EVENT, onSent);
  }, [conversationId]);

  const rate = useCallback(async (turn: Turn, rating: "helpful" | "not_helpful") => {
    if (!turn.result) return;
    setTurns((prev) => prev.map((t) => (t.key === turn.key ? { ...t, feedback: rating } : t)));
    try {
      await api.advisoryFeedback(turn.result.message_id, rating);
    } catch {
      setTurns((prev) => prev.map((t) => (t.key === turn.key ? { ...t, feedback: turn.feedback ?? null } : t)));
    }
  }, []);

  const reset = useCallback(() => {
    store(null);
    setConversationId(null);
    setTurns([]);
  }, []);

  return { turns, loading, restoring, ask, rate, reset };
}
