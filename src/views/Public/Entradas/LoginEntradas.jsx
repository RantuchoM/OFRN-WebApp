import React, { useMemo, useState } from "react";
import { supabase } from "../../../services/supabase";
import { ensureEntradaProfile } from "../../../services/entradaService";

const initialProfile = { nombre: "", apellido: "" };

export default function LoginEntradas({ user, profile, onProfileSaved, bootError = "" }) {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [form, setForm] = useState(initialProfile);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const needsProfile = useMemo(() => Boolean(user) && !profile, [user, profile]);

  const sendOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSending(true);
    const normalizedEmail = email.trim().toLowerCase();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: true },
    });
    setSending(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setOtpSent(true);
    setEmail(normalizedEmail);
    setMessage("Te enviamos un código de acceso por email.");
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setVerifying(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otpCode.trim(),
      type: "email",
    });
    setVerifying(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    setMessage("Código validado correctamente.");
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    try {
      await ensureEntradaProfile(form);
      onProfileSaved?.();
    } catch (saveError) {
      setError(saveError?.message || "No se pudo guardar el perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="text-center space-y-2">
          <img
            src="/pictures/ofrn.jpg"
            alt="Logo OFRN"
            className="h-16 w-auto max-w-[220px] rounded-xl object-contain mx-auto border border-slate-200 bg-white p-1"
          />
          <h1 className="text-xl font-extrabold text-slate-800">Entradas OFRN</h1>
          <p className="text-sm text-slate-500">Reservá tus entradas gratuitas con código por email.</p>
        </div>

        {!user && (
          <>
            <form className="space-y-2" onSubmit={sendOtp}>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="tu.mail@dominio.com"
              />
              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="w-full rounded-lg bg-blue-700 text-white text-sm font-semibold py-2 disabled:bg-slate-300"
              >
                {sending ? "Enviando..." : "Enviar código"}
              </button>
            </form>

            {otpSent && (
              <form className="space-y-2" onSubmit={verifyOtp}>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Código OTP (6 a 8 dígitos)
                </label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(event) =>
                    setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  maxLength={8}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tracking-[0.3em] text-center focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="12345678"
                />
                <button
                  type="submit"
                  disabled={
                    verifying ||
                    otpCode.trim().length < 6 ||
                    otpCode.trim().length > 8
                  }
                  className="w-full rounded-lg bg-slate-800 text-white text-sm font-semibold py-2 disabled:bg-slate-300"
                >
                  {verifying ? "Validando..." : "Validar"}
                </button>
                <p className="text-[11px] text-slate-500">
                  Si el mail trae 8 dígitos, ingresalos completos; si trae 6, alcanza con 6.
                </p>
              </form>
            )}
          </>
        )}

        {needsProfile && (
          <form className="space-y-2" onSubmit={saveProfile}>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Completá tu perfil</h2>
            <input
              required
              value={form.nombre}
              onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Nombre"
            />
            <input
              required
              value={form.apellido}
              onChange={(event) => setForm((prev) => ({ ...prev, apellido: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Apellido"
            />
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full rounded-lg bg-blue-700 text-white text-sm font-semibold py-2 disabled:bg-slate-300"
            >
              {savingProfile ? "Guardando..." : "Guardar perfil"}
            </button>
          </form>
        )}

        {bootError && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{bootError}</div>}
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
        {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</div>}
      </div>
    </div>
  );
}
