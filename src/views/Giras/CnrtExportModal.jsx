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
  title = "Exportar Logística", // Prop por defecto por si no se envía
}) {
  // 1. Ordenamos eventos cronológicamente para los selectores
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = (a.fecha || "") + (a.hora_inicio || "");
      const dateB = (b.fecha || "") + (b.hora_inicio || "");
      return dateA.localeCompare(dateB);
    });
  }, [events]);

  // 2. Estados locales (Solo rango de fechas)
  const [startId, setStartId] = useState(String(sortedEvents[0]?.id || ""));
  const [endId, setEndId] = useState(
    String(sortedEvents[sortedEvents.length - 1]?.id || ""),
  );
  const [exportFormat, setExportFormat] = useState("pdf");

  // 3. Formateador de etiquetas para los selectores
  const formatLabel = (evt) => {
    if (!evt) return "-";
    const hora = evt.hora_inicio?.slice(0, 5) || "--:--";
    const [y, m, d] = (evt.fecha || "2000-01-01").split("-");
    const fechaFormateada = `${d}/${m}`;

    const cleanText = (input) => {
      const raw = String(input || "").trim();
      if (!raw) return "";
      try {
        if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
          const doc = new DOMParser().parseFromString(raw, "text/html");
          return (doc.body?.textContent || "")
            .replace(/\u00a0/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        }
      } catch {
        // fall back
      }
      return raw.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    };

    const nota = cleanText(evt.descripcion);
    const locacion = evt.locaciones?.nombre || "";

    if (nota) {
      const notaCorta =
        nota.length > 30 ? nota.substring(0, 27) + "..." : nota;
      return `${notaCorta} - ${fechaFormateada} ${hora}HS (${locacion})`;
    }
    return `${locacion || "PARADA"} - ${fechaFormateada} ${hora}HS`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <IconFileText className="text-indigo-600" /> {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Info del Transporte */}
          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-sm text-indigo-800">
            <p className="font-bold">
              {transport.transportes?.nombre || "Transporte"}
            </p>
            <p className="text-xs opacity-75">{transport.detalle || ""}</p>
          </div>

          <div className="space-y-4">
            {/* Formato de exportación */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">
                Formato
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat("pdf")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    exportFormat === "pdf"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("excel")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    exportFormat === "excel"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Excel
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Por defecto: <b>PDF</b>
              </p>
            </div>

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

        {/* Acciones */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            // Ya no enviamos el tercer argumento, solo start y end
            onClick={() => onExport(startId, endId, exportFormat)}
            className="px-5 py-2 text-xs font-bold text-white rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95 bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700"
          >
            <IconDownload size={14} />
            Descargar {exportFormat === "pdf" ? "PDF" : "Excel"}
          </button>
        </div>
      </div>
    </div>
  );
}