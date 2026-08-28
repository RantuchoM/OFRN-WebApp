/**
 * Pares de instrumentos (atril compartido) en el stage plot.
 *
 * A y B se mueven con libertad relativa. El atril es un satélite derivado:
 * punto medio de A–B, 40 cm sobre la perpendicular al segmento del lado
 * del director (línea del par → director).
 */

import { stagePlotItemHasInstrumentFootprint } from "./stagePlotCatalog";
import {
  STAGE_PLOT_ATRIL_LINE_CM,
  STAGE_PLOT_CM_TO_PX,
  STAGE_PLOT_DESK_PAIR_ATRIL_OFFSET_CM,
} from "./stagePlotConstants";

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `spd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * @param {unknown} p
 * @returns {{ id: string, itemIds: [string, string] }|null}
 */
export function normalizeStagePlotDeskPair(p) {
  if (!p || typeof p !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (p);
  const ids = Array.isArray(o.itemIds)
    ? [...new Set(o.itemIds.map((id) => String(id)).filter(Boolean))]
    : [];
  if (ids.length !== 2) return null;
  return { id: String(o.id || newId()), itemIds: [ids[0], ids[1]] };
}

/**
 * @param {unknown[]} raw
 */
export function pruneStagePlotDeskPairs(raw) {
  return (raw || []).map(normalizeStagePlotDeskPair).filter(Boolean);
}

/**
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 */
export function deskPairIdByItemId(payload) {
  const map = new Map();
  for (const pair of payload?.deskPairs || []) {
    for (const id of pair.itemIds || []) {
      if (!map.has(id)) map.set(id, pair.id);
    }
  }
  return map;
}

/** @param {string} itemId */
export function findDeskPairId(payload, itemId) {
  if (!itemId) return null;
  return deskPairIdByItemId(payload).get(String(itemId)) || null;
}

/** @param {string} itemId */
export function isItemInDeskPair(payload, itemId) {
  return Boolean(findDeskPairId(payload, itemId));
}

/**
 * Pares con 2 miembros vivos de huella; un ítem no puede estar en dos pares.
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 */
export function reconcileStagePlotDeskPairs(payload) {
  const items = payload.items || [];
  const liveFootprint = new Set(
    items
      .filter((it) => stagePlotItemHasInstrumentFootprint(it.type))
      .map((it) => it.id),
  );
  const seen = new Set();
  const deskPairs = [];
  for (const pair of pruneStagePlotDeskPairs(payload.deskPairs || [])) {
    const live = pair.itemIds.filter((id) => liveFootprint.has(id));
    if (live.length !== 2) continue;
    if (live.some((id) => seen.has(id))) continue;
    live.forEach((id) => seen.add(id));
    deskPairs.push({ id: pair.id, itemIds: [live[0], live[1]] });
  }
  return { ...payload, deskPairs };
}

/**
 * Quita de grupos rígidos a los ids dados (el par exige movilidad libre).
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {string[]} itemIds
 */
function stripGroupIds(payload, itemIds) {
  const ids = new Set(itemIds.filter(Boolean));
  if (!ids.size) return payload;
  const groupIdsTouched = new Set(
    payload.items
      .filter((it) => ids.has(it.id) && it.groupId)
      .map((it) => it.groupId),
  );
  const nextItems = payload.items.map((it) => {
    if (!ids.has(it.id) || !it.groupId) return it;
    const { groupId, ...rest } = it;
    return rest;
  });
  const nextGroups = (payload.groups || [])
    .map((g) => {
      if (!groupIdsTouched.has(g.id)) return g;
      const remaining = (g.itemIds || []).filter((id) => !ids.has(id));
      if (remaining.length < 2) return null;
      return { ...g, itemIds: remaining };
    })
    .filter(Boolean);
  return { ...payload, items: nextItems, groups: nextGroups };
}

/**
 * Empareja exactamente dos instrumentos de huella. El atril pasa a satélite.
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {string[]} itemIds
 */
export function pairStagePlotItems(payload, itemIds) {
  const ids = [...new Set((itemIds || []).filter(Boolean))];
  if (ids.length !== 2) return payload;
  const members = payload.items.filter((it) => ids.includes(it.id));
  if (members.length !== 2) return payload;
  if (
    !members.every((it) => stagePlotItemHasInstrumentFootprint(it.type))
  ) {
    return payload;
  }

  const stripped = stripGroupIds(payload, ids);
  const remaining = (stripped.deskPairs || []).filter(
    (p) => !p.itemIds.some((id) => ids.includes(id)),
  );
  const next = {
    ...stripped,
    deskPairs: [
      ...remaining,
      { id: newId(), itemIds: [ids[0], ids[1]] },
    ],
  };
  return reconcileStagePlotDeskPairs(next);
}

/**
 * Empareja ids consecutivos de a 2 (el impar queda suelto).
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {string[]} itemIds
 */
export function pairConsecutiveStagePlotItems(payload, itemIds) {
  const ids = [...new Set((itemIds || []).filter(Boolean))];
  let next = payload;
  for (let i = 0; i + 1 < ids.length; i += 2) {
    next = pairStagePlotItems(next, [ids[i], ids[i + 1]]);
  }
  return next;
}

/**
 * Disuelve los pares que tocan a cualquiera de los ids.
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {string[]} itemIds
 */
export function unpairStagePlotItems(payload, itemIds) {
  const ids = new Set((itemIds || []).filter(Boolean));
  if (!ids.size) return payload;
  const deskPairs = (payload.deskPairs || []).filter(
    (p) => !p.itemIds.some((id) => ids.has(id)),
  );
  return { ...payload, deskPairs };
}

/**
 * Al clonar ítems (formación, etc.): si ambos miembros de un par se clonaron,
 * crea un par nuevo para los clones.
 * @param {{ id: string, itemIds: string[] }[]} deskPairs
 * @param {Map<string, string>} idMap oldId → newId
 */
export function cloneDeskPairsForIdMap(deskPairs, idMap) {
  if (!idMap?.size) return [];
  const out = [];
  for (const pair of pruneStagePlotDeskPairs(deskPairs || [])) {
    const a = idMap.get(pair.itemIds[0]);
    const b = idMap.get(pair.itemIds[1]);
    if (!a || !b || a === b) continue;
    out.push({ id: newId(), itemIds: [a, b] });
  }
  return out;
}

function localPlusY(rotationDeg) {
  const r = ((Number(rotationDeg) || 0) * Math.PI) / 180;
  return { x: Math.sin(r), y: Math.cos(r) };
}

/**
 * Posición del atril satélite de un par.
 * @param {{ x: number, y: number, rotation?: number }} a
 * @param {{ x: number, y: number, rotation?: number }} b
 * @param {{ x: number, y: number }} conductor
 * @returns {{
 *   x: number,
 *   y: number,
 *   rotation: number,
 *   midX: number,
 *   midY: number,
 *   atrilPx: number,
 *   offsetPx: number,
 * }|null}
 */
export function computeDeskPairSatelliteAtril(a, b, conductor) {
  if (!a || !b) return null;
  const ax = Number(a.x) || 0;
  const ay = Number(a.y) || 0;
  const bx = Number(b.x) || 0;
  const by = Number(b.y) || 0;
  const midX = (ax + bx) / 2;
  const midY = (ay + by) / 2;
  const offsetPx = STAGE_PLOT_DESK_PAIR_ATRIL_OFFSET_CM * STAGE_PLOT_CM_TO_PX;
  const atrilPx = STAGE_PLOT_ATRIL_LINE_CM * STAGE_PLOT_CM_TO_PX;

  const abx = bx - ax;
  const aby = by - ay;
  const abLen = Math.hypot(abx, aby);

  const cx = Number(conductor?.x);
  const cy = Number(conductor?.y);
  const hasConductor = Number.isFinite(cx) && Number.isFinite(cy);
  const toCx = hasConductor ? cx - midX : 0;
  const toCy = hasConductor ? cy - midY : 1;
  const toCLen = Math.hypot(toCx, toCy);

  let ux;
  let uy;
  if (abLen < 1) {
    if (toCLen >= 1) {
      ux = toCx / toCLen;
      uy = toCy / toCLen;
    } else {
      const fa = localPlusY(a.rotation);
      const fb = localPlusY(b.rotation);
      const sx = fa.x + fb.x;
      const sy = fa.y + fb.y;
      const sl = Math.hypot(sx, sy);
      if (sl >= 1e-3) {
        ux = sx / sl;
        uy = sy / sl;
      } else {
        ux = 0;
        uy = 1;
      }
    }
  } else {
    let px = -aby / abLen;
    let py = abx / abLen;
    const side = px * toCx + py * toCy;
    if (side < 0) {
      px = -px;
      py = -py;
    } else if (Math.abs(side) < 1e-6 && toCLen >= 1) {
      px = toCx / toCLen;
      py = toCy / toCLen;
    }
    ux = px;
    uy = py;
  }

  return {
    x: midX + ux * offsetPx,
    y: midY + uy * offsetPx,
    rotation: (Math.atan2(ux, uy) * 180) / Math.PI,
    midX,
    midY,
    atrilPx,
    offsetPx,
  };
}

/**
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {{ x: number, y: number }} facingPoint
 * @param {Record<string, { x: number, y: number }>|Map<string, { x: number, y: number }>|null} [livePositions]
 * @param {Set<string>|string[]} [selectedIds]
 */
export function computeDeskPairSatellites(
  payload,
  facingPoint,
  livePositions = null,
  selectedIds = null,
) {
  const items = payload?.items || [];
  const byId = new Map(items.map((it) => [it.id, it]));
  const live =
    livePositions instanceof Map
      ? livePositions
      : livePositions && typeof livePositions === "object"
        ? new Map(Object.entries(livePositions))
        : null;
  const selected = selectedIds instanceof Set
    ? selectedIds
    : new Set(selectedIds || []);

  const resolvePos = (it) => {
    const livePos = live?.get(it.id);
    if (livePos && Number.isFinite(livePos.x) && Number.isFinite(livePos.y)) {
      return { ...it, x: livePos.x, y: livePos.y };
    }
    return it;
  };

  const out = [];
  for (const pair of payload?.deskPairs || []) {
    const rawA = byId.get(pair.itemIds[0]);
    const rawB = byId.get(pair.itemIds[1]);
    if (!rawA || !rawB) continue;
    const sat = computeDeskPairSatelliteAtril(
      resolvePos(rawA),
      resolvePos(rawB),
      facingPoint,
    );
    if (!sat) continue;
    out.push({
      ...sat,
      id: pair.id,
      itemIds: pair.itemIds,
      selected:
        selected.has(pair.itemIds[0]) || selected.has(pair.itemIds[1]),
    });
  }
  return out;
}
