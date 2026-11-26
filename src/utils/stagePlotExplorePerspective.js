/**
 * Orbit explore camera for the Escenario editor (Konva only).
 * Orthographic lookAt of the stage plane → affine floor transform (not skew stretch).
 * Export PDF/JPG stay orthographic and never read these values.
 */

/** Radians: elevation above the floor. */
const DEG = Math.PI / 180;

/**
 * Top-down camera ≈ identity floor (matches orthographic planta).
 * Used on explore activate so the view does not jump until the first orbit drag.
 * Mode off still skips the explore Group transform entirely.
 */
export const STAGE_PLOT_EXPLORE_IDENTITY = Object.freeze({
  yaw: 0,
  pitch: 90 * DEG,
});

/** Session default = identity planta; orbit starts from this baseline. */
export const STAGE_PLOT_EXPLORE_DEFAULT = STAGE_PLOT_EXPLORE_IDENTITY;

/** Konva attrs for an untransformed floor / billboard. */
export const STAGE_PLOT_EXPLORE_KONVA_IDENTITY = Object.freeze({
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  skewX: 0,
});

/**
 * Screen-space icon scale in Explorar (billboards).
 * Slightly under edit size so upright PNGs spill less past the floor edge;
 * feet still sit on the projected stage point (bottom-center anchor).
 */
export const STAGE_PLOT_EXPLORE_ICON_SCALE = 0.85;

const PITCH_MIN = 12 * DEG;
/** Allow exact top-down (identity floor); singularity handled in floor matrix. */
const PITCH_MAX = 90 * DEG;
/** Radians of yaw/pitch per pixel dragged. */
const ORBIT_SENSITIVITY = 0.0055;

/**
 * @typedef {{ yaw: number, pitch: number }} StagePlotExploreCamera
 * @typedef {{ scaleX: number, scaleY: number, rotation: number, skewX: number }} StagePlotExploreKonvaXf
 */

/**
 * Clamp pitch so the camera never flips under the floor.
 * @param {Partial<StagePlotExploreCamera> | null | undefined} cam
 * @returns {StagePlotExploreCamera}
 */
export function stagePlotExploreClampCamera(cam) {
  const yaw = Number(cam?.yaw);
  const pitch = Number(cam?.pitch);
  return {
    yaw: Number.isFinite(yaw) ? yaw : STAGE_PLOT_EXPLORE_DEFAULT.yaw,
    pitch: clamp(
      Number.isFinite(pitch) ? pitch : STAGE_PLOT_EXPLORE_DEFAULT.pitch,
      PITCH_MIN,
      PITCH_MAX,
    ),
  };
}

/**
 * Orbit from a pointer drag delta (screen pixels).
 * Horizontal → yaw (around stage). Vertical → pitch (up = more top-down).
 *
 * @param {StagePlotExploreCamera | null | undefined} cam
 * @param {number} dx
 * @param {number} dy
 * @returns {StagePlotExploreCamera}
 */
export function stagePlotExploreOrbitByDelta(cam, dx, dy) {
  const base = stagePlotExploreClampCamera(cam);
  const yaw = base.yaw + (Number(dx) || 0) * ORBIT_SENSITIVITY;
  // Screen dy>0 is drag down → lower elevation (more eye-level foreshortening).
  const pitch = base.pitch - (Number(dy) || 0) * ORBIT_SENSITIVITY;
  return stagePlotExploreClampCamera({ yaw, pitch });
}

/**
 * Affine Konva attrs for the floor Group (pivot at stage center).
 * Stage plane Y=0; +X stage right; +Z stage downstage. Camera orbits lookAt center.
 *
 * @param {StagePlotExploreCamera | null | undefined} cam
 * @returns {StagePlotExploreKonvaXf}
 */
export function stagePlotExploreFloorKonvaAttrs(cam) {
  const { yaw, pitch } = stagePlotExploreClampCamera(cam);
  // Exact planta: skip matrix so activate stays visually identical to edit mode.
  if (
    Math.abs(pitch - STAGE_PLOT_EXPLORE_IDENTITY.pitch) < 1e-9 &&
    Math.abs(yaw - STAGE_PLOT_EXPLORE_IDENTITY.yaw) < 1e-9
  ) {
    return { ...STAGE_PLOT_EXPLORE_KONVA_IDENTITY };
  }
  const m = stagePlotExploreFloorMatrix(yaw, pitch);
  return decomposeKonvaLinear(m.a, m.b, m.c, m.d);
}

/**
 * Project a stage-plane point through the same orthographic lookAt used by the
 * floor Group (pivot at stage center). Icons drawn at the result with identity
 * rotation/scale/skew stay upright; only their screen position moves with orbit.
 *
 * @param {StagePlotExploreCamera | null | undefined} cam
 * @param {number} stageX
 * @param {number} stageY
 * @param {number} stageW
 * @param {number} stageH
 * @returns {{ x: number, y: number }}
 */
