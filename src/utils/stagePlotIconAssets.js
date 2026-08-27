/**
 * Assets SVG: game-icons.net (CC BY 3.0) + FreeSVG/OpenClipart CC0 (viola/cello/bass) +
 * flute/oboe Gerald_G (Openclipart PD).
 * Atribución: public/stage-plot/ATTRIBUTION.md
 */

import { STAGE_PLOT_SILHOUETTE_VIEWBOX } from "./stagePlotSilhouettes";

/** Keep in sync with STAGE_PLOT_CM_TO_PX (avoid circular import with stagePlotConstants). */
const STAGE_PLOT_CM_TO_PX_LOCAL = 4;

/** Archivo en /stage-plot/icons/ (game-icons CC BY 3.0; strings = FreeSVG CC0; flute/oboe = Gerald_G) */
export const STAGE_PLOT_ICON_FILES = {
  violin: "violin.svg",
  viola: "viola.svg",
  cello: "cello.svg",
  bass: "bass.svg",
  harp: "harp.svg",
  flute: "flute.svg",
  oboe: "oboe.svg",
  clarinet: "clarinet.svg",
  bassoon: "bassoon.svg",
  horn: "french-horn.svg",
  trumpet: "trumpet.svg",
  trombone: "trombone.svg",
  tuba: "tuba.svg",
  // Percusión: sin timpani/cymbals/snare exactos en el pack — closest distinct icons
  timpani: "drum-kit.svg",
  perc: "drum.svg",
  bass_drum: "djembe.svg",
  snare: "drum.svg",
  cymbals: "gong.svg",
  xylophone: "xylophone.svg",
  tubular_bells: "ringing-bell.svg",
  piano: "grand-piano.svg",
  celesta: "keyboard.svg",
  chair: "desk.svg",
  // music_stand: sin equivalente game-icons — silhouette fallback (upright)
  conductor: "person.svg",
  riser: "stairs.svg",
  mic: "microphone.svg",
  speaker: "speaker.svg",
  wedge: "speaker.svg",
  // text: sin icono SVG — solo Konva Text / label en paleta
};

const imageCache = new Map();

/**
 * @param {string} type
 * @returns {string|null} URL pública del SVG
 */
export function getStagePlotIconUrl(type) {
  const file = STAGE_PLOT_ICON_FILES[type];
  if (!file) return null;
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}stage-plot/icons/${file}`;
}

/**
 * Carga SVG, pinta con `color`, devuelve HTMLImageElement (cacheado).
 * @param {string} type
 * @param {string} color
 * @returns {Promise<HTMLImageElement|null>}
 */
export async function loadStagePlotIconImage(type, color = "#1e293b") {
  const url = getStagePlotIconUrl(type);
  if (!url || typeof fetch === "undefined") return null;
  const key = `${type}|${color}|${url}`;
  if (imageCache.has(key)) return imageCache.get(key);

  const promise = (async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Icon ${type}: ${res.status}`);
    let svg = await res.text();
    svg = svg.replace(/currentColor/gi, color);
    // Asegurar fill si faltara
    if (!/fill=/.test(svg)) {
      svg = svg.replace(/<path\s/g, `<path fill="${color}" `);
    }
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const objUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () =>
          reject(new Error(`No se pudo decodificar ${type}`));
        image.src = objUrl;
      });
      return img;
    } finally {
      URL.revokeObjectURL(objUrl);
    }
  })().catch((err) => {
    console.warn(err);
    imageCache.delete(key);
    return null;
  });

  imageCache.set(key, promise);
  return promise;
}

/** @param {CanvasImageSource|null|undefined} htmlImage */
export function getStagePlotImageNaturalSize(htmlImage) {
  if (!htmlImage) return { w: 0, h: 0 };
  const w =
    "naturalWidth" in htmlImage && htmlImage.naturalWidth
      ? htmlImage.naturalWidth
      : "width" in htmlImage
        ? htmlImage.width
        : 0;
  const h =
    "naturalHeight" in htmlImage && htmlImage.naturalHeight
      ? htmlImage.naturalHeight
      : "height" in htmlImage
        ? htmlImage.height
        : 0;
  return { w: w || 0, h: h || 0 };
}

/** Escala contenido con aspect ratio fijo dentro de una caja (object-fit: contain). */
export function fitContainInBox(boxW, boxH, contentW, contentH) {
  const bw = Number(boxW) || 0;
  const bh = Number(boxH) || 0;
  const cw = Number(contentW) || 0;
  const ch = Number(contentH) || 0;
  if (!bw || !bh || !cw || !ch) {
    return { drawW: bw, drawH: bh, scale: 1 };
  }
  const scale = Math.min(bw / cw, bh / ch);
  return {
    drawW: cw * scale,
    drawH: ch * scale,
    scale,
  };
}

/**
 * Bounds visuales del ítem en unidades del lienzo (antes de `item.scale`).
 * @param {number} boxW
 * @param {number} boxH
 * @param {"catalog"|"icon"|"silhouette"} mode
 * @param {{ contentW?: number, contentH?: number }} [options]
 */
export function getStagePlotItemVisualBounds(boxW, boxH, mode, options = {}) {
  const w = Number(boxW) || 0;
  const h = Number(boxH) || 0;
  if (mode === "icon") {
    const { contentW, contentH } = options;
    if (contentW && contentH) {
      const fit = fitContainInBox(w, h, contentW, contentH);
      return { drawW: fit.drawW, drawH: fit.drawH };
    }
  }
  if (mode === "silhouette") {
    const vb = STAGE_PLOT_SILHOUETTE_VIEWBOX;
    const silScale = Math.min(w / vb, h / vb);
    const draw = vb * silScale;
    return { drawW: draw, drawH: draw };
  }
  return { drawW: w, drawH: h };
}

/** @param {number} cm */
function roundStagePlotCm(cm) {
  if (!Number.isFinite(cm) || cm <= 0) return null;
  if (cm >= 10) return Math.round(cm);
  if (cm >= 1) return Math.round(cm * 10) / 10;
  return Math.round(cm * 100) / 100;
}

/**
 * Tamaño real en escena para tooltip/PDF.
 * @param {number} boundsW
 * @param {number} boundsH
 * @param {number} [scale=1]
 * @returns {string|null}
 */
export function formatStagePlotItemRealSize(boundsW, boundsH, scale = 1) {
  const s = Number(scale) > 0 ? Number(scale) : 1;
  const wCm = ((Number(boundsW) || 0) * s) / STAGE_PLOT_CM_TO_PX_LOCAL;
  const hCm = ((Number(boundsH) || 0) * s) / STAGE_PLOT_CM_TO_PX_LOCAL;
  const wR = roundStagePlotCm(wCm);
  const hR = roundStagePlotCm(hCm);
  if (wR == null || hR == null) return null;

  const maxDim = Math.max(wR, hR);
  const minDim = Math.min(wR, hR);
  const squareish = maxDim <= 0 || minDim / maxDim >= 0.85;

  if (squareish) {
    return `≈ ${maxDim} cm`;
  }
  return `${wR} × ${hR} cm`;
}

export function stagePlotIconImgSrc(type) {
  return getStagePlotIconUrl(type);
}
