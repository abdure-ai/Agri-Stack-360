/**
 * Offline outbox and saved photo-check results, kept in IndexedDB on this device.
 *
 * - Questions and photos sent without a connection wait here and are sent, in order, when the
 *   connection comes back (`flushOutbox`). Each item belongs to the user who made it and is only
 *   sent for that user.
 * - The last photo-check results (with their treatment plans) are saved so they can be read offline.
 * - Signing out deletes everything here and the saved API copies (`clearOfflineData`): phones are
 *   often shared. Unsent items are lost then, which the offline banner warns about.
 */

import { api, ApiError, USER_KEY } from "@/api/client";
import type { AdvisoryDiagnosis, AdvisoryLanguage } from "@/types/api";

const DB_NAME = "as360-offline";
const OUTBOX = "outbox";
const PLANS = "plans";
const API_CACHE = "as360-api"; // same name as in public/sw.js
const MAX_PLANS = 10;

/** Fired on window whenever the outbox or the saved results change. */
export const OUTBOX_EVENT = "as360:outbox-changed";
/** Fired on window after a queued question was answered: detail = { conversationId }. */
export const QUESTION_SENT_EVENT = "as360:question-sent";

export type OutboxItem =
  | {
      id?: number;
      kind: "question";
      userId: number;
      createdAt: string;
      question: string;
      language: AdvisoryLanguage | null;
      conversationId: number | null;
      farmerId: number | null;
    }
  | {
      id?: number;
      kind: "photo";
      userId: number;
      createdAt: string;
      /** Raw bytes (some browsers can't read a Blob back from IndexedDB). */
      image: ArrayBuffer;
      imageType: string;
      fileName: string;
      captureSource?: "camera" | "gallery" | null;
      farmId: number | null;
      language: AdvisoryLanguage | null;
    };

export interface SavedCheck {
  diagnosisId: number;
  userId: number;
  savedAt: string;
  result: AdvisoryDiagnosis;
}

