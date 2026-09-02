/**
 * Secuencia subida/bajada + en tránsito para flota FIMBA/OFRN.
 *
 * Equivalencia OFRN (hoja de ruta / `buildRoadmapExportData` en roadmapExport.js):
 * - Una persona tiene `subidaId` / `bajadaId` por unidad `giras_transportes`
 *   (reglas `giras_logistica_rutas` vía `calculateLogisticsSummary`).
 * - Sube en la parada cuya `evt.id === subidaId`; baja en `bajadaId`.
 * - En tránsito **al salir** de la parada i (misma semántica que "TOTAL A BORDO AL SALIR"):
 *     upIdx <= i && (bajadaId ausente → hasta el final | downIdx > i)
 * - Plazas extra de instrumento (`instrumentos.plaza_extra`): 1 asiento adicional
 *   (misma regla que GirasTransportesManager totalOccupied = pax + plaza_extra).
 *
 * FIMBA — rides (prioridad):
 * 1) Explícitos: `fimba_propuesta_rutas` (plazas + subida/bajada por artista).
 * 2) Sintéticos residuales: solo en eventos de **tipo transporte** con
 *    `fimba_evento_transportes.plazas > 0` − plazas explícitas que ya
 *    suben ahí. `plazas = 0` no inventa headcount desde tags. Suben en ese
 *    trayecto y bajan en la **siguiente parada de la secuencia unificada del
 *    vehículo** (incluye paradas OFRN del mismo `giras_transportes`). Un
 *    Concierto sin ↑/↓ explícito no genera hop ni entra a la secuencia solo
 *    por tener fila de flota.
 *
 * Modelo duro — **un vehículo = una línea de ocupación**:
 * OFRN + FIMBA comparten la misma secuencia cronológica, el mismo Δ y el
 * mismo «a bordo». No hay mundos de conteo separados por organización.
 *
 * Δ en parada = board_seats − alight_seats (net; bajadas dejan de contar en
 * en_transito vía isOnBoardAfterStop: downIdx > i).
 *
 * Headcount "en el lugar" (Artistas column):
 *   presente_en_parada = boarded by idx && (no bajada | downIdx >= currentIdx)
 *   = sube aquí, pasa por aquí o baja aquí (no solo en_transito al salir).
 *
 * Fórmula n Orquesta / Artista en planilla transportes (por contexto de vehículo):
 *   n = Σ plazas de rides source ofrn|propuesta presentes en la parada
 *   (suma multi-vehículo sin double-count de orquesta porque cada pax es 1 unidad).
 */

import { sortFimbaAgendaRows } from "./fimbaAgendaSort";
import { sortEventsBySchedule } from "./giraTransportUtils";
import { matchesRule, normalize } from "./giraUtils";

/** Labels de categoría logística (alcance Categoria en `giras_logistica_rutas`). */
const OFRN_CATEGORIA_CHIP_LABELS = {
  SOLISTAS: "Solistas",
  DIRECTORES: "Directores",
  PRODUCCION: "Producción",
  EXTERNOS: "Externos",
  LOCALES: "Locales",
  NO_LOCALES: "No Locales",
};

/** Paridad con `actividadUsaTransporte` / OFRN_TRANSPORT_TIPO_IDS (evita import circular). */
const BOARDING_TRANSPORT_TIPO_IDS = new Set([11, 12, 28, 31, 35]);
const BOARDING_TRANSPORT_CATEGORIA_ID = 6;

/**
 * ¿El evento es tipo catálogo transporte (Traslado / Interno / …)?
 * Concierto, hotel, etc. → false aunque tengan fila en `fimba_evento_transportes`.
 *
 * @param {object|null|undefined} ev
 */
export function isTransportTipoEvent(ev) {
  if (!ev) return false;
  const id = Number(ev.id_tipo_evento);
  if (Number.isFinite(id) && BOARDING_TRANSPORT_TIPO_IDS.has(id)) return true;
  const catId = Number(
    ev.tipo_id_categoria ??
      ev.tipos_evento?.id_categoria ??
      ev.tipos_evento?.categorias_tipos_eventos?.id,
  );
  if (catId === BOARDING_TRANSPORT_CATEGORIA_ID) return true;
  const catNombre = String(
    ev.categoria_nombre ||
      ev.tipos_evento?.categorias_tipos_eventos?.nombre ||
      "",
  )
    .trim()
    .toLowerCase();
  return catNombre === "transporte";
}

/**
 * Peso de asientos OFRN de un integrante (1 + plaza de instrumento si aplica).
 * @param {{ instrumentos?: { plaza_extra?: boolean|null }|null }|null} person
 */
export function ofrnSeatWeight(person) {
  const base = 1;
  const extra = person?.instrumentos?.plaza_extra ? 1 : 0;
  return base + extra;
}

/**
 * ¿Sigue a bordo al salir de `currentIdx`?
 * Replica `buildRoadmapExportData` y admite bajada nula (queda hasta el final).
 *
 * @param {number} upIdx
 * @param {number|null|undefined} downIdx — -1/null = sin bajada
 * @param {number} currentIdx
 */
export function isOnBoardAfterStop(upIdx, downIdx, currentIdx) {
  if (!Number.isFinite(upIdx) || upIdx < 0 || !Number.isFinite(currentIdx) || currentIdx < 0) {
    return false;
  }
  if (upIdx > currentIdx) return false;
  if (downIdx == null || downIdx < 0 || !Number.isFinite(downIdx)) {
    return true;
  }
  // OFRN: downIdx > currentIdx  (al bajar en la parada ya no cuenta "al salir")
  return downIdx > currentIdx;
}

/**
 * ¿Está presente en la parada? (sube, pasa o baja en currentIdx).
 * Distinto de en_transito: incluye quien baja aquí.
 *
 * @param {number} upIdx
 * @param {number|null|undefined} downIdx
 * @param {number} currentIdx
 */
export function isPresentAtStop(upIdx, downIdx, currentIdx) {
  if (!Number.isFinite(upIdx) || upIdx < 0 || !Number.isFinite(currentIdx) || currentIdx < 0) {
    return false;
  }
  if (upIdx > currentIdx) return false;
  if (downIdx == null || downIdx < 0 || !Number.isFinite(downIdx)) {
    return true;
  }
  return downIdx >= currentIdx;
}

/**
 * Índice de evento en lista ya ordenada.
 * @param {Array<{ id?: unknown }>} sorted
 * @param {unknown} eventId
 */
export function indexOfEvent(sorted, eventId) {
  if (eventId == null || eventId === "") return -1;
  return (sorted || []).findIndex((e) => String(e.id) === String(eventId));
}

/**
 * Clasifica el movimiento de la parada según deltas de plazas.
 * @param {number} boardSeats
 * @param {number} alightSeats
 * @returns {'subida'|'bajada'|'subida_bajada'|'parada'}
 */
export function classifyStopMovement(boardSeats, alightSeats) {
  const b = (Number(boardSeats) || 0) > 0;
  const a = (Number(alightSeats) || 0) > 0;
  if (b && a) return "subida_bajada";
  if (b) return "subida";
  if (a) return "bajada";
  return "parada";
}

/** Etiqueta UI ES. */
export function movementLabelEs(kind) {
  switch (kind) {
    case "subida":
      return "Subida";
    case "bajada":
      return "Bajada";
    case "subida_bajada":
      return "Subida / Bajada";
    default:
      return "Parada";
  }
}

/**
 * Locación visible: locacion_nombre / locaciones → destino texto legacy → localidad → —.
 * @param {{
 *   locaciones?: { nombre?: string|null, localidades?: { localidad?: string|null }|null }|null,
 *   destino?: string|null,
 *   id_locacion?: unknown,
 * }} ev
 */
export function formatEventLocation(ev) {
  const locName = String(
    ev?.locaciones?.nombre || ev?.locacion_nombre || "",
  ).trim();
  if (locName) {
    const city = String(
      ev?.locaciones?.localidades?.localidad || ev?.locacion_ciudad || "",
    ).trim();
    return city ? `${locName} (${city})` : locName;
  }
  const dest = String(ev?.destino || "").trim();
  if (dest) return dest;
  const cityOnly = String(
    ev?.locaciones?.localidades?.localidad || ev?.locacion_ciudad || "",
  ).trim();
  if (cityOnly) return cityOnly;
  return "—";
}

/**
 * Origen en planilla Agenda: locación de catálogo de la parada actual.
 * En transporte no usa texto legacy `Destino:` de descripcion.
 *
 * @param {object|null|undefined} ev
 * @param {{ skipDestinoFallback?: boolean }} [opts]
 */
export function formatAgendaOrigenLabel(ev, opts = {}) {
  const skipDestino = Boolean(opts.skipDestinoFallback);
  const locName = String(
    ev?.locaciones?.nombre || ev?.locacion_nombre || "",
  ).trim();
  if (locName) {
    const city = String(
      ev?.locaciones?.localidades?.localidad || ev?.locacion_ciudad || "",
    ).trim();
    return city ? `${locName} (${city})` : locName;
  }
  if (!skipDestino) {
    const dest = String(ev?.destino || "").trim();
    if (dest) return dest;
  }
  const cityOnly = String(
    ev?.locaciones?.localidades?.localidad || ev?.locacion_ciudad || "",
  ).trim();
  if (cityOnly) return cityOnly;
  return "—";
}

/**
 * Texto legacy `Destino:` persistido en `eventos.descripcion` (sin fallback a
 * `locaciones.nombre`). Misma regla que `decodeFimbaTrasladoDescripcion`.
 *
 * @param {object|null|undefined} ev
 * @returns {string}
 */
export function resolveLegacyDestinoFromDescripcion(ev) {
  const text = ev?.descripcion;
  if (!text) return "";
  for (const raw of String(text).split("\n")) {
    const line = raw.trimEnd();
    if (/^Destino:\s*/i.test(line)) {
      return line.replace(/^Destino:\s*/i, "").trim();
    }
  }
  return "";
}

/**
 * Destino de planilla Agenda (calculado): next stop del mismo vehículo.
 * No-transporte → "—". Transporte sin next → `TRANSPORT_DESTINO_SIN_SIGUIENTE`.
 *
 * @param {object|null|undefined} ev
 * @param {Map|null|undefined} sequencesByVehicle
 * @param {{ isTransport?: boolean }} [opts]
 * @returns {string}
 */
export function resolveAgendaDestinoLabel(
  ev,
  sequencesByVehicle,
  opts = {},
) {
  const isTransport =
    opts.isTransport != null
      ? Boolean(opts.isTransport)
      : isTransportTipoEvent(ev) || Boolean(ev?.es_ride_segment);
  if (!isTransport || !ev) return "—";
  const { nextEvent, label } = resolveTransportDestinoFromNextStop(
    ev,
    sequencesByVehicle,
  );
  if (!nextEvent || label === "—" || !String(label || "").trim()) {
    return TRANSPORT_DESTINO_SIN_SIGUIENTE;
  }
  return label;
}

/**
 * Siguiente parada del mismo vehículo en la secuencia ya ordenada
 * (`buildVehicleBoardingSequence.sortedEvents` / `sortEventsBySchedule`).
 *
 * @param {{ sortedEvents?: Array<object> }|null|undefined} seq
 * @param {unknown} eventId
 * @returns {object|null}
 */
