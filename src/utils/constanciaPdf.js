import jsPDF from "jspdf";
import { PDFDocument } from "pdf-lib";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";
import {
  CONSTANCIA_CIUDAD_EMISION,
  CONSTANCIA_TIPOS,
} from "../constants/constancias";

/**
 * jsPDF no arma AcroForm, así que `form.flatten()` no saca el texto:
 * hay que rasterizar la página con pdf.js (misma 3.11 que el resto de la app).
 */

/** 72 dpi × 3 ≈ 216 dpi: nítido al imprimir, y el texto deja de ser seleccionable. */
const FLATTEN_SCALE = 3;

/** Assets del modelo Word (header CULTURA RN + firma Spelzini). */
export const CONSTANCIA_LOGO_URL = "/plantillas/constancia/image2.png";
export const CONSTANCIA_FIRMA_URL = "/plantillas/constancia/image1.png";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const assetCache = new Map();

function parseIsoDate(iso) {
  if (!iso) return null;
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

/** Como el Word: "03 de noviembre de 2026". */
export function formatFechaLargaEs(isoOrDate, { padDay = true } = {}) {
  let d;
  let m;
  let y;
  if (isoOrDate instanceof Date) {
    d = isoOrDate.getDate();
    m = isoOrDate.getMonth();
    y = isoOrDate.getFullYear();
  } else {
    const p = parseIsoDate(isoOrDate);
    if (!p) return "";
    d = p.d;
    m = p.m - 1;
    y = p.y;
  }
  const day = padDay ? String(d).padStart(2, "0") : String(d);
  return `${day} de ${MESES[m]} de ${y}`;
}

/**
 * Rango de fechas estilo plantilla:
 * "del 18 al 22 de noviembre del presente año" /
 * "del 18 de noviembre al 5 de diciembre de 2026"
 */
export function formatRangoFechasConstancia(desdeIso, hastaIso, anioReferencia) {
  const a = parseIsoDate(desdeIso);
  const b = parseIsoDate(hastaIso) || a;
  if (!a) return "";

  const anioRef = anioReferencia ?? new Date().getFullYear();
  const sameMonth = a.y === b.y && a.m === b.m;
  const sameYear = a.y === b.y;
  const yearPhrase =
    sameYear && a.y === anioRef ? "del presente año" : `de ${a.y}`;

  if (sameMonth) {
    if (a.d === b.d) {
      return `el ${a.d} de ${MESES[a.m - 1]} ${yearPhrase}`;
    }
    return `del ${a.d} al ${b.d} de ${MESES[a.m - 1]} ${yearPhrase}`;
  }

  if (sameYear) {
    return `del ${a.d} de ${MESES[a.m - 1]} al ${b.d} de ${MESES[b.m - 1]} ${yearPhrase}`;
  }

  return `del ${a.d} de ${MESES[a.m - 1]} de ${a.y} al ${b.d} de ${MESES[b.m - 1]} de ${b.y}`;
}

export function formatLocalidadesConstancia(nombres = []) {
  const list = [
    ...new Set(
      (nombres || []).map((n) => String(n || "").trim()).filter(Boolean),
    ),
  ];
  if (list.length === 0) return "la localidad correspondiente";
  if (list.length === 1) return `la ciudad de ${list[0]}`;
  if (list.length === 2) return `las ciudades de ${list[0]} y ${list[1]}`;
  const head = list.slice(0, -1).join(", ");
  return `las ciudades de ${head} y ${list[list.length - 1]}`;
}

export function tratamientoConstancia(genero) {
  const g = String(genero || "").trim().toUpperCase();
  if (g === "F") {
    return { titulo: "la Sra.", participio: "convocada", articulo: "la" };
  }
  if (g === "M") {
    return { titulo: "el Sr.", participio: "convocado", articulo: "el" };
  }
  return { titulo: "", participio: "convocado/a", articulo: "" };
}

/**
 * @param {object} data
 * @param {string} [data.tipo] convocatoria | participacion
 */
export function buildConstanciaTexto(data) {
  const tr = tratamientoConstancia(data.genero);
  const nombreCompleto = [data.nombre, data.apellido]
    .filter(Boolean)
    .join(" ")
    .trim();
  const dni = String(data.dni || "").replace(/\s+/g, "");
  // Vacío = omitir «como {función}» en el cuerpo (no cae a instrumento).
  const como = String(data.como ?? data.funcion ?? "")
    .trim();
  const emision =
    data.fechaEmision instanceof Date ? data.fechaEmision : new Date();
  const ciudad = data.ciudadEmision || CONSTANCIA_CIUDAD_EMISION;
  const locs = Array.isArray(data.localidades)
    ? formatLocalidadesConstancia(data.localidades)
    : String(data.localidades || "").trim() ||
      "la localidad correspondiente";
  const rango = formatRangoFechasConstancia(
    data.fechaDesde,
    data.fechaHasta,
    emision.getFullYear(),
  );

  const esParticipacion =
    String(data.tipo || CONSTANCIA_TIPOS.convocatoria) ===
    CONSTANCIA_TIPOS.participacion;

  const cuerpo = esParticipacion
    ? como
      ? `Por medio de la presente dejo constancia de que ${nombreCompleto}, DNI ${dni}, ` +
        `participó como ${como} de los ensayos y conciertos ` +
        `de la Orquesta Filarmónica de Río Negro ${rango} en ${locs}.`
      : `Por medio de la presente dejo constancia de que ${nombreCompleto}, DNI ${dni}, ` +
        `participó de los ensayos y conciertos ` +
        `de la Orquesta Filarmónica de Río Negro ${rango} en ${locs}.`
    : como
      ? `Por medio de la presente dejo constancia de que ${nombreCompleto}, DNI ${dni}, ` +
        `ha sido ${tr.participio} como ${como} a participar de los ensayos y conciertos ` +
        `de la Orquesta Filarmónica de Río Negro ${rango} en ${locs}.`
      : `Por medio de la presente dejo constancia de que ${nombreCompleto}, DNI ${dni}, ` +
        `ha sido ${tr.participio} a participar de los ensayos y conciertos ` +
        `de la Orquesta Filarmónica de Río Negro ${rango} en ${locs}.`;

  return {
    encabezado: `${ciudad},  ${formatFechaLargaEs(emision)}`,
    destinatario: "A quien corresponda",
    cuerpo,
    cierre:
      "Sin otro particular, aprovechamos la oportunidad para saludarlos cordialmente.",
  };
}

async function fetchImageDataUrl(url) {
  if (assetCache.has(url)) return assetCache.get(url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo cargar imagen de plantilla: ${url}`);
  }
  const blob = await res.blob();
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`FileReader falló: ${url}`));
    reader.readAsDataURL(blob);
  });
  assetCache.set(url, dataUrl);
  return dataUrl;
}

function uint8ToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Calibri regular (embebe en el PDF vía jsPDF). */
export const CONSTANCIA_FONT_URL = "/fonts/Calibri.ttf";
const CONSTANCIA_FONT_FAMILY = "Calibri";

/**
 * Layout tipográfico:
 * - Calibri 13pt
 * - Fecha alineada a la derecha
 * - Cuerpo/cierre justificados, interlineado 1.5, sangría 1ª línea ~40 mm
 */
const LAYOUT = {
  pageW: 210,
  pageH: 297,
  marginL: 12.7,
  marginR: 22.4,
  marginB: 12.7,
  /** Indentación adicional izquierda del Word (~708 twips). */
  textIndentL: 12.5,
  /** Sangría de primera línea (~2268 twips). */
  firstLineIndent: 40,
  fontPt: 13,
  /** line=360 / 240 = 1.5 → ~19.5 pt ≈ 6.88 mm. */
  lineHeightMm: (13 * 1.5 * 25.4) / 72,
  paraGapMm: 8,
};

async function fetchBinaryBase64(url) {
  if (assetCache.has(url)) return assetCache.get(url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo cargar fuente/asset: ${url}`);
  }
  const buf = await res.arrayBuffer();
  const base64 = uint8ToBase64(new Uint8Array(buf));
  assetCache.set(url, base64);
  return base64;
}

