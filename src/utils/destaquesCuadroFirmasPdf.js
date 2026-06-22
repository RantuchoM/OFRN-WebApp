import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import {
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
  Document,
  HeightRule,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  WidthType,
} from "docx";

const PAGE_W = 210;
const PAGE_H = 297;
const MM_TO_PT = 72 / 25.4;
const MM_TO_PX = 96 / 25.4;
const mmPt = (v) => v * MM_TO_PT;
const mmPx = (v) => Math.max(1, Math.round(v * MM_TO_PX));
const mmTwip = (v) => Math.max(1, Math.round(convertMillimetersToTwip(v)));
const MAX_SIGNATURE_CELL_HEIGHT_RATIO = 1 / 6;

/** Encargado: siempre primera firma del cuadro (aunque no esté en el lote de destaques). */
export const CUADRO_FIRMAS_ENCARGADO_INTEGRANTE_ID = 1458710;

export function toCuadroFirmasPerson(row) {
  if (!row) return null;
  const dni = row.dni != null ? String(row.dni).trim() : "";
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    dni: dni || null,
    firma: row.firma,
  };
}

export async function fetchEncargadoCuadroFirmas(supabase) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("integrantes")
    .select("id, nombre, apellido, dni, firma")
    .eq("id", CUADRO_FIRMAS_ENCARGADO_INTEGRANTE_ID)
    .maybeSingle();
  if (error) {
    console.warn("Cuadro de firmas: encargado no cargado", error);
    return null;
  }
  return toCuadroFirmasPerson(data);
}

export function buildCuadroFirmasPeopleList(people, encargado) {
  const encargadoId = CUADRO_FIRMAS_ENCARGADO_INTEGRANTE_ID;
  const head = toCuadroFirmasPerson(encargado);
  const rest = (people || [])
    .filter((p) => Number(p.id) !== encargadoId)
    .map(toCuadroFirmasPerson)
    .filter(Boolean)
    .sort((a, b) => {
      const ap = String(a.apellido || "").localeCompare(
        String(b.apellido || ""),
        "es",
      );
      if (ap !== 0) return ap;
      return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
    });
  return head ? [head, ...rest] : rest;
}

export async function hydrateCuadroFirmasPeopleDni(supabase, people) {
  if (!supabase?.from) return people || [];
  const list = (people || []).map(toCuadroFirmasPerson).filter(Boolean);
  const missingIds = [
    ...new Set(
      list
        .filter((person) => !person.dni)
        .map((person) => Number(person.id))
        .filter(Number.isFinite),
    ),
  ];
  if (missingIds.length === 0) return list;

  const { data, error } = await supabase
    .from("integrantes")
    .select("id, dni")
    .in("id", missingIds);
  if (error) {
    console.warn("Cuadro de firmas: DNI no cargados", error);
    return list;
  }

  const dniById = new Map(
    (data || []).map((row) => [
      Number(row.id),
      row.dni != null ? String(row.dni).trim() : "",
    ]),
  );

  return list.map((person) => {
    if (person.dni) return person;
    const dni = dniById.get(Number(person.id));
    return dni ? { ...person, dni } : person;
  });
}

async function prepareCuadroFirmasPeople(people, encargado, supabase) {
  const sorted = buildCuadroFirmasPeopleList(people, encargado);
  if (!supabase) return sorted;
  return hydrateCuadroFirmasPeopleDni(supabase, sorted);
}

/** Máximo píxeles al rasterizar cada firma (reduce mucho el peso del PDF). */
const SIG_MAX_PX = { w: 380, h: 160 };
const SIG_JPEG_QUALITY = 0.72;

/**
 * Calcula columnas y filas para que N firmas entren en una sola página A4.
 * Prioriza celdas cuadradas y limita la altura cuando hay pocas firmas.
 */
