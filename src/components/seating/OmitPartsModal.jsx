import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IconAlertTriangle, IconCheckCircle, IconX } from "../ui/Icons";

const partLabel = (part) =>
  (part?.nombre_archivo || part?.instrumentos?.instrumento || "Particella").replace(
    /\.(pdf|docx?)$/i,
    "",
  );

/**
 * Modal para omitir (o restaurar) particellas pendientes en un programa.
 * mode="omit": solo partes sin asignar. mode="restore": solo ya omitidas.
 */
export default function OmitPartsModal({
  isOpen,
  onClose,
  onConfirm,
  mode = "omit",
  obraTitle = "",
  parts = [],
  saving = false,
}) {
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    if (!isOpen) return;
    setSelected(new Set());
  }, [isOpen, mode, parts]);

  useEffect(() => {
    if (!isOpen || !onClose) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const sortedParts = useMemo(
    () =>
      [...(parts || [])].sort((a, b) =>
        partLabel(a).localeCompare(partLabel(b), "es"),
      ),
    [parts],
  );

  if (!isOpen || typeof document === "undefined") return null;

  const isRestore = mode === "restore";
  const title = isRestore ? "Partes omitidas" : "Omitir partes";
  const subtitle = isRestore
    ? "Estas partes no se tocan en este programa. Desmarcá para volver a exigirlas."
    : "Las partes seleccionadas no se tocarán en este programa y dejarán de contar en el requerido.";
  const confirmLabel = isRestore
    ? "Restaurar seleccionadas"
    : "Omitir seleccionadas";

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === sortedParts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedParts.map((p) => p.id)));
    }
  };

  const handleConfirm = () => {
    if (selected.size === 0) return;
    onConfirm?.([...selected]);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="omit-parts-title"
        className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 flex flex-col max-h-[80vh]"
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="omit-parts-title"
              className="text-sm font-bold text-slate-800 flex items-center gap-2"
            >
              {isRestore ? (
                <IconCheckCircle size={16} className="text-sky-600 shrink-0" />
              ) : (
                <IconAlertTriangle size={16} className="text-amber-500 shrink-0" />
              )}
              {title}
            </h3>
            {obraTitle ? (
              <p
                className="text-xs text-slate-500 mt-0.5 truncate"
                title={obraTitle}
                dangerouslySetInnerHTML={{ __html: obraTitle }}
              />
            ) : null}
            <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 shrink-0"
            aria-label="Cerrar"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={toggleAll}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
            disabled={sortedParts.length === 0}
          >
            {selected.size === sortedParts.length && sortedParts.length > 0
              ? "Deseleccionar todas"
              : "Seleccionar todas"}
          </button>
          <span className="text-[10px] text-slate-400 font-medium">
            {selected.size}/{sortedParts.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-[120px]">
          {sortedParts.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              {isRestore
                ? "No hay partes omitidas en esta obra."
                : "No hay partes pendientes de asignar."}
            </p>
          ) : (
            <ul className="space-y-1">
              {sortedParts.map((part) => {
                const id = part.id;
                const checked = selected.has(id);
                const label = partLabel(part);
                return (
                  <li key={id}>
                    <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        checked={checked}
                        onChange={() => toggle(id)}
                      />
                      <span className="text-sm text-slate-800 truncate" title={label}>
                        {label}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || selected.size === 0}
            className={`px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isRestore
                ? "bg-slate-700 hover:bg-slate-800"
                : "bg-sky-600 hover:bg-sky-700"
            }`}
          >
            {saving ? "Guardando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
