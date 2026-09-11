import { integranteKey } from "./integranteIds";

/**
 * Misma lógica que la vista ProgramSeating / GiraRoster para “quién cuenta” en seating:
 * convocados presentes (`estado_gira === 'confirmado'`) y sin rol de soporte excluido.
 * Las vacantes (`es_simulacion`) SÍ pueden sentarse; al asignar titular heredan atril/parte.
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

/** Plaza vacante (`integrantes.es_simulacion`). */
export function isVacancyMusician(person) {
  return person?.es_simulacion === true;
}

/**
 * Slot de seating ocupado por una vacante: embed del ítem o fila del roster.
 */
export function isSeatingSlotVacancy(item, roster = []) {
  if (isVacancyMusician(item?.integrantes)) return true;
  const id = item?.id_musico;
  if (id == null) return false;
  return (roster || []).some(
    (m) => String(m.id) === String(id) && isVacancyMusician(m),
  );
}

/**
 * Borde de plaza vacante: mismo ámbar que Nómina
 * (`GiraRoster` `border-l-amber-400`, badge VACANTE `border-amber-200`).
 */
export const VACANCY_SEATING_BORDER_CLASS = "border-amber-400";
