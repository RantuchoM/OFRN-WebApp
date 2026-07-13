import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ChoferPickerDropdown({
  anchorRef,
  isOpen,
  search,
  onSearchChange,
  options,
  currentChoferId,
  onSelect,
}) {
  const [dropdownStyle, setDropdownStyle] = useState(null);

  useEffect(() => {
    if (!isOpen || !anchorRef?.current) return;

    const updatePosition = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const estimatedHeight = 280;
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropUp =
        spaceBelow < estimatedHeight && rect.top > estimatedHeight;

      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        width: Math.max(rect.width, 288),
        zIndex: 150,
        ...(dropUp
          ? {
              top: "auto",
              bottom: window.innerHeight - rect.top + 4,
            }
          : {
              top: rect.bottom + 4,
              bottom: "auto",
            }),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, anchorRef]);

  if (!isOpen || !dropdownStyle) return null;

  const query = String(search || "").toLowerCase();
  const filteredOptions = options.filter((c) => {
    const haystack = `${c.label} ${c.dni || ""}`.toLowerCase();
    return haystack.includes(query);
  });

  return createPortal(
    <div
      className="chofer-picker-portal rounded-xl border border-slate-200 bg-white shadow-2xl p-2"
      style={dropdownStyle}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Buscar chofer..."
        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
        autoFocus
      />
      <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
        <button
          type="button"
          onClick={() => onSelect("")}
          className={`w-full text-left rounded-md px-2 py-1.5 text-xs ${
            !currentChoferId
              ? "bg-slate-100 text-slate-700 font-bold"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Sin chofer
        </button>
        {filteredOptions.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onSelect(c.value)}
            className={`w-full text-left rounded-md px-2 py-1.5 text-xs ${
              String(currentChoferId || "") === String(c.value)
                ? "bg-emerald-50 text-emerald-700 font-bold"
                : "text-slate-700 hover:bg-indigo-50"
            }`}
          >
            {c.label} {c.dni ? `(${c.dni})` : ""}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
