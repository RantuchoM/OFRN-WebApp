/**
 * Catálogo propio de piezas para Plano de escenario (vista cenital).
 * Siluetas en stagePlotSilhouettes.js (paths SVG propios).
 */

/**
 * @typedef {object} StagePlotCatalogItem
 * @property {string} type
 * @property {string} name
 * @property {string} category
 * @property {string} color
 * @property {number} w
 * @property {number} h
 * @property {boolean} includeInChannels
 */

/** @type {StagePlotCatalogItem[]} */
export const STAGE_PLOT_CATALOG = [
  // Cuerdas (marrones; iconos game-icons tintados)
  { type: "violin", name: "Violín", category: "Cuerdas", color: "#a16207", w: 44, h: 44, includeInChannels: true },
  { type: "viola", name: "Viola", category: "Cuerdas", color: "#92400e", w: 48, h: 48, includeInChannels: true },
  { type: "cello", name: "Cello", category: "Cuerdas", color: "#78350f", w: 52, h: 52, includeInChannels: true },
  { type: "bass", name: "Contrabajo", category: "Cuerdas", color: "#451a03", w: 56, h: 56, includeInChannels: true },
  { type: "harp", name: "Arpa", category: "Cuerdas", color: "#b45309", w: 48, h: 48, includeInChannels: true },
  { type: "guitar", name: "Guitarra", category: "Cuerdas", color: "#92400e", w: 40, h: 56, includeInChannels: true },
  { type: "bandoneon", name: "Bandoneón", category: "Cuerdas", color: "#78350f", w: 56, h: 36, includeInChannels: true },
  // Vientos madera
  { type: "flute", name: "Flauta", category: "Maderas", color: "#0f766e", w: 44, h: 44, includeInChannels: true },
  { type: "oboe", name: "Oboe", category: "Maderas", color: "#0f172a", w: 44, h: 44, includeInChannels: true },
  { type: "clarinet", name: "Clarinete", category: "Maderas", color: "#0f172a", w: 44, h: 44, includeInChannels: true },
  { type: "bassoon", name: "Fagot", category: "Maderas", color: "#134e4a", w: 48, h: 48, includeInChannels: true },
  // Metales
  { type: "horn", name: "Corno", category: "Metales", color: "#ca8a04", w: 44, h: 44, includeInChannels: true },
  { type: "trumpet", name: "Trompeta", category: "Metales", color: "#eab308", w: 44, h: 44, includeInChannels: true },
  { type: "trombone", name: "Trombón", category: "Metales", color: "#a16207", w: 48, h: 48, includeInChannels: true },
  { type: "tuba", name: "Tuba", category: "Metales", color: "#854d0e", w: 48, h: 48, includeInChannels: true },
  // Percusión / teclado
  { type: "timpani", name: "Timbales", category: "Percusión", color: "#b91c1c", w: 48, h: 48, includeInChannels: true },
  { type: "perc", name: "Percusión", category: "Percusión", color: "#991b1b", w: 48, h: 48, includeInChannels: true },
  { type: "bass_drum", name: "Bombo", category: "Percusión", color: "#9f1239", w: 52, h: 48, includeInChannels: true },
  { type: "snare", name: "Caja", category: "Percusión", color: "#be123c", w: 44, h: 44, includeInChannels: true },
  { type: "cymbals", name: "Platillos", category: "Percusión", color: "#e11d48", w: 48, h: 48, includeInChannels: true },
  { type: "xylophone", name: "Xilófono", category: "Percusión", color: "#f43f5e", w: 52, h: 44, includeInChannels: true },
  { type: "tubular_bells", name: "Campanas", category: "Percusión", color: "#fb7185", w: 44, h: 52, includeInChannels: true },
  { type: "piano", name: "Piano", category: "Teclado", color: "#1e293b", w: 56, h: 56, includeInChannels: true },
  { type: "celesta", name: "Celesta", category: "Teclado", color: "#334155", w: 48, h: 48, includeInChannels: true },
  // Escenario / atriles
  { type: "chair", name: "Silla", category: "Escenario", color: "#64748b", w: 40, h: 40, includeInChannels: false },
  { type: "banqueta", name: "Banqueta", category: "Escenario", color: "#78716c", w: 36, h: 36, includeInChannels: false },
  { type: "music_stand", name: "Atril", category: "Escenario", color: "#475569", w: 36, h: 48, includeInChannels: false },
  { type: "conductor", name: "Director", category: "Escenario", color: "#0f172a", w: 40, h: 40, includeInChannels: false },
  { type: "riser", name: "Tarima", category: "Escenario", color: "#94a3b8", w: 64, h: 40, includeInChannels: false },
  // Audio
  { type: "mic", name: "Micrófono", category: "Audio", color: "#1d4ed8", w: 40, h: 40, includeInChannels: true },
  { type: "mic_stand", name: "Pie de mic", category: "Audio", color: "#1e40af", w: 28, h: 48, includeInChannels: false },
  { type: "di", name: "Caja DI", category: "Audio", color: "#0369a1", w: 36, h: 28, includeInChannels: true },
  { type: "wedge", name: "Monitor wedge", category: "Audio", color: "#075985", w: 44, h: 44, includeInChannels: false },
  { type: "speaker", name: "PA / side", category: "Audio", color: "#0c4a6e", w: 40, h: 48, includeInChannels: false },
  // Marcas
  { type: "mark_x", name: "Marca X", category: "Marcas", color: "#dc2626", w: 28, h: 28, includeInChannels: false },
  { type: "text", name: "Texto", category: "Marcas", color: "#334155", w: 72, h: 36, includeInChannels: false },
];

