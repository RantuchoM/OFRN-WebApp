import { startOfDay } from "date-fns";

/**
 * true si la salida del recorrido es hoy o posterior (comparación por inicio del día local).
 * Sin fecha válida → false (no cuenta como “próximo”).
 */
export function isSalidaHoyOFutura(fechaSalida) {
  if (!fechaSalida) return false;
  const d = new Date(fechaSalida);
  if (Number.isNaN(d.getTime())) return false;
  return d >= startOfDay(new Date());
}
