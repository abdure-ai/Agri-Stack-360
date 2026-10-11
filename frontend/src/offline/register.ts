/**
 * Register the offline service worker (public/sw.js).
 *
 * Browsers allow service workers only on https:// or http://localhost, so a phone opening the
 * app at http://<pc-address>:5173 stays online-only (the outbox still works while the tab is open).
 * Set VITE_OFFLINE=0 to switch it off; that also removes a worker registered earlier.
 */
export function registerOfflineSupport(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (import.meta.env.VITE_OFFLINE === "0") {
    void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
    return;
  }
  if (!window.isSecureContext) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support unavailable; the app works online as before */
    });
  });
}

/** True when this browser can keep the app and saved data for offline use. */
export function offlineSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && window.isSecureContext;
}
