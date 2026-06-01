/** Emails de cuentas cuyos roles y eliminación no pueden modificarse desde la app. */
export const PROTECTED_INTEGRANTE_EMAILS = ["ofrn.archivo@gmail.com"];

export function isProtectedIntegrante(integranteOrMail) {
  const mail =
    typeof integranteOrMail === "string"
      ? integranteOrMail
      : integranteOrMail?.mail;
  if (!mail) return false;
  const normalized = String(mail).trim().toLowerCase();
  return PROTECTED_INTEGRANTE_EMAILS.some(
    (email) => email.trim().toLowerCase() === normalized,
  );
}
