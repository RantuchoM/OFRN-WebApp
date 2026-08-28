import {
  STAGE_PLOT_DEFAULT_SIZE,
  getStagePlotCatalogItem,
  stagePlotItemHasInstrumentFootprint,
} from "./stagePlotCatalog";
import {
  STAGE_PLOT_DEFAULT_HEIGHT_CM,
  STAGE_PLOT_DEFAULT_WIDTH_CM,
  STAGE_PLOT_CM_TO_PX,
  STAGE_PLOT_ITEM_DEFAULT_SIZE_CM,
  STAGE_PLOT_ITEM_SCALE_MAX,
  STAGE_PLOT_ITEM_SCALE_MIN,
  STAGE_PLOT_LEGACY_CM_TO_PX,
  clampStagePlotHeightCm,
  clampStagePlotWidthCm,
  inferStagePlotStoredCmToPx,
  stagePlotCmToPx,
  stagePlotConductorPosition,
  stagePlotLegacyScaleFactor,
} from "./stagePlotConstants";
import { getStagePlotItemVisualBounds } from "./stagePlotIconAssets";
import { getStagePlotSilhouettePath } from "./stagePlotSilhouettes";
import {
  normalizeStagePlotFormation,
  resolveFormationFacingPoint,
  rotationFacingPoint,
} from "./stagePlotFormations";
import {
  normalizeStagePlotGroup,
  reconcileStagePlotGroups,
} from "./stagePlotGroups";
import {
  pruneStagePlotDeskPairs,
  reconcileStagePlotDeskPairs,
} from "./stagePlotDeskPairs";

export const STAGE_PLOT_PAYLOAD_VERSION = 1;

/** Rayos de la guía radial (−180°…0° inclusive). */
export const STAGE_PLOT_RADIAL_LINES_DEFAULT = 13;
export const STAGE_PLOT_RADIAL_LINES_MIN = 3;
export const STAGE_PLOT_RADIAL_LINES_MAX = 36;

/** Formato enriquecido limitado para ítems `text` (Konva Text). */
export const STAGE_PLOT_TEXT_DEFAULT_FONT_SIZE = 14;
export const STAGE_PLOT_TEXT_FONT_SIZE_MIN = 8;
export const STAGE_PLOT_TEXT_FONT_SIZE_MAX = 48;
export const STAGE_PLOT_TEXT_FONT_SIZE_PRESETS = [10, 12, 14, 16, 18, 24, 32];
export const STAGE_PLOT_TEXT_COLOR_PRESETS = [
  { value: "#0f172a", label: "Negro" },
  { value: "#334155", label: "Pizarra" },
  { value: "#b91c1c", label: "Rojo" },
  { value: "#1d4ed8", label: "Azul" },
  { value: "#15803d", label: "Verde" },
  { value: "#a16207", label: "Ámbar" },
];

/**
 * @param {unknown} value
 * @returns {'normal'|'bold'|'italic'|'bold italic'}
 */
export function normalizeStagePlotFontStyle(value) {
  const s = String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const bold = s.includes("bold");
  const italic = s.includes("italic");
  if (bold && italic) return "bold italic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "normal";
}

/**
 * @param {unknown} value
 * @returns {'left'|'center'|'right'}
 */
export function normalizeStagePlotTextAlign(value) {
  const s = String(value || "").toLowerCase();
  if (s === "left" || s === "right") return s;
  return "center";
}

/**
 * @param {unknown} value
 */
export function normalizeStagePlotFontSize(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return STAGE_PLOT_TEXT_DEFAULT_FONT_SIZE;
  return Math.min(
    STAGE_PLOT_TEXT_FONT_SIZE_MAX,
    Math.max(STAGE_PLOT_TEXT_FONT_SIZE_MIN, Math.round(n)),
  );
}

/**
 * @param {unknown} value
 */
export function normalizeStagePlotTextFill(value) {
  const s = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase();
  }
  return "#0f172a";
}

/**
 * Campos de formato para ítems tipo texto.
 * @param {Record<string, unknown>} o
 */
export function normalizeStagePlotTextFormat(o) {
  return {
    fontSize: normalizeStagePlotFontSize(o.fontSize),
    fontStyle: normalizeStagePlotFontStyle(o.fontStyle),
    fill: normalizeStagePlotTextFill(o.fill),
    align: normalizeStagePlotTextAlign(o.align),
  };
}

