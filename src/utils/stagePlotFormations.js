import {
  STAGE_PLOT_DEFAULT_HEIGHT_CM,
  STAGE_PLOT_DEFAULT_WIDTH_CM,
  stagePlotCmToPx,
  stagePlotConductorPosition,
} from "./stagePlotConstants";

/**
 * Geometría de formaciones (arco / herradura / rectángulo) para el stage plot.
 * Plazas equiespaciadas; orientación hacia el director (o punto conductor).
 */

export const STAGE_PLOT_FORMATIONATION_KINDS = [
  "arc",
  "horseshoe",
  "rect",
  "line",
];

export const STAGE_PLOT_FORMATIONATION_LABELS = {
  arc: "Arco",
  horseshoe: "Herradura",
  rect: "Rectángulo",
  line: "Línea recta",
};

/**
 * Snap a plaza libre (px de escenario).
 * ~½ del tamaño visual default de ítem (40 cm → 20 cm @ STAGE_PLOT_CM_TO_PX).
 */
export const STAGE_PLOT_SLOT_SNAP_PX = stagePlotCmToPx(20);

/**
 * Marcador de plaza (cuadrado, px de escenario).
 * ~½ del footprint default del instrumento (40 cm) para no quedar perdido bajo el ítem.
 */
export const STAGE_PLOT_SLOT_MARKER_PX = stagePlotCmToPx(15);

/**
 * Epsilon para "ya centrada" (botón Centrar deshabilitado).
 * ~0.5 cm ≈ 2 px @ STAGE_PLOT_CM_TO_PX.
 */
export const STAGE_PLOT_FORMATIONATION_CENTER_EPSILON_PX = stagePlotCmToPx(0.5);

/**
 * Snap magnético al eje X del director al arrastrar (umbral de atracción).
 * ~18 cm.
 */
export const STAGE_PLOT_FORMATIONATION_CENTER_SNAP_PX = stagePlotCmToPx(18);

/**
 * Histeresis: una vez snappeada, hay que alejarse más para soltar el imán.
 * ~28 cm.
 */
export const STAGE_PLOT_FORMATIONATION_CENTER_UNSNAP_PX = stagePlotCmToPx(28);

const SLOT_MARKER = STAGE_PLOT_SLOT_MARKER_PX;

