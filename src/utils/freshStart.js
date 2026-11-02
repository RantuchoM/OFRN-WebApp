import { PWA_SKIP_WAITING_TYPE, unregisterAndClearCaches } from "./pwaApplyUpdate.js";

/** Página de rescate. El SW ya instalado no la precachea ni la usa como fallback. */
export const FRESH_START_PATH = "/refrescar.html";
export const FRESH_START_STORAGE_KEY = "ofrn:cache-reset";
/** Pasos ya anunciados. Sobrevive la recarga intermedia de esta misma página. */
export const FRESH_START_LOG_KEY = "ofrn:cache-reset-log";
/** La app que se abre después no debe mostrar «Actualizar versión» por un version.json viejo. */
export const FRESH_OPEN_KEY = "ofrn:fresh-open";
/** Recargas de esta misma página mientras el SW viejo sigue en control. */
export const FRESH_START_MAX_ATTEMPTS = 2;

/** now: lo que está pasando. done: cómo queda en la lista de arriba. */
export const FRESH_START_STATUS_TEXT = {
  check: {
    now: "Estoy viendo si en esta pestaña quedó una versión vieja",
    done: "Revisé si había una versión vieja",
  },
  release: {
    now: "La encontré. La estoy soltando para poder empezar de cero",
    done: "Solté la versión vieja",
  },
  reload: {
    now: "Ya la solté. Vuelvo a entrar para confirmar que no sigue ahí",
    done: "Confirmé que la versión vieja ya no está",
  },
  caches: {
    now: "Estoy borrando lo que el navegador tenía guardado",
    done: "Borré lo que el navegador tenía guardado",
  },
  open: { now: "Listo. Te abro la app." },
  openTimeout: { now: "Está tardando un poco. Igual te abro la app." },
  openError: { now: "No llegué a borrar todo. Igual te abro la app." },
  stuck: {
    now: "No pude soltar la versión vieja. Cerrá las otras pestañas de la app y abrí de nuevo este enlace.",
  },
  error: { now: "Algo no salió. Volvé a abrir esta página." },
};

const FRESH_START_BUSY = new Set(["check", "release", "reload", "caches"]);

export function freshStartStatusLabel(code, phase = "now") {
  const row = FRESH_START_STATUS_TEXT[code];
  if (!row) return "";
  if (phase === "done") return row.done || row.now || "";
  return row.now || "";
}

export function freshStartStatusBusy(code) {
  return FRESH_START_BUSY.has(code);
}

function markFreshOpen(storage) {
  try {
    storage?.setItem(FRESH_OPEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function takeFreshOpenMark(storage) {
  try {
    const on = storage?.getItem(FRESH_OPEN_KEY) === "1";
    if (on) storage.removeItem(FRESH_OPEN_KEY);
    return on;
  } catch {
    return false;
  }
}

/**
 * Instala el service worker que está en el servidor y lo pone en control,
 * para que `/` salga de esa versión y no quede otro esperando.
 */
export async function activateLatestServiceWorker(env, timeoutMs = 4000) {
  const sw = env?.serviceWorker;
  if (!sw || typeof sw.register !== "function") return false;
  let registration;
  try {
    registration = await sw.register("/sw.js", { scope: "/" });
  } catch {
    return false;
  }
  const skip = (worker) => {
    if (!worker || typeof worker.postMessage !== "function") return;
    try {
      worker.postMessage({ type: PWA_SKIP_WAITING_TYPE });
    } catch {
      /* ignore */
    }
  };
  skip(registration?.waiting);
  skip(registration?.installing);
  if (sw.controller) return true;

  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    try {
      sw.addEventListener?.("controllerchange", finish);
    } catch {
      /* ignore */
    }
    const installing = registration?.installing;
    if (installing?.addEventListener) {
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" || installing.state === "activated") {
          skip(registration.waiting || installing);
          if (sw.controller || installing.state === "activated") finish();
        }
      });
    }
    setTimeout(finish, timeoutMs);
  });
  return Boolean(sw.controller);
}

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
 * @param {number} [env.minStepMs] tiempo mínimo del paso en curso, para que se pueda leer
 * @param {number} [env.closingMs] pausa del aviso final antes de irse
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
    markFreshOpen(storage);
    location?.replace?.(dest);
  };

  if (plan === "unregister-then-reload") {
    writeStep(storage, step + 1);
    report(env, "release");
  } else {
    report(env, "caches");
  }

  const timeoutMs = env.timeoutMs ?? 8000;
  const minStepMs = env.minStepMs ?? 0;
  const closingMs = env.closingMs ?? 0;
  const started = Date.now();
  let timer;
  let outcome = "timeout";
  const timeout = new Promise((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });

  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const rest = minStepMs - (Date.now() - started);
    if (rest > 0) await pause(rest);
    if (plan === "clear-then-redirect") {
      await activateLatestServiceWorker(env);
    }
    if (plan === "unregister-then-reload") report(env, "reload");
    else if (outcome === "ok") report(env, "open");
    else if (outcome === "error") report(env, "openError");
    else report(env, "openTimeout");
    if (closingMs > 0) await pause(closingMs);
    leave();
  }
  return plan;
}
