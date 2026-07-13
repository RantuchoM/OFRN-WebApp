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

export const ID_TIPO_TRASLADO_INTERNO = 35;
const TIPO_TRANSPORTE_SALIDA = 11;
const TIPO_TRANSPORTE_LLEGADA = 12;

/** Parada / traslado interno con vehículo vinculado (`id_gira_transporte`). */
export function isLogisticsTransportEvent(item) {
  if (!item) return false;
  const tipo = Number(item.id_tipo_evento);
  const isTipoTransporte =
    tipo === TIPO_TRANSPORTE_SALIDA ||
    tipo === TIPO_TRANSPORTE_LLEGADA ||
    tipo === ID_TIPO_TRASLADO_INTERNO;
  if (!isTipoTransporte) return false;
  return !!item.id_gira_transporte;
}

/**
 * Lista de eventos para exportar a PDF: misma vista filtrada, sin marcadores de programa
 * ni filas colapsadas ("eventos anteriores de hoy").
 */
export function buildAgendaPdfExportItems(
  filteredItems,
  { collapsedEarlierTodayIds = new Set() } = {},
) {
  return (filteredItems || []).filter((item) => {
    if (!item || item.isProgramMarker) return false;
    if (collapsedEarlierTodayIds.has(item.id)) return false;
    return true;
  });
}

/**
 * Flags de transporte en agenda personal (asignación + subida/bajada obligatorias).
 * @param {object} item
 * @param {Record<string, { assigned?: boolean, subidaId?: number|string, bajadaId?: number|string }>} myTransportLogistics
 */
export function getAgendaTransportFlags(item, myTransportLogistics = {}) {
  const isTransportEvent = isLogisticsTransportEvent(item);
  let isMyTransport = false;
  let isMyUpOrDown = false;

  if (isTransportEvent && item.id_gira_transporte) {
    const tId = String(item.id_gira_transporte);
    const myStatus = myTransportLogistics[tId];
    const isTrasladoInterno =
      Number(item.id_tipo_evento) === ID_TIPO_TRASLADO_INTERNO;
    if (isTrasladoInterno || myStatus?.assigned) {
      isMyTransport = true;
      const itemIdStr = String(item.id);
      if (
        isTrasladoInterno ||
        String(myStatus?.subidaId) === itemIdStr ||
        String(myStatus?.bajadaId) === itemIdStr
      ) {
        isMyUpOrDown = true;
      }
    }
  }

  const hiddenFromAgenda =
    isTransportEvent && item.visible_agenda === false;
  const blockedByVisibility = hiddenFromAgenda && !isMyUpOrDown;

  return {
    isTransportEvent,
    isMyTransport,
    isMyUpOrDown,
    isMyAssignedTransportParada: isMyTransport,
    blockedByVisibility,
  };
}

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
