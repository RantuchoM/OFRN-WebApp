import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { IconMap, IconChevronDown, IconCheck } from "../ui/Icons";

const MENU_MAX_H = 250;

export default function LocationMultiSelect({
  locations,
  selectedIds,
  onChange,
  showLabel = true,
  buttonClassName = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropUp = spaceBelow < MENU_MAX_H + 8 && rect.top > spaceBelow;
    const width = Math.max(rect.width, 180);
    setMenuStyle({
      position: "fixed",
      left: Math.min(rect.left, window.innerWidth - width - 8),
      width,
      top: dropUp ? undefined : rect.bottom + 4,
      bottom: dropUp ? window.innerHeight - rect.top + 4 : undefined,
      maxHeight: MENU_MAX_H,
      zIndex: 200,
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("resize", onScrollOrResize);
    // capture: overflow containers also scroll
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        buttonRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleSelection = (id) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    onChange(newSelection);
  };

  const count = selectedIds.size;

  return (
    <div className="relative">
      {showLabel && (
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
          Localía
        </label>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 p-2 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-colors text-left ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <IconMap size={16} className="text-slate-400 shrink-0" />
          <span
            className={`text-sm truncate ${count === 0 ? "text-slate-400" : "text-slate-700"}`}
          >
            {count === 0
              ? "Seleccionar localidades..."
              : `${count} localidad(es)`}
          </span>
        </div>
        <IconChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen &&
        menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            className="location-multiselect-portal bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col"
            style={menuStyle}
          >
            <div className="overflow-y-auto p-1 space-y-0.5">
              {locations.map((loc) => {
                const checked = selectedIds.has(loc.id);
                return (
                  <label
                    key={loc.id}
                    className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checked}
                      onChange={() => toggleSelection(loc.id)}
                    />
                    <div
                      className={`w-4 h-4 border border-slate-300 rounded flex items-center justify-center transition-colors group-hover:border-indigo-400 shrink-0 ${
                        checked
                          ? "bg-indigo-600 border-indigo-600"
                          : "bg-white"
                      }`}
                    >
                      <IconCheck
                        size={10}
                        className={`text-white ${checked ? "block" : "hidden"}`}
                      />
                    </div>
                    <span className="text-sm text-slate-700 truncate">
                      {loc.localidad}
                    </span>
                  </label>
                );
              })}
              {locations.length === 0 && (
                <div className="p-3 text-xs text-slate-400 text-center">
                  No hay localidades cargadas.
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
