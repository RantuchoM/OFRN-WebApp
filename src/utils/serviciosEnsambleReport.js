import {
  filterEnsamblesForConvocatoriaView,
  isCamerataEnsambleRow,
  isEnsamblePruebaLabel,
  isJazzBandEnsambleLabel,
  isRegionalConvocatoriaEnsamble,
} from "./convocatoriaEnsambleViews";
import { programOverlapsDateRange } from "./giraDateRange";
import { isProgramBorrador } from "./girasYearSummary";
import {
  ID_TIPO_CONCIERTO,
  ID_TIPO_ENSAYO_ENSAMBLE,
  eventAssociatedProgramaIds,
  formatProgramNomencladorNombre,
} from "./serviciosCantidad";

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
  const usable = [
    ...filterEnsamblesForConvocatoriaView(ensambles, "ensambles"),
    ...filterEnsamblesForConvocatoriaView(ensambles, "cameratas"),
  ];
  const seen = new Set();
  const out = [];
  for (const en of usable) {
    const id = Number(en?.id);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    if (isEnsamblePruebaLabel(en?.ensamble)) continue;
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

function toProgramRow(program, extra = {}) {
  return {
    id: program.id,
    program,
    label: formatProgramNomencladorNombre(program) || `Programa ${program.id}`,
    tipo: program.tipo || "",
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
  const excluded = [];
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
    if (cls.status === "excluido") {
      if (giraTipos.has(program.tipo)) {
        excluded.push(toProgramRow(program, { via: cls.via }));
      }
      continue;
    }
    if (cls.status !== "convocado") continue;
    const cfNames = (cls.cfIds || [])
      .map((id) =>
        (ensambles || []).find((en) => Number(en.id) === Number(id))?.ensamble,
      )
      .filter(Boolean);
    const row = toProgramRow(program, {
      via: cls.via,
      familias: cls.familias,
      cfIds: cls.cfIds,
      cfNames,
      conciertos: [],
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
    storedFamilia: storedEnsambleFamilia(ensamble),
    storedCfIds: cfIds,
    storedCfNames,
    storedCfName: storedCfNames.join(", ") || null,
    giras: sortPrograms(giras),
    excluded: sortPrograms(excluded),
    programasPropios,
    conciertosSueltos: sortEvents(conciertosSueltos),
    ensayosTotal: ensayos.length,
    ensayosNeto,
    ensayosConflicto,
    conflictoCount: ensayosConflicto.filter((row) => !row.conflicto?.resolvedKind)
      .length,
  };
}
