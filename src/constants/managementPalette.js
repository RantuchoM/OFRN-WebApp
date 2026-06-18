/**
 * Entradas de navegación del módulo Gestión para Ctrl+K y documentación.
 *
 * Al agregar un informe nuevo:
 * 1. Añadir un objeto aquí (slug, label, section).
 * 2. Registrar la sección en ManagementView (SECTION_CONFIG + DEFAULT_SECTIONS).
 * 3. El Command Palette la incluirá automáticamente vía buildManagementPaletteCommands().
 */
export const MANAGEMENT_PALETTE_ENTRIES = [
  {
    slug: null,
    id: "mgmt-home",
    label: "Gestión: Menú de informes",
    section: "Informes de Gestión",
  },
  {
    slug: "venues",
    id: "mgmt-venues",
    label: "Gestión: Espacios",
    section: "Informes de Gestión",
  },
  {
    slug: "seating",
    id: "mgmt-seating",
    label: "Gestión: Informes Seating",
    section: "Informes de Gestión",
  },
  {
    slug: "instrumentation",
    id: "mgmt-instrumentation",
    label: "Gestión: Instrumentación",
    section: "Informes de Gestión",
  },
  {
    slug: "convocatorias",
    id: "mgmt-convocatorias",
    label: "Gestión: Convocatorias",
    section: "Informes de Gestión",
  },
  {
    slug: "ensayos",
    id: "mgmt-ensayos",
    label: "Gestión: Ensayos por programa",
    section: "Informes de Gestión",
  },
  {
    slug: "asistencia_ensayos",
    id: "mgmt-asistencia-ensayos",
    label: "Gestión: Asistencia a ensayos",
    section: "Informes de Gestión",
  },
  {
    slug: "conciertos",
    id: "mgmt-conciertos",
    label: "Gestión: Conciertos",
    section: "Informes de Gestión",
  },
  {
    slug: "audiencia",
    id: "mgmt-audiencia",
    label: "Gestión: Audiencia",
    section: "Informes de Gestión",
  },
];

export function managementPalettePath(slug) {
  return slug ? `/management/${slug}` : "/management";
}
