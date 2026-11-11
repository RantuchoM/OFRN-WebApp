import { parsePartSlot, getPercussionSeatingFamily } from "./drivePartMatcher";

const ROMAN_TO_NUMBER = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };

export const getMusicianPartIdsFromMap = (musicianAssignments, key) => {
  const ids = musicianAssignments?.[key];
  if (!Array.isArray(ids)) return [];
  return ids.filter(
    (id, index) =>
      id &&
      ids.findIndex((candidate) => String(candidate) === String(id)) === index,
  );
};

/** Extrae el número de parte (1, 2, 3…) desde el nombre de archivo/etiqueta. */
export const getPartSlotNumberFromLabel = (label = "") => {
  const cleaned = String(label || "")
    .replace(/\.(pdf|docx?)$/i, "")
    .trim();
  if (!cleaned) return null;

  const slot = parsePartSlot(cleaned);
  const fromParse = slot.slotNumber ?? slot.slotNumbers?.[0];
  if (fromParse != null) return fromParse;

  const romanMatch = cleaned.match(/\b(IV|III|II|I|V|VI)\s*$/i);
  if (romanMatch) {
    return ROMAN_TO_NUMBER[romanMatch[1].toLowerCase()] ?? null;
  }

  return null;
};

const partNumberFromPartId = (partId, particellas = []) => {
  const part = particellas.find((p) => String(p.id) === String(partId));
  const label =
    part?.nombre_archivo ||
    part?.instrumentos?.instrumento ||
    part?.instrumento_nombre ||
    "";
  return getPartSlotNumberFromLabel(label);
};

/**
 * Info de parte del músico en una obra.
 * `number: null` + `hasAssignment: true` = particella asignada sin número
 * (p. ej. «Fagot» frente a «Fagot 2» → se asume principal = 1).
 */
const getMusicianSeatingPartInfoForObra = (
  musicianId,
  obraId,
  { getPartIdsForObra, particellas = [] } = {},
) => {
  if (
    musicianId == null ||
    obraId == null ||
    typeof getPartIdsForObra !== "function"
  ) {
    return { number: null, hasAssignment: false };
  }
  const partIds = getPartIdsForObra(musicianId, obraId) || [];
  if (!partIds.length) return { number: null, hasAssignment: false };

  for (const partId of partIds) {
    const num = partNumberFromPartId(partId, particellas);
    if (num != null) return { number: num, hasAssignment: true };
  }
  return { number: null, hasAssignment: true };
};

/** Número de parte del músico en una obra concreta (primera particella con número). */
export const getMusicianSeatingPartNumberForObra = (
  musicianId,
  obraId,
  options = {},
) => getMusicianSeatingPartInfoForObra(musicianId, obraId, options).number;

const getMusicianSeatingPartInfo = (
  musicianId,
  { obras = [], getPartIdsForObra, particellas = [] } = {},
) => {
  if (!musicianId || typeof getPartIdsForObra !== "function") {
    return { number: null, hasAssignment: false };
  }

  let sawUnnumbered = false;
  for (const obra of obras) {
    const obraId = obra?.obra_id ?? obra?.id;
    if (obraId == null) continue;
    const info = getMusicianSeatingPartInfoForObra(musicianId, obraId, {
      getPartIdsForObra,
      particellas,
    });
    if (!info.hasAssignment) continue;
    if (info.number != null) return info;
    sawUnnumbered = true;
  }

  if (sawUnnumbered) return { number: null, hasAssignment: true };
  return { number: null, hasAssignment: false };
};

export const getMusicianSeatingPartNumber = (musicianId, sortOptions = {}) =>
  getMusicianSeatingPartInfo(musicianId, sortOptions).number;

/**
 * Si hay partes numeradas y otras del mismo instrumento sin número
 * («Fagot» + «Fagot 2»), la sin número cuenta como 1 (principal).
 * @param {Map<string, number|null>} byMusician
 */
const applyImpliedPrincipalPartNumber = (byMusician) => {
  if (!byMusician?.size) return;
  const values = [...byMusician.values()];
  const hasExplicit = values.some((n) => n != null);
  const hasUnnumbered = values.some((n) => n == null);
  if (!hasExplicit || !hasUnnumbered) return;
  for (const [id, num] of byMusician) {
    if (num == null) byMusician.set(id, 1);
  }
};

/**
 * Elige la primera obra cuyo número de parte no esté duplicado entre ≥2 músicos
 * del mismo instrumento (p. ej. dos «Flauta 1» en la obra 1 → usar la obra 2).
 * Parte sin número cuenta como 1 si hay pares con número explícito.
 * @returns {Map<string, number>} musicianId → rank (menor = antes)
 */
