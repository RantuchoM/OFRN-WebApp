/**
 * Filtro agenda FIMBA: Tutti opt-in + artista no vuelca orquesta.
 * Standalone (imports Vite sin extensión). Mirror de fimbaAgendaUrlParams.js.
 *
 * Run: node scripts/verify-fimba-agenda-tutti-filter.mjs
 */

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

const FIMBA_AGENDA_TUTTI_VALUE = "tutti";

function isFimbaAgendaTuttiValue(v) {
  return (
    String(v ?? "")
      .trim()
      .toLocaleLowerCase("es") === FIMBA_AGENDA_TUTTI_VALUE
  );
}

function parseCommaSeparatedIds(raw) {
  if (raw == null || raw === "") return [];
  return [
    ...new Set(
      String(raw)
        .split(",")
        .map((s) => Number(String(s).trim()))
        .filter(Number.isFinite),
    ),
  ];
}

function parseFimbaAgendaTuttiFlag(searchParams) {
  const raw = String(searchParams.get("tutti") || "")
    .trim()
    .toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes" || raw === "tutti") {
    return true;
  }
  const gruposCsv = String(searchParams.get("grupos") || "");
  if (gruposCsv.split(",").some((tok) => isFimbaAgendaTuttiValue(tok))) {
    return true;
  }
  const alias = searchParams.get("grupo") || searchParams.get("ofrn");
  return isFimbaAgendaTuttiValue(alias);
}

function parseFimbaAgendaUrlSearchParams(searchParams) {
  const propuestaIds = parseCommaSeparatedIds(
    searchParams.get("propuestas") || searchParams.get("artistas"),
  );
  const grupoIds = parseCommaSeparatedIds(searchParams.get("grupos"));
  return {
    propuestaIds,
    grupoIds,
    includeTutti: parseFimbaAgendaTuttiFlag(searchParams),
  };
}

function hasOfrnConvocatoriaFilter(grupoIds, includeTutti = false) {
  return (
    Boolean(includeTutti) ||
    (grupoIds || []).some((id) => Number.isFinite(Number(id)))
  );
}

function hasAgendaEntityFilter(propuestaIds, grupoIds, includeTutti = false) {
  return (
    (propuestaIds || []).some((id) => Number.isFinite(Number(id))) ||
    hasOfrnConvocatoriaFilter(grupoIds, includeTutti)
  );
}

function eventMatchesTuttiAudiencia(ev) {
  if (!ev) return false;
  const ao = ev.audiencia_ofrn;
  if (ao === "none" || ao === "grupos") return false;
  if (ao === "tutti") return true;
  if (ao == null || ao === "") {
    if ((ev.grupos || []).length > 0) return false;
    return Boolean(ev.es_ofrn);
  }
  return false;
}

function eventMatchesPropuestaRouteFilter(ev, propuestaIds) {
  const props = (propuestaIds || []).map(Number).filter(Number.isFinite);
  if (props.length === 0 || !ev?.id) return false;
  return (ev.propuestas || []).some((p) => props.includes(Number(p.id)));
}

function eventMatchesAgendaEntityFilter(ev, propuestaIds, grupoIds, ctx = {}) {
  const props = (propuestaIds || []).map(Number).filter(Number.isFinite);
  const grupos = (grupoIds || []).map(Number).filter(Number.isFinite);
  const includeTutti = Boolean(ctx.includeTutti);
  const wantsOfrn = includeTutti || grupos.length > 0;
  if (props.length === 0 && !wantsOfrn) return true;
  if (!ev) return false;

  const matchProp =
    props.length > 0 ? eventMatchesPropuestaRouteFilter(ev, props) : false;

  let matchOfrn = false;
  if (includeTutti && eventMatchesTuttiAudiencia(ev)) matchOfrn = true;
  if (
    grupos.length > 0 &&
    (ev.grupos || []).some((g) => grupos.includes(Number(g.id)))
  ) {
    matchOfrn = true;
  }

  if (props.length > 0 && wantsOfrn) return matchProp || matchOfrn;
  if (props.length > 0) return matchProp;
  return Boolean(ev.es_fimba) || matchOfrn;
}

