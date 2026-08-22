import React, { useMemo } from "react";
import {
  labelCantidadEntradas,
  maxCantidadEditable,
  puedeCambiarCantidadReserva,
} from "../../utils/entradasMisReservas";

export default function EntradasCambiarCantidadControls({
  reserva,
  ui,
  concierto,
  plazasLibres,
  disabled = false,
  compact = false,
  showCount = true,
  /** Clase de botón; por defecto `ui.btnMuted` (ámbar) si existe, si no `btnSecondary`. */
  buttonClassName,
  onRequestChange,
}) {
  const actual = Math.max(1, Number(reserva?.cantidad_solicitada) || 1);
  const max = maxCantidadEditable(reserva, plazasLibres);

  const opciones = useMemo(() => {
    const out = [];
    for (let n = 1; n <= Math.max(1, max); n += 1) out.push(n);
    return out;
  }, [max]);

  if (!puedeCambiarCantidadReserva(reserva, { concierto })) return null;
  if (opciones.length <= 1 && opciones[0] === actual) return null;

  const tone = buttonClassName || ui.btnMuted || ui.btnSecondary;
  const btnClass = compact
    ? `w-full sm:w-auto rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60 ${tone}`
    : `w-full rounded-md px-3 py-2.5 text-sm font-bold disabled:opacity-60 ${tone}`;

  return (
    <div className={compact ? "flex flex-col sm:flex-row sm:items-center flex-wrap gap-2" : "space-y-2"}>
      {showCount && (
        <p className={`text-sm ${ui.textSoft}`}>
          Tenés {labelCantidadEntradas(actual)}
        </p>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onRequestChange?.()}
        className={btnClass}
      >
        Cambiar cantidad
      </button>
    </div>
  );
}
