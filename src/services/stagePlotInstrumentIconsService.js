import { supabase } from "./supabase";
import {
  sanitizeStagePlotSvgMarkup,
  STAGE_PLOT_SVG_MAX_CHARS,
  formatStagePlotSvgMaxChars,
} from "../utils/stagePlotSvgSanitize";
import {
  STAGE_PLOT_ICON_FILES,
  setStagePlotDbIconOverrides,
  setStagePlotDbSizeOverrides,
  clearStagePlotDbIconCache,
} from "../utils/stagePlotIconAssets";
import { getStagePlotCatalogItem } from "../utils/stagePlotCatalog";
import { STAGE_PLOT_SILHOUETTES } from "../utils/stagePlotSilhouettes";
import { slugifyStagePlotType } from "./stagePlotInventarioService";

/** id_instr conocidos (cuerdas) → clave de ícono stage-plot */
export const STAGE_PLOT_ID_INSTR_TO_TYPE = {
  "01": "violin",
  "02": "viola",
  "03": "cello",
  "04": "bass",
  "13": "perc",
  "13a": "timpani",
  "13b": "marimba",
  "13c": "vibraphone",
  "13d": "bass_drum",
  "13e": "snare",
  "13f": "cymbals",
  "13g": "xylophone",
  "13h": "tubular_bells",
  "21": "guitar",
  "22b": "bandoneon",
};

/**
 * Claves de ícono / paleta musicales (stage_plot_type).
 * La clasificación de usuario es `instrumentos.familia`, no este slug.
 * (Escenario / Audio / Marcas / elementos_escenario son material no-instrumento.)
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
  { value: "marimba", label: "Marimba" },
  { value: "vibraphone", label: "Vibráfono" },
  { value: "bass_drum", label: "Bombo" },
  { value: "snare", label: "Caja" },
  { value: "cymbals", label: "Platillos" },
  { value: "xylophone", label: "Xilófono" },
  { value: "tubular_bells", label: "Campanas" },
  { value: "piano", label: "Piano" },
  { value: "celesta", label: "Celesta" },
  { value: "conductor", label: "Director" },
  { value: "bandoneon", label: "Bandoneón" },
];

/** Fallback si no se puede leer `public.familia`. */
export const INSTRUMENTOS_FAMILIA_FALLBACK = [
  "Cuerdas",
  "Maderas",
  "Bronces",
  "Percusión",
  "Prod.",
];

const STAGE_PLOT_TYPE_SLUG_RE = /^[a-z][a-z0-9_]{0,62}$/;

/**
 * @param {string} raw
 * @returns {string|null}
 */
export function normalizeInstrumentStagePlotType(raw) {
  const slug = slugifyStagePlotType(raw);
  if (!slug || !STAGE_PLOT_TYPE_SLUG_RE.test(slug)) return null;
  return slug;
}

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
 * Map tipo → { widthCm, heightCm } desde filas con stage_plot_type / id_instr.
 * @param {Array<{ id?: string, stage_plot_type?: string|null, stage_plot_width_cm?: number|null, stage_plot_height_cm?: number|null }>} rows
 * @returns {Map<string, { widthCm: number, heightCm: number }>}
 */
export function buildStagePlotSizeByType(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const type =
      (row.stage_plot_type && String(row.stage_plot_type).trim()) ||
      STAGE_PLOT_ID_INSTR_TO_TYPE[String(row.id || "").trim()] ||
      null;
    if (!type) continue;
    const w = Number(row.stage_plot_width_cm);
    const h = Number(row.stage_plot_height_cm);
    if (!Number.isFinite(w) && !Number.isFinite(h)) continue;
    if (map.has(type)) continue;
    map.set(type, {
      widthCm: Number.isFinite(w) ? w : 50,
      heightCm: Number.isFinite(h) ? h : Number.isFinite(w) ? w : 50,
    });
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
    .select(
      "id, stage_plot_type, svg_icon, stage_plot_width_cm, stage_plot_height_cm",
    );

  if (error) {
    console.warn("[stagePlotInstrumentIcons]", error.message);
    setStagePlotDbIconOverrides(new Map());
    setStagePlotDbSizeOverrides(new Map());
    return new Map();
  }

  const rows = data || [];
  const svgMap = buildStagePlotSvgByType(rows.filter((r) => r.svg_icon));
  const sizeMap = buildStagePlotSizeByType(rows);
  setStagePlotDbIconOverrides(svgMap);
  setStagePlotDbSizeOverrides(sizeMap);
  return svgMap;
}

