/**
 * Export / import de Escenario entre giras (archivo JSON).
 */

import {
  cloneStagePlotPayload,
  createEmptyStagePlotPayload,
  normalizeStagePlotPayload,
} from "./stagePlotPayload";

export const STAGE_PLOT_TRANSFER_FORMAT = "ofrn-stage-plot";
export const STAGE_PLOT_TRANSFER_VERSION = 1;

function normalizeBloqueIds(raw) {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ];
}

/**
 * @param {{
 *   payload: object,
 *   nombre?: string|null,
 *   bloque_ids?: number[],
 *   source?: { id_programa?: number|string|null, plot_id?: string|null, nombre_gira?: string|null },
 * }} opts
 */
export function buildStagePlotTransferDocument(opts) {
  const payload = normalizeStagePlotPayload(
    opts?.payload ?? createEmptyStagePlotPayload(),
  );
  return {
    format: STAGE_PLOT_TRANSFER_FORMAT,
    version: STAGE_PLOT_TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    nombre: opts?.nombre?.trim() ? opts.nombre.trim() : null,
    // bloque_ids se exportan solo como referencia; al importar a otra gira se limpian.
    bloque_ids: normalizeBloqueIds(opts?.bloque_ids),
    source: {
      id_programa: opts?.source?.id_programa ?? null,
      plot_id: opts?.source?.plot_id ?? null,
      nombre_gira: opts?.source?.nombre_gira ?? null,
    },
    payload: cloneStagePlotPayload(payload),
  };
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, doc: object } | { ok: false, error: string }}
 */
export function parseStagePlotTransferDocument(raw) {
  let doc = raw;
  if (typeof raw === "string") {
    try {
      doc = JSON.parse(raw);
    } catch {
      return { ok: false, error: "JSON inválido" };
    }
  }
  if (!doc || typeof doc !== "object") {
    return { ok: false, error: "Documento vacío" };
  }
  if (doc.format !== STAGE_PLOT_TRANSFER_FORMAT) {
    return {
      ok: false,
      error: `Formato no reconocido (se esperaba ${STAGE_PLOT_TRANSFER_FORMAT})`,
    };
  }
  const version = Number(doc.version) || 0;
  if (version < 1 || version > STAGE_PLOT_TRANSFER_VERSION) {
    return { ok: false, error: `Versión no soportada: ${doc.version}` };
  }
  if (!doc.payload || typeof doc.payload !== "object") {
    return { ok: false, error: "Falta payload del escenario" };
  }
  return {
    ok: true,
    doc: {
      format: STAGE_PLOT_TRANSFER_FORMAT,
      version,
      exportedAt: doc.exportedAt || null,
      nombre: doc.nombre?.trim?.() ? String(doc.nombre).trim() : null,
      bloque_ids: normalizeBloqueIds(doc.bloque_ids),
      source: doc.source && typeof doc.source === "object" ? doc.source : {},
      payload: normalizeStagePlotPayload(doc.payload),
    },
  };
}

/**
 * Descarga un .json del plot actual.
 */
export function downloadStagePlotTransferFile(doc, filenameHint) {
  const parsed = parseStagePlotTransferDocument(doc);
  if (!parsed.ok) throw new Error(parsed.error);
  const blob = new Blob([JSON.stringify(parsed.doc, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const base =
    filenameHint?.replace(/[^\w\-áéíóúñÁÉÍÓÚÑ]+/gi, "_").slice(0, 80) ||
    "escenario";
  a.href = url;
  a.download = `${base}.ofrn-escenario.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Lee un File y parsea el transfer document.
 * @param {File} file
 */
export async function readStagePlotTransferFile(file) {
  const text = await file.text();
  return parseStagePlotTransferDocument(text);
}
