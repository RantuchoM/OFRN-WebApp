import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconChevronDown, IconCheck } from "./Icons";

export default function MultiSelect({
  options = [],
  value = [], // Espera un Array
  onChange,
  label,
  placeholder = "Seleccionar...",
  compact = false,
  className = "",
  /** "count" (default) → "Grupos (2)"; "names" → "Grupo 1 + Grupo 2" */
  summaryMode = "count",
  /** Máx. nombres visibles en summaryMode="names" antes de "+k". */
  summaryMaxNames = 3,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const updateMenuPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropUp = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
    const width = Math.max(rect.width, 180);

    setMenuStyle({
      position: "fixed",
      left: Math.min(rect.left, window.innerWidth - width - 8),
      width,
      zIndex: 150,
      ...(dropUp
        ? { top: "auto", bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4, bottom: "auto" }),
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuStyle(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  // Cerrar al hacer clic fuera (trigger + menú en portal)
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const toggleOption = (val) => {
    const newValue = value.includes(val)
      ? value.filter((item) => item !== val)
      : [...value, val];
    onChange(newValue);
  };

  const selectedLabels = () =>
    value
      .map(
        (v) =>
          options.find((o) => o.value === v || String(o.value) === String(v))
            ?.label,
      )
      .filter(Boolean);

  const getButtonText = () => {
    if (value.length === 0) return compact ? (label || placeholder) : placeholder;
    // En mode names no usar "Todos": se confunde con vacío (= sin filtro, se ve todo).
    if (
      summaryMode !== "names" &&
      value.length === options.length &&
      options.length > 0
    ) {
      return "Todos";
    }

    if (summaryMode === "names") {
      const labels = selectedLabels();
      if (labels.length === 0) {
        return compact && label
          ? `${label} (${value.length})`
          : `${value.length} seleccionados`;
      }
      if (labels.length <= summaryMaxNames) return labels.join(" + ");
      const shown = labels.slice(0, summaryMaxNames);
      return `${shown.join(" + ")} +${labels.length - summaryMaxNames}`;
    }

    if (compact) {
      if (label) return `${label} (${value.length})`;
      return `${value.length} seleccionados`;
    }

    if (value.length === 1) {
      return options.find((o) => o.value === value[0])?.label || value[0];
    }
    return `${value.length} seleccionados`;
  };

  const buttonTitle =
    summaryMode === "names" && value.length > 0
      ? selectedLabels().join(" + ") || undefined
      : undefined;

  const menu =
    isOpen &&
    menuStyle &&
    createPortal(
      <div
        ref={menuRef}
        className="multiselect-portal bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto p-1 animate-in fade-in zoom-in-95"
        style={menuStyle}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
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
              const isSelected =
                value.includes(opt.value) ||
                value.some((v) => String(v) === String(opt.value));
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
      </div>,
      document.body,
    );

  return (
    <div
      className={`relative ${compact ? "inline-block" : "w-full"} ${className}`}
      ref={triggerRef}
    >
      {!compact && label && (
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={buttonTitle}
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

      {menu}
    </div>
  );
}
