/** Normaliza para deduplicar y filtrar (ignora tildes en búsqueda vía SearchableSelect). */
export function normalizeLocalidadKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * Opciones para `SearchableSelect`: el valor en BD y el `id` de opción = nombre de localidad (texto).
 * Orden alfabético, sin filas duplicadas por nombre, sin strings vacíos.
 */
export function localidadesToSearchableOptions(localidades) {
  const byKey = new Map();
  for (const loc of localidades || []) {
    const name = String(loc?.localidad ?? "").trim();
    if (!name) continue;
    const k = normalizeLocalidadKey(name);
    if (byKey.has(k)) continue;
    byKey.set(k, { id: name, label: name });
  }
  return Array.from(byKey.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "es-AR", { sensitivity: "base" }),
  );
}
