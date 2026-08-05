import {
  ensayoBannerTitle,
  ensayoBannerSubtitle,
  ENSAYO_SALIDA_PRE_MINUTES,
  ENSAYO_SALIDA_POST_MINUTES,
  resolveSalidaUrgency,
} from "./ensayoCheckinBanner";

const STORAGE_PREFIX = "ofrn:ensayo-salida-soft:";

/**
 * @param {number|string} eventoId
 * @param {'pre_cierre'|'post_aviso'} tipo
 */
export function softReminderStorageKey(eventoId, tipo) {
  return `${STORAGE_PREFIX}${eventoId}:${tipo}`;
}

export function wasSoftReminderFired(eventoId, tipo) {
  try {
    return sessionStorage.getItem(softReminderStorageKey(eventoId, tipo)) === "1";
  } catch {
    return false;
  }
}

export function markSoftReminderFired(eventoId, tipo) {
  try {
    sessionStorage.setItem(softReminderStorageKey(eventoId, tipo), "1");
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Mapea urgencia de banner a tipo de soft-notif única por sesión.
 * @param {string} urgency
 * @returns {'pre_cierre'|'post_aviso'|null}
 */
export function softReminderTipoFromUrgency(urgency) {
  if (urgency === "pre_cierre") return "pre_cierre";
  if (urgency === "post_aviso" || urgency === "post_hora") {
    // post_hora no dispara soft aún; post_aviso sí
    return urgency === "post_aviso" ? "post_aviso" : null;
  }
  return null;
}

function buildSoftBodies(evt, tipo) {
  const title =
    tipo === "pre_cierre"
      ? "Cierre de ensayo en breve"
      : "Falta marcar la salida";
  const name = ensayoBannerTitle(evt);
  const sub = ensayoBannerSubtitle(evt);
  const label = [name, sub].filter(Boolean).join(" · ");
  const body =
    tipo === "pre_cierre"
      ? `Quedan ~${ENSAYO_SALIDA_PRE_MINUTES} min para el fin programado de «${label}». Recordá registrar la hora de salida.`
      : ENSAYO_SALIDA_POST_MINUTES > 0
        ? `Pasaron ${ENSAYO_SALIDA_POST_MINUTES} min del fin de «${label}» y aún no registraste la salida.`
        : `Llegó el fin programado de «${label}» y aún no registraste la salida.`;
  return { title, body };
}

/**
 * Notification API solo con pestaña/app abierta (sin push backend).
 * Una vez por (evento, tipo) en la sesión del navegador.
 *
 * @param {object} evt
 * @param {'pre_cierre'|'post_aviso'} tipo
 * @returns {Promise<boolean>} true si se mostró
 */
export async function maybeFireSoftSalidaNotification(evt, tipo) {
  if (!evt?.id || (tipo !== "pre_cierre" && tipo !== "post_aviso")) return false;
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return false;
  }
  if (wasSoftReminderFired(evt.id, tipo)) return false;

  // Solo si la pestaña está visible o la app está en foreground cercano
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
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
  if (permission !== "granted") return false;

  const { title, body } = buildSoftBodies(evt, tipo);
  try {
    // Preferir SW showNotification si hay registration (mejor en móvil)
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg?.showNotification) {
        await reg.showNotification(title, {
          body,
          tag: `ensayo-salida-${evt.id}-${tipo}`,
          renotify: true,
          data: { url: "/", tipo, eventoId: evt.id },
        });
        markSoftReminderFired(evt.id, tipo);
        return true;
      }
    }
    // eslint-disable-next-line no-new
    new Notification(title, {
      body,
      tag: `ensayo-salida-${evt.id}-${tipo}`,
    });
    markSoftReminderFired(evt.id, tipo);
    return true;
  } catch {
    return false;
  }
}

/**
 * Evalúa y dispara soft-notif según urgencia actual.
 * @param {object} evt
 * @param {object|null} estado
 * @param {Date} [now]
 */
export async function maybeFireSoftFromEstado(evt, estado, now = new Date()) {
  const urgency = resolveSalidaUrgency(evt, estado, now);
  const tipo = softReminderTipoFromUrgency(urgency);
  if (!tipo) return false;
  return maybeFireSoftSalidaNotification(evt, tipo);
}
