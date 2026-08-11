import React from "react";
import { NavLink, useLocation, useParams } from "react-router-dom";
import {
  IconMusic,
  IconCalendar,
  IconBus,
  IconBed,
  IconClipboardCheck,
  IconUsers,
} from "../../components/ui/Icons";
import { useFimbaAccess } from "../../context/FimbaAccessContext";

/** Path without trailing slash (except root). */
function normalizePath(pathname) {
  const p = String(pathname || "");
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

/**
 * Segment order: Artistas | Agenda | Transportes | Hotelería | Contrataciones | Usuarios.
 * All tabs navigate to edición-level routes (never keep /artista/:id).
 * Consulta RO: oculta Contrataciones y Usuarios.
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
    key: "contrataciones",
    label: "Contrataciones",
    Icon: IconClipboardCheck,
    segment: "contrataciones",
    requiresContrataciones: true,
  },
  {
    key: "usuarios",
    label: "Usuarios",
    Icon: IconUsers,
    segment: "usuarios",
    requiresUsuarios: true,
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
 * Active only on edición-level section paths (top toggle exits artista context).
 * Artist-scoped logistics URLs do not highlight these tabs.
 * @param {string} pathname
 * @param {string|number} edicionId
 * @param {string} segment
 */
export function isFimbaSectionPath(pathname, edicionId, segment) {
  if (!segment || edicionId == null || edicionId === "") return false;
  const path = normalizePath(pathname);
  const ed = String(edicionId);
  return path === `/fimba/edicion/${ed}/${segment}`;
}

/**
 * Segmented control: Artistas | Agenda | Transportes | Hotelería | Contrataciones | Usuarios.
 * Always targets `/fimba/edicion/:edicionId/...` — never appends `/artista/:id`.
 */
export default function FimbaSectionToggle({
  edicionId: edicionIdProp,
}) {
  const params = useParams();
  const { pathname } = useLocation();
  const { canSeeUsuarios, canSeeContrataciones } = useFimbaAccess();
  const fromPath = parseFimbaSectionIds(pathname);
  const edicionId = edicionIdProp ?? params.edicionId ?? fromPath.edicionId;

  if (!edicionId) return null;

  const base = `/fimba/edicion/${edicionId}`;

  const visible = SECTIONS.filter((s) => {
    if (s.requiresUsuarios && !canSeeUsuarios) return false;
    if (s.requiresContrataciones && !canSeeContrataciones) return false;
    return true;
  });

  return (
    <nav className="fimba-section-toggle" aria-label="Secciones de la edición">
      {visible.map(({ key, label, Icon, segment }) => {
        const to = segment == null ? base : `${base}/${segment}`;

        return (
          <NavLink
            key={key}
            to={to}
            end={segment == null}
            className={() => {
              const active =
                key === "artistas"
                  ? isFimbaArtistasPath(pathname, edicionId)
                  : isFimbaSectionPath(pathname, edicionId, segment);
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
