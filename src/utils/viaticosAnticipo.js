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
    return parseFloat(row.subtotal || row.monto_viatico || row.subtotal_viatico || 0);
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

/** Suma de columnas de gastos (misma lógica que ViaticosManager / tabla). */
export function sumGastosViaticoRow(row) {
  if (!row) return 0;
  return (
    parseFloat(row.gastos_movilidad || 0) +
    parseFloat(row.gasto_combustible || 0) +
    parseFloat(row.gasto_otros || 0) +
    parseFloat(row.gastos_movil_otros || 0) +
    parseFloat(row.gastos_capacit || 0) +
    parseFloat(row.gasto_alojamiento || 0) +
    parseFloat(row.gasto_pasajes || 0) +
    parseFloat(row.transporte_otros || 0)
  );
}
