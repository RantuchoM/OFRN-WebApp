/**
 * Registro liviano de trabajo no guardado (modales / planillas dirty).
 * ReloadPrompt lo consulta antes de aplicar una actualización PWA en navegación.
 */

const holders = new Set();
const listeners = new Set();

function notify() {
  const dirty = holders.size > 0;
  listeners.forEach((fn) => {
    try {
      fn(dirty);
    } catch {
      /* ignore */
    }
  });
}

/** Marca un token como trabajo pendiente (idempotente). */
export function markUnsavedWork(token) {
  if (token == null || token === "") return;
  const key = String(token);
  if (holders.has(key)) return;
  holders.add(key);
  notify();
}

/** Quita un token del registro. */
export function clearUnsavedWork(token) {
  if (token == null || token === "") return;
  const key = String(token);
  if (!holders.delete(key)) return;
  notify();
}

export function subscribeUnsavedWork(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Heurística DOM + registro explícito.
 * - `.fimba-row-dirty` / `.fimba-sync-pending`: planillas FIMBA en modo edición
 * - `[data-unsaved-work="true"]`: opt-in en modales / formularios
 */
let leaveHandler = null;

/**
 * Misma forma que requestSeatingLeave: true = seguir ahora;
 * false = el handler llama proceed después del diálogo.
 */
export function registerUnsavedLeaveGuard(handler) {
  leaveHandler = typeof handler === "function" ? handler : null;
  return () => {
    if (leaveHandler === handler) leaveHandler = null;
  };
}

export function requestUnsavedLeave(proceed) {
  if (typeof leaveHandler !== "function") return true;
  return leaveHandler(typeof proceed === "function" ? proceed : () => {});
}

export function hasUnsavedWork() {
  if (holders.size > 0) return true;
  if (typeof document === "undefined") return false;
  try {
    return Boolean(
      document.querySelector(
        '.fimba-row-dirty, .fimba-sync-pending, [data-unsaved-work="true"]'
      )
    );
  } catch {
    return false;
  }
}
