import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconCalendarPlus,
  IconLink,
  IconLinkOff,
  IconLoader,
  IconX,
} from "../../components/ui/Icons";
import {
  createFimbaStayEvent,
  listFimbaStayEvents,
} from "../../services/fimbaService";
import {
  classifyStayOverride,
  formatStayEventLabel,
  FIMBA_HORA_CHECKIN,
  FIMBA_HORA_CHECKOUT,
  isoDateOrNull,
  stayDateFromEventOrMirror,
  stayEventHoraLabel,
  stayOverrideLabel,
} from "../../utils/fimbaStay";

function formatFechaBrief(f) {
  const iso = isoDateOrNull(f);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function formatFechaFull(f) {
  const iso = isoDateOrNull(f);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Celda check-in/out: asociar evento existente o crear uno (paridad OFRN EventCellEditor).
 *
 * - `variant="override"` (default): integrante — vacío / «Usar grupo» = hereda del artista.
 * - `variant="group"`: artista (propuesta) — FK propia; vacío = sin evento; «Desvincular» limpia.
 */
export default function FimbaStayEventCell({
  side = "checkin",
  /** Embed propio (evento_checkin|checkout) o null si hereda / sin vínculo. */
  ownEvent = null,
  ownEventId = null,
  groupDate = null,
  groupEvent = null,
  idGira = null,
  idPropuesta = null,
  disabled = false,
  readOnly = false,
  /** "override" = persona vs grupo; "group" = estadía oficial del artista. */
  variant = "override",
  onLink,
  onClear,
  cellDataAttr = null,
}) {
  const isOut = side === "checkout";
  const isGroupScope = variant === "group";
  const defaultHora = isOut ? FIMBA_HORA_CHECKOUT : FIMBA_HORA_CHECKIN;
  const labelDefault = isOut ? "Check-out" : "Check-in";
  const clearLabel = isGroupScope ? "Desvincular" : "Usar grupo";
  const clearTitle = isGroupScope
    ? `Quitar ${labelDefault.toLowerCase()} vinculado`
    : "Volver al check-in/out del grupo";
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("pick"); // pick | create
  const [events, setEvents] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [createForm, setCreateForm] = useState({
    fecha: "",
    hora_inicio: defaultHora,
    descripcion: labelDefault,
  });

  const linked = ownEventId != null && ownEventId !== "";
  /** En override: no linked = hereda grupo. En group: no linked = sin evento. */
  const inherited = !isGroupScope && !linked;
  const displayEvent = linked
    ? ownEvent || (!isGroupScope ? groupEvent : null)
    : null;
  const effectiveDate =
    stayDateFromEventOrMirror(
      linked
        ? {
            evento_checkin: ownEvent,
            evento_checkout: ownEvent,
            checkin_at: ownEvent?.fecha,
            checkout_at: ownEvent?.fecha,
          }
        : null,
      side,
    ) ||
    (linked && ownEvent ? isoDateOrNull(ownEvent.fecha) : null) ||
    (linked && !isGroupScope ? isoDateOrNull(groupDate) : null);
  const kind = isGroupScope
    ? "inherit"
    : classifyStayOverride(
        side,
        linked ? effectiveDate || groupDate : null,
        groupDate,
      );

  const groupLabel = useMemo(() => {
    if (groupEvent) {
      return formatStayEventLabel(groupEvent) || formatFechaFull(groupDate);
    }
    return groupDate ? `${formatFechaFull(groupDate)} · ${defaultHora}` : null;
  }, [groupEvent, groupDate, defaultHora]);

  useEffect(() => {
    if (!open || !idGira) return;
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      setError(null);
      const { eventos, error: err } = await listFimbaStayEvents(idGira, side);
      if (cancelled) return;
      if (err) setError(err.message || "No se pudieron cargar eventos");
      setEvents(eventos || []);
      setLoadingList(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, idGira, side]);

  const openPicker = () => {
    if (disabled || readOnly || !idGira) return;
    setMode("pick");
    setError(null);
    const seedFecha =
      effectiveDate ||
      groupDate ||
      new Date().toISOString().slice(0, 10);
    setCreateForm({
      fecha: seedFecha,
      hora_inicio: stayEventHoraLabel(ownEvent) || defaultHora,
      descripcion:
        String(ownEvent?.descripcion || "").trim() || labelDefault,
    });
    setOpen(true);
  };

  const handleLink = async (id, embed = null) => {
    if (typeof onLink !== "function") return;
    setProcessing(true);
    setError(null);
    try {
      await onLink(id, embed);
      setOpen(false);
    } catch (err) {
      setError(err?.message || "No se pudo vincular");
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = async (e) => {
    e?.stopPropagation?.();
    if (typeof onClear !== "function") return;
    setProcessing(true);
    try {
      await onClear();
    } catch (err) {
      setError(err?.message || "No se pudo limpiar");
    } finally {
      setProcessing(false);
    }
  };

  const handleCreate = async () => {
    const fecha = isoDateOrNull(createForm.fecha);
    if (!fecha) {
      setError("Indicá una fecha válida");
      return;
    }
    if (!idGira) {
      setError("Sin gira asociada");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const { evento, error: err } = await createFimbaStayEvent({
        id_gira: idGira,
        kind: side,
        fecha,
        hora_inicio: createForm.hora_inicio || defaultHora,
        descripcion: createForm.descripcion || labelDefault,
        id_propuesta: idPropuesta,
      });
      if (err) throw err;
      if (!evento?.id) throw new Error("No se creó el evento");
      await onLink?.(evento.id, evento);
      setOpen(false);
    } catch (err) {
      setError(err?.message || "No se pudo crear el evento");
    } finally {
      setProcessing(false);
    }
  };

  if (readOnly) {
    const label = isGroupScope
      ? formatStayEventLabel(displayEvent) ||
        (effectiveDate ? formatFechaFull(effectiveDate) : "—")
      : formatStayEventLabel(displayEvent) ||
        (inherited
          ? groupLabel
            ? `Grupo · ${groupLabel}`
            : "—"
          : formatFechaFull(effectiveDate));
    const badge =
      !isGroupScope && linked && kind !== "inherit" ? (
        <span
          className={
            kind === "early"
              ? "fimba-badge fimba-badge-anticipada"
              : kind === "late"
                ? "fimba-badge fimba-badge-late"
                : "fimba-badge fimba-badge-override"
          }
        >
          {stayOverrideLabel(kind, side)}
        </span>
      ) : null;
    return (
      <div className="fimba-stay-event-cell fimba-stay-event-readonly">
        <div className="fimba-stay-event-label">{label || "—"}</div>
        {(badge || (!isGroupScope && inherited)) && (
          <div className="fimba-stay-caption">
            {!isGroupScope && inherited && groupLabel ? (
              <span className="fimba-muted" style={{ fontSize: "0.65rem" }}>
                Grupo
              </span>
            ) : null}
            {badge}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fimba-stay-event-cell">
      {linked ? (
        <div className="fimba-stay-event-chip">
          <div className="fimba-stay-event-chip-top">
            <span className="fimba-stay-event-chip-tag">Agenda</span>
            <button
              type="button"
              className="fimba-stay-clear"
              onClick={handleClear}
              disabled={disabled || processing}
              title={clearTitle}
            >
              {processing ? (
                <IconLoader size={10} className="animate-spin" />
              ) : (
                <IconLinkOff size={10} />
              )}{" "}
              {clearLabel}
            </button>
          </div>
          <button
            type="button"
            className="fimba-stay-event-chip-body"
            onClick={openPicker}
            disabled={disabled || processing}
            data-fimba-part-cell={cellDataAttr || undefined}
            title="Cambiar evento vinculado"
          >
            <div className="fimba-stay-event-chip-title">
              {String(displayEvent?.descripcion || labelDefault).trim() ||
                labelDefault}
            </div>
            <div className="fimba-stay-event-chip-meta">
              {formatFechaBrief(displayEvent?.fecha || effectiveDate)}
              {stayEventHoraLabel(displayEvent)
                ? ` · ${stayEventHoraLabel(displayEvent)} hs`
                : ""}
              {displayEvent?.locaciones?.nombre
                ? ` · ${displayEvent.locaciones.nombre}`
                : ""}
            </div>
          </button>
          {!isGroupScope && kind !== "inherit" && (
            <span
              className={
                kind === "early"
                  ? "fimba-badge fimba-badge-anticipada"
                  : kind === "late"
                    ? "fimba-badge fimba-badge-late"
                    : "fimba-badge fimba-badge-override"
              }
              title={stayOverrideLabel(kind, side)}
            >
              {stayOverrideLabel(kind, side)}
            </span>
          )}
        </div>
      ) : (
        <div className="fimba-stay-event-inherit">
          {isGroupScope ? (
            <div className="fimba-muted fimba-date-inherit">
              Sin evento de {labelDefault.toLowerCase()}
            </div>
          ) : groupLabel ? (
            <div className="fimba-muted fimba-date-inherit">
              Grupo · {groupLabel}
            </div>
          ) : (
            <div className="fimba-muted fimba-date-inherit">Sin fecha de grupo</div>
          )}
          <button
            type="button"
            className="fimba-stay-vincular"
            onClick={openPicker}
            disabled={disabled || processing || !idGira}
            data-fimba-part-cell={cellDataAttr || undefined}
            title={`Vincular o crear evento de ${labelDefault.toLowerCase()}`}
          >
            {processing ? "…" : "Vincular evento"}
          </button>
        </div>
      )}

      {open &&
        createPortal(
          <div
            className="fimba-stay-event-modal-backdrop"
            onClick={() => !processing && setOpen(false)}
            role="presentation"
          >
            <div
              className="fimba-stay-event-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`${labelDefault}: vincular evento`}
            >
              <div className="fimba-stay-event-modal-head">
                <h4>
                  {mode === "create"
                    ? `Crear ${labelDefault.toLowerCase()}`
                    : `Vincular: ${labelDefault}`}
                </h4>
                <button
                  type="button"
                  className="fimba-btn fimba-btn-ghost"
                  onClick={() => setOpen(false)}
                  disabled={processing}
                  aria-label="Cerrar"
                >
                  <IconX size={18} />
                </button>
              </div>

              <div className="fimba-stay-event-modal-body">
                {error && <div className="fimba-error">{error}</div>}

                {mode === "pick" ? (
                  <>
                    <div className="fimba-stay-event-list">
                      {loadingList ? (
                        <div className="fimba-muted" style={{ padding: 12 }}>
                          <IconLoader size={14} className="animate-spin" /> Cargando…
                        </div>
                      ) : events.length === 0 ? (
                        <div className="fimba-muted" style={{ padding: 12 }}>
                          No hay eventos {labelDefault} en la agenda. Creá uno
                          nuevo.
                        </div>
                      ) : (
                        events.map((ev) => {
                          const isGroup =
                            groupEvent?.id != null &&
                            Number(groupEvent.id) === Number(ev.id);
                          return (
                            <button
                              key={ev.id}
                              type="button"
                              className="fimba-stay-event-option"
                              onClick={() => handleLink(ev.id, ev)}
                              disabled={processing}
                            >
                              <div className="fimba-stay-event-option-main">
                                <span className="fimba-stay-event-option-chip">
                                  {labelDefault}
                                  {isGroup ? " · grupo" : ""}
                                </span>
                                <div className="fimba-stay-event-option-title">
                                  {String(ev.descripcion || "").trim() ||
                                    labelDefault}
                                </div>
                                <div className="fimba-stay-event-option-meta">
                                  {formatFechaFull(ev.fecha)}
                                  {stayEventHoraLabel(ev)
                                    ? ` · ${stayEventHoraLabel(ev)} hs`
                                    : ""}
                                  {ev.locaciones?.nombre
                                    ? ` · ${ev.locaciones.nombre}`
                                    : ""}
                                </div>
                              </div>
                              <IconLink size={14} className="fimba-stay-event-option-icon" />
                            </button>
                          );
                        })
                      )}
                    </div>
                    <button
                      type="button"
                      className="fimba-btn fimba-btn-primary fimba-stay-event-create-btn"
                      onClick={() => setMode("create")}
                      disabled={processing}
                    >
                      <IconCalendarPlus size={16} /> Crear nuevo
                    </button>
                    {linked && (
                      <button
                        type="button"
                        className="fimba-btn fimba-btn-ghost"
                        style={{ width: "100%", marginTop: 8 }}
                        onClick={async () => {
                          await handleClear();
                          setOpen(false);
                        }}
                        disabled={processing}
                      >
                        <IconLinkOff size={14} />{" "}
                        {isGroupScope
                          ? "Desvincular"
                          : "Usar grupo (desvincular)"}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="fimba-stay-event-create">
                    <label className="fimba-label">
                      Fecha
                      <input
                        className="fimba-input"
                        type="date"
                        min="2020-01-01"
                        max="2035-12-31"
                        value={createForm.fecha}
                        onChange={(e) =>
                          setCreateForm((f) => ({ ...f, fecha: e.target.value }))
                        }
                        disabled={processing}
                      />
                    </label>
                    <label className="fimba-label">
                      Hora
                      <input
                        className="fimba-input"
                        type="time"
                        value={String(createForm.hora_inicio || defaultHora).slice(0, 5)}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            hora_inicio: e.target.value || defaultHora,
                          }))
                        }
                        disabled={processing}
                      />
                    </label>
                    <label className="fimba-label">
                      Detalle
                      <input
                        className="fimba-input"
                        value={createForm.descripcion}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            descripcion: e.target.value,
                          }))
                        }
                        disabled={processing}
                        placeholder={labelDefault}
                      />
                    </label>
                    <p className="fimba-muted" style={{ margin: "0.25rem 0 0", fontSize: "0.75rem" }}>
                      Locación = hotel del artista (Artistas / datos generales).
                    </p>
                    <div className="fimba-stay-event-create-actions">
                      <button
                        type="button"
                        className="fimba-btn fimba-btn-ghost"
                        onClick={() => setMode("pick")}
                        disabled={processing}
                      >
                        Volver
                      </button>
                      <button
                        type="button"
                        className="fimba-btn fimba-btn-primary"
                        onClick={handleCreate}
                        disabled={processing}
                      >
                        {processing ? (
                          <IconLoader size={14} className="animate-spin" />
                        ) : (
                          <IconCalendarPlus size={14} />
                        )}{" "}
                        Crear y vincular
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Etiqueta compacta para tablas de solo lectura (hotelería / nómina). */
export function FimbaStayEventReadLabel({
  side,
  participante,
  propuesta,
}) {
  const ownId =
    side === "checkout"
      ? participante?.id_evento_checkout
      : participante?.id_evento_checkin;
  const ownEv =
    side === "checkout"
      ? participante?.evento_checkout
      : participante?.evento_checkin;
  const groupDate = stayDateFromEventOrMirror(propuesta, side);
  const groupEv =
    side === "checkout"
      ? propuesta?.evento_checkout
      : propuesta?.evento_checkin;
  const inherited = ownId == null || ownId === "";
  const date = stayDateFromEventOrMirror(participante, side) || groupDate;
  const kind = classifyStayOverride(
    side,
    inherited ? null : date,
    groupDate,
  );
  const label = inherited
    ? formatStayEventLabel(groupEv) ||
      (groupDate ? formatFechaFull(groupDate) : "—")
    : formatStayEventLabel(ownEv) || (date ? formatFechaFull(date) : "—");

  return (
    <div className="fimba-stay-event-readonly">
      <div>{label}</div>
      {!inherited && kind !== "inherit" && (
        <span
          className={
            kind === "early"
              ? "fimba-badge fimba-badge-anticipada"
              : kind === "late"
                ? "fimba-badge fimba-badge-late"
                : "fimba-badge fimba-badge-override"
          }
        >
          {stayOverrideLabel(kind, side)}
        </span>
      )}
      {inherited && groupDate ? (
        <span className="fimba-muted" style={{ fontSize: "0.65rem" }}>
          Grupo
        </span>
      ) : null}
    </div>
  );
}
