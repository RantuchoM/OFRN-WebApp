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

/** Calidad por token: palabra exacta > prefijo de palabra > substring a mitad. */
const SCORE_TOKEN_EXACT_WORD = 1000;
const SCORE_TOKEN_PREFIX_WORD = 400;
const SCORE_TOKEN_MID_WORD = 50;
/** Bonos globales (más altos = mejor ranking). */
const SCORE_EXACT_FULL = 1_000_000;
const SCORE_ALL_EXACT_WORDS = 500_000;
const SCORE_ALL_PREFIX = 200_000;
const SCORE_ORDER_AWARE = 50_000;

/**
 * Palabras de un haystack ya normalizado (espacios, comas, +, guiones, etc.).
 * @param {string} haystack
 * @returns {string[]}
 */
function splitHaystackWords(haystack) {
  return String(haystack || "")
    .split(/[\s,+/._-]+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

/**
 * Mejor calidad de un token contra las palabras del nombre (y fallback al haystack).
 * @param {string} token
 * @param {string[]} words
 * @param {string} haystack
 * @returns {number} -1 si no hay match
 */
function bestTokenMatchScore(token, words, haystack) {
  let best = -1;
  for (const word of words) {
    if (word === token) best = Math.max(best, SCORE_TOKEN_EXACT_WORD);
    else if (word.startsWith(token)) best = Math.max(best, SCORE_TOKEN_PREFIX_WORD);
    else if (word.includes(token)) best = Math.max(best, SCORE_TOKEN_MID_WORD);
  }
  if (best < 0 && haystack.includes(token)) best = SCORE_TOKEN_MID_WORD;
  return best;
}

/**
 * ¿Los tokens encajan en orden como prefijo/exacto de palabras sucesivas?
 * (sirve para "José G" sobre ["jose","gomez"] tras invertir apellido/nombre).
 * @param {string[]} tokens
 * @param {string[]} words
 * @returns {boolean}
 */
function tokensMatchWordsInOrder(tokens, words) {
  if (!tokens.length) return true;
  let wi = 0;
  for (const token of tokens) {
    let found = false;
    while (wi < words.length) {
      const word = words[wi++];
      if (word === token || word.startsWith(token)) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

/**
 * Score de un haystack ya normalizado contra tokens ya normalizados.
 * @param {string} haystack
 * @param {string[]} tokens
 * @returns {number} -1 = no match
 */
function scoreNormalizedHaystack(haystack, tokens) {
  if (!haystack) return -1;
  const words = splitHaystackWords(haystack);
  const tokenScores = tokens.map((token) =>
    bestTokenMatchScore(token, words, haystack),
  );
  if (tokenScores.some((s) => s < 0)) return -1;

  let score = tokenScores.reduce((sum, s) => sum + s, 0);

  const joinedQuery = tokens.join(" ");
  if (haystack === joinedQuery || words.join(" ") === joinedQuery) {
    score += SCORE_EXACT_FULL;
  }

  if (tokenScores.every((s) => s >= SCORE_TOKEN_EXACT_WORD)) {
    score += SCORE_ALL_EXACT_WORDS;
  } else if (tokenScores.every((s) => s >= SCORE_TOKEN_PREFIX_WORD)) {
    score += SCORE_ALL_PREFIX;
  }

  // Consciente de “Apellido, Nombre” y “Nombre Apellido”
  if (
    tokensMatchWordsInOrder(tokens, words) ||
    tokensMatchWordsInOrder(tokens, [...words].reverse())
  ) {
    score += SCORE_ORDER_AWARE;
  }

  // Desempate: match más temprano y haystack más corto
  let firstPos = haystack.length;
  for (const token of tokens) {
    const pos = haystack.indexOf(token);
    if (pos >= 0) firstPos = Math.min(firstPos, pos);
  }
  score -= firstPos;
  score -= Math.min(haystack.length, 500);

  return score;
}

/**
 * Score de relevancia (mayor = mejor). `-1` = no match.
 *
 * Prioridad:
 * 1. Coincidencia exacta del texto completo
 * 2. Todos los tokens como palabra exacta
 * 3. Todos los tokens como prefijo de partes del nombre (José + G → José + Gómez…)
 * 4. Orden / “Apellido, Nombre” (tokens en secuencia sobre nombre+apellido o apellido+nombre)
 * 5. Más débil: token a mitad de palabra
 *
 * Evalúa cada fragmento y el haystack unido; se queda con el mejor score
 * (así “Apellido, Nombre” no se diluye al juntar DNI/mail/u otras variantes).
 *
 * @param {string[]} haystackParts
 * @param {string} query
 * @returns {number}
 */
export function scoreMultiTokenSearch(haystackParts, query) {
  const tokens = splitSearchTokens(query);
  if (!tokens.length) return 0;
  const parts = (haystackParts || []).filter(
    (part) => part != null && part !== "",
  );
  if (!parts.length) return -1;

  let best = -1;
  for (const part of parts) {
    best = Math.max(best, scoreNormalizedHaystack(normalizeForSearch(part), tokens));
  }
  // Tokens repartidos entre campos (ej. nombre en un part, apellido en otro)
  best = Math.max(
    best,
    scoreNormalizedHaystack(normalizeForSearch(parts.join(" ")), tokens),
  );
  return best;
}

/**
 * Comparador para `Array.sort` (mejor match primero).
 * @param {string[]} partsA
 * @param {string[]} partsB
 * @param {string} query
 * @returns {number}
 */
export function compareMultiTokenSearch(partsA, partsB, query) {
  return scoreMultiTokenSearch(partsB, query) - scoreMultiTokenSearch(partsA, query);
}

/**
 * Filtra por match y ordena por score descendente.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string[]} getParts
 * @param {string} query
 * @returns {T[]}
 */
export function filterAndRankMultiTokenSearch(items, getParts, query) {
  const list = Array.isArray(items) ? items : [];
  const tokens = splitSearchTokens(query);
  if (!tokens.length) return list.slice();

  return list
    .map((item) => ({
      item,
      score: scoreMultiTokenSearch(getParts(item) || [], query),
    }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.item);
}

/**
 * Comprueba si todos los tokens aparecen en el texto combinado (insensible a tildes).
 * El orden de las palabras no importa para el match: "López Juan" ≡ "Juan Lopez".
 * El ranking (quién aparece primero) vive en `scoreMultiTokenSearch`.
 * @param {string[]} haystackParts - Fragmentos a unir (título, compositor, etc.)
 * @param {string} query
 * @returns {boolean}
 */
export function matchesMultiTokenSearch(haystackParts, query) {
  const tokens = splitSearchTokens(query);
  if (!tokens.length) return true;
  return scoreMultiTokenSearch(haystackParts, query) >= 0;
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