/** Invalida cache de imágenes + vuelve a leer DB (tras editar en Datos). */
export async function reloadStagePlotInstrumentIcons() {
  clearStagePlotDbIconCache();
  return loadAndApplyStagePlotInstrumentIcons();
}

/**
 * ¿El instrumento tiene ícono usable de escenario?
 * Requiere clave `stage_plot_type` y al menos uno de: SVG en DB,
 * archivo estático, silueta, o entrada de catálogo.
 * Sin clave y/o sin visual → "Instrumentos sin ícono".
 * @param {{ stage_plot_type?: string|null, svg_icon?: string|null }} row
 */
export function instrumentHasStagePlotIcon(row) {
  const type = String(row?.stage_plot_type || "").trim();
  if (!type) return false;
  if (typeof row?.svg_icon === "string" && row.svg_icon.trim()) return true;
  if (STAGE_PLOT_ICON_FILES[type]) return true;
  if (STAGE_PLOT_SILHOUETTES[type]) return true;
  if (getStagePlotCatalogItem(type)) return true;
  return false;
}

/**
 * Parte filas de `instrumentos` en con ícono / sin ícono.
 * @param {Array} rows
 * @returns {{ withIcon: Array, withoutIcon: Array }}
 */
export function partitionInstrumentosByStagePlotIcon(rows = []) {
  const withIcon = [];
  const withoutIcon = [];
  for (const row of rows || []) {
    if (instrumentHasStagePlotIcon(row)) withIcon.push(row);
    else withoutIcon.push(row);
  }
  return { withIcon, withoutIcon };
}

/**
 * Agrupa filas por `familia` (clasificación de usuario).
 * @param {Array<{ familia?: string|null }>} rows
 * @returns {Array<{ familia: string, rows: Array }>}
 */
export function groupInstrumentosByFamilia(rows = []) {
  const map = new Map();
  for (const row of rows || []) {
    const key =
      row?.familia != null && String(row.familia).trim()
        ? String(row.familia).trim()
        : "Sin familia";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === "Sin familia") return 1;
      if (b === "Sin familia") return -1;
      return a.localeCompare(b, "es");
    })
    .map(([familia, groupRows]) => ({ familia, rows: groupRows }));
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
      error: `SVG demasiado grande (máx. ${formatStagePlotSvgMaxChars()}).`,
    };
  }
  return { ok: true, value: result.svg };
}

/**
 * Carga valores de `public.familia` (FK de instrumentos.familia).
 * @param {import("@supabase/supabase-js").SupabaseClient} [client]
 * @returns {Promise<string[]>}
 */
export async function listInstrumentosFamilias(client = supabase) {
  const { data, error } = await client
    .from("familia")
    .select("familia")
    .order("familia", { ascending: true });
  if (error) {
    console.warn("[instrumentos familias]", error.message);
    return [...INSTRUMENTOS_FAMILIA_FALLBACK];
  }
  const fromDb = (data || [])
    .map((r) => (r?.familia != null ? String(r.familia).trim() : ""))
    .filter(Boolean);
  if (fromDb.length === 0) return [...INSTRUMENTOS_FAMILIA_FALLBACK];
  return fromDb;
}

/**
 * ¿Existe otra fila con el mismo `stage_plot_type`?
 * Variantes pueden compartir clave a propósito (oboe/clarinet/bassoon);
 * al crear se avisa y se prefiere slug único.
 * @param {string} type
 * @param {{ excludeId?: string, client?: import("@supabase/supabase-js").SupabaseClient }} [opts]
 * @returns {Promise<{ taken: boolean, ids: string[] }>}
 */
export async function findInstrumentosByStagePlotType(type, opts = {}) {
  const slug = normalizeInstrumentStagePlotType(type);
  if (!slug) return { taken: false, ids: [] };
  const client = opts.client || supabase;
  let q = client.from("instrumentos").select("id").eq("stage_plot_type", slug);
  if (opts.excludeId != null && String(opts.excludeId).trim() !== "") {
    q = q.neq("id", String(opts.excludeId).trim());
  }
  const { data, error } = await q;
  if (error) throw error;
  const ids = (data || []).map((r) => String(r.id));
  return { taken: ids.length > 0, ids };
}

