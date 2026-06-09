import React, { useState } from "react";
import { IconHotel, IconLoader } from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import { updateCorteHotelTransition } from "../../services/giraSegmentosService";

function sliceTime(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
}

function TransitionFields({ corte, type, busyId, onSave }) {
  if (!corte) return null;

  const isCheckout = type === "checkout";
  const label = isCheckout ? "Check-out general" : "Check-in general";
  const fechaValue = isCheckout
    ? corte.fecha_checkout || corte.fecha || ""
    : corte.fecha_checkin || corte.fecha || "";
  const horaValue = isCheckout
    ? sliceTime(corte.hora_checkout) || "10:00"
    : sliceTime(corte.hora_checkin) || "14:00";

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-slate-400">{label}</span>
      <div className="w-[7.5rem] shrink-0">
        <DateInput
          value={fechaValue}
          showDayName={false}
          className="bg-white h-7 text-[10px] border border-amber-200 rounded"
          onChange={(val) =>
            onSave(corte.id, isCheckout ? { fecha_checkout: val } : { fecha_checkin: val })
          }
        />
      </div>
      <div className="w-12 shrink-0">
        <TimeInput
          value={horaValue}
          className="bg-white h-7 text-[10px] border border-amber-200 rounded"
          onChange={(val) =>
            onSave(corte.id, isCheckout ? { hora_checkout: val } : { hora_checkin: val })
          }
        />
      </div>
      {busyId === corte.id && (
        <IconLoader size={12} className="animate-spin text-amber-600 shrink-0" />
      )}
    </div>
  );
}

export default function GiraCorteTransitionsPanel({
  supabase,
  cortes = [],
  onUpdated,
  activeSegmentIdx = 0,
  segmentSpecs = [],
  multiTramoEnabled = false,
}) {
  const [busyId, setBusyId] = useState(null);

  if (!cortes.length) return null;

  const saveField = async (corteId, fields) => {
    setBusyId(corteId);
    try {
      await updateCorteHotelTransition(supabase, corteId, fields);
      onUpdated?.();
    } catch (e) {
      console.error(e);
      alert(e?.message || "Error al guardar transición.");
    } finally {
      setBusyId(null);
    }
  };

  const activeSpec =
    multiTramoEnabled && segmentSpecs.length > 0
      ? segmentSpecs[activeSegmentIdx] ?? segmentSpecs[0]
      : null;
  const corteEntrada = activeSpec?.corte_entrada ?? null;
  const corteSalida = activeSpec?.corte_salida ?? null;

  if (multiTramoEnabled && activeSpec && !corteEntrada && !corteSalida) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-amber-50/90 border-b border-amber-200 overflow-x-auto shrink-0 text-[10px]">
      <IconHotel size={12} className="text-amber-700 shrink-0" />
      <span className="font-bold text-amber-900 shrink-0 whitespace-nowrap">
        Transiciones
      </span>

      {multiTramoEnabled && activeSpec ? (
        <div className="flex items-center gap-1.5 shrink-0 border-l border-amber-200/80 pl-2">
          <span className="font-semibold text-slate-600 whitespace-nowrap">
            Tramo {activeSegmentIdx + 1}
          </span>
          <TransitionFields
            corte={corteEntrada}
            type="checkin"
            busyId={busyId}
            onSave={saveField}
          />
          <TransitionFields
            corte={corteSalida}
            type="checkout"
            busyId={busyId}
            onSave={saveField}
          />
        </div>
      ) : (
        cortes.map((corte, idx) => (
          <div
            key={corte.id}
            className="flex items-center gap-1.5 shrink-0 border-l border-amber-200/80 pl-2"
          >
            <span className="font-semibold text-slate-600 whitespace-nowrap">
              C{idx + 1}
            </span>
            <TransitionFields
              corte={corte}
              type="checkout"
              busyId={busyId}
              onSave={saveField}
            />
            <TransitionFields
              corte={corte}
              type="checkin"
              busyId={busyId}
              onSave={saveField}
            />
          </div>
        ))
      )}
    </div>
  );
}
