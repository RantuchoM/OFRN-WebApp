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
 * Ancho = izquierda-derecha local; profundo = atrás→adelante (atril en el frente / +Y local).
 * Icono/SVG cabe en un cuadrado ICON_BOX_CM dentro de la huella (zona músico hacia upstage);
 * la franja frontal DEPTH−ICON_BOX (30 cm) queda para atril (+ línea ATRIL_LINE_CM en el borde +Y).
 */
export const STAGE_PLOT_INSTRUMENT_FOOTPRINT_WIDTH_CM = 50;
export const STAGE_PLOT_INSTRUMENT_FOOTPRINT_DEPTH_CM = 80;
/** Caja del icono/SVG dentro de la huella (cm). */
export const STAGE_PLOT_INSTRUMENT_ICON_BOX_CM = 50;
/** Línea de atril centrada en el borde frontal (hacia el director). */
export const STAGE_PLOT_ATRIL_LINE_CM = 35;

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
 * Origen = centro de la huella; +Y = frente (director).
 * Icono anclado al borde upstage (−Y): ocupa los primeros ICON_BOX_CM de profundidad.
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
  // Centro del icon box: desde el borde trasero (−depth/2) hacia +Y la mitad de la caja.
  const iconOffsetY = -fp.depthPx / 2 + fp.iconBoxPx / 2;
  return {
    ...fp,
    iconOffsetY,
  };
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
