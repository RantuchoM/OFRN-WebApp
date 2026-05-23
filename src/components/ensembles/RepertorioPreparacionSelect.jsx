import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconMusic, IconUsers } from "../ui/Icons";
import MultiSelect from "../ui/MultiSelect";
import {
  REHEARSAL_PROGRAM_TYPE_FILTERS,
  REHEARSAL_PROGRAM_TYPE_FILTER_KEYS,
  filterRehearsalProgramOptions,
} from "../../utils/rehearsalProgramas";
import { getProgramTypeColor } from "../../utils/giraUtils";
import { useProgramParticipationMap } from "../../hooks/useProgramParticipationMap";

export default function RepertorioPreparacionSelect({
  options = [],
  selectedIds = [],
  onChange,
  minRehearsalDate = null,
  title = "Repertorio / Preparación",
  placeholder = "Vincular con Programas...",
  helperText = "* Se mostrará el repertorio de estos programas en la agenda.",
  supabase = null,
  activeMembersSet = null,
}) {
  const [activeTypeKeys, setActiveTypeKeys] = useState(
    () => new Set(REHEARSAL_PROGRAM_TYPE_FILTER_KEYS),
  );
  const [nameQuery, setNameQuery] = useState("");

  const allTypesActive = REHEARSAL_PROGRAM_TYPE_FILTER_KEYS.every((key) =>
    activeTypeKeys.has(key),
  );

  const toggleTypeFilter = useCallback((key) => {
    if (key === "ALL") {
      setActiveTypeKeys(new Set(REHEARSAL_PROGRAM_TYPE_FILTER_KEYS));
      return;
    }
    setActiveTypeKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const filteredOptions = useMemo(
    () =>
      filterRehearsalProgramOptions(options, {
        activeTypeKeys,
        nameQuery,
        minRehearsalDate,
        selectedIds,
      }),
    [options, activeTypeKeys, nameQuery, minRehearsalDate, selectedIds],
  );

  const participationMap = useProgramParticipationMap(
    supabase,
    options,
    activeMembersSet,
  );

  const renderParticipationBadge = useCallback(
    (opt) => {
      if (!activeMembersSet?.size) return null;
      const info = participationMap.get(opt.id);
      if (!info) return null;

      const { count, members, loading, isFull } = info;
      const showMembersList = (e) => {
        e.stopPropagation();
        if (count === 0) return;
        const names = members
          .map((member) => `• ${member.nombre} ${member.apellido}`)
          .join("\n");
        toast.success(`Integrantes convocados (${count}): ${names}`);
      };

      return (
        <button
          type="button"
          onClick={showMembersList}
          disabled={loading || count === 0}
          className={`text-[10px] flex items-center gap-1 font-bold hover:underline disabled:opacity-50 disabled:no-underline shrink-0 ${
            isFull ? "text-green-600" : "text-amber-600"
          }`}
          title={
            count > 0
              ? `${count} integrante${count === 1 ? "" : "s"} del ensamble`
              : "Sin integrantes del ensamble"
          }
        >
          <IconUsers size={12} />
          {loading ? "…" : isFull ? "Todos" : count}
        </button>
      );
    },
    [activeMembersSet, participationMap],
  );

  const filterButtons = [
    { key: "ALL", abbr: "Todos", colorKey: null },
    ...REHEARSAL_PROGRAM_TYPE_FILTERS,
  ];

  return (
    <div className="bg-emerald-50 p-3 rounded border border-emerald-100">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="text-xs font-bold text-emerald-800 flex items-center gap-2 shrink-0">
          <IconMusic size={14} /> {title}
        </h3>
        <div className="flex items-center gap-1 flex-wrap">
          {filterButtons.map((filter) => {
            const isActive =
              filter.key === "ALL"
                ? allTypesActive
                : activeTypeKeys.has(filter.key);
            const colorClasses =
              filter.key === "ALL"
                ? "bg-white text-slate-600 border-slate-200"
                : getProgramTypeColor(filter.colorKey);
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => toggleTypeFilter(filter.key)}
                aria-pressed={isActive}
                className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tight transition-all ${
                  isActive
                    ? `${colorClasses} ring-2 ring-offset-1 ring-slate-400/40`
                    : `${colorClasses} opacity-40 hover:opacity-70`
                }`}
              >
                {filter.abbr}
              </button>
            );
          })}
        </div>
      </div>

      <input
        type="search"
        value={nameQuery}
        onChange={(e) => setNameQuery(e.target.value)}
        placeholder="Filtrar por nombre..."
        className="w-full mb-2 border border-emerald-200 rounded px-2 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-200"
      />

      <MultiSelect
        placeholder={placeholder}
        options={filteredOptions}
        selectedIds={selectedIds}
        onChange={onChange}
        useOptionTypeColors
        optionTrailingActions={
          activeMembersSet?.size ? renderParticipationBadge : undefined
        }
      />

      {helperText ? (
        <p className="text-[10px] text-emerald-600 mt-2 ml-1">{helperText}</p>
      ) : null}
    </div>
  );
}
