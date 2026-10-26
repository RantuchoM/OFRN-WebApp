import React from "react";
import { ensNetosParts } from "../../utils/ensambleCicloConciertos";

/**
 * Ens. netos con el tramo de conflicto (`- m`) en naranja.
 */
export default function EnsNetosValue({
  brutos,
  conflicto,
  netos,
  className = "",
}) {
  const p = ensNetosParts(brutos, conflicto, netos);
  if (!p.hasConflict) {
    return <span className={className}>{p.netos}</span>;
  }
  return (
    <span className={className}>
      {p.brutos}
      <span className="text-orange-600"> - {p.conflicto}</span>
      {` = ${p.netos}`}
    </span>
  );
}
