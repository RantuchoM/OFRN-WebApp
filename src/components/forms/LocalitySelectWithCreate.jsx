import React, { useState } from "react";
import { createPortal } from "react-dom";
import SearchableSelect from "../ui/SearchableSelect";
import { IconLoader, IconPlus } from "../ui/Icons";
import { toast } from "sonner";

export default function LocalitySelectWithCreate({
  supabase,
  value,
  onChange,
  options = [],
  onCreated,
  placeholder = "Seleccionar localidad...",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [newLocalidad, setNewLocalidad] = useState("");
  const [saving, setSaving] = useState(false);

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
    setNewLocalidad("");
  };

  const handleCreate = async (event) => {
    event?.preventDefault();
    const localidad = (newLocalidad || "").trim();
    if (!localidad) {
      toast.error("Escribí el nombre de la localidad.");
      return;
    }
    if (!supabase) {
      toast.error("No hay conexión a base de datos.");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("localidades")
        .insert({ localidad })
        .select("id, localidad")
        .single();
      if (error) throw error;

      if (onCreated) onCreated(data);
      if (onChange && data?.id) onChange(data.id);
      toast.success("Localidad creada.");
      closeModal();
    } catch (err) {
      toast.error("No se pudo crear la localidad: " + (err?.message || "Error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`flex rounded-lg overflow-hidden border border-slate-300 bg-white ${className}`}>
      <div className="flex-1 min-w-0 border-r border-slate-200">
        <SearchableSelect
          options={options}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="border-0 rounded-none h-full"
        />
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 w-10 h-[38px] flex items-center justify-center bg-slate-100 hover:bg-indigo-600 text-slate-500 hover:text-white border-l border-slate-300 transition-colors"
        title="Crear localidad"
      >
        <IconPlus size={18} />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-100">
                <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">
                  Nueva localidad
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Se agregará al catálogo y quedará seleccionada.
                </p>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={newLocalidad}
                    onChange={(e) => setNewLocalidad(e.target.value)}
                    placeholder="Ej: Allen"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !newLocalidad.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <IconLoader size={16} className="animate-spin" /> : null}
                    {saving ? "Guardando..." : "Crear"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
