/**
 * Aserciones: secuencia unificada OFRN+FIMBA (mismo giras_transportes).
 * Regresión: Conciertos con plazas flota no inventan hop Δ −1 / −2.
 *
 * Standalone (Vite usa imports sin extensión). Mirror de
 * fimbaTransportBoarding.js — si falla, alinear util.
 *
 * Run: node scripts/verify-fimba-boarding-delta.mjs
 */

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

const TRANSPORT_TIPO_IDS = new Set([11, 12, 28, 31, 35]);
const TRANSPORT_CAT = 6;

function isTransportTipoEvent(ev) {
  if (!ev) return false;
  const id = Number(ev.id_tipo_evento);
  if (Number.isFinite(id) && TRANSPORT_TIPO_IDS.has(id)) return true;
  const catId = Number(
    ev.tipo_id_categoria ??
      ev.tipos_evento?.id_categoria ??
      ev.tipos_evento?.categorias_tipos_eventos?.id,
  );
  if (catId === TRANSPORT_CAT) return true;
  const catNombre = String(
    ev.categoria_nombre ||
      ev.tipos_evento?.categorias_tipos_eventos?.nombre ||
      "",
  )
    .trim()
    .toLowerCase();
  return catNombre === "transporte";
}

function sortEventsBySchedule(events) {
  return [...(events || [])].sort((a, b) =>
    `${a.fecha || ""}${a.hora_inicio || ""}`.localeCompare(
      `${b.fecha || ""}${b.hora_inicio || ""}`,
    ),
  );
}

/** Siguiente parada del timeline unificado (incluye OFRN). */
function nextSyntheticAlightEvent(sorted, fromIdx) {
  const list = sorted || [];
  if (!Number.isFinite(fromIdx) || fromIdx < 0 || fromIdx >= list.length - 1) {
    return null;
  }
  return list[fromIdx + 1] || null;
}

function resolveFimbaSeatsForVehicle(ev, idGiraTransporte) {
  const want = Number(idGiraTransporte);
  const row = (ev?.vehiculos || []).find(
    (r) => Number(r?.id_gira_transporte) === want,
  );
  return Math.max(0, Number(row?.plazas) || 0);
}

function buildFimbaSyntheticRides(sortedEvents, idGiraTransporte) {
  const rides = [];
  const sorted = sortedEvents || [];
  sorted.forEach((ev, idx) => {
    if (!isTransportTipoEvent(ev)) return;
    const seats = resolveFimbaSeatsForVehicle(ev, idGiraTransporte);
    if (seats <= 0) return;
    const next = nextSyntheticAlightEvent(sorted, idx);
    const props = ev?.propuestas || [];
    const single = props.length === 1 ? props[0] : null;
    rides.push({
      subidaId: ev.id,
      bajadaId: next?.id ?? null,
      seats,
      source: "fimba",
      id_propuesta: single?.id ?? null,
      nombre: single?.nombre || null,
    });
  });
  return rides;
}

function isVehicleBoardingSequenceEvent(ev, tid, fleetIds, endpointIds) {
  const eid = ev.id != null ? String(ev.id) : "";
  const isEndpoint = Boolean(eid && endpointIds?.has(eid));
  const onFleet = (fleetIds(ev) || []).some((id) => Number(id) === tid);
  const ofrnUnit =
    ev.id_gira_transporte != null && Number(ev.id_gira_transporte) === tid;
  if (ofrnUnit) return true;
  if (!onFleet && !isEndpoint) return false;
  if (isTransportTipoEvent(ev)) return true;
  if (isEndpoint) return true;
  return false;
}

function indexOfEvent(sorted, eventId) {
  return (sorted || []).findIndex((e) => String(e.id) === String(eventId));
}

function isOnBoardAfterStop(upIdx, downIdx, currentIdx) {
  if (!Number.isFinite(upIdx) || upIdx < 0) return false;
  if (upIdx > currentIdx) return false;
  if (downIdx == null || downIdx < 0 || !Number.isFinite(downIdx)) return true;
  return downIdx > currentIdx;
}

