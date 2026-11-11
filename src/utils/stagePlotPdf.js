import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getStagePlotCatalogItem,
  stagePlotItemHasInstrumentFootprint,
  stagePlotItemIsTarima,
  stagePlotItemUsesCatalogBox,
  stagePlotItemShowsChairSquare,
  stagePlotTarimaShape,
} from "./stagePlotCatalog";
import {
  STAGE_PLOT_CHAIR_SQUARE_FILL,
  STAGE_PLOT_CHAIR_SQUARE_STROKE,
  STAGE_PLOT_CHAIR_SQUARE_MAGNETIZED_FILL,
  STAGE_PLOT_CHAIR_SQUARE_MAGNETIZED_STROKE,
  STAGE_PLOT_SOLOIST_STROKE,
  STAGE_PLOT_TARIMA_FILL,
  STAGE_PLOT_TARIMA_STROKE,
  STAGE_PLOT_TARIMA_LABEL_FILL,
  stagePlotChairSquareSide,
  stagePlotGridMajorPx,
  stagePlotGridMinorPx,
  stagePlotInstrumentFootprintLayout,
  stagePlotInstrumentRenderScales,
  STAGE_PLOT_TIMPANI_LABEL_FONT_RATIO,
  normalizeTimpaniSize,
  timpaniHeadLocalOffsetY,
} from "./stagePlotConstants";
import {
  computeStagePlotFurnitureSummary,
  stagePlotFurniturePdfTableBody,
  stagePlotItemIsSoloist,
  stagePlotTarimaDimensionsCm,
} from "./stagePlotOrganico";
import {
  choirFigureSizePx,
  computeChoirFigures,
  computeFormationSlots,
  formationGuideLinePoints,
  formationSlotMarkerSize,
  isChoirFormation,
  parseSlotId,
  resolveFormationFacingPoint,
} from "./stagePlotFormations";
import { loadChoirFigureImages } from "./stagePlotChoirAssets";
import {
  STAGE_PLOT_SILHOUETTE_VIEWBOX,
  getStagePlotSilhouettePath,
} from "./stagePlotSilhouettes";
import {
  fitContainInBox,
  getStagePlotImageNaturalSize,
  loadStagePlotIconImage,
} from "./stagePlotIconAssets";
import {
  getStagePlotTextLayout,
  normalizeStagePlotFontStyle,
  normalizeStagePlotPayload,
  normalizeStagePlotRadialLines,
  normalizeStagePlotTextAlign,
  normalizeStagePlotTextFill,
  readStagePlotLayerOpacities,
} from "./stagePlotPayload";
import {
  drawSoloistOutlineOnCanvas,
  stagePlotSoloistOutlineMetrics,
  stagePlotSoloistOutlinePx,
  getSoloistOutlineCanvas,
} from "./stagePlotSoloistOutline";
import { canShareFiles } from "./downloadBlob";

const VB = STAGE_PLOT_SILHOUETTE_VIEWBOX;
const GRID_MINOR = stagePlotGridMinorPx();
const GRID_MAJOR = stagePlotGridMajorPx();
const GRID_MAJOR_EVERY = GRID_MAJOR / GRID_MINOR;

/** Colores de guías (alineados al lienzo Konva). */
const GRID_MAJOR_RGB = { r: 100, g: 116, b: 139 }; // #64748b @ ~0.9
const GRID_MINOR_RGB = { r: 203, g: 213, b: 225 }; // #cbd5e1 @ ~0.55
const RADIAL_RGB = { r: 139, g: 92, b: 246 }; // #8b5cf6
const FORMATION_LINE_RGB = { r: 100, g: 116, b: 139 }; // #64748b
const SLOT_IDLE_STROKE = "#334155";
const SLOT_FILLED_STROKE = "#4f46e5";
const SLOT_IDLE_FILL = "rgba(255,255,255,0.92)";
const SLOT_FILLED_FILL = "rgba(79,70,229,0.28)";
const SOLOIST_STROKE_RGB = hexToRgb(STAGE_PLOT_SOLOIST_STROKE);

/**
 * Contorno dorado de solista en PDF: silueta opaca (no AABB), vía canvas 2D.
 * @param {import("jspdf").jsPDF} doc
 * @param {CanvasImageSource} source
 * @param {number} cx
 * @param {number} cy
 * @param {number} wMm
 * @param {number} hMm
 * @param {number} rotationDeg
 * @param {boolean} [flipX=false]
 */
function drawSoloistOutlineOnPdf(
  doc,
  source,
  cx,
  cy,
  wMm,
  hMm,
  rotationDeg,
  flipX = false,
) {
  if (typeof document === "undefined" || !source) return;
  const widthMm = Number(wMm);
  const heightMm = Number(hMm);
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) return;
  if (widthMm <= 0 || heightMm <= 0) return;
  const { w: iw, h: ih } = getStagePlotImageNaturalSize(source);
  if (!iw || !ih) return;
  const pxW = Math.max(48, Math.round(widthMm * 6));
  const pxH = Math.max(48, Math.round(heightMm * 6));
  const fit = fitContainInBox(pxW, pxH, iw, ih);
  if (!fit.drawW || !fit.drawH) return;
  const strokePx = stagePlotSoloistOutlinePx(fit.drawW, fit.drawH);
  const outline = getSoloistOutlineCanvas(source, {
    drawW: fit.drawW,
    drawH: fit.drawH,
    strokePx,
    color: STAGE_PLOT_SOLOIST_STROKE,
    punchInterior: true,
  });
  if (!outline) return;
  const { outW, outH } = stagePlotSoloistOutlineMetrics(
    fit.drawW,
    fit.drawH,
    strokePx,
  );
  const padCanvas = Math.ceil(Math.sqrt(outW * outW + outH * outH)) + 4;
  const canvas = document.createElement("canvas");
  canvas.width = padCanvas;
  canvas.height = padCanvas;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.translate(padCanvas / 2, padCanvas / 2);
  if (rotationDeg) ctx.rotate((rotationDeg * Math.PI) / 180);
  if (flipX) ctx.scale(-1, 1);
  ctx.drawImage(outline, -outW / 2, -outH / 2, outW, outH);
  const outMm = padCanvas / 6;
  try {
    doc.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      cx - outMm / 2,
      cy - outMm / 2,
      outMm,
      outMm,
      undefined,
      "FAST",
    );
  } catch (err) {
    console.warn("[stagePlotPdf] soloist outline:", err);
    doc.setDrawColor(
      SOLOIST_STROKE_RGB.r,
      SOLOIST_STROKE_RGB.g,
      SOLOIST_STROKE_RGB.b,
    );
    doc.setLineWidth(0.4);
    doc.rect(cx - widthMm / 2, cy - heightMm / 2, widthMm, heightMm, "S");
  }
}

/**
 * @param {ReturnType<typeof normalizeStagePlotPayload>} payload
 */
function stagePlotDimensionLabel(payload) {
  const widthCm = Math.round(Number(payload.stage.widthCm) || 0);
  const depthCm = Math.round(Number(payload.stage.heightCm) || 0);
  return `Ancho: ${widthCm} cm · Profundo: ${depthCm} cm`;
}

/**
 * @param {unknown} gira
 */
function stagePlotExportSafeName(gira) {
  return (gira?.nomenclador || gira?.nombre_gira || "gira")
    .toString()
    .replace(/[^\w\-]+/g, "_")
    .slice(0, 40);
}

/**
 * @param {unknown} gira
 * @param {string | undefined} plotNombre
 */
function stagePlotExportTitle(gira, plotNombre) {
  const title = [
    "Plano de escenario",
    gira?.mes_letra,
    gira?.nomenclador,
    gira?.nombre_gira,
  ]
    .filter(Boolean)
    .join(" · ");
  return { title, plotNombre: plotNombre ? String(plotNombre) : "" };
}

