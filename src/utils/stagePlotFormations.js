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
  "semi_arc",
  "horseshoe",
  "rect",
  "line",
];

export const STAGE_PLOT_FORMATIONATION_LABELS = {
  arc: "Arco",
  semi_arc: "Semi-arco",
  horseshoe: "Herradura",
  rect: "Rectángulo",
  line: "Línea recta",
};

/** Kinds that support Centrar / snap al eje X del director. */
export const STAGE_PLOT_CENTERABLE_FORMATION_KINDS = [
  "arc",
  "semi_arc",
  "horseshoe",
  "rect",
  "line",
];

/** Espaciado de plazas: fijo / libre / simétrico. */
export const STAGE_PLOT_SLOT_MODES = ["fixed", "free", "symmetric"];

export const STAGE_PLOT_SLOT_MODE_LABELS = {
  fixed: "Fijo",
  free: "Libre",
  symmetric: "Simétrico",
};



/** Defaults semi-arco: 2 laterales/ala + 4 en arco → total 8. */
export const SEMI_ARC_DEFAULT_WING_SLOTS = 2;
export const SEMI_ARC_DEFAULT_ARC_SLOTS = 4;

export function clampSemiArcWingSlots(n) {
  return clamp(Math.round(Number(n) || 0), 0, 32);
}

export function clampSemiArcArcSlots(n) {
  return clamp(Math.round(Number(n) || 0), 1, 64);
}

/** Total plazas = 2·L (alas simétricas) + A (arco, extremos incluidos). */
export function semiArcTotalSlots(wingSlots, arcSlots) {
  return (
    2 * clampSemiArcWingSlots(wingSlots) + clampSemiArcArcSlots(arcSlots)
  );
}

/**
 * Migra `slots` legacy o lee `wingSlots`/`arcSlots`/`lateralSlots`.
 * @returns {{ wingSlots: number, arcSlots: number, slots: number }}
 */
export function resolveSemiArcSlotCounts(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const hasSplit =
    o.wingSlots != null ||
    o.arcSlots != null ||
    o.lateralSlots != null;
  if (hasSplit) {
    const wingSlots = clampSemiArcWingSlots(
      o.wingSlots != null ? o.wingSlots : o.lateralSlots,
    );
    const arcSlots = clampSemiArcArcSlots(
      o.arcSlots != null ? o.arcSlots : SEMI_ARC_DEFAULT_ARC_SLOTS,
    );
    return {
      wingSlots,
      arcSlots,
      slots: semiArcTotalSlots(wingSlots, arcSlots),
    };
  }
  const old = clamp(Math.round(Number(o.slots) || 8), 1, 64);
  // Prefer 2 laterales/ala; resto al arco (mín. 1).
  let wingSlots = Math.min(
    SEMI_ARC_DEFAULT_WING_SLOTS,
    Math.max(0, Math.floor((old - 1) / 2)),
  );
  let arcSlots = Math.max(1, old - 2 * wingSlots);
  // Clamp por si old era enorme
  wingSlots = clampSemiArcWingSlots(wingSlots);
  arcSlots = clampSemiArcArcSlots(arcSlots);
  return {
    wingSlots,
    arcSlots,
    slots: semiArcTotalSlots(wingSlots, arcSlots),
  };
}

/**
 * t fijos semi-arco por segmento (no equiespaciado en toda la polilínea).
 * Ala izq: L plazas en u = 0, 1/L, …, (L-1)/L (extremo → hacia arco; excluye juntura).
 * Arco: A plazas con extremos (junturas) si A≥2; A=1 → centro del arco.
 * Ala der: espejo, u = 1/L … 1 desde la juntura hacia el extremo (excluye juntura).
 */
/**
 * Aplica wingSlots/arcSlots y sincroniza `slots` (= 2L+A). Opcional resize de slotTs.
 * @param {object} formation
 * @param {{ wingSlots?: number, arcSlots?: number }} patch
 */
export function applySemiArcSlotCounts(formation, patch = {}) {
  if (!formation || formation.kind !== "semi_arc") return formation;
  const wingSlots = clampSemiArcWingSlots(
    patch.wingSlots != null ? patch.wingSlots : formation.wingSlots,
  );
  const arcSlots = clampSemiArcArcSlots(
    patch.arcSlots != null ? patch.arcSlots : formation.arcSlots,
  );
  const slots = semiArcTotalSlots(wingSlots, arcSlots);
  const mode = normalizeStagePlotSlotMode(formation.slotMode);
  let slotTs = formation.slotTs;
  if (mode === "fixed") {
    slotTs = null;
  } else if (slots !== formation.slots) {
    slotTs = resizeFormationSlotTs(formation.slotTs, slots, mode);
  }
  return { ...formation, wingSlots, arcSlots, slots, slotTs };
}

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
export const FORMATION_MIN_WING_LENGTH = stagePlotCmToPx(20);
/** Ángulo de ala (+/- deg); positivo = abrir afuera. */
export const FORMATION_WING_ANGLE_MIN = -75;
export const FORMATION_WING_ANGLE_MAX = 75;

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