export function computeSignatureGridLayout(count, opts = {}) {
  const {
    pageWidthMm = PAGE_W,
    pageHeightMm = PAGE_H,
    marginMm = 10,
    headerHeightMm = 0,
    gapMm = 2,
    nameBandMm = 6,
    nameOverlapMm = 5,
    minSigHeightMm = 6,
    minCols = 4,
    maxCellHeightMm = pageHeightMm * MAX_SIGNATURE_CELL_HEIGHT_RATIO,
  } = opts;
  const maxCellH =
    Number.isFinite(maxCellHeightMm) && maxCellHeightMm > 0
      ? maxCellHeightMm
      : Infinity;

  const empty = {
    cols: 0,
    rows: 0,
    cellWidthMm: 0,
    cellHeightMm: 0,
    signatureBoxHeightMm: 0,
    marginMm,
    headerHeightMm,
    gapMm,
    nameBandMm,
    nameOverlapMm,
    gridStartXMm: marginMm,
    gridStartYMm: marginMm + headerHeightMm,
  };

  if (count <= 0) return empty;

  const usableW = pageWidthMm - marginMm * 2;
  const usableH = pageHeightMm - marginMm * 2 - headerHeightMm;

  let best = null;
  const colMin = Math.max(1, minCols);
  const colMax = Math.max(count, colMin);

  for (let cols = colMin; cols <= colMax; cols++) {
    const rows = Math.ceil(count / cols);
    const cellW = (usableW - gapMm * (cols - 1)) / cols;
    const rawCellH = (usableH - gapMm * (rows - 1)) / rows;
    const cellH = Math.min(rawCellH, maxCellH);
    const sigBoxH = cellH - nameBandMm + nameOverlapMm;
    if (sigBoxH < minSigHeightMm) continue;

    const squareness =
      1 - Math.abs(cellW - cellH) / Math.max(cellW, cellH, 1);
    const score = Math.min(cellW, cellH) * (0.65 + 0.35 * squareness);

    if (!best || score > best.score) {
      best = {
        cols,
        rows,
        cellWidthMm: cellW,
        cellHeightMm: cellH,
        signatureBoxHeightMm: sigBoxH,
        score,
      };
    }
  }

  if (!best) {
    const cols = Math.max(colMin, Math.ceil(Math.sqrt(count)));
    const rows = Math.ceil(count / cols);
    const cellW = (usableW - gapMm * (cols - 1)) / cols;
    const rawCellH = (usableH - gapMm * (rows - 1)) / rows;
    const cellH = Math.min(rawCellH, maxCellH);
    best = {
      cols,
      rows,
      cellWidthMm: cellW,
      cellHeightMm: cellH,
      signatureBoxHeightMm: Math.max(5, cellH - nameBandMm + nameOverlapMm),
      score: 0,
    };
  }

  return {
    ...best,
    marginMm,
    headerHeightMm,
    gapMm,
    nameBandMm,
    nameOverlapMm,
    gridStartXMm: marginMm,
    gridStartYMm: marginMm + headerHeightMm,
  };
}

function blobToJpegData(blob, maxW, maxH, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width;
      let h = img.height;
      const scale = Math.min(maxW / w, maxH / h, 1);
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        async (jpegBlob) => {
          if (!jpegBlob) {
            reject(new Error("No se pudo comprimir la firma"));
            return;
          }
          resolve({
            bytes: new Uint8Array(await jpegBlob.arrayBuffer()),
            width: w,
            height: h,
          });
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Imagen de firma inválida"));
    };
    img.src = url;
  });
}

function drawCenteredText(page, text, centerXPt, baselineYPt, { font, size, color, maxWidthPt }) {
  let line = String(text || "").trim();
  if (!line) return;
  if (maxWidthPt) {
    while (
      line.length > 1 &&
      font.widthOfTextAtSize(line, size) > maxWidthPt
    ) {
      line = `${line.slice(0, -2)}…`;
    }
  }
  const w = font.widthOfTextAtSize(line, size);
  page.drawText(line, {
    x: centerXPt - w / 2,
    y: baselineYPt,
    size,
    font,
    color,
  });
}

