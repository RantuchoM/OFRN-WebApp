import {
  filterEnsamblesForConvocatoriaView,
  isCamerataEnsambleRow,
  isEnsamblePruebaLabel,
  isJazzBandEnsambleLabel,
  isRegionalConvocatoriaEnsamble,
} from "./convocatoriaEnsambleViews";
import { membershipActiveOnProgramDate } from "./ensembleMembership";
import { programOverlapsDateRange } from "./giraDateRange";
import { isProgramBorrador } from "./girasYearSummary";
import { integranteKey } from "./integranteIds";
import {
  ID_TIPO_CONCIERTO,
  ID_TIPO_ENSAYO_ENSAMBLE,
  ID_TIPO_ENSAYO_GENERAL,
  ID_TIPO_ENSAYO_GIRA,
  classifyServicioEvent,
  eventAssociatedProgramaIds,
  eventInReportDateWindow,
  formatProgramNomencladorNombre,
  isPastGira,
} from "./serviciosCantidad";

/** Gira FIMBA: actividades en paralelo por grupo. El paréntesis es un promedio. */
export const FIMBA_PROGRAM_ID = 12;

/** Familias que el staff puede asignar en Ensambles (`ensambles.id_familia`). */
export const ENSAMBLE_FAMILIA_OPTIONS = [
  "Cuerdas",
  "Maderas",
  "Bronces",
  "Percusión",
];

/** Giras del bloque 1: no duplicar programas tipo Ensamble (van al bloque 2). */
export const TIPOS_GIRA_INFORME_ENSAMBLE = [
  "Sinfónico",
  "Camerata Filarmónica",
];

export function listEnsamblesForServiciosReport(ensambles) {
  const usable = filterEnsamblesForConvocatoriaView(ensambles, "ensambles");
  const seen = new Set();
  const out = [];
  for (const en of usable) {
    const id = Number(en?.id);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    if (isEnsamblePruebaLabel(en?.ensamble)) continue;
    if (isCamerataEnsambleRow(en)) continue;
    seen.add(id);
    out.push(en);
  }
  return out.sort((a, b) =>
    String(a.ensamble || "").localeCompare(String(b.ensamble || ""), "es"),
  );
}

export function eventLinksEnsamble(evt, ensambleId) {
  const eid = Number(ensambleId);
  return (evt?.eventos_ensambles || []).some(
    (row) => Number(row.id_ensamble) === eid,
  );
}

function fuentesOf(program) {
  return Array.isArray(program?.giras_fuentes) ? program.giras_fuentes : [];
}

/** Columna real `ensambles.id_familia` (FK a `familia.familia`). Vacío = no hereda. */
export function storedEnsambleFamilia(ensamble) {
  const f = String(ensamble?.id_familia ?? "").trim();
  return f || null;
}

function normalizeCfId(value) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * CFs vinculadas (`ensambles_cf`). Acepta `id_ensamble_cf_ids`, filas anidadas
 * o el FK legado `id_ensamble_cf` si todavía viniera en memoria.
 */
export function storedEnsambleCfIds(ensamble) {
  const ids = [];
  const push = (value) => {
    const id = normalizeCfId(value);
    if (id) ids.push(id);
  };
  if (Array.isArray(ensamble?.id_ensamble_cf_ids)) {
    ensamble.id_ensamble_cf_ids.forEach(push);
  }
  if (Array.isArray(ensamble?.ensambles_cf)) {
    ensamble.ensambles_cf.forEach((row) => push(row?.id_ensamble_cf));
  }
  push(ensamble?.id_ensamble_cf);
  return [...new Set(ids)];
}

export function attachEnsambleCfIds(ensambles, links) {
  const byChild = new Map();
  for (const row of links || []) {
    const child = normalizeCfId(row?.id_ensamble);
    const cf = normalizeCfId(row?.id_ensamble_cf);
    if (!child || !cf || child === cf) continue;
    if (!byChild.has(child)) byChild.set(child, []);
    byChild.get(child).push(cf);
  }
  return (ensambles || []).map((en) => {
    const fromLinks = byChild.get(Number(en?.id)) || [];
    const merged = [...new Set([...fromLinks, ...storedEnsambleCfIds(en)])];
    return { ...en, id_ensamble_cf_ids: merged };
  });
}

