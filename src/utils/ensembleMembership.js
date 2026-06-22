/**
 * Membresía a ensamble por fechas (solo día calendario, ISO YYYY-MM-DD).
 */

import { getTodayDateStringLocal } from "./dates";

/** @param {unknown} d */
export function toIsoDateString(d) {
  if (d == null || d === "") return null;
  const s = typeof d === "string" ? d : String(d);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * ¿El tramo cubre el día `refDate` (inicio de programa / consulta)?
 * Inclusivo en fecha_desde y fecha_hasta; fecha_hasta null = abierto.
 *
 * @param {{ fecha_desde?: unknown, fecha_hasta?: unknown }} row
 * @param {unknown} refDate programa.fecha_desde o equivalente
 */
export function membershipActiveOnProgramDate(row, refDate) {
  const ref = toIsoDateString(refDate);
  const from = toIsoDateString(row?.fecha_desde);
  const until = row?.fecha_hasta != null ? toIsoDateString(row.fecha_hasta) : null;
  if (!ref || !from) return false;
  if (from > ref) return false;
  if (until != null && until < ref) return false;
  return true;
}

/**
 * Filtra filas de integrantes_ensambles activas en refDate.
 */
export function filterMembershipRowsForProgramDate(rows, refDate) {
  if (!rows?.length) return [];
  return rows.filter((r) => membershipActiveOnProgramDate(r, refDate));
}

/**
 * Rango efectivo del programa (solo día calendario).
 * Sin `fecha_hasta`, el programa se trata como de un solo día (`fecha_desde`).
 */
export function programEffectiveDateRange(fechaDesde, fechaHasta) {
  const progStart = toIsoDateString(fechaDesde ?? getTodayDateStringLocal());
  const progEnd = toIsoDateString(
    fechaHasta ?? fechaDesde ?? getTodayDateStringLocal(),
  );
  return { progStart, progEnd };
}

/**
 * ¿El integrante estaba activo en la orquesta durante el programa?
 * Traslape inclusivo entre [fecha_alta, fecha_baja] y [fecha_desde, fecha_hasta del programa].
 * Sin `fecha_hasta` del programa, el fin es `fecha_desde` (no se extiende hasta hoy).
 *
 * @param {{ fecha_alta?: unknown, fecha_baja?: unknown }} person
 * @param {unknown} fechaDesde programa.fecha_desde
 * @param {unknown} [fechaHasta] programa.fecha_hasta
 */
export function integranteActiveOnProgramRange(person, fechaDesde, fechaHasta) {
  const { progStart, progEnd } = programEffectiveDateRange(
    fechaDesde,
    fechaHasta,
  );
  if (!progStart || !progEnd) return true;

  const alta =
    person?.fecha_alta != null ? toIsoDateString(person.fecha_alta) : null;
  const baja =
    person?.fecha_baja != null ? toIsoDateString(person.fecha_baja) : null;

  const startsBeforeEnd = !alta || alta <= progEnd;
  const endsAfterStart = !baja || baja >= progStart;
  return startsBeforeEnd && endsAfterStart;
}
