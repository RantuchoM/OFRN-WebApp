/** Formatea rol_sistema para mostrar (soporta string legacy o text[]). */
export function getRolesDisplay(rolSistema) {
  if (rolSistema == null) return "";
  return Array.isArray(rolSistema) ? rolSistema.join(", ") : String(rolSistema);
}
