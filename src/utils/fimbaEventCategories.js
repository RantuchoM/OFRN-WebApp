/**
 * Categorías de `categorias_tipos_eventos` / `tipos_evento` para filtros FIMBA.
 * Fuente de verdad = tabla de categorías; tipos y filas de agenda solo rellenan huecos.
 */

/**
 * Alpha hex (~8%) for Agenda row/card wash from `tipos_evento.color`.
 * Tipo chips use `22` (~13%); row tint stays lighter so text/chips stay readable.
 * Works with FIMBA light tokens + html.dark invert (same as chip `${color}22`).
 */
export const FIMBA_TIPO_ROW_TINT_ALPHA = "14";

/**
 * Very light background wash matching the tipo/categoría chip color.
 * @param {string|null|undefined} tipoColor — `ev.tipo_color` / `tipos_evento.color`
 * @returns {{ background: string } | undefined}
 */
export function fimbaTipoRowTintStyle(tipoColor) {
  const c = tipoColor != null ? String(tipoColor).trim() : "";
  if (!c) return undefined;
  // `background` (not backgroundColor) so inline overrides origen card washes
  return { background: `${c}${FIMBA_TIPO_ROW_TINT_ALPHA}` };
}

function sortCategoriasByNombre(list) {
  return [...list].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );
}

/**
 * Normaliza filas de `categorias_tipos_eventos` (id + nombre).
 * @param {Array<{ id?: number|string, nombre?: string|null }>|null|undefined} rows
 */
export function normalizeCategoriasTiposEventos(rows) {
  const map = new Map();
  for (const c of rows || []) {
    const id = Number(c?.id);
    if (!Number.isFinite(id)) continue;
    if (map.has(id)) continue;
    const nombre = String(c?.nombre || "").trim();
    map.set(id, { id, nombre: nombre || `Cat. ${id}` });
  }
  return sortCategoriasByNombre([...map.values()]);
}

/**
 * Categorías derivadas del catálogo de tipos (fallback si falta la tabla).
 * @param {Array} tipos — filas con id_categoria + nombre de categoría
 */
export function categoriesFromTiposEvento(tipos) {
  const map = new Map();
  for (const t of tipos || []) {
    const id = t.id_categoria;
    if (id == null || !Number.isFinite(Number(id))) continue;
    if (!map.has(Number(id))) {
      map.set(Number(id), {
        id: Number(id),
        nombre:
          t.categoria_nombre ||
          t.categorias_tipos_eventos?.nombre ||
          `Cat. ${id}`,
      });
    }
  }
  return sortCategoriasByNombre([...map.values()]);
}

/**
 * Unión: categorías de BD + catálogo de tipos + filas de agenda.
 * Alta en `categorias_tipos_eventos` (Datos) aparece en el filtro aunque
 * todavía no haya tipo ni eventos (p.ej. Catering / Reunión).
 *
 * @param {{ dbCategorias?: Array, catalogTipos?: Array, rowDerived?: Array<{ id: number, nombre: string }> }} [sources]
 */
export function mergeFimbaAgendaCategories(sources = {}) {
  const dbCategorias = sources.dbCategorias || [];
  const catalogTipos = sources.catalogTipos || [];
  const rowDerived = sources.rowDerived || [];
  const map = new Map();
  for (const c of [
    ...normalizeCategoriasTiposEventos(dbCategorias),
    ...categoriesFromTiposEvento(catalogTipos),
    ...rowDerived,
  ]) {
    const id = Number(c?.id);
    if (!Number.isFinite(id)) continue;
    if (!map.has(id)) {
      map.set(id, { id, nombre: c.nombre || `Cat. ${id}` });
    }
  }
  return sortCategoriasByNombre([...map.values()]);
}
