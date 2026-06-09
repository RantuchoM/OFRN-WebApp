import React from "react";
import { IconFilePlus, IconTrash } from "../ui/Icons";

export default function ManualClearChoiceModal({
  open,
  type = "viatico",
  onClose,
  onNew,
  onDeleteCurrent,
  deleting = false,
}) {
  if (!open) return null;

  const noun = type === "viatico" ? "viático" : "rendición";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-800">
              ¿Deseás generar un {noun} nuevo o borrar el actual?
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Elegí si querés empezar una planilla en blanco o eliminar el registro que estás editando.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none disabled:opacity-40"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <button
          type="button"
          onClick={onNew}
          disabled={deleting}
          className="w-full text-left rounded-xl border-2 border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50 p-4 transition disabled:opacity-50"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-indigo-600">
              <IconFilePlus size={20} />
            </span>
            <div>
              <p className="text-sm font-black text-indigo-900">Generar {noun} nuevo</p>
              <p className="text-xs text-indigo-800/80 mt-1 leading-relaxed">
                Planilla en blanco para cargar otro caso. Si tenés un guardado en la nube, no se modifica
                ni se elimina.
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onDeleteCurrent}
          disabled={deleting}
          className="w-full text-left rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-50 p-4 transition disabled:opacity-50"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-rose-600">
              <IconTrash size={20} />
            </span>
            <div>
              <p className="text-sm font-black text-rose-900">Borrar el actual</p>
              <p className="text-xs text-rose-800/80 mt-1 leading-relaxed">
                Se limpia la planilla y, si corresponde, se elimina el registro guardado en la nube.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
