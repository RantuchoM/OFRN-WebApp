import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";

const PAGE_W = 210;
const PAGE_H = 297;
const MM_TO_PT = 72 / 25.4;
const mmPt = (v) => v * MM_TO_PT;

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
 * Prioriza celdas cuadradas y zona de firma casi a altura completa (nombre solapado).
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
  } = opts;

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
    const cellH = (usableH - gapMm * (rows - 1)) / rows;
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
    const cellH = (usableH - gapMm * (rows - 1)) / rows;
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

function blobToJpegBytes(blob, maxW, maxH, quality) {
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
          resolve(new Uint8Array(await jpegBlob.arrayBuffer()));
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

async function loadSignatureJpegBytes(url) {
  if (!url || url === "NULL") return null;
  try {
    const res = await fetch(String(url).trim(), { method: "GET", mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await blobToJpegBytes(
      blob,
      SIG_MAX_PX.w,
      SIG_MAX_PX.h,
      SIG_JPEG_QUALITY,
    );
  } catch {
    return null;
  }
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

  const jpegCache = new Map();
  const embedCache = new Map();

  for (const person of sorted) {
    const key = person.firma || "";
    if (!key || jpegCache.has(key)) continue;
    jpegCache.set(key, await loadSignatureJpegBytes(key));
  }

  const getEmbedded = async (url) => {
    const bytes = url ? jpegCache.get(url) : null;
    if (!bytes) return null;
    if (embedCache.has(url)) return embedCache.get(url);
    try {
      const img = await pdfDoc.embedJpg(bytes);
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

    const fullName = `${person.apellido || ""}, ${person.nombre || ""}`
      .trim()
      .replace(/^,\s*|,\s*$/g, "");
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

  const safeLabel = String(giraLabel || filePrefix || "Gira")
    .replace(/[^a-z0-9]/gi, "_")
    .slice(0, 40);
  const safePrefix = String(filePrefix || "Destaques")
    .replace(/[^a-z0-9]/gi, "_")
    .slice(0, 24);
  const dateStr = new Date().toISOString().slice(0, 10);
  saveAs(
    new Blob([pdfBytes], { type: "application/pdf" }),
    `Cuadro_Firmas_${safePrefix}_${safeLabel}_${dateStr}.pdf`,
  );
}
