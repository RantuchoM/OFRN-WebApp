/**
 * Categorías de `tipos_evento` / `categorias_tipos_eventos` para filtros FIMBA.
 */

/**
 * Categorías derivadas del catálogo de tipos (para filtro UI).
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
  return [...map.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );
}

/**
 * Unión catálogo OFRN + categorías ya presentes en filas de agenda.
 * Así una categoría nueva (p.ej. Catering) aparece en el filtro de planilla
 * aunque la edición todavía no tenga eventos de ese tipo.
 * @param {Array} catalogTipos
 * @param {Array<{ id: number, nombre: string }>} [rowDerived]
 */
export function mergeFimbaAgendaCategories(catalogTipos, rowDerived) {
  const map = new Map();
  for (const c of [
    ...categoriesFromTiposEvento(catalogTipos),
    ...(rowDerived || []),
  ]) {
    const id = Number(c?.id);
    if (!Number.isFinite(id)) continue;
    if (!map.has(id)) {
      map.set(id, { id, nombre: c.nombre || `Cat. ${id}` });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );
}
