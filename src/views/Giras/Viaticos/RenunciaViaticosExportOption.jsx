import React from "react";

/**
 * Opción de exportación de viático al 0%: reemplaza $0 del anticipo por texto de renuncia.
 */
export default function RenunciaViaticosExportOption({
  checked,
  onChange,
  disabled = false,
  className = "",
}) {
  return (
    <label
      className={`flex items-start gap-2 p-2 rounded border border-amber-200 bg-amber-50/90 cursor-pointer text-xs text-amber-950 ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 rounded text-amber-700 shrink-0"
      />
      <span>
        <span className="font-bold block">Marcar que renuncia viáticos</span>
        <span className="text-[10px] text-amber-800/90 leading-snug">
          En el PDF de viático (0%), el anticipo dirá «RENUNCIA A VIÁTICOS» en lugar de $0.
        </span>
      </span>
    </label>
  );
}
