import { supabase } from "./supabase";
import {
  sanitizeStagePlotSvgMarkup,
  STAGE_PLOT_SVG_MAX_CHARS,
} from "../utils/stagePlotSvgSanitize";
import {
  setStagePlotDbIconOverrides,
  clearStagePlotDbIconCache,
} from "../utils/stagePlotIconAssets";

/** id_instr conocidos (cuerdas) → tipo catálogo stage-plot */
export const STAGE_PLOT_ID_INSTR_TO_TYPE = {
  "01": "violin",
  "02": "viola",
  "03": "cello",
  "04": "bass",
  "21": "guitar",
};

/**
 * Tipos de catálogo musicales editables desde instrumentos.
 * (Escenario / Audio / Marcas siguen en assets estáticos.)
 */
export const STAGE_PLOT_INSTRUMENT_TYPE_OPTIONS = [
  { value: "violin", label: "Violín" },
  { value: "viola", label: "Viola" },
  { value: "cello", label: "Cello" },
  { value: "bass", label: "Contrabajo" },
  { value: "harp", label: "Arpa" },
  { value: "guitar", label: "Guitarra" },
  { value: "flute", label: "Flauta" },
  { value: "oboe", label: "Oboe" },
  { value: "clarinet", label: "Clarinete" },
  { value: "bassoon", label: "Fagot" },
  { value: "horn", label: "Corno / Trompa" },
  { value: "trumpet", label: "Trompeta" },
  { value: "trombone", label: "Trombón" },
  { value: "tuba", label: "Tuba" },
  { value: "timpani", label: "Timbales" },
  { value: "perc", label: "Percusión" },
  { value: "bass_drum", label: "Bombo" },
  { value: "snare", label: "Caja" },
  { value: "cymbals", label: "Platillos" },
  { value: "xylophone", label: "Xilófono" },
  { value: "tubular_bells", label: "Campanas" },
  { value: "piano", label: "Piano" },
  { value: "celesta", label: "Celesta" },
  { value: "conductor", label: "Director" },
];

/**
 * Construye Map tipo → markup SVG a partir de filas instrumentos.
 * Prioridad: stage_plot_type; fallback id_instr 01–04.
 * @param {Array<{ id?: string, stage_plot_type?: string|null, svg_icon?: string|null }>} rows
 * @returns {Map<string, string>}
 */
export function buildStagePlotSvgByType(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const raw = row?.svg_icon;
    if (!raw || typeof raw !== "string") continue;
    const sanitized = sanitizeStagePlotSvgMarkup(raw);
    if (!sanitized.ok || !sanitized.svg) continue;

    const type =
      (row.stage_plot_type && String(row.stage_plot_type).trim()) ||
      STAGE_PLOT_ID_INSTR_TO_TYPE[String(row.id || "").trim()] ||
      null;
    if (!type) continue;
    if (!map.has(type)) map.set(type, sanitized.svg);
  }
  return map;
}

/**
 * Carga overrides desde DB y los registra en stagePlotIconAssets.
 * @returns {Promise<Map<string, string>>}
 */
export async function loadAndApplyStagePlotInstrumentIcons() {
  const { data, error } = await supabase
    .from("instrumentos")
    .select("id, stage_plot_type, svg_icon")
    .not("svg_icon", "is", null);

  if (error) {
    console.warn("[stagePlotInstrumentIcons]", error.message);
    setStagePlotDbIconOverrides(new Map());
    return new Map();
  }

  const map = buildStagePlotSvgByType(data || []);
  setStagePlotDbIconOverrides(map);
  return map;
}

/** Invalida cache de imágenes + vuelve a leer DB (tras editar en Datos). */
export async function reloadStagePlotInstrumentIcons() {
  clearStagePlotDbIconCache();
  return loadAndApplyStagePlotInstrumentIcons();
}

/**
 * Valida y prepara valor para guardar en instrumentos.svg_icon.
 * @param {unknown} raw
 * @returns {{ ok: true, value: string|null } | { ok: false, error: string }}
 */
export function prepareInstrumentSvgIconForSave(raw) {
  const result = sanitizeStagePlotSvgMarkup(raw);
  if (!result.ok) return result;
  if (!result.svg) return { ok: true, value: null };
  if (result.svg.length > STAGE_PLOT_SVG_MAX_CHARS) {
    return {
      ok: false,
      error: `SVG demasiado grande (máx. ${STAGE_PLOT_SVG_MAX_CHARS}).`,
    };
  }
  return { ok: true, value: result.svg };
}
