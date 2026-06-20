import React from "react";
import { createPortal } from "react-dom";
import { IconAlertTriangle, IconLoader, IconX } from "./Icons";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  messageIsHtml = false,
  errorMessage = null,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmClassName = "px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98]",
  overlayClassName = "z-[100]",
  confirmLoading = false,
  loadingText = "Procesando…",
  secondaryAction = null,
}) {
  if (!isOpen) return null;

  const busy = !!confirmLoading;

  const handleConfirm = async () => {
    if (busy) return;
    try {
      await Promise.resolve(onConfirm?.());
      onClose();
    } catch {
      /* dejar abierto; el padre puede mostrar error inline u otro aviso */
    }
  };

  return createPortal(
    <div className={`fixed inset-0 ${overlayClassName} flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-3 sm:p-4`}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[min(90vh,36rem)] overflow-y-auto p-5 sm:p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200 border border-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-amber-100 text-amber-600 rounded-full shrink-0">
            <IconAlertTriangle size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-modal-title" className="text-base sm:text-lg font-bold text-slate-800 pr-1">
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
            {errorMessage ? (
              <p className="text-sm text-red-700 mt-3 leading-relaxed whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                {errorMessage}
              </p>
            ) : null}
            {busy && !errorMessage ? (
              <p className="text-sm text-indigo-700 mt-3 flex items-center gap-2 font-medium">
                <IconLoader size={16} className="animate-spin shrink-0" />
                {loadingText}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          {secondaryAction ? (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              disabled={busy || secondaryAction.disabled}
              className={
                secondaryAction.className ||
                "w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
              }
            >
              {secondaryAction.label}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${confirmClassName}`}
          >
            {busy ? <IconLoader size={16} className="animate-spin shrink-0" /> : null}
            {busy ? loadingText : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}