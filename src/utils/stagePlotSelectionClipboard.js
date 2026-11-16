/**
 * Memoria interna de selección del Stage Plot (entre lienzos / pestañas same-origin).
 * No usa Clipboard API ni Ctrl+C/V — solo menú contextual + localStorage.
 */

import {
  STAGE_PLOT_FORMATIONATION_COPY_OFFSET_PX,
  makeSlotId,
  normalizeStagePlotFormation,
  parseSlotId,
} from "./stagePlotFormations";

export const STAGE_PLOT_SELECTION_CLIPBOARD_FORMAT =
  "ofrn-stage-plot-selection";
export const STAGE_PLOT_SELECTION_CLIPBOARD_VERSION = 1;
export const STAGE_PLOT_SELECTION_CLIPBOARD_KEY =
  "ofrn-stage-plot-selection";

function newClipboardId(prefix = "sp") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Snapshot JSON-seguro de un ítem (sin groupId; slotId se remapea al pegar).
 * @param {object} item
 */
export function snapshotStagePlotClipboardItem(item) {
  if (!item || typeof item !== "object") return null;
  const type = String(item.type || "").trim();
  if (!type) return null;
  /** @type {Record<string, unknown>} */
  const out = {
    id: String(item.id || ""),
    type,
    x: Number(item.x) || 0,
    y: Number(item.y) || 0,
    rotation: Number(item.rotation) || 0,
    scale: Number(item.scale) > 0 ? Number(item.scale) : 1,
    z: Number.isFinite(Number(item.z)) ? Number(item.z) : 0,
    label: item.label != null ? String(item.label) : type,
    notes: item.notes != null ? String(item.notes) : "",
    includeInChannels: !!item.includeInChannels,
    slotId:
      item.slotId == null || item.slotId === ""
        ? null
        : String(item.slotId),
  };
  if (item.flipX === true) out.flipX = true;
  if (item.isSoloist === true || item.soloist === true) out.isSoloist = true;
  if (type === "timpani" && item.timpaniSize != null) {
    out.timpaniSize = item.timpaniSize;
  }
  if (type === "text") {
    if (item.fontSize != null) out.fontSize = item.fontSize;
    if (item.fontStyle != null) out.fontStyle = item.fontStyle;
    if (item.fill != null) out.fill = item.fill;
    if (item.align != null) out.align = item.align;
  }
  if (Number.isFinite(Number(item.scaleX)) && Number(item.scaleX) > 0) {
    out.scaleX = Number(item.scaleX);
  }
  if (Number.isFinite(Number(item.scaleY)) && Number(item.scaleY) > 0) {
    out.scaleY = Number(item.scaleY);
  }
  return out;
}

/**
 * @param {{
 *   items?: object[],
 *   formations?: object[],
 *   selectedIds?: string[],
 *   selectedFormationId?: string|null,
 * }} opts
 * @returns {{ ok: true, doc: object } | { ok: false, error: string }}
 */
export function buildStagePlotSelectionDocument(opts = {}) {
  const selectedIds = Array.isArray(opts.selectedIds)
    ? opts.selectedIds.map(String)
    : [];
  const selectedIdSet = new Set(selectedIds);
  const allItems = Array.isArray(opts.items) ? opts.items : [];
  const allFormations = Array.isArray(opts.formations) ? opts.formations : [];

  const formationId =
    opts.selectedFormationId != null && opts.selectedFormationId !== ""
      ? String(opts.selectedFormationId)
      : null;
  const srcFormation = formationId
    ? allFormations.find((f) => String(f.id) === formationId)
    : null;
  const formations = [];
  if (srcFormation) {
    const normalized = normalizeStagePlotFormation(srcFormation);
    if (normalized) formations.push(normalized);
  }

  const items = allItems
    .filter((it) => selectedIdSet.has(String(it.id)))
    .map((it) => snapshotStagePlotClipboardItem(it))
    .filter(Boolean);

  if (!formations.length && !items.length) {
    return { ok: false, error: "Nada para copiar" };
  }

  return {
    ok: true,
    doc: {
      format: STAGE_PLOT_SELECTION_CLIPBOARD_FORMAT,
      version: STAGE_PLOT_SELECTION_CLIPBOARD_VERSION,
      copiedAt: new Date().toISOString(),
      formations,
      items,
    },
  };
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, doc: object } | { ok: false, error: string }}
 */
export function parseStagePlotSelectionDocument(raw) {
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
  if (doc.format !== STAGE_PLOT_SELECTION_CLIPBOARD_FORMAT) {
    return { ok: false, error: "Formato no reconocido" };
  }
  const version = Number(doc.version) || 0;
  if (version < 1 || version > STAGE_PLOT_SELECTION_CLIPBOARD_VERSION) {
    return { ok: false, error: `Versión no soportada: ${doc.version}` };
  }

  const formations = (Array.isArray(doc.formations) ? doc.formations : [])
    .map((f) => normalizeStagePlotFormation(f))
    .filter(Boolean)
    .slice(0, 1);

  const items = (Array.isArray(doc.items) ? doc.items : [])
    .map((it) => snapshotStagePlotClipboardItem(it))
    .filter(Boolean);

  if (!formations.length && !items.length) {
    return { ok: false, error: "Selección vacía" };
  }

  return {
    ok: true,
    doc: {
      format: STAGE_PLOT_SELECTION_CLIPBOARD_FORMAT,
      version,
      copiedAt: doc.copiedAt || null,
      formations,
      items,
    },
  };
}

