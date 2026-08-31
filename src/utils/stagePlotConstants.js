import { getStagePlotCatalogItem } from "./stagePlotCatalog";
import { getStagePlotItemVisualBounds } from "./stagePlotIconAssets";

/**
 * Escala del lienzo: 1 cm real = STAGE_PLOT_CM_TO_PX unidades lógicas del canvas.
 * Default 360×224 px ↔ 90×56 cm. Max 1600×1200 cm → 6400×4800 px.
 *
 * Legacy payloads usaban 10 px/cm; ver STAGE_PLOT_LEGACY_CM_TO_PX + migración en payload.
 */
export const STAGE_PLOT_CM_TO_PX = 4;

/** Escala histórica (v1) para inferir cm desde width/height px antiguos. */
export const STAGE_PLOT_LEGACY_CM_TO_PX = 10;

export const STAGE_PLOT_DEFAULT_WIDTH_CM = 90;
export const STAGE_PLOT_DEFAULT_HEIGHT_CM = 56;

/** Límites del popover Lienzo (cm). ~4× el máximo anterior (400×300). */
export const STAGE_PLOT_WIDTH_CM_MIN = 40;
export const STAGE_PLOT_WIDTH_CM_MAX = 1600;
export const STAGE_PLOT_HEIGHT_CM_MIN = 30;
export const STAGE_PLOT_HEIGHT_CM_MAX = 1200;

/** Cuadrícula en centímetros (línea menor / mayor). */
export const STAGE_PLOT_GRID_MINOR_CM = 10;
export const STAGE_PLOT_GRID_MAJOR_CM = 50;

/** Director: margen del borde inferior del icono al borde downstage del lienzo (cm). */
export const STAGE_PLOT_CONDUCTOR_DOWNSTAGE_CM = 3;

/** Tamaño visual por defecto al colocar un ítem nuevo (cm → px vía STAGE_PLOT_CM_TO_PX). */
export const STAGE_PLOT_ITEM_DEFAULT_SIZE_CM = 40;

/**
 * Cuadrado de silla (legacy / tipo `chair`): lado = max(bounds) × este factor
 * (coords locales del ítem; el Group ya aplica item.scale).
 */
export const STAGE_PLOT_CHAIR_SQUARE_SCALE = 0.6;

/** Idle (no magnetizado a plaza de formación). */
export const STAGE_PLOT_CHAIR_SQUARE_FILL = "#e2e8f0";
export const STAGE_PLOT_CHAIR_SQUARE_STROKE = "#94a3b8";

/**
 * Magnetizado (`item.slotId` → plaza de formación existente).
 * Índigo lavado (más tenue que plazas/Transformer `#4f46e5`).
 */
export const STAGE_PLOT_CHAIR_SQUARE_MAGNETIZED_FILL = "#e0e7ff";
export const STAGE_PLOT_CHAIR_SQUARE_MAGNETIZED_STROKE = "#818cf8";

/**
 * Huella de instrumentista (cm reales → px vía STAGE_PLOT_CM_TO_PX).
 * Cuadrado 50×50: ancho = X local; profundo = Y local.
 * +Y local = cuello/mástil del SVG; −Y = base/cuerpo (hacia director tras rotación de ítem).
 * Atril satélite: separado de la huella, 40 cm hacia el director desde el centro del ítem (o midpoint del par).
 */
export const STAGE_PLOT_INSTRUMENT_FOOTPRINT_WIDTH_CM = 50;
export const STAGE_PLOT_INSTRUMENT_FOOTPRINT_DEPTH_CM = 50;
/** Caja del icono/SVG dentro de la huella (cm); igual a WIDTH/DEPTH → icono centrado. */
export const STAGE_PLOT_INSTRUMENT_ICON_BOX_CM = 50;

/**
 * Piso del escenario (Rect `stage-plot-bg`). En modo nocturno OFRN el Stage
 * se re-invierte (`.no-dark-invert`); el fill oscuro se pinta a propósito.
 */
export const STAGE_PLOT_BG_FILL = "#f8fafc";
export const STAGE_PLOT_BG_STROKE = "#cbd5e1";
export const STAGE_PLOT_BG_FILL_NIGHT = "#1e293b";
export const STAGE_PLOT_BG_STROKE_NIGHT = "#475569";