async function loadSignatureJpegData(url) {
  if (!url || url === "NULL") return null;
  try {
    const res = await fetch(String(url).trim(), { method: "GET", mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await blobToJpegData(
      blob,
      SIG_MAX_PX.w,
      SIG_MAX_PX.h,
      SIG_JPEG_QUALITY,
    );
  } catch {
    return null;
  }
}

async function buildSignatureJpegDataCache(people) {
  const jpegCache = new Map();
  for (const person of people) {
    const key = person.firma || "";
    if (!key || jpegCache.has(key)) continue;
    jpegCache.set(key, await loadSignatureJpegData(key));
  }
  return jpegCache;
}

function formatPersonFullName(person) {
  return `${person.apellido || ""}, ${person.nombre || ""}`
    .trim()
    .replace(/^,\s*|,\s*$/g, "");
}

function buildCuadroFirmasFilename({ giraLabel, filePrefix, ext }) {
  const safeLabel = String(giraLabel || filePrefix || "Gira")
    .replace(/[^a-z0-9]/gi, "_")
    .slice(0, 40);
  const safePrefix = String(filePrefix || "Destaques")
    .replace(/[^a-z0-9]/gi, "_")
    .slice(0, 24);
  const dateStr = new Date().toISOString().slice(0, 10);
  return `Cuadro_Firmas_${safePrefix}_${safeLabel}_${dateStr}.${ext}`;
}

function resolveCuadroFirmasLayout(people) {
  const hasAnyDni = (people || []).some((person) => person?.dni);
  return computeSignatureGridLayout(people.length, {
    nameBandMm: hasAnyDni ? 13 : 6,
    nameOverlapMm: hasAnyDni ? 4 : 5,
  });
}

function ptToPx(pt) {
  return (pt * 96) / 72;
}

function loadImageFromBytes(bytes) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Imagen inválida"));
    };
    img.src = url;
  });
}

function drawCenteredCanvasText(
  ctx,
  text,
  centerX,
  centerY,
  { font, color, baseline = "middle", letterSpacing = "0px" },
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = baseline;
  if ("letterSpacing" in ctx) ctx.letterSpacing = letterSpacing;
  const line = String(text || "").trim();
  if (!line) return;
  ctx.fillText(line, centerX, centerY);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}

function parseFontSizePx(font) {
  const match = String(font).match(/(\d+(?:\.\d+)?)px/);
  return match ? Number(match[1]) : 8;
}

function measureCanvasLineHeight(ctx, text, font) {
  ctx.font = font;
  const metrics = ctx.measureText(String(text || "").trim());
  const sizePx = parseFontSizePx(font);
  const ascent =
    metrics.actualBoundingBoxAscent ??
    metrics.fontBoundingBoxAscent ??
    sizePx * 0.78;
  const descent =
    metrics.actualBoundingBoxDescent ??
    metrics.fontBoundingBoxDescent ??
    sizePx * 0.22;
  return Math.max(1, ascent + descent);
}

function buildCanvasFont(sizePx, { bold = false, mono = false } = {}) {
  const size = Math.max(1, Math.round(sizePx * 4) / 4);
  if (mono) {
    return `${bold ? "bold " : ""}${size}px Consolas, "Courier New", monospace`;
  }
  return `${bold ? "bold " : ""}${size}px Arial, Helvetica, sans-serif`;
}

function fitCanvasFont(
  ctx,
  text,
  { sizePx, bold, maxWidthPx, minSizePx = 3.5, mono = false },
) {
  const safeMaxW = maxWidthPx * 0.94;
  let size = sizePx;
  while (size >= minSizePx) {
    const font = buildCanvasFont(size, { bold, mono });
    ctx.font = font;
    if (ctx.measureText(String(text || "").trim()).width <= safeMaxW) {
      return { font, size };
    }
    size -= 0.25;
  }
  const font = buildCanvasFont(minSizePx, { bold, mono });
  ctx.font = font;
  return { font, size: minSizePx };
}

