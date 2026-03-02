import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { IconX, IconCheck, IconLoader } from "../ui/Icons";
import SearchableSelect from "../ui/SearchableSelect";

export default function QuickGuestModal({ supabase, isOpen, onClose, onCreated }) {
  const [apellido, setApellido] = useState("");
  const [nombre, setNombre] = useState("");
  const [instrumentOptions, setInstrumentOptions] = useState([]);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(null);
  const [mail, setMail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase || !isOpen) return;
    const loadInstruments = async () => {
      const { data, error } = await supabase
        .from("instrumentos")
        .select("id, instrumento")
        .order("instrumento", { ascending: true });
      if (error) {
        console.error("Error cargando instrumentos:", error);
        return;
      }
      const opts =
        data?.map((row) => ({
          id: row.id,
          label: row.instrumento || row.id,
        })) || [];
      setInstrumentOptions(opts);
    };
    loadInstruments();
  }, [supabase, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setApellido("");
      setNombre("");
      setSelectedInstrumentId(null);
      setMail("");
      setTelefono("");
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apellido.trim() || !nombre.trim()) {
      alert("Nombre y Apellido son obligatorios.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        apellido: apellido.trim(),
        nombre: nombre.trim(),
        condicion: "Invitado",
        mail: mail.trim() || null,
        telefono: telefono.trim() || null,
        id_instr: selectedInstrumentId || null,
      };

      const { data, error } = await supabase
        .from("integrantes")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;

      onCreated?.(data);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error al crear invitado: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Crear Invitado Rápido
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <IconX size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Apellido *
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Nombre *
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Instrumento
            </label>
            <SearchableSelect
              options={instrumentOptions}
              value={selectedInstrumentId}
              onChange={setSelectedInstrumentId}
              placeholder="Seleccionar instrumento..."
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                value={mail}
                onChange={(e) => setMail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Teléfono
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white flex items-center gap-1.5 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? (
                <IconLoader size={14} className="animate-spin" />
              ) : (
                <IconCheck size={14} />
              )}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

