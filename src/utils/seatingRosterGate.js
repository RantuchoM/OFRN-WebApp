import { integranteKey } from "./integranteIds";

/**
 * Misma lógica que la vista ProgramSeating / GiraRoster para “quién cuenta” en seating:
 * convocados presentes (`estado_gira === 'confirmado'`) y sin rol de soporte excluido.
 */
export const SEATING_REPORT_EXCLUDED_ROLES = [
  "staff",
  "produccion",
  "producción",
  "chofer",
  "archivo",
  "utilero",
  "asistente",
  "iluminador",
  "iluminacion",
  "sonido",
  "acompañante",
];

export function isConfirmedConvocadoForSeatingReports(m) {
  if (!m || m.estado_gira !== "confirmado") return false;
  const role = (m.rol_gira || m.rol || "musico").toLowerCase().trim();
  return !SEATING_REPORT_EXCLUDED_ROLES.includes(role);
}

/** Set de integranteKey(id) aptos para filas de seating / informes. */
export function confirmedSeatingRosterKeySet(roster) {
  return new Set(
    (roster || [])
      .filter(isConfirmedConvocadoForSeatingReports)
      .map((m) => integranteKey(m.id))
      .filter(Boolean),
  );
}

export function isMusicianOnConfirmedSeatingRoster(rosterKeys, musicianId) {
  const k = integranteKey(musicianId);
  return !!(k && rosterKeys?.has?.(k));
}
