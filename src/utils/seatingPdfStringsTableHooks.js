/** Cantidad de filas de la grilla de cuerdas siempre par (última fila vacía si hace falta). */
export function seatingStringsGridEvenRowCount(rawMaxRows) {
  const n = Math.max(0, Math.floor(Number(rawMaxRows) || 0));
  if (n === 0) return 0;
  return n % 2 === 0 ? n : n + 1;
}

/**
 * Borde inferior más grueso cada dos filas del body (pares de músicos = mismo atril).
 * Para usar en autoTable (jspdf-autotable) de la tabla de disposición de cuerdas.
 */
export function didParseCellSeatingStringsStandPairs(data) {
  if (data.section !== "body") return;
  const ri = data.row.index;
  if (typeof ri !== "number" || ri < 0) return;
  if (ri % 2 !== 1) return;

  const thin = 0.07;
  const thickBottom = 0.75;
  const s = data.cell.styles;
  const lw = s.lineWidth;
  const base =
    lw && typeof lw === "object"
      ? { top: thin, right: thin, left: thin, bottom: thin, ...lw }
      : { top: thin, right: thin, left: thin, bottom: thin };
  s.lineWidth = { ...base, bottom: thickBottom };
}