function ensureConstanciaFont(doc, fontBase64) {
  const vfsName = "Calibri.ttf";
  if (!doc.getFontList()?.[CONSTANCIA_FONT_FAMILY]) {
    doc.addFileToVFS(vfsName, fontBase64);
    doc.addFont(vfsName, CONSTANCIA_FONT_FAMILY, "normal");
  }
  doc.setFont(CONSTANCIA_FONT_FAMILY, "normal");
}

function buildLinesWithFirstIndent(doc, text, fullW, firstIndent) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [];
  let i = 0;
  let isFirst = true;
  while (i < words.length) {
    const maxW = isFirst ? Math.max(20, fullW - firstIndent) : fullW;
    let line = words[i];
    i += 1;
    while (i < words.length) {
      const trial = `${line} ${words[i]}`;
      if (doc.getTextWidth(trial) <= maxW) {
        line = trial;
        i += 1;
      } else {
        break;
      }
    }
    lines.push({ text: line, indent: isFirst ? firstIndent : 0, full: false });
    isFirst = false;
  }
  if (lines.length > 1) {
    for (let k = 0; k < lines.length - 1; k += 1) lines[k].full = true;
  }
  return lines;
}

/** Dibuja párrafo justificado (última línea a la izquierda), con sangría 1ª línea. */
function drawJustifiedParagraph(doc, text, x, y, fullW, firstIndent, lineH) {
  const lines = buildLinesWithFirstIndent(doc, text, fullW, firstIndent);
  let cursorY = y;
  for (const line of lines) {
    const lineX = x + line.indent;
    const availW = fullW - line.indent;
    const words = line.text.split(/\s+/);
    if (!line.full || words.length < 2) {
      doc.text(line.text, lineX, cursorY);
    } else {
      const textW = words.reduce((s, w) => s + doc.getTextWidth(w), 0);
      const gaps = words.length - 1;
      const spaceW = Math.max(0.4, (availW - textW) / gaps);
      let cx = lineX;
      words.forEach((w, idx) => {
        doc.text(w, cx, cursorY);
        cx += doc.getTextWidth(w) + (idx < gaps ? spaceW : 0);
      });
    }
    cursorY += lineH;
  }
  return cursorY;
}

