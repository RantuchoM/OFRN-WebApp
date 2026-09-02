/**
 * Construcción de destinos OFRN (query params en `/`).
 * Usar con <Link to={buildAppTo(...)}> para que clic con rueda / Ctrl+clic abran pestaña nueva.
 */

/** mode de App.jsx → valor de `?tab=` */
export const MODE_TO_TAB = {
  DASHBOARD: "dashboard",
  GIRAS: "giras",
  FULL_AGENDA: "agenda",
  REPERTOIRE: "repertorio",
  ARREGLOS: "arreglos",
  ENSAMBLES: "ensambles",
  MUSICIANS: "musicos",
  USERS: "usuarios",
  DATA: "datos",
  LOCATIONS: "locaciones",
  COORDINACION: "coordinacion",
  CURADORIA: "curadoria",
  NEWS_MANAGER: "news_manager",
  COMMENTS: "avisos",
  MY_MEALS: "comidas",
  FEEDBACK_ADMIN: "feedback",
  MANUAL_INDEX: "manual",
  MANUAL_ADMIN: "manual_admin",
  MANAGEMENT: "management",
  MUSIC_TRANSLATION: "music_translation",
  DIFUSION_GENERAL: "difusion",
};

/**
 * Editor Escenario independiente del shell Giras (fullscreen, sin REPERTOIRE/seating).
 *
 * Preferido desde FIMBA (`edicionId`) y Gestión cuando hay `plotId`.
 * - Con edición: `/fimba/edicion/:edicionId/escenario/:plotId` (auth FIMBA + OFRN management)
 * - Sin edición: `/stage-plots/:plotId` (auth OFRN editor/management/admin)
 *
 * @param {object} opts
 * @param {string|number} opts.plotId
 * @param {string|number|null} [opts.edicionId]
 * @returns {string}
 */
export function buildStandaloneEscenarioTo({ plotId, edicionId = null } = {}) {
  if (plotId == null || plotId === "") {
    if (edicionId != null && edicionId !== "") {
      return `/fimba/edicion/${edicionId}/escenario`;
    }
    return "/stage-plots";
  }
  if (edicionId != null && edicionId !== "") {
    return `/fimba/edicion/${edicionId}/escenario/${plotId}`;
  }
  return `/stage-plots/${plotId}`;
}

/**
 * Legacy: editor Escenario embebido en shell Giras (Repertorio → Seating → Escenario).
 * Requiere `view=REPERTOIRE`. Preferir `buildStandaloneEscenarioTo` cuando hay `plotId`.
 *
 * @param {object} opts
 * @param {string|number} opts.giraId
 * @param {string|number|null} [opts.stagePlotId] — deep-link al lienzo (`?stagePlotId=`)
 * @returns {string | { pathname: string, search: string }}
 */
export function buildEscenarioEditorTo({ giraId, stagePlotId = null } = {}) {
  return buildAppTo({
    mode: "GIRAS",
    giraId,
    view: "REPERTOIRE",
    subTab: "seating",
    seatingView: "escenario",
    stagePlotId,
  });
}

/**
 * @param {object} opts
 * @param {string} [opts.mode] — mode de App (DASHBOARD, GIRAS, …)
 * @param {string} [opts.tab] — override directo de `tab`
 * @param {string|number|null} [opts.giraId]
 * @param {string|null} [opts.view] — AGENDA, REPERTOIRE, LIST, CALENDAR, …
 * @param {string|null} [opts.subTab]
 * @param {string|null} [opts.seatingView] — disposicion | escenario (con subTab=seating)
 * @param {string|number|null} [opts.stagePlotId] — deep-link Escenario (`?stagePlotId=`)
 * @returns {string | { pathname: string, search: string }}
 */
export function buildAppTo({
  mode = null,
  tab = null,
  giraId = null,
  view = null,
  subTab = null,
  seatingView = null,
  stagePlotId = null,
} = {}) {
  if (mode === "MANAGEMENT" || tab === "management") {
    return "/management";
  }

  const params = new URLSearchParams();
  const hasGira = giraId != null && giraId !== "";
  const hasSubNav = Boolean(subTab || seatingView);
  // Seating / Mis Partes / Escenario viven bajo ProgramRepertoire (view=REPERTOIRE).
  // Call sites that only pass subTab+seatingView without view used to land on LIST.
  const viewVal =
    view && view !== "LIST"
      ? String(view)
      : hasGira && hasSubNav
        ? "REPERTOIRE"
        : null;
  const isGirasDest =
    hasGira ||
    viewVal != null ||
    tab === "giras" ||
    mode === "GIRAS";

  if (isGirasDest) {
    params.set("tab", "giras");
    if (hasGira) {
      params.set("giraId", String(giraId));
      if (viewVal) params.set("view", viewVal);
      if (subTab) params.set("subTab", String(subTab));
      if (seatingView) params.set("seatingView", String(seatingView));
      if (stagePlotId != null && stagePlotId !== "") {
        params.set("stagePlotId", String(stagePlotId));
      }
    } else if (viewVal) {
      params.set("view", viewVal);
    }
    const search = params.toString();
    return { pathname: "/", search: search ? `?${search}` : "" };
  }

  const tabVal = tab || (mode ? MODE_TO_TAB[mode] : null);
  if (tabVal) params.set("tab", tabVal);
  const search = params.toString();
  return { pathname: "/", search: search ? `?${search}` : "" };
}

/** String href para tooltips / copiar enlace. */
export function buildAppHref(opts) {
  const to = buildAppTo(opts);
  if (typeof to === "string") return to;
  return `${to.pathname}${to.search || ""}`;
}
