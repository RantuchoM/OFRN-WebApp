import React from "react";

const ROW_GRID =
  "grid items-center gap-x-3 gap-y-2 grid-cols-1 sm:grid-cols-[minmax(0,15.5rem)_13.5rem_4.5rem_minmax(0,1fr)]";

/**
 * Concepto, fecha/hora y día de semana tabulados en la misma línea (formulario concierto Entradas).
 */
export default function EntradasConciertoDatetimeField({
  label,
  labelExtra = null,
  value,
  onChange,
  weekday = "",
  inputClassName = "",
  mutedClassName = "",
  labelClassName = "",
}) {
  return (
    <div className={ROW_GRID}>
      <span className={`text-xs font-semibold leading-snug ${labelClassName}`.trim()}>{label}</span>
      <input
        type="datetime-local"
        value={value}
        onChange={onChange}
        className={inputClassName}
      />
      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0 ${
          labelExtra ? "justify-between" : ""
        } sm:contents`}
      >
        <span
          className={`text-xs font-semibold capitalize sm:min-w-[4.5rem] ${weekday ? mutedClassName : "invisible sm:visible"}`.trim()}
          aria-hidden={!weekday}
        >
          {weekday || "\u00a0"}
        </span>
        {labelExtra ? (
          <div className="flex items-center justify-end min-w-0 sm:justify-self-end">{labelExtra}</div>
        ) : (
          <span className="hidden sm:block" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
