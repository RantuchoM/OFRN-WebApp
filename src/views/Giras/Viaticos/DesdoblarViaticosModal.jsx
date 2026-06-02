import React, { useEffect, useMemo, useState } from "react";
import { IconX, IconScissors, IconMapPin } from "../../../components/ui/Icons";
import { calculateDaysDiff } from "../../../utils/viaticosDiasComputables";
import DiasComputablesHelp from "./DiasComputablesHelp";
import {
  buildTramosFromParadas,
  formatParadaLabel,
  getParadasParticipacionIntegrante,
  groupParadasByRecorrido,
  scheduleFromParadaRange,
} from "../../../utils/viaticosParadasIntegrante";

/** Máximo de cortes entre paradas (= cantidad máxima de tramos − 1). */
const MAX_CORTES = 2;

export default function DesdoblarViaticosModal({
  isOpen,
  onClose,
  row,
  summary,
  allEvents,
  onConfirm,
  saving = false,
}) {
  const [splitAfter, setSplitAfter] = useState([]);

  const paradas = useMemo(() => {
    if (!row?.id_integrante) return [];
    return getParadasParticipacionIntegrante(
      row.id_integrante,
      summary,
      allEvents,
    );
  }, [row, summary, allEvents]);

  const paradasByRecorrido = useMemo(
    () => groupParadasByRecorrido(paradas),
    [paradas],
  );

  const recorridosResumen = useMemo(
    () => paradasByRecorrido.map((g) => g.recorridoNombre),
    [paradasByRecorrido],
  );

  const maxCortes = Math.min(MAX_CORTES, Math.max(0, paradas.length - 2));

  useEffect(() => {
    if (isOpen) setSplitAfter([]);
  }, [isOpen, row?.id]);

  const tramosPreview = useMemo(() => {
    if (paradas.length < 2 || splitAfter.length === 0) return [];
    return buildTramosFromParadas(paradas, splitAfter).map((t) => {
      const sched = scheduleFromParadaRange(
        allEvents,
        t.id_evento_parada_inicio,
        t.id_evento_parada_fin,
      );
      const dias = sched
        ? calculateDaysDiff(
            sched.fecha_salida,
            sched.hora_salida,
            sched.fecha_llegada,
            sched.hora_llegada,
          )
        : 0;
      return { ...t, sched, dias };
    });
  }, [paradas, splitAfter, allEvents]);

  if (!isOpen || !row) return null;

  const toggleCutAfter = (index) => {
    setSplitAfter((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      if (prev.length >= maxCortes) return prev;
      return [...prev, index].sort((a, b) => a - b);
    });
  };

  const canConfirm = tramosPreview.length >= 2 && !saving;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(row, tramosPreview);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <IconScissors size={18} className="text-indigo-600" />
            Desdoblar viáticos — {row.apellido}, {row.nombre}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {paradas.length < 2 ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              No hay al menos dos paradas entre la subida y bajada de esta persona en
              logística. Definí paradas en transporte o asigná subida/bajada antes de
              desdoblar.
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-600">
                Usá <strong>Cortar después</strong> entre paradas donde quieras dividir
                el viático. Cada tramo genera una fila con sus propias fechas y días.
                {maxCortes > 0 && (
                  <span className="text-slate-500">
                    {" "}
                    (hasta {maxCortes + 1} tramos)
                  </span>
                )}
              </p>

              {recorridosResumen.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                    Recorrido{recorridosResumen.length > 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recorridosResumen.map((nombre) => (
                      <span
                        key={nombre}
                        className="text-xs font-semibold text-indigo-800 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full"
                      >
                        {nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <ul className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                {paradasByRecorrido.map((group) => (
                  <li key={group.recorridoNombre}>
                    <div className="px-3 py-2 bg-slate-100 border-b border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-800">
                        {group.recorridoNombre}
                      </span>
                    </div>
                    {group.paradas.map((evt) => {
                      const idx = paradas.findIndex(
                        (p) => String(p.id) === String(evt.id),
                      );
                      const isCut = splitAfter.includes(idx);
                      const cutsFull =
                        splitAfter.length >= maxCortes && maxCortes > 0;
                      return (
                        <div key={evt.id}>
                          <div className="flex items-center gap-2 px-3 py-2">
                            <IconMapPin
                              size={14}
                              className="text-slate-400 shrink-0"
                            />
                            <span className="flex-1 text-slate-700">
                              {formatParadaLabel(evt)}
                            </span>
                          </div>
                          {idx >= 0 && idx < paradas.length - 1 && (
                            <div className="px-3 pb-2">
                              <button
                                type="button"
                                onClick={() => toggleCutAfter(idx)}
                                disabled={!isCut && cutsFull}
                                className={`w-full flex items-center justify-center gap-1 py-1 rounded border border-dashed text-[10px] font-bold transition-colors ${
                                  isCut
                                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                                    : cutsFull
                                      ? "border-slate-100 text-slate-300 cursor-not-allowed"
                                      : "border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600"
                                }`}
                              >
                                <IconScissors size={12} />
                                {isCut ? "Corte aquí" : "Cortar después"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </li>
                ))}
              </ul>

              {splitAfter.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-1">
                  Marcá al menos un corte para ver la vista previa.
                </p>
              )}

              {tramosPreview.length >= 2 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    Vista previa — {tramosPreview.length} tramos
                  </p>
                  {tramosPreview.map((t) => (
                    <div
                      key={t.tramo_orden}
                      className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-xs"
                    >
                      <span className="font-bold text-indigo-800">
                        {t.etiqueta_tramo}
                      </span>
                      {t.nombre_recorrido && (
                        <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">
                          Recorrido: {t.nombre_recorrido}
                        </div>
                      )}
                      <div className="text-slate-600 mt-1">
                        {formatParadaLabel(t.paradas[0])} →{" "}
                        {formatParadaLabel(t.paradas[t.paradas.length - 1])}
                      </div>
                      <div className="text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
                        <span>Días computables:</span>
                        <DiasComputablesHelp
                          dias={t.dias}
                          fechaSalida={t.sched?.fecha_salida}
                          horaSalida={t.sched?.hora_salida}
                          fechaLlegada={t.sched?.fecha_llegada}
                          horaLlegada={t.sched?.hora_llegada}
                          valueClassName="font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            title={
              !canConfirm
                ? "Marcá al menos un corte entre paradas"
                : undefined
            }
          >
            {saving
              ? "Guardando…"
              : canConfirm
                ? `Generar ${tramosPreview.length} filas`
                : "Generar filas"}
          </button>
        </div>
      </div>
    </div>
  );
}
