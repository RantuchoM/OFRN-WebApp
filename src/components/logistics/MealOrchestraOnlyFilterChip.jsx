import {
  MEAL_FILTER_ORCHESTRA_ONLY,
  MEAL_FILTER_ORCHESTRA_ONLY_LABEL,
  toggleMealOrchestraOnlyFilter,
} from "../../utils/mealLogistics";

/**
 * Chip de filtro: comidas de orquesta OFRN sin artistas FIMBA.
 * Al encender deja solo esa key en `artistaIds` (exclusivo).
 */
export default function MealOrchestraOnlyFilterChip({
  value = [],
  onChange,
  compact = false,
}) {
  const active = (value || [])
    .map(String)
    .includes(MEAL_FILTER_ORCHESTRA_ONLY);
  return (
    <button
      type="button"
      onClick={() => onChange(toggleMealOrchestraOnlyFilter(value))}
      title="Solo comidas de la orquesta, sin artistas FIMBA"
      className={
        compact
          ? `px-2 py-0.5 rounded-full border text-[10px] font-bold ${
              active
                ? "bg-emerald-700 text-white border-emerald-700"
                : "bg-slate-50 text-slate-500 border-slate-300"
            }`
          : `px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide shrink-0 ${
              active
                ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                : "bg-slate-50 text-slate-500 border-slate-300 hover:bg-slate-100"
            }`
      }
    >
      {MEAL_FILTER_ORCHESTRA_ONLY_LABEL}
    </button>
  );
}
