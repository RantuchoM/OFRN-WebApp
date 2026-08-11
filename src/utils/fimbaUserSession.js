/**
 * Sesión aislada FIMBA (mini-app externa, no Supabase Auth OFRN).
 * localStorage key: fimba_user
 */

export const FIMBA_USER_STORAGE_KEY = "fimba_user";
export const FIMBA_USER_SESSION_EVENT = "fimba-user-session";

export const FIMBA_ROLES = {
  EDITOR_GENERAL: "editor_general",
  CONSULTA: "consulta",
};

export const FIMBA_ROLE_LABELS = {
  editor_general: "Editor general",
  consulta: "Consulta",
};

/**
 * @typedef {object} FimbaUserSession
 * @property {number} id
 * @property {string} mail
 * @property {string|null} [nombre]
 * @property {'editor_general'|'consulta'} rol_fimba
 * @property {number} id_edicion
 * @property {string} [loggedAt]
 */

function notify() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(FIMBA_USER_SESSION_EVENT));
  } catch {
    /* ignore */
  }
}

/**
 * @returns {FimbaUserSession|null}
 */
export function readFimbaUserSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FIMBA_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const id = Number(parsed.id);
    const id_edicion = Number(parsed.id_edicion);
    const mail = String(parsed.mail || "").trim().toLowerCase();
    const rol = String(parsed.rol_fimba || "").trim();
    if (!Number.isFinite(id) || !Number.isFinite(id_edicion) || !mail) return null;
    if (rol !== FIMBA_ROLES.EDITOR_GENERAL && rol !== FIMBA_ROLES.CONSULTA) return null;
    return {
      id,
      mail,
      nombre: parsed.nombre != null ? String(parsed.nombre) : null,
      rol_fimba: rol,
      id_edicion,
      loggedAt: parsed.loggedAt ? String(parsed.loggedAt) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * @param {FimbaUserSession|object} user
 */
export function writeFimbaUserSession(user) {
  if (typeof window === "undefined") return;
  const id = Number(user?.id);
  const id_edicion = Number(user?.id_edicion);
  const mail = String(user?.mail || "").trim().toLowerCase();
  const rol = String(user?.rol_fimba || "").trim();
  if (!Number.isFinite(id) || !Number.isFinite(id_edicion) || !mail) {
    throw new Error("Sesión FIMBA inválida");
  }
  if (rol !== FIMBA_ROLES.EDITOR_GENERAL && rol !== FIMBA_ROLES.CONSULTA) {
    throw new Error("Rol FIMBA inválido");
  }
  const payload = {
    id,
    mail,
    nombre: user?.nombre != null ? String(user.nombre) : null,
    rol_fimba: rol,
    id_edicion,
    loggedAt: new Date().toISOString(),
  };
  localStorage.setItem(FIMBA_USER_STORAGE_KEY, JSON.stringify(payload));
  notify();
}

export function clearFimbaUserSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FIMBA_USER_STORAGE_KEY);
  notify();
}

/**
 * Acceso staff de edición para sesión FIMBA externa.
 * v1: solo editor_general; consulta listo en enum pero sin shell de edición.
 * @param {FimbaUserSession|null|undefined} session
 * @param {number|string|null|undefined} edicionIdFromRoute
 */
export function fimbaSessionCanEditEdicion(session, edicionIdFromRoute) {
  if (!session) return false;
  if (session.rol_fimba !== FIMBA_ROLES.EDITOR_GENERAL) return false;
  if (edicionIdFromRoute == null || edicionIdFromRoute === "") return true;
  return String(session.id_edicion) === String(edicionIdFromRoute);
}

/**
 * ¿La ruta staff actual es accesible con esta sesión?
 * @param {string} pathname
 * @param {FimbaUserSession|null|undefined} session
 */
export function fimbaSessionCanAccessPath(pathname, session) {
  if (!session) return false;
  if (session.rol_fimba !== FIMBA_ROLES.EDITOR_GENERAL) return false;
  const path = String(pathname || "");
  if (path === "/fimba" || path === "/fimba/") return true;
  const m = path.match(/^\/fimba\/edicion\/([^/]+)/);
  if (m) return String(session.id_edicion) === String(m[1]);
  return false;
}

/** Genera clave temporal legible (8 chars alphanum excluye ambigüos). */
export function generateFimbaTempPassword(len = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const n = Math.max(6, Math.min(16, Number(len) || 8));
  let out = "";
  const cryptoObj = typeof crypto !== "undefined" ? crypto : null;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint8Array(n);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < n; i += 1) out += alphabet[buf[i] % alphabet.length];
    return out;
  }
  for (let i = 0; i < n; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
