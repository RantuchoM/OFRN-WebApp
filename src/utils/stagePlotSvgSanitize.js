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
 *
 * Clipart Adobe Illustrator (OpenClipArt / AI SVG 1.0) suele traer:
 * - `<!DOCTYPE … [ <!ENTITY …> ]>` (el `>` interno rompe un strip naive)
 * - `<switch><foreignObject>…</foreignObject><g>…</g></switch>` (AI PGF)
 * - `xmlns="&ns_svg;"` vía entidades — sin DOCTYPE el XML queda inválido
 * - `<a:midPointStop/>` + attrs `i:` — si se quita `xmlns:a` y quedan los
 *   elementos, Blob→Image / `<img>` falla (prefijo XML no declarado)
 *
 * Se normaliza a un SVG plano usable (sin foreignObject / a:* / i:*) antes del check XSS.
 * @param {string} svg
 */
function compactStagePlotSvg(svg) {
  let out = svg;
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/<\?xml[\s\S]*?\?>/gi, "");
  // DOCTYPE con subset interno opcional `[ … ]` (AI / SVG 1.0)
  out = out.replace(/<!DOCTYPE\b[^[]*(?:\[[\s\S]*?\])?\s*>/gi, "");
  // Fallback AI: foreignObject (PGF) + unwrap <switch> dejando el <g> dibujable
  out = out.replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject>/gi, "");
  out = out.replace(/<\/?switch\b[^>]*>/gi, "");
  // Entidades típicas de export AI (después de quitar el DOCTYPE)
  out = out.replace(/&ns_svg;/gi, "http://www.w3.org/2000/svg");
  out = out.replace(/&ns_xlink;/gi, "http://www.w3.org/1999/xlink");
  out = out.replace(/&ns_[a-z0-9_]+;/gi, "");
  // Bloques de metadata de editores (no afectan el dibujo)
  out = out.replace(
    /<(metadata|sodipodi:namedview|inkscape:perspective)[\s\S]*?<\/\1>/gi,
    "",
  );
  out = out.replace(
    /\s(inkscape|sodipodi|xmlns:(inkscape|sodipodi|rdf|cc|dc)):[^\s"'>/=]+(="[^"]*")?/gi,
    "",
  );
  // Prefijos Adobe Illustrator (i:, graph:, a:, x:)
  out = out.replace(/\s(?:i|graph|a|x):[\w.-]+(?:="[^"]*")?/gi, "");
  out = out.replace(/\sxmlns:(?:i|graph|a|x|v)="[^"]*"/gi, "");
  // Elementos con prefijo Adobe (p. ej. <a:midPointStop/>). Si quedan tras
  // quitar xmlns:a, Blob→Image / <img> falla (XML con prefijo no declarado).
  out = out.replace(/<(?:a|i|graph|x|v):[\w.-]+\b[^>]*\/>/gi, "");
  out = out.replace(
    /<(?:a|i|graph|x|v):[\w.-]+\b[^>]*>[\s\S]*?<\/(?:a|i|graph|x|v):[\w.-]+>/gi,
    "",
  );
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
 * En browser: DOMParser detecta SVG que pasaría sanitize pero no carga en <img>.
 * @param {string} svg
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function assertSvgParsesForImage(svg) {
  if (typeof DOMParser === "undefined") return { ok: true };
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const errNode = doc.querySelector("parsererror");
    if (errNode) {
      return {
        ok: false,
        error:
          "El SVG quedó inválido tras limpiar (XML roto / prefijos Adobe). Probá exportar SVG plano desde Illustrator o Inkscape.",
      };
    }
    const root = doc.documentElement;
    if (!root || String(root.nodeName).toLowerCase() !== "svg") {
      return {
        ok: false,
        error: "Tras limpiar no quedó un elemento <svg> usable.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "No se pudo validar el SVG limpio.",
    };
  }
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, svg: string, cleaned?: boolean } | { ok: false, error: string }}
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
    return {
      ok: false,
      error:
        "No parece un SVG válido: falta el elemento <svg>. Pegá markup o subí un archivo .svg.",
    };
  }

  const beforeCompact = svg;
  svg = compactStagePlotSvg(svg);

  if (svg.length > STAGE_PLOT_SVG_MAX_CHARS) {
    return {
      ok: false,
      error: `SVG demasiado grande tras limpiar (máx. ${formatStagePlotSvgMaxChars()} caracteres). Simplificá el dibujo o exportá con menos detalle.`,
    };
  }

  if (FORBIDDEN_TAGS.test(svg)) {
    return {
      ok: false,
      error:
        "Tras limpiar el archivo, aún quedan etiquetas no permitidas (script, iframe, use…). Exportá como SVG plano desde Illustrator/Inkscape.",
    };
  }

  // Event handlers on*
  if (/\son[a-z]+\s*=/i.test(svg)) {
    return {
      ok: false,
      error:
        "El SVG no puede incluir manejadores de eventos (onclick, onload, …).",
    };
  }

  // javascript: / data:text/html en href/xlink
  if (
    /(href|xlink:href)\s*=\s*["']?\s*(javascript:|data:text\/html)/i.test(svg)
  ) {
    return {
      ok: false,
      error: "El SVG contiene URLs peligrosas (javascript: / data:text/html).",
    };
  }

  // <style> con expression / @import (defensa básica)
  if (/@import\b/i.test(svg) || /expression\s*\(/i.test(svg)) {
    return {
      ok: false,
      error: "El SVG contiene CSS no permitido (@import / expression).",
    };
  }

  // Conservar paints del autor (fill/stroke/gradients). No reescribir a
  // currentColor. El tint de tema solo aplica si el markup ya usa currentColor
  // (siluetas mono / game-icons).

  const parseCheck = assertSvgParsesForImage(svg);
  if (!parseCheck.ok) return parseCheck;

  return {
    ok: true,
    svg,
    cleaned: svg !== beforeCompact,
  };
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
