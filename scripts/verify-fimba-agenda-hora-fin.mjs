/**
 * Agenda FIMBA: hora fin calculada solo en transporte (next del mismo vehículo).
 * Comidas / conciertos: solo persistida si hay inicio y fin en el evento.
 *
 * Standalone (Vite usa imports sin extensión). Mirror de
 * fimbaTransportBoarding.js + eventUsesDerivedHoraFin — si falla, alinear util.
 *
 * Run: node scripts/verify-fimba-agenda-hora-fin.mjs
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

function eventUsesDerivedHoraFin(ev) {
  if (!ev) return false;
  if (ev.es_ride_segment) return true;
  return isTransportTipoEvent(ev);
}

function indexOfEvent(sorted, eventId) {
  if (eventId == null || eventId === "") return -1;
  return (sorted || []).findIndex((e) => String(e.id) === String(eventId));
}

function eventAssignedToGiraTransporte(ev, idGiraTransporte) {
  const tid = Number(idGiraTransporte);
  if (!Number.isFinite(tid) || !ev) return false;
  if (
    ev.id_gira_transporte != null &&
    ev.id_gira_transporte !== "" &&
    Number(ev.id_gira_transporte) === tid
  ) {
    return true;
  }
  for (const r of ev.vehiculos || []) {
    if (Number(r?.id_gira_transporte) === tid) return true;
  }
  return false;
}

function nextAssignedStopInVehicleSequence(seq, eventId, idGiraTransporte) {
  const sorted = seq?.sortedEvents;
  if (!sorted?.length) return null;
  const idx = indexOfEvent(sorted, eventId);
  if (idx < 0) return null;
  const tid = Number(idGiraTransporte);
  if (!Number.isFinite(tid)) {
    return sorted[idx + 1] || null;
  }
  for (let i = idx + 1; i < sorted.length; i++) {
    if (eventAssignedToGiraTransporte(sorted[i], tid)) return sorted[i];
  }
  return null;
}

function resolveTransportDestinoFromNextStop(
  event,
  sequenceOrMetrics,
  vehicleId = null,
) {
  if (!event) return { nextEvent: null };
  let seq = null;
  if (sequenceOrMetrics instanceof Map) {
    const ids = [];
    if (vehicleId != null && vehicleId !== "") ids.push(Number(vehicleId));
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
  }

  let tid = vehicleId != null && vehicleId !== "" ? Number(vehicleId) : NaN;
  if (!Number.isFinite(tid) && seq?.sortedEvents) {
    for (const r of event?.vehiculos || []) {
      const n = Number(r?.id_gira_transporte);
      if (Number.isFinite(n)) {
        tid = n;
        break;
      }
    }
    if (
      !Number.isFinite(tid) &&
      event?.id_gira_transporte != null &&
      event.id_gira_transporte !== ""
    ) {
      tid = Number(event.id_gira_transporte);
    }
  }
  return {
    nextEvent: nextAssignedStopInVehicleSequence(seq, event.id, tid),
  };
}

function resolveHoraFinDisplay(_ev, nextEv) {
  const nextCom = nextEv?.hora_inicio;
  if (nextCom != null && String(nextCom).trim() !== "") {
    return {
      value: String(nextCom).slice(0, 5),
      isCalculated: true,
      source: "next_event",
    };
  }
  return { value: null, isCalculated: false, source: "missing" };
}

function resolveAgendaHoraFinDisplay(ev, sequencesByVehicle, opts = {}) {
  const isTransport =
    opts.isTransport != null
      ? Boolean(opts.isTransport)
      : isTransportTipoEvent(ev) || Boolean(ev?.es_ride_segment);

  if (isTransport && ev) {
    const { nextEvent } = resolveTransportDestinoFromNextStop(
      ev,
      sequencesByVehicle,
    );
    return resolveHoraFinDisplay(ev, nextEvent);
  }

  const start = ev?.hora_inicio;
  const end = ev?.hora_fin;
  if (
    start != null &&
    String(start).trim() !== "" &&
    end != null &&
    String(end).trim() !== ""
  ) {
    return {
      value: String(end).slice(0, 5),
      isCalculated: false,
      source: "persisted",
    };
  }
  return { value: null, isCalculated: false, source: "missing" };
}

const busA = 101;
const busB = 202;

const trasladoA1 = {
  id: 1,
  id_tipo_evento: 11,
  tipo_id_categoria: 6,
  categoria_nombre: "Transporte",
  fecha: "2026-09-15",
  hora_inicio: "08:00",
  hora_fin: "09:50",
  id_gira_transporte: busA,
  vehiculos: [{ id_gira_transporte: busA, plazas: 4 }],
};

const trasladoA2 = {
  id: 2,
  id_tipo_evento: 11,
  tipo_id_categoria: 6,
  categoria_nombre: "Transporte",
  fecha: "2026-09-15",
  hora_inicio: "10:30",
  hora_fin: null,
  id_gira_transporte: busA,
  vehiculos: [{ id_gira_transporte: busA, plazas: 4 }],
};

const trasladoB = {
  id: 3,
  id_tipo_evento: 11,
  tipo_id_categoria: 6,
  categoria_nombre: "Transporte",
  fecha: "2026-09-15",
  hora_inicio: "09:50",
  hora_fin: null,
  id_gira_transporte: busB,
  vehiculos: [{ id_gira_transporte: busB, plazas: 2 }],
};

const concierto = {
  id: 10,
  id_tipo_evento: 1,
  tipo_id_categoria: 1,
  categoria_nombre: "Conciertos",
  fecha: "2026-09-15",
  hora_inicio: "20:00",
  hora_fin: "21:30",
  vehiculos: [{ id_gira_transporte: busA, plazas: 4 }],
  id_gira_transporte: busA,
  es_traslado: true,
};

const conciertoSoloInicio = {
  id: 11,
  id_tipo_evento: 1,
  tipo_id_categoria: 1,
  categoria_nombre: "Conciertos",
  fecha: "2026-09-15",
  hora_inicio: "18:00",
  hora_fin: null,
  vehiculos: [{ id_gira_transporte: busA, plazas: 1 }],
};

const comida = {
  id: 20,
  id_tipo_evento: 7,
  tipo_id_categoria: 4,
  categoria_nombre: "Comidas",
  fecha: "2026-09-15",
  hora_inicio: "13:00",
  hora_fin: "14:00",
};

const comidaSinFin = {
  id: 21,
  id_tipo_evento: 7,
  tipo_id_categoria: 4,
  categoria_nombre: "Comidas",
  fecha: "2026-09-15",
  hora_inicio: "09:00",
  hora_fin: null,
};

assert(isTransportTipoEvent(trasladoA1), "traslado es tipo transporte");
assert(!isTransportTipoEvent(concierto), "concierto no es tipo transporte");
assert(!isTransportTipoEvent(comida), "comida no es tipo transporte");

assert(eventUsesDerivedHoraFin(trasladoA1), "transporte usa hora fin derivada");
assert(
  !eventUsesDerivedHoraFin(concierto),
  "concierto con flota no deriva hora fin",
);
assert(!eventUsesDerivedHoraFin(comida), "comida no deriva hora fin");

const seqA = { sortedEvents: [trasladoA1, trasladoA2] };
const sequences = new Map([
  [busA, seqA],
  [busB, { sortedEvents: [trasladoB] }],
]);

const finA1 = resolveAgendaHoraFinDisplay(trasladoA1, sequences);
assert(
  finA1.value === "10:30" && finA1.isCalculated && finA1.source === "next_event",
  `traslado A1 fin = next mismo vehículo 10:30 (got ${JSON.stringify(finA1)})`,
);
assert(
  finA1.value !== "09:50",
  "traslado no usa hora_fin huérfana ni el 09:50 de otra unidad",
);

const finA2 = resolveAgendaHoraFinDisplay(trasladoA2, sequences);
assert(
  finA2.value == null && finA2.source === "missing",
  "traslado cola sin next → sin fin inventado",
);

const finB = resolveAgendaHoraFinDisplay(trasladoB, sequences);
assert(
  finB.value == null && !finB.isCalculated,
  "traslado de otro vehículo no hereda el next de A",
);

const finConcierto = resolveAgendaHoraFinDisplay(concierto, sequences);
assert(
  finConcierto.value === "21:30" &&
    !finConcierto.isCalculated &&
    finConcierto.source === "persisted",
  `concierto muestra fin persistido 21:30 (got ${JSON.stringify(finConcierto)})`,
);

const finConciertoSolo = resolveAgendaHoraFinDisplay(
  conciertoSoloInicio,
  sequences,
);
assert(
  finConciertoSolo.value == null && finConciertoSolo.source === "missing",
  "concierto solo con hora de inicio no inventa fin desde el next del bus",
);

const finComida = resolveAgendaHoraFinDisplay(comida, sequences);
assert(
  finComida.value === "14:00" && finComida.source === "persisted",
  "comida con inicio y fin propios los muestra",
);

const finComidaSin = resolveAgendaHoraFinDisplay(comidaSinFin, sequences);
assert(
  finComidaSin.value == null,
  "comida sin hora_fin no toma el siguiente evento del día",
);

const seqAWithConcert = {
  sortedEvents: [trasladoA1, conciertoSoloInicio, trasladoA2],
};
const sequencesWithConcert = new Map([[busA, seqAWithConcert]]);
const finA1ViaConcert = resolveAgendaHoraFinDisplay(
  trasladoA1,
  sequencesWithConcert,
);
assert(
  finA1ViaConcert.value === "18:00" && finA1ViaConcert.isCalculated,
  "traslado puede terminar en un concierto si ese concierto es el next del mismo vehículo",
);
const finConcertInSeq = resolveAgendaHoraFinDisplay(
  conciertoSoloInicio,
  sequencesWithConcert,
);
assert(
  finConcertInSeq.value == null,
  "el concierto en la secuencia del bus no muestra el 10:30 del siguiente traslado",
);

const orphanOnly = resolveHoraFinDisplay(trasladoA1, null);
assert(
  orphanOnly.value == null && orphanOnly.source === "missing",
  "resolveHoraFinDisplay sin next no cae a hora_fin persistida",
);

if (process.exitCode) {
  console.error("verify-fimba-agenda-hora-fin FAILED");
} else {
  console.log("verify-fimba-agenda-hora-fin OK");
}
