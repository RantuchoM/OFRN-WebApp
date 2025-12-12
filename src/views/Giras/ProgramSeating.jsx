// src/views/Giras/ProgramSeating.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  IconUsers, IconLoader, IconX, IconChevronDown, IconCheck, IconPlus,
  IconTrash, IconArrowUp, IconArrowDown, IconSettings, IconLayers,
  IconExternalLink
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import { useGiraRoster } from "../../hooks/useGiraRoster";

const EXCLUDED_ROLES = [
  "staff", "produccion", "producción", "chofer", "archivo", 
  "utilero", "asistente", "iluminador", "sonido"
];

// --- MODAL CREAR PARTICELLA ---
const CreateParticellaModal = ({ isOpen, onClose, onConfirm, instrumentList, defaultInstrumentId }) => {
    const [selectedInstr, setSelectedInstr] = useState(defaultInstrumentId || "");
    const [name, setName] = useState("");
    useEffect(() => { if (isOpen) setSelectedInstr(defaultInstrumentId || (instrumentList[0]?.id || "")); }, [isOpen, defaultInstrumentId, instrumentList]);
    useEffect(() => { const instrName = instrumentList.find(i => i.id === selectedInstr)?.instrumento; if (instrName) setName(`${instrName} #`); else setName("PENDIENTE - Nueva Particella"); }, [selectedInstr, instrumentList]);
    if (!isOpen) return null;
    const handleSubmit = (e) => { e.preventDefault(); onConfirm(selectedInstr, name); };
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 border border-slate-200"><h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><IconPlus className="text-indigo-600" /> Crear Particella Pendiente</h3><form onSubmit={handleSubmit} className="flex flex-col gap-3"><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Instrumento (Base de Datos)</label><select className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500 bg-white" value={selectedInstr} onChange={e => setSelectedInstr(e.target.value)} required><option value="" disabled>Seleccionar...</option>{instrumentList.map(i => (<option key={i.id} value={i.id}>{i.instrumento}</option>))}</select></div><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre de Particella</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Flauta 1" autoFocus/></div><div className="flex justify-end gap-2 mt-2"><button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded">Cancelar</button><button type="submit" className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm">Crear y Asignar</button></div></form></div></div>
    );
};