/**
 * Cuadrícula cm (mayor 50 / menor 10). Día sobre piso claro; night sobre
 * `STAGE_PLOT_BG_FILL_NIGHT` (Stage `.no-dark-invert` → trazo autorado, no invertido).
 */
export const STAGE_PLOT_GRID_MAJOR_STROKE = "#64748b";
export const STAGE_PLOT_GRID_MINOR_STROKE = "#cbd5e1";
export const STAGE_PLOT_GRID_MAJOR_STROKE_NIGHT = "#cbd5e1";
export const STAGE_PLOT_GRID_MINOR_STROKE_NIGHT = "#94a3b8";
/** Guía radial (origen director). Night: violeta más claro sobre piso oscuro. */
export const STAGE_PLOT_RADIAL_STROKE = "#8b5cf6";
export const STAGE_PLOT_RADIAL_STROKE_NIGHT = "#c4b5fd";

/** Tarimas: tamaño default al colocar (cm reales). Catálogo w/h @ scale 1 = cm × STAGE_PLOT_CM_TO_PX. */
export const STAGE_PLOT_TARIMA_DEFAULT_WIDTH_CM = 200;
export const STAGE_PLOT_TARIMA_DEFAULT_DEPTH_CM = 100;
export const STAGE_PLOT_TARIMA_FILL = "#4b5563";
export const STAGE_PLOT_TARIMA_STROKE = "#1f2937";
/** Medidas de tarima (fuera de la forma): negro legible sobre lienzo claro. */
export const STAGE_PLOT_TARIMA_LABEL_FILL = "#111111";
/** Misma etiqueta sobre piso nocturno (Stage re-invertido). */
export const STAGE_PLOT_TARIMA_LABEL_FILL_NIGHT = "#f1f5f9";

/** Distancia del centro del atril satélite hacia el director (cm). */
export const STAGE_PLOT_ATRIL_DISTANCE_CM = 40;
/** Ancho del plato del atril satélite (cm); algo menor que el legacy 35 cm en borde. */
export const STAGE_PLOT_ATRIL_LINE_CM = 29;
/** Longitud del mástil hacia el músico (cm); base 13 × 0.7. */
export const STAGE_PLOT_ATRIL_SHAFT_CM = 9.1;
/** Longitud de las patas hacia el director (cm); base 15 × 0.7. */
export const STAGE_PLOT_ATRIL_LEG_CM = 10.5;
/** Grosor del plato horizontal (cm); base ~0.75 × 1.4. Solo el borde del atril, no patas. */
export const STAGE_PLOT_ATRIL_PLATE_THICKNESS_CM = 1.05;
/** Grosor visual del plato en px de escena (Konva/PDF fill). */
export const STAGE_PLOT_ATRIL_PLATE_STROKE_PX =
  STAGE_PLOT_ATRIL_PLATE_THICKNESS_CM * STAGE_PLOT_CM_TO_PX;

/** Colores de huella (rect no se dibuja; se conservan por compat / debug). */
export const STAGE_PLOT_FOOTPRINT_FILL = "rgba(241, 245, 249, 0.55)";
export const STAGE_PLOT_FOOTPRINT_STROKE = "#94a3b8";
export const STAGE_PLOT_FOOTPRINT_MAGNETIZED_FILL = "rgba(224, 231, 255, 0.55)";
export const STAGE_PLOT_FOOTPRINT_MAGNETIZED_STROKE = "#818cf8";
export const STAGE_PLOT_ATRIL_LINE_STROKE = "#475569";

/**
 * Lado del cuadrado-silla en coords locales del ítem.
 * @param {number} boundsW
 * @param {number} boundsH
 */
export function stagePlotChairSquareSide(boundsW, boundsH) {
  return Math.max(Number(boundsW) || 0, Number(boundsH) || 0, 1) * STAGE_PLOT_CHAIR_SQUARE_SCALE;
}

/**
 * Huella + atril en px de escenario (@ STAGE_PLOT_CM_TO_PX).
 * @returns {{ widthPx: number, depthPx: number, atrilPx: number, iconBoxPx: number }}
 */
