import React, { useMemo, useState } from "react";
import {
  ensureViaticosManualProfile,
  requestViaticosManualEmailCode,
  verifyViaticosManualEmailCode,
} from "../../../services/viaticosManualService";
import { IconCalculator, IconCloud, IconCloudUpload, IconFileDownload } from "../../../components/ui/Icons";

const initialProfile = { nombre: "", apellido: "" };
const OTP_RESEND_COOLDOWN_SECONDS = 60;

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Iniciá sesión con tu email",
    detail: "Te enviamos un código de 8 dígitos o un enlace seguro. Sin contraseñas nuevas.",
    icon: IconCloud,
  },
  {
    step: "2",
    title: "Completá viáticos y rendiciones",
    detail: "La herramienta sigue igual: planillas, cálculos automáticos y exportación a PDF.",
    icon: IconCalculator,
  },
  {
    step: "3",
    title: "Guardá en la nube",
    detail: "Con un clic tus datos quedan asociados a tu cuenta, desde cualquier dispositivo.",
    icon: IconCloudUpload,
  },
  {
    step: "4",
    title: "Recuperá, duplicá o editá",
    detail: "Abrí un guardado para modificar el original o crear una copia para un nuevo trámite.",
    icon: IconFileDownload,
  },
];

function LoginFormBlock({
  user,
  profile,
  needsProfile,
  email,
  setEmail,
  otpCode,
  setOtpCode,
  otpSent,
  form,
  setForm,
  error,
  message,
  sending,
  verifying,
  savingProfile,
  nextOtpAllowedAt,
  bootError,
  onSendOtp,
  onVerifyOtp,
  onSaveProfile,
  isGate,
  onClose,
  onContinueAsGuest,
  guestConfirmOpen,
  setGuestConfirmOpen,
  onConfirmGuest,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800">
            {isGate ? "Ingresá a tu cuenta" : "Iniciar sesión"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Acceso con código por email. La misma cuenta sirve para transporte SCRN y viáticos manual.
          </p>
        </div>
        {!isGate && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        )}
      </div>

      {!user && (
        <>
          <form className="space-y-2" onSubmit={onSendOtp}>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="tu.mail@dominio.com"
            />
            <button
              type="submit"
              disabled={sending || !email.trim() || Date.now() < nextOtpAllowedAt}
              className="w-full bg-indigo-600 text-white text-sm font-black py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {sending
                ? "Enviando..."
                : Date.now() < nextOtpAllowedAt
                  ? "Esperá para reenviar"
                  : "Enviar código"}
            </button>
          </form>

          {otpSent && (
            <form className="space-y-2" onSubmit={onVerifyOtp}>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Código (8 dígitos)
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
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-center tracking-[0.3em] outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="12345678"
              />
              <button
                type="submit"
                disabled={verifying || otpCode.trim().length !== 8}
                className="w-full bg-slate-800 text-white text-sm font-black py-2.5 rounded-lg hover:bg-slate-900 disabled:opacity-50 transition"
              >
                {verifying ? "Validando..." : "Validar e ingresar"}
              </button>
              <p className="text-[11px] text-slate-500">
                Ingresá los 8 dígitos del email, o usá el enlace «Accedé sin contraseña».
              </p>
            </form>
          )}
        </>
      )}

      {needsProfile && (
        <form className="space-y-2" onSubmit={onSaveProfile}>
          <h3 className="text-sm font-bold text-slate-700">Completá tu perfil</h3>
          <input
            required
            value={form.nombre}
            onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="Nombre"
          />
          <input
            required
            value={form.apellido}
            onChange={(event) => setForm((prev) => ({ ...prev, apellido: event.target.value }))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="Apellido"
          />
          <button
            type="submit"
            disabled={savingProfile}
            className="w-full bg-indigo-600 text-white text-sm font-black py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {savingProfile ? "Guardando..." : "Guardar perfil e ingresar"}
          </button>
        </form>
      )}

      {user && profile && !isGate && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Sesión activa como {profile.nombre} {profile.apellido}.
        </div>
      )}

      {isGate && onContinueAsGuest && !user && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {!guestConfirmOpen ? (
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="w-full px-3 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
            >
              Continuar sin iniciar sesión
            </button>
          ) : (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2">
              <p className="text-xs text-rose-900">
                Confirmá que entendés que <strong>no se guardarán tus datos en la nube</strong>.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGuestConfirmOpen(false)}
                  className="flex-1 px-3 py-2 text-xs font-black text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={onConfirmGuest}
                  className="flex-1 px-3 py-2 text-xs font-black text-white bg-rose-600 rounded-lg hover:bg-rose-700"
                >
                  Entrar como invitado
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {bootError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {bootError}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {message}
        </div>
      )}
    </div>
  );
}

export default function LoginViaticosManual({
  mode = "gate",
  user,
  profile,
  onProfileSaved,
  bootError = "",
  onClose,
  onContinueAsGuest,
}) {
  const isGate = mode === "gate";
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
  const [guestConfirmOpen, setGuestConfirmOpen] = useState(false);

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
      await requestViaticosManualEmailCode(normalizedEmail);
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
      await verifyViaticosManualEmailCode({
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
    onProfileSaved?.();
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    try {
      await ensureViaticosManualProfile(form);
      onProfileSaved?.();
      onClose?.();
    } catch (saveError) {
      setError(saveError?.message || "No se pudo guardar el perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const formBlockProps = {
    user,
    profile,
    needsProfile,
    email,
    setEmail,
    otpCode,
    setOtpCode,
    otpSent,
    form,
    setForm,
    error,
    message,
    sending,
    verifying,
    savingProfile,
    nextOtpAllowedAt,
    bootError,
    onSendOtp: sendOtp,
    onVerifyOtp: verifyOtp,
    onSaveProfile: saveProfile,
    isGate,
    onClose,
    onContinueAsGuest: () => setGuestConfirmOpen(true),
    guestConfirmOpen,
    setGuestConfirmOpen,
    onConfirmGuest: () => {
      setGuestConfirmOpen(false);
      onContinueAsGuest?.();
    },
  };

  if (!isGate) {
    return (
      <div className="w-full max-w-md">
        <LoginFormBlock {...formBlockProps} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
        <div className="space-y-6 lg:pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Nuevo
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              ¡Ahora tus viáticos y rendiciones se guardan en la nube!
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
              La herramienta de Secretaría sigue siendo la misma, pero ahora podés recuperar tu trabajo,
              retomarlo en otro momento y tener todo asociado a tu email.
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-white/80 backdrop-blur p-5 space-y-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-indigo-700">¿Cómo funciona?</p>
            <ol className="space-y-4">
              {HOW_IT_WORKS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.step} className="flex gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {!needsProfile && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 leading-relaxed">
              <p className="font-bold">¿Sin iniciar sesión?</p>
              <p className="mt-1">
                Podés entrar como invitado y exportar PDF, pero{" "}
                <strong>no se guardarán tus viáticos ni rendiciones en la nube</strong>.
              </p>
            </div>
          )}
        </div>

        <LoginFormBlock {...formBlockProps} />
      </div>
    </div>
  );
}