function currentUserId(): number | null {
  try {
    const u = JSON.parse(sessionStorage.getItem(USER_KEY) ?? "null") as { id?: number } | null;
    return u?.id ?? null;
  } catch {
    return null;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB not available"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX, { keyPath: "id", autoIncrement: true });
      if (!db.objectStoreNames.contains(PLANS)) db.createObjectStore(PLANS, { keyPath: "diagnosisId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(name: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(name, mode);
      const req = fn(tx.objectStore(name));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function changed() {
  window.dispatchEvent(new Event(OUTBOX_EVENT));
}

/** Items waiting for the signed-in user, oldest first. */
export async function listOutbox(): Promise<OutboxItem[]> {
  const uid = currentUserId();
  if (uid === null) return [];
  try {
    const all = await withStore<OutboxItem[]>(OUTBOX, "readonly", (s) => s.getAll() as IDBRequest<OutboxItem[]>);
    return all.filter((i) => i.userId === uid).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  } catch {
    return [];
  }
}

/** Keep a question to send later. Returns false when this browser cannot store it. */
export async function queueQuestion(q: {
  question: string;
  language: AdvisoryLanguage | null;
  conversationId: number | null;
  farmerId: number | null;
}): Promise<boolean> {
  const uid = currentUserId();
  if (uid === null) return false;
  try {
    await withStore(OUTBOX, "readwrite", (s) =>
      s.add({ kind: "question", userId: uid, createdAt: new Date().toISOString(), ...q } satisfies OutboxItem),
    );
    changed();
    return true;
  } catch {
    return false;
  }
}

/** Keep a photo check to send later. Returns false when this browser cannot store it. */
export async function queuePhoto(
  file: File,
  farmId: number | null,
  language: AdvisoryLanguage | null,
  captureSource: "camera" | "gallery" | null = null,
): Promise<boolean> {
  const uid = currentUserId();
  if (uid === null) return false;
  try {
    const image = await file.arrayBuffer();
    await withStore(OUTBOX, "readwrite", (s) =>
      s.add({
        kind: "photo",
        userId: uid,
        createdAt: new Date().toISOString(),
        image,
        imageType: file.type || "image/jpeg",
        captureSource,
        fileName: file.name || "photo.jpg",
        farmId,
        language,
      } satisfies OutboxItem),
    );
    changed();
    return true;
  } catch {
    return false;
  }
}

async function removeItem(id: number) {
  await withStore(OUTBOX, "readwrite", (s) => s.delete(id));
}

/** Save a photo-check result (with its plan) for offline reading; keeps the newest few. */
export async function saveCheck(result: AdvisoryDiagnosis): Promise<void> {
  const uid = currentUserId();
  if (uid === null) return;
  try {
    await withStore(PLANS, "readwrite", (s) =>
      s.put({ diagnosisId: result.diagnosis_id, userId: uid, savedAt: new Date().toISOString(), result } satisfies SavedCheck),
    );
    const mine = await listSavedChecks();
    for (const old of mine.slice(MAX_PLANS)) await withStore(PLANS, "readwrite", (s) => s.delete(old.diagnosisId));
    changed();
  } catch {
    /* not stored: the result is still on screen */
  }
}

/** Saved photo-check results of the signed-in user, newest first. */
export async function listSavedChecks(): Promise<SavedCheck[]> {
  const uid = currentUserId();
  if (uid === null) return [];
  try {
    const all = await withStore<SavedCheck[]>(PLANS, "readonly", (s) => s.getAll() as IDBRequest<SavedCheck[]>);
    return all.filter((c) => c.userId === uid).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
}

export interface FlushReport {
  sent: number;
  failed: { kind: OutboxItem["kind"]; message: string }[];
  waiting: number;
}

let flushing: Promise<FlushReport> | null = null;

/**
 * Send waiting items in order. Stops at the first network failure (still offline); an item the
 * server refuses (e.g. photo not readable) is dropped and reported, so it doesn't block the rest.
 */
export function flushOutbox(): Promise<FlushReport> {
  if (!flushing) {
    flushing = doFlush().finally(() => {
      flushing = null;
    });
  }
  return flushing;
}

async function doFlush(): Promise<FlushReport> {
  const report: FlushReport = { sent: 0, failed: [], waiting: 0 };
  const items = await listOutbox();
  let started: number | null = null; // questions queued before any conversation existed share the first new one
  for (const [i, item] of items.entries()) {
    try {
      if (item.kind === "question") {
        const r = await api.advisoryAsk({
          question: item.question,
          language: item.language,
          conversation_id: item.conversationId ?? started,
          farmer_id: item.farmerId,
        });
        if (item.conversationId === null) started = r.conversation_id;
        window.dispatchEvent(new CustomEvent(QUESTION_SENT_EVENT, { detail: { conversationId: r.conversation_id } }));
      } else {
        const file = new File([item.image], item.fileName, { type: item.imageType });
        await saveCheck(
          await api.advisoryDiagnose(file, { farm_id: item.farmId, language: item.language, capture_source: item.captureSource }),
        );
      }
      report.sent += 1;
    } catch (e) {
      if (!(e instanceof ApiError) || e.status === 401 || e.status >= 500) {
        report.waiting = items.length - i; // offline, signed out or server trouble: try again later
        break;
      }
      report.failed.push({ kind: item.kind, message: e.message });
    }
    if (item.id !== undefined) await removeItem(item.id);
  }
  if (report.sent || report.failed.length) changed();
  return report;
}

/** Sign-out: delete the outbox, saved results and the saved API copies on this device. */
export async function clearOfflineData(): Promise<void> {
  try {
    await withStore(OUTBOX, "readwrite", (s) => s.clear());
    await withStore(PLANS, "readwrite", (s) => s.clear());
  } catch {
    /* nothing stored */
  }
  try {
    if (typeof caches !== "undefined") await caches.delete(API_CACHE);
  } catch {
    /* no Cache Storage (insecure origin) */
  }
  changed();
}