/**
 * Layout local (pre-scale) del ítem texto: caja + tipografía.
 * @param {{ label?: string, fontSize?: number }} item
 * @param {{ w?: number, h?: number }|null} [cat]
 */
export function getStagePlotTextLayout(item, cat = null) {
  const fontSize = normalizeStagePlotFontSize(item?.fontSize);
  const label = String(item?.label ?? "Texto") || "Texto";
  const lines = label.split("\n");
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const contentW = longest * fontSize * 0.58;
  const padX = 8;
  const padY = 6;
  const minW = cat?.w || 56;
  const textW = Math.min(Math.max(contentW + padX * 2, minW), 320);
  const lineH = fontSize * 1.25;
  const textH = Math.max(lines.length * lineH + padY * 2, cat?.h || 28);
  return { fontSize, label, lines, textW, textH, padX, padY, lineH };
}

/**
 * @param {'normal'|'bold'|'italic'|'bold italic'} style
 * @param {'bold'|'italic'} flag
 */
export function toggleStagePlotFontStyle(style, flag) {
  const cur = normalizeStagePlotFontStyle(style);
  const bold = cur.includes("bold");
  const italic = cur.includes("italic");
  const nextBold = flag === "bold" ? !bold : bold;
  const nextItalic = flag === "italic" ? !italic : italic;
  if (nextBold && nextItalic) return "bold italic";
  if (nextBold) return "bold";
  if (nextItalic) return "italic";
  return "normal";
}

