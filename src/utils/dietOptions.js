/** Tipos de alimentación OFRN (ficha admin, perfil, comidas). */

/** Bucket canónico: vacío, "General" e histórico "Estándar" son el mismo menú. */
export const CANONICAL_STANDARD_DIET = "Estándar";

export const DIET_OPTIONS = [
  CANONICAL_STANDARD_DIET,
  "Celíaca",
  "Diabética",
  "Vegetariana",
  "Vegana",
  "Sin Sal",
  "Sin Lactosa",
];

/** FIMBA Regular es default de artista; no se fusiona con Estándar OFRN. */
export const FIMBA_REGULAR_DIET = "Regular";

export function foldDietKey(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const STANDARD_DIET_KEYS = new Set(["", "general", "estandar"]);

/**
 * ¿Dieta OFRN vacía / General / Estándar? No incluye FIMBA Regular.
 */
export function isStandardOfrnDiet(value) {
  return STANDARD_DIET_KEYS.has(foldDietKey(value));
}

/**
 * Bucket de conteo/columna para comidas OFRN.
 * Vacío / General / Estándar → Estándar. Regular (FIMBA) queda Regular.
 */
export function canonicalizeMealDiet(value) {
  if (isStandardOfrnDiet(value)) return CANONICAL_STANDARD_DIET;
  const trimmed = String(value || "").trim();
  return trimmed || CANONICAL_STANDARD_DIET;
}

/** Valor de select: aliases históricos → Estándar. */
export function dietSelectValue(value) {
  return canonicalizeMealDiet(value);
}

export function dietDisplayLabel(value) {
  return canonicalizeMealDiet(value);
}

/**
 * Abreviaturas explícitas para cabeceras (matriz, reporte, PDF, Excel).
 * No usar substring(0, 4): General/Estándar/Sin* colisionaban (GENE vs ESTÁ vs SIN).
 */
const DIET_SHORT_LABELS = {
  [CANONICAL_STANDARD_DIET]: "Estándar",
  general: "Estándar",
  "Sin Lactosa": "s/Lact.",
  "Sin Sal": "s/sal",
  "Sin TACC": "s/TACC",
  [FIMBA_REGULAR_DIET]: "Regular",
  Celíaca: "Celí.",
  Celíaco: "Celí.",
  Diabética: "Diab.",
  Vegetariana: "Veget.",
  Vegetariano: "Veget.",
  Vegana: "Vegana",
  Vegano: "Vegano",
  Otros: "Otros",
  "Artistas FIMBA": "Art.",
};

const SHORT_BY_KEY = new Map(
  Object.entries(DIET_SHORT_LABELS).map(([k, v]) => [foldDietKey(k), v]),
);

export function dietShortLabel(value) {
  if (value == null) return dietShortLabel(CANONICAL_STANDARD_DIET);
  const raw = String(value).trim();
  if (!raw) return dietShortLabel(CANONICAL_STANDARD_DIET);
  const canon = canonicalizeMealDiet(raw);
  const mapped = SHORT_BY_KEY.get(foldDietKey(canon));
  if (mapped) return mapped;
  if (/^sin\s+/i.test(canon)) {
    const rest = canon.replace(/^sin\s+/i, "").trim();
    if (rest) return `s/${rest}`;
  }
  return canon;
}

export function normalizeDiet(value) {
  return canonicalizeMealDiet(value);
}

export function dietsDiffer(a, b) {
  return canonicalizeMealDiet(a) !== canonicalizeMealDiet(b);
}

/**
 * Orden de columnas: Estándar/Regular primero, Artistas FIMBA al final.
 * @param {string} diet
 */
export function mealDietSortRank(diet) {
  const d = String(diet || "");
  if (d === "Artistas FIMBA") return 2;
  if (isStandardOfrnDiet(d) || foldDietKey(d) === "regular") return 0;
  return 1;
}

export function compareMealDietLabels(a, b) {
  const ra = mealDietSortRank(a);
  const rb = mealDietSortRank(b);
  if (ra !== rb) return ra - rb;
  return String(a).localeCompare(String(b), "es");
}
