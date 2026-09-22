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
import { extractEventArtistas } from "./venueDisplayUtils";
import {
  getSearchHighlightRanges,
  matchesMultiTokenSearch,
  normalizeForSearch,
} from "./sanitize";

export const ID_TIPO_TRASLADO_INTERNO = 35;
const TIPO_TRANSPORTE_SALIDA = 11;
const TIPO_TRANSPORTE_LLEGADA = 12;
/** Catálogo `categorias_tipos_eventos` — checkbox Filtros → Transporte. */
export const ID_CATEGORIA_TRANSPORTE = 6;
/** Tipos de parada/traslado (EventForm 11/12, INTERNO 35, catálogo 28/31). */
const AGENDA_TRANSPORT_TIPO_IDS = new Set([11, 12, 28, 31, 35]);

function agendaEventCategoriaId(item) {
  const raw =
    item?.tipos_evento?.categorias_tipos_eventos?.id ??
    item?.tipos_evento?.id_categoria ??
    item?.tipo_id_categoria ??
    item?.id_categoria;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

function agendaEventCategoriaNombre(item) {
  return String(
    item?.tipos_evento?.categorias_tipos_eventos?.nombre ||
      item?.categoria_nombre ||
      "",
  )
    .trim()
    .toLowerCase();
}

function hasLinkedAgendaVehicle(item) {
  return item?.id_gira_transporte != null && item.id_gira_transporte !== "";
}

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
 * Evento de transporte para el filtro de categoría de Agenda (paradas,
 * charter, camioneta, chips TRASLADO). Incluye tipos 11/12/28/31/35,
 * categoría Transporte (id 6) y paradas con vehículo aunque el tipo esté
 * tagueado como Otros / Logística.
 */
export function isAgendaTransportCategoryEvent(item) {
  if (!item || item.isProgramMarker) return false;
  if (isLogisticsTransportEvent(item)) return true;
  const tipo = Number(item.id_tipo_evento ?? item.tipos_evento?.id);
  if (AGENDA_TRANSPORT_TIPO_IDS.has(tipo)) return true;
  if (agendaEventCategoriaId(item) === ID_CATEGORIA_TRANSPORTE) return true;
  if (agendaEventCategoriaNombre(item) === "transporte") return true;
  if (hasLinkedAgendaVehicle(item)) return true;
  return false;
}

/**
 * Filtro de categorías de Agenda. `selectedCategoryIds` vacío = sin filtro.
 * El checkbox Transporte es el interruptor de visibilidad: las paradas del
 * vehículo asignado (`isAssignedVehicleAgendaStop`) no saltean este filtro.
 * Con Transporte tildado, una parada tagueada como Otros/Logística sigue
 * visible (la excepción de convocatoria/Crimson vive en `useAgendaData`).
 */
export function eventPassesAgendaCategoryFilter(item, selectedCategoryIds) {
  if (!selectedCategoryIds?.length) return true;
  const selected = new Set(
    selectedCategoryIds.map(Number).filter(Number.isFinite),
  );
  if (isAgendaTransportCategoryEvent(item)) {
    return selected.has(ID_CATEGORIA_TRANSPORTE);
  }
  const catId = agendaEventCategoriaId(item);
  if (catId == null) return true;
  return selected.has(catId);
}

/**
 * Evento solo-FIMBA en la agenda OFRN: sin convocatoria de orquesta
 * (`audiencia_ofrn === 'none'`, sin `eventos_grupos`) y sin parada de flota
 * OFRN (`id_gira_transporte`). Los que también incluyen Tutti/grupos OFRN
 * no son “solo FIMBA” y siguen las reglas normales de convocatoria.
 */
export function isFimbaOnlyAgendaEvent(item) {
  if (!item || item.isProgramMarker) return false;
  if (item.audiencia_ofrn !== "none") return false;
  const grupos = item.eventos_grupos || [];
  if (
    grupos.some(
      (eg) => eg?.id_grupo != null || eg?.giras_grupos?.id != null,
    )
  ) {
    return false;
  }
  if (item.id_gira_transporte != null && item.id_gira_transporte !== "") {
    return false;
  }
  return true;
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
 * Parada del bus asignado al músico (o traslado INTERNO).
 * Debe quedar en la agenda aunque `eventos_grupos` liste otro grupo de
 * convocatoria: el tag editorial del evento no anula la asignación logística.
 * No saltea el filtro de categoría Transporte (`eventPassesAgendaCategoryFilter`).
 */
export function isAssignedVehicleAgendaStop(item, myTransportLogistics = {}) {
  return getAgendaTransportFlags(item, myTransportLogistics).isMyTransport;
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

/** Fragmentos de un evento usados por la búsqueda de agenda (tipo + detalle + locación + artistas). */
export function getAgendaEventSearchParts(item) {
  if (!item || item.isProgramMarker) return [];
  const loc = item.locaciones || {};
  const artistas = extractEventArtistas(item).map((p) => p?.nombre);
  return [
    item.tipos_evento?.nombre,
    stripHtml(item.descripcion),
    item.giras_transportes?.detalle,
    loc.nombre,
    loc.direccion,
    loc.localidades?.localidad,
    ...artistas,
  ].filter((part) => part != null && String(part).trim() !== "");
}

/** ¿El evento coincide con el texto de búsqueda (tipo, detalle, locación y/o artistas)? */
export function eventMatchesAgendaSearch(item, query) {
  if (!String(query || "").trim()) return true;
  if (!item || item.isProgramMarker) return false;
  return matchesMultiTokenSearch(getAgendaEventSearchParts(item), query);
}

/**
 * Rangos [start, end) en el texto original que coinciden con la query
 * (insensible a tildes/mayúsculas; cada palabra se resalta por separado).
 */
export function getAccentInsensitiveHighlightRanges(text, query) {
  return getSearchHighlightRanges(text, query);
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
