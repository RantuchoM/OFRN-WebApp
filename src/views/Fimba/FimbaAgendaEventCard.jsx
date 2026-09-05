import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconClock,
  IconLoader,
  IconMapPin,
  IconMoreVertical,
} from "../../components/ui/Icons";
import { formatFechaLargaEs } from "../../utils/dates";
import { fimbaTipoRowTintStyle } from "../../utils/fimbaEventCategories";
import { FimbaEventDetallePreview } from "./FimbaEventDetalleField";

function sliceTime(t) {
  if (!t) return "—";
  return String(t).slice(0, 5);
}

/**
 * Separador de día (vista móvil cards). Misma etiqueta que la planilla.
 */
export function FimbaAgendaDayDividerMobile({ fecha, first = false }) {
  if (!fecha) return null;
  return (
    <div
      className={`fimba-agenda-mobile-day${first ? " fimba-agenda-mobile-day--first" : ""}`}
      role="separator"
      aria-label={formatFechaLargaEs(fecha)}
    >
      <span className="fimba-day-divider-label">{formatFechaLargaEs(fecha)}</span>
    </div>
  );
}

/**
 * Menú ⋮ portal (z-110) para acciones de fila Agenda (planilla + card móvil).
 */
export function FimbaAgendaCardMenu({
  items = [],
  disabled = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) {
      setMenuStyle(null);
      return undefined;
    }
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = 200;
      const estH = Math.min(280, 44 + items.length * 36);
      const left = Math.min(
        Math.max(8, r.right - width),
        window.innerWidth - width - 8,
      );
      const openUp =
        r.bottom + estH > window.innerHeight && r.top > estH;
      setMenuStyle({
        position: "fixed",
        top: openUp ? undefined : r.bottom + 4,
        bottom: openUp ? window.innerHeight - r.top + 4 : undefined,
        left,
        width,
        zIndex: 110,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [menuOpen, items.length]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onPointer = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [menuOpen]);

  if (!items.length) return null;

  const itemStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    width: "100%",
    padding: "0.45rem 0.7rem",
    border: 0,
    background: "transparent",
    textAlign: "left",
    fontSize: "0.8rem",
    cursor: "pointer",
    color: "inherit",
  };

  return (
    <div className="fimba-agenda-card-menu" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className="fimba-btn fimba-btn-ghost"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title="Más acciones"
        aria-label="Más acciones"
        onClick={() => setMenuOpen((v) => !v)}
        style={{ padding: "0.2rem 0.25rem" }}
      >
        <IconMoreVertical size={16} />
      </button>
      {menuOpen &&
        menuStyle &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fimba-dropdown-menu"
            role="menu"
            style={{
              ...menuStyle,
              background: "var(--fimba-surface, #fff)",
              border: "1px solid var(--fimba-border, #e2e8f0)",
              borderRadius: 10,
              boxShadow: "0 10px 28px rgba(15, 23, 42, 0.14)",
              padding: "0.25rem 0",
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                style={{
                  ...itemStyle,
                  color: item.danger ? "#b91c1c" : itemStyle.color,
                }}
                onClick={() => {
                  setMenuOpen(false);
                  item.onClick?.();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * Card de evento para Agenda / consulta en viewport móvil (< md).
 * Desktop sigue en planilla; esta card no reemplaza edición inline.
 */
export default function FimbaAgendaEventCard({
  ev,
  origenLabel = "—",
  destinoLabel = null,
  vueloLabel = null,
  vehicleLabel = null,
  aboardCount = null,
  showOrigenBadges = true,
  showDestino = true,
  showVehicle = true,
  showAboard = false,
  selectChecked = null,
  onSelectChange = null,
  onActivate = null,
  onEdit = null,
  artistasNode = null,
  ofrnNode = null,
  menuItems = [],
  primaryActions = null,
  readOnly = true,
  busy = false,
}) {
  const horaCom = sliceTime(ev?.hora_inicio);
  const horaFin = sliceTime(ev?.hora_fin);
  const timeRange =
    horaFin && horaFin !== "—" ? `${horaCom} – ${horaFin}` : horaCom;

  const rowTone =
    ev?.origen === "ofrn"
      ? "fimba-agenda-event-card--ofrn"
      : ev?.origen === "ambos"
        ? "fimba-agenda-event-card--ambos"
        : "";
  const tipoTint = fimbaTipoRowTintStyle(ev?.tipo_color);

  const interactive = Boolean(onActivate) && !busy;
  const showSelect = typeof onSelectChange === "function";

  const metaBits = [];
  if (origenLabel && origenLabel !== "—") {
    metaBits.push({ key: "origen", icon: <IconMapPin size={12} />, text: origenLabel });
  }
  if (
    showDestino &&
    destinoLabel &&
    destinoLabel !== "—" &&
    destinoLabel !== origenLabel
  ) {
    metaBits.push({ key: "destino", icon: null, text: `→ ${destinoLabel}` });
  }
  if (vueloLabel && vueloLabel !== "—") {
    metaBits.push({ key: "vuelo", icon: null, text: `Vuelo ${vueloLabel}` });
  }
  if (showVehicle && vehicleLabel && vehicleLabel !== "—") {
    metaBits.push({
      key: "veh",
      icon: null,
      text: vehicleLabel,
      warn: vehicleLabel === "SIN SERVICIO",
    });
  }
  if (showAboard && aboardCount != null) {
    metaBits.push({ key: "aboard", icon: null, text: `A bordo ${aboardCount}` });
  }

  return (
    <article
      className={`fimba-agenda-event-card ${rowTone}${tipoTint ? " fimba-has-tipo-tint" : ""}`.trim()}
      style={tipoTint}
      onClick={
        interactive
          ? (e) => {
              if (
                e.target.closest(
                  "button, a, input, select, textarea, label, .fimba-artistas-tags-cell, .fimba-agenda-card-menu, .fimba-agenda-event-card-actions",
                )
              ) {
                return;
              }
              onActivate();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate();
              }
            }
          : undefined
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={
        interactive
          ? readOnly
            ? "Ver evento"
            : "Abrir evento"
          : undefined
      }
    >
      <div className="fimba-agenda-event-card-top">
        {showSelect ? (
          <label
            className="fimba-agenda-event-card-check"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={Boolean(selectChecked)}
              onChange={onSelectChange}
              aria-label={`Seleccionar evento ${ev?.id ?? ""}`}
            />
          </label>
        ) : null}

        <div className="fimba-agenda-event-card-when">
          <IconClock size={14} className="fimba-agenda-event-card-when-icon" />
          <span className="fimba-agenda-event-card-time">{timeRange}</span>
        </div>

        <div className="fimba-agenda-event-card-badges">
          {showOrigenBadges ? (
            <>
              {ev?.es_fimba ? (
                <span className="fimba-badge fimba-badge-fimba">FIMBA</span>
              ) : null}
              {ev?.es_ofrn ? (
                <span className="fimba-badge fimba-badge-ofrn">OFRN</span>
              ) : null}
            </>
          ) : null}
          <span
            className="fimba-badge"
            style={
              ev?.tipo_color
                ? {
                    background: `${ev.tipo_color}22`,
                    color: ev.tipo_color,
                    borderColor: `${ev.tipo_color}44`,
                  }
                : undefined
            }
            title={
              ev?.categoria_nombre
                ? `${ev.tipo_nombre || ""} · ${ev.categoria_nombre}`
                : ev?.tipo_nombre || undefined
            }
          >
            {ev?.tipo_nombre || "—"}
          </span>
        </div>

        <div className="fimba-agenda-event-card-actions">
          {busy ? (
            <IconLoader size={14} className="animate-spin" />
          ) : (
            <>
              {primaryActions}
              {onEdit ? (
                <button
                  type="button"
                  className="fimba-btn fimba-btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  title="Editar"
                  aria-label="Editar evento"
                  style={{ padding: "0.2rem 0.25rem" }}
                >
                  <IconEdit size={15} />
                </button>
              ) : null}
              <FimbaAgendaCardMenu items={menuItems} disabled={busy} />
            </>
          )}
        </div>
      </div>

      <div className="fimba-agenda-event-card-detalle">
        <FimbaEventDetallePreview html={ev?.actividad} clamp />
        {ev?.observaciones ? (
          <span className="fimba-agenda-event-card-obs">{ev.observaciones}</span>
        ) : null}
        {ev?.categoria_nombre ? (
          <span className="fimba-muted fimba-agenda-event-card-cat">
            {ev.categoria_nombre}
          </span>
        ) : null}
      </div>

      {metaBits.length > 0 ? (
        <div className="fimba-agenda-event-card-meta">
          {metaBits.map((bit) => (
            <span
              key={bit.key}
              className={
                bit.warn
                  ? "fimba-agenda-event-card-meta-item fimba-agenda-event-card-meta-item--warn"
                  : "fimba-agenda-event-card-meta-item"
              }
              title={bit.text}
            >
              {bit.icon}
              <span>{bit.text}</span>
            </span>
          ))}
        </div>
      ) : null}

      {ofrnNode || artistasNode ? (
        <div className="fimba-agenda-event-card-tags">
          {ofrnNode}
          {artistasNode}
        </div>
      ) : null}
    </article>
  );
}