function normalizeVec(x, y) {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

/** Ángulo firmado (grados) de `from` → `to` (CCW positivo, Y hacia abajo como Konva). */
function signedAngleDeg(from, to) {
  const cross = from.x * to.y - from.y * to.x;
  const dot = from.x * to.x + from.y * to.y;
  return radToDeg(Math.atan2(cross, dot));
}

function ellipsePoint(rx, ry, angleRad) {
  return { x: rx * Math.cos(angleRad), y: ry * Math.sin(angleRad) };
}

/** Tangente unitaria d/dθ de la elipse (sentido de ángulo creciente). */
function ellipseTangentUnit(rx, ry, angleRad) {
  return normalizeVec(-rx * Math.sin(angleRad), ry * Math.cos(angleRad));
}

function clampWingAngle(deg) {
  return clamp(
    Number(deg) || 0,
    FORMATION_WING_ANGLE_MIN,
    FORMATION_WING_ANGLE_MAX,
  );
}

/**
 * Anclas locales del semi-arco: extremos del arco, tangentes y puntas de ala.
 * Alas simétricas: mismo wingLength y mismo |wingAngle| espejado.
 * wingAngle > 0 abre las alas hacia afuera (lejos del eje de simetría).
 * @param {Record<string, number>} p
 */
function semiArcLocalGeometry(p) {
  const rx = Math.max(FORMATION_MIN_RADIUS, Number(p.rx) || stagePlotCmToPx(180));
  const ry = Math.max(FORMATION_MIN_RADIUS, Number(p.ry) || stagePlotCmToPx(100));
  let a0 = degToRad(p.startAngle ?? 180);
  let a1 = degToRad(p.endAngle ?? 360);
  if (a1 < a0) a1 += Math.PI * 2;
  const wingLength = Math.max(
    FORMATION_MIN_WING_LENGTH,
    Number(p.wingLength) || stagePlotCmToPx(80),
  );
  const wingAngle = clampWingAngle(p.wingAngle ?? 0);
  const L = ellipsePoint(rx, ry, a0);
  const R = ellipsePoint(rx, ry, a1);
  const Ts = ellipseTangentUnit(rx, ry, a0);
  const Te = ellipseTangentUnit(rx, ry, a1);
  const leftTravel = rotateLocal(Ts.x, Ts.y, wingAngle);
  const rightTravel = rotateLocal(Te.x, Te.y, -wingAngle);
  const leftTip = {
    x: L.x - wingLength * leftTravel.x,
    y: L.y - wingLength * leftTravel.y,
  };
  const rightTip = {
    x: R.x + wingLength * rightTravel.x,
    y: R.y + wingLength * rightTravel.y,
  };
  return {
    rx,
    ry,
    a0,
    a1,
    wingLength,
    wingAngle,
    L,
    R,
    Ts,
    Te,
    leftTip,
    rightTip,
  };
}

/** @param {unknown} mode */
export function normalizeStagePlotSlotMode(mode) {
  const s = String(mode || "fixed");
  return STAGE_PLOT_SLOT_MODES.includes(s) ? s : "fixed";
}

/** Plazas equiespaciadas en t ∈ [0,1]. */
export function evenFormationSlotTs(n) {
  const count = clamp(Math.round(Number(n) || 0), 0, 64);
  if (count <= 0) return [];
  if (count === 1) return [0.5];
  const out = [];
  for (let i = 0; i < count; i++) out.push(i / (count - 1));
  return out;
}

/**
 * Espeja t[i] ↔ 1−t[i] forzando desde índices bajos; centro (N impar) = 0.5.
 * @param {number[]} ts
 */
export function enforceSymmetricSlotTs(ts) {
  const n = (ts || []).length;
  if (n <= 0) return [];
  const out = (ts || []).map((t) => clamp(Number(t) || 0, 0, 1));
  for (let i = 0; i < Math.floor(n / 2); i++) {
    const j = n - 1 - i;
    out[j] = 1 - out[i];
  }
  if (n % 2 === 1) {
    out[Math.floor(n / 2)] = 0.5;
  }
  return out;
}

/**
 * Al cambiar N: conserva t existentes (best-effort) e inserta nuevas en los huecos más grandes.
 * @param {number[]|null|undefined} prevTs
 * @param {number} nextCount
 * @param {"fixed"|"free"|"symmetric"} mode
 */
export function resizeFormationSlotTs(prevTs, nextCount, mode = "free") {
  const n = clamp(Math.round(Number(nextCount) || 0), 0, 64);
  if (n <= 0) return [];
  const m = normalizeStagePlotSlotMode(mode);
  if (m === "fixed") return evenFormationSlotTs(n);

  let ts = Array.isArray(prevTs)
    ? prevTs
        .map((t) => clamp(Number(t) || 0, 0, 1))
        .filter((t) => Number.isFinite(t))
    : [];
  ts.sort((a, b) => a - b);

  if (ts.length === 0) {
    ts = evenFormationSlotTs(n);
  } else if (ts.length > n) {
    if (n === 1) {
      ts = [ts[Math.floor(ts.length / 2)]];
    } else {
      const kept = [];
      for (let i = 0; i < n; i++) {
        const src = Math.round((i * (ts.length - 1)) / (n - 1));
        kept.push(ts[src]);
      }
      ts = kept;
    }
  } else if (ts.length < n) {
    while (ts.length < n) {
      let bestGap = -1;
      let bestT = 0.5;
      const extended = [0, ...ts, 1];
      for (let i = 0; i < extended.length - 1; i++) {
        const gap = extended[i + 1] - extended[i];
        if (gap > bestGap) {
          bestGap = gap;
          bestT = (extended[i] + extended[i + 1]) / 2;
        }
      }
      if (bestGap < 0) break;
      ts.push(bestT);
      ts.sort((a, b) => a - b);
    }
  }

  ts = ts.map((t) => clamp(t, 0, 1));
  if (m === "symmetric") ts = enforceSymmetricSlotTs(ts);
  return ts;
}

/**
 * t efectivos de la formación según slotMode.
 * @param {{ slots?: number, slotMode?: string, slotTs?: number[]|null }} formation
 */
export function resolveFormationSlotTs(formation) {
  const n = clamp(Math.round(Number(formation?.slots) || 0), 0, 64);
  const mode = normalizeStagePlotSlotMode(formation?.slotMode);
  if (n <= 0) return [];
  if (mode === "fixed") {
    if (formation?.kind === "semi_arc") return evenSemiArcFixedSlotTs(formation);
    return evenFormationSlotTs(n);
  }
  const ts = resizeFormationSlotTs(formation?.slotTs, n, mode);
  return mode === "symmetric" ? enforceSymmetricSlotTs(ts) : ts;
}

/**
 * Cambia slotMode; fijo limpia slotTs (redistribuye equidistante).
 * Simétrico espeja desde índices bajos. Libre conserva / siembra equidistante.
 * @param {object} formation
 * @param {"fixed"|"free"|"symmetric"} nextMode
 */
export function applyFormationSlotMode(formation, nextMode) {
  if (!formation || typeof formation !== "object") return formation;
  const mode = normalizeStagePlotSlotMode(nextMode);
  const n = clamp(Math.round(Number(formation.slots) || 8), 1, 64);
  if (mode === "fixed") {
    return { ...formation, slotMode: "fixed", slotTs: null, slots: n };
  }
  let ts;
  const prevMode = normalizeStagePlotSlotMode(formation.slotMode);
  if (
    prevMode === "fixed" ||
    !Array.isArray(formation.slotTs) ||
    !formation.slotTs.length
  ) {
    ts =
      formation.kind === "semi_arc"
        ? evenSemiArcFixedSlotTs({ ...formation, slots: n })
        : evenFormationSlotTs(n);
  } else {
    ts = resizeFormationSlotTs(formation.slotTs, n, "free");
  }
  if (mode === "symmetric") ts = enforceSymmetricSlotTs(ts);
  return { ...formation, slotMode: mode, slotTs: ts, slots: n };
}

/**
 * Actualiza t de una plaza (y espejo si simétrico). Devuelve nuevo slotTs.
 * @param {object} formation
 * @param {number} index
 * @param {number} t
 */
export function setFormationSlotT(formation, index, t) {
  const n = clamp(Math.round(Number(formation?.slots) || 0), 0, 64);
  const mode = normalizeStagePlotSlotMode(formation?.slotMode);
  if (mode === "fixed" || n <= 0) return resolveFormationSlotTs(formation);
  const i = Math.floor(Number(index));
  if (!Number.isFinite(i) || i < 0 || i >= n) {
    return resolveFormationSlotTs(formation);
  }
  const ts = resolveFormationSlotTs(formation).slice();
  const nt = clamp(Number(t) || 0, 0, 1);
  if (mode === "symmetric") {
    const j = n - 1 - i;
    if (i === j) {
      ts[i] = 0.5;
    } else {
      ts[i] = nt;
      ts[j] = 1 - nt;
    }
    return enforceSymmetricSlotTs(ts);
  }
  ts[i] = nt;
  return ts;
}


/** Normaliza grados Konva a [0, 360). */
export function normalizeRotationDeg(deg) {
  const n = Number(deg) || 0;
  return ((n % 360) + 360) % 360;
}

/**
 * Rotacion Konva para que el eje +Y local (cuello/mastil del SVG) mire al punto.
 * Usado en marcadores de plaza (slot.rotation), no en items con huella.
 */
export function rotationFacingPoint(fromX, fromY, toX, toY) {
  const ang = Math.atan2(toY - fromY, toX - fromX);
  return normalizeRotationDeg(radToDeg(ang) + 90);
}

/**
 * Rotacion para items con huella: base/cuerpo (-Y local) hacia el punto
 * (p. ej. director). Equivalente a rotationFacingPoint(...) + 180 deg.
 */
export function rotationInstrumentBaseFacingPoint(fromX, fromY, toX, toY) {
  return normalizeRotationDeg(rotationFacingPoint(fromX, fromY, toX, toY) + 180);
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
    return { width: stagePlotCmToPx(300), depth: stagePlotCmToPx(150) };
  }
  if (kind === "horseshoe") {
    return { width: stagePlotCmToPx(280), depth: stagePlotCmToPx(160) };
  }
  if (kind === "line") {
    return { length: stagePlotCmToPx(360) };
  }
  if (kind === "semi_arc") {
    return {
      rx: stagePlotCmToPx(180),
      ry: stagePlotCmToPx(100),
      startAngle: 180,
      endAngle: 360,
      wingLength: stagePlotCmToPx(80),
      wingAngle: 15,
    };
  }
  return {
    rx: stagePlotCmToPx(180),
    ry: stagePlotCmToPx(100),
    startAngle: 180,
    endAngle: 360,
  };
}

