import React, { useMemo, useState } from "react";
import {
  ensureOficinaExternaProfile,
  SCRN_APP,
} from "../../../services/oficinaExternaAuthService";
import OficinaExternaAccessForm from "../../../components/public/OficinaExternaAccessForm";
import "./scrnTransporteLayout.css";

const initialProfileForm = {
  nombre: "",
  apellido: "",
  dni: "",
  fecha_nacimiento: "",
  cargo: "",
  genero: "-",
};

export default function LoginSCRN({ user, profile, onProfileSaved, bootError = "" }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState(initialProfileForm);
  const [savingProfile, setSavingProfile] = useState(false);

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

  const handleProfileInput = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!user?.id) return;

    setSavingProfile(true);
    setError("");
    setMessage("");

    try {
      await ensureOficinaExternaProfile({
        nombre: formData.nombre,
        apellido: formData.apellido,
        dni: formData.dni,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        cargo: formData.cargo,
        genero: formData.genero,
      });
    } catch (insertError) {
      setSavingProfile(false);
      setError(getFriendlyProfileError(insertError));
      return;
    }

    setSavingProfile(false);

    setMessage("Perfil guardado. Ya podés usar el sistema.");
    onProfileSaved?.();
  };

  return (
    <div
      className="scrn-square flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: "#eef1f4" }}
    >
      <div className="w-full max-w-md space-y-6 border border-[#c5d0dc] border-t-[4px] border-t-[#0054a6] bg-white p-6 sm:p-7">
        <div className="space-y-2 text-center">
          <img
            src="/pictures/ofrn.jpg"
            alt="Logo OFRN"
            className="mx-auto h-16 w-auto max-w-[220px] rounded-none border border-[#c5d0dc] bg-white object-contain p-1"
          />
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#0054a6]">
            Gobierno de Río Negro · SCRN
          </p>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 sm:text-2xl">
            Transporte SCRN
          </h1>
          <p className="text-sm leading-relaxed text-slate-500">
            Elegí contraseña o código único. La misma cuenta sirve para viáticos manual.
          </p>
        </div>

        {/* Acceso por mail: solo si aún no hay sesión. Si ya hay sesión y perfil en DB, esta pantalla no se usa. */}
        {!user && <OficinaExternaAccessForm app={SCRN_APP} onSignedIn={onProfileSaved} />}

        {faltaCrearPerfilEnBase && (
          <form className="space-y-3" onSubmit={handleSaveProfile}>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
              Completá tu perfil
            </h2>
            <input
              required
              value={formData.nombre}
              onChange={handleProfileInput("nombre")}
              className="w-full rounded-none border border-slate-300 px-3 py-2 text-sm"
              placeholder="Nombre"
            />
            <input
              required
              value={formData.apellido}
              onChange={handleProfileInput("apellido")}
              className="w-full rounded-none border border-slate-300 px-3 py-2 text-sm"
              placeholder="Apellido"
            />
            <input
              value={formData.dni}
              onChange={handleProfileInput("dni")}
              className="w-full rounded-none border border-slate-300 px-3 py-2 text-sm"
              placeholder="DNI (opcional)"
            />
            <input
              type="date"
              value={formData.fecha_nacimiento}
              onChange={handleProfileInput("fecha_nacimiento")}
              className="w-full rounded-none border border-slate-300 px-3 py-2 text-sm"
              title="Fecha de nacimiento (opcional)"
            />
            <input
              value={formData.cargo}
              onChange={handleProfileInput("cargo")}
              className="w-full rounded-none border border-slate-300 px-3 py-2 text-sm"
              placeholder="Cargo (opcional)"
            />
            <select
              value={formData.genero}
              onChange={handleProfileInput("genero")}
              className="w-full rounded-none border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="-">-</option>
            </select>
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full rounded-none bg-[#0054a6] py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#003d7a] disabled:bg-slate-300"
            >
              {savingProfile ? "Guardando..." : "Guardar perfil"}
            </button>
          </form>
        )}

        {bootError && (
          <div className="rounded-none border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {bootError}
          </div>
        )}
        {error && (
          <div className="rounded-none border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-none border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
