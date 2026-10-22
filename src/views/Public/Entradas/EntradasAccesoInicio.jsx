import React, { useEffect, useState } from "react";
import { ENTRADAS_LOGO_URL, entradasUi, useEntradasDarkMode } from "../../../hooks/useEntradasDarkMode";
import { IconArrowLeft } from "../../../components/ui/Icons";
import EntradasLoginCatalogPreview from "../../../components/entradas/EntradasLoginCatalogPreview";
import {
  startEntradasTicketByEmail,
  verifyEntradasTicketCode,
} from "../../../services/entradaService";

const REMEMBERED_EMAIL_KEY = "entradas_login_email";
const LINK_RESEND_COOLDOWN_SECONDS = 60;

function readRememberedEmail() {
  try {
    return String(localStorage.getItem(REMEMBERED_EMAIL_KEY) || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function rememberEmail(email) {
  try {
    const value = String(email || "").trim().toLowerCase();
    if (value) localStorage.setItem(REMEMBERED_EMAIL_KEY, value);
  } catch {
    /* ignore */
  }
}

/**
 * Puerta de /entradas sin sesión: sacar con mail, o ir al login de gestión.
 */
export default function EntradasAccesoInicio({ bootError = "", onManage, onEntered }) {
  const { isDark } = useEntradasDarkMode();
  const ui = entradasUi(isDark);
  const [step, setStep] = useState("choice");
  const [email, setEmail] = useState(() => readRememberedEmail());
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [nextCodeAllowedAt, setNextCodeAllowedAt] = useState(0);

  const normalizedEmail = email.trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const cooldownLeft = Math.max(0, Math.ceil((nextCodeAllowedAt - Date.now()) / 1000));

  useEffect(() => {
    if (!cooldownLeft) return undefined;
    const id = window.setInterval(() => {
      setNextCodeAllowedAt((prev) => (prev <= Date.now() ? 0 : prev));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownLeft]);

  const inputA11y = `${ui.input} text-base sm:text-lg py-3`;
  const btnPrimaryA11y = `${ui.btnPrimary} text-base sm:text-lg py-3.5`;
  const btnGhostA11y = `${ui.btnGhost} w-full text-base sm:text-lg py-3.5`;
  const hintClass = `text-sm sm:text-base leading-relaxed ${ui.textMuted}`;
  const errorBox = isDark
    ? "rounded-md border border-rose-800 bg-rose-950/50 px-3 py-3 text-sm text-rose-200"
    : "rounded-md border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700";
  const okBox = isDark
    ? "rounded-md border border-emerald-800 bg-emerald-950/50 px-3 py-3 text-sm text-emerald-200"
    : "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800";

  const clearFeedback = () => {
    setError("");
    setMessage("");
  };

  const continueWithEmail = async (event) => {
    event.preventDefault();
    clearFeedback();
    if (!emailOk) {
      setError("Escribí un mail válido.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await startEntradasTicketByEmail(normalizedEmail);
      rememberEmail(result.email || normalizedEmail);
      setEmail(result.email || normalizedEmail);
      if (result.status === "known") {
        onEntered?.();
        return;
      }
      setOtpCode("");
      setNextCodeAllowedAt(Date.now() + (result.cooldownSeconds || LINK_RESEND_COOLDOWN_SECONDS) * 1000);
      setStep("code");
      setMessage("Te enviamos un código de 8 dígitos. Solo hace falta esta vez.");
    } catch (submitError) {
      setError(submitError?.message || "No se pudo continuar con ese mail.");
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    const secondsRemaining = Math.ceil((nextCodeAllowedAt - Date.now()) / 1000);
    if (secondsRemaining > 0) {
      setError(`Esperá ${secondsRemaining}s antes de pedir otro código.`);
      return;
    }
    clearFeedback();
    setSubmitting(true);
    try {
      const result = await startEntradasTicketByEmail(normalizedEmail);
      if (result.status === "known") {
        onEntered?.();
        return;
      }
      setNextCodeAllowedAt(Date.now() + (result.cooldownSeconds || LINK_RESEND_COOLDOWN_SECONDS) * 1000);
      setMessage("Te reenviamos el código. Revisá el mail.");
    } catch (resendError) {
      setError(resendError?.message || "No se pudo reenviar el código.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    clearFeedback();
    if (!/^\d{8}$/.test(otpCode.trim())) {
      setError("El código tiene 8 números.");
      return;
    }
    setVerifying(true);
    try {
      await verifyEntradasTicketCode({ email: normalizedEmail, code: otpCode.trim() });
      rememberEmail(normalizedEmail);
      onEntered?.();
    } catch (verifyError) {
      setError(verifyError?.message || "No se pudo validar el código.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={`${ui.page} flex flex-col items-center justify-start px-4 py-8 gap-8`}>
      <div className={`w-full max-w-md ${ui.section} p-6 sm:p-8 space-y-5 entradas-card-lift`}>
        {step !== "choice" && (
          <button
            type="button"
            onClick={() => {
              clearFeedback();
              setOtpCode("");
              setStep(step === "code" ? "email" : "choice");
            }}
            className={`inline-flex items-center gap-1 text-sm font-semibold ${ui.textSoft}`}
          >
            <IconArrowLeft size={16} />
            Volver
          </button>
        )}

        <div className="text-center space-y-3">
          <h1 className={`${ui.title} text-2xl sm:text-3xl uppercase`}>Entradas</h1>
          <div className={`${ui.logoWrap} mx-auto w-fit`}>
            <img
              src={ENTRADAS_LOGO_URL}
              alt="Orquesta Filarmónica de Río Negro"
              className="h-16 w-auto max-w-[240px] object-contain"
            />
          </div>
          <p className={hintClass}>
            {step === "choice"
              ? "Para sacar una entrada alcanza con tu mail. Para ver o cambiar las que ya tenés, entrá a gestionar."
              : step === "email"
                ? "Escribí el mail con el que querés la entrada. Si ya lo usaste, seguís directo."
                : "Confirmá el mail con el código. La próxima vez no te lo vamos a pedir."}
          </p>
        </div>

        {step === "choice" && (
          <div className="space-y-3">
            <button type="button" onClick={() => { clearFeedback(); setStep("email"); }} className={btnPrimaryA11y}>
              Sacar entradas
            </button>
            <button type="button" onClick={onManage} className={btnGhostA11y}>
              Gestionar mis entradas
            </button>
          </div>
        )}

        {step === "email" && (
          <form className="space-y-4" onSubmit={continueWithEmail}>
            <label className={`${ui.label} text-sm`} htmlFor="entradas-sacar-email">
              Tu mail
            </label>
            <input
              id="entradas-sacar-email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputA11y}
              placeholder="tu.mail@dominio.com"
            />
            <button type="submit" disabled={submitting || !normalizedEmail} className={btnPrimaryA11y}>
              {submitting ? "Revisando…" : "Continuar"}
            </button>
          </form>
        )}

        {step === "code" && (
          <div className="space-y-4">
            <div className={`${ui.inset} text-base`}>
              <p className={`text-xs font-bold uppercase tracking-wide ${ui.textSoft}`}>Mail</p>
              <p className={`break-all font-semibold ${ui.textStrong}`}>{normalizedEmail}</p>
            </div>
            <form className="space-y-4" onSubmit={handleVerifyCode}>
              <label className={`${ui.label} text-sm`} htmlFor="entradas-sacar-otp">
                Código de 8 dígitos
              </label>
              <input
                id="entradas-sacar-otp"
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
                maxLength={8}
                className={`${inputA11y} text-center tracking-[0.35em] font-semibold text-xl`}
                placeholder="••••••••"
              />
              <button
                type="submit"
                disabled={verifying || otpCode.trim().length !== 8}
                className={btnPrimaryA11y}
              >
                {verifying ? "Validando…" : "Validar código"}
              </button>
            </form>
            <button
              type="button"
              disabled={submitting || cooldownLeft > 0}
              onClick={() => void resendCode()}
              className={btnGhostA11y}
            >
              {submitting
                ? "Enviando…"
                : cooldownLeft > 0
                  ? `Reenviar en ${cooldownLeft}s`
                  : "Reenviar código"}
            </button>
          </div>
        )}

        {bootError && <div className={ui.warningBox}>{bootError}</div>}
        {error && <div className={errorBox} role="alert">{error}</div>}
        {message && <div className={okBox} role="status">{message}</div>}
      </div>

      <EntradasLoginCatalogPreview ui={ui} isDark={isDark} />
    </div>
  );
}
