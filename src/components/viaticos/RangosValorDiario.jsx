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
  /** "completo" repite días × tarifa y plata. "tarifa" solo cómo se arma el día. "dinero" solo el anticipo. */
  presentacion = "completo",
}) {
  const rangos = segmentosParaVista(segmentos);
  const soloDinero = presentacion === "dinero";
  const soloTarifa = presentacion === "tarifa";
  if (rangos.length < 2) {
    if (soloDinero) {
      return (
        <div className={`flex items-center justify-between gap-3 ${className}`}>
          <span className="text-[11px] font-bold text-slate-600">Viáticos anticipados</span>
          <span className={valueClassName}>{fmtMoney(subtotal)}</span>
        </div>
      );
    }
    if (soloTarifa) {
      return (
        <div className={className}>
          <div className={valueClassName}>
            {fmtDiasPdf(dias)} días × {fmtMoney(valorDiarioCalc)}
          </div>
        </div>
      );
    }
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
            className={`flex justify-between gap-3 ${soloDinero ? "items-center" : "items-start"}`}
          >
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                {tituloSegmentoRango(i, rangos.length)}
                {fechas ? ` · ${fechas}` : ""}
              </div>
              {soloDinero ? null : (
                <div className={valueClassName}>
                  {fmtDiasPdf(s.dias)} días × {fmtMoney(s.valorDiarioCalc)}
                </div>
              )}
            </div>
            {soloDinero || (showTramoSubtotal && !soloTarifa) ? (
              <div className={`shrink-0 text-xs font-black text-slate-700 ${soloDinero ? "" : "pt-3"}`}>
                {fmtMoney(s.subtotalTramo)}
              </div>
            ) : null}
          </div>
        );
      })}
      {soloDinero || (showTotal && !soloTarifa) ? (
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
          <span className="font-bold text-slate-700">
            {soloDinero ? "Viáticos anticipados" : (
              <>
                Total{" "}
                <span className="font-black text-slate-800">{fmtDiasPdf(dias)}</span>{" "}
                días
              </>
            )}
          </span>
          <span className="font-black text-slate-800">{fmtMoney(subtotal)}</span>
        </div>
      ) : null}
    </div>
  );
}
