import { useLayoutEffect } from "react";

function buildCanvasFont(el) {
  const cs = getComputedStyle(el);
  return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
}

function padXTotal(el) {
  const cs = getComputedStyle(el);
  return (
    parseFloat(cs.paddingLeft) +
    parseFloat(cs.paddingRight) +
    parseFloat(cs.borderLeftWidth) +
    parseFloat(cs.borderRightWidth)
  );
}

/** Ancho en px del carácter de referencia (misma fuente que el campo). */
function measureChAdvance(font) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  if (!ctx) return 8;
  ctx.font = font;
  const w = ctx.measureText("0").width;
  return w > 0 ? w : 8;
}

/**
 * Máximo ancho de línea en px (texto tal cual, lectura izquierda-derecha, sin refluir).
 * @param {string} text
 * @param {string} font - cadena `font` de canvas
 */
function measureMaxLineWidth(text, font) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  if (!ctx) return 0;
  ctx.font = font;
  const lines = text.length === 0 ? [""] : text.split("\n");
  let max = 0;
  for (const line of lines) {
    max = Math.max(max, Math.ceil(ctx.measureText(line).width));
  }
  return max;
}

/** Margen extra: canvas.measureText suele ser algo más estrecho que el dibujo real (cursiva, subpíxeles). */
const WIDTH_SLACK_PX = 10;
const WIDTH_SLACK_ITALIC_PX = 6;

/**
 * Ajusta ancho y alto del textarea al texto con la fuente renderizada (canvas).
 * Sin barras de desplazamiento: overflow oculto y altura = scrollHeight tras fijar ancho.
 *
 * @param {React.RefObject<HTMLTextAreaElement | null>} ref
 * @param {string} value
 * @param {{ enabled?: boolean; minFontPx?: number; maxFontPx?: number }} [opts]
 */
export function useTextareaContentWidth(
  ref,
  value,
  { enabled = false, minFontPx, maxFontPx } = {},
) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const apply = () => {
      const font = buildCanvasFont(el);
      const padX = padXTotal(el);
      const ch = measureChAdvance(font);
      const minContentW = Math.ceil(3 * ch);
      const textW = measureMaxLineWidth(value ?? "", font);
      const cs = getComputedStyle(el);
      const italicSlack =
        cs.fontStyle === "italic" || cs.fontStyle === "oblique"
          ? WIDTH_SLACK_ITALIC_PX
          : 0;
      const innerW =
        Math.max(minContentW, textW) + WIDTH_SLACK_PX + italicSlack;
      el.style.width = `${innerW + padX}px`;
      el.style.overflow = "hidden";
      el.style.height = "auto";
      const minH = parseFloat(getComputedStyle(el).minHeight);
      const setH = () => {
        const h = Math.max(
          Number.isFinite(minH) ? minH : 0,
          el.scrollHeight,
        );
        el.style.height = `${h}px`;
      };
      setH();
      requestAnimationFrame(setH);
    };

    apply();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(apply);
    });
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [ref, value, enabled, minFontPx, maxFontPx]);
}
