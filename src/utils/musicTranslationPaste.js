/**
 * Pegado en traducción musical: trocea el texto para repartirlo en varios segmentos
 * del mismo idioma solo por espacio en blanco (espacios, tabuladores, saltos de línea).
 * Guiones y guiones bajos permanecen en el texto; // se ignora como delimitador de trozos.
 */

const SCHEME_MARKER = "\uE000";

/** Enmascara :// para que split por // no rompa http://, https://, etc. */
function maskUriSchemes(text) {
  return String(text ?? "").replace(/:\/\//g, `${SCHEME_MARKER}`);
}

function unmaskUriSchemes(text) {
  return text.replaceAll(SCHEME_MARKER, "://");
}

/**
 * Trocea por // (sin consumir segmentos vacíos); dentro de cada trozo, solo por \s+.
 *
 * @param {string} raw
 * @returns {string[]}
 */
export function splitMusicTranslationPaste(raw) {
  const masked = maskUriSchemes(raw);
  const slashChunks = masked.split("//");
  const sep = /\s+/;

  // Guiones “altos” que deben funcionar como “separador duro” para el salto al
  // siguiente segmento (pero el carácter se conserva en el token anterior).
  const flowBreakDashRe = /[-\u2010\u2011\u2013\u2014\u2015\u2212\u00AD]/u;

  function splitByWhitespacePlusFlowDash(text) {
    const out = [];
    let cur = "";

    const flush = () => {
      const t = cur.trim();
      if (t) out.push(t);
      cur = "";
    };

    for (const ch of String(text)) {
      if (/\s/u.test(ch)) {
        flush();
        continue;
      }

      if (flowBreakDashRe.test(ch)) {
        // Conservamos el guion alto en el token anterior.
        cur += ch;
        flush();
        continue;
      }

      cur += ch;
    }

    flush();
    return out;
  }

  const out = [];
  for (const ch of slashChunks) {
    const restored = unmaskUriSchemes(ch);
    // Primero: mantenemos la lógica original por whitespace.
    // Segundo: agregamos soporte para “guion alto” como separador duro.
    for (const piece of splitByWhitespacePlusFlowDash(restored)) {
      if (!sep.test(piece)) out.push(piece);
    }
  }
  return out;
}
