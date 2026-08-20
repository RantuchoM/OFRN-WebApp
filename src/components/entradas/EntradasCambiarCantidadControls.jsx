import React, { useEffect, useMemo, useState } from "react";
import {
  ENTRADAS_MAX_POR_RESERVA,
  maxCantidadEditable,
  puedeCambiarCantidadReserva,
} from "../../utils/entradasMisReservas";

function labelCantidad(n) {
  return `${n} entrada${n === 1 ? "" : "s"}`;
}

export default function EntradasCambiarCantidadControls({
  reserva,
  ui,
  concierto,
  plazasLibres,
  disabled = false,
  compact = false,
  onRequestChange,
}) {
  const actual = Math.max(1, Number(reserva?.cantidad_solicitada) || 1);
  const max = maxCantidadEditable(reserva, plazasLibres);
  const [draft, setDraft] = useState(actual);

  useEffect(() => {
    setDraft(actual);
  }, [reserva?.id, actual]);

  const opciones = useMemo(() => {
    const out = [];
    for (let n = 1; n <= Math.max(1, max); n += 1) out.push(n);
    return out;
  }, [max]);

  if (!puedeCambiarCantidadReserva(reserva, { concierto })) return null;
  if (opciones.length <= 1 && opciones[0] === actual) return null;

  const distinto = Number(draft) !== actual;
  const selectClass = compact
    ? `${ui.select} w-full sm:w-auto`
    : `entradas-catalog-control ${ui.select} w-full`;
  const btnClass = compact
    ? `w-full sm:w-auto rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60 ${ui.btnSecondary}`
    : `${ui.btnSolid} disabled:opacity-60`;

  return (
    <div className="space-y-2">
      <label className={ui.label}>Cambiar cantidad</label>
      <div className={compact ? "flex flex-col sm:flex-row flex-wrap gap-2" : "space-y-2"}>
        <select
          className={selectClass}
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(Number(event.target.value))}
          aria-label={`Cantidad de entradas, máximo ${ENTRADAS_MAX_POR_RESERVA}`}
        >
          {opciones.map((n) => (
            <option key={n} value={n}>
              {labelCantidad(n)}
              {n === actual ? " (actual)" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={disabled || !distinto}
          onClick={() => onRequestChange?.(Number(draft))}
          className={btnClass}
        >
          Cambiar cantidad
        </button>
      </div>
      {distinto && (
        <p className={`text-xs leading-relaxed ${ui.textMuted}`}>
          Al confirmar se van a renovar los QR. Si ya imprimiste el PDF, vas a tener que descargarlo de nuevo
          con los códigos nuevos.
        </p>
      )}
    </div>
  );
}
