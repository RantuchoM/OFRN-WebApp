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
import { stripHtml } from "./eventDisplayUtils";
import { normalizeForSearch } from "./sanitize";

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
 * Flags de transporte en agenda personal (asignación + visibilidad del bus).
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
  // Ojo cerrado: oculta paradas a quienes no van en ese vehículo.
  // Si el bus es el asignado del músico, ve todas las paradas (no solo subida/bajada).
  const blockedByVisibility = hiddenFromAgenda && !isMyTransport;

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

/** Fragmentos de un evento usados por la búsqueda de agenda (detalle + locación). */
export function getAgendaEventSearchParts(item) {
  if (!item || item.isProgramMarker) return [];
  const loc = item.locaciones || {};
  return [
    stripHtml(item.descripcion),
    item.giras_transportes?.detalle,
    loc.nombre,
    loc.direccion,
    loc.localidades?.localidad,
  ].filter((part) => part != null && String(part).trim() !== "");
}

/** ¿El evento coincide con el texto de búsqueda (detalle y/o locación)? */
export function eventMatchesAgendaSearch(item, query) {
  const q = normalizeForSearch(query);
  if (!q) return true;
  if (!item || item.isProgramMarker) return false;
  const haystack = normalizeForSearch(getAgendaEventSearchParts(item).join(" "));
  return haystack.includes(q);
}

/**
 * Rangos [start, end) en el texto original que coinciden con la query
 * (insensible a tildes/mayúsculas).
 */
export function getAccentInsensitiveHighlightRanges(text, query) {
  const rawText = String(text ?? "");
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery || !rawText) return [];

  const normalizedChars = [];
  const originalIndexByNormalizedIndex = [];
  Array.from(rawText).forEach((char, originalIdx) => {
    const normalizedChar = char
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    Array.from(normalizedChar).forEach((c) => {
      normalizedChars.push(c);
      originalIndexByNormalizedIndex.push(originalIdx);
    });
  });

  const normalizedText = normalizedChars.join("");
  if (!normalizedText) return [];

  const ranges = [];
  let searchFrom = 0;
  while (searchFrom < normalizedText.length) {
    const foundAt = normalizedText.indexOf(normalizedQuery, searchFrom);
    if (foundAt === -1) break;
    const startOriginal = originalIndexByNormalizedIndex[foundAt];
    const endNormIdx = foundAt + normalizedQuery.length - 1;
    const endOriginal =
      (originalIndexByNormalizedIndex[endNormIdx] ?? startOriginal) + 1;
    ranges.push([startOriginal, endOriginal]);
    searchFrom = foundAt + 1;
  }

  if (!ranges.length) return [];

  const merged = [];
  ranges.forEach(([start, end]) => {
    const last = merged[merged.length - 1];
    if (!last || start > last[1]) merged.push([start, end]);
    else last[1] = Math.max(last[1], end);
  });
  return merged;
}

const HTML_SEARCH_MARK_OPEN =
  '<mark class="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">';
const HTML_SEARCH_MARK_CLOSE = "</mark>";

function wrapPlainTextSearchMatches(rawText, query) {
  const ranges = getAccentInsensitiveHighlightRanges(rawText, query);
  if (!ranges.length) return rawText;
  let out = "";
  let cursor = 0;
  for (const [start, end] of ranges) {
    out += rawText.slice(cursor, start);
    out += HTML_SEARCH_MARK_OPEN + rawText.slice(start, end) + HTML_SEARCH_MARK_CLOSE;
    cursor = end;
  }
  out += rawText.slice(cursor);
  return out;
}

/**
 * Inserta &lt;mark&gt; en los nodos de texto de un HTML de descripción,
 * sin tocar etiquetas (para usar con dangerouslySetInnerHTML).
 */
export function highlightHtmlSearch(html, query) {
  if (!html) return "";
  const q = normalizeForSearch(query);
  if (!q) return String(html);
  return String(html).replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
    if (tag) return tag;
    return wrapPlainTextSearchMatches(text, query);
  });
}
