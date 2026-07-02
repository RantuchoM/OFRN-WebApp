import React from "react";

/** Toggle «Reservas habilitadas» para el formulario de concierto Entradas. */
export default function EntradasReservasHabilitadasToggle({
  checked,
  onChange,
  disabled = false,
  isDark = false,
}) {
  return (
    <label
      className={`inline-flex items-center gap-2 shrink-0 cursor-pointer select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1ebbf0]/60 ${
          checked ? "bg-[#1ebbf0]" : isDark ? "bg-slate-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
          aria-hidden
        />
      </button>
      <span className={`text-[11px] font-semibold whitespace-nowrap ${isDark ? "text-slate-200" : "text-slate-700"}`}>
        Reservas habilitadas
      </span>
    </label>
  );
}
