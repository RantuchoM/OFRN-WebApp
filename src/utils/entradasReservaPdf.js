import jsPDF from "jspdf";
import { saveAs } from "file-saver";

export function htmlToPlainText(html) {
  if (!html) return "";
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatFechaLarga(fecha) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" });
}

/**
 * @param {Object} p
 * @param {string} p.conciertoNombre
 * @param {string} [p.fechaHora]
 * @param {string} [p.lugarNombre]
 * @param {string} [p.detalleRichtext]
 * @param {string} p.codigoReserva
 * @param {number} p.cantidad
 * @param {string} p.linkConcierto
 * @param {string} p.qrReservaDataUrl
 * @param {string[]} p.entriesQrDataUrls
 * @returns {Promise<Blob>}
 */
export async function buildEntradasReservaPdfBlob(p) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 16;
  const maxTextW = W - 2 * M;
  let y = M;

  const newPageIfNeeded = (nextBlockMm) => {
    const h = doc.internal.pageSize.getHeight();
    if (y + nextBlockMm > h - M) {
      doc.addPage();
      y = M;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Reserva de entradas – Orquesta Filarmónica de Río Negro", M, y, { maxWidth: maxTextW });
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const bloque1 = [
    `Concierto: ${p.conciertoNombre || "—"}`,
    `Fecha y hora: ${formatFechaLarga(p.fechaHora)}`,
    p.lugarNombre ? `Lugar: ${p.lugarNombre}` : null,
    `Código de reserva: ${p.codigoReserva || "—"}`,
    `Cantidad de entradas: ${p.cantidad || "—"}`,
  ].filter(Boolean);
  for (const line of bloque1) {
    const lines = doc.splitTextToSize(line, maxTextW);
    newPageIfNeeded(lines.length * 5 + 2);
    doc.text(lines, M, y);
    y += lines.length * 5 + 1;
  }
  y += 4;

  const det = htmlToPlainText(p.detalleRichtext);
  if (det) {
    doc.setFont("helvetica", "bold");
    doc.text("Sobre el concierto", M, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const par = doc.splitTextToSize(det.slice(0, 4000), maxTextW);
    newPageIfNeeded(par.length * 4.5 + 2);
    doc.text(par, M, y);
    y += par.length * 4.5 + 4;
  }

  newPageIfNeeded(10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const linkLines = doc.splitTextToSize(
    `Link: ${p.linkConcierto || "—"}`,
    maxTextW,
  );
  doc.setTextColor(79, 70, 229);
  doc.text(linkLines, M, y);
  doc.setTextColor(0, 0, 0);
  y += linkLines.length * 4.2 + 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  newPageIfNeeded(60);
  doc.text("QR de reserva (ingreso grupal o control en puerta):", M, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const qrW = 48;
  newPageIfNeeded(qrW + 8);
  doc.addImage(p.qrReservaDataUrl, "PNG", M, y, qrW, qrW);
  y += qrW + 10;

  (p.entriesQrDataUrls || []).forEach((dataUrl, i) => {
    newPageIfNeeded(58);
    doc.setFont("helvetica", "bold");
    doc.text(`Entrada ${i + 1} de ${p.entriesQrDataUrls.length} (ingreso individual):`, M, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    newPageIfNeeded(qrW + 6);
    doc.addImage(dataUrl, "PNG", M, y, qrW, qrW);
    y += qrW + 10;
  });

  y += 4;
  newPageIfNeeded(16);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const foot = doc.splitTextToSize(
    "Conservá este documento. Los códigos QR son personales; presentalos en recepción según las indicaciones de la orquesta.",
    maxTextW,
  );
  doc.text(foot, M, y);
  y += foot.length * 3.2;

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
