/*
 * Agri-Stack 360 offline support (hand-written service worker, no build plugin).
 *
 * - The app itself (pages, scripts, styles, images) is saved as it loads, so it opens without a
 *   connection. Always network first: online, nothing changes; offline, the last saved copy is used.
 * - A short list of the user's own GET requests (crop calendar, alerts, farms and seasons, profile,
 *   consent, past advisor conversations, credit score) is saved the same way, in a separate cache
 *   that the app deletes on sign-out (shared phones).
 * - Nothing else is cached: other API calls, all POST/PUT/DELETE, and every other service pass
 *   straight through. Questions and photos sent while offline are kept by the page (IndexedDB
 *   outbox, src/offline/outbox.ts), not here.
 *
 * Service workers only run on https:// or http://localhost. On a phone that opens the app at
 * http://<pc-address>:5173 the browser does not allow them, and the app works online only.
 */

const VERSION = "v3";
const APP_CACHE = `as360-app-${VERSION}`;
const API_CACHE = "as360-api"; // name shared with src/offline/outbox.ts (cleared on sign-out)
const API_TIMEOUT_MS = 8000; // slow network: fall back to the saved copy after this

/** Own data worth reading offline (paths after /api). */
const API_ALLOW = [
  /^\/advisory\/calendar$/,
  /^\/advisory\/alerts$/,
  /^\/advisory\/conversations\/\d+$/,
  /^\/users\/profile$/,
  /^\/users\/farms$/,
  /^\/users\/farms\/\d+\/seasons$/,
  /^\/users\/consent$/,
  /^\/crop-health\/reports$/,
  /^\/financial\/profile$/,
  /^\/auth\/me$/,
  /^\/geo\/areas$/, // region / zone / woreda lists (public reference data)
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((c) => c.add("/"))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith("as360-app-") && k !== APP_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function apiPath(url) {
  const i = url.pathname.indexOf("/api/");
  return i === -1 ? null : url.pathname.slice(i + 4);
}

async function networkFirst(request, cacheName, { key, timeoutMs } = {}) {
  const cache = await caches.open(cacheName);
  const cacheKey = key ?? request;
  const network = fetch(request).then((res) => {
    if (res.ok && (res.type === "basic" || res.type === "cors")) cache.put(cacheKey, res.clone());
    return res;
  });
  if (!timeoutMs) {
    try {
      return await network;
    } catch (err) {
      const saved = await cache.match(cacheKey, { ignoreVary: true });
      if (saved) return saved;
      throw err;
    }
  }
  const saved = await cache.match(cacheKey, { ignoreVary: true });
  if (!saved) return network;
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
  try {
    return (await Promise.race([network, timeout])) ?? saved;
  } catch {
    return saved;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Page loads (any route of the single-page app): the saved shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, APP_CACHE, { key: "/" }));
    return;
  }
  const path = apiPath(url);
  if (path !== null) {
    if (API_ALLOW.some((re) => re.test(path))) {
      event.respondWith(networkFirst(request, API_CACHE, { timeoutMs: API_TIMEOUT_MS }));
    }
    return; // every other API call: straight to the network
  }
  // The app's own files (and Vite's dev modules). Other origins pass through.
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, APP_CACHE));
  }
});