export function stagePlotExploreProjectStagePoint(
  cam,
  stageX,
  stageY,
  stageW,
  stageH,
) {
  const { yaw, pitch } = stagePlotExploreClampCamera(cam);
  if (
    Math.abs(pitch - STAGE_PLOT_EXPLORE_IDENTITY.pitch) < 1e-9 &&
    Math.abs(yaw - STAGE_PLOT_EXPLORE_IDENTITY.yaw) < 1e-9
  ) {
    return { x: Number(stageX), y: Number(stageY) };
  }
  const m = stagePlotExploreFloorMatrix(yaw, pitch);
  const cx = Number(stageW) / 2;
  const cy = Number(stageH) / 2;
  const dx = Number(stageX) - cx;
  const dy = Number(stageY) - cy;
  return {
    x: cx + m.a * dx + m.c * dy,
    y: cy + m.b * dx + m.d * dy,
  };
}

/**
 * @deprecated Inverse affine under the floor Group stretches at steep pitch.
 * Prefer screen-space icons via {@link stagePlotExploreProjectStagePoint}.
 * @param {StagePlotExploreKonvaXf | null | undefined} floorXf
 * @returns {StagePlotExploreKonvaXf}
 */
export function stagePlotExploreBillboard(floorXf) {
  const sx = Number(floorXf?.scaleX);
  const sy = Number(floorXf?.scaleY);
  const rotDeg = Number(floorXf?.rotation);
  const sk = Number(floorXf?.skewX);
  if (
    (!Number.isFinite(sx) || Math.abs(sx - 1) < 1e-6) &&
    (!Number.isFinite(sy) || Math.abs(sy - 1) < 1e-6) &&
    (!Number.isFinite(rotDeg) || Math.abs(rotDeg) < 1e-6) &&
    (!Number.isFinite(sk) || Math.abs(sk) < 1e-6)
  ) {
    return STAGE_PLOT_EXPLORE_KONVA_IDENTITY;
  }
  const m = composeKonvaLinear(
    Number.isFinite(sx) ? sx : 1,
    Number.isFinite(sy) ? sy : 1,
    (Number.isFinite(rotDeg) ? rotDeg : 0) * DEG,
    Number.isFinite(sk) ? sk : 0,
  );
  const inv = invert2x2(m.a, m.b, m.c, m.d);
  if (!inv) return STAGE_PLOT_EXPLORE_KONVA_IDENTITY;
  return decomposeKonvaLinear(inv.a, inv.b, inv.c, inv.d);
}

/**
 * @deprecated Prefer stagePlotExploreOrbitByDelta — kept name for older call sites.
 * Idle pointer position no longer drives the camera.
 */
export function stagePlotExploreFromPointer() {
  return STAGE_PLOT_EXPLORE_DEFAULT;
}

/**
 * 2×2 that maps stage-centered (dx, dy) → screen offset under orthographic lookAt.
 * Matrix layout | a c |  (Konva / CSS: x' = a*x + c*y, y' = b*x + d*y)
 *               | b d |
 */
function stagePlotExploreFloorMatrix(yaw, pitch) {
  const dist = 1000;
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  // Camera on sphere: yaw around vertical, pitch = elevation from horizon.
  // yaw=0 → downstage (+Z); pitch=90° → top-down.
  const eye = [
    dist * cosP * sinY,
    dist * sinP,
    dist * cosP * cosY,
  ];
  const forward = normalize([-eye[0], -eye[1], -eye[2]]);
  let worldUp = [0, 1, 0];
  let right = cross(forward, worldUp);
  if (length(right) < 1e-6) {
    worldUp = [0, 0, -1];
    right = cross(forward, worldUp);
  }
  right = normalize(right);
  const up = cross(right, forward);

  // Orthographic: screen x = dot(p, right), screen y = -dot(p, up) (Y down).
  const pX = projectXZ(1, 0, right, up);
  const pZ = projectXZ(0, 1, right, up);
  return { a: pX[0], b: pX[1], c: pZ[0], d: pZ[1] };
}

function projectXZ(x, z, right, up) {
  const p = [x, 0, z];
  return [dot(p, right), -dot(p, up)];
}

/** Match Konva Node._getTransform linear part: rotate → skew → scale. */
function composeKonvaLinear(scaleX, scaleY, rotationRad, skewX) {
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  // After rotate:
  let a = cos;
  let b = sin;
  let c = -sin;
  let d = cos;
  // skew(skewX, 0):
  const m21 = c + a * skewX;
  const m22 = d + b * skewX;
  c = m21;
  d = m22;
  // scale:
  a *= scaleX;
  b *= scaleX;
  c *= scaleY;
  d *= scaleY;
  return { a, b, c, d };
}

/**
 * Inverse of composeKonvaLinear for matrices with scaleX ≠ 0.
 * @returns {StagePlotExploreKonvaXf}
 */
function decomposeKonvaLinear(a, b, c, d) {
  const scaleX = Math.hypot(a, b);
  if (scaleX < 1e-9) {
    return { ...STAGE_PLOT_EXPLORE_KONVA_IDENTITY };
  }
  const rotationRad = Math.atan2(b, a);
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  const scaleY = -c * sin + d * cos;
  const skewX =
    Math.abs(scaleY) > 1e-9 ? (c * cos + d * sin) / scaleY : 0;
  return {
    scaleX,
    scaleY,
    rotation: rotationRad / DEG,
    skewX,
  };
}

function invert2x2(a, b, c, d) {
  const det = a * d - b * c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  const invDet = 1 / det;
  return {
    a: d * invDet,
    b: -b * invDet,
    c: -c * invDet,
    d: a * invDet,
  };
}

function dot(u, v) {
  return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
}

function cross(u, v) {
  return [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
}

function length(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalize(v) {
  const len = length(v) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
