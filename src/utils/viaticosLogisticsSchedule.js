import {
  hasLocalidadViaticosAsignada,
  resolveLocalidadEfectivaViaticos,
} from "./integranteDomicilioViaticos";

const normalizeScope = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/** Alcance de regla de ruta que cuenta como asignación individual (misma lógica que useLogistics). */
const PERSONAL_ROUTE_SCOPES = new Set(["persona", "integrante"]);

export function isPersonalRouteScope(scope) {
  return PERSONAL_ROUTE_SCOPES.has(normalizeScope(scope));
}

/** ¿Tiene subida/bajada por regla de alcance Persona/Integrante en algún transporte? */
export function personHasPersonalRouteAssignment(person) {
  const transports = person?.logistics?.transports || [];
  return transports.some(
    (t) =>
      isPersonalRouteScope(t.subidaScope) || isPersonalRouteScope(t.bajadaScope),
  );
}

export const normalizeLocalidadName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function sliceTime(value) {
  if (!value) return null;
  return String(value).slice(0, 5);
}

function parseDateTime(fecha, hora) {
  if (!fecha) return null;
  const dt = new Date(`${fecha}T${hora || "00:00"}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function eventLocalidadId(evt) {
  return evt?.locaciones?.id_localidad ?? evt?.id_localidad ?? null;
}

export function eventMatchesLocalidad(evt, locId, locName) {
  if (!evt) return false;
  const eventLocId = eventLocalidadId(evt);
  if (locId != null && eventLocId != null && String(eventLocId) === String(locId)) {
    return true;
  }
  const eventName =
    evt.nombre_localidad || evt?.locaciones?.localidades?.localidad || "";
  const targetName = locName || "";
  if (eventName && targetName) {
    return normalizeLocalidadName(eventName) === normalizeLocalidadName(targetName);
  }
  return false;
}

function ruleHasRouteEvent(rule, eventField) {
  if (!rule) return false;
  if (rule[eventField]) return true;
  const idField =
    eventField === "evento_subida" ? "id_evento_subida" : "id_evento_bajada";
  return rule[idField] != null && rule[idField] !== "";
}

export function findBestRouteRule(routeRules, locId, regionId, eventField) {
  const rules = Array.isArray(routeRules) ? routeRules : [];
  let best = null;
  let bestScore = -1;

  rules.forEach((rule) => {
    if (!ruleHasRouteEvent(rule, eventField)) return;
    const scope = normalizeScope(rule.alcance);
    const byLocalidad =
      String(rule.id_localidad || "") === String(locId) ||
      (Array.isArray(rule.target_localities) &&
        rule.target_localities.some((x) => String(x) === String(locId)));
    const byRegion =
      String(rule.id_region || "") === String(regionId) ||
      (Array.isArray(rule.target_regions) &&
        rule.target_regions.some((x) => String(x) === String(regionId)));

    let score = 0;
    if (scope === "localidad" && byLocalidad) score = 3;
    else if (scope === "region" && byRegion) score = 2;
    else if (scope === "general") score = 1;
    else if (byLocalidad) score = 3;
    else if (byRegion) score = 2;

    if (score > bestScore) {
      best = rule;
      bestScore = score;
    }
  });

  return best;
}

function buildTravelScheduleFromRules(subidaRule, bajadaRule, transportMap) {
  const subida = subidaRule || null;
  const bajada = bajadaRule || subidaRule || null;
  if (!subida?.evento_subida && !bajada?.evento_bajada) return null;

  const evtSalida = subida?.evento_subida || null;
  const evtLlegada = bajada?.evento_bajada || null;
  const bus =
    transportMap?.[subida?.id_transporte_fisico || bajada?.id_transporte_fisico];
  const tNombre = bus?.transportes?.nombre || bus?.nombre || "Transporte";
  const tDetalle = bus?.detalle ? ` - ${bus.detalle}` : "";

  return {
    fecha_salida: evtSalida?.fecha || null,
    hora_salida: sliceTime(evtSalida?.hora_inicio || evtSalida?.hora),
    fecha_llegada: evtLlegada?.fecha || null,
    hora_llegada: sliceTime(evtLlegada?.hora_inicio || evtLlegada?.hora),
    transporte_salida: `${tNombre}${tDetalle}`.trim(),
    transporte_llegada: `${tNombre}${tDetalle}`.trim(),
    lugar_salida: evtSalida?.locaciones?.localidades?.localidad || null,
    lugar_llegada: evtLlegada?.locaciones?.localidades?.localidad || null,
    patente: bus?.transportes?.patente || bus?.patente || "",
  };
}

function mergeLogisticsEntries(entries) {
  let minSalida = null;
  let maxLlegada = null;
  let salidaMeta = {};
  let llegadaMeta = {};

  (entries || []).forEach((entry) => {
    const salidaDt = parseDateTime(entry.fecha_salida, entry.hora_salida);
    if (salidaDt && (!minSalida || salidaDt < minSalida.dt)) {
      minSalida = { dt: salidaDt };
      salidaMeta = {
        fecha_salida: entry.fecha_salida,
        hora_salida: entry.hora_salida,
        transporte_salida: entry.transporte_salida,
        lugar_salida: entry.lugar_salida,
        patente: entry.patente,
      };
    }

    const llegadaDt = parseDateTime(entry.fecha_llegada, entry.hora_llegada);
    if (llegadaDt && (!maxLlegada || llegadaDt > maxLlegada.dt)) {
      maxLlegada = { dt: llegadaDt };
      llegadaMeta = {
        fecha_llegada: entry.fecha_llegada,
        hora_llegada: entry.hora_llegada,
        transporte_llegada: entry.transporte_llegada,
        lugar_llegada: entry.lugar_llegada,
      };
    }
  });

  if (!minSalida && !maxLlegada) return null;
  return { ...salidaMeta, ...llegadaMeta };
}

/** Horarios de transporte personales (subida/bajada asignadas en logística). */
export function buildPersonalLogisticsFromSummary(summary) {
  const map = {};
  (summary || []).forEach((person) => {
    const transports = person.logistics?.transports || [];
    if (transports.length === 0) return;

    const onlyPersonalSubida = transports.some((t) =>
      isPersonalRouteScope(t.subidaScope),
    );
    const onlyPersonalBajada = transports.some((t) =>
      isPersonalRouteScope(t.bajadaScope),
    );

    let minSalida = null;
    let maxLlegada = null;

    transports.forEach((t) => {
      let nombreFinal = t.nombre || "Transporte";
      if (t.detalle && t.detalle.trim() !== "") {
        nombreFinal = `${nombreFinal} - ${t.detalle}`;
      }

      if (t.subidaData) {
        if (onlyPersonalSubida && !isPersonalRouteScope(t.subidaScope)) return;

        const dateTimeStr = `${t.subidaData.fecha}T${t.subidaData.hora || "00:00"}`;
        const dateObj = new Date(dateTimeStr);
        if (!Number.isNaN(dateObj.getTime()) && (!minSalida || dateObj < minSalida.dt)) {
          minSalida = {
            dt: dateObj,
            fecha: t.subidaData.fecha,
            hora: sliceTime(t.subidaData.hora) || "00:00",
            lugar: t.subidaData.nombre_localidad || "Origen",
            transporte: nombreFinal,
            patente: t.patente || t.transporteData?.patente || "",
          };
        }
      }

      if (t.bajadaData) {
        if (onlyPersonalBajada && !isPersonalRouteScope(t.bajadaScope)) return;

        const dateTimeStr = `${t.bajadaData.fecha}T${t.bajadaData.hora || "00:00"}`;
        const dateObj = new Date(dateTimeStr);
        if (!Number.isNaN(dateObj.getTime()) && (!maxLlegada || dateObj > maxLlegada.dt)) {
          maxLlegada = {
            dt: dateObj,
            fecha: t.bajadaData.fecha,
            hora: sliceTime(t.bajadaData.hora) || "00:00",
            lugar: t.bajadaData.nombre_localidad || "Destino",
            transporte: nombreFinal,
          };
        }
      }
    });

    if (minSalida || maxLlegada) {
      map[person.id] = {
        fecha_salida: minSalida?.fecha,
        hora_salida: minSalida?.hora,
        transporte_salida: minSalida?.transporte,
        lugar_salida: minSalida?.lugar,
        patente: minSalida?.patente,
        fecha_llegada: maxLlegada?.fecha,
        hora_llegada: maxLlegada?.hora,
        transporte_llegada: maxLlegada?.transporte,
        lugar_llegada: maxLlegada?.lugar,
      };
    }
  });

  return map;
}

function extractLogisticsForLocalidadBoarding(person, locId, locName) {
  const transports = person.logistics?.transports || [];
  if (transports.length === 0) return null;

  let minSalida = null;
  let maxLlegada = null;
  let salidaMeta = {};
  let llegadaMeta = {};

  transports.forEach((t) => {
    let nombreFinal = t.nombre || "Transporte";
    if (t.detalle && t.detalle.trim() !== "") {
      nombreFinal = `${nombreFinal} - ${t.detalle}`;
    }

    if (t.subidaData && eventMatchesLocalidad(t.subidaData, locId, locName)) {
      const dateObj = parseDateTime(t.subidaData.fecha, t.subidaData.hora);
      if (dateObj && (!minSalida || dateObj < minSalida.dt)) {
        minSalida = { dt: dateObj };
        salidaMeta = {
          fecha_salida: t.subidaData.fecha,
          hora_salida: sliceTime(t.subidaData.hora) || "00:00",
          transporte_salida: nombreFinal,
          lugar_salida: t.subidaData.nombre_localidad || locName || "Origen",
          patente: t.patente || t.transporteData?.patente || "",
        };
      }
    }

    if (t.bajadaData && eventMatchesLocalidad(t.bajadaData, locId, locName)) {
      const dateObj = parseDateTime(t.bajadaData.fecha, t.bajadaData.hora);
      if (dateObj && (!maxLlegada || dateObj > maxLlegada.dt)) {
        maxLlegada = { dt: dateObj };
        llegadaMeta = {
          fecha_llegada: t.bajadaData.fecha,
          hora_llegada: sliceTime(t.bajadaData.hora) || "00:00",
          transporte_llegada: nombreFinal,
          lugar_llegada: t.bajadaData.nombre_localidad || locName || "Destino",
        };
      }
    }
  });

  if (!minSalida && !maxLlegada) return null;
  return { ...salidaMeta, ...llegadaMeta };
}

function buildLocalitySchedulesFromRouteRules(routeRules, transportMap, localitiesById) {
  const schedules = {};
  const locIds = new Set();

  (routeRules || []).forEach((rule) => {
    if (rule.id_localidad != null) locIds.add(Number(rule.id_localidad));
    (rule.target_localities || []).forEach((id) => {
      if (id != null) locIds.add(Number(id));
    });
  });

  Object.keys(localitiesById || {}).forEach((id) => {
    if (id != null && id !== "") locIds.add(Number(id));
  });

  locIds.forEach((locId) => {
    if (Number.isNaN(locId)) return;
    const loc = localitiesById?.[locId] ?? localitiesById?.[String(locId)];
    const regionId = loc?.id_region ?? loc?.regiones?.id ?? null;
    const subidaRule = findBestRouteRule(routeRules, locId, regionId, "evento_subida");
    const bajadaRule = findBestRouteRule(routeRules, locId, regionId, "evento_bajada");
    const travel = buildTravelScheduleFromRules(subidaRule, bajadaRule, transportMap);
    if (travel) {
      schedules[locId] = travel;
      schedules[String(locId)] = travel;
    }
  });

  return schedules;
}

function buildLocalitySchedulesFromPeers(summary, rosterById) {
  const byLoc = {};

  (summary || []).forEach((person) => {
    const persona = rosterById?.[person.id] || person;
    const loc = resolveLocalidadEfectivaViaticos(persona);
    const locId = loc.id;
    if (locId == null) return;

    const peerLogistics = extractLogisticsForLocalidadBoarding(person, locId, loc.nombre);
    if (!peerLogistics) return;

    if (!byLoc[locId]) byLoc[locId] = [];
    byLoc[locId].push(peerLogistics);
  });

  const schedules = {};
  Object.entries(byLoc).forEach(([locId, entries]) => {
    const merged = mergeLogisticsEntries(entries);
    if (merged) {
      schedules[locId] = merged;
      schedules[String(locId)] = merged;
    }
  });

  return schedules;
}

function getLocalityScheduleForPerson(person, routeSchedules, peerSchedules) {
  const loc = resolveLocalidadEfectivaViaticos(person);
  const id = loc.id;
  if (id == null) return null;
  return (
    routeSchedules[id] ||
    routeSchedules[String(id)] ||
    peerSchedules[id] ||
    peerSchedules[String(id)] ||
    null
  );
}

/**
 * Combina horarios: asignación en transporte (personal) gana; localidad/grupo completa huecos.
 */
export function mergeTravelPreferringPersonal(personalTravel, localityTravel) {
  const personal = personalTravel || {};
  const locality = localityTravel || {};
  return {
    ...locality,
    ...personal,
    fecha_salida: personal.fecha_salida || locality.fecha_salida,
    hora_salida: personal.hora_salida || locality.hora_salida,
    fecha_llegada: personal.fecha_llegada || locality.fecha_llegada,
    hora_llegada: personal.hora_llegada || locality.hora_llegada,
    transporte_salida: personal.transporte_salida || locality.transporte_salida,
    transporte_llegada: personal.transporte_llegada || locality.transporte_llegada,
    lugar_salida: personal.lugar_salida || locality.lugar_salida,
    lugar_llegada: personal.lugar_llegada || locality.lugar_llegada,
    patente: personal.patente || locality.patente,
  };
}

/** @deprecated alias — usar mergeTravelPreferringPersonal */
export function applyLocalidadViaticosScheduleToLogistics(personalTravel, localityTravel) {
  return mergeTravelPreferringPersonal(personalTravel, localityTravel);
}

/**
 * Combina logística personal y de localidad para viáticos/destaques.
 * Subida/bajada individual en transporte prevalece; horario grupal de localidad solo rellena vacíos.
 */
export function mergeTravelDataForViaticosPapeles(
  personalTravel,
  localityTravel,
  _person,
) {
  return mergeTravelPreferringPersonal(personalTravel, localityTravel);
}

export function headerInfoToTravelSchedule(headerInfo) {
  if (!headerInfo) return null;
  const parseVisualDateToIso = (visual) => {
    if (!visual) return null;
    const [d, m, y] = String(visual).split("-");
    if (!d || !m || !y) return null;
    return `${y}-${m}-${d}`;
  };

  return {
    fecha_salida:
      headerInfo.fecha_iso ||
      (headerInfo.fecha ? parseVisualDateToIso(headerInfo.fecha) : null),
    hora_salida: sliceTime(headerInfo.hora),
    fecha_llegada:
      headerInfo.fecha_llegada_iso ||
      (headerInfo.fecha_llegada
        ? parseVisualDateToIso(headerInfo.fecha_llegada)
        : null),
    hora_llegada: sliceTime(headerInfo.hora_llegada),
    transporte_salida: headerInfo.transporte || null,
    transporte_llegada: headerInfo.transporte || null,
  };
}

/**
 * Mapa id_integrante → horarios para viáticos.
 * Prioridad: transporte (subida/bajada por persona) → reglas de ruta / pares de la localidad de viáticos.
 */
export function buildViaticosLogisticsMap({
  summary,
  roster,
  routeRules,
  transportes,
}) {
  const personalMap = buildPersonalLogisticsFromSummary(summary);
  const transportMap = {};
  (transportes || []).forEach((t) => {
    transportMap[t.id] = t;
  });

  const localitiesById = {};
  (roster || []).forEach((person) => {
    const loc = resolveLocalidadEfectivaViaticos(person);
    if (loc.id != null) {
      localitiesById[loc.id] = loc.objeto || { id: loc.id, localidad: loc.nombre };
    }
    const residencia = person._loc_residencia || person.residencia;
    if (residencia?.id != null) {
      localitiesById[residencia.id] = residencia;
    }
    const viaticos = person._loc_viaticos || person.viaticos;
    if (viaticos?.id != null) {
      localitiesById[viaticos.id] = viaticos;
    }
  });

  const routeSchedules = buildLocalitySchedulesFromRouteRules(
    routeRules,
    transportMap,
    localitiesById,
  );
  const rosterById = {};
  (roster || []).forEach((person) => {
    rosterById[person.id] = person;
  });
  const peerSchedules = buildLocalitySchedulesFromPeers(summary, rosterById);

  const result = { ...personalMap };
  (summary || []).forEach((person) => {
    const persona = rosterById[person.id] || person;
    if (!hasLocalidadViaticosAsignada(persona)) return;

    const localitySchedule = getLocalityScheduleForPerson(
      persona,
      routeSchedules,
      peerSchedules,
    );
    if (!localitySchedule) return;

    const personal = personalMap[person.id] || personalMap[String(person.id)] || {};
    const merged = mergeTravelPreferringPersonal(personal, localitySchedule);
    result[person.id] = merged;
    result[String(person.id)] = merged;
  });

  return result;
}

/**
 * Datos logísticos para UI y exportación de una fila de viático.
 * En tramos conserva fechas del tramo y resuelve patente/transporte del bus
 * correspondiente (vía parada de inicio), con fallback al mapa global del integrante.
 */
export function resolveViaticoRowLogData(row, logisticsMap, options = {}) {
  const integranteKey = String(row?.id_integrante ?? "");
  const base =
    logisticsMap?.[integranteKey] ||
    logisticsMap?.[row?.id_integrante] ||
    {};

  const isTramo =
    row?.id_evento_parada_inicio != null && row?.id_evento_parada_fin != null;

  if (!isTramo) {
    return { ...base };
  }

  const { allEvents, logisticsTransportsByPerson } = options;
  const events = Array.isArray(allEvents) ? allEvents : [];
  const findEvt = (id) =>
    id != null ? events.find((e) => String(e.id) === String(id)) : null;

  const startEvt = findEvt(row.id_evento_parada_inicio);
  const endEvt = findEvt(row.id_evento_parada_fin);

  let patente = String(base.patente || "").trim();
  let transporte_salida = base.transporte_salida ?? null;
  let transporte_llegada = base.transporte_llegada ?? null;
  let lugar_salida = base.lugar_salida ?? null;
  let lugar_llegada = base.lugar_llegada ?? null;

  if (startEvt) {
    transporte_salida =
      startEvt.locaciones?.nombre || startEvt.descripcion || transporte_salida;
    lugar_salida =
      startEvt.locaciones?.localidades?.localidad ||
      startEvt.nombre_localidad ||
      lugar_salida;

    const transportId = startEvt.id_gira_transporte;
    if (transportId && logisticsTransportsByPerson) {
      const transports = logisticsTransportsByPerson[integranteKey] || [];
      const match = transports.find((t) => String(t.id) === String(transportId));
      if (match?.patente) {
        patente = String(match.patente).trim();
      }
    }
  }

  if (endEvt) {
    transporte_llegada =
      endEvt.locaciones?.nombre || endEvt.descripcion || transporte_llegada;
    lugar_llegada =
      endEvt.locaciones?.localidades?.localidad ||
      endEvt.nombre_localidad ||
      lugar_llegada;
  }

  return {
    ...base,
    fecha_salida: row.fecha_salida ?? base.fecha_salida ?? null,
    hora_salida: row.hora_salida ?? base.hora_salida ?? null,
    fecha_llegada: row.fecha_llegada ?? base.fecha_llegada ?? null,
    hora_llegada: row.hora_llegada ?? base.hora_llegada ?? null,
    patente: patente || base.patente || "",
    transporte_salida,
    transporte_llegada,
    lugar_salida,
    lugar_llegada,
  };
}
