import {
  isUserConvoked,
  isNobodyConvocados,
  personMatchesLocConvocadoTag,
  resolvePersonGrupoIds,
  ROSTER_CATEGORIES,
} from "./giraUtils";
import { isLocalAtMealSlot } from "./giraTramos";
import { stripHtml } from "./eventDisplayUtils";
import { isFimbaOnlyAgendaEvent } from "./agendaHelpers";

/** Orden del dÃ­a para comparar inicio/fin de cobertura de comidas. */
export const MEAL_SERVICE_ORDER = {
  Desayuno: 0,
  Almuerzo: 1,
  Merienda: 2,
  Cena: 3,
  Catering: 4,
};

/** Tipos canÃ³nicos (agrupan todos los eventos de comida). */
export const MEAL_SERVICES = ["Desayuno", "Almuerzo", "Merienda", "Cena"];

/**
 * Sufijos automÃ¡ticos frecuentes al final de la descripciÃ³n de una comida
 * (convocados / placeholders). Usados para extraer el detalle de subcategorÃ­a.
 */
export const MEAL_AUTO_DESCRIPTION_SUFFIXES = [
  "Solo alojados",
  "ProducciÃ³n",
  "Directores",
  "Solistas",
  "Locales",
  "No Locales",
  "Tutti",
  "Prod.",
  "Sol.",
  "Dir.",
  "Staff",
  "Gira",
];

/**
 * BebÃ© / menor en cuna (`ocupa_cama: false` en rooming): no consume, no cuenta en comidas.
 */
export function isPersonInCuna(person) {
  if (!person) return false;
  if (person.en_cuna === true) return true;
  if (person.ocupa_cama === false) return true;
  return false;
}

/** Â¿El integrante estÃ¡ en cuna segÃºn `asignaciones_config` de las habitaciones? */
export function resolveEnCunaFromRooms(personId, rooms = []) {
  if (personId == null) return false;
  for (const room of rooms || []) {
    const cfg = Array.isArray(room.asignaciones_config)
      ? room.asignaciones_config.find(
          (c) => c?.id != null && String(c.id) === String(personId),
        )
      : null;
    if (cfg) return cfg.ocupa_cama === false;
  }
  return false;
}

/** IDs de ocupantes en cuna (no consumen comidas). */
export function collectCunaOccupantIds(rooms = []) {
  const ids = new Set();
  (rooms || []).forEach((room) => {
    (Array.isArray(room.asignaciones_config) ? room.asignaciones_config : []).forEach(
      (c) => {
        if (c?.id != null && c.ocupa_cama === false) ids.add(Number(c.id));
      },
    );
  });
  return ids;
}

/** CategorÃ­a de tipos de evento de comida en `tipos_evento` / `categorias_tipos_eventos`. */
export const MEAL_CATEGORY_ID = 4;

/**
 * CategorÃ­a Catering (hermana de Comidas). Seed tÃ­pico id 9; preferir nombre.
 * @see supabase/migrations/20260901140559_catering_categoria_tipo.sql
 */
export const CATERING_CATEGORY_ID = 9;
export const CATERING_CATEGORY_NAME = "Catering";
/** Slot sintÃ©tico de matriz/filtro para eventos de categorÃ­a Catering. */
export const CATERING_SERVICE = "Catering";

/** IDs canÃ³nicos fijos (compatibilidad / cobertura de reglas). */
export const CANONICAL_MEAL_TYPE_IDS = {
  Desayuno: 7,
  Almuerzo: 8,
  Merienda: 9,
  Cena: 10,
};

export const MEAL_TYPE_ID_TO_SERVICE = {
  7: "Desayuno",
  8: "Almuerzo",
  9: "Merienda",
  10: "Cena",
};

/**
 * Colores de servicio de comida (fuente Ãºnica para matriz, reporte, logÃ­stica e impresiÃ³n).
 * - `tag` / `card`: UI interactiva (texto coloreado sobre fondo suave).
 * - `reportTag`: PDF/reporte (texto negro sobre fondo resaltado).
 * - `rowHover` / `date` / `icon`: filas de eventos en logÃ­stica.
 * - `print`: hex para el CSS crÃ­tico de PrintWrapper (sin Tailwind en la ventana de impresiÃ³n).
 */
export const MEAL_SERVICE_STYLES = {
  Desayuno: {
    tag: "bg-sky-50 text-sky-800 border-sky-200",
    card: "bg-sky-50/25 border-sky-200",
    reportTag: "bg-sky-200 border-sky-400 text-slate-900",
    rowHover: "hover:bg-sky-50/70",
    date: "text-sky-800",
    icon: "text-sky-300",
    print: {
      bgClass: "bg-sky-200",
      bg: "#bae6fd",
      color: "#0f172a",
      border: "#38bdf8",
    },
  },
  Almuerzo: {
    tag: "bg-amber-50 text-amber-700 border-amber-200",
    card: "bg-amber-50/25 border-amber-200",
    reportTag: "bg-amber-200 border-amber-400 text-slate-900",
    rowHover: "hover:bg-amber-50/70",
    date: "text-amber-700",
    icon: "text-amber-300",
    print: {
      bgClass: "bg-amber-200",
      bg: "#fde68a",
      color: "#0f172a",
      border: "#f59e0b",
    },
  },
  Merienda: {
    tag: "bg-rose-50 text-rose-700 border-rose-200",
    card: "bg-rose-50/25 border-rose-200",
    reportTag: "bg-rose-200 border-rose-400 text-slate-900",
    rowHover: "hover:bg-rose-50/70",
    date: "text-rose-700",
    icon: "text-rose-300",
    print: {
      bgClass: "bg-rose-200",
      bg: "#fecdd3",
      color: "#0f172a",
      border: "#fb7185",
    },
  },
  Cena: {
    tag: "bg-indigo-50 text-indigo-700 border-indigo-200",
    card: "bg-indigo-50/25 border-indigo-200",
    reportTag: "bg-indigo-200 border-indigo-400 text-slate-900",
    rowHover: "hover:bg-indigo-50/70",
    date: "text-indigo-700",
    icon: "text-indigo-300",
    print: {
      bgClass: "bg-indigo-200",
      bg: "#c7d2fe",
      color: "#0f172a",
      border: "#818cf8",
    },
  },
  Catering: {
    tag: "bg-orange-50 text-orange-800 border-orange-200",
    card: "bg-orange-50/25 border-orange-200",
    reportTag: "bg-orange-200 border-orange-400 text-slate-900",
    rowHover: "hover:bg-orange-50/70",
    date: "text-orange-800",
    icon: "text-orange-300",
    print: {
      bgClass: "bg-orange-200",
      bg: "#fed7aa",
      color: "#0f172a",
      border: "#ea580c",
    },
  },
  default: {
    tag: "bg-slate-100 text-slate-600 border-slate-200",
    card: "bg-slate-50/50 border-slate-200",
    reportTag: "bg-slate-200 border-slate-400 text-slate-900",
    rowHover: "hover:bg-slate-50",
    date: "text-slate-700",
    icon: "text-slate-300",
    print: {
      bgClass: "bg-slate-200",
      bg: "#e2e8f0",
      color: "#0f172a",
      border: "#94a3b8",
    },
  },
};

export function getMealServiceStyle(servicio) {
  const base =
    mealBaseFromTypeName(servicio) ||
    normalizeMealServiceBase(servicio) ||
    servicio;
  return MEAL_SERVICE_STYLES[base] || MEAL_SERVICE_STYLES.default;
}

