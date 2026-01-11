import React, { useState, useEffect } from "react";
import { 
  IconX, 
  IconPlus, 
  IconTrash, 
  IconMapPin, 
  IconClock, 
  IconUsers,
  IconChevronDown,
  IconChevronUp
} from "../../components/ui/Icons";
import { matchesRule } from "../../hooks/useLogistics";

// Helpers de Etiquetado
const getScopeLabel = (scope) => {
  switch (scope) {
    case "General": return "General (Todos)";
    case "Region": return "Por Región";
    case "Localidad": return "Por Localidad";
    case "Categoria": return "Por Categoría";
    case "Persona": return "Individual";
    default: return scope;
  }
};

const getPriorityColor = (prio) => {
  if (prio >= 5) return "bg-purple-100 text-purple-700 border-purple-200"; // Persona
  if (prio === 4) return "bg-indigo-100 text-indigo-700 border-indigo-200"; // Categoría
  if (prio === 3) return "bg-cyan-100 text-cyan-700 border-cyan-200"; // Localidad
  if (prio === 2) return "bg-blue-100 text-blue-700 border-blue-200"; // Región
  return "bg-slate-100 text-slate-600 border-slate-200"; // General
};

export default function StopRulesManager({
  isOpen,
  onClose,
  event,
  type, // "up" | "down"
  transportId,
  supabase,
  giraId,
  regions,
  localities,
  musicians, // Roster completo
  onRefresh,
}) {
  const [existingRules, setExistingRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRuleId, setExpandedRuleId] = useState(null); // Estado para el acordeón

  // Formulario nueva regla
  const [newScope, setNewScope] = useState("General");
  const [targetId, setTargetId] = useState("");

  const title = type === "up" ? "Gestionar Subidas" : "Gestionar Bajadas";
  const colorClass = type === "up" ? "text-emerald-700" : "text-rose-700";
  const bgClass = type === "up" ? "bg-emerald-50" : "bg-rose-50";

  useEffect(() => {
    if (isOpen && transportId) {
      fetchRules();
    }
  }, [isOpen, transportId, event]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const fieldToCheck = type === "up" ? "id_evento_subida" : "id_evento_bajada";
      
      // Buscamos en la NUEVA tabla de RUTAS
      const { data, error } = await supabase
        .from("giras_logistica_rutas")
        .select("*")
        .eq("id_gira", giraId)
        .eq("id_transporte_fisico", transportId)
        .eq(fieldToCheck, event.id) // Solo reglas que apunten a ESTE evento
        .order("prioridad", { ascending: false });

      if (error) throw error;
      setExistingRules(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (newScope !== "General" && !targetId) return alert("Selecciona un valor objetivo.");
    
    setLoading(true);
    try {
      let priority = 1;
      if (newScope === "Region") priority = 2;
      if (newScope === "Localidad") priority = 3;
      if (newScope === "Categoria") priority = 4;
      if (newScope === "Persona") priority = 5;

      const payload = {
        id_gira: giraId,
        id_transporte_fisico: transportId,
        alcance: newScope,
        prioridad: priority,
        // Asignamos el evento actual como subida o bajada
        id_evento_subida: type === "up" ? event.id : null,
        id_evento_bajada: type === "down" ? event.id : null,
        
        // Datos específicos
        id_region: newScope === "Region" ? targetId : null,
        id_localidad: newScope === "Localidad" ? targetId : null,
        id_integrante: newScope === "Persona" ? targetId : null,
        target_ids: newScope === "Categoria" ? [targetId] : [], 
      };

      // Nota: Si ya existe una regla para esa persona en esa tabla (rutas), deberíamos actualizarla o insertar nueva.
      // Por simplicidad insertamos, asumiendo que el usuario gestiona duplicados visualmente.
      
      const { error } = await supabase.from("giras_logistica_rutas").insert([payload]);
      if (error) throw error;

      setNewScope("General");
      setTargetId("");
      fetchRules();
      onRefresh && onRefresh(); // Actualizar dashboard principal
    } catch (err) {
      console.error(err);
      alert("Error al crear regla.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    // Aquí solo "desvinculamos" el evento de la regla, o borramos la regla si solo servía para esto.
    // Para simplificar UX, borramos la regla de la tabla de rutas.
    if (!confirm("¿Eliminar esta definición de parada?")) return;
    try {
      await supabase.from("giras_logistica_rutas").delete().eq("id", ruleId);
      fetchRules();
      onRefresh && onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const resolveTargetName = (rule) => {
    if (rule.alcance === "General") return "Todos";
    if (rule.alcance === "Region") return regions.find(r => String(r.id) === String(rule.id_region))?.region || "Región";
    if (rule.alcance === "Localidad") return localities.find(l => String(l.id) === String(rule.id_localidad))?.localidad || "Localidad";
    if (rule.alcance === "Persona") {
        const p = musicians.find(m => String(m.id) === String(rule.id_integrante));
        return p ? `${p.apellido}, ${p.nombre}` : "Persona";
    }
    if (rule.alcance === "Categoria") return rule.target_ids?.[0] || "Categoría";
    return "-";
  };

  // Helper para calcular afectados en tiempo real
  const getAffectedPeople = (rule) => {
    if (!musicians) return [];
    // Usamos el helper matchesRule que ya contiene la lógica estricta (solo estables para regiones, etc.)
    return musicians.filter(p => matchesRule(rule, p));
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in-95">
        
        {/* Header */}
        <div className={`p-4 border-b rounded-t-xl flex justify-between items-start ${bgClass}`}>
          <div>
            <h3 className={`text-lg font-bold ${colorClass} flex items-center gap-2`}>
                <IconMapPin size={20} /> {title}
            </h3>
            <div className="mt-1 text-sm font-medium text-slate-600">
                {event.locaciones?.nombre || event.descripcion || "Lugar sin nombre"}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <IconClock size={12} /> {event.hora_inicio?.slice(0,5)} hs
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-full transition-colors">
            <IconX size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* 1. Lista de Reglas Existentes */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reglas Activas</h4>
                
                {existingRules.length === 0 && (
                    <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-lg">
                        <span className="text-sm text-slate-400">Nadie tiene asignada esta parada aún.</span>
                    </div>
                )}

                {existingRules.map(rule => {
                    const affectedPeople = getAffectedPeople(rule);
                    const isExpanded = expandedRuleId === rule.id;

                    return (
                        <div key={rule.id} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden transition-all">
                            {/* Cabecera de la Regla */}
                            <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" 
                                 onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}>
                                <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityColor(rule.prioridad)}`}>
                                        {rule.alcance}
                                    </span>
                                    <span className="text-sm font-bold text-slate-700">
                                        {resolveTargetName(rule)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
                                        <IconUsers size={12} /> {affectedPeople.length}
                                    </span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule.id); }} 
                                        className="text-slate-300 hover:text-red-500 p-1"
                                    >
                                        <IconTrash size={16} />
                                    </button>
                                    <div className="text-slate-400">
                                        {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                                    </div>
                                </div>
                            </div>

                            {/* Acordeón con lista de personas */}
                            {isExpanded && (
                                <div className="bg-slate-50 border-t border-slate-100 p-3 animate-in slide-in-from-top-2">
                                    {affectedPeople.length > 0 ? (
                                        <ul className="grid grid-cols-2 gap-2">
                                            {affectedPeople.map(p => (
                                                <li key={p.id} className="text-xs text-slate-600 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                                    {p.apellido}, {p.nombre}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-xs text-slate-400 italic text-center py-2">
                                            Ninguna persona coincide con esta regla actualmente.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 2. Formulario Agregar */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3">Agregar Nueva Regla</h4>
                <div className="flex gap-2 mb-3">
                    <div className="w-1/3">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">ALCANCE</label>
                        <select 
                            className="w-full text-xs border rounded p-2 outline-none focus:border-indigo-500"
                            value={newScope}
                            onChange={(e) => { setNewScope(e.target.value); setTargetId(""); }}
                        >
                            <option value="General">General</option>
                            <option value="Region">Región</option>
                            <option value="Localidad">Localidad</option>
                            <option value="Categoria">Categoría</option>
                            <option value="Persona">Persona</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">OBJETIVO</label>
                        {newScope === "General" ? (
                            <div className="text-xs text-slate-400 italic p-2 bg-white border rounded">Aplica a todos los pasajeros</div>
                        ) : newScope === "Region" ? (
                            <select className="w-full text-xs border rounded p-2" value={targetId} onChange={e => setTargetId(e.target.value)}>
                                <option value="">Seleccionar Región...</option>
                                {regions.map(r => <option key={r.id} value={r.id}>{r.region}</option>)}
                            </select>
                        ) : newScope === "Localidad" ? (
                            <select className="w-full text-xs border rounded p-2" value={targetId} onChange={e => setTargetId(e.target.value)}>
                                <option value="">Seleccionar Localidad...</option>
                                {localities.map(l => <option key={l.id} value={l.id}>{l.localidad}</option>)}
                            </select>
                        ) : newScope === "Categoria" ? (
                            <select className="w-full text-xs border rounded p-2" value={targetId} onChange={e => setTargetId(e.target.value)}>
                                <option value="">Seleccionar...</option>
                                <option value="SOLISTAS">Solistas</option>
                                <option value="DIRECTORES">Directores</option>
                                <option value="PRODUCCION">Producción</option>
                                <option value="CHOFER">Choferes</option>
                                <option value="LOCALES">Locales</option>
                                <option value="NO_LOCALES">No Locales</option>
                            </select>
                        ) : (
                            <select className="w-full text-xs border rounded p-2" value={targetId} onChange={e => setTargetId(e.target.value)}>
                                <option value="">Buscar Persona...</option>
                                {musicians.sort((a,b) => a.apellido.localeCompare(b.apellido)).map(p => (
                                    <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
                <button 
                    onClick={handleAddRule} 
                    disabled={loading}
                    className={`w-full py-2 rounded text-xs font-bold text-white shadow-sm flex justify-center items-center gap-2 ${type === 'up' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                    <IconPlus size={14} /> Asignar Parada
                </button>
            </div>

        </div>
      </div>
    </div>
  );
}