import React from "react";
import { IconLoader } from "../ui/Icons";

/**
 * Overlay a pantalla completa del modal durante exportación.
 * Bloquea interacción y advierte no cerrar la pestaña.
 */
export default function ParticellaExportBusyOverlay({
  current = 0,
  total = 0,
  label = "",
  title = "Exportando particellas…",
  showWarning = true,
}) {
  const pct =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div
      className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-2xl">
        <div className="mb-3 flex items-center gap-2.5">
          <IconLoader className="shrink-0 animate-spin text-indigo-600" size={20} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">{title}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
              {label || "Procesando"}
              {total > 0 ? (
                <span className="tabular-nums text-slate-400">
                  {" "}
                  · {current}/{total}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="mb-1.5 flex justify-between text-[11px]">
          <span className="font-medium text-slate-600">Progreso</span>
          <span className="tabular-nums text-slate-500">{pct}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        {showWarning ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] font-semibold leading-snug text-amber-900">
            No cierres esta pestaña ni este modal hasta que termine.
          </p>
        ) : null}
      </div>
    </div>
  );
}
