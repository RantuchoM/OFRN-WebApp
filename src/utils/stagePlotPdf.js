import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getStagePlotCatalogItem,
  stagePlotItemHasInstrumentFootprint,
  stagePlotItemShowsChairSquare,
} from "./stagePlotCatalog";
import {
  STAGE_PLOT_ATRIL_LINE_STROKE,
  STAGE_PLOT_CHAIR_SQUARE_FILL,
  STAGE_PLOT_CHAIR_SQUARE_STROKE,
  STAGE_PLOT_CHAIR_SQUARE_MAGNETIZED_FILL,
  STAGE_PLOT_CHAIR_SQUARE_MAGNETIZED_STROKE,
  STAGE_PLOT_FOOTPRINT_FILL,
  STAGE_PLOT_FOOTPRINT_STROKE,
  STAGE_PLOT_FOOTPRINT_MAGNETIZED_FILL,
  STAGE_PLOT_FOOTPRINT_MAGNETIZED_STROKE,
  stagePlotChairSquareSide,
  stagePlotGridMajorPx,
  stagePlotGridMinorPx,
  stagePlotInstrumentFootprintLayout,
} from "./stagePlotConstants";
import {
  computeFormationSlots,
  formationGuideLinePoints,
  formationSlotMarkerSize,
  parseSlotId,
  resolveFormationFacingPoint,
} from "./stagePlotFormations";
import {
  computeDeskPairSatellites,
  deskPairIdByItemId,
} from "./stagePlotDeskPairs";
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
  deriveStagePlotChannels,
  getStagePlotTextLayout,
  normalizeStagePlotFontStyle,
  normalizeStagePlotPayload,
  normalizeStagePlotRadialLines,
  normalizeStagePlotTextAlign,
  normalizeStagePlotTextFill,
} from "./stagePlotPayload";

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
 * PDF: hoja 1 = solo escenario (+ dims). Channel list en hoja 2 si hay canales.
 */
export async function exportStagePlotPdf(gira, payloadRaw, plotNombre) {
  const payload = normalizeStagePlotPayload(payloadRaw);
  const channels = deriveStagePlotChannels(payload);
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

  // Página 1: escenario a casi toda la hoja (sin tabla de canales).
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

  drawStageGuidesOnPdf(doc, payload, ox, oy, scale, sw, sh);
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

  if (channels.length > 0) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Channel list", margin, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(title, margin, 20);
    autoTable(doc, {
      startY: 24,
      head: [["Ch", "Elemento", "Notas"]],
      body: channels.map((c) => [String(c.ch), c.label, c.notes || ""]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [51, 65, 85] },
      margin: { left: margin, right: margin },
      tableWidth: pageW - margin * 2,
    });
  }

  const safeName = stagePlotExportSafeName(gira);
  doc.save(`plano-escenario_${safeName}.pdf`);
}

/**
 * JPG: raster del escenario únicamente (sin channel list) + dims Ancho/Profundo.
 */
