import { isUserConvoked } from "./giraUtils";
import { isLocalAtMealSlot } from "./giraTramos";

/** Orden del día para comparar inicio/fin de cobertura de comidas. */
export const MEAL_SERVICE_ORDER = {
  Desayuno: 0,
  Almuerzo: 1,
  Merienda: 2,
  Cena: 3,
};

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
  return MEAL_SERVICE_STYLES[servicio] || MEAL_SERVICE_STYLES.default;
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
  if (coverage.svc) return coverage.svc;
  if (coverage.id_tipo_evento != null) {
    return MEAL_TYPE_ID_TO_SERVICE[coverage.id_tipo_evento] || fallback;
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

/** Resuelve nombre de servicio desde fila de evento. */
export function mealServicioFromEvent(evt) {
  if (evt?.servicio) return evt.servicio;
  if (evt?.id_tipo_evento != null) {
    return MEAL_TYPE_ID_TO_SERVICE[evt.id_tipo_evento] || null;
  }
  return null;
}
