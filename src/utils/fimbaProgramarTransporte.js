/**
 * «Programar transporte»: ranking de vehículos + creación de 2–4 paradas
 * (viaje principal + piernas opcionales anterior/siguiente) con boarding
 * solo en desde/hasta.
 */

import {
  capacidadGiraTransporte,
  labelGiraTransporte,
  saveFimbaEvento,
  upsertFimbaPropuestaRutaStop,
  upsertOfrnGrupoRutaStop,
  listFimbaGiraGrupos,
} from "../services/fimbaService";
import { eventTypeIdForCategoria } from "./giraTransportUtils";
import { offsetEventDateTime } from "./fimbaDestinoStopCreate";
import { compareFimbaAgendaRows } from "./fimbaAgendaSort";
import {
  formatEventLocation,
  isTransportTipoEvent,
  isVehiclePauseBetweenStops,
} from "./fimbaTransportBoarding";

/** `id_locacion` estable como string (vacío si falta). */
function eventLocacionIdStr(ev) {
  const raw = ev?.id_locacion ?? ev?.locaciones?.id ?? null;
  return raw != null && raw !== "" ? String(raw) : "";
}

/** ¿La fila tiene tag de la propuesta/artista? */
function eventHasPropuestaTag(ev, propuestaId) {
  const want = Number(propuestaId);
  if (!Number.isFinite(want) || want <= 0) return false;
  return (ev?.propuestas || []).some(
    (p) => Number(p?.id ?? p) === want,
  );
}

/**
 * Fin operativo del evento: `hora_fin` si hay HH:MM, si no `hora_inicio`.
 * @param {object|null|undefined} ev
 * @returns {{ fecha: string, hora: string }}
 */
function eventEndDateTime(ev) {
  const fecha = String(ev?.fecha || "").slice(0, 10);
  const start = String(ev?.hora_inicio || "").slice(0, 5);
  const fin = String(ev?.hora_fin || "").slice(0, 5);
  const hora = /^\d{2}:\d{2}/.test(fin) ? fin : start;
  return {
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : "",
    hora: /^\d{2}:\d{2}/.test(hora) ? hora : "",
  };
}

/**
 * Evento previo del mismo artista (cronológico) con locación usable como
 * origen: el más cercano anterior con `id_locacion` distinta a la del destino
 * cuando es posible. Omite filas tipo transporte (ya son paradas de viaje).
 *
 * @param {object|null|undefined} evento — destino (llegada)
 * @param {Array<object>|null|undefined} agendaEvents
 * @param {number|string|null|undefined} propuestaId
 * @param {{ skipTransport?: boolean }} [opts]
 * @returns {object|null}
 */
export function findPreviousArtistAgendaEvent(
  evento,
  agendaEvents,
  propuestaId,
  opts = {},
) {
  if (!evento || propuestaId == null || propuestaId === "") return null;
  const skipTransport = opts.skipTransport !== false;
  const destLoc = eventLocacionIdStr(evento);

  const candidates = (agendaEvents || [])
    .filter((ev) => {
      if (!ev || ev.id == null) return false;
      if (String(ev.id) === String(evento.id)) return false;
      if (skipTransport && isTransportTipoEvent(ev)) return false;
      if (!eventHasPropuestaTag(ev, propuestaId)) return false;
      return compareFimbaAgendaRows(ev, evento) < 0;
    })
    .sort(compareFimbaAgendaRows);

  if (!candidates.length) return null;

  // Más cercano hacia atrás con locación distinta al destino (si hay dest).
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const prev = candidates[i];
    const loc = eventLocacionIdStr(prev);
    if (!loc) continue;
    if (destLoc && loc === destLoc) continue;
    return prev;
  }
  return null;
}

function tripDateTimeMs(fecha, hora) {
  const f = String(fecha || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return null;
  const [y, m, d] = f.split("-").map(Number);
  const hm = String(hora || "00:00").slice(0, 5);
  const [hh, mm] = hm.split(":").map((x) => Number(x));
  const h = Number.isFinite(hh) ? hh : 0;
  const min = Number.isFinite(mm) ? mm : 0;
  return new Date(y, m - 1, d, h, min, 0, 0).getTime();
}

export { tripDateTimeMs };

/**
 * Ancla de itinerario para ofertas: `17/09 - 12 hs. Hotel x`
 * @param {object|null|undefined} ev
 */
export function formatItineraryAnchor(ev) {
  if (!ev) return null;
  const f = String(ev.fecha || "").slice(0, 10);
  let datePart = "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(f)) {
    const [, m, d] = f.split("-");
    datePart = `${d}/${m}`;
  }
  const hRaw = ev.hora_inicio ? String(ev.hora_inicio).slice(0, 5) : "";
  const hPart = hRaw
    ? `${String(Number(hRaw.slice(0, 2)) || 0)} hs.`
    : "—";
  const loc = formatEventLocation(ev) || "(Sin locación)";
  return `${datePart} - ${hPart} ${loc}`;
}

/**
 * Encuentra el stop «origen» (última parada ≤ salida) y «siguiente destino»
 * (primera parada ≥ llegada) en la secuencia del vehículo.
 *
 * @param {Array<object>} sortedEvents
 * @param {number} salidaMs
 * @param {number} llegadaMs
 */
