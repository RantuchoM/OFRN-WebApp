/** Roles de `entrada_usuario.rol` (enum `entrada_rol`). */

export const ENTRADA_ROL_PERSONAL = "personal";
export const ENTRADA_ROL_RECEPCIONISTA = "recepcionista";
export const ENTRADA_ROL_BOLETOS = "boletos";
export const ENTRADA_ROL_BOLETOS_RECEP = "boletos_recep";
export const ENTRADA_ROL_ADMIN = "admin";

export const ENTRADA_USUARIO_ROLES = [
  { id: ENTRADA_ROL_PERSONAL, label: "personal" },
  { id: ENTRADA_ROL_RECEPCIONISTA, label: "recepcionista" },
  { id: ENTRADA_ROL_BOLETOS, label: "boletos" },
  { id: ENTRADA_ROL_BOLETOS_RECEP, label: "boletos+recepc" },
  { id: ENTRADA_ROL_ADMIN, label: "admin" },
];

export function normalizeEntradaRol(rol) {
  return String(rol || ENTRADA_ROL_PERSONAL).trim().toLowerCase();
}

export function entradaRolLabel(rol) {
  const r = normalizeEntradaRol(rol);
  return ENTRADA_USUARIO_ROLES.find((item) => item.id === r)?.label || r;
}

/** Admin de Entradas: programas, usuarios, recepción y terceros. */
export function entradaRolCanAdmin(rol) {
  return normalizeEntradaRol(rol) === ENTRADA_ROL_ADMIN;
}

/** Recepción (check-in QR). */
export function entradaRolCanRecepcion(rol) {
  const r = normalizeEntradaRol(rol);
  return r === ENTRADA_ROL_ADMIN || r === ENTRADA_ROL_RECEPCIONISTA || r === ENTRADA_ROL_BOLETOS_RECEP;
}

/** Reservar entradas para terceros. */
export function entradaRolCanTerceros(rol) {
  const r = normalizeEntradaRol(rol);
  return r === ENTRADA_ROL_ADMIN || r === ENTRADA_ROL_BOLETOS || r === ENTRADA_ROL_BOLETOS_RECEP;
}