function splitNameLines(fullName) {
  const text = String(fullName || "").trim();
  if (!text) return [];
  const commaIdx = text.indexOf(",");
  if (commaIdx > 0 && commaIdx < text.length - 1) {
    const first = text.slice(0, commaIdx + 1).trim();
    const second = text.slice(commaIdx + 1).trim();
    return second ? [first, second] : [first];
  }
  return [text];
}

function buildSignatureTextLines(person, cellWidthMm) {
  const fullName = formatPersonFullName(person);
  const nameSizePt = Math.min(8, Math.max(4.5, cellWidthMm * 0.22));
  const dniSizePt = Math.min(6.5, Math.max(5.5, cellWidthMm * 0.19));
  const hasDni = Boolean(person.dni);
  const nameLines = splitNameLines(fullName);

  return [
    ...nameLines.map((text) => ({
      kind: "name",
      text,
      sizePx: ptToPx(nameSizePt),
      bold: true,
      color: "#1E293B",
      minSizePx: 4,
      mono: false,
    })),
    ...(hasDni
      ? [
          {
            kind: "dni",
            text: `DNI ${String(person.dni).trim()}`,
            sizePx: ptToPx(dniSizePt),
            bold: false,
            color: "#334155",
            minSizePx: ptToPx(5.5),
            mono: true,
          },
        ]
      : []),
  ];
}

function fitLineDef(ctx, line, maxWidthPx, sizeScale = 1) {
  return {
    ...line,
    ...fitCanvasFont(ctx, line.text, {
      sizePx: line.sizePx * sizeScale,
      bold: line.bold,
      maxWidthPx,
      minSizePx: line.minSizePx,
      mono: line.mono,
    }),
  };
}

function measureTextBlockHeight(ctx, lines, lineGapPx) {
  return lines.reduce((sum, line, index) => {
    const lineHeight = measureCanvasLineHeight(ctx, line.text, line.font);
    return sum + lineHeight + (index < lines.length - 1 ? lineGapPx : 0);
  }, 0);
}

function fitSignatureTextBlock(ctx, lineDefs, maxWidthPx, maxHeightPx, lineGapPx) {
  const dniLines = lineDefs.filter((line) => line.kind === "dni");
  const nameLines = lineDefs.filter((line) => line.kind !== "dni");

  const fittedDni = dniLines.map((line) => fitLineDef(ctx, line, maxWidthPx, 1));
  const dniBlockHeight = measureTextBlockHeight(ctx, fittedDni, lineGapPx);
  const gapBeforeDni =
    fittedDni.length > 0 && nameLines.length > 0 ? lineGapPx : 0;
  const availableForNames = Math.max(
    1,
    maxHeightPx - dniBlockHeight - gapBeforeDni,
  );

  let nameScale = 1;
  let fittedNames = nameLines.map((line) =>
    fitLineDef(ctx, line, maxWidthPx, nameScale),
  );
  while (
    fittedNames.length > 0 &&
    measureTextBlockHeight(ctx, fittedNames, lineGapPx) > availableForNames &&
    nameScale > 0.55
  ) {
    nameScale -= 0.04;
    fittedNames = nameLines.map((line) =>
      fitLineDef(ctx, line, maxWidthPx, nameScale),
    );
  }

  return [...fittedNames, ...fittedDni];
}

