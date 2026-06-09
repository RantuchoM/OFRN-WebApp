import React from "react";
import { IconFilePlus, IconUserCheck } from "../ui/Icons";

export default function ManualPersonaChoiceModal({
  open,
  label,
  onClose,
  onImport,
  onCreateNew,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-800">
              ¿Editar datos generales o elegir otra persona?
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2" title={label}>
              Persona seleccionada: {label}
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
          onClick={onImport}
          className="w-full text-left rounded-xl border-2 border-sky-200 bg-sky-50/70 hover:bg-sky-50 p-4 transition"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-sky-600">
              <IconUserCheck size={20} />
            </span>
            <div>
              <p className="text-sm font-black text-sky-900">Editar datos generales</p>
              <p className="text-xs text-sky-800/80 mt-1 leading-relaxed">
                Cargá los datos guardados de esta persona en la planilla para revisarlos y actualizarlos en la base.
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onCreateNew}
          className="w-full text-left rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-4 transition"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-slate-600">
              <IconFilePlus size={20} />
            </span>
            <div>
              <p className="text-sm font-black text-slate-800">Elegir otra persona nueva</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Limpiá los datos personales y cargá otra persona en la planilla.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
