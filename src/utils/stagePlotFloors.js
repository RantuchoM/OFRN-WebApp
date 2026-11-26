/**
 * Presets de textura de piso del lienzo Escenario.
 * Assets: public/stage-plot/floors/*.png (procedurales OFRN).
 */
import { STAGE_PLOT_CM_TO_PX } from "./stagePlotConstants";

/** Id canónico: sin textura (piso soft grey / night actual). */
export const STAGE_PLOT_FLOOR_PRESET_NONE = "none";

function clamp01(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

/** @typedef {{ id: string, label: string, src: string|null, tileCm: number }} StageFloorPreset */

/** @type {StageFloorPreset[]} */
export const STAGE_PLOT_FLOOR_PRESETS = [
  {
    id: STAGE_PLOT_FLOOR_PRESET_NONE,
    label: "Escenario vacío",
    src: null,
    tileCm: 100,
  },
  {
    id: "negro",
    label: "Negro teatro",
    src: "/stage-plot/floors/negro.png",
    tileCm: 100,
  },
  {
    id: "gris",
    label: "Gris",
    src: "/stage-plot/floors/gris.png",
    tileCm: 100,
  },
  {
    id: "madera_clara",
    label: "Madera clara",
    src: "/stage-plot/floors/madera_clara.png",
    tileCm: 80,
  },
  {
    id: "madera_oscura",
    label: "Madera oscura",
    src: "/stage-plot/floors/madera_oscura.png",
    tileCm: 80,
  },
  {
    id: "ceramico",
    label: "Cerámico",
    src: "/stage-plot/floors/ceramico.png",
    tileCm: 60,
  },
];

const PRESET_BY_ID = new Map(
  STAGE_PLOT_FLOOR_PRESETS.map((p) => [p.id, p]),
);

/** Default al normalizar: vacío → plots existentes no saltan. */
export const STAGE_PLOT_FLOOR_PRESET_DEFAULT = STAGE_PLOT_FLOOR_PRESET_NONE;
/** Opacidad de la textura (0–1). Default 1; irrelevante si preset = none. */
export const STAGE_PLOT_FLOOR_OPACITY_DEFAULT = 1;

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeStagePlotFloorPreset(value) {
  const id = String(value || "").trim();
  if (!id || id === STAGE_PLOT_FLOOR_PRESET_NONE) {
    return STAGE_PLOT_FLOOR_PRESET_NONE;
  }
  return PRESET_BY_ID.has(id) ? id : STAGE_PLOT_FLOOR_PRESET_NONE;
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function normalizeStagePlotFloorOpacity(value) {
  return clamp01(value, STAGE_PLOT_FLOOR_OPACITY_DEFAULT);
}

/**
 * @param {unknown} id
 * @returns {StageFloorPreset}
 */
export function getStageFloorPreset(id) {
  const key = normalizeStagePlotFloorPreset(id);
  return PRESET_BY_ID.get(key) || STAGE_PLOT_FLOOR_PRESETS[0];
}

/**
 * ¿Hay textura que dibujar? (no `none`, con src).
 * @param {unknown} id
 */
export function stageFloorPresetHasTexture(id) {
  const p = getStageFloorPreset(id);
  return !!(p && p.src && p.id !== STAGE_PLOT_FLOOR_PRESET_NONE);
}

/**
 * Escala Konva/canvas para que un tile PNG cubra `tileCm` del escenario.
 * @param {StageFloorPreset} preset
 * @param {{ width: number, height: number }} imageSize
 */
export function stageFloorPatternScale(preset, imageSize) {
  const iw = Math.max(1, Number(imageSize?.width) || 1);
  const ih = Math.max(1, Number(imageSize?.height) || 1);
  const tileCm = Math.max(10, Number(preset?.tileCm) || 100);
  const tilePx = tileCm * STAGE_PLOT_CM_TO_PX;
  return {
    x: tilePx / iw,
    y: tilePx / ih,
  };
}

/** @type {Map<string, Promise<HTMLImageElement|null>>} */
const imageCache = new Map();

function loadHtmlImage(src) {
  return new Promise((resolve) => {
    if (typeof Image === "undefined" || !src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Carga (cacheada) la imagen del preset. `none` → null.
 * @param {unknown} presetId
 * @returns {Promise<HTMLImageElement|null>}
 */
export function loadStageFloorImage(presetId) {
  const preset = getStageFloorPreset(presetId);
  if (!preset.src) return Promise.resolve(null);
  const key = preset.id;
  if (!imageCache.has(key)) {
    imageCache.set(key, loadHtmlImage(preset.src));
  }
  return imageCache.get(key);
}

/**
 * Preload de todos los presets con textura (opcional; Lienzo / export).
 * @returns {Promise<void>}
 */
export function preloadStageFloorImages() {
  return Promise.all(
    STAGE_PLOT_FLOOR_PRESETS.filter((p) => p.src).map((p) =>
      loadStageFloorImage(p.id),
    ),
  ).then(() => undefined);
}

/**
 * Dibuja la textura de piso tileada en un canvas 2D (export JPG / helper PDF).
 * Coord: rectángulo del escenario en px de destino (ox, oy, stageW, stageH).
 * `logicalW`/`logicalH` = tamaño lógico del lienzo (stage.width/height) para escala del tile.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Record<string, unknown>} stage
 * @param {number} ox
 * @param {number} oy
 * @param {number} stageW  ancho dibujado (px destino)
 * @param {number} stageH  alto dibujado
 * @param {number} logicalW
 * @param {number} logicalH
 * @param {HTMLImageElement|null} [image] imagen ya cargada; si falta, no dibuja
 */
export function drawStageFloorOnCanvas(
  ctx,
  stage,
  ox,
  oy,
  stageW,
  stageH,
  logicalW,
  logicalH,
  image,
) {
  if (!ctx || !image) return;
  const preset = getStageFloorPreset(stage?.floorPreset);
  if (!stageFloorPresetHasTexture(preset.id)) return;
  const opacity = normalizeStagePlotFloorOpacity(stage?.floorOpacity);
  if (!(opacity > 0)) return;

  const scale = stageFloorPatternScale(preset, {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  });
  // Escala del export: logical → destino
  const sx = stageW / Math.max(1, logicalW);
  const sy = stageH / Math.max(1, logicalH);
  const tileW = (image.naturalWidth || image.width) * scale.x * sx;
  const tileH = (image.naturalHeight || image.height) * scale.y * sy;
  if (!(tileW > 0) || !(tileH > 0)) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, stageW, stageH);
  ctx.clip();
  ctx.globalAlpha *= opacity;
  // createPattern con scale vía setTransform del pattern
  const pattern = ctx.createPattern(image, "repeat");
  if (pattern && typeof pattern.setTransform === "function") {
    const m = new DOMMatrix();
    m.translateSelf(ox, oy);
    m.scaleSelf(tileW / (image.naturalWidth || image.width), tileH / (image.naturalHeight || image.height));
    pattern.setTransform(m);
    ctx.fillStyle = pattern;
    ctx.fillRect(ox, oy, stageW, stageH);
  } else {
    // Fallback: tile manual
    for (let y = oy; y < oy + stageH; y += tileH) {
      for (let x = ox; x < ox + stageW; x += tileW) {
        ctx.drawImage(
          image,
          x,
          y,
          Math.min(tileW, ox + stageW - x),
          Math.min(tileH, oy + stageH - y),
        );
      }
    }
  }
  ctx.restore();
}
