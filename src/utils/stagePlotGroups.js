/**
 * Agrupación y alineación en línea de ítems del stage plot.
 * Independiente de formaciones (slotId).
 */

import {
  STAGE_PLOT_STRING_PAIR_SPACING_CM,
  STAGE_PLOT_STRING_PAIR_TYPES,
  computeSatelliteAtrilPlacement,
  resolveStagePlotConductorPoint,
} from "./stagePlotAtril";
import {
  createStagePlotItem,
} from "./stagePlotPayload";
import { STAGE_PLOT_CM_TO_PX } from "./stagePlotConstants";
import { rotationInstrumentBaseFacingPoint } from "./stagePlotFormations";

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `spg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * @param {unknown} g
 */
export function normalizeStagePlotGroup(g) {
  if (!g || typeof g !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (g);
  const itemIds = Array.isArray(o.itemIds)
    ? o.itemIds.map((id) => String(id)).filter(Boolean)
    : [];
  if (!itemIds.length) return null;
  const alignAngle =
    o.alignAngle != null && Number.isFinite(Number(o.alignAngle))
      ? Number(o.alignAngle)
      : undefined;
  const anchorRaw =
    o.alignAnchor && typeof o.alignAnchor === "object"
      ? /** @type {Record<string, unknown>} */ (o.alignAnchor)
      : null;
  const alignAnchor =
    anchorRaw &&
    Number.isFinite(Number(anchorRaw.x)) &&
    Number.isFinite(Number(anchorRaw.y))
      ? { x: Number(anchorRaw.x), y: Number(anchorRaw.y) }
      : undefined;
  const alignSpan =
    o.alignSpan != null && Number.isFinite(Number(o.alignSpan))
      ? Math.max(0, Number(o.alignSpan))
      : undefined;
  const kind =
    o.kind === "string_pair" ? "string_pair" : o.kind === "align" ? "align" : undefined;
  const instrumentType =
    typeof o.instrumentType === "string" && o.instrumentType
      ? o.instrumentType
      : undefined;
  return {
    id: String(o.id || newId()),
    itemIds,
    ...(kind ? { kind } : {}),
    ...(instrumentType ? { instrumentType } : {}),
    ...(alignAngle != null ? { alignAngle } : {}),
    ...(alignAnchor ? { alignAnchor } : {}),
    ...(alignSpan != null ? { alignSpan } : {}),
  };
}

/** @param {ReturnType<typeof normalizeStagePlotGroup>[]} groups */
export function pruneStagePlotGroups(groups) {
  return (groups || []).map(normalizeStagePlotGroup).filter(Boolean);
}

/**
 * @param {{ id: string, x: number, y: number }[]} items
 */
export function computeDefaultAlignAngle(items) {
  if (!items?.length) return 0;
  if (items.length === 1) return 0;
  const sorted = [...items].sort((a, b) => a.x - b.x || a.y - b.y);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  if (Math.hypot(dx, dy) < 1) return 0;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * @param {{ x: number, y: number }} anchor
 * @param {number} angleDeg
 */
function unitAlong(angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { ux: Math.cos(rad), uy: Math.sin(rad) };
}

/**
 * Proyección escalar sobre la línea que pasa por anchor con angleDeg.
 * @param {{ x: number, y: number }} pt
 * @param {{ x: number, y: number }} anchor
 * @param {number} angleDeg
 */
export function projectOnAlignLine(pt, anchor, angleDeg) {
  const { ux, uy } = unitAlong(angleDeg);
  return (pt.x - anchor.x) * ux + (pt.y - anchor.y) * uy;
}

/**
 * @param {{ id: string, x: number, y: number }[]} items
 * @param {{ x: number, y: number }} anchor
 * @param {number} angleDeg
 * @param {number} [span]
 */
export function distributeItemsOnLine(items, anchor, angleDeg, span) {
  const { ux, uy } = unitAlong(angleDeg);
  const n = items.length;
  if (!n) return [];

  const sorted = [...items].sort((a, b) => {
    const ta = projectOnAlignLine(a, anchor, angleDeg);
    const tb = projectOnAlignLine(b, anchor, angleDeg);
    return ta - tb || String(a.id).localeCompare(String(b.id));
  });

  if (n === 1) {
    return [{ id: sorted[0].id, x: anchor.x, y: anchor.y }];
  }

  const projections = sorted.map((it) =>
    projectOnAlignLine(it, anchor, angleDeg),
  );
  const minT = Math.min(...projections);
  const maxT = Math.max(...projections);
  const useSpan = span != null && span >= 0 ? span : maxT - minT;

  return sorted.map((it, i) => {
    const t = -useSpan / 2 + (useSpan * i) / (n - 1);
    return {
      id: it.id,
      x: anchor.x + t * ux,
      y: anchor.y + t * uy,
    };
  });
}

/**
 * @param {{ x: number, y: number }} anchor
 * @param {number} angleDeg
 * @param {number} span
 * @param {number} [padding=40]
 */
export function alignLineGuidePoints(anchor, angleDeg, span, padding = 40) {
  const { ux, uy } = unitAlong(angleDeg);
  const half = span / 2 + padding;
  return [
    anchor.x - half * ux,
    anchor.y - half * uy,
    anchor.x + half * ux,
    anchor.y + half * uy,
  ];
}

/**
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {string} groupId
 */
export function getGroupById(payload, groupId) {
  return (payload.groups || []).find((g) => g.id === groupId) || null;
}

/**
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {string} groupId
 */
export function getGroupMemberIds(payload, groupId) {
  const fromGroup = getGroupById(payload, groupId)?.itemIds || [];
  const fromItems = (payload.items || [])
    .filter((it) => it.groupId === groupId)
    .map((it) => it.id);
  return [...new Set([...fromGroup, ...fromItems])];
}

/** Elimina grupos vacíos y sincroniza itemIds con groupId en ítems. */
export function reconcileStagePlotGroups(payload) {
  const items = payload.items || [];
  const groupIdsFromItems = new Set(
    items.map((it) => it.groupId).filter(Boolean),
  );
  const groups = pruneStagePlotGroups(payload.groups || []).filter((g) => {
    const liveIds = g.itemIds.filter((id) =>
      items.some((it) => it.id === id),
    );
    return liveIds.length > 0 || groupIdsFromItems.has(g.id);
  });

  const nextGroups = groups.map((g) => {
    const liveIds = [
      ...new Set([
        ...g.itemIds.filter((id) => items.some((it) => it.id === id)),
        ...items.filter((it) => it.groupId === g.id).map((it) => it.id),
      ]),
    ];
    return { ...g, itemIds: liveIds };
  });

  const knownGroupIds = new Set(nextGroups.map((g) => g.id));
  const nextItems = items.map((it) => {
    if (it.groupId && !knownGroupIds.has(it.groupId)) {
      const { groupId, ...rest } = it;
      return rest;
    }
    return it;
  });

  return { ...payload, groups: nextGroups, items: nextItems };
}

/**
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {string[]} itemIds
 */
export function groupStagePlotItems(payload, itemIds) {
  const ids = [...new Set(itemIds.filter(Boolean))];
  if (ids.length < 2) return payload;

  const groupId = newId();
  const nextItems = payload.items.map((it) =>
    ids.includes(it.id) ? { ...it, groupId, slotId: null } : it,
  );
  const groups = [
    ...(payload.groups || []),
    { id: groupId, itemIds: ids },
  ];
  return reconcileStagePlotGroups({ ...payload, items: nextItems, groups });
}

/**
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {string[]} itemIds
 */
export function ungroupStagePlotItems(payload, itemIds) {
  const ids = new Set(itemIds.filter(Boolean));
  if (!ids.size) return payload;

  const groupIdsToClear = new Set(
    payload.items
      .filter((it) => ids.has(it.id) && it.groupId)
      .map((it) => it.groupId),
  );

  const nextItems = payload.items.map((it) => {
    if (!ids.has(it.id) && !groupIdsToClear.has(it.groupId)) return it;
    if (ids.has(it.id) || groupIdsToClear.has(it.groupId)) {
      const { groupId, ...rest } = it;
      return rest;
    }
    return it;
  });

  const nextGroups = (payload.groups || []).filter(
    (g) => !groupIdsToClear.has(g.id),
  );

  return reconcileStagePlotGroups({
    ...payload,
    items: nextItems,
    groups: nextGroups,
  });
}

/**
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {string[]} itemIds
 * @param {number} [angleDeg]
 */
export function alignStagePlotItems(payload, itemIds, angleDeg) {
  const ids = [...new Set(itemIds.filter(Boolean))];
  if (ids.length < 2) return payload;

  const selected = payload.items.filter((it) => ids.includes(it.id));
  if (selected.length < 2) return payload;

  const anchor = {
    x: selected.reduce((s, it) => s + it.x, 0) / selected.length,
    y: selected.reduce((s, it) => s + it.y, 0) / selected.length,
  };
  const angle =
    angleDeg != null && Number.isFinite(angleDeg)
      ? angleDeg
      : computeDefaultAlignAngle(selected);

  const projections = selected.map((it) =>
    projectOnAlignLine(it, anchor, angle),
  );
  const span = Math.max(0, Math.max(...projections) - Math.min(...projections));

  const positions = distributeItemsOnLine(selected, anchor, angle, span);
  const posMap = new Map(positions.map((p) => [p.id, p]));

  const existingGroupIds = [
    ...new Set(selected.map((it) => it.groupId).filter(Boolean)),
  ];
  let groupId = existingGroupIds.length === 1 ? existingGroupIds[0] : newId();

  const nextItems = payload.items.map((it) => {
    if (!ids.includes(it.id)) return it;
    const p = posMap.get(it.id);
    return {
      ...it,
      x: p?.x ?? it.x,
      y: p?.y ?? it.y,
      groupId,
      slotId: null,
    };
  });

  const alignMeta = {
    alignAngle: angle,
    alignAnchor: anchor,
    alignSpan: span,
    itemIds: ids,
  };

  const others = (payload.groups || []).filter((g) => g.id !== groupId);
  const groups = [...others, { id: groupId, ...alignMeta }];

  return reconcileStagePlotGroups({ ...payload, items: nextItems, groups });
}

/**
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {string} groupId
 * @param {number} angleDeg
 */
export function setGroupAlignAngle(payload, groupId, angleDeg) {
  const group = getGroupById(payload, groupId);
  if (!group || group.alignAnchor == null) return payload;

  const memberIds = getGroupMemberIds(payload, groupId);
  const members = payload.items.filter((it) => memberIds.includes(it.id));
  if (members.length < 2) return payload;

  const span = group.alignSpan ?? 0;
  const positions = distributeItemsOnLine(
    members,
    group.alignAnchor,
    angleDeg,
    span,
  );
  const posMap = new Map(positions.map((p) => [p.id, p]));

  const nextItems = payload.items.map((it) => {
    if (!posMap.has(it.id)) return it;
    const p = posMap.get(it.id);
    return { ...it, x: p.x, y: p.y, slotId: null };
  });

  const groups = (payload.groups || []).map((g) =>
    g.id === groupId
      ? {
          ...g,
          alignAngle: angleDeg,
          itemIds: memberIds,
        }
      : g,
  );

  return reconcileStagePlotGroups({ ...payload, items: nextItems, groups });
}

/**
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {string[]} selectedIds
 */
export function resolveSharedAlignGroup(payload, selectedIds) {
  const ids = selectedIds || [];
  if (!ids.length) return null;
  const groupIds = [
    ...new Set(
      payload.items
        .filter((it) => ids.includes(it.id) && it.groupId)
        .map((it) => it.groupId),
    ),
  ];
  if (groupIds.length !== 1) return null;
  const group = getGroupById(payload, groupIds[0]);
  if (!group || group.alignAngle == null || !group.alignAnchor) return null;
  const members = getGroupMemberIds(payload, groupIds[0]);
  if (!members.every((id) => ids.includes(id))) return null;
  return group;
}

/**
 * Inserta un par de cuerdas (mismo tipo) con atril compartido satélite.
 * Layout: dos huellas lado a lado, base hacia director; atril en el midpoint + 40 cm hacia director.
 *
 * @param {ReturnType<typeof import('./stagePlotPayload').normalizeStagePlotPayload>} payload
 * @param {string} type — violin | viola | cello | bass
 * @param {number} centerX
 * @param {number} centerY
 * @param {number} zStart — z del primer ítem
 */
export function insertStagePlotStringPair(payload, type, centerX, centerY, zStart) {
  if (!STAGE_PLOT_STRING_PAIR_TYPES.has(type)) return payload;

  const items = payload.items || [];
  const stage = payload.stage || {};
  const conductor = resolveStagePlotConductorPoint(items, stage);
  const placement = computeSatelliteAtrilPlacement(
    centerX,
    centerY,
    conductor.x,
    conductor.y,
    0,
  );
  const tangentRad = (placement.rotationDeg * Math.PI) / 180;
  const halfSpacing =
    (STAGE_PLOT_STRING_PAIR_SPACING_CM * STAGE_PLOT_CM_TO_PX) / 2;
  const tx = Math.cos(tangentRad);
  const ty = Math.sin(tangentRad);

  const pos1 = {
    x: centerX - halfSpacing * tx,
    y: centerY - halfSpacing * ty,
  };
  const pos2 = {
    x: centerX + halfSpacing * tx,
    y: centerY + halfSpacing * ty,
  };

  const facing = conductor;
  const rot1 = rotationInstrumentBaseFacingPoint(
    pos1.x,
    pos1.y,
    facing.x,
    facing.y,
  );
  const rot2 = rotationInstrumentBaseFacingPoint(
    pos2.x,
    pos2.y,
    facing.x,
    facing.y,
  );

  const item1 = createStagePlotItem(type, pos1.x, pos1.y, zStart, {
    items,
    stage,
    rotation: rot1,
  });
  const item2 = createStagePlotItem(type, pos2.x, pos2.y, zStart + 1, {
    items,
    stage,
    rotation: rot2,
  });
  const groupId = newId();
  const group = {
    id: groupId,
    kind: "string_pair",
    instrumentType: type,
    itemIds: [item1.id, item2.id],
  };

  const nextItems = [
    ...items,
    { ...item1, groupId, slotId: null },
    { ...item2, groupId, slotId: null },
  ];

  return reconcileStagePlotGroups({
    ...payload,
    items: nextItems,
    groups: [...(payload.groups || []), group],
  });
}