export function stagePlotInstrumentFootprintPx() {
  return {
    widthPx: STAGE_PLOT_INSTRUMENT_FOOTPRINT_WIDTH_CM * STAGE_PLOT_CM_TO_PX,
    depthPx: STAGE_PLOT_INSTRUMENT_FOOTPRINT_DEPTH_CM * STAGE_PLOT_CM_TO_PX,
    atrilPx: STAGE_PLOT_ATRIL_LINE_CM * STAGE_PLOT_CM_TO_PX,
    iconBoxPx: STAGE_PLOT_INSTRUMENT_ICON_BOX_CM * STAGE_PLOT_CM_TO_PX,
  };
}

/**
 * Layout local (pre–item.scale) de huella + caja de icono.
 * Origen = centro de la huella; +Y = borde cuello SVG (atrils en y = +depthPx/2).
 * @returns {{
 *   widthPx: number,
 *   depthPx: number,
 *   atrilPx: number,
 *   iconBoxPx: number,
 *   iconOffsetY: number,
 * }}
 */
export function stagePlotInstrumentFootprintLayout() {
  const fp = stagePlotInstrumentFootprintPx();
  // Si ICON_BOX < DEPTH (layout histórico 50×80), el icono queda anclado upstage.
  const iconOffsetY = -fp.depthPx / 2 + fp.iconBoxPx / 2;
  return {
    ...fp,
    iconOffsetY,
  };
}

/**
 * Escalas por eje de un ítem (`scaleX`/`scaleY` o fallback a `scale` uniforme).
 * @param {{ scale?: number, scaleX?: number, scaleY?: number }|null|undefined} item
 * @returns {{ scaleX: number, scaleY: number }}
 */
export function stagePlotItemAxisScales(item) {
  const itemScale = item?.scale > 0 ? Number(item.scale) : 1;
  const sx =
    Number.isFinite(Number(item?.scaleX)) && Number(item.scaleX) > 0
      ? Number(item.scaleX)
      : itemScale;
  const sy =
    Number.isFinite(Number(item?.scaleY)) && Number(item.scaleY) > 0
      ? Number(item.scaleY)
      : itemScale;
  return { scaleX: sx, scaleY: sy };
}

/**
 * Dimensiones de huella de instrumento en cm (Ancho × Profundo).
 * Base 50×50 @ scale 1; admite `scaleX`/`scaleY` independientes.
 * @param {{ scale?: number, scaleX?: number, scaleY?: number }|null|undefined} item
 * @returns {{ widthCm: number, depthCm: number }}
 */
export function stagePlotInstrumentDimensionsCm(item) {
  const { scaleX, scaleY } = stagePlotItemAxisScales(item);
  return {
    widthCm: Math.round(STAGE_PLOT_INSTRUMENT_FOOTPRINT_WIDTH_CM * scaleX),
    depthCm: Math.round(STAGE_PLOT_INSTRUMENT_FOOTPRINT_DEPTH_CM * scaleY),
  };
}

/**
 * Escalas de ítem desde Ancho/Profundo cm (huella 50×50).
 * @param {number} widthCm
 * @param {number} depthCm
 * @returns {{ scaleX: number, scaleY: number, scale: number }}
 */
export function stagePlotInstrumentScalesFromCm(widthCm, depthCm) {
  const rawSx = Number(widthCm) / STAGE_PLOT_INSTRUMENT_FOOTPRINT_WIDTH_CM;
  const rawSy = Number(depthCm) / STAGE_PLOT_INSTRUMENT_FOOTPRINT_DEPTH_CM;
  const scaleX = Math.min(
    STAGE_PLOT_ITEM_SCALE_MAX,
    Math.max(
      STAGE_PLOT_ITEM_SCALE_MIN,
      Number.isFinite(rawSx) && rawSx > 0 ? rawSx : 1,
    ),
  );
  const scaleY = Math.min(
    STAGE_PLOT_ITEM_SCALE_MAX,
    Math.max(
      STAGE_PLOT_ITEM_SCALE_MIN,
      Number.isFinite(rawSy) && rawSy > 0 ? rawSy : 1,
    ),
  );
  return {
    scaleX,
    scaleY,
    scale: (scaleX + scaleY) / 2,
  };
}

