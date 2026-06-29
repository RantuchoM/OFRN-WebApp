import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconLoader } from "../ui/Icons";

export default function SandboxApplyModal({
  open,
  mode,
  giraLabels,
  addedMusiciansCount,
  giraCount,
  busy,
  onConfirm,
  onCancel,
}) {
  const [motivo, setMotivo] = useState("");
  const [notify, setNotify] = useState(true);

  useEffect(() => {
    if (open) {
      setMotivo("");
      setNotify(true);
    }
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const title =
    mode === "all"
      ? `Aplicar todos los borradores (${giraCount} gira${giraCount === 1 ? "" : "s"})`
      : "Aplicar cambios de esta gira";

  const canConfirm = motivo.trim().length > 0 && !busy;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-4 space-y-3">
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        {giraLabels?.length > 0 && mode === "all" && (
          <ul className="text-[11px] text-slate-600 max-h-24 overflow-y-auto list-disc pl-4 space-y-0.5">
            {giraLabels.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-600">
          Los cambios pasan a producción (
          <code className="text-[10px]">giras_fuentes</code> /{" "}
          <code className="text-[10px]">giras_integrantes</code>
          ).
          {addedMusiciansCount > 0 && notify && (
            <>
              {" "}
              Se notificará por mail a{" "}
              <strong>{addedMusiciansCount}</strong> músico
              {addedMusiciansCount === 1 ? "" : "s"} nuevo
              {addedMusiciansCount === 1 ? "" : "s"} con el motivo indicado.
            </>
          )}
        </p>
        <div>
          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
            Motivo de convocatoria (único para todos)
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Ej.: Convocatoria por balance de servicios del semestre…"
            className="w-full text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-violet-500 outline-none resize-y"
          />
        </div>
        {addedMusiciansCount > 0 && (
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="rounded text-violet-600"
            />
            Enviar notificación de alta a músicos agregados
          </label>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ motivo: motivo.trim(), notify })}
            disabled={!canConfirm}
            className="px-3 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50 inline-flex items-center gap-1"
          >
            {busy && <IconLoader size={12} className="animate-spin" />}
            {busy ? "Aplicando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
