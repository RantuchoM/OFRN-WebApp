import { getAsistenciaMatrixCellMark } from "./asistenciaMatrixExport";
import { integranteKey } from "./integranteIds";
import { isRegionalConvocatoriaEnsamble } from "./convocatoriaEnsambleViews";
import {
  membershipActiveOnProgramDate,
  integranteActiveOnProgramRange,
} from "./ensembleMembership";
import { countsTowardInstrumentationConvoked, getPercComparableTotal, buildProgramInstrumentationAudit } from "./instrumentation";
import {
  buildSandboxStringsContainerLabels,
  formatStringsCompositionLabel,
} from "./seatingStringsComposition";

export const SANDBOX_SINF_CF_TIPOS = ["Sinfónico", "Camerata Filarmónica"];

export const AUDIT_GRID_COLUMNS = [
  { id: "Fl", label: "Fl" },
  { id: "Ob", label: "Ob" },
  { id: "Cl", label: "Cl" },
  { id: "Fg", label: "Fg" },
  { id: "Cr", label: "Cr" },
  { id: "Tp", label: "Tp" },
  { id: "Tb", label: "Tb" },
  { id: "Tba", label: "Tba" },
  { id: "Perc", label: "Perc" },
  { id: "Har", label: "Har" },
  { id: "Pno", label: "Pno" },
];

export function createEmptyInstrumentationMap() {
  return {
    Fl: 0,
    Ob: 0,
    Cl: 0,
    Fg: 0,
    Cr: 0,
    Tp: 0,
    Tb: 0,
    Tba: 0,
    Tim: 0,
    Perc: 0,
    Har: 0,
    Pno: 0,
  };
}

/** @param {Map<number, { fuentes?: Array, integrantes?: Array }>} sandboxMap */
export function getSandboxOverrideForGira(giraId, sandboxMap) {
  if (!sandboxMap?.has(Number(giraId))) return null;
  return sandboxMap.get(Number(giraId));
}

export function fuentesToSourceSets(fuentes = []) {
  const ensembles = new Set();
  const families = new Set();
  const exclEnsembles = new Set();
  for (const f of fuentes) {
    if (f.tipo === "ENSAMBLE" && f.valor_id != null) {
      ensembles.add(Number(f.valor_id));
    }
    if (f.tipo === "FAMILIA" && f.valor_texto) {
      families.add(f.valor_texto);
    }
    if (f.tipo === "EXCL_ENSAMBLE" && f.valor_id != null) {
      exclEnsembles.add(Number(f.valor_id));
    }
  }
  return { ensembles, families, exclEnsembles };
}

export function buildFuentesFromSets(ensembles, families, exclEnsembles) {
  const out = [];
  for (const id of ensembles) {
    out.push({ tipo: "ENSAMBLE", valor_id: id });
  }
  for (const fam of families) {
    out.push({ tipo: "FAMILIA", valor_texto: fam });
  }
  for (const id of exclEnsembles) {
    out.push({ tipo: "EXCL_ENSAMBLE", valor_id: id });
  }
  return out;
}

export function computeConvokedForProgram(roster = []) {
  const all = createEmptyInstrumentationMap();
  const real = createEmptyInstrumentationMap();
  const vacants = createEmptyInstrumentationMap();
  if (!roster || roster.length === 0) return { all, real, vacants };

  roster.forEach((m) => {
    if (m.estado_gira === "ausente") return;
    if (!countsTowardInstrumentationConvoked(m.rol_gira)) return;

    const isVacancy = !!m.es_simulacion;
    const idInstr = String(m.id_instr || "");
    const name = (m.instrumentos?.instrumento || "").toLowerCase();
    const familia = (m.instrumentos?.familia || "").toLowerCase();

    if (["01", "02", "03", "04"].includes(idInstr)) return;

    const bump = (map) => {
      if (name.includes("flaut") || name.includes("picc")) map.Fl += 1;
      else if (name.includes("oboe") || name.includes("corno ing")) map.Ob += 1;
      else if (
        name.includes("clarin") ||
        name.includes("requinto") ||
        name.includes("basset")
      )
        map.Cl += 1;
      else if (name.includes("fagot") || name.includes("contraf")) map.Fg += 1;
      else if (name.includes("corno") || name.includes("trompa")) map.Cr += 1;
      else if (name.includes("trompet") || name.includes("fliscorno"))
        map.Tp += 1;
      else if (name.includes("trombon") || name.includes("trombón"))
        map.Tb += 1;
      else if (name.includes("tuba") || name.includes("bombard")) map.Tba += 1;
      else if (name.includes("timbal")) map.Tim += 1;
      else if (
        (name.includes("perc") && !name.includes("timbal")) ||
        name.includes("bombo") ||
        name.includes("platillo") ||
        name.includes("caja")
      )
        map.Perc += 1;
      else if (name.includes("arpa")) map.Har += 1;
      else if (
        name.includes("piano") ||
        name.includes("teclado") ||
        name.includes("celesta") ||
        name.includes("órgano") ||
        name.includes("organo")
      )
        map.Pno += 1;
      else if (familia.includes("cuerda")) return;
    };

    bump(all);
    if (isVacancy) bump(vacants);
    else bump(real);
  });

  return { all, real, vacants };
}

