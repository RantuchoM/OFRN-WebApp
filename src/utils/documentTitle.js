export const DEFAULT_DOCUMENT_TITLE = "Filarmónica de Río Negro";
export const DOCUMENT_TITLE_SUFFIX = "OFRN";

export const MODE_LABELS = {
  DASHBOARD: "Dashboard",
  GIRAS: "Giras",
  FULL_AGENDA: "Agenda General",
  REPERTOIRE: "Repertorio",
  ARREGLOS: "Arreglos",
  ENSAMBLES: "Ensambles",
  MUSICIANS: "Personas",
  USERS: "Usuarios",
  DATA: "Datos",
  LOCATIONS: "Locaciones",
  COORDINACION: "Coordinación",
  CURADORIA: "Curaduría",
  NEWS_MANAGER: "Comunicación",
  COMMENTS: "Avisos",
  MY_MEALS: "Mis Comidas",
  FEEDBACK_ADMIN: "Feedback",
  MANUAL_INDEX: "Manual de Usuario",
  MANUAL_ADMIN: "Editor Manual",
  MANAGEMENT: "Gestión",
  MUSIC_TRANSLATION: "Traducción musical",
  DIFUSION_GENERAL: "Difusión",
};

const GIRA_VIEW_LABELS = {
  AGENDA: "Agenda",
  REPERTOIRE: "Repertorio",
  SEATING: "Seating",
  ROSTER: "Personal",
  LOGISTICS: "Logística",
  MEALS_PERSONAL: "Mis Comidas",
  DIFUSION: "Difusión",
  EDICION: "Edición",
  CALENDAR: "Calendario",
  WEEKLY: "Semana",
  FULL_AGENDA: "Agenda General",
};

const LOGISTICS_SUBTAB_LABELS = {
  rooming: "Rooming",
  transporte: "Transporte",
  viaticos: "Viáticos",
  meals: "Agenda de Comidas",
  attendance: "Control de Asistencia",
  report: "Reportes de Alimentación",
  coverage: "Reglas Generales",
};

const REPERTOIRE_SUBTAB_LABELS = {
  repertoire: "Repertorio",
  seating: "Seating",
  my_parts: "Mis Partes",
};

const MANAGEMENT_SECTION_LABELS = {
  venues: "Espacios",
  seating: "Informes Seating",
  instrumentation: "Instrumentación",
  convocatorias: "Convocatorias",
  ensayos: "Ensayos por programa",
  asistencia_ensayos: "Asistencia a ensayos",
  conciertos: "Conciertos",
  audiencia: "Audiencia",
};

const PUBLIC_ROUTE_LABELS = [
  { prefix: "/entradas/recordarme", label: "Recordarme" },
  { prefix: "/entradas", label: "Entradas" },
  { prefix: "/viaticos-manual", label: "Manual de viáticos" },
  { prefix: "/rendiciones-manual", label: "Manual de rendiciones" },
  { prefix: "/transporte-scrn", label: "Transporte SCRN" },
  { prefix: "/share/", label: "Enlace compartido" },
];

export function buildDocumentTitle(parts) {
  const filtered = parts.filter(Boolean);
  if (filtered.length === 0) return DEFAULT_DOCUMENT_TITLE;
  return `${filtered.join(" · ")} · ${DOCUMENT_TITLE_SUFFIX}`;
}

export function resolveManagementSection(pathname) {
  const match = pathname.match(/^\/management\/?(.*)$/);
  const segment = (match?.[1] || "").replace(/\/$/, "");
  if (!segment) return null;
  return MANAGEMENT_SECTION_LABELS[segment] || segment;
}

export function resolvePublicRouteTitle(pathname) {
  const match = PUBLIC_ROUTE_LABELS.find(({ prefix }) =>
    pathname.startsWith(prefix),
  );
  return match?.label || null;
}

export function resolveGiraSectionTitle(view, subTab) {
  if (!view || view === "LIST") return null;

  const viewLabel = GIRA_VIEW_LABELS[view];
  if (!viewLabel) return null;

  if (view === "LOGISTICS") {
    const subLabel =
      LOGISTICS_SUBTAB_LABELS[subTab || "coverage"] ||
      LOGISTICS_SUBTAB_LABELS.coverage;
    return subLabel;
  }

  if (view === "REPERTOIRE") {
    const subLabel =
      REPERTOIRE_SUBTAB_LABELS[subTab || "repertoire"] ||
      REPERTOIRE_SUBTAB_LABELS.repertoire;
    if (subTab && subTab !== "repertoire") return subLabel;
    return viewLabel;
  }

  if (view === "SEATING") return GIRA_VIEW_LABELS.SEATING;

  return viewLabel;
}

export function resolveAppDocumentTitle({
  mode,
  searchParams,
  pathname,
  giraName,
}) {
  const publicTitle = resolvePublicRouteTitle(pathname);
  if (publicTitle) return buildDocumentTitle([publicTitle]);

  if (pathname.startsWith("/management")) {
    const section = resolveManagementSection(pathname);
    if (section) return buildDocumentTitle([section, MODE_LABELS.MANAGEMENT]);
    return buildDocumentTitle([MODE_LABELS.MANAGEMENT]);
  }

  if (mode === "GIRAS") {
    const giraId = searchParams?.get("giraId");
    const view = searchParams?.get("view");
    const subTab = searchParams?.get("subTab");

    if (!giraId || !view || view === "LIST") {
      return buildDocumentTitle([MODE_LABELS.GIRAS]);
    }

    const section = resolveGiraSectionTitle(view, subTab);
    if (giraName && section) {
      return buildDocumentTitle([section, giraName]);
    }
    if (section) return buildDocumentTitle([section, MODE_LABELS.GIRAS]);
    if (giraName) return buildDocumentTitle([giraName, MODE_LABELS.GIRAS]);
    return buildDocumentTitle([MODE_LABELS.GIRAS]);
  }

  const modeLabel = MODE_LABELS[mode];
  if (modeLabel) return buildDocumentTitle([modeLabel]);

  return DEFAULT_DOCUMENT_TITLE;
}