/** Â¿El id es un tipo canÃ³nico puro (sin detalle)? */
export function isCanonicalMealTypeId(id) {
  const n = Number(id);
  return n === 7 || n === 8 || n === 9 || n === 10;
}

/**
 * Tipo canÃ³nico D/A/M/C a partir del nombre del tipo de evento.
 * Regla de negocio: la **primera palabra** del nombre determina el grupo.
 * Ej: "Merienda a bordo" â Merienda; "Almuerzo (Vianda)" â Almuerzo.
 */
export function mealBaseFromTypeName(nombre) {
  if (!nombre) return null;
  const raw = String(nombre).trim();
  if (!raw) return null;
  // Primera palabra (corta en espacio o parÃ©ntesis sin espacio)
  const firstToken = raw.split(/[\s(/]+/)[0] || "";
  if (MEAL_SERVICE_ORDER[firstToken] != null) return firstToken;
  const lower = firstToken.toLowerCase();
  for (const base of MEAL_SERVICES) {
    if (lower === base.toLowerCase()) return base;
  }
  // Fallback legado: el nombre completo comienza con el tipo
  return normalizeMealServiceBase(raw);
}

/** Color hex por defecto alineado a los estilos de badge. */
export function defaultMealTypeColor(servicioBase) {
  const style = getMealServiceStyle(servicioBase);
  return style?.print?.border || "#6366f1";
}

/** id_categoria efectivo de un evento / tipo embebido. */
export function eventTipoCategoriaId(evt) {
  if (!evt) return null;
  const cat =
    evt.tipos_evento?.id_categoria ??
    evt.tipos_evento?.categorias_tipos_eventos?.id ??
    evt.id_categoria ??
    evt.categoria_id;
  const n = Number(cat);
  return Number.isFinite(n) ? n : null;
}

function eventCategoriaNombre(evt) {
  return String(
    evt?.tipos_evento?.categorias_tipos_eventos?.nombre ||
      evt?.categoria_nombre ||
      evt?.tipos_evento?.categoria_nombre ||
      "",
  )
    .trim()
    .toLowerCase();
}

/**
 * Â¿CategorÃ­a Catering (no Comidas / id 4)?
 * Prioriza nombre; fallback a id de seed documentado + nombre de tipo.
 */
export function isCateringEvent(evt) {
  if (!evt) return false;
  if (eventCategoriaNombre(evt) === "catering") return true;
  const cat = eventTipoCategoriaId(evt);
  if (cat === CATERING_CATEGORY_ID) return true;
  const typeName = String(evt.tipos_evento?.nombre || evt.tipo_nombre || evt.nombre || "")
    .trim()
    .toLowerCase();
  if (typeName === "catering") return true;
  return false;
}

/**
 * Â¿Este evento (o fila con tipos_evento) es de comida (categorÃ­a Comidas)?
 * Prioriza id_categoria = 4; fallback a ids 7â10 o nombre agrupable.
 * Catering NO cuenta aquÃ­ (usar `isCateringEvent` / `isMealRelatedEvent`).
 */
export function isMealEvent(evt) {
  if (!evt) return false;
  if (isCateringEvent(evt)) return false;
  const cat = eventTipoCategoriaId(evt);
  if (cat === MEAL_CATEGORY_ID) return true;
  if (isCanonicalMealTypeId(evt.id_tipo_evento)) return true;
  if (mealBaseFromTypeName(evt.tipos_evento?.nombre || evt.nombre)) return true;
  return false;
}

/** Comida (cat 4 / D-A-M-C) o Catering â lo que entra al gestor de comidas. */
export function isMealRelatedEvent(evt) {
  return isMealEvent(evt) || isCateringEvent(evt);
}

/** 'comidas' | 'catering' | null */
export function mealRelatedKind(evt) {
  if (isCateringEvent(evt)) return "catering";
  if (isMealEvent(evt)) return "comidas";
  // Filas del Manager a menudo traen `servicio` canÃ³nico sin embed fresco de tipos_evento.
  const svc = String(evt?.servicio || "").trim();
  if (svc === CATERING_SERVICE) return "catering";
  if (MEAL_SERVICES.includes(svc) || normalizeMealServiceBase(svc)) return "comidas";
  return null;
}

/**
 * Â¿Pasa el filtro de clase comida/catering?
 * @param {'all'|'comidas'|'catering'} kindFilter
 */
export function passesMealKindFilter(evt, kindFilter = "all") {
  if (kindFilter == null || kindFilter === "all") return true;
  const kind = mealRelatedKind(evt);
  if (kindFilter === "comidas") return kind === "comidas";
  if (kindFilter === "catering") return kind === "catering";
  return true;
}

/** Keys especiales en filtros multi de Locación / Artista. */
export const MEAL_FILTER_NO_LOC = "__none__";
export const MEAL_FILTER_NO_ARTIST = "__none__";
/** Comidas sin tags FIMBA y con audiencia OFRN (orquesta come; no «Nadie»). */
export const MEAL_FILTER_ORCHESTRA_ONLY = "__orchestra__";
export const MEAL_FILTER_ORCHESTRA_ONLY_LABEL = "Solo orquesta";

const EXCLUSIVE_MEAL_CONV_TAGS = new Set([
  ROSTER_CATEGORIES.NONE,
  ROSTER_CATEGORIES.TUTTI,
]);

export function isExclusiveMealConvocadoTag(id) {
  return EXCLUSIVE_MEAL_CONV_TAGS.has(String(id || ""));
}

/**
 * Toggle de un tag en la columna Convocados.
 * Destildar siempre está permitido (incluye Tutti / Nadie) y la selección puede
 * quedar vacía: no hay mínimo de un chip. Encender Tutti o Nadie sigue siendo
 * exclusivo (reemplaza el resto) porque son sentinels contradictorios.
 */
export function toggleMealConvocadosSelection(current = [], id) {
  const tag = String(id || "");
  if (!tag) return [...(current || [])].map(String);
  const selected = (current || []).map(String);
  if (selected.includes(tag)) {
    return selected.filter((x) => x !== tag);
  }
  if (isExclusiveMealConvocadoTag(tag)) return [tag];
  const withoutExclusive = selected.filter(
    (x) => !isExclusiveMealConvocadoTag(x),
  );
  if (withoutExclusive.includes(tag)) return withoutExclusive;
  return [...withoutExclusive, tag];
}

/** ¿La fila tiene al menos un tag de artista FIMBA? */
export function mealRowHasArtistTags(row) {
  return (row?.propuestas || []).some((p) => p?.id != null);
}

/**
 * Comida «solo orquesta»: sin artistas FIMBA y con audiencia OFRN
 * (convocados y/o grupos; no `GRP:NONE` ni ambos ejes vacíos).
 */
export function mealRowIsSoloOrquesta(row) {
  if (!row || row.isTemp) return false;
  if (mealRowHasArtistTags(row)) return false;
  return mealRowHasOfrnAudience(row);
}

/**
 * ¿La fila pasa el multi-select de Artista (ids + Solo orquesta / Sin artistas)?
 * Vacío = no filtra.
 */
export function mealRowMatchesArtistFilter(row, artistIds) {
  const list = artistIds || [];
  if (list.length === 0) return true;
  const artistSet =
    list instanceof Set ? list : new Set([...list].map(String));
  if (
    artistSet.has(MEAL_FILTER_ORCHESTRA_ONLY) &&
    mealRowIsSoloOrquesta(row)
  ) {
    return true;
  }
  const ids = (row?.propuestas || [])
    .map((p) => (p?.id != null ? String(p.id) : null))
    .filter(Boolean);
  if (ids.length === 0 && artistSet.has(MEAL_FILTER_NO_ARTIST)) return true;
  return ids.some((id) => artistSet.has(id));
}

/** Opciones del filtro Artista: «Solo orquesta» siempre primero + tags presentes. */
export function buildMealArtistFilterOptions({
  propuestas = [],
  rows = [],
} = {}) {
  const map = new Map();
  const seedFrom = (list) => {
    for (const p of list || []) {
      if (p?.id == null) continue;
      const key = String(p.id);
      if (map.has(key)) continue;
      map.set(key, {
        value: key,
        label: p.nombre || `Artista ${p.id}`,
      });
    }
  };
  seedFrom(propuestas);
  for (const r of rows || []) {
    if (r?.isTemp) continue;
    seedFrom(r.propuestas);
  }
  const opts = Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "es", { sensitivity: "base" }),
  );
  opts.unshift({
    value: MEAL_FILTER_ORCHESTRA_ONLY,
    label: MEAL_FILTER_ORCHESTRA_ONLY_LABEL,
  });
  return opts;
}

