/**
 * Ciclo de vida soft-delete ↔ check-in de ensayos (tipo 13).
 * Al marcar is_deleted, invalida banner, alarmas locales y estado en memoria.
 */
import {
  cancelLocalInicioReminders,
  cancelAllLocalInicioReminders,
} from "./ensayoLocalInicioReminders";
import { cancelLocalSalidaReminders } from "./ensayoLocalSalidaReminders";

export const ENSAYO_EVENTO_SOFT_DELETED = "ofrn:ensayo-evento-soft-deleted";

/**
 * @param {number|string|Array<number|string>|null|undefined} eventoIds
 */
export function notifyEnsayoEventoSoftDeleted(eventoIds) {
  const ids = (Array.isArray(eventoIds) ? eventoIds : [eventoIds])
    .map((x) => Number(x))
    .filter((n) => !Number.isNaN(n) && n > 0);
  if (!ids.length) return;

  for (const id of ids) {
    try {
      cancelLocalSalidaReminders(id);
    } catch {
      /* ignore */
    }
    try {
      cancelLocalInicioReminders(id);
    } catch {
      /* ignore */
    }
  }

  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ENSAYO_EVENTO_SOFT_DELETED, {
      detail: { eventoIds: ids },
    }),
  );
}

/** Tras soft-delete masivo sin IDs claros: limpiar alarmas de inicio pendientes. */
export function notifyEnsayoEventosSoftDeletedUnknown() {
  try {
    cancelAllLocalInicioReminders();
  } catch {
    /* ignore */
  }
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ENSAYO_EVENTO_SOFT_DELETED, {
      detail: { eventoIds: [], refreshAll: true },
    }),
  );
}
