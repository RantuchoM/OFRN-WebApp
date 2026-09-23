/**
 * Reservas de repertorio: filas en repertorio_obras sin id_obra (slots de planificación).
 */

export const isRepertorioPlaceholder = (row) => {
  if (row == null) return false;
  if (row.obras?.id != null) return false;
  return row.id_obra == null || row.id_obra === undefined;
};

export const stripRepertorioTitleHtml = (value) =>
  String(value || "")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Título cargado solo para esta fila de programa. No aplica a reservas (usan titulo_placeholder). */
export const hasRepertorioObraTitleOverride = (row) => {
  if (!row || isRepertorioPlaceholder(row)) return false;
  const t = row.titulo_concierto;
  return typeof t === "string" && t.trim().length > 0;
};

/**
 * Título visible en el programa: override de la fila, o catálogo (`obras.titulo`, puede ser HTML).
 * No lee ni escribe el catálogo.
 */
export const effectiveRepertorioObraTitle = (row) => {
  if (isRepertorioPlaceholder(row)) {
    return row.titulo_placeholder || "Reserva sin título";
  }
  if (hasRepertorioObraTitleOverride(row)) return row.titulo_concierto.trim();
  return row?.obras?.titulo || "Obra";
};

/**
 * Texto de difusión de esa fila: título del programa, o catálogo sin anotaciones entre corchetes.
 */
export const repertorioObraTitleForDifusion = (row) => {
  if (hasRepertorioObraTitleOverride(row)) return row.titulo_concierto.trim();
  const raw = row?.obras?.titulo || "";
  return String(raw).replace(/\[.*?\]/g, "").trim();
};

export const getRepertorioRowDisplay = (row) => {
  if (isRepertorioPlaceholder(row)) {
    return {
      isPlaceholder: true,
      titulo: row.titulo_placeholder || "Reserva sin título",
      instrumentacion: row.instrumentacion_placeholder || "",
      compositorLabel: null,
      arrangerLabel: null,
      estado: null,
      obraId: null,
      hasDrive: false,
      hasParticellas: false,
      linkDrive: null,
      linkYoutube: null,
    };
  }

  const obra = row.obras || {};
  return {
    isPlaceholder: false,
    titulo: effectiveRepertorioObraTitle(row),
    instrumentacion: obra.instrumentacion || "",
    compositorLabel: null,
    arrangerLabel: null,
    estado: obra.estado || null,
    obraId: obra.id ?? row.id_obra,
    hasDrive: !!(obra.link_drive || row.google_drive_shortcut_id),
    hasParticellas: (obra.obras_particellas || []).length > 0,
    linkDrive: obra.link_drive || null,
    linkYoutube: obra.link_youtube || null,
    obra,
  };
};

/** Filas visibles en la UI de repertorio (todos ven placeholders; solo editores pueden mutarlos). */
export const filterRepertorioObraRowsForDisplay = (rows = []) => rows || [];
