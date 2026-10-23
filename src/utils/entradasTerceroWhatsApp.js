import { lugarNombreDesdeConciertoEntrada } from "./entradasConciertoEvento";
import { formatEntradasConciertoFechaHora } from "./entradasReservaCopy";
import { normalizePhoneForWhatsApp } from "./whatsappPhone";

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
 * Prioriza un "Tel …" escrito en la referencia (corrección manual) y, si no hay,
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

function nombreParaSaludo(reserva) {
  const ayuda = String(reserva?.ayuda_nombre || "").trim();
  if (ayuda) return ayuda;
  const head = String(reserva?.beneficiario_referencia || "")
    .split(/\s+[—–]\s+|\s+-\s+/)[0]
    ?.trim() || "";
  if (!head || /^tel\b/i.test(head) || head.includes("@")) return "";
  return head;
}

/**
 * Texto que se precarga en el chat de WhatsApp para enviar la entrada ya generada.
 * No incluye tokens QR: el PDF se descarga aparte para adjuntarlo.
 * @param {object|null|undefined} reserva
 * @returns {string}
 */
export function buildMensajeWhatsAppEntradaTercero(reserva) {
  const nombre = nombreParaSaludo(reserva);
  const concierto = String(reserva?.concierto?.nombre || "el concierto").trim();
  const cuando = formatEntradasConciertoFechaHora(
    reserva?.concierto?.fecha_hora || reserva?.concierto?.fechaHora,
  );
  const lugar = String(
    reserva?.concierto?.lugar_nombre || lugarNombreDesdeConciertoEntrada(reserva?.concierto) || "",
  ).trim();
  const cantidad = Number(reserva?.cantidad_solicitada) || 1;
  const codigo = String(reserva?.codigo_reserva || "").trim();
  const entradas = `${cantidad} entrada${cantidad === 1 ? "" : "s"}`;
  const lineas = [
    nombre ? `Hola ${nombre},` : "Hola,",
    "",
    "Te escribimos de Entradas de la Orquesta Filarmónica de Río Negro. Tu reserva quedó confirmada:",
    "",
    concierto,
    cuando && cuando !== "—" ? cuando : null,
    lugar || null,
    codigo ? `${entradas} · código ${codigo}.` : `${entradas}.`,
    "",
    "Te adjunto el PDF con los códigos QR para ingresar. Presentate 10 minutos antes del inicio: después, los lugares libres pueden cederse.",
  ];
  return lineas.filter((linea) => linea != null).join("\n");
}
