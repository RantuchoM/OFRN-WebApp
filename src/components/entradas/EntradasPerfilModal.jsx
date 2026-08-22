import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { IconUser, IconX } from "../ui/Icons";
import { updateEntradaProfile } from "../../services/entradaService";
import EntradasSetPasswordForm from "./EntradasSetPasswordForm";

export default function EntradasPerfilModal({
  isOpen,
  onClose,
  ui,
  isDark,
  profile,
  hasPassword,
  onSaved,
}) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setNombre(String(profile?.nombre || "").trim());
    setApellido(String(profile?.apellido || "").trim());
    setError("");
  }, [isOpen, profile?.nombre, profile?.apellido]);

  if (!isOpen) return null;

  const handleSaveNombre = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const next = await updateEntradaProfile({ nombre, apellido });
      onSaved?.(next);
      toast.success("Perfil actualizado.");
    } catch (e) {
      setError(e?.message || "No se pudo guardar el nombre.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`w-full max-w-md max-h-[min(90vh,40rem)] overflow-y-auto rounded-xl border p-5 sm:p-6 shadow-2xl ${
          isDark ? "border-slate-700 bg-slate-800" : "border-slate-100 bg-white"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entradas-perfil-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <IconUser size={18} className={isDark ? "text-slate-300" : "text-slate-600"} />
            <h2
              id="entradas-perfil-modal-title"
              className={`text-sm font-bold uppercase tracking-wide ${ui.textStrong}`}
            >
              Mi perfil
            </h2>
          </div>
          <button type="button" onClick={onClose} className={ui.btnIcon} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>

        {profile?.email && (
          <p className={`mb-3 text-xs ${ui.textMuted}`}>{profile.email}</p>
        )}

        <form className="space-y-2" onSubmit={handleSaveNombre}>
          <p className={`text-[10px] font-bold uppercase tracking-wide ${ui.textMuted}`}>Datos</p>
          <input
            type="text"
            required
            autoComplete="family-name"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            className={ui.input}
            placeholder="Apellido"
            aria-label="Apellido"
          />
          <input
            type="text"
            required
            autoComplete="given-name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={ui.input}
            placeholder="Nombre"
            aria-label="Nombre"
          />
          {error && (
            <div
              className={
                isDark
                  ? "rounded-md border border-rose-800 bg-rose-950/50 px-3 py-2 text-xs text-rose-200"
                  : "rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
              }
            >
              {error}
            </div>
          )}
          <button type="submit" disabled={saving} className={`${ui.btnPrimary} disabled:opacity-50`}>
            {saving ? "Guardando…" : "Guardar nombre"}
          </button>
        </form>

        <div className={`my-4 border-t ${isDark ? "border-slate-600" : "border-slate-200"}`} />

        <EntradasSetPasswordForm
          ui={ui}
          isDark={isDark}
          title={hasPassword ? "Cambiar contraseña" : "Definir contraseña"}
          hint={
            hasPassword
              ? "La nueva contraseña reemplaza la anterior. Seguí pudiendo entrar con el enlace del mail."
              : "Es opcional. Si no definís una, entrá con el enlace que te mandamos al mail."
          }
          submitLabel={hasPassword ? "Actualizar contraseña" : "Guardar contraseña"}
          onSaved={(nextProfile) => {
            onSaved?.(nextProfile);
            toast.success(hasPassword ? "Contraseña actualizada." : "Contraseña guardada.");
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
