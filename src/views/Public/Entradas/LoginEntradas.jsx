import React, { useMemo, useState } from "react";
import { ENTRADAS_LOGO_URL, entradasUi, useEntradasDarkMode } from "../../../hooks/useEntradasDarkMode";
import {
  ensureEntradaProfile,
  requestEntradasEmailCode,
  verifyEntradasEmailCode,
} from "../../../services/entradaService";

const initialProfile = { nombre: "", apellido: "" };
const OTP_RESEND_COOLDOWN_SECONDS = 60;

export default function LoginEntradas({ user, profile, onProfileSaved, bootError = "" }) {
  const { isDark } = useEntradasDarkMode();
  const ui = entradasUi(isDark);
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
      const messageText = String(otpError?.message || "");
      if (/límite|limit|429/i.test(messageText)) {
        setError("Se alcanzó el límite de envíos. Esperá 60s e intentá nuevamente.");
      } else {
        setError(messageText || "No se pudo enviar el código.");
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
    <div className={`${ui.page} flex items-center justify-center px-4 py-8`}>
      <div className={`w-full max-w-md ${ui.section} p-6 space-y-4 entradas-card-lift`}>
        <div className="text-center space-y-2">
          <h1 className={`${ui.title} uppercase`}>Entradas</h1>
          <div className={`${ui.logoWrap} mx-auto w-fit`}>
            <img
              src={ENTRADAS_LOGO_URL}
              alt="Orquesta Filarmónica de Río Negro"
              className="h-16 w-auto max-w-[240px] object-contain"
            />
          </div>
          <p className={`text-sm ${ui.subtitle}`}>Obtené tus entradas gratuitas con código por email.</p>
        </div>

        {!user && (
          <>
            <form className="space-y-2" onSubmit={sendOtp}>
              <label className={ui.label}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={ui.input}
                placeholder="tu.mail@dominio.com"
              />
              <button
                type="submit"
                disabled={sending || !email.trim() || Date.now() < nextOtpAllowedAt}
                className={ui.btnPrimary}
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
                <label className={ui.label}>Código (8 dígitos)</label>
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
                  className={`${ui.input} tracking-[0.3em] text-center`}
                  placeholder="12345678"
                />
                <button
                  type="submit"
                  disabled={
                    verifying ||
                    otpCode.trim().length < 8 ||
                    otpCode.trim().length > 8
                  }
                  className={ui.btnSolid}
                >
                  {verifying ? "Validando..." : "Validar"}
                </button>
                <p className={`text-[11px] ${ui.textMuted}`}>
                  Ingresá los 8 dígitos del email, o usá el enlace «Accedé sin contraseña».
                </p>
              </form>
            )}
          </>
        )}

        {needsProfile && (
          <form className="space-y-2" onSubmit={saveProfile}>
            <h2 className={`text-sm font-bold uppercase tracking-wide ${ui.textSoft}`}>Completá tu perfil</h2>
            <input
              required
              value={form.nombre}
              onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
              className={ui.input}
              placeholder="Nombre"
            />
            <input
              required
              value={form.apellido}
              onChange={(event) => setForm((prev) => ({ ...prev, apellido: event.target.value }))}
              className={ui.input}
              placeholder="Apellido"
            />
            <button type="submit" disabled={savingProfile} className={ui.btnPrimary}>
              {savingProfile ? "Guardando..." : "Guardar perfil"}
            </button>
          </form>
        )}

        {bootError && <div className={ui.warningBox}>{bootError}</div>}
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
        {message && (
          <div
            className={
              isDark
                ? "rounded-md border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-xs text-emerald-200"
                : "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
            }
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
