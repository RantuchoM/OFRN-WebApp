import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconLoader, IconPlus, IconTrash, IconX } from "../ui/Icons";

/**
 * Modal z-[100]: editar tramos de ensayos (lunes → lunes) de la proyección.
 */
export default function ProyeccionTramosModal({
  open,
  onClose,
  anio,
  tramos = [],
  saving = false,
  onSave,
}) {
  const [draft, setDraft] = useState([]);

  useEffect(() => {
    if (!open) return;
    setDraft(
      (tramos || []).map((t) => ({
        desde: t.desde || "",
        hasta: t.hasta || "",
        nota: t.nota || "",
      })),
    );
  }, [open, tramos]);

  if (!open) return null;

  const updateRow = (idx, patch) => {
    setDraft((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  };

  const removeRow = (idx) => {
    setDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  const addRow = () => {
    const last = draft.at(-1);
    setDraft((prev) => [
      ...prev,
      {
        desde: last?.hasta || `${anio}-08-01`,
        hasta: last?.hasta || `${anio}-12-13`,
        nota: "Vacaciones / corte",
      },
    ]);
  };

  const handleSave = async () => {
    if (!draft.length) return;
    await onSave?.(draft);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose?.();
      }}
    >
      <div
        className="flex max-h-[min(90vh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Tramos de ensayos {anio}
            </h3>
            <p className="text-[11px] text-slate-500">
              Lunes → lunes. El hueco entre tramos no proyecta ensayos (p. ej.
              vacaciones).
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {draft.map((t, idx) => (
            <div
              key={`tramo-draft-${idx}`}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2"
            >
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Desde
                <input
                  type="date"
                  value={t.desde || ""}
                  disabled={saving}
                  onChange={(e) => updateRow(idx, { desde: e.target.value })}
                  className="mt-0.5 block rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                />
              </label>
              <span className="pb-2 text-[11px] text-slate-400">→</span>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Hasta
                <input
                  type="date"
                  value={t.hasta || ""}
                  disabled={saving}
                  onChange={(e) => updateRow(idx, { hasta: e.target.value })}
                  className="mt-0.5 block rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                />
              </label>
              <label className="min-w-[8rem] flex-1 text-[10px] font-bold uppercase text-slate-500">
                Nota
                <input
                  type="text"
                  value={t.nota || ""}
                  disabled={saving}
                  onChange={(e) => updateRow(idx, { nota: e.target.value })}
                  placeholder="Opcional"
                  className="mt-0.5 block w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs normal-case font-normal"
                />
              </label>
              <button
                type="button"
                disabled={saving || draft.length <= 1}
                title="Quitar tramo"
                onClick={() => removeRow(idx)}
                className="mb-0.5 rounded-md border border-rose-200 bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100 disabled:opacity-40"
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={saving}
            onClick={addRow}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-orange-300 bg-orange-50/50 px-2.5 py-1.5 text-[11px] font-bold text-orange-900 hover:bg-orange-50"
          >
            <IconPlus size={13} />
            Agregar tramo
          </button>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || !draft.length}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? <IconLoader size={13} className="animate-spin" /> : null}
            Guardar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
