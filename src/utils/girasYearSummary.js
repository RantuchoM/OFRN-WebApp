import { membershipActiveOnProgramDate } from "./ensembleMembership";
import { programOverlapsDateRange, toLocalDateString } from "./giraDateRange";
import { PROGRAM_TYPES } from "./giraUtils";

const ENSAYO_TIPO_ID = 13;

/** Programas en borrador no entran en contadores de UX (resumen anual, etc.). */
export function isProgramBorrador(program) {
  return (program?.estado || "Borrador").trim() === "Borrador";
}

export function currentYearBounds(d = new Date()) {
  const year = d.getFullYear();
  return {
    year,
    desde: `${year}-01-01`,
    hasta: `${year}-12-31`,
  };
}

/**
 * Cuenta programas visibles en el año, agrupados por tipo.
 * Vigente/Pausada van a `counts`; estado `Borrador` va a `draftCounts`.
 */
export function countProgramsByTypeSplit(programs, { desde, hasta }) {
  const counts = {};
  const draftCounts = {};
  const referenceDate = toLocalDateString();
  for (const program of programs || []) {
    if (
      !programOverlapsDateRange(program, desde, hasta, referenceDate)
    ) {
      continue;
    }
    const tipo = program.tipo || "General";
    if (isProgramBorrador(program)) {
      draftCounts[tipo] = (draftCounts[tipo] || 0) + 1;
      continue;
    }
    counts[tipo] = (counts[tipo] || 0) + 1;
  }
  return { counts, draftCounts };
}

/** Cuenta programas no-borrador visibles en el año, agrupados por tipo. */
export function countProgramsByType(programs, range) {
  return countProgramsByTypeSplit(programs, range).counts;
}

export function orderedProgramTypeEntries(counts, draftCounts = {}) {
  const known = Object.keys(PROGRAM_TYPES).filter((k) => k !== "default");
  const entries = known
    .map((tipo) => ({
      tipo,
      count: counts[tipo] || 0,
      draftCount: draftCounts[tipo] || 0,
    }))
    .filter((row) => row.count > 0 || row.draftCount > 0);

  const knownSet = new Set(known);
  const extraTipos = new Set([
    ...Object.keys(counts || {}),
    ...Object.keys(draftCounts || {}),
  ]);
  for (const tipo of extraTipos) {
    if (knownSet.has(tipo)) continue;
    const count = counts[tipo] || 0;
    const draftCount = draftCounts[tipo] || 0;
    if (count > 0 || draftCount > 0) {
      entries.push({ tipo, count, draftCount });
    }
  }
  return entries;
}

/**
 * ¿El integrante está convocado a este ensayo de ensamble (tipo 13)?
 * Misma lógica base que agenda / reporte de check-in.
 */
export function isIntegranteConvocadoToEnsayo(
  evt,
  integranteId,
  memberships,
  customByEventId,
) {
  if (!evt || evt.is_deleted) return false;
  if (Number(evt.id_tipo_evento) !== ENSAYO_TIPO_ID) return false;
  if (evt.tecnica) return false;

  const custom = customByEventId?.get(evt.id);
  if (custom?.tipo === "ausente") return false;
  if (custom?.tipo === "invitado" || custom?.tipo === "adicional") {
    return true;
  }

  const ensambleIds = (evt.eventos_ensambles || [])
    .map((row) => Number(row.id_ensamble))
    .filter(Number.isFinite);
  if (!ensambleIds.length) return false;

  const uid = Number(integranteId);
  const myMemberships = (memberships || []).filter(
    (m) => Number(m.id_integrante) === uid,
  );

  return ensambleIds.some((ensId) => {
    const mem = myMemberships.find((m) => Number(m.id_ensamble) === ensId);
    if (!mem) return false;
    return membershipActiveOnProgramDate(mem, evt.fecha);
  });
}

export function countConvokedEnsayos(
  events,
  integranteId,
  memberships,
  customRows,
  draftGiraIds,
) {
  const customByEventId = new Map();
  for (const row of customRows || []) {
    customByEventId.set(row.id_evento, row);
  }

  let count = 0;
  let draftCount = 0;
  const drafts = draftGiraIds instanceof Set ? draftGiraIds : new Set();
  for (const evt of events || []) {
    if (
      !isIntegranteConvocadoToEnsayo(
        evt,
        integranteId,
        memberships,
        customByEventId,
      )
    ) {
      continue;
    }
    if (evt.id_gira != null && drafts.has(evt.id_gira)) {
      draftCount += 1;
    } else {
      count += 1;
    }
  }
  return { count, draftCount };
}
