import React, { useState, useEffect } from "react";
import { IconCheck, IconX, IconLoader, IconRefresh, IconUser, IconClock, IconEdit, IconTrash, IconPlus } from "../../components/ui/Icons";
import SearchableSelect from "../../components/ui/SearchableSelect";

const CONCEPTOS = [
  { id: "h_basico", label: "Básico", color: "text-blue-700 bg-blue-50 border-blue-200" },
  { id: "h_ensayos", label: "Ensayos", color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  { id: "h_ensamble", label: "Ensamble", color: "text-purple-700 bg-purple-50 border-purple-200" },
  { id: "h_categoria", label: "Categoría", color: "text-pink-700 bg-pink-50 border-pink-200" },
  { id: "h_coordinacion", label: "Coord.", color: "text-orange-700 bg-orange-50 border-orange-200" },
  { id: "h_desarraigo", label: "Desarraigo", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { id: "h_otros", label: "Otros", color: "text-slate-600 bg-slate-100 border-slate-300" },
];

export default function NovedadModal({ isOpen, onClose, supabase, musician, allMusicians, recordToEdit, onSuccess }) {
  if (!isOpen) return null;

  // Estado del Músico
  const [selectedId, setSelectedId] = useState(musician?.id || recordToEdit?.id_integrante || null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextData, setContextData] = useState({ totals: { CULTURA: {}, EDUCACION: {} }, history: [] });

  // Registro activo (puede venir de props o ser seleccionado internamente desde el historial)
  const [activeRecord, setActiveRecord] = useState(recordToEdit);

  // Estado del Formulario
  const [mode, setMode] = useState("ABSOLUTE"); 
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    origen: "CULTURA",
    mes_inicio: new Date().getMonth() + 1,
    anio_inicio: new Date().getFullYear(),
    mes_fin: "",
    anio_fin: "",
    observaciones: "",
    ...Object.fromEntries(CONCEPTOS.map(c => [c.id, 0]))
  });

  // Sincronizar prop externa con estado interno al abrir
  useEffect(() => {
    setActiveRecord(recordToEdit);
  }, [recordToEdit, isOpen]);

  // Cargar datos al formulario cuando cambia el registro activo
  useEffect(() => {
    if (activeRecord) {
        setForm({
            origen: activeRecord.origen,
            mes_inicio: activeRecord.mes_inicio,
            anio_inicio: activeRecord.anio_inicio,
            mes_fin: activeRecord.mes_fin || "",
            anio_fin: activeRecord.anio_fin || "",
            observaciones: activeRecord.observaciones || "",
            ...Object.fromEntries(CONCEPTOS.map(c => [c.id, activeRecord[c.id] || 0]))
        });
        setMode("ABSOLUTE"); // Al editar, mostramos valor absoluto
    } else {
        // Reset a modo "Nueva Novedad"
        setForm(prev => ({
            ...prev,
            mes_inicio: new Date().getMonth() + 1,
            anio_inicio: new Date().getFullYear(),
            observaciones: "",
            ...Object.fromEntries(CONCEPTOS.map(c => [c.id, 0]))
        }));
    }
  }, [activeRecord, isOpen]);

  // Buscar contexto (historial y totales)
  useEffect(() => {
    if (selectedId) {
        fetchMusicianContext(selectedId);
    } else {
        setContextData({ totals: { CULTURA: {}, EDUCACION: {} }, history: [] });
    }
  }, [selectedId, activeRecord]); // Recargar si cambia activeRecord para ajustar los totales de referencia

  const fetchMusicianContext = async (id) => {
    setContextLoading(true);
    try {
        const { data: history, error } = await supabase
            .from("horas_catedra")
            .select("*")
            .eq("id_integrante", id)
            .order("anio_inicio", { ascending: false })
            .order("mes_inicio", { ascending: false });
        
        if (error) throw error;

        // Calcular Totales Actuales excluyendo el registro que se está editando (si aplica)
        const totals = { CULTURA: {}, EDUCACION: {} };
        ["CULTURA", "EDUCACION"].forEach(org => {
            // Buscamos el último registro válido que NO sea el que estamos editando
            const latest = history?.find(h => h.origen === org && h.id !== activeRecord?.id);
            if (latest) {
                CONCEPTOS.forEach(c => totals[org][c.id] = latest[c.id] || 0);
            }
        });

        setContextData({ totals, history: history || [] });
    } catch (err) {
        console.error("Error fetching context:", err);
    } finally {
        setContextLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedId) return alert("Seleccione un integrante");
    setSaving(true);
    try {
      const payload = {
        id_integrante: selectedId,
        origen: form.origen,
        mes_inicio: parseInt(form.mes_inicio),
        anio_inicio: parseInt(form.anio_inicio),
        mes_fin: form.mes_fin ? parseInt(form.mes_fin) : null,
        anio_fin: form.anio_fin ? parseInt(form.anio_fin) : null,
        observaciones: form.observaciones,
      };

      CONCEPTOS.forEach(c => {
        const inputVal = parseInt(form[c.id]) || 0;
        let finalVal = inputVal;
        
        // Si es NUEVO y modo RELATIVO, sumamos al total actual
        if (!activeRecord && mode === "RELATIVE") {
             const currentVal = (contextData.totals[form.origen] && contextData.totals[form.origen][c.id]) || 0;
             finalVal = currentVal + inputVal;
        }
        
        if (finalVal < 0) finalVal = 0;
        payload[c.id] = finalVal;
      });

      if (activeRecord) {
          const { error } = await supabase.from("horas_catedra").update(payload).eq("id", activeRecord.id);
          if(error) throw error;
      } else {
          const { error } = await supabase.from("horas_catedra").insert(payload);
          if(error) throw error;
      }
      
      onSuccess();
      // No cerramos automáticamente si estamos editando desde la lista interna, para permitir seguir trabajando, 
      // o cerramos si se prefiere. Aquí cerramos por consistencia.
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInternalDelete = async (id) => {
      if(!confirm("¿Eliminar este registro histórico?")) return;
      try {
          const { error } = await supabase.from("horas_catedra").delete().eq("id", id);
          if (error) throw error;
          
          // Refrescar contexto local y lista externa
          fetchMusicianContext(selectedId);
          onSuccess(); 
          
          // Si estábamos editando el que borramos, limpiar
          if(activeRecord?.id === id) setActiveRecord(null);
      } catch (err) {
          alert("Error: " + err.message);
      }
  };

  const activeMusician = allMusicians?.find(m => m.id === selectedId) || musician;

  // Renderizador de línea de historial con botones
  const renderHistoryLine = (item) => {
      const total = CONCEPTOS.reduce((acc, c) => acc + (item[c.id] || 0), 0);
      const isEditing = activeRecord?.id === item.id;
      
      return (
          <div key={item.id} className={`text-[10px] border-l-2 pl-2 pb-2 relative group transition-all ${isEditing ? 'border-indigo-500 bg-indigo-50/50 rounded-r' : 'border-slate-200'}`}>
              <div className={`absolute -left-[5px] top-2 w-2 h-2 rounded-full border border-white ${item.origen === 'CULTURA' ? 'bg-orange-400' : 'bg-blue-400'}`}></div>
              
              <div className="flex justify-between items-start">
                  <div className="flex-1">
                      <div className="flex items-center gap-1 mb-0.5">
                          <span className="font-bold text-slate-600">{item.mes_inicio}/{item.anio_inicio}</span>
                          <span className={`font-black text-[9px] px-1 rounded ${item.origen === 'CULTURA' ? 'text-orange-600 bg-orange-50' : 'text-blue-600 bg-blue-50'}`}>{item.origen}</span>
                      </div>
                      <div className="text-slate-800 font-black mb-0.5">Total: {total} hs</div>
                      {item.observaciones && <div className="text-slate-400 italic truncate max-w-[140px] leading-tight">{item.observaciones}</div>}
                  </div>

                  {/* Botones de Acción (Visibles en hover o si se está editando) */}
                  <div className={`flex flex-col gap-1 ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                      <button 
                        onClick={() => setActiveRecord(item)} 
                        className={`p-1 rounded ${isEditing ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-400 hover:text-indigo-600'}`}
                        title="Editar"
                      >
                          <IconEdit size={10} />
                      </button>
                      <button 
                        onClick={() => handleInternalDelete(item.id)} 
                        className="p-1 rounded bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200"
                        title="Eliminar"
                      >
                          <IconTrash size={10} />
                      </button>
                  </div>
              </div>
          </div>
      )
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4 w-full">
            <div>
                <h3 className="font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    {activeRecord ? <IconEdit className="text-orange-500"/> : <IconCheck className="text-emerald-500" />} 
                    {activeRecord ? "Editando Registro" : "Cargar Novedad"}
                </h3>
            </div>
            
            <div className="flex-1 max-w-md">
                {!musician && !recordToEdit ? (
                    <SearchableSelect 
                        options={allMusicians.map(m => ({ id: m.id, label: `${m.apellido}, ${m.nombre}` }))}
                        value={selectedId}
                        onChange={(val) => { setSelectedId(val); setActiveRecord(null); }} // Resetear edición al cambiar persona
                        placeholder="Buscar integrante..."
                        className="w-full"
                    />
                ) : (
                    <p className="text-sm font-bold text-slate-600 border-l pl-3 border-slate-300">
                        {activeMusician?.apellido}, {activeMusician?.nombre}
                    </p>
                )}
            </div>
          </div>
          <button onClick={onClose}><IconX className="text-slate-400 hover:text-red-500" /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Panel Izquierdo (Contexto + Historial Interactivo) */}
            {selectedId && (
                <div className="w-1/3 bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto custom-scrollbar hidden md:block">
                    {contextLoading ? <div className="flex justify-center p-10"><IconLoader className="animate-spin text-slate-400"/></div> : (
                        <div className="space-y-6">
                            {/* Totales */}
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                                    <IconRefresh size={10} /> Totales Vigentes
                                </h4>
                                {["CULTURA", "EDUCACION"].map(org => {
                                    const total = CONCEPTOS.reduce((acc, c) => acc + (contextData.totals[org][c.id] || 0), 0);
                                    if (total === 0) return null;
                                    return (
                                        <div key={org} className={`p-2 mb-2 rounded-lg border bg-white ${org === 'CULTURA' ? 'border-orange-200 text-orange-700' : 'border-blue-200 text-blue-700'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black">{org}</span>
                                                <span className="font-bold text-sm">{total} hs</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Historial con Edición */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                        <IconClock size={10} /> Historial
                                    </h4>
                                    {activeRecord && (
                                        <button 
                                            onClick={() => setActiveRecord(null)}
                                            className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                                        >
                                            <IconPlus size={8} /> Nueva
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-0 pl-1">
                                    {contextData.history.length > 0 
                                        ? contextData.history.map(renderHistoryLine)
                                        : <div className="text-center text-xs text-slate-400 italic py-4">Sin historial</div>
                                    }
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Formulario */}
            <div className={`flex-1 p-6 overflow-y-auto custom-scrollbar ${!selectedId ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-6 max-w-2xl mx-auto">
                    {/* Switch de Origen y Fechas */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 flex bg-slate-100 p-1 rounded-xl">
                            {["CULTURA", "EDUCACION"].map(org => (
                                <button key={org} onClick={() => setForm(f => ({...f, origen: org}))} 
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${form.origen === org ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>
                                    {org}
                                </button>
                            ))}
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Inicio</label>
                            <div className="flex gap-2">
                                <input type="number" className="w-full border rounded-lg p-2 text-sm font-bold text-center" value={form.mes_inicio} onChange={e=>setForm({...form, mes_inicio: e.target.value})}/>
                                <input type="number" className="w-full border rounded-lg p-2 text-sm font-bold text-center" value={form.anio_inicio} onChange={e=>setForm({...form, anio_inicio: e.target.value})}/>
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Fin</label>
                            <div className="flex gap-2">
                                <input type="number" className="w-full border rounded-lg p-2 text-sm font-bold text-center bg-slate-50" value={form.mes_fin} onChange={e=>setForm({...form, mes_fin: e.target.value})}/>
                                <input type="number" className="w-full border rounded-lg p-2 text-sm font-bold text-center bg-slate-50" value={form.anio_fin} onChange={e=>setForm({...form, anio_fin: e.target.value})}/>
                            </div>
                        </div>
                    </div>

                    {/* Selector de Modo (Solo visible si es NUEVO registro) */}
                    {!activeRecord && (
                        <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                            <div className="flex gap-2">
                                <button onClick={() => { setMode("ABSOLUTE"); setForm(prev => ({...prev, ...Object.fromEntries(CONCEPTOS.map(c=>[c.id,0])) })); }} 
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${mode==="ABSOLUTE" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500"}`}>
                                    Fijar Total
                                </button>
                                <button onClick={() => { setMode("RELATIVE"); setForm(prev => ({...prev, ...Object.fromEntries(CONCEPTOS.map(c=>[c.id,0])) })); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${mode==="RELATIVE" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-500"}`}>
                                    Ajustar (+/-)
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {CONCEPTOS.map(c => (
                            <div key={c.id}>
                                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1 truncate" title={c.label}>{c.label}</label>
                                <div className="relative">
                                    <input type="number" 
                                        className={`w-full p-2.5 rounded-lg border text-sm font-black outline-none focus:ring-2 transition-all ${c.color.replace('text-', 'border-').replace('bg-', 'ring-')}`}
                                        value={form[c.id] === 0 ? "" : form[c.id]}
                                        onChange={e => setForm({...form, [c.id]: e.target.value})}
                                        placeholder="0"
                                    />
                                    {mode === "RELATIVE" && form[c.id] !== 0 && (
                                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold ${form[c.id] > 0 ? "text-emerald-500" : "text-red-500"}`}>
                                            {form[c.id] > 0 ? "+" : ""}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <textarea className="w-full border rounded-lg p-3 text-xs h-20 resize-none outline-none focus:ring-2 ring-indigo-100" placeholder="Observaciones..." value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} />
                </div>
            </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-6 py-3 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !selectedId} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg">
                {saving ? <IconLoader className="animate-spin"/> : <IconCheck />} {activeRecord ? "Actualizar" : "Confirmar"}
            </button>
        </div>
      </div>
    </div>
  );
}