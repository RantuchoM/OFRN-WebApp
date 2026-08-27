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
 * @param {object} opts
 * @param {string} [opts.mode] — mode de App (DASHBOARD, GIRAS, …)
 * @param {string} [opts.tab] — override directo de `tab`
 * @param {string|number|null} [opts.giraId]
 * @param {string|null} [opts.view] — AGENDA, REPERTOIRE, LIST, CALENDAR, …
 * @param {string|null} [opts.subTab]
 * @param {string|null} [opts.seatingView] — disposicion | escenario (con subTab=seating)
 * @returns {string | { pathname: string, search: string }}
 */
export function buildAppTo({
  mode = null,
  tab = null,
  giraId = null,
  view = null,
  subTab = null,
  seatingView = null,
} = {}) {
  if (mode === "MANAGEMENT" || tab === "management") {
    return "/management";
  }

  const params = new URLSearchParams();
  const hasGira = giraId != null && giraId !== "";
  const viewVal = view && view !== "LIST" ? String(view) : null;
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