export function findGapAnchors(sortedEvents, salidaMs, llegadaMs) {
  const list = sortedEvents || [];
  let origen = null;
  let siguiente = null;
  for (const ev of list) {
    const ms = tripDateTimeMs(ev.fecha, ev.hora_inicio);
    if (ms == null) continue;
    if (ms <= salidaMs) origen = ev;
    if (ms >= llegadaMs && !siguiente) siguiente = ev;
  }
  // Si no hay stop ≥ llegada, usar el primero estrictamente > salida
  if (!siguiente) {
    for (const ev of list) {
      const ms = tripDateTimeMs(ev.fecha, ev.hora_inicio);
      if (ms != null && ms > salidaMs) {
        siguiente = ev;
        break;
      }
    }
  }
  return { origen, siguiente };
}

function sameLocId(ev, idLocacion) {
  if (idLocacion == null || idLocacion === "") return false;
  const raw = ev?.id_locacion ?? ev?.locaciones?.id ?? null;
  return raw != null && String(raw) === String(idLocacion);
}

/**
 * Ranking «óptimo» de vehículos para un viaje solicitado.
 *
 * Heurística (documentada en fimba-plataforma.md):
 * 1. Preferir flota cuyo hueco Origen→Siguiente Destino cubre [salida, llegada].
 * 2. Capacidad libre en origen ≥ cantidad pedida.
 * 3. Proximidad temporal (origen cerca de salida; siguiente cerca de llegada).
 * 4. Misma locación que salida / llegada.
 * 5. Penalizar overbook y agendas sin hueco (solape).
 * 6. Vehículos sin paradas = agenda libre (score medio-alto).
 *
 * @param {{
 *   vehiculos: Array<object>,
 *   sequencesByVehicle: Map<number, { sortedEvents?: Array, stops?: Array }>,
 *   fechaSalida: string,
 *   horaSalida: string,
 *   fechaLlegada: string,
 *   horaLlegada: string,
 *   idLocSalida?: unknown,
 *   idLocLlegada?: unknown,
 *   cantidad?: number,
 * }} opts
 * @returns {Array<{
 *   vehicle: object,
 *   vehicleId: number,
 *   label: string,
 *   score: number,
 *   capacity: number|null,
 *   libresEstimados: number|null,
 *   gapCovers: boolean,
 *   origen: object|null,
 *   siguiente: object|null,
 *   origenLabel: string|null,
 *   siguienteLabel: string|null,
 *   reasons: string[],
 * }>}
 */
export function rankVehiclesForProgrammedTrip(opts = {}) {
  const {
    vehiculos = [],
    sequencesByVehicle,
    fechaSalida,
    horaSalida,
    fechaLlegada,
    horaLlegada,
    idLocSalida = null,
    idLocLlegada = null,
    cantidad = 1,
  } = opts;

  const salidaMs = tripDateTimeMs(fechaSalida, horaSalida);
  const llegadaMs = tripDateTimeMs(fechaLlegada, horaLlegada);
  if (salidaMs == null || llegadaMs == null || llegadaMs < salidaMs) {
    return [];
  }

  const need = Math.max(1, Number(cantidad) || 1);
  const hourMs = 60 * 60 * 1000;
  const ranked = [];

  for (const gt of vehiculos || []) {
    const vehicleId = Number(gt.id);
    if (!Number.isFinite(vehicleId)) continue;
    const seq = sequencesByVehicle?.get(vehicleId) || null;
    const sorted = seq?.sortedEvents || [];
    const { origen, siguiente } = findGapAnchors(sorted, salidaMs, llegadaMs);

    const capacity =
      gt.capacidad_maxima != null
        ? Number(gt.capacidad_maxima)
        : capacidadGiraTransporte(gt);
    const capN = Number.isFinite(capacity) ? capacity : null;

    let enTransitoOrigen = 0;
    if (origen && seq?.stops) {
      const stop = (seq.stops || []).find(
        (s) =>
          String(s?.eventId ?? s?.evt?.id ?? s?.event?.id) ===
          String(origen.id),
      );
      enTransitoOrigen = Math.max(0, Number(stop?.en_transito) || 0);
    }
    const libresEstimados =
      capN != null ? Math.max(0, capN - enTransitoOrigen) : null;

    const origenMs = origen
      ? tripDateTimeMs(origen.fecha, origen.hora_inicio)
      : null;
    const siguienteMs = siguiente
      ? tripDateTimeMs(siguiente.fecha, siguiente.hora_inicio)
      : null;

    const gapCovers =
      sorted.length === 0 ||
      ((origenMs == null || origenMs <= salidaMs) &&
        (siguienteMs == null || siguienteMs >= llegadaMs) &&
        !(
          origen &&
          siguiente &&
          origenMs != null &&
          siguienteMs != null &&
          origenMs > salidaMs
        ));

    // Pausa: el hueco entre origen y siguiente es una pausa de vehículo
    // (misma locación), lo que significa que el vehículo está 100% libre
    // en ese intervalo (sin pasajeros en tránsito).
    const isPauseGap =
      gapCovers && origen && siguiente
        ? isVehiclePauseBetweenStops(origen, siguiente)
        : false;

    // Solape duro: hay un stop estrictamente dentro del viaje
    let hasInteriorStop = false;
    for (const ev of sorted) {
      const ms = tripDateTimeMs(ev.fecha, ev.hora_inicio);
      if (ms != null && ms > salidaMs && ms < llegadaMs) {
        hasInteriorStop = true;
        break;
      }
    }

    // Durante una pausa el vehículo no tiene pasajeros: capacidad libre = total.
    const libresEfectivos =
      isPauseGap && capN != null ? capN : libresEstimados;

    let score = 0;
    const reasons = [];

    if (sorted.length === 0) {
      score += 700;
      reasons.push("Agenda libre");
    } else if (isPauseGap && !hasInteriorStop) {
      score += 1100;
      reasons.push("Pausa: vehículo libre en esta locación");
    } else if (gapCovers && !hasInteriorStop) {
      score += 1000;
      reasons.push("Hueco cubre el viaje");
    } else if (gapCovers) {
      score += 400;
      reasons.push("Hueco parcial (hay paradas intermedias)");
    } else {
      score -= 200;
      reasons.push("Solapa con la agenda");
    }

    if (libresEfectivos != null) {
      if (libresEfectivos >= need) {
        score += 200;
        reasons.push(`Cap. libre ${libresEfectivos}`);
      } else {
        score -= 300;
        reasons.push(`Cap. insuficiente (${libresEstimados})`);
      }
    }

    if (origen && sameLocId(origen, idLocSalida)) {
      score += 120;
      reasons.push("Ya en locación de salida");
    }
    if (siguiente && sameLocId(siguiente, idLocLlegada)) {
      score += 80;
      reasons.push("Siguiente hacia locación de llegada");
    }

    if (origenMs != null) {
      const gapH = Math.abs(salidaMs - origenMs) / hourMs;
      score -= Math.min(180, gapH * 12);
    } else if (sorted.length > 0) {
      score -= 40;
    }
    if (siguienteMs != null) {
      const gapH = Math.abs(siguienteMs - llegadaMs) / hourMs;
      score -= Math.min(120, gapH * 8);
    }

    ranked.push({
      vehicle: gt,
      vehicleId,
      label: labelGiraTransporte(gt),
      score,
      capacity: capN,
      libresEstimados: libresEfectivos,
      isPauseGap,
      gapCovers: gapCovers && !hasInteriorStop,
      origen,
      siguiente,
      origenLabel: formatItineraryAnchor(origen),
      siguienteLabel: formatItineraryAnchor(siguiente),
      reasons,
    });
  }

  return ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.label).localeCompare(String(b.label), "es");
  });
}

