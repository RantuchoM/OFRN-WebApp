/**
 * Legacy: vacantes antiguas tenían `vacante-<token>@placeholder.system`
 * (o `@sistema.local`). Hoy `crear_vacante` deja `mail = NULL`; este
 * detector queda como red de seguridad para filas no migradas.
 */
const VACANTE_PLACEHOLDER_MAIL_RE =
  /^vacante-[^@\s]+@(?:placeholder\.system|sistema\.local)$/i;

export function isVacantePlaceholderMail(mail) {
  const s = String(mail || "").trim();
  if (!s) return false;
  return VACANTE_PLACEHOLDER_MAIL_RE.test(s);
}

/** Dirección usable para copiar o enviar (no vacía ni placeholder de vacante). */
export function isNotifiableMail(mail) {
  const s = String(mail || "").trim();
  return Boolean(s) && !isVacantePlaceholderMail(s);
}

/**
 * Mail de un integrante apto para notificar/copiar.
 * Excluye vacantes (`es_simulacion`) y mails placeholder.
 */
export function notifiableMailOf(person) {
  if (!person || person.es_simulacion === true) return null;
  const mail = String(person.mail || "").trim();
  if (!isNotifiableMail(mail)) return null;
  return mail;
}

export function hasNotifiableMail(person) {
  return Boolean(notifiableMailOf(person));
}
