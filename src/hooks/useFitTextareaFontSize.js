import { useCallback, useLayoutEffect } from "react";

/**
 * Ajusta font-size del textarea para que el contenido quepa en el contenedor
 * (empieza en maxPx y baja hasta minPx). Reevalúa al cambiar value y al redimensionar.
 * @param {{ fitHeightOnly?: boolean }} [opts] Si true, solo reduce por desbordamiento vertical
 *   (el ancho puede desbordar sin achicar letra por eso).
 */
export function useFitTextareaFontSize(
  ref,
  value,
  { minPx = 8, maxPx = 16, step = 0.5, fitHeightOnly = false } = {},
) {
  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    let size = maxPx;
    el.style.fontSize = `${size}px`;

    let guard = 0;
    while (guard++ < 100 && size > minPx) {
      const overY = el.scrollHeight > el.clientHeight + 1;
      const overX = fitHeightOnly ? false : el.scrollWidth > el.clientWidth + 1;
      if (!overY && !overX) break;
      size = Math.max(minPx, size - step);
      el.style.fontSize = `${size}px`;
    }
  }, [ref, value, minPx, maxPx, step, fitHeightOnly]);

  useLayoutEffect(() => {
    fit();
  }, [fit]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(fit);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fit]);
}
