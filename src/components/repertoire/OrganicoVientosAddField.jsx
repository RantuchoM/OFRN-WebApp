import React from "react";
import { IconPlus } from "../ui/Icons";
import {
  ORGANICO_VIENTOS_PLACEHOLDER,
  formatOrganicoVientosInput,
} from "../../utils/particellaOrganicoInput";

export default function OrganicoVientosAddField({
  value,
  onChange,
  onAdd,
  disabled = false,
  variant = "form",
}) {
  const handleChange = (e) => {
    onChange(formatOrganicoVientosInput(e.target.value));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAdd?.();
    }
  };

  const inputProps = {
    type: "text",
    inputMode: "numeric",
    autoComplete: "off",
    placeholder: ORGANICO_VIENTOS_PLACEHOLDER,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    disabled,
    title: "Escribí 8 dígitos; se formatea solo (ej. 22324312 → 2.2.3.2 - 4.3.1.2)",
    "aria-label": "Ingreso por orgánico de vientos",
  };

  if (variant === "compact") {
    return (
      <div className="flex shrink-0 items-center gap-1 min-w-0">
        <input
          {...inputProps}
          className="w-[8.75rem] sm:w-[10.5rem] text-xs border border-slate-200 p-1.5 rounded text-center font-mono tracking-tight outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="shrink-0 bg-indigo-100 text-indigo-700 p-1.5 rounded hover:bg-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed"
          title="Añadir orgánico de vientos"
        >
          <IconPlus size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 min-w-0 w-full sm:w-auto sm:flex-1 sm:max-w-[14rem]">
      <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
        Ingreso por orgánico
      </label>
      <div className="flex items-center gap-1.5">
        <input
          {...inputProps}
          className="input flex-1 min-w-0 h-[38px] py-0 text-center font-mono text-xs tracking-tight disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="shrink-0 flex items-center justify-center bg-indigo-600 text-white h-[38px] w-[38px] rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          title="Añadir orgánico de vientos"
        >
          <IconPlus size={16} />
        </button>
      </div>
    </div>
  );
}
