import { normalizePhoneForWhatsApp } from "./entradasWhatsApp";

const TEL_EN_REFERENCIA =
  /(?:^|[\s—–|])(?:tel(?:[eé]fono)?|cel(?:ular)?|whatsapp)\s*[:.]?\s*(\+?\d[\d\s().-]{5,}\d)/i;

function extraerTelefonoReferencia(referencia) {
  const ref = String(referencia || "");
  const match = ref.match(TEL_EN_REFERENCIA);
  return match ? String(match[1] || "").trim() : "";
}

function primerTelefonoUtil(...candidatos) {
  for (const candidato of candidatos) {
    const raw = String(candidato || "").trim();
    if (raw && normalizePhoneForWhatsApp(raw)) return raw;
  }
  return "";
}

/**
 * Teléfono para WhatsApp de una reserva de tercero.
 * Prioriza un "Tel …" escrito en la referencia y, si no hay,
 * el teléfono de la consulta de ayuda que originó la reserva.
 * @param {object|null|undefined} reserva
 * @returns {string}
 */
export function telefonoParaWhatsAppEntradaTercero(reserva) {
  if (!reserva) return "";
  return primerTelefonoUtil(
    extraerTelefonoReferencia(reserva.beneficiario_referencia),
    reserva.ayuda_telefono,
  );
}

/**
 * Nombre que va en el saludo del mensaje de WhatsApp.
 * @param {object|null|undefined} reserva
 * @returns {string}
 */
export function nombreParaWhatsAppEntradaTercero(reserva) {
  const ayuda = String(reserva?.ayuda_nombre || "").trim();
  if (ayuda) return ayuda;
  const head = String(reserva?.beneficiario_referencia || "")
    .split(/\s+[—–]\s+|\s+-\s+/)[0]
    ?.trim() || "";
  if (!head || /^tel\b/i.test(head) || head.includes("@")) return "";
  return head;
}
