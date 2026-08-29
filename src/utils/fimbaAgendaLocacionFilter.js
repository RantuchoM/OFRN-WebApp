import { normalizeForSearch } from "./sanitize.js";

/**
 * Filtro de locación de la planilla Agenda FIMBA.
 *
 * El alta FIMBA de actividades (conciertos, apertura de sala, etc.) persiste el
 * lugar como texto `Destino:` en `eventos.descripcion` y a menudo deja
 * `id_locacion` vacío. El catálogo OFRN sí usa `id_locacion`. El filtro tiene
 * que unir ambos: elegir «Puerto San Carlos» no puede ocultar la apertura de
 * sala que solo tiene destino texto.
 */

/** Prefijo de clave para opciones que no tienen id de catálogo. */
export const DESTINO_LOCACION_KEY_PREFIX = "d:";

/** id_locacion numérico de una fila de agenda unificada FIMBA. */
export function eventLocacionId(ev) {
  const raw = ev?.id_locacion ?? ev?.locaciones?.id ?? null;
  const id = raw != null ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

function trimText(value) {
  const s = String(value ?? "").trim();
  return s || "";
}

/** Texto de destino libre (columna Destino / Vuelo), sin fallback de catálogo. */
export function eventDestinoText(ev) {
  return trimText(ev?.destino);
}

function locacionNombreFromEvent(ev) {
  return (
    trimText(ev?.locacion_nombre) ||
    trimText(ev?.locaciones?.nombre) ||
    ""
  );
}

function locacionCiudadFromEvent(ev) {
  return (
    trimText(ev?.locacion_ciudad) ||
    trimText(ev?.locaciones?.localidades?.localidad) ||
    ""
  );
}

function labelLocacion(nombre, ciudad) {
  const n = trimText(nombre);
  const c = trimText(ciudad);
  if (!n) return c || "";
  return c ? `${n} · ${c}` : n;
}

function catalogKey(id) {
  return String(id);
}

function destinoKey(normalizedNombre) {
  return `${DESTINO_LOCACION_KEY_PREFIX}${normalizedNombre}`;
}

export function isDestinoLocacionKey(key) {
  return String(key || "").startsWith(DESTINO_LOCACION_KEY_PREFIX);
}

export function parseLocacionFilterKey(key) {
  const raw = String(key ?? "").trim();
  if (!raw) return { id: null, destinoNorm: null };
  if (isDestinoLocacionKey(raw)) {
    return {
      id: null,
      destinoNorm: raw.slice(DESTINO_LOCACION_KEY_PREFIX.length),
    };
  }
  const id = Number(raw);
  return {
    id: Number.isFinite(id) ? id : null,
    destinoNorm: null,
  };
}

/** Normaliza un id de query (`?locacion=59`) a clave de filtro. */
export function locacionKeyFromQuery(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (isDestinoLocacionKey(s)) return s;
  const id = Number(s);
  return Number.isFinite(id) ? catalogKey(id) : null;
}

/**
 * Textos de destino con los que un evento puede matchear una opción de catálogo.
 * Solo filas SIN `id_locacion`: `listFimbaAgenda` rellena `destino` con el
 * nombre de catálogo y cruzaría «A definir · Viedma» con «A definir · Cipolletti».
 */
export function eventDestinoMatchNorms(ev) {
  if (eventLocacionId(ev) != null) return [];
  const dest = eventDestinoText(ev);
  if (!dest) return [];
  const norms = new Set();
  const add = (value) => {
    const n = normalizeForSearch(value);
    if (n) norms.add(n);
  };
  add(dest);
  const parts = dest.split("·").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) add(parts[0]);
  return [...norms];
}

function optionMatchNorms(option) {
  const norms = new Set();
  for (const n of option?.matchNames || []) {
    const v = normalizeForSearch(n);
    if (v) norms.add(v);
  }
  return norms;
}

/**
 * Locaciones distintas presentes en filas cargadas.
 * Catálogo (`id_locacion`) + destinos texto que no colapsan a un nombre de catálogo.
 *
 * @returns {Array<{
 *   key: string,
 *   id: number|null,
 *   nombre: string,
 *   matchNames: string[],
 * }>}
 */
export function locacionesFromAgendaRows(eventos) {
  const catalog = new Map();
  for (const ev of eventos || []) {
    const id = eventLocacionId(ev);
    if (id == null || catalog.has(id)) continue;
    const nombre = locacionNombreFromEvent(ev) || `Locación #${id}`;
    const ciudad = locacionCiudadFromEvent(ev);
    const label = labelLocacion(nombre, ciudad);
    catalog.set(id, {
      key: catalogKey(id),
      id,
      nombre: label,
      matchNames: [nombre, label].filter(Boolean),
    });
  }

  const catalogNameNorms = new Set();
  for (const opt of catalog.values()) {
    for (const n of optionMatchNorms(opt)) catalogNameNorms.add(n);
  }

  const destinoOnly = new Map();
  for (const ev of eventos || []) {
    if (eventLocacionId(ev) != null) continue;
    const dest = eventDestinoText(ev);
    if (!dest) continue;
    const destNorms = eventDestinoMatchNorms(ev);
    if (destNorms.some((n) => catalogNameNorms.has(n))) continue;
    const primary = destNorms[0];
    if (!primary || destinoOnly.has(primary)) continue;
    destinoOnly.set(primary, {
      key: destinoKey(primary),
      id: null,
      nombre: dest,
      matchNames: destNorms,
    });
  }

  return [...catalog.values(), ...destinoOnly.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );
}

/**
 * ¿La fila cae en alguna locación seleccionada?
 * Vacío = sin filtro (todas visibles).
 */
export function eventMatchesLocacionFilter(ev, selectedKeys, options = []) {
  if (!selectedKeys?.length) return true;
  const locId = eventLocacionId(ev);
  const destNorms = new Set(eventDestinoMatchNorms(ev));
  const byKey = new Map((options || []).map((o) => [String(o.key), o]));

  for (const raw of selectedKeys) {
    const key = String(raw);
    const parsed = parseLocacionFilterKey(key);
    const opt = byKey.get(key);

    if (parsed.id != null && locId === parsed.id) return true;
    if (opt?.id != null && locId === opt.id) return true;

    const needles = opt ? optionMatchNorms(opt) : new Set();
    if (parsed.destinoNorm) needles.add(parsed.destinoNorm);
    for (const n of needles) {
      if (destNorms.has(n)) return true;
    }
  }
  return false;
}

/** Descarta claves que ya no existen en las opciones cargadas. */
export function pruneLocacionFilterKeys(selectedKeys, options) {
  if (!selectedKeys?.length) return selectedKeys || [];
  // Agenda aún vacía (primer fetch): no borrar `?locacion=` ni la selección.
  if (!options?.length) return selectedKeys;
  const valid = new Set(options.map((o) => String(o.key)));
  const next = selectedKeys.filter((k) => valid.has(String(k)));
  return next.length === selectedKeys.length ? selectedKeys : next;
}