async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }
  return pdfjsLib;
}

function canvasToPngBytes(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No se pudo rasterizar la constancia"));
        return;
      }
      blob.arrayBuffer().then(
        (buf) => resolve(new Uint8Array(buf)),
        (err) => reject(err),
      );
    }, "image/png");
  });
}

/**
 * Reescribe el PDF vectorial como una imagen por página.
 * Sin esto el certificado se descarga con texto seleccionable (editable).
 * @param {ArrayBuffer | Uint8Array} raw
 * @returns {Promise<Uint8Array>}
 */
async function flattenPdfToImageBytes(raw) {
  if (typeof document === "undefined") {
    throw new Error("El PDF de la constancia solo se aplana en el navegador");
  }
  const pdfjsLib = await loadPdfJs();
  const src = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  const task = pdfjsLib.getDocument({ data: src.slice() });
  const out = await PDFDocument.create();
  try {
    const pdf = await task.promise;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: FLATTEN_SCALE });
      const canvas = document.createElement("canvas");
      const width = Math.ceil(viewport.width);
      const height = Math.ceil(viewport.height);
      canvas.width = width;
      canvas.height = height;
      const ctx =
        canvas.getContext("2d", { alpha: false }) || canvas.getContext("2d");
      if (!ctx) {
        throw new Error("No se pudo rasterizar la constancia");
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const pngBytes = await canvasToPngBytes(canvas);
      const image = await out.embedPng(pngBytes);
      const pdfPage = out.addPage([base.width, base.height]);
      pdfPage.drawImage(image, {
        x: 0,
        y: 0,
        width: base.width,
        height: base.height,
      });
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  const saved = await out.save();
  return saved instanceof Uint8Array ? saved : new Uint8Array(saved);
}

