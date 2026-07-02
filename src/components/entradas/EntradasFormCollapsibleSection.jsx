import React from "react";

import { IconChevronDown } from "../ui/Icons";

/**
 * Sección de formulario Entradas, cerrada por defecto.
 * Usar <details> nativo para no depender de estado al cambiar de ítem editado.
 */
export default function EntradasFormCollapsibleSection({
  title,
  hint = "",
  summaryStatus = "",
  summaryStatusTone = "muted",
  children,
  panelClassName = "",
  isDark = false,
}) {
  const statusToneClass =
    summaryStatusTone === "open"
      ? isDark
        ? "text-emerald-300 border-emerald-700/80 bg-emerald-950/50"
        : "text-emerald-800 border-emerald-200 bg-emerald-50"
      : summaryStatusTone === "pending"
      ? isDark
        ? "text-amber-200 border-amber-700/70 bg-amber-950/40"
        : "text-amber-900 border-amber-200 bg-amber-50"
      : summaryStatusTone === "off"
      ? isDark
        ? "text-slate-400 border-slate-600 bg-slate-800/60"
        : "text-slate-500 border-slate-200 bg-slate-100"
      : isDark
      ? "text-slate-400 border-slate-600"
      : "text-slate-500 border-slate-200";

  return (
    <details className={`group ${panelClassName}`.trim()}>
      <summary
        className={`cursor-pointer select-none list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden ${
          isDark ? "text-slate-200" : "text-slate-800"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="entradas-font-title block text-xs font-black uppercase tracking-wide">
            {title}
          </span>
          {hint ? (
            <span
              className={`entradas-font-detail block text-[11px] leading-snug mt-0.5 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {hint}
            </span>
          ) : null}
        </span>
        {summaryStatus ? (
          <span
            className={`shrink-0 max-w-[min(100%,14rem)] truncate rounded border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold leading-snug ${statusToneClass}`}
          >
            {summaryStatus}
          </span>
        ) : null}
        <IconChevronDown
          size={18}
          className={`shrink-0 transition-transform group-open:rotate-180 ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
          aria-hidden
        />
      </summary>
      <div
        className={`pt-3 mt-2 space-y-3 border-t ${
          isDark ? "border-slate-600" : "border-slate-200"
        }`}
      >
        {children}
      </div>
    </details>
  );
}
