/**
 * Normaliza un número para wa.me: solo dígitos.
 * Argentina: 10 dígitos o prefijo 0 → se antepone 549.
 * Si viene como 54 + 10 dígitos (sin el 9 de móvil), se inserta el 9.
 * @param {string|number|null|undefined} phone
 * @returns {string} Número listo para wa.me, o '' si no hay dígitos útiles
 */
export function normalizePhoneForWhatsApp(phone) {
  if (phone == null) return "";
  const raw = typeof phone === "string" ? phone : String(phone);
  if (!raw.trim()) return "";
  let clean = raw.replace(/\D/g, "");
  if (!clean) return "";
  if (clean.length === 10) clean = `549${clean}`;
  else if (clean.startsWith("0")) clean = `549${clean.substring(1)}`;
  else if (clean.startsWith("54") && !clean.startsWith("549") && clean.length === 12) {
    clean = `549${clean.slice(2)}`;
  }
  return clean;
}
