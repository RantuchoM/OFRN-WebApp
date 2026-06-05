import React from "react";
import { PROGRAM_TYPES, getProgramTypeColor } from "../../utils/giraUtils";

export default function ProgramTypeTag({ tipo, className = "" }) {
  const t = String(tipo || "").trim();
  if (!t) return null;

  const config = PROGRAM_TYPES[t] || PROGRAM_TYPES.default;
  const label = config.label || t;

  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center rounded border px-1.5 py-0.5 text-[9px] font-black uppercase leading-tight ${getProgramTypeColor(t)} ${className}`}
    >
      {label}
    </span>
  );
}