export function normalizeStagePlotRadialLines(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return STAGE_PLOT_RADIAL_LINES_DEFAULT;
  return Math.max(
    STAGE_PLOT_RADIAL_LINES_MIN,
    Math.min(STAGE_PLOT_RADIAL_LINES_MAX, n),
  );
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Deriva widthCm/heightCm y px internos desde payload v1 (solo px) o v1+ (cm).
 * Fuente de verdad: widthCm/heightCm. Si faltan, se inferen desde px con la
 * escala guardada (legacy 10 px/cm o ratio width/widthCm); luego se re-derivan
 * px con STAGE_PLOT_CM_TO_PX actual.
 * @param {Record<string, unknown>} stageIn
 */
export function normalizeStagePlotStageDimensions(stageIn) {
  let widthCm = Number(stageIn.widthCm);
  let heightCm = Number(stageIn.heightCm);
  const hasWidthCm = Number.isFinite(widthCm) && widthCm > 0;
  const hasHeightCm = Number.isFinite(heightCm) && heightCm > 0;

  // Prefer each provided cm independently so a widthCm-only patch is not
  // discarded when heightCm is missing (legacy px-only stage objects).
  if (!hasWidthCm || !hasHeightCm) {
    const widthPx = Number(stageIn.width);
    const heightPx = Number(stageIn.height);
    const storedCmToPx = inferStagePlotStoredCmToPx(stageIn);
    const pxPerCm =
      Number.isFinite(storedCmToPx) && storedCmToPx > 0
        ? storedCmToPx
        : STAGE_PLOT_LEGACY_CM_TO_PX;
    const hasWidthPx = Number.isFinite(widthPx) && widthPx > 0;
    const hasHeightPx = Number.isFinite(heightPx) && heightPx > 0;
    if (!hasWidthCm) {
      widthCm = hasWidthPx ? widthPx / pxPerCm : STAGE_PLOT_DEFAULT_WIDTH_CM;
    }
    if (!hasHeightCm) {
      heightCm = hasHeightPx
        ? heightPx / pxPerCm
        : STAGE_PLOT_DEFAULT_HEIGHT_CM;
    }
  }

  widthCm = clampStagePlotWidthCm(widthCm);
  heightCm = clampStagePlotHeightCm(heightCm);

  return {
    widthCm,
    heightCm,
    width: stagePlotCmToPx(widthCm),
    height: stagePlotCmToPx(heightCm),
  };
}

const FORMATION_PARAM_PX_KEYS = ["rx", "ry", "width", "depth", "length"];

/**
 * Reescala coords/params de items y formaciones cuando el payload venía a otra escala px/cm.
 * @param {unknown[]} itemsRaw
 * @param {unknown[]} formationsRaw
 * @param {number} factor
 */
function rescaleStagePlotGeometry(itemsRaw, formationsRaw, factor) {
  if (!Number.isFinite(factor) || Math.abs(factor - 1) < 0.001) {
    return { itemsRaw, formationsRaw };
  }
  const items = (Array.isArray(itemsRaw) ? itemsRaw : []).map((it) => {
    if (!it || typeof it !== "object") return it;
    const o = /** @type {Record<string, unknown>} */ (it);
    const scaleRaw = Number(o.scale);
    const nextScale =
      Number.isFinite(scaleRaw) && scaleRaw > 0 ? scaleRaw * factor : o.scale;
    return {
      ...o,
      x: (Number(o.x) || 0) * factor,
      y: (Number(o.y) || 0) * factor,
      scale: nextScale,
    };
  });
  const formations = (Array.isArray(formationsRaw) ? formationsRaw : []).map(
    (f) => {
      if (!f || typeof f !== "object") return f;
      const o = /** @type {Record<string, unknown>} */ (f);
      const paramsIn =
        o.params && typeof o.params === "object"
          ? /** @type {Record<string, unknown>} */ (o.params)
          : {};
      /** @type {Record<string, unknown>} */
      const params = { ...paramsIn };
      for (const key of FORMATION_PARAM_PX_KEYS) {
        const v = Number(params[key]);
        if (Number.isFinite(v)) params[key] = v * factor;
      }
      return {
        ...o,
        x: (Number(o.x) || 0) * factor,
        y: (Number(o.y) || 0) * factor,
        params,
      };
    },
  );
  return { itemsRaw: items, formationsRaw: formations };
}

/**
 * Fija conductores al centro downstage (tras cambio de tamaño de lienzo).
 * @param {{ type?: string, x?: number, y?: number }[]} items
 * @param {number} stageWidth
 * @param {number} stageHeight
 */
export function pinStagePlotConductors(items, stageWidth, stageHeight) {
  let changed = false;
  const next = (items || []).map((it) => {
    if (it.type !== "conductor") return it;
    const pos = stagePlotConductorPosition(
      stageWidth,
      stageHeight,
      it.scale,
    );
    if (it.x === pos.x && it.y === pos.y) return it;
    changed = true;
    return { ...it, x: pos.x, y: pos.y };
  });
  return changed ? next : items;
}

/**
 * Aplica patch al `stage` y ancla el director si cambió el tamaño del lienzo.
 * @param {ReturnType<typeof normalizeStagePlotPayload>} prev
 * @param {Record<string, unknown>} patch
 */
export function applyStagePlotStagePatch(prev, patch) {
  const merged = { ...prev.stage, ...patch };
  const dims = normalizeStagePlotStageDimensions(merged);
  const newStage = {
    ...merged,
    ...dims,
    showGrid:
      typeof merged.showGrid === "boolean" ? merged.showGrid : true,
    showRadial:
      typeof merged.showRadial === "boolean" ? merged.showRadial : false,
    hideFormationGuides:
      typeof merged.hideFormationGuides === "boolean"
        ? merged.hideFormationGuides
        : false,
    hideChairSquares:
      typeof merged.hideChairSquares === "boolean"
        ? merged.hideChairSquares
        : false,
    radialLines: normalizeStagePlotRadialLines(merged.radialLines),
    id_locacion:
      merged.id_locacion != null &&
      merged.id_locacion !== "" &&
      Number.isFinite(Number(merged.id_locacion)) &&
      Number(merged.id_locacion) > 0
        ? Number(merged.id_locacion)
        : null,
  };

  const prevDims = normalizeStagePlotStageDimensions(prev.stage);
  const sizeChanged =
    patch.widthCm != null ||
    patch.heightCm != null ||
    patch.width != null ||
    patch.height != null ||
    dims.width !== prevDims.width ||
    dims.height !== prevDims.height;

  const items = sizeChanged
    ? pinStagePlotConductors(prev.items, newStage.width, newStage.height)
    : prev.items;

  return { ...prev, stage: newStage, items };
}

export function createEmptyStagePlotPayload() {
  const dims = normalizeStagePlotStageDimensions({});
  return {
    version: STAGE_PLOT_PAYLOAD_VERSION,
    stage: {
      ...dims,
      showGrid: true,
      showRadial: false,
      hideFormationGuides: false,
      hideChairSquares: false,
      radialLines: STAGE_PLOT_RADIAL_LINES_DEFAULT,
      id_locacion: null,
    },
    items: [],
    formations: [],
    groups: [],
    deskPairs: [],
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeStagePlotPayload(raw) {
  const empty = createEmptyStagePlotPayload();
  if (!raw || typeof raw !== "object") return empty;
  const obj = /** @type {Record<string, unknown>} */ (raw);
  const stageIn =
    obj.stage && typeof obj.stage === "object"
      ? /** @type {Record<string, unknown>} */ (obj.stage)
      : {};
  const dims = normalizeStagePlotStageDimensions(stageIn);
  const showGrid =
    typeof stageIn.showGrid === "boolean" ? stageIn.showGrid : true;
  const showRadial =
    typeof stageIn.showRadial === "boolean" ? stageIn.showRadial : false;
  const hideFormationGuides =
    typeof stageIn.hideFormationGuides === "boolean"
      ? stageIn.hideFormationGuides
      : false;
  const hideChairSquares =
    typeof stageIn.hideChairSquares === "boolean"
      ? stageIn.hideChairSquares
      : false;
  const radialLines = normalizeStagePlotRadialLines(stageIn.radialLines);
  const idLocacion =
    stageIn.id_locacion != null && stageIn.id_locacion !== ""
      ? Number(stageIn.id_locacion)
      : null;
  const scaleFactor = stagePlotLegacyScaleFactor(stageIn);
  const { itemsRaw, formationsRaw } = rescaleStagePlotGeometry(
    Array.isArray(obj.items) ? obj.items : [],
    Array.isArray(obj.formations) ? obj.formations : [],
    scaleFactor,
  );
  const items = itemsRaw
    .map((it, idx) => normalizeStagePlotItem(it, idx))
    .filter(Boolean);
  // v1 compatible: sin `formations` → []
  const formations = formationsRaw
    .map((f) => normalizeStagePlotFormation(f))
    .filter(Boolean);
  const groupsRaw = Array.isArray(obj.groups) ? obj.groups : [];
  const groups = groupsRaw
    .map((g) => normalizeStagePlotGroup(g))
    .filter(Boolean);
  const deskPairs = pruneStagePlotDeskPairs(
    Array.isArray(obj.deskPairs) ? obj.deskPairs : [],
  );
  const pinnedItems = pinStagePlotConductors(items, dims.width, dims.height);
  return reconcileStagePlotDeskPairs(
    reconcileStagePlotGroups({
      version: STAGE_PLOT_PAYLOAD_VERSION,
      stage: {
        ...dims,
        showGrid,
        showRadial,
        hideFormationGuides,
        hideChairSquares,
        radialLines,
        id_locacion:
          Number.isFinite(idLocacion) && idLocacion > 0 ? idLocacion : null,
      },
      items: pinnedItems,
      formations,
      groups,
      deskPairs,
    }),
  );
}

/** Deep clone + normalize for undo/redo snapshots. */
export function cloneStagePlotPayload(payload) {
  const raw =
    typeof structuredClone === "function"
      ? structuredClone(payload ?? null)
      : JSON.parse(JSON.stringify(payload ?? null));
  return normalizeStagePlotPayload(raw);
}

/**
 * @param {unknown} it
 * @param {number} idx
 */
function normalizeStagePlotItem(it, idx) {
  if (!it || typeof it !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (it);
  const type = String(o.type || "").trim();
  if (!type) return null;
  const cat = getStagePlotCatalogItem(type);
  const includeDefault = cat ? cat.includeInChannels : false;
  const scaleRaw = Number(o.scale);
  let scale =
    Number.isFinite(scaleRaw) && scaleRaw > 0
      ? Math.min(
          STAGE_PLOT_ITEM_SCALE_MAX,
          Math.max(STAGE_PLOT_ITEM_SCALE_MIN, scaleRaw),
        )
      : 1;
  // Huella 50×80 es tamaño físico en cm a scale=1. Ítems legacy creados con
  // la lógica «~40 cm visual» (scale ≫ 1) se reanclan a 1 para no inflar la huella.
  // Escalas deliberadas del Transformer (≠ default 40 cm) se conservan.
  if (stagePlotItemHasInstrumentFootprint(type) && scale !== 1) {
    const catW = cat?.w || 40;
    const catH = cat?.h || 40;
    const baseMax = Math.max(catW, catH, 1);
    const legacyDefault =
      (STAGE_PLOT_ITEM_DEFAULT_SIZE_CM * STAGE_PLOT_CM_TO_PX) / baseMax;
    if (Math.abs(scale - legacyDefault) < 0.08) {
      scale = 1;
    }
  }
  const slotId =
    o.slotId == null || o.slotId === "" ? null : String(o.slotId);
  const groupId =
    o.groupId == null || o.groupId === "" ? null : String(o.groupId);
  const base = {
    id: String(o.id || newId()),
    type,
    x: Number(o.x) || 0,
    y: Number(o.y) || 0,
    rotation: Number(o.rotation) || 0,
    scale,
    z: Number.isFinite(Number(o.z)) ? Number(o.z) : idx,
    label: o.label != null ? String(o.label) : cat?.name || type,
    notes: o.notes != null ? String(o.notes) : "",
    includeInChannels:
      typeof o.includeInChannels === "boolean"
        ? o.includeInChannels
        : includeDefault,
    slotId,
    ...(groupId ? { groupId } : {}),
  };
  if (type === "text") {
    return { ...base, ...normalizeStagePlotTextFormat(o) };
  }
  return base;
}

/**
 * @param {ReturnType<typeof normalizeStagePlotPayload>} payload
 */
export function deriveStagePlotChannels(payload) {
  const items = [...(payload?.items || [])].sort(
    (a, b) => (a.z ?? 0) - (b.z ?? 0) || String(a.id).localeCompare(String(b.id)),
  );
  let ch = 1;
  return items
    .filter((i) => i.includeInChannels)
    .map((i) => ({
      ch: ch++,
      itemId: i.id,
      label: i.label || getStagePlotCatalogItem(i.type)?.name || i.type,
      notes: i.notes || "",
      type: i.type,
    }));
}

/**
 * Escala inicial: max(drawW, drawH) × scale ≈ STAGE_PLOT_ITEM_DEFAULT_SIZE_CM en px.
 * Instrumentos con huella: scale = 1 (huella fija 50×80 cm).
 * @param {string} type
 */
export function defaultStagePlotItemScale(type) {
  if (stagePlotItemHasInstrumentFootprint(type)) return 1;
  const cat = getStagePlotCatalogItem(type);
  const w = cat?.w || 40;
  const h = cat?.h || 40;
  let bounds;
  if (type === "text") {
    const layout = getStagePlotTextLayout(
      { label: "Texto", fontSize: STAGE_PLOT_TEXT_DEFAULT_FONT_SIZE },
      cat,
    );
    bounds = { drawW: layout.textW, drawH: layout.textH };
  } else {
    const pathD = getStagePlotSilhouettePath(type);
    bounds = pathD
      ? getStagePlotItemVisualBounds(w, h, "silhouette")
      : getStagePlotItemVisualBounds(w, h, "catalog");
  }
  const baseMax = Math.max(bounds.drawW, bounds.drawH, 1);
  const targetPx = STAGE_PLOT_ITEM_DEFAULT_SIZE_CM * STAGE_PLOT_CM_TO_PX;
  const raw = targetPx / baseMax;
  return Math.min(
    STAGE_PLOT_ITEM_SCALE_MAX,
    Math.max(STAGE_PLOT_ITEM_SCALE_MIN, raw),
  );
}

/**
 * @param {string} type
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {{
 *   facingPoint?: { x: number, y: number }|null,
 *   items?: Array,
 *   stage?: object,
 *   rotation?: number,
 * }} [opts]
 */
export function createStagePlotItem(type, x, y, z, opts = {}) {
  const cat = getStagePlotCatalogItem(type);
  let rotation = Number.isFinite(Number(opts.rotation))
    ? Number(opts.rotation)
    : 0;
  if (
    !Number.isFinite(Number(opts.rotation)) &&
    stagePlotItemHasInstrumentFootprint(type)
  ) {
    const facing =
      opts.facingPoint ||
      resolveFormationFacingPoint(opts.items || [], opts.stage || {});
    rotation = rotationFacingPoint(x, y, facing.x, facing.y);
  }
  const item = {
    id: newId(),
    type,
    x,
    y,
    rotation,
    scale: defaultStagePlotItemScale(type),
    z,
    label: cat?.name || type,
    notes: "",
    includeInChannels: cat ? cat.includeInChannels : false,
    slotId: null,
  };
  if (type === "text") {
    return {
      ...item,
      label: "Texto",
      ...normalizeStagePlotTextFormat({}),
    };
  }
  return item;
}
