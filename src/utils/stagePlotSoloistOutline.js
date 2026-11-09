/**
 * Contorno dorado de solista siguiendo píxeles opacos (no AABB).
 * Técnica: dilatar la máscara alpha con offsets, teñir y (opcional) restar el
 * interior → anillo alrededor de la silueta. Cache por src/tamaño/stroke.
 */

import { STAGE_PLOT_SOLOIST_STROKE } from "./stagePlotConstants";
import {
  fitContainInBox,
  getStagePlotImageNaturalSize,
} from "./stagePlotIconAssets";

/** Grosor del outline ≈ ratio × min(lado), con piso en px lógicos. */
export const STAGE_PLOT_SOLOIST_OUTLINE_RATIO = 0.045;
export const STAGE_PLOT_SOLOIST_OUTLINE_MIN_PX = 2.5;

/** @type {Map<string, HTMLCanvasElement|null>} */
const outlineCache = new Map();
const OUTLINE_CACHE_MAX = 64;

/**
 * @param {number} drawW
 * @param {number} drawH
 */
export function stagePlotSoloistOutlinePx(drawW, drawH) {
  const m = Math.min(Number(drawW) || 0, Number(drawH) || 0);
  if (m <= 0) return STAGE_PLOT_SOLOIST_OUTLINE_MIN_PX;
  return Math.max(
    STAGE_PLOT_SOLOIST_OUTLINE_MIN_PX,
    m * STAGE_PLOT_SOLOIST_OUTLINE_RATIO,
  );
}

/**
 * @param {number} drawW
 * @param {number} drawH
 * @param {number} strokePx
 */
export function stagePlotSoloistOutlineMetrics(drawW, drawH, strokePx) {
  const pad = Math.ceil(Math.max(0, Number(strokePx) || 0)) + 1;
  const w = Math.max(1, Math.ceil(Number(drawW) || 0));
  const h = Math.max(1, Math.ceil(Number(drawH) || 0));
  return {
    pad,
    outW: w + pad * 2,
    outH: h + pad * 2,
    contentW: w,
    contentH: h,
  };
}

/**
 * Clave estable para HTMLImageElement / canvas fuente.
 * @param {CanvasImageSource|null|undefined} source
 */
function sourceCacheKey(source) {
  if (!source) return "null";
  if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
    return `img:${source.src || ""}:${source.naturalWidth}x${source.naturalHeight}`;
  }
  if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) {
    return `cv:${source.width}x${source.height}`;
  }
  const { w, h } = getStagePlotImageNaturalSize(source);
  return `src:${w}x${h}`;
}

/**
 * Ángulos para muestrear el anillo (densidad suficiente sin ser costoso).
 * @param {number} strokePx
 * @returns {Array<[number, number]>}
 */
function outlineOffsets(strokePx) {
  const r = Math.max(1, Number(strokePx) || 1);
  /** @type {Array<[number, number]>} */
  const pts = [];
  // Anillos a 50% y 100% del radio para relleno continuo del stroke.
  for (const frac of [0.5, 1]) {
    const rad = r * frac;
    const steps = Math.max(8, Math.ceil((Math.PI * 2 * rad) / 1.25));
    for (let i = 0; i < steps; i += 1) {
      const a = (i / steps) * Math.PI * 2;
      pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
    }
  }
  return pts;
}

/**
 * Genera un canvas con el anillo dorado alrededor de la silueta opaca.
 * El contenido útil queda centrado con padding = stroke.
 *
 * @param {CanvasImageSource} source
 * @param {{
 *   drawW: number,
 *   drawH: number,
 *   strokePx?: number,
 *   color?: string,
 *   punchInterior?: boolean,
 * }} opts
 * @returns {HTMLCanvasElement|null}
 */
