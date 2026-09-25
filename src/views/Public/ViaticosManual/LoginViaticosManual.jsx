import React, { useMemo, useState } from "react";
import { ensureViaticosManualProfile } from "../../../services/viaticosManualService";
import { VIATICOS_APP } from "../../../services/oficinaExternaAuthService";
import OficinaExternaAccessForm from "../../../components/public/OficinaExternaAccessForm";
import { IconCalculator, IconCloud, IconCloudUpload, IconFileDownload } from "../../../components/ui/Icons";

const initialProfile = { nombre: "", apellido: "" };

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Iniciá sesión con tu email",
    detail: "Elegí contraseña o un código único de un solo uso al mail. La misma cuenta sirve para Transporte.",
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
  form,
  setForm,
  error,
  message,
  savingProfile,
  bootError,
  onSaveProfile,
  onSignedIn,
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
            Elegí contraseña o código único. La misma cuenta sirve para transporte SCRN y viáticos manual.
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
        <OficinaExternaAccessForm app={VIATICOS_APP} onSignedIn={onSignedIn} />
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
  const [form, setForm] = useState(initialProfile);
  const [error, setError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [guestConfirmOpen, setGuestConfirmOpen] = useState(false);

  const needsProfile = useMemo(() => Boolean(user) && !profile, [user, profile]);

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
    form,
    setForm,
    error,
    message: "",
    savingProfile,
    bootError,
    onSaveProfile: saveProfile,
    onSignedIn: () => onProfileSaved?.(),
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
          <div className="inline-flex items-center gap-2 border border-[#c5d0dc] bg-[#e8f1fa] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#003d7a]">
            <span className="h-1.5 w-1.5 animate-pulse bg-[#0054a6]" />
            Oficina
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

          <div className="space-y-4 border border-[#c5d0dc] border-t-4 border-t-[#0054a6] bg-white p-5">
            <p className="text-xs font-black uppercase tracking-wider text-[#0054a6]">¿Cómo funciona?</p>
            <ol className="space-y-4">
              {HOW_IT_WORKS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.step} className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#e8f1fa] text-[#0054a6]">
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
