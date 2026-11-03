import React from "react";
import {
  computeDisponibles,
  etiquetaCupoConcierto,
  porcentajeDisponibleConcierto,
} from "../../services/entradaService";

export default function EntradasDisponibilidadBar({
  concierto,
  isDark = false,
  className = "",
  loading = false,
  square = false,
  /** Compacto para tarjetas del listado (sin rótulo «Disponibilidad»). */
  compact = false,
  /** La pastilla de la función ya dice «Entradas agotadas». */
  ocultarEtiquetaAgotadas = false,
}) {
  const trackRadius = square ? "rounded-sm" : "rounded-full";
  const pct = porcentajeDisponibleConcierto(concierto);
  const plazas = concierto ? computeDisponibles(concierto) : null;
  const ocupadoPct = pct == null ? 0 : Math.max(0, Math.min(100, 100 - pct));
  const etiqueta = concierto ? etiquetaCupoConcierto(concierto) : null;

  if (loading) {
    return (
      <div className={`space-y-1.5 ${className}`} aria-busy="true" aria-label="Cargando disponibilidad">
        {!compact && (
          <div className={`h-3 w-28 rounded ${isDark ? "bg-slate-700" : "bg-slate-200"} animate-pulse`} />
        )}
        <div className={`h-2.5 ${trackRadius} ${isDark ? "bg-slate-700" : "bg-slate-200"} animate-pulse`} />
      </div>
    );
  }

  if (pct == null && (plazas == null || Number.isNaN(Number(plazas)))) {
    return (
      <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-500"} ${className}`}>
        Disponibilidad no disponible en este momento.
      </p>
    );
  }

  const pctSafe = pct == null
    ? (plazas <= 0 ? 0 : null)
    : pct;
  const tone =
    (pctSafe != null && pctSafe <= 0) || plazas <= 0
      ? "agotado"
      : plazas < 4
        ? "baja"
        : pctSafe == null
          ? "media"
          : pctSafe >= 40
            ? "alta"
            : pctSafe >= 15
              ? "media"
              : "baja";

  const fillWidth =
    tone === "agotado"
      ? 0
      : pctSafe != null
        ? pctSafe
        : plazas < 4
          ? Math.max(8, plazas * 12)
          : 50;

  const labelToneClass =
    tone === "agotado"
      ? isDark
        ? "text-rose-300"
        : "text-rose-700"
      : tone === "baja"
        ? isDark
          ? "text-amber-300"
          : "text-amber-700"
        : isDark
          ? "text-[#7dd3fc]"
          : "text-[#0e7490]";

  const ariaLabel = etiqueta
    || (pctSafe != null ? `${pctSafe} por ciento de entradas disponibles` : "Disponibilidad");

  const showHeaderLabel = Boolean(etiqueta)
    && !(tone === "agotado" && ocultarEtiquetaAgotadas)
    && !compact;

  return (
    <div className={`${compact ? "space-y-1" : "space-y-1.5"} ${className}`}>
      {(!compact || showHeaderLabel) && (
        <div className={`flex items-center gap-2 text-xs ${compact ? "justify-start" : "justify-between"}`}>
          {!compact && (
            <span className={`font-bold uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Disponibilidad
            </span>
          )}
          {showHeaderLabel && (
            <span className={`font-semibold tabular-nums ${labelToneClass}`}>
              {etiqueta}
            </span>
          )}
        </div>
      )}
      <div
        className={`entradas-disponibilidad-track h-2.5 w-full overflow-hidden ${trackRadius} ${
          isDark ? "bg-slate-700" : "bg-slate-200"
        }`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pctSafe != null ? pctSafe : undefined}
        aria-label={ariaLabel}
      >
        <div
          className={`entradas-disponibilidad-fill entradas-disponibilidad-fill--${tone} h-full ${trackRadius} transition-[width] duration-500 ease-out`}
          style={{ width: `${fillWidth}%` }}
        />
        {ocupadoPct > 0 && pctSafe != null && pctSafe < 100 && (
          <span className="sr-only">{ocupadoPct}% reservado</span>
        )}
      </div>
    </div>
  );
}