/** @returns {Set<string>} column ids where convoked count differs */
export function diffInstrumentationConvoked(prodMap, draftMap) {
  const changed = new Set();
  for (const col of AUDIT_GRID_COLUMNS) {
    const prod =
      col.id === "Perc"
        ? getPercComparableTotal(prodMap)
        : prodMap[col.id] || 0;
    const draft =
      col.id === "Perc"
        ? getPercComparableTotal(draftMap)
        : draftMap[col.id] || 0;
    if (prod !== draft) changed.add(col.id);
  }
  return changed;
}

/**
 * Total de servicios Sinf+CF para un integrante.
 * @param {number|string} integranteId
 * @param {Array<{ id: number|string, tipo?: string }>} programas
 * @param {Record<string, { counted?: Set<string>, reemplazo?: Set<string> }>} rosterByGiraId
 */
export function computeMemberSinfCfTotal(integranteId, programas, rosterByGiraId) {
  const iid = integranteKey(integranteId);
  let total = 0;
  for (const g of programas) {
    if (!SANDBOX_SINF_CF_TIPOS.includes(g.tipo)) continue;
    const mark = getAsistenciaMatrixCellMark(rosterByGiraId[g.id], iid);
    if (mark === "counted" || mark === "reemplazo") total += 1;
  }
  return total;
}

/**
 * @param {Array<{ id: number, nombre?: string, apellido?: string }>} integrantes
 */
export function buildIntegrantesLabelMap(integrantes = []) {
  const map = new Map();
  for (const i of integrantes) {
    map.set(Number(i.id), i);
  }
  return map;
}

export function formatIntegranteHistogramLabel(integrante, fallbackId) {
  if (!integrante) return `Integrante ${fallbackId}`;
  const label = `${integrante.apellido || ""}, ${integrante.nombre || ""}`.trim();
  return label || `Integrante ${fallbackId}`;
}

/**
 * @param {Array<{ id: number, ensamble?: string }>} ensambles
 * @param {Array<{ id_ensamble: number, id_integrante: number }>} memberships
 * @param {Array<{ id: number|string, tipo?: string }>} programas
 * @param {Record<string, object>} rosterByGiraId
 * @param {Record<string, object>} [baselineRosterByGiraId]
 * @param {Map<number, { id: number, nombre?: string, apellido?: string }>} [integrantesById]
 */
