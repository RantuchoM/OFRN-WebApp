import React from "react";
import { NavLink, useLocation, useParams } from "react-router-dom";
import {
  IconMusic,
  IconCalendar,
  IconBus,
  IconBed,
  IconFileText,
  IconClipboardCheck,
  IconUsers,
  IconMapPin,
  IconLayers,
} from "../../components/ui/Icons";
import { useFimbaAccess } from "../../context/FimbaAccessContext";
import { useFimbaSheetLeaveGuard } from "./FimbaSheetLeaveGuardContext";

/** Path without trailing slash (except root). */
function normalizePath(pathname) {
  const p = String(pathname || "");
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

/**
 * Segment order: Artistas | Agenda | Transportes | Hotelería | Venues | Backline | Rider | Contrataciones | Usuarios.
 * All tabs navigate to edición-level routes (never keep /artista/:id).
 * Consulta RO: oculta Contrataciones y Usuarios. Token `/c`: también oculta Rider.
 * Token `/c/.../agenda` (`agendaOnly`): oculta todo el toggle (solo agenda).
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
    key: "venues",
    label: "Venues",
    Icon: IconMapPin,
    segment: "venues",
  },
  {
    key: "backline",
    label: "Backline",
    Icon: IconLayers,
    segment: "backline",
  },
  {
    key: "rider",
    label: "Rider",
    Icon: IconFileText,
    segment: "rider",
    requiresRider: true,
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

const LANDSCAPE_SEGMENTS = new Set([
  "agenda",
  "transportes",
  "backline",
  "venues",
  "contrataciones",
]);

/**
 * Tab title + print page size for FimbaLayout @media print.
 * Planilla-heavy tabs use landscape; Escenario is outside this layout.
 */
export function resolveFimbaPrintMeta(pathname) {
  const path = normalizePath(pathname);
  if (path === "/fimba/login" || path.startsWith("/fimba/login/")) {
    return { title: "Acceso", landscape: false, hidePrint: true };
  }
  if (path === "/fimba") {
    return { title: "Ediciones", landscape: false, hidePrint: false };
  }
  if (path.startsWith("/fimba/c/") && path.endsWith("/agenda")) {
    return { title: "Agenda", landscape: true, hidePrint: false };
  }
  if (/^\/fimba\/[ae]\//.test(path)) {
    return { title: "Artista", landscape: false, hidePrint: false };
  }

  const { edicionId, artistaId } = parseFimbaSectionIds(path);
  if (!edicionId) {
    return { title: "FIMBA", landscape: false, hidePrint: false };
  }

  if (artistaId) {
    if (path.endsWith("/agenda")) {
      return { title: "Agenda", landscape: true, hidePrint: false };
    }
    if (path.endsWith("/transportes")) {
      return { title: "Transportes", landscape: true, hidePrint: false };
    }
    if (path.endsWith("/hoteleria")) {
      return { title: "Hotelería", landscape: false, hidePrint: false };
    }
    return { title: "Artista", landscape: false, hidePrint: false };
  }

  if (isFimbaArtistasPath(path, edicionId)) {
    return { title: "Artistas", landscape: true, hidePrint: false };
  }

  for (const seg of LANDSCAPE_SEGMENTS) {
    if (isFimbaSectionPath(path, edicionId, seg)) {
      const label = SECTIONS.find((s) => s.segment === seg)?.label || seg;
      return { title: label, landscape: true, hidePrint: false };
    }
  }

  if (isFimbaSectionPath(path, edicionId, "hoteleria")) {
    return { title: "Hotelería", landscape: false, hidePrint: false };
  }
  if (isFimbaSectionPath(path, edicionId, "rider")) {
    return { title: "Rider", landscape: false, hidePrint: false };
  }
  if (isFimbaSectionPath(path, edicionId, "usuarios")) {
    return { title: "Usuarios", landscape: false, hidePrint: false };
  }

  return { title: "FIMBA", landscape: false, hidePrint: false };
}

/**
 * Segmented control: Artistas | Agenda | Transportes | Hotelería | Venues | Backline | Rider | Contrataciones | Usuarios.
 * Always targets `/fimba/edicion/:edicionId/...` — never appends `/artista/:id`.
 */
export default function FimbaSectionToggle({
  edicionId: edicionIdProp,
}) {
  const params = useParams();
  const { pathname } = useLocation();
  const { canSeeUsuarios, canSeeContrataciones, canSeeRider, agendaOnly } =
    useFimbaAccess();
  const { tryNavigate } = useFimbaSheetLeaveGuard();
  const fromPath = parseFimbaSectionIds(pathname);
  const edicionId = edicionIdProp ?? params.edicionId ?? fromPath.edicionId;

  if (!edicionId || agendaOnly) return null;

  const base = `/fimba/edicion/${edicionId}`;

  const visible = SECTIONS.filter((s) => {
    if (s.requiresUsuarios && !canSeeUsuarios) return false;
    if (s.requiresContrataciones && !canSeeContrataciones) return false;
    if (s.requiresRider && !canSeeRider) return false;
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
            onClick={(e) => {
              if (!tryNavigate(to)) e.preventDefault();
            }}
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
