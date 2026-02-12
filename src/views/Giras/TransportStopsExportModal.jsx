import React, { useState, useMemo } from "react";
import { IconFileText, IconX, IconMapPin, IconArrowRight, IconDownload } from "../../components/ui/Icons";

export default function TransportStopsExportModal({ transport, events, onClose, onExport }) {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = (a.fecha || "") + (a.hora_inicio || "");
      const dateB = (b.fecha || "") + (b.hora_inicio || "");
      return dateA.localeCompare(dateB);
    });
  }, [events]);

  const [startId, setStartId] = useState(String(sortedEvents[0]?.id || ""));
  const [endId, setEndId] = useState(String(sortedEvents[sortedEvents.length - 1]?.id || ""));

  const formatLabel = (evt) => {
    if (!evt) return "-";
    const hora = evt.hora_inicio?.slice(0, 5) || "--:--";
    const [y, m, d] = (evt.fecha || "2000-01-01").split("-");
    const nota = evt.descripcion?.trim() || "";
    const loc = evt.locaciones?.nombre || "Parada";
    return `${d}/${m} ${hora}HS - ${nota ? nota.toUpperCase() : loc}`;
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-indigo-600 text-white flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            <IconFileText size={20} /> Exportar Cronograma de Paradas
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
            <p className="font-bold text-slate-700">{transport?.detalle || transport?.transportes?.nombre}</p>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Listado Crudo de Paradas</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Desde</label>
              <select 
                className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={startId} 
                onChange={(e) => setStartId(e.target.value)}
              >
                {sortedEvents.map(evt => (
                  <option key={evt.id} value={String(evt.id)}>{formatLabel(evt)}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-center text-slate-300"><IconArrowRight className="rotate-90" /></div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Hasta</label>
              <select 
                className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                value={endId} 
                onChange={(e) => setEndId(e.target.value)}
              >
                {sortedEvents.map(evt => (
                  <option key={evt.id} value={String(evt.id)}>{formatLabel(evt)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500">Cancelar</button>
          <button 
            onClick={() => onExport(startId, endId)} 
            className="px-6 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <IconDownload size={14} /> Descargar Listado
          </button>
        </div>
      </div>
    </div>
  );
}