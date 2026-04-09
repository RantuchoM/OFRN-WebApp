import React, { useState, useEffect } from "react";
import { IconX, IconLoader } from "../ui/Icons";

const ESTADOS = [
  { value: "", label: "—" },
  { value: "en_proceso", label: "En proceso" },
  { value: "listo", label: "Listo" },
  { value: "compartido", label: "Compartido" },
];

export default function MassiveEditModal({
  isOpen,
  onClose,
  count,
  onApply,
}) {
  const [estado, setEstado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEstado("");
      setObservaciones("");
      setSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = async () => {
    setSaving(true);
    try {
      await onApply({ estado, observaciones: observaciones.trim() || null });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Edición masiva</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Se aplicará un nuevo registro de difusión a{" "}
            <strong>{count}</strong> concierto{count === 1 ? "" : "s"}{" "}
            seleccionado{count === 1 ? "" : "s"}.
          </p>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Estado
            </label>
            <select
              className="mt-1 w-full text-sm p-2 border border-slate-200 rounded-lg bg-white"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              {ESTADOS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Observaciones
            </label>
            <textarea
              className="mt-1 w-full text-sm p-2 border border-slate-200 rounded-lg bg-white min-h-[80px]"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleApply}
            className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <IconLoader className="animate-spin" size={14} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
