/**
 * Teléfono → enlace WhatsApp (Argentina por defecto si no hay código de país).
 * Por defecto usa whatsapp:// (app de escritorio / móvil).
 * Con preferWeb: https://wa.me/… (útil en mails HTML donde el protocolo a veces no abre).
 */

export const ENTRADAS_WHATSAPP_MENSAJE_PD =
  "PD: no respondemos consultas por este medio, este mensaje solo tiene el fin de acercarte la entrada de forma más fácil";

const ENTRADAS_WHATSAPP_MENSAJE_BASE =
  "Hola {nombre}, te enviamos las entradas para la Filarmónica que solicitaste. ¡Que disfrutes!\n\nDía: {dia}\nHora: {hora}\nLugar: {lugar}\nCantidad de entradas: {cantidad}";

export const ENTRADAS_WHATSAPP_MENSAJE_ENTRADAS =
  `${ENTRADAS_WHATSAPP_MENSAJE_BASE}\n\n${ENTRADAS_WHATSAPP_MENSAJE_PD}`;

export const ENTRADAS_WHATSAPP_MENSAJE_ENTRADAS_CON_PDF =
  `${ENTRADAS_WHATSAPP_MENSAJE_BASE}\n\nDescargá el PDF acá (no hace falta iniciar sesión):\n{pdfUrl}\n\n${ENTRADAS_WHATSAPP_MENSAJE_PD}`;

const ENTRADAS_WHATSAPP_TZ = "America/Argentina/Buenos_Aires";

/**
 * Día y hora de cartel (Argentina) para el mensaje de WhatsApp.
 * @param {string|Date|number|null|undefined} value
 * @returns {{ dia: string, hora: string }}
 */
export function formatDiaHoraWhatsAppEntradas(value) {
  if (value == null || value === "") return { dia: "", hora: "" };
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { dia: "", hora: "" };
  const dia = new Intl.DateTimeFormat("es-AR", {
    timeZone: ENTRADAS_WHATSAPP_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const hora = new Intl.DateTimeFormat("es-AR", {
    timeZone: ENTRADAS_WHATSAPP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return { dia, hora };
}

/**
 * Texto del chat. Sin PDF no incluye el bloque de descarga.
 * @param {{ nombre?: string, dia?: string, hora?: string, lugar?: string, cantidad?: string|number|null, pdfUrl?: string|null }} vars
 */
export function buildMensajeWhatsAppEntradas({ nombre, dia, hora, lugar, cantidad, pdfUrl } = {}) {
  const name = String(nombre || "").trim();
  const saludo = name ? `Hola ${name},` : "Hola,";
  const lines = [
    `${saludo} te enviamos las entradas para la Filarmónica que solicitaste. ¡Que disfrutes!`,
  ];
  const detalles = [];
  const diaTxt = String(dia || "").trim();
  const horaTxt = String(hora || "").trim();
  const lugarTxt = String(lugar || "").trim();
  const cantTxt = cantidad == null || cantidad === "" ? "" : String(cantidad).trim();
  if (diaTxt) detalles.push(`Día: ${diaTxt}`);
  if (horaTxt) detalles.push(`Hora: ${horaTxt}`);
  if (lugarTxt) detalles.push(`Lugar: ${lugarTxt}`);
  if (cantTxt) detalles.push(`Cantidad de entradas: ${cantTxt}`);
  if (detalles.length) lines.push("", ...detalles);
  const url = String(pdfUrl || "").trim();
  if (url) {
    lines.push("", "Descargá el PDF acá (no hace falta iniciar sesión):", url);
  }
  lines.push("", ENTRADAS_WHATSAPP_MENSAJE_PD);
  return lines.join("\n");
}

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
 * @param {{ nombre?: string, dia?: string, hora?: string, lugar?: string, cantidad?: string|number|null, pdfUrl?: string }} vars
 */
export function fillEntradasWhatsAppMensaje(template, vars = {}) {
  const built = buildMensajeWhatsAppEntradas(vars);
  if (!template) return built;
  const name = String(vars.nombre || "").trim();
  let out = String(template)
    .replace(/\{nombre\}/g, name || "hola")
    .replace(/\{dia\}/g, String(vars.dia || "").trim())
    .replace(/\{hora\}/g, String(vars.hora || "").trim())
    .replace(/\{lugar\}/g, String(vars.lugar || "").trim())
    .replace(/\{cantidad\}/g, vars.cantidad == null ? "" : String(vars.cantidad).trim())
    .replace(/\{pdfUrl\}/g, vars.pdfUrl ? String(vars.pdfUrl) : "");
  if (!vars.pdfUrl) {
    out = out
      .replace(/\n*Descargá el PDF[\s\S]*?(?=\n\nPD:|$)/i, "")
      .replace(/\{pdfUrl\}/g, "");
  }
  out = out
    .split("\n")
    .filter((line) => !/^(Día|Hora|Lugar|Cantidad de entradas):\s*$/.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (out && !out.includes(ENTRADAS_WHATSAPP_MENSAJE_PD)) {
    out = `${out}\n\n${ENTRADAS_WHATSAPP_MENSAJE_PD}`;
  }
  return out || built;
}

/**
 * @param {string} phone
 * @param {{ nombre?: string, dia?: string, hora?: string, lugar?: string, cantidad?: string|number|null, message?: string, withText?: boolean, pdfUrl?: string, preferWeb?: boolean }} [opts]
 * @returns {string|null}
 */
export function buildEntradasWhatsAppUrl(phone, {
  nombre,
  dia,
  hora,
  lugar,
  cantidad,
  message,
  withText = false,
  pdfUrl,
  preferWeb = false,
} = {}) {
  const digits = normalizePhoneForWhatsApp(phone);
  if (!digits) return null;
  const text = (() => {
    if (!withText && message == null) return "";
    return message != null && message !== ""
      ? fillEntradasWhatsAppMensaje(message, { nombre, dia, hora, lugar, cantidad, pdfUrl })
      : buildMensajeWhatsAppEntradas({ nombre, dia, hora, lugar, cantidad, pdfUrl });
  })();
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  // whatsapp:// abre la app de Windows/macOS/móvil si está instalada.
  // wa.me es HTTPS y en PC suele caer en WhatsApp Web.
  if (preferWeb) {
    return text
      ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
      : `https://wa.me/${digits}`;
  }
  return text
    ? `whatsapp://send?phone=${digits}&text=${encodeURIComponent(text)}`
    : `whatsapp://send?phone=${digits}${q}`;
}
