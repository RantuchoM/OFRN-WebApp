import React, { useMemo, useState } from "react";
import { supabase } from "../../../services/supabase";
import {
  requestEntradasEmailCode,
  verifyEntradasEmailCode,
} from "../../../services/entradaService";

const initialProfileForm = {
  nombre: "",
  apellido: "",
  dni: "",
  fecha_nacimiento: "",
  cargo: "",
  genero: "-",
};
const OTP_RESEND_COOLDOWN_SECONDS = 60;

export default function LoginSCRN({ user, profile, onProfileSaved, bootError = "" }) {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState(initialProfileForm);
  const [savingProfile, setSavingProfile] = useState(false);
  const [nextOtpAllowedAt, setNextOtpAllowedAt] = useState(0);

  /** Solo falta completar la fila en scrn_perfiles: sesión OTP ya creada pero sin perfil en base. */
  const faltaCrearPerfilEnBase = useMemo(
    () => Boolean(user) && profile == null,
    [user, profile],
  );

  const getFriendlyProfileError = (insertError) => {
    const rawMessage = insertError?.message || "No se pudo guardar el perfil.";
    if (insertError?.code === "42501" || /row-level security/i.test(rawMessage)) {
      return "No se pudo guardar por permisos RLS en Supabase. Faltan politicas INSERT/UPDATE para scrn_perfiles.";
    }
    if (insertError?.code === "23505") {
      return "Ese DNI ya existe en otro perfil.";
    }
    return rawMessage;
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    const now = Date.now();
    const secondsRemaining = Math.ceil((nextOtpAllowedAt - now) / 1000);
    if (secondsRemaining > 0) {
      setError(`Esperá ${secondsRemaining}s antes de pedir otro código.`);
      return;
    }
    setError("");
    setMessage("");
    setSendingOtp(true);

    const normalizedEmail = email.trim().toLowerCase();
    try {
      await requestEntradasEmailCode(normalizedEmail, "scrn");
    } catch (otpError) {
      const message = String(otpError?.message || "");
      if (/límite|limit|429/i.test(message)) {
        setError("Se alcanzó el límite de envíos. Esperá 60s e intentá nuevamente.");
      } else {
        setError(message || "No se pudo enviar el código.");
      }
      return;
    } finally {
      setSendingOtp(false);
    }

    setEmail(normalizedEmail);
    setOtpSent(true);
    setNextOtpAllowedAt(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000);
    setMessage("Te enviamos un código de 8 dígitos por email.");
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setVerifyingOtp(true);

    try {
      await verifyEntradasEmailCode({
        email: email.trim().toLowerCase(),
        code: otpCode.trim(),
      });
    } catch (verifyError) {
      setError(verifyError?.message || "No se pudo validar el código.");
      return;
    } finally {
      setVerifyingOtp(false);
    }

    setMessage("Acceso validado correctamente.");
  };

  const handleProfileInput = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!user?.id) return;

    setSavingProfile(true);
    setError("");
    setMessage("");

    const payload = {
      id: user.id,
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      dni: formData.dni.trim() || null,
      fecha_nacimiento: formData.fecha_nacimiento || null,
      cargo: formData.cargo.trim() || null,
      genero: formData.genero.trim() || null,
      es_admin: false,
    };

    const { error: insertError } = await supabase
      .from("scrn_perfiles")
      .upsert(payload, { onConflict: "id" });

    setSavingProfile(false);

    if (insertError) {
      setError(getFriendlyProfileError(insertError));
      return;
    }

    setMessage("Perfil guardado. Ya podés usar el sistema.");
    onProfileSaved?.();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="text-center space-y-2">
          <img
            src="/pictures/ofrn.jpg"
            alt="Logo OFRN"
            className="h-16 w-auto max-w-[220px] rounded-xl object-contain mx-auto border border-slate-200 bg-white p-1"
          />
          <h1 className="text-xl font-extrabold text-slate-800">
            Transporte SCRN
          </h1>
          <p className="text-sm text-slate-500">
            Acceso por código de 8 dígitos enviado a tu correo.
          </p>
        </div>

        {/* Acceso por mail: solo si aún no hay sesión. Si ya hay sesión y perfil en DB, esta pantalla no se usa. */}
        {!user && (
          <>
            <form className="space-y-3" onSubmit={handleSendOtp}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="tu.mail@dominio.com"
              />
              <button
                type="submit"
                disabled={sendingOtp || !email.trim() || Date.now() < nextOtpAllowedAt}
                className="w-full rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-semibold py-2 transition-colors"
              >
                {sendingOtp
                  ? "Enviando..."
                  : Date.now() < nextOtpAllowedAt
                  ? "Esperá para reenviar"
                  : "Enviar código"}
              </button>
            </form>

            {otpSent && (
              <form className="space-y-3" onSubmit={handleVerifyOtp}>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Código OTP (8 dígitos)
                </label>
                <input
                  type="text"
                  required
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
                    verifyingOtp ||
                    otpCode.trim().length < 8 ||
                    otpCode.trim().length > 8
                  }
                  className="w-full rounded-lg bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-sm font-semibold py-2 transition-colors"
                >
                  {verifyingOtp ? "Validando..." : "Verificar código"}
                </button>
                <p className="text-[11px] text-slate-500">
                  Ingresá los 8 dígitos exactamente como llegaron por email.
                </p>
              </form>
            )}
          </>
        )}

        {faltaCrearPerfilEnBase && (
          <form className="space-y-3" onSubmit={handleSaveProfile}>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
              Completá tu perfil
            </h2>
            <input
              required
              value={formData.nombre}
              onChange={handleProfileInput("nombre")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Nombre"
            />
            <input
              required
              value={formData.apellido}
              onChange={handleProfileInput("apellido")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Apellido"
            />
            <input
              value={formData.dni}
              onChange={handleProfileInput("dni")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="DNI (opcional)"
            />
            <input
              type="date"
              value={formData.fecha_nacimiento}
              onChange={handleProfileInput("fecha_nacimiento")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              title="Fecha de nacimiento (opcional)"
            />
            <input
              value={formData.cargo}
              onChange={handleProfileInput("cargo")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Cargo (opcional)"
            />
            <select
              value={formData.genero}
              onChange={handleProfileInput("genero")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="-">-</option>
            </select>
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-semibold py-2 transition-colors"
            >
              {savingProfile ? "Guardando..." : "Guardar perfil"}
            </button>
          </form>
        )}

        {bootError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {bootError}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
