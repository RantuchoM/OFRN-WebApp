/** Filtro sintético: eventos sin `id_tipo_evento`. No es un id de `tipos_evento`. */
export const SIN_TIPO_FILTER_ID = "sin-tipo";

/**
 * Id comparable del tipo. Bigint puede llegar como number o string;
 * sin tipo (null) no se cuela en el tipo Concierto ni en ningún otro.
 */
export function eventTypeFilterId(evt) {
  const raw = evt?.id_tipo_evento;
  if (raw == null || raw === "") return SIN_TIPO_FILTER_ID;
  const n = Number(raw);
  return Number.isFinite(n) ? n : SIN_TIPO_FILTER_ID;
}

export function normalizeTypeFilterId(id) {
  if (id === SIN_TIPO_FILTER_ID) return SIN_TIPO_FILTER_ID;
  if (id == null || id === "") return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

export function typeFilterIdsFromEvents(events) {
  const ids = [];
  const seen = new Set();
  for (const evt of events || []) {
    const id = eventTypeFilterId(evt);
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** Tipos presentes, incluido Sin tipo si hay eventos sin tipo. Los eventos igual arrancan destildados. */
export function defaultSelectedTypeIds(events) {
  return typeFilterIdsFromEvents(events);
}

/**
 * `selectedTypeIds` vacío significa ningún tipo, no “todos”.
 * Un evento sin tipo solo entra si el filtro Sin tipo está activo.
 */
export function filterOriginEventsByType(originEvents, selectedTypeIds) {
  if (!originEvents?.length) return [];
  if (!selectedTypeIds?.length) return [];
  const allowed = new Set(
    selectedTypeIds.map(normalizeTypeFilterId).filter((id) => id != null),
  );
  return originEvents.filter((evt) => allowed.has(eventTypeFilterId(evt)));
}

export function visibleEventIdSet(originEvents, selectedTypeIds) {
  return new Set(
    filterOriginEventsByType(originEvents, selectedTypeIds).map((evt) => evt.id),
  );
}

/** Quita de la selección los eventos que el filtro de tipo ya no muestra. */
export function pruneSelectedEventIds(selectedIds, visibleIds) {
  const next = new Set();
  (selectedIds || []).forEach((id) => {
    if (visibleIds.has(id)) next.add(id);
  });
  return next;
}

export function buildOriginTypeCategories(originEvents) {
  const categoriesMap = new Map();
  let hasUntyped = false;

  for (const evt of originEvents || []) {
    const typeId = eventTypeFilterId(evt);
    if (typeId === SIN_TIPO_FILTER_ID) {
      hasUntyped = true;
      continue;
    }
    const tipo = evt?.tipos_evento;
    const typeName = tipo?.nombre || `Tipo ${typeId}`;
    const typeColor = tipo?.color || "#6366f1";
    const cat = tipo?.categorias_tipos_eventos;
    const rawCat = cat?.id;
    const catNum = Number(rawCat);
    const catId =
      rawCat == null || rawCat === ""
        ? 0
        : Number.isFinite(catNum)
          ? catNum
          : rawCat;
    const catName = cat?.nombre || "Sin categoría";
    if (!categoriesMap.has(catId)) {
      categoriesMap.set(catId, { id: catId, nombre: catName, tipos: [] });
    }
    const bucket = categoriesMap.get(catId);
    if (!bucket.tipos.some((t) => t.id === typeId)) {
      bucket.tipos.push({
        id: typeId,
        nombre: typeName,
        color: typeColor,
      });
    }
  }

  const arr = Array.from(categoriesMap.values());
  arr.forEach((cat) =>
    cat.tipos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
  );
  arr.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  if (hasUntyped) {
    arr.push({
      id: "sin-tipo-cat",
      nombre: "Sin tipo",
      tipos: [
        {
          id: SIN_TIPO_FILTER_ID,
          nombre: "Sin tipo",
          color: "#94a3b8",
        },
      ],
    });
  }
  return arr;
}
