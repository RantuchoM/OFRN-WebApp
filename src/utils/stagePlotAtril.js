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
 * Lista de atriles satélite derivados.
 * @deprecated Auto-atriles desactivados: los atriles son ítems `music_stand` explícitos
 * (menú contextual / paleta). Conservado por si se necesita recalcular colocación.
 * @returns {[]}
 */
export function collectStagePlotSatelliteAtrils() {
  return [];
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
 * Cuenta atriles dibujados: solo ítems explícitos `music_stand` (paleta / menú contextual).
 * @param {Array} items
 * @param {Array} [_groups] legacy; ignorado
 */
export function countStagePlotDrawnAtriles(items = [], _groups = []) {
  let count = 0;
  for (const it of items) {
    if (it.type === "music_stand") count += 1;
  }
  return count;
}

/** @param {string} type */
export function stagePlotTypeSupportsStringPair(type) {
  return STAGE_PLOT_STRING_PAIR_TYPES.has(type);
}

/**
 * ¿Selección admite «Agregar atril» (1 instrumento con huella)?
 * @param {Array} items
 */
export function stagePlotSelectionCanAddAtril(items = []) {
  return (
    items.length === 1 && stagePlotItemHasInstrumentFootprint(items[0]?.type)
  );
}

/**
 * ¿Selección admite «Agregar atril compartido» (2 cuerdas)?
 * @param {Array} items
 */
export function stagePlotSelectionCanAddSharedAtril(items = []) {
  if (items.length !== 2) return false;
  return items.every((it) => STAGE_PLOT_STRING_PAIR_TYPES.has(it?.type));
}
