import {
  isUserConvoked,
  isNobodyConvocados,
  personMatchesLocConvocadoTag,
  resolvePersonGrupoIds,
} from "./giraUtils";
import { isLocalAtMealSlot } from "./giraTramos";
import { stripHtml } from "./eventDisplayUtils";
import { isFimbaOnlyAgendaEvent } from "./agendaHelpers";

/** Orden del día para comparar inicio/fin de cobertura de comidas. */
export const MEAL_SERVICE_ORDER = {
  Desayuno: 0,
  Almuerzo: 1,
  Merienda: 2,
  Cena: 3,
  Catering: 4,
};

/** Tipos canónicos (agrupan todos los eventos de comida). */
export const MEAL_SERVICES = ["Desayuno", "Almuerzo", "Merienda", "Cena"];

/**
 * Sufijos automáticos frecuentes al final de la descripción de una comida
 * (convocados / placeholders). Usados para extraer el detalle de subcategoría.
 */
export const MEAL_AUTO_DESCRIPTION_SUFFIXES = [
  "Solo alojados",
  "Producción",
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
 * Bebé / menor en cuna (`ocupa_cama: false` en rooming): no consume, no cuenta en comidas.
 */
export function isPersonInCuna(person) {
  if (!person) return false;
  if (person.en_cuna === true) return true;
  if (person.ocupa_cama === false) return true;
  return false;
}

/** ¿El integrante está en cuna según `asignaciones_config` de las habitaciones? */
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

/** Categoría de tipos de evento de comida en `tipos_evento` / `categorias_tipos_eventos`. */
export const MEAL_CATEGORY_ID = 4;

/**
 * Categoría Catering (hermana de Comidas). Seed típico id 9; preferir nombre.
 * @see supabase/migrations/20260901140559_catering_categoria_tipo.sql
 */
export const CATERING_CATEGORY_ID = 9;
export const CATERING_CATEGORY_NAME = "Catering";
/** Slot sintético de matriz/filtro para eventos de categoría Catering. */
export const CATERING_SERVICE = "Catering";

/** IDs canónicos fijos (compatibilidad / cobertura de reglas). */
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
 * Colores de servicio de comida (fuente única para matriz, reporte, logística e impresión).
 * - `tag` / `card`: UI interactiva (texto coloreado sobre fondo suave).
 * - `reportTag`: PDF/reporte (texto negro sobre fondo resaltado).
 * - `rowHover` / `date` / `icon`: filas de eventos en logística.
 * - `print`: hex para el CSS crítico de PrintWrapper (sin Tailwind en la ventana de impresión).
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

/** ¿El id es un tipo canónico puro (sin detalle)? */
export function isCanonicalMealTypeId(id) {
  const n = Number(id);
  return n === 7 || n === 8 || n === 9 || n === 10;
}

/**
 * Tipo canónico D/A/M/C a partir del nombre del tipo de evento.
 * Regla de negocio: la **primera palabra** del nombre determina el grupo.
 * Ej: "Merienda a bordo" → Merienda; "Almuerzo (Vianda)" → Almuerzo.
 */
export function mealBaseFromTypeName(nombre) {
  if (!nombre) return null;
  const raw = String(nombre).trim();
  if (!raw) return null;
  // Primera palabra (corta en espacio o paréntesis sin espacio)
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
 * ¿Categoría Catering (no Comidas / id 4)?
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
 * ¿Este evento (o fila con tipos_evento) es de comida (categoría Comidas)?
 * Prioriza id_categoria = 4; fallback a ids 7–10 o nombre agrupable.
 * Catering NO cuenta aquí (usar `isCateringEvent` / `isMealRelatedEvent`).
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

/** Comida (cat 4 / D-A-M-C) o Catering — lo que entra al gestor de comidas. */
export function isMealRelatedEvent(evt) {
  return isMealEvent(evt) || isCateringEvent(evt);
}

/** 'comidas' | 'catering' | null */
export function mealRelatedKind(evt) {
  if (isCateringEvent(evt)) return "catering";
  if (isMealEvent(evt)) return "comidas";
  // Filas del Manager a menudo traen `servicio` canónico sin embed fresco de tipos_evento.
  const svc = String(evt?.servicio || "").trim();
  if (svc === CATERING_SERVICE) return "catering";
  if (MEAL_SERVICES.includes(svc) || normalizeMealServiceBase(svc)) return "comidas";
  return null;
}

/**
 * ¿Pasa el filtro de clase comida/catering?
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
 * Orden: fecha ASC → servicio (D/A/M/C/Catering = MEAL_SERVICE_ORDER) →
 * hora_inicio ASC → id. Misma lógica que el walk diario + Catering intercalado
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
 * Nunca muta `rows`. Vacantes (`isTemp`) ignoran locación/artista para poder crear.
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

    if (artistSet) {
      const props = r.propuestas || [];
      const ids = props
        .map((p) => (p?.id != null ? String(p.id) : null))
        .filter(Boolean);
      const matches =
        (ids.length === 0 && artistSet.has(MEAL_FILTER_NO_ARTIST)) ||
        ids.some((id) => artistSet.has(id));
      if (!matches) return false;
    }

    return true;
  });
}

/**
 * Normaliza un texto al tipo canónico (Desayuno|Almuerzo|Merienda|Cena) si comienza con él.
 * "Merienda a bordo" → "Merienda"; "Almuerzo (Vianda)" → "Almuerzo".
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
 * Ej: ("Merienda", "a bordo") → "Merienda a bordo"
 *     ("Almuerzo", "(Vianda)") → "Almuerzo (Vianda)"
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

  // Quitar una o más etiquetas conocidas al final (con + / espacios).
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
 * Extrae el "otros detalles" del servicio a partir de la descripción.
 * "Merienda a bordo Solo alojados" + base Merienda → "a bordo"
 * "Almuerzo (Vianda)" → "(Vianda)"
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

/** Etiqueta completa: nombre real del tipo de evento (o legacy desde descripción). */
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
 * Reescribe el prefijo de servicio en la descripción al cambiar el detalle.
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

  // Intento con solo el tipo canónico al inicio
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

/** CSS de badges de servicio para la ventana de impresión (selector `span.` para ganar a `span.rounded`). */
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
 * Clave ordenable fecha+servicio (misma lógica que la matriz de comidas).
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

/** Límites de cobertura calculados en logística por persona. */
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
 * ¿La persona tiene cobertura de comida para este slot (fecha + servicio)?
 * Usa comida_inicio / comida_fin de su regla logística (por persona, categoría, etc.).
 */
export function isPersonEligibleForMealSlot(
  person,
  { fecha, servicio, convocados, hora, grupoIds },
  options = {},
) {
  if (!person || person.estado_gira !== "confirmado") return false;
  // Bebé en cuna: no consume, fuera de cualquier criterio de convocados.
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

  // Convocatoria explícita por residencia (LOC:): cuenta a quienes viven
  // en esa ciudad aunque el tramo activo sea otra sede o el slot quede
  // fuera de comida_inicio/fin (p. ej. vianda de regreso el día siguiente).
  // No aplica a quien entró solo por GRP:/ENS:/FAM: vía OR en la misma lista.
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

  // Catering usa slot sintético 4 (después de Cena). La cobertura logística
  // solo define D–C; comparar por slot dejaría fuera a todos los viajeros.
  // Criterio: día calendario dentro de comida_inicio..comida_fin (inclusive).
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
 * Resuelve el slot canónico D/A/M/C de un evento de comida, o `Catering`.
 * Prioriza el nombre del tipo (primera palabra), luego ids 7–10, luego `servicio` en fila.
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
 * Si `selectedGrupos` es un array (aunque vacío), es la fuente de verdad del Manager
 * — así vaciar grupos no queda “pegado” al embed `eventos_grupos` hasta el save.
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
 * ¿La fila tiene audiencia OFRN (convocados y/o grupos de convocatoria)?
 * - `GRP:NONE` → no (artistas FIMBA siguen aditivos).
 * - Ambos ejes vacíos → no (catering solo-artista).
 * - Un eje vacío no filtra (AND); grupos sin convocados sí cuentan OFRN.
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
 * Campos de fila cuya edición cambia elegibilidad / pax / deducción / aviso de turno.
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

/** Evento con ≥1 grupo de convocatoria. */
export function isGrupoMealRow(row) {
  if (!row || row.isTemp) return false;
  return mealRowGrupoIds(row).length > 0;
}

/**
 * Clave locación-aware: fecha + servicio + id_locacion.
 * Conservada por compatibilidad; la **deducción** orquesta↔grupo usa `mealTurnoKey`
 * (misma fecha/servicio aunque el lugar difiera).
 */
export function mealCoincidenceKey(row) {
  if (!row) return null;
  const turno = mealTurnoKey(row);
  if (!turno) return null;
  const locRaw = row.id_locacion;
  const loc =
    locRaw == null || locRaw === "" ? "∅" : String(Number(locRaw) || locRaw);
  return `${turno}|${loc}`;
}

/**
 * Turno de comida = misma fecha + mismo servicio (D/A/M/C/Catering),
 * **sin** locación. Usado para:
 * - deducción orquesta↔grupo (grupo tiene prioridad; orquesta resta esos IDs)
 * - sobre-inclusión (persona en ≥2 comidas del turno)
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
 * Detecta sobre-inclusión: personas OFRN (y tags FIMBA) que aparecen en
 * ≥2 comidas del mismo turno (`mealTurnoKey`), usando el set **post-deducción**
 * orquesta↔grupo cuando se pasa `getEligiblePeople` ya deducido.
 *
 * @param {Array} rows — filas de comida (ignora isTemp)
 * @param {(row: object) => Array} getEligiblePeople — elegibles OFRN por fila
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
  return `${n} OFRN · ${m} artista${m === 1 ? "" : "s"}`;
}

/**
 * Comidas de grupo que coinciden en el mismo turno (`mealTurnoKey` =
 * fecha|servicio) con un evento orquesta/general — aunque la locación difiera.
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
 * del mismo turno (fecha + servicio; locación irrelevante). Ausentes ya fuera vía roster.
 *
 * @param {Array} orchestraEligible — personas elegibles de la fila orquesta
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
 * Presets → label canónico; `otro` / nota libre → «Otros» (evita N columnas por nota).
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
  if (labeled && labeled !== "—") return labeled;
  return "Regular";
}

/**
 * Desglose de pax artistas FIMBA por dieta (nominados) + residuo sin nominar.
 * Total = Σ dietas + residualArt (= `fimbaArtistMealPax` cuando hay cupo planificado).
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
 * Detalle libre del nombre de tipo (todo después del tipo base).
 * "Merienda a bordo" → "a bordo"; "Almuerzo" → "".
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

/** Tipos de categoría Comidas (id 4) — editor de tipos D/A/M/C. */
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
