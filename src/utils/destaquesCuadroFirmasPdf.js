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
  TextRun,
  VerticalAlignTable,
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
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    dni: row.dni,
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
  const rest = (people || [])
    .filter((p) => Number(p.id) !== encargadoId)
    .sort((a, b) => {
      const ap = String(a.apellido || "").localeCompare(
        String(b.apellido || ""),
        "es",
      );
      if (ap !== 0) return ap;
      return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
    });
  const head = toCuadroFirmasPerson(encargado);
  return head ? [head, ...rest] : rest;
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

function scaleJpegDataToFitMm(imageData, maxWidthMm, maxHeightMm) {
  if (!imageData?.width || !imageData?.height) return null;
  const maxWidthPx = mmPx(maxWidthMm);
  const maxHeightPx = mmPx(maxHeightMm);
  const scale = Math.min(
    maxWidthPx / imageData.width,
    maxHeightPx / imageData.height,
  );
  return {
    width: Math.max(1, Math.round(imageData.width * scale)),
    height: Math.max(1, Math.round(imageData.height * scale)),
  };
}

/**
 * Genera y descarga un PDF A4 aplanado con grilla de firmas (pdf-lib, imágenes comprimidas).
 * @param {{ people: Array<{ id, nombre, apellido, firma?, dni? }>, encargado?: object|null, giraLabel?: string, filePrefix?: string }} params
 */
export async function exportDestaquesCuadroFirmasPdf({
  people,
  encargado = null,
  giraLabel = "",
  filePrefix = "Destaques",
}) {
  const sorted = buildCuadroFirmasPeopleList(people, encargado);

  if (sorted.length === 0) {
    throw new Error("No hay personas para el cuadro de firmas.");
  }

  const layout = computeSignatureGridLayout(sorted.length);
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
    const hasDni = person.dni && cellHeightMm >= 16;
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

const DOCX_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: "CCD6E0",
};

const DOCX_NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF",
};

const DOCX_CELL_BORDERS = {
  top: DOCX_BORDER,
  right: DOCX_BORDER,
  bottom: DOCX_BORDER,
  left: DOCX_BORDER,
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

function createDocxTextParagraph(text, { size, bold = false, color }) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0, line: Math.round(size * 18) },
    children: [
      new TextRun({
        text,
        bold,
        size: Math.round(size * 2),
        font: "Arial",
        color,
      }),
    ],
  });
}

function createDocxSignatureInnerTable(person, imageData, layout) {
  const {
    cellWidthMm,
    cellHeightMm,
    nameBandMm,
  } = layout;
  const padMm = 0.8;
  const signatureAreaHeightMm = Math.max(1, cellHeightMm - nameBandMm);
  const signatureMaxWidthMm = Math.max(1, cellWidthMm - padMm * 2);
  const signatureMaxHeightMm = Math.max(1, signatureAreaHeightMm - padMm);
  const imageSize = scaleJpegDataToFitMm(
    imageData,
    signatureMaxWidthMm,
    signatureMaxHeightMm,
  );

  const signatureChildren = imageData?.bytes && imageSize
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [
            new ImageRun({
              type: "jpg",
              data: imageData.bytes,
              transformation: imageSize,
            }),
          ],
        }),
      ]
    : [
        createDocxTextParagraph("Sin firma", {
          size: Math.min(7, cellWidthMm * 0.32),
          color: "94A3B8",
        }),
      ];

  const fullName = formatPersonFullName(person);
  const nameSize = Math.min(8, Math.max(5, cellWidthMm * 0.24));
  const dniSize = Math.min(6, cellWidthMm * 0.18);
  const hasDni = person.dni && cellHeightMm >= 16;
  const nameChildren = [
    ...(hasDni
      ? [
          createDocxTextParagraph(`DNI ${person.dni}`, {
            size: dniSize,
            color: "94A3B8",
          }),
        ]
      : []),
    createDocxTextParagraph(fullName, {
      size: nameSize,
      bold: true,
      color: "1E293B",
    }),
  ];

  return new Table({
    rows: [
      new TableRow({
        height: {
          value: mmTwip(signatureAreaHeightMm),
          rule: HeightRule.EXACT,
        },
        children: [
          new TableCell({
            borders: DOCX_NO_BORDERS,
            margins: {
              top: mmTwip(padMm),
              right: mmTwip(padMm),
              bottom: 0,
              left: mmTwip(padMm),
            },
            verticalAlign: VerticalAlignTable.CENTER,
            children: signatureChildren,
          }),
        ],
      }),
      new TableRow({
        height: {
          value: mmTwip(nameBandMm),
          rule: HeightRule.EXACT,
        },
        children: [
          new TableCell({
            borders: DOCX_NO_BORDERS,
            margins: {
              top: 0,
              right: mmTwip(0.9),
              bottom: mmTwip(0.5),
              left: mmTwip(0.9),
            },
            verticalAlign: VerticalAlignTable.CENTER,
            children: nameChildren,
          }),
        ],
      }),
    ],
    width: {
      size: mmTwip(cellWidthMm),
      type: WidthType.DXA,
    },
    columnWidths: [mmTwip(cellWidthMm)],
    layout: TableLayoutType.FIXED,
    borders: DOCX_NO_BORDERS,
  });
}

function createDocxSignatureCell(person, imageData, layout) {
  const { cellWidthMm, cellHeightMm } = layout;

  if (!person) {
    return new TableCell({
      width: { size: mmTwip(cellWidthMm), type: WidthType.DXA },
      borders: DOCX_NO_BORDERS,
      children: [emptyDocxParagraph()],
    });
  }

  return new TableCell({
    width: { size: mmTwip(cellWidthMm), type: WidthType.DXA },
    borders: DOCX_CELL_BORDERS,
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    verticalAlign: VerticalAlignTable.TOP,
    children: [
      createDocxSignatureInnerTable(person, imageData, {
        ...layout,
        cellHeightMm,
      }),
    ],
  });
}

/**
 * Genera y descarga un DOCX A4 editable con la misma grilla de firmas del PDF.
 * @param {{ people: Array<{ id, nombre, apellido, firma?, dni? }>, encargado?: object|null, giraLabel?: string, filePrefix?: string }} params
 */
export async function exportDestaquesCuadroFirmasDocx({
  people,
  encargado = null,
  giraLabel = "",
  filePrefix = "Destaques",
}) {
  const sorted = buildCuadroFirmasPeopleList(people, encargado);

  if (sorted.length === 0) {
    throw new Error("No hay personas para el cuadro de firmas.");
  }

  const layout = computeSignatureGridLayout(sorted.length);
  const {
    cols,
    rows,
    cellWidthMm,
    cellHeightMm,
    gapMm,
    marginMm,
  } = layout;
  const jpegCache = await buildSignatureJpegDataCache(sorted);

  const tableRows = [];
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const cells = [];
    for (let colIndex = 0; colIndex < cols; colIndex++) {
      const person = sorted[rowIndex * cols + colIndex];
      cells.push(
        createDocxSignatureCell(
          person,
          person?.firma ? jpegCache.get(person.firma) : null,
          layout,
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
