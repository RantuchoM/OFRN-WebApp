/**
 * Recordatorios locales de salida (dispositivo / PWA), sin red en el disparo.
 * Se programan al dar el alta (llegada) y se cancelan al marcar salida.
 */
import {
  ensayoEndMs,
  ENSAYO_SALIDA_PRE_MINUTES,
  ENSAYO_SALIDA_POST_MINUTES,
} from "./ensayoCheckinBanner";
import {
  buildSalidaReminderBodies,
  localSalidaNotificationTag,
  markSoftReminderFired,
  wasSoftReminderFired,
} from "./ensayoSalidaReminders";

const MSG_SCHEDULE = "ofrn-salida-schedule";
const MSG_CANCEL = "ofrn-salida-cancel";
const MSG_PING = "ofrn-salida-ping";

/** Timeouts en el hilo de la página (mientras el proceso de la PWA vive). */
const pageTimeouts = new Map();

function pageTimeoutKey(eventoId, tipo) {
  return `${eventoId}:${tipo}`;
}

function clearPageTimeoutsForEvento(eventoId) {
  const prefix = `${eventoId}:`;
  for (const [key, handle] of [...pageTimeouts.entries()]) {
    if (key.startsWith(prefix)) {
      clearTimeout(handle);
      pageTimeouts.delete(key);
    }
  }
}

/**
 * @param {object} evt
 * @returns {Array<{ tipo: 'pre_cierre'|'post_aviso', atMs: number, title: string, body: string, tag: string, eventoId: number|string, url: string }>}
 */
export function buildLocalSalidaReminderPayloads(evt, nowMs = Date.now()) {
  if (!evt?.id) return [];
  const end = ensayoEndMs(evt);
  if (!Number.isFinite(end)) return [];

  const preAt = end - ENSAYO_SALIDA_PRE_MINUTES * 60 * 1000;
  const postAt = end + ENSAYO_SALIDA_POST_MINUTES * 60 * 1000;
  /** Gracia: si llegó justo al minuto, aún disparamos inmediato. */
  const GRACE_MS = 30_000;
  const out = [];

  for (const { tipo, atMs } of [
    { tipo: "pre_cierre", atMs: preAt },
    { tipo: "post_aviso", atMs: postAt },
  ]) {
    // No programar pre si ya pasó por ≥ gracia (evitar spam al reabrir tarde)
    if (tipo === "pre_cierre" && nowMs > atMs + GRACE_MS) continue;
    // Post sí puede quedar “a mostrar ya” si el ensayo recién terminó
    if (tipo === "post_aviso" && nowMs > atMs + 12 * 60 * 60 * 1000) continue;

    const { title, body } = buildSalidaReminderBodies(evt, tipo);
    out.push({
      eventoId: evt.id,
      tipo,
      atMs: nowMs >= atMs ? nowMs + 800 : atMs,
      title,
      body,
      tag: localSalidaNotificationTag(evt.id, tipo),
      url: "/",
    });
  }
  return out;
}

async function ensureNotificationPermission() {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return false;
  }
  let permission = Notification.permission;
  if (permission === "default") {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return false;
    }
  }
  return permission === "granted";
}

async function postToServiceWorker(message) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sw = reg.active || navigator.serviceWorker.controller;
    if (!sw) return false;
    sw.postMessage(message);
    return true;
  } catch {
    return false;
  }
}

async function showViaRegistration(payload) {
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg?.showNotification) {
        await reg.showNotification(payload.title, {
          body: payload.body,
          tag: payload.tag,
          renotify: true,
          data: {
            url: payload.url || "/",
            eventoId: payload.eventoId,
            tipo: payload.tipo,
            source: "local-salida-page",
          },
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
        });
        markSoftReminderFired(payload.eventoId, payload.tipo);
        return true;
      }
    }
    // eslint-disable-next-line no-new
    new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag,
    });
    markSoftReminderFired(payload.eventoId, payload.tipo);
    return true;
  } catch {
    return false;
  }
}

function armPageTimeout(payload) {
  const key = pageTimeoutKey(payload.eventoId, payload.tipo);
  const prev = pageTimeouts.get(key);
  if (prev != null) clearTimeout(prev);

  const delay = Number(payload.atMs) - Date.now();
  const run = () => {
    pageTimeouts.delete(key);
    if (wasSoftReminderFired(payload.eventoId, payload.tipo)) return;
    showViaRegistration(payload);
  };

  if (delay <= 0) {
    run();
    return;
  }
  const handle = setTimeout(run, Math.min(delay, 2_147_483_647));
  pageTimeouts.set(key, handle);
}

/**
 * Programa recordatorios locales para un ensayo con llegada y sin salida.
 * Idempotente: reescribe el plan del evento.
 *
 * @param {object} evt
 * @param {{ registrado_at?: string, salida_at?: string, justificado?: boolean }|null} [estado]
 * @returns {Promise<{ ok: boolean, reason?: string, scheduled?: number }>}
 */
export async function scheduleLocalSalidaReminders(evt, estado = null) {
  if (!evt?.id) return { ok: false, reason: "no_evento" };
  if (estado?.salida_at || estado?.justificado) {
    await cancelLocalSalidaReminders(evt.id);
    return { ok: false, reason: "ya_cerrado" };
  }
  if (!estado?.registrado_at) {
    return { ok: false, reason: "sin_llegada" };
  }

  const granted = await ensureNotificationPermission();
  if (!granted) return { ok: false, reason: "permission" };

  const reminders = buildLocalSalidaReminderPayloads(evt);
  if (!reminders.length) {
    await cancelLocalSalidaReminders(evt.id);
    return { ok: false, reason: "nothing_to_schedule" };
  }

  clearPageTimeoutsForEvento(evt.id);
  for (const r of reminders) {
    armPageTimeout(r);
  }

  await postToServiceWorker({
    type: MSG_SCHEDULE,
    eventoId: evt.id,
    reminders,
  });

  return { ok: true, scheduled: reminders.length };
}

/**
 * Cancela alarms locales de un evento (tras marcar salida o justificado).
 * @param {number|string} eventoId
 */
export async function cancelLocalSalidaReminders(eventoId) {
  if (eventoId == null) return;
  clearPageTimeoutsForEvento(eventoId);
  await postToServiceWorker({
    type: MSG_CANCEL,
    eventoId,
  });
  // Cerrar notificaciones visibles del evento
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const tags = [
        localSalidaNotificationTag(eventoId, "pre_cierre"),
        localSalidaNotificationTag(eventoId, "post_aviso"),
        `ensayo-salida-${eventoId}-pre_cierre`,
        `ensayo-salida-${eventoId}-post_aviso`,
      ];
      for (const tag of tags) {
        const list = await reg.getNotifications({ tag });
        for (const n of list) n.close();
      }
    }
  } catch {
    /* ignore */
  }
}

/** Pide al SW rehidratar timeouts (p.ej. al volver a la app). */
export async function pingLocalSalidaReminders() {
  await postToServiceWorker({ type: MSG_PING });
}

// Re-export tags/bodies por conveniencia de import único en call sites
export { buildSalidaReminderBodies, localSalidaNotificationTag };
