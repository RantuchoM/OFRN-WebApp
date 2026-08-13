/**
 * Sesión aislada FIMBA (mini-app externa, no Supabase Auth OFRN).
 * localStorage keys: fimba_user | fimba_consulta_edicion
 */

export const FIMBA_USER_STORAGE_KEY = "fimba_user";
export const FIMBA_USER_SESSION_EVENT = "fimba-user-session";

/** Enlace consulta general de edición (/fimba/c/:token). */
export const FIMBA_CONSULTA_EDICION_KEY = "fimba_consulta_edicion";
export const FIMBA_CONSULTA_EDICION_EVENT = "fimba-consulta-edicion-session";

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

/**
 * @typedef {object} FimbaConsultaEdicionSession
 * @property {string} token
 * @property {number} id_edicion
 * @property {string} [loggedAt]
 */

function notifyUser() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(FIMBA_USER_SESSION_EVENT));
  } catch {
    /* ignore */
  }
}

function notifyConsultaEdicion() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(FIMBA_CONSULTA_EDICION_EVENT));
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
  notifyUser();
}

export function clearFimbaUserSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FIMBA_USER_STORAGE_KEY);
  notifyUser();
}

/**
 * @returns {FimbaConsultaEdicionSession|null}
 */
export function readFimbaConsultaEdicionSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FIMBA_CONSULTA_EDICION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const id_edicion = Number(parsed.id_edicion);
    const token = String(parsed.token || "").trim();
    if (!Number.isFinite(id_edicion) || !token) return null;
    return {
      token,
      id_edicion,
      loggedAt: parsed.loggedAt ? String(parsed.loggedAt) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * @param {{ token: string, id_edicion: number|string }} payload
 */
export function writeFimbaConsultaEdicionSession(payload) {
  if (typeof window === "undefined") return;
  const id_edicion = Number(payload?.id_edicion);
  const token = String(payload?.token || "").trim();
  if (!Number.isFinite(id_edicion) || !token) {
    throw new Error("Sesión de consulta de edición inválida");
  }
  localStorage.setItem(
    FIMBA_CONSULTA_EDICION_KEY,
    JSON.stringify({
      token,
      id_edicion,
      loggedAt: new Date().toISOString(),
    }),
  );
  notifyConsultaEdicion();
}

export function clearFimbaConsultaEdicionSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FIMBA_CONSULTA_EDICION_KEY);
  notifyConsultaEdicion();
}

/**
 * Acceso staff de edición para sesión FIMBA externa (solo editor).
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
 * Rutas permitidas en modo consulta de edición (sin Usuarios / Contrataciones).
 * @param {string} pathname
 * @param {number|string} edicionId
 */
export function fimbaConsultaPathAllowed(pathname, edicionId) {
  if (edicionId == null || edicionId === "") return false;
  const path = String(pathname || "");
  const normalized =
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  if (normalized === "/fimba") return true;
  const m = normalized.match(/^\/fimba\/edicion\/([^/]+)(?:\/(.*))?$/);
  if (!m) return false;
  if (String(m[1]) !== String(edicionId)) return false;
  const rest = m[2] || "";
  if (!rest) return true;
  if (
    rest === "usuarios" ||
    rest.startsWith("usuarios/") ||
    rest === "contrataciones" ||
    rest.startsWith("contrataciones/")
  ) {
    return false;
  }
  return true;
}

/**
 * ¿La ruta staff actual es accesible con esta sesión de usuario FIMBA?
 * Editor: full edition. Consulta: same paths except Usuarios/Contrataciones.
 * @param {string} pathname
 * @param {FimbaUserSession|null|undefined} session
 */
