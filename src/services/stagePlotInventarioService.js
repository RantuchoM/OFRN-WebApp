import { supabase } from "./supabase";
import {
  sanitizeStagePlotSvgMarkup,
  STAGE_PLOT_SVG_MAX_CHARS,
  formatStagePlotSvgMaxChars,
} from "../utils/stagePlotSvgSanitize";
import {
  setStagePlotDynamicCatalogItems,
  stagePlotElementCatalogFromRows,
} from "../utils/stagePlotCatalog";
import {
  mergeStagePlotDbIconOverrides,
  mergeStagePlotDbSizeOverrides,
  clearStagePlotImageCache,
} from "../utils/stagePlotIconAssets";
import { STAGE_PLOT_CM_TO_PX } from "../utils/stagePlotConstants";

export const INVENTARIO_CATEGORIAS = [
  { value: "silla", label: "Sillas" },
  { value: "banqueta", label: "Banquetas" },
  { value: "atril", label: "Atriles" },
  { value: "tarima", label: "Tarimas" },
  { value: "elemento", label: "Elementos" },
];

export const INVENTARIO_TARIMA_FORMAS = [
  { value: "rect", label: "Rectangular" },
  { value: "oval", label: "Ovalada" },
];

/**
 * @typedef {object} InventarioItem
 * @property {number} id
 * @property {'silla'|'banqueta'|'atril'|'tarima'|'elemento'} categoria
 * @property {string} nombre
 * @property {number} cantidad
 * @property {number|null} [ancho_cm]
 * @property {number|null} [profundo_cm]
 * @property {'rect'|'oval'|null} [forma]
 * @property {number|null} [elemento_escenario_id]
 * @property {string|null} [notas]
 * @property {object} [elementos_escenario]
 */

/**
 * @typedef {object} ElementoEscenario
 * @property {number} id
 * @property {string} nombre
 * @property {string|null} stage_plot_type
 * @property {string|null} svg_icon
 * @property {number|null} width_cm
 * @property {number|null} height_cm
 * @property {boolean} activo
 */

const ITEM_SELECT =
  "id, categoria, nombre, cantidad, ancho_cm, profundo_cm, forma, elemento_escenario_id, notas, created_at, updated_at, elementos_escenario(id, nombre, stage_plot_type, svg_icon, width_cm, height_cm, activo)";

/** @param {string} raw */
export function slugifyStagePlotType(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^([^a-z])/, "e$1")
    .slice(0, 63);
}

/**
 * Aplica elementos activos al catálogo dinámico + iconos/tamaños.
 * @param {ElementoEscenario[]} rows
 */
export function applyElementosEscenarioToStagePlot(rows = []) {
  const active = (rows || []).filter(
    (r) => r?.activo !== false && r?.stage_plot_type,
  );
  setStagePlotDynamicCatalogItems(
    stagePlotElementCatalogFromRows(active, STAGE_PLOT_CM_TO_PX),
  );

  const svgMap = new Map();
  const sizeMap = new Map();
  for (const row of active) {
    const type = String(row.stage_plot_type || "").trim();
    if (!type) continue;
    if (row.svg_icon) {
      const sanitized = sanitizeStagePlotSvgMarkup(row.svg_icon);
      if (sanitized.ok && sanitized.svg) svgMap.set(type, sanitized.svg);
    }
    const w = Number(row.width_cm);
    const h = Number(row.height_cm);
    if (Number.isFinite(w) || Number.isFinite(h)) {
      sizeMap.set(type, {
        widthCm: Number.isFinite(w) ? w : Number.isFinite(h) ? h : 50,
        heightCm: Number.isFinite(h) ? h : Number.isFinite(w) ? w : 50,
      });
    }
  }
  mergeStagePlotDbIconOverrides(svgMap);
  mergeStagePlotDbSizeOverrides(sizeMap);
  clearStagePlotImageCache();
  return active.length;
}

/** @returns {Promise<ElementoEscenario[]>} */
export async function loadAndApplyElementosEscenario() {
  try {
    const rows = await listElementosEscenario({ onlyActive: true });
    applyElementosEscenarioToStagePlot(rows);
    return rows;
  } catch (err) {
    console.warn("[elementos_escenario]", err?.message || err);
    setStagePlotDynamicCatalogItems([]);
    return [];
  }
}

