import React from "react";
import { IconLoader, IconMusic } from "../ui/Icons";
import { getProgramStyle } from "../../utils/giraUtils";
import { orderedProgramTypeEntries } from "../../utils/girasYearSummary";

export default function GirasYearSummaryBar({
  year,
  programCounts,
  ensayosConvocados,
  isLoading,
}) {
  const typeEntries = orderedProgramTypeEntries(programCounts);
  const hasPrograms = typeEntries.length > 0;
  const showEnsayos = ensayosConvocados != null;

  if (!isLoading && !hasPrograms && !showEnsayos) return null;

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
      aria-label={`Resumen del año ${year}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Resumen {year}
        </h3>
        {isLoading && (
          <IconLoader size={14} className="animate-spin text-indigo-500" />
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {showEnsayos && (
          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
            <IconMusic size={16} className="shrink-0 text-indigo-600" />
            <span className="font-medium">Ensayos de ensamble convocados</span>
            <span className="rounded-md bg-white px-2 py-0.5 text-base font-bold tabular-nums text-indigo-700">
              {isLoading ? "…" : ensayosConvocados}
            </span>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {!isLoading && !hasPrograms && (
            <span className="text-sm text-slate-400">
              Sin programas en el año en curso.
            </span>
          )}
          {typeEntries.map(({ tipo, count }) => {
            const style = getProgramStyle(tipo);
            const colorTokens = (style?.color || "").split(" ");
            const chipClass =
              colorTokens
                .filter(
                  (t) =>
                    t.startsWith("bg-") ||
                    t.startsWith("text-") ||
                    t.startsWith("border-"),
                )
                .join(" ") || "bg-slate-50 text-slate-700 border-slate-200";

            return (
              <div
                key={tipo}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${chipClass}`}
              >
                <span className="truncate">{tipo}</span>
                <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-base font-bold tabular-nums leading-none">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