export function fimbaSessionCanAccessPath(pathname, session) {
  if (!session) return false;
  const path = String(pathname || "");
  if (path === "/fimba" || path === "/fimba/") {
    return (
      session.rol_fimba === FIMBA_ROLES.EDITOR_GENERAL ||
      session.rol_fimba === FIMBA_ROLES.CONSULTA
    );
  }
  if (session.rol_fimba === FIMBA_ROLES.EDITOR_GENERAL) {
    const m = path.match(/^\/fimba\/edicion\/([^/]+)/);
    if (m) return String(session.id_edicion) === String(m[1]);
    return false;
  }
  if (session.rol_fimba === FIMBA_ROLES.CONSULTA) {
    return fimbaConsultaPathAllowed(pathname, session.id_edicion);
  }
  return false;
}

/**
 * Token de consulta de edición: solo lecturas permitidas.
 * @param {string} pathname
 * @param {FimbaConsultaEdicionSession|null|undefined} session
 */
export function fimbaConsultaTokenCanAccessPath(pathname, session) {
  if (!session?.id_edicion) return false;
  if (!fimbaConsultaPathAllowed(pathname, session.id_edicion)) return false;
  const path = String(pathname || "");
  const normalized =
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  const m = normalized.match(/^\/fimba\/edicion\/([^/]+)\/(.*)$/);
  if (m && (m[2] === "rider" || m[2].startsWith("rider/"))) return false;
  return true;
}

/**
 * Resuelve permisos efectivos en el shell FIMBA.
 * Prioridad: OFRN management → editor_general → consulta (user o token).
 *
 * @param {{
 *   ofrnManagement?: boolean,
 *   fimbaUser?: FimbaUserSession|null,
 *   consultaTokenSession?: FimbaConsultaEdicionSession|null,
 *   edicionId?: number|string|null,
 * }} args
 */
export function resolveFimbaAccess({
  ofrnManagement = false,
  fimbaUser = null,
  consultaTokenSession = null,
  edicionId = null,
} = {}) {
  if (ofrnManagement) {
    return {
      allowed: true,
      readOnly: false,
      canManageUsers: true,
      canSeeUsuarios: true,
      canSeeContrataciones: true,
      /** Meta/logística de propuesta (color, cupos, hotel, estado…): solo generales/OFRN. */
      canEditPropuestaMeta: true,
      /** Pestaña + ficha Rider (logística interna). No tokens `/c` `/a` `/e`. */
      canSeeRider: true,
      source: "ofrn",
    };
  }

  const matchUser =
    fimbaUser &&
    (edicionId == null ||
      edicionId === "" ||
      String(fimbaUser.id_edicion) === String(edicionId));

  if (matchUser && fimbaUser.rol_fimba === FIMBA_ROLES.EDITOR_GENERAL) {
    return {
      allowed: true,
      readOnly: false,
      canManageUsers: true,
      canSeeUsuarios: true,
      canSeeContrataciones: true,
      canEditPropuestaMeta: true,
      canSeeRider: true,
      source: "fimba_editor",
    };
  }

  if (matchUser && fimbaUser.rol_fimba === FIMBA_ROLES.CONSULTA) {
    return {
      allowed: true,
      readOnly: true,
      canManageUsers: false,
      canSeeUsuarios: false,
      canSeeContrataciones: false,
      canEditPropuestaMeta: false,
      canSeeRider: true,
      source: "fimba_consulta",
    };
  }

  const matchToken =
    consultaTokenSession &&
    (edicionId == null ||
      edicionId === "" ||
      String(consultaTokenSession.id_edicion) === String(edicionId));

  if (matchToken) {
    return {
      allowed: true,
      readOnly: true,
      canManageUsers: false,
      canSeeUsuarios: false,
      canSeeContrataciones: false,
      canEditPropuestaMeta: false,
      canSeeRider: false,
      source: "token_consulta",
    };
  }

  return {
    allowed: false,
    readOnly: true,
    canManageUsers: false,
    canSeeUsuarios: false,
    canSeeContrataciones: false,
    canEditPropuestaMeta: false,
    canSeeRider: false,
    source: "none",
  };
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