/** Enciende/apaga el filtro Solo orquesta. Al encender, queda exclusivo. */
export function toggleMealOrchestraOnlyFilter(artistaIds = []) {
  const current = (artistaIds || []).map(String);
  if (current.includes(MEAL_FILTER_ORCHESTRA_ONLY)) {
    return current.filter((id) => id !== MEAL_FILTER_ORCHESTRA_ONLY);
  }
  return [MEAL_FILTER_ORCHESTRA_ONLY];
}

/** Default servicios visibles en gestor/asistencia/reporte (Desayuno off). */
export const DEFAULT_MEAL_SERVICE_FILTER = [
  "Almuerzo",
  "Merienda",
  "Cena",
  CATERING_SERVICE,
];

export function createDefaultMealFilters() {
  return {
    mealKindFilter: "all",
    serviceFilter: [...DEFAULT_MEAL_SERVICE_FILTER],
    locacionIds: [],
    artistaIds: [],
  };
}

export function isDefaultMealFilters(filters) {
  if (!filters) return true;
  const def = createDefaultMealFilters();
  if ((filters.mealKindFilter || "all") !== def.mealKindFilter) return false;
  const svc = new Set(filters.serviceFilter || []);
  if (svc.size !== def.serviceFilter.length) return false;
  if (!def.serviceFilter.every((s) => svc.has(s))) return false;
  if ((filters.locacionIds || []).length > 0) return false;
  if ((filters.artistaIds || []).length > 0) return false;
  return true;
}

/**
 * Comparador estable de filas del MealsManager (grilla completa).
 * Orden: fecha ASC â servicio (D/A/M/C/Catering = MEAL_SERVICE_ORDER) â
 * hora_inicio ASC â id. Misma lÃ³gica que el walk diario + Catering intercalado
 * por fecha (no apendado al final).
 */
export function compareMealManagerRows(a, b) {
  const fa = String(a?.fecha || "").slice(0, 10);
  const fb = String(b?.fecha || "").slice(0, 10);
  if (fa !== fb) return fa.localeCompare(fb);

  const sa =
    a?.servicio ||
    mealServicioFromEvent(a) ||
    "";
  const sb =
    b?.servicio ||
    mealServicioFromEvent(b) ||
    "";
  const oa = MEAL_SERVICE_ORDER[sa] ?? 99;
  const ob = MEAL_SERVICE_ORDER[sb] ?? 99;
  if (oa !== ob) return oa - ob;

  const ha = String(a?.hora_inicio || "").trim().slice(0, 5);
  const hb = String(b?.hora_inicio || "").trim().slice(0, 5);
  if (ha !== hb) return ha.localeCompare(hb);

  const na = Number(a?.id);
  const nb = Number(b?.id);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
}

/** Copia ordenada de la grilla (no muta el array de entrada). */
export function sortMealManagerGrid(rows) {
  return [...(rows || [])].sort(compareMealManagerRows);
}

/**
 * Filtro puro de filas/eventos de comida (Manager / Asistencia / Reporte).
 * Nunca muta `rows`. Vacantes (`isTemp`) ignoran locaciÃ³n/artista para poder crear.
 *
 * @param {object[]} rows
 * @param {{ mealKindFilter?: string, serviceFilter?: string[]|Set, locacionIds?: string[], artistaIds?: string[] }} filters
 */
export function filterMealManagerRows(rows, filters = {}) {
  const list = rows || [];
  const serviceSet = filters.serviceFilter
    ? filters.serviceFilter instanceof Set
      ? filters.serviceFilter
      : new Set(filters.serviceFilter)
    : null;
  if (serviceSet && serviceSet.size === 0) return [];

  const mealKindFilter = filters.mealKindFilter || "all";
  const locSet =
    (filters.locacionIds || []).length > 0
      ? new Set((filters.locacionIds || []).map(String))
      : null;
  const artistSet =
    (filters.artistaIds || []).length > 0
      ? new Set((filters.artistaIds || []).map(String))
      : null;

  return list.filter((r) => {
    const servicio =
      r?.servicio ||
      mealServicioFromEvent(r) ||
      null;
    if (serviceSet && !serviceSet.has(servicio)) return false;

    if (r?.isTemp) {
      if (mealKindFilter === "catering") return false;
      if (servicio === CATERING_SERVICE) return false;
      return true;
    }

    if (!passesMealKindFilter(r, mealKindFilter)) return false;

    if (locSet) {
      const id = r.id_locacion ?? r.locaciones?.id ?? r.locKey;
      const locKey =
        id == null || id === "" || id === MEAL_FILTER_NO_LOC
          ? MEAL_FILTER_NO_LOC
          : String(id);
      if (!locSet.has(locKey)) return false;
    }

    if (artistSet && !mealRowMatchesArtistFilter(r, artistSet)) {
      return false;
    }

    return true;
  });
}

/**
 * Normaliza un texto al tipo canÃ³nico (Desayuno|Almuerzo|Merienda|Cena) si comienza con Ã©l.
 * "Merienda a bordo" â "Merienda"; "Almuerzo (Vianda)" â "Almuerzo".
 */
export function normalizeMealServiceBase(servicioOrLabel) {
  if (!servicioOrLabel) return null;
  const raw = String(servicioOrLabel).trim();
  if (MEAL_SERVICE_ORDER[raw] != null) return raw;
  const lower = raw.toLowerCase();
  for (const base of MEAL_SERVICES) {
    if (lower === base.toLowerCase()) return base;
    if (
      lower.startsWith(`${base.toLowerCase()} `) ||
      lower.startsWith(`${base.toLowerCase()}(`)
    ) {
      return base;
    }
  }
  return null;
}

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Etiqueta visible: "{tipo}" o "{tipo} {detalle}".
 * Si el detalle ya incluye el tipo al inicio, se usa tal cual.
 * Ej: ("Merienda", "a bordo") â "Merienda a bordo"
 *     ("Almuerzo", "(Vianda)") â "Almuerzo (Vianda)"
 */
export function formatMealServiceLabel(servicio, detalle) {
  const base = normalizeMealServiceBase(servicio) || String(servicio || "").trim();
  if (!base) return String(detalle || "").trim();
  const d = String(detalle || "").trim();
  if (!d) return base;
  if (normalizeMealServiceBase(d) === base && d.toLowerCase().startsWith(base.toLowerCase())) {
    return d;
  }
  // " (Vianda)" o "(Vianda)" pegado al tipo sin espacio extra raro
  if (d.startsWith("(")) return `${base} ${d}`;
  return `${base} ${d}`;
}