export async function exportStagePlotJpg(gira, payloadRaw, plotNombre) {
  if (typeof document === "undefined") {
    throw new Error("exportStagePlotJpg requiere DOM");
  }
  const payload = normalizeStagePlotPayload(payloadRaw);
  const { title, plotNombre: nombre } = stagePlotExportTitle(gira, plotNombre);
  const dimLabel = stagePlotDimensionLabel(payload);
  const widthCm = Math.round(Number(payload.stage.widthCm) || 0);
  const depthCm = Math.round(Number(payload.stage.heightCm) || 0);

  const sw = payload.stage.width || 900;
  const sh = payload.stage.height || 560;
  const maxStagePx = 1600;
  const scale = Math.min(maxStagePx / sw, maxStagePx / sh, 2);
  const stageW = Math.round(sw * scale);
  const stageH = Math.round(sh * scale);
  const padX = 56;
  const padTop = nombre ? 72 : 56;
  const padBottom = 48;
  const canvasW = padX * 2 + stageW;
  const canvasH = padTop + stageH + padBottom;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear canvas para JPG");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);

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

  const ox = padX;
  const oy = padTop;
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#b4b4b4";
  ctx.lineWidth = 1;
  ctx.fillRect(ox, oy, stageW, stageH);
  ctx.strokeRect(ox, oy, stageW, stageH);

  ctx.fillStyle = "#64748b";
  ctx.font = "12px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("FONDO", ox + stageW / 2, oy + 14);
  ctx.fillText("PÚBLICO", ox + stageW / 2, oy + stageH - 8);

  drawStageGuidesOnCanvas(ctx, payload, ox, oy, scale, sw, sh);
  await drawStageItemsOnCanvas(ctx, payload, ox, oy, scale);

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

  const safeName = stagePlotExportSafeName(gira);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `plano-escenario_${safeName}.jpg`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
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
 * Guías de lienzo (cuadrícula / radial / formaciones) según flags de `payload.stage`.
 * Semántica igual que los toggles Lienzo: ON = visible.
 * @param {ReturnType<typeof normalizeStagePlotPayload>} payload
 */
function drawStageGuidesOnPdf(doc, payload, ox, oy, scale, sw, sh) {
  const stage = payload.stage || {};
  if (stage.showGrid !== false) {
    drawCentimeterGridOnPdf(doc, ox, oy, scale, sw, sh);
  }
  if (stage.showRadial) {
    drawRadialGuideOnPdf(doc, payload, ox, oy, scale, sw, sh);
  }
  if (!stage.hideFormationGuides) {
    drawFormationGuidesOnPdf(doc, payload, ox, oy, scale);
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<typeof normalizeStagePlotPayload>} payload
 */
function drawStageGuidesOnCanvas(ctx, payload, ox, oy, scale, sw, sh) {
  const stage = payload.stage || {};
  if (stage.showGrid !== false) {
    drawCentimeterGridOnCanvas(ctx, ox, oy, scale, sw, sh);
  }
  if (stage.showRadial) {
    drawRadialGuideOnCanvas(ctx, payload, ox, oy, scale, sw, sh);
  }
  if (!stage.hideFormationGuides) {
    drawFormationGuidesOnCanvas(ctx, payload, ox, oy, scale);
  }
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
function drawFormationGuidesOnPdf(doc, payload, ox, oy, scale) {
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
function drawFormationGuidesOnCanvas(ctx, payload, ox, oy, scale) {
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
  const sorted = [...payload.items].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const formationIdSet = new Set(
    (payload.formations || []).map((f) => String(f.id)),
  );
  const pairedItemIds = deskPairIdByItemId(payload);
  for (const item of sorted) {
    const cat = getStagePlotCatalogItem(item.type);
    const itemScale = item.scale > 0 ? item.scale : 1;
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

    const wMm = (cat?.w || 40) * scale * itemScale;
    const hMm = (cat?.h || 40) * scale * itemScale;
    const slotParsed = parseSlotId(item.slotId);
    const magnetized = Boolean(
      slotParsed && formationIdSet.has(slotParsed.formationId),
    );

    if (stagePlotItemHasInstrumentFootprint(item.type)) {
      const fp = stagePlotInstrumentFootprintLayout();
      const fpW = fp.widthPx * scale * itemScale;
      const fpD = fp.depthPx * scale * itemScale;
      const atril = fp.atrilPx * scale * itemScale;
      const iconBox = fp.iconBoxPx * scale * itemScale;
      const iconOffY = fp.iconOffsetY * scale * itemScale;
      drawInstrumentFootprintOnPdf(
        doc,
        cx,
        cy,
        fpW,
        fpD,
        atril,
        rotation,
        magnetized,
        pairedItemIds.has(item.id),
      );
      const rad = (rotation * Math.PI) / 180;
      const iconCx = cx - iconOffY * Math.sin(rad);
      const iconCy = cy + iconOffY * Math.cos(rad);
      const iconImg = await loadStagePlotIconImage(item.type, hex);
      if (iconImg) {
        drawImageRotated(doc, iconImg, iconCx, iconCy, iconBox, iconBox, rotation);
      } else {
        const pathD = getStagePlotSilhouettePath(item.type);
        if (pathD) {
          drawSilhouetteOnPdf(
            doc,
            pathD,
            iconCx,
            iconCy,
            iconBox,
            iconBox,
            rotation,
            rgb,
          );
        } else {
          doc.setFillColor(rgb.r, rgb.g, rgb.b);
          doc.setDrawColor(30);
          doc.rect(
            iconCx - iconBox / 2,
            iconCy - iconBox / 2,
            iconBox,
            iconBox,
            "FD",
          );
        }
      }
      continue;
    }

    if (
      !payload.stage.hideChairSquares &&
      stagePlotItemShowsChairSquare(item.type)
    ) {
      const chairMm = stagePlotChairSquareSide(wMm, hMm);
      drawChairSquareOnPdf(doc, cx, cy, chairMm, rotation, magnetized);
    }

    const iconImg = await loadStagePlotIconImage(item.type, hex);
    if (iconImg) {
      drawImageRotated(doc, iconImg, cx, cy, wMm, hMm, rotation);
    } else {
      const pathD = getStagePlotSilhouettePath(item.type);
      if (pathD) {
        drawSilhouetteOnPdf(doc, pathD, cx, cy, wMm, hMm, rotation, rgb);
      } else {
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.setDrawColor(30);
        doc.rect(cx - wMm / 2, cy - hMm / 2, wMm, hMm, "FD");
      }
    }
  }
  drawDeskPairSatellitesOnPdf(doc, payload, ox, oy, scale);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<typeof normalizeStagePlotPayload>} payload
 */
async function drawStageItemsOnCanvas(ctx, payload, ox, oy, scale) {
  const sorted = [...payload.items].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const formationIdSet = new Set(
    (payload.formations || []).map((f) => String(f.id)),
  );
  const pairedItemIds = deskPairIdByItemId(payload);
  for (const item of sorted) {
    const cat = getStagePlotCatalogItem(item.type);
    const itemScale = item.scale > 0 ? item.scale : 1;
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

    const wPx = (cat?.w || 40) * scale * itemScale;
    const hPx = (cat?.h || 40) * scale * itemScale;
    const slotParsed = parseSlotId(item.slotId);
    const magnetized = Boolean(
      slotParsed && formationIdSet.has(slotParsed.formationId),
    );

    if (stagePlotItemHasInstrumentFootprint(item.type)) {
      const fp = stagePlotInstrumentFootprintLayout();
      const fpW = fp.widthPx * scale * itemScale;
      const fpD = fp.depthPx * scale * itemScale;
      const atril = fp.atrilPx * scale * itemScale;
      const iconBox = fp.iconBoxPx * scale * itemScale;
      const iconOffY = fp.iconOffsetY * scale * itemScale;
      drawInstrumentFootprintOnCanvas(
        ctx,
        cx,
        cy,
        fpW,
        fpD,
        atril,
        rotation,
        magnetized,
        pairedItemIds.has(item.id),
      );
      const rad = (rotation * Math.PI) / 180;
      const iconCx = cx - iconOffY * Math.sin(rad);
      const iconCy = cy + iconOffY * Math.cos(rad);
      const iconImg = await loadStagePlotIconImage(item.type, hex);
      if (iconImg) {
        drawImageRotatedOnCanvas(
          ctx,
          iconImg,
          iconCx,
          iconCy,
          iconBox,
          iconBox,
          rotation,
        );
      } else {
        const pathD = getStagePlotSilhouettePath(item.type);
        if (pathD) {
          drawSilhouetteOnCanvas(
            ctx,
            pathD,
            iconCx,
            iconCy,
            iconBox,
            iconBox,
            rotation,
            rgb,
          );
        } else {
          ctx.save();
          ctx.translate(iconCx, iconCy);
          if (rotation) ctx.rotate(rad);
          ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 1;
          ctx.fillRect(-iconBox / 2, -iconBox / 2, iconBox, iconBox);
          ctx.strokeRect(-iconBox / 2, -iconBox / 2, iconBox, iconBox);
          ctx.restore();
        }
      }
      continue;
    }

    if (
      !payload.stage.hideChairSquares &&
      stagePlotItemShowsChairSquare(item.type)
    ) {
      const chairPx = stagePlotChairSquareSide(wPx, hPx);
      drawChairSquareOnCanvas(ctx, cx, cy, chairPx, rotation, magnetized);
    }

    const iconImg = await loadStagePlotIconImage(item.type, hex);
    if (iconImg) {
      drawImageRotatedOnCanvas(ctx, iconImg, cx, cy, wPx, hPx, rotation);
    } else {
      const pathD = getStagePlotSilhouettePath(item.type);
      if (pathD) {
        drawSilhouetteOnCanvas(ctx, pathD, cx, cy, wPx, hPx, rotation, rgb);
      } else {
        ctx.save();
        ctx.translate(cx, cy);
        if (rotation) ctx.rotate((rotation * Math.PI) / 180);
        ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1;
        ctx.fillRect(-wPx / 2, -hPx / 2, wPx, hPx);
        ctx.strokeRect(-wPx / 2, -hPx / 2, wPx, hPx);
        ctx.restore();
      }
    }
  }
  drawDeskPairSatellitesOnCanvas(ctx, payload, ox, oy, scale);
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

function drawChairSquareOnPdf(doc, cx, cy, sideMm, rotationDeg, magnetized) {
  if (typeof document === "undefined") return;
  const px = Math.max(48, Math.round(sideMm * 6));
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawChairSquareOnCanvas(ctx, px / 2, px / 2, px - 2, rotationDeg, magnetized);
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

function drawChairSquareOnCanvas(ctx, cx, cy, sidePx, rotationDeg, magnetized) {
  ctx.save();
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

function deskPairSatelliteEndpoints(sat, ox, oy, scale) {
  const cx = ox + sat.x * scale;
  const cy = oy + sat.y * scale;
  const half = (sat.atrilPx * scale) / 2;
  const rad = ((Number(sat.rotation) || 0) * Math.PI) / 180;
  const dx = Math.cos(rad) * half;
  const dy = Math.sin(rad) * half;
  return {
    x1: cx - dx,
    y1: cy - dy,
    x2: cx + dx,
    y2: cy + dy,
    cx,
    cy,
  };
}

function drawDeskPairSatellitesOnPdf(doc, payload, ox, oy, scale) {
  const facing = resolveFormationFacingPoint(payload.items, payload.stage);
  const sats = computeDeskPairSatellites(payload, facing);
  const rgb = hexToRgb(STAGE_PLOT_ATRIL_LINE_STROKE);
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  const lineW = Math.max(0.35, 0.55 * Math.min(scale * 4, 1.4));
  doc.setLineWidth(lineW);
  const poleR = Math.max(0.35, 0.7 * Math.min(scale * 4, 1.2));
  for (const sat of sats) {
    const e = deskPairSatelliteEndpoints(sat, ox, oy, scale);
    doc.line(e.x1, e.y1, e.x2, e.y2);
    doc.circle(e.cx, e.cy, poleR, "F");
  }
}

function drawDeskPairSatellitesOnCanvas(ctx, payload, ox, oy, scale) {
  const facing = resolveFormationFacingPoint(payload.items, payload.stage);
  const sats = computeDeskPairSatellites(payload, facing);
  ctx.save();
  ctx.strokeStyle = STAGE_PLOT_ATRIL_LINE_STROKE;
  ctx.fillStyle = STAGE_PLOT_ATRIL_LINE_STROKE;
  ctx.lineWidth = Math.max(1.5, 2.2 * Math.min(scale, 1.5));
  ctx.lineCap = "round";
  const poleR = Math.max(1.6, 3 * Math.min(scale, 1.4));
  for (const sat of sats) {
    const e = deskPairSatelliteEndpoints(sat, ox, oy, scale);
    ctx.beginPath();
    ctx.moveTo(e.x1, e.y1);
    ctx.lineTo(e.x2, e.y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(e.cx, e.cy, poleR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawInstrumentFootprintOnCanvas(
  ctx,
  cx,
  cy,
  widthPx,
  depthPx,
  atrilPx,
  rotationDeg,
  magnetized,
  hideAtril = false,
) {
  ctx.save();
  ctx.translate(cx, cy);
  if (rotationDeg) ctx.rotate((rotationDeg * Math.PI) / 180);
  const hw = widthPx / 2;
  const hd = depthPx / 2;
  ctx.fillStyle = magnetized
    ? STAGE_PLOT_FOOTPRINT_MAGNETIZED_FILL
    : STAGE_PLOT_FOOTPRINT_FILL;
  ctx.strokeStyle = magnetized
    ? STAGE_PLOT_FOOTPRINT_MAGNETIZED_STROKE
    : STAGE_PLOT_FOOTPRINT_STROKE;
  ctx.lineWidth = magnetized ? 2.5 : 2;
  ctx.fillRect(-hw, -hd, widthPx, depthPx);
  ctx.strokeRect(-hw, -hd, widthPx, depthPx);
  if (!hideAtril) {
    ctx.strokeStyle = STAGE_PLOT_ATRIL_LINE_STROKE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-atrilPx / 2, hd);
    ctx.lineTo(atrilPx / 2, hd);
    ctx.stroke();
  }
  ctx.restore();
}

function drawInstrumentFootprintOnPdf(
  doc,
  cx,
  cy,
  widthMm,
  depthMm,
  atrilMm,
  rotationDeg,
  magnetized,
  hideAtril = false,
) {
  if (typeof document === "undefined") return;
  const pxW = Math.max(64, Math.round(widthMm * 6));
  const pxH = Math.max(64, Math.round(depthMm * 6));
  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawInstrumentFootprintOnCanvas(
    ctx,
    pxW / 2,
    pxH / 2,
    pxW - 4,
    pxH - 4,
    Math.max(8, (atrilMm / Math.max(widthMm, 0.001)) * (pxW - 4)),
    rotationDeg,
    magnetized,
    hideAtril,
  );
  doc.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    cx - widthMm / 2,
    cy - depthMm / 2,
    widthMm,
    depthMm,
    undefined,
    "FAST",
  );
}

function drawImageRotated(doc, htmlImage, cx, cy, wMm, hMm, rotationDeg) {
  if (typeof document === "undefined") return;
  const pxW = Math.max(48, Math.round(wMm * 6));
  const pxH = Math.max(48, Math.round(hMm * 6));
  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawImageRotatedOnCanvas(ctx, htmlImage, pxW / 2, pxH / 2, pxW, pxH, rotationDeg);
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

function drawImageRotatedOnCanvas(ctx, htmlImage, cx, cy, wPx, hPx, rotationDeg) {
  ctx.save();
  ctx.translate(cx, cy);
  if (rotationDeg) ctx.rotate((rotationDeg * Math.PI) / 180);
  const { w: iw, h: ih } = getStagePlotImageNaturalSize(htmlImage);
  const fit = fitContainInBox(wPx, hPx, iw, ih);
  ctx.drawImage(
    htmlImage,
    -fit.drawW / 2,
    -fit.drawH / 2,
    fit.drawW,
    fit.drawH,
  );
  ctx.restore();
}

function drawSilhouetteOnPdf(doc, pathD, cx, cy, wMm, hMm, rotationDeg, rgb) {
  if (typeof document === "undefined") return;
  const pxW = Math.max(48, Math.round(wMm * 6));
  const pxH = Math.max(48, Math.round(hMm * 6));
  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawSilhouetteOnCanvas(ctx, pathD, pxW / 2, pxH / 2, pxW, pxH, rotationDeg, rgb);
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

function drawSilhouetteOnCanvas(ctx, pathD, cx, cy, wPx, hPx, rotationDeg, rgb) {
  ctx.save();
  ctx.translate(cx, cy);
  if (rotationDeg) ctx.rotate((rotationDeg * Math.PI) / 180);
  const silScale = Math.min(wPx / VB, hPx / VB);
  ctx.scale(silScale, silScale);
  ctx.translate(-VB / 2, -VB / 2);
  const path = new Path2D(pathD);
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 1.2 / silScale;
  ctx.lineJoin = "round";
  ctx.fill(path);
  ctx.stroke(path);
  ctx.restore();
}

function hexToRgb(hex) {
  const h = String(hex || "#334155").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return { r: 51, g: 65, b: 85 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
