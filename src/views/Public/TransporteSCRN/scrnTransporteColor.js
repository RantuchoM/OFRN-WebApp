/**
 * Color de marca por fila de scrn_transportes (columna `color`, hex).
 */

export const SCRN_DEFAULT_TRANSPORTE_COLOR = "#64748b";

/**
 * @param {unknown} v valor en BD o input (#rgb / #rrggbb)
 * @returns {string} hex #rrggbb
 */
export function normalizeScrnTransporteColor(v) {
  if (v == null) return SCRN_DEFAULT_TRANSPORTE_COLOR;
  const s = String(v).trim();
  if (!s) return SCRN_DEFAULT_TRANSPORTE_COLOR;
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) {
    return SCRN_DEFAULT_TRANSPORTE_COLOR;
  }
  if (s.length === 4) {
    const r = s[1];
    const g = s[2];
    const b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return s.toLowerCase();
}

function parseHexToRgb(hex) {
  const h = normalizeScrnTransporteColor(hex).slice(1);
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Texto legible sobre fondo sólido (YIQ / luminosidad) */
export function scrnTextOnColor(bgHex) {
  const { r, g, b } = parseHexToRgb(bgHex);
  const y = (r * 299 + g * 587 + b * 114) / 1000;
  return y >= 150 ? "#0f172a" : "#ffffff";
}

/** @param {{ color?: string | null } | null | undefined} t fila o join scrn_transportes */
export function scrnTransporteColorFromEntity(t) {
  if (!t || typeof t !== "object") return SCRN_DEFAULT_TRANSPORTE_COLOR;
  return normalizeScrnTransporteColor(t.color);
}

/** Props para react-big-calendar: estilo de evento según transporte del viaje */
export function rbcEventStyleFromViajeResource(viaje) {
  const bg = scrnTransporteColorFromEntity(viaje?.scrn_transportes);
  const fg = scrnTextOnColor(bg);
  return {
    style: {
      backgroundColor: bg,
      border: `1px solid ${bg}`,
      color: fg,
      borderRadius: "4px",
    },
  };
}

/** Borde izquierdo / acento (tarjetas, listas) */
export function scrnTransporteAccentStyle(t) {
  const c = scrnTransporteColorFromEntity(t);
  return { borderLeftColor: c, borderLeftWidth: 4, borderLeftStyle: "solid" };
}