/**
 * Inserta una fila en `instrumentos` (id manual text PK).
 * Campos requeridos: id, instrumento, familia.
 * `stage_plot_type` opcional; si vacío se sugiere desde el nombre si el slug está libre.
 *
 * @param {{
 *   id: string,
 *   instrumento: string,
 *   familia: string,
 *   stage_plot_type?: string|null,
 *   stage_plot_width_cm?: number|null,
 *   stage_plot_height_cm?: number|null,
 *   svg_icon?: string|null,
 *   abreviatura?: string|null,
 *   plaza_extra?: boolean|null,
 *   rol_gira_default?: string|null,
 *   allowSharedIconKey?: boolean,
 * }} input
 * @param {{ client?: import("@supabase/supabase-js").SupabaseClient }} [opts]
 * @returns {Promise<object>}
 */
export async function createInstrumento(input, opts = {}) {
  const client = opts.client || supabase;
  const id = String(input?.id ?? "").trim();
  const instrumento = String(input?.instrumento ?? "").trim();
  const familia = String(input?.familia ?? "").trim();
  if (!id) throw new Error("ID requerido (código de instrumento, ej. 16 o 22c)");
  if (!instrumento) throw new Error("Nombre requerido");
  if (!familia) throw new Error("Familia requerida");

  let stagePlotType = null;
  const rawType =
    input?.stage_plot_type != null && String(input.stage_plot_type).trim()
      ? String(input.stage_plot_type).trim()
      : "";
  if (rawType) {
    stagePlotType = normalizeInstrumentStagePlotType(rawType);
    if (!stagePlotType) {
      throw new Error(
        "Clave de ícono inválida (slug: a-z, dígitos, _, máx. 63)",
      );
    }
  } else {
    const suggested = normalizeInstrumentStagePlotType(instrumento);
    if (suggested) {
      const { taken } = await findInstrumentosByStagePlotType(suggested, {
        client,
      });
      if (!taken) stagePlotType = suggested;
    }
  }

  if (stagePlotType && !input?.allowSharedIconKey) {
    const { taken, ids } = await findInstrumentosByStagePlotType(stagePlotType, {
      client,
    });
    if (taken) {
      throw new Error(
        `La clave de ícono «${stagePlotType}» ya la usan: ${ids.join(", ")}. Elegí otra o marcá compartir.`,
      );
    }
  }

  let svg = null;
  if (input?.svg_icon != null && String(input.svg_icon).trim()) {
    const prepared = prepareInstrumentSvgIconForSave(input.svg_icon);
    if (!prepared.ok) throw new Error(prepared.error);
    svg = prepared.value;
  }

  const wRaw = input?.stage_plot_width_cm;
  const hRaw = input?.stage_plot_height_cm;
  const w =
    wRaw === "" || wRaw == null ? 50 : Number(wRaw);
  const h =
    hRaw === "" || hRaw == null ? 50 : Number(hRaw);
  if (!Number.isFinite(w) || w <= 0) throw new Error("Ancho inválido (cm)");
  if (!Number.isFinite(h) || h <= 0) throw new Error("Profundo inválido (cm)");

  const payload = {
    id,
    instrumento,
    familia,
    stage_plot_type: stagePlotType,
    stage_plot_width_cm: w,
    stage_plot_height_cm: h,
    svg_icon: svg,
  };
  if (input?.abreviatura != null && String(input.abreviatura).trim()) {
    payload.abreviatura = String(input.abreviatura).trim();
  }
  if (typeof input?.plaza_extra === "boolean") {
    payload.plaza_extra = input.plaza_extra;
  }
  if (input?.rol_gira_default != null && String(input.rol_gira_default).trim()) {
    payload.rol_gira_default = String(input.rol_gira_default).trim();
  }

  const { data, error } = await client
    .from("instrumentos")
    .insert([payload])
    .select(
      "id, instrumento, familia, stage_plot_type, stage_plot_width_cm, stage_plot_height_cm, svg_icon",
    )
    .single();

  if (error) throw error;
  return data;
}
