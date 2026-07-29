import React from "react";
import MultiSelectDropdown from "../ui/MultiSelectDropdown";

/**
 * Filtro editorial unificado de grupos de convocatoria (header de gira).
 */
export default function GiraGruposFilterControl({
  options = [],
  filterGrupoIds = [],
  onFilterChange,
  includeGeneralEvents = true,
  onIncludeGeneralChange,
  className = "",
}) {
  if (!options.length) return null;

  return (
    <div
      className={`inline-flex items-stretch rounded-lg border overflow-visible h-[34px] shadow-sm ${
        filterGrupoIds.length > 0
          ? "border-indigo-400 bg-indigo-50"
          : "border-slate-200 bg-white"
      } ${className}`}
      title="Filtro por grupos de convocatoria"
    >
      <div className="relative min-w-[8.5rem] sm:min-w-[11rem] max-w-[14rem]">
        <MultiSelectDropdown
          compact
          summaryMode="names"
          summaryMaxNames={3}
          label="Grupos"
          placeholder="Grupos…"
          options={options}
          value={filterGrupoIds.map(Number)}
          onChange={(arr) => onFilterChange?.(arr.map(Number))}
          className="w-full [&_button]:w-full [&_button]:h-[32px] [&_button]:border-0 [&_button]:rounded-none [&_button]:bg-transparent [&_button]:shadow-none [&_button]:hover:border-transparent"
        />
      </div>
      {filterGrupoIds.length > 0 && (
        <label
          className={`inline-flex items-center px-2.5 border-l text-[10px] font-bold cursor-pointer select-none shrink-0 transition-colors ${
            includeGeneralEvents
              ? "bg-slate-800 text-white border-slate-700"
              : "bg-transparent text-slate-500 border-indigo-200 hover:bg-white/70"
          }`}
          title="Incluir eventos sin grupo asignado (generales)"
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={includeGeneralEvents}
            onChange={(e) => onIncludeGeneralChange?.(e.target.checked)}
          />
          <span>+ Gen.</span>
        </label>
      )}
    </div>
  );
}
