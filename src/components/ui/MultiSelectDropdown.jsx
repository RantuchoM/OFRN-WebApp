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
  /** Ancho máx. del panel (px). En compact default 320; null = sin tope. */
  menuMaxWidth = compact ? 320 : null,
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
    let width = Math.max(rect.width, 180);
    if (menuMaxWidth != null && Number.isFinite(menuMaxWidth)) {
      width = Math.min(width, menuMaxWidth);
    }

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

  const findOption = (v) =>
    options.find((o) => o.value === v || String(o.value) === String(v));

  const selectedOptions = () => value.map(findOption).filter(Boolean);

  const selectedLabels = () => selectedOptions().map((o) => o.label);

  /** Hex de 6 dígitos + alpha; si no es hex válido devuelve el color tal cual. */
  const withAlpha = (color, alpha) =>
    /^#[0-9a-f]{6}$/i.test(String(color || "")) ? `${color}${alpha}` : color;

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

  /** Chips de color en el trigger cuando las opciones traen color (grupos). */
  const triggerChips = (() => {
    if (summaryMode !== "names" || value.length === 0) return null;
    const opts = selectedOptions();
    if (opts.length === 0 || !opts.some((o) => o.color)) return null;
    return {
      shown: opts.slice(0, summaryMaxNames),
      rest: Math.max(0, opts.length - summaryMaxNames),
    };
  })();

  const menu =
    isOpen &&
    menuStyle &&
    createPortal(
      <div
        ref={menuRef}
        className="multiselect-portal bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto overflow-x-hidden p-1 animate-in fade-in zoom-in-95"
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
              const color = opt.color || null;
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className={`
                      flex items-center gap-2 p-2 rounded cursor-pointer text-xs select-none min-w-0
                      transition-colors
                      ${
                        isSelected
                          ? color
                            ? "font-bold"
                            : "bg-indigo-50 text-indigo-700 font-bold"
                          : "hover:bg-slate-50 text-slate-600"
                      }
                    `}
                  style={
                    isSelected && color
                      ? {
                          backgroundColor: withAlpha(color, "18"),
                          color,
                        }
                      : undefined
                  }
                >
                  <div
                    className={`
                        w-4 h-4 border rounded flex items-center justify-center shrink-0 transition-all
                        ${
                          isSelected
                            ? color
                              ? ""
                              : "bg-indigo-600 border-indigo-600"
                            : color
                              ? "bg-white"
                              : "border-slate-300 bg-white"
                        }
                      `}
                    style={
                      color
                        ? isSelected
                          ? { backgroundColor: color, borderColor: color }
                          : { borderColor: withAlpha(color, "88") }
                        : undefined
                    }
                  >
                    {isSelected && (
                      <IconCheck
                        size={10}
                        className="text-white"
                        strokeWidth={4}
                      />
                    )}
                  </div>
                  <span className="flex-1 min-w-0 truncate">{opt.label}</span>
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
      className={`relative ${compact ? "inline-block w-full max-w-full min-w-0" : "w-full"} ${className}`}
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
              ? "w-full min-w-0 overflow-hidden px-3 py-1.5 text-xs font-bold h-[34px]"
              : "w-full min-w-0 overflow-hidden p-2 text-sm"
          }
        `}
      >
        {triggerChips ? (
          <span className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
            {triggerChips.shown.map((opt) => (
              <span
                key={opt.value}
                className={`px-1.5 py-0.5 rounded border text-[10px] font-bold truncate ${
                  triggerChips.shown.length > 1 ? "max-w-[4.5rem]" : "max-w-[9rem]"
                }`}
                style={{
                  backgroundColor: opt.color
                    ? withAlpha(opt.color, "18")
                    : "#eef2ff",
                  borderColor: opt.color
                    ? withAlpha(opt.color, "55")
                    : "#c7d2fe",
                  color: opt.color || "#4338ca",
                }}
              >
                {opt.label}
              </span>
            ))}
            {triggerChips.rest > 0 && (
              <span className="text-[10px] font-bold text-slate-500 shrink-0">
                +{triggerChips.rest}
              </span>
            )}
          </span>
        ) : (
          <span
            className={`flex-1 min-w-0 truncate text-left ${
              value.length > 0
                ? "text-indigo-700 font-bold"
                : "text-slate-500 font-medium"
            }`}
          >
            {getButtonText()}
          </span>
        )}
        <IconChevronDown
          size={14}
          className={`text-slate-400 ml-2 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {menu}
    </div>
  );
}
