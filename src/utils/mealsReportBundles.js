/**
 * Agrupación pura del MealsReport (por artista / por locación).
 * Sin deps de Excel/clipboard: la descarga vive en mealsReportGroupedExport.
 */

import { scopeMealsReportRowToArtista } from "./mealsReportText";

const SERVICE_ORDER = {
  Desayuno: 0,
  Almuerzo: 1,
  Merienda: 2,
  Cena: 3,
  Catering: 4,
};

export function sortMealReportRows(rows = []) {
  return [...rows].sort((a, b) => {
    const d = String(a.fecha || "").localeCompare(String(b.fecha || ""));
    if (d) return d;
    const sa = SERVICE_ORDER[a.servicio] ?? 99;
    const sb = SERVICE_ORDER[b.servicio] ?? 99;
    if (sa !== sb) return sa - sb;
    return String(a.hora || "").localeCompare(String(b.hora || ""));
  });
}

/**
 * Agrupa filas del reporte por artista tagueado (requiere_comidas !== false).
 *
 * @param {object[]} reportRows
 * @param {Map|Record} fimbaPartsByPropuesta
 * @param {(tipo, nota?) => string} labelFn
 * @param {string[]|null} onlyArtistaIds
 * @param {Function} dietBreakdownFn `fimbaArtistMealDietBreakdown`
 */
export function buildMealsReportBundlesByArtista(
  reportRows = [],
  fimbaPartsByPropuesta = new Map(),
  labelFn,
  onlyArtistaIds = null,
  dietBreakdownFn,
) {
  const allow =
    onlyArtistaIds?.length > 0
      ? new Set(onlyArtistaIds.map(String))
      : null;

  /** @type {Map<string, { id: string, nombre: string, rows: object[] }>} */
  const map = new Map();

  for (const row of reportRows || []) {
    const props = row.propuestas || [];
    for (const p of props) {
      if (!p?.id) continue;
      if (p.requiere_comidas === false) continue;
      const id = String(p.id);
      if (allow && !allow.has(id)) continue;
      if (!map.has(id)) {
        map.set(id, {
          id,
          nombre: p.nombre || `Artista ${p.id}`,
          rows: [],
        });
      }
      const scoped = scopeMealsReportRowToArtista(
        row,
        id,
        fimbaPartsByPropuesta,
        labelFn,
        dietBreakdownFn,
      );
      map.get(id).rows.push(scoped);
    }
  }

  return Array.from(map.values())
    .map((b) => ({ ...b, rows: sortMealReportRows(b.rows) }))
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
    );
}

/**
 * Agrupa filas del reporte por locación (lugar de comida).
 *
 * @param {object[]} reportRows
 * @param {string[]|null} onlyLocKeys
 */
export function buildMealsReportBundlesByLocacion(
  reportRows = [],
  onlyLocKeys = null,
) {
  const allow =
    onlyLocKeys?.length > 0 ? new Set(onlyLocKeys.map(String)) : null;

  /** @type {Map<string, { id: string, nombre: string, rows: object[] }>} */
  const map = new Map();

  for (const row of reportRows || []) {
    const key =
      row.locKey != null && row.locKey !== ""
        ? String(row.locKey)
        : "__none__";
    if (allow && !allow.has(key)) continue;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        nombre: row.locacionLabel || row.lugar || "Sin ubicación",
        rows: [],
      });
    }
    map.get(key).rows.push(row);
  }

  return Array.from(map.values())
    .map((b) => ({ ...b, rows: sortMealReportRows(b.rows) }))
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
    );
}
