import { normalizeRotationDeg } from "./stagePlotFormations";
import { resolveFormationFacingPoint } from "./stagePlotFormations";
import {
  STAGE_PLOT_ATRIL_DISTANCE_CM,
  STAGE_PLOT_ATRIL_LINE_CM,
  STAGE_PLOT_CM_TO_PX,
  stagePlotSatelliteAtrilGeometry,
} from "./stagePlotConstants";
import { stagePlotItemHasInstrumentFootprint } from "./stagePlotCatalog";

/** Claves organico con atril compartido ceil(n/2). */
const SHARED_ATRIL_ORGANICO_KEYS = new Set([
  "violin",
  "viola",
  "cello",
  "bass",
]);

const TYPE_TO_ORGANICO_KEY = new Map([
  ["violin", "violin"],
  ["viola", "viola"],
  ["cello", "cello"],
  ["bass", "bass"],
  ["harp", "harp"],
  ["guitar", "guitar"],
  ["bandoneon", "bandoneon"],
  ["flute", "flute"],
  ["oboe", "oboe"],
  ["clarinet", "clarinet"],
  ["bassoon", "bassoon"],
  ["horn", "horn"],
  ["trumpet", "trumpet"],
  ["trombone", "trombone"],
  ["tuba", "tuba"],
  ["timpani", "timpani"],
  ["perc", "perc"],
  ["piano", "keyboard"],
  ["celesta", "keyboard"],
]);

/** Tipos de cuerda que admiten par con atril compartido. */
export const STAGE_PLOT_STRING_PAIR_TYPES = new Set([
  "violin",
  "viola",
  "cello",
  "bass",
]);

/** Separación lateral entre los dos instrumentos de un par (cm). */
export const STAGE_PLOT_STRING_PAIR_SPACING_CM = 50;

/**
 * Punto del director para orientar atriles satélite.
 * @param {Array} items
 * @param {object} stage
 * @param {{ x: number, y: number }|null} [override]
 */
export function resolveStagePlotConductorPoint(items, stage, override) {
  if (
    override &&
    Number.isFinite(override.x) &&
    Number.isFinite(override.y)
  ) {
    return { x: override.x, y: override.y };
  }
  const conductor = (items || []).find((it) => it.type === "conductor");
  if (conductor) return { x: conductor.x, y: conductor.y };
  return resolveFormationFacingPoint(items || [], stage || {});
}

/**
 * Posición y rotación de un atril satélite respecto a un punto ancla hacia el director.
 * El plato queda perpendicular al rayo director→atril (tangente al círculo).
 * @param {number} anchorX
 * @param {number} anchorY
 * @param {number} conductorX
 * @param {number} conductorY
 * @param {number} [distanceCm]
 */
export function computeSatelliteAtrilPlacement(
  anchorX,
  anchorY,
  conductorX,
  conductorY,
  distanceCm = STAGE_PLOT_ATRIL_DISTANCE_CM,
) {
  const dx = conductorX - anchorX;
  const dy = conductorY - anchorY;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const offsetPx = distanceCm * STAGE_PLOT_CM_TO_PX;
  const x = anchorX + ux * offsetPx;
  const y = anchorY + uy * offsetPx;
  // Rayo conductor → atril (no conductor → ancla): evita rotación 180° invertida.
  const rdx = x - conductorX;
  const rdy = y - conductorY;
  const radiusRad = Math.atan2(rdy, rdx);
  const rotationDeg = normalizeRotationDeg(
    (radiusRad * 180) / Math.PI + 90,
  );
  return { x, y, rotationDeg };
}

/**
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {{ x: number, y: number }|null} [conductorOverride]
 * @returns {Set<string>}
 */
export function getStringPairMemberItemIds(payload) {
  const paired = new Set();
  for (const g of payload.groups || []) {
    if (g.kind !== "string_pair") continue;
    for (const id of g.itemIds || []) paired.add(id);
  }
  return paired;
}

/**
 * Lista de atriles satélite derivados para canvas/PDF.
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {{ x: number, y: number }|null} [conductorOverride]
 * @param {Record<string, { x: number, y: number }>|Map<string, { x: number, y: number }>|null} [livePositions]
 * @returns {Array<{ id: string, x: number, y: number, rotationDeg: number, kind: 'single'|'pair', parentIds: string[] }>}
 */
