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

if (process.exitCode) {
  console.error("verify-fimba-agenda-tutti-filter FAILED");
  process.exit(1);
}
console.log("verify-fimba-agenda-tutti-filter OK");
