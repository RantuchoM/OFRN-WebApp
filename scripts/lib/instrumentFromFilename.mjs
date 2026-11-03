/**
 * Infiere la etiqueta canónica de instrumento (OFRN) desde nombres de PDF "sueltos"
 * de Archivo-para-organizar (ej. "Clarinete 1 y 2 Agua Turbia.pdf",
 * "Messiah Allelujah Corno 1.pdf", "No puede Ser - Parts Bb Trumpet 1,2.pdf").
 *
 * Estrategia: vocabulario de instrumentos (ES/EN/IT/FR) + números / romanos;
 * se toma la corrida de tokens-instrumento al inicio, al final o la primera
 * del nombre, y se normaliza con pdfPartsRenaming (Bb/F canónicos).
 * Combinados (1 y 2, 1,2) → sufijo `1y2` (nunca `1-2`).
 */
import { normalizeInstrumentLabel } from "./pdfPartsRenaming.mjs";

export function fold(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[�¦]/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const WORDS = `
flauta flautas flute flutes flautin picolo piccolo pic
oboe oboes hautbois corno ingles english horn cor anglais
clarinete clarinetes clarinet clarinets clarintet clarinetto clarone requinto bajo eb
fagot fagotes bassoon bassoons basson contrafagot contra fagot contrabassoon
corno cornos trompa trompas horn horns
trompeta trompetas trumpet trumpets trompette
trombon trombones trombone tuba eufonio euphonium bombardino baritone baritono bariton
saxo saxofon saxophone sax soprano alto tenor
arpa harp piano accordion acordeon bandoneon guitarra guitar guitarras
violin violines viola violas violoncello violoncelo violonchelo violonchelos cello celli contrabajo contrabajos double bass basses
timbal timbales timpani timp timbales percusion perc bombo drums drum caja redoblante platillos platillo cymbals cymbal
triangulo triangle glockenspiel glokenspiel glockenspied glockespield glock caxixi campanas tubulares tubular bells bateria
electrico electrica accesorios solista solo
con arcos arco c con arcos
en in de y e a f c d g bb b sib fa mib re la
i ii iii iv v vi
`
  .split(/\s+/)
  .filter(Boolean);
const VOCAB = new Set(WORDS);

const CONNECTORS = new Set(
  "en in de y e a f c d g bb b sib fa mib re la eb con arco arcos i ii iii iv v vi".split(" "),
);

const NOISE_TOKENS = new Set(["parts", "part", "partes", "parte", "ok", "listo"]);

function isNum(tok) {
  return /^\d+([,.]\d+)*$/.test(tok) || /^\d+[a-z]$/.test(tok);
}

/** Tokeniza conservando "1,2" y "1y2" como un token. */
function tokenize(s) {
  return String(s)
    .replace(/(\d)\s*,\s*(\d)/g, "$1,$2")
    .replace(/[()[\]]/g, " ")
    .replace(/\s*[-–—]\s*/g, " - ")
    .split(/\s+/)
    .filter(Boolean);
}

function tokenIsInstrumentish(raw) {
  const t = fold(raw);
  if (!t) return false;
  if (t === "-") return false;
  if (isNum(t)) return true;
  if (/^\d+y\d+(y\d+)?$/.test(t)) return true;
  return VOCAB.has(t);
}

/** Corrida de tokens-instrumento: inicio → fin → primera interior. */
export function extractInstrumentPhrase(baseName) {
  const toks = tokenize(baseName).filter((t) => !NOISE_TOKENS.has(fold(t)));
  const flags = toks.map(tokenIsInstrumentish);

  const runs = [];
  let i = 0;
  while (i < toks.length) {
    if (!flags[i]) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < toks.length && flags[j]) j += 1;
    runs.push([i, j]);
    i = j;
  }
  if (!runs.length) return { phrase: "", mode: "none" };

  const pick = (r, mode) => ({
    phrase: toks.slice(r[0], r[1]).join(" "),
    mode,
  });
  const first = runs[0];
  const last = runs[runs.length - 1];
  // Una corrida que son solo conectores (y/e/a/de/en/in/b/f/c/d…) o números no sirve.
  const meaningful = (r) =>
    toks.slice(r[0], r[1]).some((t) => {
      const f = fold(t);
      return VOCAB.has(f) && !CONNECTORS.has(f);
    });

  if (first[0] === 0 && meaningful(first)) return pick(first, "prefix");
  if (last[1] === toks.length && meaningful(last)) return pick(last, "suffix");
  const mid = runs.find(meaningful);
  if (mid) return pick(mid, "inner");
  return { phrase: "", mode: "none" };
}

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };

/**
 * @returns {{label:string|null, kind:'score'|'part'|'skip', note?:string}}
 */
export function inferInstrumentLabel(fileName) {
  let raw = String(fileName || "").replace(/\.pdf$/i, "");
  raw = raw.replace(/_/g, " ").replace(/[�¦]/g, "").replace(/\s+/g, " ").trim();
  const f = fold(raw);

  if (/todas\s+las\s+partes|\ball\s+parts\b|partes\s+completas|partitura\s+y\s+partes|score\s+y\s+particellas|score\s+and\s+parts/.test(f))
    return { label: null, kind: "skip", note: "compilado de todas las partes / score+partes" };
  if (/\b(score|partitura|full\s+score|partitura\s+completa)\b/.test(f))
    return { label: "SCORE", kind: "score" };

  // índice inicial "1 ", "4- ", "01. ", "10 -"
  raw = raw.replace(/^\s*\d{1,2}[a-z]?\s*[-.)]*\s+/i, "");

  const { phrase } = extractInstrumentPhrase(raw);
  if (!phrase) return { label: null, kind: "skip", note: `instrumento no reconocido: ${fileName}` };

  let p = phrase;
  p = p.replace(/\b(con\s+arcos?|c\.?\s*arcos?)\b/gi, " ").replace(/\s+/g, " ").trim();
  let nums = [];
  // romanos "I _ III" / "I a II" no se interpretan: dejar al override del catálogo.
  let m = p.match(/\b(\d)\s*(?:,|y|e|&|\/)\s*(\d)(?:\s*(?:,|y|e|&)\s*(\d))?\b/i);
  if (m) {
    nums = [m[1], m[2], m[3]].filter(Boolean).map(Number);
    p = (p.slice(0, m.index) + " " + p.slice(m.index + m[0].length)).replace(/\s+/g, " ").trim();
  } else {
    const rn = p.match(/\b(i{1,3}|iv|v|vi)\b\s*$/i);
    if (rn && ROMAN[rn[1].toLowerCase()] && /\b(oboe|flauta|clarinet|fagot|bassoon|flute|trumpet|trombone|horn|violin|corno|trompeta)/i.test(p)) {
      p = p.replace(/\b(i{1,3}|iv|v|vi)\b\s*$/i, ROMAN[rn[1].toLowerCase()]);
    }
  }

  // "Clarinet in Bb 1" / "Trumpet in C 1" → normalizeInstrumentLabel entiende en/in.
  let label = normalizeInstrumentLabel(p);
  if (nums.length >= 2) {
    // normalizeInstrumentLabel puede haber dejado un número suelto; limpiarlo.
    label = label.replace(/\s+\d+$/, "").trim();
    label = `${label} ${nums.join("y")}`;
  }
  return { label, kind: "part" };
}
