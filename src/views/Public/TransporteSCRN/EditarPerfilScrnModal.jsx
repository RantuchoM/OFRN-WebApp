import React, { useEffect, useState } from "react";
import { supabase } from "../../../services/supabase";
import { IconX } from "../../../components/ui/Icons";

function toInputDate(value) {
  if (!value) return "";
  const s = String(value);
  return s.slice(0, 10);
}

const emptyForm = {
  nombre: "",
  apellido: "",
  dni: "",
  fecha_nacimiento: "",
  cargo: "",
  genero: "-",
};

export default function EditarPerfilScrnModal({
  isOpen,
  onClose,
  user,
  profile,
  onSaved,
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen || !profile) return;
    setForm({
      nombre: profile.nombre || "",
      apellido: profile.apellido || "",
      dni: profile.dni || "",
      fecha_nacimiento: toInputDate(profile.fecha_nacimiento),
      cargo: profile.cargo || "",
      genero: (profile.genero || "-").trim() || "-",
    });
    setError("");
    setMessage("");
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleInput = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id || !profile) return;
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      id: user.id,
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      dni: form.dni.trim() || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      cargo: form.cargo.trim() || null,
      genero: form.genero.trim() || null,
      es_admin: Boolean(profile.es_admin),
    };

    const { error: upError } = await supabase
      .from("scrn_perfiles")
      .upsert(payload, { onConflict: "id" });

    setSaving(false);
    if (upError) {
      setError(upError.message || "No se pudo guardar.");
      return;
    }
    setMessage("Cambios guardados.");
    onSaved?.();
    window.setTimeout(() => {
      setMessage("");
      onClose();
    }, 500);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-3 bg-slate-900/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 p-4 max-h-[min(90vh,640px)] overflow-y-auto"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
            Mi perfil
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <IconX size={16} />
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            required
            value={form.nombre}
            onChange={handleInput("nombre")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Nombre"
            autoComplete="given-name"
          />
          <input
            required
            value={form.apellido}
            onChange={handleInput("apellido")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Apellido"
            autoComplete="family-name"
          />
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              DNI (opcional)
            </label>
            <input
              value={form.dni}
              onChange={handleInput("dni")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="DNI"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Fecha de nacimiento (opcional)
            </label>
            <input
              type="date"
              value={form.fecha_nacimiento}
              onChange={handleInput("fecha_nacimiento")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <input
            value={form.cargo}
            onChange={handleInput("cargo")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Cargo (opcional)"
          />
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Género
            </label>
            <select
              value={form.genero}
              onChange={handleInput("genero")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="-">-</option>
            </select>
          </div>

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

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-xs font-bold uppercase"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