export const resolveSeatingPartRanksForInstrumentGroup = (
  musicians = [],
  sortOptions = {},
) => {
  const { obras = [], getPartIdsForObra, particellas = [] } = sortOptions;
  const ranks = new Map();
  const list = (musicians || []).filter((m) => m?.id != null);
  if (!list.length || typeof getPartIdsForObra !== "function") return ranks;

  for (const obra of obras) {
    const obraId = obra?.obra_id ?? obra?.id;
    if (obraId == null) continue;

    const byMusician = new Map();
    for (const m of list) {
      const info = getMusicianSeatingPartInfoForObra(m.id, obraId, {
        getPartIdsForObra,
        particellas,
      });
      if (info.hasAssignment) byMusician.set(String(m.id), info.number);
    }

    if (byMusician.size < 2) continue;

    applyImpliedPrincipalPartNumber(byMusician);

    const seen = new Set();
    let hasDuplicate = false;
    for (const num of byMusician.values()) {
      if (seen.has(num)) {
        hasDuplicate = true;
        break;
      }
      seen.add(num);
    }
    if (hasDuplicate) continue;

    for (const [id, num] of byMusician) {
      if (num != null) ranks.set(id, num);
    }
    return ranks;
  }

  // Fallback: primera parte disponible por músico (+ 1 implícito si aplica)
  const fallback = new Map();
  for (const m of list) {
    const info = getMusicianSeatingPartInfo(m.id, sortOptions);
    if (info.hasAssignment) fallback.set(String(m.id), info.number);
  }
  applyImpliedPrincipalPartNumber(fallback);
  for (const [id, num] of fallback) {
    if (num != null) ranks.set(id, num);
  }
  return ranks;
};

const PERCUSSION_INSTRUMENT_ID = "13";

export const getMusicianPercussionSeatingFamily = (
  musician,
  { obras = [], getPartIdsForObra, particellas = [] } = {},
) => {
  if (musician?.id != null && typeof getPartIdsForObra === "function") {
    for (const obra of obras) {
      const obraId = obra?.obra_id ?? obra?.id;
      if (obraId == null) continue;

      const partIds = getPartIdsForObra(musician.id, obraId) || [];
      for (const partId of partIds) {
        const part = particellas.find(
          (p) => String(p.id) === String(partId),
        );
        const family = getPercussionSeatingFamily(part);
        if (family) return family;
      }
    }
  }

  const instrName = String(
    musician?.instrumentos?.instrumento || "",
  ).toLowerCase();
  if (/timbal|\btimp\b/i.test(instrName)) return "timp";
  if (
    /perc|bombo|marimba|platillo|caja|glock|metalof|xilo|mallet/i.test(
      instrName,
    )
  ) {
    return "aux";
  }

  if (String(musician?.id_instr ?? "").trim() === PERCUSSION_INSTRUMENT_ID) {
    return "aux";
  }

  return null;
};

const percussionFamilySortRank = (musician, sortOptions) => {
  const family = getMusicianPercussionSeatingFamily(musician, sortOptions);
  if (family === "timp") return 0;
  if (family === "aux") return 1;
  return 2;
};

export const buildSeatingPartSortOptions = ({
  obras = [],
  musicianAssignments = {},
  particellas = [],
}) => ({
  obras,
  particellas,
  getPartIdsForObra: (musicianId, obraId) =>
    getMusicianPartIdsFromMap(
      musicianAssignments,
      `M-${musicianId}-${obraId}`,
    ),
});

/**
 * Ordena vientos/percusión: primero por id_instr, luego por número de parte asignada
 * (Fagot 1 antes que 2, Corno 1…4). «Fagot» sin número + «Fagot 2» → la sin número
 * cuenta como 1. Si en la 1.ª obra la misma parte está duplicada en dos músicos del
 * mismo instrumento, se usa la siguiente obra sin duplicados.
 * En percusión (id 13), Perc Timp antes que el resto de perc auxiliar.
 * Desempate por apellido si no hay número.
 */
export const sortWindMusiciansForSeating = (musicians = [], sortOptions = {}) => {
  const byInstr = new Map();
  for (const m of musicians || []) {
    const key = String(m?.id_instr ?? "9999");
    if (!byInstr.has(key)) byInstr.set(key, []);
    byInstr.get(key).push(m);
  }

  const rankByMusicianId = new Map();
  for (const group of byInstr.values()) {
    const ranks = resolveSeatingPartRanksForInstrumentGroup(group, sortOptions);
    for (const [id, num] of ranks) rankByMusicianId.set(id, num);
  }

  const resolveRank = (musician) => {
    const id = musician?.id != null ? String(musician.id) : null;
    if (id && rankByMusicianId.has(id)) return rankByMusicianId.get(id);
    return Number.POSITIVE_INFINITY;
  };

  return [...musicians].sort((a, b) => {
    const instrA = String(a?.id_instr ?? "9999");
    const instrB = String(b?.id_instr ?? "9999");
    if (instrA !== instrB) {
      return instrA.localeCompare(instrB, undefined, { numeric: true });
    }

    if (instrA === PERCUSSION_INSTRUMENT_ID) {
      const percRankA = percussionFamilySortRank(a, sortOptions);
      const percRankB = percussionFamilySortRank(b, sortOptions);
      if (percRankA !== percRankB) return percRankA - percRankB;
    }

    const rankA = resolveRank(a);
    const rankB = resolveRank(b);
    if (rankA !== rankB) return rankA - rankB;

    return (a?.apellido || "").localeCompare(b?.apellido || "", "es");
  });
};
