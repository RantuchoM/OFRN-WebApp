import { PDFDocument, PDFTextField } from "pdf-lib";
import { compareSegmentsByPdfVisualOrder } from "./segmentVisualOrder";

/**
 * Intenta extraer grupo y orden desde nombres tipo "Verse 1.2".
 * @param {string} name
 * @returns {{ verse_group: number | null, orden_secuencia: number | null }}
 */
export function parseVerseHierarchy(name) {
  const s = String(name || "");
  const m = s.match(/(?:verse|estrofa|stanza)?\s*(\d+)\s*[.\s]\s*(\d+)/i);
  if (m) {
    return {
      verse_group: parseInt(m[1], 10),
      orden_secuencia: parseInt(m[2], 10),
    };
  }
  const tail = s.match(/(\d+)\.(\d+)\s*$/);
  if (tail) {
    return {
      verse_group: parseInt(tail[1], 10),
      orden_secuencia: parseInt(tail[2], 10),
    };
  }
  return { verse_group: null, orden_secuencia: null };
}

function buildPageNumberByRefTag(pdfDoc) {
  const map = new Map();
  pdfDoc.getPages().forEach((page, i) => {
    const tag = page.ref?.tag;
    if (tag != null) map.set(tag, i + 1);
  });
  return map;
}

/**
 * @typedef {object} ExtractedPdfTextField
 * @property {string} segment_name
 * @property {string | undefined} segment_english
 * @property {number} rect_x
 * @property {number} rect_y
 * @property {number} rect_w
 * @property {number} rect_h
 * @property {number} page_number
 * @property {number | null} verse_group
 * @property {number | null} orden_secuencia
 */

/**
 * Lee un PDF desde ArrayBuffer y devuelve un registro por cada widget de cada PDFTextField.
 * Coordenadas en espacio PDF (pt), rect (x,y) = esquina inferior izquierda.
 *
 * @param {ArrayBuffer} pdfBuffer
 * @returns {Promise<ExtractedPdfTextField[]>}
 */
export async function extractAcroformTextFields(pdfBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const pageByRefTag = buildPageNumberByRefTag(pdfDoc);
  const out = [];

  for (const field of form.getFields()) {
    if (!(field instanceof PDFTextField)) continue;

    const segment_name = field.getName();
    let segment_english;
    try {
      segment_english = field.getText();
    } catch {
      segment_english = undefined;
    }

    const { verse_group, orden_secuencia } = parseVerseHierarchy(segment_name);
    const widgets = field.acroField.getWidgets();
    if (!widgets.length) continue;

    // Un PDFTextField es un solo valor aunque tenga varios widgets; usamos el primero para el overlay.
    const widget = widgets[0];
    const rect = widget.getRectangle();
    const pRef = widget.P();
    const tag = pRef?.tag;
    const page_number =
      tag != null && pageByRefTag.has(tag) ? pageByRefTag.get(tag) : 1;

    out.push({
      segment_name,
      segment_english,
      rect_x: rect.x,
      rect_y: rect.y,
      rect_w: rect.width,
      rect_h: rect.height,
      page_number,
      verse_group,
      orden_secuencia,
    });
  }

  out.sort(compareSegmentsByPdfVisualOrder);
  return out;
}
