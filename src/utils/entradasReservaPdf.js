import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import { ENTRADAS_NOTA_ASISTENCIA_PDF, formatEntradasConciertoFechaHora } from "./entradasReservaCopy.js";

export function htmlToPlainText(html) {
  if (!html) return "";
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tipografías del bloque “Reserva de entradas” (más legibles en A4). */
const FONT_TITLE = 13.5;
const FONT_ORCH = 10.5;
const FONT_FIELD = 9.8;
const LINE_H = 5;
const TITLE_LINE_GAP = 6.8;
const SUB_LINE_GAP = 8.2;
const CARD_PAD_X = 6;
const MEMBRETE_MAX_H_MM = 38;

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {number} innerW
 * @param {string} label
 * @param {unknown} value
 */
function getFieldWrap(doc, innerW, label, value) {
  const prefix = `${label}: `;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_FIELD);
  const pw = doc.getTextWidth(prefix);
  doc.setFont("helvetica", "normal");
  const wrapped = doc.splitTextToSize(String(value ?? "—"), Math.max(28, innerW - pw));
  return { prefix, wrapped, pw };
}

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {number} innerX
 * @param {number} y0
 * @param {number} innerW
 */
function drawFieldRow(doc, innerX, y0, innerW, label, value) {
  const { prefix, wrapped, pw } = getFieldWrap(doc, innerW, label, value);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_FIELD);
  doc.text(prefix, innerX, y0);
  doc.setFont("helvetica", "normal");
  doc.text(wrapped, innerX + pw, y0);
  return y0 + wrapped.length * LINE_H;
}

function headerBodyHeightMm(doc, innerW, p) {
  let h = TITLE_LINE_GAP + SUB_LINE_GAP;
  h += getFieldWrap(doc, innerW, "Concierto", p.conciertoNombre).wrapped.length * LINE_H;
  h += getFieldWrap(doc, innerW, "Fecha y hora", formatEntradasConciertoFechaHora(p.fechaHora)).wrapped.length * LINE_H;
  if (p.lugarNombre) {
    h += getFieldWrap(doc, innerW, "Lugar", p.lugarNombre).wrapped.length * LINE_H;
  }
  h += getFieldWrap(doc, innerW, "Código de reserva", p.codigoReserva).wrapped.length * LINE_H;
  h += getFieldWrap(doc, innerW, "Cantidad de entradas", String(p.cantidad ?? "—")).wrapped.length * LINE_H;
  return h;
}

/**
 * @param {import("jspdf").jsPDF} doc
 */
function drawNotaAsistenciaPdf(doc, x, y0, maxW, nota) {
  const lineH = 4.65;
  const pad = 4;
  doc.setFontSize(8.9);
  doc.setTextColor(66, 32, 6);

  const t1 = doc.splitTextToSize(nota.p1, maxW - 2 * pad);
  const t2 = doc.splitTextToSize(nota.p2Bold, maxW - 2 * pad);
  const t3 = doc.splitTextToSize(nota.p3, maxW - 2 * pad);
  const blockH = (t1.length + t2.length + t3.length) * lineH + pad * 2 + 3;

  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(0.35);
  doc.rect(x, y0, maxW, blockH, "FD");

  let y = y0 + pad + 3.2;
  const tx = x + pad;
  const tw = maxW - 2 * pad;
  doc.setFont("helvetica", "normal");
  doc.text(t1, tx, y, { maxWidth: tw });
  y += t1.length * lineH;
  doc.setFont("helvetica", "bold");
  doc.text(t2, tx, y, { maxWidth: tw });
  y += t2.length * lineH;
  doc.setFont("helvetica", "normal");
  doc.text(t3, tx, y, { maxWidth: tw });
  y += t3.length * lineH;

  doc.setTextColor(0, 0, 0);
  return y0 + blockH + 4;
}

async function loadMembreteFilarmonicaDataUrl() {
  const raw = import.meta.env.BASE_URL ?? "/";
  const base = raw.endsWith("/") ? raw : `${raw}/`;
  const path = `${base}img/logo-filarmonica-2026.png`;
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("FileReader"));
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * PDF: membrete, fila detalle + QR general a la derecha, aviso de asistencia, individuales al pie.
 * @param {Object} p
 * @param {string} p.conciertoNombre
 * @param {string} [p.fechaHora]
 * @param {string} [p.lugarNombre]
 * @param {string} p.codigoReserva
 * @param {number} p.cantidad
 * @param {string} p.qrReservaDataUrl
 * @param {string[]} p.entriesQrDataUrls
 * @param {boolean} [p.qrReservaUsado]
 * @param {boolean[]} [p.entriesUsadas]
 * @returns {Promise<Blob>}
 */
