import React from "react";
import { IconDownload, IconList, IconX } from "../../ui/Icons";

export default function CombinedStopsExportModal({
  isOpen,
  transports = [],
  selectedTransportIds = [],
  exportFormat = "pdf",
  onClose,
  onToggleTransport,
  onExportFormatChange,
  onExport,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <IconList className="text-emerald-600" /> Paradas Combinadas
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
          >
            <IconX size={18} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          <p className="text-xs text-slate-500">
            Selecciona 2 o mas transportes para exportar una sola lista de paradas.
          </p>
          <div className="flex gap-2 pb-1">
            <button
              type="button"
              onClick={() => onExportFormatChange("pdf")}
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
              onClick={() => onExportFormatChange("excel")}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                exportFormat === "excel"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Excel
            </button>
          </div>
          {transports.map((t) => (
            <label
              key={t.id}
              className="flex items-center justify-between gap-2 p-2 rounded border border-slate-200 hover:bg-slate-50"
            >
              <span className="text-sm text-slate-700">
                {t.transportes?.nombre || "Transporte"}
                {t.detalle ? ` - ${t.detalle}` : ""}
              </span>
              <input
                type="checkbox"
                className="rounded border-slate-300 text-emerald-600"
                checked={selectedTransportIds.includes(t.id)}
                onChange={(e) => onToggleTransport(t.id, e.target.checked)}
              />
            </label>
          ))}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onExport}
            className="px-5 py-2 text-xs font-bold text-white rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95 bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700"
          >
            <IconDownload size={14} />
            Exportar {exportFormat === "pdf" ? "PDF" : "Excel"}
          </button>
        </div>
      </div>
    </div>
  );
}
