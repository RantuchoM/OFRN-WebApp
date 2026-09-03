/**
 * «Programar transporte»: ranking de vehículos + creación de par de paradas
 * (desde / hasta) con boarding FIMBA o tag OFRN + reserva.
 */

import {
  capacidadGiraTransporte,
  labelGiraTransporte,
  saveFimbaEvento,
  setFimbaEventoTransportes,
  upsertFimbaPropuestaRutaStop,
} from "../services/fimbaService";
import { eventTypeIdForCategoria } from "./giraTransportUtils";
import {
  formatEventLocation,
  isVehiclePauseBetweenStops,
} from "./fimbaTransportBoarding";

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
 * Crea paradas desde + hasta y aplica boarding.
 *
 * - Artista FIMBA: `fimba_propuesta_rutas` ↑ en desde, ↓ en hasta (cantidad).
 * - Grupo OFRN: tag `audiencia_ofrn=grupos` + `eventos_grupos` en ambas;
 *   reserva técnica (`plazas`) = cantidad en la asignación del vehículo
 *   (el modelo OFRN no tiene «grupo + N plazas» como FIMBA; se refina en Subidas).
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
 * }} params
 */
export async function createProgrammedTransportJourney(params) {
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
  } = params;

  if (!idGira) {
    return { desde: null, hasta: null, error: new Error("Edición sin gira") };
  }
  if (vehicleId == null || vehicleId === "") {
    return {
      desde: null,
      hasta: null,
      error: new Error("Elegí un vehículo"),
    };
  }
  if (!idLocSalida || !idLocLlegada) {
    return {
      desde: null,
      hasta: null,
      error: new Error("Indicá locación de salida y de llegada"),
    };
  }
  const fSal = String(fechaSalida || "").slice(0, 10);
  const fLleg = String(fechaLlegada || "").slice(0, 10);
  const hSal = String(horaSalida || "").trim().slice(0, 5);
  const hLleg = String(horaLlegada || "").trim().slice(0, 5);
  if (!fSal || !hSal || !fLleg || !hLleg) {
    return {
      desde: null,
      hasta: null,
      error: new Error("Indicá fecha y hora de salida y de llegada"),
    };
  }
  const salidaMs = tripDateTimeMs(fSal, hSal);
  const llegadaMs = tripDateTimeMs(fLleg, hLleg);
  if (salidaMs == null || llegadaMs == null || llegadaMs <= salidaMs) {
    return {
      desde: null,
      hasta: null,
      error: new Error("La llegada debe ser posterior a la salida"),
    };
  }

  const kind = passenger?.kind === "grupo" ? "grupo" : "propuesta";
  const paxId = Number(passenger?.id);
  const cantidad = Math.max(1, Number(passenger?.cantidad) || 1);
  if (!Number.isFinite(paxId)) {
    return {
      desde: null,
      hasta: null,
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

  const commonVeh = [
    {
      id_gira_transporte: Number(vehicleId),
      plazas: kind === "grupo" ? cantidad : 0,
    },
  ];
  const commonBase = {
    id_gira: Number(idGira),
    id_tipo_evento: tipoId,
    usa_transporte: true,
    sin_servicio: false,
    asientos_equipaje: 0,
    observaciones_equipaje: "",
    vehiculos: commonVeh,
  };

  const propuestaIds = kind === "propuesta" ? [paxId] : [];
  const grupoIds = kind === "grupo" ? [paxId] : [];
  const audiencia = kind === "grupo" ? "grupos" : "none";

  const { evento: desde, error: eDesde } = await saveFimbaEvento({
    ...commonBase,
    fecha: fSal,
    hora_inicio: hSal,
    hora_fin: null,
    actividad: actDesde,
    id_locacion: idLocSalida,
    id_propuestas: propuestaIds,
    id_grupos: grupoIds,
    audiencia_ofrn: audiencia,
  });
  if (eDesde || !desde?.id) {
    return {
      desde: null,
      hasta: null,
      error: eDesde || new Error("No se pudo crear la parada de salida"),
    };
  }

  const { evento: hasta, error: eHasta } = await saveFimbaEvento({
    ...commonBase,
    fecha: fLleg,
    hora_inicio: hLleg,
    hora_fin: null,
    actividad: actHasta,
    id_locacion: idLocLlegada,
    id_propuestas: propuestaIds,
    id_grupos: grupoIds,
    audiencia_ofrn: audiencia,
    vehiculos: [
      {
        id_gira_transporte: Number(vehicleId),
        plazas: 0,
      },
    ],
  });
  if (eHasta || !hasta?.id) {
    return {
      desde,
      hasta: null,
      error:
        eHasta ||
        new Error(
          "Parada de salida creada, pero falló la de llegada. Completala a mano.",
        ),
    };
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
      sortedEvents,
    });
    if (up.error) {
      return {
        desde,
        hasta,
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
      sortedEvents,
    });
    if (down.error) {
      return {
        desde,
        hasta,
        error: new Error(
          `Paradas + subida OK, pero falló la bajada: ${down.error.message}`,
        ),
      };
    }
  } else {
    // Asegurar reserva en desde (save ya la puso; reafirma por si hubo merge).
    const { error: ePlazas } = await setFimbaEventoTransportes(desde.id, [
      { id_gira_transporte: Number(vehicleId), plazas: cantidad },
    ]);
    if (ePlazas) {
      return {
        desde,
        hasta,
        error: new Error(
          `Paradas creadas; no se pudo fijar reserva técnica: ${ePlazas.message}`,
        ),
      };
    }
  }

  return { desde, hasta, error: null };
}
