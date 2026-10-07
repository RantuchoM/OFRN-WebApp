import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import SearchableSelect from "../ui/SearchableSelect";
import LocalitySelectWithCreate from "./LocalitySelectWithCreate";
import { IconPlus, IconLoader, IconEdit, IconExchange } from "../ui/Icons";
import LocationManagerModal from "../locations/LocationManagerModal";
import { toast } from "sonner";

/**
 * Selector de locaciones con botón de creación rápida.
 * Permite insertar una nueva locación (sede de ensayo) sin salir del formulario.
 * Incluye: nombre, localidad, dirección, link Maps, teléfono, aforo (capacidad) y mail.
 */
export default function LocationSelectWithCreate({
  supabase,
  value,
  onChange,
  options = [],
  onRefresh,
  placeholder = "Sin lugar asignado",
  className = "",
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [intentOpen, setIntentOpen] = useState(false);
  const [selectOpenToken, setSelectOpenToken] = useState(0);
  const [editLocationId, setEditLocationId] = useState(null);
  const [newNombre, setNewNombre] = useState("");
  const [newIdLocalidad, setNewIdLocalidad] = useState("");
  const [newDireccion, setNewDireccion] = useState("");
  const [newLinkMapa, setNewLinkMapa] = useState("");
  const [newTelefono, setNewTelefono] = useState("");
  const [newAforo, setNewAforo] = useState("");
  const [newMail, setNewMail] = useState("");
  const [saving, setSaving] = useState(false);
  const [localidadesOptions, setLocalidadesOptions] = useState([]);

  const fetchLocalidades = useCallback(async () => {
    const { data } = await supabase
      .from("localidades")
      .select("id, localidad")
      .order("localidad");
    setLocalidadesOptions(
      (data || []).map((l) => ({ id: l.id, label: l.localidad }))
    );
  }, [supabase]);

  useEffect(() => {
    if (modalOpen) {
      fetchLocalidades();
    }
  }, [modalOpen, fetchLocalidades]);

  const selectedPlaceName = useMemo(() => {
    const match = (options || []).find((o) => String(o.id) === String(value));
    const label = String(match?.label || match?.nombre || "").trim();
    return label || "este lugar";
  }, [options, value]);

  useEffect(() => {
    if (!intentOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setIntentOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [intentOpen]);

  const resetForm = useCallback(() => {
    setNewNombre("");
    setNewIdLocalidad("");
    setNewDireccion("");
    setNewLinkMapa("");
    setNewTelefono("");
    setNewAforo("");
    setNewMail("");
  }, []);

  const handleCreate = async (e) => {
    e?.preventDefault();
    const nombre = newNombre?.trim();
    if (!nombre) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre,
        id_localidad: newIdLocalidad || null,
        direccion: newDireccion?.trim() || null,
        link_mapa: newLinkMapa?.trim() || null,
        telefono: newTelefono?.trim() || null,
        capacidad: newAforo?.trim() ? Number(newAforo) : null,
        mail: newMail?.trim() || null,
      };
      const { data, error } = await supabase
        .from("locaciones")
        .insert([payload])
        .select("id")
        .single();

      if (error) throw error;

      toast.success("Locación creada correctamente");
      setModalOpen(false);
      resetForm();

      if (onRefresh) await onRefresh();
      if (onChange && data?.id) onChange(data.id);
    } catch (err) {
      toast.error("Error al crear: " + (err.message || "Error desconocido"));
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
          requestOpen={selectOpenToken}
        />
      </div>
      {value != null && value !== "" && (
        <button
          type="button"
          onClick={() => setIntentOpen(true)}
          className="shrink-0 w-8 h-[38px] flex items-center justify-center bg-slate-50 hover:bg-amber-500 text-slate-400 hover:text-white border-l border-slate-300 transition-colors"
          title="Cambiar el lugar de este evento, o corregir los datos del lugar"
          aria-label="Cambiar el lugar de este evento, o corregir los datos del lugar"
        >
          <IconEdit size={14} />
        </button>
      )}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="shrink-0 w-10 h-[38px] flex items-center justify-center bg-slate-100 hover:bg-indigo-600 text-slate-500 hover:text-white border-l border-slate-300 transition-colors"
        title="Crear nueva locación"
      >
        <IconPlus size={18} />
      </button>

      {intentOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setIntentOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="location-intent-title"
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-100">
                <h4
                  id="location-intent-title"
                  className="font-black text-slate-800 text-sm uppercase tracking-tight"
                >
                  ¿Qué querés cambiar?
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Elegí si este evento pasa a otro lugar, o si vas a corregir la ficha de «{selectedPlaceName}».
                </p>
              </div>
              <div className="p-5 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setIntentOpen(false);
                    setSelectOpenToken((n) => n + 1);
                  }}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  <span className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-white text-indigo-600 flex items-center justify-center border border-indigo-100">
                    <IconExchange size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-800">
                      Se hace en otro lugar
                    </span>
                    <span className="block text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Elegís otra locación. Solo cambia este evento. «{selectedPlaceName}» queda igual para los demás.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIntentOpen(false);
                    setEditLocationId(value);
                  }}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
                >
                  <span className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-white text-amber-700 flex items-center justify-center border border-amber-100">
                    <IconEdit size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-800">
                      Nombre y otros datos de:
                    </span>
                    <span className="block text-sm font-bold text-slate-800 mt-0.5 break-words">
                      {selectedPlaceName}
                    </span>
                    <span className="block text-xs text-amber-900 mt-0.5 leading-relaxed">
                      Corregís la ficha del lugar. El cambio se aplica a todos los eventos que lo usan.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIntentOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {editLocationId != null && editLocationId !== "" && (
        <LocationManagerModal
          supabase={supabase}
          initialLocationId={editLocationId}
          onClose={() => setEditLocationId(null)}
          onSuccess={async () => {
            if (onRefresh) await onRefresh();
          }}
        />
      )}

      {modalOpen &&
        createPortal(
            <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => {
              if (!saving) {
                setModalOpen(false);
                resetForm();
              }
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-100">
                <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">
                  Nueva locación
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Se creará una sede de ensayo nueva.
                </p>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    placeholder="Ej: Sala Principal"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                    Localidad
                  </label>
                  <LocalitySelectWithCreate
                    supabase={supabase}
                    options={localidadesOptions}
                    value={newIdLocalidad}
                    onChange={setNewIdLocalidad}
                    onCreated={(row) => {
                      if (!row?.id) return;
                      setLocalidadesOptions((prev) => {
                        const label = row.localidad || "";
                        const filtered = prev.filter((o) => String(o.id) !== String(row.id));
                        const next = [
                          ...filtered,
                          { id: row.id, label },
                        ];
                        return next.sort((a, b) =>
                          String(a.label || "").localeCompare(String(b.label || ""), "es"),
                        );
                      });
                    }}
                    placeholder="Seleccionar ciudad..."
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={newDireccion}
                    onChange={(e) => setNewDireccion(e.target.value)}
                    placeholder="Ej: Av. 9 de Julio 1234"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                    Link Google Maps (opcional)
                  </label>
                  <input
                    type="url"
                    value={newLinkMapa}
                    onChange={(e) => setNewLinkMapa(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={newTelefono}
                      onChange={(e) => setNewTelefono(e.target.value)}
                      placeholder="Ej: +54 11 1234-5678"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                      Aforo
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newAforo}
                      onChange={(e) => setNewAforo(e.target.value)}
                      placeholder="Ej: 500"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newMail}
                    onChange={(e) => setNewMail(e.target.value)}
                    placeholder="contacto@lugar.com"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      resetForm();
                    }}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !newNombre?.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <IconLoader size={16} className="animate-spin" />
                    ) : null}
                    {saving ? "Guardando..." : "Crear"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
