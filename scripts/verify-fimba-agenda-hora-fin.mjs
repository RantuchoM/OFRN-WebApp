/**
 * Agenda FIMBA: hora fin calculada solo en transportes (next del mismo
 * vehículo). Comidas/conciertos/etc. = hora_fin persistida si hay inicio+fin.
 *
 * Standalone (Vite usa imports sin extensión). Mirror de
 * eventUsesDerivedHoraFin / resolveAgendaHoraFinDisplay /
 * resolveHoraFinDisplay / defaultGapFillEventSchedule.
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

const BOARDING_TRANSPORT_TIPO_IDS = new Set([11, 12, 28, 31, 35]);
const BOARDING_TRANSPORT_CATEGORIA_ID = 6;

function isTransportTipoEvent(ev) {
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

function eventUsesDerivedHoraFin(ev) {
  if (!ev) return false;
  return isTransportTipoEvent(ev) || Boolean(ev.es_ride_segment);
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

function resolveAgendaHoraFinDisplay(ev, nextVehicleEvent) {
  if (eventUsesDerivedHoraFin(ev) && ev) {
    return resolveHoraFinDisplay(ev, nextVehicleEvent);
  }
  const start =
    ev?.hora_inicio != null && String(ev.hora_inicio).trim() !== ""
      ? String(ev.hora_inicio).slice(0, 5)
      : null;
  const persisted =
    ev?.hora_fin != null && String(ev.hora_fin).trim() !== ""
      ? String(ev.hora_fin).slice(0, 5)
      : null;
  if (!start || !persisted) {
    return { value: null, isCalculated: false, source: "missing" };
  }
  return { value: persisted, isCalculated: false, source: "persisted" };
}

function defaultGapFillEventSchedule(prevEv, nextEv) {
  const curFecha = String(prevEv?.fecha || "").slice(0, 10) || null;
  const nextInicio = nextEv?.hora_inicio
    ? String(nextEv.hora_inicio).slice(0, 5)
    : null;
  if (!eventUsesDerivedHoraFin(prevEv)) {
    const persistedFin =
      prevEv?.hora_fin != null && String(prevEv.hora_fin).trim() !== ""
        ? String(prevEv.hora_fin).slice(0, 5)
        : null;
    if (persistedFin) {
      return {
        fecha: curFecha,
        hora_inicio: persistedFin,
        hora_fin: nextInicio,
      };
    }
  }
  const finDisp = resolveHoraFinDisplay(prevEv, nextEv);
  if (finDisp.value) {
    return {
      fecha: curFecha,
      hora_inicio: finDisp.value,
      hora_fin: nextInicio,
    };
  }
  return { fecha: curFecha, hora_inicio: "12:30", hora_fin: null };
}

const traslado = {
  id: 1,
  id_tipo_evento: 11,
  fecha: "2026-09-20",
  hora_inicio: "09:00",
  hora_fin: "10:00",
  vehiculos: [{ id_gira_transporte: 7 }],
};
const nextSameVehicle = {
  id: 2,
  id_tipo_evento: 11,
  fecha: "2026-09-20",
  hora_inicio: "10:30",
};
const nextOtherEvent = {
  id: 3,
  id_tipo_evento: 1,
  fecha: "2026-09-20",
  hora_inicio: "15:00",
  hora_fin: "16:30",
};
const conciertoConVehiculo = {
  id: 4,
  id_tipo_evento: 1,
  tipo_id_categoria: 1,
  fecha: "2026-09-20",
  hora_inicio: "15:00",
  hora_fin: "16:30",
  vehiculos: [{ id_gira_transporte: 7 }],
  id_gira_transporte: 7,
  es_traslado: true,
};
const conciertoSinFin = {
  id: 5,
  id_tipo_evento: 1,
  fecha: "2026-09-20",
  hora_inicio: "18:00",
  hora_fin: null,
};
const comida = {
  id: 6,
  id_tipo_evento: 20,
  tipo_id_categoria: 4,
  fecha: "2026-09-20",
  hora_inicio: "13:00",
  hora_fin: "14:00",
  vehiculos: [{ id_gira_transporte: 7 }],
};
const comidaSoloInicio = {
  id: 7,
  id_tipo_evento: 20,
  tipo_id_categoria: 4,
  fecha: "2026-09-20",
  hora_inicio: "13:00",
  hora_fin: "",
};

assert(eventUsesDerivedHoraFin(traslado), "traslado deriva hora fin");
assert(
  !eventUsesDerivedHoraFin(conciertoConVehiculo),
  "concierto con flota NO deriva hora fin",
);
assert(!eventUsesDerivedHoraFin(comida), "comida con flota NO deriva hora fin");
assert(
  !eventUsesDerivedHoraFin({ id_gira_transporte: 9, id_tipo_evento: 1 }),
  "id_gira_transporte solo no alcanza",
);

const txDisp = resolveAgendaHoraFinDisplay(traslado, nextSameVehicle);
assert(txDisp.value === "10:30", `traslado fin = next vehículo (${txDisp.value})`);
assert(txDisp.isCalculated === true, "traslado fin isCalculated");
assert(txDisp.source === "next_event", "traslado source next_event");

const txNoNext = resolveAgendaHoraFinDisplay(traslado, null);
assert(txNoNext.value == null, "traslado sin next vehículo → sin fin inventado");
assert(txNoNext.source === "missing", "traslado sin next source missing");

const concDisp = resolveAgendaHoraFinDisplay(
  conciertoConVehiculo,
  nextSameVehicle,
);
assert(
  concDisp.value === "16:30",
  `concierto usa hora_fin persistida, no next vehículo (${concDisp.value})`,
);
assert(concDisp.isCalculated === false, "concierto no isCalculated");
assert(concDisp.source === "persisted", "concierto source persisted");

const concNoFin = resolveAgendaHoraFinDisplay(conciertoSinFin, nextOtherEvent);
assert(
  concNoFin.value == null,
  "concierto sin hora_fin no toma el vecino cronológico",
);

const mealDisp = resolveAgendaHoraFinDisplay(comida, nextSameVehicle);
assert(mealDisp.value === "14:00", "comida usa fin persistido");
assert(mealDisp.isCalculated === false, "comida no calculada");

const mealSolo = resolveAgendaHoraFinDisplay(comidaSoloInicio, nextOtherEvent);
assert(mealSolo.value == null, "comida solo con hora_inicio → sin fin");

const gapMeal = defaultGapFillEventSchedule(comida, nextOtherEvent);
assert(
  gapMeal.hora_inicio === "14:00",
  `insertar tras comida arranca en fin persistido (${gapMeal.hora_inicio})`,
);
assert(gapMeal.hora_fin === "15:00", "insertar tras comida termina en next");

const gapTx = defaultGapFillEventSchedule(traslado, nextSameVehicle);
assert(
  gapTx.hora_inicio === "10:30",
  `insertar tras traslado arranca en next vehículo (${gapTx.hora_inicio})`,
);

const gapConcierto = defaultGapFillEventSchedule(
  conciertoConVehiculo,
  nextOtherEvent,
);
assert(
  gapConcierto.hora_inicio === "16:30",
  "insertar tras concierto ignora next vehículo 10:30 y usa 16:30 persistida",
);

if (process.exitCode) {
  console.error("verify-fimba-agenda-hora-fin FAILED");
} else {
  console.log("verify-fimba-agenda-hora-fin OK");
}
