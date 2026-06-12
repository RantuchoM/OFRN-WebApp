export function normalizeSystemRoles(rolSistema) {
  if (rolSistema == null) return [];
  if (Array.isArray(rolSistema)) {
    return rolSistema
      .map((r) => String(r).toLowerCase().trim())
      .filter(Boolean);
  }
  return [String(rolSistema).toLowerCase().trim()].filter(Boolean);
}

/** Permisos de agenda alineados con AuthContext (filtros y visibilidad). */
export function deriveAgendaPermissions(roles) {
  const normalized = Array.isArray(roles) ? roles : normalizeSystemRoles(roles);
  const isTechnician = normalized.includes("tecnico");
  const isEditor = normalized.some((r) =>
    ["admin", "editor", "curador"].includes(r),
  );
  const isManagement = normalized.some((r) =>
    [
      "admin",
      "editor",
      "curador",
      "coord_general",
      "consulta_general",
      "produccion_general",
      "director",
    ].includes(r),
  );
  const defaultPersonalFilter = (!isEditor && !isManagement) || isTechnician;

  return {
    isEditor,
    isManagement,
    isTechnician,
    defaultPersonalFilter,
  };
}
