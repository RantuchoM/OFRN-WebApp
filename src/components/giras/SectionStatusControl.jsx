import React, { useState, useEffect, useRef } from "react";
import {
  IconCheck, IconLoader, IconFileText, IconClock, IconRefresh, IconX
} from "../ui/Icons";
import {
  calculateStatsFromData,
  hasCalculator,
} from "../../utils/giraStatsCalculators";

export default function SectionStatusControl({
  supabase,
  giraId,
  sectionKey,
  sectionLabel,
  currentUserId,
  onUpdate,        
  onStatsChange,   
  triggerRefresh = 0,
  calculationData = null,
  roster = null, 
  onRefreshRequest = null 
}) {
  const [progresoId, setProgresoId] = useState(null);
  const [estado, setEstado] = useState("PENDING");
  const [observaciones, setObservaciones] = useState("");
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const saveTimeoutRef = useRef(null);
  const stateRef = useRef({ estado: "PENDING", observaciones: "" });

  const STATE_CONFIG = {
    PENDING: { 
      label: "Sin Iniciar", 
      colorClass: "bg-slate-50 text-slate-500 border-slate-200", 
      icon: <div className="w-3 h-3 rounded-full border-2 border-slate-300"></div>, 
      nextState: "IN_PROGRESS" 
    },
    IN_PROGRESS: { 
      label: "Iniciado", 
      colorClass: "bg-amber-50 text-amber-700 border-amber-200", 
      icon: <IconClock size={14} className="text-amber-600" />, 
      nextState: "COMPLETED" 
    },
    COMPLETED: { 
      label: "Finalizado", 
      colorClass: "bg-emerald-50 text-emerald-700 border-emerald-100", 
      icon: <IconCheck size={14} className="text-emerald-600" />, 
      nextState: "NOT_APPLICABLE" 
    },
    NOT_APPLICABLE: { 
      label: "No Aplica", 
      colorClass: "bg-slate-100 text-slate-400 border-slate-200 opacity-70", 
      icon: <IconX size={14} className="text-slate-400" />, 
      nextState: "PENDING" 
    },
  };

  const currentConfig = STATE_CONFIG[estado] || STATE_CONFIG["PENDING"];

  useEffect(() => {
    stateRef.current = { estado, observaciones };
  }, [estado, observaciones]);

  // Reportar stats al padre
  useEffect(() => {
    if (estado === "NOT_APPLICABLE") {
        if (stats !== null && onStatsChange) onStatsChange(null);
    } else {
        if (onStatsChange && stats) onStatsChange(stats);
    }
  }, [stats, onStatsChange, estado]);

  // Carga Inicial
  useEffect(() => {
    if (giraId && sectionKey) loadInitialData();
  }, [giraId, sectionKey]);

  async function loadInitialData() {
    setLoading(true);
    try {
      // Nota: Si no existe columna 'stats', Supabase la ignorará en el select o devolverá null en data.stats si existe
      const { data, error } = await supabase
        .from("giras_progreso")
        .select("*")
        .eq("id_gira", giraId)
        .eq("seccion_clave", sectionKey)
        .maybeSingle();

      if (error) {
        console.error("[StatusControl] Error cargando datos:", error);
      }

      if (data) {
        setProgresoId(data.id);
        setEstado(data.estado || "PENDING");
        setObservaciones(data.observaciones || "");
        // Intentamos cargar stats si existen (si aplicaste el cambio SQL funcionará, sino ignorará)
        if (data.estado !== "NOT_APPLICABLE" && data.stats) {
            setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("[StatusControl] Error general:", err);
    } finally {
      setLoading(false);
    }
  }

  // Cálculo Reactivo
  useEffect(() => {
    if (estado === "NOT_APPLICABLE") {
        setStats(null);
        return;
    }

    if (hasCalculator(sectionKey) && roster) {
      const context = { roster: roster, ...(calculationData || {}) };
      const newStats = calculateStatsFromData(sectionKey, context);

      if (newStats) {
        if (JSON.stringify(newStats) !== JSON.stringify(stats)) {
            setStats(newStats);
            // IMPORTANTE: Comentamos el auto-guardado de stats por ahora si no hay columna
            /* if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                persistData({ stats: newStats });
            }, 2000);
            */
        }
      }
    }
  }, [roster, sectionKey, triggerRefresh, calculationData, estado]); 

  // --- FUNCIÓN DE GUARDADO PRINCIPAL (MODIFICADA) ---
  const persistData = async (overrides = {}) => {
    if (!giraId || !sectionKey) return;
    
    const newStatus = overrides.estado || stateRef.current.estado;
    const obsToSave = overrides.observaciones !== undefined ? overrides.observaciones : stateRef.current.observaciones;

    // --- CORRECCIÓN AQUÍ: ELIMINAMOS 'stats' DEL PAYLOAD ---
    // Si no tienes la columna en BD, enviar este campo rompe todo.
    // Al quitarlo, el estado se guarda correctamente. El cálculo de stats se hará "en vivo" en el frontend.
    const payload = {
      id_gira: giraId,
      seccion_clave: sectionKey,
      estado: newStatus,
      observaciones: obsToSave,
      // stats: statsToSave, // <--- COMENTADO PARA EVITAR EL ERROR PGRST204
      updated_at: new Date(),
      updated_by: currentUserId
    };

    console.log("[StatusControl] Guardando payload limpio:", payload);

    try {
        const { data, error } = await supabase
            .from("giras_progreso")
            .upsert(payload, { onConflict: "id_gira, seccion_clave" })
            .select()
            .single();

        if (error) {
            console.error("[StatusControl] ERROR AL GUARDAR:", error);
            // No mostramos alert para no bloquear UX si falla silenciosamente
            return { error };
        }

        if (data) setProgresoId(data.id);
        return { data };

    } catch (err) {
        console.error("[StatusControl] Excepción al guardar:", err);
        return { error: err };
    }
  };

  const handleToggle = async () => {
    const nextState = currentConfig.nextState;
    setEstado(nextState); 
    if (onUpdate) onUpdate(nextState);

    setSaving(true);
    await persistData({ estado: nextState });
    setSaving(false);
  };

  const handleSaveObservations = async () => {
    setSaving(true);
    await persistData({ observaciones });
    setSaving(false);
    setIsOpen(false);
  };

  const handleManualRefresh = (e) => {
    if (e) e.stopPropagation();
    if (onRefreshRequest) onRefreshRequest(); 
  };

  useEffect(() => {
    if (isOpen && progresoId) {
      setLoadingHistory(true);
      supabase.from("giras_progreso_historial")
        .select(`estado_anterior, estado_nuevo, fecha_modificacion, integrantes(nombre, apellido)`)
        .eq("id_progreso", progresoId)
        .order("fecha_modificacion", { ascending: false })
        .then(({ data }) => {
          if (data) setHistory(data);
          setLoadingHistory(false);
        });
    }
  }, [isOpen, progresoId]);

  if (loading) return <div className="h-7 px-4 flex items-center"><IconLoader size={14} className="animate-spin text-slate-300" /></div>;

  return (
    <div className="flex items-center relative z-20 select-none">
      {/* BADGE KPI */}
      {estado !== "NOT_APPLICABLE" && (
          <>
            {stats?.kpi?.[0] ? (
                <div 
                className={`flex items-center gap-2 h-7 px-2 rounded-lg border text-xs mr-2 transition-all cursor-help ${
                    stats.kpi[0].color === 'red' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    stats.kpi[0].color === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    stats.kpi[0].color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-slate-100 text-slate-500 border-slate-200 font-medium'
                }`}
                title={stats.tooltip || ""}
                >
                <span className="whitespace-nowrap font-bold">{stats.kpi[0].value} {stats.kpi[0].label}</span>
                <button onClick={handleManualRefresh} className="opacity-30 hover:opacity-100"><IconRefresh size={10} /></button>
                </div>
            ) : hasCalculator(sectionKey) && (
                <button onClick={handleManualRefresh} className="h-7 px-3 bg-slate-50 border rounded-lg mr-2 text-slate-300 hover:text-slate-500" title="Calcular estadísticas">
                <IconRefresh size={12} />
                </button>
            )}
          </>
      )}

      {/* CONTROLES DE ESTADO */}
      <div className={`flex items-center border rounded-lg overflow-hidden shadow-sm ${currentConfig.colorClass}`}>
        <button onClick={handleToggle} disabled={saving} className={`px-3 py-1.5 h-7 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-r border-black/5 hover:bg-black/10 ${currentConfig.colorClass}`}>
          {saving ? <IconLoader size={12} className="animate-spin" /> : <>{currentConfig.icon} {currentConfig.label}</>}
        </button>
        <button onClick={() => setIsOpen(!isOpen)} className={`px-2 h-7 flex items-center justify-center hover:bg-black/5 transition-colors ${observaciones ? "text-indigo-600" : "text-slate-400"}`}>
          <IconFileText size={16} />
          {observaciones && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full border border-white"></span>}
        </button>
      </div>

      {/* MODAL NOTAS */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="bg-slate-50 p-3 border-b flex justify-between items-center font-bold text-[10px] text-slate-500 uppercase">
            <span>Actividad: {sectionLabel}</span>
            <button onClick={() => setIsOpen(false)} className="hover:text-slate-700">✕</button>
          </div>
          <div className="max-h-40 overflow-y-auto bg-slate-50/30">
            {loadingHistory ? <div className="p-4 text-center"><IconLoader size={14} className="animate-spin" /></div> : 
             history.length === 0 ? <div className="p-4 text-center text-xs text-slate-400 italic">Sin movimientos</div> :
             history.map((h, i) => (
              <div key={i} className="px-3 py-2 border-b border-slate-100">
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="font-bold text-indigo-700">{h.integrantes ? `${h.integrantes.nombre} ${h.integrantes.apellido}` : "Usuario"}</span>
                  <span className="text-slate-400 text-[9px]">{new Date(h.fecha_modificacion).toLocaleDateString()}</span>
                </div>
                <div className="text-[10px] text-slate-600 italic truncate">{h.estado_anterior} → {h.estado_nuevo}</div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-white">
            <textarea className="w-full text-xs border border-slate-200 rounded p-2 h-20 mb-2 bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas..." />
            <button onClick={handleSaveObservations} disabled={saving} className="w-full bg-indigo-600 text-white text-xs py-2 rounded font-bold hover:bg-indigo-700 transition-colors">{saving ? "Guardando..." : "Guardar Nota"}</button>
          </div>
        </div>
      )}
    </div>
  );
}