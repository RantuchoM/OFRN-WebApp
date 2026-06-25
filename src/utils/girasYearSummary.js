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

/** Cuenta programas visibles en el año, agrupados por tipo. */
export function countProgramsByType(programs, { desde, hasta }) {
  const counts = {};
  const referenceDate = toLocalDateString();
  for (const program of programs || []) {
    if (isProgramBorrador(program)) continue;
    if (
      !programOverlapsDateRange(program, desde, hasta, referenceDate)
    ) {
      continue;
    }
    const tipo = program.tipo || "General";
    counts[tipo] = (counts[tipo] || 0) + 1;
  }
  return counts;
}

export function orderedProgramTypeEntries(counts) {
  const known = Object.keys(PROGRAM_TYPES).filter((k) => k !== "default");
  const entries = known
    .map((tipo) => ({ tipo, count: counts[tipo] || 0 }))
    .filter((row) => row.count > 0);

  for (const [tipo, count] of Object.entries(counts || {})) {
    if (!known.includes(tipo) && count > 0) {
      entries.push({ tipo, count });
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

export function countConvokedEnsayos(events, integranteId, memberships, customRows) {
  const customByEventId = new Map();
  for (const row of customRows || []) {
    customByEventId.set(row.id_evento, row);
  }

  let count = 0;
  for (const evt of events || []) {
    if (
      isIntegranteConvocadoToEnsayo(
        evt,
        integranteId,
        memberships,
        customByEventId,
      )
    ) {
      count += 1;
    }
  }
  return count;
}
