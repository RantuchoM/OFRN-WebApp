import React, { useCallback, useMemo } from "react";
import MultiSelectDropdown from "../ui/MultiSelectDropdown";
import {
  GIRA_GRUPOS_TUTTI_VALUE,
  hasEditorialGrupoFilter,
  isGiraGruposTuttiValue,
} from "../../services/giraGruposService";

/**
 * Filtro editorial unificado de grupos de convocatoria (header de gira).
 * Primera opción: «Actividades Tutti» (sin `eventos_grupos`); luego grupos nombrados.
 * Multi-select aditivo (OR): Tutti ∪ grupos tildados. Vacío = sin filtro.
 *
 * Preferir `onSelectionChange(ids, includeTutti)` para persistir ambos ejes juntos.
 * Fallback: `onFilterChange` + `onIncludeGeneralChange` (legacy).
 */
export default function GiraGruposFilterControl({
  options = [],
  filterGrupoIds = [],
  onFilterChange,
  includeGeneralEvents = false,
  onIncludeGeneralChange,
  onSelectionChange,
  className = "",
}) {
  const filterActive = hasEditorialGrupoFilter(
    filterGrupoIds,
    includeGeneralEvents,
  );

  const selectedValues = useMemo(
    () => [
      ...(includeGeneralEvents ? [GIRA_GRUPOS_TUTTI_VALUE] : []),
      ...filterGrupoIds.map(Number).filter(Number.isFinite),
    ],
    [includeGeneralEvents, filterGrupoIds],
  );

  const handleChange = useCallback(
    (next) => {
      const list = Array.isArray(next) ? next : [];
      const includeTutti = list.some((v) => isGiraGruposTuttiValue(v));
      const ids = list
        .filter((v) => !isGiraGruposTuttiValue(v))
        .map((id) => Number(id))
        .filter(Number.isFinite);
      if (onSelectionChange) {
        onSelectionChange(ids, includeTutti);
        return;
      }
      onIncludeGeneralChange?.(includeTutti);
      onFilterChange?.(ids);
    },
    [onFilterChange, onIncludeGeneralChange, onSelectionChange],
  );

  if (!options.length) return null;

  return (
    <div
      className={`inline-flex items-stretch rounded-lg border overflow-visible h-[34px] shadow-sm ${
        filterActive
          ? "border-indigo-400 bg-indigo-50"
          : "border-slate-200 bg-white"
      } ${className}`}
      title="Filtro por grupos de convocatoria (Actividades Tutti = sin grupo asignado)"
    >
      <div className="relative min-w-0 w-[8.5rem] sm:min-w-[11rem] max-w-[min(14rem,100%)]">
        <MultiSelectDropdown
          compact
          summaryMode="names"
          summaryMaxNames={3}
          label="Grupos"
          placeholder="Grupos…"
          options={options}
          value={selectedValues}
          onChange={handleChange}
          className="w-full [&_button]:w-full [&_button]:h-[32px] [&_button]:border-0 [&_button]:rounded-none [&_button]:bg-transparent [&_button]:shadow-none [&_button]:hover:border-transparent"
        />
      </div>
    </div>
  );
}
