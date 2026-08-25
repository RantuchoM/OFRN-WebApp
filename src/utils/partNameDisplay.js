/** Quita extensión de archivo típica de particellas. */
export function stripPartExtension(name = "") {
  return String(name || "")
    .replace(/\.(pdf|docx?)$/i, "")
    .trim();
}

/** Nombre visible de una particella (archivo o instrumento). */
export function getPartDisplayName(part) {
  if (!part) return "";
  return stripPartExtension(
    part.nombre_archivo || part.instrumentos?.instrumento || "",
  );
}

const PITCH_TOKEN = /^[A-G](?:b|#|bb)?$/i;
const NUMBER_TOKEN = /^\d+[a-z]?$/i;
const ROMAN_TOKEN = /^[IVXLCDM]{1,6}$/i;
const SUFFIX_TOKEN = /^(do|re|mi|fa|sol|la|si|eh|picc)$/i;
const PUNCT_TOKEN = /^[–—\-_/|]+$/;

function normalizeToken(token) {
  return String(token || "").replace(/^[(\[]|[)\],.;:]+$/g, "");
}

function isPunctuationToken(token) {
  return PUNCT_TOKEN.test(String(token || "").trim());
}

/** Tokens cortos que identifican la parte (nº, tonalidad, romano). */
export function isPartIdentifierToken(token) {
  const t = normalizeToken(token);
  if (!t) return false;
  return (
    NUMBER_TOKEN.test(t) ||
    ROMAN_TOKEN.test(t) ||
    PITCH_TOKEN.test(t) ||
    SUFFIX_TOKEN.test(t)
  );
}

/**
 * Separa el nombre para truncar el inicio y conservar el final
 * (nº de parte / tonalidad). Ej: "Clarinete Bb 2" → head "Clarinete", tail " Bb 2".
 * Si no hay identificador corto al final, no hay cola (ellipsis CSS normal).
 */
export function splitPartNameForTruncation(name) {
  const text = stripPartExtension(name);
  if (!text) return { head: "", tail: "" };

  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return { head: text, tail: "" };

  let keepFrom = tokens.length;
  while (keepFrom > 1) {
    const token = tokens[keepFrom - 1];
    if (isPunctuationToken(token) || isPartIdentifierToken(token)) {
      keepFrom -= 1;
      continue;
    }
    break;
  }

  if (keepFrom === tokens.length) {
    return { head: text, tail: "" };
  }

  return {
    head: tokens.slice(0, keepFrom).join(" "),
    tail: ` ${tokens.slice(keepFrom).join(" ")}`,
  };
}
