/**
 * Reordena IDs de la selección de Archivo por un criterio estable.
 * @param {Array<number|string>} ids
 * @param {Map<number|string, object>} worksById
 * @param {'compositor'|'obra'|'giras'} criterion
 * @returns {Array<number|string>}
 */
export function sortSelectionIds(ids, worksById, criterion) {
  const list = [...(ids || [])];
  const getWork = (id) => worksById?.get(id) || null;

  const cmpStr = (a, b) =>
    String(a || "").localeCompare(String(b || ""), "es", { sensitivity: "base" });

  list.sort((idA, idB) => {
    const a = getWork(idA);
    const b = getWork(idB);
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;

    if (criterion === "compositor") {
      const byComposer = cmpStr(a.compositor_full, b.compositor_full);
      if (byComposer !== 0) return byComposer;
      return cmpStr(a.titulo_plain || a.titulo, b.titulo_plain || b.titulo);
    }

    if (criterion === "obra") {
      return cmpStr(a.titulo_plain || a.titulo, b.titulo_plain || b.titulo);
    }

    if (criterion === "giras") {
      const dateA = a.primer_programa_fecha_desde || "9999-12-31";
      const dateB = b.primer_programa_fecha_desde || "9999-12-31";
      const byDate = String(dateA).localeCompare(String(dateB));
      if (byDate !== 0) return byDate;
      const byComposer = cmpStr(a.compositor_full, b.compositor_full);
      if (byComposer !== 0) return byComposer;
      return cmpStr(a.titulo_plain || a.titulo, b.titulo_plain || b.titulo);
    }

    return 0;
  });

  return list;
}