/**
 * PDF aplanado con logo + texto + firma (modelo Word).
 * @param {object} data
 * @param {boolean} [data.omitFirma] Si true, no dibuja la firma (plantilla para firmar a mano).
 * @param {boolean} [data.paraFirmar] Alias de omitFirma + nombre de archivo «para firmar».
 * @returns {Promise<{ blob: Blob, base64: string, filename: string, texto: object }>}
 */
export async function generateConstanciaPdf(data) {
  const omitFirma = Boolean(data?.omitFirma || data?.paraFirmar);
  const texto = buildConstanciaTexto(data);
  const assetPromises = [
    fetchImageDataUrl(CONSTANCIA_LOGO_URL),
    fetchBinaryBase64(CONSTANCIA_FONT_URL),
  ];
  if (!omitFirma) {
    assetPromises.splice(1, 0, fetchImageDataUrl(CONSTANCIA_FIRMA_URL));
  }
  const assets = await Promise.all(assetPromises);
  const logoDataUrl = assets[0];
  const firmaDataUrl = omitFirma ? null : assets[1];
  const fontBase64 = omitFirma ? assets[1] : assets[2];

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const {
    pageW,
    pageH,
    marginL,
    marginR,
    marginB,
    textIndentL,
    firstLineIndent,
    fontPt,
    lineHeightMm,
    paraGapMm,
  } = LAYOUT;

  const textL = marginL + textIndentL;
  const textR = pageW - marginR;
  const contentW = textR - textL;

  // Header: CULTURA RN (~67.8 × 12.2 mm)
  const logoW = 67.8;
  const logoProps = doc.getImageProperties(logoDataUrl);
  const logoH = (logoProps.height / logoProps.width) * logoW;
  const logoX = marginL + 6.7;
  const logoY = 10;
  doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoW, logoH);

  let y = logoY + logoH + 16;
  ensureConstanciaFont(doc, fontBase64);
  doc.setFontSize(fontPt);
  doc.setTextColor(0, 0, 0);

  // Fecha / localidad de emisión — alineada a la derecha (como el Word)
  doc.text(texto.encabezado, textR, y, { align: "right" });
  y += lineHeightMm + paraGapMm;

  // Destinatario — justificado (en una línea queda igual que izquierda)
  doc.text(texto.destinatario, textL, y);
  y += lineHeightMm + paraGapMm;

  // Cuerpo — justificado + interlineado 1.5 + sangría 1ª línea
  y = drawJustifiedParagraph(
    doc,
    texto.cuerpo,
    textL,
    y,
    contentW,
    firstLineIndent,
    lineHeightMm,
  );
  y += paraGapMm;

  // Cierre — mismo formato
  y = drawJustifiedParagraph(
    doc,
    texto.cierre,
    textL,
    y,
    contentW,
    firstLineIndent,
    lineHeightMm,
  );
  y += paraGapMm + 4;

  // Firma Spelzini — a la derecha (omitida en plantilla «para firmar»)
  if (!omitFirma && firmaDataUrl) {
    const firmaW = 38;
    const firmaProps = doc.getImageProperties(firmaDataUrl);
    const firmaH = (firmaProps.height / firmaProps.width) * firmaW;
    const firmaX = marginL + 95.25;
    const firmaY = Math.min(y, pageH - marginB - firmaH);
    doc.addImage(firmaDataUrl, "PNG", firmaX, firmaY, firmaW, firmaH);
  }

  const raw = doc.output("arraybuffer");
  const bytes = await flattenPdfToImageBytes(raw);
  const base64 = uint8ToBase64(bytes);
  const blob = new Blob([bytes], { type: "application/pdf" });

  const safeName = [data.apellido, data.nombre]
    .filter(Boolean)
    .join("_")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 60);
  const tipoSlug = omitFirma
    ? "Participacion_para_firmar"
    : String(data.tipo || "") === CONSTANCIA_TIPOS.participacion
      ? "Participacion_realizada"
      : "Convocatoria";
  const filename = `Constancia_${tipoSlug}_${safeName || "OFRN"}.pdf`;

  return { blob, base64, filename, texto };
}