export function buildSoloistOutlineCanvas(source, opts) {
  if (typeof document === "undefined" || !source) return null;
  const drawW = Math.max(1, Math.round(Number(opts?.drawW) || 0));
  const drawH = Math.max(1, Math.round(Number(opts?.drawH) || 0));
  if (!drawW || !drawH) return null;
  const strokePx = Math.max(
    1,
    Number(opts?.strokePx) > 0
      ? Number(opts.strokePx)
      : stagePlotSoloistOutlinePx(drawW, drawH),
  );
  const color = opts?.color || STAGE_PLOT_SOLOIST_STROKE;
  const punchInterior = opts?.punchInterior !== false;
  const { pad, outW, outH } = stagePlotSoloistOutlineMetrics(
    drawW,
    drawH,
    strokePx,
  );

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const offsets = outlineOffsets(strokePx);
  for (const [dx, dy] of offsets) {
    ctx.drawImage(source, pad + dx, pad + dy, drawW, drawH);
  }
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, outW, outH);

  if (punchInterior) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(source, pad, pad, drawW, drawH);
  }
  ctx.globalCompositeOperation = "source-over";
  return canvas;
}

/**
 * Outline cacheado; no recalcula en cada frame de drag.
 *
 * @param {CanvasImageSource|null|undefined} source
 * @param {{
 *   drawW: number,
 *   drawH: number,
 *   strokePx?: number,
 *   color?: string,
 *   punchInterior?: boolean,
 * }} opts
 * @returns {HTMLCanvasElement|null}
 */
export function getSoloistOutlineCanvas(source, opts) {
  if (!source) return null;
  const drawW = Math.max(1, Math.round(Number(opts?.drawW) || 0));
  const drawH = Math.max(1, Math.round(Number(opts?.drawH) || 0));
  const strokePx = Math.max(
    1,
    Math.round(
      (Number(opts?.strokePx) > 0
        ? Number(opts.strokePx)
        : stagePlotSoloistOutlinePx(drawW, drawH)) * 10,
    ) / 10,
  );
  const color = opts?.color || STAGE_PLOT_SOLOIST_STROKE;
  const punch = opts?.punchInterior !== false ? 1 : 0;
  const key = `${sourceCacheKey(source)}|${drawW}x${drawH}|${strokePx}|${color}|p${punch}`;
  if (outlineCache.has(key)) return outlineCache.get(key) ?? null;

  let canvas = null;
  try {
    canvas = buildSoloistOutlineCanvas(source, {
      drawW,
      drawH,
      strokePx,
      color,
      punchInterior: punch === 1,
    });
  } catch (err) {
    console.warn("[stagePlotSoloistOutline] build failed:", err);
    canvas = null;
  }

  if (outlineCache.size >= OUTLINE_CACHE_MAX) {
    const first = outlineCache.keys().next().value;
    if (first != null) outlineCache.delete(first);
  }
  outlineCache.set(key, canvas);
  return canvas;
}

/** Limpia cache (p. ej. al cambiar assets de catálogo). */
export function clearSoloistOutlineCache() {
  outlineCache.clear();
}

/**
 * Dibuja el anillo dorado en un canvas 2D (PDF/JPG), respetando rotación y flipX.
 * Centrado en (cx, cy); `boxW`/`boxH` = caja contain del icono (como el ítem).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource|null|undefined} source
 * @param {number} cx
 * @param {number} cy
 * @param {number} boxW
 * @param {number} boxH
 * @param {number} [rotationDeg=0]
 * @param {boolean} [flipX=false]
 * @param {string} [color]
 */
export function drawSoloistOutlineOnCanvas(
  ctx,
  source,
  cx,
  cy,
  boxW,
  boxH,
  rotationDeg = 0,
  flipX = false,
  color = STAGE_PLOT_SOLOIST_STROKE,
) {
  if (!ctx || !source) return;
  const { w: iw, h: ih } = getStagePlotImageNaturalSize(source);
  if (!iw || !ih) return;
  const fit = fitContainInBox(boxW, boxH, iw, ih);
  if (!fit.drawW || !fit.drawH) return;
  const strokePx = stagePlotSoloistOutlinePx(fit.drawW, fit.drawH);
  const outline = getSoloistOutlineCanvas(source, {
    drawW: fit.drawW,
    drawH: fit.drawH,
    strokePx,
    color,
    punchInterior: true,
  });
  if (!outline) return;
  const { pad, outW, outH } = stagePlotSoloistOutlineMetrics(
    fit.drawW,
    fit.drawH,
    strokePx,
  );
  void pad;
  ctx.save();
  ctx.translate(cx, cy);
  if (rotationDeg) ctx.rotate((rotationDeg * Math.PI) / 180);
  if (flipX) ctx.scale(-1, 1);
  ctx.drawImage(outline, -outW / 2, -outH / 2, outW, outH);
  ctx.restore();
}
