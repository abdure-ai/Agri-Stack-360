import { isNetworkError } from "@/api/client";
import { tr, type MessageKey } from "@/i18n/core";
import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** Re-run the loader with the current dependencies. */
  reload: () => void;
  /** Replace the loaded data locally (after a save, delete, …). */
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/** Plain-language message for a failed request. */
export function errorMessage(e: unknown, service: MessageKey = "service.server"): string {
  if (isNetworkError(e)) return tr("error.unreachable", { service: tr(service) });
  return e instanceof Error ? e.message : tr("state.somethingWrongDot");
}

interface Settled<T> {
  key: string | null;
  data: T | null;
  error: string | null;
}

/**
 * Runs `loader` whenever `deps` (JSON-serialisable values) change and tracks
 * loading / error state. Responses from superseded runs are ignored, so fast
 * filter changes never show stale data.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[], service?: MessageKey): AsyncState<T> {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>({ key: null, data: null, error: null });
  const key = JSON.stringify([deps, tick]);

  // Always call the latest loader without making it a dependency
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let cancelled = false;
    loaderRef
      .current()
      .then((data) => {
        if (!cancelled) setSettled({ key, data, error: null });
      })
      .catch((e) => {
        if (!cancelled) setSettled((s) => ({ key, data: s.data, error: errorMessage(e, service) }));
      });
    return () => {
      cancelled = true;
    };
  }, [key, service]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback<React.Dispatch<React.SetStateAction<T | null>>>(
    (action) =>
      setSettled((s) => ({
        ...s,
        data: typeof action === "function" ? (action as (prev: T | null) => T | null)(s.data) : action,
      })),
    [],
  );

  return {
    data: settled.data,
    error: settled.key === key ? settled.error : null,
    loading: settled.key !== key,
    reload,
    setData,
  };
}
