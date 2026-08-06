/**
 * Recordatorios locales de ensayo (inicio/llegada y salida), sin red.
 * Programados desde la app; cancelados al marcar alta/salida según corresponda.
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

const SALIDA_TIPOS = ["pre_cierre", "post_aviso"];
const INICIO_TIPOS = ["pre_inicio"];

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

async function idbDeleteByEvento(eventoId, tipos = null) {
  const all = await idbGetAll();
  const sid = String(eventoId);
  const tipoSet = Array.isArray(tipos) && tipos.length ? new Set(tipos) : null;
  await Promise.all(
    all
      .filter((r) => {
        if (String(r.eventoId) !== sid) return false;
        if (tipoSet && !tipoSet.has(r.tipo)) return false;
        return true;
      })
      .map((r) => idbDeleteKey(r.key)),
  );
}

async function idbDeleteByTipos(tipos) {
  if (!Array.isArray(tipos) || !tipos.length) return;
  const tipoSet = new Set(tipos);
  const all = await idbGetAll();
  await Promise.all(
    all.filter((r) => tipoSet.has(r.tipo)).map((r) => idbDeleteKey(r.key)),
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

function clearTimeoutsMatching({ eventoId = null, tipos = null } = {}) {
  const tipoSet = Array.isArray(tipos) && tipos.length ? new Set(tipos) : null;
  const sid = eventoId != null ? String(eventoId) : null;
  for (const [key, t] of [...localTimeouts.entries()]) {
    const [eid, tipo] = String(key).split(":");
    if (sid != null && eid !== sid) continue;
    if (tipoSet && !tipoSet.has(tipo)) continue;
    clearTimeout(t);
    localTimeouts.delete(key);
  }
}

function defaultTagFor(tipo, eventoId) {
  if (tipo === "pre_inicio") return `ensayo-inicio-pre-${eventoId}`;
  if (tipo === "pre_cierre") return `ensayo-salida-pre-${eventoId}`;
  if (tipo === "post_aviso") return `ensayo-salida-post-${eventoId}`;
  return `ensayo-${tipo}-${eventoId}`;
}

function tagsForEventoTipos(eventoId, tipos) {
  const list = Array.isArray(tipos) && tipos.length ? tipos : [
    ...SALIDA_TIPOS,
    ...INICIO_TIPOS,
    "pre_cierre",
    "post_aviso",
  ];
  const tags = [];
  for (const tipo of list) {
    tags.push(defaultTagFor(tipo, eventoId));
    // legado salida
    if (tipo === "pre_cierre") {
      tags.push(`ensayo-salida-${eventoId}-pre_cierre`);
    }
    if (tipo === "post_aviso") {
      tags.push(`ensayo-salida-${eventoId}-post_aviso`);
    }
  }
  return tags;
}

async function closeNotificationsByTags(tags) {
  if (!tags?.length) return;
  try {
    for (const tag of tags) {
      const list = await self.registration.getNotifications({ tag });
      for (const n of list) n.close();
    }
  } catch {
    /* ignore */
  }
}

