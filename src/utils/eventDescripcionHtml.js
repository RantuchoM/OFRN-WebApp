/**
 * HTML de `eventos.descripcion` / Detalle FIMBA (Quill).
 * Distinto de rider (`fimba-riders`) e internas (`eventos-internas`):
 * el pegado en Detalle suele embeber data:/https:/blob: sin bucket propio.
 */

const IMG_TAG_RE = /<img\b[^>]*>/gi;
const IMG_SRC_ATTR_RE = /\bsrc\s*=\s*(['"])([\s\S]*?)\1/i;

/** data:image seguro (sin SVG: puede llevar script). */
const DATA_IMAGE_RE =
  /^data:image\/(png|jpe?g|gif|webp)(;charset=[^;]+)?;base64,[a-z0-9+/=\s]+$/i;

/**
 * src de &lt;img&gt; permitido para Detalle / descripción de agenda.
 * Bloquea javascript/vbscript y data no-imagen (XSS).
 * @param {unknown} src
 * @returns {boolean}
 */
export function isAllowedEventDescripcionImageSrc(src) {
  const raw = String(src || "").trim();
  if (!raw) return false;
  if (/^(javascript|vbscript):/i.test(raw)) return false;

  if (/^data:/i.test(raw)) {
    return DATA_IMAGE_RE.test(raw.replace(/\s+/g, ""));
  }

  if (/^blob:/i.test(raw)) {
    // blob:https://… / blob:http://… / blob:null/… (pegar en algunos browsers)
    return /^blob:(https?:\/\/|null\/)/i.test(raw);
  }

  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Extrae src allowlisted de &lt;img&gt; (orden de aparición, sin duplicados).
 * @param {unknown} html
 * @returns {string[]}
 */
export function extractEventDescripcionImageSrcs(html) {
  const raw = String(html || "");
  if (!raw || !/<img\b/i.test(raw)) return [];
  const out = [];
  const seen = new Set();
  raw.replace(IMG_TAG_RE, (tag) => {
    const m = tag.match(IMG_SRC_ATTR_RE);
    if (!m) return "";
    const src = String(m[2] || "").trim();
    if (!isAllowedEventDescripcionImageSrc(src) || seen.has(src)) return "";
    seen.add(src);
    out.push(src);
    return "";
  });
  return out;
}

/**
 * @param {unknown} html
 * @returns {boolean}
 */
export function eventDescripcionHasImages(html) {
  return extractEventDescripcionImageSrcs(html).length > 0;
}

/**
 * Quita etiquetas &lt;img&gt; (lista compacta; las imágenes van al modal).
 * @param {unknown} html
 * @returns {string}
 */
export function stripHtmlImageTags(html) {
  return String(html || "").replace(IMG_TAG_RE, "");
}

function escapeAttr(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sanitizado liviano para preview de Detalle / descripción.
 * Conserva &lt;img&gt; solo si `keepImages` y el src pasa la allowlist.
 * @param {unknown} html
 * @param {{ keepImages?: boolean }} [opts]
 * @returns {string}
 */
export function sanitizeEventDescripcionHtml(html, opts = {}) {
  const keepImages = Boolean(opts.keepImages);
  let s = String(html || "");
  if (!s) return "";
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "");
  s = s.replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "");
  s = s.replace(/<embed[\s\S]*?>/gi, "");
  s = s.replace(/<form[\s\S]*?>[\s\S]*?<\/form>/gi, "");
  s = s.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
  s = s.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  s = s.replace(/javascript\s*:/gi, "");
  s = s.replace(/vbscript\s*:/gi, "");
  s = s.replace(/<img\b([^>]*)>/gi, (_full, attrs) => {
    if (!keepImages) return "";
    const srcM = String(attrs).match(IMG_SRC_ATTR_RE);
    if (!srcM) return "";
    const src = srcM[2].trim();
    if (!isAllowedEventDescripcionImageSrc(src)) return "";
    const altM = String(attrs).match(/\balt\s*=\s*(['"])([\s\S]*?)\1/i);
    const alt = altM ? altM[2] : "";
    const wM = String(attrs).match(/\bwidth\s*=\s*(['"]?)(\d+)\1/i);
    const hM = String(attrs).match(/\bheight\s*=\s*(['"]?)(\d+)\1/i);
    let out = `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"`;
    if (wM) out += ` width="${wM[2]}"`;
    if (hM) out += ` height="${hM[2]}"`;
    out += ">";
    return out;
  });
  return s;
}