/**
 * @param {"arc"|"semi_arc"|"horseshoe"|"rect"|"line"} kind
 * @param {number} x
 * @param {number} y
 * @param {number} [slots]
 */
export function createStagePlotFormation(kind, x, y, slots = 8) {
  const k = STAGE_PLOT_FORMATIONATION_KINDS.includes(kind) ? kind : "arc";
  const base = {
    id: newId(),
    kind: k,
    x: Number(x) || 0,
    y: Number(y) || 0,
    rotation: 0,
    params: defaultParams(k),
    slots: clamp(Math.round(Number(slots) || 8), 1, 64),
    slotMode: "fixed",
    slotTs: null,
    facing: "conductor",
  };
  if (k === "semi_arc") {
    const wingSlots = SEMI_ARC_DEFAULT_WING_SLOTS;
    const arcSlots =
      Number(slots) === 8
        ? SEMI_ARC_DEFAULT_ARC_SLOTS
        : clampSemiArcArcSlots(
            Math.max(
              1,
              clamp(Math.round(Number(slots) || 8), 1, 64) - 2 * wingSlots,
            ),
          );
    return {
      ...base,
      wingSlots,
      arcSlots,
      slots: semiArcTotalSlots(wingSlots, arcSlots),
    };
  }
  return base;
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
  if (kind === "arc" || kind === "semi_arc") {
    params.rx = Math.max(FORMATION_MIN_RADIUS, Number(params.rx) || stagePlotCmToPx(180));
    params.ry = Math.max(FORMATION_MIN_RADIUS, Number(params.ry) || stagePlotCmToPx(100));
  }
  if (kind === "semi_arc") {
    params.wingLength = Math.max(
      FORMATION_MIN_WING_LENGTH,
      Number(params.wingLength) || stagePlotCmToPx(80),
    );
    params.wingAngle = clampWingAngle(
      Number.isFinite(Number(params.wingAngle)) ? params.wingAngle : 15,
    );
    if (!Number.isFinite(Number(params.startAngle))) params.startAngle = 180;
    if (!Number.isFinite(Number(params.endAngle))) params.endAngle = 360;
  }
  if (kind === "line") {
    params.length = Math.max(FORMATION_MIN_LENGTH, Number(params.length) || stagePlotCmToPx(360));
  }
  if (kind === "horseshoe" || kind === "rect") {
    params.width = Math.max(FORMATION_MIN_WIDTH, Number(params.width) || stagePlotCmToPx(280));
    params.depth = Math.max(FORMATION_MIN_DEPTH, Number(params.depth) || stagePlotCmToPx(150));
  }
  const slotMode = normalizeStagePlotSlotMode(o.slotMode);
  /** @type {number} */
  let slots;
  /** @type {number|undefined} */
  let wingSlots;
  /** @type {number|undefined} */
  let arcSlots;
  if (kind === "semi_arc") {
    const counts = resolveSemiArcSlotCounts(o);
    wingSlots = counts.wingSlots;
    arcSlots = counts.arcSlots;
    slots = counts.slots;
  } else {
    slots = clamp(Math.round(Number(o.slots) || 8), 1, 64);
  }
  /** @type {number[]|null} */
  let slotTs = null;
  if (slotMode !== "fixed") {
    slotTs = resizeFormationSlotTs(
      Array.isArray(o.slotTs) ? o.slotTs : null,
      slots,
      slotMode,
    );
  }
  let facing = /** @type {"conductor"|string} */ ("conductor");
  if (o.facing != null && o.facing !== "conductor") {
    facing = String(o.facing);
  }
  /** @type {Record<string, unknown>} */
  const out = {
    id: String(o.id || newId()),
    kind,
    x: Number(o.x) || 0,
    y: Number(o.y) || 0,
    rotation: Number(o.rotation) || 0,
    params,
    slots,
    slotMode,
    slotTs,
    facing,
  };
  if (kind === "semi_arc") {
    out.wingSlots = wingSlots;
    out.arcSlots = arcSlots;
  }
  return out;
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

  if (kind === "semi_arc") {
    const g = semiArcLocalGeometry(p);
    const out = [{ x: g.leftTip.x, y: g.leftTip.y }, { x: g.L.x, y: g.L.y }];
    const steps = 48;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const a = g.a0 + (g.a1 - g.a0) * t;
      out.push(ellipsePoint(g.rx, g.ry, a));
    }
    out.push({ x: g.R.x, y: g.R.y });
    out.push({ x: g.rightTip.x, y: g.rightTip.y });
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


export function evenSemiArcFixedSlotTs(formation) {
  const wingSlots = clampSemiArcWingSlots(formation?.wingSlots);
  const arcSlots = clampSemiArcArcSlots(formation?.arcSlots);
  const n = semiArcTotalSlots(wingSlots, arcSlots);
  if (n <= 0) return [];

  const localPts = formationGuidePointsLocal(formation);
  const { cum, total } = polylineCumLengths(localPts);
  if (!localPts || localPts.length < 4 || total <= 0) {
    return evenFormationSlotTs(n);
  }

  // Guía: tip_l → L → …arco… → R → tip_r  (índices 0, 1, …, len-2, len-1)
  const leftWingLen = cum[1] - cum[0];
  const rightWingStart = cum[cum.length - 2];
  const arcLen = Math.max(0, rightWingStart - cum[1]);
  const rightWingLen = Math.max(0, total - rightWingStart);
  const ts = [];

  for (let i = 0; i < wingSlots; i++) {
    const u = i / wingSlots; // 0 .. (L-1)/L
    ts.push(clamp((u * leftWingLen) / total, 0, 1));
  }

  for (let j = 0; j < arcSlots; j++) {
    const a = arcSlots === 1 ? 0.5 : j / (arcSlots - 1);
    ts.push(clamp((leftWingLen + a * arcLen) / total, 0, 1));
  }

  for (let k = 0; k < wingSlots; k++) {
    const u = (k + 1) / wingSlots; // 1/L .. 1 (excluye juntura)
    ts.push(clamp((leftWingLen + arcLen + u * rightWingLen) / total, 0, 1));
  }

  return ts;
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

  const ts = resolveFormationSlotTs(formation);
  const slots = [];
  for (let i = 0; i < n; i++) {
    const t = ts[i] ?? (n === 1 ? 0.5 : i / Math.max(1, n - 1));
    const dist = total * clamp(t, 0, 1);
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
    // slot.rotation: marcadores de plaza (canvas/PDF). Items magnetizados: rotacion manual (sin auto-orientar).
    slots.push({
      index: i,
      t: clamp(t, 0, 1),
      x,
      y,
      rotation,
      slotId: makeSlotId(formation.id, i),
    });
  }
  return slots;
}

/**
 * Proyecta un punto de escena al t in [0,1] mas cercano sobre la guia.
 * @param {object} formation
 * @param {number} worldX
 * @param {number} worldY
 */
export function projectWorldPointToFormationT(formation, worldX, worldY) {
  if (!formation) return 0;
  const local = worldToFormationLocal(formation, worldX, worldY);
  const localPts = formationGuidePointsLocal(formation);
  const { cum, total } = polylineCumLengths(localPts);
  if (total <= 0 || localPts.length < 2) return 0;

  let bestDist = Infinity;
  let bestAlong = 0;
  for (let i = 1; i < localPts.length; i++) {
    const ax = localPts[i - 1].x;
    const ay = localPts[i - 1].y;
    const bx = localPts[i].x;
    const by = localPts[i].y;
    const abx = bx - ax;
    const aby = by - ay;
    const abLen2 = abx * abx + aby * aby || 1;
    let u = ((local.x - ax) * abx + (local.y - ay) * aby) / abLen2;
    u = clamp(u, 0, 1);
    const px = ax + abx * u;
    const py = ay + aby * u;
    const d = Math.hypot(local.x - px, local.y - py);
    if (d < bestDist) {
      bestDist = d;
      bestAlong = cum[i - 1] + Math.hypot(abx, aby) * u;
    }
  }
  return clamp(bestAlong / total, 0, 1);
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

  if (kind === "semi_arc") {
    const g = semiArcLocalGeometry(p);
    return [
      { id: "w", x: -g.rx, y: 0 },
      { id: "e", x: g.rx, y: 0 },
      { id: "n", x: 0, y: -g.ry },
      { id: "tip_l", x: g.leftTip.x, y: g.leftTip.y },
      { id: "tip_r", x: g.rightTip.x, y: g.rightTip.y },
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

  if (formation.kind === "semi_arc") {
    if (handleId === "e" || handleId === "w" || handleId === "n") {
      if (handleId === "e") p.rx = Math.max(FORMATION_MIN_RADIUS, lx);
      else if (handleId === "w") p.rx = Math.max(FORMATION_MIN_RADIUS, -lx);
      else if (handleId === "n") p.ry = Math.max(FORMATION_MIN_RADIUS, -ly);
      return p;
    }
    const g = semiArcLocalGeometry(p);
    if (handleId === "tip_l") {
      const vx = lx - g.L.x;
      const vy = ly - g.L.y;
      const len = Math.hypot(vx, vy);
      p.wingLength = Math.max(FORMATION_MIN_WING_LENGTH, len);
      if (len > 1e-6) {
        const leftTravel = { x: -vx / len, y: -vy / len };
        p.wingAngle = clampWingAngle(signedAngleDeg(g.Ts, leftTravel));
      }
      return p;
    }
    if (handleId === "tip_r") {
      const vx = lx - g.R.x;
      const vy = ly - g.R.y;
      const len = Math.hypot(vx, vy);
      p.wingLength = Math.max(FORMATION_MIN_WING_LENGTH, len);
      if (len > 1e-6) {
        const rightTravel = { x: vx / len, y: vy / len };
        p.wingAngle = clampWingAngle(-signedAngleDeg(g.Te, rightTravel));
      }
      return p;
    }
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


/** Padding extra alrededor del AABB local de la formación (≈½ marcador de plaza). */
export const FORMATION_BOUNDS_BOX_PADDING_PX = SLOT_MARKER / 2;

const FORMATION_BOUNDS_BOX_HANDLE_OPPOSITE = {
  box_nw: "box_se",
  box_se: "box_nw",
  box_ne: "box_sw",
  box_sw: "box_ne",
  box_n: "box_s",
  box_s: "box_n",
  box_e: "box_w",
  box_w: "box_e",
};

/**
 * Local → escena (origen en centro de formación + rotación).
 * @param {{ x: number, y: number, rotation?: number }} formation
 */
export function formationLocalToWorld(formation, localX, localY) {
  const w = rotateLocal(localX, localY, formation.rotation || 0);
  return { x: formation.x + w.x, y: formation.y + w.y };
}

/**
 * AABB local (antes de rotación) de guía + alas + plazas + padding.
 * @param {object} formation
 * @param {{ x: number, y: number }|null} [facingPoint]
 */
export function getFormationBoundsLocal(formation, facingPoint = null) {
  const points = [...formationGuidePointsLocal(formation)];
  if (formation.kind === "semi_arc") {
    const g = semiArcLocalGeometry(
      formation.params || defaultParams("semi_arc"),
    );
    points.push(g.leftTip, g.rightTip);
  }
  if (facingPoint) {
    for (const slot of computeFormationSlots(formation, facingPoint)) {
      points.push(worldToFormationLocal(formation, slot.x, slot.y));
    }
  }
  const pad = FORMATION_BOUNDS_BOX_PADDING_PX;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x - pad);
    maxX = Math.max(maxX, p.x + pad);
    minY = Math.min(minY, p.y - pad);
    maxY = Math.max(maxY, p.y + pad);
  }
  if (!Number.isFinite(minX)) {
    return { minX: -pad, maxX: pad, minY: -pad, maxY: pad };
  }
  return { minX, minY, maxX, maxY };
}

/**
 * AABB en coords de escena (axis-aligned).
 * @param {object} formation
 * @param {{ x: number, y: number }|null} [facingPoint]
 */
export function getFormationBounds(formation, facingPoint = null) {
  const corners = formationBoundsBoxWorldCorners(formation, facingPoint);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of corners) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Esquinas del rect de selección (local → mundo, respeta rotación).
 * @param {object} formation
 * @param {{ x: number, y: number }|null} [facingPoint]
 */
export function formationBoundsBoxWorldCorners(formation, facingPoint = null) {
  const b = getFormationBoundsLocal(formation, facingPoint);
  return [
    { x: b.minX, y: b.minY },
    { x: b.maxX, y: b.minY },
    { x: b.maxX, y: b.maxY },
    { x: b.minX, y: b.maxY },
  ].map((c) => formationLocalToWorld(formation, c.x, c.y));
}

/**
 * Puntos planos [x0,y0,…] para Konva Line cerrada del recuadro gris.
 * @param {object} formation
 * @param {{ x: number, y: number }|null} [facingPoint]
 */
export function formationBoundsBoxLinePoints(formation, facingPoint = null) {
  const corners = formationBoundsBoxWorldCorners(formation, facingPoint);
  const flat = [];
  for (const p of corners) flat.push(p.x, p.y);
  return flat;
}

function formationBoundsBoxHandlePositionsLocal(formation, facingPoint = null) {
  const b = getFormationBoundsLocal(formation, facingPoint);
  const { minX, minY, maxX, maxY } = b;
  const mx = (minX + maxX) / 2;
  const my = (minY + maxY) / 2;
  return [
    { id: "box_nw", x: minX, y: minY },
    { id: "box_ne", x: maxX, y: minY },
    { id: "box_sw", x: minX, y: maxY },
    { id: "box_se", x: maxX, y: maxY },
    { id: "box_n", x: mx, y: minY },
    { id: "box_s", x: mx, y: maxY },
    { id: "box_w", x: minX, y: my },
    { id: "box_e", x: maxX, y: my },
  ];
}

/**
 * Asas del recuadro gris (escala uniforme) en coords de escena.
 * @param {object} formation
 * @param {{ x: number, y: number }|null} [facingPoint]
 */
export function formationBoundsBoxHandlesWorld(formation, facingPoint = null) {
  return formationBoundsBoxHandlePositionsLocal(formation, facingPoint).map(
    (h) => {
      const w = formationLocalToWorld(formation, h.x, h.y);
      return { id: h.id, x: w.x, y: w.y, variant: "box" };
    },
  );
}

/** Todas las asas: paramétricas + recuadro (box_*). */
export function formationAllResizeHandlesWorld(formation, facingPoint = null) {
  return [
    ...formationResizeHandlesWorld(formation).map((h) => ({
      ...h,
      variant: "param",
    })),
    ...formationBoundsBoxHandlesWorld(formation, facingPoint),
  ];
}

function scaleFormationParams(kind, params, scaleFactor) {
  const p = { ...(params || defaultParams(kind)) };
  const s = scaleFactor;
  if (kind === "arc" || kind === "semi_arc") {
    p.rx = Math.max(
      FORMATION_MIN_RADIUS,
      (Number(p.rx) || stagePlotCmToPx(180)) * s,
    );
    p.ry = Math.max(
      FORMATION_MIN_RADIUS,
      (Number(p.ry) || stagePlotCmToPx(100)) * s,
    );
    if (kind === "semi_arc") {
      p.wingLength = Math.max(
        FORMATION_MIN_WING_LENGTH,
        (Number(p.wingLength) || stagePlotCmToPx(80)) * s,
      );
    }
    return p;
  }
  if (kind === "line") {
    return {
      ...p,
      length: Math.max(
        FORMATION_MIN_LENGTH,
        (Number(p.length) || stagePlotCmToPx(360)) * s,
      ),
    };
  }
  return {
    ...p,
    width: Math.max(
      FORMATION_MIN_WIDTH,
      (Number(p.width) || stagePlotCmToPx(280)) * s,
    ),
    depth: Math.max(
      FORMATION_MIN_DEPTH,
      (Number(p.depth) || stagePlotCmToPx(150)) * s,
    ),
  };
}

/** Factor mínimo de escala uniforme para respetar mínimos por kind. */
export function minUniformScaleForFormation(formation) {
  const kind = formation.kind;
  const p = formation.params || defaultParams(kind);
  const candidates = [0.05];
  if (kind === "arc" || kind === "semi_arc") {
    candidates.push(
      FORMATION_MIN_RADIUS / (Number(p.rx) || stagePlotCmToPx(180)),
      FORMATION_MIN_RADIUS / (Number(p.ry) || stagePlotCmToPx(100)),
    );
    if (kind === "semi_arc") {
      candidates.push(
        FORMATION_MIN_WING_LENGTH /
          (Number(p.wingLength) || stagePlotCmToPx(80)),
      );
    }
  } else if (kind === "line") {
    candidates.push(
      FORMATION_MIN_LENGTH / (Number(p.length) || stagePlotCmToPx(360)),
    );
  } else {
    candidates.push(
      FORMATION_MIN_WIDTH / (Number(p.width) || stagePlotCmToPx(280)),
      FORMATION_MIN_DEPTH / (Number(p.depth) || stagePlotCmToPx(150)),
    );
  }
  return Math.max(...candidates);
}

/**
 * Escala uniforme de todos los params lineales; ancla fija en coords locales.
 * slotTs / ángulos sin cambio.
 */
export function scaleFormationUniform(formation, scaleFactor, anchorLocal) {
  const s = Math.max(scaleFactor, minUniformScaleForFormation(formation));
  const params = scaleFormationParams(
    formation.kind,
    formation.params || defaultParams(formation.kind),
    s,
  );
  const anchorWorld = formationLocalToWorld(
    formation,
    anchorLocal.x,
    anchorLocal.y,
  );
  const scaledOffset = rotateLocal(
    anchorLocal.x * s,
    anchorLocal.y * s,
    formation.rotation || 0,
  );
  return {
    ...formation,
    params,
    x: anchorWorld.x - scaledOffset.x,
    y: anchorWorld.y - scaledOffset.y,
  };
}

/**
 * Redimensionado proporcional arrastrando una asa box_* (recuadro gris).
 * @param {object} baseFormation — snapshot al inicio del drag
 */
export function formationFromBoundsBoxHandleDrag(
  baseFormation,
  handleId,
  worldX,
  worldY,
  facingPoint = null,
) {
  if (!handleId?.startsWith("box_")) return baseFormation;
  const positions = formationBoundsBoxHandlePositionsLocal(
    baseFormation,
    facingPoint,
  );
  const byId = Object.fromEntries(positions.map((h) => [h.id, h]));
  const dragged = byId[handleId];
  const anchorId = FORMATION_BOUNDS_BOX_HANDLE_OPPOSITE[handleId];
  const anchor = byId[anchorId];
  if (!dragged || !anchor) return baseFormation;

  const dragLocal = worldToFormationLocal(baseFormation, worldX, worldY);
  const baseDx = dragged.x - anchor.x;
  const baseDy = dragged.y - anchor.y;
  const newDx = dragLocal.x - anchor.x;
  const newDy = dragLocal.y - anchor.y;

  let s = 1;
  if (handleId === "box_e" || handleId === "box_w") {
    if (Math.abs(baseDx) > 1e-6) s = newDx / baseDx;
  } else if (handleId === "box_n" || handleId === "box_s") {
    if (Math.abs(baseDy) > 1e-6) s = newDy / baseDy;
  } else {
    const baseDist = Math.hypot(baseDx, baseDy);
    const newDist = Math.hypot(newDx, newDy);
    if (baseDist > 1e-6) s = newDist / baseDist;
  }

  if (!Number.isFinite(s) || s <= 0) return baseFormation;
  return scaleFormationUniform(baseFormation, s, anchor);
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
    slotMode: normalizeStagePlotSlotMode(formation.slotMode),
    slotTs: Array.isArray(formation.slotTs) ? formation.slotTs.slice() : null,
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