import { parseNavDestination } from "./seatingLateMailLeaveGuard";

/** @type {null | ((proceed: () => void) => boolean)} */
let rosterMailLeaveHandler = null;

export function registerRosterMailLeaveGuard(handler) {
  rosterMailLeaveHandler = handler;
  return () => {
    if (rosterMailLeaveHandler === handler) rosterMailLeaveHandler = null;
  };
}

function searchOf(to) {
  if (typeof to === "string") {
    const q = to.indexOf("?");
    return q >= 0 ? to.slice(q + 1) : "";
  }
  return String(to?.search || "").replace(/^\?/, "");
}

/** Sale de la nómina de esta gira (otra vista, otra gira u otro módulo). */
export function destinationLeavesRoster(currentLocation, nextTo) {
  const current = new URLSearchParams(currentLocation?.search || "");
  if (current.get("view") !== "ROSTER") return false;
  const dest = parseNavDestination(nextTo);
  if (dest.pathname && dest.pathname !== "/") return true;
  const next = new URLSearchParams(searchOf(dest));
  if (next.get("view") !== "ROSTER") return true;
  return next.get("giraId") !== current.get("giraId");
}

/**
 * @param {() => void} proceed
 * @returns {boolean} true si se puede salir ya
 */
export function requestRosterMailLeave(proceed) {
  if (!rosterMailLeaveHandler) return true;
  return rosterMailLeaveHandler(proceed) !== false;
}
