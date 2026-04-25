import React from "react";
import { IconAlertTriangle, IconX } from "./Icons";

/**
 * Aviso de una acción, mismo contenedor estético que {@link ./ConfirmModal.jsx}.
 */
export default function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  messageIsHtml = false,
  buttonText = "Aceptar",
  /** P. ej. `z-[110]` si se muestra encima de otro modal a z-[100]. */
  overlayZClass = "z-[100]",
  /** Ancho del panel (p. ej. `max-w-lg` para textos largos). */
  panelClassName = "max-w-md",
}) {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${overlayZClass} flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-3 sm:p-4`}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${panelClassName} max-h-[min(90vh,36rem)] overflow-y-auto p-5 sm:p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200 border border-slate-100`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-amber-100 text-amber-600 rounded-full shrink-0">
            <IconAlertTriangle size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="alert-modal-title" className="text-base sm:text-lg font-bold text-slate-800 pr-1">
              {title}
            </h3>
            {messageIsHtml ? (
              <p
                className="text-sm text-slate-500 mt-2 leading-relaxed whitespace-pre-line [&_strong]:font-bold [&_strong]:text-slate-800"
                dangerouslySetInnerHTML={{ __html: message }}
              />
            ) : (
              <p className="text-sm text-slate-500 mt-2 leading-relaxed whitespace-pre-line">{message}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition-all active:scale-[0.98]"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