/**
 * Defaults editables para piernas opcionales al confirmar vehículo:
 * anterior = salida − 30′; siguiente = llegada + 30′.
 * Locación sugerida desde anclas del itinerario (origen / siguiente).
 *
 * @param {{
 *   fechaSalida: string,
 *   horaSalida: string,
 *   fechaLlegada: string,
 *   horaLlegada: string,
 *   idLocSalida?: unknown,
 *   origen?: object|null,
 *   siguiente?: object|null,
 * }} opts
 */
/** Locación de hotel / check-in del artista (salida sugerida). */
export function resolvePropuestaOriginLocacionId(propuesta) {
  if (!propuesta) return "";
  const hotel =
    propuesta.hoteles ?? propuesta.hotel ?? null;
  const fromHotel = hotel?.id_locacion ?? null;
  if (fromHotel != null && fromHotel !== "") return String(fromHotel);
  const checkin = propuesta.evento_checkin ?? propuesta.eventos_checkin ?? null;
  const fromCheckin =
    checkin?.id_locacion ?? checkin?.locaciones?.id ?? null;
  if (fromCheckin != null && fromCheckin !== "") return String(fromCheckin);
  return "";
}

/**
 * Prefill del wizard desde un evento de Agenda.
 *
 * Regla de origen (consecutivo artista):
 * 1. Evento previo del mismo artista con locación distinta → origen;
 *    **Salida** = fin del previo + 1′ (`hora_fin` si hay, si no `hora_inicio`);
 *    **Llegada** = `hora_inicio` del actual − 1′.
 * 2. Si no hay previo / misma locación → hotel/`evento_checkin` del artista
 *    (si ≠ llegada); tiempos = llegada − lead − duración tramo.
 *
 * Destino = locación del evento actual. Artista = filtro único / ruta / tag único.
 * No crea paradas — solo seeds el form.
 *
 * @param {object|null|undefined} evento
 * @param {{
 *   selectedPropuestaIds?: Array<number|string>,
 *   propuestas?: Array<object>,
 *   routeArtistaId?: number|string|null,
 *   agendaEvents?: Array<object>,
 *   leadMinutes?: number,
 *   tripDurationMinutes?: number,
 * }} [opts]
 * @returns {{
 *   fechaSalida: string,
 *   horaSalida: string,
 *   idLocSalida: string,
 *   fechaLlegada: string,
 *   horaLlegada: string,
 *   idLocLlegada: string,
 *   passengerKey: string,
 *   anchorEventId: number|string|null,
 * }}
 */
