/**
 * Orden de lectura según geometría AcroForm en espacio PDF (72 pt, origen abajo-izquierda).
 * - Página ascendente
 * - Arriba → abajo: mayor Y del borde superior del campo primero (rect_y + rect_h)
 * - Izquierda → derecha: rect_x ascendente
 * - Misma “línea”: si |ΔY superior| ≤ ROW_TOL_PT, se ordena solo por X (columnas en una fila)
 */

export const PDF_VISUAL_ROW_TOLERANCE_PT = 4;

/**
 * Borde superior del rect en coords PDF (más alto en la hoja = valor mayor).
 */
export function segmentPdfTopY(seg) {
  const y = Number(seg?.rect_y ?? 0);
  const h = Number(seg?.rect_h ?? 0);
  return y + h;
}

/**
 * @param {object} a
 * @param {object} b
 * @returns {number}
 */
export function compareSegmentsByPdfVisualOrder(a, b) {
  const pa = Number(a?.page_number ?? 1);
  const pb = Number(b?.page_number ?? 1);
  if (pa !== pb) return pa - pb;

  const yTopA = segmentPdfTopY(a);
  const yTopB = segmentPdfTopY(b);

  if (Math.abs(yTopA - yTopB) > PDF_VISUAL_ROW_TOLERANCE_PT) {
    return yTopB - yTopA;
  }

  const xa = Number(a?.rect_x ?? 0);
  const xb = Number(b?.rect_x ?? 0);
  if (xa !== xb) return xa - xb;

  const idA = a?.id != null ? Number(a.id) : 0;
  const idB = b?.id != null ? Number(b.id) : 0;
  if (idA !== idB && (a?.id != null || b?.id != null)) return idA - idB;

  return String(a?.segment_name ?? "").localeCompare(
    String(b?.segment_name ?? ""),
    undefined,
    { numeric: true },
  );
}

export function sortSegmentsByPdfVisualOrder(segments) {
  return [...(segments || [])].sort(compareSegmentsByPdfVisualOrder);
}
