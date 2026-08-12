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
 * 2) Sintéticos legacy: `fimba_evento_transportes.plazas` (o suma tags) sube en el
 *    evento de asignación y baja en la **siguiente** parada de la unidad
 *    (si no hay siguiente, permanece a bordo). Se omiten plazas sintéticas de
 *    un evento que ya tiene rides explícitos que suben ahí en esa unidad.
 *
 * Headcount "en el lugar" (Artistas column):
 *   presente_en_parada = boarded by idx && (no bajada | downIdx >= currentIdx)
 *   = sube aquí, pasa por aquí o baja aquí (no solo en_transito al salir).
 *
 * Fórmula n Orquesta / Artista en planilla transportes (por contexto de vehículo):
 *   n = Σ plazas de rides source ofrn|propuesta presentes en la parada
 *   (suma multi-vehículo sin double-count de orquesta porque cada pax es 1 unidad).
 */

import { sortEventsBySchedule } from "./giraTransportUtils";

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
 * Locación visible: nombre locaciones → destino texto → localidad → —.
 * @param {{
 *   locaciones?: { nombre?: string|null, localidades?: { localidad?: string|null }|null }|null,
 *   destino?: string|null,
 *   id_locacion?: unknown,
 * }} ev
 */
export function formatEventLocation(ev) {
  const locName = String(ev?.locaciones?.nombre || "").trim();
  if (locName) {
    const city = String(ev?.locaciones?.localidades?.localidad || "").trim();
    return city ? `${locName} (${city})` : locName;
  }
  const dest = String(ev?.destino || "").trim();
  if (dest) return dest;
  const cityOnly = String(ev?.locaciones?.localidades?.localidad || "").trim();
  if (cityOnly) return cityOnly;
  return "—";
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

/**
 * Destino de planilla: locación/destino del next stop; si falta, título actividad.
 * Sin next stop → "—".
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
 * Plazas FIMBA del evento en una unidad:
 * 1) `fimba_evento_transportes.plazas` si > 0
 * 2) si no, suma `para_transporte` de propuestas taggeadas (tope + extras materiales)
 *
 * @param {object} ev — evento mapeado FIMBA
 * @param {number|string} idGiraTransporte
 * @param {(p: object) => { para_transporte?: number }} [capacityFn]
 */
export function resolveFimbaSeatsForVehicle(ev, idGiraTransporte, capacityFn) {
  const want = Number(idGiraTransporte);
  if (!Number.isFinite(want)) return 0;

  const row = (ev?.vehiculos || []).find(
    (r) => Number(r?.id_gira_transporte) === want,
  );
  const assigned = Math.max(0, Number(row?.plazas) || 0);
  if (assigned > 0) return assigned;

  // Solo aporta headcount FIMBA si hay asignación a esta unidad o solo OFRN unit match
  const hasFimbaRow = Boolean(row);
  const isOfrnUnit =
    ev?.id_gira_transporte != null &&
    Number(ev.id_gira_transporte) === want;
  if (!hasFimbaRow && !isOfrnUnit) return 0;

  // Sin plazas numéricas: headcount de artistas taggeados (si hay tags)
  const props = ev?.propuestas || [];
  if (!props.length || typeof capacityFn !== "function") {
    // Pure OFRN stop sin tags: el cupo orquesta lo llevan las subidas logísticas
    return 0;
  }
  if (!hasFimbaRow) return 0; // no inventar FIMBA en parada OFRN sin fila de asignación

  return props.reduce((sum, p) => {
    const cap = capacityFn(p);
    return sum + Math.max(0, Number(cap?.para_transporte) || 0);
  }, 0);
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
 * Sin secuencia: ride abierto, o bajada ya apuntando a este evento.
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
    if (currentIdx < 0) return isOpenFimbaRide(ruta);
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
 * Construye pasajeros-ride sintéticos FIMBA por secuencia de unidad (legacy).
 *
 * @param {Array<object>} sortedEvents
 * @param {number|string} idGiraTransporte
 * @param {(p: object) => { para_transporte?: number }} [capacityFn]
 * @param {{ skipBoardEventIds?: Set<string> }} [opts] — no sintetizar subidas ya cubiertas por rutas explícitas
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
  sorted.forEach((ev, idx) => {
    if (skipBoard && skipBoard.has(String(ev.id))) return;
    const seats = resolveFimbaSeatsForVehicle(ev, idGiraTransporte, capacityFn);
    if (seats <= 0) return;
    const next = sorted[idx + 1];
    rides.push({
      key: `fimba-${ev.id}-${idGiraTransporte}`,
      subidaId: ev.id,
      bajadaId: next?.id ?? null,
      seats,
      source: "fimba",
      id_propuesta: null,
    });
  });
  return rides;
}

/**
 * Combina rides explícitos + residual sintético.
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
  const skipBoardEventIds = new Set(
    explicit
      .filter((r) => r.subidaId != null)
      .map((r) => String(r.subidaId)),
  );
  const synthetic = buildFimbaSyntheticRides(
    sortedEvents,
    idGiraTransporte,
    capacityFn,
    { skipBoardEventIds },
  );
  return [...explicit, ...synthetic];
}

/**
 * Pasajeros OFRN a bordo de la unidad con sus paradas (subida/bajada).
 *
 * @param {Array<object>} summary — output `calculateLogisticsSummary`
 * @param {number|string} idGiraTransporte
 * @returns {Array<{ id: unknown, seats: number, subidaId: unknown|null, bajadaId: unknown|null, source: 'ofrn' }>}
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
 * Etiqueta «Orquesta {n}».
 * @param {number|string|null|undefined} n
 */
export function formatOrquestaHeadcountLabel(n) {
  const num = Number(n);
  if (Number.isFinite(num) && num > 0) return `Orquesta ${num}`;
  return "Orquesta";
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

/**
 * Secuencia de paradas con Δ y en tránsito (plazas) para una unidad.
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
    const vehicleEvents = sortEventsBySchedule(
      (eventos || []).filter((ev) => idFn(ev).includes(tid)),
    );
    const ofrnRides = extractOfrnRidesForVehicle(logisticsSummary, tid);
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
 * Bloques de agenda «a bordo» para un artista a partir de `fimba_propuesta_rutas`
 * (y residual sintético vía `buildFimbaRidesForVehicle` si se pasan rides ya filtrados).
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
 * Fusiona eventos tagged + bloques de traslado y ordena por fecha/hora.
 * @param {Array<object>} eventos
 * @param {Array<object>} rideBlocks
 */
export function mergeAgendaWithTrasladoBlocks(eventos, rideBlocks) {
  return sortEventsBySchedule([...(eventos || []), ...(rideBlocks || [])]);
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

