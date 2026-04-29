import React, { useMemo, useState } from "react";
import {
  ensureEntradaProfile,
  requestEntradasEmailCode,
  verifyEntradasEmailCode,
} from "../../../services/entradaService";

const initialProfile = { nombre: "", apellido: "" };
const OTP_RESEND_COOLDOWN_SECONDS = 60;

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
  const [nextOtpAllowedAt, setNextOtpAllowedAt] = useState(0);

  const needsProfile = useMemo(() => Boolean(user) && !profile, [user, profile]);

  const sendOtp = async (event) => {
    event.preventDefault();
    const now = Date.now();
    const secondsRemaining = Math.ceil((nextOtpAllowedAt - now) / 1000);
    if (secondsRemaining > 0) {
      setError(`Esperá ${secondsRemaining}s antes de pedir otro código.`);
      return;
    }
    setError("");
    setMessage("");
    setSending(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await requestEntradasEmailCode(normalizedEmail, "entradas");
    } catch (otpError) {
      const message = String(otpError?.message || "");
      if (/límite|limit|429/i.test(message)) {
        setError("Se alcanzó el límite de envíos. Esperá 60s e intentá nuevamente.");
      } else {
        setError(message || "No se pudo enviar el código.");
      }
      return;
    } finally {
      setSending(false);
    }
    setOtpSent(true);
    setEmail(normalizedEmail);
    setNextOtpAllowedAt(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000);
    setMessage("Te enviamos un código de acceso por email.");
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setVerifying(true);
    try {
      await verifyEntradasEmailCode({
        email: email.trim().toLowerCase(),
        code: otpCode.trim(),
      });
    } catch (verifyError) {
      setError(verifyError?.message || "No se pudo validar el código.");
      return;
    } finally {
      setVerifying(false);
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
                disabled={sending || !email.trim() || Date.now() < nextOtpAllowedAt}
                className="w-full rounded-lg bg-blue-700 text-white text-sm font-semibold py-2 disabled:bg-slate-300"
              >
                {sending
                  ? "Enviando..."
                  : Date.now() < nextOtpAllowedAt
                  ? "Esperá para reenviar"
                  : "Enviar código"}
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
                    otpCode.trim().length < 8 ||
                    otpCode.trim().length > 8
                  }
                  className="w-full rounded-lg bg-slate-800 text-white text-sm font-semibold py-2 disabled:bg-slate-300"
                >
                  {verifying ? "Validando..." : "Validar"}
                </button>
                <p className="text-[11px] text-slate-500">
                  Ingresá los 8 dígitos exactamente como llegaron por email.
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
