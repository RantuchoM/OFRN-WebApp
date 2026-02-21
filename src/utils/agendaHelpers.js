import {
  parseISO,
  isPast,
  differenceInDays,
  differenceInHours,
} from "date-fns";
import {
  getTodayDateStringLocal,
  getCurrentTimeLocal,
  timeStringToMinutes,
} from "./dates";

/**
 * Determina dónde dibujar la línea "ahora" en la agenda:
 * - { type: 'inside', eventId, progress } si estamos dentro de un evento (progress 0..1)
 * - { type: 'between', prevId, nextId } si el último evento ya terminó y estamos entre ese y el siguiente
 * - null si no hay evento "actual" hoy
 * Con hora_fin: progress = (now - inicio) / (fin - inicio).
 * Sin hora_fin: progress = (now - inicio) / (siguiente.inicio - inicio).
 *
 * @param {Array} filteredItems - Lista de eventos ya filtrados por fecha/categoría
 * @returns {{ type: 'inside', eventId: string, progress: number } | { type: 'between', prevId: string, nextId: string } | null}
 */
export function getNowLinePlacement(filteredItems) {
  const today = getTodayDateStringLocal();
  const nowMin = timeStringToMinutes(getCurrentTimeLocal());
  const todayEvents = filteredItems
    .filter((i) => !i.isProgramMarker && i.fecha === today)
    .sort(
      (a, b) =>
        timeStringToMinutes(a.hora_inicio) - timeStringToMinutes(b.hora_inicio),
    );
  if (todayEvents.length === 0) return null;

  let lastStarted = null;
  for (const evt of todayEvents) {
    const startMin = timeStringToMinutes(evt.hora_inicio);
    if (nowMin >= startMin) lastStarted = evt;
  }
  if (!lastStarted) return null;

  const startMin = timeStringToMinutes(lastStarted.hora_inicio);
  const endMin = lastStarted.hora_fin
    ? timeStringToMinutes(lastStarted.hora_fin)
    : null;

  if (endMin != null && nowMin > endMin) {
    const nextIdx = todayEvents.findIndex((e) => e.id === lastStarted.id) + 1;
    const nextEvt = todayEvents[nextIdx];
    if (nextEvt) {
      return { type: "between", prevId: lastStarted.id, nextId: nextEvt.id };
    }
    return null;
  }

  let endForProgress = endMin;
  if (endForProgress == null || endForProgress <= startMin) {
    const nextIdx = todayEvents.findIndex((e) => e.id === lastStarted.id) + 1;
    const nextEvt = todayEvents[nextIdx];
    endForProgress = nextEvt
      ? timeStringToMinutes(nextEvt.hora_inicio)
      : startMin + 60;
    if (endForProgress <= startMin) endForProgress = startMin + 60;
  }
  const progress = (nowMin - startMin) / (endForProgress - startMin);
  const clamped = Math.max(0, Math.min(1, progress));
  return { type: "inside", eventId: lastStarted.id, progress: clamped };
}

/**
 * Estado de una fecha límite (ej. confirmación) para mostrar en la UI.
 * @param {string | null} deadlineISO - Fecha en ISO o null
 * @returns {{ status: 'NO_DEADLINE' } | { status: 'CLOSED', message: string } | { status: 'OPEN', message: string }}
 */
export function getDeadlineStatus(deadlineISO) {
  if (!deadlineISO) return { status: "NO_DEADLINE" };
  const deadline = parseISO(deadlineISO);
  const now = new Date();
  if (isPast(deadline)) return { status: "CLOSED", message: "Cerrado" };
  const diffDays = differenceInDays(deadline, now);
  const diffHours = differenceInHours(deadline, now);
  if (diffDays > 0)
    return { status: "OPEN", message: `${diffDays}d restantes` };
  return { status: "OPEN", message: `${diffHours}h restantes` };
}

/**
 * URL de Google Maps para una locación (link_mapa o búsqueda por nombre/dirección/localidad).
 * @param {{ nombre?: string, direccion?: string, link_mapa?: string, localidades?: { localidad?: string } } | null} locacion
 * @returns {string | null}
 */
export function getGoogleMapsUrl(locacion) {
  if (!locacion) return null;
  if (locacion.link_mapa) return locacion.link_mapa;
  const partes = [];
  if (locacion.nombre) partes.push(locacion.nombre);
  if (locacion.direccion) partes.push(locacion.direccion);
  if (locacion.localidades?.localidad)
    partes.push(locacion.localidades.localidad);
  partes.push("Rio Negro, Argentina");
  const query = encodeURIComponent(partes.join(", "));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
