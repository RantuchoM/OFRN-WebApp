/**
 * Fecha superior de plantillas «Participación (para firmar)» en giras futuras:
 * lunes siguiente al fin de la gira, o primer día hábil si ese lunes es feriado.
 */

function parseIsoLocalDate(iso) {
  const s = String(iso || "").slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toIsoLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysLocal(date, days) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Primer lunes estrictamente posterior a `iso` (YYYY-MM-DD).
 * Domingo → lunes siguiente; lunes → lunes de la semana siguiente.
 */
export function nextMondayAfterIso(iso) {
  const base = parseIsoLocalDate(iso);
  if (!base) return null;
  const dow = base.getDay(); // 0=dom … 1=lun … 6=sáb
  const add = dow === 0 ? 1 : 8 - dow;
  return toIsoLocalDate(addDaysLocal(base, add));
}

/**
 * Avanza desde `iso` hasta el primer día hábil (lun–vie y no en `feriadoSet`).
 * `feriadoSet`: fechas YYYY-MM-DD (feriados y puentes de la tabla `feriados`).
 */
export function firstBusinessDayOnOrAfterIso(iso, feriadoSet = new Set()) {
  const start = parseIsoLocalDate(iso);
  if (!start) return null;
  let cur = start;
  for (let i = 0; i < 31; i += 1) {
    const s = toIsoLocalDate(cur);
    const dow = cur.getDay();
    const weekend = dow === 0 || dow === 6;
    if (!weekend && !feriadoSet.has(s)) return s;
    cur = addDaysLocal(cur, 1);
  }
  return toIsoLocalDate(start);
}

/** ISO del lunes post-gira (hábil), o null si la fecha base es inválida. */
export function emissionIsoAfterGira(fechaHastaIso, feriadoSet = new Set()) {
  const monday = nextMondayAfterIso(fechaHastaIso);
  if (!monday) return null;
  return firstBusinessDayOnOrAfterIso(monday, feriadoSet) || monday;
}

export function isoToLocalDate(iso) {
  return parseIsoLocalDate(iso);
}
