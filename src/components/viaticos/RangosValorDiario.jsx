import React from "react";
import {
  fechasSegmentoRango,
  fmtDiasPdf,
  segmentosParaVista,
  tituloSegmentoRango,
} from "../../utils/viaticosValorDiarioProporcional";

/**
 * Mismos rangos que el PDF dual: días × valor diario ponderado por tramo.
 * Con un solo valor muestra el importe único.
 */
export default function RangosValorDiario({
  segmentos,
  valorDiarioCalc,
  dias,
  subtotal,
  fmtMoney,
  showTramoSubtotal = true,
  showTotal = true,
  valueClassName = "text-sm font-black text-slate-800",
  className = "",
}) {
  const rangos = segmentosParaVista(segmentos);
  if (rangos.length < 2) {
    return (
      <div className={className}>
        <div className={valueClassName}>{fmtMoney(valorDiarioCalc)}</div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {rangos.map((s, i) => {
        const fechas = fechasSegmentoRango(s);
        return (
          <div
            key={`${s.fechaDesde || ""}-${s.montoBase}-${i}`}
            className="flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                {tituloSegmentoRango(i, rangos.length)}
                {fechas ? ` · ${fechas}` : ""}
              </div>
              <div className={valueClassName}>
                {fmtDiasPdf(s.dias)} días × {fmtMoney(s.valorDiarioCalc)}
              </div>
            </div>
            {showTramoSubtotal ? (
              <div className="shrink-0 pt-3 text-xs font-black text-slate-700">
                {fmtMoney(s.subtotalTramo)}
              </div>
            ) : null}
          </div>
        );
      })}
      {showTotal ? (
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
          <span>
            Total{" "}
            <span className="font-black text-slate-800">{fmtDiasPdf(dias)}</span>{" "}
            días
          </span>
          <span className="font-black text-slate-800">{fmtMoney(subtotal)}</span>
        </div>
      ) : null}
    </div>
  );
}
