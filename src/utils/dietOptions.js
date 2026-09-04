/** Tipos de alimentación compartidos entre ficha admin y modal de perfil. */
export const DIET_OPTIONS = [
  "General",
  "Celíaca",
  "Diabética",
  "Vegetariana",
  "Vegana",
  "Sin Sal",
  "Sin Lactosa",
];

export function normalizeDiet(value) {
  return String(value || "").trim();
}

export function dietsDiffer(a, b) {
  return normalizeDiet(a) !== normalizeDiet(b);
}
