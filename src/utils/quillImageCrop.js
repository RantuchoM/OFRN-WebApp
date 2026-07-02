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
  /<(?:div|span)\b([^>]*\bclass="[^"]*\bql-image-(?:crop|embed)\b[^"]*"[^>]*)>(\s*<img\b[^>]*>)\s*<\/(?:div|span)>/gi;

const IMG_WITH_CROP_RE = /<img\b([^>]*\bdata-crop="([^"]+)"[^>]*)>/gi;

function readAttr(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
  return m?.[1] ?? "";
}

function upsertAttrOnFragment(attrs, name, value) {
  const re = new RegExp(`\\b${name}="[^"]*"`, "i");
  const chunk = ` ${name}="${value}"`;
  if (re.test(attrs)) return attrs.replace(re, ` ${name}="${value}"`);
  return `${attrs}${chunk}`;
}

function stripPresentationAttrs(attrs) {
  return attrs.replace(/\s*style="[^"]*"/gi, "").replace(/\s*class="[^"]*"/gi, "");
}

function buildStorageImgTag(wrapAttrs, imgTag) {
  const crop =
    parseCropAttr(readAttr(wrapAttrs, "data-crop")) || parseCropAttr(readAttr(imgTag, "data-crop"));
  const aspect = readAttr(wrapAttrs, "data-img-aspect") || readAttr(imgTag, "data-img-aspect");
  const innerMatch = imgTag.match(/<img\b([^>]*)>/i);
  let inner = innerMatch?.[1] || imgTag;
  inner = stripPresentationAttrs(inner);

  if (crop && !isFullCrop(crop)) {
    inner = upsertAttrOnFragment(inner, "data-crop", serializeCrop(crop));
    if (aspect) inner = upsertAttrOnFragment(inner, "data-img-aspect", aspect);
  } else {
    inner = inner.replace(/\s*data-crop="[^"]*"/gi, "").replace(/\s*data-img-aspect="[^"]*"/gi, "");
  }

  return `<img${inner}>`;
}

/** Quita envoltorios de presentación y deja el recorte en atributos del <img> (formato persistido). */
export function unwrapQuillCropWrappersForStorage(html) {
  if (html == null || typeof html !== "string") return html;
  return html.replace(CROP_WRAP_RE, (full, wrapAttrs, imgTag) => buildStorageImgTag(wrapAttrs, imgTag));
}

function buildCropWrapperHtml(imgAttrs, cropRaw) {
  const crop = parseCropAttr(cropRaw);
  if (!crop || isFullCrop(crop)) return `<img${imgAttrs}>`;

  const aspect = roundAspect(parseFloat(readAttr(imgAttrs, "data-img-aspect"))) || 1;
  const wrapStyle = buildCropWrapperInlineStyle(crop, aspect);
  const imgStyle = buildCropImgInlineStyle(crop);
  const cleanAttrs = stripPresentationAttrs(imgAttrs);
  const cropAttr = upsertAttrOnFragment(cleanAttrs, "data-crop", cropRaw);
  const aspectAttr = aspect
    ? upsertAttrOnFragment(cropAttr, "data-img-aspect", String(aspect))
    : cropAttr;

  return `<span class="ql-image-embed ql-image-crop" data-crop="${cropRaw}" data-img-aspect="${aspect}" style="${wrapStyle}"><img${aspectAttr} style="${imgStyle}"></span>`;
}

/** Envuelve <img data-crop> para mostrar el recorte en editor y vista pública. */
export function wrapCroppedImagesForDisplay(html) {
  if (html == null || typeof html !== "string") return html;
  return html.replace(IMG_WITH_CROP_RE, (full, attrs, cropRaw, offset, whole) => {
    const before = whole.slice(0, offset);
    if (/<(?:div|span)[^>]*class="[^"]*ql-image-(?:embed|crop)[^"]*"[^>]*>\s*$/i.test(before)) {
      return full;
    }
    return buildCropWrapperHtml(attrs, cropRaw);
  });
}

/** Refresca estilos inline en envoltorios de recorte ya existentes. */
export function enhanceQuillHtmlCropStyles(html) {
  if (html == null || typeof html !== "string") return html;
  return html.replace(CROP_WRAP_RE, (full, wrapAttrs, imgTag) => {
    const crop =
      parseCropAttr(readAttr(wrapAttrs, "data-crop")) || parseCropAttr(readAttr(imgTag, "data-crop"));
    if (!crop || isFullCrop(crop)) return full;
    const cropRaw = serializeCrop(crop);
    const innerMatch = imgTag.match(/<img\b([^>]*)>/i);
    const imgAttrs = innerMatch?.[1] || "";
    return buildCropWrapperHtml(imgAttrs, cropRaw);
  });
}
