import React from "react";
import { IconCopy, IconEdit } from "../ui/Icons";

export default function ManualOpenChoiceModal({
  open,
  label,
  type = "viatico",
  onClose,
  onEditOriginal,
  onDuplicate,
}) {
  if (!open) return null;

  const noun = type === "viatico" ? "viático" : "rendición";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-800">¿Cómo querés abrirlo?</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2" title={label}>
              {label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <button
          type="button"
          onClick={onEditOriginal}
          className="w-full text-left rounded-xl border-2 border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50 p-4 transition group"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-indigo-600">
              <IconEdit size={20} />
            </span>
            <div>
              <p className="text-sm font-black text-indigo-900">Editar el original</p>
              <p className="text-xs text-indigo-800/80 mt-1 leading-relaxed">
                Los cambios se guardan sobre este {noun}. Ideal si querés corregir o completar el mismo
                registro.
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onDuplicate}
          className="w-full text-left rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-4 transition group"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-slate-600">
              <IconCopy size={20} />
            </span>
            <div>
              <p className="text-sm font-black text-slate-800">Duplicar</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Creás una copia independiente. Al guardar, se genera un {noun} nuevo sin modificar el
                original.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
