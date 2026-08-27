/**
 * Assets SVG: game-icons.net (CC BY 3.0) + FreeSVG/OpenClipart CC0
 * (violin/viola/cello/bass/guitar/bandoneon/flute con colores de origen) +
 * oboe Gerald_G (silueta currentColor).
 * Atribución: public/stage-plot/ATTRIBUTION.md
 */

import { STAGE_PLOT_SILHOUETTE_VIEWBOX } from "./stagePlotSilhouettes";

/** Keep in sync with STAGE_PLOT_CM_TO_PX (avoid circular import with stagePlotConstants). */
const STAGE_PLOT_CM_TO_PX_LOCAL = 4;

/** Archivo en /stage-plot/icons/ (game-icons CC BY 3.0; vn/va/vc/bass = FreeSVG CC0; flute/oboe = Gerald_G) */
export const STAGE_PLOT_ICON_FILES = {
  violin: "violin.svg",
  viola: "viola.svg",
  cello: "cello.svg",
  bass: "bass.svg",
  harp: "harp.svg",
  guitar: "guitar.svg",
  bandoneon: "bandoneon.svg",
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

/** Overrides desde `instrumentos.svg_icon` (tipo catálogo → markup). */
let dbSvgByType = new Map();
let dbIconsEnsurePromise = null;

/**
 * Registra SVGs de DB. Preferidos sobre `public/stage-plot/icons/`.
 * @param {Map<string, string>|Record<string, string>|null|undefined} map
 */
export function setStagePlotDbIconOverrides(map) {
  if (map instanceof Map) {
    dbSvgByType = new Map(map);
  } else if (map && typeof map === "object") {
    dbSvgByType = new Map(Object.entries(map));
  } else {
    dbSvgByType = new Map();
  }
  imageCache.clear();
}

/** Limpia cache de imágenes y fuerza re-fetch de overrides en el próximo ensure. */
export function clearStagePlotDbIconCache() {
  imageCache.clear();
  dbIconsEnsurePromise = null;
}

/** @param {string} type */
export function getStagePlotDbIconSvg(type) {
  if (!type) return null;
  return dbSvgByType.get(type) || null;
}

/**
 * Carga lazy overrides desde instrumentos (una vez por sesión / hasta clear).
 * @returns {Promise<void>}
 */
export async function ensureStagePlotDbIconsLoaded() {
  if (dbIconsEnsurePromise) return dbIconsEnsurePromise;
  dbIconsEnsurePromise = (async () => {
    try {
      const { loadAndApplyStagePlotInstrumentIcons } = await import(
        "../services/stagePlotInstrumentIconsService.js"
      );
      await loadAndApplyStagePlotInstrumentIcons();
    } catch (err) {
      console.warn("[stagePlotIconAssets] DB icons:", err);
      dbSvgByType = new Map();
    }
  })();
  return dbIconsEnsurePromise;
}

/**
 * @param {string} type
 * @returns {string|null} URL pública del SVG estático (sin DB)
 */
export function getStagePlotIconUrl(type) {
  const file = STAGE_PLOT_ICON_FILES[type];
  if (!file) return null;
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}stage-plot/icons/${file}`;
}

/**
 * Markup SVG: DB → archivo estático (texto).
 * @param {string} type
 * @returns {Promise<string|null>}
 */
export async function resolveStagePlotIconSvgMarkup(type) {
  if (!type || typeof fetch === "undefined") return null;
  await ensureStagePlotDbIconsLoaded();
  const fromDb = getStagePlotDbIconSvg(type);
  if (fromDb) return fromDb;
  const url = getStagePlotIconUrl(type);
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.text();
}

/**
 * True if markup is intentionally theme-tintable (silhouettes / game-icons).
 * Multi-color uploads with explicit hex/rgb fills return false.
 * @param {string} svg
 */
export function stagePlotSvgUsesThemeTint(svg) {
  return /currentColor/i.test(String(svg || ""));
}

/**
 * Prepara markup para raster: solo sustituye `currentColor` (siluetas).
 * No reescribe fills/strokes hex del autor. Si no hay ningún paint y es
 * path-only, inyecta fill del tema (fallback silueta mínima).
 * @param {string} svg
 * @param {string} color
 */
export function prepareStagePlotSvgMarkupForRaster(svg, color = "#1e293b") {
  let out = String(svg || "");
  if (!out) return out;
  if (/currentColor/i.test(out)) {
    return out.replace(/currentColor/gi, color);
  }
  // Path-only silhouette sin paint attrs → tint tema
  if (!/\bfill\s*=/i.test(out) && !/\bstroke\s*=/i.test(out)) {
    out = out.replace(/<path\s/g, `<path fill="${color}" `);
  }
  return out;
}

/**
 * Rasteriza markup SVG → HTMLImageElement (colores de origen preservados).
 * @param {string} type
 * @param {string} svg
 * @param {string} color
 */
async function svgMarkupToImage(type, svg, color) {
  const prepared = prepareStagePlotSvgMarkupForRaster(svg, color);
  const blob = new Blob([prepared], { type: "image/svg+xml;charset=utf-8" });
  const objUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error(`No se pudo decodificar ${type}`));
      image.src = objUrl;
    });
  } finally {
    URL.revokeObjectURL(objUrl);
  }
}

/**
 * Carga SVG (DB o estático) → HTMLImageElement (cacheado).
 * `color` solo aplica si el markup usa `currentColor` (silueta mono).
 * @param {string} type
 * @param {string} color
 * @returns {Promise<HTMLImageElement|null>}
 */
export async function loadStagePlotIconImage(type, color = "#1e293b") {
  if (!type || typeof fetch === "undefined") return null;
  await ensureStagePlotDbIconsLoaded();
  const dbSvg = getStagePlotDbIconSvg(type);
  const url = dbSvg ? null : getStagePlotIconUrl(type);
  if (!dbSvg && !url) return null;

  const sourceKey = dbSvg ? `db:${dbSvg.length}:${dbSvg.slice(0, 48)}` : url;

  const run = async (markup) => {
    const tintKey = stagePlotSvgUsesThemeTint(markup) ? color : "author";
    const key = `${type}|${tintKey}|${sourceKey}`;
    if (imageCache.has(key)) return imageCache.get(key);
    const p = svgMarkupToImage(type, markup, color).catch((err) => {
      console.warn(err);
      imageCache.delete(key);
      return null;
    });
    imageCache.set(key, p);
    return p;
  };

  if (dbSvg) return run(dbSvg);

  const fetchKey = `${type}|fetch|${sourceKey}`;
  let fetchPromise = imageCache.get(fetchKey);
  if (!fetchPromise) {
    fetchPromise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Icon ${type}: ${res.status}`);
        return res.text();
      })
      .catch((err) => {
        console.warn(err);
        imageCache.delete(fetchKey);
        return null;
      });
    imageCache.set(fetchKey, fetchPromise);
  }
  const markup = await fetchPromise;
  if (!markup) return null;
  return run(markup);
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

/**
 * URL estática del icono (sin DB). Preferir `resolveStagePlotIconSvgMarkup` /
 * `loadStagePlotIconImage` cuando hace falta override de instrumentos.
 * @param {string} type
 */
export function stagePlotIconImgSrc(type) {
  return getStagePlotIconUrl(type);
}
