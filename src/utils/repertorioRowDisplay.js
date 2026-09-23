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
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Negrita, cursiva, listas o más de un bloque: el HTML no es solo el texto plano. */
export const repertorioTitleHtmlHasFormat = (html) =>
  /<(strong|b|em|i|u|s|strike|ul|ol|li|br|sub|sup)\b|<\/div>\s*<div|<\/p>\s*<p/i.test(
    String(html || ""),
  );

/**
 * HTML a persistir en titulo_concierto.
 * null = usar el catálogo (vacío, idéntico, o el mismo texto sin formato).
 */
export const normalizeRepertorioProgramTitle = (html, catalogHtml) => {
  const raw = String(html ?? "").trim();
  if (!stripRepertorioTitleHtml(raw)) return null;
  const catalog = String(catalogHtml ?? "").trim();
  if (raw === catalog) return null;
  const plain = stripRepertorioTitleHtml(raw);
  const catalogPlain = stripRepertorioTitleHtml(catalog);
  if (
    plain === catalogPlain &&
    !repertorioTitleHtmlHasFormat(raw) &&
    !repertorioTitleHtmlHasFormat(catalog)
  ) {
    return null;
  }
  return raw;
};

/** Título cargado solo para esta fila de programa. No aplica a reservas (usan titulo_placeholder). */
export const hasRepertorioObraTitleOverride = (row) => {
  if (!row || isRepertorioPlaceholder(row)) return false;
  const t = row.titulo_concierto;
  return typeof t === "string" && stripRepertorioTitleHtml(t).length > 0;
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
