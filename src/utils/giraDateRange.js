/** Fecha local YYYY-MM-DD */
export function toLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 31/12 del año en curso (zona local). */
export function endOfCurrentYearLocal(d = new Date()) {
  return `${d.getFullYear()}-12-31`;
}

/**
 * Programas que solapan [rangeStart, rangeEnd]:
 * fecha_desde <= rangeEnd AND (fecha_hasta >= rangeStart OR sin fecha_hasta)
 */
export function applyProgramOverlapDateFilter(query, rangeStart, rangeEnd) {
  let q = query;
  if (rangeEnd) {
    q = q.lte("fecha_desde", rangeEnd);
  }
  if (rangeStart) {
    q = q.or(`fecha_hasta.gte.${rangeStart},fecha_hasta.is.null`);
  }
  return q;
}