function buildFimbaAgendaSharePath(basePath, filters = {}) {
  const params = new URLSearchParams();
  const props = [
    ...new Set((filters.propuestaIds || []).map(Number).filter(Number.isFinite)),
  ];
  if (props.length > 0) params.set("propuestas", props.join(","));
  const grupos = [
    ...new Set((filters.grupoIds || []).map(Number).filter(Number.isFinite)),
  ];
  if (grupos.length > 0) params.set("grupos", grupos.join(","));
  if (filters.includeTutti) params.set("tutti", "1");
  if (hasOfrnConvocatoriaFilter(grupos, filters.includeTutti)) {
    params.set("origen", "all");
  } else if (filters.origen === "ofrn" || filters.origen === "all") {
    params.set("origen", filters.origen);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

const fimbaTagged = {
  id: 1,
  es_fimba: true,
  es_ofrn: false,
  audiencia_ofrn: "none",
  propuestas: [{ id: 5, nombre: "Alba" }],
  grupos: [],
};
const tuttiOfrn = {
  id: 2,
  es_fimba: false,
  es_ofrn: true,
  audiencia_ofrn: "tutti",
  propuestas: [],
  grupos: [],
};
const grupoOfrn = {
  id: 3,
  es_fimba: false,
  es_ofrn: true,
  audiencia_ofrn: "grupos",
  propuestas: [],
  grupos: [{ id: 3, nombre: "Alba" }],
};
const dualTutti = {
  id: 4,
  es_fimba: true,
  es_ofrn: true,
  audiencia_ofrn: "tutti",
  propuestas: [{ id: 5, nombre: "Alba" }],
  grupos: [],
};

assert(isFimbaAgendaTuttiValue("Tutti"), "sentinel Tutti case-insensitive");
assert(isFimbaAgendaTuttiValue(FIMBA_AGENDA_TUTTI_VALUE), "sentinel canonical");
assert(!isFimbaAgendaTuttiValue(3), "id numérico no es Tutti");

assert(eventMatchesTuttiAudiencia(tuttiOfrn), "tutti OFRN match");
assert(eventMatchesTuttiAudiencia(dualTutti), "dual tagged + tutti match");
assert(!eventMatchesTuttiAudiencia(grupoOfrn), "grupo puntual no es Tutti");
assert(!eventMatchesTuttiAudiencia(fimbaTagged), "FIMBA none no es Tutti");

assert(
  eventMatchesAgendaEntityFilter(fimbaTagged, [5], [], {}),
  "artista: evento tagged FIMBA",
);
assert(
  !eventMatchesAgendaEntityFilter(tuttiOfrn, [5], [], {}),
  "artista solo: no incluye Tutti orquesta",
);
assert(
  !eventMatchesAgendaEntityFilter(grupoOfrn, [5], [], {}),
  "artista solo: no incluye grupo OFRN ajeno",
);
assert(
  eventMatchesAgendaEntityFilter(tuttiOfrn, [5], [], { includeTutti: true }),
  "artista + Tutti: unión incluye orquesta Tutti",
);
assert(
  eventMatchesAgendaEntityFilter(fimbaTagged, [5], [], { includeTutti: true }),
  "artista + Tutti: FIMBA del artista sigue visible",
);
assert(
  eventMatchesAgendaEntityFilter(fimbaTagged, [], [], { includeTutti: true }),
  "solo Tutti: agenda FIMBA permanece (include)",
);
assert(
  eventMatchesAgendaEntityFilter(tuttiOfrn, [], [], { includeTutti: true }),
  "solo Tutti: incluye convocatoria Tutti",
);
assert(
  !eventMatchesAgendaEntityFilter(grupoOfrn, [], [], { includeTutti: true }),
  "solo Tutti: no incluye grupo puntual",
);
assert(
  eventMatchesAgendaEntityFilter(grupoOfrn, [], [3], {}),
  "grupo: incluye convocatoria de ese grupo",
);
assert(
  eventMatchesAgendaEntityFilter(fimbaTagged, [], [3], {}),
  "grupo: FIMBA permanece (include, no replace)",
);

// Regresión: ride abierto + secuencia no debe marcar eventos ajenos (Agenda 171/171).
function indexOfEvent(sorted, eventId) {
  if (eventId == null || eventId === "") return -1;
  return (sorted || []).findIndex((e) => String(e.id) === String(eventId));
}
function isPresentAtStop(upIdx, downIdx, currentIdx) {
  if (!Number.isFinite(upIdx) || upIdx < 0 || !Number.isFinite(currentIdx) || currentIdx < 0) {
    return false;
  }
  if (upIdx > currentIdx) return false;
  if (downIdx == null || downIdx < 0 || !Number.isFinite(downIdx)) return true;
  return downIdx >= currentIdx;
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
  return false;
}
function eventMatchesPropuestaRouteFilterFull(
  ev,
  propuestaIds,
  propuestaRoutes,
  sequencesByVehicle,
) {
  const props = (propuestaIds || []).map(Number).filter(Number.isFinite);
  if (props.length === 0 || !ev?.id) return false;
  if ((ev.propuestas || []).some((p) => props.includes(Number(p.id)))) return true;
  if (!propuestaRoutes?.length) return false;
  const want = new Set(props);
  for (const r of propuestaRoutes) {
    const pid = Number(r?.id_propuesta ?? r?.propuesta?.id);
    if (!want.has(pid)) continue;
    if (Math.max(0, Number(r.plazas) || 0) <= 0) continue;
    if (r.id_evento_subida == null || r.id_evento_subida === "") continue;
    if (String(r.id_evento_subida) === String(ev.id)) return true;
    if (
      r.id_evento_bajada != null &&
      r.id_evento_bajada !== "" &&
      String(r.id_evento_bajada) === String(ev.id)
    ) {
      return true;
    }
    const tid = Number(r.id_gira_transporte);
    if (!Number.isFinite(tid) || !sequencesByVehicle) continue;
    const sorted = sequencesByVehicle.get(tid)?.sortedEvents || [];
    if (
      sorted.length &&
      sorted.some((e) => String(e?.id) === String(ev.id)) &&
      isFimbaRideAboardAtStop(r, ev.id, sorted)
    ) {
      return true;
    }
  }
  return false;
}

const openRoute = {
  id_propuesta: 7,
  plazas: 4,
  id_gira_transporte: 10,
  id_evento_subida: 100,
  id_evento_bajada: null,
};
const seqMap = new Map([
  [10, { sortedEvents: [{ id: 100 }, { id: 101 }, { id: 102 }] }],
]);
const stopMid = { id: 101, propuestas: [] };
const foreignConcert = {
  id: 9001,
  es_fimba: true,
  propuestas: [{ id: 99, nombre: "Cecilia Eguiarte" }],
};
assert(
  eventMatchesPropuestaRouteFilterFull(stopMid, [7], [openRoute], seqMap),
  "artista: parada intermedia a bordo (ride abierto)",
);
assert(
  !eventMatchesPropuestaRouteFilterFull(
    foreignConcert,
    [7],
    [openRoute],
    seqMap,
  ),
  "artista: ride abierto NO incluye concierto ajeno (regresión 171/171)",
);
assert(
  eventMatchesAgendaEntityFilter(
    { id: 100, propuestas: [{ id: 7 }] },
    [7],
    [],
    {},
  ),
  "artista: tag directa sigue matcheando",
);
assert(
  eventMatchesAgendaEntityFilter(fimbaTagged, [5], [3], {}),
  "artista + grupo: OR — tagged artista",
);
assert(
  eventMatchesAgendaEntityFilter(grupoOfrn, [5], [3], {}),
  "artista + grupo: OR — grupo OFRN",
);

assert(!hasOfrnConvocatoriaFilter([], false), "sin opt-in OFRN");
assert(hasOfrnConvocatoriaFilter([], true), "Tutti es opt-in OFRN");
assert(hasOfrnConvocatoriaFilter([3], false), "grupo es opt-in OFRN");
assert(
  hasAgendaEntityFilter([5], [], false),
  "artista cuenta como filtro de entidad",
);
assert(
  !hasOfrnConvocatoriaFilter([], false) &&
    hasAgendaEntityFilter([5], [], false),
  "artista solo no es opt-in OFRN",
);

const parsed = parseFimbaAgendaUrlSearchParams(
  new URLSearchParams("propuestas=5&tutti=1&grupos=3"),
);
assert(parsed.propuestaIds.includes(5), "parse propuestas");
assert(parsed.grupoIds.includes(3), "parse grupos");
assert(parsed.includeTutti === true, "parse tutti=1");

const parsedAlias = parseFimbaAgendaUrlSearchParams(
  new URLSearchParams("grupo=tutti"),
);
assert(parsedAlias.includeTutti === true, "parse grupo=tutti");
assert(parsedAlias.grupoIds.length === 0, "tutti no se mete como id de grupo");

const parsedCsv = parseFimbaAgendaUrlSearchParams(
  new URLSearchParams("grupos=3,tutti"),
);
assert(parsedCsv.includeTutti === true, "parse grupos=3,tutti");
assert(parsedCsv.grupoIds.includes(3), "csv conserva id numérico");

const artistOnlyPath = buildFimbaAgendaSharePath("/fimba/edicion/1/agenda", {
  propuestaIds: [5],
  origen: "fimba",
});
assert(
  !artistOnlyPath.includes("origen=all"),
  "artista solo no fuerza origen=all",
);
assert(artistOnlyPath.includes("propuestas=5"), "artista solo escribe propuestas");

const tuttiPath = buildFimbaAgendaSharePath("/fimba/edicion/1/agenda", {
  includeTutti: true,
  grupoIds: [3],
});
assert(tuttiPath.includes("tutti=1"), "share path incluye tutti=1");
assert(tuttiPath.includes("grupos=3"), "share path incluye grupos");
assert(tuttiPath.includes("origen=all"), "Tutti/grupo fuerza origen=all");

const defaultPath = buildFimbaAgendaSharePath("/fimba/edicion/1/agenda", {
  origen: "fimba",
});
assert(
  defaultPath === "/fimba/edicion/1/agenda",
  "default FIMBA omite query (sin origen)",
);

function normalizeAgendaFilterIds(value) {
  if (value == null || value === "") return [];
  const list = Array.isArray(value) ? value : String(value).split(",");
  return [
    ...new Set(list.map((n) => Number(n)).filter(Number.isFinite)),
  ].sort((a, b) => a - b);
}

function retainSelectedFilterIds(selectedIds, catalogIds) {
  const selected = Array.isArray(selectedIds) ? selectedIds : [];
  if (selected.length === 0) return selected;
  const catalog = (catalogIds || []).map(Number).filter(Number.isFinite);
  if (catalog.length === 0) return selected;
  const valid = new Set(catalog);
  return selected.filter((id) => valid.has(Number(id)));
}

function canonicalizeAgendaConsultaFilters(filters = {}) {
  const propuestaIds = normalizeAgendaFilterIds(filters.propuestaIds);
  const grupoIds = normalizeAgendaFilterIds(filters.grupoIds);
  const locacionIds = normalizeAgendaFilterIds(filters.locacionIds);
  const includeTutti = Boolean(filters.includeTutti);
  const origen = hasOfrnConvocatoriaFilter(grupoIds, includeTutti)
    ? "all"
    : filters.origen === "ofrn" || filters.origen === "all"
      ? filters.origen
      : "fimba";
  return { propuestaIds, grupoIds, locacionIds, includeTutti, origen };
}

function buildFimbaAgendaConsultaSharePath(shareToken) {
  const t = String(shareToken || "").trim();
  return t ? `/fimba/c/${t}/agenda` : null;
}

assert(
  retainSelectedFilterIds([5, 7], []).join(",") === "5,7",
  "catálogo vacío no borra propuestas de la URL",
);
assert(
  retainSelectedFilterIds([5, 7, 99], [5, 7]).join(",") === "5,7",
  "catálogo listo recorta ids inválidos",
);

const canon = canonicalizeAgendaConsultaFilters({
  propuestaIds: [7, 5, 5],
  grupoIds: [3],
  origen: "fimba",
});
assert(canon.propuestaIds.join(",") === "5,7", "fingerprint ordena propuestas");
assert(canon.origen === "all", "grupo fuerza origen=all en fingerprint");
assert(
  buildFimbaAgendaConsultaSharePath("abc-token") === "/fimba/c/abc-token/agenda",
  "share único no lleva query",
);

const legacyShare = buildFimbaAgendaSharePath("/fimba/c/ed-token/agenda", {
  propuestaIds: [5, 7],
  grupoIds: [3],
});
assert(
  legacyShare.includes("propuestas=5") && legacyShare.includes("grupos=3"),
  "legacy edición+query sigue parseable",
);

if (process.exitCode) {
  console.error("verify-fimba-agenda-tutti-filter FAILED");
  process.exit(1);
}
console.log("verify-fimba-agenda-tutti-filter OK");
