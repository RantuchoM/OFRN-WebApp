/**
 * Recordatorios locales de inicio/llegada (dispositivo / PWA), sin red en el disparo.
 * Se programan al abrir la app (próximo ensayo convocado) y se cancelan al marcar alta.
 */
import {
  ensayoStartMs,
  ENSAYO_CHECKIN_PRE_MINUTES,
} from "./ensayoCheckinBanner";
import {
  buildInicioReminderBodies,
  localInicioNotificationTag,
} from "./ensayoInicioReminders";

const MSG_SCHEDULE = "ofrn-salida-schedule";
const MSG_CANCEL = "ofrn-salida-cancel";
const MSG_PING = "ofrn-salida-ping";

const INICIO_TIPOS = ["pre_inicio"];

/** Timeouts en el hilo de la página (mientras el proceso de la PWA vive). */
const pageTimeouts = new Map();

function pageTimeoutKey(eventoId, tipo) {
  return `inicio:${eventoId}:${tipo}`;
}

function clearPageTimeoutsForEvento(eventoId) {
  const prefix = `inicio:${eventoId}:`;
  for (const [key, handle] of [...pageTimeouts.entries()]) {
    if (key.startsWith(prefix)) {
      clearTimeout(handle);
      pageTimeouts.delete(key);
    }
  }
}

function clearAllInicioPageTimeouts() {
  for (const [key, handle] of [...pageTimeouts.entries()]) {
    if (key.startsWith("inicio:")) {
      clearTimeout(handle);
      pageTimeouts.delete(key);
    }
  }
}

/**
 * @param {object} evt
 * @returns {Array<{ tipo: 'pre_inicio', atMs: number, title: string, body: string, tag: string, eventoId: number|string, url: string }>}
 */
export function buildLocalInicioReminderPayloads(evt, nowMs = Date.now()) {
  if (!evt?.id) return [];
  const start = ensayoStartMs(evt);
  if (!Number.isFinite(start)) return [];

  const preAt = start - ENSAYO_CHECKIN_PRE_MINUTES * 60 * 1000;
  /** Gracia: si abrió justo en la ventana, aún disparamos. */
  const GRACE_MS = 60_000;
  // No programar si el ensayo ya terminó hace rato (lo resuelve el sync)
  const endGrace = 12 * 60 * 60 * 1000;
  if (nowMs > start + endGrace) return [];
  // Si T−15 ya pasó por ≥ gracia, disparar casi inmediato (recordar cargar)
  if (nowMs > preAt + GRACE_MS && nowMs > start + GRACE_MS) {
    // Ya pasó el inicio con margen: solo si aún es el día / ventana útil
    // (sync ya filtró ensayos terminados; acá avisamos “marcá ingreso”)
  }

  const atMs = nowMs >= preAt ? nowMs + 800 : preAt;
  const { title, body } = buildInicioReminderBodies(evt, "pre_inicio");
  return [
    {
      eventoId: evt.id,
      tipo: "pre_inicio",
      atMs,
      title,
      body,
      tag: localInicioNotificationTag(evt.id, "pre_inicio"),
      url: "/",
    },
  ];
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
            source: "local-inicio-page",
          },
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
        });
        return true;
      }
    }
    // eslint-disable-next-line no-new
    new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag,
    });
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
 * Programa el recordatorio local del próximo ensayo (reemplaza cualquier inicio previo).
 * @param {object} evt
 * @returns {Promise<{ ok: boolean, reason?: string, scheduled?: number }>}
 */
export async function scheduleLocalInicioReminders(evt) {
  if (!evt?.id) return { ok: false, reason: "no_evento" };

  const granted = await ensureNotificationPermission();
  if (!granted) return { ok: false, reason: "permission" };

  const reminders = buildLocalInicioReminderPayloads(evt);
  if (!reminders.length) {
    await cancelAllLocalInicioReminders();
    return { ok: false, reason: "nothing_to_schedule" };
  }

  clearAllInicioPageTimeouts();
  for (const r of reminders) {
    armPageTimeout(r);
  }

  await postToServiceWorker({
    type: MSG_SCHEDULE,
    eventoId: evt.id,
    reminders,
    /** Solo un “próximo ensayo” a la vez */
    replaceTipos: INICIO_TIPOS,
    /** No borrar alarms de salida del mismo evento al reprogramar inicio */
    clearEventoFirst: false,
  });

  return { ok: true, scheduled: reminders.length };
}

/**
 * Cancela alarms locales de inicio de un evento.
 * @param {number|string} eventoId
 */
export async function cancelLocalInicioReminders(eventoId) {
  if (eventoId == null) return;
  clearPageTimeoutsForEvento(eventoId);
  await postToServiceWorker({
    type: MSG_CANCEL,
    eventoId,
    tipos: INICIO_TIPOS,
  });
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const tags = [localInicioNotificationTag(eventoId, "pre_inicio")];
      for (const tag of tags) {
        const list = await reg.getNotifications({ tag });
        for (const n of list) n.close();
      }
    }
  } catch {
    /* ignore */
  }
}

/** Cancela todos los recordatorios locales de inicio (cualquier evento). */
export async function cancelAllLocalInicioReminders() {
  clearAllInicioPageTimeouts();
  await postToServiceWorker({
    type: MSG_CANCEL,
    tipos: INICIO_TIPOS,
  });
}

/** Pide al SW rehidratar timeouts (p.ej. al volver a la app). */
export async function pingLocalInicioReminders() {
  await postToServiceWorker({ type: MSG_PING });
}

export { localInicioNotificationTag, buildInicioReminderBodies };