export function buildEnsambleServiceHistogram(
  ensambles,
  memberships,
  programas,
  rosterByGiraId,
  baselineRosterByGiraId = null,
  integrantesById = null,
) {
  const regional = (ensambles || []).filter(isRegionalConvocatoriaEnsamble);
  const membersByEnsamble = new Map();
  for (const m of memberships || []) {
    const eid = Number(m.id_ensamble);
    const iid = Number(m.id_integrante);
    if (!membersByEnsamble.has(eid)) membersByEnsamble.set(eid, new Set());
    membersByEnsamble.get(eid).add(iid);
  }

  let maxServices = 0;
  const memberTotals = new Map();

  for (const en of regional) {
    const eid = Number(en.id);
    const memberIds = membersByEnsamble.get(eid) || new Set();
    for (const iid of memberIds) {
      const total = computeMemberSinfCfTotal(iid, programas, rosterByGiraId);
      maxServices = Math.max(maxServices, total);
      const key = `${eid}:${iid}`;
      memberTotals.set(key, total);
    }
  }

  const columns = [];
  for (let n = 0; n <= maxServices; n += 1) columns.push(n);

  const labelForIntegrante = (iid) =>
    formatIntegranteHistogramLabel(
      integrantesById?.get(Number(iid)),
      iid,
    );

  const rows = regional.map((en) => {
    const eid = Number(en.id);
    const memberIds = membersByEnsamble.get(eid) || new Set();
    const buckets = Object.fromEntries(columns.map((c) => [c, 0]));
    const baselineBuckets = Object.fromEntries(columns.map((c) => [c, 0]));
    const bucketMembers = Object.fromEntries(columns.map((c) => [c, []]));
    let hasDelta = false;

    for (const iid of memberIds) {
      const total = computeMemberSinfCfTotal(iid, programas, rosterByGiraId);
      buckets[total] = (buckets[total] || 0) + 1;
      bucketMembers[total].push({
        id: Number(iid),
        label: labelForIntegrante(iid),
      });

      if (baselineRosterByGiraId) {
        const baseTotal = computeMemberSinfCfTotal(
          iid,
          programas,
          baselineRosterByGiraId,
        );
        baselineBuckets[baseTotal] = (baselineBuckets[baseTotal] || 0) + 1;
        if (baseTotal !== total) hasDelta = true;
      }
    }

    for (const c of columns) {
      bucketMembers[c].sort((a, b) => a.label.localeCompare(b.label, "es"));
    }

    const deltaBuckets = {};
    for (const c of columns) {
      deltaBuckets[c] = (buckets[c] || 0) - (baselineBuckets[c] || 0);
      if (deltaBuckets[c] !== 0) hasDelta = true;
    }

    return {
      key: String(eid),
      label: en.ensamble?.trim() || `Ensamble ${eid}`,
      buckets,
      baselineBuckets,
      deltaBuckets,
      bucketMembers,
      hasDelta,
      memberCount: memberIds.size,
    };
  });

  const columnTotals = Object.fromEntries(columns.map((c) => [c, 0]));
  for (const row of rows) {
    for (const c of columns) {
      columnTotals[c] += row.buckets[c] || 0;
    }
  }

  const visibleColumns = columns.filter((c) => (columnTotals[c] || 0) > 0);

  return {
    columns: visibleColumns,
    rows,
    columnTotals,
    maxServices,
    memberTotals,
  };
}

/**
 * Convierte salida de resolveGiraRosterDetail a formato de matriz.
 */