export function nextEventInVehicleSequence(seq, eventId) {
  const sorted = seq?.sortedEvents;
  if (!sorted?.length) return null;
  const idx = indexOfEvent(sorted, eventId);
  if (idx < 0 || idx >= sorted.length - 1) return null;
  return sorted[idx + 1] || null;
}

/** Placeholder UI cuando no hay siguiente parada en la secuencia del vehículo. */
export const TRANSPORT_DESTINO_SIN_SIGUIENTE = "Sin siguiente parada";

/**
 * Destino derivado de un evento de transporte = locación del next stop en la
 * secuencia unificada del vehículo (OFRN + FIMBA).
 *
 * @param {object|null|undefined} event — parada actual
 * @param {{ sortedEvents?: Array<object> }|Map<number, { sortedEvents?: Array<object> }>|null|undefined} sequenceOrMetrics — secuencia del vehículo o Map de `buildAllVehicleBoardingSequences`
 * @param {number|string|null|undefined} [vehicleId] — unidad primary; si falta, usa la primera del evento
 * @returns {{ nextEvent: object|null, label: string }}
 */
export function resolveTransportDestinoFromNextStop(
  event,
  sequenceOrMetrics,
  vehicleId = null,
) {
  if (!event) {
    return { nextEvent: null, label: TRANSPORT_DESTINO_SIN_SIGUIENTE };
  }

  let seq = null;
  if (sequenceOrMetrics instanceof Map) {
    const ids = [];
    if (vehicleId != null && vehicleId !== "") {
      ids.push(Number(vehicleId));
    }
    for (const r of event?.vehiculos || []) {
      const n = Number(r?.id_gira_transporte);
      if (Number.isFinite(n)) ids.push(n);
    }
    if (event?.id_gira_transporte != null && event.id_gira_transporte !== "") {
      const n = Number(event.id_gira_transporte);
      if (Number.isFinite(n)) ids.push(n);
    }
    const unique = [...new Set(ids.filter(Number.isFinite))];
    for (const tid of unique) {
      seq = sequenceOrMetrics.get(tid) || sequenceOrMetrics.get(String(tid));
      if (seq?.sortedEvents?.length) break;
    }
  } else if (sequenceOrMetrics?.sortedEvents) {
    seq = sequenceOrMetrics;
  } else if (sequenceOrMetrics?.next_event !== undefined) {
    const nextEvent = sequenceOrMetrics.next_event || null;
    return {
      nextEvent,
      label: formatNextStopDestino(nextEvent),
    };
  }

  const nextEvent = nextEventInVehicleSequence(seq, event.id);
  return {
    nextEvent,
    label: formatNextStopDestino(nextEvent),
  };
}

/**
 * Destino de planilla: locación/destino del next stop; si falta, título actividad.
 * Sin next stop → "—" (usar `TRANSPORT_DESTINO_SIN_SIGUIENTE` en UI Transportes).
 *
 * @param {object|null|undefined} nextEv
 */
export function formatNextStopDestino(nextEv) {
  if (!nextEv) return "—";
  const loc = formatEventLocation(nextEv);
  if (loc && loc !== "—") return loc;
  const title = String(
    nextEv.actividad ||
      nextEv.tipo_nombre ||
      nextEv.tipos_evento?.nombre ||
      "",
  ).trim();
  return title || "—";
}

/**
 * Hora fin planilla: valor guardado `hora_fin`, o si vacío la `hora_inicio` (hora com)
 * del siguiente evento del mismo vehículo.
 *
 * @param {object|null|undefined} ev
 * @param {object|null|undefined} nextEv
 * @returns {{ value: string|null, isCalculated: boolean }}
 */
export function resolveHoraFinDisplay(ev, nextEv) {
  const raw = ev?.hora_fin;
  if (raw != null && String(raw).trim() !== "") {
    return { value: String(raw).slice(0, 5), isCalculated: false };
  }
  const nextCom = nextEv?.hora_inicio;
  if (nextCom != null && String(nextCom).trim() !== "") {
    return { value: String(nextCom).slice(0, 5), isCalculated: true };
  }
  return { value: null, isCalculated: false };
}

/**
 * Default fecha/hora for a new intermediate stop between two vehicle stops.
 *
 * - With next stop: midpoint of current `hora_inicio` and next `hora_inicio`
 *   (full datetime so overnight gaps land on the correct calendar day).
 * - Without next: current + 30 minutes (may roll to next day).
 *
 * Used by Destino compact modal when Hora Fin is empty and there is no cyan
 * next.hora_inicio (midpoint / +30m fallback). Prefer `resolveHoraFinDisplay`
 * first so new-stop `hora_inicio` aligns with current Hora Fin. For Agenda /
 * Transportes «insertar evento» gap-fill, use `defaultGapFillEventSchedule`.
 *
 * @param {object|null|undefined} currentEv
 * @param {object|null|undefined} nextEv
 * @returns {{ fecha: string|null, hora_inicio: string }}
 */