function buildSequence(sorted, ofrnRides, fimbaRides, capacidad) {
  const allRides = [...ofrnRides, ...fimbaRides];
  const stops = sorted.map((evt, currentIdx) => {
    const board = allRides
      .filter((r) => r.subidaId != null && String(r.subidaId) === String(evt.id))
      .reduce((s, r) => s + (Number(r.seats) || 0), 0);
    const alight = allRides
      .filter((r) => r.bajadaId != null && String(r.bajadaId) === String(evt.id))
      .reduce((s, r) => s + (Number(r.seats) || 0), 0);
    let enTransito = 0;
    for (const r of allRides) {
      if (!r.subidaId) continue;
      const upIdx = indexOfEvent(sorted, r.subidaId);
      const downIdx =
        r.bajadaId != null && r.bajadaId !== ""
          ? indexOfEvent(sorted, r.bajadaId)
          : null;
      if (isOnBoardAfterStop(upIdx, downIdx, currentIdx)) {
        enTransito += Number(r.seats) || 0;
      }
    }
    return {
      eventId: evt.id,
      delta: board - alight,
      board_seats: board,
      alight_seats: alight,
      en_transito: enTransito,
      capacidad,
    };
  });
  return {
    stops,
    byEventId: Object.fromEntries(stops.map((s) => [String(s.eventId), s])),
  };
}

const TIPO_TRASLADO = {
  id: 11,
  nombre: "Traslado",
  id_categoria: 6,
  categorias_tipos_eventos: { id: 6, nombre: "Transporte" },
};
const TIPO_CONCIERTO = {
  id: 1,
  nombre: "Concierto",
  id_categoria: 1,
  categorias_tipos_eventos: { id: 1, nombre: "Concierto" },
};

const tid = 225;
const fleetIds = (ev) => {
  const ids = [];
  for (const r of ev.vehiculos || []) {
    const n = Number(r.id_gira_transporte);
    if (Number.isFinite(n)) ids.push(n);
  }
  if (ev.id_gira_transporte != null) ids.push(Number(ev.id_gira_transporte));
  return [...new Set(ids)];
};

const evOfrnOut = {
  id: 3804,
  fecha: "2026-09-14",
  hora_inicio: "08:00:00",
  id_tipo_evento: 11,
  tipos_evento: TIPO_TRASLADO,
  id_gira_transporte: tid,
  vehiculos: [],
  propuestas: [],
};
const evKcIn = {
  id: 3946,
  fecha: "2026-09-17",
  hora_inicio: "17:00:00",
  id_tipo_evento: 11,
  tipos_evento: TIPO_TRASLADO,
  vehiculos: [{ id_gira_transporte: tid, plazas: 7 }],
  propuestas: [{ id: 9, nombre: "King Crimson", cantidad_planificada: 7 }],
};
const evConciertoVs = {
  id: 3986,
  fecha: "2026-09-19",
  hora_inicio: "17:00:00",
  id_tipo_evento: 1,
  tipos_evento: TIPO_CONCIERTO,
  vehiculos: [{ id_gira_transporte: tid, plazas: 6 }],
  propuestas: [{ id: 19, nombre: "Viento Sur", cantidad_planificada: 6 }],
};
const evConciertoAtlas = {
  id: 3987,
  fecha: "2026-09-19",
  hora_inicio: "17:00:00",
  id_tipo_evento: 1,
  tipos_evento: TIPO_CONCIERTO,
  vehiculos: [{ id_gira_transporte: tid, plazas: 4 }],
  propuestas: [{ id: 10, nombre: "Cuarteto Atlas", cantidad_planificada: 4 }],
};
const evOfrnArribo = {
  id: 3818,
  fecha: "2026-09-20",
  hora_inicio: "23:00:00",
  id_tipo_evento: 11,
  tipos_evento: TIPO_TRASLADO,
  id_gira_transporte: tid,
  vehiculos: [],
  propuestas: [],
};
const evKcOut = {
  id: 3947,
  fecha: "2026-09-20",
  hora_inicio: "23:30:00",
  id_tipo_evento: 11,
  tipos_evento: TIPO_TRASLADO,
  vehiculos: [{ id_gira_transporte: tid, plazas: 7 }],
  propuestas: [{ id: 9, nombre: "King Crimson", cantidad_planificada: 7 }],
};

