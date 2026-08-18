import React, { useState } from "react";
import { IconEye, IconEyeOff } from "../ui/Icons";
import { setEntradasPassword, validateEntradasPassword } from "../../services/entradaService";

export default function EntradasSetPasswordForm({
  ui,
  isDark,
  title = "Definí tu contraseña",
  hint = "Mínimo 8 caracteres. Es opcional: también podés entrar con el enlace del mail.",
  submitLabel = "Guardar contraseña",
  onSaved,
  onSkip = null,
  skipLabel = "Ahora no",
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const invalid = validateEntradasPassword(password);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSaving(true);
    try {
      const profile = await setEntradasPassword(password);
      onSaved?.(profile);
    } catch (saveError) {
      setError(saveError?.message || "No se pudo guardar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      {title ? <h2 className={`text-sm font-bold uppercase tracking-wide ${ui.textSoft}`}>{title}</h2> : null}
      {hint && <p className={`text-xs ${ui.textMuted}`}>{hint}</p>}
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={`${ui.input} pr-10`}
          placeholder="Nueva contraseña"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400"
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
        </button>
      </div>
      <input
        type={show ? "text" : "password"}
        required
        autoComplete="new-password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        className={ui.input}
        placeholder="Repetir contraseña"
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
      <button type="submit" disabled={saving} className={ui.btnPrimary}>
        {saving ? "Guardando..." : submitLabel}
      </button>
      {onSkip && (
        <button type="button" onClick={onSkip} className={ui.btnGhost}>
          {skipLabel}
        </button>
      )}
    </form>
  );
}
