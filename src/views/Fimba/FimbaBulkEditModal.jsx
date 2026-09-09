import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import MultiSelectDropdown from "../../components/ui/MultiSelectDropdown";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import {
  IconArrowRight,
  IconBus,
  IconCheck,
  IconClock,
  IconEdit,
  IconLoader,
  IconTag,
  IconX,
} from "../../components/ui/Icons";
import {
  bulkPatchFimbaEventosTags,
  bulkReassignFimbaEventosVehiculo,
  bulkShiftFimbaEventosSchedule,
  findBoardingLinksForEvents,
  labelGiraTransporte,
} from "../../services/fimbaService";
import { sortFimbaPropuestasByNombre } from "../../utils/fimbaAgendaSort";
import { formatAgendaOrigenLabel } from "../../utils/fimbaTransportBoarding";

function sliceTime(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
}

function eventStartSortKey(ev) {
  const fecha = String(ev?.fecha || "").slice(0, 10);
  const hora = String(ev?.hora_inicio || "00:00:00").slice(0, 8);
  const id = Number(ev?.id) || 0;
  return `${fecha}T${hora.padEnd(8, "0")}|${String(id).padStart(12, "0")}`;
}

function vehicleLabelsForEvent(ev, vehiculos) {
  const flotaById = new Map(
    (vehiculos || []).map((gt) => [Number(gt.id), gt]),
  );
  const labels = [];
  for (const r of ev?.vehiculos || []) {
    const tid = Number(r?.id_gira_transporte);
    if (!Number.isFinite(tid)) continue;
    const gt = r?.giras_transportes || flotaById.get(tid) || null;
    labels.push(gt ? labelGiraTransporte(gt) : `Vehículo #${tid}`);
  }
  if (
    !labels.length &&
    ev?.id_gira_transporte != null &&
    ev.id_gira_transporte !== ""
  ) {
    const tid = Number(ev.id_gira_transporte);
    const gt = flotaById.get(tid) || null;
    labels.push(gt ? labelGiraTransporte(gt) : `Vehículo #${tid}`);
  }
  return labels.length ? labels : ["SIN SERVICIO"];
}

function eventPreviewLine(ev) {
  const fecha = String(ev?.fecha || "").slice(0, 10) || "—";
  const hora = sliceTime(ev?.hora_inicio) || "—";
  const origen =
    formatAgendaOrigenLabel(ev, { skipDestinoFallback: true }) || "—";
  return `${fecha} ${hora} · ${origen}`;
}

/**
 * Modal «Editar en lote» (Agenda + Transportes).
 * Portal → document.body, z-[100] vía `.fimba-modal-backdrop`.
 *
 * @param {'agenda'|'transportes'} variant
 */