// --- SELECTOR INTELIGENTE DE PARTICELLA (MODIFICADO) ---
const ParticellaSelect = ({ 
  options, 
  value, 
  onChange, 
  onRequestCreate, 
  placeholder = "-", 
  disabled = false,
  preferredInstrumentId = null 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.id === value);

  if (disabled) return (
    <div className="w-full h-full min-h-[24px] px-1 text-[10px] border border-transparent flex items-center justify-center text-slate-600 bg-transparent truncate cursor-default" title={selectedOption?.nombre_archivo}>
      {selectedOption ? selectedOption.nombre_archivo || selectedOption.instrumentos?.instrumento : "-"}
    </div>
  );

  // Filtramos por búsqueda primero
  const filteredOptions = options.filter((o) => 
    (o.nombre_archivo || "").toLowerCase().includes(search.toLowerCase()) || 
    (o.instrumentos?.instrumento || "").toLowerCase().includes(search.toLowerCase())
  );

  // Dividimos en sugeridos y el resto
  const recommendedOptions = filteredOptions.filter(o => o.id_instrumento === preferredInstrumentId);
  const otherOptions = filteredOptions.filter(o => o.id_instrumento !== preferredInstrumentId);
  
  const handleSelect = (id) => { onChange(id); setIsOpen(false); setSearch(""); };

  // --- RENDERIZADO DE OPCIÓN (INVERTIDO: Grande=Nombre, Chico=Instrumento) ---
  const renderOption = (opt) => (
    <button key={opt.id} onClick={() => handleSelect(opt.id)} className={`w-full text-left px-2 py-1 text-[10px] rounded hover:bg-indigo-50 flex items-center justify-between group ${value === opt.id ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700"}`}>
      <div className="truncate">
        {/* ARRIBA: Nombre de Archivo (Grande/Negrita) */}
        <span className="block font-medium truncate text-slate-800">
            {opt.nombre_archivo || "Sin nombre"}
        </span>
        {/* ABAJO: Instrumento (Pequeño/Gris) */}
        <span className="text-[9px] text-slate-400 font-normal truncate block">
            {opt.instrumentos?.instrumento || "Sin instr."}
        </span>
      </div>
      {value === opt.id && (<IconCheck size={10} className="text-indigo-600 shrink-0 ml-1" />)}
    </button>
  );

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={`w-full h-full min-h-[24px] text-left px-1 text-[10px] border rounded transition-colors flex items-center justify-between gap-0.5 ${value ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"}`}>
        <span className="truncate block w-full">{selectedOption ? selectedOption.nombre_archivo || selectedOption.instrumentos?.instrumento : placeholder}</span>
        <IconChevronDown size={8} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""} opacity-50`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 z-50 w-56 bg-white border border-slate-200 rounded shadow-xl mt-0.5 overflow-hidden flex flex-col max-h-60 animate-in fade-in zoom-in-95">
          <div className="p-1 border-b border-slate-50 bg-slate-50 sticky top-0 flex flex-col gap-1">
            <input type="text" autoFocus className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded outline-none focus:border-indigo-400" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button onClick={() => {onRequestCreate(); setIsOpen(false);}} className="w-full text-left px-2 py-1.5 text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-100 flex items-center gap-2 font-bold transition-colors">
              <IconPlus size={12}/> Crear Nueva...
            </button>
          </div>
          
          <div className="overflow-y-auto flex-1 p-1">
            <button onClick={() => handleSelect(null)} className="w-full text-left px-2 py-1 text-[10px] text-slate-400 hover:bg-red-50 hover:text-red-600 rounded flex items-center gap-2 mb-1">
              <IconX size={8} /> Quitar Asignación
            </button>

            {filteredOptions.length === 0 && (<div className="text-[10px] text-slate-400 p-2 text-center italic">No hay particellas</div>)}

            {/* SECCIÓN DE SUGERIDOS */}
            {recommendedOptions.length > 0 && (
              <>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 bg-slate-50 mt-1 mb-0.5 rounded">Sugeridos</div>
                {recommendedOptions.map(renderOption)}
                {otherOptions.length > 0 && <div className="border-t border-slate-100 my-1"></div>}
              </>
            )}

            {/* SECCIÓN RESTO DE OPCIONES */}
            {(otherOptions.length > 0 && recommendedOptions.length > 0) && (
                 <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mt-1 mb-0.5">Otros</div>
            )}
            {otherOptions.map(renderOption)}
          </div>
        </div>
      )}
    </div>
  );
};

// --- GESTOR DE CUERDAS ---
const GlobalStringsManager = ({ programId, roster, containers, onUpdate, supabase, readOnly }) => {
  const stringMusicians = useMemo(() => roster.filter((m) => ["01", "02", "03", "04", "05"].includes(m.id_instr)), [roster]);
  const assignedIds = new Set();
  containers.forEach((c) => c.items?.forEach((i) => assignedIds.add(i.id_musico)));
  const available = stringMusicians.filter((m) => !assignedIds.has(m.id));

  const createContainer = async () => { if (readOnly) return; const name = prompt("Nombre:", `Grupo ${containers.length + 1}`); if (!name) return; await supabase.from("seating_contenedores").insert({ id_programa: programId, nombre: name, orden: containers.length, id_instrumento: "00" }); onUpdate(); };
  const deleteContainer = async (id) => { if (readOnly) return; if (!confirm("¿Eliminar?")) return; await supabase.from("seating_contenedores").delete().eq("id", id); onUpdate(); };
  const addMusician = async (containerId, musicianId) => { if (readOnly) return; const container = containers.find((c) => c.id === containerId); await supabase.from("seating_contenedores_items").insert({ id_contenedor: containerId, id_musico: musicianId, orden: container.items.length }); onUpdate(); };
  const removeMusician = async (itemId) => { if (readOnly) return; await supabase.from("seating_contenedores_items").delete().eq("id", itemId); onUpdate(); };
  const moveItem = async (itemId, direction, currentOrder, containerId) => { if (readOnly) return; const container = containers.find((c) => c.id === containerId); const swapItem = container.items.find((i) => i.orden === currentOrder + direction); if (swapItem) { await supabase.from("seating_contenedores_items").update({ orden: currentOrder }).eq("id", swapItem.id); await supabase.from("seating_contenedores_items").update({ orden: currentOrder + direction }).eq("id", itemId); onUpdate(); } };

  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm"><IconLayers size={16} /> Disposición de Cuerdas</h3>{!readOnly && (<button onClick={createContainer} className="bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-indigo-700 flex items-center gap-1"><IconPlus size={12} /> Nuevo Grupo</button>)}</div>
      <div className="grid grid-cols-12 gap-4 h-[350px]">
        {!readOnly && (<div className="col-span-3 bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden"><div className="p-2 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">Sin Asignar ({available.length})</div><div className="overflow-y-auto p-1 space-y-0.5 flex-1">{available.map((m) => (<div key={m.id} className="text-[10px] p-1.5 bg-slate-50 border border-slate-100 rounded flex justify-between items-center group hover:border-indigo-200 cursor-default"><div className="truncate"><span className="font-bold text-slate-700">{m.apellido}</span> <span className="text-slate-500">{m.nombre.charAt(0)}.</span><span className="text-[8px] text-indigo-400 ml-1">({m.instrumentos?.instrumento})</span></div><div className="hidden group-hover:flex flex-col gap-0.5 absolute right-2 bg-white shadow-lg p-1 rounded border z-10">{containers.map((c) => (<button key={c.id} onClick={() => addMusician(c.id, m.id)} className="text-[9px] text-left hover:bg-indigo-50 px-1 rounded whitespace-nowrap text-indigo-700">→ {c.nombre}</button>))}</div></div>))}{available.length === 0 && <div className="text-center text-[10px] text-slate-300 italic mt-4">Todos asignados</div>}</div></div>)}
        <div className={`${readOnly ? "col-span-12" : "col-span-9"} grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto content-start pr-1`}>{containers.map((c) => (<div key={c.id} className="bg-white border border-indigo-100 rounded-lg shadow-sm flex flex-col h-fit"><div className="p-1.5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30"><span className="font-bold text-[10px] text-indigo-900 truncate uppercase tracking-wider" title={c.nombre}>{c.nombre}</span>{!readOnly && <button onClick={() => deleteContainer(c.id)} className="text-slate-300 hover:text-red-500"><IconTrash size={10} /></button>}</div><div className="p-1 space-y-0.5 min-h-[40px]">{c.items.map((item, idx) => (<div key={item.id} className="flex items-center gap-1.5 p-1 bg-white border border-slate-100 rounded text-[10px] group">{!readOnly && (<div className="flex flex-col gap-0.5 opacity-20 group-hover:opacity-100"><button disabled={idx === 0} onClick={() => moveItem(item.id, -1, item.orden, c.id)} className="hover:text-indigo-600 disabled:opacity-0"><IconArrowUp size={8} /></button><button disabled={idx === c.items.length - 1} onClick={() => moveItem(item.id, 1, item.orden, c.id)} className="hover:text-indigo-600 disabled:opacity-0"><IconArrowDown size={8} /></button></div>)}<div className="flex-1 min-w-0"><span className="truncate block font-medium text-slate-700">{item.integrantes?.nombre} {item.integrantes?.apellido}</span></div>{!readOnly && <button onClick={() => removeMusician(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><IconX size={10} /></button>}</div>))}{!readOnly && c.items.length === 0 && <div className="text-center text-[9px] text-indigo-200 py-2 border-2 border-dashed border-indigo-50 rounded italic">Vacío</div>}</div></div>))}{containers.length === 0 && <div className="col-span-full text-center py-10 text-slate-400 italic text-xs">No hay grupos de cuerdas definidos.</div>}</div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function ProgramSeating({ supabase, program, onBack, repertoireBlocks = [] }) {
  const { isEditor } = useAuth();
  const { roster: rawRoster, loading: rosterLoading } = useGiraRoster(supabase, program);

  const [filteredRoster, setFilteredRoster] = useState([]);
  const [particellas, setParticellas] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [containers, setContainers] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [instrumentList, setInstrumentList] = useState([]);
  const [createModalInfo, setCreateModalInfo] = useState(null);

  const obras = useMemo(() => {
    if (!repertoireBlocks || repertoireBlocks.length === 0) return [];
    return repertoireBlocks.flatMap((block) =>
      block.repertorio_obras.map((ro) => {
        const comp = ro.obras.obras_compositores?.find((oc) => oc.rol === "compositor" || !oc.rol)?.compositores;
        const compName = comp?.apellido || "Anónimo";
        const title = ro.obras.titulo || "Obra";
        return {
          id: ro.id, obra_id: ro.obras.id, link: ro.obras.google_drive_folder_id,
          title: title, composer: compName, shortTitle: title.split(/\s+/).slice(0, 3).join(" "), fullTitle: `${compName} - ${title}`,
        };
      })
    );
  }, [repertoireBlocks]);

  useEffect(() => {
    if (program?.id && !rosterLoading) fetchInitialData();
  }, [program.id, repertoireBlocks, rosterLoading, rawRoster]);

  const isString = (id) => ["01", "02", "03", "04"].includes(id);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: instruments } = await supabase.from('instrumentos').select('id, instrumento').order('instrumento');
      setInstrumentList(instruments || []);

      const musicians = rawRoster.filter(m => m.estado_gira !== 'ausente' && !EXCLUDED_ROLES.includes((m.rol_gira || 'musico').toLowerCase()));
      musicians.sort((a, b) => {
        const instrIdA = a.id_instr || '9999';
        const instrIdB = b.id_instr || '9999';
        if (instrIdA !== instrIdB) return instrIdA.localeCompare(instrIdB);
        return (a.apellido || '').localeCompare(b.apellido || '');
      });
      setFilteredRoster(musicians);

      await fetchContainers();
      const workIds = [...new Set(obras.map(o => o.obra_id))];
      await fetchParticellas(workIds);

      const { data: assigns } = await supabase.from('seating_asignaciones').select('*').eq('id_programa', program.id);
      const finalMap = {}; 
      assigns?.forEach(row => {
        const obraId = row.id_obra; 
        if (row.id_contenedor) finalMap[`C-${row.id_contenedor}-${obraId}`] = row.id_particella;
        else if (row.id_musicos_asignados) row.id_musicos_asignados.forEach(mId => finalMap[`M-${mId}-${obraId}`] = row.id_particella);
      });
      setAssignments(finalMap);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchParticellas = async (workIds) => {
      if(workIds.length === 0) return;
      let partsData = [];
      const chunkArray = (arr, size) => { const res = []; for(let i=0; i<arr.length; i+=size) res.push(arr.slice(i, i+size)); return res; };
      const chunks = chunkArray(workIds, 10);
      for(const chunk of chunks) {
        const { data } = await supabase.from('obras_particellas').select('id, id_obra, nombre_archivo, id_instrumento, instrumentos(id, instrumento)').in('id_obra', chunk);
        if(data) partsData = [...partsData, ...data];
      }
      setParticellas(partsData);
  };

  const fetchContainers = async () => {
    const { data: conts } = await supabase.from("seating_contenedores").select("*").eq("id_programa", program.id).order("orden");
    if (conts) {
      const { data: items } = await supabase.from("seating_contenedores_items").select("*, integrantes(nombre, apellido, instrumentos(instrumento))").in("id_contenedor", conts.map((c) => c.id)).order("orden");
      const full = conts.map((c) => ({ ...c, items: items?.filter((i) => i.id_contenedor === c.id) || [] }));
      setContainers(full);
    }
  };

  const openCreateModal = (obraId, defaultInstrId, targetType, targetId) => { setCreateModalInfo({ obraId, targetType, targetId, defaultInstrId }); };

  const handleConfirmCreate = async (instrumentId, name) => {
    if (!createModalInfo) return;
    const { obraId, targetType, targetId } = createModalInfo;
    const { data, error } = await supabase.from('obras_particellas').insert({ id_obra: obraId, id_instrumento: instrumentId, nombre_archivo: name }).select().single();
    if (error) { alert("Error: " + error.message); return; }
    const instrName = instrumentList.find(i => i.id === instrumentId)?.instrumento || "Nuevo Instr.";
    const newPart = { ...data, instrumentos: { id: instrumentId, instrumento: instrName } };
    setParticellas(prev => [...prev, newPart]);
    handleAssign(targetType, targetId, obraId, data.id);
    setCreateModalInfo(null);
  };

  const handleAssign = async (targetType, targetId, obraId, particellaId) => {
    if (!isEditor) return;
    const key = `${targetType}-${targetId}-${obraId}`;
    setAssignments((prev) => { const copy = { ...prev }; if (!particellaId) delete copy[key]; else copy[key] = particellaId; return copy; });
    if (targetType === "C") {
      await supabase.from("seating_asignaciones").delete().match({ id_programa: program.id, id_contenedor: targetId, id_obra: obraId });
      if (particellaId) await supabase.from("seating_asignaciones").insert({ id_programa: program.id, id_obra: obraId, id_particella: particellaId, id_contenedor: targetId, id_musicos_asignados: null });
    } else {
      const { data: existing } = await supabase.from("seating_asignaciones").select("*").eq("id_programa", program.id).eq("id_obra", obraId);
      const updates = [];
      existing?.forEach((row) => {
        if (row.id_musicos_asignados?.includes(targetId)) {
          const newArr = row.id_musicos_asignados.filter((id) => id !== targetId);
          if (newArr.length === 0 && !row.id_contenedor) updates.push(supabase.from("seating_asignaciones").delete().eq("id", row.id));
          else updates.push(supabase.from("seating_asignaciones").update({ id_musicos_asignados: newArr }).eq("id", row.id));
        }
      });
      if (particellaId) {
        const targetRow = existing?.find((r) => r.id_particella === particellaId && !r.id_contenedor);
        if (targetRow) {
          const newArr = [...new Set([...(targetRow.id_musicos_asignados || []), targetId])];
          updates.push(supabase.from("seating_asignaciones").update({ id_musicos_asignados: newArr }).eq("id", targetRow.id));
        } else {
          updates.push(supabase.from("seating_asignaciones").insert({ id_programa: program.id, id_obra: obraId, id_particella: particellaId, id_musicos_asignados: [targetId] }));
        }
      }
      await Promise.all(updates);
    }
  };

  const otherMusicians = filteredRoster.filter((m) => !isString(m.id_instr));

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <CreateParticellaModal isOpen={!!createModalInfo} onClose={() => setCreateModalInfo(null)} onConfirm={handleConfirmCreate} instrumentList={instrumentList} defaultInstrumentId={createModalInfo?.defaultInstrId}/>
      {(loading || rosterLoading) && <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center"><IconLoader className="animate-spin text-indigo-600" size={32} /></div>}
      <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><IconUsers className="text-indigo-600" /> Seating & Particellas</h2>
        <div className="flex gap-2"><button onClick={() => setShowConfig(!showConfig)} className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors ${showConfig ? "bg-indigo-600 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`}><IconSettings size={16} /> {isEditor ? "Configurar Cuerdas" : "Ver Grupos Cuerdas"}</button><button onClick={onBack} className="text-sm font-medium text-slate-500 hover:text-indigo-600 ml-4">← Volver</button></div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {showConfig && <GlobalStringsManager programId={program.id} roster={filteredRoster} containers={containers} onUpdate={fetchContainers} supabase={supabase} readOnly={!isEditor} />}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto pb-20">
            <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
              <thead className="bg-slate-800 text-white font-bold sticky top-0 z-20 shadow-md">
                <tr>
                  <th className="p-2 w-64 sticky left-0 bg-slate-800 z-30 border-r border-slate-600 pl-4">Contenedor / Músico</th>
                  {obras.map((obra) => (<th key={obra.id} className="p-1 min-w-[140px] border-l border-slate-600 align-bottom"><div className="flex flex-col gap-0.5 items-center w-full"><div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"><span className="text-[9px] uppercase tracking-wide">{obra.composer}</span>{obra.link && <a href={`https://drive.google.com/drive/folders/${obra.link}`} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:text-white" title="Abrir en Drive"><IconExternalLink size={10} /></a>}</div><div className="text-[10px] font-bold text-white leading-tight text-center px-1 mb-1">{obra.shortTitle}</div></div></th>))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {containers.length > 0 && (
                  <>
                    <tr className="bg-indigo-50/50"><td colSpan={obras.length + 1} className="p-1 px-4 text-[10px] font-bold text-indigo-800 uppercase tracking-wider border-b border-indigo-100">Sección de Cuerdas</td></tr>
                    {containers.map((c) => (
                      <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="p-2 sticky left-0 bg-white group-hover:bg-indigo-50/30 border-r border-slate-200 z-10 pl-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          <div className="flex flex-col"><span className="font-bold text-indigo-900 text-sm flex items-center gap-2"><IconLayers size={14} /> {c.nombre}</span><div className="text-[9px] text-slate-500 mt-0.5 truncate max-w-[200px]" title={c.items.map((i) => i.integrantes?.apellido).join(", ")}>{c.items.length} músicos...</div></div>
                        </td>
                        {obras.map((obra) => { 
                          const availableParts = particellas.filter((p) => p.id_obra === obra.obra_id); 
                          const currentVal = assignments[`C-${c.id}-${obra.obra_id}`]; 
                          return (
                            <td key={`${c.id}-${obra.id}`} className="p-1 border-l border-slate-100 relative min-w-[140px] bg-slate-50/30">
                              <ParticellaSelect 
                                options={availableParts} 
                                value={currentVal} 
                                onChange={(val) => handleAssign("C", c.id, obra.obra_id, val)} 
                                onRequestCreate={() => openCreateModal(obra.obra_id, "00", "C", c.id)} 
                                disabled={!isEditor} 
                                placeholder="Asignar Grupo"
                                preferredInstrumentId={c.id_instrumento} // Preferencia de contenedor
                              />
                            </td>
                          ); 
                        })}
                      </tr>
                    ))}
                  </>
                )}
                {otherMusicians.length > 0 && (
                  <>
                    <tr className="bg-slate-100/50"><td colSpan={obras.length + 1} className="p-1 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 border-t border-slate-200 mt-4">Vientos y Percusión</td></tr>
                    {otherMusicians.map((musician) => (
                      <tr key={musician.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-2 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10 pl-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          <div className="flex flex-col"><span className="font-bold text-slate-700 truncate text-xs">{musician.apellido}, {musician.nombre}</span><span className="text-[9px] text-slate-400 truncate flex items-center gap-1">{musician.instrumentos?.instrumento} {musician.rol_gira && musician.rol_gira !== 'musico' && <span className="text-amber-600">({musician.rol_gira})</span>}</span></div>
                        </td>
                        {obras.map((obra) => { 
                          const availableParts = particellas.filter((p) => p.id_obra === obra.obra_id); 
                          const currentVal = assignments[`M-${musician.id}-${obra.obra_id}`]; 
                          return (
                            <td key={`${musician.id}-${obra.id}`} className="p-1 border-l border-slate-100 relative min-w-[140px]">
                              <ParticellaSelect 
                                options={availableParts} 
                                value={currentVal} 
                                onChange={(val) => handleAssign("M", musician.id, obra.obra_id, val)} 
                                onRequestCreate={() => openCreateModal(obra.obra_id, musician.id_instr, "M", musician.id)} 
                                disabled={!isEditor}
                                preferredInstrumentId={musician.id_instr} // Preferencia de musico
                              />
                            </td>
                          ); 
                        })}
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}