/** @returns {Promise<InventarioItem[]>} */
export async function listInventarioItems() {
  const { data, error } = await supabase
    .from("inventario_items")
    .select(ITEM_SELECT)
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** @returns {Promise<ElementoEscenario[]>} */
export async function listElementosEscenario({ onlyActive = true } = {}) {
  let q = supabase
    .from("elementos_escenario")
    .select(
      "id, nombre, stage_plot_type, svg_icon, width_cm, height_cm, activo, created_at, updated_at",
    )
    .order("nombre", { ascending: true });
  if (onlyActive) q = q.eq("activo", true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/**
 * @param {number} itemId
 * @param {{ limit?: number }} [opts]
 */
export async function listInventarioLog(itemId, { limit = 20 } = {}) {
  let q = supabase
    .from("inventario_log")
    .select(
      "id, inventario_item_id, user_id, created_at, mensaje, cantidad_anterior, cantidad_nueva, payload",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (itemId != null) q = q.eq("inventario_item_id", itemId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/**
 * @param {object} row
 * @param {{ userId?: number|null, mensaje?: string }} [meta]
 */
export async function createInventarioItem(row, meta = {}) {
  const payload = {
    categoria: row.categoria,
    nombre: String(row.nombre || "").trim() || labelForCategoria(row.categoria),
    cantidad: Math.max(0, Math.floor(Number(row.cantidad) || 0)),
    ancho_cm: row.ancho_cm != null ? Number(row.ancho_cm) : null,
    profundo_cm: row.profundo_cm != null ? Number(row.profundo_cm) : null,
    forma: row.forma || null,
    elemento_escenario_id: row.elemento_escenario_id ?? null,
    notas: row.notas != null ? String(row.notas) : null,
  };
  const { data, error } = await supabase
    .from("inventario_items")
    .insert(payload)
    .select(ITEM_SELECT)
    .single();
  if (error) throw error;
  await appendInventarioLog({
    inventario_item_id: data.id,
    user_id: meta.userId ?? null,
    mensaje: meta.mensaje || "Alta de ítem",
    cantidad_anterior: null,
    cantidad_nueva: data.cantidad,
    payload: { action: "create", row: payload },
  });
  return data;
}

/**
 * @param {number} id
 * @param {Partial<InventarioItem>} patch
 * @param {{ userId?: number|null, mensaje?: string, prev?: InventarioItem|null }} [meta]
 */
export async function updateInventarioItem(id, patch, meta = {}) {
  const prev = meta.prev || null;
  const clean = {};
  if (patch.nombre != null) clean.nombre = String(patch.nombre).trim();
  if (patch.cantidad != null)
    clean.cantidad = Math.max(0, Math.floor(Number(patch.cantidad) || 0));
  if (patch.ancho_cm !== undefined)
    clean.ancho_cm = patch.ancho_cm != null ? Number(patch.ancho_cm) : null;
  if (patch.profundo_cm !== undefined)
    clean.profundo_cm =
      patch.profundo_cm != null ? Number(patch.profundo_cm) : null;
  if (patch.forma !== undefined) clean.forma = patch.forma || null;
  if (patch.elemento_escenario_id !== undefined)
    clean.elemento_escenario_id = patch.elemento_escenario_id;
  if (patch.notas !== undefined)
    clean.notas = patch.notas != null ? String(patch.notas) : null;
  clean.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("inventario_items")
    .update(clean)
    .eq("id", id)
    .select(ITEM_SELECT)
    .single();
  if (error) throw error;

  const qtyChanged =
    prev &&
    Number(prev.cantidad) !== Number(data.cantidad) &&
    Number.isFinite(Number(data.cantidad));
  const notesChanged =
    prev && String(prev.notas || "") !== String(data.notas || "");
  await appendInventarioLog({
    inventario_item_id: data.id,
    user_id: meta.userId ?? null,
    mensaje:
      meta.mensaje ||
      (qtyChanged
        ? `Cantidad ${prev.cantidad} → ${data.cantidad}`
        : notesChanged
          ? "Notas actualizadas"
          : "Ítem actualizado"),
    cantidad_anterior: prev ? Number(prev.cantidad) : null,
    cantidad_nueva: Number(data.cantidad),
    payload: { action: "update", patch: clean },
  });
  return data;
}

/** @param {number} id */
export async function deleteInventarioItem(id, meta = {}) {
  const { error } = await supabase.from("inventario_items").delete().eq("id", id);
  if (error) throw error;
  // Log row cascades on delete; optional orphan note skipped.
  void meta;
}

/**
 * @param {object} row
 * @param {{ userId?: number|null }} [meta]
 */
export async function upsertElementoEscenario(row, meta = {}) {
  let svg = row.svg_icon ?? null;
  if (svg != null && String(svg).trim()) {
    const prepared = sanitizeStagePlotSvgMarkup(svg);
    if (!prepared.ok) throw new Error(prepared.error || "SVG inválido");
    if (prepared.svg && prepared.svg.length > STAGE_PLOT_SVG_MAX_CHARS) {
      throw new Error(
        `SVG demasiado grande (máx. ${formatStagePlotSvgMaxChars()}).`,
      );
    }
    svg = prepared.svg || null;
  } else {
    svg = null;
  }

  const nombre = String(row.nombre || "").trim();
  if (!nombre) throw new Error("Nombre requerido");

  const stagePlotType =
    row.stage_plot_type != null && String(row.stage_plot_type).trim()
      ? slugifyStagePlotType(row.stage_plot_type)
      : slugifyStagePlotType(nombre);
  if (!stagePlotType || stagePlotType.length < 2) {
    throw new Error("Slug (stage_plot_type) inválido");
  }

  const payload = {
    nombre,
    stage_plot_type: stagePlotType,
    svg_icon: svg,
    width_cm: row.width_cm != null ? Number(row.width_cm) : null,
    height_cm: row.height_cm != null ? Number(row.height_cm) : null,
    activo: row.activo !== false,
    updated_at: new Date().toISOString(),
  };

  if (row.id) {
    const { data, error } = await supabase
      .from("elementos_escenario")
      .update(payload)
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) throw error;
    void meta;
    await loadAndApplyElementosEscenario();
    return data;
  }

  const { data, error } = await supabase
    .from("elementos_escenario")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  await loadAndApplyElementosEscenario();
  return data;
}

async function appendInventarioLog(entry) {
  const { error } = await supabase.from("inventario_log").insert({
    inventario_item_id: entry.inventario_item_id,
    user_id:
      entry.user_id != null && Number.isFinite(Number(entry.user_id))
        ? Number(entry.user_id)
        : null,
    mensaje: entry.mensaje || null,
    cantidad_anterior: entry.cantidad_anterior ?? null,
    cantidad_nueva: entry.cantidad_nueva ?? null,
    payload: entry.payload || {},
  });
  if (error) console.warn("[inventario_log]", error.message);
}

export function labelForCategoria(cat) {
  return (
    INVENTARIO_CATEGORIAS.find((c) => c.value === cat)?.label ||
    String(cat || "")
  );
}

/**
 * Stock de silla/banqueta/atril (una fila por categoría).
 * @param {InventarioItem[]} items
 */
export function inventarioSimpleStock(items = []) {
  const out = { silla: 0, banqueta: 0, atril: 0 };
  for (const it of items) {
    if (it.categoria === "silla" || it.categoria === "banqueta" || it.categoria === "atril") {
      out[it.categoria] = Number(it.cantidad) || 0;
    }
  }
  return out;
}

/**
 * Stock total de tarimas (suma de todas las filas por dimensión).
 * @param {InventarioItem[]} items
 */
export function inventarioTarimasStock(items = []) {
  return (items || [])
    .filter((it) => it.categoria === "tarima")
    .reduce((s, it) => s + (Number(it.cantidad) || 0), 0);
}

/**
 * Busca fila de tarima por forma + dims (tolerancia 0.5 cm).
 * @param {InventarioItem[]} items
 * @param {{ forma: string, ancho_cm: number, profundo_cm: number }} dims
 */
export function findInventarioTarimaRow(items, dims) {
  const forma = dims.forma === "oval" ? "oval" : "rect";
  const w = Number(dims.ancho_cm);
  const d = Number(dims.profundo_cm);
  return (
    (items || []).find((it) => {
      if (it.categoria !== "tarima") return false;
      if ((it.forma || "rect") !== forma) return false;
      return (
        Math.abs(Number(it.ancho_cm) - w) < 0.5 &&
        Math.abs(Number(it.profundo_cm) - d) < 0.5
      );
    }) || null
  );
}

/**
 * @param {InventarioItem[]} items
 * @param {string} stagePlotType
 */
export function findInventarioElementoRow(items, stagePlotType) {
  const t = String(stagePlotType || "");
  if (!t) return null;
  return (
    (items || []).find((it) => {
      if (it.categoria !== "elemento") return false;
      const el = it.elementos_escenario;
      return el && String(el.stage_plot_type) === t;
    }) || null
  );
}

/**
 * Cuenta tarimas dibujadas en el payload, agrupadas por forma+dims.
 * @param {Array} stageItems
 * @returns {Map<string, { forma: string, ancho_cm: number, profundo_cm: number, count: number }>}
 */
export function countDrawnTarimasByDims(stageItems = []) {
  /** @type {Map<string, { forma: string, ancho_cm: number, profundo_cm: number, count: number }>} */
  const map = new Map();
  for (const it of stageItems) {
    if (it?.type !== "tarima_rect" && it?.type !== "tarima_oval" && it?.type !== "riser") {
      continue;
    }
    // Dynamic import avoided: dims via organico helper would cycle; inline cm from scale.
    const catW = 800;
    const catH = 400;
    const sx =
      Number.isFinite(Number(it.scaleX)) && Number(it.scaleX) > 0
        ? Number(it.scaleX)
        : it.scale > 0
          ? Number(it.scale)
          : 1;
    const sy =
      Number.isFinite(Number(it.scaleY)) && Number(it.scaleY) > 0
        ? Number(it.scaleY)
        : it.scale > 0
          ? Number(it.scale)
          : 1;
    const ancho_cm = Math.round((catW * sx) / 4);
    const profundo_cm = Math.round((catH * sy) / 4);
    const forma = it.type === "tarima_oval" ? "oval" : "rect";
    const key = `${forma}:${ancho_cm}x${profundo_cm}`;
    const prev = map.get(key);
    if (prev) prev.count += 1;
    else map.set(key, { forma, ancho_cm, profundo_cm, count: 1 });
  }
  return map;
}
