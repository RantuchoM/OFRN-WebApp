import React from 'react';
import { IconX, IconCheckCircle } from './Icons';

export default function MultiSelect({ 
  options = [], 
  selectedIds = [], 
  onChange, 
  label, 
  placeholder = "Seleccionar..." 
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
                  className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-xs transition-colors ${isSelected ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex flex-col">
                    <span className={`font-medium ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                      {opt.label}
                    </span>
                    {opt.subLabel && <span className="text-[9px] text-slate-400">{opt.subLabel}</span>}
                  </div>
                  {isSelected && <IconCheckCircle size={14} className="text-indigo-600" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Chips de selección */}
      <div className="flex flex-wrap gap-1 mt-1 min-h-[24px]">
        {options.filter(o => selectedIds.includes(o.id)).map(o => (
          <span key={o.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 animate-in fade-in zoom-in duration-200">
            {o.label}
            <button onClick={() => handleToggle(o.id)} className="hover:text-indigo-900 rounded-full p-0.5"><IconX size={10}/></button>
          </span>
        ))}
      </div>
    </div>
  );
}