export function defaultIntermediateStopSchedule(currentEv, nextEv) {
  const pad2 = (n) => String(n).padStart(2, "0");

  const toMs = (fecha, horaRaw) => {
    const f = String(fecha || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return null;
    const [y, m, d] = f.split("-").map(Number);
    const hm = String(horaRaw || "00:00").slice(0, 5);
    const [hh, mm] = hm.split(":").map((x) => Number(x));
    const h = Number.isFinite(hh) ? hh : 0;
    const min = Number.isFinite(mm) ? mm : 0;
    return new Date(y, m - 1, d, h, min, 0, 0).getTime();
  };

  const fromMs = (ms) => {
    const dt = new Date(ms);
    return {
      fecha: `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`,
      hora_inicio: `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`,
    };
  };

  const curFecha = String(currentEv?.fecha || "").slice(0, 10) || null;
  const curHora = currentEv?.hora_inicio;
  const curMs = toMs(curFecha, curHora);

  if (curMs == null || !Number.isFinite(curMs)) {
    return {
      fecha: curFecha,
      hora_inicio: curHora ? String(curHora).slice(0, 5) : "12:00",
    };
  }

  let targetMs = curMs + 30 * 60 * 1000;
  if (nextEv) {
    const nextFecha =
      String(nextEv.fecha || "").slice(0, 10) || curFecha;
    const nextMs = toMs(nextFecha, nextEv.hora_inicio);
    if (nextMs != null && Number.isFinite(nextMs) && nextMs > curMs) {
      targetMs = Math.floor((curMs + nextMs) / 2);
    }
  }

  return fromMs(targetMs);
}

/**
 * Prefill for «Insertar evento» / completar hueco hasta→desde between two
 * chronological neighbors (Agenda same-day list or Transportes vehicle sequence).
 *
 * - `hora_inicio` = effective fin of previous (`hora_fin` stored, else cyan
 *   calculated next-stop `hora_inicio` via `resolveHoraFinDisplay`).
 * - `hora_fin` = next's `hora_inicio` when inserting between; null if only after.
 * - No usable fin and no next → same +30m fallback as midpoint helper.
 * - Overnight / degenerate (calculated fin equals next start): still prefill
 *   those times; user can adjust in the create modal. Fecha stays on previous
 *   unless +30m rolls the calendar day.
 *
 * @param {object|null|undefined} prevEv
 * @param {object|null|undefined} nextEv
 * @returns {{ fecha: string|null, hora_inicio: string|null, hora_fin: string|null }}
 */
export function defaultGapFillEventSchedule(prevEv, nextEv) {
  const curFecha = String(prevEv?.fecha || "").slice(0, 10) || null;
  const finDisp = resolveHoraFinDisplay(prevEv, nextEv);
  const nextInicio = nextEv?.hora_inicio
    ? String(nextEv.hora_inicio).slice(0, 5)
    : null;

  if (finDisp.value) {
    return {
      fecha: curFecha,
      hora_inicio: finDisp.value,
      hora_fin: nextInicio,
    };
  }

  // Sin hasta ni next: +30 min desde el comienzo del prev
  const fallback = defaultIntermediateStopSchedule(prevEv, null);
  return {
    fecha: fallback.fecha || curFecha,
    hora_inicio: fallback.hora_inicio || null,
    hora_fin: null,
  };
}


/**
 * Plazas FIMBA de reserva técnica del evento en una unidad.
 *
 * Solo `fimba_evento_transportes.plazas` (> 0). Un `plazas = 0` explícito
 * **no** inventa headcount desde tags: eso dejaba Capacidad (p.ej. 44) y
 * “libre” desfasados, y confundía asientos físicos con plazas aplicadas.
 * Headcount de artistas = `fimba_propuesta_rutas` (↑/↓) o plazas > 0.
 *
 * @param {object} ev — evento mapeado FIMBA
 * @param {number|string} idGiraTransporte
 * @param {(p: object) => { para_transporte?: number }} [capacityFn] — reserved (API stable)
 */
export function resolveFimbaSeatsForVehicle(ev, idGiraTransporte, _capacityFn) {
  const want = Number(idGiraTransporte);
  if (!Number.isFinite(want)) return 0;

  const row = (ev?.vehiculos || []).find(
    (r) => Number(r?.id_gira_transporte) === want,
  );
  return Math.max(0, Number(row?.plazas) || 0);
}

/**
 * Rides explícitos desde `fimba_propuesta_rutas`.
 *
 * @param {Array<{
 *   id?: unknown,
 *   id_propuesta?: unknown,
 *   id_gira_transporte?: unknown,
 *   plazas?: number,
 *   id_evento_subida?: unknown,
 *   id_evento_bajada?: unknown,
 *   propuesta?: { id?: unknown, nombre?: string, color?: string }|null,
 * }>} routes
 * @param {number|string} idGiraTransporte
 * @returns {Array<{ key: string, subidaId: unknown|null, bajadaId: unknown|null, seats: number, source: 'fimba_ruta', id_propuesta: unknown|null, nombre?: string, color?: string }>}
 */
export function buildFimbaExplicitRides(routes, idGiraTransporte) {
  const want = Number(idGiraTransporte);
  if (!Number.isFinite(want)) return [];
  const rides = [];
  for (const r of routes || []) {
    if (Number(r?.id_gira_transporte) !== want) continue;
    const seats = Math.max(0, Number(r?.plazas) || 0);
    if (seats <= 0) continue;
    if (r.id_evento_subida == null && r.id_evento_bajada == null) continue;
    const prop = r.propuesta || r.fimba_propuestas || null;
    rides.push({
      key: `fimba-ruta-${r.id ?? `${r.id_propuesta}-${r.id_evento_subida}-${r.id_evento_bajada}`}`,
      subidaId: r.id_evento_subida ?? null,
      bajadaId: r.id_evento_bajada ?? null,
      seats,
      source: "fimba_ruta",
      id_propuesta: r.id_propuesta ?? prop?.id ?? null,
      nombre: prop?.nombre || r.nombre || null,
      color: prop?.color || r.color || null,
    });
  }
  return rides;
}

/**
 * Ride abierto: subió en esta unidad y todavía no bajó.
 * Esas plazas ocupan el bus y el tope del artista hasta la bajada.
 *
 * @param {{ plazas?: number, id_evento_subida?: unknown, id_evento_bajada?: unknown }|null} ruta
 */
export function isOpenFimbaRide(ruta) {
  if (!ruta) return false;
  if (Math.max(0, Number(ruta.plazas) || 0) <= 0) return false;
  if (ruta.id_evento_subida == null || ruta.id_evento_subida === "") return false;
  if (ruta.id_evento_bajada != null && ruta.id_evento_bajada !== "") return false;
  return true;
}

/**
 * ¿El ride está presente en esta parada (subió antes/aquí y no bajó antes)?
 * Con secuencia: solo si `currentEventId` es una parada del vehículo.
 * Sin secuencia: ride abierto, o bajada ya apuntando a este evento.
 *
 * Importante: un ride abierto NO hace match de eventos ajenos a la secuencia
 * (conciertos/check-ins de otros artistas). Eso rompía el filtro Artista de
 * Agenda (`eventMatchesPropuestaRouteFilter` → 171/171).
 *
 * @param {object|null} ruta
 * @param {unknown} currentEventId
 * @param {Array<{ id?: unknown }>|null|undefined} sortedEvents
 */
export function isFimbaRideAboardAtStop(ruta, currentEventId, sortedEvents) {
  if (!ruta || Math.max(0, Number(ruta.plazas) || 0) <= 0) return false;
  if (ruta.id_evento_subida == null || ruta.id_evento_subida === "") return false;

  const sorted = sortedEvents || [];
  if (sorted.length && currentEventId != null && currentEventId !== "") {
    const currentIdx = indexOfEvent(sorted, currentEventId);
    // Evento fuera de la secuencia del vehículo ≠ parada a bordo.
    if (currentIdx < 0) return false;
    const upIdx = indexOfEvent(sorted, ruta.id_evento_subida);
    const downIdx =
      ruta.id_evento_bajada != null && ruta.id_evento_bajada !== ""
        ? indexOfEvent(sorted, ruta.id_evento_bajada)
        : null;
    return isPresentAtStop(upIdx, downIdx, currentIdx);
  }

  if (
    currentEventId != null &&
    currentEventId !== "" &&
    ruta.id_evento_bajada != null &&
    String(ruta.id_evento_bajada) === String(currentEventId)
  ) {
    return true;
  }
  return isOpenFimbaRide(ruta);
}

/**
 * Opciones de artista para «Gestionar Bajadas»: a bordo (se pueden bajar)
 * vs el resto (deshabilitados, con motivo).
 *
 * @param {{
 *   propuestas?: Array<{ id?: unknown, nombre?: string }>,
 *   rutas?: Array<object>,
 *   idGiraTransporte?: number|string|null,
 *   eventId?: unknown,
 *   sortedEvents?: Array<object>|null,
 * }} opts
 * @returns {Array<{
 *   propuesta: object,
 *   id_propuesta: unknown,
 *   aboard: boolean,
 *   plazasAboard: number,
 *   ruta: object|null,
 *   reason: string|null,
 * }>}
 */
export function buildFimbaBajadaArtistOptions(opts = {}) {
  const propuestas = opts.propuestas || [];
  const rutas = opts.rutas || [];
  const wantGt =
    opts.idGiraTransporte != null && opts.idGiraTransporte !== ""
      ? Number(opts.idGiraTransporte)
      : null;
  const eventId = opts.eventId;
  const sorted = opts.sortedEvents || [];
  const currentIdx =
    sorted.length && eventId != null && eventId !== ""
      ? indexOfEvent(sorted, eventId)
      : -1;

  return propuestas.map((p) => {
    const vehicleRutas = rutas.filter((r) => {
      const pid = r?.id_propuesta ?? r?.propuesta?.id;
      if (pid == null || String(pid) !== String(p.id)) return false;
      if (wantGt != null && Number.isFinite(wantGt)) {
        if (Number(r.id_gira_transporte) !== wantGt) return false;
      }
      return Math.max(0, Number(r.plazas) || 0) > 0;
    });

    let plazasAboard = 0;
    let ruta = null;
    for (const r of vehicleRutas) {
      if (!isFimbaRideAboardAtStop(r, eventId, sorted)) continue;
      plazasAboard += Math.max(0, Number(r.plazas) || 0);
      if (
        isOpenFimbaRide(r) ||
        (eventId != null &&
          r.id_evento_bajada != null &&
          String(r.id_evento_bajada) === String(eventId))
      ) {
        ruta = r;
      } else if (!ruta) {
        ruta = r;
      }
    }

    if (plazasAboard > 0) {
      return {
        propuesta: p,
        id_propuesta: p.id,
        aboard: true,
        plazasAboard,
        ruta,
        reason: null,
      };
    }

    let reason = "sin subida en este vehículo";
    if (vehicleRutas.length && currentIdx >= 0) {
      let boardsLater = false;
      let alreadyOff = false;
      for (const r of vehicleRutas) {
        if (r.id_evento_subida == null || r.id_evento_subida === "") continue;
        const upIdx = indexOfEvent(sorted, r.id_evento_subida);
        const downIdx =
          r.id_evento_bajada != null && r.id_evento_bajada !== ""
            ? indexOfEvent(sorted, r.id_evento_bajada)
            : null;
        if (upIdx > currentIdx) boardsLater = true;
        if (downIdx != null && downIdx >= 0 && downIdx < currentIdx) {
          alreadyOff = true;
        }
      }
      if (boardsLater) reason = "sube más adelante";
      else if (alreadyOff) reason = "ya bajó en este vehículo";
    }

    return {
      propuesta: p,
      id_propuesta: p.id,
      aboard: false,
      plazasAboard: 0,
      ruta: null,
      reason,
    };
  });
}

/**
 * Instante fecha+hora → minutos desde epoch local (para solapes multi-día).
 * @param {string|null|undefined} fecha — YYYY-MM-DD
 * @param {string|null|undefined} hora — HH:MM o HH:MM:SS
 * @returns {number|null}
 */
export function scheduleInstantMinutes(fecha, hora) {
  const d = String(fecha || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const hm = String(hora || "00:00").slice(0, 5);
  const [hhRaw, mmRaw] = hm.split(":");
  const hh = Number(hhRaw);
  const mm = Number(mmRaw);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  const day = Date.parse(`${d}T00:00:00`);
  if (!Number.isFinite(day)) return null;
  return day / 60000 + hh * 60 + mm;
}

/**
 * ¿El ride [subida, bajada) solapa la ventana de agenda?
 * Bajada nula = permanece a bordo (fin abierto).
 * Ventana sin hora_fin = al menos 1 minuto desde el inicio (punto usable).
 *
 * @param {{ fecha?: string, hora_inicio?: string, date?: string, time?: string, hora?: string }|null} upEv
 * @param {{ fecha?: string, hora_inicio?: string, date?: string, time?: string, hora?: string }|null} downEv
 * @param {{ fecha: string, hora_inicio?: string|null, hora_fin?: string|null }} window
 */
export function rideOverlapsScheduleWindow(upEv, downEv, window) {
  if (!window?.fecha || !upEv) return false;
  const upFecha = upEv.fecha || upEv.date;
  const upHora = upEv.hora_inicio || upEv.time || upEv.hora || "00:00";
  const r0 = scheduleInstantMinutes(upFecha, upHora);
  if (r0 == null) return false;

  let r1 = Number.POSITIVE_INFINITY;
  if (downEv) {
    const downFecha = downEv.fecha || downEv.date;
    const downHora = downEv.hora_inicio || downEv.time || downEv.hora || "00:00";
    const downMs = scheduleInstantMinutes(downFecha, downHora);
    if (downMs != null) r1 = downMs;
  }

  const w0 = scheduleInstantMinutes(
    window.fecha,
    window.hora_inicio || "00:00",
  );
  if (w0 == null) return false;
  let w1 = scheduleInstantMinutes(
    window.fecha,
    window.hora_fin || window.hora_inicio || "00:00",
  );
  if (w1 == null) w1 = w0;
  // Punto (sin fin o fin=inicio): 1 min de duración para poder solapar
  const wEnd = w1 <= w0 ? w0 + 1 : w1;

  return r0 < wEnd && w0 < r1;
}

/**
 * Normaliza un evento (fila DB o subidaData/bajadaData de logística) a {fecha, hora_inicio}.
 * @param {object|null|undefined} ev
 */
export function normalizeScheduleEvent(ev) {
  if (!ev) return null;
  const fecha = ev.fecha || ev.date || null;
  if (!fecha) return null;
  return {
    fecha: String(fecha).slice(0, 10),
    hora_inicio: ev.hora_inicio || ev.time || ev.hora || null,
  };
}

/**
 * Suma asientos de rides cuyo intervalo [subida, bajada) solapa la ventana.
 *
 * @param {Array<object>} rides
 * @param {Record<string, object>|Map<string, object>|null} eventsById
 * @param {{ fecha: string, hora_inicio?: string|null, hora_fin?: string|null }} window
 * @param {{ excludeBoardEventIds?: Set<string>|null }} [opts]
 */
export function sumRidesOccupyingWindow(
  rides,
  eventsById,
  window,
  opts = {},
) {
  const exclude = opts.excludeBoardEventIds || null;
  const lookup = (id) => {
    if (id == null || id === "") return null;
    const key = String(id);
    if (eventsById instanceof Map) return eventsById.get(key) || null;
    return eventsById?.[key] || null;
  };

  let total = 0;
  for (const r of rides || []) {
    if (r?.subidaId == null || r.subidaId === "") continue;
    if (exclude && exclude.has(String(r.subidaId))) continue;

    const upEv =
      normalizeScheduleEvent(r.subidaEvent) ||
      normalizeScheduleEvent(r.subidaData) ||
      normalizeScheduleEvent(lookup(r.subidaId));
    const downEv =
      r.bajadaId == null || r.bajadaId === ""
        ? null
        : normalizeScheduleEvent(r.bajadaEvent) ||
          normalizeScheduleEvent(r.bajadaData) ||
          normalizeScheduleEvent(lookup(r.bajadaId));

    if (rideOverlapsScheduleWindow(upEv, downEv, window)) {
      total += Math.max(0, Number(r.seats) || 0);
    }
  }
  return total;
}

/**
 * Siguiente parada en la secuencia unificada del vehículo (OFRN + FIMBA).
 * El residual sintético baja en la parada inmediata siguiente del mismo
 * `giras_transportes` — no se saltean Arribos/paradas OFRN.
 *
 * @param {Array<object>} sorted — ya filtrada como secuencia de boarding
 * @param {number} fromIdx
 */
export function nextSyntheticAlightEvent(sorted, fromIdx) {
  const list = sorted || [];
  if (!Number.isFinite(fromIdx) || fromIdx < 0 || fromIdx >= list.length - 1) {
    return null;
  }
  return list[fromIdx + 1] || null;
}

/**
 * Construye pasajeros-ride sintéticos FIMBA por secuencia unificada de unidad.
 *
 * Solo eventos de **tipo transporte** generan residual. Un Concierto con
 * `fimba_evento_transportes.plazas` no inventa subida/bajada. La bajada
 * sintética es la **siguiente parada del timeline** (OFRN o FIMBA).
 *
 * @param {Array<object>} sortedEvents — secuencia de boarding del vehículo
 * @param {number|string} idGiraTransporte
 * @param {(p: object) => { para_transporte?: number }} [capacityFn]
 * @param {{
 *   skipBoardEventIds?: Set<string>,
 *   explicitSeatsByEventId?: Map<string, number>|Record<string, number>|null,
 * }} [opts] — residual = plazas evento − plazas explícitas que suben ahí
 * @returns {Array<{ key: string, subidaId: unknown, bajadaId: unknown|null, seats: number, source: 'fimba' }>}
 */
export function buildFimbaSyntheticRides(
  sortedEvents,
  idGiraTransporte,
  capacityFn,
  opts = {},
) {
  const rides = [];
  const sorted = sortedEvents || [];
  const skipBoard = opts.skipBoardEventIds || null;
  const explicitByEvent = opts.explicitSeatsByEventId || null;
  const explicitSeats = (eventId) => {
    if (!explicitByEvent || eventId == null) return 0;
    const key = String(eventId);
    if (explicitByEvent instanceof Map) {
      return Math.max(0, Number(explicitByEvent.get(key)) || 0);
    }
    return Math.max(0, Number(explicitByEvent[key]) || 0);
  };

  sorted.forEach((ev, idx) => {
    // Legacy: skipBoard omite por completo (compat). Preferir residual vía explicitSeatsByEventId.
    if (skipBoard && skipBoard.has(String(ev.id)) && !explicitByEvent) return;
    // No hop sintético desde Concierto / no-transporte (aunque tengan plazas de flota).
    if (!isTransportTipoEvent(ev)) return;
    const seats = resolveFimbaSeatsForVehicle(ev, idGiraTransporte, capacityFn);
    if (seats <= 0) return;
    const residual = Math.max(0, seats - explicitSeats(ev.id));
    if (residual <= 0) return;
    const next = nextSyntheticAlightEvent(sorted, idx);
    const props = ev?.propuestas || [];
    const single = props.length === 1 ? props[0] : null;
    rides.push({
      key: `fimba-${ev.id}-${idGiraTransporte}`,
      subidaId: ev.id,
      bajadaId: next?.id ?? null,
      seats: residual,
      source: "fimba",
      id_propuesta: single?.id ?? null,
      nombre: single?.nombre || null,
      color: single?.color || null,
    });
  });
  return rides;
}

/**
 * Ids de eventos que son ↑/↓ de rides explícitos FIMBA o OFRN en una unidad.
 * @param {Array<object>} propuestaRoutes
 * @param {Array<object>} ofrnRides
 * @param {number|string} idGiraTransporte
 * @returns {Set<string>}
 */
export function collectVehicleRideEndpointIds(
  propuestaRoutes,
  ofrnRides,
  idGiraTransporte,
) {
  const want = Number(idGiraTransporte);
  const ids = new Set();
  for (const r of propuestaRoutes || []) {
    if (Number.isFinite(want) && Number(r?.id_gira_transporte) !== want) {
      continue;
    }
    if (r?.id_evento_subida != null && r.id_evento_subida !== "") {
      ids.add(String(r.id_evento_subida));
    }
    if (r?.id_evento_bajada != null && r.id_evento_bajada !== "") {
      ids.add(String(r.id_evento_bajada));
    }
  }
  for (const r of ofrnRides || []) {
    if (r?.subidaId != null && r.subidaId !== "") {
      ids.add(String(r.subidaId));
    }
    if (r?.bajadaId != null && r.bajadaId !== "") {
      ids.add(String(r.bajadaId));
    }
  }
  return ids;
}

/**
 * ¿Entra el evento a la secuencia unificada de boarding de la unidad?
 * Misma flota física → mismas paradas OFRN + FIMBA en un solo timeline.
 *
 * Incluye:
 * - Tipo transporte con asignación a la unidad
 * - Parada OFRN (`id_gira_transporte` = unidad) — **nunca** se omiten
 * - Endpoint de ruta explícita ↑/↓ (p.ej. Concierto con subida/bajada real)
 *
 * Excluye: Concierto/hotel/etc. que solo tienen `fimba_evento_transportes`
 * sin ser tipo transporte ni endpoint ↑/↓ (no afectan subir/bajar).
 *
 * @param {object} ev
 * @param {number|string} idGiraTransporte
 * @param {(ev: object) => number[]} eventVehicleIds
 * @param {Set<string>|null|undefined} endpointEventIds
 */
export function isVehicleBoardingSequenceEvent(
  ev,
  idGiraTransporte,
  eventVehicleIds,
  endpointEventIds,
) {
  const tid = Number(idGiraTransporte);
  if (!Number.isFinite(tid) || !ev) return false;
  const eid = ev.id != null ? String(ev.id) : "";
  const isEndpoint = Boolean(eid && endpointEventIds?.has(eid));

  const fleetIds =
    typeof eventVehicleIds === "function" ? eventVehicleIds(ev) : [];
  const onFleet = (fleetIds || []).some((id) => Number(id) === tid);
  const ofrnUnit =
    ev.id_gira_transporte != null &&
    ev.id_gira_transporte !== "" &&
    Number(ev.id_gira_transporte) === tid;

  // Parada OFRN de esta unidad: siempre en la secuencia unificada
  if (ofrnUnit) return true;
  if (!onFleet && !isEndpoint) return false;
  if (isTransportTipoEvent(ev)) return true;
  if (isEndpoint) return true;
  return false;
}

/**
 * Combina rides explícitos + residual sintético.
 * Si hay ↑ artista (p.ej. 2) y el evento reserva 6 plazas, quedan 4 sintéticas.
 *
 * @param {Array<object>} sortedEvents
 * @param {number|string} idGiraTransporte
 * @param {Array} propuestaRoutes
 * @param {(p: object) => { para_transporte?: number }} [capacityFn]
 */
export function buildFimbaRidesForVehicle(
  sortedEvents,
  idGiraTransporte,
  propuestaRoutes,
  capacityFn,
) {
  const explicit = buildFimbaExplicitRides(propuestaRoutes, idGiraTransporte);
  /** @type {Map<string, number>} */
  const explicitSeatsByEventId = new Map();
  for (const r of explicit) {
    if (r.subidaId == null || r.subidaId === "") continue;
    const key = String(r.subidaId);
    explicitSeatsByEventId.set(
      key,
      (explicitSeatsByEventId.get(key) || 0) + (Number(r.seats) || 0),
    );
  }
  const synthetic = buildFimbaSyntheticRides(
    sortedEvents,
    idGiraTransporte,
    capacityFn,
    { explicitSeatsByEventId },
  );
  return [...explicit, ...synthetic];
}

/**
 * Pasajeros OFRN a bordo de la unidad con sus paradas (subida/bajada).
 *
 * @param {Array<object>} summary — output `calculateLogisticsSummary`
 * @param {number|string} idGiraTransporte
 * @returns {Array<{ id: unknown, seats: number, subidaId: unknown|null, bajadaId: unknown|null, source: 'ofrn', subidaData?: object|null, bajadaData?: object|null }>}
 */
export function extractOfrnRidesForVehicle(summary, idGiraTransporte) {
  const want = String(idGiraTransporte);
  const rides = [];
  for (const p of summary || []) {
    if (p?.estado_gira === "ausente") continue;
    const tr = (p.logistics?.transports || p.transports || []).find(
      (t) => String(t.id) === want,
    );
    if (!tr) continue;
    rides.push({
      id: p.id,
      seats: ofrnSeatWeight(p),
      subidaId: tr.subidaId ?? null,
      bajadaId: tr.bajadaId ?? null,
      subidaData: tr.subidaData || null,
      bajadaData: tr.bajadaData || null,
      source: "ofrn",
      apellido: p.apellido,
      nombre: p.nombre,
    });
  }
  return rides;
}

/**
 * Suma asientos de rides presentes en parada (isPresentAtStop).
 * @param {Array} rides
 * @param {Array} sorted
 * @param {number} currentIdx
 * @param {(r: object) => boolean} [filterFn]
 */
export function sumPresentSeatsAtStop(rides, sorted, currentIdx, filterFn) {
  let total = 0;
  for (const r of rides || []) {
    if (typeof filterFn === "function" && !filterFn(r)) continue;
    if (!r.subidaId && !r.bajadaId) continue;
    const upIdx = r.subidaId != null ? indexOfEvent(sorted, r.subidaId) : -1;
    // Si solo tiene bajada (sin subida), cuenta solo en el evento de bajada
    if (upIdx < 0) {
      if (
        r.bajadaId != null &&
        String(r.bajadaId) === String(sorted?.[currentIdx]?.id)
      ) {
        total += Number(r.seats) || 0;
      }
      continue;
    }
    const downIdx =
      r.bajadaId != null && r.bajadaId !== ""
        ? indexOfEvent(sorted, r.bajadaId)
        : null;
    if (isPresentAtStop(upIdx, downIdx, currentIdx)) {
      total += Number(r.seats) || 0;
    }
  }
  return total;
}

/**
 * Headcount por propuesta en la parada (presentes).
 * @returns {Map<string, { id_propuesta: string, seats: number, nombre?: string|null, color?: string|null }>}
 */
export function headcountByPropuestaAtStop(fimbaRides, sorted, currentIdx) {
  const map = new Map();
  for (const r of fimbaRides || []) {
    if (r.id_propuesta == null && r.source !== "fimba_ruta") continue;
    if (!r.subidaId && !r.bajadaId) continue;
    const upIdx = r.subidaId != null ? indexOfEvent(sorted, r.subidaId) : -1;
    let present = false;
    if (upIdx < 0) {
      present =
        r.bajadaId != null &&
        String(r.bajadaId) === String(sorted?.[currentIdx]?.id);
    } else {
      const downIdx =
        r.bajadaId != null && r.bajadaId !== ""
          ? indexOfEvent(sorted, r.bajadaId)
          : null;
      present = isPresentAtStop(upIdx, downIdx, currentIdx);
    }
    if (!present) continue;
    const pid = String(r.id_propuesta ?? "sint");
    const cur = map.get(pid) || {
      id_propuesta: r.id_propuesta ?? null,
      seats: 0,
      nombre: r.nombre || null,
      color: r.color || null,
    };
    cur.seats += Number(r.seats) || 0;
    if (!cur.nombre && r.nombre) cur.nombre = r.nombre;
    if (!cur.color && r.color) cur.color = r.color;
    map.set(pid, cur);
  }
  return map;
}

/**
 * Label UI para plazas técnicas / residual de `fimba_evento_transportes`
 * (cupo anónimo staff/TBD; no exponer “sintético”). Chip solo si
 * residual = plazas − Σ Sube > 0. Artistas nombrados → Sube.
 */
export const FIMBA_RESERVA_EVENTO_LABEL = "Reserva del evento";

/**
 * Etiqueta «Orquesta {n}».
 * @param {number|string|null|undefined} n
 */
export function formatOrquestaHeadcountLabel(n) {
  const num = Number(n);
  if (Number.isFinite(num) && num > 0) return `Orquesta ${num}`;
  return "Orquesta";
}

/**
 * ¿El ride sigue a bordo al salir de `currentIdx`?
 * @param {object} ride
 * @param {Array} sorted
 * @param {number} currentIdx
 */
function rideIsAboardAfterStop(ride, sorted, currentIdx) {
  if (!ride?.subidaId) return false;
  const upIdx = indexOfEvent(sorted, ride.subidaId);
  const downIdx =
    ride.bajadaId != null && ride.bajadaId !== ""
      ? indexOfEvent(sorted, ride.bajadaId)
      : null;
  return isOnBoardAfterStop(upIdx, downIdx, currentIdx);
}

/**
 * Personas OFRN presentes en la parada (pueden bajar aquí) sobre una unidad.
 * Usa la jerarquía ya resuelta en `logistics.transports` (subidaId/bajadaId).
 *
 * @param {{
 *   passengers?: Array<object>,
 *   transportId?: unknown,
 *   eventId?: unknown,
 *   sortedEvents?: Array<{ id?: unknown }>,
 * }} opts
 * @returns {Array<{
 *   id: unknown,
 *   person: object,
 *   seats: number,
 *   subidaId: unknown|null,
 *   bajadaId: unknown|null,
 *   alreadyAlightingHere: boolean,
 *   openRide: boolean,
 *   label: string,
 * }>}
 */
export function listOfrnPeopleAboardAtStop(opts = {}) {
  const {
    passengers = [],
    transportId,
    eventId,
    sortedEvents = [],
  } = opts;
  if (transportId == null || transportId === "" || eventId == null || eventId === "") {
    return [];
  }

  const sorted = Array.isArray(sortedEvents) ? sortedEvents : [];
  const currentIdx = sorted.length ? indexOfEvent(sorted, eventId) : -1;
  const want = String(transportId);
  const out = [];

  for (const p of passengers || []) {
    if (p?.estado_gira === "ausente") continue;
    const tr = (p.logistics?.transports || p.transports || []).find(
      (t) => String(t.id) === want,
    );
    if (!tr?.subidaId) continue;

    let present = false;
    let openRide = false;
    if (currentIdx >= 0) {
      const upIdx = indexOfEvent(sorted, tr.subidaId);
      const downIdx =
        tr.bajadaId != null && tr.bajadaId !== ""
          ? indexOfEvent(sorted, tr.bajadaId)
          : null;
      present = isPresentAtStop(upIdx, downIdx, currentIdx);
      // Ride abierto = aún a bordo al salir de la parada *anterior*, o presente
      // sin bajada / con bajada posterior (hay que fijar bajada aquí).
      openRide =
        present &&
        (downIdx == null ||
          downIdx < 0 ||
          !Number.isFinite(downIdx) ||
          downIdx > currentIdx);
    } else {
      // Sin secuencia: a bordo si tiene subida y (sin bajada o baja en este evento)
      present =
        !tr.bajadaId ||
        tr.bajadaId === "" ||
        String(tr.bajadaId) === String(eventId);
      openRide = !tr.bajadaId || tr.bajadaId === "";
    }
    if (!present) continue;

    const alreadyAlightingHere =
      tr.bajadaId != null &&
      tr.bajadaId !== "" &&
      String(tr.bajadaId) === String(eventId);

    out.push({
      id: p.id,
      person: p,
      seats: ofrnSeatWeight(p),
      subidaId: tr.subidaId ?? null,
      bajadaId: tr.bajadaId ?? null,
      alreadyAlightingHere,
      openRide,
      label:
        `${p.apellido || ""}, ${p.nombre || ""}`
          .replace(/^,\s*|,\s*$/g, "")
          .trim() || `Integrante #${p.id}`,
    });
  }

  out.sort((a, b) =>
    String(a.label).localeCompare(String(b.label), "es", { sensitivity: "base" }),
  );
  return out;
}

/**
 * Desglose de quién está a bordo **al salir** de la parada (misma semántica
 * que `en_transito`): artistas FIMBA, Orquesta OFRN y reserva técnica.
 *
 * @param {{
 *   ofrnRides?: Array<object>,
 *   fimbaRides?: Array<object>,
 *   sortedEvents?: Array<object>,
 *   currentIdx?: number,
 *   propuestas?: Array<object>,
 * }} opts
 * @returns {{
 *   lines: Array<{ key: string, kind: 'fimba'|'ofrn'|'reserva', label: string, plazas: number, color?: string|null }>,
 *   total: number,
 *   titleText: string,
 * }}
 */
export function resolveAboardAfterStopBreakdown(opts = {}) {
  const {
    ofrnRides = [],
    fimbaRides = [],
    sortedEvents = [],
    currentIdx = -1,
    propuestas = [],
  } = opts;
  /** @type {Array<{ key: string, kind: 'fimba'|'ofrn'|'reserva', label: string, plazas: number, color?: string|null }>} */
  const lines = [];
  if (!Number.isFinite(currentIdx) || currentIdx < 0) {
    return { lines, total: 0, titleText: "Sin pasajeros a bordo" };
  }

  let ofrnSeats = 0;
  /** @type {string[]} */
  const ofrnSurnames = [];
  for (const r of ofrnRides || []) {
    if (!rideIsAboardAfterStop(r, sortedEvents, currentIdx)) continue;
    ofrnSeats += Math.max(0, Number(r.seats) || 0);
    const ap = String(r.apellido || "").trim();
    if (ap) ofrnSurnames.push(ap);
  }
  if (ofrnSeats > 0) {
    let ofrnLabel = "Orquesta";
    if (ofrnSurnames.length > 0 && ofrnSurnames.length <= 4) {
      ofrnLabel = `Orquesta · ${ofrnSurnames.join(", ")}`;
    } else if (ofrnSurnames.length > 4) {
      ofrnLabel = `Orquesta · ${ofrnSurnames.slice(0, 3).join(", ")}…`;
    }
    lines.push({
      key: "ofrn",
      kind: "ofrn",
      label: ofrnLabel,
      plazas: ofrnSeats,
      color: null,
    });
  }

  /** @type {Map<string, { key: string, kind: 'fimba', label: string, plazas: number, color: string|null }>} */
  const byArtist = new Map();
  let reservaSeats = 0;
  for (const r of fimbaRides || []) {
    if (!rideIsAboardAfterStop(r, sortedEvents, currentIdx)) continue;
    const seats = Math.max(0, Number(r.seats) || 0);
    if (seats <= 0) continue;
    // Residual técnico (source `fimba` de buildFimbaSyntheticRides): siempre reserva.
    if (r.source === "fimba" || r.source === "synthetic") {
      reservaSeats += seats;
      continue;
    }
    const pid = r.id_propuesta;
    if (pid == null || pid === "") {
      reservaSeats += seats;
      continue;
    }
    const id = String(pid);
    const fromList =
      (propuestas || []).find((p) => String(p.id) === id) || null;
    const nombre =
      r.nombre ||
      fromList?.nombre ||
      `Artista #${id}`;
    const cur = byArtist.get(id) || {
      key: `fimba-${id}`,
      kind: "fimba",
      label: String(nombre).trim() || `Artista #${id}`,
      plazas: 0,
      color: r.color || fromList?.color || null,
    };
    cur.plazas += seats;
    if (!cur.color && (r.color || fromList?.color)) {
      cur.color = r.color || fromList?.color || null;
    }
    byArtist.set(id, cur);
  }
  for (const row of byArtist.values()) {
    if (row.plazas > 0) lines.push(row);
  }
  if (reservaSeats > 0) {
    lines.push({
      key: "reserva",
      kind: "reserva",
      label: FIMBA_RESERVA_EVENTO_LABEL,
      plazas: reservaSeats,
      color: null,
    });
  }

  lines.sort((a, b) => {
    const order = { ofrn: 0, fimba: 1, reserva: 2 };
    const d = (order[a.kind] ?? 9) - (order[b.kind] ?? 9);
    if (d !== 0) return d;
    return String(a.label).localeCompare(String(b.label), "es");
  });

  const total = lines.reduce((s, l) => s + (Number(l.plazas) || 0), 0);
  const titleText =
    lines.length === 0
      ? "Sin pasajeros a bordo"
      : lines.map((l) => `${l.label} — ${l.plazas}`).join("\n");
  return { lines, total, titleText };
}

/**
 * Etiqueta artista: `{nombre} {n}` o solo nombre si n no aplica.
 * @param {string} nombre
 * @param {number|string|null|undefined} n
 */
export function formatArtistaHeadcountLabel(nombre, n) {
  const name = String(nombre || "Artista").trim() || "Artista";
  const num = Number(n);
  if (Number.isFinite(num) && num > 0) return `${name} ${num}`;
  return name;
}

/** Máx. caracteres del nombre en chips Subidas/Bajadas (planilla Transportes). */
export const BOARD_CHIP_NAME_MAX_CHARS = 18;

/**
 * Label de chip Subidas/Bajadas: `{nombre} {n}` o `{nombre}… {n}`.
 * Trunca por caracteres para que la cantidad nunca se pierda en ellipsis CSS.
 *
 * @param {string|null|undefined} label
 * @param {number|string|null|undefined} plazas
 * @param {number} [maxNameChars=BOARD_CHIP_NAME_MAX_CHARS]
 * @returns {string}
 */
export function formatBoardChipLabel(
  label,
  plazas,
  maxNameChars = BOARD_CHIP_NAME_MAX_CHARS,
) {
  const name = String(label ?? "").trim();
  const n = Number(plazas);
  const qty = Number.isFinite(n) ? String(n) : String(plazas ?? "").trim();
  if (!name) return qty;
  if (!qty) return name;
  const limit = Math.max(1, Number(maxNameChars) || BOARD_CHIP_NAME_MAX_CHARS);
  if (name.length <= limit) return `${name} ${qty}`;
  const cut = name.slice(0, limit).replace(/\s+$/u, "");
  return `${cut || name.slice(0, 1)}… ${qty}`;
}

/**
 * Secuencia de paradas con Δ y en tránsito (plazas) para una unidad.
 * OFRN + FIMBA en el mismo rolling «a bordo» (un vehículo = un timeline).
 *
 * En cada parada:
 *   board_seats  = Σ plazas que suben aquí (OFRN + FIMBA)
 *   alight_seats = Σ plazas que bajan aquí (OFRN + FIMBA)
 *   delta        = board_seats − alight_seats
 *   en_transito  = a bordo **al salir** (isOnBoardAfterStop: ya no cuenta
 *                  quien bajó en esta parada; sí quien subió)
 *
 * @param {{
 *   events: Array<object>,
 *   ofrnRides?: Array<{ seats: number, subidaId?: unknown, bajadaId?: unknown|null }>,
 *   fimbaRides?: Array<{ seats: number, subidaId?: unknown, bajadaId?: unknown|null, id_propuesta?: unknown }>,
 *   capacidad?: number|null,
 * }} opts
 */
export function buildVehicleBoardingSequence(opts = {}) {
  const sorted = sortEventsBySchedule(opts.events || []);
  const ofrnRides = opts.ofrnRides || [];
  const fimbaRides = opts.fimbaRides || [];
  const allRides = [...ofrnRides, ...fimbaRides];
  const capacidad =
    opts.capacidad != null && Number.isFinite(Number(opts.capacidad))
      ? Number(opts.capacidad)
      : null;

  let peak = 0;
  let anyNegative = false;

  const stops = sorted.map((evt, currentIdx) => {
    const boardOfrn = ofrnRides
      .filter((r) => r.subidaId != null && String(r.subidaId) === String(evt.id))
      .reduce((s, r) => s + (Number(r.seats) || 0), 0);
    const alightOfrn = ofrnRides
      .filter((r) => r.bajadaId != null && String(r.bajadaId) === String(evt.id))
      .reduce((s, r) => s + (Number(r.seats) || 0), 0);
    const boardFimba = fimbaRides
      .filter((r) => r.subidaId != null && String(r.subidaId) === String(evt.id))
      .reduce((s, r) => s + (Number(r.seats) || 0), 0);
    const alightFimba = fimbaRides
      .filter((r) => r.bajadaId != null && String(r.bajadaId) === String(evt.id))
      .reduce((s, r) => s + (Number(r.seats) || 0), 0);

    const boardSeats = boardOfrn + boardFimba;
    const alightSeats = alightOfrn + alightFimba;
    const delta = boardSeats - alightSeats;

    let enTransito = 0;
    let enTransitoOfrn = 0;
    let enTransitoFimba = 0;
    for (const r of allRides) {
      if (!r.subidaId) continue;
      const upIdx = indexOfEvent(sorted, r.subidaId);
      const downIdx =
        r.bajadaId != null && r.bajadaId !== ""
          ? indexOfEvent(sorted, r.bajadaId)
          : null;
      if (isOnBoardAfterStop(upIdx, downIdx, currentIdx)) {
        const seats = Number(r.seats) || 0;
        enTransito += seats;
        if (r.source === "ofrn") enTransitoOfrn += seats;
        else enTransitoFimba += seats;
      }
    }

    const orquesta_en_lugar = sumPresentSeatsAtStop(
      ofrnRides,
      sorted,
      currentIdx,
    );
    const artistas_en_lugar = headcountByPropuestaAtStop(
      fimbaRides,
      sorted,
      currentIdx,
    );
    const fimba_en_lugar = sumPresentSeatsAtStop(
      fimbaRides,
      sorted,
      currentIdx,
    );

    // Defensa: recomputo no debería ser negativo; avisar si fórmula y delta desincronizan
    if (enTransito < 0) {
      anyNegative = true;
      enTransito = 0;
    }

    if (enTransito > peak) peak = enTransito;

    const kind = classifyStopMovement(boardSeats, alightSeats);
    const overbook =
      capacidad != null && capacidad > 0 && enTransito > capacidad;
    const libres =
      capacidad != null && capacidad > 0
        ? Math.max(0, capacidad - enTransito)
        : null;

    const a_bordo = resolveAboardAfterStopBreakdown({
      ofrnRides,
      fimbaRides,
      sortedEvents: sorted,
      currentIdx,
    });

    return {
      eventId: evt.id,
      evt,
      stopNum: currentIdx + 1,
      location: formatEventLocation(evt),
      movimiento: kind,
      movimiento_label: movementLabelEs(kind),
      board_seats: boardSeats,
      alight_seats: alightSeats,
      board_ofrn: boardOfrn,
      alight_ofrn: alightOfrn,
      board_fimba: boardFimba,
      alight_fimba: alightFimba,
      delta,
      en_transito: enTransito,
      en_transito_ofrn: enTransitoOfrn,
      en_transito_fimba: enTransitoFimba,
      /** Desglose a bordo al salir (tooltip Tránsito/cap). */
      a_bordo,
      orquesta_en_lugar,
      fimba_en_lugar,
      /** Map id_propuesta → { seats, nombre, color } */
      artistas_en_lugar,
      capacidad,
      libres,
      overbook,
    };
  });

  // Detectar secuencia inconsistente (más bajadas que subidas acumuladas)
  let rolling = 0;
  for (const s of stops) {
    rolling += s.delta;
    if (rolling < 0) anyNegative = true;
  }

  return {
    sortedEvents: sorted,
    stops,
    byEventId: Object.fromEntries(stops.map((s) => [String(s.eventId), s])),
    peak_en_transito: peak,
    capacidad,
    libres_peak:
      capacidad != null && capacidad > 0 ? Math.max(0, capacidad - peak) : null,
    overbook_peak: capacidad != null && capacidad > 0 && peak > capacidad,
    warn_negative: anyNegative,
    ofrnRides,
    fimbaRides,
  };
}

/**
 * Calcula secuencias para todas las unidades de flota dadas las filas de planilla.
 *
 * @param {{
 *   vehiculos: Array<{ id: unknown, capacidad_maxima?: number|null }>,
 *   eventos: Array<object>,
 *   logisticsSummary?: Array<object>,
 *   capacityFn?: (p: object) => { para_transporte?: number },
 *   eventVehicleIds?: (ev: object) => number[],
 *   propuestaRoutes?: Array,
 * }} opts
 */
export function buildAllVehicleBoardingSequences(opts = {}) {
  const {
    vehiculos = [],
    eventos = [],
    logisticsSummary = [],
    capacityFn,
    eventVehicleIds,
    propuestaRoutes = [],
  } = opts;

  const idFn =
    typeof eventVehicleIds === "function"
      ? eventVehicleIds
      : (ev) => {
          const ids = [];
          for (const r of ev?.vehiculos || []) {
            const n = Number(r?.id_gira_transporte);
            if (Number.isFinite(n)) ids.push(n);
          }
          if (ev?.id_gira_transporte != null && ev.id_gira_transporte !== "") {
            const n = Number(ev.id_gira_transporte);
            if (Number.isFinite(n)) ids.push(n);
          }
          return [...new Set(ids)];
        };

  const map = new Map();

  for (const gt of vehiculos) {
    const tid = Number(gt.id);
    if (!Number.isFinite(tid)) continue;
    // OFRN rides primero: sus endpoints entran a la secuencia aunque el evento
    // no tenga fila FIMBA (y marcan Conciertos solo si son ↑/↓ reales).
    const ofrnRides = extractOfrnRidesForVehicle(logisticsSummary, tid);
    const endpointIds = collectVehicleRideEndpointIds(
      propuestaRoutes,
      ofrnRides,
      tid,
    );
    const vehicleEvents = sortEventsBySchedule(
      (eventos || []).filter((ev) =>
        isVehicleBoardingSequenceEvent(ev, tid, idFn, endpointIds),
      ),
    );
    const fimbaRides = buildFimbaRidesForVehicle(
      vehicleEvents,
      tid,
      propuestaRoutes,
      capacityFn,
    );
    const seq = buildVehicleBoardingSequence({
      events: vehicleEvents,
      ofrnRides,
      fimbaRides,
      capacidad:
        gt.capacidad_maxima != null ? Number(gt.capacidad_maxima) : null,
    });
    map.set(tid, seq);
  }

  return map;
}

/**
 * Personas a bordo al salir (Σ `en_transito`) de las unidades del evento.
 * Misma fuente que Tránsito/cap en Transportes.
 *
 * @param {object} ev
 * @param {Map<number, ReturnType<typeof buildVehicleBoardingSequence>>} sequencesByVehicle
 * @param {number[]|null} [preferVehicleIds]
 * @returns {number|null} total a bordo, o `null` si el evento no tiene flota / no es transporte abordable
 */
export function resolveEventAboardCount(
  ev,
  sequencesByVehicle,
  preferVehicleIds = null,
) {
  const metrics = boardingMetricsForEventRow(
    ev,
    sequencesByVehicle,
    preferVehicleIds,
  );
  const per = metrics?.perVehicle || [];
  if (per.length === 0) return null;
  let total = 0;
  let sawStop = false;
  for (const pv of per) {
    if (!pv?.stop) continue;
    sawStop = true;
    total += Math.max(0, Number(pv.stop.en_transito) || 0);
  }
  return sawStop ? total : 0;
}

/**
 * Métricas de boarding para una fila de planilla (puede multi-vehículo).
 * Si hay un solo vehículo "preferido", usa esa secuencia; si no, agrega por unidad.
 *
 * @param {object} ev
 * @param {Map<number, ReturnType<typeof buildVehicleBoardingSequence>>} sequencesByVehicle
 * @param {number[]|null} preferVehicleIds — p.ej. filtro activo
 */
export function boardingMetricsForEventRow(
  ev,
  sequencesByVehicle,
  preferVehicleIds = null,
) {
  const allIds = [];
  for (const r of ev?.vehiculos || []) {
    const n = Number(r?.id_gira_transporte);
    if (Number.isFinite(n)) allIds.push(n);
  }
  if (ev?.id_gira_transporte != null && ev.id_gira_transporte !== "") {
    const n = Number(ev.id_gira_transporte);
    if (Number.isFinite(n)) allIds.push(n);
  }
  const unique = [...new Set(allIds)];

  let target = unique;
  if (preferVehicleIds && preferVehicleIds.length > 0) {
    const want = new Set(preferVehicleIds.map(Number));
    const filtered = unique.filter((id) => want.has(id));
    if (filtered.length) target = filtered;
  }

  if (target.length === 0) {
    const next_event = null;
    return {
      location: formatEventLocation(ev),
      perVehicle: [],
      primary: null,
      orquesta_en_lugar: 0,
      artistas_en_lugar: new Map(),
      next_event,
      destino_siguiente: formatNextStopDestino(next_event),
      hora_fin_display: resolveHoraFinDisplay(ev, next_event),
    };
  }

  const perVehicle = target.map((tid) => {
    const seq = sequencesByVehicle?.get(Number(tid));
    const stop = seq?.byEventId?.[String(ev.id)] || null;
    return { id_gira_transporte: tid, stop, seq };
  });

  // Primary = first with stop data, else first
  // (preferVehicleIds ya redujo target al filtro activo de unidades)
  const primary =
    perVehicle.find((p) => p.stop) || perVehicle[0] || null;

  // Agregar headcounts multi-vehículo (orquesta se suma: cada bus tiene pax distintos)
  let orquesta_en_lugar = 0;
  const artistas_en_lugar = new Map();
  for (const pv of perVehicle) {
    const stopRow = pv.stop;
    if (!stopRow) continue;
    orquesta_en_lugar += Number(stopRow.orquesta_en_lugar) || 0;
    const artMap = stopRow.artistas_en_lugar;
    if (artMap && typeof artMap.forEach === "function") {
      artMap.forEach((val, key) => {
        const cur = artistas_en_lugar.get(key) || {
          id_propuesta: val.id_propuesta,
          seats: 0,
          nombre: val.nombre,
          color: val.color,
        };
        cur.seats += Number(val.seats) || 0;
        if (!cur.nombre && val.nombre) cur.nombre = val.nombre;
        if (!cur.color && val.color) cur.color = val.color;
        artistas_en_lugar.set(key, cur);
      });
    }
  }

  // Destino / hora fin: siguiente parada cronológica del vehículo primary
  const next_event = nextEventInVehicleSequence(primary?.seq, ev.id);
  const destino_siguiente = formatNextStopDestino(next_event);
  const hora_fin_display = resolveHoraFinDisplay(ev, next_event);

  return {
    location: primary?.stop?.location || formatEventLocation(ev),
    perVehicle,
    primary,
    orquesta_en_lugar,
    artistas_en_lugar,
    next_event,
    destino_siguiente,
    hora_fin_display,
  };
}

/**
 * Labels de columna Artistas a partir del contexto de boarding + tags del evento.
 *
 * Prioridad n:
 * 1) Headcount boarding presente en parada (por unidad(es) del contexto)
 * 2) Fallback: capacity para_transporte / roster label del evento
 *
 * @param {object} ev
 * @param {ReturnType<typeof boardingMetricsForEventRow>} metrics
 * @param {(p: object) => { para_transporte?: number }} [capacityFn]
 * @returns {{ orquesta_label: string|null, artista_labels: Array<{ id: unknown, label: string, color?: string|null, n: number }> }}
 */
export function resolveStopArtistasLabels(ev, metrics, capacityFn) {
  const artista_labels = [];
  const seen = new Set();
  const artMap = metrics?.artistas_en_lugar;

  // Explicit boarding headcounts first
  if (artMap && typeof artMap.forEach === "function") {
    artMap.forEach((val) => {
      if (val.id_propuesta == null) return;
      const id = String(val.id_propuesta);
      seen.add(id);
      const prop = (ev?.propuestas || []).find(
        (p) => String(p.id) === id,
      );
      const nombre = val.nombre || prop?.nombre || "Artista";
      const color = val.color || prop?.color || null;
      const n = Number(val.seats) || 0;
      artista_labels.push({
        id: val.id_propuesta,
        label: formatArtistaHeadcountLabel(nombre, n),
        color,
        n,
      });
    });
  }

  // Tagged propuestas without explicit presence: fallback planificada+materiales
  for (const p of ev?.propuestas || []) {
    const id = String(p.id);
    if (seen.has(id)) continue;
    let n = 0;
    if (typeof capacityFn === "function") {
      n = Math.max(0, Number(capacityFn(p)?.para_transporte) || 0);
    } else {
      n = Math.max(
        0,
        (Number(p.cantidad_planificada) || 0) +
          (Number(p.plazas_extra_materiales) || 0),
      );
    }
    // Si hay contexto de vehículo con métricas y el artista no aparece en
    // boarding de ninguna unidad de la fila, n de "en lugar" = 0 (no inventar).
    const hasVehicleContext = (metrics?.perVehicle || []).some((pv) => pv.stop);
    if (hasVehicleContext) n = 0;
    artista_labels.push({
      id: p.id,
      label: formatArtistaHeadcountLabel(p.nombre, n > 0 ? n : null),
      color: p.color || null,
      n,
    });
    seen.add(id);
  }

  // Orquesta: prefer boarding headcount when vehicle context exists
  let orquesta_label = null;
  const hasVehicleContext = (metrics?.perVehicle || []).some((pv) => pv.stop);
  const nBoard = Number(metrics?.orquesta_en_lugar) || 0;
  if (hasVehicleContext) {
    if (nBoard > 0) {
      orquesta_label = formatOrquestaHeadcountLabel(nBoard);
    } else if (eventHasOfrnHint(ev) || ev?.es_ofrn) {
      orquesta_label = formatOrquestaHeadcountLabel(null);
    }
  } else if (ev?.orquesta_label) {
    orquesta_label = ev.orquesta_label;
  }

  return { orquesta_label, artista_labels };
}

/**
 * Etiqueta compacta de una regla `giras_logistica_rutas` (paridad GirasTransportesManager).
 *
 * @param {object} rule
 * @param {{
 *   passengers?: Array<object>,
 *   localities?: Array<object>,
 *   regions?: Array<object>,
 * }} ctx
 */
export function resolveOfrnRouteRuleLabel(rule, ctx = {}) {
  const { passengers = [], localities = [], regions = [] } = ctx;
  const scope = rule?.alcance;
  if (scope === "General") return "Todos";
  if (scope === "Persona") {
    const p = (passengers || []).find(
      (m) => String(m.id) === String(rule.id_integrante),
    );
    if (p) {
      const ap = String(p.apellido || "").trim();
      return ap || `${p.nombre || "Persona"}`.trim() || "Individual";
    }
    return "Individual";
  }
  if (scope === "Region") {
    const reg = (regions || []).find(
      (x) => String(x.id) === String(rule.id_region),
    );
    return reg?.region || "Región";
  }
  if (scope === "Localidad") {
    const loc = (localities || []).find(
      (x) => String(x.id) === String(rule.id_localidad),
    );
    return loc?.localidad || "Loc";
  }
  if (scope === "Categoria") {
    const raw = rule.target_ids?.[0];
    if (!raw) return "Categoría";
    const key = String(raw).toUpperCase();
    return OFRN_CATEGORIA_CHIP_LABELS[key] || String(raw);
  }
  return scope ? String(scope) : "Regla";
}

/**
 * Resumen de reglas OFRN que suben/bajan en una parada×vehículo
 * (misma idea que `getEventRulesSummary` de GirasTransportesManager).
 * `plazas` = Σ `ofrnSeatWeight` de pasajeros cuya regla ganadora es esa.
 *
 * @param {{
 *   eventId: unknown,
 *   type: 'up'|'down',
 *   transportId?: unknown|null,
 *   routeRules?: Array<object>,
 *   passengers?: Array<object>,
 *   localities?: Array<object>,
 *   regions?: Array<object>,
 * }} opts
 * @returns {Array<{
 *   key: string,
 *   ruleId: unknown,
 *   label: string,
 *   plazas: number,
 *   count: number,
 *   alcance: string,
 * }>}
 */
export function summarizeOfrnStopRules(opts = {}) {
  const {
    eventId,
    type,
    transportId = null,
    routeRules = [],
    passengers = [],
    localities = [],
    regions = [],
  } = opts;
  if (eventId == null || eventId === "" || transportId == null || transportId === "") {
    return [];
  }

  const relevant = (routeRules || []).filter((r) => {
    if (String(r.id_transporte_fisico) !== String(transportId)) return false;
    if (type === "up") return String(r.id_evento_subida) === String(eventId);
    if (type === "down") return String(r.id_evento_bajada) === String(eventId);
    return false;
  });

  const labelCtx = { passengers, localities, regions };

  return relevant.map((r) => {
    const scopeNorm = normalize(r.alcance);
    const matched = (passengers || []).filter((p) => {
      if (p?.estado_gira === "ausente") return false;
      if (!matchesRule(r, p, localities)) return false;
      const tr = (p.logistics?.transports || p.transports || []).find(
        (t) => String(t.id) === String(transportId),
      );
      if (!tr) return false;
      const eventIdMatch =
        type === "up"
          ? String(tr.subidaId) === String(eventId)
          : String(tr.bajadaId) === String(eventId);
      if (!eventIdMatch) return false;
      const winningScope =
        type === "up" ? tr.subidaScope || "" : tr.bajadaScope || "";
      return scopeNorm === normalize(winningScope);
    });
    const plazas = matched.reduce((s, p) => s + ofrnSeatWeight(p), 0);
    return {
      key: `ofrn-rule-${r.id}`,
      ruleId: r.id,
      label: resolveOfrnRouteRuleLabel(r, labelCtx),
      plazas,
      count: matched.length,
      alcance: r.alcance || "",
    };
  });
}

/**
 * Chips de Subidas / Bajadas para una parada de la planilla FIMBA.
 * - FIMBA: filas de `fimba_propuesta_rutas` en ese extremo (removibles).
 * - OFRN: una chip por regla `giras_logistica_rutas` (quién/alcance + plazas);
 *   fallback «Orquesta n» si hay asientos boarding sin reglas listables.
 * - Residual sintético: plazas FIMBA de boarding math sin ruta explícita (solo lectura).
 *
 * @param {{
 *   eventId: unknown,
 *   idGiraTransporte?: unknown|null,
 *   type: 'up'|'down',
 *   propuestaRoutes?: Array<object>,
 *   propuestas?: Array<object>,
 *   stop?: object|null,
 *   ofrnRouteRules?: Array<object>,
 *   ofrnPassengers?: Array<object>,
 *   ofrnLocalities?: Array<object>,
 *   ofrnRegions?: Array<object>,
 * }} opts
 * @returns {{
 *   chips: Array<{
 *     key: string,
 *     kind: 'fimba'|'ofrn'|'synthetic',
 *     label: string,
 *     plazas: number,
 *     color?: string|null,
 *     rutaId?: unknown,
 *     id_propuesta?: unknown,
 *     removable: boolean,
 *   }>,
 *   total: number,
 * }}
 */
export function resolveStopBoardAlightChips(opts = {}) {
  const {
    eventId,
    idGiraTransporte = null,
    type,
    propuestaRoutes = [],
    propuestas = [],
    stop = null,
    ofrnRouteRules = [],
    ofrnPassengers = [],
    ofrnLocalities = [],
    ofrnRegions = [],
  } = opts;
  const chips = [];
  if (eventId == null || eventId === "") {
    return { chips, total: 0 };
  }

  const eventField = type === "down" ? "id_evento_bajada" : "id_evento_subida";
  let fimbaExplicit = 0;

  for (const r of propuestaRoutes || []) {
    if (
      idGiraTransporte != null &&
      idGiraTransporte !== "" &&
      Number(r?.id_gira_transporte) !== Number(idGiraTransporte)
    ) {
      continue;
    }
    const stopId = r?.[eventField];
    if (stopId == null || stopId === "") continue;
    if (String(stopId) !== String(eventId)) continue;
    const plazas = Math.max(0, Number(r.plazas) || 0);
    if (plazas <= 0) continue;

    const fromJoin = r.propuesta || {};
    const fromList =
      (propuestas || []).find((p) => String(p.id) === String(r.id_propuesta)) ||
      {};
    const nombre =
      fromJoin.nombre || fromList.nombre || `Artista #${r.id_propuesta}`;
    const color = fromJoin.color || fromList.color || null;

    chips.push({
      key: `ruta-${r.id}`,
      kind: "fimba",
      label: String(nombre).trim() || `Artista #${r.id_propuesta}`,
      plazas,
      color,
      rutaId: r.id,
      id_propuesta: r.id_propuesta,
      removable: true,
    });
    fimbaExplicit += plazas;
  }

  const ofrnSeats =
    type === "down"
      ? Math.max(0, Number(stop?.alight_ofrn) || 0)
      : Math.max(0, Number(stop?.board_ofrn) || 0);

  const ofrnRuleRows = summarizeOfrnStopRules({
    eventId,
    type,
    transportId: idGiraTransporte,
    routeRules: ofrnRouteRules,
    passengers: ofrnPassengers,
    localities: ofrnLocalities,
    regions: ofrnRegions,
  });

  if (ofrnRuleRows.length > 0) {
    for (const row of ofrnRuleRows) {
      chips.push({
        key: row.key,
        kind: "ofrn",
        label: row.label,
        plazas: row.plazas,
        color: null,
        removable: false,
        title: `Orquesta OFRN · ${row.alcance || "regla"} — clic para gestionar subir/bajar`,
      });
    }
  } else if (ofrnSeats > 0) {
    chips.push({
      key: `ofrn-${eventId}-${type}`,
      kind: "ofrn",
      label: "Orquesta",
      plazas: ofrnSeats,
      color: null,
      removable: false,
      title: "Orquesta OFRN — clic para reglas de ruta",
    });
  }

  const stopFimba =
    type === "down"
      ? Math.max(0, Number(stop?.alight_fimba) || 0)
      : Math.max(0, Number(stop?.board_fimba) || 0);
  const residual = Math.max(0, stopFimba - fimbaExplicit);
  if (residual > 0) {
    chips.push({
      key: `sint-${eventId}-${type}`,
      kind: "synthetic",
      label: FIMBA_RESERVA_EVENTO_LABEL,
      plazas: residual,
      color: null,
      removable: false,
      title:
        type === "down"
          ? "Plazas técnicas del trayecto anterior que bajan aquí (sin artista nombrado)"
          : "Plazas reservadas en el evento sin regla de artista (fimba_evento_transportes − ↑ explícitas)",
    });
  }

  // Total: seats boarding (OFRN math) + FIMBA chips; no sumar reglas OFRN
  // (pueden ser 0 plazas) ni double-count plaza_extra.
  const fimbaChipSeats = chips
    .filter((c) => c.kind === "fimba" || c.kind === "synthetic")
    .reduce((s, c) => s + (Number(c.plazas) || 0), 0);
  const total = fimbaChipSeats + ofrnSeats;
  return { chips, total };
}

function eventHasOfrnHint(ev) {
  if (!ev) return false;
  if (ev.es_ofrn) return true;
  const ao = ev.audiencia_ofrn;
  if (ao === "tutti" || ao === "grupos") return true;
  if (ao == null || ao === "") return false;
  return false;
}

/** Color badge «Traslado» en agenda de artista (cian FIMBA). */
export const FIMBA_TRASLADO_AGENDA_TIPO_COLOR = "#00b1eb";

/**
 * Snippet de ruta: locación (o actividad) de parada A → B.
 * @param {object|null|undefined} fromEv
 * @param {object|null|undefined} toEv
 */
export function formatRideRouteSnippet(fromEv, toEv) {
  const from =
    formatEventLocation(fromEv) !== "—"
      ? formatEventLocation(fromEv)
      : String(fromEv?.actividad || fromEv?.tipo_nombre || "").trim() || "Origen";
  if (!toEv) return `${from} → (sin bajada)`;
  const to =
    formatEventLocation(toEv) !== "—"
      ? formatEventLocation(toEv)
      : String(toEv?.actividad || toEv?.tipo_nombre || "").trim() || "Destino";
  return `${from} → ${to}`;
}

/**
 * Bloques de agenda «a bordo» para un artista a partir de `fimba_propuesta_rutas`.
 *
 * @deprecated Agenda ya no inserta filas sintéticas; usar paradas reales +
 * `eventMatchesPropuestaRouteFilter`. Se conserva por compatibilidad de API.
 *
 * Un ride = un tramo continuo (sube en A → baja en B). Hop off + on = varios bloques.
 * Solo plazas > 0 con `id_propuesta` del artista y `id_evento_subida` resuelto.
 *
 * @param {{
 *   idPropuesta: number|string,
 *   rides?: Array<{
 *     key?: string,
 *     subidaId?: unknown,
 *     bajadaId?: unknown|null,
 *     seats?: number,
 *     id_propuesta?: unknown,
 *     source?: string,
 *     id_gira_transporte?: unknown,
 *     nombre?: string|null,
 *     color?: string|null,
 *   }>,
 *   propuestaRoutes?: Array,
 *   eventsById?: Map<string, object>|Record<string, object>,
 *   vehiculosById?: Map<string|number, object>|Record<string|number, object>,
 *   labelVehicle?: (gt: object|null) => string,
 * }} opts
 * @returns {Array<object>} filas compatibles con agenda FIMBA (`es_ride_segment: true`)
 */
export function buildArtistaTrasladoAgendaBlocks(opts = {}) {
  const idPropuesta = opts.idPropuesta;
  if (idPropuesta == null || idPropuesta === "") return [];

  const want = String(idPropuesta);
  const eventsById = mapishToGet(opts.eventsById);
  const vehiculosById = mapishToGet(opts.vehiculosById);
  const labelFn =
    typeof opts.labelVehicle === "function"
      ? opts.labelVehicle
      : (gt) => {
          const nombre = String(gt?.transportes?.nombre || gt?.detalle || "").trim();
          const patente = String(gt?.patente || gt?.transportes?.patente || "").trim();
          if (nombre && patente && !nombre.toLowerCase().includes(patente.toLowerCase())) {
            return `${nombre} · ${patente}`;
          }
          return nombre || patente || "Vehículo";
        };

  /** @type {Array<{ ride: object, idGt: number|null }>} */
  const rideRows = [];

  if (Array.isArray(opts.rides) && opts.rides.length) {
    for (const r of opts.rides) {
      if (r?.id_propuesta == null || String(r.id_propuesta) !== want) continue;
      const seats = Math.max(0, Number(r.seats) || 0);
      if (seats <= 0) continue;
      if (r.subidaId == null || r.subidaId === "") continue;
      const idGt =
        r.id_gira_transporte != null && Number.isFinite(Number(r.id_gira_transporte))
          ? Number(r.id_gira_transporte)
          : null;
      rideRows.push({ ride: r, idGt });
    }
  } else {
    // Construye rides explícitos por unidad a partir de rutas del artista.
    const routes = (opts.propuestaRoutes || []).filter(
      (r) =>
        r &&
        String(r.id_propuesta ?? r.propuesta?.id) === want &&
        Math.max(0, Number(r.plazas) || 0) > 0,
    );
    const byVehicle = new Map();
    for (const r of routes) {
      const tid = Number(r.id_gira_transporte);
      if (!Number.isFinite(tid)) continue;
      if (!byVehicle.has(tid)) byVehicle.set(tid, []);
      byVehicle.get(tid).push(r);
    }
    for (const [tid, vehicleRoutes] of byVehicle) {
      const rides = buildFimbaExplicitRides(vehicleRoutes, tid);
      for (const r of rides) {
        if (r.id_propuesta != null && String(r.id_propuesta) !== want) continue;
        if (r.subidaId == null || r.subidaId === "") continue;
        rideRows.push({
          ride: { ...r, id_gira_transporte: tid },
          idGt: tid,
        });
      }
    }
  }

  const blocks = [];
  for (const { ride, idGt } of rideRows) {
    const board = eventsById(String(ride.subidaId));
    if (!board) continue;
    const alight =
      ride.bajadaId != null && ride.bajadaId !== ""
        ? eventsById(String(ride.bajadaId))
        : null;

    const gt =
      idGt != null
        ? vehiculosById(String(idGt)) || vehiculosById(idGt) || null
        : null;
    const vehicleLabel = labelFn(gt);
    const routeSnippet = formatRideRouteSnippet(board, alight);
    const seats = Math.max(0, Number(ride.seats) || 0);
    const rideKey =
      ride.key ||
      `fimba-ruta-${ride.id ?? `${want}-${ride.subidaId}-${ride.bajadaId ?? "open"}`}`;

    const horaFin = alight?.hora_inicio
      ? String(alight.hora_inicio).slice(0, 5)
      : alight?.hora_fin
        ? String(alight.hora_fin).slice(0, 5)
        : null;

    // Si baja otro día, anexar fecha en observaciones
    let obsExtra = null;
    if (
      alight?.fecha &&
      board.fecha &&
      String(alight.fecha) !== String(board.fecha)
    ) {
      const [y, m, d] = String(alight.fecha).split("-");
      const bajaLabel = d && m ? `${d}/${m}${y ? `/${y}` : ""}` : String(alight.fecha);
      obsExtra = `Baja: ${bajaLabel}${horaFin ? ` ${horaFin}` : ""}`;
    }

    blocks.push({
      id: `ride-${rideKey}`,
      id_gira: board.id_gira ?? null,
      id_tipo_evento: board.id_tipo_evento ?? 11,
      id_locacion: board.id_locacion ?? null,
      fecha: board.fecha,
      hora_inicio: board.hora_inicio,
      hora_fin: horaFin,
      descripcion: null,
      actividad: `Traslado · ${routeSnippet}`,
      destino:
        alight != null
          ? formatEventLocation(alight) !== "—"
            ? formatEventLocation(alight)
            : routeSnippet
          : formatEventLocation(board) !== "—"
            ? formatEventLocation(board)
            : "",
      vuelo: null,
      observaciones: obsExtra,
      audiencia: seats || null,
      audiencia_ofrn: "none",
      id_gira_transporte: idGt,
      visible_agenda: true,
      is_deleted: false,
      tipos_evento: {
        id: 11,
        nombre: "Traslado",
        color: FIMBA_TRASLADO_AGENDA_TIPO_COLOR,
        id_categoria: 6,
        categorias_tipos_eventos: { id: 6, nombre: "Transporte" },
      },
      tipo_nombre: "Traslado",
      tipo_color: FIMBA_TRASLADO_AGENDA_TIPO_COLOR,
      tipo_id_categoria: 6,
      categoria_nombre: "Transporte",
      locaciones: board.locaciones || null,
      locacion_nombre: board.locaciones?.nombre || board.locacion_nombre || null,
      locacion_ciudad:
        board.locaciones?.localidades?.localidad || board.locacion_ciudad || null,
      vehiculos: idGt != null
        ? [
            {
              id_evento: board.id,
              id_gira_transporte: idGt,
              plazas: seats,
              giras_transportes: gt,
            },
          ]
        : [],
      propuestas: [],
      grupos: [],
      pax: seats || null,
      sin_servicio: false,
      es_traslado: true,
      es_fimba: true,
      es_ofrn: false,
      /** Marcador: bloque calculado suben→bajan (no editable). */
      es_ride_segment: true,
      id_propuesta: idPropuesta,
      id_ruta: ride.id ?? null,
      ride_key: rideKey,
      ride_subida_id: ride.subidaId,
      ride_bajada_id: ride.bajadaId ?? null,
      vehicle_label: vehicleLabel,
      route_snippet: routeSnippet,
    });
  }

  return sortEventsBySchedule(blocks);
}

/**
 * Fusiona eventos tagged + bloques de traslado.
 * Orden: fecha → hora → detalle (es) → tipo → id (ver `sortFimbaAgendaRows`).
 * @param {Array<object>} eventos
 * @param {Array<object>} rideBlocks
 */
export function mergeAgendaWithTrasladoBlocks(eventos, rideBlocks) {
  return sortFimbaAgendaRows([...(eventos || []), ...(rideBlocks || [])]);
}

/**
 * @param {Map|Record|null|undefined} source
 * @returns {(key: string|number) => object|null}
 */
function mapishToGet(source) {
  if (!source) return () => null;
  if (typeof source.get === "function") {
    return (k) => source.get(k) ?? source.get(String(k)) ?? source.get(Number(k)) ?? null;
  }
  return (k) => {
    if (source[k] != null) return source[k];
    if (source[String(k)] != null) return source[String(k)];
    const n = Number(k);
    if (Number.isFinite(n) && source[n] != null) return source[n];
    return null;
  };
}

