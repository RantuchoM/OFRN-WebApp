import React, { useMemo } from "react";
import {
  formatSegmentosMontoBase,
  resolverValorDiarioBaseHistorial,
} from "../../utils/viaticosValorDiarioProporcional";

export default function ValorDiarioBaseHistoricoField({
  fechaSalida,
  horaSalida,
  fechaLlegada,
  horaLlegada,
  vigencias,
  fmtMoney,
}) {
  const info = useMemo(
    () =>
      resolverValorDiarioBaseHistorial({
        fechaSalida,
        horaSalida,
        fechaLlegada,
        horaLlegada,
        vigencias,
      }),
    [fechaSalida, horaSalida, fechaLlegada, horaLlegada, vigencias],
  );

  const desgloseBase = useMemo(() => {
    if (info.estado !== "prorrateo") return "";
    return formatSegmentosMontoBase(info.segmentos, fmtMoney);
  }, [info, fmtMoney]);

  return (
    <div>
      <div className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm min-h-[38px]">
        {info.estado === "pendiente" || info.estado === "sin_vigencia" ? (
          <p className="text-xs text-amber-700 leading-snug">{info.mensaje}</p>
        ) : info.estado === "prorrateo" ? (
          <div>
            <span className="font-bold text-slate-700">Según historial</span>
            {desgloseBase ? (
              <p className="text-[10px] text-indigo-600 font-semibold mt-1">
                {desgloseBase}
              </p>
            ) : null}
          </div>
        ) : (
          <span className="font-black text-slate-800">
            {fmtMoney(info.valorDiarioBase)}
          </span>
        )}
      </div>
      <p className="mt-1 text-[10px] text-slate-500">
        Definido automáticamente por el historial de vigencias.
      </p>
    </div>
  );
}

export { resolverValorDiarioBaseHistorial };
