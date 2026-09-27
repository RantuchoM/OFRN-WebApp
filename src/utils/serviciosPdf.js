import jsPDFDefault, { jsPDF as jsPDFNamed } from "jspdf";
import { saveBlobFile } from "./downloadBlob";

const JsPDF =
  typeof jsPDFNamed === "function"
    ? jsPDFNamed
    : jsPDFDefault?.jsPDF || jsPDFDefault;

export const PDF_BORDER = [180, 180, 180];
export const PDF_GROUP_FILL = [226, 232, 240];
export const PDF_HEAD_FILL = [241, 245, 249];

export function createServiciosPdfDoc() {
  return new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}

/**
 * Helvetica (WinAnsi) no dibuja flechas, bullets ni muchos símbolos.
 * `→` `▸` `·` `–` se vuelven cajas o pegan palabras. Solo latin + ASCII.
 */
export function toServiciosPdfText(value, { padHyphen = true } = {}) {
  let text = String(value ?? "")
    .replace(/→/g, "")
    .replace(/▸/g, ">")
    .replace(/[►▶•●]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\u00b7/g, "-")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/÷/g, "/");
  if (padHyphen) text = text.replace(/\s*-\s*/g, " - ");
  return text.replace(/[ \t]{2,}/g, " ").trim();
}

export function pdfStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

export async function deliverBlob(blob, fileName) {
  const result = await saveBlobFile(blob, fileName);
  return { blob, fileName, result };
}

export function deliverPdf(doc, fileName) {
  return deliverBlob(doc.output("blob"), fileName);
}
