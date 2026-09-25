import React, { useState } from "react";
import { IconEye, IconEyeOff } from "../ui/Icons";
import {
  requestOficinaExternaEmailCode,
  signInOficinaExternaWithPassword,
  verifyOficinaExternaEmailCode,
} from "../../services/oficinaExternaAuthService";

const OTP_RESEND_COOLDOWN_SECONDS = 60;

/**
 * Acceso compartido de oficina externa (transporte-scrn y viáticos-manual).
 * La sesión queda en supabaseOficinaExterna.
 */
export default function OficinaExternaAccessForm({ app, onSignedIn }) {
  const [method, setMethod] = useState("code");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [nextOtpAllowedAt, setNextOtpAllowedAt] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const normalizedEmail = email.trim().toLowerCase();
  const waitingResend = Date.now() < nextOtpAllowedAt;

  const handlePassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSigningIn(true);
    try {
      await signInOficinaExternaWithPassword(normalizedEmail, password, app);
      setMessage("Acceso validado correctamente.");
      onSignedIn?.();
    } catch (signInError) {
      setError(signInError?.message || "No se pudo entrar con la contraseña.");
    } finally {
      setSigningIn(false);
    }
  };

  const handleSendCode = async (event) => {
    event.preventDefault();
    const secondsRemaining = Math.ceil((nextOtpAllowedAt - Date.now()) / 1000);
    if (secondsRemaining > 0) {
      setError(`Esperá ${secondsRemaining}s antes de pedir otro código.`);
      return;
    }
    setError("");
    setMessage("");
    setSending(true);
    try {
      await requestOficinaExternaEmailCode(normalizedEmail, app);
      setEmail(normalizedEmail);
      setOtpSent(true);
      setNextOtpAllowedAt(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000);
      setMessage("Te enviamos un código de 8 dígitos, de un solo uso, a tu mail.");
    } catch (otpError) {
      setError(otpError?.message || "No se pudo enviar el código.");
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setVerifying(true);
    try {
      await verifyOficinaExternaEmailCode({
        email: normalizedEmail,
        code: otpCode.trim(),
        app,
      });
      setMessage("Código validado correctamente.");
      onSignedIn?.();
    } catch (verifyError) {
      setError(verifyError?.message || "No se pudo validar el código.");
    } finally {
      setVerifying(false);
    }
  };

  const tabClass = (active) =>
    `flex-1 px-3 py-2 text-xs font-black uppercase tracking-wide ${
      active ? "bg-[#0054a6] text-white" : "bg-white text-slate-700 hover:bg-[#e8f1fa]"
    }`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 border border-[#c5d0dc]">
        <button type="button" className={tabClass(method === "password")} onClick={() => setMethod("password")}>
          Contraseña
        </button>
        <button type="button" className={tabClass(method === "code")} onClick={() => setMethod("code")}>
          Código único
        </button>
      </div>

      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full border border-[#c5d0dc] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0054a6] focus:ring-1 focus:ring-[#0054a6]"
          placeholder="tu.mail@dominio.com"
          autoComplete="username"
        />
      </label>

      {method === "password" ? (
        <form className="space-y-3" onSubmit={handlePassword}>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Contraseña
            <span className="relative mt-1 block">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border border-[#c5d0dc] bg-white px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#0054a6] focus:ring-1 focus:ring-[#0054a6]"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0054a6]"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </span>
          </label>
          <p className="text-[11px] text-slate-500">
            Si tenés usuario de OFRN, usá la misma clave. Si no, pedí un código único.
          </p>
          <button
            type="submit"
            disabled={signingIn || !normalizedEmail || !password}
            className="w-full bg-[#0054a6] py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#003d7a] disabled:bg-slate-300"
          >
            {signingIn ? "Entrando..." : "Entrar"}
          </button>
        </form>
      ) : (
        <>
          <form className="space-y-3" onSubmit={handleSendCode}>
            <p className="text-[11px] text-slate-500">
              Te enviamos un código de 8 dígitos al mail. Sirve una sola vez.
            </p>
            <button
              type="submit"
              disabled={sending || !normalizedEmail || waitingResend}
              className="w-full bg-[#0054a6] py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#003d7a] disabled:bg-slate-300"
            >
              {sending ? "Enviando..." : waitingResend ? "Esperá para reenviar" : otpSent ? "Reenviar código" : "Enviar código"}
            </button>
          </form>
          {otpSent ? (
            <form className="space-y-3" onSubmit={handleVerifyCode}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Código único (8 dígitos)
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
                  maxLength={8}
                  className="mt-1 w-full border border-[#c5d0dc] px-3 py-2.5 text-center text-sm tracking-[0.3em] outline-none focus:border-[#0054a6] focus:ring-1 focus:ring-[#0054a6]"
                  placeholder="12345678"
                />
              </label>
              <button
                type="submit"
                disabled={verifying || otpCode.trim().length !== 8}
                className="w-full bg-slate-900 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-slate-800 disabled:bg-slate-300"
              >
                {verifying ? "Validando..." : "Validar e ingresar"}
              </button>
            </form>
          ) : null}
        </>
      )}

      {error ? (
        <div className="border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
      ) : null}
      {message ? (
        <div className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{message}</div>
      ) : null}
    </div>
  );
}
