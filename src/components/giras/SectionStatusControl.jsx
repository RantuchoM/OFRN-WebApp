import React, { useState, useEffect } from "react";
import {
  IconCheck,
  IconLoader,
  IconFileText,
  IconClock,
  IconHistory,
} from "../ui/Icons";

// AGREGAMOS prop 'onUpdate'
export default function SectionStatusControl({
  supabase,
  giraId,
  sectionKey,
  sectionLabel,
  currentUserId,
  compact,
  onUpdate,
}) {
  const [progresoId, setProgresoId] = useState(null);
  const [estado, setEstado] = useState("PENDING");
  const [observaciones, setObservaciones] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const STATE_CONFIG = {
    PENDING: {
      label: "Sin Iniciar",
      colorClass:
        "bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200",
      icon: (
        <div className="w-3 h-3 rounded-full border-2 border-slate-300"></div>
      ),
      nextState: "IN_PROGRESS",
    },
    IN_PROGRESS: {
      label: "Iniciado",
      colorClass:
        "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200",
      icon: <IconClock size={14} className="text-amber-600" />,
      nextState: "COMPLETED",
    },
    COMPLETED: {
      label: "Finalizado",
      colorClass:
        "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
      icon: <IconCheck size={14} className="text-emerald-600" />,
      nextState: "PENDING",
    },
  };

  const currentConfig = STATE_CONFIG[estado] || STATE_CONFIG["PENDING"];

  useEffect(() => {
    if (giraId && sectionKey) fetchStatus();
  }, [giraId, sectionKey]);

  useEffect(() => {
    if (isOpen && progresoId) fetchHistory();
  }, [isOpen, progresoId]);

  const fetchStatus = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("giras_progreso")
      .select("id, estado, observaciones")
      .eq("id_gira", giraId)
      .eq("seccion_clave", sectionKey)
      .maybeSingle();

    if (data) {
      setProgresoId(data.id);
      setEstado(data.estado || "PENDING");
      setObservaciones(data.observaciones || "");
    } else {
      setProgresoId(null);
      setEstado("PENDING");
      setObservaciones("");
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    if (!progresoId) return;
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("giras_progreso_historial")
      .select(
        `estado_anterior, estado_nuevo, fecha_modificacion, integrantes ( nombre, apellido )`
      )
      .eq("id_progreso", progresoId)
      .order("fecha_modificacion", { ascending: false });
    if (!error && data) setHistory(data);
    setLoadingHistory(false);
  };

  const handleToggle = async () => {
    const nextState = currentConfig.nextState;
    setEstado(nextState); // Optimista
    await saveToDb({ estado: nextState, observaciones });
  };

  const handleSaveObservations = async () => {
    setSaving(true);
    await saveToDb({ estado, observaciones });
    setSaving(false);
    setIsOpen(false);
  };

  const saveToDb = async (payload) => {
    if (!currentUserId) return alert("Error: Usuario no identificado.");

    const { data, error } = await supabase
      .from("giras_progreso")
      .upsert(
        {
          id_gira: giraId,
          seccion_clave: sectionKey,
          estado: payload.estado,
          observaciones: payload.observaciones,
          updated_by: currentUserId,
          updated_at: new Date(),
        },
        { onConflict: "id_gira, seccion_clave" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error guardando:", error);
      fetchStatus();
    } else {
      if (data) setProgresoId(data.id);
      // NOTIFICAR AL PADRE
      if (onUpdate) onUpdate(payload.estado);
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const translateState = (st) => {
    if (st === "PENDING") return "Sin Iniciar";
    if (st === "IN_PROGRESS") return "Iniciado";
    if (st === "COMPLETED") return "Finalizado";
    return st;
  };

  if (loading)
    return (
      <div className="text-[10px] text-slate-400 flex items-center gap-1">
        <IconLoader className="animate-spin" />
      </div>
    );

  return (
    <div className="flex items-start gap-2 relative z-20">
      <div
        className={`flex items-center gap-0 border rounded-lg overflow-hidden transition-all shadow-sm ${
          currentConfig.colorClass.split(" ")[0]
        } ${currentConfig.colorClass.split(" ").pop()}`}
      >
        <button
          onClick={handleToggle}
          className={`px-3 py-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors border-r ${currentConfig.colorClass}`}
          title={`Estado actual: ${currentConfig.label}. Click para cambiar.`}
        >
          {currentConfig.icon}
          {currentConfig.label}
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-2 py-1.5 hover:bg-black/5 flex items-center gap-1 relative ${
            observaciones ? "text-indigo-600" : "text-slate-400"
          }`}
          title="Historial y Notas"
        >
          <IconFileText size={16} />
          {observaciones && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 p-0 animate-in fade-in slide-in-from-top-2 z-50 overflow-hidden">
          <div className="bg-slate-50 p-3 border-b flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <IconHistory size={12} /> Actividad: {sectionLabel}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <div className="bg-slate-50/50 max-h-32 overflow-y-auto border-b border-slate-100 p-2">
            {loadingHistory && (
              <div className="text-center text-[10px] text-slate-400 py-2">
                Cargando historial...
              </div>
            )}
            {!loadingHistory && history.length === 0 && (
              <div className="text-center text-[10px] text-slate-400 py-2 italic">
                Sin cambios recientes.
              </div>
            )}
            {!loadingHistory &&
              history.map((h, i) => (
                <div
                  key={i}
                  className="flex gap-2 text-[10px] text-slate-600 mb-1.5 px-2"
                >
                  <span className="text-slate-400 whitespace-nowrap">
                    {formatDate(h.fecha_modificacion)}
                  </span>
                  <div>
                    <span className="font-bold text-indigo-600">
                      {h.integrantes
                        ? `${h.integrantes.nombre} ${h.integrantes.apellido}`
                        : "Usuario"}
                    </span>
                    <span className="mx-1 text-slate-400">Changed to</span>
                    <span
                      className={`font-bold ${
                        h.estado_nuevo === "COMPLETED"
                          ? "text-emerald-600"
                          : "text-slate-600"
                      }`}
                    >
                      {translateState(h.estado_nuevo)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          <div className="p-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
              Observaciones Generales
            </label>
            <textarea
              className="w-full text-xs border border-slate-200 rounded p-2 text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none resize-none h-20 mb-2"
              placeholder="Escribe detalles pendientes o notas..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              autoFocus
            />
            <button
              onClick={handleSaveObservations}
              disabled={saving}
              className="w-full text-xs bg-indigo-600 text-white px-3 py-2 rounded font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              {saving ? <IconLoader className="animate-spin" /> : <IconCheck />}{" "}
              Guardar Nota
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
