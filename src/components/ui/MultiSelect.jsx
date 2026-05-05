import React from 'react';
import { IconX, IconCheckCircle } from './Icons';

export default function MultiSelect({
  options = [],
  selectedIds = [],
  onChange,
  label,
  placeholder = "Seleccionar...",
  /** Controles por opción (ej. enlaces); debe usar stopPropagation en clicks si no debe togglear la selección). */
  optionTrailingActions,
  showChips = true,
}) {
  
  const handleToggle = (id) => {
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter(item => item !== id) // Quitar
      : [...selectedIds, id]; // Agregar
    onChange(newSelection);
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>}
      
      <div className="border border-slate-300 rounded p-2 bg-white max-h-40 overflow-y-auto scrollbar-thin">
        {options.length === 0 ? (
          <div className="text-xs text-slate-400 italic p-1">No hay opciones disponibles</div>
        ) : (
          <div className="space-y-1">
            {options.map((opt) => {
              const isSelected = selectedIds.includes(opt.id);
              return (
                <div 
                  key={opt.id} 
                  onClick={() => handleToggle(opt.id)}
                  title={opt?.tooltip || opt?.title || undefined}
                  className={`flex items-center justify-between gap-2 p-1.5 rounded cursor-pointer text-xs transition-colors ${isSelected ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={`font-medium ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                      {opt.label}
                    </span>
                    {opt.subLabel && <span className="text-[9px] text-slate-400">{opt.subLabel}</span>}
                  </div>
                  {opt.suffix != null && opt.suffix !== "" && (
                    <span className="shrink-0 font-mono text-[10px] text-slate-600 tabular-nums">
                      {opt.suffix}
                    </span>
                  )}
                  {typeof optionTrailingActions === "function" && (
                    <div
                      className="flex items-center gap-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {optionTrailingActions(opt)}
                    </div>
                  )}
                  {isSelected && <IconCheckCircle size={14} className="text-indigo-600 shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {showChips && (
        <div className="flex flex-wrap gap-1 mt-1 min-h-[24px]">
          {options
            .filter((o) => selectedIds.includes(o.id))
            .map((o) => (
              <span
                key={o.id}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 animate-in fade-in zoom-in duration-200 ${
                  o.badgeClass || ""
                }`}
                title={o?.tooltip || o?.title || undefined}
              >
                <span className="truncate max-w-[220px]">{o.label}</span>
                {o.suffix != null && o.suffix !== "" && (
                  <span className="font-mono text-[9px] text-indigo-900/80 tabular-nums shrink-0">
                    {o.suffix}
                  </span>
                )}
                <button
                  onClick={() => handleToggle(o.id)}
                  className="hover:text-indigo-900 rounded-full p-0.5"
                >
                  <IconX size={10} />
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}