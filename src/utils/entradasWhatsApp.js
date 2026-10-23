/**
 * Teléfono → wa.me (Argentina por defecto si no hay código de país).
 * Formato API: https://wa.me/<digits>?text=<urlencoded>
 */

export const ENTRADAS_WHATSAPP_MENSAJE_ENTRADAS =
  "Hola {nombre}, te enviamos las entradas que solicitaste. ¡Que disfrutes!";

export const ENTRADAS_WHATSAPP_MENSAJE_ENTRADAS_CON_PDF =
  "Hola {nombre}, te enviamos las entradas que solicitaste. ¡Que disfrutes!\n\nDescargá el PDF acá (no hace falta iniciar sesión):\n{pdfUrl}";

const ENTRADAS_PUBLIC_APP_BASE = "https://ofrn-web-app.vercel.app";

/**
 * @param {string} phone
 * @returns {string} solo dígitos listos para wa.me, o ""
 */
export function normalizePhoneForWhatsApp(phone) {
  if (phone == null) return "";
  let clean = String(phone).replace(/\D/g, "");
  if (!clean) return "";

  if (clean.startsWith("00")) clean = clean.slice(2);

  if (clean.startsWith("54")) {
    if (!clean.startsWith("549") && clean.length >= 12) {
      clean = `549${clean.slice(2)}`;
    }
    return clean.length >= 12 ? clean : "";
  }

  if (clean.startsWith("0")) clean = clean.slice(1);

  if (clean.length === 10) return `549${clean}`;
  if (clean.length >= 8 && clean.length <= 11) return `549${clean}`;

  return clean.length >= 12 ? clean : "";
}

/**
 * URL en la webapp: /entradas/pdf?t=… (mismo PDF que en la app, sin login).
 * @param {string} pdfShareToken
 */
export function buildEntradasPdfShareUrl(pdfShareToken) {
  const t = String(pdfShareToken || "").trim().toLowerCase();
  if (!/^[a-f0-9]{32,96}$/.test(t)) return null;
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : ENTRADAS_PUBLIC_APP_BASE;
  return `${origin.replace(/\/$/, "")}/entradas/pdf?t=${encodeURIComponent(t)}`;
}

/**
 * @param {string} template
 * @param {{ nombre?: string, pdfUrl?: string }} vars
 */
export function fillEntradasWhatsAppMensaje(template, { nombre, pdfUrl } = {}) {
  const name = String(nombre || "").trim() || "hola";
  let out = String(template || ENTRADAS_WHATSAPP_MENSAJE_ENTRADAS).replace(/\{nombre\}/g, name);
  if (pdfUrl) {
    out = out.replace(/\{pdfUrl\}/g, String(pdfUrl));
  } else {
    out = out.replace(/\n*Descargá el PDF[\s\S]*$/i, "").replace(/\{pdfUrl\}/g, "").trim();
  }
  return out;
}

/**
 * @param {string} phone
 * @param {{ nombre?: string, message?: string, withText?: boolean, pdfUrl?: string }} [opts]
 * @returns {string|null}
 */
export function buildEntradasWhatsAppUrl(phone, { nombre, message, withText = false, pdfUrl } = {}) {
  const digits = normalizePhoneForWhatsApp(phone);
  if (!digits) return null;
  if (!withText && message == null) {
    return `https://wa.me/${digits}`;
  }
  const template = message != null && message !== ""
    ? message
    : pdfUrl
      ? ENTRADAS_WHATSAPP_MENSAJE_ENTRADAS_CON_PDF
      : ENTRADAS_WHATSAPP_MENSAJE_ENTRADAS;
  const text = fillEntradasWhatsAppMensaje(template, { nombre, pdfUrl });
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
