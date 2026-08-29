/**
 * Gestos de viewport del stage plot (trackpad / rueda / pinch).
 *
 * Convención Chromium (macOS + Precision Touchpad):
 * - Pinch → `wheel` con `ctrlKey` (a veces `metaKey`) → zoom
 * - Scroll paralelo dos dedos → `wheel` sin ctrl → pan (deltaX / deltaY)
 * - Ctrl/⌘ + rueda del mouse → zoom
 *
 * Compartible con editor desktop y futuros gestos mobile.
 */

/** @param {WheelEvent | { ctrlKey?: boolean, metaKey?: boolean, deltaX?: number, deltaY?: number, deltaMode?: number }} evt */
export function isStagePlotViewportZoomWheel(evt) {
  return !!(evt?.ctrlKey || evt?.metaKey);
}

/**
 * Normaliza deltas de wheel a píxeles de pantalla (pan).
 * @param {WheelEvent | { deltaX?: number, deltaY?: number, deltaMode?: number }} evt
 * @returns {{ dx: number, dy: number }}
 */
export function normalizeStagePlotWheelPanDelta(evt) {
  let dx = Number(evt?.deltaX) || 0;
  let dy = Number(evt?.deltaY) || 0;
  const mode = evt?.deltaMode ?? 0;
  // 0 = DOM_DELTA_PIXEL, 1 = LINE, 2 = PAGE
  if (mode === 1) {
    dx *= 16;
    dy *= 16;
  } else if (mode === 2) {
    dx *= 400;
    dy *= 400;
  }
  return { dx, dy };
}

/**
 * Aplica un evento wheel al viewport { scale, x, y }.
 * Zoom anclado a `pointer` (coords del Stage en pantalla); pan por deltas.
 *
 * @param {{ scale: number, x: number, y: number }} prev
 * @param {WheelEvent | object} evt
 * @param {{
 *   pointer: { x: number, y: number } | null | undefined,
 *   zoomFactor?: number,
 *   zoomMin?: number,
 *   zoomMax?: number,
 * }} opts
 * @returns {{ scale: number, x: number, y: number, kind: 'zoom' | 'pan' | 'noop' }}
 */
export function applyStagePlotWheelToViewport(prev, evt, opts = {}) {
  const zoomFactor = opts.zoomFactor ?? 1.1;
  const zoomMin = opts.zoomMin ?? 0.15;
  const zoomMax = opts.zoomMax ?? 4;
  const pointer = opts.pointer;

  if (isStagePlotViewportZoomWheel(evt)) {
    if (!pointer) {
      return { ...prev, kind: "noop" };
    }
    const oldScale = prev.scale;
    const direction = (Number(evt?.deltaY) || 0) > 0 ? -1 : 1;
    let newScale =
      direction > 0 ? oldScale * zoomFactor : oldScale / zoomFactor;
    newScale = Math.min(zoomMax, Math.max(zoomMin, newScale));
    if (newScale === oldScale) {
      return { ...prev, kind: "noop" };
    }
    const mousePointTo = {
      x: (pointer.x - prev.x) / oldScale,
      y: (pointer.y - prev.y) / oldScale,
    };
    return {
      scale: newScale,
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
      kind: "zoom",
    };
  }

  const { dx, dy } = normalizeStagePlotWheelPanDelta(evt);
  if (dx === 0 && dy === 0) {
    return { ...prev, kind: "noop" };
  }
  return {
    scale: prev.scale,
    x: prev.x - dx,
    y: prev.y - dy,
    kind: "pan",
  };
}