export async function buildEntradasReservaPdfBlob(p) {
  const membreteDataUrl = await loadMembreteFilarmonicaDataUrl();

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 12;
  const maxW = pageW - 2 * M;
  const stripeW = 2.8;
  const colGap = 6;
  const qrLabelH = 5;
  const qrPad = 3;
  /** QR general: ~45% del ancho útil, tope 78 mm. */
  const qrGroupMm = Math.min(78, maxW * 0.42);
  const qrColW = qrGroupMm + qrPad * 2;
  const detailColW = maxW - qrColW - colGap;

  let yTop = M;
  if (membreteDataUrl) {
    const props = doc.getImageProperties(membreteDataUrl);
    let logoW = maxW;
    let logoH = (props.height / props.width) * logoW;
    if (logoH > MEMBRETE_MAX_H_MM) {
      logoH = MEMBRETE_MAX_H_MM;
      logoW = (props.width / props.height) * logoH;
    }
    const xLogo = M + (maxW - logoW) / 2;
    doc.addImage(membreteDataUrl, "PNG", xLogo, yTop, logoW, logoH);
    yTop += logoH + 5;
  }

  const cardTop = yTop;
  const detailInnerX = M + stripeW + CARD_PAD_X + 1.5;
  const detailInnerW = detailColW - stripeW - CARD_PAD_X * 2 - 2;
  const bodyH = headerBodyHeightMm(doc, detailInnerW, p);
  const cardContentH = bodyH + 16;
  const qrBlockH = qrLabelH + 2 + qrGroupMm + 2;
  const rowH = Math.max(cardContentH, qrBlockH);
  const cardH = rowH;

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(M, cardTop, detailColW, cardH, "FD");
  doc.setFillColor(79, 70, 229);
  doc.rect(M, cardTop, stripeW, cardH, "F");

  let yc = cardTop + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_TITLE);
  doc.setTextColor(15, 23, 42);
  doc.text("Reserva de entradas", detailInnerX, yc);
  yc += TITLE_LINE_GAP;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_ORCH);
  doc.setTextColor(71, 85, 105);
  doc.text("Orquesta Filarmónica de Río Negro", detailInnerX, yc);
  yc += SUB_LINE_GAP;
  doc.setTextColor(17, 24, 39);
  yc = drawFieldRow(doc, detailInnerX, yc, detailInnerW, "Concierto", p.conciertoNombre);
  yc = drawFieldRow(doc, detailInnerX, yc, detailInnerW, "Fecha y hora", formatEntradasConciertoFechaHora(p.fechaHora));
  if (p.lugarNombre) {
    yc = drawFieldRow(doc, detailInnerX, yc, detailInnerW, "Lugar", p.lugarNombre);
  }
  yc = drawFieldRow(doc, detailInnerX, yc, detailInnerW, "Código de reserva", p.codigoReserva);
  yc = drawFieldRow(doc, detailInnerX, yc, detailInnerW, "Cantidad de entradas", String(p.cantidad ?? "—"));

  const qrColX = M + detailColW + colGap;
  const qrImgX = qrColX + (qrColW - qrGroupMm) / 2;
  const qrImgY = cardTop + (cardH - qrBlockH) / 2 + qrLabelH + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(p.qrReservaUsado ? 185 : 30, p.qrReservaUsado ? 28 : 27, p.qrReservaUsado ? 28 : 75);
  doc.text(
    p.qrReservaUsado ? "QR general (ya ingresadas)" : "QR general",
    qrColX + qrColW / 2,
    cardTop + (cardH - qrBlockH) / 2 + 3.5,
    { align: "center" },
  );
  doc.addImage(p.qrReservaDataUrl, "PNG", qrImgX, qrImgY, qrGroupMm, qrGroupMm);

  let yAfterRow = cardTop + cardH + 6;
  yAfterRow = drawNotaAsistenciaPdf(doc, M, yAfterRow, maxW, ENTRADAS_NOTA_ASISTENCIA_PDF);

  const entries = p.entriesQrDataUrls || [];
  const nInd = entries.length;
  const footReserveMm = 8;
  const gapInd = 10;
  const qrIndCapMm = 28;
  const qrIndFloorMm = 20;
  const indLabelH = 4;

  if (nInd > 0) {
    const qrIndMm = Math.min(qrIndCapMm, (maxW - (nInd - 1) * gapInd) / nInd, qrIndCapMm);
    const indBlockH = indLabelH + 2 + qrIndMm + 2;
    /** Pegados al pie: justo arriba del footer. */
    let yInd = pageH - M - footReserveMm - indBlockH;
    if (yInd < yAfterRow + 4) {
      yInd = yAfterRow + 4;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("QRs individuales (solo si llegan por separado)", pageW / 2, yInd, { align: "center" });
    yInd += indLabelH + 1.5;

    const sizedInd = Math.max(qrIndFloorMm, Math.min(qrIndMm, (maxW - (nInd - 1) * gapInd) / nInd));
    const rowW = nInd * sizedInd + (nInd - 1) * gapInd;
    let xInd = (pageW - rowW) / 2;
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    const usadas = p.entriesUsadas || [];
    entries.forEach((dataUrl, i) => {
      const usada = Boolean(usadas[i]);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(usada ? 185 : 100, usada ? 28 : 116, usada ? 28 : 139);
      doc.text(usada ? `Entrada ${i + 1} · usada` : `Entrada ${i + 1}`, xInd + sizedInd / 2, yInd - 0.8, { align: "center" });
      doc.addImage(dataUrl, "PNG", xInd, yInd, sizedInd, sizedInd);
      xInd += sizedInd + gapInd;
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(90, 90, 90);
  const footLines = doc.splitTextToSize("Conservá este PDF. Los QR son personales; presentalos en recepción.", maxW);
  doc.text(footLines, M, pageH - M - 1);

  return doc.output("blob");
}

export function downloadEntradasReservaPdfBlob(blob, filename) {
  saveAs(blob, filename);
}

export function blobToBase64NoPrefix(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(new Error("No se pudo leer el PDF"));
    r.readAsDataURL(blob);
  });
}

export function makeEntradasReservaFilename(codigoReserva) {
  const safe = String(codigoReserva || "reserva").replace(/[^\w-]+/g, "_");
  return `entradas-OFRN-${safe}.pdf`;
}
