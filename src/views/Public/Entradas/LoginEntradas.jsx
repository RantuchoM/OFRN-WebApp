import React, { useEffect, useMemo, useState } from "react";
import { ENTRADAS_LOGO_URL, entradasUi, useEntradasDarkMode } from "../../../hooks/useEntradasDarkMode";
import { IconArrowLeft, IconEye, IconEyeOff } from "../../../components/ui/Icons";
import EntradasSetPasswordForm from "../../../components/entradas/EntradasSetPasswordForm";
import EntradasLoginCatalogPreview from "../../../components/entradas/EntradasLoginCatalogPreview";
import {
  checkEntradasLoginOptions,
  ensureEntradaProfile,
  requestEntradasEmailCode,
  requestEntradasPasswordReset,
  signInEntradasWithPassword,
  verifyEntradasEmailCode,
} from "../../../services/entradaService";

const initialProfile = { nombre: "", apellido: "" };
const LINK_RESEND_COOLDOWN_SECONDS = 60;
const REMEMBERED_EMAIL_KEY = "entradas_login_email";

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

/** Pasos: email → opciones → password | otp (y mails de crear/restaurar). */
export default function LoginEntradas({
  user,
  profile,
  onProfileSaved,
  onPasswordSaved,
  onSkipPassword,
  passwordPrompt = null,
  bootError = "",
  onBack = null,
}) {
  const { isDark } = useEntradasDarkMode();
  const ui = entradasUi(isDark);
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState(() => readRememberedEmail());
  const [hasPassword, setHasPassword] = useState(null);
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(initialProfile);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [nextLinkAllowedAt, setNextLinkAllowedAt] = useState(0);

  const needsProfile = useMemo(() => Boolean(user) && !profile, [user, profile]);
  const showPasswordForm = Boolean(user)
    && Boolean(profile)
    && (
      passwordPrompt === "required"
      || (passwordPrompt === "optional" && !profile?.password_set_at)
    );

  const cooldownLeft = Math.max(0, Math.ceil((nextLinkAllowedAt - Date.now()) / 1000));
  const normalizedEmail = email.trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  useEffect(() => {
    if (!cooldownLeft) return undefined;
    const id = window.setInterval(() => {
      setNextLinkAllowedAt((prev) => (prev <= Date.now() ? 0 : prev));
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

  const goBackToEmail = () => {
    clearFeedback();
    setStep("email");
    setHasPassword(null);
    setPassword("");
    setOtpCode("");
  };

  const goBackToOptions = () => {
    clearFeedback();
    setStep("options");
    setPassword("");
    setOtpCode("");
  };

  const continueWithEmail = async (event) => {
    event.preventDefault();
    clearFeedback();
    if (!emailOk) {
      setError("Escribí un mail válido.");
      return;
    }
    setLookingUp(true);
    try {
      const options = await checkEntradasLoginOptions(normalizedEmail);
      rememberEmail(options.email);
      setEmail(options.email);
      setHasPassword(options.hasPassword);
      setStep("options");
    } catch (lookupError) {
      setError(lookupError?.message || "No se pudo verificar el mail. Intentá de nuevo.");
    } finally {
      setLookingUp(false);
    }
  };

  const sendAccessCode = async () => {
    const secondsRemaining = Math.ceil((nextLinkAllowedAt - Date.now()) / 1000);
    if (secondsRemaining > 0) {
      setError(`Esperá ${secondsRemaining}s antes de pedir otro acceso.`);
      return;
    }
    clearFeedback();
    setSendingCode(true);
    try {
      await requestEntradasEmailCode(normalizedEmail, "entradas");
      setNextLinkAllowedAt(Date.now() + LINK_RESEND_COOLDOWN_SECONDS * 1000);
      setOtpCode("");
      setStep("otp");
      setMessage(
        "Te enviamos un link de acceso rápido o código único al mail. Preferí el botón del mail; si no, usá el código de 8 dígitos acá.",
      );
    } catch (codeError) {
      setError(codeError?.message || "No se pudo enviar el acceso al mail.");
    } finally {
      setSendingCode(false);
    }
  };

  const sendCreateOrResetLink = async ({ isCreate }) => {
    const secondsRemaining = Math.ceil((nextLinkAllowedAt - Date.now()) / 1000);
    if (secondsRemaining > 0) {
      setError(`Esperá ${secondsRemaining}s antes de pedir otro enlace.`);
      return;
    }
    clearFeedback();
    setSendingReset(true);
    try {
      await requestEntradasPasswordReset(normalizedEmail, "entradas");
      setNextLinkAllowedAt(Date.now() + LINK_RESEND_COOLDOWN_SECONDS * 1000);
      setMessage(
        isCreate
          ? "Te enviamos un enlace para crear tu contraseña. Abrilo desde este mismo celular o computadora."
          : "Te enviamos un enlace para restaurar tu contraseña. Abrilo y elegí una clave nueva.",
      );
    } catch (resetError) {
      setError(resetError?.message || "No se pudo enviar el enlace.");
    } finally {
      setSendingReset(false);
    }
  };

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    clearFeedback();
    if (!password.trim()) {
      setError("Escribí tu contraseña.");
      return;
    }
    setSigningIn(true);
    try {
      await signInEntradasWithPassword(normalizedEmail, password);
      rememberEmail(normalizedEmail);
    } catch (loginError) {
      setError(loginError?.message || "No se pudo entrar con esa contraseña.");
    } finally {
      setSigningIn(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    clearFeedback();
    if (!/^\d{8}$/.test(otpCode.trim())) {
      setError("El código tiene 8 números.");
      return;
    }
    setVerifyingCode(true);
    try {
      await verifyEntradasEmailCode({
        email: normalizedEmail,
        code: otpCode.trim(),
        app: "entradas",
      });
      rememberEmail(normalizedEmail);
    } catch (verifyError) {
      setError(verifyError?.message || "No se pudo validar el código.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    clearFeedback();
    try {
      await ensureEntradaProfile(form);
      onProfileSaved?.();
    } catch (saveError) {
      setError(saveError?.message || "No se pudo guardar el perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const linkBusy = sendingCode || sendingReset || cooldownLeft > 0;

  const showPublicCatalog = !user;

  return (
    <div className={`${ui.page} flex flex-col items-center justify-start px-4 py-8 gap-8`}>
      <div className={`w-full max-w-md ${ui.section} p-6 sm:p-8 space-y-5 entradas-card-lift`}>
        {onBack && !user && (
          <button
            type="button"
            onClick={onBack}
            className={`inline-flex items-center gap-1 text-sm font-semibold ${ui.textSoft}`}
          >
            <IconArrowLeft size={16} />
            Volver
          </button>
        )}
        <div className="text-center space-y-3">
          <h1 className={`${ui.title} text-2xl sm:text-3xl uppercase`}>
            {!user && onBack ? "Gestionar mis entradas" : "Entradas"}
          </h1>
          <div className={`${ui.logoWrap} mx-auto w-fit`}>
            <img
              src={ENTRADAS_LOGO_URL}
              alt="Orquesta Filarmónica de Río Negro"
              className="h-16 w-auto max-w-[240px] object-contain"
            />
          </div>
          {!user && (
            <p className={hintClass}>
              {step === "email"
                ? "Empezá escribiendo tu mail. Después elegís cómo entrar."
                : step === "options"
                  ? "Elegí cómo querés entrar."
                  : step === "password"
                    ? "Ingresá tu contraseña."
                    : "Si abriste el link del mail ya entraste. Si no, escribí el código único de 8 dígitos."}
            </p>
          )}
        </div>

        {!user && step === "email" && (
          <form className="space-y-4" onSubmit={continueWithEmail}>
            <label className={`${ui.label} text-sm`} htmlFor="entradas-login-email">
              Tu mail
            </label>
            <input
              id="entradas-login-email"
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
            <button
              type="submit"
              disabled={lookingUp || !normalizedEmail}
              className={btnPrimaryA11y}
            >
              {lookingUp ? "Revisando…" : "Continuar"}
            </button>
          </form>
        )}

        {!user && step === "options" && (
          <div className="space-y-4">
            <div className={`${ui.inset} text-base`}>
              <p className={`text-xs font-bold uppercase tracking-wide ${ui.textSoft}`}>Mail</p>
              <p className={`break-all font-semibold ${ui.textStrong}`}>{normalizedEmail}</p>
              <button
                type="button"
                onClick={goBackToEmail}
                className={`mt-2 text-sm font-semibold underline underline-offset-2 ${ui.textSoft}`}
              >
                Cambiar mail
              </button>
            </div>

            <button
              type="button"
              disabled={linkBusy}
              onClick={() => void sendAccessCode()}
              className={btnPrimaryA11y}
            >
              {sendingCode
                ? "Enviando…"
                : cooldownLeft > 0
                  ? `Esperá ${cooldownLeft}s`
                  : "Link rápido"}
            </button>
            <p className={hintClass}>
              Enviamos un link de acceso rápido o código único al mail. Preferí el botón del mail; si el navegador se cierra, volvé acá con el código.
            </p>

            {hasPassword ? (
              <button
                type="button"
                onClick={() => {
                  clearFeedback();
                  setStep("password");
                }}
                className={btnPrimaryA11y}
              >
                Ingresar contraseña
              </button>
            ) : (
              <button
                type="button"
                disabled={linkBusy}
                onClick={() => void sendCreateOrResetLink({ isCreate: true })}
                className={btnPrimaryA11y}
              >
                {sendingReset ? "Enviando…" : "Crear contraseña"}
              </button>
            )}

            <div className={`space-y-2 border-t pt-4 ${ui.divider}`}>
              {hasPassword ? (
                <>
                  <p className={hintClass}>¿Olvidaste la contraseña?</p>
                  <button
                    type="button"
                    disabled={linkBusy}
                    onClick={() => void sendCreateOrResetLink({ isCreate: false })}
                    className={btnGhostA11y}
                  >
                    {sendingReset ? "Enviando…" : "Recuperar contraseña"}
                  </button>
                </>
              ) : (
                <p className={hintClass}>
                  Si preferís no crear contraseña, pedí el link de acceso rápido o el código único al mail.
                  Este dispositivo queda recordado para la próxima vez.
                </p>
              )}
            </div>
          </div>
        )}

        {!user && step === "password" && (
          <form className="space-y-4" onSubmit={handlePasswordLogin}>
            <div className={`${ui.inset} text-base`}>
              <p className={`break-all font-semibold ${ui.textStrong}`}>{normalizedEmail}</p>
              <button
                type="button"
                onClick={goBackToOptions}
                className={`mt-2 text-sm font-semibold underline underline-offset-2 ${ui.textSoft}`}
              >
                Volver a opciones
              </button>
            </div>
            <label className={`${ui.label} text-sm`} htmlFor="entradas-login-password">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="entradas-login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${inputA11y} pr-12`}
                placeholder="La de OFRN, o la que creaste acá"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <IconEyeOff size={22} /> : <IconEye size={22} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={signingIn || !password.trim()}
              className={btnPrimaryA11y}
            >
              {signingIn ? "Entrando…" : "Entrar"}
            </button>
            <button
              type="button"
              disabled={linkBusy}
              onClick={() => void sendCreateOrResetLink({ isCreate: false })}
              className={btnGhostA11y}
            >
              {sendingReset ? "Enviando…" : "Recuperar contraseña"}
            </button>
          </form>
        )}

        {!user && step === "otp" && (
          <div className="space-y-4">
            <div className={`${ui.inset} text-base`}>
              <p className={`break-all font-semibold ${ui.textStrong}`}>{normalizedEmail}</p>
              <button
                type="button"
                onClick={goBackToOptions}
                className={`mt-2 text-sm font-semibold underline underline-offset-2 ${ui.textSoft}`}
              >
                Volver a opciones
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleVerifyCode}>
              <label className={`${ui.label} text-sm`} htmlFor="entradas-login-otp">
                Código de 8 dígitos
              </label>
              <input
                id="entradas-login-otp"
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
                disabled={verifyingCode || otpCode.trim().length !== 8}
                className={btnPrimaryA11y}
              >
                {verifyingCode ? "Validando…" : "Entrar con el código"}
              </button>
            </form>
            <button
              type="button"
              disabled={linkBusy}
              onClick={() => void sendAccessCode()}
              className={btnGhostA11y}
            >
              {sendingCode
                ? "Enviando…"
                : cooldownLeft > 0
                  ? `Reenviar en ${cooldownLeft}s`
                  : "Reenviar link o código único"}
            </button>
          </div>
        )}

        {needsProfile && (
          <form className="space-y-3" onSubmit={saveProfile}>
            <h2 className={`text-base font-bold uppercase tracking-wide ${ui.textSoft}`}>Completá tu perfil</h2>
            <input
              required
              value={form.nombre}
              onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
              className={inputA11y}
              placeholder="Nombre"
              autoComplete="given-name"
            />
            <input
              required
              value={form.apellido}
              onChange={(event) => setForm((prev) => ({ ...prev, apellido: event.target.value }))}
              className={inputA11y}
              placeholder="Apellido"
              autoComplete="family-name"
            />
            <button type="submit" disabled={savingProfile} className={btnPrimaryA11y}>
              {savingProfile ? "Guardando…" : "Guardar perfil"}
            </button>
          </form>
        )}

        {showPasswordForm && (
          <EntradasSetPasswordForm
            ui={ui}
            isDark={isDark}
            title={passwordPrompt === "required" ? "Elegí tu nueva contraseña" : "Creá una contraseña (opcional)"}
            hint={
              passwordPrompt === "required"
                ? "Mínimo 8 caracteres. Después también podés seguir entrando con el código del mail."
                : "Mínimo 8 caracteres. Si preferís, podés seguir entrando solo con el código del mail."
            }
            submitLabel="Guardar contraseña"
            onSaved={onPasswordSaved}
            onSkip={passwordPrompt === "required" ? null : () => onSkipPassword?.()}
            skipLabel="Ahora no, seguir sin contraseña"
          />
        )}

        {bootError && <div className={ui.warningBox}>{bootError}</div>}
        {error && <div className={errorBox} role="alert">{error}</div>}
        {message && <div className={okBox} role="status">{message}</div>}
      </div>

      {showPublicCatalog && <EntradasLoginCatalogPreview ui={ui} isDark={isDark} />}
    </div>
  );
}
