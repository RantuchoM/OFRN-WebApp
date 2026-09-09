/**
 * Guarda de salida de Seating cuando hay mails de último momento pendientes.
 * BrowserRouter no soporta useBlocker; se interceptan Link / setSearchParams.
 */

let guardHandler = null;

function toSearchParams(search) {
  if (search instanceof URLSearchParams) return search;
  const raw = String(search || "");
  return new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
}

export function parseNavDestination(nextTo) {
  if (nextTo == null) return { pathname: "/", search: "" };
  if (typeof nextTo === "string") {
    if (/^https?:\/\//i.test(nextTo)) {
      try {
        const url = new URL(nextTo);
        return { pathname: url.pathname || "/", search: url.search || "" };
      } catch {
        return { pathname: "/", search: "" };
      }
    }
    const q = nextTo.indexOf("?");
    if (q === -1) return { pathname: nextTo || "/", search: "" };
    return {
      pathname: nextTo.slice(0, q) || "/",
      search: nextTo.slice(q),
    };
  }
  if (typeof nextTo === "object") {
    return {
      pathname: nextTo.pathname || "/",
      search: nextTo.search || "",
    };
  }
  return { pathname: "/", search: "" };
}

/** Seating real: `view=SEATING` (legado) o Repertorio → Seating / Escenario. */
export function isSeatingSearch(search) {
  const params = toSearchParams(search);
  const view = params.get("view");
  const subTab = params.get("subTab");
  if (view === "SEATING") return true;
  return (
    view === "REPERTOIRE" &&
    (subTab === "seating" || subTab === "stage_plot")
  );
}

export function destinationLeavesSeating(currentLocation, nextTo) {
  const currentSearch =
    currentLocation instanceof URLSearchParams
      ? currentLocation
      : currentLocation?.search || "";
  if (!isSeatingSearch(currentSearch)) return false;

  const dest = parseNavDestination(nextTo);
  const path = dest.pathname || "/";
  if (path !== "/" && path !== "") return true;
  return !isSeatingSearch(dest.search);
}

/**
 * @param {(proceed: () => void) => boolean} handler
 *   true = dejar pasar ahora; false = el handler llamará proceed después.
 */
export function registerSeatingLateMailLeaveGuard(handler) {
  guardHandler = typeof handler === "function" ? handler : null;
  return () => {
    if (guardHandler === handler) guardHandler = null;
  };
}

export function hasSeatingLateMailLeaveGuard() {
  return typeof guardHandler === "function";
}

/**
 * @param {() => void} [proceed]
 * @returns {boolean} true si el caller debe continuar ya
 */
export function requestSeatingLeave(proceed) {
  if (typeof guardHandler !== "function") return true;
  return guardHandler(typeof proceed === "function" ? proceed : () => {});
}

export function isModifiedClick(event) {
  if (!event) return false;
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey ||
    event.button !== 0
  );
}
