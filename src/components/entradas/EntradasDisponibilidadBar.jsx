import React from "react";
import { porcentajeDisponibleConcierto } from "../../services/entradaService";

export default function EntradasDisponibilidadBar({
  concierto,
  isDark = false,
  className = "",
  loading = false,
}) {
  const pct = porcentajeDisponibleConcierto(concierto);
  const ocupadoPct = pct == null ? 0 : Math.max(0, Math.min(100, 100 - pct));

  if (loading) {
    return (
      <div className={`space-y-1.5 ${className}`} aria-busy="true" aria-label="Cargando disponibilidad">
        <div className={`h-3 w-28 rounded ${isDark ? "bg-slate-700" : "bg-slate-200"} animate-pulse`} />
        <div className={`h-2.5 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"} animate-pulse`} />
      </div>
    );
  }

  if (pct == null) {
    return (
      <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"} ${className}`}>
        Disponibilidad no disponible en este momento.
      </p>
    );
  }

  const tone =
    pct >= 40 ? "alta" : pct >= 15 ? "media" : pct > 0 ? "baja" : "agotado";

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`font-bold uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Disponibilidad
        </span>
        <span
          className={`font-semibold tabular-nums ${
            tone === "agotado"
              ? isDark
                ? "text-rose-300"
                : "text-rose-700"
              : isDark
                ? "text-[#7dd3fc]"
                : "text-[#0e7490]"
          }`}
        >
          {pct}% disponible
        </span>
      </div>
      <div
        className={`entradas-disponibilidad-track h-2.5 w-full overflow-hidden rounded-full ${
          isDark ? "bg-slate-700" : "bg-slate-200"
        }`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${pct} por ciento de entradas disponibles`}
      >
        <div
          className={`entradas-disponibilidad-fill entradas-disponibilidad-fill--${tone} h-full rounded-full transition-[width] duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
        {ocupadoPct > 0 && pct < 100 && (
          <span className="sr-only">{ocupadoPct}% reservado</span>
        )}
      </div>
    </div>
  );
}
