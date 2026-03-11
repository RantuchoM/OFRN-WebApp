import React, { useState, useEffect, useRef } from "react";
import { IconChevronDown, IconCheck } from "./Icons";

export default function MultiSelect({
  options = [],
  value = [], // Espera un Array
  onChange,
  label,
  placeholder = "Seleccionar...",
  compact = false,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleOption = (val) => {
    const newValue = value.includes(val)
      ? value.filter((item) => item !== val) // Quitar
      : [...value, val]; // Agregar
    onChange(newValue);
  };

  // Texto dinámico para el botón
  const getButtonText = () => {
    if (value.length === 0) return compact ? (label || placeholder) : placeholder;
    if (value.length === options.length && options.length > 0) return "Todos";
    if (compact) {
      if (label) return `${label} (${value.length})`;
      return `${value.length} seleccionados`;
    }
    
    // Si hay pocos seleccionados (ej: 1 o 2), mostramos sus nombres
    if (value.length === 1) {
       return options.find(o => o.value === value[0])?.label || value[0];
    }
    return `${value.length} seleccionados`;
  };

  return (
    <div
      className={`relative ${compact ? "inline-block" : "w-full"} ${className}`}
      ref={dropdownRef}
    >
      {/* Label superior (solo en modo no-compacto) */}
      {!compact && label && (
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
          {label}
        </label>
      )}

      {/* Botón Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between bg-white border border-slate-300 rounded 
          transition-colors hover:border-indigo-400
          ${
            compact
              ? "px-3 py-1.5 text-xs font-bold h-[34px]"
              : "w-full p-2 text-sm"
          }
        `}
      >
        <span
          className={`truncate ${
            value.length > 0
              ? "text-indigo-700 font-bold"
              : "text-slate-500 font-medium"
          }`}
        >
          {getButtonText()}
        </span>
        <IconChevronDown
          size={14}
          className={`text-slate-400 ml-2 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute top-full left-0 min-w-[180px] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[100] max-h-60 overflow-y-auto p-1 animate-in fade-in zoom-in-95">
          {options.length === 0 ? (
            <div className="p-2 text-xs text-slate-400 text-center">
              Sin opciones
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center px-1 pb-1 mb-1 border-b border-slate-100 text-[10px] text-slate-500">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(options.map((o) => o.value));
                  }}
                  className="hover:text-indigo-600"
                >
                  Seleccionar todos
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                  className="hover:text-indigo-600"
                >
                  Limpiar
                </button>
              </div>
              {options.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`
                      flex items-center gap-2 p-2 rounded cursor-pointer text-xs select-none
                      transition-colors
                      ${
                        isSelected
                          ? "bg-indigo-50 text-indigo-700 font-bold"
                          : "hover:bg-slate-50 text-slate-600"
                      }
                    `}
                  >
                    <div
                      className={`
                        w-4 h-4 border rounded flex items-center justify-center shrink-0 transition-all
                        ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-600"
                            : "border-slate-300 bg-white"
                        }
                      `}
                    >
                      {isSelected && (
                        <IconCheck
                          size={10}
                          className="text-white"
                          strokeWidth={4}
                        />
                      )}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}