/** Ángulos (rad, 0 = +X): índice 0 = mástil −Y (músico/upstage); 1–2 = par hacia +Y (director). */
const STAGE_PLOT_ATRIL_LEG_ANGLES_RAD = [
  -Math.PI / 2,
  Math.PI / 6,
  (5 * Math.PI) / 6,
];

/**
 * Geometría local del atril satélite (origen = centro del plato).
 * Plato horizontal sobre X; 1 pata −Y (músico); 2 patas abren hacia +Y (director).
 * @param {number} [atrilPx] ancho del plato en px; default desde STAGE_PLOT_ATRIL_LINE_CM
 * @returns {{
 *   plateWidthPx: number,
 *   plateThicknessPx: number,
 *   plate: [number, number, number, number],
 *   legs: Array<[number, number, number, number]>,
 * }}
 */
export function stagePlotSatelliteAtrilGeometry(atrilPx) {
  const platePx =
    atrilPx != null && Number.isFinite(atrilPx)
      ? atrilPx
      : STAGE_PLOT_ATRIL_LINE_CM * STAGE_PLOT_CM_TO_PX;
  const plateThicknessPx = STAGE_PLOT_ATRIL_PLATE_STROKE_PX;
  const cx = 0;
  const cy = 0;
  const shaftLen = STAGE_PLOT_ATRIL_SHAFT_CM * STAGE_PLOT_CM_TO_PX;
  const legLen = STAGE_PLOT_ATRIL_LEG_CM * STAGE_PLOT_CM_TO_PX;
  const legs = STAGE_PLOT_ATRIL_LEG_ANGLES_RAD.map((angle, i) => {
    const len = i === 0 ? shaftLen : legLen;
    return [cx, cy, cx + len * Math.cos(angle), cy + len * Math.sin(angle)];
  });
  return {
    plateWidthPx: platePx,
    plateThicknessPx,
    plate: [-platePx / 2, cy, platePx / 2, cy],
    legs,
  };
}

/**
 * @deprecated Usar stagePlotSatelliteAtrilGeometry. Alias legacy para compat.
 * @param {number} _depthPx ignorado
 * @param {number} atrilPx
 */
export function stagePlotAtrilFootprintGeometry(_depthPx, atrilPx) {
  return stagePlotSatelliteAtrilGeometry(atrilPx);
}

/** Límites de escala por ítem (Transformer + persistencia). */
export const STAGE_PLOT_ITEM_SCALE_MIN = 0.25;
export const STAGE_PLOT_ITEM_SCALE_MAX = 12;

export const STAGE_PLOT_DEFAULT_SIZE = {
  width: STAGE_PLOT_DEFAULT_WIDTH_CM * STAGE_PLOT_CM_TO_PX,
  height: STAGE_PLOT_DEFAULT_HEIGHT_CM * STAGE_PLOT_CM_TO_PX,
};

/** @param {number} cm */
export function stagePlotCmToPx(cm) {
  return cm * STAGE_PLOT_CM_TO_PX;
}

/** @param {number} px */
export function stagePlotPxToCm(px) {
  return px / STAGE_PLOT_CM_TO_PX;
}

/**
 * Infere la escala px/cm con la que se guardó el stage (width/height).
 * Preferir widthCm+width; si solo hay px, asumir escala legacy (10).
 * @param {Record<string, unknown>} stageIn
 */
export function inferStagePlotStoredCmToPx(stageIn) {
  const widthCm = Number(stageIn?.widthCm);
  const heightCm = Number(stageIn?.heightCm);
  const widthPx = Number(stageIn?.width);
  const heightPx = Number(stageIn?.height);

  if (
    Number.isFinite(widthCm) &&
    widthCm > 0 &&
    Number.isFinite(widthPx) &&
    widthPx > 0
  ) {
    return widthPx / widthCm;
  }
  if (
    Number.isFinite(heightCm) &&
    heightCm > 0 &&
    Number.isFinite(heightPx) &&
    heightPx > 0
  ) {
    return heightPx / heightCm;
  }
  if (
    (Number.isFinite(widthPx) && widthPx > 0) ||
    (Number.isFinite(heightPx) && heightPx > 0)
  ) {
    return STAGE_PLOT_LEGACY_CM_TO_PX;
  }
  return STAGE_PLOT_CM_TO_PX;
}

