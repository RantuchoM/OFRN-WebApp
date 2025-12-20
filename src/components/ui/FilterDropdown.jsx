import React, { useState, useRef, useEffect } from "react";
import { IconCheck, IconChevronDown, IconSearch, IconX } from "./Icons";

export default function FilterDropdown({
  label,
  options = [],
  selectedIds = [],
  onChange,
  placeholder = "Seleccionar...",
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (id) => {
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter(item => item !== id)
      : [...selectedIds, id];
    onChange(newSelection);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">{label}</label>}
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border border-slate-300 hover:border-indigo-400 text-slate-700 text-xs rounded-lg px-3 py-2 transition-all shadow-sm"
      >
        <span className="truncate">
          {selectedIds.length === 0 
            ? placeholder 
            : `${selectedIds.length} seleccionado${selectedIds.length > 1 ? 's' : ''}`
          }
        </span>
        <IconChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[200px]">
          
          {/* Search Bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <IconSearch size={12} className="absolute left-2 top-1.5 text-slate-400"/>
              <input 
                type="text" 
                className="w-full pl-6 pr-2 py-1 text-xs border border-slate-200 rounded focus:border-indigo-400 outline-none"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-center text-xs text-slate-400 italic">No hay resultados</div>
            ) : (
              <div className="space-y-0.5">
                {filteredOptions.map((opt) => {
                  const isSelected = selectedIds.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleToggle(opt.id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                        isSelected 
                          ? "bg-indigo-50 text-indigo-900 font-medium" 
                          : "hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                        {isSelected && <IconCheck size={10} className="text-white"/>}
                      </div>
                      <span className="truncate">{opt.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {selectedIds.length > 0 && (
             <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                <button 
                  onClick={() => onChange([])}
                  className="text-[10px] text-red-500 hover:text-red-700 hover:underline flex items-center justify-center gap-1 w-full"
                >
                   <IconX size={10}/> Limpiar selección
                </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
}