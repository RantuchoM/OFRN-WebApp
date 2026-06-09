import React, { useEffect, useState } from "react";
import { IconCloudUpload, IconLoader, IconX } from "../ui/Icons";

export default function ManualSaveLabelDialog({
  isOpen,
  onClose,
  onConfirm,
  displayName,
  type = "viatico",
  initialDescriptive = "",
  saving = false,
}) {
  const [descriptive, setDescriptive] = useState(initialDescriptive);

  useEffect(() => {
    if (isOpen) setDescriptive(initialDescriptive);
  }, [isOpen, initialDescriptive]);

  if (!isOpen) return null;

  const noun = type === "viatico" ? "viático" : "rendición";

  const handleConfirm = async () => {
    if (saving) return;
    await Promise.resolve(onConfirm?.(descriptive.trim()));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-100 p-5 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-full shrink-0">
            <IconCloudUpload size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-black text-slate-800">
              Guardar {noun} en la nube
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              El nombre se calcula automáticamente. Podés agregar una etiqueta descriptiva opcional.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-600 shrink-0 disabled:opacity-40"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Nombre del registro
            </label>
            <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800">
              {displayName}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Apellido, nombre y fecha de inicio del {noun}.
            </p>
          </div>

          <div>
            <label
              htmlFor="manual-save-descriptive"
              className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
            >
              Etiqueta descriptiva (opcional)
            </label>
            <input
              id="manual-save-descriptive"
              type="text"
              value={descriptive}
              onChange={(e) => setDescriptive(e.target.value)}
              placeholder="Ej. Comisión Cutral-Có, segunda versión…"
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
              disabled={saving}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-60"
          >
            {saving ? <IconLoader size={16} className="animate-spin" /> : null}
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
