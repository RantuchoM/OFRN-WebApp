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
 * PDF simplificado: membrete RN, caja de datos (estilo mail), nota en texto, QR grupo grande y fila de individuales.
 * @param {Object} p
 * @param {string} p.conciertoNombre
 * @param {string} [p.fechaHora]
 * @param {string} [p.lugarNombre]
 * @param {string} p.codigoReserva
 * @param {number} p.cantidad
 * @param {string} p.qrReservaDataUrl
 * @param {string[]} p.entriesQrDataUrls
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
  const innerX = M + stripeW + CARD_PAD_X + 1.5;
  const innerW = maxW - stripeW - CARD_PAD_X * 2 - 2;

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
  const innerTop = cardTop + 8;
  const bodyH = headerBodyHeightMm(doc, innerW, p);
  const cardH = bodyH + 16;
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(M, cardTop, maxW, cardH, "FD");
  doc.setFillColor(79, 70, 229);
  doc.rect(M, cardTop, stripeW, cardH, "F");

  let yc = innerTop;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_TITLE);
  doc.setTextColor(15, 23, 42);
  doc.text("Reserva de entradas", innerX, yc);
  yc += TITLE_LINE_GAP;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_ORCH);
  doc.setTextColor(71, 85, 105);
  doc.text("Orquesta Filarmónica de Río Negro", innerX, yc);
  yc += SUB_LINE_GAP;
  doc.setTextColor(17, 24, 39);
  yc = drawFieldRow(doc, innerX, yc, innerW, "Concierto", p.conciertoNombre);
  yc = drawFieldRow(doc, innerX, yc, innerW, "Fecha y hora", formatEntradasConciertoFechaHora(p.fechaHora));
  if (p.lugarNombre) {
    yc = drawFieldRow(doc, innerX, yc, innerW, "Lugar", p.lugarNombre);
  }
  yc = drawFieldRow(doc, innerX, yc, innerW, "Código de reserva", p.codigoReserva);
  yc = drawFieldRow(doc, innerX, yc, innerW, "Cantidad de entradas", String(p.cantidad ?? "—"));

  let yAfterCard = cardTop + cardH + 6;
  yAfterCard = drawNotaAsistenciaPdf(doc, M, yAfterCard, maxW, ENTRADAS_NOTA_ASISTENCIA_PDF);

  const entries = p.entriesQrDataUrls || [];
  const nInd = entries.length;
  const bottomFootMm = 7;
  const gapQr = 4;
  const labelH = 4;
  const gapSection = 7;

  const availQr = pageH - M - bottomFootMm - yAfterCard - gapSection - labelH * 2 - 6;

  let qrGroupMm = Math.min(58, maxW * 0.42, Math.max(36, availQr * 0.5));
  const rowIndMm = availQr - qrGroupMm - gapSection - labelH * 2;
  const gapInd = 3;
  let qrIndMm =
    nInd > 0 ? Math.min(46, (maxW - (nInd - 1) * gapInd) / nInd, Math.max(24, rowIndMm - 2)) : 0;

  if (nInd > 0 && qrGroupMm + qrIndMm + gapSection + labelH * 2 > availQr + 2) {
    qrGroupMm = Math.max(34, availQr - (qrIndMm + gapSection + labelH * 2 + 6));
  }

  let yQr = yAfterCard + gapSection;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 27, 75);
  doc.text("QR de reserva (toda la fila / grupo)", pageW / 2, yQr, { align: "center" });
  yQr += labelH + 1;
  const xGroup = (pageW - qrGroupMm) / 2;
  doc.addImage(p.qrReservaDataUrl, "PNG", xGroup, yQr, qrGroupMm, qrGroupMm);
  yQr += qrGroupMm + gapQr + 4;

  if (nInd > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Entradas individuales (una por persona)", pageW / 2, yQr, { align: "center" });
    yQr += labelH + 1.5;
    const rowW = nInd * qrIndMm + (nInd - 1) * gapInd;
    let xInd = (pageW - rowW) / 2;
    doc.setFontSize(6.8);
    entries.forEach((dataUrl, i) => {
      doc.setFont("helvetica", "bold");
      doc.text(`Entrada ${i + 1}`, xInd + qrIndMm / 2, yQr - 0.6, { align: "center" });
      doc.addImage(dataUrl, "PNG", xInd, yQr, qrIndMm, qrIndMm);
      xInd += qrIndMm + gapInd;
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