async function showImmediate(record) {
  const title = record.title || "OFRN";
  const fallbackBody =
    record.tipo === "pre_inicio"
      ? "Recordá marcar el ingreso al ensayo"
      : "Recordá marcar la salida del ensayo";
  const options = {
    body: record.body || fallbackBody,
    tag: record.tag || defaultTagFor(record.tipo, record.eventoId),
    renotify: true,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: {
      url: record.url || "/",
      eventoId: record.eventoId,
      tipo: record.tipo,
      source: "local-ensayo",
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
        source: "local-ensayo-trigger",
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
  // setTimeout max ~24.8 days
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

function normalizeTipo(rawTipo) {
  if (rawTipo === "post_aviso") return "post_aviso";
  if (rawTipo === "pre_inicio") return "pre_inicio";
  if (rawTipo === "pre_cierre") return "pre_cierre";
  // legado / default salida
  return rawTipo || "pre_cierre";
}

async function handleSchedule(payload) {
  const reminders = Array.isArray(payload?.reminders) ? payload.reminders : [];
  const eventoId = payload?.eventoId;
  const replaceTipos = Array.isArray(payload?.replaceTipos)
    ? payload.replaceTipos
    : null;
  const clearEventoTipos = Array.isArray(payload?.clearEventoTipos)
    ? payload.clearEventoTipos
    : null;
  // Por defecto limpia todo el evento (legado salida). Opt-out con clearEventoFirst:false.
  const clearEventoFirst = payload?.clearEventoFirst !== false;

  if (replaceTipos?.length) {
    clearTimeoutsMatching({ tipos: replaceTipos });
    await idbDeleteByTipos(replaceTipos).catch(() => {});
    // Cerrar notifs visibles de esos tipos (cualquier evento)
    try {
      const shown = await self.registration.getNotifications({});
      for (const n of shown) {
        const tag = String(n.tag || "");
        if (
          replaceTipos.includes("pre_inicio") &&
          tag.startsWith("ensayo-inicio-")
        ) {
          n.close();
        }
        if (
          (replaceTipos.includes("pre_cierre") ||
            replaceTipos.includes("post_aviso")) &&
          (tag.startsWith("ensayo-salida-pre-") ||
            tag.startsWith("ensayo-salida-post-") ||
            /ensayo-salida-\d+-(pre_cierre|post_aviso)/.test(tag))
        ) {
          n.close();
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (eventoId != null && clearEventoTipos?.length) {
    clearTimeoutsMatching({ eventoId, tipos: clearEventoTipos });
    await idbDeleteByEvento(eventoId, clearEventoTipos).catch(() => {});
    await closeNotificationsByTags(
      tagsForEventoTipos(eventoId, clearEventoTipos),
    );
  } else if (eventoId != null && clearEventoFirst) {
    clearTimeoutsMatching({ eventoId });
    await idbDeleteByEvento(eventoId).catch(() => {});
    await closeNotificationsByTags(
      tagsForEventoTipos(eventoId, [...SALIDA_TIPOS, ...INICIO_TIPOS]),
    );
  }

  for (const raw of reminders) {
    const tipo = normalizeTipo(raw.tipo);
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
      tag: raw.tag || defaultTagFor(tipo, eid),
      url: raw.url || "/",
    };
    await idbPut(record).catch(() => {});
    const usedTrigger = await tryScheduleWithTrigger(record);
    // Siempre armar timeout como red de seguridad
    if (!usedTrigger || Number(record.atMs) <= Date.now() + 1500) {
      armTimeout(record);
    } else {
      armTimeout(record);
    }
  }
}

async function handleCancel(payload) {
  const eventoId = payload?.eventoId;
  const tipos = Array.isArray(payload?.tipos) ? payload.tipos : null;

  if (eventoId == null && tipos?.length) {
    clearTimeoutsMatching({ tipos });
    await idbDeleteByTipos(tipos).catch(() => {});
    try {
      const shown = await self.registration.getNotifications({});
      for (const n of shown) {
        const tag = String(n.tag || "");
        if (tipos.includes("pre_inicio") && tag.startsWith("ensayo-inicio-")) {
          n.close();
        }
        if (
          (tipos.includes("pre_cierre") || tipos.includes("post_aviso")) &&
          (tag.startsWith("ensayo-salida-pre-") ||
            tag.startsWith("ensayo-salida-post-") ||
            /ensayo-salida-\d+-(pre_cierre|post_aviso)/.test(tag))
        ) {
          n.close();
        }
      }
    } catch {
      /* ignore */
    }
    return;
  }

  if (eventoId == null) return;

  clearTimeoutsMatching({ eventoId, tipos });
  await idbDeleteByEvento(eventoId, tipos).catch(() => {});
  await closeNotificationsByTags(
    tagsForEventoTipos(
      eventoId,
      tipos || [...SALIDA_TIPOS, ...INICIO_TIPOS],
    ),
  );
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
