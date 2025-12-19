import React, { useState, useEffect, useMemo } from "react";
import { IconLayers, IconLoader, IconDownload, IconPlus, IconCheck, IconX, IconTrash, IconEdit } from "../ui/Icons";

const ImportSeatingModal = ({ isOpen, onClose, onConfirm, currentProgramId, supabase }) => {
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [loading, setLoading] = useState(false);
  const [replace, setReplace] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchPrograms = async () => {
        setLoading(true);
        const { data } = await supabase.from("programas").select("id, nombre_gira, nomenclador, mes_letra").neq("id", currentProgramId).order("fecha_desde", { ascending: false }).limit(20);
        if (data) setPrograms(data);
        setLoading(false);
      };
      fetchPrograms();
    }
  }, [isOpen, currentProgramId, supabase]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><IconDownload className="text-indigo-600" /> Importar Disposición</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Desde la Gira:</label>
            {loading ? <div className="text-xs text-slate-400">Cargando...</div> : (
              <select className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500 bg-white" value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)}>
                <option value="" disabled>Seleccionar...</option>
                {programs.map((p) => (<option key={p.id} value={p.id}>{p.mes_letra} | {p.nomenclador}</option>))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2 border p-2 rounded bg-slate-50 border-slate-200">
            <input type="checkbox" id="chkReplace" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="accent-indigo-600" />
            <label htmlFor="chkReplace" className="text-xs text-slate-700 cursor-pointer">Eliminar grupos actuales antes de importar</label>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
            <button onClick={() => onConfirm(selectedProgram, replace)} disabled={!selectedProgram} className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm disabled:opacity-50">Importar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function GlobalStringsManager({ programId, roster, containers, onUpdate, supabase, readOnly }) {
  const validMusicianIds = useMemo(() => new Set(roster.map((m) => m.id)), [roster]);
  const displayContainers = useMemo(() => containers.map((c) => ({ ...c, validItems: c.items?.filter((i) => validMusicianIds.has(i.id_musico)) || [] })), [containers, validMusicianIds]);
  const stringMusicians = useMemo(() => roster.filter((m) => ["01", "02", "03", "04"].includes(m.id_instr)), [roster]);
  const assignedIds = new Set();
  displayContainers.forEach((c) => c.validItems.forEach((i) => assignedIds.add(i.id_musico)));
  const available = stringMusicians.filter((m) => !assignedIds.has(m.id));

  const [dragOverContainerId, setDragOverContainerId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCap, setEditCap] = useState("");

  const createContainer = async () => {
    if (readOnly) return;
    const name = prompt("Nombre del grupo:", `Grupo ${containers.length + 1}`);
    if (!name) return;
    await supabase.from("seating_contenedores").insert({ id_programa: programId, nombre: name, orden: containers.length, id_instrumento: "00" });
    onUpdate();
  };
  const deleteContainer = async (id) => {
    if (readOnly) return;
    if (!confirm("¿Eliminar este grupo?")) return;
    await supabase.from("seating_contenedores").delete().eq("id", id);
    onUpdate();
  };
  const startEditing = (c) => { setEditingId(c.id); setEditName(c.nombre); setEditCap(c.capacidad || ""); };
  const saveEditing = async (id) => {
    await supabase.from("seating_contenedores").update({ nombre: editName, capacidad: editCap ? parseInt(editCap) : null }).eq("id", id);
    setEditingId(null); onUpdate();
  };
  const updateOrderInDB = async (items) => { await Promise.all(items.map((item, index) => supabase.from("seating_contenedores_items").update({ orden: index }).eq("id", item.id))); };
  const addMusician = async (containerId, musicianId, targetIndex = -1) => {
    if (readOnly || containers.some(c => c.items.some(i => i.id_musico === musicianId))) return;
    const container = displayContainers.find(c => c.id === containerId);
    const { data: newItem } = await supabase.from("seating_contenedores_items").insert({ id_contenedor: containerId, id_musico: musicianId, orden: 9999 }).select("*, integrantes(nombre, apellido, instrumentos(instrumento))").single();
    if (!newItem) return;
    let newItems = [...container.validItems];
    targetIndex >= 0 ? newItems.splice(targetIndex, 0, newItem) : newItems.push(newItem);
    await updateOrderInDB(newItems); onUpdate();
  };
  const handleReorder = async (itemId, sourceContainerId, targetContainerId, targetIndex) => {
    const sourceContainer = displayContainers.find(c => c.id == sourceContainerId);
    const item = sourceContainer?.validItems.find(i => i.id == itemId);
    if (!item) return;
    if (sourceContainerId != targetContainerId) await supabase.from("seating_contenedores_items").update({ id_contenedor: targetContainerId }).eq("id", itemId);
    const targetContainer = displayContainers.find(c => c.id == targetContainerId);
    let targetItems = [...targetContainer.validItems];
    if (sourceContainerId == targetContainerId) targetItems = targetItems.filter(i => i.id != itemId);
    if (targetIndex >= 0) targetItems.splice(targetIndex, 0, { ...item, id_contenedor: targetContainerId });
    else targetItems.push({ ...item, id_contenedor: targetContainerId });
    await updateOrderInDB(targetItems); onUpdate();
  };
  const removeMusician = async (itemId) => { if (readOnly) return; await supabase.from("seating_contenedores_items").delete().eq("id", itemId); onUpdate(); };
  const handleImportSeating = async (sourceProgramId, replaceCurrent) => {
    setIsImporting(true); setShowImportModal(false);
    try {
      if (replaceCurrent && containers.length > 0) await supabase.from("seating_contenedores").delete().eq("id_programa", programId);
      const { data: sourceContainers } = await supabase.from("seating_contenedores").select("*").eq("id_programa", sourceProgramId).order("orden");
      if (!sourceContainers?.length) { alert("La gira seleccionada no tiene configuración."); setIsImporting(false); return; }
      const { data: sourceItems } = await supabase.from("seating_contenedores_items").select("*").in("id_contenedor", sourceContainers.map(c => c.id)).order("orden");
      const validMusicianIdsSet = new Set(roster.map(m => m.id));
      let currentOrderIndex = replaceCurrent ? 0 : containers.length;
      for (const srcCont of sourceContainers) {
        const { data: newCont } = await supabase.from("seating_contenedores").insert({ id_programa: programId, nombre: srcCont.nombre, id_instrumento: srcCont.id_instrumento || "00", orden: currentOrderIndex++ }).select().single();
        if (!newCont) continue;
        const itemsToInsert = sourceItems.filter(i => i.id_contenedor === srcCont.id && validMusicianIdsSet.has(i.id_musico)).map((item, idx) => ({ id_contenedor: newCont.id, id_musico: item.id_musico, orden: idx }));
        if (itemsToInsert.length) await supabase.from("seating_contenedores_items").insert(itemsToInsert);
      }
      onUpdate();
    } catch (e) { alert("Error importando."); } finally { setIsImporting(false); }
  };
  const handleDragStart = (e, type, id, containerId) => { if (readOnly) return; e.dataTransfer.setData("type", type); e.dataTransfer.setData("id", id); e.dataTransfer.setData("sourceContainerId", containerId); };
  const handleDrop = async (e, targetContainerId, targetItemId = null) => {
    if (readOnly) return; e.preventDefault(); e.stopPropagation(); setDragOverContainerId(null); setDragOverItemId(null);
    const type = e.dataTransfer.getData("type"); const id = e.dataTransfer.getData("id"); const sourceId = e.dataTransfer.getData("sourceContainerId");
    let targetIndex = -1; const targetContainer = displayContainers.find(c => c.id === targetContainerId);
    if (targetContainer && targetItemId) targetIndex = targetContainer.validItems.findIndex(i => i.id === targetItemId);
    if (type === "NEW") await addMusician(targetContainerId, id, targetIndex); else if (type === "MOVE") await handleReorder(id, sourceId, targetContainerId, targetIndex);
  };

  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 animate-in fade-in shrink-0">
      <ImportSeatingModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onConfirm={handleImportSeating} currentProgramId={programId} supabase={supabase} />
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm"><IconLayers size={16} /> Disposición de Cuerdas</h3>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 italic mr-2 hidden sm:inline">Arrastra para reordenar</span>
            <button onClick={() => setShowImportModal(true)} disabled={isImporting} className="bg-white border border-slate-300 text-slate-600 px-2 py-1 rounded text-[10px] font-bold hover:bg-slate-50 flex items-center gap-1 transition-colors disabled:opacity-50">{isImporting ? <IconLoader className="animate-spin" size={12} /> : <IconDownload size={12} />} Importar</button>
            <button onClick={createContainer} className="bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-indigo-700 flex items-center gap-1"><IconPlus size={12} /> Nuevo Grupo</button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-12 gap-4 h-[350px]">
        {!readOnly && (
          <div className="col-span-3 bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden shadow-sm">
            <div className="p-2 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase flex justify-between"><span>Sin Asignar ({available.length})</span></div>
            <div className="overflow-y-auto p-1 space-y-0.5 flex-1 select-none">
              {available.map((m) => (<div key={m.id} draggable={!readOnly} onDragStart={(e) => handleDragStart(e, "NEW", m.id, null)} className="text-[10px] p-1.5 bg-slate-50 border border-slate-100 rounded flex justify-between items-center hover:bg-indigo-50 cursor-grab active:cursor-grabbing"><div className="truncate pointer-events-none"><span className="text-slate-500">{m.nombre}</span> <span className="text-slate-700">{m.apellido} ({m.instrumentos?.instrumento})</span></div></div>))}
              {available.length === 0 && <div className="text-center text-[10px] text-slate-300 italic mt-4">Todos asignados</div>}
            </div>
          </div>
        )}
        <div className={`${readOnly ? "col-span-12" : "col-span-9"} grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto content-start pr-1`}>
          {displayContainers.map((c) => (
            <div key={c.id} onDragOver={(e) => { if (!readOnly) { e.preventDefault(); setDragOverContainerId(c.id); setDragOverItemId(null); } }} onDrop={(e) => handleDrop(e, c.id, null)} className={`bg-white border rounded-lg shadow-sm flex flex-col h-fit transition-all duration-200 ${dragOverContainerId === c.id && dragOverItemId === null ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50" : "border-indigo-100"}`}>
              <div className="p-1.5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30 rounded-t-lg min-h-[32px]">
                {editingId === c.id ? (<div className="flex items-center gap-1 w-full"><input className="w-full text-[10px] border border-indigo-300 rounded px-1 py-0.5 focus:outline-none" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus /><input type="number" className="w-10 text-[10px] border border-indigo-300 rounded px-1 py-0.5 text-center" value={editCap} onChange={(e) => setEditCap(e.target.value)} /><button onClick={() => saveEditing(c.id)} className="text-green-600"><IconCheck size={12} /></button><button onClick={() => setEditingId(null)} className="text-red-500"><IconX size={12} /></button></div>) : (<><div className="flex items-center gap-1 overflow-hidden"><span className="font-bold text-[10px] text-indigo-900 truncate uppercase tracking-wider" title={c.nombre}>{c.nombre}</span>{c.capacidad && (<span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded-full border border-slate-200">{c.validItems.length}/{c.capacidad}</span>)}<button onClick={() => startEditing(c)} className="text-slate-400 hover:text-indigo-600 ml-1 p-1"><IconEdit size={12} /></button></div>{!readOnly && (<button onClick={() => deleteContainer(c.id)} className="text-slate-300 hover:text-red-500"><IconTrash size={10} /></button>)}</>)}
              </div>
              <div className="p-1 space-y-0.5 min-h-[40px]">
                {c.validItems.map((item) => (<div key={item.id} draggable={!readOnly} onDragStart={(e) => handleDragStart(e, "MOVE", item.id, c.id)} onDragOver={(e) => { if (!readOnly) { e.preventDefault(); e.stopPropagation(); setDragOverContainerId(c.id); setDragOverItemId(item.id); } }} onDrop={(e) => handleDrop(e, c.id, item.id)} className={`flex items-center gap-1.5 p-1 border rounded text-[10px] group transition-colors cursor-grab active:cursor-grabbing ${dragOverItemId === item.id ? "border-t-2 border-t-indigo-500 bg-indigo-50 mt-1" : "bg-white border-slate-100"}`}><div className="flex-1 min-w-0 pointer-events-none"><span className="truncate block font-medium text-slate-700">{item.integrantes?.nombre} {item.integrantes?.apellido}</span></div>{!readOnly && (<button onClick={() => removeMusician(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><IconX size={10} /></button>)}</div>))}
                {c.validItems.length === 0 && (<div className="text-center text-[9px] text-indigo-200 py-4 border-2 border-dashed border-indigo-50 rounded italic pointer-events-none">Arrastra aquí</div>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}