function drawSignatureCellTextBlock(ctx, person, layout, widthPx, heightPx) {
  const { cellWidthMm, cellHeightMm, nameBandMm } = layout;
  const lineGapPx = mmPx(0.25);
  const horizontalPadPx = mmPx(2.2);
  const bottomSafePx = mmPx(1.8);
  const topBandPadPx = mmPx(0.5);
  const maxTextWidthPx = Math.max(1, widthPx - horizontalPadPx * 2);
  const textBandTopPx = mmPx(cellHeightMm - nameBandMm) + topBandPadPx;
  const textBandBottomPx = heightPx - bottomSafePx;
  const maxBlockHeightPx = Math.max(
    1,
    textBandBottomPx - textBandTopPx,
  );

  const lineDefs = buildSignatureTextLines(person, cellWidthMm);
  if (lineDefs.length === 0) return;

  const fitted = fitSignatureTextBlock(
    ctx,
    lineDefs,
    maxTextWidthPx,
    maxBlockHeightPx,
    lineGapPx,
  );

  let baselineY = textBandBottomPx;
  for (let index = fitted.length - 1; index >= 0; index -= 1) {
    const line = fitted[index];
    drawCenteredCanvasText(ctx, line.text, widthPx / 2, baselineY, {
      font: line.font,
      color: line.color,
      baseline: "bottom",
      letterSpacing: line.mono ? "0.06em" : "0px",
    });
    if (index > 0) {
      baselineY -=
        measureCanvasLineHeight(ctx, line.text, line.font) + lineGapPx;
    }
  }
}

async function renderSignatureCellToJpeg(person, signatureJpegData, layout) {
  const { cellWidthMm, cellHeightMm, signatureBoxHeightMm } = layout;
  const edgeInsetMm = 0.35;
  const widthPx = mmPx(cellWidthMm);
  const heightPx = mmPx(cellHeightMm);
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, widthPx, heightPx);

  const borderPx = Math.max(1, widthPx * 0.005);
  const insetPx = mmPx(edgeInsetMm);
  ctx.strokeStyle = "#CCD6E0";
  ctx.lineWidth = borderPx;
  ctx.strokeRect(
    insetPx,
    insetPx,
    widthPx - insetPx * 2,
    heightPx - insetPx * 2,
  );

  const sigPadMm = 0.8;
  const sigWmm = cellWidthMm - sigPadMm * 2;
  const sigHmm = signatureBoxHeightMm - sigPadMm;
  let signatureDrawn = false;

  if (signatureJpegData?.bytes) {
    try {
      const img = await loadImageFromBytes(signatureJpegData.bytes);
      const maxWPx = mmPx(sigWmm);
      const maxHPx = mmPx(sigHmm);
      const scale = Math.min(maxWPx / img.width, maxHPx / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (widthPx - w) / 2;
      const y = mmPx(sigPadMm) + (mmPx(sigHmm) - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      signatureDrawn = true;
    } catch {
      signatureDrawn = false;
    }
  }

  if (!signatureDrawn) {
    const fontSizePx = ptToPx(Math.min(7, cellWidthMm * 0.32));
    const sigCenterY = mmPx(sigPadMm) + mmPx(sigHmm) / 2;
    drawCenteredCanvasText(ctx, "Sin firma", widthPx / 2, sigCenterY, {
      font: `${fontSizePx}px Arial, Helvetica, sans-serif`,
      color: "#94A3B8",
      baseline: "middle",
    });
  }

  drawSignatureCellTextBlock(ctx, person, layout, widthPx, heightPx);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (pngBlob) => {
        if (!pngBlob) {
          reject(new Error("No se pudo rasterizar celda de firma"));
          return;
        }
        resolve({
          bytes: new Uint8Array(await pngBlob.arrayBuffer()),
          width: widthPx,
          height: heightPx,
          displayWidthPx: Math.max(1, Math.round(widthPx * 0.965)),
          displayHeightPx: Math.max(1, Math.round(heightPx * 0.965)),
          mime: "image/png",
        });
      },
      "image/png",
    );
  });
}

/**
 * Genera y descarga un PDF A4 aplanado con grilla de firmas (pdf-lib, imágenes comprimidas).
 * @param {{ people: Array<{ id, nombre, apellido, firma?, dni? }>, encargado?: object|null, giraLabel?: string, filePrefix?: string, supabase?: object }} params
 */
