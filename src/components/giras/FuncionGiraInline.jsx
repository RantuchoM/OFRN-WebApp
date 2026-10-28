import React from "react";
import { funcionGiraShortTag, funcionGiraTagClass } from "../../utils/funcionGira";

/** Marca Reemplazo / Refuerzo / Pasante. Indiv no se muestra. */
export default function FuncionGiraInline({ person, className = "" }) {
  const text = funcionGiraShortTag(person);
  if (!text) return null;
  const id = String(person?.funcion_gira ?? person?.funcion ?? "").toLowerCase();
  return (
    <span
      className={`inline-flex items-center px-1 py-px rounded border text-[8px] font-bold uppercase tracking-tight leading-none ${funcionGiraTagClass(id)} ${className}`}
    >
      {text}
    </span>
  );
}
