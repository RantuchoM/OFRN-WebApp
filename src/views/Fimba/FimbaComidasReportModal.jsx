import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconX,
  IconClipboard,
  IconPrinter,
  IconFileExcel,
  IconLoader,
  IconCheck,
} from "../../components/ui/Icons";
import {
  buildFimbaComidasPedidoText,
  buildFimbaComidasPrintModel,
  printFimbaComidas,
} from "../../utils/fimbaReports";
import { exportFimbaComidasExcel } from "../../utils/fimbaExport";
import FimbaMealsStayPanel from "./FimbaMealsStayPanel";

/**
 * Reporte de comidas FIMBA: resumen regímenes + detalle.
 * PDF vía impresión; texto clipboard; Excel reutiliza fimbaExport.
 * Gap: sin MealsReport por evento (FIMBA no tiene asistencia por comida).
 */
export default function FimbaComidasReportModal({
  open,
  onClose,
  hoteleriaRows = [],
  edicionNombre = "",
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const text = useMemo(
    () => buildFimbaComidasPedidoText(hoteleriaRows, { edicionNombre }),
    [hoteleriaRows, edicionNombre],
  );
  const model = useMemo(
    () => buildFimbaComidasPrintModel(hoteleriaRows),
    [hoteleriaRows],
  );

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("No se pudo copiar al portapapeles.");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800">Reporte de comidas</h3>
            <p className="text-xs text-slate-500">{edicionNombre}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!text}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-indigo-700 flex items-center gap-1.5 disabled:opacity-50"
            >
              {copied ? <IconCheck size={16} /> : <IconClipboard size={16} />}
              {copied ? "Copiado" : "Texto pedido"}
            </button>
            <button
              type="button"
              disabled={busy || (!(model.detalle || []).length && !(model.resumen || []).length)}
              onClick={async () => {
                setBusy(true);
                try {
                  await exportFimbaComidasExcel({
                    edicionNombre,
                    rows: hoteleriaRows,
                  });
                } finally {
                  setBusy(false);
                }
              }}
              className="bg-emerald-700 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-emerald-800 flex items-center gap-1.5 disabled:opacity-50"
            >
              {busy ? (
                <IconLoader size={16} className="animate-spin" />
              ) : (
                <IconFileExcel size={16} />
              )}
              Excel
            </button>
            <button
              type="button"
              onClick={() =>
                printFimbaComidas(hoteleriaRows, { edicionNombre })
              }
              className="bg-slate-800 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-slate-700 flex items-center gap-1.5"
            >
              <IconPrinter size={16} /> Exportar PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
            Cubiertos por día = PAX planificada × servicios según check-in/out
            (Early = almuerzo llegada; Late = almuerzo salida). El detalle lista
            solo excepciones (no regular), con fechas de estadía del artista.
          </p>

          <div className="mb-6">
            <FimbaMealsStayPanel hoteleriaRows={hoteleriaRows} mode="general" />
          </div>

          <h4 className="text-sm font-bold text-slate-800 mb-2">
            Resumen por régimen
          </h4>
          <table className="w-full text-xs border-collapse mb-6">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="p-2 border border-slate-200">Régimen</th>
                <th className="p-2 border border-slate-200">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {(model.resumen || []).map((r, i) => (
                <tr key={i}>
                  <td className="p-2 border border-slate-200">{r.regimen}</td>
                  <td className="p-2 border border-slate-200">{r.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 className="text-sm font-bold text-slate-800 mb-2">
            Excepciones (no regular)
          </h4>
          {(model.detalle || []).length === 0 ? (
            <p className="text-xs text-slate-500 mb-2">
              No hay nominados con régimen distinto de regular.
            </p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="p-2 border border-slate-200">Artista</th>
                  <th className="p-2 border border-slate-200">Apellido</th>
                  <th className="p-2 border border-slate-200">Nombre</th>
                  <th className="p-2 border border-slate-200">Desde</th>
                  <th className="p-2 border border-slate-200">Hasta</th>
                  <th className="p-2 border border-slate-200">Alimentación</th>
                  <th className="p-2 border border-slate-200">Nota</th>
                </tr>
              </thead>
              <tbody>
                {(model.detalle || []).map((d, i) => (
                  <tr key={i}>
                    <td className="p-2 border border-slate-200">{d.artista}</td>
                    <td className="p-2 border border-slate-200">{d.apellido}</td>
                    <td className="p-2 border border-slate-200">{d.nombre}</td>
                    <td className="p-2 border border-slate-200">
                      {d.checkin_label || "—"}
                    </td>
                    <td className="p-2 border border-slate-200">
                      {d.checkout_label || "—"}
                    </td>
                    <td className="p-2 border border-slate-200">{d.regimen}</td>
                    <td className="p-2 border border-slate-200">{d.nota}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
