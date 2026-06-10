import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  IconPlus,
  IconTrash,
  IconScissors,
  IconLoader,
  IconX,
} from "../../components/ui/Icons";
import LocationMultiSelect from "../../components/filters/LocationMultiSelect";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import { useGiraSegmentos } from "../../hooks/useGiraSegmentos";
import {
  addCorte,
  removeCorte,
  updateCortePosition,
  updateCorteHotelTransition,
  updateSegmentLocalidades,
} from "../../services/giraSegmentosService";
import { buildSegmentSpecs, formatIsoDateDDMM } from "../../utils/giraTramos";

function sliceTime(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
}

function segmentRangeHint(spec) {
  if (!spec) return null;
  const desde = formatIsoDateDDMM(spec.fecha_desde);
  const hasta = formatIsoDateDDMM(spec.fecha_hasta);
  if (!desde && !hasta) return null;
  return `${desde} – ${hasta}`;
}

function RowDivider() {
  return (
    <div
      className="w-px self-stretch min-h-[3.5rem] bg-slate-200 shrink-0"
      aria-hidden
    />
  );
}

function FieldGroup({
  label,
  labelClassName = "text-indigo-900",
  children,
  className = "",
}) {
  return (
    <div className={`flex flex-col gap-1 shrink-0 ${className}`}>
      <div
        className={`text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${labelClassName}`}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function MiniField({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 shrink-0">
      <span className="text-[9px] font-semibold text-slate-400 uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function LocalidadChips({
  locIds,
  locationsList,
  onRemove,
  disabled,
  onChange,
  inline = false,
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 min-h-[32px] ${
        inline ? "min-w-[10rem]" : ""
      }`}
    >
      {[...locIds].map((locId) => {
        const name = locationsList.find(
          (l) => Number(l.id) === Number(locId),
        )?.localidad;
        if (!name) return null;
        return (
          <span
            key={locId}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-white text-indigo-800 text-[10px] font-semibold border border-indigo-200 shadow-sm"
          >
            {name}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(locId)}
              className="p-0.5 rounded-full text-indigo-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40"
              title="Quitar localidad"
            >
              <IconX size={10} />
            </button>
          </span>
        );
      })}
      {locIds.size === 0 && (
        <span className="text-[10px] text-slate-400 italic px-1">
          Sin localidades
        </span>
      )}
      <div
        className={
          inline
            ? "shrink-0 min-w-[140px]"
            : "w-full sm:w-auto sm:min-w-[180px] sm:max-w-[240px] sm:ml-auto"
        }
      >
        <LocationMultiSelect
          locations={locationsList}
          selectedIds={locIds}
          onChange={onChange}
          showLabel={false}
          buttonClassName="h-8 text-xs border-indigo-200"
        />
      </div>
    </div>
  );
}

function LocalidadRow({
  index,
  segmentRow,
  spec,
  locationsList,
  locIds,
  onChange,
  disabled,
}) {
  const range = segmentRangeHint(spec);

  const removeChip = (locId) => {
    const next = new Set(locIds);
    next.delete(locId);
    onChange(next);
  };

  return (
    <div className="relative pl-8">
      <span
        className="absolute left-0 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white shadow-sm"
        aria-hidden
      >
        {index}
      </span>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <FieldGroup
          label={`Localía ${index}${range ? ` (${range})` : ""}`}
          className="min-w-[12rem]"
        >
          <LocalidadChips
            locIds={locIds}
            locationsList={locationsList}
            onRemove={removeChip}
            disabled={disabled}
            onChange={onChange}
            inline
          />
        </FieldGroup>
      </div>
    </div>
  );
}

function CorteDateTimeFields({
  fecha,
  hora,
  onFechaChange,
  onHoraChange,
  disabled = false,
}) {
  return (
    <div className="flex items-end gap-1.5">
      <MiniField label="Fecha">
        <DateInput
          value={fecha}
          showDayName={false}
          disabled={disabled}
          className="bg-white h-9 text-xs min-w-[7.5rem]"
          onChange={onFechaChange}
        />
      </MiniField>
      <MiniField label="Hora">
        <TimeInput
          value={hora}
          disabled={disabled}
          className="bg-white h-9 text-xs w-20"
          onChange={onHoraChange}
        />
      </MiniField>
    </div>
  );
}

function HotelTransitionFields({ corte, onHotelChange, disabled }) {
  return (
    <div className="flex items-end gap-1.5">
      <MiniField label="Out · Fecha">
        <DateInput
          value={corte.fecha_checkout || corte.fecha || ""}
          showDayName={false}
          className="bg-white h-9 text-xs min-w-[7.5rem]"
          disabled={disabled}
          onChange={(val) => onHotelChange(corte, { fecha_checkout: val })}
        />
      </MiniField>
      <MiniField label="Out · Hora">
        <TimeInput
          value={sliceTime(corte.hora_checkout) || "10:00"}
          className="bg-white h-9 text-xs w-20"
          disabled={disabled}
          onChange={(val) => onHotelChange(corte, { hora_checkout: val })}
        />
      </MiniField>
      <MiniField label="In · Fecha">
        <DateInput
          value={corte.fecha_checkin || corte.fecha || ""}
          showDayName={false}
          className="bg-white h-9 text-xs min-w-[7.5rem]"
          disabled={disabled}
          onChange={(val) => onHotelChange(corte, { fecha_checkin: val })}
        />
      </MiniField>
      <MiniField label="In · Hora">
        <TimeInput
          value={sliceTime(corte.hora_checkin) || "14:00"}
          className="bg-white h-9 text-xs w-20"
          disabled={disabled}
          onChange={(val) => onHotelChange(corte, { hora_checkin: val })}
        />
      </MiniField>
    </div>
  );
}

function LocalidadConCorteRow({
  index,
  segmentRow,
  spec,
  corte,
  locationsList,
  locIds,
  onChange,
  onCorteDateChange,
  onCorteHotelChange,
  onRemoveCorte,
  actionsDisabled,
}) {
  const range = segmentRangeHint(spec);

  const removeChip = (locId) => {
    const next = new Set(locIds);
    next.delete(locId);
    onChange(next);
  };

  return (
    <div className="relative pl-8">
      <span
        className="absolute left-0 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white shadow-sm"
        aria-hidden
      >
        {index}
      </span>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-nowrap items-end gap-3 overflow-x-auto">
          <FieldGroup
            label={`Localía ${index}${range ? ` (${range})` : ""}`}
            className="min-w-[12rem] flex-1"
          >
            <LocalidadChips
              locIds={locIds}
              locationsList={locationsList}
              onRemove={removeChip}
              disabled={actionsDisabled}
              onChange={onChange}
              inline
            />
          </FieldGroup>

          <RowDivider />

          <FieldGroup label="Inicio de Nueva Localía" labelClassName="text-indigo-800">
            <CorteDateTimeFields
              fecha={corte.fecha || ""}
              hora={sliceTime(corte.hora) || "12:00"}
              onFechaChange={(val) =>
                onCorteDateChange(corte, val, sliceTime(corte.hora) || "12:00")
              }
              onHoraChange={(val) =>
                onCorteDateChange(corte, corte.fecha, val)
              }
            />
          </FieldGroup>

          <RowDivider />

          <FieldGroup
            label="Check-out y Check-in intermedios"
            labelClassName="text-amber-800"
          >
            <HotelTransitionFields
              corte={corte}
              onHotelChange={onCorteHotelChange}
            />
          </FieldGroup>

          <button
            type="button"
            disabled={actionsDisabled}
            onClick={() => onRemoveCorte(corte.id)}
            className="h-9 w-9 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 disabled:opacity-40 shrink-0"
            title="Eliminar corte y unir localías"
          >
            <IconTrash size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCorteRow({
  label,
  fecha,
  hora,
  onFechaChange,
  onHoraChange,
  onAdd,
  disabled,
  compact,
  inline,
}) {
  const inner = (
    <div
      className={`flex flex-nowrap items-end gap-3 ${
        inline ? "" : "rounded-lg border border-slate-200 bg-white px-3 py-2"
      }`}
    >
      <FieldGroup
        label={
          <span className="inline-flex items-center gap-1">
            <IconScissors size={12} className="text-indigo-500" />
            {label}
          </span>
        }
        labelClassName="text-indigo-800"
      >
        <CorteDateTimeFields
          fecha={fecha}
          hora={hora}
          disabled={disabled}
          onFechaChange={onFechaChange}
          onHoraChange={onHoraChange}
        />
      </FieldGroup>
      <button
        type="button"
        disabled={disabled}
        onClick={onAdd}
        className="h-9 px-3 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-1 shrink-0"
      >
        <IconPlus size={14} />
        Agregar localía
      </button>
    </div>
  );

  if (inline) return inner;

  return (
    <div className={`relative ${compact ? "pl-8" : "pl-0"} py-1`}>{inner}</div>
  );
}

export default function GiraTramosEditor({
  supabase,
  giraId,
  formData,
  locationsList = [],
  setSelectedLocations,
  onRefresh,
  onDirty,
  saveFlushRef,
  embedded = false,
}) {
  const gira = { id: giraId, ...formData };
  const {
    cortes,
    segmentRows,
    cortesCount,
    loading,
    refreshSegmentos,
  } = useGiraSegmentos(supabase, gira);

  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingCountRef = useRef(0);
  const [newCorteFecha, setNewCorteFecha] = useState("");
  const [newCorteHora, setNewCorteHora] = useState("12:00");

  const beginSaving = useCallback(() => {
    savingCountRef.current += 1;
    setSaving(true);
  }, []);

  const endSaving = useCallback(() => {
    savingCountRef.current = Math.max(0, savingCountRef.current - 1);
    if (savingCountRef.current === 0) setSaving(false);
  }, []);

  useEffect(
    () => () => {
      savingCountRef.current = 0;
    },
    [],
  );

  const specs = buildSegmentSpecs(gira, cortes);

  const reloadUnion = useCallback(async () => {
    const { data } = await supabase
      .from("giras_localidades")
      .select("id_localidad")
      .eq("id_gira", giraId);
    setSelectedLocations?.(
      new Set((data || []).map((r) => Number(r.id_localidad))),
    );
    onRefresh?.();
  }, [supabase, giraId, setSelectedLocations, onRefresh]);

  const defaultCorteFecha = () => {
    if (!formData.fecha_desde || !formData.fecha_hasta) return "";
    const s = new Date(`${formData.fecha_desde}T12:00:00`);
    const e = new Date(`${formData.fecha_hasta}T12:00:00`);
    return new Date((s.getTime() + e.getTime()) / 2).toISOString().slice(0, 10);
  };

  const handleAddCorte = async () => {
    const fecha = newCorteFecha || defaultCorteFecha();
    if (!fecha) return alert("Indicá la fecha del corte.");
    setBusy(true);
    try {
      await addCorte(supabase, giraId, {
        fecha,
        hora: newCorteHora,
      });
      await refreshSegmentos();
      await reloadUnion();
      setNewCorteFecha("");
    } catch (e) {
      console.error(e);
      alert(e?.message || "Error al agregar corte.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveCorte = async (corteId) => {
    if (!confirm("¿Eliminar este corte? Se unirán las localías adyacentes."))
      return;
    setBusy(true);
    try {
      await removeCorte(supabase, corteId, giraId);
      await refreshSegmentos();
      await reloadUnion();
    } catch (e) {
      console.error(e);
      alert(e?.message || "Error al eliminar corte.");
    } finally {
      setBusy(false);
    }
  };

  const handleSegmentLocs = async (segmentRow, newSet) => {
    if (!segmentRow?.id) return;
    setBusy(true);
    try {
      await updateSegmentLocalidades(
        supabase,
        segmentRow.id,
        giraId,
        [...newSet],
      );
      await refreshSegmentos();
      await reloadUnion();
    } catch (e) {
      console.error(e);
      alert(e?.message || "Error al guardar localía del tramo.");
    } finally {
      setBusy(false);
    }
  };

  const persistCorteDateChange = useCallback(
    async (corte, fecha, hora) => {
      beginSaving();
      try {
        await updateCortePosition(supabase, corte.id, giraId, { fecha, hora });
        await refreshSegmentos();
        onDirty?.();
      } catch (e) {
        console.error(e);
      } finally {
        endSaving();
      }
    },
    [supabase, giraId, refreshSegmentos, onDirty, beginSaving, endSaving],
  );

  const persistCorteHotelChange = useCallback(
    async (corte, fields) => {
      beginSaving();
      try {
        await updateCorteHotelTransition(supabase, corte.id, fields);
        await refreshSegmentos();
        onDirty?.();
      } catch (e) {
        console.error(e);
        alert(e?.message || "Error al guardar check-out/check-in intermedios.");
      } finally {
        endSaving();
      }
    },
    [supabase, refreshSegmentos, onDirty, beginSaving, endSaving],
  );

  const pendingDateRef = useRef(null);
  const pendingHotelRef = useRef(null);
  const dateTimerRef = useRef(null);
  const hotelTimerRef = useRef(null);

  const flushPendingSaves = useCallback(async () => {
    const jobs = [];

    if (dateTimerRef.current) {
      clearTimeout(dateTimerRef.current);
      dateTimerRef.current = null;
    }
    if (pendingDateRef.current) {
      const p = pendingDateRef.current;
      pendingDateRef.current = null;
      jobs.push(persistCorteDateChange(p.corte, p.fecha, p.hora));
    }

    if (hotelTimerRef.current) {
      clearTimeout(hotelTimerRef.current);
      hotelTimerRef.current = null;
    }
    if (pendingHotelRef.current) {
      const p = pendingHotelRef.current;
      pendingHotelRef.current = null;
      jobs.push(persistCorteHotelChange(p.corte, p.fields));
    }

    if (jobs.length) await Promise.all(jobs);
  }, [persistCorteDateChange, persistCorteHotelChange]);

  useEffect(() => {
    if (saveFlushRef) saveFlushRef.current = flushPendingSaves;
  }, [saveFlushRef, flushPendingSaves]);

  const handleCorteDateChange = useCallback(
    (corte, fecha, hora) => {
      pendingDateRef.current = { corte, fecha, hora };
      if (dateTimerRef.current) clearTimeout(dateTimerRef.current);
      dateTimerRef.current = setTimeout(() => {
        dateTimerRef.current = null;
        const p = pendingDateRef.current;
        pendingDateRef.current = null;
        if (p) persistCorteDateChange(p.corte, p.fecha, p.hora);
      }, 450);
    },
    [persistCorteDateChange],
  );

  const handleCorteHotelChange = useCallback(
    (corte, fields) => {
      pendingHotelRef.current = { corte, fields };
      if (hotelTimerRef.current) clearTimeout(hotelTimerRef.current);
      hotelTimerRef.current = setTimeout(() => {
        hotelTimerRef.current = null;
        const p = pendingHotelRef.current;
        pendingHotelRef.current = null;
        if (p) persistCorteHotelChange(p.corte, p.fields);
      }, 450);
    },
    [persistCorteHotelChange],
  );

  if (loading && !segmentRows.length) {
    return (
      <div className="col-span-12 flex items-center gap-2 text-xs text-slate-400 py-2">
        <IconLoader size={14} className="animate-spin" /> Cargando tramos…
      </div>
    );
  }

  const rows = segmentRows.length ? segmentRows : [];
  const canEdit = Boolean(formData.fecha_desde && formData.fecha_hasta);

  return (
    <div
      className={
        embedded ? "" : "col-span-12 pt-2 border-t border-slate-100 mt-1"
      }
    >
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
          <IconScissors size={12} className="text-indigo-500" />
          Localías y cortes
          {cortesCount > 0 && (
            <span className="text-indigo-600 font-semibold normal-case">
              · {cortesCount} corte{cortesCount !== 1 ? "s" : ""}
            </span>
          )}
        </label>
        <div className="flex items-center gap-2 text-[9px] text-slate-400">
          <span className="font-semibold text-slate-500">
            {formatIsoDateDDMM(formData.fecha_desde)}
          </span>
          <span>→</span>
          <span className="font-semibold text-slate-500">
            {formatIsoDateDDMM(formData.fecha_hasta)}
          </span>
          {(busy || saving) && (
            <IconLoader size={14} className="animate-spin text-indigo-500" />
          )}
        </div>
      </div>

      <div className="relative space-y-2">
        {rows.length > 0 && (
          <div
            className="absolute left-[11px] top-4 bottom-4 w-px bg-indigo-100"
            aria-hidden
          />
        )}

        {rows.map((segmentRow, idx) => {
          const locIds = new Set(
            (segmentRow.giras_tramo_localidades || []).map((l) =>
              Number(l.id_localidad),
            ),
          );
          const isFirstWithoutCortes = cortesCount === 0 && idx === 0;
          const corteEntrada = idx > 0 ? cortes[idx - 1] : null;

          if (isFirstWithoutCortes) {
            const range = segmentRangeHint(specs[idx]);
            return (
              <div
                key={segmentRow.id ?? `seg-${idx}`}
                className="relative pl-8"
              >
                <span
                  className="absolute left-0 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white shadow-sm"
                  aria-hidden
                >
                  1
                </span>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-nowrap items-end gap-3 overflow-x-auto">
                    <FieldGroup
                      label={`Localía 1${range ? ` (${range})` : ""}`}
                      className="min-w-[12rem] flex-1"
                    >
                      <LocalidadChips
                        locIds={locIds}
                        locationsList={locationsList}
                        onRemove={(locId) => {
                          const next = new Set(locIds);
                          next.delete(locId);
                          handleSegmentLocs(segmentRow, next);
                        }}
                        disabled={busy}
                        onChange={(newSet) =>
                          handleSegmentLocs(segmentRow, newSet)
                        }
                        inline
                      />
                    </FieldGroup>
                    <RowDivider />
                    <AddCorteRow
                      label="Inicio de Nueva Localía"
                      fecha={newCorteFecha}
                      hora={newCorteHora}
                      onFechaChange={setNewCorteFecha}
                      onHoraChange={setNewCorteHora}
                      onAdd={handleAddCorte}
                      disabled={busy || !canEdit}
                      inline
                    />
                  </div>
                </div>
              </div>
            );
          }

          if (idx === 0) {
            return (
              <LocalidadRow
                key={segmentRow.id ?? `seg-${idx}`}
                index={1}
                segmentRow={segmentRow}
                spec={specs[idx]}
                locationsList={locationsList}
                locIds={locIds}
                onChange={(newSet) => handleSegmentLocs(segmentRow, newSet)}
                disabled={busy}
              />
            );
          }

          if (corteEntrada) {
            return (
              <LocalidadConCorteRow
                key={segmentRow.id ?? `seg-${idx}`}
                index={idx + 1}
                segmentRow={segmentRow}
                spec={specs[idx]}
                corte={corteEntrada}
                locationsList={locationsList}
                locIds={locIds}
                onChange={(newSet) => handleSegmentLocs(segmentRow, newSet)}
                onCorteDateChange={handleCorteDateChange}
                onCorteHotelChange={handleCorteHotelChange}
                onRemoveCorte={handleRemoveCorte}
                actionsDisabled={busy}
              />
            );
          }

          return (
            <LocalidadRow
              key={segmentRow.id ?? `seg-${idx}`}
              index={idx + 1}
              segmentRow={segmentRow}
              spec={specs[idx]}
              locationsList={locationsList}
              locIds={locIds}
              onChange={(newSet) => handleSegmentLocs(segmentRow, newSet)}
              disabled={busy}
            />
          );
        })}

        {cortesCount > 0 && (
          <AddCorteRow
            label="Inicio de Nueva Localía"
            fecha={newCorteFecha}
            hora={newCorteHora}
            onFechaChange={setNewCorteFecha}
            onHoraChange={setNewCorteHora}
            onAdd={handleAddCorte}
            disabled={busy || !canEdit}
            compact
          />
        )}

        {!rows.length && (
          <p className="text-xs text-slate-400 italic py-2">
            Guardá fechas de inicio y fin para configurar localías y cortes.
          </p>
        )}
      </div>
    </div>
  );
}