export function collectStagePlotSatelliteAtrils(
  payload,
  conductorOverride,
  livePositions = null,
) {
  const items = payload.items || [];
  const groups = payload.groups || [];
  const live =
    livePositions instanceof Map
      ? livePositions
      : livePositions && typeof livePositions === "object"
        ? new Map(Object.entries(livePositions))
        : null;
  const resolveItem = (it) => {
    if (!it) return it;
    const p = live?.get(it.id);
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      return { ...it, x: p.x, y: p.y };
    }
    return it;
  };
  const conductor = resolveStagePlotConductorPoint(
    items,
    payload.stage || {},
    conductorOverride,
  );
  const pairedIds = getStringPairMemberItemIds(payload);
  const atrils = [];
  const usedPairGroups = new Set();

  for (const g of groups) {
    if (g.kind !== "string_pair" || usedPairGroups.has(g.id)) continue;
    const members = (g.itemIds || [])
      .map((id) => resolveItem(items.find((it) => it.id === id)))
      .filter(Boolean);
    if (members.length < 2) continue;
    usedPairGroups.add(g.id);
    const cx =
      members.reduce((s, it) => s + it.x, 0) / members.length;
    const cy =
      members.reduce((s, it) => s + it.y, 0) / members.length;
    const placement = computeSatelliteAtrilPlacement(
      cx,
      cy,
      conductor.x,
      conductor.y,
    );
    atrils.push({
      id: `pair-atril-${g.id}`,
      x: placement.x,
      y: placement.y,
      rotationDeg: placement.rotationDeg,
      kind: "pair",
      parentIds: members.map((m) => m.id),
    });
  }

  for (const item of items) {
    if (!stagePlotItemHasInstrumentFootprint(item.type)) continue;
    if (pairedIds.has(item.id)) continue;
    const liveItem = resolveItem(item);
    const placement = computeSatelliteAtrilPlacement(
      liveItem.x,
      liveItem.y,
      conductor.x,
      conductor.y,
    );
    atrils.push({
      id: `atril-${item.id}`,
      x: placement.x,
      y: placement.y,
      rotationDeg: placement.rotationDeg,
      kind: "single",
      parentIds: [item.id],
    });
  }

  return atrils;
}

/** @param {number} [atrilPx] */
export function stagePlotSatelliteAtrilDrawMm(atrilPx) {
  const px =
    atrilPx != null && Number.isFinite(atrilPx)
      ? atrilPx
      : STAGE_PLOT_ATRIL_LINE_CM * STAGE_PLOT_CM_TO_PX;
  return { atrilPx: px, geometry: stagePlotSatelliteAtrilGeometry(px) };
}

/**
 * Cuenta atriles dibujados: pares compartidos + ceil(singles/2) cuerdas + 1:1 resto + atriles manuales.
 * @param {Array} items
 * @param {Array} groups
 */
export function countStagePlotDrawnAtriles(items = [], groups = []) {
  let count = 0;
  const pairedIds = new Set();

  for (const g of groups) {
    if (g.kind === "string_pair" && (g.itemIds || []).length >= 2) {
      count += 1;
      for (const id of g.itemIds) pairedIds.add(id);
    }
  }

  const stringBuckets = Object.fromEntries(
    [...SHARED_ATRIL_ORGANICO_KEYS].map((k) => [k, 0]),
  );
  let nonString = 0;

  for (const it of items) {
    if (it.type === "music_stand") {
      count += 1;
      continue;
    }
    if (!stagePlotItemHasInstrumentFootprint(it.type)) continue;
    if (pairedIds.has(it.id)) continue;
    const key = TYPE_TO_ORGANICO_KEY.get(it.type);
    if (key && SHARED_ATRIL_ORGANICO_KEYS.has(key)) {
      stringBuckets[key] += 1;
    } else {
      nonString += 1;
    }
  }

  count += nonString;
  for (const key of SHARED_ATRIL_ORGANICO_KEYS) {
    count += Math.ceil((stringBuckets[key] || 0) / 2);
  }
  return count;
}

/** @param {string} type */
export function stagePlotTypeSupportsStringPair(type) {
  return STAGE_PLOT_STRING_PAIR_TYPES.has(type);
}
