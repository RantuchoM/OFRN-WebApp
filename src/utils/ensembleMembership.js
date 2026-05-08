/**
 * Membresía a ensamble por fechas (solo día calendario, ISO YYYY-MM-DD).
 */

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