export async function exportDestaquesCuadroFirmasPdf({
  people,
  encargado = null,
  giraLabel = "",
  filePrefix = "Destaques",
  supabase = null,
}) {
  const sorted = await prepareCuadroFirmasPeople(people, encargado, supabase);

  if (sorted.length === 0) {
    throw new Error("No hay personas para el cuadro de firmas.");
  }

  const layout = resolveCuadroFirmasLayout(sorted);
  const {
    cols,
    cellWidthMm,
    cellHeightMm,
    signatureBoxHeightMm,
    gapMm,
    nameBandMm,
    nameOverlapMm,
    gridStartXMm,
    gridStartYMm,
  } = layout;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([mmPt(PAGE_W), mmPt(PAGE_H)]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageHPt = mmPt(PAGE_H);

  const borderColor = rgb(0.8, 0.84, 0.88);
  const nameColor = rgb(0.12, 0.16, 0.22);
  const mutedColor = rgb(0.58, 0.64, 0.72);

  const jpegCache = await buildSignatureJpegDataCache(sorted);
  const embedCache = new Map();

  const getEmbedded = async (url) => {
    const imageData = url ? jpegCache.get(url) : null;
    if (!imageData?.bytes) return null;
    if (embedCache.has(url)) return embedCache.get(url);
    try {
      const img = await pdfDoc.embedJpg(imageData.bytes);
      embedCache.set(url, img);
      return img;
    } catch {
      return null;
    }
  };

  for (let index = 0; index < sorted.length; index++) {
    const person = sorted[index];
    const col = index % cols;
    const row = Math.floor(index / cols);

    const xMm = gridStartXMm + col * (cellWidthMm + gapMm);
    const yTopMm = gridStartYMm + row * (cellHeightMm + gapMm);
    const x = mmPt(xMm);
    const cellW = mmPt(cellWidthMm);
    const cellH = mmPt(cellHeightMm);
    const y = pageHPt - mmPt(yTopMm) - cellH;

    page.drawRectangle({
      x,
      y,
      width: cellW,
      height: cellH,
      borderColor,
      borderWidth: 0.4,
      color: rgb(1, 1, 1),
    });

    const sigPadMm = 0.8;
    const sigWmm = cellWidthMm - sigPadMm * 2;
    const sigHmm = signatureBoxHeightMm - sigPadMm;
    const sigX = mmPt(xMm + sigPadMm);
    const sigY =
      pageHPt - mmPt(yTopMm + sigPadMm) - mmPt(sigHmm);

    const embedded = await getEmbedded(person.firma);
    if (embedded) {
      const scaled = embedded.scaleToFit(mmPt(sigWmm), mmPt(sigHmm));
      page.drawImage(embedded, {
        x: sigX + (mmPt(sigWmm) - scaled.width) / 2,
        y: sigY + (mmPt(sigHmm) - scaled.height) / 2,
        width: scaled.width,
        height: scaled.height,
      });
    } else {
      const fontSize = Math.min(7, cellWidthMm * 0.32);
      drawCenteredText(page, "Sin firma", x + cellW / 2, y + cellH / 2, {
        font,
        size: fontSize,
        color: mutedColor,
      });
    }

    const fullName = formatPersonFullName(person);
    const nameSize = Math.min(8, Math.max(5, cellWidthMm * 0.24));
    const dniSize = Math.min(6, cellWidthMm * 0.18);
    const hasDni = Boolean(person.dni);
    const textPadMm = 0.9;
    const lineGapMm = 0.35;

    let baseline = y + mmPt(textPadMm);
    if (hasDni) {
      drawCenteredText(
        page,
        `DNI ${person.dni}`,
        x + cellW / 2,
        baseline,
        {
          font,
          size: dniSize,
          color: mutedColor,
          maxWidthPt: cellW - mmPt(2),
        },
      );
      baseline += dniSize * 0.85 + mmPt(lineGapMm);
    }

    drawCenteredText(page, fullName, x + cellW / 2, baseline, {
      font: fontBold,
      size: nameSize,
      color: nameColor,
      maxWidthPt: cellW - mmPt(2),
    });
  }

  const pdfBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  saveAs(
    new Blob([pdfBytes], { type: "application/pdf" }),
    buildCuadroFirmasFilename({ giraLabel, filePrefix, ext: "pdf" }),
  );
}

const DOCX_NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF",
};