export default function FimbaBulkEditModal({
  variant = "agenda",
  events = [],
  propuestas = [],
  giraGrupos = [],
  vehiculos = [],
  onClose,
  onApplied,
}) {
  // Sections start unchecked so Apply never runs an action the user did not opt into.
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleMode, setScheduleMode] = useState("absolute"); // absolute | delta
  const [anchorFecha, setAnchorFecha] = useState("");
  const [anchorHora, setAnchorHora] = useState("");
  const [deltaHours, setDeltaHours] = useState("0");
  const [deltaMinutes, setDeltaMinutes] = useState("0");
  const [deltaSign, setDeltaSign] = useState("+"); // + | -

  const [tagsEnabled, setTagsEnabled] = useState(false);
  const [addPropuestaIds, setAddPropuestaIds] = useState([]);
  const [removePropuestaIds, setRemovePropuestaIds] = useState([]);
  const [addGrupoIds, setAddGrupoIds] = useState([]);
  const [removeGrupoIds, setRemoveGrupoIds] = useState([]);

  const [vehicleEnabled, setVehicleEnabled] = useState(false);
  const [vehicleId, setVehicleId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  /** Confirm preview before applying vehicle reassignment. */
  const [vehiclePreviewOpen, setVehiclePreviewOpen] = useState(false);
  const [boardingPreview, setBoardingPreview] = useState(null);
  const [boardingPreviewLoading, setBoardingPreviewLoading] = useState(false);

  const earliest = useMemo(() => {
    if (!events.length) return null;
    return [...events].sort((a, b) =>
      eventStartSortKey(a).localeCompare(eventStartSortKey(b)),
    )[0];
  }, [events]);

  useEffect(() => {
    if (!earliest) return;
    setAnchorFecha(String(earliest.fecha || "").slice(0, 10));
    setAnchorHora(sliceTime(earliest.hora_inicio) || "10:00");
  }, [earliest]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !saving && !vehiclePreviewOpen) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving, vehiclePreviewOpen]);

  const propuestaOptions = useMemo(
    () =>
      sortFimbaPropuestasByNombre(propuestas || []).map((p) => ({
        value: p.id,
        label: p.nombre || `Artista #${p.id}`,
      })),
    [propuestas],
  );

  const grupoOptions = useMemo(
    () =>
      (giraGrupos || []).map((g) => ({
        value: g.id,
        label: g.nombre || `Grupo #${g.id}`,
      })),
    [giraGrupos],
  );

  const deltaMinutesTotal = useMemo(() => {
    const h = Math.max(0, Number(deltaHours) || 0);
    const m = Math.max(0, Number(deltaMinutes) || 0);
    const raw = h * 60 + m;
    return deltaSign === "-" ? -raw : raw;
  }, [deltaHours, deltaMinutes, deltaSign]);

  const hasScheduleAction =
    scheduleEnabled &&
    (scheduleMode === "absolute"
      ? Boolean(anchorFecha && anchorHora) &&
        (anchorFecha !== String(earliest?.fecha || "").slice(0, 10) ||
          anchorHora !== sliceTime(earliest?.hora_inicio))
      : deltaMinutesTotal !== 0);

  const hasTagsAction =
    variant === "agenda" &&
    tagsEnabled &&
    (addPropuestaIds.length > 0 ||
      removePropuestaIds.length > 0 ||
      addGrupoIds.length > 0 ||
      removeGrupoIds.length > 0);

  const hasVehicleAction = variant === "transportes" && vehicleEnabled;

  const canApply = hasScheduleAction || hasTagsAction || hasVehicleAction;

  const nextVehicleLabel = useMemo(() => {
    if (!vehicleId) return "SIN SERVICIO";
    const gt = (vehiculos || []).find(
      (v) => String(v.id) === String(vehicleId),
    );
    return gt ? labelGiraTransporte(gt) : `Vehículo #${vehicleId}`;
  }, [vehicleId, vehiculos]);

  const vehiclePreviewRows = useMemo(() => {
    if (!hasVehicleAction) return [];
    return [...(events || [])]
      .filter((ev) => ev?.id != null && !ev.es_contexto_agenda)
      .filter((ev) => !(ev.es_ofrn && !ev.es_fimba))
      .sort((a, b) =>
        eventStartSortKey(a).localeCompare(eventStartSortKey(b)),
      )
      .map((ev) => ({
        id: ev.id,
        line: eventPreviewLine(ev),
        before: vehicleLabelsForEvent(ev, vehiculos).join(" · "),
        after: nextVehicleLabel,
      }));
  }, [events, vehiculos, hasVehicleAction, nextVehicleLabel]);

  const currentVehicleSummary = useMemo(() => {
    const set = new Set(vehiclePreviewRows.map((r) => r.before));
    return [...set];
  }, [vehiclePreviewRows]);

  const runApply = async () => {
    if (!canApply || saving) return;
    setSaving(true);
    setError(null);
    const summary = {
      schedule: null,
      tags: null,
      vehicle: null,
    };
    try {
      if (hasScheduleAction) {
        const { updated, skipped, error: err } =
          await bulkShiftFimbaEventosSchedule(events, {
            mode: scheduleMode === "absolute" ? "absolute" : "delta",
            newFecha: anchorFecha,
            newHoraInicio: anchorHora,
            deltaMinutes: deltaMinutesTotal,
          });
        if (err) throw err;
        summary.schedule = { updated, skipped };
      }
      if (hasTagsAction) {
        const { updated, skipped, error: err } = await bulkPatchFimbaEventosTags(
          events,
          {
            addPropuestaIds,
            removePropuestaIds,
            addGrupoIds,
            removeGrupoIds,
          },
        );
        if (err) throw err;
        summary.tags = { updated, skipped };
      }
      if (hasVehicleAction) {
        const { updated, skipped, error: err } =
          await bulkReassignFimbaEventosVehiculo(events, vehicleId || null);
        if (err) throw err;
        summary.vehicle = { updated, skipped };
      }
      setVehiclePreviewOpen(false);
      onApplied?.(summary);
    } catch (err) {
      setError(err?.message || "No se pudo aplicar la edición en lote");
      setSaving(false);
      // Keep preview open so the user can retry / cancel.
      throw err;
    }
    setSaving(false);
  };

  const openVehiclePreview = async () => {
    setError(null);
    setVehiclePreviewOpen(true);
    setBoardingPreviewLoading(true);
    setBoardingPreview(null);
    try {
      const ids = vehiclePreviewRows.map((r) => r.id);
      const { totals, error: err } = await findBoardingLinksForEvents(ids);
      if (err) {
        setBoardingPreview({ total: 0, error: err.message });
      } else {
        setBoardingPreview(totals);
      }
    } catch (err) {
      setBoardingPreview({
        total: 0,
        error: err?.message || "No se pudieron contar ↑/↓",
      });
    } finally {
      setBoardingPreviewLoading(false);
    }
  };

  const handleApplyClick = () => {
    if (!canApply || saving) return;
    if (hasVehicleAction) {
      openVehiclePreview();
      return;
    }
    runApply().catch(() => {});
  };

  const boardingNote = useMemo(() => {
    if (boardingPreviewLoading) return "Contando subidas/bajadas…";
    if (!boardingPreview) return null;
    if (boardingPreview.error) {
      return `No se pudo verificar ↑/↓: ${boardingPreview.error}`;
    }
    if (!boardingPreview.total) {
      return "Ninguna subida/bajada vinculada a estas paradas.";
    }
    const parts = [];
    if (boardingPreview.fimbaTotal) {
      parts.push(`${boardingPreview.fimbaTotal} FIMBA`);
    }
    if (boardingPreview.ofrnTotal) {
      parts.push(`${boardingPreview.ofrnTotal} Orquesta`);
    }
    const detail = parts.join(" · ") || `${boardingPreview.total} regla(s)`;
    if (!vehicleId) {
      return (
        `${detail} quedan intactas (siguen en el vehículo previo; ` +
        `SIN SERVICIO solo quita la asignación de flota).`
      );
    }
    return (
      `${detail} se migran al vehículo destino (mismos extremos ↑/↓; ` +
      `no se borran ni se recrean paradas).`
    );
  }, [boardingPreview, boardingPreviewLoading, vehicleId]);

  const modal = (
    <div
      className="fimba-modal-backdrop"
      onClick={saving || vehiclePreviewOpen ? undefined : onClose}
      role="presentation"
    >
      <div
        className="fimba-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fimba-bulk-edit-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 560, width: "min(560px, 96vw)" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: "0.75rem",
          }}
        >
          <h2
            id="fimba-bulk-edit-title"
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "1.05rem",
              color: "var(--fimba-deep)",
            }}
          >
            <IconEdit size={18} /> Editar en lote
          </h2>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            style={{ padding: "0.25rem 0.4rem" }}
          >
            <IconX size={16} />
          </button>
        </div>

        <p className="fimba-muted" style={{ margin: "0 0 0.85rem", fontSize: "0.8rem" }}>
          {events.length} evento{events.length === 1 ? "" : "s"} seleccionado
          {events.length === 1 ? "" : "s"}. Activá solo las secciones que querés
          aplicar.
        </p>

        {error && !vehiclePreviewOpen && (
          <div className="fimba-error" style={{ marginBottom: "0.75rem" }}>
            {error}
          </div>
        )}

        {/* —— Horarios —— */}
        <section
          className="fimba-bulk-section"
          style={{
            border: "1px solid var(--fimba-border, #e2e8f0)",
            borderRadius: 10,
            padding: "0.75rem 0.85rem",
            marginBottom: "0.75rem",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 700,
              fontSize: "0.88rem",
              color: "var(--fimba-deep)",
              cursor: "pointer",
              marginBottom: scheduleEnabled ? "0.65rem" : 0,
            }}
          >
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              disabled={saving}
            />
            <IconClock size={14} /> Desplazar horarios
          </label>

          {scheduleEnabled && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="fimba-bulk-sched-mode"
                  checked={scheduleMode === "absolute"}
                  onChange={() => setScheduleMode("absolute")}
                  disabled={saving}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong>Opción A — Anclar al primero.</strong> Nueva hora de
                  inicio del evento más temprano; el resto mantiene los
                  desfaces relativos.
                  {earliest && (
                    <span className="fimba-muted" style={{ display: "block", marginTop: 2 }}>
                      Primero: {String(earliest.fecha || "").slice(0, 10)}{" "}
                      {sliceTime(earliest.hora_inicio) || "—"}
                      {earliest.actividad
                        ? ` · ${String(earliest.actividad)
                            .replace(/<[^>]*>/g, " ")
                            .trim()
                            .slice(0, 40)}`
                        : ""}
                    </span>
                  )}
                </span>
              </label>
              {scheduleMode === "absolute" && (
                <div className="fimba-grid-2" style={{ paddingLeft: 24 }}>
                  <div className="fimba-field">
                    <label className="fimba-label">Nueva fecha</label>
                    <input
                      type="date"
                      className="fimba-input"
                      value={anchorFecha}
                      onChange={(e) => setAnchorFecha(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="fimba-field">
                    <label className="fimba-label">Nueva hora inicio</label>
                    <input
                      type="time"
                      className="fimba-input"
                      value={anchorHora}
                      onChange={(e) => setAnchorHora(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>
              )}

              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="fimba-bulk-sched-mode"
                  checked={scheduleMode === "delta"}
                  onChange={() => setScheduleMode("delta")}
                  disabled={saving}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong>Opción B — Desplazamiento fijo.</strong> Sumar o restar
                  las mismas horas/minutos a todos.
                </span>
              </label>
              {scheduleMode === "delta" && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "end",
                    paddingLeft: 24,
                  }}
                >
                  <div className="fimba-field" style={{ marginBottom: 0 }}>
                    <label className="fimba-label">Signo</label>
                    <select
                      className="fimba-select"
                      value={deltaSign}
                      onChange={(e) => setDeltaSign(e.target.value)}
                      disabled={saving}
                    >
                      <option value="+">+ Más tarde</option>
                      <option value="-">− Más temprano</option>
                    </select>
                  </div>
                  <div className="fimba-field" style={{ marginBottom: 0, width: 88 }}>
                    <label className="fimba-label">Horas</label>
                    <input
                      type="number"
                      min={0}
                      className="fimba-input"
                      value={deltaHours}
                      onChange={(e) => setDeltaHours(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="fimba-field" style={{ marginBottom: 0, width: 88 }}>
                    <label className="fimba-label">Minutos</label>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      className="fimba-input"
                      value={deltaMinutes}
                      onChange={(e) => setDeltaMinutes(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>
              )}
              <p className="fimba-muted" style={{ margin: 0, fontSize: "0.72rem" }}>
                En trayectos el fin se deriva del siguiente evento: solo se
                mueve la hora de comienzo. En agenda con fin guardado, también
                se desplaza la hora fin.
              </p>
            </div>
          )}
        </section>

        {/* —— Tags (Agenda) —— */}
        {variant === "agenda" && (
          <section
            style={{
              border: "1px solid var(--fimba-border, #e2e8f0)",
              borderRadius: 10,
              padding: "0.75rem 0.85rem",
              marginBottom: "0.75rem",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 700,
                fontSize: "0.88rem",
                color: "var(--fimba-deep)",
                cursor: "pointer",
                marginBottom: tagsEnabled ? "0.65rem" : 0,
              }}
            >
              <input
                type="checkbox"
                checked={tagsEnabled}
                onChange={(e) => setTagsEnabled(e.target.checked)}
                disabled={saving}
              />
              <IconTag size={14} /> Tags artistas / grupos OFRN
            </label>
            {tagsEnabled && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="fimba-field" style={{ marginBottom: 0 }}>
                  <label className="fimba-label">Agregar artistas FIMBA</label>
                  <MultiSelectDropdown
                    className="w-full"
                    label="Artistas"
                    placeholder="Ninguno"
                    options={propuestaOptions}
                    value={addPropuestaIds}
                    onChange={setAddPropuestaIds}
                    compact
                    summaryMode="names"
                    summaryMaxNames={2}
                  />
                </div>
                <div className="fimba-field" style={{ marginBottom: 0 }}>
                  <label className="fimba-label">Quitar artistas FIMBA</label>
                  <MultiSelectDropdown
                    className="w-full"
                    label="Artistas"
                    placeholder="Ninguno"
                    options={propuestaOptions}
                    value={removePropuestaIds}
                    onChange={setRemovePropuestaIds}
                    compact
                    summaryMode="names"
                    summaryMaxNames={2}
                  />
                </div>
                <div className="fimba-field" style={{ marginBottom: 0 }}>
                  <label className="fimba-label">Agregar grupos OFRN</label>
                  <MultiSelectDropdown
                    className="w-full"
                    label="Grupos"
                    placeholder="Ninguno"
                    options={grupoOptions}
                    value={addGrupoIds}
                    onChange={setAddGrupoIds}
                    compact
                    summaryMode="names"
                    summaryMaxNames={2}
                  />
                </div>
                <div className="fimba-field" style={{ marginBottom: 0 }}>
                  <label className="fimba-label">Quitar grupos OFRN</label>
                  <MultiSelectDropdown
                    className="w-full"
                    label="Grupos"
                    placeholder="Ninguno"
                    options={grupoOptions}
                    value={removeGrupoIds}
                    onChange={setRemoveGrupoIds}
                    compact
                    summaryMode="names"
                    summaryMaxNames={2}
                  />
                </div>
                <p className="fimba-muted" style={{ margin: 0, fontSize: "0.72rem" }}>
                  Artistas → tags de propuestas. Grupos → convocatoria OFRN
                  (grupos; o ninguna si quedan vacíos).
                </p>
              </div>
            )}
          </section>
        )}

        {/* —— Vehículo (Transportes) —— */}
        {variant === "transportes" && (
          <section
            style={{
              border: "1px solid var(--fimba-border, #e2e8f0)",
              borderRadius: 10,
              padding: "0.75rem 0.85rem",
              marginBottom: "0.75rem",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 700,
                fontSize: "0.88rem",
                color: "var(--fimba-deep)",
                cursor: "pointer",
                marginBottom: vehicleEnabled ? "0.65rem" : 0,
              }}
            >
              <input
                type="checkbox"
                checked={vehicleEnabled}
                onChange={(e) => setVehicleEnabled(e.target.checked)}
                disabled={saving}
              />
              <IconBus size={14} /> Mudar a otro vehículo
            </label>
            {vehicleEnabled && (
              <div>
                <div className="fimba-field" style={{ marginBottom: 0 }}>
                  <label className="fimba-label">Vehículo destino</label>
                  <select
                    className="fimba-select"
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">SIN SERVICIO</option>
                    {(vehiculos || []).map((gt) => (
                      <option key={gt.id} value={String(gt.id)}>
                        {labelGiraTransporte(gt)}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="fimba-muted" style={{ margin: "0.45rem 0 0", fontSize: "0.72rem" }}>
                  Reasigna la flota FIMBA del evento y migra ↑/↓ al mismo
                  vehículo (conserva plazas técnicas y reglas). Omite paradas
                  pure-OFRN y filas de contexto. Pedirá vista previa antes de
                  aplicar.
                </p>
              </div>
            )}
          </section>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: "0.5rem",
          }}
        >
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="fimba-btn fimba-btn-primary"
            onClick={handleApplyClick}
            disabled={!canApply || saving}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {saving ? (
              <>
                <IconLoader size={14} className="animate-spin" /> Aplicando…
              </>
            ) : hasVehicleAction ? (
              <>
                <IconBus size={14} /> Revisar y aplicar
              </>
            ) : (
              <>
                <IconCheck size={14} /> Aplicar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const previewChildren = (
    <div className="mt-3 space-y-3 text-sm text-slate-600">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="font-semibold text-slate-800">
          {vehiclePreviewRows.length} parada
          {vehiclePreviewRows.length === 1 ? "" : "s"} a mudar
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-medium text-slate-700">
            {currentVehicleSummary.join(" · ") || "—"}
          </span>
          <IconArrowRight size={12} className="text-slate-400 shrink-0" />
          <span className="font-bold text-indigo-700">{nextVehicleLabel}</span>
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 gap-y-0 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-slate-500 sticky top-0">
          <span>Antes</span>
          <span />
          <span>Después</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {vehiclePreviewRows.slice(0, 40).map((row) => (
            <li key={row.id} className="px-2 py-1.5">
              <div className="text-[0.7rem] text-slate-500 mb-0.5 truncate" title={row.line}>
                {row.line}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 items-center text-xs">
                <span className="truncate text-slate-700" title={row.before}>
                  {row.before}
                </span>
                <IconArrowRight size={12} className="text-slate-400" />
                <span className="truncate font-semibold text-indigo-700" title={row.after}>
                  {row.after}
                </span>
              </div>
            </li>
          ))}
        </ul>
        {vehiclePreviewRows.length > 40 && (
          <p className="px-2 py-1.5 text-[0.7rem] text-slate-500 border-t border-slate-100">
            …y {vehiclePreviewRows.length - 40} más
          </p>
        )}
      </div>

      {boardingNote && (
        <p className="text-xs leading-relaxed text-slate-500 m-0">
          {boardingPreviewLoading ? (
            <span className="inline-flex items-center gap-1.5">
              <IconLoader size={12} className="animate-spin" /> {boardingNote}
            </span>
          ) : (
            boardingNote
          )}
        </p>
      )}
    </div>
  );

  return (
    <>
      {createPortal(modal, document.body)}
      <ConfirmDialog
        isOpen={vehiclePreviewOpen}
        onClose={() => {
          if (saving) return;
          setVehiclePreviewOpen(false);
          setError(null);
        }}
        onConfirm={runApply}
        title="Confirmar mudanza de vehículo"
        message={`Se reasignarán ${vehiclePreviewRows.length} parada${
          vehiclePreviewRows.length === 1 ? "" : "s"
        } al vehículo destino. Las subidas/bajadas se conservan.`}
        confirmText="Confirmar mudanza"
        cancelText="Volver"
        confirmLoading={saving}
        confirmDisabled={boardingPreviewLoading || vehiclePreviewRows.length === 0}
        loadingText="Aplicando mudanza…"
        errorMessage={vehiclePreviewOpen ? error : null}
        overlayClassName="z-[110]"
      >
        {previewChildren}
      </ConfirmDialog>
    </>
  );
}