/**
 * @param {object} doc
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function writeStagePlotSelectionClipboard(doc) {
  const parsed = parseStagePlotSelectionDocument(doc);
  if (!parsed.ok) return parsed;
  try {
    if (typeof localStorage === "undefined") {
      return { ok: false, error: "localStorage no disponible" };
    }
    localStorage.setItem(
      STAGE_PLOT_SELECTION_CLIPBOARD_KEY,
      JSON.stringify(parsed.doc),
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || "No se pudo guardar la selección",
    };
  }
}

/**
 * @returns {{ ok: true, doc: object } | { ok: false, error: string }}
 */
export function readStagePlotSelectionClipboard() {
  try {
    if (typeof localStorage === "undefined") {
      return { ok: false, error: "localStorage no disponible" };
    }
    const raw = localStorage.getItem(STAGE_PLOT_SELECTION_CLIPBOARD_KEY);
    if (!raw) return { ok: false, error: "No hay selección copiada" };
    return parseStagePlotSelectionDocument(raw);
  } catch (err) {
    return {
      ok: false,
      error: err?.message || "No se pudo leer la selección",
    };
  }
}

export function hasStagePlotSelectionClipboard() {
  return readStagePlotSelectionClipboard().ok;
}

/**
 * Clona el documento de selección con nuevos ids y offset.
 * Remapea slotId solo si la formación viaja en el doc; si no, demagnetiza.
 * Si el lienzo destino ya tiene director, no pega otro `conductor` (máx. 1).
 *
 * @param {object} doc
 * @param {{
 *   offsetX?: number,
 *   offsetY?: number,
 *   allocateZ?: () => number,
 *   existingItems?: { type?: string }[],
 * }} [opts]
 * @returns {{
 *   formations: object[],
 *   items: object[],
 *   selectedFormationId: string|null,
 *   selectedIds: string[],
 *   skippedConductor?: boolean,
 * } | null}
 */
export function cloneStagePlotSelectionForPaste(doc, opts = {}) {
  const parsed = parseStagePlotSelectionDocument(doc);
  if (!parsed.ok) return null;

  const offsetX = Number.isFinite(Number(opts.offsetX))
    ? Number(opts.offsetX)
    : STAGE_PLOT_FORMATIONATION_COPY_OFFSET_PX;
  const offsetY = Number.isFinite(Number(opts.offsetY))
    ? Number(opts.offsetY)
    : 0;
  const allocateZ =
    typeof opts.allocateZ === "function" ? opts.allocateZ : () => 0;
  const destHasConductor = (opts.existingItems || []).some(
    (it) => it?.type === "conductor",
  );

  /** @type {Map<string, string>} */
  const formationIdMap = new Map();
  const formations = parsed.doc.formations.map((src) => {
    const normalized = normalizeStagePlotFormation({
      ...src,
      id: newClipboardId("fm"),
      x: (Number(src.x) || 0) + offsetX,
      y: (Number(src.y) || 0) + offsetY,
      params: { ...(src.params || {}) },
      slotTs: Array.isArray(src.slotTs) ? src.slotTs.slice() : null,
    });
    if (src.id) formationIdMap.set(String(src.id), normalized.id);
    return normalized;
  });

  let skippedConductor = false;
  const items = parsed.doc.items
    .filter((src) => {
      if (src.type === "conductor" && destHasConductor) {
        skippedConductor = true;
        return false;
      }
      return true;
    })
    .map((src) => {
      const parsedSlot = parseSlotId(src.slotId);
      let slotId = null;
      if (parsedSlot) {
        const newFormationId = formationIdMap.get(parsedSlot.formationId);
        if (newFormationId) {
          slotId = makeSlotId(newFormationId, parsedSlot.index);
        }
      }
      /** @type {Record<string, unknown>} */
      const clone = {
        ...src,
        id: newClipboardId("sp"),
        x: (Number(src.x) || 0) + offsetX,
        y: (Number(src.y) || 0) + offsetY,
        z: allocateZ(),
        slotId,
      };
      delete clone.groupId;
      return clone;
    });

  return {
    formations,
    items,
    selectedFormationId: formations[0]?.id ?? null,
    selectedIds: items.map((it) => String(it.id)),
    skippedConductor,
  };
}

/**
 * Copia la selección actual al buffer interno.
 * @param {{
 *   items?: object[],
 *   formations?: object[],
 *   selectedIds?: string[],
 *   selectedFormationId?: string|null,
 * }} selection
 */
export function copyStagePlotSelectionToClipboard(selection) {
  const built = buildStagePlotSelectionDocument(selection);
  if (!built.ok) return built;
  const written = writeStagePlotSelectionClipboard(built.doc);
  if (!written.ok) return written;
  const nItems = built.doc.items.length;
  const nFormations = built.doc.formations.length;
  return {
    ok: true,
    itemCount: nItems,
    formationCount: nFormations,
  };
}
