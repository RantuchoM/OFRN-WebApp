import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconX } from "../ui/Icons";

function formatMotivoTs(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}

export default function RosterMotivoModal({
  musician,
  isEditor,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (musician) setDraft(musician.motivo_estado || "");
  }, [musician?.id, musician?.motivo_estado]);

  if (!musician) return null;

  const nombre =
    musician.nombre_completo ||
    `${musician.apellido || ""}, ${musician.nombre || ""}`.trim();

  const handleSave = async () => {
    if (!isEditor || !onSave) return;
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const tsLabel = formatMotivoTs(musician.motivo_estado_actualizado_at);

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-motivo-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-amber-50/80">
          <div className="min-w-0">
            <h2
              id="roster-motivo-title"
              className="text-sm font-bold text-slate-800"
            >
              Motivo en roster
            </h2>
            <p className="text-xs text-slate-600 truncate mt-0.5" title={nombre}>
              {nombre}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:bg-white/80 hover:text-slate-800 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[11px] text-slate-500 leading-snug">
            Nota interna sobre la convocatoria manual o el marcado como ausente
            (visible solo en gestión de gira).
          </p>
          {tsLabel && (
            <p className="text-[10px] text-slate-400 font-medium">
              Última actualización: {tsLabel}
            </p>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!isEditor}
            rows={5}
            placeholder={
              isEditor
                ? "Ej.: reemplazo último momento, enfermedad, conflicto de fechas…"
                : ""
            }
            className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400/40 focus:border-amber-300 outline-none resize-y min-h-[100px] disabled:bg-slate-50 disabled:text-slate-600"
          />
        </div>

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-200/80 transition-colors"
          >
            {isEditor ? "Cancelar" : "Cerrar"}
          </button>
          {isEditor && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="text-xs font-bold px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