/** Quita del final de un texto los sufijos auto (grupos / Gira) y + intermedios. */
export function stripMealAutoDescriptionSuffix(plain, extraLabels = []) {
  let text = String(plain || "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  const known = [
    ...extraLabels,
    ...MEAL_AUTO_DESCRIPTION_SUFFIXES,
  ]
    .map((l) => String(l || "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  // Quitar una o mÃ¡s etiquetas conocidas al final (con + / espacios).
  let guard = 0;
  while (text && guard < 24) {
    guard += 1;
    let matched = false;
    for (const label of known) {
      if (text === label) {
        text = "";
        matched = true;
        break;
      }
      if (text.endsWith(label)) {
        const start = text.length - label.length;
        const sep = start > 0 && /[\s+]/.test(text[start - 1]) ? start - 1 : start;
        // Solo cortar si hay separador o inicio (evita recortar "Locales" de "NoLocales")
        if (sep === start || /[\s+]/.test(text[sep])) {
          text = text.slice(0, sep).replace(/[\s+]+$/g, "").trim();
          matched = true;
          break;
        }
      }
    }
    if (!matched) break;
  }
  return text;
}

/**
 * Extrae el "otros detalles" del servicio a partir de la descripciÃ³n.
 * "Merienda a bordo Solo alojados" + base Merienda â "a bordo"
 * "Almuerzo (Vianda)" â "(Vianda)"
 */
export function parseMealServiceDetalle(descripcion, servicio, extraLabels = []) {
  const base = normalizeMealServiceBase(servicio);
  if (!base) return "";
  const plain = stripMealAutoDescriptionSuffix(
    stripHtml(descripcion).replace(/\s+/g, " ").trim(),
    extraLabels,
  );
  if (!plain) return "";

  const lower = plain.toLowerCase();
  const baseLower = base.toLowerCase();
  if (lower === baseLower) return "";

  if (lower.startsWith(baseLower)) {
    const rest = plain.slice(base.length).trim();
    // Resto solo grupos ya se limpia; si sobra "a bordo" lo devolvemos.
    return rest;
  }
  return "";
}

/** Etiqueta completa: nombre real del tipo de evento (o legacy desde descripciÃ³n). */
export function mealDisplayLabelFromEvent(evt, extraLabels = []) {
  const typeName =
    evt?.tipos_evento?.nombre ||
    evt?.tipo_nombre ||
    evt?.tipoNombre ||
    null;
  if (typeName) return String(typeName).trim();

  const base = mealServicioFromEvent(evt);
  if (!base) return null;

  if (evt?.servicio_detalle != null && String(evt.servicio_detalle).trim()) {
    return formatMealServiceLabel(base, evt.servicio_detalle);
  }
  if (evt?.servicioDetalle != null && String(evt.servicioDetalle).trim()) {
    return formatMealServiceLabel(base, evt.servicioDetalle);
  }

  const fromDesc = parseMealServiceDetalle(
    evt?.descripcion,
    base,
    extraLabels,
  );
  if (fromDesc) return formatMealServiceLabel(base, fromDesc);
  return base;
}

/**
 * Reescribe el prefijo de servicio en la descripciÃ³n al cambiar el detalle.
 * Conserva el resto (convocados, notas).
 */
export function rewriteMealDescriptionServiceLabel(
  existingHtml,
  oldLabel,
  newLabel,
) {
  const plain = stripHtml(existingHtml).replace(/\s+/g, " ").trim();
  const next = String(newLabel || "").trim();
  if (!next) return existingHtml || "";

  if (!plain) return `${next} Gira`;

  const prev = String(oldLabel || "").trim();
  if (prev && plain.toLowerCase().startsWith(prev.toLowerCase())) {
    const rest = plain.slice(prev.length);
    const merged = `${next}${rest}`.trim();
    if (
      existingHtml &&
      existingHtml !== plain &&
      typeof existingHtml.includes === "function" &&
      existingHtml.includes(prev)
    ) {
      return existingHtml.replace(prev, next);
    }
    return merged;
  }

  // Intento con solo el tipo canÃ³nico al inicio
  const base = normalizeMealServiceBase(next) || normalizeMealServiceBase(prev);
  if (base && plain.toLowerCase().startsWith(base.toLowerCase())) {
    const rest = plain.slice(base.length);
    const merged = `${next}${rest}`.trim();
    if (
      existingHtml &&
      existingHtml !== plain &&
      existingHtml.includes(base)
    ) {
      // Reemplazar solo la primera ocurrencia del tipo
      return existingHtml.replace(new RegExp(escapeRegex(base)), next);
    }
    return merged;
  }

  return existingHtml || plain;
}

/** CSS de badges de servicio para la ventana de impresiÃ³n (selector `span.` para ganar a `span.rounded`). */
export function buildMealServicePrintBadgeCss() {
  const byClass = new Map();
  Object.values(MEAL_SERVICE_STYLES).forEach((style) => {
    const p = style.print;
    if (p?.bgClass) byClass.set(p.bgClass, p);
  });
  return Array.from(byClass.values())
    .map(
      (p) =>
        `span.${p.bgClass} { background-color: ${p.bg}; color: ${p.color}; border-color: ${p.border}; }`,
    )
    .join("\n    ");
}

/**
 * Clave ordenable fecha+servicio (misma lÃ³gica que la matriz de comidas).
 * Ej: vie 19/06 Merienda > vie 19/06 Almuerzo > jue 18/06 Cena
 */
export function mealSlotKey(date, servicio) {
  if (!date) return null;
  const day = String(date).slice(0, 10).replaceAll("-", "");
  const slot = MEAL_SERVICE_ORDER[servicio] ?? 0;
  return parseInt(`${day}${slot}`, 10);
}

function resolveCoverageService(coverage, fallback) {
  if (!coverage) return fallback;
  if (coverage.svc) {
    return (
      mealBaseFromTypeName(coverage.svc) ||
      normalizeMealServiceBase(coverage.svc) ||
      coverage.svc
    );
  }
  if (coverage.id_tipo_evento != null) {
    return (
      MEAL_TYPE_ID_TO_SERVICE[coverage.id_tipo_evento] ||
      mealBaseFromTypeName(coverage.nombre || coverage.tipos_evento?.nombre) ||
      fallback
    );
  }
  return fallback;
}

/** LÃ­mites de cobertura calculados en logÃ­stica por persona. */
export function getMealCoverageBounds(logistics) {
  const start = logistics?.comida_inicio;
  const end = logistics?.comida_fin;
  const startDate = start?.date || null;
  const endDate = end?.date || null;

  return {
    startKey: startDate
      ? mealSlotKey(startDate, resolveCoverageService(start, "Desayuno"))
      : null,
    endKey: endDate
      ? mealSlotKey(endDate, resolveCoverageService(end, "Cena"))
      : null,
    hasAny: Boolean(startDate || endDate),
  };
}

/**
 * Â¿La persona tiene cobertura de comida para este slot (fecha + servicio)?
 * Usa comida_inicio / comida_fin de su regla logÃ­stica (por persona, categorÃ­a, etc.).
 */
export function isPersonEligibleForMealSlot(
  person,
  { fecha, servicio, convocados, hora, grupoIds },
  options = {},
) {
  if (!person || person.estado_gira !== "confirmado") return false;
  // BebÃ© en cuna: no consume, fuera de cualquier criterio de convocados.
  if (isPersonInCuna(person)) return false;
  if (
    options.cunaExcluidosIds?.length &&
    options.cunaExcluidosIds.some((id) => String(id) === String(person.id))
  ) {
    return false;
  }

  if (convocados?.length) {
    if (
      !isUserConvoked(convocados, person, {
        ...options,
        fecha,
        servicio,
      })
    ) {
      return false;
    }
  }

  const requiredGrupos = [
    ...new Set((grupoIds || []).map(Number).filter(Number.isFinite)),
  ];
  if (requiredGrupos.length > 0) {
    let mine;
    if (options.personGrupoIds instanceof Set) {
      mine = options.personGrupoIds;
    } else {
      const fromMap = options.integranteGruposMap?.get(String(person.id));
      if (fromMap != null) {
        mine = new Set(
          (fromMap || [])
            .map((g) => Number(g?.id ?? g))
            .filter(Number.isFinite),
        );
      } else {
        mine = new Set(
          resolvePersonGrupoIds(person)
            .map(Number)
            .filter(Number.isFinite),
        );
      }
    }
    if (!requiredGrupos.some((id) => mine.has(id))) return false;
  }

  // Convocatoria explÃ­cita por residencia (LOC:): cuenta a quienes viven
  // en esa ciudad aunque el tramo activo sea otra sede o el slot quede
  // fuera de comida_inicio/fin (p. ej. vianda de regreso el dÃ­a siguiente).
  // No aplica a quien entrÃ³ solo por GRP:/ENS:/FAM: vÃ­a OR en la misma lista.
  if (
    Array.isArray(convocados) &&
    convocados.some(
      (tag) =>
        String(tag).startsWith("LOC:") &&
        personMatchesLocConvocadoTag(person, tag),
    )
  ) {
    return true;
  }

  const isLocalNow =
    options.segments?.length > 0
      ? isLocalAtMealSlot(person, fecha, servicio, options.segments, hora)
      : person.is_local;

  // Catering usa slot sintÃ©tico 4 (despuÃ©s de Cena). La cobertura logÃ­stica
  // solo define DâC; comparar por slot dejarÃ­a fuera a todos los viajeros.
  // Criterio: dÃ­a calendario dentro de comida_inicio..comida_fin (inclusive).
  if (servicio === CATERING_SERVICE) {
    const day = String(fecha || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const startDate = person.logistics?.comida_inicio?.date
      ? String(person.logistics.comida_inicio.date).slice(0, 10)
      : null;
    const endDate = person.logistics?.comida_fin?.date
      ? String(person.logistics.comida_fin.date).slice(0, 10)
      : null;
    const hasAny = Boolean(startDate || endDate);
    if (!isLocalNow && !hasAny) return false;
    if (startDate && day < startDate) return false;
    if (endDate && day > endDate) return false;
    return true;
  }

  const mealKey = mealSlotKey(fecha, servicio);
  if (mealKey == null) return false;

  const { startKey, endKey, hasAny } = getMealCoverageBounds(person.logistics);

  if (!isLocalNow && !hasAny) return false;
  if (startKey != null && mealKey < startKey) return false;
  if (endKey != null && mealKey > endKey) return false;

  return true;
}

/**
 * Resuelve el slot canÃ³nico D/A/M/C de un evento de comida, o `Catering`.
 * Prioriza el nombre del tipo (primera palabra), luego ids 7â10, luego `servicio` en fila.
 */
export function mealServicioFromEvent(evt) {
  if (isCateringEvent(evt)) return CATERING_SERVICE;

  const fromTypeName = mealBaseFromTypeName(evt?.tipos_evento?.nombre);
  if (fromTypeName) return fromTypeName;

  if (evt?.id_tipo_evento != null && MEAL_TYPE_ID_TO_SERVICE[evt.id_tipo_evento]) {
    return MEAL_TYPE_ID_TO_SERVICE[evt.id_tipo_evento];
  }

  if (evt?.servicio) {
    if (String(evt.servicio).trim() === CATERING_SERVICE) return CATERING_SERVICE;
    return (
      mealBaseFromTypeName(evt.servicio) ||
      normalizeMealServiceBase(evt.servicio) ||
      evt.servicio
    );
  }
  return null;
}

/**
 * IDs de `giras_grupos` asignados al evento/fila de comida.
 * Si `selectedGrupos` es un array (aunque vacÃ­o), es la fuente de verdad del Manager
 * â asÃ­ vaciar grupos no queda âpegadoâ al embed `eventos_grupos` hasta el save.
 * @param {object} row
 * @returns {number[]}
 */
export function mealRowGrupoIds(row) {
  if (!row || row.isTemp) return [];
  if (Array.isArray(row.selectedGrupos)) {
    return [
      ...new Set(row.selectedGrupos.map(Number).filter(Number.isFinite)),
    ];
  }
  const fromEmbed = (row.eventos_grupos || [])
    .map((eg) => Number(eg?.id_grupo ?? eg?.giras_grupos?.id ?? eg))
    .filter(Number.isFinite);
  if (fromEmbed.length) return [...new Set(fromEmbed)];
  const fromGrupos = (row.grupos || [])
    .map((g) => Number(g?.id ?? g))
    .filter(Number.isFinite);
  return [...new Set(fromGrupos)];
}

/**
 * Â¿La fila tiene audiencia OFRN (convocados y/o grupos de convocatoria)?
 * - `GRP:NONE` â no (artistas FIMBA siguen aditivos).
 * - Ambos ejes vacÃ­os â no (catering solo-artista).
 * - Un eje vacÃ­o no filtra (AND); grupos sin convocados sÃ­ cuentan OFRN.
 * @param {object} row
 * @returns {boolean}
 */
export function mealRowHasOfrnAudience(row) {
  if (!row || row.isTemp) return false;
  if (isNobodyConvocados(row.convocados)) return false;
  const hasConv =
    Array.isArray(row.convocados) && row.convocados.length > 0;
  if (hasConv) return true;
  return mealRowGrupoIds(row).length > 0;
}

/**
 * Campos de fila cuya ediciÃ³n cambia elegibilidad / pax / deducciÃ³n / aviso de turno.
 * Tras mutarlos, el Manager debe refrescar el estado derivado de **todo** el turno
 * (`mealTurnoKey` = fecha|servicio), no solo la fila editada.
 */
export const MEAL_PAX_AFFECTING_FIELDS = Object.freeze([
  "convocados",
  "selectedGrupos",
  "propuestas",
  "id_locacion",
  "fecha",
  "hora_inicio",
  "id_tipo_evento",
  "servicio",
]);

export function isMealPaxAffectingField(field) {
  return MEAL_PAX_AFFECTING_FIELDS.includes(field);
}

/** Evento general / orquesta: sin `eventos_grupos`. */
export function isOrchestraMealRow(row) {
  if (!row || row.isTemp) return false;
  return mealRowGrupoIds(row).length === 0;
}

/** Evento con â¥1 grupo de convocatoria. */
export function isGrupoMealRow(row) {
  if (!row || row.isTemp) return false;
  return mealRowGrupoIds(row).length > 0;
}

/**
 * Clave locaciÃ³n-aware: fecha + servicio + id_locacion.
 * Conservada por compatibilidad; la **deducciÃ³n** orquestaâgrupo usa `mealTurnoKey`
 * (misma fecha/servicio aunque el lugar difiera).
 */
export function mealCoincidenceKey(row) {
  if (!row) return null;
  const turno = mealTurnoKey(row);
  if (!turno) return null;
  const locRaw = row.id_locacion;
  const loc =
    locRaw == null || locRaw === "" ? "â" : String(Number(locRaw) || locRaw);
  return `${turno}|${loc}`;
}

/**
 * Turno de comida = misma fecha + mismo servicio (D/A/M/C/Catering),
 * **sin** locaciÃ³n. Usado para:
 * - deducciÃ³n orquestaâgrupo (grupo tiene prioridad; orquesta resta esos IDs)
 * - sobre-inclusiÃ³n (persona en â¥2 comidas del turno)
 */
export function mealTurnoKey(row) {
  if (!row) return null;
  const fecha = String(row.fecha || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const servicio = row.servicio || mealServicioFromEvent(row) || "";
  if (!servicio) return null;
  return `${fecha}|${servicio}`;
}

/**
 * Detecta sobre-inclusiÃ³n: personas OFRN (y tags FIMBA) que aparecen en
 * â¥2 comidas del mismo turno (`mealTurnoKey`), usando el set **post-deducciÃ³n**
 * orquestaâgrupo cuando se pasa `getEligiblePeople` ya deducido.
 *
 * @param {Array} rows â filas de comida (ignora isTemp)
 * @param {(row: object) => Array} getEligiblePeople â elegibles OFRN por fila
 * @returns {{
 *   people: Array<{ id: number, person: object, eventIds: string[], turnoKey: string }>,
 *   artists: Array<{ id: number|string, nombre: string, eventIds: string[], turnoKey: string }>,
 *   byEventId: Map<string, { personIds: Set<string>, artistIds: Set<string> }>,
 *   personCount: number,
 *   artistCount: number,
 * }}
 */
export function findMealTurnoOverInclusions(rows = [], getEligiblePeople) {
  const byTurno = new Map();
  for (const row of rows || []) {
    if (!row || row.isTemp) continue;
    const turno = mealTurnoKey(row);
    if (!turno) continue;
    if (!byTurno.has(turno)) byTurno.set(turno, []);
    byTurno.get(turno).push(row);
  }

  const people = [];
  const artists = [];
  const byEventId = new Map();

  const touchEvent = (eventId, kind, key) => {
    const id = String(eventId);
    if (!byEventId.has(id)) {
      byEventId.set(id, { personIds: new Set(), artistIds: new Set() });
    }
    const bucket = byEventId.get(id);
    if (kind === "person") bucket.personIds.add(String(key));
    else bucket.artistIds.add(String(key));
  };

  for (const [turnoKey, turnoRows] of byTurno) {
    if (turnoRows.length < 2) continue;

    /** @type {Map<string, { person: object, eventIds: string[] }>} */
    const personMap = new Map();
    for (const row of turnoRows) {
      const list =
        typeof getEligiblePeople === "function"
          ? getEligiblePeople(row) || []
          : [];
      for (const p of list) {
        const id = Number(p?.id);
        if (!Number.isFinite(id)) continue;
        const key = String(id);
        if (!personMap.has(key)) {
          personMap.set(key, { person: p, eventIds: [] });
        }
        const entry = personMap.get(key);
        const eid = String(row.id);
        if (!entry.eventIds.includes(eid)) entry.eventIds.push(eid);
      }
    }
    for (const [key, entry] of personMap) {
      if (entry.eventIds.length < 2) continue;
      people.push({
        id: Number(key),
        person: entry.person,
        eventIds: entry.eventIds,
        turnoKey,
      });
      for (const eid of entry.eventIds) touchEvent(eid, "person", key);
    }

    /** @type {Map<string, { nombre: string, eventIds: string[] }>} */
    const artistMap = new Map();
    for (const row of turnoRows) {
      for (const prop of row.propuestas || []) {
        if (!prop || prop.requiere_comidas === false) continue;
        const pid = prop.id ?? prop.id_propuesta;
        if (pid == null || pid === "") continue;
        const key = String(pid);
        if (!artistMap.has(key)) {
          artistMap.set(key, {
            nombre: prop.nombre || `Artista ${pid}`,
            eventIds: [],
          });
        }
        const entry = artistMap.get(key);
        const eid = String(row.id);
        if (!entry.eventIds.includes(eid)) entry.eventIds.push(eid);
      }
    }
    for (const [key, entry] of artistMap) {
      if (entry.eventIds.length < 2) continue;
      artists.push({
        id: Number.isFinite(Number(key)) ? Number(key) : key,
        nombre: entry.nombre,
        eventIds: entry.eventIds,
        turnoKey,
      });
      for (const eid of entry.eventIds) touchEvent(eid, "artist", key);
    }
  }

  return {
    people,
    artists,
    byEventId,
    personCount: people.length,
    artistCount: artists.length,
  };
}

/** Texto del badge de comensales: `n OFRN - m artistas` (omitiendo lados en 0). */
export function formatComensalesBadgeLabel(ofrnCount, artistPax) {
  const n = Math.max(0, Number(ofrnCount) || 0);
  const m = Math.max(0, Number(artistPax) || 0);
  if (n === 0 && m === 0) return "0";
  if (n === 0) return `${m} artista${m === 1 ? "" : "s"}`;
  if (m === 0) return `${n} OFRN`;
  return `${n} OFRN Â· ${m} artista${m === 1 ? "" : "s"}`;
}

/**
 * Columnas de Control de Asistencia: una por turno (`mealTurnoKey` =
 * fecha|servicio), agrupando N eventos concurrentes del mismo servicio.
 *
 * @param {Array} events â eventos meal ya filtrados (vista)
 * @returns {Array<{
 *   turnoKey: string,
 *   fecha: string,
 *   servicio: string,
 *   events: object[],
 *   hora_inicio: string|null,
 *   multiEvent: boolean,
 * }>}
 */
export function buildMealAttendanceTurnColumns(events = []) {
  /** @type {Map<string, { turnoKey: string, fecha: string, servicio: string, events: object[] }>} */
  const byTurno = new Map();
  for (const evt of events || []) {
    if (!evt) continue;
    const servicio = evt.servicio || mealServicioFromEvent(evt) || "";
    const fecha = String(evt.fecha || "").slice(0, 10);
    const key = mealTurnoKey(evt) || (fecha && servicio ? `${fecha}|${servicio}` : null);
    if (!key) continue;
    if (!byTurno.has(key)) {
      byTurno.set(key, {
        turnoKey: key,
        fecha,
        servicio,
        events: [],
      });
    }
    byTurno.get(key).events.push(evt);
  }

  const cols = Array.from(byTurno.values());
  for (const col of cols) {
    col.events.sort(compareMealManagerRows);
    const horas = [
      ...new Set(
        col.events
          .map((e) => String(e?.hora_inicio || "").trim().slice(0, 5))
          .filter(Boolean),
      ),
    ];
    col.hora_inicio = horas.length === 1 ? horas[0] : null;
    col.multiEvent = col.events.length > 1;
  }
  cols.sort((a, b) =>
    compareMealManagerRows(a.events[0] || a, b.events[0] || b),
  );
  return cols;
}

/**
 * Evento del turno donde la persona realmente come (post-deducciÃ³n /
 * elegibilidad). Preferencia: comida de grupo â primer evento por orden
 * estable (`compareMealManagerRows`).
 *
 * @param {object[]} turnoEvents
 * @param {object} person
 * @param {(evt: object, person: object) => boolean} isEligibleFn
 * @returns {object|null}
 */
export function resolveAttendanceEventForPerson(
  turnoEvents,
  person,
  isEligibleFn,
) {
  const eligible = (turnoEvents || []).filter(
    (e) => typeof isEligibleFn === "function" && isEligibleFn(e, person),
  );
  if (eligible.length === 0) return null;
  if (eligible.length === 1) return eligible[0];
  const grupo = eligible.filter(isGrupoMealRow);
  const pool = grupo.length > 0 ? grupo : eligible;
  return [...pool].sort(compareMealManagerRows)[0] || null;
}

/**
 * Estado de asistencia a mostrar en una celda de turno.
 * Si hay varios registros (sobre-inclusiÃ³n residual), prioriza P > A > vacÃ­o.
 *
 * @param {Array<'P'|'A'|null|undefined|string>} statuses
 * @returns {'P'|'A'|null}
 */
export function mergeAttendanceStatuses(statuses = []) {
  const list = (statuses || []).filter(Boolean);
  if (list.includes("P")) return "P";
  if (list.includes("A")) return "A";
  return null;
}

/**
 * Comidas de grupo que coinciden en el mismo turno (`mealTurnoKey` =
 * fecha|servicio) con un evento orquesta/general â aunque la locaciÃ³n difiera.
 * El grupo tiene prioridad; la orquesta resta esos comensales.
 */
export function findCoincidingGrupoMealRows(orchestraRow, allRows = []) {
  if (!isOrchestraMealRow(orchestraRow)) return [];
  const key = mealTurnoKey(orchestraRow);
  if (!key) return [];
  return (allRows || []).filter(
    (r) =>
      r &&
      !r.isTemp &&
      String(r.id) !== String(orchestraRow.id) &&
      isGrupoMealRow(r) &&
      mealTurnoKey(r) === key,
  );
}

/**
 * Resta del headcount/listado orquesta a quienes ya comen en un evento de grupo
 * del mismo turno (fecha + servicio; locaciÃ³n irrelevante). Ausentes ya fuera vÃ­a roster.
 *
 * @param {Array} orchestraEligible â personas elegibles de la fila orquesta
 * @param {Array} coincidingGrupoRows
 * @param {(grupoRow: object) => Array} getGrupoEligiblePeople
 * @returns {{ people: Array, deducted: Array, deductedIds: Set<number>, deductedCount: number }}
 */
export function deductGrupoMembersFromOrchestraEligible(
  orchestraEligible,
  coincidingGrupoRows,
  getGrupoEligiblePeople,
) {
  const deductedIds = new Set();
  for (const gRow of coincidingGrupoRows || []) {
    const people =
      typeof getGrupoEligiblePeople === "function"
        ? getGrupoEligiblePeople(gRow) || []
        : [];
    for (const p of people) {
      const id = Number(p?.id);
      if (Number.isFinite(id)) deductedIds.add(id);
    }
  }
  const list = Array.isArray(orchestraEligible) ? orchestraEligible : [];
  if (deductedIds.size === 0) {
    return {
      people: list,
      deducted: [],
      deductedIds,
      deductedCount: 0,
    };
  }
  const people = [];
  const deducted = [];
  for (const p of list) {
    const id = Number(p?.id);
    if (Number.isFinite(id) && deductedIds.has(id)) deducted.push(p);
    else people.push(p);
  }
  return {
    people,
    deducted,
    deductedIds,
    deductedCount: deducted.length,
  };
}

/**
 * Comida/catering solo-artista FIMBA (misma regla que agenda OFRN):
 * `audiencia_ofrn === 'none'`, sin `eventos_grupos`, sin `id_gira_transporte`.
 * El Manager OFRN las oculta; FIMBA Comidas (`fimbaMode`) las mantiene.
 * @see isFimbaOnlyAgendaEvent
 */
export function isFimbaArtistOnlyMealEvent(item) {
  return isFimbaOnlyAgendaEvent(item);
}

/**
 * Pax FIMBA de artistas tagueados en un evento de comida (tope hotel/comida).
 * Respeta `requiere_comidas === false`. Extra equip. no suma.
 */
export function fimbaArtistMealPax(propuestas = []) {
  let total = 0;
  for (const p of propuestas || []) {
    if (!p || p.requiere_comidas === false) continue;
    total += Math.max(0, Number(p.cantidad_planificada) || 0);
  }
  return total;
}

/**
 * Etiqueta de columna para dieta de un participante FIMBA en MealsReport.
 * Presets â label canÃ³nico; `otro` / nota libre â Â«OtrosÂ» (evita N columnas por nota).
 * @param {{ tipo_alimentacion?: string|null, nota_alimentacion?: string|null }} part
 * @param {(tipo: string|null|undefined, nota?: string|null|undefined) => string} labelFn
 */
export function fimbaParticipanteDietReportLabel(part, labelFn) {
  const tipo = String(part?.tipo_alimentacion || "regular")
    .trim()
    .toLowerCase();
  if (tipo === "otro") return "Otros";
  const labeled =
    typeof labelFn === "function"
      ? labelFn(part?.tipo_alimentacion, part?.nota_alimentacion)
      : "";
  if (labeled && labeled !== "â") return labeled;
  return "Regular";
}

/**
 * Desglose de pax artistas FIMBA por dieta (nominados) + residuo sin nominar.
 * Total = Î£ dietas + residualArt (= `fimbaArtistMealPax` cuando hay cupo planificado).
 *
 * @param {Array<{ id?: unknown, cantidad_planificada?: number, requiere_comidas?: boolean }>} propuestas
 * @param {Map<string, Array<{ activo?: boolean, tipo_alimentacion?: string|null, nota_alimentacion?: string|null }>>|Record<string, Array>} participantesByPropuestaId
 * @param {(tipo: string|null|undefined, nota?: string|null|undefined) => string} [labelFn]
 * @returns {{ dietCounts: Record<string, number>, residualArt: number, total: number }}
 */
export function fimbaArtistMealDietBreakdown(
  propuestas = [],
  participantesByPropuestaId = new Map(),
  labelFn,
) {
  const dietCounts = {};
  let residualArt = 0;
  let total = 0;

  const lookup = (id) => {
    if (id == null || id === "") return [];
    const key = String(id);
    if (participantesByPropuestaId instanceof Map) {
      return participantesByPropuestaId.get(key) || [];
    }
    return participantesByPropuestaId[key] || [];
  };

  for (const p of propuestas || []) {
    if (!p || p.requiere_comidas === false) continue;
    const plan = Math.max(0, Number(p.cantidad_planificada) || 0);
    const parts = lookup(p.id);
    const activos = (parts || []).filter((x) => x.activo !== false);

    let nominados = 0;
    for (const part of activos) {
      const label = fimbaParticipanteDietReportLabel(part, labelFn);
      dietCounts[label] = (dietCounts[label] || 0) + 1;
      nominados += 1;
    }

    if (plan === 0 && nominados > 0) {
      total += nominados;
      continue;
    }
    const residual = Math.max(0, plan - nominados);
    residualArt += residual;
    total += plan;
  }

  return { dietCounts, residualArt, total };
}

/**
 * Detalle libre del nombre de tipo (todo despuÃ©s del tipo base).
 * "Merienda a bordo" â "a bordo"; "Almuerzo" â "".
 */
export function mealDetalleFromTypeName(nombre) {
  const base = mealBaseFromTypeName(nombre);
  if (!base || !nombre) return "";
  const raw = String(nombre).trim();
  if (raw.toLowerCase() === base.toLowerCase()) return "";
  if (raw.toLowerCase().startsWith(base.toLowerCase())) {
    return raw.slice(base.length).trim();
  }
  return "";
}

function mapMealTypeRow(t) {
  const isCatering =
    Number(t.id_categoria) === CATERING_CATEGORY_ID ||
    String(t.categorias_tipos_eventos?.nombre || "")
      .trim()
      .toLowerCase() === "catering" ||
    String(t.nombre || "")
      .trim()
      .toLowerCase() === "catering";
  return {
    ...t,
    is_catering: isCatering,
    servicio: isCatering
      ? CATERING_SERVICE
      : mealBaseFromTypeName(t.nombre) || null,
    detalle: isCatering ? "" : mealDetalleFromTypeName(t.nombre),
  };
}

/** Tipos de categorÃ­a Comidas (id 4) â editor de tipos D/A/M/C. */
export async function fetchMealEventTypes(supabase) {
  const { data, error } = await supabase
    .from("tipos_evento")
    .select("id, nombre, color, id_categoria, categorias_tipos_eventos ( id, nombre )")
    .eq("id_categoria", MEAL_CATEGORY_ID)
    .order("nombre", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapMealTypeRow);
}

/**
 * Tipos Comidas + Catering para el gestor (selectores / alta).
 * Resuelve Catering por id conocido o por nombre de categoría.
 */
export async function fetchMealRelatedEventTypes(supabase) {
  const { data, error } = await supabase
    .from("tipos_evento")
    .select("id, nombre, color, id_categoria, categorias_tipos_eventos ( id, nombre )")
    .order("nombre", { ascending: true });
  if (error) throw error;
  return (data || [])
    .filter((t) => {
      const cat = Number(t.id_categoria);
      if (cat === MEAL_CATEGORY_ID || cat === CATERING_CATEGORY_ID) return true;
      const catName = String(t.categorias_tipos_eventos?.nombre || "")
        .trim()
        .toLowerCase();
      return catName === "catering";
    })
    .map(mapMealTypeRow);
}

/**
 * Persistencia de `hora_fin` al guardar eventos.
 * Comidas/Catering: nunca inventar fin desde inicio — vacío → null.
 * Otros tipos: conserva el fallback histórico (fin = inicio si falta).
 */
export function resolveEventHoraFinForSave(horaFin, horaInicio, eventLike) {
  const raw = String(horaFin || "").trim().slice(0, 5);
  if (isMealRelatedEvent(eventLike)) {
    return raw || null;
  }
  const start = String(horaInicio || "").trim().slice(0, 5);
  return raw || start || null;
}

/** Servicios que deben estar cubiertos en la ventana de un artista FIMBA. */
export const MEAL_ARTIST_COVERAGE_REQUIRED = Object.freeze([
  "Almuerzo",
  "Merienda",
  "Cena",
]);

function addOneCalendarDay(isoDate) {
  const d = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Enumera slots requeridos (fecha + servicio) entre bookends inclusive.
 * No exige servicios anteriores al primer tagged ni posteriores al último.
 *
 * @param {string} startFecha YYYY-MM-DD
 * @param {string} startServicio
 * @param {string} endFecha
 * @param {string} endServicio
 * @param {string[]} [requiredServices]
 * @returns {{ fecha: string, servicio: string, slotKey: number }[]}
 */
export function enumerateRequiredMealSlotsInWindow(
  startFecha,
  startServicio,
  endFecha,
  endServicio,
  requiredServices = MEAL_ARTIST_COVERAGE_REQUIRED,
) {
  const startKey = mealSlotKey(startFecha, startServicio);
  const endKey = mealSlotKey(endFecha, endServicio);
  if (startKey == null || endKey == null || startKey > endKey) return [];

  const startDay = String(startFecha).slice(0, 10);
  const endDay = String(endFecha).slice(0, 10);
  const out = [];
  let cursor = startDay;
  while (cursor <= endDay) {
    for (const servicio of requiredServices) {
      const key = mealSlotKey(cursor, servicio);
      if (key == null) continue;
      if (key < startKey || key > endKey) continue;
      out.push({ fecha: cursor, servicio, slotKey: key });
    }
    cursor = addOneCalendarDay(cursor);
    if (out.length > 5000) break;
  }
  return out;
}

/**
 * Cobertura de comidas por artista FIMBA (tags en eventos).
 * Ventana = primer → último servicio tagged (orden fecha + MEAL_SERVICE_ORDER).
 * Dentro de la ventana exige Almuerzo/Merienda/Cena (bookends respetados).
 * Desayuno/Catering pueden anclar el borde pero no se exigen.
 *
 * @param {Array<{ fecha?: string, servicio?: string, propuestas?: Array<{ id?: unknown, nombre?: string, requiere_comidas?: boolean, estado?: string }>, rawEvent?: object }>} mealRows
 * @param {{ requiredServices?: string[], resolveServicio?: (row: object) => string|null }} [opts]
 * @returns {{ artistaId: string, artistaNombre: string, first: object|null, last: object|null, presentCount: number, missing: Array<{ fecha: string, servicio: string }>, ok: boolean }[]}
 */
export function findFimbaArtistMealCoverageGaps(mealRows = [], opts = {}) {
  const required = opts.requiredServices || MEAL_ARTIST_COVERAGE_REQUIRED;
  const resolveServicio =
    opts.resolveServicio ||
    ((row) =>
      row?.servicio ||
      mealServicioFromEvent(row?.rawEvent || row) ||
      null);

  /** @type {Map<string, { id: string, nombre: string, slots: { fecha: string, servicio: string, slotKey: number }[] }>} */
  const byArtist = new Map();

  for (const row of mealRows || []) {
    const fecha = String(row?.fecha || "").slice(0, 10);
    if (!fecha) continue;
    const servicio = resolveServicio(row);
    if (!servicio) continue;
    const slotKey = mealSlotKey(fecha, servicio);
    if (slotKey == null) continue;

    const props = row.propuestas || [];
    for (const p of props) {
      if (!p?.id) continue;
      if (p.requiere_comidas === false) continue;
      const estado = String(p.estado || "").toLowerCase();
      if (estado === "cancelado" || estado === "rechazado") continue;
      const id = String(p.id);
      if (!byArtist.has(id)) {
        byArtist.set(id, {
          id,
          nombre: p.nombre || `Artista ${p.id}`,
          slots: [],
        });
      }
      byArtist.get(id).slots.push({ fecha, servicio, slotKey });
    }
  }

  const results = [];
  for (const artist of byArtist.values()) {
    if (!artist.slots.length) {
      results.push({
        artistaId: artist.id,
        artistaNombre: artist.nombre,
        first: null,
        last: null,
        presentCount: 0,
        missing: [],
        ok: true,
      });
      continue;
    }
    artist.slots.sort((a, b) => a.slotKey - b.slotKey);
    const first = artist.slots[0];
    const last = artist.slots[artist.slots.length - 1];

    const presentRequired = new Set();
    for (const s of artist.slots) {
      if (required.includes(s.servicio)) {
        presentRequired.add(`${s.fecha}|${s.servicio}`);
      }
    }

    const expected = enumerateRequiredMealSlotsInWindow(
      first.fecha,
      first.servicio,
      last.fecha,
      last.servicio,
      required,
    );
    const missing = expected
      .filter((e) => !presentRequired.has(`${e.fecha}|${e.servicio}`))
      .map((e) => ({ fecha: e.fecha, servicio: e.servicio }));

    results.push({
      artistaId: artist.id,
      artistaNombre: artist.nombre,
      first: { fecha: first.fecha, servicio: first.servicio },
      last: { fecha: last.fecha, servicio: last.servicio },
      presentCount: presentRequired.size,
      missing,
      ok: missing.length === 0,
    });
  }

  return results.sort((a, b) =>
    a.artistaNombre.localeCompare(b.artistaNombre, "es", {
      sensitivity: "base",
    }),
  );
}
