/**
 * Observaciones internas de eventos (staff): HTML + imágenes bucket `eventos-internas`.
 * Reusa vaciado/sanitizado del patrón rider FIMBA con allowlist de este bucket.
 */

import {
  fimbaRiderHasImages,
  isFimbaRiderEmpty,
  normalizeFimbaRiderHtml,
  stripFimbaRiderPlainText,
} from "./fimbaRider";

export const EVENTOS_INTERNAS_BUCKET = "eventos-internas";

/** Host del proyecto linked (URLs públicas de Storage). */
export const EVENTOS_INTERNAS_STORAGE_HOST = "muxrbuivopnawnxlcjxq.supabase.co";

export const isEventosInternasEmpty = isFimbaRiderEmpty;
export const stripEventosInternasPlainText = stripFimbaRiderPlainText;
export const eventosInternasHasImages = fimbaRiderHasImages;
export const normalizeEventosInternasHtml = normalizeFimbaRiderHtml;

/**
 * src de <img> permitido: bucket público (o signed) `eventos-internas`.
 * @param {unknown} src
 * @returns {boolean}
 */
export function isAllowedEventosInternasImageSrc(src) {
  const raw = String(src || "").trim();
  if (!raw) return false;
  if (/^(javascript|vbscript|data|blob):/i.test(raw)) return false;
  try {
    const url = new URL(raw, `https://${EVENTOS_INTERNAS_STORAGE_HOST}`);
    if (url.protocol !== "https:") return false;
    if (url.hostname.toLowerCase() !== EVENTOS_INTERNAS_STORAGE_HOST) return false;
    const path = url.pathname;
    return (
      path.includes(`/storage/v1/object/public/${EVENTOS_INTERNAS_BUCKET}/`) ||
      path.includes(`/storage/v1/object/sign/${EVENTOS_INTERNAS_BUCKET}/`)
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
 * Sanitizado liviano para render staff. Conserva <img> solo del bucket eventos-internas.
 * @param {unknown} html
 * @returns {string}
 */
export function sanitizeEventosInternasHtml(html) {
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
    if (!isAllowedEventosInternasImageSrc(src)) return "";
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
 * Clave de path Storage: id numérico del evento o draft client-side.
 * @param {unknown} eventoId
 * @returns {string|null}
 */
export function normalizeEventosInternasStorageKey(eventoId) {
  if (eventoId == null || eventoId === "") return null;
  const s = String(eventoId).trim();
  if (!s) return null;
  if (/^draft-[a-z0-9-]+$/i.test(s)) return s;
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) return String(Math.trunc(n));
  return null;
}
