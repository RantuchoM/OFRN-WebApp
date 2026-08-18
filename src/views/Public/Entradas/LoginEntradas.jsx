import React, { useMemo, useState } from "react";
import { ENTRADAS_LOGO_URL, entradasUi, useEntradasDarkMode } from "../../../hooks/useEntradasDarkMode";
import { IconEye, IconEyeOff } from "../../../components/ui/Icons";
import EntradasSetPasswordForm from "../../../components/entradas/EntradasSetPasswordForm";
import {
  ensureEntradaProfile,
  requestEntradasMagicLink,
  requestEntradasPasswordReset,
  signInEntradasWithPassword,
} from "../../../services/entradaService";

const initialProfile = { nombre: "", apellido: "" };
const LINK_RESEND_COOLDOWN_SECONDS = 60;

export default function LoginEntradas({
  user,
  profile,
  onProfileSaved,
  onPasswordSaved,
  onSkipPassword,
  passwordPrompt = null,
  bootError = "",
}) {
  const { isDark } = useEntradasDarkMode();
  const ui = entradasUi(isDark);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(initialProfile);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
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

  const sendAccessLink = async () => {
    const secondsRemaining = Math.ceil((nextLinkAllowedAt - Date.now()) / 1000);
    if (secondsRemaining > 0) {
      setError(`Esperá ${secondsRemaining}s antes de pedir otro enlace.`);
      return;
    }
    setError("");
    setMessage("");
    setSendingLink(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await requestEntradasMagicLink(normalizedEmail, "entradas");
    } catch (linkError) {
      setError(linkError?.message || "No se pudo enviar el enlace.");
      return;
    } finally {
      setSendingLink(false);
    }
    setEmail(normalizedEmail);
    setNextLinkAllowedAt(Date.now() + LINK_RESEND_COOLDOWN_SECONDS * 1000);
    setMessage("Te enviamos un enlace de acceso a tu mail. Abrilo para entrar. Vence en 10 minutos.");
  };

  const sendResetLink = async () => {
    const secondsRemaining = Math.ceil((nextLinkAllowedAt - Date.now()) / 1000);
    if (secondsRemaining > 0) {
      setError(`Esperá ${secondsRemaining}s antes de pedir otro enlace.`);
      return;
    }
    setError("");
    setMessage("");
    setSendingReset(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await requestEntradasPasswordReset(normalizedEmail, "entradas");
    } catch (resetError) {
      setError(resetError?.message || "No se pudo enviar el enlace de restauración.");
      return;
    } finally {
      setSendingReset(false);
    }
    setEmail(normalizedEmail);
    setNextLinkAllowedAt(Date.now() + LINK_RESEND_COOLDOWN_SECONDS * 1000);
    setMessage("Te enviamos un enlace para crear o restaurar tu contraseña. Abrilo y elegí una clave.");
  };

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!password.trim()) {
      setError("Ingresá tu contraseña, o pedí un enlace de acceso.");
      return;
    }
    setSigningIn(true);
    try {
      await signInEntradasWithPassword(email.trim().toLowerCase(), password);
    } catch (loginError) {
      setError(loginError?.message || "No se pudo entrar con esa contraseña.");
    } finally {
      setSigningIn(false);
    }
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

  const linkBusy = sendingLink || sendingReset || cooldownLeft > 0;

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
          <p className={`text-sm ${ui.subtitle}`}>
            Entrá con contraseña o con un enlace al mail. Si todavía no tenés clave, creala desde acá.
          </p>
        </div>

        {!user && (
          <>
            <form className="space-y-2" onSubmit={handlePasswordLogin}>
              <label className={ui.label}>Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={ui.input}
                placeholder="tu.mail@dominio.com"
              />
              <label className={ui.label}>Contraseña (si ya creaste una)</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${ui.input} pr-10`}
                  placeholder="Si definiste una"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
              <button
                type="submit"
                disabled={signingIn || !email.trim()}
                className={ui.btnPrimary}
              >
                {signingIn ? "Entrando..." : "Entrar con contraseña"}
              </button>
            </form>

            <div className={`space-y-2 border-t pt-3 ${ui.divider}`}>
              <p className={`text-xs font-semibold ${ui.textSoft}`}>
                ¿No tenés contraseña todavía?
              </p>
              <p className={`text-xs ${ui.textMuted}`}>
                Te mandamos un enlace a este mail para entrar. Después podés crear una clave si querés.
              </p>
              <button
                type="button"
                disabled={linkBusy || !email.trim()}
                onClick={() => void sendAccessLink()}
                className={ui.btnSolid}
              >
                {sendingLink
                  ? "Enviando..."
                  : cooldownLeft > 0
                    ? `Esperá ${cooldownLeft}s`
                    : "Enviame un enlace para entrar"}
              </button>
              <button
                type="button"
                disabled={linkBusy || !email.trim()}
                onClick={() => void sendResetLink()}
                className={ui.btnGhost}
              >
                {sendingReset ? "Enviando..." : "Crear o restaurar contraseña"}
              </button>
            </div>
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

        {showPasswordForm && (
          <EntradasSetPasswordForm
            ui={ui}
            isDark={isDark}
            title={passwordPrompt === "required" ? "Elegí tu nueva contraseña" : "Creá una contraseña (opcional)"}
            hint={
              passwordPrompt === "required"
                ? "Mínimo 8 caracteres. Después también podés seguir entrando con el enlace del mail."
                : "Mínimo 8 caracteres. Si preferís, podés seguir entrando solo con el enlace del mail."
            }
            submitLabel="Guardar contraseña"
            onSaved={onPasswordSaved}
            onSkip={passwordPrompt === "required" ? null : () => onSkipPassword?.()}
            skipLabel="Ahora no, seguir sin contraseña"
          />
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
