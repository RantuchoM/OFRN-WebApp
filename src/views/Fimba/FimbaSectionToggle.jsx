import React from "react";
import { NavLink, useLocation, useParams } from "react-router-dom";
import {
  IconMusic,
  IconCalendar,
  IconBus,
  IconBed,
  IconUsers,
} from "../../components/ui/Icons";

/** Path without trailing slash (except root). */
function normalizePath(pathname) {
  const p = String(pathname || "");
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

/**
 * Segment order: Artistas | Agenda | Transportes | Hotelería | Usuarios.
 * Usuarios is edición-only (hidden when artista-scoped).
 */
const SECTIONS = [
  { key: "artistas", label: "Artistas", Icon: IconMusic, segment: null },
  { key: "agenda", label: "Agenda", Icon: IconCalendar, segment: "agenda" },
  {
    key: "transportes",
    label: "Transportes",
    Icon: IconBus,
    segment: "transportes",
  },
  {
    key: "hoteleria",
    label: "Hotelería",
    Icon: IconBed,
    segment: "hoteleria",
  },
  {
    key: "usuarios",
    label: "Usuarios",
    Icon: IconUsers,
    segment: "usuarios",
    edicionOnly: true,
  },
];

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
  const path = normalizePath(pathname);
  const ed = String(edicionId);
  if (path === `/fimba/edicion/${ed}`) return true;
  const m = path.match(/^\/fimba\/edicion\/([^/]+)\/artista\/([^/]+)$/);
  return Boolean(m && m[1] === ed);
}

/**
 * @param {string} pathname
 * @param {string|number} edicionId
 * @param {string|null} artistaId
 * @param {string} segment
 */
export function isFimbaSectionPath(pathname, edicionId, artistaId, segment) {
  if (!segment || edicionId == null || edicionId === "") return false;
  const path = normalizePath(pathname);
  const ed = String(edicionId);
  if (artistaId) {
    return (
      path === `/fimba/edicion/${ed}/artista/${artistaId}/${segment}`
    );
  }
  return path === `/fimba/edicion/${ed}/${segment}`;
}

/**
 * Segmented control: Artistas | Agenda | Transportes | Hotelería | Usuarios.
 * Preserves edicionId and artistaId for logistics sections when present.
 * Usuarios always edición-scoped and only shown without artista filter.
 */
export default function FimbaSectionToggle({
  edicionId: edicionIdProp,
  artistaId: artistaIdProp,
}) {
  const params = useParams();
  const { pathname } = useLocation();
  const fromPath = parseFimbaSectionIds(pathname);
  const edicionId = edicionIdProp ?? params.edicionId ?? fromPath.edicionId;
  const artistaId = artistaIdProp ?? params.artistaId ?? fromPath.artistaId;

  if (!edicionId) return null;

  const edicionBase = `/fimba/edicion/${edicionId}`;
  const logisticsBase = artistaId
    ? `${edicionBase}/artista/${artistaId}`
    : edicionBase;

  const visible = SECTIONS.filter((s) => !(s.edicionOnly && artistaId));

  return (
    <nav className="fimba-section-toggle" aria-label="Secciones de la edición">
      {visible.map(({ key, label, Icon, segment, edicionOnly }) => {
        const to =
          segment == null
            ? edicionBase
            : `${edicionOnly ? edicionBase : logisticsBase}/${segment}`;

        return (
          <NavLink
            key={key}
            to={to}
            end={segment == null}
            className={() => {
              const active =
                key === "artistas"
                  ? isFimbaArtistasPath(pathname, edicionId)
                  : isFimbaSectionPath(
                      pathname,
                      edicionId,
                      segment === "usuarios" ? null : artistaId,
                      segment,
                    );
              return `fimba-section-toggle-item${active ? " is-active" : ""}`;
            }}
          >
            <Icon size={15} aria-hidden />
            <span className="fimba-section-toggle-label">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