const DOCX_NO_BORDERS = {
  top: DOCX_NO_BORDER,
  right: DOCX_NO_BORDER,
  bottom: DOCX_NO_BORDER,
  left: DOCX_NO_BORDER,
  insideHorizontal: DOCX_NO_BORDER,
  insideVertical: DOCX_NO_BORDER,
};

const emptyDocxParagraph = () =>
  new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [],
  });

function createDocxSignatureCell(flatCellImage, layout, isEmpty) {
  const { cellWidthMm, cellHeightMm } = layout;

  if (isEmpty) {
    return new TableCell({
      width: { size: mmTwip(cellWidthMm), type: WidthType.DXA },
      borders: DOCX_NO_BORDERS,
      children: [emptyDocxParagraph()],
    });
  }

  return new TableCell({
    width: { size: mmTwip(cellWidthMm), type: WidthType.DXA },
    borders: DOCX_NO_BORDERS,
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new ImageRun({
            type: flatCellImage.mime === "image/png" ? "png" : "jpg",
            data: flatCellImage.bytes,
            transformation: {
              width: flatCellImage.displayWidthPx || flatCellImage.width,
              height: flatCellImage.displayHeightPx || flatCellImage.height,
            },
          }),
        ],
      }),
    ],
  });
}

/**
 * Genera y descarga un DOCX A4 con la misma grilla de firmas del PDF.
 * Cada recuadro (borde + firma + aclaración) se rasteriza como una sola imagen.
 * @param {{ people: Array<{ id, nombre, apellido, firma?, dni? }>, encargado?: object|null, giraLabel?: string, filePrefix?: string, supabase?: object }} params
 */
export async function exportDestaquesCuadroFirmasDocx({
  people,
  encargado = null,
  giraLabel = "",
  filePrefix = "Destaques",
  supabase = null,
}) {
  const sorted = await prepareCuadroFirmasPeople(people, encargado, supabase);

  if (sorted.length === 0) {
    throw new Error("No hay personas para el cuadro de firmas.");
  }

  const layout = resolveCuadroFirmasLayout(sorted);
  const {
    cols,
    rows,
    cellWidthMm,
    cellHeightMm,
    gapMm,
    marginMm,
  } = layout;
  const jpegCache = await buildSignatureJpegDataCache(sorted);
  const flatCellCache = new Map();

  for (const person of sorted) {
    const sigData = person.firma ? jpegCache.get(person.firma) : null;
    flatCellCache.set(
      person.id,
      await renderSignatureCellToJpeg(person, sigData, layout),
    );
  }

  const tableRows = [];
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const cells = [];
    for (let colIndex = 0; colIndex < cols; colIndex++) {
      const person = sorted[rowIndex * cols + colIndex];
      cells.push(
        createDocxSignatureCell(
          person ? flatCellCache.get(person.id) : null,
          layout,
          !person,
        ),
      );
    }
    tableRows.push(
      new TableRow({
        height: {
          value: mmTwip(cellHeightMm),
          rule: HeightRule.EXACT,
        },
        cantSplit: true,
        children: cells,
      }),
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT,
              width: mmTwip(PAGE_W),
              height: mmTwip(PAGE_H),
            },
            margin: {
              top: mmTwip(marginMm),
              right: mmTwip(marginMm),
              bottom: mmTwip(marginMm),
              left: mmTwip(marginMm),
            },
          },
        },
        children: [
          new Table({
            rows: tableRows,
            width: {
              size: mmTwip(PAGE_W - marginMm * 2),
              type: WidthType.DXA,
            },
            columnWidths: Array.from({ length: cols }, () =>
              mmTwip(cellWidthMm),
            ),
            layout: TableLayoutType.FIXED,
            alignment: AlignmentType.LEFT,
            cellSpacing: {
              value: mmTwip(gapMm),
            },
            borders: DOCX_NO_BORDERS,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(
    blob,
    buildCuadroFirmasFilename({ giraLabel, filePrefix, ext: "docx" }),
  );
}
