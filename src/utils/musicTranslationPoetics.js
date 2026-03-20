/** Letras de rima admitidas en UI y en `traduccion_segments.rima`. */
export const RIMA_OPTIONS = ["A", "B", "C", "D", "E", "F"];

/** Valores de repetición en `traduccion_segments.repeticion`. */
export const REPETICION_OPTIONS = ["R1", "R2", "R3", "R4"];

/** @param {unknown} v */
export function normalizeRima(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim().toUpperCase();
  return RIMA_OPTIONS.includes(s) ? s : null;
}

/** @param {unknown} v */
export function normalizeRepeticion(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim().toUpperCase();
  return REPETICION_OPTIONS.includes(s) ? s : null;
}

/**
 * Clases Tailwind para teñir el campo del segmento (fondo / borde tenue).
 * @param {unknown} rima
 */
export function segmentRimaFieldClasses(rima) {
  const r = normalizeRima(rima);
  if (!r) return "";
  switch (r) {
    case "A":
      return "bg-red-500/10 border-red-500/30";
    case "B":
      return "bg-blue-500/10 border-blue-500/30";
    case "C":
      return "bg-yellow-500/10 border-yellow-500/30";
    case "D":
      return "bg-green-500/10 border-green-500/30";
    case "E":
      return "bg-orange-500/10 border-orange-500/30";
    case "F":
      return "bg-purple-500/10 border-purple-500/30";
    default:
      return "";
  }
}
