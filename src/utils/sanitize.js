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
 * Divide una consulta en tokens (espacios, "+" o comas) para búsqueda AND.
 * "López, Juan" y "Juan Lopez" producen los mismos tokens.
 * @param {string} query
 * @returns {string[]}
 */
export function splitSearchTokens(query) {
  return String(query || "")
    .split(/[\s,+]+/)
    .map((token) => normalizeForSearch(token))
    .filter(Boolean);
}

/**
 * Comprueba si todos los tokens aparecen en el texto combinado (insensible a tildes).
 * El orden de las palabras no importa: "López Juan" ≡ "Juan Lopez".
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

/**
 * Encadena filtros PostgREST: cada token debe aparecer en alguno de los campos
 * (`AND` de `OR`s). Case-insensitive vía `ilike`; los acentos en DB siguen
 * dependiendo de Postgres (el cliente aplica `matchesMultiTokenSearch` encima).
 * @param {object} queryBuilder
 * @param {string[]} fields
 * @param {string} searchQuery
 * @returns {object}
 */
export function applyMultiTokenOrIlike(queryBuilder, fields, searchQuery) {
  const tokens = splitSearchTokens(searchQuery);
  let q = queryBuilder;
  for (const token of tokens) {
    const safe = token.replace(/[%(),]/g, "");
    if (!safe) continue;
    q = q.or(fields.map((field) => `${field}.ilike.%${safe}%`).join(","));
  }
  return q;
}

/**
 * Rangos [start, end) en el texto original que coinciden con cada token
 * (insensible a tildes/mayúsculas).
 * @param {string} text
 * @param {string} query
 * @returns {number[][]}
 */
export function getSearchHighlightRanges(text, query) {
  const rawText = String(text ?? "");
  const tokens = splitSearchTokens(query);
  if (!tokens.length || !rawText) return [];

  const normalizedChars = [];
  const originalIndexByNormalizedIndex = [];
  Array.from(rawText).forEach((char, originalIdx) => {
    const normalizedChar = char
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    Array.from(normalizedChar).forEach((c) => {
      normalizedChars.push(c);
      originalIndexByNormalizedIndex.push(originalIdx);
    });
  });

  const normalizedText = normalizedChars.join("");
  if (!normalizedText) return [];

  const ranges = [];
  for (const token of tokens) {
    let searchFrom = 0;
    while (searchFrom < normalizedText.length) {
      const foundAt = normalizedText.indexOf(token, searchFrom);
      if (foundAt === -1) break;
      const startOriginal = originalIndexByNormalizedIndex[foundAt];
      const endNormIdx = foundAt + token.length - 1;
      const endOriginal =
        (originalIndexByNormalizedIndex[endNormIdx] ?? startOriginal) + 1;
      ranges.push([startOriginal, endOriginal]);
      searchFrom = foundAt + 1;
    }
  }

  if (!ranges.length) return [];
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  ranges.forEach(([start, end]) => {
    const last = merged[merged.length - 1];
    if (!last || start > last[1]) merged.push([start, end]);
    else last[1] = Math.max(last[1], end);
  });
  return merged;
}
