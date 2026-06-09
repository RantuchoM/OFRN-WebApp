import { isProtectedIntegrante } from "./protectedIntegrantes";

export const VIATICOS_VALOR_DIARIO_ADMIN_EMAIL = "ofrn.archivo@gmail.com";

export function canAdminValorDiario({ email, isAdmin = false } = {}) {
  if (isAdmin) return true;
  return isProtectedIntegrante(email);
}
