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

export const getMusicianSeatingPartNumber = (
  musicianId,
  { obras = [], getPartIdsForObra, particellas = [] } = {},
) => {
  if (!musicianId || typeof getPartIdsForObra !== "function") return null;

  for (const obra of obras) {
    const obraId = obra?.obra_id ?? obra?.id;
    if (obraId == null) continue;

    const partIds = getPartIdsForObra(musicianId, obraId) || [];
    for (const partId of partIds) {
      const part = particellas.find(
        (p) => String(p.id) === String(partId),
      );
      const label =
        part?.nombre_archivo ||
        part?.instrumentos?.instrumento ||
        part?.instrumento_nombre ||
        "";
      const num = getPartSlotNumberFromLabel(label);
      if (num != null) return num;
    }
  }

  return null;
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
 * (Fagot 1 antes que 2, Corno 1…4). En percusión (id 13), Perc Timp antes que el resto.
 * Desempate por apellido si no hay número.
 */
export const sortWindMusiciansForSeating = (musicians = [], sortOptions = {}) => {
  const resolveRank = (musician) => {
    const num = getMusicianSeatingPartNumber(musician?.id, sortOptions);
    return num ?? Number.POSITIVE_INFINITY;
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
