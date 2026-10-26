import React, { useState } from "react";
import EnsNetosValue from "./EnsNetosValue";

function fmt(n) {
  const v = Math.round(Number(n) * 100) / 100;
  if (!Number.isFinite(v)) return "—";
  return String(v).replace(".", ",");
}

/**
 * Vista Prestaciones: toggle entre cuadro Programas (giras) y Prestaciones,
 * misma lógica que la 1ª página del PDF informe.
 */
export default function ProyeccionPrestacionesVista({
  rows = [],
  serviciosPorGira = 7,
}) {
  /** programas = 1er cuadro; prestaciones = 2º cuadro */
  const [cuadro, setCuadro] = useState("prestaciones");
  const nGira = Number(serviciosPorGira);
  const nLabel =
    Number.isFinite(nGira) && nGira >= 0 ? String(nGira).replace(".", ",") : "7";

  if (!rows.length) {
    return (
      <p className="px-3 py-8 text-center text-xs text-slate-400">
        No hay ensambles para mostrar.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Cuadro
        </span>
        <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setCuadro("prestaciones")}
            className={`rounded px-2.5 py-1 text-[11px] font-bold ${
              cuadro === "prestaciones"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            Prestaciones
          </button>
          <button
            type="button"
            onClick={() => setCuadro("programas")}
            className={`rounded px-2.5 py-1 text-[11px] font-bold ${
              cuadro === "programas"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            Programas
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        {cuadro === "programas" ? (
          <section>
            <h3 className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-orange-900">
              Programas — giras
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full border-collapse text-center text-[11px]">
                <thead className="bg-slate-800 text-[10px] text-white">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-bold">Ensamble</th>
                    <th className="px-2 py-1.5 text-left font-bold">Sede</th>
                    <th className="bg-orange-50/20 px-2 py-1.5 font-bold">
                      Fuera
                    </th>
                    <th className="bg-sky-50/20 px-2 py-1.5 font-bold">
                      En casa
                    </th>
                    <th className="px-2 py-1.5 font-bold">Total giras</th>
                    <th className="bg-emerald-50/20 px-2 py-1.5 font-bold">
                      Prog. ens.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={`g-${r.id}`}
                      className="border-t border-slate-100 hover:bg-slate-50/80"
                    >
                      <td className="px-2 py-1.5 text-left font-semibold text-slate-800">
                        {r.ensamble}
                      </td>
                      <td className="px-2 py-1.5 text-left text-slate-600">
                        {r.sede || "—"}
                      </td>
                      <td className="bg-orange-50/60 px-2 py-1.5 font-bold tabular-nums text-orange-900">
                        {fmt(r.girasFuera)}
                      </td>
                      <td className="bg-sky-50/50 px-2 py-1.5 font-bold tabular-nums text-sky-900">
                        {fmt(r.girasCasa)}
                      </td>
                      <td className="bg-slate-100/80 px-2 py-1.5 font-bold tabular-nums">
                        {fmt(r.girasTotal)}
                      </td>
                      <td className="bg-emerald-50/60 px-2 py-1.5 font-bold tabular-nums text-emerald-900">
                        {r.programasEnsamble ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section>
            <h3 className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-indigo-900">
              Prestaciones
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full border-collapse text-center text-[11px]">
                <thead className="bg-slate-800 text-[10px] text-white">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-bold">Ensamble</th>
                    <th className="px-2 py-1.5 text-left font-bold">Sede</th>
                    <th
                      className="px-2 py-1.5 font-bold whitespace-nowrap"
                      title={`Total giras × ${nLabel} (prestaciones / gira)`}
                    >
                      Prest. por gira
                    </th>
                    <th className="px-2 py-1.5 font-bold">PCV</th>
                    <th className="px-2 py-1.5 font-bold">Ens. netos</th>
                    <th className="px-2 py-1.5 font-bold">Conc. ens.</th>
                    <th className="px-2 py-1.5 font-bold">Feriados</th>
                    <th className="px-2 py-1.5 font-bold">Prest. tot.</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={`p-${r.id}`}
                      className="border-t border-slate-100 hover:bg-slate-50/80"
                    >
                      <td className="px-2 py-1.5 text-left font-semibold text-slate-800">
                        {r.ensamble}
                      </td>
                      <td className="px-2 py-1.5 text-left text-slate-600">
                        {r.sede || "—"}
                      </td>
                      <td
                        className="whitespace-nowrap bg-indigo-50 px-2 py-1.5 font-bold tabular-nums text-slate-800"
                        title={`Total giras × ${nLabel}`}
                      >
                        {`${fmt(r.girasTotal)} × ${nLabel} = ${fmt(r.servGirasEst)}`}
                      </td>
                      <td className="bg-teal-50/70 px-2 py-1.5 font-bold tabular-nums text-teal-900">
                        {fmt(r.pcv)}
                      </td>
                      <td
                        className="whitespace-nowrap bg-violet-50/70 px-2 py-1.5 font-bold tabular-nums text-violet-900"
                        title="Brutos - conflicto = netos"
                      >
                        <EnsNetosValue
                          brutos={r.ensayosBrutos}
                          conflicto={r.ensayosConflicto}
                          netos={r.ensayosNetos}
                        />
                      </td>
                      <td className="whitespace-nowrap bg-emerald-50/80 px-2 py-1.5 font-bold tabular-nums text-emerald-900">
                        {r.conciertosEnsambleLabel || "0"}
                      </td>
                      <td className="bg-pink-50/70 px-2 py-1.5 font-bold tabular-nums text-pink-900">
                        {r.feriados || ""}
                      </td>
                      <td className="bg-slate-50 px-2 py-1.5 font-black tabular-nums text-slate-900">
                        {fmt(r.serviciosTotales)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
