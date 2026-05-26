/** Texto del PDF/Excel cuando el viático es 0% y se marca renuncia en exportación. */
export const RENUNCIA_VIATICOS_TEXTO = "RENUNCIA A VIÁTICOS";

/** Viático al 0% (no destaque): porcentaje de liquidación en la fila o global de destaques. */
export function isViaticoPorcentajeCero(row) {
  const raw = row?.porcentaje ?? row?.porcentaje_destaques;
  if (raw === null || raw === undefined || raw === "") return false;
  const n = parseFloat(String(raw).trim());
  return Number.isFinite(n) && n === 0;
}

/** Evita NaN y no confunde 0 con “vacío” (no usar || sobre subtotales). */
function safeMoney(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Monto de anticipo para exportación / PDF / correos:
 * anticipo_custom si existe; si no, calculado (subtotal) o histórico según useHistoricalCalc.
 */
export function getAnticipoSubtotalForExport(row, useHistoricalCalc) {
  if (row?.anticipo_custom != null && row.anticipo_custom !== "") {
    const v = parseFloat(row.anticipo_custom);
    if (!Number.isNaN(v)) return Math.round((v + Number.EPSILON) * 100) / 100;
  }
  if (!useHistoricalCalc) {
    // Importante: subtotal puede ser 0 (p. ej. viático al 0%). Con row.subtotal || monto
    // el 0 se saltaba y se tomaba monto_viatico por error.
    if (row?.subtotal != null && row.subtotal !== "") {
      const n = safeMoney(row.subtotal);
      return Math.round((n + Number.EPSILON) * 100) / 100;
    }
    return safeMoney(row.monto_viatico ?? row.subtotal_viatico);
  }
  const backupVal =
    row.backup_viatico != null && row.backup_viatico !== ""
      ? parseFloat(row.backup_viatico)
      : NaN;
  if (!Number.isNaN(backupVal)) return backupVal;
  const dias = parseFloat(row.backup_dias_computables ?? 0);
  const val = parseFloat(row.valorDiarioCalc ?? 0);
  return Math.round((dias * val) * 100) / 100;
}

/**
 * Anticipo para PDF viático: si renuncia activa y viático 0% con monto 0, devuelve texto legal.
 */
export function resolveAnticipoParaPdfViatico(
  row,
  useHistoricalCalc,
  renunciaViaticos,
) {
  const sub = getAnticipoSubtotalForExport(row, useHistoricalCalc);
  if (renunciaViaticos && isViaticoPorcentajeCero(row) && sub === 0) {
    return RENUNCIA_VIATICOS_TEXTO;
  }
  return sub;
}

const GASTOS_VIATICO_KEYS = [
  "gastos_movilidad",
  "gasto_combustible",
  "gasto_otros",
  "gastos_movil_otros",
  "gastos_capacit",
  "gasto_alojamiento",
  "gasto_pasajes",
  "transporte_otros", // en tabla suele ser texto; si no es número, no suma NaN
];

/** Suma de columnas de gastos (misma lógica que ViaticosManager / tabla). */
export function sumGastosViaticoRow(row) {
  if (!row) return 0;
  return GASTOS_VIATICO_KEYS.reduce((acc, k) => acc + safeMoney(row[k]), 0);
}