export function listCamerataCfOptions(ensambles, excludeId) {
  const skip = Number(excludeId);
  return (ensambles || [])
    .filter((e) => {
      if (!isCamerataEnsambleRow(e)) return false;
      return Number(e.id) !== skip;
    })
    .map((e) => ({ id: Number(e.id), label: e.ensamble }))
    .sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""), "es"));
}

export function programExcludesEnsamble(program, ensambleId) {
  const eid = Number(ensambleId);
  return fuentesOf(program).some(
    (f) => f?.tipo === "EXCL_ENSAMBLE" && Number(f.valor_id) === eid,
  );
}

export function programIncludesEnsambleDirect(program, ensambleId) {
  const eid = Number(ensambleId);
  return fuentesOf(program).some(
    (f) => f?.tipo === "ENSAMBLE" && Number(f.valor_id) === eid,
  );
}

export function programFamiliasConvocadas(program) {
  return fuentesOf(program)
    .filter((f) => f?.tipo === "FAMILIA" && f?.valor_texto)
    .map((f) => String(f.valor_texto).trim())
    .filter(Boolean);
}

/**
 * Convoca al ensamble si:
 * 1) `EXCL_ENSAMBLE` de ese id → excluido (`resolveGiraRosterDetail` F).
 * 2) `ENSAMBLE` de ese id → directo.
 * 3) `ensambles.id_familia` lleno y hay `FAMILIA` igual.
 * 4) Alguna fila de `ensambles_cf` tiene `ENSAMBLE` de esa CF (y esa CF no está excluida).
 * Sin familia/CF cargados: solo 1–2. No se inventa mapa de miembros.
 */
export function classifyProgramaEnsambleConvocatoria(program, ensamble) {
  const ensambleId = Number(ensamble?.id);
  if (!program?.id || !Number.isFinite(ensambleId)) {
    return { status: "no", via: null, familias: [], cfIds: [] };
  }
  if (programExcludesEnsamble(program, ensambleId)) {
    return { status: "excluido", via: "EXCL_ENSAMBLE", familias: [], cfIds: [] };
  }
  if (programIncludesEnsambleDirect(program, ensambleId)) {
    return { status: "convocado", via: "ENSAMBLE", familias: [], cfIds: [] };
  }
  const familia = storedEnsambleFamilia(ensamble);
  if (familia) {
    const hits = programFamiliasConvocadas(program).filter((f) => f === familia);
    if (hits.length) {
      return { status: "convocado", via: "FAMILIA", familias: hits, cfIds: [] };
    }
  }
  const cfHits = storedEnsambleCfIds(ensamble).filter(
    (cfId) =>
      !programExcludesEnsamble(program, cfId) &&
      programIncludesEnsambleDirect(program, cfId),
  );
  if (cfHits.length) {
    return { status: "convocado", via: "CF", familias: [], cfIds: cfHits };
  }
  return { status: "no", via: null, familias: [], cfIds: [] };
}

export function ensambleOwnProgramTipos(ensamble) {
  const name = ensamble?.ensamble || "";
  if (isJazzBandEnsambleLabel(name)) return ["Jazz Band", "Ensamble"];
  return ["Ensamble"];
}

function sortPrograms(rows) {
  return [...rows].sort((a, b) => {
    const fa = String(a.program?.fecha_desde || "");
    const fb = String(b.program?.fecha_desde || "");
    if (fa !== fb) return fa.localeCompare(fb);
    return String(a.label || "").localeCompare(String(b.label || ""), "es");
  });
}

function sortEvents(rows) {
  return [...rows].sort((a, b) => {
    const fa = String(a.fecha || "");
    const fb = String(b.fecha || "");
    if (fa !== fb) return fa.localeCompare(fb);
    return String(a.hora_inicio || "").localeCompare(String(b.hora_inicio || ""));
  });
}

/** IDs de sede de la gira (`giras_localidades`). */
export function programLocalidadIds(program) {
  const ids = [];
  for (const row of program?.giras_localidades || []) {
    const id = Number(row?.id_localidad ?? row?.localidades?.id);
    if (Number.isFinite(id) && id > 0) ids.push(id);
  }
  return [...new Set(ids)];
}

