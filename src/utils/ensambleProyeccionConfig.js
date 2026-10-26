/**
 * Año y tramos de proyección de ensayos / informe prestaciones.
 * Año objetivo = calendario siguiente («el año que viene»).
 * `desde`/`hasta` de cada tramo se normalizan a lunes (ISO).
 */

function mondayOnOrBeforeLocal(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  const dow = d.getDay();
  const sub = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - sub);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mondayOnOrAfterLocal(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  const dow = d.getDay();
  const add = dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + add);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getAnioProyeccion(now = new Date()) {
  return now.getFullYear() + 1;
}

/** N-ésimo lunes del mes (1 = primero). month 1–12. */
export function nthMondayOfMonth(year, month, n = 1) {
  const y = Number(year);
  const m = Number(month);
  const nth = Math.max(1, Number(n) || 1);
  let d = new Date(y, m - 1, 1, 12, 0, 0);
  // JS: 0=dom … 1=lun
  const dow = d.getDay();
  const add = dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + add + (nth - 1) * 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function defaultTramosForYear(anio) {
  const y = Number(anio) || getAnioProyeccion();
  return [
    {
      desde: nthMondayOfMonth(y, 2, 1),
      hasta: nthMondayOfMonth(y, 12, 3),
      nota: null,
    },
  ];
}

export function defaultProyeccionConfig(anio) {
  const y = Number(anio) || getAnioProyeccion();
  return {
    anio: y,
    servicios_por_gira: 7,
    tramos: defaultTramosForYear(y),
  };
}

export function normalizeTramo(raw) {
  if (!raw) return null;
  let desde = String(raw.desde || "").slice(0, 10);
  let hasta = String(raw.hasta || raw.desde || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    return null;
  }
  if (desde > hasta) {
    const tmp = desde;
    desde = hasta;
    hasta = tmp;
  }
  // Tramos se expresan en lunes inclusivos (plantilla semanal).
  desde = mondayOnOrAfterLocal(desde);
  hasta = mondayOnOrBeforeLocal(hasta);
  if (desde > hasta) return null;
  return {
    desde,
    hasta,
    nota: raw.nota != null && String(raw.nota).trim() ? String(raw.nota).trim() : null,
  };
}

export function normalizeTramos(tramos) {
  let list = tramos;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      list = [];
    }
  }
  const out = [];
  for (const t of list || []) {
    const n = normalizeTramo(t);
    if (n) out.push(n);
  }
  out.sort((x, y) => x.desde.localeCompare(y.desde));
  return out;
}

export function normalizeProyeccionConfig(row, anioFallback) {
  const anio = Number(row?.anio ?? anioFallback) || getAnioProyeccion();
  const defaults = defaultProyeccionConfig(anio);
  const tramos = normalizeTramos(row?.tramos);
  const serv = Number(row?.servicios_por_gira);
  return {
    anio,
    servicios_por_gira:
      Number.isFinite(serv) && serv >= 0 ? serv : defaults.servicios_por_gira,
    tramos: tramos.length ? tramos : defaults.tramos,
    updated_at: row?.updated_at || null,
  };
}
