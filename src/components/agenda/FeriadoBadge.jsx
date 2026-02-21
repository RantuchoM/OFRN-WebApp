import React from "react";
import { IconAlertTriangle } from "../ui/Icons";

/**
 * Badge de feriado o día no laborable para la agenda.
 */
export default function FeriadoBadge({ feriado }) {
  if (!feriado) return null;

  const isFeriado = feriado.es_feriado;
  const colorClass = isFeriado ? "text-red-600" : "text-yellow-600";

  return (
    <div className="ml-1">
      <button
        type="button"
        className={`cursor-pointer hover:scale-110 transition-transform ${colorClass}`}
        title={`⚠️ ${isFeriado ? "Feriado" : "Día no laborable"}: ${feriado.detalle}`}
      >
        <IconAlertTriangle size={14} />
      </button>
    </div>
  );
}
