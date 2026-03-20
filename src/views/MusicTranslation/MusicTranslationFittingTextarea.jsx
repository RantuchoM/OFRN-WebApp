import React, { useRef } from "react";
import { useFitTextareaFontSize } from "../../hooks/useFitTextareaFontSize";
import { useTextareaContentWidth } from "../../hooks/useTextareaContentWidth";

/** Guiones “altos” que disparan salto al siguiente segmento (como el espacio). */
function isFlowBreakDashKey(key) {
  return (
    key === "-" ||
    key === "\u2013" ||
    key === "\u2014" ||
    key === "\u2212" ||
    key === "\u2015"
  );
}

/**
 * Textarea cuyo font-size baja automáticamente si el texto desborda el alto/ancho del caja.
 *
 * - `selectAllOnFocus`: al enfocar, selecciona todo (sustituir al teclear).
 * - `autoWidth` (vista estructura): ancho según contenido, con mínimo vía CSS (`min-w-[3ch]`).
 * - Espacio o guión alto (sin Shift): tras insertar el carácter, foco al siguiente segmento
 *   (`focusNextSegment`). Shift+Espacio / Shift+guion no saltan.
 */
export default function MusicTranslationFittingTextarea({
  value,
  minFontPx = 10,
  maxFontPx = 19,
  fitHeightOnly = false,
  autoWidth = false,
  selectAllOnFocus = true,
  segmentLang,
  segmentId,
  focusNextSegment,
  className,
  style,
  onFocus,
  onChange,
  onKeyDown,
  onKeyUp,
  ...rest
}) {
  const DOT_CHAR = "·";
  const NBSP_CHAR = "\u00A0";
  const ref = useRef(null);
  useFitTextareaFontSize(ref, value, {
    minPx: minFontPx,
    maxPx: maxFontPx,
    fitHeightOnly,
  });
  useTextareaContentWidth(ref, value, {
    enabled: autoWidth,
    minFontPx,
    maxFontPx,
  });

  const handleFocus = (e) => {
    if (selectAllOnFocus) {
      requestAnimationFrame(() => {
        const el = e.target;
        if (el && document.activeElement === el) {
          el.select();
        }
      });
    }
    onFocus?.(e);
  };

  const handleKeyUp = (e) => {
    onKeyUp?.(e);
    if (e.defaultPrevented) return;
    if (!focusNextSegment || segmentLang == null || segmentId == null) return;
    if (e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.shiftKey) return;
    // El guion bajo "_" se usa como marcador en el texto y NO debe saltar
    // al siguiente segmento. Miramos el último caracter real del textarea
    // para ser robustos ante diferencias de `event.key` según navegador/teclado.
    const lastChar =
      typeof e.target?.value === "string" ? e.target.value.slice(-1) : "";
    if (lastChar === "_") return;
    // NBSP / representación: no debe disparar salto
    if (lastChar === NBSP_CHAR) return;
    if (lastChar === DOT_CHAR) return;
    const isSpace = e.key === " " || e.code === "Space";
    if (!isSpace && !isFlowBreakDashKey(e.key)) return;
    requestAnimationFrame(() => {
      focusNextSegment(segmentLang, segmentId);
    });
  };

  const handleKeyDown = (e) => {
    // Ctrl+Shift+Espacio -> insertar el punto representando NBSP en el cursor.
    if (e.ctrlKey && e.shiftKey && (e.key === " " || e.code === "Space")) {
      e.preventDefault();
      const target = e.target;
      const el =
        target && typeof target === "object" && "selectionStart" in target
          ? target
          : null;
      if (!el || typeof el.value !== "string") return;

      const start = typeof el.selectionStart === "number" ? el.selectionStart : el.value.length;
      const end = typeof el.selectionEnd === "number" ? el.selectionEnd : start;
      const inserted = DOT_CHAR;
      const next = value.slice(0, start) + inserted + value.slice(end);

      onChange?.({ target: { value: next } });

      // Recolocar cursor tras render.
      requestAnimationFrame(() => {
        try {
          el.selectionStart = el.selectionEnd = start + inserted.length;
        } catch {
          // ignore
        }
      });
      return;
    }

    onKeyDown?.(e);
  };

  const handleChange = (e) => {
    const raw = e?.target?.value;
    const str = typeof raw === "string" ? raw : String(raw ?? "");
    // Normalizamos: si el usuario pega un NBSP real, lo representamos con `·`
    // para que el UI y el sidebar sean consistentes.
    const normalized = str.replaceAll(NBSP_CHAR, DOT_CHAR);
    if (onChange) onChange({ target: { value: normalized } });
  };

  return (
    <textarea
      ref={ref}
      value={value}
      className={className}
      style={{ lineHeight: 1.25, ...style }}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onChange={handleChange}
      {...rest}
    />
  );
}
