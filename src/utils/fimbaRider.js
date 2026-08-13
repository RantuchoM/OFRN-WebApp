/**
 * Rider FIMBA: HTML rich-text por artista.
 * Vacío = null / whitespace / HTML sin texto visible ni imágenes (`<p></p>`, `<br>`, etc.).
 */

export const FIMBA_RIDER_BUCKET = "fimba-riders";

/** Host del proyecto linked (URLs públicas de Storage). */
export const FIMBA_RIDER_STORAGE_HOST = "muxrbuivopnawnxlcjxq.supabase.co";

const BLOCK_TAGS = /<\/(p|div|h[1-6]|li|blockquote|tr|pre)>/gi;

const IMG_WITH_SRC_RE = /<img\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>/i;

/**
 * Texto visible de un rider HTML (sin tags). No alcanza con trim del HTML crudo.
 * @param {unknown} html
 * @returns {string}
 */
export function stripFimbaRiderPlainText(html) {
  if (html == null) return "";
  const raw = String(html);
  if (!raw.trim()) return "";
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(BLOCK_TAGS, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hay al menos un <img src="..."> (cuenta como contenido aunque no haya texto).
 * @param {unknown} html
 * @returns {boolean}
 */
export function fimbaRiderHasImages(html) {
  if (html == null) return false;
  return IMG_WITH_SRC_RE.test(String(html));
}

/**
 * @param {unknown} html
 * @returns {boolean}
 */
export function isFimbaRiderEmpty(html) {
  if (html == null) return true;
  const s = typeof html === "string" ? html : String(html);
  if (!s.trim()) return true;
  if (fimbaRiderHasImages(s)) return false;
  return !stripFimbaRiderPlainText(s);
}

/**
 * Persistencia: HTML recortado o `null` si no hay texto visible ni imágenes.
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeFimbaRiderHtml(value) {
  if (value == null) return null;
  const html = String(value).trim();
  if (!html || isFimbaRiderEmpty(html)) return null;
  return html;
}

/**
 * src de <img> permitido: bucket público (o signed) `fimba-riders` en este proyecto.
 * @param {unknown} src
 * @returns {boolean}
 */
export function isAllowedFimbaRiderImageSrc(src) {
  const raw = String(src || "").trim();
  if (!raw) return false;
  if (/^(javascript|vbscript|data|blob):/i.test(raw)) return false;
  try {
    const url = new URL(raw, `https://${FIMBA_RIDER_STORAGE_HOST}`);
    if (url.protocol !== "https:") return false;
    if (url.hostname.toLowerCase() !== FIMBA_RIDER_STORAGE_HOST) return false;
    const path = url.pathname;
    return (
      path.includes(`/storage/v1/object/public/${FIMBA_RIDER_BUCKET}/`) ||
      path.includes(`/storage/v1/object/sign/${FIMBA_RIDER_BUCKET}/`)
    );
  } catch {
    return false;
  }
}

function escapeAttr(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sanitizado liviano para render / PDF (staff-only). Quita script/iframe y handlers.
 * Conserva <img> solo si src apunta al bucket fimba-riders.
 * @param {unknown} html
 * @returns {string}
 */
export function sanitizeFimbaRiderHtml(html) {
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
    const srcM = String(attrs).match(/\bsrc\s*=\s*(['"])([\s\S]*?)\1/i);
    if (!srcM) return "";
    const src = srcM[2].trim();
    if (!isAllowedFimbaRiderImageSrc(src)) return "";
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

/**
 * Escape de texto plano (nombres de artista en PDF).
 * @param {unknown} s
 * @returns {string}
 */
export function escapeFimbaHtmlText(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