export function matrixEntryFromRosterDetail(detail) {
  return {
    counted: detail.countedIds || new Set(),
    preAlta: detail.preAltaIds || new Set(),
    reemplazo: detail.reemplazoIds || new Set(),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Array<{ id: number|string }>} programas
 * @param {Map<number, { fuentes: Array, integrantes: Array }>} sandboxMap
 * @param {typeof import('../services/giraService').resolveGiraRosterForMatrix} resolveFn
 */
export async function buildSandboxRosterByGiraId(
  supabase,
  programas,
  sandboxMap,
  resolveFn,
) {
  const out = {};
  await Promise.all(
    (programas || []).map(async (g) => {
      const gid = Number(g.id);
      const draft = sandboxMap?.get(gid);
      const override = draft
        ? { fuentes: draft.fuentes, integrantes: draft.integrantes }
        : null;
      const detail = await resolveFn(supabase, gid, override);
      out[gid] = matrixEntryFromRosterDetail(detail);
    }),
  );
  return out;
}

function effectiveFuentesForProgram(program, sandboxMap) {
  const draft = sandboxMap?.get(Number(program.id));
  if (draft && Array.isArray(draft.fuentes)) return draft.fuentes;
  return program.giras_fuentes || [];
}

function effectiveIntegrantesOverrides(program, sandboxMap, prodIntegrantesByGira) {
  const gid = Number(program.id);
  const draft = sandboxMap?.get(gid);
  if (draft && Array.isArray(draft.integrantes)) {
    if (draft.integrantes.length > 0) return draft.integrantes;
    return prodIntegrantesByGira.get(gid) || [];
  }
  return prodIntegrantesByGira.get(gid) || [];
}

/**
 * Resuelve marcas de matriz (counted/preAlta/reemplazo) en memoria con datos prefetch.
 * Equivalente a resolveGiraRosterForMatrix sin consultas por gira.
 */
function resolveMatrixRosterFromCache(program, sandboxMap, cache) {
  const gid = Number(program.id);
  const programRefDesde =
    program.fecha_desde ?? new Date().toISOString().slice(0, 10);
  const programRefHasta = program.fecha_hasta ?? null;

  const fuentes = effectiveFuentesForProgram(program, sandboxMap);
  const overrides = effectiveIntegrantesOverrides(
    program,
    sandboxMap,
    cache.prodIntegrantesByGira,
  );

  const rawBaseIds = new Set();
  const manualIds = new Set();

  const ensambleIds = fuentes
    .filter((f) => f.tipo === "ENSAMBLE")
    .map((f) => Number(f.valor_id));

  if (ensambleIds.length > 0) {
    const ensambleIdSet = new Set(ensambleIds);
    for (const row of cache.ensambleMembershipRows) {
      if (
        ensambleIdSet.has(Number(row.id_ensamble)) &&
        membershipActiveOnProgramDate(row, programRefDesde)
      ) {
        rawBaseIds.add(integranteKey(row.id_integrante));
      }
    }
  }

  const familias = fuentes
    .filter((f) => f.tipo === "FAMILIA")
    .map((f) => f.valor_texto);

  if (familias.length > 0) {
    const familiaSet = new Set(familias);
    for (const row of cache.familiaMemberRows) {
      const familia = row.instrumentos?.familia;
      if (familiaSet.has(familia)) {
        rawBaseIds.add(integranteKey(row.id));
      }
    }
  }

  const baseIds = new Set();
  for (const id of rawBaseIds) {
    const row = cache.vigenciaById.get(id);
    if (
      row &&
      integranteActiveOnProgramRange(row, programRefDesde, programRefHasta)
    ) {
      baseIds.add(id);
    }
  }

  for (const o of overrides) {
    if (o.estado !== "ausente") {
      manualIds.add(integranteKey(o.id_integrante));
    }
  }

  const integrantesIds = new Set([...baseIds, ...manualIds]);

  const exclEnsambleIds = fuentes
    .filter((f) => f.tipo === "EXCL_ENSAMBLE")
    .map((f) => Number(f.valor_id));

  const excludedByEnsamble = new Set();
  if (exclEnsambleIds.length > 0) {
    const exclSet = new Set(exclEnsambleIds);
    for (const row of cache.ensambleMembershipRows) {
      if (
        exclSet.has(Number(row.id_ensamble)) &&
        membershipActiveOnProgramDate(row, programRefDesde)
      ) {
        excludedByEnsamble.add(integranteKey(row.id_integrante));
      }
    }
  }

  const ausentesIds = new Set(
    overrides
      .filter((o) => o.estado === "ausente" && !o.abona_reemplazo)
      .map((o) => integranteKey(o.id_integrante)),
  );
  const reemplazoIds = new Set(
    overrides
      .filter((o) => o.estado === "ausente" && o.abona_reemplazo)
      .map((o) => integranteKey(o.id_integrante)),
  );

  const allIds = Array.from(integrantesIds).filter(
    (id) => !excludedByEnsamble.has(id) && !ausentesIds.has(id),
  );
  for (const id of reemplazoIds) {
    if (!excludedByEnsamble.has(id) && !allIds.includes(id)) {
      allIds.push(id);
    }
  }

  const countedIds = new Set();
  const preAltaIds = new Set();
  const reemplazoCountedIds = new Set();
  for (const id of allIds) {
    const row = cache.vigenciaById.get(id);
    if (
      row &&
      integranteActiveOnProgramRange(row, programRefDesde, programRefHasta)
    ) {
      countedIds.add(id);
      if (reemplazoIds.has(id)) {
        reemplazoCountedIds.add(id);
      }
    } else {
      preAltaIds.add(id);
    }
  }

  return {
    countedIds,
    preAltaIds,
    reemplazoIds: reemplazoCountedIds,
  };
}

/**
 * Prefetch compartido para histograma / matriz sandbox (evita N× resolveGiraRosterForMatrix).
 */
export async function createMatrixRosterResolverCache(
  supabase,
  programas = [],
  sandboxMap = new Map(),
) {
  const programIds = [
    ...new Set(
      (programas || []).map((p) => Number(p.id)).filter(Number.isFinite),
    ),
  ];

  const ensambleIdSet = new Set();
  const familiaSet = new Set();
  const collectFromFuentes = (fuentes) => {
    for (const f of fuentes || []) {
      if (f.tipo === "ENSAMBLE" || f.tipo === "EXCL_ENSAMBLE") {
        if (f.valor_id != null) ensambleIdSet.add(Number(f.valor_id));
      }
      if (f.tipo === "FAMILIA" && f.valor_texto) {
        familiaSet.add(f.valor_texto);
      }
    }
  };
  for (const p of programas || []) {
    collectFromFuentes(p.giras_fuentes);
    const draft = sandboxMap.get(Number(p.id));
    if (draft?.fuentes) collectFromFuentes(draft.fuentes);
  }

  const familias = [...familiaSet];
  const ensambleIds = [...ensambleIdSet];

  const [
    prodIntegrantesRes,
    vigenciaRes,
    ensambleMembershipRes,
    familiaMembersRes,
  ] = await Promise.all([
    programIds.length
      ? supabase
          .from("giras_integrantes")
          .select("id_gira, id_integrante, estado, abona_reemplazo")
          .in("id_gira", programIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("integrantes").select("id, fecha_alta, fecha_baja"),
    ensambleIds.length
      ? supabase
          .from("integrantes_ensambles")
          .select("id_integrante, id_ensamble, fecha_desde, fecha_hasta")
          .in("id_ensamble", ensambleIds)
      : Promise.resolve({ data: [], error: null }),
    familias.length
      ? supabase
          .from("integrantes")
          .select("id, instrumentos!inner(familia)")
          .eq("condicion", "Estable")
          .in("instrumentos.familia", familias)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (prodIntegrantesRes.error) throw prodIntegrantesRes.error;
  if (vigenciaRes.error) throw vigenciaRes.error;
  if (ensambleMembershipRes.error) throw ensambleMembershipRes.error;
  if (familiaMembersRes.error) throw familiaMembersRes.error;

  const prodIntegrantesByGira = new Map();
  for (const id of programIds) {
    prodIntegrantesByGira.set(id, []);
  }
  for (const row of prodIntegrantesRes.data || []) {
    const gid = Number(row.id_gira);
    const list = prodIntegrantesByGira.get(gid);
    if (!list) continue;
    list.push({
      id_integrante: Number(row.id_integrante),
      estado: row.estado ?? "confirmado",
      abona_reemplazo: Boolean(row.abona_reemplazo),
    });
  }

  const vigenciaById = new Map();
  for (const row of vigenciaRes.data || []) {
    vigenciaById.set(integranteKey(row.id), row);
  }

  return {
    prodIntegrantesByGira,
    ensambleMembershipRows: ensambleMembershipRes.data || [],
    familiaMemberRows: familiaMembersRes.data || [],
    vigenciaById,
  };
}

/**
 * Histograma sandbox: resolución batch (baseline + draft) sin N consultas por gira.
 */
export async function buildSandboxRosterByGiraIdBatch(
  supabase,
  programas,
  sandboxMap = new Map(),
) {
  const list = programas || [];
  if (!list.length) return { baseline: {}, draft: {} };

  const cache = await createMatrixRosterResolverCache(supabase, list, sandboxMap);
  const baseline = {};
  const draft = {};

  for (const g of list) {
    const gid = Number(g.id);
    baseline[gid] = matrixEntryFromRosterDetail(
      resolveMatrixRosterFromCache(g, new Map(), cache),
    );
    draft[gid] = matrixEntryFromRosterDetail(
      resolveMatrixRosterFromCache(g, sandboxMap, cache),
    );
  }

  return { baseline, draft };
}

export function filterProgramsForHistogram(programas, fechaDesde, fechaHasta) {
  return (programas || []).filter((p) => {
    if (!SANDBOX_SINF_CF_TIPOS.includes(p.tipo)) return false;
    const desde = p.fecha_desde;
    const hasta = p.fecha_hasta || p.fecha_desde;
    if (fechaDesde && hasta < fechaDesde) return false;
    if (fechaHasta && desde > fechaHasta) return false;
    return true;
  });
}

/** Año calendario del histograma sandbox (prioriza dateFrom, luego dateTo, luego hoy). */
export function resolveSandboxHistogramYear(dateFrom, dateTo) {
  const parseYear = (d) => {
    if (!d || typeof d !== "string" || d.length < 4) return null;
    const y = Number.parseInt(d.slice(0, 4), 10);
    return Number.isFinite(y) ? y : null;
  };
  return parseYear(dateFrom) ?? parseYear(dateTo) ?? new Date().getFullYear();
}

/** Programas Sinf+CF con fechas que intersectan el año calendario completo. */
export function filterProgramsForHistogramByYear(programas, year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return [];
  const yearStart = `${y}-01-01`;
  const yearEnd = `${y}-12-31`;
  return (programas || []).filter((p) => {
    if (!SANDBOX_SINF_CF_TIPOS.includes(p.tipo)) return false;
    const desde = p.fecha_desde;
    const hasta = p.fecha_hasta || p.fecha_desde;
    if (!desde) return false;
    if (hasta < yearStart) return false;
    if (desde > yearEnd) return false;
    return true;
  });
}

export function compareFuentesKeys(a, b) {
  const key = (f) =>
    `${f.tipo}|${f.valor_id ?? ""}|${f.valor_texto ?? ""}`;
  return key(a) === key(b);
}

/** Enlace profundo a una gira en la app (misma pestaña u otra según el anchor). */
export function buildGiraAppDeepLink(giraId, view = "ROSTER") {
  if (typeof window === "undefined") return "#";
  const origin = window.location.origin;
  const path = window.location.pathname;
  return `${origin}${path}?tab=giras&view=${view}&giraId=${giraId}`;
}

export function diffFuentes(prodFuentes = [], draftFuentes = []) {
  const added = draftFuentes.filter(
    (d) => !prodFuentes.some((p) => compareFuentesKeys(p, d)),
  );
  const removed = prodFuentes.filter(
    (p) => !draftFuentes.some((d) => compareFuentesKeys(p, d)),
  );
  return { added, removed };
}

function fuenteKeyForCompare(f) {
  return `${f.tipo}|${f.valor_id ?? ""}|${f.valor_texto ?? ""}`;
}

/** True si fuentes de borrador y producción son equivalentes. */
export function draftFuentesMatchProduction(prodFuentes = [], draftFuentes = []) {
  const prod = (prodFuentes || []).map(fuenteKeyForCompare).sort();
  const draft = (draftFuentes || []).map(fuenteKeyForCompare).sort();
  if (prod.length !== draft.length) return false;
  return prod.every((k, idx) => k === draft[idx]);
}

/** True si overrides de integrantes coinciden con el snapshot productivo. */
export function draftIntegrantesMatchProduction(
  prodIntegrantes = [],
  draftIntegrantes = [],
) {
  const normalize = (rows) => {
    const map = new Map();
    for (const o of rows || []) {
      const id = Number(o.id_integrante);
      if (!Number.isFinite(id)) continue;
      map.set(id, String(o.estado ?? "confirmado").toLowerCase());
    }
    return map;
  };
  const prod = normalize(prodIntegrantes);
  const draft = normalize(draftIntegrantes);
  if (prod.size !== draft.size) return false;
  for (const [id, estado] of prod) {
    if (draft.get(id) !== estado) return false;
  }
  return true;
}

/** IDs con override manual en borrador (≠ snapshot productivo de giras_integrantes). */
export function computeManualIntegranteIds(
  draftIntegrantes = [],
  prodIntegrantes = [],
  prodRoster = [],
) {
  const prodMap = new Map(
    prodIntegrantes.map((o) => [
      Number(o.id_integrante),
      String(o.estado ?? "confirmado").toLowerCase(),
    ]),
  );
  const manualIds = new Set();

  for (const o of draftIntegrantes) {
    const id = Number(o.id_integrante);
    if (!Number.isFinite(id)) continue;
    const draftEstado = String(o.estado ?? "confirmado").toLowerCase();
    const prodEstado = prodMap.get(id);

    if (prodEstado === undefined) {
      if (draftEstado === "ausente") {
        manualIds.add(id);
        continue;
      }
      const wasProdActive = (prodRoster || []).some(
        (r) =>
          integranteKey(r.id) === integranteKey(id) &&
          r.estado_gira !== "ausente",
      );
      if (!wasProdActive) manualIds.add(id);
    } else if (prodEstado !== draftEstado) {
      manualIds.add(id);
    }
  }

  return manualIds;
}

export function hasFuenteStructuralChange(fuenteDiff = {}) {
  const types = new Set(["ENSAMBLE", "FAMILIA", "EXCL_ENSAMBLE"]);
  return (
    (fuenteDiff.added || []).some((s) => types.has(s.tipo)) ||
    (fuenteDiff.removed || []).some((s) => types.has(s.tipo))
  );
}

/** @param {Array<{ value: string|number, label: string }>} ensemblesList */
export function buildEnsambleLabelMap(ensemblesList = [], existing = {}) {
  const map = { ...existing };
  for (const e of ensemblesList) {
    const id = Number(e.value);
    const name = String(e.label ?? "").trim();
    if (Number.isFinite(id) && name) map[id] = name;
  }
  return map;
}

export function collectEnsambleIdsFromSources(...sourceLists) {
  const ids = new Set();
  for (const list of sourceLists) {
    for (const s of list || []) {
      if (
        (s.tipo === "ENSAMBLE" || s.tipo === "EXCL_ENSAMBLE") &&
        s.valor_id != null
      ) {
        ids.add(Number(s.valor_id));
      }
    }
  }
  return ids;
}

export function resolveEnsambleLabel(
  ensambleId,
  labelMap = {},
  ensemblesList = [],
) {
  const id = Number(ensambleId);
  const fromMap = labelMap[id] ?? labelMap[ensambleId];
  if (fromMap) return String(fromMap).trim() || `Ensamble ${id}`;
  const fromList = (ensemblesList || []).find(
    (e) => Number(e.value) === id,
  );
  const name = String(fromList?.label ?? "").trim();
  return name || `Ensamble ${id}`;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number[]} ids
 * @param {Record<number, string>} existing
 */
export async function fetchMissingEnsambleLabels(
  supabase,
  ids,
  existing = {},
) {
  const missing = [...ids].filter(
    (id) => Number.isFinite(id) && !existing[Number(id)],
  );
  if (!missing.length) return existing;
  const next = { ...existing };
  const chunkSize = 80;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("ensambles")
      .select("id, ensamble")
      .in("id", chunk);
    if (error) throw error;
    for (const row of data || []) {
      const id = Number(row.id);
      const name = String(row.ensamble ?? "").trim();
      next[id] = name || `Ensamble ${id}`;
    }
  }
  return next;
}

function draftOverrideNeedsDistinctRoster(draftOverride, prodConv) {
  if (!draftOverride) return false;
  if (draftOverride.integrantes?.length > 0) return true;
  return !draftFuentesMatchProduction(
    prodConv?.fuentes || [],
    draftOverride.fuentes || [],
  );
}

/**
 * Métrica de un programa a partir de datos ya resueltos (sin I/O).
 */
export function buildSandboxProgramMetricSync(
  program,
  draftOverride,
  aux,
  parts,
) {
  const {
    blocksByProgram,
    assignsByProgram,
    containersByProgram,
    particellasByObra,
    allParticellas,
  } = aux;

  const prodRosterRes = parts.prodRoster;
  const draftRosterRes = parts.draftRoster;
  const prodConvSnapshot = parts.prodConv || { integrantes: [] };
  const musicianContainerLabels =
    parts.musicianContainerLabels || new Map();

  const blocks = (blocksByProgram[program.id] || []).sort(
    (a, b) => (a.orden || 0) - (b.orden || 0),
  );
  const seatingContext = {
    assigns: assignsByProgram[program.id] || [],
    containers: containersByProgram[program.id] || [],
    particellasByObra,
    particellas: allParticellas,
  };
  const { required, workRows } = buildProgramInstrumentationAudit(
    blocks,
    seatingContext,
  );
  const prodConv = computeConvokedForProgram(prodRosterRes.roster).all;
  const draftConv = computeConvokedForProgram(draftRosterRes.roster).all;

  const containers = containersByProgram[program.id] || [];
  let stringsLabel = null;
  let prodStringsLabel = null;
  if (containers.length > 0) {
    const draftContainerLabels = buildSandboxStringsContainerLabels(
      draftRosterRes.roster,
      musicianContainerLabels,
      containers,
    );
    stringsLabel = formatStringsCompositionLabel(
      draftRosterRes.roster,
      draftContainerLabels,
    );
    prodStringsLabel = formatStringsCompositionLabel(
      prodRosterRes.roster,
      musicianContainerLabels,
    );
  }

  return {
    required,
    works: (workRows || []).map((w) => {
      const title = String(w.title || "Obra").replace(/<[^>]*>?/gm, "");
      const composerRaw = String(w.composerLabel || "").trim();
      const composer =
        composerRaw.split(",")[0]?.trim() || composerRaw || "S/D";
      return {
        ...w,
        title,
        shortTitle: title.split(/\s+/).slice(0, 3).join(" "),
        composer,
      };
    }),
    prodConvoked: prodConv,
    draftConvoked: draftConv,
    prodSources: prodRosterRes.sources,
    draftSources: draftRosterRes.sources,
    hasDraft: !!draftOverride,
    convDiffCols: diffInstrumentationConvoked(prodConv, draftConv),
    prodRoster: prodRosterRes.roster,
    draftRoster: draftRosterRes.roster,
    prodIntegrantes: prodConvSnapshot.integrantes || [],
    stringsLabel,
    prodStringsLabel,
  };
}

/**
 * Calcula métricas de todos los programas en batch (rosters, convocatoria, seating).
 */
export async function computeAllSandboxProgramMetrics(
  supabase,
  programs,
  draftMap,
  aux,
) {
  const { fetchRosterForGira } = await import("../hooks/useGiraRoster");
  const { batchFetchProductionConvocatoria } = await import(
    "../services/instrumentacionSandboxService"
  );
  const { batchFetchMusicianSeatingContainerLabels } = await import(
    "./seatingStringsComposition"
  );

  const programIds = programs.map((p) => p.id);
  const programsWithContainers = programIds.filter(
    (id) => (aux.containersByProgram[id] || []).length > 0,
  );

  const [prodConvByGira, seatingLabelsByProgram] = await Promise.all([
    batchFetchProductionConvocatoria(supabase, programIds),
    batchFetchMusicianSeatingContainerLabels(supabase, programsWithContainers),
  ]);

  const rosterOptions = aux.rosterOptions;
  const prodRosterById = {};

  const prodResults = await Promise.all(
    programs.map(async (p) => {
      try {
        const res = await fetchRosterForGira(supabase, p, rosterOptions);
        return { id: p.id, ...res };
      } catch (e) {
        console.error("computeAllSandboxProgramMetrics prod roster:", p.id, e);
        return { id: p.id, roster: [], sources: [] };
      }
    }),
  );
  for (const r of prodResults) {
    prodRosterById[r.id] = r;
  }

  const draftRosterById = { ...prodRosterById };
  const draftFetchPrograms = programs.filter((p) => {
    const override = getSandboxOverrideForGira(p.id, draftMap);
    const prodConv = prodConvByGira.get(Number(p.id));
    return draftOverrideNeedsDistinctRoster(override, prodConv);
  });

  await Promise.all(
    draftFetchPrograms.map(async (p) => {
      const override = getSandboxOverrideForGira(p.id, draftMap);
      try {
        draftRosterById[p.id] = await fetchRosterForGira(supabase, p, {
          ...rosterOptions,
          fuentesOverride: override.fuentes,
          integrantesOverride:
            override.integrantes?.length > 0 ? override.integrantes : null,
        });
      } catch (e) {
        console.error("computeAllSandboxProgramMetrics draft roster:", p.id, e);
        draftRosterById[p.id] = prodRosterById[p.id];
      }
    }),
  );

  const metrics = {};
  for (const p of programs) {
    const override = getSandboxOverrideForGira(p.id, draftMap);
    const gid = Number(p.id);
    metrics[p.id] = buildSandboxProgramMetricSync(p, override, aux, {
      prodRoster: prodRosterById[p.id],
      draftRoster: draftRosterById[p.id],
      prodConv: prodConvByGira.get(gid) || { fuentes: [], integrantes: [] },
      musicianContainerLabels: seatingLabelsByProgram.get(gid) || new Map(),
    });
  }
  return metrics;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} program
 * @param {{ fuentes?: Array, integrantes?: Array }|null} draftOverride
 * @param {object} aux
 */
export async function computeSandboxProgramMetric(
  supabase,
  program,
  draftOverride,
  aux,
) {
  const { fetchRosterForGira } = await import("../hooks/useGiraRoster");
  const { batchFetchProductionConvocatoria } = await import(
    "../services/instrumentacionSandboxService"
  );
  const { batchFetchMusicianSeatingContainerLabels } = await import(
    "./seatingStringsComposition"
  );

  const { rosterOptions, containersByProgram } = aux;
  const containers = containersByProgram[program.id] || [];

  const [prodConvByGira, seatingLabelsByProgram, prodRosterRes] =
    await Promise.all([
      batchFetchProductionConvocatoria(supabase, [program.id]),
      containers.length
        ? batchFetchMusicianSeatingContainerLabels(supabase, [program.id])
        : Promise.resolve(new Map()),
      fetchRosterForGira(supabase, program, rosterOptions),
    ]);

  const prodConv = prodConvByGira.get(Number(program.id)) || {
    fuentes: [],
    integrantes: [],
  };

  let draftRosterRes = prodRosterRes;
  if (draftOverrideNeedsDistinctRoster(draftOverride, prodConv)) {
    draftRosterRes = await fetchRosterForGira(supabase, program, {
      ...rosterOptions,
      fuentesOverride: draftOverride.fuentes,
      integrantesOverride:
        draftOverride.integrantes?.length > 0
          ? draftOverride.integrantes
          : null,
    });
  }

  return buildSandboxProgramMetricSync(program, draftOverride, aux, {
    prodRoster: prodRosterRes,
    draftRoster: draftRosterRes,
    prodConv,
    musicianContainerLabels:
      seatingLabelsByProgram.get(Number(program.id)) || new Map(),
  });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number|string} giraId
 * @param {{ fuentes?: Array, integrantes?: Array }|null} draftOverride
 * @param {typeof import('../services/giraService').resolveGiraRosterForMatrix} resolveFn
 */
export async function resolveSandboxGiraMatrixEntry(
  supabase,
  giraId,
  draftOverride,
  resolveFn,
) {
  const gid = Number(giraId);
  const override = draftOverride
    ? {
        fuentes: draftOverride.fuentes,
        integrantes: draftOverride.integrantes,
      }
    : null;
  const detail = await resolveFn(supabase, gid, override);
  return matrixEntryFromRosterDetail(detail);
}

