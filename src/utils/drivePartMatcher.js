/**
 * Motor de matching Drive ↔ particellas (modal, seeds futuros).
 * Soporta archivos combinados: "Corno 1y2", "1 y 2", "1&2", "1-2", "1/2".
 * También numeración romana de parte: "Corno F I y III", "Violín II", "Flauta I".
 * Misma silla en distinta transposición (Re/Sib, D/Bb, in D/in B, en Re/en Sib):
 * varios PDFs, una parte. Un PDF `1y2` / `1y2y3` sigue siendo varias partes.
 */

const COMBINED_SUFFIX_PATTERNS = [
  {
    re: /(\d+)\s*y\s*(\d+)\s*y\s*(\d+)\s*y\s*(\d+)\s*$/i,
    pick: (m) => [m[1], m[2], m[3], m[4]],
  },
  {
    re: /(\d+)\s*y\s*(\d+)\s*y\s*(\d+)\s*$/i,
    pick: (m) => [m[1], m[2], m[3]],
  },
  { re: /(\d+)\s*y\s*(\d+)\s*$/i, pick: (m) => [m[1], m[2]] },
  { re: /(\d+)\s+y\s+(\d+)\s*$/i, pick: (m) => [m[1], m[2]] },
  { re: /(\d+)\s*&\s*(\d+)\s*$/i, pick: (m) => [m[1], m[2]] },
  // Incluye guión ASCII y en-dash/em-dash (PDFs IMSLP / renombres mixtos)
  { re: /(\d+)\s*[-–—/]\s*(\d+)\s*$/i, pick: (m) => [m[1], m[2]] },
];

/** Romanos de atril/parte (orden: más largos primero). */
const ROMAN_PART_SRC = "XII|XI|IX|VIII|VII|VI|IV|V|III|II|X|I";
const ROMAN_PART_MAP = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
  XI: 11,
  XII: 12,
};

/**
 * Convierte numeración romana de parte a arábiga en el prefijo de instrumento.
 * Ej: "Corno F I y III" → "Corno F 1 y 3"; "Violín II" → "Violín 2"; "Violín I1" → "Violín 1 1".
 */
