/** Casilla OFRN: el sufijo +entradas llega a filarmonica.scrn@gmail.com y se puede filtrar en Gmail. */
export const ENTRADAS_AYUDA_EMAIL = "filarmonica.scrn+entradas@gmail.com";

export const ENTRADAS_AYUDA_SUBJECT = "Consulta sobre entradas";

export const ENTRADAS_AYUDA_BODY = [
  "Nombre completo:",
  "Mail:",
  "Teléfono:",
  "Cantidad de entradas (1 a 4):",
  "Función:",
  "Otros comentarios:",
].join("\n");

/** Abre la app / cliente de correo del dispositivo con asunto y plantilla. */
export function buildEntradasAyudaMailtoHref({
  email = ENTRADAS_AYUDA_EMAIL,
  subject = ENTRADAS_AYUDA_SUBJECT,
  body = ENTRADAS_AYUDA_BODY,
} = {}) {
  // %2B en el alias; encodeURIComponent (no URLSearchParams) para que los espacios
  // del cuerpo/asunto sean %20 y no "+" (algunos clientes muestran "Nombre+completo").
  const mailbox = String(email || "").replace(/\+/g, "%2B");
  return `mailto:${mailbox}?subject=${encodeURIComponent(String(subject || ""))}&body=${encodeURIComponent(String(body || ""))}`;
}
