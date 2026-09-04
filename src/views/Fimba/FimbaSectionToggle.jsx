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
import { useFimbaAccess } from "../../hooks/useFimbaAccess";
import {
  isFimbaArtistasPath,
  isFimbaSectionPath,
  parseFimbaSectionIds,
} from "../../utils/fimbaPaths";
import { useFimbaSheetLeaveGuard } from "./FimbaSheetLeaveGuardContext";

/**
 * Segment order: Artistas | Agenda | Transportes | Hotelería | Venues | Backline | Rider | Contrataciones | Usuarios.
 * All tabs navigate to edición-level routes (never keep /artista/:id).
 * Consulta RO: oculta Contrataciones y Usuarios. Token `/c`: también oculta Rider.
 * Token `/c/.../agenda` (`agendaOnly`): oculta todo el toggle (solo agenda).
 *
 * Path helpers live in `utils/fimbaPaths.js` (not re-exported here) so Fast Refresh
 * works and we avoid a circular import with FimbaAccessProvider / useFimbaAccess.
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


