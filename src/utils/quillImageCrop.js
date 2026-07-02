/** Recorte rectangular normalizado (0–1) sobre la imagen original. */
export const FULL_CROP = { x: 0, y: 0, w: 1, h: 1 };

export const CROP_STRIP_PRESETS = [
  { id: "full", label: "Imagen completa", crop: FULL_CROP },
  { id: "strip-center", label: "Franja central", crop: { x: 0, y: 0.35, w: 1, h: 0.3 } },
  { id: "strip-top", label: "Franja superior", crop: { x: 0, y: 0, w: 1, h: 0.35 } },
  { id: "strip-bottom", label: "Franja inferior", crop: { x: 0, y: 0.65, w: 1, h: 0.35 } },
];

const MIN_CROP_DIM = 0.05;

export function clampCrop(crop) {
  const w = Math.max(MIN_CROP_DIM, Math.min(1, Number(crop.w) || 1));
  const h = Math.max(MIN_CROP_DIM, Math.min(1, Number(crop.h) || 1));
  const x = Math.max(0, Math.min(1 - w, Number(crop.x) || 0));
  const y = Math.max(0, Math.min(1 - h, Number(crop.y) || 0));
  return { x, y, w, h };
}

export function serializeCrop(crop) {
  const c = clampCrop(crop);
  return [c.x, c.y, c.w, c.h].map((n) => Number(n.toFixed(4))).join(",");
}

export function parseCropAttr(raw) {
  if (!raw || typeof raw !== "string") return null;
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return clampCrop({ x: parts[0], y: parts[1], w: parts[2], h: parts[3] });
}

export function isFullCrop(crop) {
  if (!crop) return true;
  const c = clampCrop(crop);
  return c.x <= 0.001 && c.y <= 0.001 && c.w >= 0.999 && c.h >= 0.999;
}

export function roundAspect(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.round(n * 10000) / 10000;
}

export function buildCropWrapperInlineStyle(crop, imgAspect = 1) {
  const c = clampCrop(crop);
  const aspect = roundAspect(imgAspect) || 1;
  return [
    "display:block",
    "overflow:hidden",
    "position:relative",
    "width:100%",
    `aspect-ratio:${c.w * aspect} / ${c.h}`,
    "margin:0.5rem 0",
    "border-radius:0.5rem",
    "border:1px solid rgb(226 232 240)",
  ].join(";");
}

export function buildCropImgInlineStyle(crop) {
  const c = clampCrop(crop);
  return [
    "position:absolute",
    `width:${(100 / c.w).toFixed(4)}%`,
    "height:auto",
    `left:${((-c.x / c.w) * 100).toFixed(4)}%`,
    `top:${((-c.y / c.h) * 100).toFixed(4)}%`,
    "max-width:none",
    "margin:0",
    "border:none",
    "display:block",
  ].join(";");
}

export function applyCropDomPresentation(wrapper) {
  if (!wrapper) return;
  const crop = parseCropAttr(wrapper.getAttribute("data-crop"));
  if (!crop || isFullCrop(crop)) return;
  const aspect = roundAspect(parseFloat(wrapper.getAttribute("data-img-aspect"))) || 1;
  wrapper.style.cssText = buildCropWrapperInlineStyle(crop, aspect);
  const img = wrapper.querySelector("img");
  if (img) img.style.cssText = buildCropImgInlineStyle(crop);
}

const CROP_WRAP_RE =
  /<(?:div|span)\b([^>]*\bclass="[^"]*\bql-image-crop\b[^"]*"[^>]*)>(\s*<img\b[^>]*>)\s*<\/(?:div|span)>/gi;

function readAttr(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
  return m?.[1] ?? "";
}

function upsertStyle(attrs, styleValue) {
  const re = /\bstyle="([^"]*)"/i;
  if (re.test(attrs)) return attrs.replace(re, `style="${styleValue}"`);
  return `${attrs} style="${styleValue}"`;
}

/** Envuelve <img> sueltas en span.ql-image-embed para compatibilidad con el blot de Quill. */
export function wrapBareQuillImages(html) {
  if (html == null || typeof html !== "string") return html;
  return html.replace(/<img\b([^>]*?)\/?>/gi, (full, attrs, offset, whole) => {
    const before = whole.slice(0, offset);
    if (
      /<(?:div|span)[^>]*class="[^"]*ql-image-(?:embed|crop)[^"]*"[^>]*>\s*$/i.test(before)
    ) {
      return full;
    }
    return `<span class="ql-image-embed"><img${attrs}></span>`;
  });
}

/** Asegura estilos inline de recorte en HTML persistido (vista pública sin JS). */
export function enhanceQuillHtmlCropStyles(html) {
  if (html == null || typeof html !== "string") return html;
  return html.replace(CROP_WRAP_RE, (full, wrapAttrs, imgTag) => {
    const crop = parseCropAttr(readAttr(wrapAttrs, "data-crop"));
    if (!crop || isFullCrop(crop)) return full;
    const aspect = roundAspect(parseFloat(readAttr(wrapAttrs, "data-img-aspect"))) || 1;
    const wrapStyle = buildCropWrapperInlineStyle(crop, aspect);
    const imgStyle = buildCropImgInlineStyle(crop);
    const newWrapAttrs = upsertStyle(wrapAttrs, wrapStyle);
    const newImgTag = upsertStyle(imgTag, imgStyle);
    const tag = /^<div/i.test(full) ? "div" : "span";
    return `<${tag}${newWrapAttrs}>${newImgTag}</${tag}>`;
  });
}
