import React, { useState } from "react";
import { IconHotel, IconLoader } from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import { updateCorteHotelTransition } from "../../services/giraSegmentosService";

function sliceTime(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
}

export default function GiraCorteTransitionsPanel({
  supabase,
  cortes = [],
  onUpdated,
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

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-amber-50/90 border-b border-amber-200 overflow-x-auto shrink-0 text-[10px]">
      <IconHotel size={12} className="text-amber-700 shrink-0" />
      <span className="font-bold text-amber-900 shrink-0 whitespace-nowrap">
        Transiciones
      </span>
      {cortes.map((corte, idx) => (
        <div
          key={corte.id}
          className="flex items-center gap-1.5 shrink-0 border-l border-amber-200/80 pl-2"
        >
          <span className="font-semibold text-slate-600 whitespace-nowrap">
            C{idx + 1}
          </span>
          <span className="text-slate-400">Out</span>
          <div className="w-[7.5rem] shrink-0">
            <DateInput
              value={corte.fecha_checkout || corte.fecha || ""}
              showDayName={false}
              className="bg-white h-7 text-[10px] border border-amber-200 rounded"
              onChange={(val) => saveField(corte.id, { fecha_checkout: val })}
            />
          </div>
          <div className="w-12 shrink-0">
            <TimeInput
              value={sliceTime(corte.hora_checkout) || "10:00"}
              className="bg-white h-7 text-[10px] border border-amber-200 rounded"
              onChange={(val) => saveField(corte.id, { hora_checkout: val })}
            />
          </div>
          <span className="text-slate-400">In</span>
          <div className="w-[7.5rem] shrink-0">
            <DateInput
              value={corte.fecha_checkin || corte.fecha || ""}
              showDayName={false}
              className="bg-white h-7 text-[10px] border border-amber-200 rounded"
              onChange={(val) => saveField(corte.id, { fecha_checkin: val })}
            />
          </div>
          <div className="w-12 shrink-0">
            <TimeInput
              value={sliceTime(corte.hora_checkin) || "14:00"}
              className="bg-white h-7 text-[10px] border border-amber-200 rounded"
              onChange={(val) => saveField(corte.id, { hora_checkin: val })}
            />
          </div>
          {busyId === corte.id && (
            <IconLoader size={12} className="animate-spin text-amber-600 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}
