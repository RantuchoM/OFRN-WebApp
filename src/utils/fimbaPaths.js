/**
 * Pure path helpers for FIMBA staff routes.
 * Kept out of React component modules so Vite Fast Refresh is not broken
 * by mixed component + non-component exports (and to avoid circular imports
 * with FimbaAccessContext ↔ FimbaSectionToggle).
 */

/** Path without trailing slash (except root). */
export function normalizeFimbaPath(pathname) {
  const p = String(pathname || "");
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

/** Parse staff paths `/fimba/edicion/:edicionId(/artista/:artistaId)?…` */
export function parseFimbaSectionIds(pathname) {
  const m = String(pathname || "").match(
    /^\/fimba\/edicion\/([^/]+)(?:\/artista\/([^/]+))?/,
  );
  if (!m) return { edicionId: null, artistaId: null };
  return { edicionId: m[1] || null, artistaId: m[2] || null };
}

/**
 * Artistas active: edición index or artist detail index (not agenda/transportes/…).
 * @param {string} pathname
 * @param {string|number} edicionId
 */
export function isFimbaArtistasPath(pathname, edicionId) {
  if (edicionId == null || edicionId === "") return false;
  const path = normalizeFimbaPath(pathname);
  const ed = String(edicionId);
  if (path === `/fimba/edicion/${ed}`) return true;
  const m = path.match(/^\/fimba\/edicion\/([^/]+)\/artista\/([^/]+)$/);
  return Boolean(m && m[1] === ed);
}

/**
 * Active only on edición-level section paths (top toggle exits artista context).
 * Artist-scoped logistics URLs do not highlight these tabs.
 * @param {string} pathname
 * @param {string|number} edicionId
 * @param {string} segment
 */
export function isFimbaSectionPath(pathname, edicionId, segment) {
  if (!segment || edicionId == null || edicionId === "") return false;
  const path = normalizeFimbaPath(pathname);
  const ed = String(edicionId);
  return path === `/fimba/edicion/${ed}/${segment}`;
}

/** Section labels for print meta (mirrors FimbaSectionToggle tabs). */
const PRINT_SECTION_LABELS = [
  { segment: "agenda", label: "Agenda" },
  { segment: "transportes", label: "Transportes" },
  { segment: "hoteleria", label: "Hotelería" },
  { segment: "venues", label: "Venues" },
  { segment: "backline", label: "Backline" },
  { segment: "rider", label: "Rider" },
  { segment: "contrataciones", label: "Contrataciones" },
  { segment: "usuarios", label: "Usuarios" },
];

/**
 * Tab title + print visibility for FimbaLayout @media print.
 * Orientation is user-chosen in the browser print dialog (no @page size).
 * Escenario is outside this layout.
 */
export function resolveFimbaPrintMeta(pathname) {
  const path = normalizeFimbaPath(pathname);
  if (path === "/fimba/login" || path.startsWith("/fimba/login/")) {
    return { title: "Acceso", hidePrint: true };
  }
  if (path === "/fimba") {
    return { title: "Ediciones", hidePrint: false };
  }
  if (path.startsWith("/fimba/c/") && path.endsWith("/agenda")) {
    return { title: "Agenda", hidePrint: false };
  }
  if (/^\/fimba\/[ae]\//.test(path)) {
    return { title: "Artista", hidePrint: false };
  }

  const { edicionId, artistaId } = parseFimbaSectionIds(path);
  if (!edicionId) {
    return { title: "FIMBA", hidePrint: false };
  }

  if (artistaId) {
    if (path.endsWith("/agenda")) {
      return { title: "Agenda", hidePrint: false };
    }
    if (path.endsWith("/transportes")) {
      return { title: "Transportes", hidePrint: false };
    }
    if (path.endsWith("/hoteleria")) {
      return { title: "Hotelería", hidePrint: false };
    }
    return { title: "Artista", hidePrint: false };
  }

  if (isFimbaArtistasPath(path, edicionId)) {
    return { title: "Artistas", hidePrint: false };
  }

  for (const section of PRINT_SECTION_LABELS) {
    if (isFimbaSectionPath(path, edicionId, section.segment)) {
      return { title: section.label, hidePrint: false };
    }
  }

  return { title: "FIMBA", hidePrint: false };
}