const eventos = [
  evOfrnOut,
  evKcIn,
  evConciertoVs,
  evConciertoAtlas,
  evOfrnArribo,
  evKcOut,
];

assert(isTransportTipoEvent(evKcIn), "Traslado es tipo transporte");
assert(!isTransportTipoEvent(evConciertoVs), "Concierto no es tipo transporte");
assert(
  isVehicleBoardingSequenceEvent(evOfrnArribo, tid, fleetIds, new Set()),
  "Parada OFRN siempre en secuencia unificada",
);
assert(
  !isVehicleBoardingSequenceEvent(evConciertoVs, tid, fleetIds, new Set()),
  "Concierto con plazas flota (sin ↑/↓) no entra a secuencia",
);
assert(
  isVehicleBoardingSequenceEvent(
    evConciertoVs,
    tid,
    fleetIds,
    new Set(["3986"]),
  ),
  "Concierto con endpoint ↑/↓ sí entra",
);

const vehicleEvents = sortEventsBySchedule(
  eventos.filter((ev) =>
    isVehicleBoardingSequenceEvent(ev, tid, fleetIds, new Set()),
  ),
);
assert(
  vehicleEvents.some((e) => e.id === 3818),
  "Arribo OFRN presente en timeline",
);
assert(
  !vehicleEvents.some((e) => e.id === 3986 || e.id === 3987),
  "Conciertos sin ↑/↓ ausentes",
);

const fimbaRides = buildFimbaSyntheticRides(vehicleEvents, tid);
assert(
  fimbaRides.every((r) => r.subidaId !== 3986 && r.subidaId !== 3987),
  "Sintéticos no suben en Conciertos",
);

// plazas=0 + tags NO inventa headcount (capacidad ≠ plazas aplicadas)
const zeroPlazasEv = {
  id: 9999,
  fecha: "2026-09-13",
  hora_inicio: "08:00:00",
  id_tipo_evento: 11,
  tipos_evento: TIPO_TRASLADO,
  vehiculos: [{ id_gira_transporte: tid, plazas: 0 }],
  propuestas: [{ id: 4, nombre: "Orquesta Infantil", cantidad_planificada: 120 }],
};
assert(
  resolveFimbaSeatsForVehicle(zeroPlazasEv, tid) === 0,
  "plazas=0 no inventa para_transporte de tags",
);
assert(
  buildFimbaSyntheticRides([zeroPlazasEv], tid).length === 0,
  "sin residual sintético si plazas=0",
);

assert(
  fimbaRides.some(
    (r) => r.subidaId === 3946 && r.bajadaId === 3818 && r.seats === 7,
  ),
  "KC residual: sube 3946, baja en siguiente parada unificada (Arribo OFRN 3818)",
);

const ofrnRides = [1, 2, 3, 4].map((id) => ({
  id,
  seats: 1,
  subidaId: 3804,
  bajadaId: 3818,
  source: "ofrn",
}));

const seq = buildSequence(vehicleEvents, ofrnRides, fimbaRides, 19);
const byId = seq.byEventId;

const kcIn = byId["3946"];
assert(kcIn?.delta === 7, `KC inbound Δ=+7 (got ${kcIn?.delta})`);
assert(
  kcIn?.en_transito === 11,
  `tras KC inbound 11/19 (4 OFRN + 7 KC) got ${kcIn?.en_transito}`,
);

const arribo = byId["3818"];
// OFRN −4 + KC residual −7 = −11 → 0 a bordo
assert(arribo?.delta === -11, `Arribo unificado Δ=-11 (got ${arribo?.delta})`);
assert(arribo?.en_transito === 0, `tras Arribo 0 a bordo (got ${arribo?.en_transito})`);