export function programLocalidadLabels(program) {
  const names = [];
  for (const row of program?.giras_localidades || []) {
    const name = String(row?.localidades?.localidad || "").trim();
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

/**
 * Fuera de casa: la sede de la gira no incluye la localidad del ensamble
 * (`ensambles.id_localidad`). Si la gira visita esa localidad, está en casa.
 * Sin localidad en el ensamble o sin sedes en la gira, no se marca.
 * Con un solo tramo, varias localidades del mismo tramo siguen esta regla.
 */
export function isGiraFueraDeCasa(program, ensamble) {
  const home = Number(ensamble?.id_localidad ?? ensamble?.localidades?.id);
  if (!Number.isFinite(home) || home <= 0) return false;
  const locs = programLocalidadIds(program);
  if (!locs.length) return false;
  return !locs.includes(home);
}

function segmentLocalidadIds(segment) {
  const ids = [];
  for (const row of segment?.giras_tramo_localidades || []) {
    const id = Number(row?.id_localidad ?? row?.localidades?.id);
    if (Number.isFinite(id) && id > 0) ids.push(id);
  }
  return [...new Set(ids)];
}

function gcdInt(a, b) {
  let x = Math.abs(Number(a) || 0);
  let y = Math.abs(Number(b) || 0);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/** "2/3 fuera de casa" cuando el peso no es 0 ni 1. */
export function formatTramoShareLabel(parte, total) {
  const p = Number(parte) || 0;
  const n = Number(total) || 0;
  if (p <= 0 || n <= 1 || p >= n) return "";
  const g = gcdInt(p, n);
  return `${p / g}/${n / g} fuera de casa`;
}

/**
 * Peso en casa / fuera de casa.
 * Un tramo (o sedes sueltas en `giras_localidades`): la gira entera es 1 o 0.
 * Dos o más tramos con localidad: cada tramo vale 1/n. El tramo está en casa
 * si alguna de sus localidades es la del ensamble.
 */
export function giraTramoPesos(program, ensamble) {
  const home = Number(ensamble?.id_localidad ?? ensamble?.localidades?.id);
  const withLocs = [...(program?.giras_tramo_segmentos || [])]
    .sort((a, b) => Number(a?.indice) - Number(b?.indice))
    .map((seg) => segmentLocalidadIds(seg))
    .filter((ids) => ids.length > 0);

  const whole = (fuera) =>
    fuera
      ? { tramoCount: 1, tramosFuera: 1, pesoEnCasa: 0, pesoFuera: 1 }
      : { tramoCount: 1, tramosFuera: 0, pesoEnCasa: 1, pesoFuera: 0 };

  if (withLocs.length < 2 || !Number.isFinite(home) || home <= 0) {
    return whole(isGiraFueraDeCasa(program, ensamble));
  }

  const tramoCount = withLocs.length;
  const tramosFuera = withLocs.filter((ids) => !ids.includes(home)).length;
  return {
    tramoCount,
    tramosFuera,
    pesoEnCasa: (tramoCount - tramosFuera) / tramoCount,
    pesoFuera: tramosFuera / tramoCount,
  };
}

function rosterMarkOf(rosterEntry, iid) {
  if (!iid || !rosterEntry) return null;
  if (rosterEntry.reemplazo?.has(iid)) return "reemplazo";
  if (rosterEntry.licencia?.has(iid)) return "licencia";
  if (rosterEntry.counted?.has(iid)) return "counted";
  return null;
}

function rosterMarkCounts(mark) {
  return mark === "counted" || mark === "reemplazo" || mark === "licencia";
}

/**
 * FIMBA: promedio de servicios (1 / ½ / 0) de los músicos del ensamble que
 * están en el roster de la gira. Un evento con grupos cuenta solo para los
 * integrantes de esos grupos; sin grupos, cuenta para todo el roster.
 * Sin roster cargado devuelve null (el llamador usa la suma cruda).
 */
export function averageFimbaServiciosEnsamble({
  ensamble,
  program,
  events,
  range,
  memberships,
  rosterEntry,
  grupoIdsByEventId,
  membersByGrupoId,
} = {}) {
  if (!rosterEntry || !ensamble?.id) return null;
  const ref = program?.fecha_desde;
  const attendees = [];
  for (const row of memberships || []) {
    if (Number(row?.id_ensamble) !== Number(ensamble.id)) continue;
    if (!membershipActiveOnProgramDate(row, ref)) continue;
    const iid = integranteKey(row.id_integrante);
    if (!iid) continue;
    const mark = rosterMarkOf(rosterEntry, iid);
    if (!rosterMarkCounts(mark)) continue;
    attendees.push(iid);
  }
  if (!attendees.length) return 0;

  const gruposOf = grupoIdsByEventId || new Map();
  const membersOf = membersByGrupoId || new Map();
  const pid = Number(program?.id);
  let sum = 0;
  for (const iid of attendees) {
    for (const evt of events || []) {
      if (!eventAssociatedProgramaIds(evt).includes(pid)) continue;
      if (range && !eventInReportDateWindow(evt?.fecha, range)) continue;
      const classified = classifyServicioEvent(evt);
      if (!classified?.value) continue;
      const tipo = Number(evt?.id_tipo_evento);
      if (
        tipo !== ID_TIPO_CONCIERTO &&
        tipo !== ID_TIPO_ENSAYO_GIRA &&
        tipo !== ID_TIPO_ENSAYO_GENERAL
      ) {
        continue;
      }
      const grupos = gruposOf.get(Number(evt.id)) || [];
      if (grupos.length) {
        const inGrupo = grupos.some((gid) => membersOf.get(gid)?.has(iid));
        if (!inGrupo) continue;
      }
      sum += classified.value;
    }
  }
  return sum / attendees.length;
}

/**
 * Servicios de una gira: suma de conciertos (tipo 1) y ensayos de gira
 * (tipos 2 y 3) con la misma fórmula que el informe (1 / ½ / 0).
 */
export function sumGiraServiciosComputados(programId, events, range) {
  const pid = Number(programId);
  if (!Number.isFinite(pid)) return 0;
  let total = 0;
  for (const evt of events || []) {
    const tipo = Number(evt?.id_tipo_evento);
    if (
      tipo !== ID_TIPO_CONCIERTO &&
      tipo !== ID_TIPO_ENSAYO_GIRA &&
      tipo !== ID_TIPO_ENSAYO_GENERAL
    ) {
      continue;
    }
    if (!eventAssociatedProgramaIds(evt).includes(pid)) continue;
    if (range && !eventInReportDateWindow(evt?.fecha, range)) continue;
    const classified = classifyServicioEvent(evt);
    if (!classified?.value) continue;
    total += classified.value;
  }
  return total;
}

/**
 * Fila del cuadro general. `pendingEventIds` = conflictos plenos pendientes
 * (ya partida la sesión). Las giras futuras cuentan como gira.
 * Prestaciones netas quedan fuera del cuadro por ahora.
 */
export function summarizeEnsambleServiciosReport(report, pendingEventIds) {
  const pending = new Set();
  const source =
    pendingEventIds instanceof Set ? pendingEventIds : pendingEventIds || [];
  for (const id of source) {
    const n = Number(id);
    if (Number.isFinite(n)) pending.add(n);
  }
  const blocked = (id) => pending.has(Number(id));

  const giras = report?.giras || [];
  const pesoEnCasa = (row) =>
    row?.pesoEnCasa == null ? (row?.fueraDeCasa ? 0 : 1) : Number(row.pesoEnCasa) || 0;
  const pesoFuera = (row) =>
    row?.pesoFuera == null ? (row?.fueraDeCasa ? 1 : 0) : Number(row.pesoFuera) || 0;

  let ensayosEnsamble = 0;
  for (const evt of report?.ensayos || []) {
    if (blocked(evt?.id)) continue;
    ensayosEnsamble += 1;
  }

  const programasEnsamble = report?.programasPropios?.length || 0;
  let conciertosEnsamble = report?.conciertosSueltos?.length || 0;
  for (const row of report?.programasPropios || []) {
    conciertosEnsamble += row?.conciertos?.length || 0;
  }

  const girasEnCasa = giras.reduce((acc, row) => acc + pesoEnCasa(row), 0);
  const girasFuera = giras.reduce((acc, row) => acc + pesoFuera(row), 0);

  return {
    ensambleName: report?.ensambleName || "",
    girasEnCasa,
    girasFuera,
    girasTotal: girasEnCasa + girasFuera,
    programasEnsamble,
    conciertosEnsamble,
    ensayosEnsamble,
    ensayosConflicto: pending.size,
  };
}

function toProgramRow(program, extra = {}) {
  return {
    id: program.id,
    program,
    label: formatProgramNomencladorNombre(program) || `Programa ${program.id}`,
    tipo: program.tipo || "",
    zona: String(program?.zona || "").trim(),
    fechaDesde: program.fecha_desde || "",
    fechaHasta: program.fecha_hasta || "",
    conciertos: extra.conciertos || [],
    ...extra,
  };
}

function ensureProgramBucket(map, program, extra) {
  const id = Number(program.id);
  if (!map.has(id)) map.set(id, toProgramRow(program, extra));
  return map.get(id);
}

export function buildEnsambleServiciosReport({
  ensamble,
  programas,
  events,
  conflictoGroups,
  fechaDesde,
  fechaHasta,
  ensambles,
  memberships,
  fimba,
} = {}) {
  if (!ensamble?.id || isEnsamblePruebaLabel(ensamble.ensamble)) {
    return null;
  }

  const ownTipos = new Set(ensambleOwnProgramTipos(ensamble));
  const giraTipos = new Set(TIPOS_GIRA_INFORME_ENSAMBLE);
  const cfIds = storedEnsambleCfIds(ensamble);
  const cfParents = Array.isArray(ensambles)
    ? cfIds
        .map((id) => ensambles.find((en) => Number(en.id) === id))
        .filter(Boolean)
    : [];
  const storedCfNames = cfParents.map((en) => en.ensamble).filter(Boolean);
  const regionName =
    ensamble?.localidades?.regiones?.region ||
    ensamble?.localidades?.localidad ||
    "";

  const giras = [];
  const propiosById = new Map();

  for (const program of programas || []) {
    if (!program?.id || isProgramBorrador(program)) continue;
    if (
      !programOverlapsDateRange(program, fechaDesde, fechaHasta, undefined, {
        calendarOnly: true,
      })
    ) {
      continue;
    }
    const cls = classifyProgramaEnsambleConvocatoria(program, ensamble);
    if (cls.status === "excluido") continue;
    if (cls.status !== "convocado") continue;
    const cfNames = (cls.cfIds || [])
      .map((id) =>
        (ensambles || []).find((en) => Number(en.id) === Number(id))?.ensamble,
      )
      .filter(Boolean);
    const pesos = giraTipos.has(program.tipo)
      ? giraTramoPesos(program, ensamble)
      : { tramoCount: 1, tramosFuera: 0, pesoEnCasa: 1, pesoFuera: 0 };
    const range = { fechaDesde, fechaHasta };
    let servicios = null;
    let serviciosModo = null;
    if (giraTipos.has(program.tipo) && isPastGira(program)) {
      const suma = sumGiraServiciosComputados(program.id, events, range);
      if (Number(program.id) === FIMBA_PROGRAM_ID && fimba?.roster) {
        const promedio = averageFimbaServiciosEnsamble({
          ensamble,
          program,
          events,
          range,
          memberships,
          rosterEntry: fimba.roster,
          grupoIdsByEventId: fimba.grupoIdsByEventId,
          membersByGrupoId: fimba.membersByGrupoId,
        });
        servicios = promedio == null ? suma : promedio;
        if (promedio != null) serviciosModo = "promedio";
      } else {
        servicios = suma;
      }
    }
    const row = toProgramRow(program, {
      via: cls.via,
      familias: cls.familias,
      cfIds: cls.cfIds,
      cfNames,
      conciertos: [],
      servicios,
      serviciosModo,
      ...pesos,
      fueraDeCasa: pesos.pesoFuera >= 1,
      localidadLabels: giraTipos.has(program.tipo)
        ? programLocalidadLabels(program)
        : [],
    });
    if (giraTipos.has(program.tipo)) giras.push(row);
    if (ownTipos.has(program.tipo)) {
      ensureProgramBucket(propiosById, program, {
        via: cls.via,
        familias: cls.familias,
        cfIds: cls.cfIds,
        cfNames,
        conciertos: [],
      });
    }
  }

  const conciertosSueltos = [];
  const ensayos = [];

  for (const evt of events || []) {
    if (!evt || evt.is_deleted || evt.tecnica) continue;
    const tipo = Number(evt.id_tipo_evento);
    const linked = eventLinksEnsamble(evt, ensamble.id);
    if (tipo === ID_TIPO_CONCIERTO) {
      // Conciertos de programa Ensamble (VS, Jazz Band, etc.) viven en
      // eventos.id_gira / eventos_programas_asociados. No requieren
      // eventos_ensambles (eso es de ensayos independientes tipo 13).
      const pids = eventAssociatedProgramaIds(evt);
      let nested = false;
      for (const pid of pids) {
        const program = (programas || []).find((p) => Number(p.id) === pid);
        if (!program || isProgramBorrador(program)) continue;
        if (!ownTipos.has(program.tipo)) continue;
        const already = propiosById.has(Number(program.id));
        if (!already && !linked) continue;
        const bucket = ensureProgramBucket(propiosById, program, {
          via: already ? undefined : "evento",
          conciertos: [],
        });
        bucket.conciertos.push(evt);
        nested = true;
        break;
      }
      if (!nested && linked) conciertosSueltos.push(evt);
    } else if (tipo === ID_TIPO_ENSAYO_ENSAMBLE) {
      if (linked) ensayos.push(evt);
    }
  }

  const conflictoGroup = (conflictoGroups || []).find(
    (g) => Number(g.ensambleId) === Number(ensamble.id),
  );
  const conflictoByEventId = new Map(
    (conflictoGroup?.ensayos || []).map((row) => [row.eventId, row]),
  );
  const ensayosConflicto = sortEvents(ensayos)
    .map((evt) => ({
      event: evt,
      conflicto: conflictoByEventId.get(evt.id) || null,
    }))
    .filter(
      (row) =>
        row.conflicto &&
        (row.conflicto.conflictKind || "full") === "full",
    );
  for (const row of conflictoGroup?.ensayos || []) {
    if ((row.conflictKind || "full") !== "full") continue;
    if (ensayosConflicto.some((x) => Number(x.event?.id) === Number(row.eventId))) {
      continue;
    }
    ensayosConflicto.push({
      event: {
        id: row.eventId,
        fecha: row.fecha,
        hora_inicio: row.horaInicio,
        hora_fin: row.horaFin,
        descripcion: row.descripcion,
        tipos_evento: { nombre: row.tipoNombre },
      },
      conflicto: row,
    });
  }

  const pendingFullIds = new Set(
    ensayosConflicto
      .filter((row) => !row.conflicto?.resolvedKind)
      .map((row) => Number(row.event?.id))
      .filter(Number.isFinite),
  );
  const ensayosNeto = ensayos.filter(
    (evt) => !pendingFullIds.has(Number(evt.id)),
  ).length;

  const programasPropios = sortPrograms([...propiosById.values()]).map(
    (row) => ({
      ...row,
      conciertos: sortEvents(row.conciertos || []),
    }),
  );

  return {
    ensamble,
    ensambleName: ensamble.ensamble || `Ensamble ${ensamble.id}`,
    isRegional: isRegionalConvocatoriaEnsamble(ensamble),
    isCamerata: isCamerataEnsambleRow(ensamble),
    regionName,
    ensambleLocalidadId: Number(ensamble?.id_localidad) || null,
    ensambleLocalidad: String(ensamble?.localidades?.localidad || "").trim(),
    storedFamilia: storedEnsambleFamilia(ensamble),
    storedCfIds: cfIds,
    storedCfNames,
    storedCfName: storedCfNames.join(", ") || null,
    giras: sortPrograms(giras),
    girasFueraDeCasa: giras.reduce(
      (acc, row) => acc + (Number(row.pesoFuera) || 0),
      0,
    ),
    programasPropios,
    conciertosSueltos: sortEvents(conciertosSueltos),
    ensayos: sortEvents(ensayos),
    ensayosTotal: ensayos.length,
    ensayosNeto,
    ensayosConflicto,
    conflictoCount: ensayosConflicto.filter((row) => !row.conflicto?.resolvedKind)
      .length,
  };
}
