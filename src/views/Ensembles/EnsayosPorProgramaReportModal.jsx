import React from "react";
import { IconX } from "../../components/ui/Icons";
import EnsayosPorProgramaReport from "../Giras/EnsayosPorProgramaReport";

/**
 * Modal de Coordinación: filtros de tipo de programa + matriz ensayos.
 * Las columnas son los ensambles activos en el filtro de coordinación.
 */
export default function EnsayosPorProgramaReportModal({
  isOpen,
  onClose,
  supabase,
  activeEnsembles = [],
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ensayos-report-modal-title"
    >
      <div className="flex h-[min(92vh,900px)] w-full max-w-[96vw] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-0">
            <h2
              id="ensayos-report-modal-title"
              className="text-base font-bold text-slate-800 dark:text-slate-100"
            >
              Reporte de ensayos por programa
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Programas con convocados del ensamble · columnas = filtro actual
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeEnsembles.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500">
              Seleccioná al menos un ensamble en el filtro de coordinación para
              ver el reporte.
            </div>
          ) : (
            <EnsayosPorProgramaReport
              supabase={supabase}
              variant="coordination"
              lockedEnsembles={activeEnsembles}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}
