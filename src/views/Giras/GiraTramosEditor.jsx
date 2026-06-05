import React, { useState, useCallback } from "react";
import {
  IconPlus,
  IconTrash,
  IconScissors,
  IconLoader,
  IconMapPin,
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
  updateSegmentLocalidades,
} from "../../services/giraSegmentosService";
import { buildSegmentSpecs, formatIsoDateDDMM } from "../../utils/giraTramos";

function segmentRangeHint(spec) {
  if (!spec) return null;
  const desde = formatIsoDateDDMM(spec.fecha_desde);
  const hasta = formatIsoDateDDMM(spec.fecha_hasta);
  if (!desde && !hasta) return null;
  return `${desde} – ${hasta}`;
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
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
          <IconMapPin size={13} className="text-indigo-500 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-900">
            Localía {index}
          </span>
          {range && (
            <span className="text-[9px] font-medium text-slate-400">
              ({range})
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
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
                  onClick={() => removeChip(locId)}
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
          <div className="w-full sm:w-auto sm:min-w-[180px] sm:max-w-[240px] sm:ml-auto">
            <LocationMultiSelect
              locations={locationsList}
              selectedIds={locIds}
              onChange={onChange}
              showLabel={false}
              buttonClassName="h-8 text-xs border-indigo-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CorteFields({ fecha, hora, onFechaChange, onHoraChange }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <DateInput
        value={fecha}
        showDayName={false}
        className="bg-white h-9 text-xs min-w-[7.5rem]"
        onChange={onFechaChange}
      />
      <TimeInput
        value={hora}
        className="bg-white h-9 text-xs w-20"
        onChange={onHoraChange}
      />
    </div>
  );
}

function CorteRow({ index, corte, onDateChange, onRemove, disabled }) {
  return (
    <div className="relative pl-8 py-1">
      <span
        className="absolute left-0.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-600 border border-slate-200"
        aria-hidden
      >
        <IconScissors size={11} />
      </span>
      <div className="flex flex-nowrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <span className="text-[10px] font-bold uppercase text-slate-700 shrink-0">
          Corte {index}
        </span>
        <CorteFields
          fecha={corte.fecha || ""}
          hora={String(corte.hora || "12:00").slice(0, 5)}
          onFechaChange={(val) =>
            onDateChange(corte, val, String(corte.hora || "").slice(0, 5))
          }
          onHoraChange={(val) => onDateChange(corte, corte.fecha, val)}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onRemove(corte.id)}
          className="h-9 w-9 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 disabled:opacity-40 shrink-0 ml-auto"
          title="Eliminar corte"
        >
          <IconTrash size={14} />
        </button>
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
      className={`flex flex-nowrap items-center gap-2 ${
        inline ? "" : "rounded-lg border border-slate-200 bg-white px-3 py-2"
      }`}
    >
      <span className="text-[10px] font-bold uppercase text-slate-600 shrink-0 flex items-center gap-1">
        <IconScissors size={12} className="text-slate-500" />
        {label}
      </span>
      <CorteFields
        fecha={fecha}
        hora={hora}
        onFechaChange={onFechaChange}
        onHoraChange={onHoraChange}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={onAdd}
        className="h-9 px-3 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-1 shrink-0"
      >
        <IconPlus size={14} />
        Agregar corte
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
  const [newCorteFecha, setNewCorteFecha] = useState("");
  const [newCorteHora, setNewCorteHora] = useState("12:00");

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
    if (!confirm("¿Eliminar este corte? Se unirán los tramos adyacentes."))
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

  const handleCorteDateChange = async (corte, fecha, hora) => {
    setBusy(true);
    try {
      await updateCortePosition(supabase, corte.id, giraId, { fecha, hora });
      await refreshSegmentos();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

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
          {busy && (
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
          const corte = cortes[idx] ?? null;
          const isFirstWithoutCortes = cortesCount === 0 && idx === 0;

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
                  <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                        <IconMapPin size={13} className="text-indigo-500 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-900">
                          Localía 1
                        </span>
                        {range && (
                          <span className="text-[9px] font-medium text-slate-400">
                            ({range})
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
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
                                disabled={busy}
                                onClick={() => {
                                  const next = new Set(locIds);
                                  next.delete(locId);
                                  handleSegmentLocs(segmentRow, next);
                                }}
                                className="p-0.5 rounded-full text-indigo-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40"
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
                        <div className="w-full sm:w-auto sm:min-w-[160px] sm:max-w-[220px]">
                          <LocationMultiSelect
                            locations={locationsList}
                            selectedIds={locIds}
                            onChange={(newSet) =>
                              handleSegmentLocs(segmentRow, newSet)
                            }
                            showLabel={false}
                            buttonClassName="h-8 text-xs border-indigo-200"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 w-full lg:w-auto lg:min-w-[320px] pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-indigo-100 lg:pl-3">
                      <AddCorteRow
                        label="Primer corte"
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
              </div>
            );
          }

          return (
            <React.Fragment key={segmentRow.id ?? `seg-${idx}`}>
              <LocalidadRow
                index={idx + 1}
                segmentRow={segmentRow}
                spec={specs[idx]}
                locationsList={locationsList}
                locIds={locIds}
                onChange={(newSet) => handleSegmentLocs(segmentRow, newSet)}
                disabled={busy}
              />

              {corte && (
                <CorteRow
                  index={idx + 1}
                  corte={corte}
                  onDateChange={handleCorteDateChange}
                  onRemove={handleRemoveCorte}
                  disabled={busy}
                />
              )}
            </React.Fragment>
          );
        })}

        {cortesCount > 0 && (
          <AddCorteRow
            label="Nuevo corte"
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
