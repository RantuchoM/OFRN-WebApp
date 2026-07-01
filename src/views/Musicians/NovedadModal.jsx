import React, { useState, useEffect, useMemo, useCallback } from "react";
import { IconCheck, IconX, IconLoader, IconRefresh, IconUser, IconClock, IconEdit, IconTrash, IconPlus } from "../../components/ui/Icons";
import SearchableSelect from "../../components/ui/SearchableSelect";
import HorasDeleteGuardModal from "../../components/musicians/HorasDeleteGuardModal";

const CONCEPTOS = [
  { id: "h_basico", label: "Básico", color: "text-blue-700 bg-blue-50 border-blue-200" },
  { id: "h_ensayos", label: "Ensayos", color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  { id: "h_ensamble", label: "Ensamble", color: "text-purple-700 bg-purple-50 border-purple-200" },
  { id: "h_categoria", label: "Categoría", color: "text-pink-700 bg-pink-50 border-pink-200" },
  { id: "h_coordinacion", label: "Coord.", color: "text-orange-700 bg-orange-50 border-orange-200" },
  { id: "h_desarraigo", label: "Desarraigo", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { id: "h_otros", label: "Otros", color: "text-slate-600 bg-slate-100 border-slate-300" },
];

const ORIGENES = ["CULTURA", "EDUCACION"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Primer día del mes de vigencia del registro de horas (YYYY-MM-DD). */
function fechaAltaIsoFromMes(anio, mes) {
  return `${Number(anio)}-${pad2(Number(mes))}-01`;
}

/** Último día del mes de vigencia del registro de horas (YYYY-MM-DD). */
function fechaBajaIsoFromMes(anio, mes) {
  const last = new Date(Number(anio), Number(mes), 0);
  return `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}`;
}

function rowTotalHoras(record) {
  return CONCEPTOS.reduce((acc, c) => acc + (Number(record[c.id]) || 0), 0);
}

/** Total hs cátedra “vigente”: último registro por origen (misma heurística que el panel del modal). */
function grandTotalFromHistory(history) {
  let sum = 0;
  for (const org of ORIGENES) {
    const orgRows = (history || []).filter((r) => r.origen === org);
    if (!orgRows.length) continue;
    const latest = orgRows.reduce((best, r) => {
      const score = Number(r.anio_inicio) * 100 + Number(r.mes_inicio);
      const bestScore = best ? Number(best.anio_inicio) * 100 + Number(best.mes_inicio) : -1;
      return score >= bestScore ? r : best;
    }, null);
    sum += rowTotalHoras(latest);
  }
  return sum;
}

function mergePendingHorasHistory(history, activeRecord, pendingRow, isInsert) {
  const h = history || [];
  if (isInsert) return [...h, { ...pendingRow, id: pendingRow.id ?? -1 }];
  return h.map((r) => (r.id === activeRecord.id ? { ...r, ...pendingRow } : r));
}

function buildHorasPayload({ selectedId, form, mode, activeRecord, contextTotals }) {
  const payload = {
    id_integrante: selectedId,
    origen: form.origen,
    mes_inicio: parseInt(form.mes_inicio, 10),
    anio_inicio: parseInt(form.anio_inicio, 10),
    mes_fin: form.mes_fin ? parseInt(form.mes_fin, 10) : null,
    anio_fin: form.anio_fin ? parseInt(form.anio_fin, 10) : null,
    observaciones: form.observaciones,
  };

  CONCEPTOS.forEach((c) => {
    const inputVal = parseInt(form[c.id], 10) || 0;
    let finalVal = inputVal;
    if (!activeRecord && mode === "RELATIVE") {
      const currentVal = (contextTotals[form.origen] && contextTotals[form.origen][c.id]) || 0;
      finalVal = currentVal + inputVal;
    }
    if (finalVal < 0) finalVal = 0;
    payload[c.id] = finalVal;
  });

  return payload;
}

export default function NovedadModal({ isOpen, onClose, supabase, musician, allMusicians, recordToEdit, onSuccess, novedadPreset = null }) {
  // Estado del Músico
  const [selectedId, setSelectedId] = useState(musician?.id || recordToEdit?.id_integrante || null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextData, setContextData] = useState({ totals: { CULTURA: {}, EDUCACION: {} }, history: [] });
  const [integranteCondicion, setIntegranteCondicion] = useState(null);

  // Registro activo (puede venir de props o ser seleccionado internamente desde el historial)
  const [activeRecord, setActiveRecord] = useState(recordToEdit);

  // Estado del Formulario
  const [mode, setMode] = useState("ABSOLUTE"); 
  const [saving, setSaving] = useState(false);
  const [syncLegajoCondicion, setSyncLegajoCondicion] = useState(true);
  const [deleteGuardRecord, setDeleteGuardRecord] = useState(null);
  const [deleteGuardLoading, setDeleteGuardLoading] = useState(false);
  const [deleteGuardError, setDeleteGuardError] = useState(null);
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
    } else if (!novedadPreset) {
        // Reset a modo "Nueva Novedad" (salvo preset de baja desde el dashboard)
        setForm(prev => ({
            ...prev,
            mes_inicio: new Date().getMonth() + 1,
            anio_inicio: new Date().getFullYear(),
            observaciones: "",
            ...Object.fromEntries(CONCEPTOS.map(c => [c.id, 0]))
        }));
    }
  }, [activeRecord, isOpen, novedadPreset]);

  useEffect(() => {
    if (!isOpen || !novedadPreset || recordToEdit) return;
    setActiveRecord(null);
    setMode("ABSOLUTE");
    setForm({
      origen: novedadPreset.origen || "CULTURA",
      mes_inicio: novedadPreset.mes_inicio ?? new Date().getMonth() + 1,
      anio_inicio: novedadPreset.anio_inicio ?? new Date().getFullYear(),
      mes_fin: "",
      anio_fin: "",
      observaciones: novedadPreset.observaciones || "Baja de horas cátedra",
      ...Object.fromEntries(CONCEPTOS.map((c) => [c.id, 0])),
    });
  }, [isOpen, novedadPreset, recordToEdit]);

  useEffect(() => {
    if (!isOpen) {
      setDeleteGuardRecord(null);
      setDeleteGuardError(null);
      setDeleteGuardLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSyncLegajoCondicion(true);
    const initialId = musician?.id || recordToEdit?.id_integrante || null;
    if (initialId != null) setSelectedId(initialId);
  }, [isOpen, musician?.id, recordToEdit?.id_integrante]);

  const fetchMusicianContext = useCallback(async (id) => {
    setContextLoading(true);
    try {
        const [{ data: history, error }, { data: intRow }] = await Promise.all([
            supabase
                .from("horas_catedra")
                .select("*")
                .eq("id_integrante", id)
                .order("anio_inicio", { ascending: false })
                .order("mes_inicio", { ascending: false }),
            supabase.from("integrantes").select("condicion").eq("id", id).maybeSingle(),
        ]);

        if (error) throw error;

        setIntegranteCondicion(intRow?.condicion ?? null);

        // Calcular Totales Actuales excluyendo el registro que se está editando (si aplica)
        const totals = { CULTURA: {}, EDUCACION: {} };
        ORIGENES.forEach(org => {
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
  }, [supabase, activeRecord?.id]);

  // Buscar contexto (historial y totales)
  useEffect(() => {
    if (!isOpen) return;
    if (selectedId) {
        fetchMusicianContext(selectedId);
    } else {
        setContextData({ totals: { CULTURA: {}, EDUCACION: {} }, history: [] });
        setIntegranteCondicion(null);
    }
  }, [selectedId, activeRecord, fetchMusicianContext, isOpen]);

  const pendingPayloadPreview = useMemo(() => {
    if (!selectedId) return null;
    return buildHorasPayload({
      selectedId,
      form,
      mode,
      activeRecord,
      contextTotals: contextData.totals,
    });
  }, [selectedId, form, mode, activeRecord, contextData.totals]);

  const prevGrandHoras = useMemo(
    () => grandTotalFromHistory(contextData.history),
    [contextData.history],
  );

  const newGrandHoras = useMemo(() => {
    if (!pendingPayloadPreview) return 0;
    const merged = mergePendingHorasHistory(
      contextData.history,
      activeRecord,
      pendingPayloadPreview,
      !activeRecord,
    );
    return grandTotalFromHistory(merged);
  }, [contextData.history, activeRecord, pendingPayloadPreview]);

  const scenarioAltaLegajo = !activeRecord && prevGrandHoras === 0 && newGrandHoras > 0;
  const scenarioBajaLegajo = prevGrandHoras > 0 && newGrandHoras === 0;

  const pendingRowTotalHs = useMemo(() => {
    if (!pendingPayloadPreview) return 0;
    return rowTotalHoras(pendingPayloadPreview);
  }, [pendingPayloadPreview]);

  const nominaCambia = prevGrandHoras !== newGrandHoras;

  /** Por qué no hay toggle de legajo (cuando no aplica alta/baja nominal). */
  const legajoSinToggleMotivo = useMemo(() => {
    if (!selectedId || scenarioAltaLegajo || scenarioBajaLegajo) return null;
    if (!activeRecord) {
      if (prevGrandHoras === 0 && newGrandHoras === 0) {
        return "La nómina nominal sigue en 0 hs: confirmar con todo en cero no da de alta horas. Para ver la opción de marcar estable y fecha de alta, cargá al menos una hora en algún concepto.";
      }
      if (prevGrandHoras > 0 && newGrandHoras > 0) {
        return "El total nominal combinado no llega a 0 hs tras guardar (sigue habiendo horas en el otro origen o el último período de ese origen no queda en cero). Por eso no aparece la baja de legajo; solo aparece cuando el total combinado pasa a 0.";
      }
      return null;
    }
    if (prevGrandHoras > 0 && newGrandHoras > 0) {
      return "Este cambio no deja la nómina nominal total en 0 hs, así que no aplica la opción de quitar estable / fecha de baja.";
    }
    return null;
  }, [
    selectedId,
    activeRecord,
    scenarioAltaLegajo,
    scenarioBajaLegajo,
    prevGrandHoras,
    newGrandHoras,
  ]);

  const handleSave = async () => {
    if (!selectedId) return alert("Seleccione un integrante");
    setSaving(true);
    try {
      const payload = buildHorasPayload({
        selectedId,
        form,
        mode,
        activeRecord,
        contextTotals: contextData.totals,
      });

      const merged = mergePendingHorasHistory(
        contextData.history,
        activeRecord,
        payload,
        !activeRecord,
      );
      const prevG = grandTotalFromHistory(contextData.history);
      const newG = grandTotalFromHistory(merged);
      const esAlta = !activeRecord && prevG === 0 && newG > 0;
      const esBaja = prevG > 0 && newG === 0;

      if (activeRecord) {
          const { error } = await supabase.from("horas_catedra").update(payload).eq("id", activeRecord.id);
          if(error) throw error;
      } else {
          const { error } = await supabase.from("horas_catedra").insert(payload);
          if(error) throw error;
      }

      if (syncLegajoCondicion && esAlta) {
        const legajoPatch = {
          condicion: "Estable",
          fecha_alta: fechaAltaIsoFromMes(payload.anio_inicio, payload.mes_inicio),
          fecha_baja: null,
        };
        const { error: legErr } = await supabase.from("integrantes").update(legajoPatch).eq("id", selectedId);
        if (legErr) throw legErr;
      } else if (syncLegajoCondicion && esBaja) {
        const legajoPatch = {
          fecha_baja: fechaBajaIsoFromMes(payload.anio_inicio, payload.mes_inicio),
        };
        if (integranteCondicion === "Estable") legajoPatch.condicion = "Contratado";
        const { error: legErr } = await supabase.from("integrantes").update(legajoPatch).eq("id", selectedId);
        if (legErr) throw legErr;
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openDeleteGuard = (record) => {
    setDeleteGuardError(null);
    setDeleteGuardRecord(record);
  };

  const closeDeleteGuard = () => {
    if (deleteGuardLoading) return;
    setDeleteGuardRecord(null);
    setDeleteGuardError(null);
  };

  const handleCargarBajaNovedad = () => {
    const rec = deleteGuardRecord;
    if (!rec) return;
    const now = new Date();
    setActiveRecord(null);
    setMode("ABSOLUTE");
    setForm({
      origen: rec.origen,
      mes_inicio: now.getMonth() + 1,
      anio_inicio: now.getFullYear(),
      mes_fin: "",
      anio_fin: "",
      observaciones: `Baja ${rec.origen} desde ${now.getMonth() + 1}/${now.getFullYear()}`,
      ...Object.fromEntries(CONCEPTOS.map((c) => [c.id, 0])),
    });
  };

  const handleConfirmDeleteRecord = async () => {
    const id = deleteGuardRecord?.id;
    if (!id) return;
    setDeleteGuardLoading(true);
    setDeleteGuardError(null);
    try {
      const { error } = await supabase.from("horas_catedra").delete().eq("id", id);
      if (error) throw error;

      fetchMusicianContext(selectedId);
      onSuccess();

      if (activeRecord?.id === id) setActiveRecord(null);
      closeDeleteGuard();
    } catch (err) {
      setDeleteGuardError(err.message || "Error al eliminar");
      throw err;
    } finally {
      setDeleteGuardLoading(false);
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
                        onClick={() => openDeleteGuard(item)} 
                        className="p-1 rounded bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200"
                        title="Eliminar registro (evitar si es una baja de horas)"
                      >
                          <IconTrash size={10} />
                      </button>
                  </div>
              </div>
          </div>
      )
  };

  if (!isOpen) return null;

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
                                    <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mb-3 leading-snug">
                                      Para dar de baja horas, cargá una <strong>novedad en 0 hs</strong> desde el mes correspondiente. No elimines el historial.
                                    </p>
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

                    {selectedId && pendingPayloadPreview && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Nómina nominal (vigente)
                        </p>
                        <p className="text-sm text-slate-800 leading-snug">
                          <span className="font-black tabular-nums">{prevGrandHoras}</span>
                          <span className="text-slate-400 mx-1.5">→</span>
                          <span
                            className={`font-black tabular-nums ${nominaCambia ? "text-indigo-700" : "text-slate-800"}`}
                          >
                            {newGrandHoras}
                          </span>
                          <span className="text-slate-600 font-semibold"> hs</span>
                          <span className="text-[11px] text-slate-500 font-normal block mt-1">
                            Suma del último período por CULTURA y por EDUCACIÓN (así verás si hay baja total o no).
                          </span>
                        </p>
                        {!activeRecord && (
                          <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-200/80 pt-2">
                            Registro nuevo en <strong>{form.origen}</strong> desde{" "}
                            <strong>
                              {form.mes_inicio}/{form.anio_inicio}
                            </strong>
                            {pendingRowTotalHs === 0 ? (
                              <>
                                {" "}
                                con <strong>0 hs</strong> en todos los conceptos: solo cambia la nómina si este
                                período queda como el más reciente para ese origen (y el otro origen también queda
                                en 0 para llegar a baja total).
                              </>
                            ) : null}
                          </p>
                        )}
                        {scenarioBajaLegajo && (
                          <p className="text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1.5">
                            Tras guardar la nómina nominal total queda en <strong>0 hs</strong>: puede aplicarse la
                            baja de legajo (toggle debajo).
                          </p>
                        )}
                      </div>
                    )}

                    {selectedId && (
                      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Legajo — estable y fechas
                        </p>
                        {(scenarioAltaLegajo || scenarioBajaLegajo) ? (
                          <>
                            <label className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/90 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-indigo-500"
                                checked={syncLegajoCondicion}
                                onChange={(e) => setSyncLegajoCondicion(e.target.checked)}
                              />
                              <span className="text-xs font-semibold text-slate-800 leading-snug">
                                {scenarioAltaLegajo
                                  ? "Marcar como estable y cargar fecha de alta"
                                  : "Quitar como estable y cargar fecha de baja"}
                              </span>
                            </label>
                            <p className="text-[10px] text-slate-500 leading-snug">
                              {scenarioAltaLegajo
                                ? "Solo aparece cuando pasás de no tener horas nominales a tenerlas."
                                : "Solo aparece cuando el total nominal combinado llega a 0 hs."}
                            </p>
                          </>
                        ) : legajoSinToggleMotivo ? (
                          <p className="text-[11px] text-slate-600 leading-relaxed">{legajoSinToggleMotivo}</p>
                        ) : (
                          <p className="text-[11px] text-slate-500">
                            No aplica sincronizar legajo con este guardado.
                          </p>
                        )}
                      </div>
                    )}
                    
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

      <HorasDeleteGuardModal
        isOpen={!!deleteGuardRecord}
        onClose={closeDeleteGuard}
        onConfirmDelete={handleConfirmDeleteRecord}
        onCargarBajaNovedad={handleCargarBajaNovedad}
        musicianName={
          activeMusician
            ? `${activeMusician.apellido}, ${activeMusician.nombre}`
            : "el integrante"
        }
        origen={deleteGuardRecord?.origen || "CULTURA"}
        bajaMes={deleteGuardRecord ? new Date().getMonth() + 1 : 1}
        bajaAnio={deleteGuardRecord ? new Date().getFullYear() : new Date().getFullYear()}
        deleteLoading={deleteGuardLoading}
        deleteError={deleteGuardError}
      />
    </div>
  );
}