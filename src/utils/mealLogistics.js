import { isUserConvoked, personMatchesLocConvocadoTag } from "./giraUtils";
import { isLocalAtMealSlot } from "./giraTramos";
import { stripHtml } from "./eventDisplayUtils";

/** Orden del día para comparar inicio/fin de cobertura de comidas. */
export const MEAL_SERVICE_ORDER = {
  Desayuno: 0,
  Almuerzo: 1,
  Merienda: 2,
  Cena: 3,
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

/**
 * ¿Este evento (o fila con tipos_evento) es de comida?
 * Prioriza id_categoria = 4; fallback a ids 7–10 o nombre agrupable.
 */
export function isMealEvent(evt) {
  if (!evt) return false;
  const cat =
    evt.tipos_evento?.id_categoria ??
    evt.tipos_evento?.categorias_tipos_eventos?.id ??
    evt.id_categoria;
  if (Number(cat) === MEAL_CATEGORY_ID) return true;
  if (isCanonicalMealTypeId(evt.id_tipo_evento)) return true;
  if (mealBaseFromTypeName(evt.tipos_evento?.nombre || evt.nombre)) return true;
  return false;
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
    const personGrupoIds =
      options.personGrupoIds instanceof Set
        ? options.personGrupoIds
        : options.integranteGruposMap?.get(String(person.id));
    const mine = new Set(
      (personGrupoIds || []).map((g) => Number(g?.id ?? g)).filter(Number.isFinite),
    );
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

  const mealKey = mealSlotKey(fecha, servicio);
  if (mealKey == null) return false;

  const { startKey, endKey, hasAny } = getMealCoverageBounds(person.logistics);

  const isLocalNow =
    options.segments?.length > 0
      ? isLocalAtMealSlot(person, fecha, servicio, options.segments, hora)
      : person.is_local;

  if (!isLocalNow && !hasAny) return false;
  if (startKey != null && mealKey < startKey) return false;
  if (endKey != null && mealKey > endKey) return false;

  return true;
}

/**
 * Resuelve el slot canónico D/A/M/C de un evento de comida.
 * Prioriza el nombre del tipo (primera palabra), luego ids 7–10, luego `servicio` en fila.
 */
export function mealServicioFromEvent(evt) {
  const fromTypeName = mealBaseFromTypeName(evt?.tipos_evento?.nombre);
  if (fromTypeName) return fromTypeName;

  if (evt?.id_tipo_evento != null && MEAL_TYPE_ID_TO_SERVICE[evt.id_tipo_evento]) {
    return MEAL_TYPE_ID_TO_SERVICE[evt.id_tipo_evento];
  }

  if (evt?.servicio) {
    return (
      mealBaseFromTypeName(evt.servicio) ||
      normalizeMealServiceBase(evt.servicio) ||
      evt.servicio
    );
  }
  return null;
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

export async function fetchMealEventTypes(supabase) {
  const { data, error } = await supabase
    .from("tipos_evento")
    .select("id, nombre, color, id_categoria")
    .eq("id_categoria", MEAL_CATEGORY_ID)
    .order("nombre", { ascending: true });
  if (error) throw error;
  return (data || []).map((t) => ({
    ...t,
    servicio: mealBaseFromTypeName(t.nombre) || null,
    detalle: mealDetalleFromTypeName(t.nombre),
  }));
}
