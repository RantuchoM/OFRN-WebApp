/**
 * Sanitizado liviano de SVG para siluetas de escenario (texto en DB).
 * No es un SVG sanitizer completo: quita vectores XSS comunes antes de
 * guardar / rasterizar. El render usa Blob → Image (no innerHTML).
 *
 * Límite de tamaño: app-imposed (no es tope de Postgres `text`). Clipart
 * detallado (bandoneón, etc.) suele superar 100k; 500k deja margen sin
 * abrir de más la superficie XSS / payload en filas de catálogo.
 */

export const STAGE_PLOT_SVG_MAX_CHARS = 500_000;

const FORBIDDEN_TAGS =
  /\b(script|foreignObject|foreignobject|iframe|object|embed|link|meta|base|use)\b/i;

/** Etiqueta de máx. para toasts/UI (es-AR: 500.000). */
export function formatStagePlotSvgMaxChars() {
  return STAGE_PLOT_SVG_MAX_CHARS.toLocaleString("es");
}

/**
 * Compacta markup: quita metadata Inkscape/Adobe, comentarios y whitespace
 * superfluo; recorta precisión decimal en paths (~3 decimales).
 * @param {string} svg
 */
function compactStagePlotSvg(svg) {
  let out = svg;
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/<\?xml[\s\S]*?\?>/gi, "");
  out = out.replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  // Bloques de metadata de editores (no afectan el dibujo)
  out = out.replace(
    /<(metadata|sodipodi:namedview|inkscape:perspective)[\s\S]*?<\/\1>/gi,
    "",
  );
  out = out.replace(/\s(inkscape|sodipodi|xmlns:(inkscape|sodipodi|rdf|cc|dc)):[^\s"'>/=]+(="[^"]*")?/gi, "");
  out = out.replace(/\s{2,}/g, " ");
  out = out.replace(/>\s+</g, "><");
  // Acortar floats en path/d y coordenadas numéricas sueltas (sin tocar ids)
  out = out.replace(
    /(\d+\.\d{4,})/g,
    (m) => String(Math.round(Number(m) * 1000) / 1000),
  );
  return out.trim();
}

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

  svg = compactStagePlotSvg(svg);

  if (svg.length > STAGE_PLOT_SVG_MAX_CHARS) {
    return {
      ok: false,
      error: `SVG demasiado grande (máx. ${formatStagePlotSvgMaxChars()} caracteres).`,
    };
  }

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
