/** Heurística de DriveMatcherModal para scripts de seed. */

import {
  extractInstrumentFromExistingName,
  normalizeInstrumentLabel,
} from "./pdfPartsRenaming.mjs";

export const DIRECTOR_INSTRUMENT_ID = "50";

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

const isCoreInstrumentId = (id) => {
  const match = String(id).match(/\d+/);
  if (!match) return false;
  const num = parseInt(match[0], 10);
  return num >= 1 && num <= 29;
};

export const isDriveFileExcludedFromMatching = (rawName) => {
  const upper = (rawName || "").toUpperCase();
  return upper.startsWith("PORTADA") || upper.startsWith("AUDIO");
};

const isScoreLike = (text) =>
  /\b(director|conductor|score|partitura)\b/i.test(String(text || ""));

function pick(catalog, pred) {
  return catalog.find(pred) || null;
}

function partResult(instr, nombre_archivo) {
  if (!instr) return null;
  return {
    id_instrumento: instr.id,
    nombre_archivo,
    instrumento_nombre: instr.instrumento,
    instrumento_abreviatura: instr.abreviatura ?? null,
    es_solista: false,
  };
}

function resolveExplicitInstrument(prefix, catalog, fullCatalog) {
  const label = normalizeInstrumentLabel(prefix);
  const rawL = prefix.toLowerCase();

  if (/^contrafagot/i.test(label) || /contrafagot/i.test(rawL)) {
    const cf =
      (fullCatalog || catalog).find((i) => /contrafagot/i.test(i.instrumento || "")) ||
      pick(catalog, (i) => /fagot/i.test(i.instrumento || ""));
    return partResult(cf, prefix);
  }
  if (/^ob\s*eh|corno\s+ingles|english\s+horn/i.test(label) || /ob eh/i.test(rawL)) {
    const eh =
      pick(catalog, (i) => /ingles|english/i.test(i.instrumento || "")) ||
      pick(catalog, (i) => /oboe/i.test(i.instrumento || ""));
    return partResult(eh, prefix);
  }
  if (/clarinete\s+a|cl\s+a/i.test(label) || /clarinete a/i.test(rawL)) {
    const cl = pick(catalog, (i) => /clarinete/i.test(i.instrumento || ""));
    return partResult(cl, prefix);
  }
  if (/clarinete\s+bajo|bass\s+clar/i.test(label)) {
    const cl = pick(catalog, (i) => /clarinete/i.test(i.instrumento || ""));
    return partResult(cl, prefix);
  }
  if (/^celesta|^key\b/i.test(label)) {
    const key = pick(catalog, (i) => /celesta|teclado|key/i.test(i.instrumento || ""));
    return partResult(key, prefix);
  }

  return null;
}

export const suggestPartFromDriveFile = (file, catalog) => {
  const rawName = file.name || "";
  if (!rawName || isDriveFileExcludedFromMatching(rawName)) return null;

  const fullCatalog = catalog || [];
  const normalizedCatalog = fullCatalog
    .filter((i) => isCoreInstrumentId(i.id))
    .map((i) => ({ ...i, norm: normalizeInstrumentString(i.instrumento) }));

  const extracted = extractInstrumentFromExistingName(rawName);
  const prefix = extracted || rawName.split(".")[0].split("-")[0].trim();
  const lowerPrefix = prefix.toLowerCase();

  if (isScoreLike(lowerPrefix)) {
    const instrObj = normalizedCatalog.find((i) => i.id === DIRECTOR_INSTRUMENT_ID);
    return {
      id_instrumento: DIRECTOR_INSTRUMENT_ID,
      nombre_archivo: prefix || "SCORE",
      instrumento_nombre: instrObj?.instrumento || "Director",
      instrumento_abreviatura: instrObj?.abreviatura ?? null,
      es_solista: false,
    };
  }

  if (/^imslp\d/i.test(lowerPrefix) || /^imslp\d/i.test(rawName)) {
    return {
      id_instrumento: DIRECTOR_INSTRUMENT_ID,
      nombre_archivo: prefix || "SCORE",
      instrumento_nombre: "Director",
      instrumento_abreviatura: null,
      es_solista: false,
    };
  }

  if (/continuo|bajo continuo/i.test(lowerPrefix)) {
    const vc =
      pick(normalizedCatalog, (i) => /violoncello/i.test(i.instrumento || "")) ||
      pick(normalizedCatalog, (i) => /contrabajo/i.test(i.instrumento || ""));
    if (vc) return partResult(vc, prefix);
  }

  if (/perc\s*timb|timbal|timp/i.test(lowerPrefix)) {
    const timpCand =
      pick(normalizedCatalog, (i) => /timbal|timp/i.test(i.instrumento || "")) ||
      pick(normalizedCatalog, (i) => /perc/i.test(i.norm));
    if (timpCand) return partResult(timpCand, prefix);
  }
  if (/perc|mallet|marimba|bombo|platillo/i.test(lowerPrefix)) {
    const percCand = pick(
      normalizedCatalog,
      (i) =>
        i.norm.includes("perc") ||
        i.norm.includes("percus") ||
        /^perc\b/i.test(i.norm),
    );
    if (percCand) return partResult(percCand, prefix);
  }

  const explicit = resolveExplicitInstrument(prefix, normalizedCatalog, fullCatalog);
  if (explicit) return { ...explicit, es_solista: /\bsolo\b/i.test(prefix) };

  let normPrefix = normalizeInstrumentString(prefix);
  if (!normPrefix) return null;

  if (
    /picc|piccolo|^fp\b|^fi\b/.test(lowerPrefix) ||
    /\bfl\s+picc/i.test(lowerPrefix) ||
    normPrefix.includes("piccolo")
  ) {
    normPrefix = "flauta";
  }

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

  if (!best) return null;
  if (best.sim !== undefined && best.sim < 0.4) return null;

  return {
    id_instrumento: best.id,
    nombre_archivo: prefix,
    instrumento_nombre: best.instrumento,
    instrumento_abreviatura: best.abreviatura ?? null,
    es_solista: /\bsolo\b/i.test(prefix),
  };
};
