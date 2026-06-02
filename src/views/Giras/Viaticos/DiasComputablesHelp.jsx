import React, { useMemo, useState } from "react";
import { IconHelpCircle, IconX } from "../../../components/ui/Icons";
import {
  explainViaticosDiasCalculation,
  formatFechaViaticos,
  getArrivalFactor,
  getDepartureFactor,
  REFERENCIA_DIAS_LLEGADA,
  REFERENCIA_DIAS_MISMO_DIA,
  REFERENCIA_DIAS_SALIDA,
} from "../../../utils/viaticosDiasComputables";

function ReferenciaHorariosTable({ titulo, filas, diasActivo }) {
  const fmtDias = (n) =>
    Number.isInteger(n) ? String(n) : String(n).replace(".", ",");

  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-bold text-slate-700 mb-1">{titulo}</p>
      <table className="w-full border-collapse text-[10px] border border-slate-300">
        <thead>
          <tr className="bg-sky-100">
            <th className="border border-slate-300 px-1.5 py-1 font-bold text-left">
              Desde
            </th>
            <th className="border border-slate-300 px-1.5 py-1 font-bold text-left">
              Hasta
            </th>
            <th className="border border-slate-300 px-1.5 py-1 font-bold text-center w-14">
              Días comp.
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((row) => {
            const activa =
              diasActivo != null && Math.abs(row.dias - diasActivo) < 0.001;
            return (
              <tr
                key={`${row.desde}-${row.hasta}`}
                className={activa ? "bg-indigo-100 font-semibold" : "bg-white"}
              >
                <td className="border border-slate-300 px-1.5 py-0.5">
                  {row.desde}
                </td>
                <td className="border border-slate-300 px-1.5 py-0.5">
                  {row.hasta}
                </td>
                <td className="border border-slate-300 px-1.5 py-0.5 text-center">
                  {fmtDias(row.dias)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReferenciaMismoDiaTable({ filas, diasActivo }) {
  const fmtDias = (n) =>
    Number.isInteger(n) ? String(n) : String(n).replace(".", ",");

  return (
    <table className="w-full border-collapse text-[10px] border border-slate-300">
      <thead>
        <tr className="bg-violet-100">
          <th className="border border-slate-300 px-1.5 py-1 font-bold text-left">
            Criterio
          </th>
          <th className="border border-slate-300 px-1.5 py-1 font-bold text-center w-14">
            Días comp.
          </th>
        </tr>
      </thead>
      <tbody>
        {filas.map((row) => {
          const activa =
            diasActivo != null && Math.abs(row.dias - diasActivo) < 0.001;
          return (
            <tr
              key={row.condicion}
              className={activa ? "bg-indigo-100 font-semibold" : "bg-white"}
            >
              <td className="border border-slate-300 px-1.5 py-0.5">
                {row.condicion}
              </td>
              <td className="border border-slate-300 px-1.5 py-0.5 text-center">
                {fmtDias(row.dias)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function DiasComputablesExplainModal({ breakdown, onClose }) {
  if (!breakdown) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dias-computables-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3
            id="dias-computables-title"
            className="text-sm font-bold text-slate-800 flex items-center gap-2"
          >
            <IconHelpCircle size={18} className="text-indigo-600" />
            Cálculo de días computables
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3 text-sm text-slate-700 max-h-[70vh] overflow-y-auto">
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs space-y-1">
            <div>
              <span className="font-bold text-slate-500">Salida: </span>
              {breakdown.fechaSalida
                ? `${formatFechaViaticos(breakdown.fechaSalida)} ${breakdown.horaSalida || ""}`
                : "—"}
            </div>
            <div>
              <span className="font-bold text-slate-500">Llegada: </span>
              {breakdown.fechaLlegada
                ? `${formatFechaViaticos(breakdown.fechaLlegada)} ${breakdown.horaLlegada || ""}`
                : "—"}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-2 space-y-2">
            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">
              {breakdown.sameDay
                ? "Ida y vuelta el mismo día"
                : "Referencia por horario"}
            </p>
            {breakdown.sameDay ? (
              <ReferenciaMismoDiaTable
                filas={REFERENCIA_DIAS_MISMO_DIA}
                diasActivo={
                  !breakdown.incomplete ? breakdown.total : null
                }
              />
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <ReferenciaHorariosTable
                  titulo="Salida"
                  filas={REFERENCIA_DIAS_SALIDA}
                  diasActivo={
                    !breakdown.incomplete
                      ? getDepartureFactor(breakdown.horaSalida).value
                      : null
                  }
                />
                <ReferenciaHorariosTable
                  titulo="Llegada / Regreso"
                  filas={REFERENCIA_DIAS_LLEGADA}
                  diasActivo={
                    !breakdown.incomplete
                      ? getArrivalFactor(breakdown.horaLlegada).value
                      : null
                  }
                />
              </div>
            )}
          </div>

          {breakdown.incomplete ? (
            <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
              {breakdown.message}
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-600">
                {breakdown.sameDay ? (
                  <>
                    Si <strong>salida y llegada</strong> son el mismo día, se
                    cuentan según el tiempo entre ambos horarios (6 h o más = 1
                    día; menos = 0,75).
                  </>
                ) : (
                  <>
                    Los días se arman con{" "}
                    <strong>días intermedios</strong> (noches entre salida y
                    llegada) más fracciones según el{" "}
                    <strong>horario de salida</strong> y el{" "}
                    <strong>horario de llegada</strong>.
                  </>
                )}
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs">
                {breakdown.steps.map((step, i) => (
                  <li key={i} className="leading-snug">
                    <span className="font-semibold text-slate-800">
                      {step.label}
                    </span>
                    <br />
                    <span className="text-slate-600 ml-4">{step.detail}</span>
                  </li>
                ))}
              </ol>
              {breakdown.formulaSummary && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-center">
                  <span className="text-[10px] font-bold uppercase text-indigo-600 block mb-0.5">
                    Resultado
                  </span>
                  <span className="text-lg font-bold text-indigo-900">
                    {breakdown.formulaSummary}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-slate-200 px-4 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Muestra el valor de días + botón ? que abre el detalle del cálculo.
 */
export default function DiasComputablesHelp({
  dias,
  fechaSalida,
  horaSalida,
  fechaLlegada,
  horaLlegada,
  className = "",
  valueClassName = "",
  iconSize = 13,
}) {
  const [open, setOpen] = useState(false);

  const breakdown = useMemo(
    () =>
      explainViaticosDiasCalculation(
        fechaSalida,
        horaSalida,
        fechaLlegada,
        horaLlegada,
      ),
    [fechaSalida, horaSalida, fechaLlegada, horaLlegada],
  );

  const display =
    dias !== undefined && dias !== null ? dias : breakdown.total;

  return (
    <>
      <span
        className={`inline-flex items-center justify-center gap-0.5 ${className}`}
      >
        <span className={valueClassName}>{display}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="inline-flex shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          title="¿Cómo se calculan los días?"
          aria-label="Explicación del cálculo de días"
        >
          <IconHelpCircle size={iconSize} />
        </button>
      </span>
      {open && (
        <DiasComputablesExplainModal
          breakdown={breakdown}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
