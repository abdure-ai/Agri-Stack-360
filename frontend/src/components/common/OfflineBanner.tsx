import { useAuth } from "@/context/AuthContext";
import { tr } from "@/i18n/core";
import { flushOutbox, listOutbox, OUTBOX_EVENT, type FlushReport } from "@/offline/outbox";
import { CloudOff, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const RETRY_MS = 15_000;

/**
 * Shows when the device is offline or questions/photos are waiting to be sent, and sends them
 * when the connection comes back (on reconnect, on load, when the app is reopened, and every 15 s while
 * items wait: some phones never report going offline on a weak signal).
 */
export default function OfflineBanner() {
  const { isAuthenticated } = useAuth();
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [waiting, setWaiting] = useState(0);
  const [last, setLast] = useState<FlushReport | null>(null);

  const count = useCallback(async () => setWaiting((await listOutbox()).length), []);

  const send = useCallback(async () => {
    if (!navigator.onLine) return;
    const r = await flushOutbox();
    if (r.sent || r.failed.length) setLast(r);
    await count();
  }, [count]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const goOnline = () => {
      setOnline(true);
      void send();
    };
    const goOffline = () => setOnline(false);
    const onChange = () => void count();
    const onVisible = () => document.visibilityState === "visible" && void send();
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener(OUTBOX_EVENT, onChange);
    document.addEventListener("visibilitychange", onVisible);
    const first = setTimeout(() => void send(), 0);
    return () => {
      clearTimeout(first);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener(OUTBOX_EVENT, onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isAuthenticated, send, count]);

  useEffect(() => {
    if (!waiting || !online) return;
    const t = setInterval(() => void send(), RETRY_MS);
    return () => clearInterval(t);
  }, [waiting, online, send]);

  if (!isAuthenticated || (online && !waiting && !last)) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-theme-sm text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300 print:hidden"
    >
      {!online ? (
        <>
          <CloudOff className="size-4 shrink-0" />
          <span className="font-medium">{tr("offline.offline")}</span>
          <span>{tr("offline.savedCopy")}</span>
        </>
      ) : waiting ? (
        <RefreshCw className="size-4 shrink-0" />
      ) : null}
      {waiting > 0 && <span>{tr("offline.waiting", { n: waiting })}</span>}
      {online && !waiting && last && (
        <span className="flex flex-wrap items-center gap-x-3">
          {last.sent > 0 && <span>{tr("offline.sent", { n: last.sent })}</span>}
          {last.failed.map((f, i) => (
            <span key={i} className="text-error-700 dark:text-error-400">
              {tr("offline.notSent", { message: f.message })}
            </span>
          ))}
          <button type="button" className="underline" onClick={() => setLast(null)}>
            {tr("offline.dismiss")}
          </button>
        </span>
      )}
    </div>
  );
}