const BY_TYPE = new Map(STAGE_PLOT_CATALOG.map((c) => [c.type, c]));

/** Categorías de instrumento musical (orgánico); no Escenario / Audio / Marcas. */
export const STAGE_PLOT_MUSICIAN_INSTRUMENT_CATEGORIES = new Set([
  "Cuerdas",
  "Maderas",
  "Metales",
  "Percusión",
  "Teclado",
]);

/** Tipos que usan banqueta (no silla): contrabajo + familia percusión del catálogo. */
export const STAGE_PLOT_BANQUETA_INSTRUMENT_TYPES = new Set([
  "bass",
  "timpani",
  "perc",
  "bass_drum",
  "snare",
  "cymbals",
  "xylophone",
  "tubular_bells",
]);

/** @param {string} type */
export function getStagePlotCatalogItem(type) {
  return BY_TYPE.get(type) || null;
}

/**
 * ¿Instrumento musical con huella 50×80 + atril?
 * No aplica a director, silla/banqueta, audio, marcas, atril suelto, tarima.
 * @param {string} type
 */
export function stagePlotItemHasInstrumentFootprint(type) {
  if (!type) return false;
  const cat = getStagePlotCatalogItem(type);
  return Boolean(
    cat && STAGE_PLOT_MUSICIAN_INSTRUMENT_CATEGORIES.has(cat.category),
  );
}

/**
 * Legacy: recuadro-silla detrás del icono.
 * Ya no se dibuja para instrumentos (reemplazado por huella + atril).
 * Conservado por compat PDF/toggle Recuadros; siempre false.
 * @param {string} type
 */
export function stagePlotItemShowsChairSquare(_type) {
  return false;
}

/** @param {string} type */
export function stagePlotItemUsesBanqueta(type) {
  return STAGE_PLOT_BANQUETA_INSTRUMENT_TYPES.has(type);
}

export function stagePlotCategories() {
  const order = [];
  const map = new Map();
  for (const item of STAGE_PLOT_CATALOG) {
    if (!map.has(item.category)) {
      map.set(item.category, []);
      order.push(item.category);
    }
    map.get(item.category).push(item);
  }
  return order.map((category) => ({ category, items: map.get(category) }));
}

export { STAGE_PLOT_DEFAULT_SIZE } from "./stagePlotConstants";