const kcOut = byId["3947"];
assert(kcOut?.delta === 7, `KC outbound Δ=+7 (got ${kcOut?.delta})`);
assert(kcOut?.en_transito === 7, `tras outbound 7/19 (got ${kcOut?.en_transito})`);

let rolling = 0;
for (const s of seq.stops) {
  rolling += s.delta;
  assert(
    rolling === s.en_transito,
    `parada ${s.eventId}: rolling ${rolling} === en_transito ${s.en_transito}`,
  );
}

// Documenta bug viejo: hop Concierto → Δ −1 / −2
assert(6 - 7 === -1 && 4 - 6 === -2, "documenta bug viejo hop Concierto");
assert(!byId["3986"] && !byId["3987"], "sin filas Concierto fantasma");

// --- isFimbaRideAboardAtStop: ride abierto no marca eventos fuera de secuencia ---
function isPresentAtStop(upIdx, downIdx, currentIdx) {
  if (!Number.isFinite(upIdx) || upIdx < 0 || !Number.isFinite(currentIdx) || currentIdx < 0) {
    return false;
  }
  if (upIdx > currentIdx) return false;
  if (downIdx == null || downIdx < 0 || !Number.isFinite(downIdx)) return true;
  return downIdx >= currentIdx;
}

function isOpenFimbaRide(ruta) {
  if (!ruta) return false;
  if (Math.max(0, Number(ruta.plazas) || 0) <= 0) return false;
  if (ruta.id_evento_subida == null || ruta.id_evento_subida === "") return false;
  if (ruta.id_evento_bajada != null && ruta.id_evento_bajada !== "") return false;
  return true;
}