/**
 * Parte filas en N columnas (relleno vertical: arriba→abajo, luego siguiente col).
 * @template T
 * @param {T[]} rows
 * @param {number} columnCount
 * @returns {T[][]}
 */
function chunkRowsIntoColumns(rows, columnCount) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return [];
  const n = Math.max(1, Math.min(Math.floor(columnCount) || 1, list.length));
  const perCol = Math.ceil(list.length / n);
  /** @type {T[][]} */
  const chunks = [];
  for (let i = 0; i < n; i += 1) {
    const slice = list.slice(i * perCol, (i + 1) * perCol);
    if (slice.length) chunks.push(slice);
  }
  return chunks;
}

/**
 * Cuántas columnas para el desglose de atriles según filas y ancho útil.
 * Portrait A4 (~210 mm): 2 cols cómodas; 3 solo con muchas filas.
 * @param {number} rowCount
 * @param {number} pageWidthMm
 */
function atrilBreakdownColumnCount(rowCount, pageWidthMm) {
  const n = Number(rowCount) || 0;
  if (n <= 3) return 1;
  const w = Number(pageWidthMm) || 0;
  if (n >= 10 && w >= 200) return 3;
  if (n >= 4) return 2;
  return 1;
}

/**
 * PDF: hoja 1 landscape = solo escenario (+ dims). Hoja 2 **portrait** =
 * mobiliario necesario (sillas / banquetas / atriles / podio / tarimas) +
 * desglose de atriles en 1–3 columnas (`stagePlotFurniturePdfTableBody`).
 * Sin channel list ni columnas Orgánico/Plano/Δ.
 *
 * @param {unknown} gira
 * @param {unknown} payloadRaw
 * @param {string} [plotNombre]
 * @param {{ roster?: Array, groups?: Array }} [options]
 */
export async function exportStagePlotPdf(
  gira,
  payloadRaw,
  plotNombre,
  options = {},
) {
  const payload = normalizeStagePlotPayload(payloadRaw);
  const roster = Array.isArray(options.roster) ? options.roster : [];
  const groups =
    options.groups != null ? options.groups : payload.groups || [];
  const furniture = computeStagePlotFurnitureSummary(
    payload.items,
    roster,
    groups,
  );
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const { title, plotNombre: nombre } = stagePlotExportTitle(gira, plotNombre);
  const dimLabel = stagePlotDimensionLabel(payload);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, margin, 12);
  if (nombre) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(nombre, margin, 17);
  }
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado: ${new Date().toLocaleString()}`, pageW - margin, 12, {
    align: "right",
  });

  // Página 1: escenario a casi toda la hoja (sin listado de mobiliario).
  const plotTop = 22;
  const footerReserve = 14;
  const plotH = pageH - plotTop - footerReserve;
  const plotW = pageW - margin * 2;
  doc.setDrawColor(180);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, plotTop, plotW, plotH, "FD");

  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text("PÚBLICO", margin + plotW / 2, plotTop + plotH - 3, {
    align: "center",
  });
  doc.text("FONDO", margin + plotW / 2, plotTop + 5, { align: "center" });
  doc.setTextColor(0);

  const sw = payload.stage.width || 900;
  const sh = payload.stage.height || 560;
  const scale = Math.min(plotW / sw, (plotH - 12) / sh);
  const ox = margin + (plotW - sw * scale) / 2;
  const oy = plotTop + 8;

  const choirImages = await loadChoirFigureImages();
  drawStageGuidesOnPdf(doc, payload, ox, oy, scale, sw, sh, choirImages);
  await drawStageItemsOnPdf(doc, payload, ox, oy, scale);

  // Dimensiones sobre los bordes del rectángulo del escenario (escala real).
  const stageLeft = ox;
  const stageTop = oy;
  const stageRight = ox + sw * scale;
  const stageBottom = oy + sh * scale;
  const stageMidX = (stageLeft + stageRight) / 2;
  const stageMidY = (stageTop + stageBottom) / 2;
  const widthCm = Math.round(Number(payload.stage.widthCm) || 0);
  const depthCm = Math.round(Number(payload.stage.heightCm) || 0);

  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  // Etiquetas sobre los bordes del rect del escenario (dentro del área útil).
  const anchoY = Math.min(stageBottom + 4.5, plotTop + plotH - 1.5);
  doc.text(`Ancho: ${widthCm} cm`, stageMidX, anchoY, { align: "center" });
  doc.text(`Profundo: ${depthCm} cm`, Math.max(stageLeft + 4, margin + 3), stageMidY, {
    align: "center",
    angle: 90,
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text(dimLabel, margin, pageH - 8);
  doc.setTextColor(0);

  doc.setFontSize(6);
  doc.setTextColor(120);
  doc.text(
    "Iconos: game-icons.net (CC BY 3.0). Ver public/stage-plot/ATTRIBUTION.md",
    margin,
    pageH - 4,
  );
  doc.setTextColor(0);

  // Hoja 2 portrait: mobiliario necesario + desglose atriles (1–3 cols) — sin Plano/Δ.
  // jsPDF: addPage(format, orientation) — la forma objeto {orientation} NO rota la página.
  doc.addPage("a4", "portrait");
  const pageW2 = doc.internal.pageSize.getWidth();
  const pageH2 = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Mobiliario / atriles", margin, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(title, margin, 20);
  if (nombre) {
    doc.text(nombre, margin, 24);
  }
  const { furnitureBody, atrilBreakdownBody } =
    stagePlotFurniturePdfTableBody(furniture);
  autoTable(doc, {
    startY: nombre ? 28 : 24,
    head: [["Ítem", "Necesario"]],
    body: furnitureBody,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 28 },
    },
    margin: { left: margin, right: margin },
    tableWidth: pageW2 - margin * 2,
    didParseCell: (data) => {
      // «Tarimas» total row = section header; size rows underneath sum to it.
      if (
        data.section === "body" &&
        data.column.index === 0 &&
        String(data.cell.raw || "").trim() === "Tarimas"
      ) {
        data.cell.styles.fontStyle = "bold";
        if (data.row.cells[1]) data.row.cells[1].styles.fontStyle = "bold";
      }
    },
  });
  let nextY = (doc.lastAutoTable?.finalY || 40) + 8;
  if (atrilBreakdownBody.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text("Desglose de atriles", margin, nextY);
    doc.setTextColor(0);
    const colCount = atrilBreakdownColumnCount(
      atrilBreakdownBody.length,
      pageW2,
    );
    const chunks = chunkRowsIntoColumns(atrilBreakdownBody, colCount);
    const gap = 3.5;
    const usableW = pageW2 - margin * 2;
    const colW =
      (usableW - gap * Math.max(0, chunks.length - 1)) /
      Math.max(1, chunks.length);
    const startY = nextY + 3;
    const tight = chunks.length >= 3;
    const numW = tight ? 12 : 16;
    let maxFinalY = startY;
    for (let i = 0; i < chunks.length; i += 1) {
      const left = margin + i * (colW + gap);
      autoTable(doc, {
        startY,
        head: [["Grupo", "Mús.", "Atr.", "Regla"]],
        body: chunks[i],
        styles: {
          fontSize: tight ? 7 : 8,
          cellPadding: tight ? 1.2 : 1.6,
          overflow: "linebreak",
        },
        headStyles: { fillColor: [71, 85, 105], fontSize: tight ? 7 : 8 },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { halign: "right", cellWidth: numW },
          2: { halign: "right", cellWidth: numW },
          3: { cellWidth: "auto" },
        },
        margin: { left, right: Math.max(margin, pageW2 - left - colW) },
        tableWidth: colW,
      });
      maxFinalY = Math.max(maxFinalY, doc.lastAutoTable?.finalY || startY);
    }
    nextY = maxFinalY + 8;
  }
  const footY = Math.min(nextY, pageH2 - 14);
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text(
    "Cantidades = lo necesario según roster convocado (no compara con el plano). Banquetas: contrabajo + percusionista. Resto: sillas. Director: 1 atril + 1 podio (sin silla). Atriles: ceil(n/2) cuerdas; 1× resto; 1× percusionista; +director. Tarimas: según plano (forma + dims).",
    margin,
    footY,
    { maxWidth: pageW2 - margin * 2 },
  );
  doc.setTextColor(0);

  const safeName = stagePlotExportSafeName(gira);
  doc.save(`plano-escenario_${safeName}.pdf`);
}

/**
 * Raster del escenario (guías + ítems) en canvas 2D.
 * Misma semántica de opacidades que PDF/JPG / Konva Lienzo.
 *
 * @param {unknown} payloadRaw
 * @param {{
 *   maxStagePx?: number,
 *   maxScale?: number,
 *   includeChrome?: boolean,
 *   gira?: unknown,
 *   plotNombre?: string,
 * }} [options]
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderStagePlotToCanvas(payloadRaw, options = {}) {
  if (typeof document === "undefined") {
    throw new Error("renderStagePlotToCanvas requiere DOM");
  }
  const {
    maxStagePx = 1600,
    maxScale = 2,
    includeChrome = false,
    gira = null,
    plotNombre,
  } = options;

  const payload = normalizeStagePlotPayload(payloadRaw);
  const sw = payload.stage.width || 900;
  const sh = payload.stage.height || 560;
  const scale = Math.min(maxStagePx / sw, maxStagePx / sh, maxScale);
  const stageW = Math.round(sw * scale);
  const stageH = Math.round(sh * scale);

  let padX = 8;
  let padTop = 8;
  let padBottom = 8;
  let title = "";
  let nombre = "";
  let dimLabel = "";
  let widthCm = 0;
  let depthCm = 0;

  if (includeChrome) {
    ({ title, plotNombre: nombre } = stagePlotExportTitle(gira, plotNombre));
    dimLabel = stagePlotDimensionLabel(payload);
    widthCm = Math.round(Number(payload.stage.widthCm) || 0);
    depthCm = Math.round(Number(payload.stage.heightCm) || 0);
    padX = 56;
    padTop = nombre ? 72 : 56;
    padBottom = 48;
  }

  const canvasW = padX * 2 + stageW;
  const canvasH = padTop + stageH + padBottom;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear canvas para el escenario");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);

  if (includeChrome) {
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 22px Helvetica, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(title, padX, 16, canvasW - padX * 2);
    if (nombre) {
      ctx.fillStyle = "#64748b";
      ctx.font = "16px Helvetica, Arial, sans-serif";
      ctx.fillText(nombre, padX, 42, canvasW - padX * 2);
    }
  }

  const ox = padX;
  const oy = padTop;
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#b4b4b4";
  ctx.lineWidth = 1;
  ctx.fillRect(ox, oy, stageW, stageH);
  ctx.strokeRect(ox, oy, stageW, stageH);

  ctx.fillStyle = "#64748b";
  ctx.font = `${Math.max(10, Math.round(12 * Math.min(scale, 1)))}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("FONDO", ox + stageW / 2, oy + 14);
  ctx.fillText("PÚBLICO", ox + stageW / 2, oy + stageH - 8);

  const choirImages = await loadChoirFigureImages();
  drawStageGuidesOnCanvas(ctx, payload, ox, oy, scale, sw, sh, choirImages);
  await drawStageItemsOnCanvas(ctx, payload, ox, oy, scale);

  if (includeChrome) {
    ctx.fillStyle = "#334155";
    ctx.font = "bold 13px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`Ancho: ${widthCm} cm`, ox + stageW / 2, oy + stageH + 8);

    ctx.save();
    ctx.translate(ox - 10, oy + stageH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(`Profundo: ${depthCm} cm`, 0, 0);
    ctx.restore();

    ctx.fillStyle = "#64748b";
    ctx.font = "12px Helvetica, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(dimLabel, padX, canvasH - 12);
  }

  return canvas;
}

