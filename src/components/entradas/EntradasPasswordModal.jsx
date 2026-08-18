import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IconLock, IconX } from "../ui/Icons";
import EntradasSetPasswordForm from "./EntradasSetPasswordForm";

export default function EntradasPasswordModal({
  isOpen,
  onClose,
  ui,
  isDark,
  hasPassword,
  onSaved,
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div
        className={`w-full max-w-md rounded-xl border p-5 sm:p-6 shadow-2xl ${
          isDark ? "border-slate-700 bg-slate-800" : "border-slate-100 bg-white"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entradas-password-modal-title"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconLock size={18} className={isDark ? "text-slate-300" : "text-slate-600"} />
            <h2 id="entradas-password-modal-title" className={`text-sm font-bold uppercase tracking-wide ${ui.textStrong}`}>
              {hasPassword ? "Cambiar contraseña" : "Definir contraseña"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className={ui.btnIcon} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>
        <EntradasSetPasswordForm
          ui={ui}
          isDark={isDark}
          title=""
          hint={
            hasPassword
              ? "La nueva contraseña reemplaza la anterior. Seguí pudiendo entrar con el enlace del mail."
              : "Es opcional. Si no definís una, entrá con el enlace que te mandamos al mail."
          }
          submitLabel={hasPassword ? "Actualizar contraseña" : "Guardar contraseña"}
          onSaved={(profile) => {
            onSaved?.(profile);
            onClose();
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