export function buildProgrammedTripSeedFromAgendaEvent(evento, opts = {}) {
  const leadMinutes = Math.max(0, Number(opts.leadMinutes) || 30);
  const tripDurationMinutes = Math.max(
    5,
    Number(opts.tripDurationMinutes) || 30,
  );
  const propuestas = opts.propuestas || [];
  const agendaEvents = opts.agendaEvents || [];
  const filterIds = [
    ...new Set(
      (opts.selectedPropuestaIds || [])
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ];
  const routeId =
    opts.routeArtistaId != null && opts.routeArtistaId !== ""
      ? Number(opts.routeArtistaId)
      : null;
  const eventTagIds = [
    ...new Set(
      (evento?.propuestas || [])
        .map((p) => Number(p?.id ?? p))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ];

  let propuestaId = null;
  if (filterIds.length === 1) propuestaId = filterIds[0];
  else if (Number.isFinite(routeId) && routeId > 0) propuestaId = routeId;
  else if (eventTagIds.length === 1) propuestaId = eventTagIds[0];

  const propuesta =
    propuestaId != null
      ? propuestas.find((p) => Number(p.id) === Number(propuestaId)) || null
      : null;

  const eventFecha = String(evento?.fecha || "").slice(0, 10);
  const eventHora = String(evento?.hora_inicio || "").slice(0, 5);
  const idLocLlegada = eventLocacionIdStr(evento);

  const prevArtistEv = findPreviousArtistAgendaEvent(
    evento,
    agendaEvents,
    propuestaId,
  );
  const prevLoc = prevArtistEv ? eventLocacionIdStr(prevArtistEv) : "";

  let idLocSalida = "";
  if (prevLoc && prevLoc !== idLocLlegada) {
    idLocSalida = prevLoc;
  } else {
    const hotelLoc = resolvePropuestaOriginLocacionId(propuesta);
    // Evitar salida = llegada (mismo hotel que el venue) — pedir origen a mano.
    idLocSalida =
      hotelLoc && hotelLoc !== idLocLlegada ? hotelLoc : "";
  }

  let fechaLlegada = "";
  let horaLlegada = "";
  let fechaSalida = "";
  let horaSalida = "";

  const hasEventStart =
    /^\d{4}-\d{2}-\d{2}$/.test(eventFecha) && /^\d{2}:\d{2}/.test(eventHora);

  if (prevArtistEv && idLocSalida && idLocSalida === prevLoc) {
    // Consecutivo artista: Salida = fin previo + 1′; Llegada = inicio actual − 1′.
    const prevEnd = eventEndDateTime(prevArtistEv);
    if (prevEnd.fecha && prevEnd.hora) {
      const salida = offsetEventDateTime(prevEnd.fecha, prevEnd.hora, 1);
      fechaSalida = salida.fecha || prevEnd.fecha;
      horaSalida = salida.hora_inicio || prevEnd.hora;
    }
    if (hasEventStart) {
      const llegada = offsetEventDateTime(eventFecha, eventHora, -1);
      fechaLlegada = llegada.fecha || eventFecha;
      horaLlegada = llegada.hora_inicio || eventHora;
    }
    const salidaMs = tripDateTimeMs(fechaSalida, horaSalida);
    const llegadaMs = tripDateTimeMs(fechaLlegada, horaLlegada);
    if (
      salidaMs != null &&
      llegadaMs != null &&
      salidaMs >= llegadaMs &&
      hasEventStart
    ) {
      // Hueco < 2′: caer a lead + duración fija antes del inicio.
      fechaSalida = "";
      horaSalida = "";
      fechaLlegada = "";
      horaLlegada = "";
    }
  }

  if (!fechaLlegada || !horaLlegada) {
    // Sin previo (o solape): llegada = lead antes del inicio del destino.
    const llegada = offsetEventDateTime(eventFecha, eventHora, -leadMinutes);
    fechaLlegada =
      llegada.fecha ||
      (/^\d{4}-\d{2}-\d{2}$/.test(eventFecha) ? eventFecha : "");
    horaLlegada =
      llegada.hora_inicio ||
      (/^\d{2}:\d{2}/.test(eventHora) ? eventHora : "");
  }

  if (!fechaSalida || !horaSalida) {
    const salida = offsetEventDateTime(
      fechaLlegada,
      horaLlegada,
      -tripDurationMinutes,
    );
    fechaSalida = salida.fecha || fechaLlegada || "";
    horaSalida = salida.hora_inicio || "";
  }

  return {
    fechaSalida,
    horaSalida,
    idLocSalida,
    fechaLlegada,
    horaLlegada,
    idLocLlegada,
    passengerKey: propuestaId != null ? `p:${propuestaId}` : "",
    anchorEventId: evento?.id ?? null,
  };
}

export function buildProgrammedTripOptionalLegDefaults(opts = {}) {
  const {
    fechaSalida,
    horaSalida,
    fechaLlegada,
    horaLlegada,
    idLocSalida = null,
    origen = null,
    siguiente = null,
  } = opts;

  const before = offsetEventDateTime(fechaSalida, horaSalida, -30);
  const after = offsetEventDateTime(fechaLlegada, horaLlegada, 30);

  const locFromEv = (ev) => {
    const raw = ev?.id_locacion ?? ev?.locaciones?.id ?? null;
    return raw != null && raw !== "" ? String(raw) : "";
  };

  return {
    anterior: {
      idLocacion: locFromEv(origen) || "",
      fecha: before.fecha || String(fechaSalida || "").slice(0, 10) || "",
      hora: before.hora_inicio || "",
    },
    siguiente: {
      idLocacion:
        locFromEv(siguiente) ||
        (idLocSalida != null && idLocSalida !== ""
          ? String(idLocSalida)
          : ""),
      fecha: after.fecha || String(fechaLlegada || "").slice(0, 10) || "",
      hora: after.hora_inicio || "",
    },
  };
}

function normalizeOptionalLeg(leg) {
  if (!leg || !leg.enabled) return null;
  const idLocacion = leg.idLocacion ?? leg.id_locacion ?? null;
  const fecha = String(leg.fecha || "").slice(0, 10);
  const hora = String(leg.hora || leg.hora_inicio || "").trim().slice(0, 5);
  if (!idLocacion || !fecha || !hora) return null;
  return { idLocacion, fecha, hora };
}

/**
 * Crea 2–4 paradas (viaje principal + piernas opcionales) y aplica boarding
 * solo en el tramo principal (↑ desde / ↓ hasta).
 *
 * Orden temporal:
 * 1. Movimiento anterior (opcional) — reposiciona el vehículo hacia la salida
 * 2. Salida (desde) — subida del pasajero
 * 3. Llegada (hasta) — bajada del pasajero
 * 4. Movimiento siguiente (opcional) — destino posterior / retorno
 *
 * - Artista FIMBA: `fimba_propuesta_rutas` ↑ en desde, ↓ en hasta (cantidad).
 * - Grupo OFRN: tag `audiencia_ofrn=grupos` + `eventos_grupos` en ambas;
 *   regla `giras_logistica_rutas` alcance **Grupo** (↑ desde / ↓ hasta) —
 *   sube/baja a todos los miembros del grupo (no reserva técnica anónima).
 *
 * @param {{
 *   idGira: number|string,
 *   vehicleId: number|string,
 *   vehiculos?: Array<object>,
 *   fechaSalida: string,
 *   horaSalida: string,
 *   idLocSalida: unknown,
 *   fechaLlegada: string,
 *   horaLlegada: string,
 *   idLocLlegada: unknown,
 *   passenger: {
 *     kind: 'propuesta'|'grupo',
 *     id: number|string,
 *     cantidad: number,
 *     label?: string,
 *   },
 *   giraGrupos?: Array<object>,
 *   movimientoAnterior?: {
 *     enabled?: boolean,
 *     idLocacion?: unknown,
 *     fecha?: string,
 *     hora?: string,
 *   }|null,
 *   movimientoSiguiente?: {
 *     enabled?: boolean,
 *     idLocacion?: unknown,
 *     fecha?: string,
 *     hora?: string,
 *   }|null,
 * }} params
 * @returns {Promise<{
 *   anterior: object|null,
 *   desde: object|null,
 *   hasta: object|null,
 *   siguiente: object|null,
 *   eventos: Array<object>,
 *   error: Error|null,
 * }>}
 */
export async function createProgrammedTransportJourney(params) {
  const empty = {
    anterior: null,
    desde: null,
    hasta: null,
    siguiente: null,
    eventos: [],
  };
  const {
    idGira,
    vehicleId,
    vehiculos = [],
    fechaSalida,
    horaSalida,
    idLocSalida,
    fechaLlegada,
    horaLlegada,
    idLocLlegada,
    passenger,
    giraGrupos: giraGruposParam,
    movimientoAnterior: movimientoAnteriorParam = null,
    movimientoSiguiente: movimientoSiguienteParam = null,
  } = params;

  if (!idGira) {
    return { ...empty, error: new Error("Edición sin gira") };
  }
  if (vehicleId == null || vehicleId === "") {
    return { ...empty, error: new Error("Elegí un vehículo") };
  }
  if (!idLocSalida || !idLocLlegada) {
    return {
      ...empty,
      error: new Error("Indicá locación de salida y de llegada"),
    };
  }
  const fSal = String(fechaSalida || "").slice(0, 10);
  const fLleg = String(fechaLlegada || "").slice(0, 10);
  const hSal = String(horaSalida || "").trim().slice(0, 5);
  const hLleg = String(horaLlegada || "").trim().slice(0, 5);
  if (!fSal || !hSal || !fLleg || !hLleg) {
    return {
      ...empty,
      error: new Error("Indicá fecha y hora de salida y de llegada"),
    };
  }
  const salidaMs = tripDateTimeMs(fSal, hSal);
  const llegadaMs = tripDateTimeMs(fLleg, hLleg);
  if (salidaMs == null || llegadaMs == null || llegadaMs <= salidaMs) {
    return {
      ...empty,
      error: new Error("La llegada debe ser posterior a la salida"),
    };
  }

  const anteriorLeg = normalizeOptionalLeg(movimientoAnteriorParam);
  const siguienteLeg = normalizeOptionalLeg(movimientoSiguienteParam);

  if (anteriorLeg) {
    const antMs = tripDateTimeMs(anteriorLeg.fecha, anteriorLeg.hora);
    if (antMs == null || !(antMs < salidaMs)) {
      return {
        ...empty,
        error: new Error(
          "El movimiento anterior debe ser anterior a la salida",
        ),
      };
    }
  }
  if (siguienteLeg) {
    const sigMs = tripDateTimeMs(siguienteLeg.fecha, siguienteLeg.hora);
    if (sigMs == null || !(sigMs > llegadaMs)) {
      return {
        ...empty,
        error: new Error(
          "El movimiento siguiente debe ser posterior a la llegada",
        ),
      };
    }
  }

  const kind = passenger?.kind === "grupo" ? "grupo" : "propuesta";
  const paxId = Number(passenger?.id);
  const cantidad = Math.max(1, Number(passenger?.cantidad) || 1);
  if (!Number.isFinite(paxId)) {
    return {
      ...empty,
      error: new Error("Elegí un artista FIMBA o un grupo OFRN"),
    };
  }

  const gt =
    (vehiculos || []).find((g) => Number(g.id) === Number(vehicleId)) || null;
  const tipoId = eventTypeIdForCategoria(gt?.categoria_logistica);
  const paxLabel = String(passenger?.label || "").trim();
  const actDesde = paxLabel
    ? `Salida · ${paxLabel}`
    : "Salida programada";
  const actHasta = paxLabel
    ? `Llegada · ${paxLabel}`
    : "Llegada programada";
  const actAnterior = paxLabel
    ? `Mov. anterior · ${paxLabel}`
    : "Movimiento anterior";
  const actSiguiente = paxLabel
    ? `Mov. siguiente · ${paxLabel}`
    : "Movimiento siguiente";

  const commonVeh = [
    {
      id_gira_transporte: Number(vehicleId),
      plazas: 0,
    },
  ];
  const commonBase = {
    id_gira: Number(idGira),
    id_tipo_evento: tipoId,
    usa_transporte: true,
    sin_servicio: false,
    asientos_equipaje: 0,
    observaciones_equipaje: "",
    // plazas 0 → sin cupo anónimo; UI ya eligió vehículo (evita availability).
    clientValidated: true,
    vehiculos: commonVeh,
  };

  const propuestaIds = kind === "propuesta" ? [paxId] : [];
  const grupoIds = kind === "grupo" ? [paxId] : [];
  const audiencia = kind === "grupo" ? "grupos" : "none";

  const tagPayload = {
    id_propuestas: propuestaIds,
    id_grupos: grupoIds,
    audiencia_ofrn: audiencia,
  };

  let anterior = null;
  let desde = null;
  let hasta = null;
  let siguiente = null;
  const eventos = [];

  const pushCreated = (ev) => {
    if (ev?.id) eventos.push(ev);
  };

  if (anteriorLeg) {
    const { evento: antEv, error: eAnt } = await saveFimbaEvento({
      ...commonBase,
      ...tagPayload,
      fecha: anteriorLeg.fecha,
      hora_inicio: anteriorLeg.hora,
      hora_fin: null,
      actividad: actAnterior,
      id_locacion: anteriorLeg.idLocacion,
    });
    if (eAnt || !antEv?.id) {
      return {
        ...empty,
        eventos,
        error:
          eAnt || new Error("No se pudo crear el movimiento anterior"),
      };
    }
    anterior = antEv;
    pushCreated(anterior);
  }

  {
    const { evento: desdeEv, error: eDesde } = await saveFimbaEvento({
      ...commonBase,
      ...tagPayload,
      fecha: fSal,
      hora_inicio: hSal,
      hora_fin: null,
      actividad: actDesde,
      id_locacion: idLocSalida,
    });
    if (eDesde || !desdeEv?.id) {
      return {
        anterior,
        desde: null,
        hasta: null,
        siguiente: null,
        eventos,
        error: eDesde || new Error("No se pudo crear la parada de salida"),
      };
    }
    desde = desdeEv;
    pushCreated(desde);
  }

  {
    const { evento: hastaEv, error: eHasta } = await saveFimbaEvento({
      ...commonBase,
      ...tagPayload,
      fecha: fLleg,
      hora_inicio: hLleg,
      hora_fin: null,
      actividad: actHasta,
      id_locacion: idLocLlegada,
    });
    if (eHasta || !hastaEv?.id) {
      return {
        anterior,
        desde,
        hasta: null,
        siguiente: null,
        eventos,
        error:
          eHasta ||
          new Error(
            "Parada de salida creada, pero falló la de llegada. Completala a mano.",
          ),
      };
    }
    hasta = hastaEv;
    pushCreated(hasta);
  }

  if (kind === "propuesta") {
    const sortedEvents = [desde, hasta];
    const up = await upsertFimbaPropuestaRutaStop({
      id_propuesta: paxId,
      id_gira_transporte: Number(vehicleId),
      id_evento: desde.id,
      type: "up",
      plazas: cantidad,
      skipCapAssert: true,
      allowMultiple: true,
      sortedEvents,
    });
    if (up.error) {
      return {
        anterior,
        desde,
        hasta,
        siguiente: null,
        eventos,
        error: new Error(
          `Paradas creadas, pero falló la subida: ${up.error.message}`,
        ),
      };
    }
    const down = await upsertFimbaPropuestaRutaStop({
      id_propuesta: paxId,
      id_gira_transporte: Number(vehicleId),
      id_evento: hasta.id,
      type: "down",
      plazas: cantidad,
      skipCapAssert: true,
      allowMultiple: true,
      sortedEvents,
    });
    if (down.error) {
      return {
        anterior,
        desde,
        hasta,
        siguiente: null,
        eventos,
        error: new Error(
          `Paradas + subida OK, pero falló la bajada: ${down.error.message}`,
        ),
      };
    }
  } else {
    let giraGrupos = Array.isArray(giraGruposParam) ? giraGruposParam : null;
    if (!giraGrupos) {
      const { grupos } = await listFimbaGiraGrupos(idGira);
      giraGrupos = grupos || [];
    }
    const up = await upsertOfrnGrupoRutaStop({
      id_gira: idGira,
      id_transporte_fisico: Number(vehicleId),
      id_grupo: paxId,
      id_evento: desde.id,
      type: "up",
      giraGrupos,
      ensureAdmission: true,
      allowMultiple: true,
    });
    if (up.error) {
      return {
        anterior,
        desde,
        hasta,
        siguiente: null,
        eventos,
        error: new Error(
          `Paradas creadas, pero falló la subida del grupo: ${up.error.message}`,
        ),
      };
    }
    const down = await upsertOfrnGrupoRutaStop({
      id_gira: idGira,
      id_transporte_fisico: Number(vehicleId),
      id_grupo: paxId,
      id_evento: hasta.id,
      type: "down",
      giraGrupos,
      ensureAdmission: true,
      allowMultiple: true,
    });
    if (down.error) {
      return {
        anterior,
        desde,
        hasta,
        siguiente: null,
        eventos,
        error: new Error(
          `Paradas + subida OK, pero falló la bajada del grupo: ${down.error.message}`,
        ),
      };
    }
  }

  if (siguienteLeg) {
    const { evento: sigEv, error: eSig } = await saveFimbaEvento({
      ...commonBase,
      ...tagPayload,
      fecha: siguienteLeg.fecha,
      hora_inicio: siguienteLeg.hora,
      hora_fin: null,
      actividad: actSiguiente,
      id_locacion: siguienteLeg.idLocacion,
    });
    if (eSig || !sigEv?.id) {
      return {
        anterior,
        desde,
        hasta,
        siguiente: null,
        eventos,
        error:
          eSig ||
          new Error(
            "Viaje principal OK, pero falló el movimiento siguiente. Completalo a mano.",
          ),
      };
    }
    siguiente = sigEv;
    pushCreated(siguiente);
  }

  return { anterior, desde, hasta, siguiente, eventos, error: null };
}

/** ¿Fila provisional de create en background (aún sin id de DB)? */
export function isFimbaPendingCreateEvent(ev) {
  return Boolean(ev?._pendingCreate) || String(ev?.id || "").startsWith("pending:");
}

/** Token único por confirmación (anti doble-create / strip al settle/fail). */
export function newFimbaPendingClientToken(prefix = "prog") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function resolveLocacionLabel(locationOptions, idLocacion) {
  if (idLocacion == null || idLocacion === "") return null;
  const hit = (locationOptions || []).find(
    (l) => String(l.id) === String(idLocacion),
  );
  if (!hit) return null;
  return hit.nombre || hit.label || null;
}

/**
 * Fila planilla/agenda provisional (gris) antes de que `saveFimbaEvento` responda.
 *
 * @param {object} opts
 * @returns {object}
 */
export function buildPendingTransportStopRow(opts = {}) {
  const {
    clientToken,
    slot = "stop",
    fecha,
    hora_inicio,
    actividad,
    id_locacion = null,
    locacion_nombre = null,
    vehicleId,
    vehiculos = [],
    propuestas = [],
    grupos = [],
    audiencia_ofrn = "none",
    id_tipo_evento = null,
    id_gira = null,
  } = opts;
  const token = String(clientToken || "x");
  const gt =
    (vehiculos || []).find((g) => Number(g.id) === Number(vehicleId)) || null;
  const tipoId =
    id_tipo_evento != null && id_tipo_evento !== ""
      ? Number(id_tipo_evento)
      : eventTypeIdForCategoria(gt?.categoria_logistica);
  const ao = ["none", "tutti", "grupos"].includes(audiencia_ofrn)
    ? audiencia_ofrn
    : "none";
  const locName = locacion_nombre || null;
  const locId =
    id_locacion != null && id_locacion !== "" ? Number(id_locacion) || id_locacion : null;

  return {
    id: `pending:${token}:${slot}`,
    _pendingCreate: true,
    _pendingClientToken: token,
    _pendingSlot: slot,
    id_gira: id_gira != null ? Number(id_gira) : null,
    fecha: String(fecha || "").slice(0, 10),
    hora_inicio: String(hora_inicio || "").slice(0, 5) || null,
    hora_fin: null,
    actividad: String(actividad || "").trim() || "Parada",
    descripcion: String(actividad || "").trim() || "Parada",
    destino: "",
    vuelo: "",
    observaciones: "",
    observaciones_equipaje: "",
    id_locacion: locId,
    locacion_nombre: locName,
    locaciones:
      locId != null
        ? { id: locId, nombre: locName || "" }
        : null,
    es_fimba: true,
    es_ofrn: ao !== "none",
    origen: ao !== "none" ? "ambos" : "fimba",
    usa_transporte: true,
    sin_servicio: false,
    id_tipo_evento: tipoId,
    vehiculos: [
      {
        id_gira_transporte: Number(vehicleId),
        plazas: 0,
        giras_transportes: gt,
      },
    ],
    propuestas: propuestas || [],
    grupos: ao === "grupos" ? grupos || [] : [],
    audiencia_ofrn: ao,
    orquesta_label: ao === "tutti" ? "Tutti" : null,
  };
}

/**
 * 2–4 filas pending del wizard Programar transporte (misma forma que el create real).
 *
 * @param {object} params — mismos campos de UI + `clientToken` + `locationOptions`
 * @returns {object[]}
 */
export function buildPendingProgrammedJourneyRows(params = {}) {
  const {
    clientToken,
    idGira,
    vehicleId,
    vehiculos = [],
    locationOptions = [],
    fechaSalida,
    horaSalida,
    idLocSalida,
    fechaLlegada,
    horaLlegada,
    idLocLlegada,
    passenger,
    propuestas = [],
    giraGrupos = [],
    movimientoAnterior = null,
    movimientoSiguiente = null,
  } = params;

  const kind = passenger?.kind === "grupo" ? "grupo" : "propuesta";
  const paxId = Number(passenger?.id);
  const paxLabel = String(passenger?.label || "").trim();
  const actDesde = paxLabel ? `Salida · ${paxLabel}` : "Salida programada";
  const actHasta = paxLabel ? `Llegada · ${paxLabel}` : "Llegada programada";
  const actAnterior = paxLabel
    ? `Mov. anterior · ${paxLabel}`
    : "Movimiento anterior";
  const actSiguiente = paxLabel
    ? `Mov. siguiente · ${paxLabel}`
    : "Movimiento siguiente";

  const propuestasRows =
    kind === "propuesta" && Number.isFinite(paxId)
      ? (propuestas || []).filter((p) => Number(p.id) === paxId)
      : [];
  const gruposRows =
    kind === "grupo" && Number.isFinite(paxId)
      ? (giraGrupos || []).filter((g) => Number(g.id) === paxId)
      : [];
  const audiencia = kind === "grupo" ? "grupos" : "none";
  const anteriorLeg = normalizeOptionalLeg(movimientoAnterior);
  const siguienteLeg = normalizeOptionalLeg(movimientoSiguiente);

  const base = {
    clientToken,
    id_gira: idGira,
    vehicleId,
    vehiculos,
    propuestas: propuestasRows,
    grupos: gruposRows,
    audiencia_ofrn: audiencia,
  };

  const rows = [];
  if (anteriorLeg) {
    rows.push(
      buildPendingTransportStopRow({
        ...base,
        slot: "anterior",
        fecha: anteriorLeg.fecha,
        hora_inicio: anteriorLeg.hora,
        actividad: actAnterior,
        id_locacion: anteriorLeg.idLocacion,
        locacion_nombre: resolveLocacionLabel(
          locationOptions,
          anteriorLeg.idLocacion,
        ),
      }),
    );
  }
  rows.push(
    buildPendingTransportStopRow({
      ...base,
      slot: "desde",
      fecha: String(fechaSalida || "").slice(0, 10),
      hora_inicio: String(horaSalida || "").slice(0, 5),
      actividad: actDesde,
      id_locacion: idLocSalida,
      locacion_nombre: resolveLocacionLabel(locationOptions, idLocSalida),
    }),
  );
  rows.push(
    buildPendingTransportStopRow({
      ...base,
      slot: "hasta",
      fecha: String(fechaLlegada || "").slice(0, 10),
      hora_inicio: String(horaLlegada || "").slice(0, 5),
      actividad: actHasta,
      id_locacion: idLocLlegada,
      locacion_nombre: resolveLocacionLabel(locationOptions, idLocLlegada),
    }),
  );
  if (siguienteLeg) {
    rows.push(
      buildPendingTransportStopRow({
        ...base,
        slot: "siguiente",
        fecha: siguienteLeg.fecha,
        hora_inicio: siguienteLeg.hora,
        actividad: actSiguiente,
        id_locacion: siguienteLeg.idLocacion,
        locacion_nombre: resolveLocacionLabel(
          locationOptions,
          siguienteLeg.idLocacion,
        ),
      }),
    );
  }
  return rows;
}

/** Quita filas pending de un token (fail / settle). */
export function stripPendingCreateByToken(list, clientToken) {
  const token = String(clientToken || "");
  if (!token) return list || [];
  return (list || []).filter(
    (ev) => String(ev?._pendingClientToken || "") !== token,
  );
}

/**
 * Tras soft-refresh: conservar pending in-flight que el server aún no tiene.
 * @param {object[]} serverRows
 * @param {object[]} prevRows
 */
export function mergeServerEventsPreservingPending(serverRows, prevRows) {
  const server = Array.isArray(serverRows) ? serverRows : [];
  const pending = (prevRows || []).filter((ev) => isFimbaPendingCreateEvent(ev));
  if (!pending.length) return server;
  const serverIds = new Set(server.map((e) => String(e.id)));
  return [...server, ...pending.filter((p) => !serverIds.has(String(p.id)))];
}

/**
 * Reemplaza pending del token por eventos creados (settle inmediato).
 * @param {object[]} prev
 * @param {string} clientToken
 * @param {object[]} createdEventos
 * @param {{ vehicleId?: unknown, vehiculos?: object[], passenger?: object, propuestas?: object[], giraGrupos?: object[] }} [enrich]
 */
export function settlePendingWithCreatedEvents(
  prev,
  clientToken,
  createdEventos,
  enrich = {},
) {
  const without = stripPendingCreateByToken(prev, clientToken);
  const {
    vehicleId,
    vehiculos = [],
    passenger = null,
    propuestas = [],
    giraGrupos = [],
  } = enrich;
  const kind = passenger?.kind === "grupo" ? "grupo" : "propuesta";
  const paxId = Number(passenger?.id);
  const propuestasRows =
    kind === "propuesta" && Number.isFinite(paxId)
      ? (propuestas || []).filter((p) => Number(p.id) === paxId)
      : [];
  const gruposRows =
    kind === "grupo" && Number.isFinite(paxId)
      ? (giraGrupos || []).filter((g) => Number(g.id) === paxId)
      : [];
  const audiencia = kind === "grupo" ? "grupos" : "none";
  const gt =
    (vehiculos || []).find((g) => Number(g.id) === Number(vehicleId)) || null;

  const next = [...without];
  for (const created of createdEventos || []) {
    if (!created?.id) continue;
    const row = {
      ...created,
      actividad: created.actividad || created.descripcion || "Parada",
      destino: created.destino || "",
      es_fimba: created.es_fimba !== false,
      es_ofrn: audiencia !== "none" || Boolean(created.es_ofrn),
      origen:
        audiencia !== "none" || created.es_ofrn ? "ambos" : "fimba",
      usa_transporte: true,
      sin_servicio: false,
      vehiculos:
        created.vehiculos?.length > 0
          ? created.vehiculos
          : vehicleId != null
            ? [
                {
                  id_gira_transporte: Number(vehicleId),
                  plazas: 0,
                  giras_transportes: gt,
                },
              ]
            : [],
      propuestas:
        created.propuestas?.length > 0
          ? created.propuestas
          : propuestasRows,
      grupos:
        created.grupos?.length > 0
          ? created.grupos
          : audiencia === "grupos"
            ? gruposRows
            : [],
      audiencia_ofrn: created.audiencia_ofrn || audiencia,
    };
    const idx = next.findIndex((x) => String(x.id) === String(row.id));
    if (idx >= 0) next[idx] = { ...next[idx], ...row };
    else next.push(row);
  }
  return next;
}
