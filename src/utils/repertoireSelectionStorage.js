const STORAGE_KEY = "ofrn_repertoire_selection_v1";

export function loadRepertoireSelection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { orderedIds: [], name: "" };
    const parsed = JSON.parse(raw);
    const orderedIds = Array.isArray(parsed?.orderedIds)
      ? parsed.orderedIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : [];
    return {
      orderedIds: [...new Set(orderedIds)],
      name: typeof parsed?.name === "string" ? parsed.name : "",
    };
  } catch {
    return { orderedIds: [], name: "" };
  }
}

export function saveRepertoireSelection(orderedIds, name) {
  const existing = loadRepertoireSelection();
  const clean = [...new Set(orderedIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)))];
  const nextName = name !== undefined ? String(name) : existing.name;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ orderedIds: clean, name: nextName, updatedAt: new Date().toISOString() }),
  );
  return { orderedIds: clean, name: nextName };
}

export function saveRepertoireSelectionName(name) {
  const { orderedIds } = loadRepertoireSelection();
  return saveRepertoireSelection(orderedIds, name);
}

export function clearRepertoireSelection() {
  localStorage.removeItem(STORAGE_KEY);
}

export const REPERTOIRE_SELECTION_DEFAULT_TITLE = "Selección de Obras — Archivo OFRN";

export function getRepertoireSelectionPdfTitle(name) {
  const trimmed = String(name || "").trim();
  return trimmed || REPERTOIRE_SELECTION_DEFAULT_TITLE;
}

export function getRepertoireSelectionPdfFileName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;
  const safe = trimmed
    .replace(/[/\\?*:|"<>]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return safe || null;
}
