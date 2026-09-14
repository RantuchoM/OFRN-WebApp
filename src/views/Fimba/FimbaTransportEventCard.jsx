import React from "react";
import {
  IconClock,
  IconEdit,
  IconLoader,
  IconMapPin,
  IconPause,
  IconPlus,
  IconDownload,
  IconUpload,
} from "../../components/ui/Icons";
import { formatWeekdayFullLocal } from "../../utils/dates";
import { formatBoardChipLabel } from "../../utils/fimbaTransportBoarding";
import { FimbaEventDetallePreview } from "./FimbaEventDetalleField";
import { FimbaAgendaDayDividerMobile } from "./FimbaAgendaEventCard";

function formatFechaShort(f) {
  if (!f) return "—";
  const [y, m, d] = String(f).split("-");
  if (!d) return f;
  return `${d}/${m}`;
}

function CompactBoard({
  direction,
  chips = [],
  total = 0,
  canEdit = false,
  onOpen,
}) {
  const isUp = direction === "up";
  const Icon = isUp ? IconUpload : IconDownload;
  const hasPeople = total > 0 || chips.length > 0;
  const shown = chips.slice(0, 3);
  const extra = Math.max(0, chips.length - shown.length);
  return (
    <button
      type="button"
      className={`fimba-transport-card-board-col${isUp ? " is-up" : " is-down"}${hasPeople ? " has-people" : ""}`}
      disabled={!canEdit && !hasPeople}
      onClick={(e) => {
        e.stopPropagation();
        onOpen?.();
      }}
      title={isUp ? "Subidas" : "Bajadas"}
    >
      <span className="fimba-transport-card-board-head">
        <Icon size={11} />
        <span>{total}</span>
        {canEdit ? <IconPlus size={10} /> : null}
      </span>
      {shown.length > 0 ? (
        <span className="fimba-transport-card-board-chips">
          {shown.map((chip) => (
            <span
              key={chip.key}
              className={`fimba-planilla-board-chip${chip.kind === "ofrn" ? " fimba-planilla-board-chip-ofrn" : ""}${chip.es_chofer ? " fimba-planilla-board-chip-chofer" : ""}`}
              title={chip.title || chip.label}
            >
              <span className="fimba-planilla-board-chip-label">
                {formatBoardChipLabel(chip.label, chip.plazas)}
              </span>
            </span>
          ))}
          {extra > 0 ? (
            <span className="fimba-muted" style={{ fontSize: "0.68rem" }}>
              +{extra}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="fimba-transport-card-board-empty">
          {canEdit ? (isUp ? "Subida" : "Bajada") : "—"}
        </span>
      )}
    </button>
  );
}

export function FimbaTransportPauseDivider({
  canCreate = false,
  creatingTop = false,
  creatingBottom = false,
  onCreateTop,
  onCreateBottom,
  onRecorrido,
  readOnly = true,
}) {
  return (
    <div className="fimba-transport-pause-card" role="separator">
      {!readOnly ? (
        <button
          type="button"
          className="fimba-btn fimba-btn-ghost"
          disabled={!canCreate && !creatingTop}
          title="Crear parada después de esta"
          aria-label="Crear parada después de esta"
          onClick={onCreateTop}
          style={{ padding: "0.2rem 0.35rem" }}
        >
          {creatingTop ? (
            <IconLoader size={12} className="animate-spin" />
          ) : (
            <IconPlus size={12} />
          )}
        </button>
      ) : null}
      <span className="fimba-transport-pause-label">
        <IconPause size={13} /> Pausa · vehículo libre
      </span>
      {!readOnly ? (
        <>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            disabled={!canCreate}
            onClick={onRecorrido}
            style={{
              padding: "0.1rem 0.35rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "#0e7490",
              textDecoration: "underline",
              textUnderlineOffset: 2,
              opacity: canCreate ? 1 : 0.4,
            }}
          >
            Recorrido
          </button>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            disabled={!canCreate && !creatingBottom}
            title="Crear parada antes del siguiente"
            aria-label="Crear parada antes del siguiente"
            onClick={onCreateBottom}
            style={{ padding: "0.2rem 0.35rem" }}
          >
            {creatingBottom ? (
              <IconLoader size={12} className="animate-spin" />
            ) : (
              <IconPlus size={12} />
            )}
          </button>
        </>
      ) : null}
    </div>
  );
}

/**
 * Card compacta de trayecto para viewport móvil (< 768px).
 * Desktop sigue en planilla; tap abre el formulario (sin edición inline).
 */
export default function FimbaTransportEventCard({
  row,
  selectChecked = false,
  onSelectChange = null,
  onActivate = null,
  onEdit = null,
  onOpenUp = null,
  onOpenDown = null,
  onAddIntermediate = null,
  artistasNode = null,
  actionsNode = null,
  readOnly = true,
  className = "",
}) {
  const ev = row.ev;
  const weekday = formatWeekdayFullLocal(ev?.fecha);
  const horaLlegada = row.horaFinDisp?.value || null;
  const timeLabel = horaLlegada ? `${row.horaCom}–${horaLlegada}` : row.horaCom;
  const interactive = Boolean(onActivate) && !row.isPendingCreate;
  const showSelect = typeof onSelectChange === "function";
  const locText = row.locacion && row.locacion !== "—" ? row.locacion : null;
  const destText =
    !row.isContext &&
    row.destinoSiguiente &&
    row.destinoSiguiente !== "—" &&
    !row.destinoIsPlaceholder
      ? row.destinoSiguiente
      : null;

  const rowTone = row.isContext
    ? "fimba-transport-event-card--contexto"
    : ev?.origen === "ofrn"
      ? "fimba-agenda-event-card--ofrn"
      : ev?.origen === "ambos"
        ? "fimba-agenda-event-card--ambos"
        : "";

  const ignoreClick =
    "button, a, input, select, textarea, label, .fimba-artistas-tags-cell, .fimba-agenda-card-menu, .fimba-transport-card-board, .fimba-agenda-event-card-actions, .fimba-agenda-event-card-detalle, .fimba-detalle-preview-row, .fimba-detalle-images-btn";

  const tipoTint =
    row.tipoTint && !row.isPendingCreate ? row.tipoTint : undefined;

  return (
    <article
      className={`fimba-agenda-event-card fimba-transport-event-card ${rowTone}${tipoTint ? " fimba-has-tipo-tint" : ""}${row.isHighlighted ? " fimba-row-highlight" : ""}${row.isDeletingRow ? " fimba-row-deleting" : ""}${row.isPendingCreate ? " fimba-row-pending-create" : ""}${className ? ` ${className}` : ""}`.trim()}
      data-fimba-evento-id={ev?.id ?? undefined}
      style={tipoTint}
      onClick={
        interactive
          ? (e) => {
              if (e.target.closest(ignoreClick)) return;
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
        row.isPendingCreate
          ? "Guardando…"
          : row.isContext
            ? "Evento de agenda (contexto)"
            : interactive
              ? readOnly
                ? "Ver trayecto"
                : "Abrir trayecto"
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
              aria-label={`Seleccionar trayecto ${ev?.id ?? ""}`}
            />
          </label>
        ) : null}

        <div className="fimba-transport-card-when">
          <IconClock size={13} className="fimba-agenda-event-card-when-icon" />
          <span className="fimba-transport-card-date">
            {weekday ? `${weekday.slice(0, 3)} ` : ""}
            {formatFechaShort(ev?.fecha)}
          </span>
          <span className="fimba-agenda-event-card-time">{timeLabel}</span>
        </div>

        <div className="fimba-agenda-event-card-badges">
          {row.isContext ? (
            <span className="fimba-badge fimba-badge-contexto">
              {ev?.tipo_nombre || ev?.categoria_nombre || "Agenda"}
            </span>
          ) : null}
          {row.isActividadVehiculo ? (
            <span
              className="fimba-badge fimba-badge-actividad-vehiculo"
              title="Actividad con vehículo asignado (no traslado)"
            >
              {ev?.tipo_nombre || ev?.categoria_nombre || "Actividad"}
            </span>
          ) : null}
          {ev?.es_fimba ? (
            <span className="fimba-badge fimba-badge-fimba">FIMBA</span>
          ) : null}
          {ev?.es_ofrn ? (
            <span className="fimba-badge fimba-badge-ofrn">OFRN</span>
          ) : null}
        </div>

        <div className="fimba-agenda-event-card-actions">
          {row.isPendingCreate || row.isDeletingRow ? (
            <IconLoader size={14} className="animate-spin" />
          ) : (
            <>
              {!readOnly && onAddIntermediate ? (
                <button
                  type="button"
                  className="fimba-btn fimba-btn-ghost"
                  disabled={!row.canAddIntermediate && !row.isCreatingIntermediateHere}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddIntermediate();
                  }}
                  title="Insertar parada intermedia"
                  aria-label="Insertar parada intermedia"
                  style={{
                    padding: "0.2rem 0.25rem",
                    color: "var(--fimba-cyan, #0e7490)",
                    opacity:
                      row.canAddIntermediate || row.isCreatingIntermediateHere
                        ? 1
                        : 0.35,
                  }}
                >
                  {row.isCreatingIntermediateHere ? (
                    <IconLoader size={14} className="animate-spin" />
                  ) : (
                    <IconPlus size={14} />
                  )}
                </button>
              ) : null}
              {onEdit ? (
                <button
                  type="button"
                  className="fimba-btn fimba-btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  title="Editar"
                  aria-label="Editar trayecto"
                  style={{ padding: "0.2rem 0.25rem" }}
                >
                  <IconEdit size={15} />
                </button>
              ) : null}
              {actionsNode}
            </>
          )}
        </div>
      </div>

      <div className="fimba-agenda-event-card-detalle">
        {row.isPendingCreate ? (
          <span
            className="fimba-pending-create-label"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginBottom: 4,
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "#64748b",
            }}
          >
            <IconLoader size={12} className="animate-spin" /> Guardando…
          </span>
        ) : null}
        <FimbaEventDetallePreview
          html={ev?.actividad}
          empty={ev?.tipo_nombre || "—"}
          clamp
        />
        {ev?.observaciones ? (
          <span className="fimba-agenda-event-card-obs">{ev.observaciones}</span>
        ) : null}
      </div>

      <div className="fimba-transport-card-route">
        <IconMapPin size={12} />
        <span>
          {locText || "Sin locación"}
          {destText ? ` → ${destText}` : ""}
        </span>
        {row.pauseAfterRow ? (
          <span className="fimba-badge fimba-transport-card-pausa-badge">Pausa</span>
        ) : null}
      </div>

      <div className="fimba-transport-card-meta">
        {row.vehLabel && row.vehLabel !== "—" ? (
          <span
            className={
              row.vehLabel === "SIN SERVICIO"
                ? "fimba-badge"
                : "fimba-transport-card-veh"
            }
            style={
              row.vehLabel === "SIN SERVICIO"
                ? { background: "#fef3c7", color: "#92400e" }
                : undefined
            }
          >
            {row.vehLabel}
          </span>
        ) : null}
        {ev?.vuelo ? (
          <span className="fimba-muted">Vuelo {ev.vuelo}</span>
        ) : null}
        {!row.isContext && row.enTransito != null ? (
          <span
            className="fimba-transport-card-transito"
            style={{
              color: row.overbook
                ? "#b91c1c"
                : row.libres != null && row.libres === 0
                  ? "#b45309"
                  : undefined,
              fontWeight: 700,
            }}
            title={
              row.aBordo?.titleText ||
              (row.libres != null && row.cap != null
                ? `Libres: ${row.libres} (cap ${row.cap})`
                : undefined)
            }
          >
            {row.enTransito}
            {row.cap != null ? (
              <span className="fimba-muted" style={{ fontWeight: 500 }}>
                {" "}
                / {row.cap}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      {!row.isContext ? (
        <div className="fimba-transport-card-board">
          <CompactBoard
            direction="up"
            chips={row.upsBoard.chips}
            total={row.upsBoard.total}
            canEdit={row.canEditStops}
            onOpen={onOpenUp}
          />
          <CompactBoard
            direction="down"
            chips={row.downsBoard.chips}
            total={row.downsBoard.total}
            canEdit={row.canEditStops}
            onOpen={onOpenDown}
          />
        </div>
      ) : null}

      {artistasNode ? (
        <div className="fimba-agenda-event-card-tags">{artistasNode}</div>
      ) : null}
    </article>
  );
}

export { FimbaAgendaDayDividerMobile };
