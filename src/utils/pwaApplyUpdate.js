/**
 * Aplica una actualización PWA en un solo gesto.
 *
 * vite-plugin-pwa (`registerType: "prompt"`) solo hace `messageSkipWaiting()`.
 * Si el SW todavía no está en `waiting` (update() en curso, `onRegistered` tarde,
 * Workbox `needRefresh` adelantado), el click era no-op. Un `location.reload()`
 * antes de que el SW nuevo controle sigue sirviendo el cache viejo.
 */

export const PWA_SKIP_WAITING_TYPE = "SKIP_WAITING";
export const PWA_WAITING_TIMEOUT_MS = 20_000;
export const PWA_CONTROLLER_TIMEOUT_MS = 3_500;

export function postSkipWaiting(worker) {
  if (!worker || typeof worker.postMessage !== "function") return false;
  try {
    worker.postMessage({ type: PWA_SKIP_WAITING_TYPE });
    return true;
  } catch {
    return false;
  }
}

export async function resolveServiceWorkerRegistration(
  hint,
  serviceWorker = typeof navigator !== "undefined" ? navigator.serviceWorker : null,
) {
  if (hint?.waiting || hint?.installing || hint?.active) return hint;
  if (!serviceWorker) return hint ?? null;
  try {
    const fromGet = await serviceWorker.getRegistration?.();
    if (fromGet) return fromGet;
  } catch {
    /* ignore */
  }
  try {
    if (serviceWorker.ready) return await serviceWorker.ready;
  } catch {
    /* ignore */
  }
  return hint ?? null;
}

function finishOnce(resolve) {
  let settled = false;
  return (value) => {
    if (settled) return;
    settled = true;
    resolve(value);
  };
}

/**
 * Espera un worker en `waiting` (o `installed` que pasa a waiting).
 * Cubre: already waiting, installing → installed, y `updatefound` tardío.
 */
export function waitForWaitingWorker(registration, timeoutMs = PWA_WAITING_TIMEOUT_MS) {
  return new Promise((resolve) => {
    if (!registration) {
      resolve(null);
      return;
    }
    if (registration.waiting) {
      resolve(registration.waiting);
      return;
    }

    const finish = finishOnce((worker) => {
      try {
        registration.removeEventListener?.("updatefound", onUpdateFound);
      } catch {
        /* ignore */
      }
      resolve(worker ?? registration.waiting ?? null);
    });

    const watchWorker = (worker) => {
      if (!worker) return;
      if (worker.state === "installed") {
        finish(registration.waiting || worker);
        return;
      }
      const onState = () => {
        if (worker.state === "installed") {
          worker.removeEventListener("statechange", onState);
          finish(registration.waiting || worker);
        } else if (worker.state === "redundant") {
          worker.removeEventListener("statechange", onState);
        }
      };
      worker.addEventListener("statechange", onState);
    };

    const onUpdateFound = () => watchWorker(registration.installing);
    try {
      registration.addEventListener?.("updatefound", onUpdateFound);
    } catch {
      /* ignore */
    }
    watchWorker(registration.installing);
    watchWorker(registration.waiting);

    setTimeout(() => finish(registration.waiting || null), timeoutMs);
  });
}

export function waitForControllerChange(
  serviceWorker,
  timeoutMs = PWA_CONTROLLER_TIMEOUT_MS,
) {
  return new Promise((resolve) => {
    if (!serviceWorker || typeof serviceWorker.addEventListener !== "function") {
      resolve(false);
      return;
    }
    const finish = finishOnce((ok) => {
      try {
        serviceWorker.removeEventListener("controllerchange", onChange);
      } catch {
        /* ignore */
      }
      resolve(ok);
    });
    const onChange = () => finish(true);
    serviceWorker.addEventListener("controllerchange", onChange);
    setTimeout(() => finish(false), timeoutMs);
  });
}

export async function unregisterAndClearCaches({
  serviceWorker = typeof navigator !== "undefined" ? navigator.serviceWorker : null,
  cacheStorage = typeof caches !== "undefined" ? caches : null,
} = {}) {
  const errors = [];
  if (serviceWorker?.getRegistrations) {
    try {
      const regs = await serviceWorker.getRegistrations();
      await Promise.all(
        (regs || []).map((reg) =>
          Promise.resolve(reg.unregister()).catch((err) => {
            errors.push(err);
          }),
        ),
      );
    } catch (err) {
      errors.push(err);
    }
  }
  if (cacheStorage?.keys) {
    try {
      const keys = await cacheStorage.keys();
      await Promise.all(
        (keys || []).map((key) =>
          Promise.resolve(cacheStorage.delete(key)).catch((err) => {
            errors.push(err);
          }),
        ),
      );
    } catch (err) {
      errors.push(err);
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * @param {object} [options]
 * @param {ServiceWorkerRegistration | null} [options.registration]
 * @param {(reloadPage?: boolean) => Promise<unknown>} [options.updateServiceWorker]
 * @param {boolean} [options.allowNuke] last resort: unregister + clear caches + reload
 * @param {() => boolean | void} [options.reload]
 * @returns {Promise<{ ok: boolean, via: string, error?: string }>}
 */
export async function applyPwaUpdate({
  registration: hint = null,
  updateServiceWorker = null,
  allowNuke = true,
  reload = () => {
    if (typeof window !== "undefined") window.location.reload();
    return true;
  },
  serviceWorker = typeof navigator !== "undefined" ? navigator.serviceWorker : null,
  cacheStorage = typeof caches !== "undefined" ? caches : null,
  waitingTimeoutMs = PWA_WAITING_TIMEOUT_MS,
  controllerTimeoutMs = PWA_CONTROLLER_TIMEOUT_MS,
} = {}) {
  const registration = await resolveServiceWorkerRegistration(hint, serviceWorker);

  let waiting = registration?.waiting ?? null;

  if (!waiting && registration) {
    if (!registration.installing) {
      try {
        await registration.update();
      } catch {
        /* offline / update check fallido: seguimos con waiting/installing si existe */
      }
    }
    waiting = await waitForWaitingWorker(registration, waitingTimeoutMs);
  }

  if (waiting) {
    postSkipWaiting(waiting);
    if (typeof updateServiceWorker === "function") {
      try {
        await updateServiceWorker(true);
      } catch {
        /* el postMessage ya fue enviado */
      }
    }
    await waitForControllerChange(serviceWorker, controllerTimeoutMs);
    const didReload = reload();
    if (didReload === false) {
      return { ok: false, via: "reload-guard", error: "Recargas repetidas; se detuvo el reload." };
    }
    return { ok: true, via: "skip-waiting" };
  }

  const online =
    typeof navigator === "undefined" || navigator.onLine !== false;
  if (allowNuke && online) {
    await unregisterAndClearCaches({ serviceWorker, cacheStorage });
    const didReload = reload();
    if (didReload === false) {
      return { ok: false, via: "reload-guard", error: "Recargas repetidas; se detuvo el reload." };
    }
    return { ok: true, via: "unregister-reload" };
  }

  return {
    ok: false,
    via: online ? "no-waiting" : "offline",
    error: online
      ? "No se pudo activar la versión nueva. Intentá de nuevo."
      : "No hay conexión para completar la actualización. Intentá de nuevo cuando tengas red.",
  };
}
