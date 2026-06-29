import { integranteKey } from "./integranteIds";
import { SEATING_STRING_INSTR_IDS } from "./seatingStringsComposition";
import {
  buildSeatingContainerRankMap,
  dedupeSeatingStringItems,
  seatingStringItemRankTuple,
} from "./seatingStringItemsDedupe";

const isStringInstrument = (idInstr) =>
  SEATING_STRING_INSTR_IDS.includes(String(idInstr ?? "").trim());

function compareRankTuples(a, b) {
  const len = Math.max(a?.length ?? 0, b?.length ?? 0);
  for (let i = 0; i < len; i += 1) {
    const va = a?.[i] ?? Number.MAX_SAFE_INTEGER;
    const vb = b?.[i] ?? Number.MAX_SAFE_INTEGER;
    const diff = va - vb;
    if (diff !== 0) return diff;
  }
  return 0;
}

function stringSortTier(musician, ctx) {
  if (!isStringInstrument(musician?.id_instr)) return 2;
  if (ctx?.getRank?.(musician.id)) return 0;
  return 1;
}

/**
 * Contexto de seating para ordenar cuerdas por contenedor y posición en atril.
 */
export function buildRosterSeatingSortContext(containers = [], items = []) {
  const containerRankMap = buildSeatingContainerRankMap(containers);
  const deduped = dedupeSeatingStringItems(items, containers);
  const rankByMusician = new Map();
  const containerByMusician = new Map();

  deduped.forEach((item, index) => {
    const key = integranteKey(item.id_musico);
    if (!key) return;
    rankByMusician.set(
      key,
      seatingStringItemRankTuple(item, containerRankMap, index),
    );
    containerByMusician.set(key, item.id_contenedor);
  });

  const nameByContainerId = new Map();
  (containers || []).forEach((c) => {
    if (c?.id == null) return;
    nameByContainerId.set(
      String(c.id),
      String(c.nombre || "").trim() || "Grupo",
    );
  });

  return {
    getRank(musicianId) {
      return rankByMusician.get(integranteKey(musicianId)) ?? null;
    },
    getContainerId(musicianId) {
      const id = containerByMusician.get(integranteKey(musicianId));
      return id == null ? null : id;
    },
    getContainerName(containerId) {
      if (containerId == null) return null;
      return nameByContainerId.get(String(containerId)) ?? null;
    },
  };
}

/**
 * Comparador para «Orden: Instrumento» con cuerdas según seating.
 */
export function compareRosterByInstrument(a, b, seatingCtx, rolePriority) {
  const pA = rolePriority(a.rol_gira);
  const pB = rolePriority(b.rol_gira);
  if (pA !== pB) return pA - pB;

  const tierA = stringSortTier(a, seatingCtx);
  const tierB = stringSortTier(b, seatingCtx);
  if (tierA !== tierB) return tierA - tierB;

  if (tierA === 0 && seatingCtx) {
    const rankA = seatingCtx.getRank(a.id);
    const rankB = seatingCtx.getRank(b.id);
    const cmp = compareRankTuples(rankA, rankB);
    if (cmp !== 0) return cmp;
    return (a.apellido || "").localeCompare(b.apellido || "", "es");
  }

  const instA = String(a.id_instr || "999");
  const instB = String(b.id_instr || "999");
  if (instA !== instB) return instA.localeCompare(instB, undefined, { numeric: true });
  return (a.apellido || "").localeCompare(b.apellido || "", "es");
}

const SPECIAL_GIRA_ROLES = new Set(["director", "solista"]);

function isSpecialGiraRole(rol) {
  return SPECIAL_GIRA_ROLES.has(String(rol || "").toLowerCase());
}

function musicianInstrumentLabel(musician) {
  return (
    musician?.instrumentos?.instrumento?.trim() ||
    (musician?.id_instr ? `Instrumento ${musician.id_instr}` : "Instrumento")
  );
}

function stringContainerLabel(musician, seatingCtx) {
  const containerId = seatingCtx?.getContainerId?.(musician.id);
  if (containerId != null) {
    return seatingCtx?.getContainerName?.(containerId) || "Grupo";
  }
  return "Sin contenedor";
}

/** Clave estable del grupo para selección masiva (orden por instrumento). */
export function getRosterInstrumentGroupKey(musician, seatingCtx) {
  if (!musician || isSpecialGiraRole(musician.rol_gira)) return null;

  if (isStringInstrument(musician.id_instr)) {
    const containerId = seatingCtx?.getContainerId?.(musician.id);
    if (containerId != null) return `container:${containerId}`;
    return `container:unassigned:${String(musician.id_instr || "")}`;
  }

  return `instrument:${String(musician.id_instr || "")}`;
}

/**
 * Columnas visibles de la tabla del roster (debe coincidir con thead / RosterTableRow).
 */
export function getRosterTableColumnCount(visibleColumns = {}) {
  let count = 6;
  if (visibleColumns.genero) count += 1;
  if (visibleColumns.ensambles) count += 1;
  if (visibleColumns.localidad) count += 1;
  if (visibleColumns.alimentacion) count += 1;
  return count;
}

/**
 * Separador visual entre filas del roster (solo orden por instrumento).
 * @returns {{ type: 'container' | 'instrument', label: string } | null}
 */
export function getRosterInstrumentRowSeparator(prev, curr, seatingCtx) {
  if (!prev || !curr) return null;
  if (isSpecialGiraRole(curr.rol_gira)) return null;

  const currIsString = isStringInstrument(curr.id_instr);
  const prevIsString = isStringInstrument(prev.id_instr);

  if (currIsString) {
    const prevContainer = prevIsString
      ? (seatingCtx?.getContainerId?.(prev.id) ?? null)
      : null;
    const currContainer = seatingCtx?.getContainerId?.(curr.id) ?? null;

    if (prevIsString) {
      const sameContainer =
        String(prevContainer ?? "") === String(currContainer ?? "");
      const sameUnassignedGroup =
        prevContainer == null &&
        currContainer == null &&
        String(prev.id_instr || "") === String(curr.id_instr || "");
      if (sameContainer && (prevContainer != null || sameUnassignedGroup)) {
        return null;
      }
    }

    return {
      type: "container",
      label: stringContainerLabel(curr, seatingCtx),
      groupKey: getRosterInstrumentGroupKey(curr, seatingCtx),
    };
  }

  const prevInst = String(prev.id_instr || "");
  const currInst = String(curr.id_instr || "");
  if (prevInst === currInst) return null;

  return {
    type: "instrument",
    label: musicianInstrumentLabel(curr),
    groupKey: getRosterInstrumentGroupKey(curr, seatingCtx),
  };
}
