/**
 * Sanear string para uso como nombre de archivo (quitar acentos, ñ, caracteres especiales).
 * @param {string} str - Texto a sanear
 * @returns {string} - Texto en minúsculas, solo letras, números, punto y guión; vacío → "archivo"
 */
export function sanitizeFilename(str) {
  if (!str) return "archivo";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .toLowerCase();
}

/**
 * Normaliza texto para comparaciones de búsqueda (insensible a tildes/diacríticos).
 * Ej: "Martín", "Martin", "Màrtin" -> "martin"
 * @param {string} value
 * @returns {string}
 */
export function normalizeForSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Divide una consulta en tokens (espacios o "+") para búsqueda AND.
 * @param {string} query
 * @returns {string[]}
 */
export function splitSearchTokens(query) {
  return String(query || "")
    .split(/[\s+]+/)
    .map((token) => normalizeForSearch(token))
    .filter(Boolean);
}

/**
 * Comprueba si todos los tokens aparecen en el texto combinado (insensible a tildes).
 * @param {string[]} haystackParts - Fragmentos a unir (título, compositor, etc.)
 * @param {string} query
 * @returns {boolean}
 */
export function matchesMultiTokenSearch(haystackParts, query) {
  const tokens = splitSearchTokens(query);
  if (!tokens.length) return true;
  const haystack = normalizeForSearch(
    haystackParts.filter((part) => part != null && part !== "").join(" "),
  );
  if (!haystack) return false;
  return tokens.every((token) => haystack.includes(token));
}
