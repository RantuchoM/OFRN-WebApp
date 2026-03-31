import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconCheck,
  IconLoader,
  IconPlus,
  IconUser,
  IconX,
} from "../../components/ui/Icons";

const CONCEPTOS = [
  { id: "h_basico", label: "Basico", color: "text-blue-700 bg-blue-50 border-blue-200" },
  { id: "h_ensayos", label: "Ensayos", color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  { id: "h_ensamble", label: "Ensamble", color: "text-purple-700 bg-purple-50 border-purple-200" },
  { id: "h_categoria", label: "Categoria", color: "text-pink-700 bg-pink-50 border-pink-200" },
  { id: "h_coordinacion", label: "Coord.", color: "text-orange-700 bg-orange-50 border-orange-200" },
  { id: "h_desarraigo", label: "Desarraigo", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { id: "h_otros", label: "Otros", color: "text-slate-600 bg-slate-100 border-slate-300" },
];

const initialForm = () => ({
  origen: "CULTURA",
  mes_inicio: new Date().getMonth() + 1,
  anio_inicio: new Date().getFullYear(),
  mes_fin: "",
  anio_fin: "",
  observaciones: "",
  ...Object.fromEntries(CONCEPTOS.map((c) => [c.id, 0])),
});

export default function BulkNovedadModal({
  isOpen,
  onClose,
  supabase,
  onSuccess,
}) {
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!isOpen) return;
    setForm(initialForm());
    setSearchTerm("");
    setSelectedIds(new Set());
    fetchCandidates();
  }, [isOpen]);

  const fetchCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const { data, error } = await supabase
        .from("integrantes")
        .select(`
          id,
          apellido,
          nombre,
          condicion,
          instrumentos(instrumento),
          integrantes_ensambles(
            ensambles(id, ensamble)
          ),
          horas_catedra(id)
        `)
        .eq("condicion", "Estable")
        .order("apellido");

      if (error) throw error;

      const pending = (data || [])
        .filter((row) => !row.horas_catedra || row.horas_catedra.length === 0)
        .filter(
          (row) =>
            String(row.instrumentos?.instrumento || "")
              .trim()
              .toLowerCase() !== "menor",
        )
        .map((row) => ({
          ...row,
          ensambles: (row.integrantes_ensambles || [])
            .map((ie) => ie.ensambles)
            .filter(Boolean),
        }));
      setCandidates(pending);
    } catch (err) {
      console.error("Error loading bulk onboarding candidates:", err);
      toast.error("No se pudieron cargar los estables pendientes");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((m) => {
      const fullName = `${m.apellido || ""} ${m.nombre || ""}`.toLowerCase();
      const instrument = String(m.instrumentos?.instrumento || "").toLowerCase();
      const ensambles = (m.ensambles || [])
        .map((e) => e.ensamble || "")
        .join(" ")
        .toLowerCase();

      return (
        fullName.includes(q) ||
        instrument.includes(q) ||
        ensambles.includes(q)
      );
    });
  }, [candidates, searchTerm]);

  const toggleId = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const allVisibleSelected =
      filteredCandidates.length > 0 &&
      filteredCandidates.every((item) => selectedIds.has(item.id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredCandidates.forEach((item) => next.delete(item.id));
      } else {
        filteredCandidates.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecciona al menos un integrante");
      return;
    }

    setSaving(true);
    try {
      const payloadBase = {
        origen: form.origen,
        mes_inicio: parseInt(form.mes_inicio, 10),
        anio_inicio: parseInt(form.anio_inicio, 10),
        mes_fin: form.mes_fin ? parseInt(form.mes_fin, 10) : null,
        anio_fin: form.anio_fin ? parseInt(form.anio_fin, 10) : null,
        observaciones: form.observaciones || null,
      };

      const conceptos = Object.fromEntries(
        CONCEPTOS.map((c) => [c.id, Math.max(0, parseInt(form[c.id], 10) || 0)]),
      );

      const records = Array.from(selectedIds).map((id) => ({
        id_integrante: Number(id),
        ...payloadBase,
        ...conceptos,
      }));

      const { error } = await supabase.from("horas_catedra").insert(records);
      if (error) throw error;

      toast.success(
        `Se incorporaron ${records.length} integrantes estables a Horas Catedra`,
      );
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error("Error creating bulk onboarding records:", err);
      toast.error(err.message || "No se pudo completar la incorporacion masiva");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-slate-900/55 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <IconPlus className="text-indigo-500" />
              Estables
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Selecciona integrantes estables sin historial y aplica una novedad inicial comun.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500">
            <IconX />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-full md:w-[36%] border-r border-slate-200 bg-slate-50 p-4 overflow-y-auto custom-scrollbar">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, instrumento o ensamble..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-2 ring-indigo-100"
                />
                <button
                  onClick={toggleAllVisible}
                  className="px-2.5 py-2 text-[10px] font-bold rounded-lg border border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50"
                >
                  Todos
                </button>
              </div>

              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <IconUser size={12} />
                Pendientes ({filteredCandidates.length}) - Seleccionados ({selectedIds.size})
              </div>

              {loadingCandidates ? (
                <div className="py-8 flex justify-center">
                  <IconLoader className="animate-spin text-slate-400" />
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="text-xs text-slate-500 italic bg-white border border-slate-200 rounded-lg p-3">
                  No hay integrantes estables pendientes de incorporacion.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredCandidates.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedIds.has(item.id)
                          ? "bg-indigo-50 border-indigo-200"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleId(item.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-700 truncate">
                          {item.apellido}, {item.nombre}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {item.instrumentos?.instrumento || "Sin instrumento"}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {(item.ensambles || []).length > 0
                            ? item.ensambles.map((e) => e.ensamble).join(" - ")
                            : "Sin ensambles"}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-6 max-w-3xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex bg-slate-100 p-1 rounded-xl">
                  {["CULTURA", "EDUCACION"].map((org) => (
                    <button
                      key={org}
                      onClick={() => setForm((f) => ({ ...f, origen: org }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                        form.origen === org
                          ? "bg-white shadow text-indigo-600"
                          : "text-slate-400"
                      }`}
                    >
                      {org}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase">
                    Inicio
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="w-full border rounded-lg p-2 text-sm font-bold text-center"
                      value={form.mes_inicio}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, mes_inicio: e.target.value }))
                      }
                    />
                    <input
                      type="number"
                      className="w-full border rounded-lg p-2 text-sm font-bold text-center"
                      value={form.anio_inicio}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, anio_inicio: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase">
                    Fin
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="w-full border rounded-lg p-2 text-sm font-bold text-center bg-slate-50"
                      value={form.mes_fin}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, mes_fin: e.target.value }))
                      }
                    />
                    <input
                      type="number"
                      className="w-full border rounded-lg p-2 text-sm font-bold text-center bg-slate-50"
                      value={form.anio_fin}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, anio_fin: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CONCEPTOS.map((c) => (
                  <div key={c.id}>
                    <label
                      className="text-[9px] font-bold text-slate-400 uppercase block mb-1 truncate"
                      title={c.label}
                    >
                      {c.label}
                    </label>
                    <input
                      type="number"
                      className={`w-full p-2.5 rounded-lg border text-sm font-black outline-none focus:ring-2 transition-all ${c.color
                        .replace("text-", "border-")
                        .replace("bg-", "ring-")}`}
                      value={form[c.id] === 0 ? "" : form[c.id]}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>

              <textarea
                className="w-full border rounded-lg p-3 text-xs h-24 resize-none outline-none focus:ring-2 ring-indigo-100"
                placeholder="Observaciones..."
                value={form.observaciones}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, observaciones: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedIds.size === 0}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg"
          >
            {saving ? <IconLoader className="animate-spin" /> : <IconCheck />}
            Confirmar incorporacion
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
