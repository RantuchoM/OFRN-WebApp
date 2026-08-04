export function normalizeSystemRoles(rolSistema) {
  if (rolSistema == null) return [];
  if (Array.isArray(rolSistema)) {
    return rolSistema
      .map((r) => String(r).toLowerCase().trim())
      .filter(Boolean);
  }
  return [String(rolSistema).toLowerCase().trim()].filter(Boolean);
}

/** Roles de gestión que ven eventos Téc / ocultos en agenda (excluye consulta_general). */
const AGENDA_TECH_STAFF_ROLES = [
  "admin",
  "editor",
  "curador",
  "coord_general",
  "produccion_general",
  "director",
];

/** Permisos de agenda alineados con AuthContext (filtros y visibilidad). */
export function deriveAgendaPermissions(roles) {
  const normalized = Array.isArray(roles) ? roles : normalizeSystemRoles(roles);
  const isTechnician = normalized.includes("tecnico");
  const isConsultaGeneral = normalized.includes("consulta_general");
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
  const hasAgendaTechStaffRole = normalized.some((r) =>
    AGENDA_TECH_STAFF_ROLES.includes(r),
  );
  /** Eventos `tecnica: true` y filtro Téc en agenda. */
  const canSeeTechEvents = hasAgendaTechStaffRole || isTechnician;
  /** Paradas con `visible_agenda === false` (ocultas / TÉC de transporte). */
  const canSeeHiddenAgendaEvents = hasAgendaTechStaffRole;
  const defaultPersonalFilter = (!isEditor && !isManagement) || isTechnician;

  return {
    isEditor,
    isManagement,
    isTechnician,
    isConsultaGeneral,
    canSeeTechEvents,
    canSeeHiddenAgendaEvents,
    defaultPersonalFilter,
  };
}