/**
 * Factor para reescalar coords/params px de un payload guardado a la escala actual.
 * @param {Record<string, unknown>} stageIn
 */
export function stagePlotLegacyScaleFactor(stageIn) {
  const stored = inferStagePlotStoredCmToPx(stageIn);
  if (!Number.isFinite(stored) || stored <= 0) return 1;
  const factor = STAGE_PLOT_CM_TO_PX / stored;
  return Math.abs(factor - 1) < 0.001 ? 1 : factor;
}

export function stagePlotGridMinorPx() {
  return stagePlotCmToPx(STAGE_PLOT_GRID_MINOR_CM);
}

export function stagePlotGridMajorPx() {
  return stagePlotCmToPx(STAGE_PLOT_GRID_MAJOR_CM);
}

export function stagePlotConductorDownstageOffsetPx() {
  return stagePlotCmToPx(STAGE_PLOT_CONDUCTOR_DOWNSTAGE_CM);
}

function defaultConductorItemScale() {
  const cat = getStagePlotCatalogItem("conductor");
  const w = cat?.w || 40;
  const h = cat?.h || 40;
  const bounds = getStagePlotItemVisualBounds(w, h, "catalog");
  const baseMax = Math.max(bounds.drawW, bounds.drawH, 1);
  const targetPx = STAGE_PLOT_ITEM_DEFAULT_SIZE_CM * STAGE_PLOT_CM_TO_PX;
  const raw = targetPx / baseMax;
  return Math.min(
    STAGE_PLOT_ITEM_SCALE_MAX,
    Math.max(STAGE_PLOT_ITEM_SCALE_MIN, raw),
  );
}

/**
 * Mitad de la altura visual del director en px de escenario (bounds × scale / 2).
 * @param {number} [scale] escala del ítem; default ≈ 40 cm visual
 */
export function stagePlotConductorVisualHalfHeightPx(scale) {
  const cat = getStagePlotCatalogItem("conductor");
  const w = cat?.w || 40;
  const h = cat?.h || 40;
  const bounds = getStagePlotItemVisualBounds(w, h, "catalog");
  const s =
    Number.isFinite(Number(scale)) && Number(scale) > 0
      ? Number(scale)
      : defaultConductorItemScale();
  return (bounds.drawH * s) / 2;
}

/**
 * Posición canónica del director: centro del ítem (x,y del payload).
 * El borde inferior visual queda a STAGE_PLOT_CONDUCTOR_DOWNSTAGE_CM del downstage.
 * @param {number} width
 * @param {number} height
 * @param {number} [scale] escala del ítem conductor
 */
export function stagePlotConductorPosition(width, height, scale) {
  const halfH = stagePlotConductorVisualHalfHeightPx(scale);
  const marginPx = stagePlotConductorDownstageOffsetPx();
  return {
    x: width / 2,
    y: height - marginPx - halfH,
  };
}

/**
 * Punto “pies” del director (borde inferior visual) — ancla de viewport fit.
 * @param {number} width
 * @param {number} height
 * @param {number} [scale]
 */
export function stagePlotConductorFeetPosition(width, height, scale) {
  const center = stagePlotConductorPosition(width, height, scale);
  const halfH = stagePlotConductorVisualHalfHeightPx(scale);
  return { x: center.x, y: center.y + halfH };
}

/** @param {number} cm @param {number} fallback */
export function clampStagePlotWidthCm(cm, fallback = STAGE_PLOT_DEFAULT_WIDTH_CM) {
  const n = Number(cm);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(
    STAGE_PLOT_WIDTH_CM_MIN,
    Math.min(STAGE_PLOT_WIDTH_CM_MAX, n),
  );
}

/** @param {number} cm @param {number} fallback */
export function clampStagePlotHeightCm(cm, fallback = STAGE_PLOT_DEFAULT_HEIGHT_CM) {
  const n = Number(cm);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(
    STAGE_PLOT_HEIGHT_CM_MIN,
    Math.min(STAGE_PLOT_HEIGHT_CM_MAX, n),
  );
}
