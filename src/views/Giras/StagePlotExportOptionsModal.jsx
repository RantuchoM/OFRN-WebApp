import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconFileText,
  IconLoader,
  IconPhoto,
  IconX,
} from "../../components/ui/Icons";
import StagePlotOpacityControls, {
  opacitiesToStagePatch,
  readStagePlotOpacities,
} from "./StagePlotOpacityControls";

/**
 * Modal previo a descargar PDF/JPG: mismas 4 opacidades que el técnico
 * en StagePlotViewerModal. Los deslizantes son override solo de exportación
 * (no escriben el payload del Lienzo).
 */
export default function StagePlotExportOptionsModal({
  open,
  kind = "pdf",
  /** `payload.stage` actual del editor (semilla de opacidades). */
  stage,
  plotNombre,
  onClose,
  /** Recibe patch de stage; el padre aplica a una copia y exporta. */
  onConfirm,
  /** Por encima del editor inmersivo (`STAGE_PLOT_OVERLAY_Z`). */
  zIndex = 100,
}) {
  const [op, setOp] = useState(() => readStagePlotOpacities(stage));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOp(readStagePlotOpacities(stage));
    setBusy(false);
    // Semilla solo al abrir; no resetear si `stage` cambia por autosave.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open]);

  if (!open) return null;

  const isPdf = kind === "pdf";
  const title = isPdf ? "Descargar PDF" : "Descargar JPG";

  const handleConfirm = async () => {
    if (busy || !onConfirm) return;
    setBusy(true);
    try {
      await onConfirm(opacitiesToStagePatch(op));
      onClose?.();
    } catch {
      // El padre ya muestra toast; mantener modal abierto.
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-900/50 p-4"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
              {isPdf ? (
                <IconFileText size={18} className="text-indigo-600" />
              ) : (
                <IconPhoto size={18} className="text-indigo-600" />
              )}
              {title}
            </h2>
            <p className="truncate text-xs text-slate-500">
              {plotNombre?.trim() || "Escenario"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="space-y-3 px-4 py-3">
          <p className="text-xs text-slate-600">
            Elegí la opacidad de cada guía en la descarga (igual que en «Ver
            escenario»). 0% = oculto. No modifica el Lienzo guardado.
          </p>
          <StagePlotOpacityControls
            value={op}
            onChange={setOp}
            disabled={busy}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
              isPdf
                ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {busy ? (
              <IconLoader size={14} className="animate-spin" />
            ) : isPdf ? (
              <IconFileText size={14} />
            ) : (
              <IconPhoto size={14} />
            )}
            {isPdf ? "Descargar PDF" : "Descargar JPG"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
