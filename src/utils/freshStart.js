import { unregisterAndClearCaches } from "./pwaApplyUpdate.js";

/** Página de rescate. El SW ya instalado no la precachea ni la usa como fallback. */
export const FRESH_START_PATH = "/refrescar.html";
export const FRESH_START_STORAGE_KEY = "ofrn:cache-reset";
/** Pasos ya anunciados. Sobrevive la recarga intermedia de esta misma página. */
export const FRESH_START_LOG_KEY = "ofrn:cache-reset-log";
/** Recargas de esta misma página mientras el SW viejo sigue en control. */
export const FRESH_START_MAX_ATTEMPTS = 2;

/** Textos que la página muestra, en el orden en que pueden ocurrir. */
export const FRESH_START_STATUS_TEXT = {
  check: "Revisando si esta pestaña tiene una versión guardada.",
  release: "Soltando esa versión.",
  reload: "Volviendo a abrir esta página para confirmar que la soltó.",
  caches: "Borrando los archivos guardados de la app.",
  open: "Abriendo la app.",
  openTimeout: "El borrado está tardando. Abro la app igual.",
  openError: "No se pudo terminar el borrado. Abro la app igual.",
  stuck: "No se pudo soltar la versión guardada. Cerrá todas las pestañas de la app y volvé a abrir este enlace.",
  error: "No se pudo limpiar. Volvé a abrir esta página.",
};

const SHELL_SESSION_KEYS = [
  "ofrn:pwa-reload-guard",
  "ofrn:preload-reload",
  "ofrn:main-chunk-reload",
  "ofrn:transporte-auto-apply-at",
];

/**
 * Destino interno después de limpiar. Rechaza URLs absolutas, protocol-relative y esta misma página.
 * @param {string} [search]
 * @returns {string}
 */
export function freshStartDestination(search = "") {
  const raw = String(search || "");
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const next = params.get("next");
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || next.includes("..")) {
    return "/";
  }
  let url;
  try {
    url = new URL(next, "https://ofrn.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://ofrn.local") return "/";
  if (url.pathname === FRESH_START_PATH) return "/";
  return `${url.pathname}${url.search}`;
}

function readStep(storage) {
  try {
    const n = Number(storage?.getItem(FRESH_START_STORAGE_KEY) || 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeStep(storage, step) {
  try {
    storage?.setItem(FRESH_START_STORAGE_KEY, String(step));
  } catch {
    /* ignore */
  }
}

function removeStep(storage) {
  try {
    storage?.removeItem(FRESH_START_STORAGE_KEY);
    storage?.removeItem(FRESH_START_LOG_KEY);
  } catch {
    /* ignore */
  }
}

export function readFreshStartLog(storage) {
  try {
    const raw = storage?.getItem(FRESH_START_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function appendFreshStartLog(storage, code) {
  const log = readFreshStartLog(storage);
  if (log[log.length - 1] !== code) log.push(code);
  try {
    storage?.setItem(FRESH_START_LOG_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
  return log;
}

function report(env, code) {
  const log = appendFreshStartLog(env.sessionStorage, code);
  try {
    env.onStatus?.(code, log);
  } catch {
    /* el aviso no puede frenar la limpieza */
  }
  return log;
}

function clearShellSessionKeys(storage) {
  if (!storage) return;
  for (const key of SHELL_SESSION_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {{ controlled?: boolean, step?: number }} state
 * @returns {"clear-then-redirect" | "unregister-then-reload" | "stuck"}
 */
export function planFreshStart({ controlled = false, step = 0 } = {}) {
  if (!controlled) return "clear-then-redirect";
  if (step >= FRESH_START_MAX_ATTEMPTS) return "stuck";
  return "unregister-then-reload";
}

/**
 * Suelta el service worker y, si se pide, la Cache Storage.
 * No toca localStorage ni IndexedDB (sesión y borradores).
 */
export async function clearAppShellCaches(env = {}, { deleteCaches = true } = {}) {
  const result = await unregisterAndClearCaches({
    serviceWorker: env.serviceWorker ?? null,
    cacheStorage: deleteCaches ? (env.cacheStorage ?? null) : null,
  });
  if (deleteCaches) clearShellSessionKeys(env.sessionStorage);
  return result;
}

/**
 * Abre la app de cero.
 * Con SW en control: solo lo desregistra y recarga esta página (la caché sigue, para no dejar `/` sin shell).
 * Sin SW: borra la caché y navega al destino.
 * @param {object} env
 * @param {ServiceWorkerContainer | { controller?: unknown, getRegistrations?: Function } | null} [env.serviceWorker]
 * @param {CacheStorage | null} [env.cacheStorage]
 * @param {Storage} [env.sessionStorage]
 * @param {{ search?: string, replace?: Function, reload?: Function }} [env.location]
 * @param {number} [env.timeoutMs]
 * @param {(code: string, log: string[]) => void} [env.onStatus]
 */
export async function runFreshStart(env = {}) {
  const storage = env.sessionStorage ?? null;
  const location = env.location;
  const step = readStep(storage);
  const controlled = Boolean(env.serviceWorker?.controller);
  const plan = planFreshStart({ controlled, step });
  const dest = freshStartDestination(location?.search || "");

  const prior = readFreshStartLog(storage);
  const resumed = !controlled && prior.includes("release");
  if (!resumed) report(env, "check");
  if (plan === "stuck") {
    report(env, "stuck");
    return plan;
  }

  let left = false;
  const leave = () => {
    if (left) return;
    left = true;
    if (plan === "unregister-then-reload") {
      location?.reload?.();
      return;
    }
    removeStep(storage);
    location?.replace?.(dest);
  };

  if (plan === "unregister-then-reload") {
    writeStep(storage, step + 1);
    report(env, "release");
  } else {
    report(env, "caches");
  }

  const timeoutMs = env.timeoutMs ?? 8000;
  let timer;
  let outcome = "timeout";
  const timeout = new Promise((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });

  try {
    await Promise.race([
      clearAppShellCaches(env, { deleteCaches: plan !== "unregister-then-reload" }).then(
        () => {
          outcome = "ok";
        },
        () => {
          outcome = "error";
        },
      ),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
    if (plan === "unregister-then-reload") report(env, "reload");
    else if (outcome === "ok") report(env, "open");
    else if (outcome === "error") report(env, "openError");
    else report(env, "openTimeout");
    leave();
  }
  return plan;
}
