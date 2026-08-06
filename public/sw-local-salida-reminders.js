/**
 * Recordatorios locales de salida de ensayo (sin red).
 * Programados al check-in / fase activo; cancelados al marcar salida.
 * Cargado vía workbox.importScripts junto a sw-push-handlers.js.
 *
 * - TimestampTrigger cuando el motor lo soporta (Chrome/Android experimental).
 * - IndexedDB + setTimeout + reintento en cada wake del SW como fallback.
 */
/* eslint-disable no-restricted-globals */

const OFRN_LOCAL_DB = "ofrn-local-salida-reminders";
const OFRN_LOCAL_STORE = "reminders";
const OFRN_LOCAL_DB_VER = 1;
const MSG_SCHEDULE = "ofrn-salida-schedule";
const MSG_CANCEL = "ofrn-salida-cancel";
const MSG_PING = "ofrn-salida-ping";

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const localTimeouts = new Map();

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFRN_LOCAL_DB, OFRN_LOCAL_DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OFRN_LOCAL_STORE)) {
        db.createObjectStore(OFRN_LOCAL_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("idb open failed"));
  });
}

async function idbPut(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFRN_LOCAL_STORE, "readwrite");
    tx.objectStore(OFRN_LOCAL_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFRN_LOCAL_STORE, "readonly");
    const req = tx.objectStore(OFRN_LOCAL_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbDeleteKey(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFRN_LOCAL_STORE, "readwrite");
    tx.objectStore(OFRN_LOCAL_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDeleteByEvento(eventoId) {
  const all = await idbGetAll();
  const sid = String(eventoId);
  await Promise.all(
    all
      .filter((r) => String(r.eventoId) === sid)
      .map((r) => idbDeleteKey(r.key)),
  );
}

function supportsTimestampTrigger() {
  try {
    return (
      typeof TimestampTrigger !== "undefined" &&
      typeof Notification !== "undefined" &&
      "showTrigger" in Notification.prototype
    );
  } catch {
    return false;
  }
}

function reminderKey(eventoId, tipo) {
  return `${eventoId}:${tipo}`;
}

function clearTimeoutForKey(key) {
  const t = localTimeouts.get(key);
  if (t != null) {
    clearTimeout(t);
    localTimeouts.delete(key);
  }
}

async function showImmediate(record) {
  const title = record.title || "OFRN";
  const options = {
    body: record.body || "Recordá marcar la salida del ensayo",
    tag: record.tag || `ensayo-salida-${record.eventoId}`,
    renotify: true,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: {
      url: record.url || "/",
      eventoId: record.eventoId,
      tipo: record.tipo,
      source: "local-salida",
    },
  };
  await self.registration.showNotification(title, options);
}

async function tryScheduleWithTrigger(record) {
  if (!supportsTimestampTrigger()) return false;
  const atMs = Number(record.atMs);
  if (!Number.isFinite(atMs) || atMs <= Date.now() + 1500) return false;
  try {
    // TimestampTrigger is experimental; keep try/catch for older Chromium builds.
    // eslint-disable-next-line no-undef
    const trigger = new TimestampTrigger(atMs);
    await self.registration.showNotification(record.title || "OFRN", {
      body: record.body || "",
      tag: record.tag,
      renotify: true,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      showTrigger: trigger,
      data: {
        url: record.url || "/",
        eventoId: record.eventoId,
        tipo: record.tipo,
        source: "local-salida-trigger",
      },
    });
    return true;
  } catch {
    return false;
  }
}

function armTimeout(record) {
  const key = record.key;
  clearTimeoutForKey(key);
  const delay = Number(record.atMs) - Date.now();
  if (!Number.isFinite(delay)) return;
  if (delay <= 0) {
    fireAndConsume(record);
    return;
  }
  // setTimeout max ~24.8 days; ensayos son el mismo día.
  const safeDelay = Math.min(delay, 2_147_483_647);
  const handle = setTimeout(() => {
    localTimeouts.delete(key);
    fireAndConsume(record);
  }, safeDelay);
  localTimeouts.set(key, handle);
}

async function fireAndConsume(record) {
  try {
    await showImmediate(record);
  } catch {
    /* permission / closed */
  }
  try {
    await idbDeleteKey(record.key);
  } catch {
    /* ignore */
  }
}

/**
 * Reactiva timeouts y dispara vencidos. No re-arma TimestampTrigger
 * (el SO / Chrome lo conserva si se programó antes).
 */
async function rehydrateFromIdb() {
  let all = [];
  try {
    all = await idbGetAll();
  } catch {
    return;
  }
  const now = Date.now();
  for (const record of all) {
    if (!record?.key) continue;
    const atMs = Number(record.atMs);
    if (!Number.isFinite(atMs)) {
      await idbDeleteKey(record.key).catch(() => {});
      continue;
    }
    if (atMs <= now + 500) {
      await fireAndConsume(record);
      continue;
    }
    if (!localTimeouts.has(record.key)) {
      armTimeout(record);
    }
  }
}

async function handleSchedule(payload) {
  const reminders = Array.isArray(payload?.reminders) ? payload.reminders : [];
  const eventoId = payload?.eventoId;
  if (eventoId != null) {
    // Limpiar timeouts previos de este evento
    for (const [key, t] of [...localTimeouts.entries()]) {
      if (key.startsWith(`${eventoId}:`)) {
        clearTimeout(t);
        localTimeouts.delete(key);
      }
    }
    await idbDeleteByEvento(eventoId).catch(() => {});
    // Cancelar notifs programadas con tag (Triggers / previas)
    try {
      const shown = await self.registration.getNotifications({
        // sin filtro tag limpia solo las de tags conocidas más abajo
      });
      for (const n of shown) {
        if (
          n.tag === `ensayo-salida-pre-${eventoId}` ||
          n.tag === `ensayo-salida-post-${eventoId}` ||
          n.tag === `ensayo-salida-${eventoId}-pre_cierre` ||
          n.tag === `ensayo-salida-${eventoId}-post_aviso`
        ) {
          n.close();
        }
      }
    } catch {
      /* ignore */
    }
  }

  for (const raw of reminders) {
    const tipo = raw.tipo === "post_aviso" ? "post_aviso" : "pre_cierre";
    const eid = raw.eventoId ?? eventoId;
    if (eid == null || !raw.atMs) continue;
    const key = reminderKey(eid, tipo);
    const record = {
      key,
      eventoId: eid,
      tipo,
      atMs: Number(raw.atMs),
      title: raw.title || "OFRN",
      body: raw.body || "",
      tag:
        raw.tag ||
        (tipo === "pre_cierre"
          ? `ensayo-salida-pre-${eid}`
          : `ensayo-salida-post-${eid}`),
      url: raw.url || "/",
    };
    await idbPut(record).catch(() => {});
    const usedTrigger = await tryScheduleWithTrigger(record);
    // Siempre armar timeout como red de seguridad (si Triggers falla o no hay API)
    if (!usedTrigger || Number(record.atMs) <= Date.now() + 1500) {
      armTimeout(record);
    } else {
      // Triggers ok: igual timeout por si el flag no honra la alarma
      armTimeout(record);
    }
  }
}

async function handleCancel(payload) {
  const eventoId = payload?.eventoId;
  if (eventoId == null) return;
  for (const [key, t] of [...localTimeouts.entries()]) {
    if (key.startsWith(`${eventoId}:`)) {
      clearTimeout(t);
      localTimeouts.delete(key);
    }
  }
  await idbDeleteByEvento(eventoId).catch(() => {});
  try {
    const tags = [
      `ensayo-salida-pre-${eventoId}`,
      `ensayo-salida-post-${eventoId}`,
      `ensayo-salida-${eventoId}-pre_cierre`,
      `ensayo-salida-${eventoId}-post_aviso`,
    ];
    for (const tag of tags) {
      const list = await self.registration.getNotifications({ tag });
      for (const n of list) n.close();
    }
  } catch {
    /* ignore */
  }
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  const type = data.type;
  if (type === MSG_SCHEDULE) {
    event.waitUntil(handleSchedule(data));
  } else if (type === MSG_CANCEL) {
    event.waitUntil(handleCancel(data));
  } else if (type === MSG_PING) {
    event.waitUntil(rehydrateFromIdb());
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(rehydrateFromIdb());
});

/** Rehidratar con throttle al despertar por navegación/fetch (sin bloquear respuestas). */
let lastRehydrateMs = 0;
self.addEventListener("fetch", () => {
  const now = Date.now();
  if (now - lastRehydrateMs < 45_000) return;
  lastRehydrateMs = now;
  rehydrateFromIdb().catch(() => {});
});
