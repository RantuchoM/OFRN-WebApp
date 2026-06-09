import jsPDF from "jspdf";
import { formatSecondsToTime } from "./time";
import { getRepertoireSelectionPdfFileName } from "./repertoireSelectionStorage";

const stripHtml = (html) => {
  if (!html) return "";
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>\s*<div[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const PAGE_W = 210;
const MARGIN = 12;
const RIGHT_PAD = 4;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LEFT_GUTTER = 9;
const CONTENT_X = MARGIN + LEFT_GUTTER + 1.5;
const CONTENT_W_INNER = CONTENT_W - LEFT_GUTTER - 1.5 - RIGHT_PAD;
const TEXT_RIGHT = MARGIN + CONTENT_W - RIGHT_PAD;
const BLOCK_GAP = 0.6;
const BLOCK_PAD_V = 2.8;
const META_MAX_W = 58;

function ensureSpace(doc, y, needed) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed <= pageH - MARGIN) return y;
  doc.addPage();
  return MARGIN + BLOCK_PAD_V;
}

function drawWrappedText(doc, text, x, y, maxWidth, lineHeight, options = {}) {
  const { fontSize = 8, fontStyle = "normal", color = [60, 60, 60] } = options;
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", fontStyle);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text || "-", maxWidth);
  lines.forEach((line) => {
    y = ensureSpace(doc, y, lineHeight);
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

function drawMetaBlock(doc, metaLine, y) {
  if (!metaLine) return { y, lineCount: 0 };

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const metaLines = doc.splitTextToSize(metaLine, META_MAX_W);
  metaLines.forEach((line, i) => {
    doc.text(line, TEXT_RIGHT, y + i * 3.6, { align: "right" });
  });
  return { y, lineCount: metaLines.length };
}

/** Icono carpeta clickeable (estilo IconFolder) debajo del número de obra */
function drawFolderDriveLink(doc, cx, y, url) {
  const size = 4.2;
  const left = cx - size / 2;
  const top = y;
  const tabH = size * 0.28;
  const tabW = size * 0.48;
  const bodyH = size * 0.72;

  doc.setDrawColor(37, 99, 235);
  doc.setFillColor(219, 234, 254);
  doc.setLineWidth(0.25);
  doc.roundedRect(left, top, tabW, tabH, 0.4, 0.4, "FD");
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(left, top + tabH * 0.55, size, bodyH, 0.5, 0.5, "FD");

  const hitW = size + 1.2;
  const hitH = size + 0.8;
  doc.link(cx - hitW / 2, top - 0.3, hitW, hitH, { url: url.trim() });
}

function buildComposerLine(work) {
  const composer = stripHtml(work.compositor_full) || "Sin compositor";
  const arr = stripHtml(work.arreglador_full || "").trim();
  if (!arr) return composer;
  return `${composer}  ·  Arr: ${arr}`;
}

function buildMetaLine(work) {
  const parts = [];
  if (work.instrumentacion) parts.push(work.instrumentacion);
  if (work.duracion_segundos != null) {
    parts.push(formatSecondsToTime(work.duracion_segundos));
  }
  const tags = (work.tags_objects || [])
    .map((t) => t.tag)
    .filter(Boolean)
    .join(", ");
  if (tags) parts.push(tags);
  return parts.join("  ·  ");
}

/**
 * @param {Array<object>} works Obras procesadas (RepertoireView) en el orden deseado
 * @param {{ title?: string }} [options]
 */
export function exportRepertoireSelectionPdf(works, options = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const title = options.title || "Selección de Obras — Archivo OFRN";
  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(title, MARGIN, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${works.length} obra${works.length === 1 ? "" : "s"}`, MARGIN, y);
  y += 4;

  works.forEach((work, index) => {
    y = ensureSpace(doc, y, 18);
    const blockTop = y;
    y += BLOCK_PAD_V;

    const numCx = MARGIN + LEFT_GUTTER / 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text(`${index + 1}.`, numCx, y, { align: "center" });

    if (work.link_drive?.trim()) {
      drawFolderDriveLink(doc, numCx, y + 2.4, work.link_drive);
    }

    const composerLine = buildComposerLine(work);
    const metaLine = buildMetaLine(work);
    const composerMaxW = metaLine
      ? Math.max(36, CONTENT_W_INNER - META_MAX_W - 5)
      : CONTENT_W_INNER;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    const composerLines = doc.splitTextToSize(composerLine, composerMaxW);
    const rowY = y;
    doc.text(composerLines[0], CONTENT_X, rowY);

    const { lineCount: metaLineCount } = drawMetaBlock(doc, metaLine, rowY);

    for (let i = 1; i < composerLines.length; i += 1) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(composerLines[i], CONTENT_X, rowY + i * 4.2);
    }

    y = rowY + Math.max(composerLines.length * 4.2, metaLineCount * 3.6 || 4.2);

    y += 0.8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    const titleLines = doc.splitTextToSize(
      stripHtml(work.titulo) || "Sin título",
      CONTENT_W_INNER,
    );
    titleLines.forEach((line) => {
      y = ensureSpace(doc, y, 4.4);
      doc.text(line, CONTENT_X, y);
      y += 4.4;
    });

    const note = stripHtml(work.observaciones || work.comentarios || "");
    if (note) {
      y += 0.8;
      y = drawWrappedText(doc, note, CONTENT_X, y, CONTENT_W_INNER, 4, {
        fontSize: 7.5,
        fontStyle: "italic",
        color: [100, 116, 139],
      });
    }

    y += BLOCK_PAD_V;
    const blockBottom = y;

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.roundedRect(
      MARGIN,
      blockTop,
      CONTENT_W,
      blockBottom - blockTop,
      1,
      1,
      "S",
    );

    y = blockBottom + BLOCK_GAP;
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileBase =
    getRepertoireSelectionPdfFileName(options.fileName) || `Seleccion_Obras_${dateStr}`;
  doc.save(`${fileBase}.pdf`);
}
