import { PDFDocument } from "pdf-lib";
import {
  PDF_LOAD_DOCS_BG_SAFE,
  PDF_SAVE_BG_SAFE,
} from "./pdfLibBackgroundSafe";

const PDF_SAVE_OPTS = { useObjectStreams: false, ...PDF_SAVE_BG_SAFE };

const ALL_PATTERN = /^(todas|todo|all|\*)$/i;

/**
 * @param {Uint8Array | ArrayBuffer} buffer
 */
export function detectPartMime(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  return "application/octet-stream";
}

/**
 * Interpreta un rango de impresión (1-based). Vacío o «todas» = todas las páginas.
 * @param {string} spec
 * @param {number | null} [pageCount]
 * @returns {{
 *   ok: boolean,
 *   all?: boolean,
 *   pages?: number[] | null,
 *   dropped?: number[],
 *   error?: string,
 * }}
 */
export function parsePageRange(spec, pageCount = null) {
  const raw = String(spec ?? "").trim();
  if (!raw || ALL_PATTERN.test(raw)) {
    return { ok: true, all: true, pages: null, dropped: [] };
  }

  const tokens = raw
    .split(/[,;]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) {
    return { ok: true, all: true, pages: null, dropped: [] };
  }

  const pages = [];
  for (const token of tokens) {
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      let start = Number(range[1]);
      let end = Number(range[2]);
      if (start < 1 || end < 1) {
        return { ok: false, error: `Rango inválido: ${token}` };
      }
      if (start > end) [start, end] = [end, start];
      if (end - start > 500) {
        return { ok: false, error: `Rango demasiado largo: ${token}` };
      }
      for (let n = start; n <= end; n += 1) pages.push(n);
      continue;
    }
    if (/^\d+$/.test(token)) {
      const n = Number(token);
      if (n < 1) return { ok: false, error: `Página inválida: ${token}` };
      pages.push(n);
      continue;
    }
    return {
      ok: false,
      error: `No entiendo «${token}». Usá 1-3, 5.`,
    };
  }

  const seen = new Set();
  const unique = [];
  for (const n of pages) {
    if (seen.has(n)) continue;
    seen.add(n);
    unique.push(n);
  }

  if (pageCount == null) {
    return { ok: true, all: false, pages: unique, dropped: [] };
  }

  const total = Number(pageCount);
  const kept = unique.filter((n) => n >= 1 && n <= total);
  const dropped = unique.filter((n) => n > total);
  if (!kept.length) {
    return {
      ok: false,
      error: `Ninguna página válida (el PDF tiene ${total}).`,
    };
  }

  const set = new Set(kept);
  const isAll =
    dropped.length === 0 &&
    set.size === total &&
    Array.from({ length: total }, (_, i) => i + 1).every((n) => set.has(n));

  return {
    ok: true,
    all: isAll,
    pages: isAll ? null : kept,
    dropped,
  };
}

/** Compacta páginas 1-based a «1-3, 5». */
export function formatPageList(pages) {
  const sorted = [...new Set(pages || [])]
    .filter((n) => Number.isInteger(n) && n >= 1)
    .sort((a, b) => a - b);
  if (!sorted.length) return "";

  const ranges = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i += 1) {
    const n = sorted[i];
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    ranges.push(start === prev ? String(start) : `${start}-${prev}`);
    start = n;
    prev = n;
  }
  return ranges.join(", ");
}

export function isPageSelected(spec, page, pageCount) {
  const parsed = parsePageRange(spec, pageCount);
  if (!parsed.ok) return false;
  if (parsed.all) return true;
  return (parsed.pages || []).includes(page);
}

/** Páginas marcadas a propósito. Vacío no marca ninguna (igual se imprime todo). */
function explicitPageSet(spec, pageCount) {
  const raw = String(spec ?? "").trim();
  if (!raw || ALL_PATTERN.test(raw)) return new Set();
  const parsed = parsePageRange(spec, pageCount);
  if (!parsed.ok) return null;
  if (parsed.all && pageCount) {
    return new Set(Array.from({ length: pageCount }, (_, i) => i + 1));
  }
  const total = Number(pageCount) || 0;
  return new Set(
    (parsed.pages || []).filter((n) => n >= 1 && (!total || n <= total)),
  );
}

function specFromPageSet(set) {
  if (!set?.size) return "";
  return formatPageList([...set]);
}

/** Chip del visor: vacío = ninguna marcada, aunque a la impresión eso sea «todas». */
export function isExplicitPageSelected(spec, page, pageCount) {
  const set = explicitPageSet(spec, pageCount);
  if (!set) return false;
  return set.has(page);
}

/** Suma páginas al recorte. No pisa un texto inválido. */
export function addPagesToSpec(spec, pages, pageCount) {
  const set = explicitPageSet(spec, pageCount);
  if (!set) return spec || "";
  const total = Number(pageCount) || 0;
  for (const page of pages) {
    if (page >= 1 && (!total || page <= total)) set.add(page);
  }
  return specFromPageSet(set);
}

/**
 * Clic en un número del visor. Vacío = ninguna marcada.
 * Shift suma el rango desde el ancla (el último clic sin Shift) hasta esta página.
 * @returns {{ spec: string, anchor: number | null }}
 */
export function previewClickSpec({ spec, page, pageCount, shift, anchor }) {
  const total = Number(pageCount) || 0;
  const set = explicitPageSet(spec, total) || new Set();
  if (!total || page < 1 || page > total) {
    return { spec: spec || "", anchor: anchor ?? null };
  }

  if (shift && anchor != null && anchor >= 1 && anchor <= total) {
    const start = Math.min(anchor, page);
    const end = Math.max(anchor, page);
    for (let n = start; n <= end; n += 1) set.add(n);
    return { spec: specFromPageSet(set), anchor };
  }

  if (set.has(page)) set.delete(page);
  else set.add(page);
  return { spec: specFromPageSet(set), anchor: page };
}

export async function getPdfPageCount(buffer) {
  if (detectPartMime(buffer) !== "application/pdf") return 1;
  const src = await PDFDocument.load(buffer, PDF_LOAD_DOCS_BG_SAFE);
  return src.getPageCount();
}

/**
 * Recorta un PDF a las páginas pedidas. Sin recorte (o todas), devuelve el buffer original.
 * @param {Uint8Array} buffer
 * @param {string} spec
 * @returns {Promise<Uint8Array>}
 */
export async function slicePdfPages(buffer, spec) {
  const loose = parsePageRange(spec);
  if (!loose.ok) throw new Error(loose.error);
  if (loose.all) return buffer;

  const mime = detectPartMime(buffer);
  if (mime !== "application/pdf") {
    const onlyFirst =
      loose.pages?.length === 1 && loose.pages[0] === 1;
    if (onlyFirst) return buffer;
    throw new Error("Este archivo tiene una sola página.");
  }

  const src = await PDFDocument.load(buffer, PDF_LOAD_DOCS_BG_SAFE);
  const total = src.getPageCount();
  const parsed = parsePageRange(spec, total);
  if (!parsed.ok) throw new Error(parsed.error);
  if (parsed.all || !parsed.pages?.length) return buffer;

  const indices = parsed.pages.map((n) => n - 1);
  const identity =
    indices.length === total && indices.every((idx, i) => idx === i);
  if (identity) return buffer;

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  copied.forEach((page) => out.addPage(page));
  return new Uint8Array(await out.save(PDF_SAVE_OPTS));
}
