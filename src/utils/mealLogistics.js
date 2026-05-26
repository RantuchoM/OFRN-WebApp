import { isUserConvoked } from "./giraUtils";

/** Orden del día para comparar inicio/fin de cobertura de comidas. */
export const MEAL_SERVICE_ORDER = {
  Desayuno: 0,
  Almuerzo: 1,
  Merienda: 2,
  Cena: 3,
};

export const MEAL_TYPE_ID_TO_SERVICE = {
  7: "Desayuno",
  8: "Almuerzo",
  9: "Merienda",
  10: "Cena",
};

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
  { fecha, servicio, convocados },
  options = {},
) {
  if (!person || person.estado_gira !== "confirmado") return false;

  if (convocados?.length) {
    if (!isUserConvoked(convocados, person, options)) return false;
  }

  const mealKey = mealSlotKey(fecha, servicio);
  if (mealKey == null) return false;

  const { startKey, endKey, hasAny } = getMealCoverageBounds(person.logistics);

  if (!person.is_local && !hasAny) return false;
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
