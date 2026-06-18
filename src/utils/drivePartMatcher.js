/**
 * Motor de matching Drive ↔ particellas (modal, seeds futuros).
 * Soporta archivos combinados: "Corno 1y2", "1 y 2", "1&2", "1-2", "1/2".
 */

const COMBINED_SUFFIX_PATTERNS = [
  { re: /(\d+)\s*y\s*(\d+)\s*$/i, pick: (m) => [m[1], m[2]] },
  { re: /(\d+)\s+y\s+(\d+)\s*$/i, pick: (m) => [m[1], m[2]] },
  { re: /(\d+)\s*&\s*(\d+)\s*$/i, pick: (m) => [m[1], m[2]] },
  { re: /(\d+)\s*[-/]\s*(\d+)\s*$/i, pick: (m) => [m[1], m[2]] },
];

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
    if (extracted) return String(extracted).trim();
  }
  const base = rawName.split(".")[0];
  return base.split("-")[0].trim();
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
  const base = String(nombre_archivo || "").split("-")[0].trim();
  const combined = parseCombinedNumbers(base);

  if (combined) {
    return {
      baseLabel: combined.remainder,
      baseNorm: applyPiccoloFlautaNorm(
        normalizeInstrumentString(combined.remainder),
        combined.remainder,
      ),
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
      baseNorm: applyPiccoloFlautaNorm(
        normalizeInstrumentString(remainder),
        remainder,
      ),
      slotNumbers: [n],
      isCombined: false,
      slotNumber: n,
    };
  }

  return {
    baseLabel: base,
    baseNorm: applyPiccoloFlautaNorm(
      normalizeInstrumentString(base),
      base,
    ),
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
  if (/clarinete\s+bajo|bass\s+clar/i.test(rawL)) {
    return pickCatalog(normalizedCatalog, (i) => /clarinete/i.test(i.instrumento || ""));
  }
  if (/^celesta|^key\b/i.test(rawL)) {
    return pickCatalog(normalizedCatalog, (i) =>
      /celesta|teclado|key/i.test(i.instrumento || ""),
    );
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
  const lowerPrefix = String(prefix || "").toLowerCase();
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
  if (/perc|mallet|marimba|bombo|platillo/i.test(lowerPrefix)) {
    const percCand = pickCatalog(
      normalizedCatalog,
      (i) =>
        i.norm.includes("perc") ||
        i.norm.includes("percus") ||
        /^perc\b/i.test(i.norm),
    );
    if (percCand) return percCand;
  }

  const explicit = resolveExplicitInstrument(prefix, normalizedCatalog, fullCatalog);
  if (explicit) return explicit;

  let normPrefix = applyPiccoloFlautaNorm(
    normalizeInstrumentString(prefix),
    prefix,
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
  if (
    isScoreLike(part?.nombre_archivo) ||
    isScoreLike(filePrefix) ||
    String(part?.instrumento_nombre || "")
      .toLowerCase()
      .includes("director")
  ) {
    return isScoreLike(part?.nombre_archivo) || isScoreLike(filePrefix);
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

export const getSuggestedParts = (driveFiles, catalogoInstrumentos) => {
  if (!driveFiles?.length || !catalogoInstrumentos) return [];
  return driveFiles.flatMap((file) =>
    expandDriveFileToParts(file, catalogoInstrumentos),
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