/** Mínimos de resize / normalización (cm → px). */
export const FORMATION_MIN_RADIUS = stagePlotCmToPx(12);
export const FORMATION_MIN_HALF = stagePlotCmToPx(12);
export const FORMATION_MIN_WIDTH = stagePlotCmToPx(30);
export const FORMATION_MIN_DEPTH = stagePlotCmToPx(20);
export const FORMATION_MIN_LENGTH = stagePlotCmToPx(40);

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `fm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function degToRad(d) {
  return (Number(d) || 0) * (Math.PI / 180);
}

function radToDeg(r) {
  return (Number(r) || 0) * (180 / Math.PI);
}

/**
 * Rotación Konva para que el “frente” del ítem (eje −Y local) mire al punto.
 */
export function rotationFacingPoint(fromX, fromY, toX, toY) {
  const ang = Math.atan2(toY - fromY, toX - fromX);
  return radToDeg(ang) + 90;
}

/**
 * Punto al que miran las plazas: ítem `conductor` o centro downstage.
 * @param {{ x: number, y: number, type?: string, id?: string }[]} items
 * @param {{ width?: number, height?: number }} stage
 * @param {"conductor"|number|string} [facing]
 */
export function resolveFormationFacingPoint(items, stage, facing = "conductor") {
  if (facing != null && facing !== "conductor") {
    const id = String(facing);
    const it = (items || []).find((i) => String(i.id) === id);
    if (it) return { x: it.x, y: it.y };
  }
  const conductor = (items || []).find((i) => i.type === "conductor");
  if (conductor) return { x: conductor.x, y: conductor.y };
  const w =
    Number(stage?.width) || stagePlotCmToPx(STAGE_PLOT_DEFAULT_WIDTH_CM);
  const h =
    Number(stage?.height) || stagePlotCmToPx(STAGE_PLOT_DEFAULT_HEIGHT_CM);
  return stagePlotConductorPosition(w, h);
}


/**
 * True si formation.x ya coincide con el eje X del punto de mira (director).
 * @param {{ x?: number, facing?: string }|null|undefined} formation
 * @param {{ x: number, y: number, type?: string, id?: string }[]} items
 * @param {{ width?: number, height?: number }} stage
 * @param {number} [epsilonPx]
 */
export function isFormationCenteredOnConductor(
  formation,
  items,
  stage,
  epsilonPx = STAGE_PLOT_FORMATIONATION_CENTER_EPSILON_PX,
) {
  if (!formation) return false;
  const facing = resolveFormationFacingPoint(items, stage, formation.facing);
  const eps = Number.isFinite(Number(epsilonPx))
    ? Math.max(0, Number(epsilonPx))
    : STAGE_PLOT_FORMATIONATION_CENTER_EPSILON_PX;
  return Math.abs((Number(formation.x) || 0) - facing.x) <= eps;
}

/**
 * Snap magnético de x al eje del director, con histeresis.
 * @param {number} rawX
 * @param {number} conductorX
 * @param {boolean} [wasSnapped]
 * @returns {{ x: number, snapped: boolean }}
 */
export function snapFormationXToConductorCenter(
  rawX,
  conductorX,
  wasSnapped = false,
) {
  const x = Number(rawX);
  const cx = Number(conductorX);
  if (!Number.isFinite(x) || !Number.isFinite(cx)) {
    return { x: Number.isFinite(x) ? x : 0, snapped: false };
  }
  const dx = Math.abs(x - cx);
  if (wasSnapped) {
    if (dx <= STAGE_PLOT_FORMATIONATION_CENTER_UNSNAP_PX) {
      return { x: cx, snapped: true };
    }
    return { x, snapped: false };
  }
  if (dx <= STAGE_PLOT_FORMATIONATION_CENTER_SNAP_PX) {
    return { x: cx, snapped: true };
  }
  return { x, snapped: false };
}

export function makeSlotId(formationId, index) {
  return `${formationId}:${index}`;
}

/**
 * @param {string|null|undefined} slotId
 * @returns {{ formationId: string, index: number }|null}
 */
export function parseSlotId(slotId) {
  if (slotId == null || slotId === "") return null;
  const s = String(slotId);
  const i = s.lastIndexOf(":");
  if (i <= 0) return null;
  const formationId = s.slice(0, i);
  const index = Number(s.slice(i + 1));
  if (!formationId || !Number.isFinite(index) || index < 0) return null;
  return { formationId, index: Math.floor(index) };
}

function defaultParams(kind) {
  if (kind === "rect") {
    // 300 × 150 cm
    return { width: stagePlotCmToPx(300), depth: stagePlotCmToPx(150) };
  }
  if (kind === "horseshoe") {
    // 280 × 160 cm
    return { width: stagePlotCmToPx(280), depth: stagePlotCmToPx(160) };
  }
  if (kind === "line") {
    // 360 cm ≈ 3.6 m
    return { length: stagePlotCmToPx(360) };
  }
  // Hemi-óvalo upstage, abierto hacia público / director
  // rx/ry 180×100 cm → arco ~3.6 m de ancho
  return {
    rx: stagePlotCmToPx(180),
    ry: stagePlotCmToPx(100),
    startAngle: 180,
    endAngle: 360,
  };
}

/**
 * @param {"arc"|"horseshoe"|"rect"} kind
 * @param {number} x
 * @param {number} y
 * @param {number} [slots]
 */
export function createStagePlotFormation(kind, x, y, slots = 8) {
  const k = STAGE_PLOT_FORMATIONATION_KINDS.includes(kind) ? kind : "arc";
  return {
    id: newId(),
    kind: k,
    x: Number(x) || 0,
    y: Number(y) || 0,
    rotation: 0,
    params: defaultParams(k),
    slots: clamp(Math.round(Number(slots) || 8), 1, 64),
    facing: "conductor",
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeStagePlotFormation(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const kindRaw = String(o.kind || "arc");
  const kind = STAGE_PLOT_FORMATIONATION_KINDS.includes(kindRaw)
    ? kindRaw
    : "arc";
  const base = defaultParams(kind);
  const paramsIn =
    o.params && typeof o.params === "object"
      ? /** @type {Record<string, unknown>} */ (o.params)
      : {};
  /** @type {Record<string, number>} */
  const params = { ...base };
  for (const key of Object.keys(base)) {
    const v = Number(paramsIn[key]);
    if (Number.isFinite(v)) params[key] = v;
  }
  if (kind === "arc") {
    params.rx = Math.max(FORMATION_MIN_RADIUS, Number(params.rx) || stagePlotCmToPx(180));
    params.ry = Math.max(FORMATION_MIN_RADIUS, Number(params.ry) || stagePlotCmToPx(100));
  }
  if (kind === "line") {
    params.length = Math.max(FORMATION_MIN_LENGTH, Number(params.length) || stagePlotCmToPx(360));
  }
  if (kind === "horseshoe" || kind === "rect") {
    params.width = Math.max(FORMATION_MIN_WIDTH, Number(params.width) || stagePlotCmToPx(280));
    params.depth = Math.max(FORMATION_MIN_DEPTH, Number(params.depth) || stagePlotCmToPx(150));
  }
  const slots = clamp(Math.round(Number(o.slots) || 8), 1, 64);
  let facing = /** @type {"conductor"|string} */ ("conductor");
  if (o.facing != null && o.facing !== "conductor") {
    facing = String(o.facing);
  }
  return {
    id: String(o.id || newId()),
    kind,
    x: Number(o.x) || 0,
    y: Number(o.y) || 0,
    rotation: Number(o.rotation) || 0,
    params,
    slots,
    facing,
  };
}

function rotateLocal(lx, ly, rotDeg) {
  const r = degToRad(rotDeg);
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: lx * c - ly * s, y: lx * s + ly * c };
}

/**
 * Polilínea de guía en coords locales (antes de rotación/traslación).
 * @param {{ kind: string, params: Record<string, number> }} formation
 * @returns {{ x: number, y: number }[]}
 */
export function formationGuidePointsLocal(formation) {
  const kind = formation.kind;
  const p = formation.params || defaultParams(kind);

  if (kind === "line") {
    const len = Math.max(FORMATION_MIN_LENGTH, Number(p.length) || stagePlotCmToPx(360));
    const hl = len / 2;
    return [
      { x: -hl, y: 0 },
      { x: hl, y: 0 },
    ];
  }

  if (kind === "rect") {
    const w = Math.max(FORMATION_MIN_WIDTH, Number(p.width) || stagePlotCmToPx(300));
    const d = Math.max(FORMATION_MIN_DEPTH, Number(p.depth) || stagePlotCmToPx(150));
    const hw = w / 2;
    const hd = d / 2;
    // U: izquierda → arriba → derecha (abierto abajo hacia director)
    return [
      { x: -hw, y: hd },
      { x: -hw, y: -hd },
      { x: hw, y: -hd },
      { x: hw, y: hd },
    ];
  }

  if (kind === "horseshoe") {
    const w = Math.max(FORMATION_MIN_WIDTH, Number(p.width) || stagePlotCmToPx(280));
    const d = Math.max(FORMATION_MIN_DEPTH, Number(p.depth) || stagePlotCmToPx(160));
    const hw = w / 2;
    const hd = d / 2;
    const out = [];
    out.push({ x: -hw, y: hd });
    out.push({ x: -hw, y: 0 });
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = Math.PI + t * Math.PI;
      out.push({ x: hw * Math.cos(a), y: hd * Math.sin(a) });
    }
    out.push({ x: hw, y: hd });
    return out;
  }

  // arc
  const rx = Math.max(FORMATION_MIN_RADIUS, Number(p.rx) || stagePlotCmToPx(180));
  const ry = Math.max(FORMATION_MIN_RADIUS, Number(p.ry) || stagePlotCmToPx(100));
  let a0 = degToRad(p.startAngle ?? 180);
  let a1 = degToRad(p.endAngle ?? 360);
  if (a1 < a0) a1 += Math.PI * 2;
  const steps = 48;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + (a1 - a0) * t;
    pts.push({ x: rx * Math.cos(a), y: ry * Math.sin(a) });
  }
  return pts;
}

function polylineCumLengths(pts) {
  const cum = [0];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    total += Math.hypot(dx, dy);
    cum.push(total);
  }
  return { cum, total };
}

function pointAtArcLength(pts, cum, total, dist) {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1 || total <= 0) return { ...pts[0] };
  const d = clamp(dist, 0, total);
  let i = 1;
  while (i < cum.length && cum[i] < d) i++;
  const i1 = Math.max(1, i);
  const i0 = i1 - 1;
  const segLen = cum[i1] - cum[i0] || 1;
  const t = (d - cum[i0]) / segLen;
  return {
    x: pts[i0].x + (pts[i1].x - pts[i0].x) * t,
    y: pts[i0].y + (pts[i1].y - pts[i0].y) * t,
  };
}

/**
 * @param {ReturnType<typeof normalizeStagePlotFormation>} formation
 * @param {{ x: number, y: number }} facingPoint
 */
export function computeFormationSlots(formation, facingPoint) {
  if (!formation) return [];
  const n = clamp(Math.round(Number(formation.slots) || 0), 0, 64);
  if (n <= 0) return [];

  const localPts = formationGuidePointsLocal(formation);
  const { cum, total } = polylineCumLengths(localPts);
  if (total <= 0) return [];

  const slots = [];
  for (let i = 0; i < n; i++) {
    const dist = n === 1 ? total / 2 : (total * i) / (n - 1);
    const local = pointAtArcLength(localPts, cum, total, dist);
    const world = rotateLocal(local.x, local.y, formation.rotation || 0);
    const x = formation.x + world.x;
    const y = formation.y + world.y;
    const rotation = rotationFacingPoint(
      x,
      y,
      facingPoint.x,
      facingPoint.y,
    );
    slots.push({
      index: i,
      x,
      y,
      rotation,
      slotId: makeSlotId(formation.id, i),
    });
  }
  return slots;
}

export function formationGuideWorldPoints(formation) {
  const local = formationGuidePointsLocal(formation);
  return local.map((p) => {
    const w = rotateLocal(p.x, p.y, formation.rotation || 0);
    return { x: formation.x + w.x, y: formation.y + w.y };
  });
}

export function formationGuideLinePoints(formation) {
  const pts = formationGuideWorldPoints(formation);
  const flat = [];
  for (const p of pts) flat.push(p.x, p.y);
  return flat;
}

export function formationSlotMarkerSize() {
  return SLOT_MARKER;
}

/**
 * Punto de escena → coords locales de la formación (origen en centro, sin traslación).
 * @param {{ x: number, y: number, rotation?: number }} formation
 * @param {number} worldX
 * @param {number} worldY
 */
export function worldToFormationLocal(formation, worldX, worldY) {
  const dx = worldX - formation.x;
  const dy = worldY - formation.y;
  return rotateLocal(dx, dy, -(formation.rotation || 0));
}

/**
 * Asas de redimensionamiento en coords locales (antes de rotación/traslación).
 * @param {{ kind: string, params: Record<string, number> }} formation
 * @returns {{ id: string, x: number, y: number }[]}
 */
export function formationResizeHandlesLocal(formation) {
  const kind = formation.kind;
  const p = formation.params || defaultParams(kind);

  if (kind === "arc") {
    const rx = Math.max(FORMATION_MIN_RADIUS, Number(p.rx) || stagePlotCmToPx(180));
    const ry = Math.max(FORMATION_MIN_RADIUS, Number(p.ry) || stagePlotCmToPx(100));
    return [
      { id: "w", x: -rx, y: 0 },
      { id: "e", x: rx, y: 0 },
      { id: "n", x: 0, y: -ry },
    ];
  }

  if (kind === "line") {
    const len = Math.max(FORMATION_MIN_LENGTH, Number(p.length) || stagePlotCmToPx(360));
    const hl = len / 2;
    return [
      { id: "w", x: -hl, y: 0 },
      { id: "e", x: hl, y: 0 },
    ];
  }

  const w = Math.max(FORMATION_MIN_WIDTH, Number(p.width) || stagePlotCmToPx(280));
  const d = Math.max(FORMATION_MIN_DEPTH, Number(p.depth) || stagePlotCmToPx(150));
  const hw = w / 2;
  const hd = d / 2;
  return [
    { id: "nw", x: -hw, y: -hd },
    { id: "n", x: 0, y: -hd },
    { id: "ne", x: hw, y: -hd },
    { id: "w", x: -hw, y: 0 },
    { id: "e", x: hw, y: 0 },
    { id: "sw", x: -hw, y: hd },
    { id: "s", x: 0, y: hd },
    { id: "se", x: hw, y: hd },
  ];
}

/**
 * @param {{ kind: string, params: Record<string, number>, x: number, y: number, rotation?: number }} formation
 * @returns {{ id: string, x: number, y: number }[]}
 */
export function formationResizeHandlesWorld(formation) {
  return formationResizeHandlesLocal(formation).map((h) => {
    const w = rotateLocal(h.x, h.y, formation.rotation || 0);
    return { id: h.id, x: formation.x + w.x, y: formation.y + w.y };
  });
}

/**
 * Calcula params a partir de la posición de un asa arrastrada (coords de escena).
 * Mantiene el centro fijo (resize simétrico).
 * @param {{ kind: string, params: Record<string, number>, x: number, y: number, rotation?: number }} formation
 * @param {string} handleId
 * @param {number} worldX
 * @param {number} worldY
 */
export function formationParamsFromHandlePosition(
  formation,
  handleId,
  worldX,
  worldY,
) {
  const local = worldToFormationLocal(formation, worldX, worldY);
  const lx = local.x;
  const ly = local.y;
  const p = { ...(formation.params || defaultParams(formation.kind)) };

  if (formation.kind === "arc") {
    if (handleId === "e") p.rx = Math.max(FORMATION_MIN_RADIUS, lx);
    else if (handleId === "w") p.rx = Math.max(FORMATION_MIN_RADIUS, -lx);
    else if (handleId === "n") p.ry = Math.max(FORMATION_MIN_RADIUS, -ly);
    return p;
  }

  if (formation.kind === "line") {
    let hl = Math.max(
      FORMATION_MIN_HALF,
      Math.max(FORMATION_MIN_LENGTH, Number(p.length) || stagePlotCmToPx(360)) / 2,
    );
    if (handleId === "e") hl = Math.max(FORMATION_MIN_HALF, lx);
    else if (handleId === "w") hl = Math.max(FORMATION_MIN_HALF, -lx);
    return {
      ...p,
      length: Math.max(FORMATION_MIN_LENGTH, hl * 2),
    };
  }

  const minHalf = FORMATION_MIN_HALF;
  let hw = Math.max(
    minHalf,
    Math.max(FORMATION_MIN_WIDTH, Number(p.width) || stagePlotCmToPx(280)) / 2,
  );
  let hd = Math.max(
    minHalf,
    Math.max(FORMATION_MIN_DEPTH, Number(p.depth) || stagePlotCmToPx(150)) / 2,
  );

  switch (handleId) {
    case "nw":
      hw = Math.max(minHalf, -lx);
      hd = Math.max(minHalf, -ly);
      break;
    case "ne":
      hw = Math.max(minHalf, lx);
      hd = Math.max(minHalf, -ly);
      break;
    case "sw":
      hw = Math.max(minHalf, -lx);
      hd = Math.max(minHalf, ly);
      break;
    case "se":
      hw = Math.max(minHalf, lx);
      hd = Math.max(minHalf, ly);
      break;
    case "n":
      hd = Math.max(minHalf, -ly);
      break;
    case "s":
      hd = Math.max(minHalf, ly);
      break;
    case "w":
      hw = Math.max(minHalf, -lx);
      break;
    case "e":
      hw = Math.max(minHalf, lx);
      break;
    default:
      break;
  }

  return {
    ...p,
    width: Math.max(FORMATION_MIN_WIDTH, hw * 2),
    depth: Math.max(FORMATION_MIN_DEPTH, hd * 2),
  };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {ReturnType<typeof normalizeStagePlotFormation>[]} formations
 * @param {{ id: string, slotId?: string|null, x: number, y: number, type?: string }[]} items
 * @param {{ width?: number, height?: number }} stage
 * @param {string|null} [ignoreItemId]
 * @param {number} [threshold]
 */
export function findNearestFreeSlot(
  x,
  y,
  formations,
  items,
  stage,
  ignoreItemId = null,
  threshold = STAGE_PLOT_SLOT_SNAP_PX,
) {
  const occupied = new Set();
  for (const it of items || []) {
    if (ignoreItemId && it.id === ignoreItemId) continue;
    if (it.slotId) occupied.add(String(it.slotId));
  }

  let best = null;
  let bestDist = threshold;

  for (const fm of formations || []) {
    const facing = resolveFormationFacingPoint(items, stage, fm.facing);
    const slots = computeFormationSlots(fm, facing);
    for (const slot of slots) {
      if (occupied.has(slot.slotId)) continue;
      const dist = Math.hypot(slot.x - x, slot.y - y);
      if (dist <= bestDist) {
        bestDist = dist;
        best = slot;
      }
    }
  }
  return best;
}

const FORMATION_OVERFLOW_MARGIN = stagePlotCmToPx(25);
const FORMATION_OVERFLOW_STACK_SPACING = stagePlotCmToPx(45);

/**
 * Posiciones sueltas al costado de la formación (local +X, apiladas en +Y).
 * @param {ReturnType<typeof normalizeStagePlotFormation>} formation
 * @param {{ x: number, y: number, index: number }[]} slotList
 * @param {number} overflowCount
 */
function computeFormationOverflowPositions(formation, slotList, overflowCount) {
  if (overflowCount <= 0) return [];
  const rot = formation.rotation || 0;
  let refLocal;
  if (slotList.length > 0) {
    const last = slotList[slotList.length - 1];
    refLocal = worldToFormationLocal(formation, last.x, last.y);
  } else {
    refLocal = { x: 0, y: 0 };
  }
  const positions = [];
  for (let i = 0; i < overflowCount; i++) {
    const localX = refLocal.x + FORMATION_OVERFLOW_MARGIN;
    const localY = refLocal.y + i * FORMATION_OVERFLOW_STACK_SPACING;
    const world = rotateLocal(localX, localY, rot);
    positions.push({
      x: formation.x + world.x,
      y: formation.y + world.y,
    });
  }
  return positions;
}

/**
 * Reposiciona ítems anclados tras mover / cambiar N / params.
 * Si `redistributeSlotsForFormationIds` incluye una formación, reasigna plazas 0..N-1
 * (orden por índice previo) y coloca overflow suelto al costado.
 * @param {ReturnType<typeof normalizeStagePlotFormation>[]} formations
 * @param {object[]} items
 * @param {{ width?: number, height?: number }} stage
 * @param {string[]|null} [formationIds]
 * @param {string[]|null} [redistributeSlotsForFormationIds]
 */
export function reanchorItemsToFormations(
  formations,
  items,
  stage,
  formationIds = null,
  redistributeSlotsForFormationIds = null,
) {
  const idFilter = formationIds
    ? new Set(formationIds.map((id) => String(id)))
    : null;
  const redistribute = new Set(
    (redistributeSlotsForFormationIds || []).map((id) => String(id)),
  );
  /** @type {Map<string, { slots: Map<number, object>, slotList: object[], formation: object, max: number }>} */
  const slotMaps = new Map();

  for (const fm of formations || []) {
    const fmId = String(fm.id);
    if (idFilter && !idFilter.has(fmId)) continue;
    const facing = resolveFormationFacingPoint(items, stage, fm.facing);
    const slots = computeFormationSlots(fm, facing);
    const byIndex = new Map(slots.map((s) => [s.index, s]));
    slotMaps.set(fmId, {
      slots: byIndex,
      slotList: slots,
      formation: fm,
      max: fm.slots,
    });
  }

  /** @type {Map<string, { x: number, y: number, slotId: string|null }>} */
  const reassigned = new Map();

  for (const fmId of redistribute) {
    const map = slotMaps.get(fmId);
    if (!map) continue;

    const anchored = (items || [])
      .filter((it) => {
        const parsed = parseSlotId(it.slotId);
        return parsed && parsed.formationId === fmId;
      })
      .sort(
        (a, b) =>
          (parseSlotId(a.slotId)?.index ?? 0) -
          (parseSlotId(b.slotId)?.index ?? 0),
      );

    const n = map.max;
    const overflowPositions = computeFormationOverflowPositions(
      map.formation,
      map.slotList,
      Math.max(0, anchored.length - n),
    );

    for (let i = 0; i < anchored.length; i++) {
      const it = anchored[i];
      if (i < n) {
        const slot = map.slots.get(i);
        if (!slot) {
          reassigned.set(it.id, { x: it.x, y: it.y, slotId: null });
          continue;
        }
        reassigned.set(it.id, {
          x: slot.x,
          y: slot.y,
          slotId: slot.slotId,
        });
      } else {
        const pos = overflowPositions[i - n];
        reassigned.set(it.id, {
          x: pos?.x ?? it.x,
          y: pos?.y ?? it.y,
          slotId: null,
        });
      }
    }
  }

  return (items || []).map((it) => {
    if (reassigned.has(it.id)) {
      return { ...it, ...reassigned.get(it.id) };
    }

    const parsed = parseSlotId(it.slotId);
    if (!parsed) return it;
    if (idFilter && !idFilter.has(parsed.formationId)) return it;

    const map = slotMaps.get(parsed.formationId);
    if (!map) {
      // Filtered pass without this formation: keep anchor (do not demagnetize).
      // Full pass (no filter): formation gone → clear stale slotId.
      return idFilter ? it : { ...it, slotId: null };
    }
    if (parsed.index >= map.max) {
      return { ...it, slotId: null };
    }
    const slot = map.slots.get(parsed.index);
    if (!slot) return { ...it, slotId: null };
    return {
      ...it,
      x: slot.x,
      y: slot.y,
      slotId: slot.slotId,
    };
  });
}

export function clearFormationAnchors(items, formationId) {
  const prefix = `${formationId}:`;
  return (items || []).map((it) =>
    it.slotId && String(it.slotId).startsWith(prefix)
      ? { ...it, slotId: null }
      : it,
  );
}

/** Offset al copiar formacion (~40 cm a la derecha). */
export const STAGE_PLOT_FORMATIONATION_COPY_OFFSET_PX = stagePlotCmToPx(40);

/**
 * Items magnetizados a una formacion (`slotId` = `formationId:index`).
 * @param {{ slotId?: string|null }[]} items
 * @param {string} formationId
 */
export function itemsAnchoredToFormation(items, formationId) {
  const id = String(formationId);
  return (items || []).filter((it) => {
    const parsed = parseSlotId(it.slotId);
    return parsed && parsed.formationId === id;
  });
}

/**
 * Duplica geometria de una formacion; opcionalmente clona items anclados.
 * Nuevo id, mismo kind/params/slots/rotation/facing; offset por defecto +40 cm en X.
 *
 * @param {object} formation
 * @param {{ id?: string, slotId?: string|null, x?: number, y?: number, groupId?: string|null }[]} items
 * @param {{
 *   withInstruments?: boolean,
 *   offsetX?: number,
 *   offsetY?: number,
 *   allocateZ?: () => number,
 *   newItemId?: () => string,
 * }} [opts]
 * @returns {{ formation: object, items: object[] }}
 */
export function cloneStagePlotFormation(formation, items, opts = {}) {
  if (!formation || typeof formation !== "object") {
    return { formation: null, items: [] };
  }
  const withInstruments = !!opts.withInstruments;
  const offsetX = Number.isFinite(Number(opts.offsetX))
    ? Number(opts.offsetX)
    : STAGE_PLOT_FORMATIONATION_COPY_OFFSET_PX;
  const offsetY = Number.isFinite(Number(opts.offsetY))
    ? Number(opts.offsetY)
    : 0;
  const allocateZ =
    typeof opts.allocateZ === "function" ? opts.allocateZ : () => 0;
  const newItemId =
    typeof opts.newItemId === "function"
      ? opts.newItemId
      : () => {
          if (typeof crypto !== "undefined" && crypto.randomUUID) {
            return crypto.randomUUID();
          }
          return `sp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        };

  const newFormation = {
    ...formation,
    id: newId(),
    x: (Number(formation.x) || 0) + offsetX,
    y: (Number(formation.y) || 0) + offsetY,
    params: { ...(formation.params || {}) },
  };

  if (!withInstruments) {
    return { formation: newFormation, items: [] };
  }

  const anchored = itemsAnchoredToFormation(items, formation.id);
  const clones = anchored.map((src) => {
    const parsed = parseSlotId(src.slotId);
    return {
      ...src,
      id: newItemId(),
      x: (Number(src.x) || 0) + offsetX,
      y: (Number(src.y) || 0) + offsetY,
      z: allocateZ(),
      slotId: parsed
        ? makeSlotId(newFormation.id, parsed.index)
        : null,
      groupId: null,
    };
  });

  return { formation: newFormation, items: clones };
}