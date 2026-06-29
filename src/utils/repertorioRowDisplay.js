/**
 * Reservas de repertorio: filas en repertorio_obras sin id_obra (slots de planificación).
 */

export const isRepertorioPlaceholder = (row) => {
  if (row == null) return false;
  if (row.obras?.id != null) return false;
  return row.id_obra == null || row.id_obra === undefined;
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
    titulo: obra.titulo || "Obra",
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