function isFimbaRideAboardAtStop(ruta, currentEventId, sortedEvents) {
  if (!ruta || Math.max(0, Number(ruta.plazas) || 0) <= 0) return false;
  if (ruta.id_evento_subida == null || ruta.id_evento_subida === "") return false;
  const sorted = sortedEvents || [];
  if (sorted.length && currentEventId != null && currentEventId !== "") {
    const currentIdx = indexOfEvent(sorted, currentEventId);
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

const openRide = {
  plazas: 4,
  id_evento_subida: 3946,
  id_evento_bajada: null,
};
const vehicleSorted = [
  { id: 3946 },
  { id: 3818 },
  { id: 3947 },
];
assert(
  isFimbaRideAboardAtStop(openRide, 3946, vehicleSorted),
  "ride abierto: a bordo en subida",
);
assert(
  isFimbaRideAboardAtStop(openRide, 3818, vehicleSorted),
  "ride abierto: a bordo en parada intermedia",
);
assert(
  !isFimbaRideAboardAtStop(openRide, 99901, vehicleSorted),
  "ride abierto: NO marca concierto ajeno fuera de secuencia (regresión filtro artista)",
);
assert(
  isOpenFimbaRide(openRide),
  "sin bajada = ride abierto",
);

// --- Regresión Guillo / parada intermedia: bajada en Concierto fuera de planilla ---
function collectMissingRideEndpointEvents(eventos, propuestaRoutes, ofrnRides) {
  const known = new Set(
    (eventos || [])
      .map((e) => (e?.id != null && e.id !== "" ? String(e.id) : ""))
      .filter(Boolean),
  );
  const out = [];
  const add = (ev) => {
    if (!ev || ev.id == null || ev.id === "") return;
    const id = String(ev.id);
    if (known.has(id)) return;
    known.add(id);
    out.push({
      id: ev.id,
      fecha: ev.fecha ?? null,
      hora_inicio: ev.hora_inicio ?? null,
      hora_fin: ev.hora_fin ?? null,
      id_tipo_evento: ev.id_tipo_evento ?? null,
      es_ride_endpoint: true,
    });
  };
  for (const r of propuestaRoutes || []) {
    add(r?.evento_subida);
    add(r?.evento_bajada);
  }
  for (const r of ofrnRides || []) {
    add(r?.subidaData);
    add(r?.bajadaData);
  }
  return out;
}

const closedAtConcert = {
  plazas: 4,
  id_evento_subida: 3950,
  id_evento_bajada: 3984,
  evento_bajada: {
    id: 3984,
    fecha: "2026-09-19",
    hora_inicio: "19:00:00",
    id_tipo_evento: 1,
  },
};
const planillaOnly = [
  { id: 3950, fecha: "2026-09-19", hora_inicio: "01:30:00", id_tipo_evento: 11 },
  { id: 4412, fecha: "2026-09-19", hora_inicio: "12:45:00", id_tipo_evento: 11 },
  { id: 3951, fecha: "2026-09-20", hora_inicio: null, id_tipo_evento: 11 },
];
assert(
  isFimbaRideAboardAtStop(closedAtConcert, 4412, planillaOnly),
  "sin Concierto en secuencia: downIdx=-1 → aún 'presente' (legacy)",
);
const stubs = collectMissingRideEndpointEvents(
  planillaOnly,
  [{ id_gira_transporte: 226, ...closedAtConcert }],
  [],
);
assert(stubs.some((e) => String(e.id) === "3984"), "stub Concierto desde embed");
const withEndpoint = [...planillaOnly, ...stubs].sort((a, b) =>
  `${a.fecha || ""}${a.hora_inicio || ""}`.localeCompare(
    `${b.fecha || ""}${b.hora_inicio || ""}`,
  ),
);
assert(
  isFimbaRideAboardAtStop(closedAtConcert, 4412, withEndpoint),
  "con Concierto en secuencia: a bordo en parada 12:45",
);
assert(
  !isFimbaRideAboardAtStop(closedAtConcert, 3951, withEndpoint),
  "con Concierto en secuencia: ya no a bordo al día siguiente",
);
assert(
  !isOpenFimbaRide(closedAtConcert),
  "ride con bajada Concierto no es openRide (UI antes mostraba OK)",
);

// --- Auditoría ↑/↓ fuera de trayecto (planilla Transportes) ---
function isOffTrayectoRideEndpoint(ev) {
  if (!ev || ev.id == null || ev.id === "") return false;
  const rawTipo = ev.id_tipo_evento;
  const hasTipo =
    rawTipo != null && rawTipo !== "" && Number.isFinite(Number(rawTipo));
  if (!hasTipo) return false;
  return !isTransportTipoEvent(ev);
}

function listOffTrayectoRideEndpointsLite(propuestaRoutes) {
  const rows = [];
  for (const r of propuestaRoutes || []) {
    for (const [end, embed, id] of [
      ["up", r.evento_subida, r.id_evento_subida],
      ["down", r.evento_bajada, r.id_evento_bajada],
    ]) {
      const ev = embed || (id != null ? { id, id_tipo_evento: null } : null);
      if (!ev || !isOffTrayectoRideEndpoint(ev)) continue;
      rows.push({ end, eventId: ev.id, tipo: ev.id_tipo_evento });
    }
  }
  return rows;
}

const auditRows = listOffTrayectoRideEndpointsLite([
  { id_gira_transporte: 226, ...closedAtConcert },
]);
assert(
  auditRows.length === 1 &&
    auditRows[0].end === "down" &&
    String(auditRows[0].eventId) === "3984",
  "auditoría: bajada en Concierto (tipo 1) aparece fuera de trayecto",
);
assert(
  listOffTrayectoRideEndpointsLite([
    {
      id_evento_subida: 3950,
      id_evento_bajada: 4412,
      evento_subida: {
        id: 3950,
        id_tipo_evento: 11,
      },
      evento_bajada: {
        id: 4412,
        id_tipo_evento: 11,
      },
    },
  ]).length === 0,
  "auditoría: ride trayecto↔trayecto no figura",
);

if (process.exitCode) {
  console.error("\nAlgunas aserciones fallaron.");
} else {
  console.log("\nTodas las aserciones OK (timeline unificado OFRN+FIMBA).");
}
