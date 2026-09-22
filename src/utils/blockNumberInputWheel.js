const wiredInputs = new WeakSet();

/** Impide que la rueda cambie el valor de `<input type="number">` (Chrome lo hace incluso en hover). */
export function blockNumberInputWheel(event) {
  event.preventDefault();
}

/**
 * Callback ref: listener `wheel` no pasivo para que `preventDefault` funcione.
 * El `onWheel` de React 18 suele ser pasivo y Chrome ignora preventDefault.
 */
export function numberInputWheelRef(element) {
  if (!element || wiredInputs.has(element)) return;
  wiredInputs.add(element);
  element.addEventListener("wheel", blockNumberInputWheel, { passive: false });
}
