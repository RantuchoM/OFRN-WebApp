import React, { useMemo, useState } from "react";
import { format, addDays, addHours, addMinutes } from "date-fns";
import { IconX } from "../../ui/Icons";

export default function TransportShiftScheduleModal({
  isOpen,
  onClose,
  onApply,
  transportName,
  events = [],
}) {
  const [shift, setShift] = useState({ days: 0, hours: 0, minutes: 0 });

  const sorted = useMemo(() => {
    return [...events].sort((a, b) =>
      (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
    );
  }, [events]);

  if (!isOpen) return null;

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const getPreview = (evt) => {
    if (!evt) return null;
    const current = new Date(`${evt.fecha}T${evt.hora_inicio || "00:00:00"}`);
    let next = addDays(current, shift.days);
    next = addHours(next, shift.hours);
    next = addMinutes(next, shift.minutes);
    return {
      old: `${format(current, "dd/MM")} ${format(current, "HH:mm")}`,
      new: `${format(next, "dd/MM")} ${format(next, "HH:mm")}`,
      label: evt.descripcion || "Sin descripción",
    };
  };

  const previewFirst = getPreview(first);
  const previewLast = getPreview(last);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">
            Mover Horarios: {transportName}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase text-center">
                Días
              </label>
              <input
                type="number"
                className="border rounded p-2 text-center font-bold text-sm"
                value={shift.days}
                onChange={(e) =>
                  setShift({ ...shift, days: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase text-center">
                Horas
              </label>
              <input
                type="number"
                className="border rounded p-2 text-center font-bold text-sm"
                value={shift.hours}
                onChange={(e) =>
                  setShift({ ...shift, hours: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase text-center">
                Minutos
              </label>
              <input
                type="number"
                className="border rounded p-2 text-center font-bold text-sm"
                value={shift.minutes}
                onChange={(e) =>
                  setShift({ ...shift, minutes: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          {(shift.days !== 0 || shift.hours !== 0 || shift.minutes !== 0) && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">
                Previsualización de impacto
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { title: "PRIMERA PARADA", data: previewFirst },
                  { title: "ÚLTIMA PARADA", data: previewLast },
                ].map(
                  (item, idx) =>
                    item.data && (
                      <div key={idx} className="flex flex-col">
                        <span className="text-[9px] font-bold text-indigo-500">
                          {item.title}
                        </span>
                        <p className="text-[10px] font-medium text-slate-600 truncate">
                          {item.data.label}
                        </p>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-400 line-through">
                            {item.data.old}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="font-bold text-indigo-600 bg-indigo-50 px-1 rounded">
                            {item.data.new}
                          </span>
                        </div>
                      </div>
                    ),
                )}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 bg-slate-50 border-t flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300"
          >
            Cancelar
          </button>
          <button
            onClick={() => onApply(shift)}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-md"
          >
            Aplicar a todos
          </button>
        </div>
      </div>
    </div>
  );
}
