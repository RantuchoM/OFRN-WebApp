/**
 * Sanitizado liviano de SVG para siluetas de escenario (texto en DB).
 * No es un SVG sanitizer completo: quita vectores XSS comunes antes de
 * guardar / rasterizar. El render usa Blob → Image (no innerHTML).
 */

export const STAGE_PLOT_SVG_MAX_CHARS = 100_000;

const FORBIDDEN_TAGS =
  /\b(script|foreignObject|foreignobject|iframe|object|embed|link|meta|base|use)\b/i;

/**
 * @param {unknown} raw
 * @returns {{ ok: true, svg: string } | { ok: false, error: string }}
 */
export function sanitizeStagePlotSvgMarkup(raw) {
  if (raw == null || raw === "") {
    return { ok: true, svg: "" };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "El SVG debe ser texto." };
  }
  let svg = raw.trim();
  if (!svg) return { ok: true, svg: "" };

  if (svg.length > STAGE_PLOT_SVG_MAX_CHARS) {
    return {
      ok: false,
      error: `SVG demasiado grande (máx. ${STAGE_PLOT_SVG_MAX_CHARS} caracteres).`,
    };
  }

  // data:image/svg+xml,... pegado por error
  if (/^data:image\/svg\+xml/i.test(svg)) {
    try {
      const comma = svg.indexOf(",");
      const payload = comma >= 0 ? svg.slice(comma + 1) : "";
      svg = /;base64,/i.test(svg.slice(0, comma + 1))
        ? atob(payload)
        : decodeURIComponent(payload);
      svg = String(svg || "").trim();
    } catch {
      return { ok: false, error: "No se pudo decodificar data-URL SVG." };
    }
  }

  if (!/<svg[\s>]/i.test(svg)) {
    return { ok: false, error: "Debe incluir un elemento <svg>…" };
  }

  // Quitar comentarios y CDATA peligrosos triviales
  svg = svg.replace(/<!--[\s\S]*?-->/g, "");

  if (FORBIDDEN_TAGS.test(svg)) {
    return {
      ok: false,
      error: "El SVG contiene etiquetas no permitidas (script, iframe, use, …).",
    };
  }

  // Event handlers on*
  if (/\son[a-z]+\s*=/i.test(svg)) {
    return { ok: false, error: "El SVG no puede incluir manejadores de eventos." };
  }

  // javascript: / data:text/html en href/xlink
  if (
    /(href|xlink:href)\s*=\s*["']?\s*(javascript:|data:text\/html)/i.test(svg)
  ) {
    return { ok: false, error: "El SVG contiene URLs peligrosas." };
  }

  // <style> con expression / @import (defensa básica)
  if (/@import\b/i.test(svg) || /expression\s*\(/i.test(svg)) {
    return { ok: false, error: "El SVG contiene CSS no permitido." };
  }

  // Conservar paints del autor (fill/stroke/gradients). No reescribir a
  // currentColor. El tint de tema solo aplica si el markup ya usa currentColor
  // (siluetas mono / game-icons).

  return { ok: true, svg };
}

/**
 * Preview data-URL seguro (solo tras sanitize).
 * Sustituye `currentColor` si existe; fills hex del autor se dejan igual.
 * @param {string} svg
 * @param {string} [color]
 */
export function stagePlotSvgToDataUrl(svg, color = "#1e293b") {
  if (!svg) return null;
  const prepared = /currentColor/i.test(svg)
    ? String(svg).replace(/currentColor/gi, color)
    : String(svg);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(prepared)}`;
}
