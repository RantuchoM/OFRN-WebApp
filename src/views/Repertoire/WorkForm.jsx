import React, { useState, useEffect, useRef, useCallback } from "react";
// ... imports igual que antes ...
import {
  IconMusic, IconPlus, IconTrash, IconSearch, IconLoader, IconCheck, IconX, IconLink,
  IconExternalLink, IconDrive, IconFolderMusic, IconAlertCircle
} from "../../components/ui/Icons";
import { formatSecondsToTime, inputToSeconds } from "../../utils/time";
import { calculateInstrumentation } from "../../utils/instrumentation";
import DriveMatcherModal from "../../components/repertoire/DriveMatcherModal";
import LinksManagerModal from "../../components/repertoire/LinksManagerModal"; 
import { INSTRUMENT_GROUPS } from "../../utils/instrumentGroups";

// ... (ModalPortal, capitalizeWords, useDebouncedCallback igual) ...
const ModalPortal = ({ children }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {children}
    </div>,
    document.body
  );
};

const capitalizeWords = (str) => (!str ? "" : str.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()));

function useDebouncedCallback(callback, delay) {
  const handler = useRef(null);
  return useCallback((...args) => {
    if (handler.current) clearTimeout(handler.current);
    handler.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}

export default function WorkForm({ supabase, formData: initialData, onCancel, onSave, isNew, catalogoInstrumentos }) {
  // ... (Estados iniciales iguales) ...
  const [formData, setFormData] = useState({
    id: null, titulo: "", duracion: "", link_drive: "", link_youtube: "", instrumentacion: "", anio: "", estado: "Oficial"
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); 
  const [particellas, setParticellas] = useState([]);
  
  const [instrumentList, setInstrumentList] = useState(catalogoInstrumentos || []);
  const [composersList, setComposersList] = useState([]);
  
  // UI Helpers
  const [genInstrument, setGenInstrument] = useState("");
  const [genQuantity, setGenQuantity] = useState(1);
  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [showInstrumentOptions, setShowInstrumentOptions] = useState(false);
  const instrumentInputRef = useRef(null);

  const [selectedComposer, setSelectedComposer] = useState(null);
  const [composerQuery, setComposerQuery] = useState("");
  const [showComposerOptions, setShowComposerOptions] = useState(false);
  
  const [selectedArranger, setSelectedArranger] = useState(null);
  const [arrangerQuery, setArrangerQuery] = useState("");
  const [showArrangerOptions, setShowArrangerOptions] = useState(false);

  const [showDriveMatcher, setShowDriveMatcher] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false); 
  const [editingLinksId, setEditingLinksId] = useState(null); 

  useEffect(() => {
    if(instrumentList.length === 0) fetchInstruments();
    fetchComposers();

    if (initialData) {
        setFormData({
            id: initialData.id,
            titulo: initialData.titulo || "",
            duracion: initialData.duracion_segundos ? formatSecondsToTime(initialData.duracion_segundos) : "",
            link_drive: initialData.link_drive || "",
            link_youtube: initialData.link_youtube || "",
            instrumentacion: initialData.instrumentacion || "",
            anio: initialData.anio_composicion || "",
            estado: initialData.estado || "Oficial"
        });
        if (!initialData.id && initialData.estado) {
            setFormData(prev => ({...prev, estado: initialData.estado}));
        }
    }

    if (initialData?.id) {
        fetchParticellas(initialData.id);
        fetchWorkDetails(initialData.id);
    }
  }, [initialData?.id]);

  // ... (Fetchers y Autosave iguales) ...
  const fetchWorkDetails = async (workId) => {
      const { data } = await supabase
        .from('obras')
        .select('*, obras_compositores(rol, compositores(id, apellido, nombre))')
        .eq('id', workId)
        .single();

      if(data) {
          setFormData(prev => ({
              ...prev,
              id: data.id,
              link_drive: data.link_drive || "",
              link_youtube: data.link_youtube || "",
              instrumentacion: data.instrumentacion || "",
              anio: data.anio_composicion || "",
              titulo: data.titulo || prev.titulo,
              duracion: data.duracion_segundos ? formatSecondsToTime(data.duracion_segundos) : prev.duracion,
              estado: data.estado || "Oficial"
          }));

          if (data.obras_compositores) {
              const comp = data.obras_compositores.find(oc => !oc.rol || oc.rol === 'compositor')?.compositores;
              const arr = data.obras_compositores.find(oc => oc.rol === 'arreglador')?.compositores;
              if(comp) { setSelectedComposer(comp); setComposerQuery(`${comp.apellido}, ${comp.nombre}`); }
              if(arr) { setSelectedArranger(arr); setArrangerQuery(`${arr.apellido}, ${arr.nombre}`); }
          }
      }
  };

  const fetchInstruments = async () => { const { data } = await supabase.from("instrumentos").select("id, instrumento").order("id"); if(data) setInstrumentList(data); };
  const fetchComposers = async () => { const { data } = await supabase.from("compositores").select("*").order("apellido"); if(data) setComposersList(data); };
  const fetchParticellas = async (workId) => {
    const { data } = await supabase.from("obras_particellas").select("*, instrumentos(instrumento)").eq("id_obra", workId);
    if (data) {
        const mapped = data.map(p => {
            let linksArray = [];
            try { linksArray = JSON.parse(p.url_archivo) || []; if(!Array.isArray(linksArray)) linksArray = [{url: p.url_archivo, description: 'Enlace'}]; } 
            catch(e) { if(p.url_archivo) linksArray = [{url: p.url_archivo, description: 'Enlace'}]; }
            return {
                tempId: p.id, id: p.id, id_instrumento: p.id_instrumento, nombre_archivo: p.nombre_archivo,
                nota_organico: p.nota_organico, instrumento_nombre: p.instrumentos?.instrumento, links: linksArray
            };
        });
        setParticellas(mapped.sort((a,b) => a.id_instrumento.localeCompare(b.id_instrumento)));
    }
  };

  const saveFieldToDb = async (field, value) => {
      if (!formData.id) return; 
      setSaveStatus("saving");
      try {
          const payload = {};
          if (field === 'duracion') payload['duracion_segundos'] = inputToSeconds(value);
          else if (field === 'anio') payload['anio_composicion'] = value ? parseInt(value) : null;
          else payload[field] = value === "" ? null : value;

          await supabase.from('obras').update(payload).eq('id', formData.id);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
          
          if(onSave) onSave(formData.id, false); // false = no cerrar modal

      } catch (e) {
          console.error("Autosave error:", e);
          setSaveStatus("error");
      }
  };

  const debouncedSave = useDebouncedCallback(saveFieldToDb, 1000);

  const updateField = (field, val) => {
      setFormData(prev => ({ ...prev, [field]: val }));
      if (formData.id) debouncedSave(field, val);
  };

  const saveComposerRelationsToDb = async (obraId, compObj, arrObj) => {
      await supabase.from('obras_compositores').delete().eq('id_obra', obraId);
      const inserts = [];
      if (compObj?.id) inserts.push({ id_obra: obraId, id_compositor: compObj.id, rol: 'compositor' });
      if (arrObj?.id && arrObj.id !== compObj?.id) inserts.push({ id_obra: obraId, id_compositor: arrObj.id, rol: 'arreglador' });
      if (inserts.length > 0) await supabase.from('obras_compositores').insert(inserts);
  };

  const updateComposerRelation = async (type, personObj) => {
      if (!formData.id) return;
      try {
          await supabase.from('obras_compositores').delete().eq('id_obra', formData.id).eq('rol', type);
          if (personObj && personObj.id) {
             const { data: existing } = await supabase.from('obras_compositores').select('*').eq('id_obra', formData.id).eq('id_compositor', personObj.id);
             if (!existing || existing.length === 0) {
                 await supabase.from('obras_compositores').insert({
                     id_obra: formData.id,
                     id_compositor: personObj.id,
                     rol: type
                 });
             }
          }
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
          if(onSave) onSave(formData.id, false); 
      } catch (e) { console.error("Error updating composer:", e); }
  };

  // --- LÓGICA DE CREACIÓN DE COMPOSITOR AL VUELO ---
  const handleCreateComposer = async (queryText, type) => {
      if (!queryText.trim()) return;
      // Formato esperado: "Apellido, Nombre" o solo "Apellido"
      const parts = queryText.split(",");
      const apellido = parts[0].trim();
      const nombre = parts[1] ? parts[1].trim() : "";

      setSaveStatus("saving");
      try {
          const { data, error } = await supabase.from("compositores")
              .insert([{ apellido, nombre }])
              .select().single();
          
          if (error) throw error;
          
          // Actualizar lista local
          setComposersList(prev => [...prev, data].sort((a,b) => a.apellido.localeCompare(b.apellido)));
          
          // Seleccionar automáticamente
          if (type === 'compositor') {
              handleSelectComposer(data);
          } else {
              handleSelectArranger(data);
          }
          setSaveStatus("saved");
      } catch (err) {
          console.error(err);
          alert("Error creando compositor: " + err.message);
          setSaveStatus("error");
      }
  };

  // ... (handlePartsChange, handleCreateInitial, handleAddParts iguales) ...
  const handlePartsChange = async (newPartsList, overrideId = null) => {
      const targetId = overrideId || formData.id;
      setParticellas(newPartsList);
      const instr = calculateInstrumentation(newPartsList);
      setFormData(prev => ({...prev, instrumentacion: instr}));

      if (!targetId) return; 

      setIsSaving(true);
      try {
          const activeIds = newPartsList.filter(p => p.id).map(p => p.id);
          if (!overrideId) { 
             const { data: currentParts } = await supabase.from("obras_particellas").select("id").eq("id_obra", targetId);
             if (currentParts) {
                 const dbIdsToDelete = currentParts.filter(dbPart => !activeIds.includes(dbPart.id)).map(x => x.id);
                 if (dbIdsToDelete.length > 0) await supabase.from("obras_particellas").delete().in("id", dbIdsToDelete);
             }
          }

          const upserts = newPartsList.map(p => ({
              id: p.id,
              id_obra: targetId,
              id_instrumento: p.id_instrumento,
              nombre_archivo: p.nombre_archivo,
              nota_organico: p.nota_organico,
              url_archivo: JSON.stringify(p.links || [])
          }));

          const toInsert = upserts.filter(u => !u.id).map(({id, ...rest}) => rest);
          const toUpdate = upserts.filter(u => u.id);

          if (toInsert.length) await supabase.from("obras_particellas").insert(toInsert);
          if (toUpdate.length) {
              for (const item of toUpdate) {
                  await supabase.from("obras_particellas").update(item).eq('id', item.id);
              }
          }

          if (!overrideId) await fetchParticellas(targetId);
          await supabase.from('obras').update({ instrumentacion: instr }).eq('id', targetId);

          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
          
          if(onSave) onSave(targetId, false);

      } catch (e) { console.error("Error syncing parts:", e); setSaveStatus("error"); } finally { setIsSaving(false); }
  };

  const handleCreateInitial = async () => {
      if (!formData.titulo) return alert("Título requerido");
      setIsSaving(true);
      try {
          const payload = {
              titulo: formData.titulo,
              duracion_segundos: inputToSeconds(formData.duracion),
              anio_composicion: formData.anio ? parseInt(formData.anio) : null,
              instrumentacion: calculateInstrumentation(particellas),
              estado: formData.estado,
          };
          const { data, error } = await supabase.from("obras").insert([payload]).select().single();
          if (error) throw error;
          const newId = data.id;
          await saveComposerRelationsToDb(newId, selectedComposer, selectedArranger);
          if (particellas.length > 0) await handlePartsChange(particellas, newId);
          setFormData(prev => ({ ...prev, id: newId }));
          
          // true = es nueva, cerrar el modal si se desea o solo refrescar la lista
          if(onSave) onSave(newId, true); 
          setSaveStatus("saved");
      } catch (e) {
          alert("Error creando: " + e.message);
      } finally {
          setIsSaving(false);
      }
  };

  const allOptions = [...INSTRUMENT_GROUPS, ...instrumentList];
  const filteredInstruments = allOptions.filter((i) => i.instrumento.toLowerCase().includes(instrumentQuery.toLowerCase()));

  const handleAddParts = () => {
    let selectedId = genInstrument;
    if (!selectedId && filteredInstruments.length > 0 && instrumentQuery.length >= 2) {
       const match = filteredInstruments.find(i => i.instrumento.toLowerCase() === instrumentQuery.toLowerCase()) || filteredInstruments[0];
       if(match) selectedId = match.id;
    }
    if (!selectedId || genQuantity < 1) return;

    const selectedGroup = INSTRUMENT_GROUPS.find(g => g.id === selectedId);
    let newParts = [];

    if (selectedGroup) {
        selectedGroup.definitions.forEach(def => {
            newParts.push({ tempId: Date.now() + Math.random(), id: null, id_instrumento: def.id_instrumento, nombre_archivo: def.nombre_archivo, links: [], nota_organico: "", instrumento_nombre: def.instrumento_base });
        });
    } else {
        const selectedInstrObj = instrumentList.find((i) => i.id === selectedId);
        if (!selectedInstrObj) return; 
        const baseName = capitalizeWords(selectedInstrObj.instrumento);
        for (let i = 1; i <= genQuantity; i++) {
            newParts.push({ tempId: Date.now() + i + Math.random(), id: null, id_instrumento: selectedId, nombre_archivo: genQuantity > 1 ? `${baseName} ${i}` : baseName, links: [], nota_organico: "", instrumento_nombre: selectedInstrObj.instrumento, });
        }
    }
    const updated = [...particellas, ...newParts].sort((a, b) => a.id_instrumento.localeCompare(b.id_instrumento));
    handlePartsChange(updated); 
    setGenInstrument(""); setInstrumentQuery(""); setGenQuantity(1); setShowInstrumentOptions(false);
    setTimeout(() => { if(instrumentInputRef.current) { instrumentInputRef.current.focus(); instrumentInputRef.current.value = ""; } }, 10);
  };

  const handleGenKeyDown = (e) => { if (e.key === "Enter") { e.preventDefault(); handleAddParts(); } };
  const handleEditPart = (tempId, field, value) => {
      const updated = particellas.map(p => p.tempId === tempId ? { ...p, [field]: value } : p);
      setParticellas(updated);
      // No guardamos en onChange para no saturar, confiamos en onBlur
  };
  const handleBlurPart = () => { handlePartsChange(particellas); };
  const handleRemovePart = (tempId) => { const updated = particellas.filter(p => p.tempId !== tempId); handlePartsChange(updated); };

  // Compositores UI
  const filteredComposers = composersList.filter(c => `${c.apellido}, ${c.nombre}`.toLowerCase().includes(composerQuery.toLowerCase()));
  const filteredArrangers = composersList.filter(c => `${c.apellido}, ${c.nombre}`.toLowerCase().includes(arrangerQuery.toLowerCase()));

  const handleSelectComposer = (c) => { setSelectedComposer(c); setShowComposerOptions(false); setComposerQuery(`${c.apellido}, ${c.nombre}`); updateComposerRelation('compositor', c); };
  const handleSelectArranger = (c) => { setSelectedArranger(c); setShowArrangerOptions(false); setArrangerQuery(`${c.apellido}, ${c.nombre}`); updateComposerRelation('arreglador', c); };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center border-b pb-4">
        <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><IconMusic className="text-indigo-600"/> {formData.id ? "Editar Obra" : "Nueva Solicitud"}</h2>
            {formData.id && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 transition-all">
                    {saveStatus === 'saving' && <><IconLoader className="animate-spin text-blue-500" size={10}/> <span className="text-blue-500">Guardando...</span></>}
                    {saveStatus === 'saved' && <><IconCheck className="text-emerald-500" size={10}/> <span className="text-emerald-500">Guardado</span></>}
                    {saveStatus === 'error' && <span className="text-red-500">Error al guardar</span>}
                </span>
            )}
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><IconX size={24}/></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ... Inputs de Titulo, Duración, Año, Instrumentación ... */}
          <div className="col-span-full"><label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Título</label><textarea rows={2} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-lg font-bold" value={formData.titulo} onChange={e => updateField("titulo", e.target.value)} placeholder="Ej: Sinfonía n.5" autoFocus/></div>
          
          {/* COMPOSITOR CON CREACIÓN */}
          <div className="relative">
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Compositor</label>
              {selectedComposer ? (
                  <div className="flex justify-between items-center p-2 bg-indigo-50 border border-indigo-200 rounded text-indigo-700 font-bold"><span>{selectedComposer.apellido}, {selectedComposer.nombre}</span><button onClick={() => { setSelectedComposer(null); setComposerQuery(""); updateComposerRelation('compositor', null); }}><IconX size={16}/></button></div>
              ) : (
                  <>
                    <input type="text" className="input" placeholder="Buscar (Apellido, Nombre)..." value={composerQuery} onChange={e => { setComposerQuery(e.target.value); setShowComposerOptions(true); }} onFocus={() => setShowComposerOptions(true)}/>
                    {showComposerOptions && composerQuery && (
                        <div className="absolute top-full left-0 w-full bg-white border shadow-xl z-50 max-h-48 overflow-y-auto">
                            {filteredComposers.map(c => (<div key={c.id} className="p-2 hover:bg-slate-50 cursor-pointer text-sm" onClick={() => handleSelectComposer(c)}>{c.apellido}, {c.nombre}</div>))}
                            {/* Opción de crear si no hay match exacto */}
                            <div 
                                className="p-2 bg-indigo-50 hover:bg-indigo-100 cursor-pointer text-sm font-bold text-indigo-700 border-t border-indigo-100 flex items-center gap-2"
                                onClick={() => handleCreateComposer(composerQuery, 'compositor')}
                            >
                                <IconPlus size={14}/> Crear: "{composerQuery}"
                            </div>
                        </div>
                    )}
                  </>
              )}
          </div>

          <div className="relative">
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Arreglador</label>
              {selectedArranger ? (
                  <div className="flex justify-between items-center p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 font-bold"><span>{selectedArranger.apellido}, {selectedArranger.nombre}</span><button onClick={() => { setSelectedArranger(null); setArrangerQuery(""); updateComposerRelation('arreglador', null); }}><IconX size={16}/></button></div>
              ) : (
                  <>
                    <input type="text" className="input" placeholder="Buscar..." value={arrangerQuery} onChange={e => { setArrangerQuery(e.target.value); setShowArrangerOptions(true); }} onFocus={() => setShowArrangerOptions(true)}/>
                    {showArrangerOptions && arrangerQuery && (
                        <div className="absolute top-full left-0 w-full bg-white border shadow-xl z-50 max-h-48 overflow-y-auto">
                            {filteredArrangers.map(c => (<div key={c.id} className="p-2 hover:bg-slate-50 cursor-pointer text-sm" onClick={() => handleSelectArranger(c)}>{c.apellido}, {c.nombre}</div>))}
                            <div 
                                className="p-2 bg-emerald-50 hover:bg-emerald-100 cursor-pointer text-sm font-bold text-emerald-700 border-t border-emerald-100 flex items-center gap-2"
                                onClick={() => handleCreateComposer(arrangerQuery, 'arreglador')}
                            >
                                <IconPlus size={14}/> Crear: "{arrangerQuery}"
                            </div>
                        </div>
                    )}
                  </>
              )}
          </div>

          {/* ... Resto de inputs (duracion, anio, instrumentacion, link drive) ... */}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Duración</label><input type="text" className="input" value={formData.duracion} onChange={e => updateField("duracion", e.target.value)} placeholder="00:00"/></div>
            <div><label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Año</label><input type="number" className="input" value={formData.anio} onChange={e => updateField("anio", e.target.value)} placeholder="1804"/></div>
          </div>
          <div className="col-span-full"><label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Instrumentación</label><input type="text" className="input font-mono bg-slate-50 w-full" value={formData.instrumentacion} onChange={e => updateField("instrumentacion", e.target.value)} /></div>
          <div className="col-span-full relative"><label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block flex items-center gap-2">Link Drive <IconDrive size={12}/></label>
              <div className="flex gap-2"><input type="text" className="input text-blue-600" value={formData.link_drive} onChange={e => updateField("link_drive", e.target.value)} placeholder="https://drive.google.com/..."/>{formData.id && formData.link_drive && <button onClick={() => setShowDriveMatcher(true)} className="bg-blue-600 text-white px-3 py-2 rounded shadow hover:bg-blue-700 flex items-center gap-1 whitespace-nowrap text-sm font-bold animate-in zoom-in"><IconLink size={16}/> Asignar Archivos</button>}</div>
          </div>
      </div>

      <div className="border-t pt-4">
          <h3 className="text-sm font-bold uppercase text-slate-500 mb-3">Gestión de Particellas</h3>
          
          {!formData.id ? (
              <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-end bg-slate-50 p-3 rounded mb-4 border border-slate-200 shadow-sm opacity-50 pointer-events-none">
                      <div className="flex-1 relative"><label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Instrumento</label><input type="text" className="input" placeholder="Guardar obra primero..."/></div>
                      <div className="w-20"><label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Cant.</label><input type="number" className="input"/></div>
                      <button className="bg-slate-400 text-white px-4 py-2 rounded h-[38px]"><IconPlus/></button>
                  </div>
                  {particellas.length > 0 && <div className="p-2 text-center text-sm text-indigo-600 bg-indigo-50 rounded">Hay {particellas.length} particellas listas para crearse al guardar.</div>}
                  <div className="text-center text-xs text-slate-400">Debes crear la obra para gestionar los archivos de las partes.</div>
                  
                  <div className="flex gap-2 items-end bg-slate-50 p-3 rounded mb-4 border border-slate-200 shadow-sm mt-2">
                        <div className="flex-1 relative"><label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Pre-carga Instrumentos</label><input ref={instrumentInputRef} type="text" className="input" placeholder="Buscar (ej: Cuerdas)" value={instrumentQuery} onChange={e => { setInstrumentQuery(e.target.value); setGenInstrument(""); setShowInstrumentOptions(true); }} onFocus={() => setShowInstrumentOptions(true)} onBlur={() => setTimeout(() => setShowInstrumentOptions(false), 200)} onKeyDown={handleGenKeyDown}/>
                            {showInstrumentOptions && instrumentQuery && (<div className="absolute top-full left-0 w-full bg-white border shadow-xl max-h-48 overflow-y-auto z-50 rounded mt-1">{filteredInstruments.map(i => <div key={i.id} className="p-2 hover:bg-indigo-50 cursor-pointer text-xs border-b border-slate-50 last:border-0" onMouseDown={() => { setGenInstrument(i.id); setInstrumentQuery(i.instrumento); setShowInstrumentOptions(false); }}><span className={i.isGroup ? "font-bold text-indigo-700" : ""}>{i.instrumento}</span></div>)}</div>)}
                        </div>
                        <div className="w-20"><label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Cant.</label><input type="number" min="1" className="input text-center" value={genQuantity} onChange={e => setGenQuantity(parseInt(e.target.value))} onKeyDown={handleGenKeyDown} /></div>
                        <button onClick={handleAddParts} className="bg-indigo-600 text-white px-4 py-2 rounded h-[38px] hover:bg-indigo-700 shadow-sm"><IconPlus/></button>
                  </div>
                  {/* Vista Lista Previa */}
                  <div className="flex flex-col gap-2 opacity-70">
                        {particellas.map(p => (
                            <div key={p.tempId} className="flex items-center justify-between p-2 border rounded bg-white"><span className="text-xs font-bold">{p.nombre_archivo}</span></div>
                        ))}
                  </div>
              </div>
          ) : (
            <>
                <div className="flex gap-2 items-end bg-slate-50 p-3 rounded mb-4 border border-slate-200 shadow-sm">
                    <div className="flex-1 relative"><label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Instrumento</label><input ref={instrumentInputRef} type="text" className="input" placeholder="Buscar (ej: Cuerdas)" value={instrumentQuery} onChange={e => { setInstrumentQuery(e.target.value); setGenInstrument(""); setShowInstrumentOptions(true); }} onFocus={() => setShowInstrumentOptions(true)} onBlur={() => setTimeout(() => setShowInstrumentOptions(false), 200)} onKeyDown={handleGenKeyDown}/>
                        {showInstrumentOptions && instrumentQuery && (<div className="absolute top-full left-0 w-full bg-white border shadow-xl max-h-48 overflow-y-auto z-50 rounded mt-1">{filteredInstruments.map(i => <div key={i.id} className="p-2 hover:bg-indigo-50 cursor-pointer text-xs border-b border-slate-50 last:border-0" onMouseDown={() => { setGenInstrument(i.id); setInstrumentQuery(i.instrumento); setShowInstrumentOptions(false); }}><span className={i.isGroup ? "font-bold text-indigo-700" : ""}>{i.instrumento}</span></div>)}</div>)}
                    </div>
                    <div className="w-20"><label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Cant.</label><input type="number" min="1" className="input text-center" value={genQuantity} onChange={e => setGenQuantity(parseInt(e.target.value))} onKeyDown={handleGenKeyDown} /></div>
                    <button onClick={handleAddParts} className="bg-indigo-600 text-white px-4 py-2 rounded h-[38px] hover:bg-indigo-700 shadow-sm"><IconPlus/></button>
                </div>
                
                {/* LISTA DE PARTICELLAS (CAMBIADA DE GRID A FLEX-COL) */}
                <div className="flex flex-col gap-2">
                    {particellas.map(p => (
                        <div key={p.tempId} className="flex items-center gap-2 p-2 border rounded bg-white hover:shadow-sm transition-shadow group">
                            <span className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 select-none" title={p.instrumento_nombre}>{p.id_instrumento}</span>
                            <div className="flex-1 min-w-0">
                                <input 
                                    type="text" 
                                    className="w-full text-sm font-medium border-none p-0 focus:ring-0 text-slate-700 truncate" 
                                    value={p.nombre_archivo} 
                                    onChange={e => handleEditPart(p.tempId, "nombre_archivo", e.target.value)} 
                                    onBlur={handleBlurPart} // <--- GUARDA AL SALIR
                                />
                                <div className="flex gap-2 mt-1 flex-wrap">
                                    {p.links && p.links.map((l, i) => (<a key={i} href={l.url} target="_blank" className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1 truncate max-w-[150px] hover:underline" title={l.url}><IconLink size={10}/> {l.description || "Link"}</a>))}
                                </div>
                            </div>
                            <input type="text" className="w-12 text-xs text-center border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none" placeholder="Org." value={p.nota_organico || ""} onChange={e => handleEditPart(p.tempId, "nota_organico", e.target.value)} onBlur={handleBlurPart} title="Nota para cálculo"/>
                            <button onClick={() => openLinkModal(p)} className={`p-1 rounded transition-colors ${p.links?.length ? "text-blue-600" : "text-slate-300 hover:text-blue-500"}`}><IconLink size={14}/></button>
                            <button onClick={() => handleRemovePart(p.tempId)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 transition-opacity"><IconTrash size={16}/></button>
                        </div>
                    ))}
                    {particellas.length === 0 && <div className="col-span-full text-center py-8 text-slate-400 italic bg-slate-50 rounded border border-dashed">No hay particellas definidas.</div>}
                </div>
            </>
          )}
      </div>

      <div className="flex gap-4 pt-6 border-t bg-white sticky bottom-0 z-10 py-4">
          <button onClick={onCancel} className="flex-1 py-3 border rounded text-slate-600 font-bold hover:bg-slate-50">Cerrar</button>
          
          {!formData.id ? (
             <button onClick={handleCreateInitial} disabled={isSaving} className="flex-1 py-3 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 shadow-lg flex justify-center items-center gap-2">
                 {isSaving ? <IconLoader className="animate-spin"/> : <IconCheck/>} Crear Solicitud
             </button>
          ) : (
             <div className="flex-1 flex justify-center items-center text-xs text-slate-400 italic">
                 Cambios guardados automáticamente
             </div>
          )}
      </div>

      <DriveMatcherModal 
        isOpen={showDriveMatcher} onClose={() => setShowDriveMatcher(false)} 
        folderUrl={formData.link_drive} parts={particellas} 
        onPartsChange={handlePartsChange} 
        supabase={supabase} catalogoInstrumentos={instrumentList}
      />
      <LinksManagerModal
        isOpen={isLinkModalOpen} onClose={() => { setIsLinkModalOpen(false); setEditingLinksId(null); }}
        links={particellas.find((p) => p.tempId === editingLinksId)?.links || []}
        partName={particellas.find((p) => p.tempId === editingLinksId)?.nombre_archivo}
        onSave={(links) => { const updated = particellas.map(p => p.tempId === editingLinksId ? { ...p, links } : p); handlePartsChange(updated); }}
      />
    </div>
  );
}