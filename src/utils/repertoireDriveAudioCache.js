/**
 * Caché de audios Drive (IndexedDB) para no re-descargar en el día.
 * Clave = drive file id. TTL 24 h.
 */

const DB_NAME = "ofrn-repertoire-drive-audio";
const STORE = "files";
const DB_VERSION = 1;

export const DRIVE_AUDIO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let dbPromise = null;
const inflight = new Map();

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    const timer = setTimeout(() => {
      dbPromise = null;
      reject(new Error("indexedDB timeout"));
    }, 1500);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "fileId" });
      }
    };
    req.onsuccess = () => {
      clearTimeout(timer);
      resolve(req.result);
    };
    req.onerror = () => {
      clearTimeout(timer);
      dbPromise = null;
      reject(req.error);
    };
    req.onblocked = () => {
      clearTimeout(timer);
      dbPromise = null;
      reject(new Error("indexedDB blocked"));
    };
  });
  return dbPromise;
}

function storeTx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function pruneExpiredDriveAudioCache(now = Date.now()) {
  try {
    const db = await openDb();
    const rows = await requestToPromise(storeTx(db, "readonly").getAll());
    const expired = (rows || []).filter(
      (row) =>
        !row?.cachedAt || now - row.cachedAt > DRIVE_AUDIO_CACHE_TTL_MS,
    );
    if (!expired.length) return;
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    expired.forEach((row) => store.delete(row.fileId));
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* private mode / quota */
  }
}

export async function readCachedDriveAudioBlob(fileId) {
  if (!fileId) return null;
  try {
    const db = await openDb();
    const row = await requestToPromise(storeTx(db, "readonly").get(fileId));
    if (!row?.blob) return null;
    if (Date.now() - (row.cachedAt || 0) > DRIVE_AUDIO_CACHE_TTL_MS) {
      try {
        await requestToPromise(storeTx(db, "readwrite").delete(fileId));
      } catch {
        /* ignore */
      }
      return null;
    }
    return row.blob;
  } catch {
    return null;
  }
}

export async function writeCachedDriveAudioBlob(fileId, blob) {
  if (!fileId || !blob) return;
  try {
    const db = await openDb();
    await requestToPromise(
      storeTx(db, "readwrite").put({
        fileId,
        blob,
        mime: blob.type || "application/octet-stream",
        cachedAt: Date.now(),
      }),
    );
  } catch {
    /* QuotaExceededError u origen privado */
  }
}

/**
 * Devuelve un object URL (memoria + IndexedDB 24 h).
 * `memory` es un Map fileId → objectURL del reproductor montado.
 */
export async function getCachedDriveAudioObjectUrl(
  fileId,
  memory,
  fetchBlob,
) {
  if (!fileId) throw new Error("Archivo de Drive inválido.");
  const mem = memory?.get(fileId);
  if (mem) return mem;

  const pending = inflight.get(fileId);
  if (pending) return pending;

  const job = (async () => {
    let cached = null;
    try {
      cached = await Promise.race([
        readCachedDriveAudioBlob(fileId),
        new Promise((resolve) => setTimeout(() => resolve(null), 800)),
      ]);
    } catch {
      cached = null;
    }
    const blob = cached || (await fetchBlob());
    if (!cached) {
      void writeCachedDriveAudioBlob(fileId, blob);
    }
    const url = URL.createObjectURL(blob);
    memory?.set(fileId, url);
    return url;
  })();

  inflight.set(fileId, job);
  try {
    return await job;
  } finally {
    inflight.delete(fileId);
  }
}

let prunedOnce = false;
export function ensureDriveAudioCachePruned() {
  if (prunedOnce) return;
  prunedOnce = true;
  pruneExpiredDriveAudioCache();
}
