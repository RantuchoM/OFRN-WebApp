import React, { useState, useMemo } from "react";
import {
  IconFileText,
  IconX,
  IconMapPin,
  IconArrowRight,
  IconDownload,
} from "../../components/ui/Icons";

export default function CnrtExportModal({
  transport,
  events,
  onClose,
  onExport,
}) {
  // Ordenamos eventos cronológicamente
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = (a.fecha || "") + (a.hora_inicio || "");
      const dateB = (b.fecha || "") + (b.hora_inicio || "");
      return dateA.localeCompare(dateB);
    });
  }, [events]);

  const [startId, setStartId] = useState(String(sortedEvents[0]?.id || ""));
  const [endId, setEndId] = useState(
    String(sortedEvents[sortedEvents.length - 1]?.id || ""),
  );

  /**
   * REVISIÓN DE LÓGICA DE ETIQUETA:
   * Priorizamos la DESCRIPCIÓN (Nota) para que aparezca al inicio.
   */
  const formatLabel = (evt) => {
    if (!evt) return "-";

    const hora = evt.hora_inicio?.slice(0, 5) || "--:--";
    const [y, m, d] = (evt.fecha || "2000-01-01").split("-");
    const fechaFormateada = `${d}/${m}`;

    // Extraemos la descripción (nota) o usamos el nombre de la locación como plan B
    const nota = evt.descripcion?.trim();
    const locName = evt.locaciones?.nombre || "";

    /**
     * ESTRATEGIA:
     * Si hay nota: "NOTA EN MAYÚSCULAS - 12/02 08:30hs"
     * Si no hay nota: "Nombre Locación - 12/02 08:30hs"
     */
    if (nota) {
      const notaCorta = nota.length > 35 ? nota.substring(0, 32) + "..." : nota;
      return `${notaCorta.toUpperCase()} - ${fechaFormateada} ${hora}HS`;
    }

    return `${locName || "PARADA"} - ${fechaFormateada} ${hora}HS`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <IconFileText className="text-indigo-600" /> Lista de Pasajeros
            (CNRT)
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-sm text-indigo-800">
            <p className="font-bold">
              {transport.transportes?.nombre || "Transporte"}
            </p>
            <p className="text-xs opacity-75">{transport.detalle || ""}</p>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Selecciona el tramo. Se incluirán los pasajeros que viajen en
            cualquier punto entre la <b>Salida</b> y la <b>Llegada</b>{" "}
            seleccionadas.
          </p>

          <div className="space-y-4">
            {/* SELECT DESDE */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">
                Desde (Salida)
              </label>
              <div className="relative">
                <select
                  className="w-full text-[12px] p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none pr-10 shadow-sm font-medium text-slate-700"
                  value={startId}
                  onChange={(e) => setStartId(e.target.value)}
                >
                  {sortedEvents.map((evt) => (
                    <option key={evt.id} value={String(evt.id)}>
                      {formatLabel(evt)}
                    </option>
                  ))}
                </select>
                <IconMapPin
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                  size={16}
                />
              </div>
            </div>

            <div className="flex justify-center">
              <div className="bg-slate-100 p-1 rounded-full text-slate-300">
                <IconArrowRight className="rotate-90" size={16} />
              </div>
            </div>

            {/* SELECT HASTA */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">
                Hasta (Llegada)
              </label>
              <div className="relative">
                <select
                  className="w-full text-[12px] p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none pr-10 shadow-sm font-medium text-slate-700"
                  value={endId}
                  onChange={(e) => setEndId(e.target.value)}
                >
                  {sortedEvents.map((evt) => (
                    <option key={evt.id} value={String(evt.id)}>
                      {formatLabel(evt)}
                    </option>
                  ))}
                </select>
                <IconMapPin
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                  size={16}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onExport(startId, endId)}
            className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95"
          >
            <IconDownload size={14} /> Generar Lista
          </button>
        </div>
      </div>
    </div>
  );
}
