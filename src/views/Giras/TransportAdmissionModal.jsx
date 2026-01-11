import React, { useState, useEffect } from "react";
import { IconX, IconTrash, IconPlus, IconAlertTriangle, IconCheck } from "../../components/ui/Icons";

const SCOPES = [
  { val: "General", label: "General (Todos)", prio: 1 },
  { val: "Region", label: "Por Región", prio: 2 },
  { val: "Localidad", label: "Por Localidad", prio: 3 },
  { val: "Categoria", label: "Por Categoría / Rol", prio: 4 },
  { val: "Persona", label: "Individual", prio: 5 },
];

const CATEGORIA_OPTIONS = [
  { val: "SOLISTAS", label: "Solistas" },
  { val: "DIRECTORES", label: "Directores" },
  { val: "PRODUCCION", label: "Producción / Staff" },
  { val: "CHOFER", label: "Choferes" },
  { val: "LOCALES", label: "Locales (Residentes)" },
  { val: "NO_LOCALES", label: "No Locales" },
];

export default function TransportAdmissionModal({
  isOpen,
  onClose,
  transporte,
  roster,
  regions,
  localities,
  supabase,
  giraId,
  onUpdate,
}) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Formulario nueva regla
  const [newScope, setNewScope] = useState("General");
  const [newType, setNewType] = useState("INCLUSION");
  const [targetId, setTargetId] = useState("");

  useEffect(() => {
    if (isOpen && transporte) {
      fetchRules();
    }
  }, [isOpen, transporte]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("giras_logistica_admision")
        .select("*")
        .eq("id_gira", giraId)
        .eq("id_transporte_fisico", transporte.id)
        .order("prioridad", { ascending: false }); // Las más importantes primero

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error("Error fetching rules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    // Validaciones
    if (newScope !== "General" && !targetId) return alert("Debes seleccionar un valor.");

    setLoading(true);
    try {
      const payload = {
        id_gira: giraId,
        id_transporte_fisico: transporte.id,
        alcance: newScope,
        tipo: newType,
        prioridad: SCOPES.find(s => s.val === newScope)?.prio || 1,
        // Limpiamos campos según el alcance
        id_integrante: newScope === "Persona" ? targetId : null,
        id_region: newScope === "Region" ? targetId : null,
        id_localidad: newScope === "Localidad" ? targetId : null,
        instrumento_familia: null, // Legacy field not used heavily anymore
        target_ids: newScope === "Categoria" ? [targetId] : [], 
      };

      const { error } = await supabase.from("giras_logistica_admision").insert([payload]);
      if (error) throw error;

      // Reset y recarga
      setNewScope("General");
      setTargetId("");
      fetchRules();
      onUpdate && onUpdate();
    } catch (err) {
      console.error(err);
      alert("Error al crear regla");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!confirm("¿Borrar esta regla de admisión?")) return;
    try {
      await supabase.from("giras_logistica_admision").delete().eq("id", id);
      fetchRules();
      onUpdate && onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  // Renderizadores de nombre
  const resolveName = (rule) => {
    if (rule.alcance === "General") return "Todos los integrantes";
    if (rule.alcance === "Region") return regions.find(r => String(r.id) === String(rule.id_region))?.region || "Región ??";
    if (rule.alcance === "Localidad") return localities.find(l => String(l.id) === String(rule.id_localidad))?.localidad || "Localidad ??";
    if (rule.alcance === "Categoria") {
        const cat = CATEGORIA_OPTIONS.find(c => rule.target_ids?.includes(c.val));
        return cat ? cat.label : (rule.target_ids?.[0] || "Categoría");
    }
    if (rule.alcance === "Persona") {
        const p = roster.find(m => String(m.id) === String(rule.id_integrante));
        return p ? `${p.apellido}, ${p.nombre}` : `ID: ${rule.id_integrante}`;
    }
    return "-";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
        
        {/* HEADER */}
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <IconAlertTriangle className="text-amber-500" />
                Reglas de Admisión
            </h3>
            <p className="text-xs text-slate-500">
              Define quién tiene derecho a viajar en: <span className="font-bold text-indigo-600">{transporte?.nombre}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <IconX size={20} className="text-slate-500" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
            
            {/* FORMULARIO */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm mb-4 flex gap-2 items-end">
                <div className="w-32">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">ALCANCE</label>
                    <select className="w-full text-xs border rounded p-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newScope} onChange={e => { setNewScope(e.target.value); setTargetId(""); }}
                    >
                        {SCOPES.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                    </select>
                </div>

                <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">OBJETIVO</label>
                    {newScope === "General" ? (
                        <div className="text-xs text-slate-400 italic p-1.5 bg-slate-50 border rounded">Aplica a todo el padrón</div>
                    ) : newScope === "Region" ? (
                        <select className="w-full text-xs border rounded p-1.5" value={targetId} onChange={e => setTargetId(e.target.value)}>
                            <option value="">Seleccionar Región...</option>
                            {regions.map(r => <option key={r.id} value={r.id}>{r.region}</option>)}
                        </select>
                    ) : newScope === "Localidad" ? (
                        <select className="w-full text-xs border rounded p-1.5" value={targetId} onChange={e => setTargetId(e.target.value)}>
                            <option value="">Seleccionar Localidad...</option>
                            {localities.map(l => <option key={l.id} value={l.id}>{l.localidad}</option>)}
                        </select>
                    ) : newScope === "Categoria" ? (
                        <select className="w-full text-xs border rounded p-1.5" value={targetId} onChange={e => setTargetId(e.target.value)}>
                            <option value="">Seleccionar Categoría...</option>
                            {CATEGORIA_OPTIONS.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
                        </select>
                    ) : (
                        <select className="w-full text-xs border rounded p-1.5" value={targetId} onChange={e => setTargetId(e.target.value)}>
                            <option value="">Seleccionar Persona...</option>
                            {roster.sort((a,b) => a.apellido.localeCompare(b.apellido)).map(p => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
                        </select>
                    )}
                </div>

                <div className="w-32">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">ACCIÓN</label>
                    <select className={`w-full text-xs border rounded p-1.5 font-bold ${newType === 'INCLUSION' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200'}`}
                        value={newType} onChange={e => setNewType(e.target.value)}
                    >
                        <option value="INCLUSION">INCLUIR (Viaja)</option>
                        <option value="EXCLUSION">EXCLUIR (No viaja)</option>
                    </select>
                </div>

                <button onClick={handleAddRule} disabled={loading} className="bg-indigo-600 text-white p-1.5 rounded hover:bg-indigo-700 disabled:opacity-50">
                    <IconPlus size={20} />
                </button>
            </div>

            {/* LISTA DE REGLAS */}
            <div className="space-y-2">
                {rules.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-lg">
                        <p className="text-slate-400 text-sm">No hay reglas definidas.</p>
                        <p className="text-slate-300 text-xs mt-1">Nadie viajará en este transporte hasta que agregues una regla de Inclusión (ej: General).</p>
                    </div>
                )}

                {rules.map(rule => (
                    <div key={rule.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs ${rule.tipo === 'INCLUSION' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {rule.tipo === 'INCLUSION' ? <IconCheck size={16} /> : <IconX size={16} />}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-700">{resolveName(rule)}</div>
                                <div className="flex gap-2 text-[10px] uppercase font-bold text-slate-400">
                                    <span>{rule.alcance}</span>
                                    <span>•</span>
                                    <span>Prioridad: {rule.prioridad}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => handleDeleteRule(rule.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                            <IconTrash size={16} />
                        </button>
                    </div>
                ))}
            </div>

        </div>
        
        <div className="p-3 bg-slate-50 border-t text-[10px] text-slate-400 text-center rounded-b-xl">
            Las reglas de Persona (Prioridad 5) prevalecen sobre las Generales (Prioridad 1).
        </div>
      </div>
    </div>
  );
}