export const arabicizeRomanPartNumbers = (prefix) => {
  let t = String(prefix || "").trim();
  if (!t) return t;

  // Combinados romanos al final: I y III / II & IV / I-III
  const combined = t.match(
    new RegExp(
      `^(.*?)\\s*(${ROMAN_PART_SRC})\\s*(?:y|&|[-–—/])\\s*(${ROMAN_PART_SRC})\\s*$`,
      "i",
    ),
  );
  if (combined) {
    const a = ROMAN_PART_MAP[combined[2].toUpperCase()];
    const b = ROMAN_PART_MAP[combined[3].toUpperCase()];
    if (a != null && b != null) {
      const rem = combined[1].replace(/\s+/g, " ").trim();
      return `${rem} ${a} y ${b}`.trim();
    }
  }

  // Romano pegado a atril: "Violín I1" / "Violoncello II2"
  t = t.replace(
    new RegExp(`\\b(${ROMAN_PART_SRC})(\\d+)\\b`, "gi"),
    (_, r, d) => `${ROMAN_PART_MAP[r.toUpperCase()]} ${d}`,
  );

  // Romanos sueltos como número de parte: "Flauta I", "Clarinete I in Bb", "Violín I. (1)"
  t = t.replace(
    new RegExp(`\\b(${ROMAN_PART_SRC})\\b`, "gi"),
    (m) => String(ROMAN_PART_MAP[m.toUpperCase()] ?? m),
  );

  // Limpieza leve: "Violín 1. (1)" → "Violín 1 (1)"; "Violoncello1" → "Violoncello 1"
  t = t.replace(/(\d)\.\s*\(/g, "$1 (");
  t = t.replace(/([A-Za-zÁÉÍÓÚáéíóúÑñ])(\d+)\b/g, "$1 $2");
  return t.replace(/\s+/g, " ").trim();
};

/**
 * Segmento de instrumento antes de " - Título - Compositor".
 * Parte solo por " - " (espaciado) para no romper combinados genéricos: "Oboe 1-2", "Corno 3-4", etc.
 */
const instrumentSegmentFromName = (nameWithoutExt) => {
  const raw = String(nameWithoutExt || "").trim();
  if (!raw) return "";
  const bySpacedDash = raw.split(/\s+-\s+/);
  return (bySpacedDash[0] || raw).trim();
};

export const normalizeInstrumentString = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(1ra|2da|3ra|ppal|principal|score|partitura)\b/gi, "")
    .replace(/\d+/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Palabras de afinación (no letras sueltas). Más largas primero.
 * B / in B / Bb / Sib = la misma trompeta en si bemol.
 * D / in D / Re = la misma en re.
 */
const TRANSPOSITION_WORD_SRC =
  "si\\s*bemol|mi\\s*bemol|la\\s*bemol|re\\s*bemol|sol\\s*bemol|do\\s*bemol|" +
  "si\\s*b|mi\\s*b|la\\s*b|" +
  "sib|mib|lab|reb|solb|dob|" +
  "bb|eb|ab|db|gb|" +
  "b\\s*♭|e\\s*♭|a\\s*♭|d\\s*♭|g\\s*♭|" +
  "f\\s*#|c\\s*#|" +
  "do|re|mi|fa|sol|la|si";

const TRANSPOSITION_KEY_SRC = `${TRANSPOSITION_WORD_SRC}|[A-Ga-g]`;

/** Quita afinación/transposición para equiparar "Corno F 1", "Trompeta D 1" y "Trompeta 1". */
export const stripTranspositionKeys = (text = "") =>
  String(text)
    .replace(
      new RegExp(
        `\\(\\s*(?:in|en)?\\s*(?:${TRANSPOSITION_KEY_SRC})\\s*\\)`,
        "gi",
      ),
      " ",
    )
    .replace(
      new RegExp(`\\b(?:in|en)\\s+(?:${TRANSPOSITION_KEY_SRC})\\b`, "gi"),
      " ",
    )
    .replace(new RegExp(`\\b(?:${TRANSPOSITION_WORD_SRC})\\b`, "gi"), " ")
    .replace(/(?<![\w'])[A-Ga-g](?![\w'])/g, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const canonicalizeTranspositionToken = (hit) => {
  const t = String(hit || "")
    .toLowerCase()
    .replace(/♭/g, "b")
    .replace(/\s+/g, "");
  if (!t) return null;
  if (/^(bb|sib|sibemol|b)$/.test(t)) return "bb";
  if (/^(eb|mib|mibemol)$/.test(t)) return "eb";
  if (/^(ab|lab|labemol)$/.test(t)) return "ab";
  if (/^(db|reb|rebemol)$/.test(t)) return "db";
  if (/^(gb|solb|solbemol|f#|fa#)$/.test(t)) return "f#";
  if (/^(c#|do#)$/.test(t)) return "c#";
  if (/^(d|re)$/.test(t)) return "d";
  if (/^(e|mi)$/.test(t)) return "e";
  if (/^(f|fa)$/.test(t)) return "f";
  if (/^(a|la)$/.test(t)) return "a";
  if (/^(c|do)$/.test(t)) return "c";
  if (/^(g|sol)$/.test(t)) return "g";
  if (t === "si") return "b";
  return t;
};

/** Token de transposición presente en un nombre, o null si no hay. */
export const transpositionToken = (text = "") => {
  const raw = String(text || "");
  const m = raw.match(
    new RegExp(
      `\\(\\s*(?:in|en)?\\s*(${TRANSPOSITION_KEY_SRC})\\s*\\)|\\b(?:in|en)\\s+(${TRANSPOSITION_KEY_SRC})\\b|\\b(${TRANSPOSITION_WORD_SRC})\\b|(?<![\\w'])([A-Ga-g])(?![\\w'])`,
      "i",
    ),
  );
  if (!m) return null;
  return canonicalizeTranspositionToken(m[1] || m[2] || m[3] || m[4]);
};

const normalizePartBase = (rawBase) =>
  applyPiccoloFlautaNorm(
    normalizeInstrumentString(stripTranspositionKeys(rawBase)),
    rawBase,
  );

const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[0][i] = i;
  for (let j = 0; j <= b.length; j++) dp[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j][i] = Math.min(dp[j - 1][i] + 1, dp[j][i - 1] + 1, dp[j - 1][i - 1] + cost);
    }
  }
  return dp[b.length][a.length];
};

export const getDirectorInstrumentId = (catalogoInstrumentos) => {
  const found =
    (catalogoInstrumentos || []).find((i) => {
      const name = (i.instrumento || "").toLowerCase();
      return (
        name.includes("director") ||
        name.includes("conductor") ||
        name.includes("score")
      );
    }) || null;
  return found?.id ?? "50";
};

const isCoreInstrumentId = (id) => {
  if (id === undefined || id === null) return false;
  const match = String(id).match(/\d+/);
  if (!match) return false;
  const num = parseInt(match[0], 10);
  return num >= 1 && num <= 29;
};

export const isDriveFileExcludedFromMatching = (rawName) => {
  const upperName = (rawName || "").toUpperCase();
  return upperName.startsWith("PORTADA") || upperName.startsWith("AUDIO");
};

const isScoreLike = (text) =>
  /\b(director|conductor|score|partitura)\b/i.test(String(text || ""));

export const getDriveFilePrefix = (file, options = {}) => {
  const rawName = file?.name || "";
  if (options.extractInstrument) {
    const extracted = options.extractInstrument(rawName);
    if (extracted) return arabicizeRomanPartNumbers(String(extracted).trim());
  }
  // Quitar extensión; no usar split("-") suelto (rompe "Inst 1-2 - Obra - Comp.pdf")
  const base = rawName.replace(/\.[^./\\]+$/, "");
  return arabicizeRomanPartNumbers(instrumentSegmentFromName(base));
};

/** @returns {{ numbers: number[], remainder: string, isCombined: true } | null} */
export const parseCombinedNumbers = (text) => {
  const t = String(text || "").trim();
  for (const { re, pick } of COMBINED_SUFFIX_PATTERNS) {
    const m = t.match(re);
    if (!m) continue;
    const numbers = [...new Set(pick(m).map((n) => parseInt(n, 10)))].sort(
      (a, b) => a - b,
    );
    if (numbers.some((n) => Number.isNaN(n))) continue;
    const remainder = t.slice(0, m.index).trim();
    return { numbers, remainder, isCombined: true };
  }
  return null;
};

/**
 * @returns {{
 *   baseLabel: string,
 *   baseNorm: string,
 *   slotNumbers: number[] | null,
 *   isCombined: boolean,
 *   slotNumber: number | null,
 * }}
 */
export const parsePartSlot = (nombre_archivo) => {
  const base = stripTranspositionKeys(
    arabicizeRomanPartNumbers(instrumentSegmentFromName(nombre_archivo)),
  );
  const combined = parseCombinedNumbers(base);

  if (combined) {
    return {
      baseLabel: combined.remainder,
      baseNorm: normalizePartBase(combined.remainder),
      slotNumbers: combined.numbers,
      isCombined: true,
      slotNumber: null,
    };
  }

  const singleMatch = base.match(/^(.+?)\s+(\d+)\s*$/);
  if (singleMatch) {
    const remainder = singleMatch[1].trim();
    const n = parseInt(singleMatch[2], 10);
    return {
      baseLabel: remainder,
      baseNorm: normalizePartBase(remainder),
      slotNumbers: [n],
      isCombined: false,
      slotNumber: n,
    };
  }

  return {
    baseLabel: base,
    baseNorm: normalizePartBase(base),
    slotNumbers: null,
    isCombined: false,
    slotNumber: null,
  };
};

const applyPiccoloFlautaNorm = (norm, rawText) => {
  const low = String(rawText || "").toLowerCase();
  if (
    /picc|piccolo|^fp\b|^fi\b/.test(low) ||
    /\bfl\s+picc/i.test(low) ||
    norm.includes("piccolo")
  ) {
    return "flauta";
  }
  return norm;
};

const partDisplayBaseFromCatalog = (instr) => {
  if (!instr?.instrumento) return "Instrumento";
  const first = String(instr.instrumento).split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

const pickCatalog = (catalog, pred) => catalog.find(pred) || null;

/** Reglas explícitas de instrumento (seeds / PDFs con nomenclatura rica). */
const resolveExplicitInstrument = (prefix, normalizedCatalog, fullCatalog) => {
  const rawL = String(prefix || "").toLowerCase();
  const catalog = fullCatalog || normalizedCatalog;

  if (/^contrafagot/i.test(rawL) || /contrafagot/i.test(rawL)) {
    const cf =
      catalog.find((i) => /contrafagot/i.test(i.instrumento || "")) ||
      pickCatalog(normalizedCatalog, (i) => /fagot/i.test(i.instrumento || ""));
    return cf || null;
  }
  if (/^ob\s*eh|corno\s+ingles|english\s+horn/i.test(rawL) || /ob eh/i.test(rawL)) {
    return (
      pickCatalog(normalizedCatalog, (i) => /ingles|english/i.test(i.instrumento || "")) ||
      pickCatalog(normalizedCatalog, (i) => /oboe/i.test(i.instrumento || ""))
    );
  }
  if (/clarinete\s+a|cl\s+a/i.test(rawL) || /clarinete a/i.test(rawL)) {
    return pickCatalog(normalizedCatalog, (i) => /clarinete/i.test(i.instrumento || ""));
  }
  if (/requinto|requinta|cl\s+piccolo|piccolo\s*eb/i.test(rawL)) {
    return (
      catalog.find(
        (i) =>
          /clarinete/i.test(i.instrumento || "") &&
          /bajo|requinto/i.test(i.instrumento || ""),
      ) ||
      pickCatalog(normalizedCatalog, (i) => String(i.id) === "07b")
    );
  }
  if (/clarinete\s+bajo|bass\s+clar|cl\s*\.?\s*b(ajo)?\b/i.test(rawL)) {
    return (
      catalog.find(
        (i) =>
          /clarinete/i.test(i.instrumento || "") &&
          /bajo|requinto/i.test(i.instrumento || ""),
      ) ||
      pickCatalog(
        normalizedCatalog,
        (i) =>
          /clarinete/i.test(i.instrumento || "") &&
          /bajo|requinto/i.test(i.instrumento || ""),
      ) ||
      pickCatalog(normalizedCatalog, (i) => String(i.id) === "07b")
    );
  }
  if (/^celesta|^key\b/i.test(rawL)) {
    return pickCatalog(normalizedCatalog, (i) =>
      /celesta|teclado|key/i.test(i.instrumento || ""),
    );
  }
  // Órgano/Hammond/cémbalo/keyboard → Piano (no hay instrumento Órgano/Clave en catálogo OFRN)
  if (
    /[oó]rgano|\borgan\b|hammond|keyboard|cembalo|clave|harpsichord|klavier/i.test(
      rawL,
    )
  ) {
    return pickCatalog(normalizedCatalog, (i) => /piano/i.test(i.instrumento || ""));
  }
  if (/saxo|saxof/i.test(rawL)) {
    return pickCatalog(normalizedCatalog, (i) => /saxof/i.test(i.instrumento || ""));
  }
  if (/bater[ií]a|drum\s*set|drums\b/i.test(rawL)) {
    return pickCatalog(normalizedCatalog, (i) => /perc/i.test(i.norm));
  }
  return null;
};

const buildNormalizedCatalog = (catalogoInstrumentos) =>
  (catalogoInstrumentos || [])
    .filter((i) => isCoreInstrumentId(i.id))
    .map((i) => ({
      ...i,
      norm: normalizeInstrumentString(i.instrumento),
    }));

const resolveInstrumentFromPrefix = (prefix, catalogoInstrumentos, rawFileName = "") => {
  const directorId = getDirectorInstrumentId(catalogoInstrumentos);
  const fullCatalog = catalogoInstrumentos || [];
  const normalizedCatalog = buildNormalizedCatalog(catalogoInstrumentos);
  // Typo frecuente en PDFs Lema
  const fixedPrefix = String(prefix || "").replace(/\btomb[oó]n\b/gi, "Trombón");
  const lowerPrefix = fixedPrefix.toLowerCase();
  const lowerRaw = String(rawFileName || "").toLowerCase();

  if (isScoreLike(lowerPrefix) && directorId) {
    return normalizedCatalog.find((i) => i.id === directorId) || {
      id: directorId,
      instrumento: "Director",
    };
  }

  if (/^imslp\d/i.test(lowerPrefix) || /^imslp\d/i.test(lowerRaw)) {
    return normalizedCatalog.find((i) => i.id === directorId) || {
      id: directorId,
      instrumento: "Director",
    };
  }

  if (/continuo|bajo continuo/i.test(lowerPrefix)) {
    return (
      pickCatalog(normalizedCatalog, (i) => /violoncello/i.test(i.instrumento || "")) ||
      pickCatalog(normalizedCatalog, (i) => /contrabajo/i.test(i.instrumento || ""))
    );
  }

  if (/perc\s*timb|timbal|timp/i.test(lowerPrefix)) {
    const timpCand =
      pickCatalog(normalizedCatalog, (i) => /timbal|timp/i.test(i.instrumento || "")) ||
      pickCatalog(normalizedCatalog, (i) => /perc/i.test(i.norm));
    if (timpCand) return timpCand;
  }
  if (/perc|mallet|marimba|bombo|platillo|bater/i.test(lowerPrefix)) {
    const percCand = pickCatalog(
      normalizedCatalog,
      (i) =>
        i.norm.includes("perc") ||
        i.norm.includes("percus") ||
        /^perc\b/i.test(i.norm),
    );
    if (percCand) return percCand;
  }

  const explicit = resolveExplicitInstrument(fixedPrefix, normalizedCatalog, fullCatalog);
  if (explicit) return explicit;

  let normPrefix = applyPiccoloFlautaNorm(
    normalizeInstrumentString(fixedPrefix),
    fixedPrefix,
  );
  if (!normPrefix) return null;

  const rawL = lowerPrefix;
  const forcePercussion =
    /glock|metal(o)?fon|metalof|celesta|xilo/i.test(rawL) ||
    (/perc/i.test(rawL) && /glock|metal|celesta/i.test(rawL));

  let best = null;
  for (const instr of normalizedCatalog) {
    if (!instr.norm) continue;
    if (
      normPrefix === instr.norm ||
      normPrefix.includes(instr.norm) ||
      instr.norm.includes(normPrefix)
    ) {
      best = instr;
      break;
    }
    const dist = levenshtein(normPrefix, instr.norm);
    const maxLen = Math.max(normPrefix.length, instr.norm.length) || 1;
    const sim = 1 - dist / maxLen;
    if (!best || sim > best.sim) best = { ...instr, sim };
  }

  if (normPrefix === "corno") {
    const plainHorn =
      normalizedCatalog.find((i) => i.norm === "corno") ||
      normalizedCatalog.find(
        (i) => i.norm.startsWith("corno") && !i.norm.includes("ingl"),
      );
    if (plainHorn) best = plainHorn;
  }

  if (forcePercussion) {
    const percCand =
      normalizedCatalog.find(
        (i) =>
          i.norm.includes("perc") ||
          i.norm.includes("percus") ||
          /^perc\b/i.test(i.norm),
      ) || null;
    if (percCand) {
      const weakMatch =
        !best || (typeof best.sim === "number" && best.sim < 0.55);
      if (weakMatch) best = percCand;
    }
  }

  if (!best) return null;
  if (best.sim !== undefined && best.sim < 0.4) return null;
  return best;
};

const instrumentsCompatible = (partSlot, fileSlot, part, filePrefix) => {
  const partIsScoreLike =
    isScoreLike(part?.nombre_archivo) ||
    String(part?.instrumento_nombre || "")
      .toLowerCase()
      .includes("director");
  const fileIsScoreLike = isScoreLike(filePrefix);

  if (partIsScoreLike || fileIsScoreLike) {
    return partIsScoreLike && fileIsScoreLike;
  }

  const pn = partSlot.baseNorm;
  const fn = fileSlot.baseNorm;
  if (!pn || !fn) return false;
  if (pn === fn || fn.includes(pn) || pn.includes(fn)) return true;
  if (
    (pn.includes("flaut") || pn === "flauta") &&
    (fn.includes("picc") || fn.includes("piccolo"))
  )
    return true;
  if (
    (fn.includes("flaut") || fn === "flauta") &&
    (pn.includes("picc") || pn.includes("piccolo"))
  )
    return true;

  return false;
};

const getPartSlotNumber = (partSlot) => {
  if (partSlot.slotNumber != null) return partSlot.slotNumber;
  if (partSlot.slotNumbers?.length === 1) return partSlot.slotNumbers[0];
  return null;
};

/** Clave de familia instrumental para detectar placeholders únicos (ej. solo "Tuba 1"). */
export const instrumentFamilyKey = (part) => {
  const slot = parsePartSlot(part?.nombre_archivo || "");
  const id = part?.id_instrumento != null ? String(part.id_instrumento) : "";
  return `${id}|${slot.baseNorm}`;
};

const buildSingletonFamilyKeys = (partsList) => {
  const counts = new Map();
  for (const p of partsList || []) {
    if (p.links?.length) continue;
    const k = instrumentFamilyKey(p);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return new Set(
    [...counts.entries()].filter(([, c]) => c === 1).map(([k]) => k),
  );
};

const isSingletonNumberedPart = (part, context) => {
  const partSlot = parsePartSlot(part?.nombre_archivo || "");
  const partNum = getPartSlotNumber(partSlot);
  if (partNum == null) return false;
  const key = instrumentFamilyKey(part);
  if (context?.singletonFamilyKeys?.has(key)) return true;
  if (context?.unlinkedFamilyCounts?.get(key) === 1) return true;
  return false;
};

/**
 * Puntuación de match parte ↔ archivo. 0 = sin match.
 * 100 = slot exacto, 50 = archivo combinado, 45 = placeholder numerado único ↔ archivo sin número,
 * 30 = genérico sin número en ambos.
 */
export const getMatchScore = (part, file, context = {}) => {
  if (!part || !file) return 0;
  const rawName = file.name || "";
  if (!rawName || isDriveFileExcludedFromMatching(rawName)) return 0;

  const filePrefix = getDriveFilePrefix(file);
  const partSlot = parsePartSlot(part.nombre_archivo);
  const fileSlot = parsePartSlot(filePrefix);

  if (
    isScoreLike(part.nombre_archivo) ||
    String(part.instrumento_nombre || "").toLowerCase().includes("director")
  ) {
    return isScoreLike(filePrefix) ? 100 : 0;
  }
  if (isScoreLike(filePrefix)) return 0;

  if (!instrumentsCompatible(partSlot, fileSlot, part, filePrefix)) return 0;

  const partNum = getPartSlotNumber(partSlot);

  if (fileSlot.isCombined && fileSlot.slotNumbers?.length > 1) {
    if (partNum != null && fileSlot.slotNumbers.includes(partNum)) return 50;
    return 0;
  }

  if (fileSlot.slotNumber != null && partNum != null) {
    return fileSlot.slotNumber === partNum ? 100 : 0;
  }

  if (
    fileSlot.slotNumber == null &&
    partNum != null &&
    !fileSlot.isCombined &&
    !partSlot.isCombined &&
    isSingletonNumberedPart(part, context)
  ) {
    return 45;
  }

  if (
    fileSlot.slotNumber == null &&
    partNum == null &&
    !fileSlot.isCombined &&
    !partSlot.isCombined
  ) {
    return 30;
  }

  return 0;
};

export const partMatchesDriveFile = (part, file) => getMatchScore(part, file) > 0;

const slotNumbersForPartSlot = (slot) => {
  if (slot?.slotNumbers?.length) return slot.slotNumbers;
  if (slot?.slotNumber != null) return [slot.slotNumber];
  return [];
};

export const partsRepresentSameSlot = (a, b) => {
  if (!a || !b) return false;

  const aSlot = parsePartSlot(a.nombre_archivo);
  const bSlot = parsePartSlot(b.nombre_archivo);
  const sameInstrumentId =
    a.id_instrumento != null &&
    b.id_instrumento != null &&
    String(a.id_instrumento) === String(b.id_instrumento);
  const compatibleByName =
    instrumentsCompatible(aSlot, bSlot, a, b.nombre_archivo) ||
    instrumentsCompatible(bSlot, aSlot, b, a.nombre_archivo);

  if (!sameInstrumentId && !compatibleByName) return false;

  const aNumbers = slotNumbersForPartSlot(aSlot);
  const bNumbers = slotNumbersForPartSlot(bSlot);

  if (aNumbers.length > 0 || bNumbers.length > 0) {
    return (
      aNumbers.length > 0 &&
      bNumbers.length > 0 &&
      aNumbers.some((n) => bNumbers.includes(n))
    );
  }

  return true;
};

const getPercussionSeatingLabel = (part) => {
  const archivo = String(part?.nombre_archivo || "");
  const instrumento = String(
    part?.instrumento_nombre || part?.instrumentos?.instrumento || "",
  );
  return `${archivo} ${instrumento}`.toLowerCase();
};

/** timp = timbales; aux = resto de percusión; null = no es percusión de seating. */
export const getPercussionSeatingFamily = (part) => {
  const label = getPercussionSeatingLabel(part);
  if (
    /perc\s*timp|perc\s*timb|perc\.\s*timb|\btimbal/i.test(label) ||
    /\bperc\s+timp\b/i.test(label)
  ) {
    return "timp";
  }
  if (
    /perc|bombo|marimba|platillo|caja|glock|metalof|metalofon|xilo|mallet|pandeiro|triangulo|triángulo/i.test(
      label,
    )
  ) {
    return "aux";
  }
  return null;
};

/** Matching de sugerencias en Seating: solo Perc Timp se propaga; el resto de perc no sugiere. */
export const seatingPartsRepresentSameSlot = (a, b) => {
  const aPerc = getPercussionSeatingFamily(a);
  const bPerc = getPercussionSeatingFamily(b);
  if (aPerc === "aux" || bPerc === "aux") return false;
  if (Boolean(aPerc === "timp") !== Boolean(bPerc === "timp")) return false;
  return partsRepresentSameSlot(a, b);
};

export const DIRECTOR_INSTRUMENT_ID = "50";

const makePartShell = (instr, nombre_archivo, links = [], { es_solista = false } = {}) => ({
  tempId: Date.now() + Math.random(),
  id: undefined,
  id_instrumento: instr.id,
  nombre_archivo,
  links,
  nota_organico: "",
  instrumento_nombre: instr.instrumento,
  instrumento_abreviatura: instr.abreviatura ?? null,
  es_solista,
});

/** Formato de particella para seeds SQL (sin tempId/links de UI). */
export const toSeedPartShape = (part) => {
  const {
    tempId: _t,
    id: _id,
    links: _links,
    nota_organico: _n,
    ...rest
  } = part;
  return rest;
};

/** Sugiere una particella a partir de un archivo de Drive (sin expandir combinados). */
export const suggestPartFromDriveFile = (file, catalogoInstrumentos, options = {}) => {
  if (!file || !catalogoInstrumentos) return null;

  const rawName = file.name || "";
  if (!rawName || isDriveFileExcludedFromMatching(rawName)) return null;

  const prefix = getDriveFilePrefix(file, options);
  const combined = parseCombinedNumbers(prefix);
  const instr = resolveInstrumentFromPrefix(
    combined ? combined.remainder : prefix,
    catalogoInstrumentos,
    rawName,
  );
  if (!instr) return null;

  if (combined) return null;

  return makePartShell(instr, prefix, [], {
    es_solista: /\bsolo\b/i.test(prefix),
  });
};

/** Expande un archivo (incl. combinados) en una o más particellas. */
export const expandDriveFileToParts = (file, catalogoInstrumentos, options = {}) => {
  if (!file || !catalogoInstrumentos) return [];

  const rawName = file.name || "";
  if (!rawName || isDriveFileExcludedFromMatching(rawName)) return [];

  const prefix = getDriveFilePrefix(file, options);
  const combined = parseCombinedNumbers(prefix);
  const link = file.webViewLink
    ? [{ url: file.webViewLink, description: file.name }]
    : [];

  if (combined) {
    const instr = resolveInstrumentFromPrefix(
      combined.remainder,
      catalogoInstrumentos,
      rawName,
    );
    if (!instr) return [];
    const baseName = partDisplayBaseFromCatalog(instr);
    const esSolista = /\bsolo\b/i.test(combined.remainder);
    return combined.numbers.map((n) =>
      makePartShell(instr, `${baseName} ${n}`, [...link], { es_solista: esSolista }),
    );
  }

  const single = suggestPartFromDriveFile(file, catalogoInstrumentos, options);
  if (!single) return [];
  if (link.length) single.links = link;
  return [single];
};

/** Varias particellas por archivo (seeds); incluye expansión de combinados. */
export const suggestPartsFromDriveFile = (file, catalogoInstrumentos, options = {}) =>
  expandDriveFileToParts(file, catalogoInstrumentos, options).map(toSeedPartShape);

const linksFromPart = (part) => {
  if (Array.isArray(part?.links) && part.links.length) return part.links;
  if (part?.url_archivo != null && part.url_archivo !== "") {
    try {
      const parsed =
        typeof part.url_archivo === "string"
          ? JSON.parse(part.url_archivo)
          : part.url_archivo;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* url_archivo no es JSON */
    }
  }
  return Array.isArray(part?.links) ? part.links : [];
};

const partWithLinks = (part, links) => {
  const next = { ...part };
  if (Array.isArray(part.links) || !("url_archivo" in part)) next.links = links;
  if ("url_archivo" in part) next.url_archivo = JSON.stringify(links);
  return next;
};

const chairCollapseKey = (part) => {
  const slot = parsePartSlot(part?.nombre_archivo || "");
  if (slot.isCombined && (slot.slotNumbers?.length || 0) > 1) return null;
  const numbers = slot.slotNumbers?.length
    ? slot.slotNumbers.join(",")
    : "";
  return [
    String(part?.id_instrumento ?? ""),
    slot.baseNorm,
    numbers,
    part?.es_solista ? "1" : "0",
  ].join("|");
};

/**
 * Varios PDFs de la misma silla (distinta transposición) → una parte y varios links.
 * Un PDF combinado `1y2` ya viene expandido en sillas distintas y no se fusiona.
 */
export const collapseSameChairTranspositions = (parts) => {
  if (!Array.isArray(parts) || parts.length < 2) return parts ? [...parts] : [];
  const groups = new Map();
  const order = [];
  parts.forEach((part, index) => {
    const key = chairCollapseKey(part) ?? `multi|${index}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key).push(part);
  });

  return order.map((key) => {
    const group = groups.get(key);
    if (group.length === 1) return group[0];

    const names = [...new Set(group.map((p) => String(p.nombre_archivo || "")))];
    let nombre = names[0];
    if (names.length > 1) {
      const stripped = stripTranspositionKeys(
        arabicizeRomanPartNumbers(instrumentSegmentFromName(names[0])),
      );
      if (stripped) nombre = stripped;
    }

    const links = [];
    const seen = new Set();
    for (const part of group) {
      for (const link of linksFromPart(part)) {
        const url = link?.url || "";
        if (!url || seen.has(url)) continue;
        seen.add(url);
        links.push(link);
      }
    }

    const base = group.find((p) => p.nombre_archivo === nombre) || group[0];
    return partWithLinks({ ...base, nombre_archivo: nombre }, links);
  });
};

export const getSuggestedParts = (driveFiles, catalogoInstrumentos) => {
  if (!driveFiles?.length || !catalogoInstrumentos) return [];
  return collapseSameChairTranspositions(
    driveFiles.flatMap((file) =>
      expandDriveFileToParts(file, catalogoInstrumentos),
    ),
  );
};

const addLinkToPart = (part, file) => {
  if (!file?.webViewLink) return part;
  const links = [...(part.links || [])];
  if (!links.some((l) => l.url === file.webViewLink)) {
    links.push({ url: file.webViewLink, description: file.name });
  }
  return { ...part, links };
};

const findBestFileForPart = (part, usableFiles, { minScore, maxScore, usedExactIds, singletonFamilyKeys }) => {
  let best = null;
  let bestScore = 0;
  const context = { singletonFamilyKeys };

  for (const file of usableFiles) {
    const score = getMatchScore(part, file, context);
    if (score < minScore) continue;
    if (maxScore != null && score > maxScore) continue;
    if (score === 100 || score === 30 || score === 45) {
      if (usedExactIds?.has(file.id)) continue;
    }
    if (!best || score > bestScore) {
      best = file;
      bestScore = score;
    }
  }

  return best ? { file: best, score: bestScore } : null;
};

/** Empareja particellas con archivos Drive (exacto primero, luego combinados compartidos). */
export const attachDriveLinksByFilename = (partsList, driveFilesSorted) => {
  if (!partsList?.length || !driveFilesSorted?.length) return partsList;

  const usableFiles = driveFilesSorted.filter((f) => {
    const up = (f.name || "").toUpperCase();
    return !up.startsWith("PORTADA") && !up.startsWith("AUDIO");
  });

  const usedExactIds = new Set();
  let parts = partsList.map((p) => ({
    ...p,
    links: [...(p.links || [])],
  }));

  const linkPass = (minScore, maxScore) => {
    const singletonFamilyKeys = buildSingletonFamilyKeys(parts);
    parts = parts.map((part) => {
      if (part.links.length > 0) return part;
      const hit = findBestFileForPart(part, usableFiles, {
        minScore,
        maxScore,
        usedExactIds,
        singletonFamilyKeys,
      });
      if (!hit) return part;
      if (hit.score === 100 || hit.score === 30 || hit.score === 45) {
        usedExactIds.add(hit.file.id);
      }
      return addLinkToPart(part, hit.file);
    });
  };

  linkPass(100, 100);
  linkPass(50, 50);
  linkPass(45, 45);
  linkPass(30, 30);

  const singletonFamilyKeys = buildSingletonFamilyKeys(parts);
  const variantContext = { singletonFamilyKeys };
  parts = parts.map((part) => {
    let next = part;
    if (!(next.links || []).length) return next;
    for (const file of usableFiles) {
      if (!file?.webViewLink) continue;
      if ((next.links || []).some((l) => l.url === file.webViewLink)) continue;
      const score = getMatchScore(next, file, variantContext);
      if (score !== 100 && score !== 50) continue;
      const fileToken = transpositionToken(getDriveFilePrefix(file));
      if (!fileToken) continue;
      const existingTokens = (next.links || [])
        .map((l) =>
          transpositionToken(
            instrumentSegmentFromName(
              String(l.description || "").replace(/\.[^./\\]+$/, ""),
            ),
          ),
        )
        .filter(Boolean);
      if (existingTokens.includes(fileToken)) continue;
      next = addLinkToPart(next, file);
    }
    return next;
  });

  return parts;
};

/**
 * Sugiere un archivo Drive por particella sin links.
 * @returns {Record<string, object>} tempId → file
 */
export const suggestDriveLinksForParts = (parts, driveFiles) => {
  if (!parts?.length || !driveFiles?.length) return {};

  const usableFiles = driveFiles.filter((f) => {
    const up = (f.name || "").toUpperCase();
    return !up.startsWith("PORTADA") && !up.startsWith("AUDIO");
  });

  const withoutLinks = parts.filter((p) => !(p.links?.length));
  const sorted = [...withoutLinks].sort((a, b) =>
    String(a.nombre_archivo || "").localeCompare(
      String(b.nombre_archivo || ""),
      "es",
      { numeric: true, sensitivity: "base" },
    ),
  );

  const singletonFamilyKeys = buildSingletonFamilyKeys(parts);
  const matchContext = { singletonFamilyKeys };

  const result = {};
  const exactReserved = new Set();

  for (const part of sorted) {
    const key = part.tempId;
    const candidates = usableFiles
      .map((file) => ({
        file,
        score: getMatchScore(part, file, matchContext),
      }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);

    for (const { file, score } of candidates) {
      if (score === 50) {
        result[key] = file;
        break;
      }
      if (
        (score === 100 || score === 30 || score === 45) &&
        !exactReserved.has(file.id)
      ) {
        result[key] = file;
        exactReserved.add(file.id);
        break;
      }
    }
  }

  return result;
};

const fileAlreadyLinkedInParts = (file, parts) => {
  if (!file?.webViewLink) return false;
  return (parts || []).some((part) =>
    (part.links || []).some((link) => link.url === file.webViewLink),
  );
};

const candidateCoveredByExistingPart = (candidate, sourceFile, existingParts, matchContext) => {
  const candidateSlot = parsePartSlot(candidate?.nombre_archivo);
  const candidateNumber = getPartSlotNumber(candidateSlot);

  return (existingParts || []).some((part) => {
    if (partsRepresentSameSlot(candidate, part)) return true;

    if (candidateNumber == null && getMatchScore(part, sourceFile, matchContext) > 0) {
      return true;
    }

    return false;
  });
};

/**
 * Sugiere particellas para PDFs que no están cubiertos por las particellas existentes.
 * Devuelve una entrada por particella faltante para soportar PDFs combinados parcialmente cubiertos.
 * @returns {{ file: object, part: object }[]}
 */
export const getUncoveredDrivePartSuggestions = (parts, driveFiles, catalogoInstrumentos) => {
  if (!driveFiles?.length || !catalogoInstrumentos) return [];

  const existingParts = parts || [];
  const singletonFamilyKeys = buildSingletonFamilyKeys(existingParts);
  const matchContext = { singletonFamilyKeys };
  const acceptedParts = [...existingParts];
  const suggestions = [];

  for (const file of driveFiles) {
    const rawName = file?.name || "";
    if (!/\.pdf$/i.test(rawName) || isDriveFileExcludedFromMatching(rawName)) continue;
    if (fileAlreadyLinkedInParts(file, existingParts)) continue;

    const expanded = expandDriveFileToParts(file, catalogoInstrumentos);
    for (const candidate of expanded) {
      if (
        candidateCoveredByExistingPart(
          candidate,
          file,
          acceptedParts,
          matchContext,
        )
      ) {
        continue;
      }

      suggestions.push({ file, part: candidate });
      acceptedParts.push(candidate);
    }
  }

  return suggestions;
};

export const fileProducesParticella = (file, catalogoInstrumentos) =>
  expandDriveFileToParts(file, catalogoInstrumentos).length > 0;