/**
 * JPG: raster del escenario únicamente (sin hoja de mobiliario) + dims Ancho/Profundo.
 * @returns {Promise<{ blob: Blob, fileName: string }>}
 */
export async function buildStagePlotJpgBlob(gira, payloadRaw, plotNombre) {
  const canvas = await renderStagePlotToCanvas(payloadRaw, {
    maxStagePx: 1600,
    maxScale: 2,
    includeChrome: true,
    gira,
    plotNombre,
  });

  const safeName = stagePlotExportSafeName(gira);
  const fileName = `plano-escenario_${safeName}.jpg`;
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(new Error("No se pudo generar la imagen JPG")),
      "image/jpeg",
      0.92,
    );
  });
  return { blob, fileName };
}

/**
 * Descarga el JPG (misma ruta que antes).
 */
export async function exportStagePlotJpg(gira, payloadRaw, plotNombre) {
  const { blob, fileName } = await buildStagePlotJpgBlob(
    gira,
    payloadRaw,
    plotNombre,
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Comparte / descarga la imagen de la planta para mandarla por WhatsApp.
 * En móvil (Web Share con archivos) abre la hoja nativa → elegir WhatsApp.
 * Si no hay Share API: descarga el JPG y abre WhatsApp con un mensaje
 * para adjuntar la imagen.
 *
 * @returns {Promise<"shared"|"cancelled"|"downloaded-fallback">}
 */
export async function shareStagePlotJpgViaWhatsApp(
  gira,
  payloadRaw,
  plotNombre,
) {
  const { blob, fileName } = await buildStagePlotJpgBlob(
    gira,
    payloadRaw,
    plotNombre,
  );
  const label =
    String(plotNombre || "").trim() ||
    String(gira?.nombre_gira || gira?.nomenclador || "").trim() ||
    "Planta de escenario";
  const text = `Te paso la planta de escenario: ${label}`;
  const file = new File([blob], fileName, {
    type: blob.type || "image/jpeg",
  });

  if (canShareFiles(file)) {
    try {
      await navigator.share({
        files: [file],
        title: label,
        text,
      });
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "cancelled";
      /* fallback a descarga + wa.me */
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);

  const waText = `${text}\n\n(Adjunto la imagen que se acaba de descargar.)`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;
  window.open(waUrl, "_blank", "noopener,noreferrer");
  return "downloaded-fallback";
}

/** Ángulos equiespaciados del abanico radial (−180°…0° inclusive). */
function radialGuideAngles(lineCount) {
  const n = normalizeStagePlotRadialLines(lineCount);
  if (n <= 1) return [-180];
  const step = 180 / (n - 1);
  return Array.from({ length: n }, (_, i) => -180 + i * step);
}

function rayEndpoint(ox, oy, angleDeg, width, height) {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  let t = Infinity;
  if (dx > 1e-6) t = Math.min(t, (width - ox) / dx);
  if (dx < -1e-6) t = Math.min(t, -ox / dx);
  if (dy > 1e-6) t = Math.min(t, (height - oy) / dy);
  if (dy < -1e-6) t = Math.min(t, -oy / dy);
  if (!Number.isFinite(t) || t <= 0) {
    return { x: ox + dx * 120, y: oy + dy * 120 };
  }
  return { x: ox + t * dx, y: oy + t * dy };
}

/**
 * Guías de lienzo (cuadrícula / radial / formaciones) según opacidades de `payload.stage`.
 * Semántica: 0 = oculto, 1 = opaco (ex-toggles OFF/ON).
 * @param {ReturnType<typeof normalizeStagePlotPayload>} payload
 */
function drawStageGuidesOnPdf(doc, payload, ox, oy, scale, sw, sh, choirImages) {
  const op = readStagePlotLayerOpacities(payload.stage || {});
  if (op.gridOpacity > 0) {
    withPdfOpacity(doc, op.gridOpacity, () => {
      drawCentimeterGridOnPdf(doc, ox, oy, scale, sw, sh);
    });
  }
  if (op.radialOpacity > 0) {
    withPdfOpacity(doc, op.radialOpacity, () => {
      drawRadialGuideOnPdf(doc, payload, ox, oy, scale, sw, sh);
    });
  }
  if (op.formationGuidesOpacity > 0) {
    withPdfOpacity(doc, op.formationGuidesOpacity, () => {
      drawFormationGuidesOnPdf(doc, payload, ox, oy, scale, choirImages);
    });
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<typeof normalizeStagePlotPayload>} payload
 */
function drawStageGuidesOnCanvas(ctx, payload, ox, oy, scale, sw, sh, choirImages) {
  const op = readStagePlotLayerOpacities(payload.stage || {});
  if (op.gridOpacity > 0) {
    ctx.save();
    ctx.globalAlpha *= op.gridOpacity;
    drawCentimeterGridOnCanvas(ctx, ox, oy, scale, sw, sh);
    ctx.restore();
  }
  if (op.radialOpacity > 0) {
    ctx.save();
    ctx.globalAlpha *= op.radialOpacity;
    drawRadialGuideOnCanvas(ctx, payload, ox, oy, scale, sw, sh);
    ctx.restore();
  }
  if (op.formationGuidesOpacity > 0) {
    ctx.save();
    ctx.globalAlpha *= op.formationGuidesOpacity;
    drawFormationGuidesOnCanvas(ctx, payload, ox, oy, scale, choirImages);
    ctx.restore();
  }
}

/** jsPDF graphics-state opacity wrapper (fill + stroke). */
function withPdfOpacity(doc, opacity, drawFn) {
  const a = Math.min(1, Math.max(0, Number(opacity) || 0));
  if (!(a > 0)) return;
  if (a >= 0.999 || typeof doc.GState !== "function") {
    drawFn();
    return;
  }
  const canSave = typeof doc.saveGraphicsState === "function";
  const canRestore = typeof doc.restoreGraphicsState === "function";
  if (canSave) doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: a, stroke: a, fill: a }));
  drawFn();
  if (canRestore) doc.restoreGraphicsState();
}

function drawCentimeterGridOnPdf(doc, ox, oy, scale, sw, sh) {
  const w = Math.round(sw);
  const h = Math.round(sh);
  for (let i = 0, x = 0; x <= w; i += 1, x = i * GRID_MINOR) {
    const major = i % GRID_MAJOR_EVERY === 0;
    const rgb = major ? GRID_MAJOR_RGB : GRID_MINOR_RGB;
    doc.setDrawColor(rgb.r, rgb.g, rgb.b);
    doc.setLineWidth(major ? 0.28 : 0.15);
    doc.line(ox + x * scale, oy, ox + x * scale, oy + h * scale);
  }
  for (let j = 0, y = 0; y <= h; j += 1, y = j * GRID_MINOR) {
    const major = j % GRID_MAJOR_EVERY === 0;
    const rgb = major ? GRID_MAJOR_RGB : GRID_MINOR_RGB;
    doc.setDrawColor(rgb.r, rgb.g, rgb.b);
    doc.setLineWidth(major ? 0.28 : 0.15);
    doc.line(ox, oy + y * scale, ox + w * scale, oy + y * scale);
  }
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
}

function drawCentimeterGridOnCanvas(ctx, ox, oy, scale, sw, sh) {
  const w = Math.round(sw);
  const h = Math.round(sh);
  ctx.save();
  for (let i = 0, x = 0; x <= w; i += 1, x = i * GRID_MINOR) {
    const major = i % GRID_MAJOR_EVERY === 0;
    ctx.strokeStyle = major
      ? "rgba(100,116,139,0.9)"
      : "rgba(203,213,225,0.55)";
    ctx.lineWidth = major ? 1.25 : 1;
    ctx.beginPath();
    ctx.moveTo(ox + x * scale, oy);
    ctx.lineTo(ox + x * scale, oy + h * scale);
    ctx.stroke();
  }
  for (let j = 0, y = 0; y <= h; j += 1, y = j * GRID_MINOR) {
    const major = j % GRID_MAJOR_EVERY === 0;
    ctx.strokeStyle = major
      ? "rgba(100,116,139,0.9)"
      : "rgba(203,213,225,0.55)";
    ctx.lineWidth = major ? 1.25 : 1;
    ctx.beginPath();
    ctx.moveTo(ox, oy + y * scale);
    ctx.lineTo(ox + w * scale, oy + y * scale);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRadialGuideOnPdf(doc, payload, ox, oy, scale, sw, sh) {
  const origin = resolveFormationFacingPoint(payload.items, payload.stage);
  const angles = radialGuideAngles(payload.stage?.radialLines);
  doc.setDrawColor(RADIAL_RGB.r, RADIAL_RGB.g, RADIAL_RGB.b);
  doc.setLineWidth(0.35);
  for (const deg of angles) {
    const end = rayEndpoint(origin.x, origin.y, deg, sw, sh);
    doc.line(
      ox + origin.x * scale,
      oy + origin.y * scale,
      ox + end.x * scale,
      oy + end.y * scale,
    );
  }
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
}

function drawRadialGuideOnCanvas(ctx, payload, ox, oy, scale, sw, sh) {
  const origin = resolveFormationFacingPoint(payload.items, payload.stage);
  const angles = radialGuideAngles(payload.stage?.radialLines);
  ctx.save();
  ctx.strokeStyle = "rgba(139,92,246,0.88)";
  ctx.lineWidth = 1.5;
  for (const deg of angles) {
    const end = rayEndpoint(origin.x, origin.y, deg, sw, sh);
    ctx.beginPath();
    ctx.moveTo(ox + origin.x * scale, oy + origin.y * scale);
    ctx.lineTo(ox + end.x * scale, oy + end.y * scale);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {ReturnType<typeof normalizeStagePlotPayload>} payload
 */
function drawFormationGuidesOnPdf(doc, payload, ox, oy, scale, choirImages) {
  const formations = payload.formations || [];
  if (!formations.length) return;
  const occupied = new Set(
    (payload.items || []).map((it) => it.slotId).filter(Boolean).map(String),
  );
  const marker = formationSlotMarkerSize();
  const markerMm = marker * scale;

  for (const formation of formations) {
    const facing = resolveFormationFacingPoint(
      payload.items,
      payload.stage,
      formation.facing,
    );
    const linePts = formationGuideLinePoints(formation);
    if (linePts.length >= 4) {
      doc.setDrawColor(
        FORMATION_LINE_RGB.r,
        FORMATION_LINE_RGB.g,
        FORMATION_LINE_RGB.b,
      );
      doc.setLineWidth(0.4);
      for (let i = 0; i + 3 < linePts.length; i += 2) {
        doc.line(
          ox + linePts[i] * scale,
          oy + linePts[i + 1] * scale,
          ox + linePts[i + 2] * scale,
          oy + linePts[i + 3] * scale,
        );
      }
    }

    if (isChoirFormation(formation)) {
      drawChoirFiguresOnPdf(doc, formation, facing, ox, oy, scale, choirImages);
      continue;
    }
    const slots = computeFormationSlots(formation, facing);
    for (const slot of slots) {
      const filled = occupied.has(String(slot.slotId));
      drawSlotMarkerOnPdf(
        doc,
        ox + slot.x * scale,
        oy + slot.y * scale,
        markerMm,
        Number(slot.rotation) || 0,
        filled,
      );
    }
  }
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<typeof normalizeStagePlotPayload>} payload
 */
function drawFormationGuidesOnCanvas(ctx, payload, ox, oy, scale, choirImages) {
  const formations = payload.formations || [];
  if (!formations.length) return;
  const occupied = new Set(
    (payload.items || []).map((it) => it.slotId).filter(Boolean).map(String),
  );
  const marker = formationSlotMarkerSize();
  const markerPx = marker * scale;

  for (const formation of formations) {
    const facing = resolveFormationFacingPoint(
      payload.items,
      payload.stage,
      formation.facing,
    );
    const linePts = formationGuideLinePoints(formation);
    if (linePts.length >= 4) {
      ctx.save();
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(ox + linePts[0] * scale, oy + linePts[1] * scale);
      for (let i = 2; i + 1 < linePts.length; i += 2) {
        ctx.lineTo(ox + linePts[i] * scale, oy + linePts[i + 1] * scale);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (isChoirFormation(formation)) {
      drawChoirFiguresOnCanvas(ctx, formation, facing, ox, oy, scale, choirImages);
      continue;
    }
    const slots = computeFormationSlots(formation, facing);
    for (const slot of slots) {
      const filled = occupied.has(String(slot.slotId));
      drawSlotMarkerOnCanvas(
        ctx,
        ox + slot.x * scale,
        oy + slot.y * scale,
        markerPx,
        Number(slot.rotation) || 0,
        filled,
      );
    }
  }
}

function choirFigureDrawSize(person, image, scale) {
  const box = choirFigureSizePx(person.scale);
  const ih = image?.naturalHeight || image?.height || 0;
  const iw = image?.naturalWidth || image?.width || 0;
  if (!iw || !ih) return null;
  const h = box.heightPx * scale;
  return { w: h * (iw / ih), h };
}

function drawChoirFiguresOnPdf(doc, formation, facing, ox, oy, scale, choirImages) {
  for (const person of computeChoirFigures(formation, facing)) {
    const image = person.variant === "man" ? choirImages?.man : choirImages?.woman;
    const size = choirFigureDrawSize(person, image, scale);
    if (!image || !size) continue;
    drawImageRotated(
      doc,
      image,
      ox + person.x * scale,
      oy + person.y * scale,
      size.w,
      size.h,
      person.rotation,
      person.flipX,
    );
  }
}

function drawChoirFiguresOnCanvas(ctx, formation, facing, ox, oy, scale, choirImages) {
  for (const person of computeChoirFigures(formation, facing)) {
    const image = person.variant === "man" ? choirImages?.man : choirImages?.woman;
    const size = choirFigureDrawSize(person, image, scale);
    if (!image || !size) continue;
    drawImageRotatedOnCanvas(
      ctx,
      image,
      ox + person.x * scale,
      oy + person.y * scale,
      size.w,
      size.h,
      person.rotation,
      person.flipX,
    );
  }
}

function drawSlotMarkerOnPdf(doc, cx, cy, sideMm, rotationDeg, filled) {
  if (typeof document === "undefined") return;
  const px = Math.max(24, Math.round(sideMm * 6));
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawSlotMarkerOnCanvas(ctx, px / 2, px / 2, px - 2, rotationDeg, filled);
  doc.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    cx - sideMm / 2,
    cy - sideMm / 2,
    sideMm,
    sideMm,
    undefined,
    "FAST",
  );
}

function drawSlotMarkerOnCanvas(ctx, cx, cy, sidePx, rotationDeg, filled) {
  ctx.save();
  ctx.translate(cx, cy);
  if (rotationDeg) ctx.rotate((rotationDeg * Math.PI) / 180);
  const half = sidePx / 2;
  ctx.fillStyle = filled ? SLOT_FILLED_FILL : SLOT_IDLE_FILL;
  ctx.strokeStyle = filled ? SLOT_FILLED_STROKE : SLOT_IDLE_STROKE;
  ctx.lineWidth = 2;
  ctx.fillRect(-half, -half, sidePx, sidePx);
  ctx.strokeRect(-half, -half, sidePx, sidePx);
  ctx.restore();
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {ReturnType<typeof normalizeStagePlotPayload>} payload
 */
async function drawStageItemsOnPdf(doc, payload, ox, oy, scale) {
  const sorted = [...payload.items].sort((a, b) => {
    const aT = stagePlotItemIsTarima(a.type) ? 0 : 1;
    const bT = stagePlotItemIsTarima(b.type) ? 0 : 1;
    if (aT !== bT) return aT - bT;
    return (a.z ?? 0) - (b.z ?? 0);
  });
  const formationIdSet = new Set(
    (payload.formations || []).map((f) => String(f.id)),
  );
  const chairOp = readStagePlotLayerOpacities(payload.stage || {})
    .chairSquaresOpacity;
  for (const item of sorted) {
    const cat = getStagePlotCatalogItem(item.type);
    const itemScale = stagePlotItemUsesCatalogBox(item.type)
      ? 1
      : item.scale > 0
        ? item.scale
        : 1;
    const cx = ox + item.x * scale;
    const cy = oy + item.y * scale;
    const hex = cat?.color || "#334155";
    const rgb = hexToRgb(hex);
    const rotation = Number(item.rotation) || 0;

    if (item.type === "text") {
      const layout = getStagePlotTextLayout(item, cat);
      const wMm = layout.textW * scale * itemScale;
      const hMm = layout.textH * scale * itemScale;
      drawTextItemOnPdf(doc, item, layout, cx, cy, wMm, hMm, rotation);
      continue;
    }

    if (stagePlotItemIsTarima(item.type)) {
      drawTarimaOnPdf(doc, item, cat, cx, cy, scale, rotation);
      continue;
    }

    const wMm = (cat?.w || 40) * scale * itemScale;
    const hMm = (cat?.h || 40) * scale * itemScale;
    const slotParsed = parseSlotId(item.slotId);
    const magnetized = Boolean(
      slotParsed && formationIdSet.has(slotParsed.formationId),
    );

    if (stagePlotItemHasInstrumentFootprint(item.type)) {
      const fp = stagePlotInstrumentFootprintLayout();
      const { scaleX: sx, scaleY: sy } = stagePlotInstrumentRenderScales(item);
      const iconBoxW = fp.iconBoxPx * scale * sx;
      const iconBoxH = fp.iconBoxPx * scale * sy;
      const iconOffY = fp.iconOffsetY * scale * sy;
      const rad = (rotation * Math.PI) / 180;
      const iconCx = cx - iconOffY * Math.sin(rad);
      const iconCy = cy + iconOffY * Math.cos(rad);
      const paintTimpani = timpaniSizePaintLocal(item);
      const isSoloist = stagePlotItemIsSoloist(item);
      const iconImg = await loadStagePlotIconImage(item.type, hex);
      if (iconImg) {
        if (isSoloist) {
          drawSoloistOutlineOnPdf(
            doc,
            iconImg,
            iconCx,
            iconCy,
            iconBoxW,
            iconBoxH,
            rotation,
            item.flipX === true,
          );
        }
        drawImageRotated(
          doc,
          iconImg,
          iconCx,
          iconCy,
          iconBoxW,
          iconBoxH,
          rotation,
          item.flipX === true,
          paintTimpani,
        );
      } else {
        const pathD = getStagePlotSilhouettePath(item.type);
        if (pathD) {
          drawSilhouetteOnPdf(
            doc,
            pathD,
            iconCx,
            iconCy,
            iconBoxW,
            iconBoxH,
            rotation,
            rgb,
            item.flipX === true,
            paintTimpani,
            isSoloist,
          );
        } else {
          doc.setFillColor(rgb.r, rgb.g, rgb.b);
          doc.setDrawColor(
            isSoloist ? SOLOIST_STROKE_RGB.r : 30,
            isSoloist ? SOLOIST_STROKE_RGB.g : 30,
            isSoloist ? SOLOIST_STROKE_RGB.b : 30,
          );
          doc.setLineWidth(isSoloist ? 0.55 : 0.2);
          doc.rect(
            iconCx - iconBoxW / 2,
            iconCy - iconBoxH / 2,
            iconBoxW,
            iconBoxH,
            "FD",
          );
        }
      }
      continue;
    }

    if (chairOp > 0 && stagePlotItemShowsChairSquare(item.type)) {
      const chairMm = stagePlotChairSquareSide(wMm, hMm);
      drawChairSquareOnPdf(doc, cx, cy, chairMm, rotation, magnetized, chairOp);
    }

    const iconImg = await loadStagePlotIconImage(item.type, hex);
    if (iconImg) {
      drawImageRotated(
        doc,
        iconImg,
        cx,
        cy,
        wMm,
        hMm,
        rotation,
        item.flipX === true,
      );
    } else {
      const pathD = getStagePlotSilhouettePath(item.type);
      if (pathD) {
        drawSilhouetteOnPdf(
          doc,
          pathD,
          cx,
          cy,
          wMm,
          hMm,
          rotation,
          rgb,
          item.flipX === true,
        );
      } else {
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.setDrawColor(30);
        doc.rect(cx - wMm / 2, cy - hMm / 2, wMm, hMm, "FD");
      }
    }
  }
}

/**
 * @param {import("jspdf").jsPDF} doc
 */
function drawTarimaOnPdf(doc, item, cat, cx, cy, scale, rotation) {
  const sx =
    Number.isFinite(Number(item.scaleX)) && Number(item.scaleX) > 0
      ? Number(item.scaleX)
      : item.scale > 0
        ? Number(item.scale)
        : 1;
  const sy =
    Number.isFinite(Number(item.scaleY)) && Number(item.scaleY) > 0
      ? Number(item.scaleY)
      : item.scale > 0
        ? Number(item.scale)
        : 1;
  const wMm = (cat?.w || 800) * scale * sx;
  const hMm = (cat?.h || 400) * scale * sy;
  const fill = hexToRgb(STAGE_PLOT_TARIMA_FILL);
  const stroke = hexToRgb(STAGE_PLOT_TARIMA_STROKE);
  const dims = stagePlotTarimaDimensionsCm(item);
  const shape = stagePlotTarimaShape(item.type);
  if (typeof document !== "undefined") {
    const pxW = Math.max(64, Math.round(wMm * 6));
    const pxH = Math.max(64, Math.round(hMm * 6));
    const fontPx = Math.max(12, Math.min(22, Math.min(pxW, pxH) / 9));
    const labelPad = Math.ceil(fontPx * 2.2 + 6);
    const canvas = document.createElement("canvas");
    canvas.width = pxW + 2 * labelPad;
    canvas.height = pxH + 2 * labelPad;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const localScale = pxW / ((cat?.w || 800) * sx);
      drawTarimaOnCanvas(
        ctx,
        item,
        cat,
        labelPad + pxW / 2,
        labelPad + pxH / 2,
        localScale,
        rotation,
      );
      const mmPerPx = wMm / pxW;
      const imgW = canvas.width * mmPerPx;
      const imgH = canvas.height * mmPerPx;
      doc.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        cx - imgW / 2,
        cy - imgH / 2,
        imgW,
        imgH,
        undefined,
        "FAST",
      );
      return;
    }
  }
  doc.setFillColor(fill.r, fill.g, fill.b);
  doc.setDrawColor(stroke.r, stroke.g, stroke.b);
  if (shape === "oval") {
    doc.ellipse(cx, cy, wMm / 2, hMm / 2, "FD");
  } else {
    doc.roundedRect(cx - wMm / 2, cy - hMm / 2, wMm, hMm, 1, 1, "FD");
  }
  const labelRgb = hexToRgb(STAGE_PLOT_TARIMA_LABEL_FILL);
  doc.setTextColor(labelRgb.r, labelRgb.g, labelRgb.b);
  const fontMm = Math.max(7, Math.min(12, Math.min(wMm, hMm) / 10));
  doc.setFontSize(fontMm);
  doc.setFont("helvetica", "bold");
  const gapMm = Math.max(1.2, fontMm * 0.35);
  doc.text(`${dims.widthCm} cm`, cx, cy - hMm / 2 - gapMm, {
    align: "center",
    baseline: "bottom",
  });
  doc.text(`${dims.depthCm} cm`, cx - wMm / 2 - gapMm, cy, {
    align: "center",
    baseline: "bottom",
    angle: 90,
  });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<typeof normalizeStagePlotPayload>} payload
 */
async function drawStageItemsOnCanvas(ctx, payload, ox, oy, scale) {
  const sorted = [...payload.items].sort((a, b) => {
    const aT = stagePlotItemIsTarima(a.type) ? 0 : 1;
    const bT = stagePlotItemIsTarima(b.type) ? 0 : 1;
    if (aT !== bT) return aT - bT;
    return (a.z ?? 0) - (b.z ?? 0);
  });
  const formationIdSet = new Set(
    (payload.formations || []).map((f) => String(f.id)),
  );
  const chairOp = readStagePlotLayerOpacities(payload.stage || {})
    .chairSquaresOpacity;
  for (const item of sorted) {
    const cat = getStagePlotCatalogItem(item.type);
    const itemScale = stagePlotItemUsesCatalogBox(item.type)
      ? 1
      : item.scale > 0
        ? item.scale
        : 1;
    const cx = ox + item.x * scale;
    const cy = oy + item.y * scale;
    const hex = cat?.color || "#334155";
    const rgb = hexToRgb(hex);
    const rotation = Number(item.rotation) || 0;

    if (item.type === "text") {
      const layout = getStagePlotTextLayout(item, cat);
      const wPx = layout.textW * scale * itemScale;
      const hPx = layout.textH * scale * itemScale;
      drawTextItemOnCanvas(ctx, item, layout, cx, cy, wPx, hPx, rotation);
      continue;
    }

    if (stagePlotItemIsTarima(item.type)) {
      drawTarimaOnCanvas(ctx, item, cat, cx, cy, scale, rotation);
      continue;
    }

    const wPx = (cat?.w || 40) * scale * itemScale;
    const hPx = (cat?.h || 40) * scale * itemScale;
    const slotParsed = parseSlotId(item.slotId);
    const magnetized = Boolean(
      slotParsed && formationIdSet.has(slotParsed.formationId),
    );

    if (stagePlotItemHasInstrumentFootprint(item.type)) {
      const fp = stagePlotInstrumentFootprintLayout();
      const { scaleX: sx, scaleY: sy } = stagePlotInstrumentRenderScales(item);
      const iconBoxW = fp.iconBoxPx * scale * sx;
      const iconBoxH = fp.iconBoxPx * scale * sy;
      const iconOffY = fp.iconOffsetY * scale * sy;
      const rad = (rotation * Math.PI) / 180;
      const iconCx = cx - iconOffY * Math.sin(rad);
      const iconCy = cy + iconOffY * Math.cos(rad);
      const paintTimpani = timpaniSizePaintLocal(item);
      const isSoloist = stagePlotItemIsSoloist(item);
      const iconImg = await loadStagePlotIconImage(item.type, hex);
      if (iconImg) {
        if (isSoloist) {
          drawSoloistOutlineOnCanvas(
            ctx,
            iconImg,
            iconCx,
            iconCy,
            iconBoxW,
            iconBoxH,
            rotation,
            item.flipX === true,
          );
        }
        drawImageRotatedOnCanvas(
          ctx,
          iconImg,
          iconCx,
          iconCy,
          iconBoxW,
          iconBoxH,
          rotation,
          item.flipX === true,
          paintTimpani,
        );
      } else {
        const pathD = getStagePlotSilhouettePath(item.type);
        if (pathD) {
          drawSilhouetteOnCanvas(
            ctx,
            pathD,
            iconCx,
            iconCy,
            iconBoxW,
            iconBoxH,
            rotation,
            rgb,
            item.flipX === true,
            paintTimpani,
            isSoloist,
          );
        } else {
          ctx.save();
          ctx.translate(iconCx, iconCy);
          if (rotation) ctx.rotate(rad);
          if (item.flipX === true) {
            ctx.save();
            ctx.scale(-1, 1);
          }
          ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
          ctx.strokeStyle = isSoloist
            ? STAGE_PLOT_SOLOIST_STROKE
            : "#1e293b";
          ctx.lineWidth = isSoloist ? 2.5 : 1;
          ctx.fillRect(-iconBoxW / 2, -iconBoxH / 2, iconBoxW, iconBoxH);
          ctx.strokeRect(-iconBoxW / 2, -iconBoxH / 2, iconBoxW, iconBoxH);
          if (item.flipX === true) ctx.restore();
          if (paintTimpani) paintTimpani(ctx, iconBoxW, iconBoxH);
          ctx.restore();
        }
      }
      continue;
    }

    if (chairOp > 0 && stagePlotItemShowsChairSquare(item.type)) {
      const chairPx = stagePlotChairSquareSide(wPx, hPx);
      drawChairSquareOnCanvas(
        ctx,
        cx,
        cy,
        chairPx,
        rotation,
        magnetized,
        chairOp,
      );
    }

    const iconImg = await loadStagePlotIconImage(item.type, hex);
    if (iconImg) {
      drawImageRotatedOnCanvas(
        ctx,
        iconImg,
        cx,
        cy,
        wPx,
        hPx,
        rotation,
        item.flipX === true,
      );
    } else {
      const pathD = getStagePlotSilhouettePath(item.type);
      if (pathD) {
        drawSilhouetteOnCanvas(
          ctx,
          pathD,
          cx,
          cy,
          wPx,
          hPx,
          rotation,
          rgb,
          item.flipX === true,
        );
      } else {
        ctx.save();
        ctx.translate(cx, cy);
        if (rotation) ctx.rotate((rotation * Math.PI) / 180);
        if (item.flipX === true) ctx.scale(-1, 1);
        ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1;
        ctx.fillRect(-wPx / 2, -hPx / 2, wPx, hPx);
        ctx.strokeRect(-wPx / 2, -hPx / 2, wPx, hPx);
        ctx.restore();
      }
    }
  }
}

function drawTarimaOnCanvas(ctx, item, cat, cx, cy, scale, rotation) {
  const sx =
    Number.isFinite(Number(item.scaleX)) && Number(item.scaleX) > 0
      ? Number(item.scaleX)
      : item.scale > 0
        ? Number(item.scale)
        : 1;
  const sy =
    Number.isFinite(Number(item.scaleY)) && Number(item.scaleY) > 0
      ? Number(item.scaleY)
      : item.scale > 0
        ? Number(item.scale)
        : 1;
  const wPx = (cat?.w || 800) * scale * sx;
  const hPx = (cat?.h || 400) * scale * sy;
  const dims = stagePlotTarimaDimensionsCm(item);
  const shape = stagePlotTarimaShape(item.type);
  ctx.save();
  ctx.translate(cx, cy);
  if (rotation) ctx.rotate((rotation * Math.PI) / 180);
  ctx.fillStyle = STAGE_PLOT_TARIMA_FILL;
  ctx.strokeStyle = STAGE_PLOT_TARIMA_STROKE;
  ctx.lineWidth = 1.5;
  if (shape === "oval") {
    ctx.beginPath();
    ctx.ellipse(0, 0, wPx / 2, hPx / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    const r = 4;
    roundRectPath(ctx, -wPx / 2, -hPx / 2, wPx, hPx, r);
    ctx.fill();
    ctx.stroke();
  }
  const fontSize = Math.max(12, Math.min(22, Math.min(wPx, hPx) / 9));
  const gap = Math.max(4, fontSize * 0.3);
  ctx.fillStyle = STAGE_PLOT_TARIMA_LABEL_FILL;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Ancho: fuera, centrado sobre el borde superior
  ctx.fillText(`${dims.widthCm} cm`, 0, -hPx / 2 - gap - fontSize / 2);
  // Profundo: fuera, centrado en el borde izquierdo (−90°)
  ctx.save();
  ctx.translate(-wPx / 2 - gap - fontSize / 2, 0);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${dims.depthCm} cm`, 0, 0);
  ctx.restore();
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {Record<string, unknown>} item
 * @param {ReturnType<typeof getStagePlotTextLayout>} layout
 */
function drawTextItemOnPdf(doc, item, layout, cx, cy, wMm, hMm, rotationDeg) {
  if (typeof document === "undefined") return;
  const pxW = Math.max(64, Math.round(wMm * 8));
  const pxH = Math.max(40, Math.round(hMm * 8));
  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawTextItemOnCanvas(ctx, item, layout, pxW / 2, pxH / 2, pxW, pxH, rotationDeg);

  doc.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    cx - wMm / 2,
    cy - hMm / 2,
    wMm,
    hMm,
    undefined,
    "FAST",
  );
}

function drawTextItemOnCanvas(ctx, item, layout, cx, cy, wPx, hPx, rotationDeg) {
  ctx.save();
  ctx.translate(cx, cy);
  if (rotationDeg) ctx.rotate((rotationDeg * Math.PI) / 180);

  const fontStyle = normalizeStagePlotFontStyle(item.fontStyle);
  const bold = fontStyle.includes("bold");
  const italic = fontStyle.includes("italic");
  const fontSizePx = Math.max(
    8,
    (layout.fontSize / Math.max(layout.textH, 1)) * hPx * 0.85,
  );
  ctx.fillStyle = normalizeStagePlotTextFill(item.fill);
  ctx.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${fontSizePx}px Helvetica, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  const align = normalizeStagePlotTextAlign(item.align);
  ctx.textAlign =
    align === "left" ? "left" : align === "right" ? "right" : "center";
  const textX =
    align === "left" ? -wPx / 2 + 6 : align === "right" ? wPx / 2 - 6 : 0;
  const lines = layout.lines.length ? layout.lines : [layout.label];
  const lineH = fontSizePx * 1.25;
  const startY = -((lines.length - 1) * lineH) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, textX, startY + i * lineH);
  });
  ctx.restore();
}

function drawChairSquareOnPdf(
  doc,
  cx,
  cy,
  sideMm,
  rotationDeg,
  magnetized,
  opacity = 1,
) {
  if (typeof document === "undefined") return;
  const px = Math.max(48, Math.round(sideMm * 6));
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawChairSquareOnCanvas(
    ctx,
    px / 2,
    px / 2,
    px - 2,
    rotationDeg,
    magnetized,
    opacity,
  );
  doc.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    cx - sideMm / 2,
    cy - sideMm / 2,
    sideMm,
    sideMm,
    undefined,
    "FAST",
  );
}

function drawChairSquareOnCanvas(
  ctx,
  cx,
  cy,
  sidePx,
  rotationDeg,
  magnetized,
  opacity = 1,
) {
  ctx.save();
  ctx.globalAlpha *= Math.min(1, Math.max(0, Number(opacity) || 0));
  ctx.translate(cx, cy);
  if (rotationDeg) ctx.rotate((rotationDeg * Math.PI) / 180);
  const pad = 1;
  const half = sidePx / 2;
  ctx.fillStyle = magnetized
    ? STAGE_PLOT_CHAIR_SQUARE_MAGNETIZED_FILL
    : STAGE_PLOT_CHAIR_SQUARE_FILL;
  ctx.strokeStyle = magnetized
    ? STAGE_PLOT_CHAIR_SQUARE_MAGNETIZED_STROKE
    : STAGE_PLOT_CHAIR_SQUARE_STROKE;
  ctx.lineWidth = magnetized ? 2.5 : 2;
  ctx.fillRect(-half + pad, -half + pad, sidePx - pad * 2, sidePx - pad * 2);
  ctx.strokeRect(-half + pad, -half + pad, sidePx - pad * 2, sidePx - pad * 2);
  ctx.restore();
}

function drawImageRotated(
  doc,
  htmlImage,
  cx,
  cy,
  wMm,
  hMm,
  rotationDeg,
  flipX = false,
  paintLocal = null,
) {
  if (typeof document === "undefined") return;
  const widthMm = Number(wMm);
  const heightMm = Number(hMm);
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) return;
  if (widthMm <= 0 || heightMm <= 0) return;
  const pxW = Math.max(48, Math.round(widthMm * 6));
  const pxH = Math.max(48, Math.round(heightMm * 6));
  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawImageRotatedOnCanvas(
    ctx,
    htmlImage,
    pxW / 2,
    pxH / 2,
    pxW,
    pxH,
    rotationDeg,
    flipX,
    paintLocal,
  );
  try {
    doc.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      cx - widthMm / 2,
      cy - heightMm / 2,
      widthMm,
      heightMm,
      undefined,
      "FAST",
    );
  } catch (err) {
    console.warn("[stagePlotPdf] addImage icon:", err);
  }
}

function drawImageRotatedOnCanvas(
  ctx,
  htmlImage,
  cx,
  cy,
  wPx,
  hPx,
  rotationDeg,
  flipX = false,
  paintLocal = null,
) {
  if (!htmlImage) return;
  const { w: iw, h: ih } = getStagePlotImageNaturalSize(htmlImage);
  if (!iw || !ih) return;
  ctx.save();
  ctx.translate(cx, cy);
  if (rotationDeg) ctx.rotate((rotationDeg * Math.PI) / 180);
  const fit = fitContainInBox(wPx, hPx, iw, ih);
  if (!fit.drawW || !fit.drawH) {
    ctx.restore();
    return;
  }
  if (flipX) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(
      htmlImage,
      -fit.drawW / 2,
      -fit.drawH / 2,
      fit.drawW,
      fit.drawH,
    );
    ctx.restore();
  } else {
    ctx.drawImage(
      htmlImage,
      -fit.drawW / 2,
      -fit.drawH / 2,
      fit.drawW,
      fit.drawH,
    );
  }
  if (typeof paintLocal === "function") paintLocal(ctx, fit.drawW, fit.drawH);
  ctx.restore();
}

/**
 * Número de parche, centrado en la elipse clara del parche (no en el aro ni la caldera).
 * El ctx ya está en el centro del ícono, rotado, sin espejo.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size
 * @param {number} drawW
 * @param {number} drawH
 */
function paintTimpaniSizeLabel(ctx, size, _drawW, drawH) {
  const h = Number(drawH) || 0;
  if (h <= 0) return;
  const fontSize = Math.max(8, h * STAGE_PLOT_TIMPANI_LABEL_FONT_RATIO);
  const y = timpaniHeadLocalOffsetY(h);
  ctx.save();
  ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, fontSize * 0.16);
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#111111";
  const label = String(size);
  ctx.strokeText(label, 0, y);
  ctx.fillText(label, 0, y);
  ctx.restore();
}

/**
 * Painter del número de timbal, o null si el ítem no es timbal.
 * @param {{ type?: string, timpaniSize?: number }} item
 */
function timpaniSizePaintLocal(item) {
  if (item?.type !== "timpani") return null;
  const size = normalizeTimpaniSize(item.timpaniSize);
  return (ctx, drawW, drawH) => paintTimpaniSizeLabel(ctx, size, drawW, drawH);
}

function drawSilhouetteOnPdf(
  doc,
  pathD,
  cx,
  cy,
  wMm,
  hMm,
  rotationDeg,
  rgb,
  flipX = false,
  paintLocal = null,
  isSoloist = false,
) {
  if (typeof document === "undefined" || !pathD) return;
  const widthMm = Number(wMm);
  const heightMm = Number(hMm);
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) return;
  if (widthMm <= 0 || heightMm <= 0) return;
  const strokeExtra = isSoloist ? 8 : 0;
  const pxW = Math.max(48, Math.round(widthMm * 6)) + strokeExtra;
  const pxH = Math.max(48, Math.round(heightMm * 6)) + strokeExtra;
  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawSilhouetteOnCanvas(
    ctx,
    pathD,
    pxW / 2,
    pxH / 2,
    Math.max(48, Math.round(widthMm * 6)),
    Math.max(48, Math.round(heightMm * 6)),
    rotationDeg,
    rgb,
    flipX,
    paintLocal,
    isSoloist,
  );
  const outW = widthMm * (pxW / Math.max(48, Math.round(widthMm * 6)));
  const outH = heightMm * (pxH / Math.max(48, Math.round(heightMm * 6)));
  try {
    doc.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      cx - outW / 2,
      cy - outH / 2,
      outW,
      outH,
      undefined,
      "FAST",
    );
  } catch (err) {
    console.warn("[stagePlotPdf] addImage silhouette:", err);
  }
}

function drawSilhouetteOnCanvas(
  ctx,
  pathD,
  cx,
  cy,
  wPx,
  hPx,
  rotationDeg,
  rgb,
  flipX = false,
  paintLocal = null,
  isSoloist = false,
) {
  if (!pathD) return;
  ctx.save();
  ctx.translate(cx, cy);
  if (rotationDeg) ctx.rotate((rotationDeg * Math.PI) / 180);
  const silScale = Math.min(wPx / VB, hPx / VB);
  if (!Number.isFinite(silScale) || silScale <= 0) {
    ctx.restore();
    return;
  }
  ctx.save();
  if (flipX) ctx.scale(-1, 1);
  ctx.scale(silScale, silScale);
  ctx.translate(-VB / 2, -VB / 2);
  const path = new Path2D(pathD);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (isSoloist) {
    // Contorno dorado del path (silueta vectorial), no AABB.
    ctx.strokeStyle = STAGE_PLOT_SOLOIST_STROKE;
    ctx.lineWidth =
      Math.max(3.2, stagePlotSoloistOutlinePx(wPx, hPx)) / silScale;
    ctx.stroke(path);
  }
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.strokeStyle = isSoloist ? STAGE_PLOT_SOLOIST_STROKE : "#0f172a";
  ctx.lineWidth = (isSoloist ? 2.4 : 1.2) / silScale;
  ctx.fill(path);
  ctx.stroke(path);
  ctx.restore();
  if (typeof paintLocal === "function") {
    paintLocal(ctx, silScale * VB, silScale * VB);
  }
  ctx.restore();
}

function hexToRgb(hex) {
  const h = String(hex || "#334155").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return { r: 51, g: 65, b: 85 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
