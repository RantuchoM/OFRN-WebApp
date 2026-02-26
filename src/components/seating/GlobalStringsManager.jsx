import React, { useState, useEffect, useMemo } from "react";
import {
  IconLayers,
  IconLoader,
  IconDownload,
  IconPlus,
  IconCheck,
  IconX,
  IconTrash,
  IconEdit,
  IconChevronDown,
} from "../ui/Icons";
import DateInput from "../ui/DateInput";

const PROGRAM_TYPES = [
  { value: "Todos", label: "Todos" },
  { value: "Sinfónico", label: "Sinfónico" },
  { value: "Ensamble", label: "Ensamble" },
  { value: "Camerata", label: "Camerata" },
  { value: "Otros", label: "Otros" },
];

const ImportSeatingModal = ({
  isOpen,
  onClose,
  onConfirm,
  currentProgramId,
  supabase,
}) => {
  const [loading, setLoading] = useState(false);
  const [replace, setReplace] = useState(true);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [rows, setRows] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  });

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("programas")
        .select("id, nombre_gira, nomenclador, fecha_desde, tipo")
        .neq("id", currentProgramId)
        .gte("fecha_desde", fechaDesde)
        .order("fecha_desde", { ascending: true });

      if (tipoFiltro === "Sinfónico" || tipoFiltro === "Ensamble") {
        query = query.eq("tipo", tipoFiltro);
      } else if (tipoFiltro === "Otros") {
        query = query.not("tipo", "in", ["Sinfónico,Ensamble"]);
      }

      const { data: programasData } = await query;

      if (!programasData || programasData.length === 0) {
        setRows([]);
        setSelectedProgramId(null);
        setExpandedId(null);
        setLoading(false);
        return;
      }

      const ids = programasData.map((p) => p.id);
      const { data: contenedores } = await supabase
        .from("seating_contenedores")
        .select("id, id_programa, nombre, id_instrumento")
        .in("id_programa", ids);

      const contIds = (contenedores || []).map((c) => c.id);
      let itemsByContainer = {};
      if (contIds.length > 0) {
        const { data: items } = await supabase
          .from("seating_contenedores_items")
          .select("id_contenedor, id_musico, integrantes(apellido, nombre)")
          .in("id_contenedor", contIds);

        (items || []).forEach((item) => {
          const key = item.id_contenedor;
          if (!itemsByContainer[key]) itemsByContainer[key] = [];
          if (item.integrantes) {
            itemsByContainer[key].push(item.integrantes);
          }
        });
      }

      const grouped = {};
      (contenedores || []).forEach((c) => {
        if (!grouped[c.id_programa]) grouped[c.id_programa] = [];
        grouped[c.id_programa].push(c);
      });

      const mapped = programasData.map((p) => ({
        ...p,
        contenedores: (grouped[p.id] || [])
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
          .map((c) => {
            const people = itemsByContainer[c.id] || [];
            const peopleNames = people
              .map((pers) =>
                `${pers.apellido || ""} ${pers.nombre || ""}`.trim(),
              )
              .filter(Boolean);
            return {
              ...c,
              peopleCount: peopleNames.length,
              peopleNames,
            };
          }),
      }));

      setRows(mapped);
      setSelectedProgramId(mapped[0]?.id || null);
      setExpandedId(mapped[0]?.id || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPrograms();
    }
  }, [isOpen, tipoFiltro, fechaDesde]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedProgramId) return;
    onConfirm(selectedProgramId, replace);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-4 border border-slate-200 flex flex-col max-h-[80vh]">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
          <IconDownload className="text-indigo-600" /> Importar Disposición
          desde otra gira
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Tipo de programa
            </label>
            <select
              className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
            >
              {PROGRAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <DateInput
              label="Fecha desde"
              value={fechaDesde}
              onChange={(iso) => setFechaDesde(iso || fechaDesde)}
              className="text-xs"
            />
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-2 border p-2 rounded bg-slate-50 border-slate-200 w-full">
              <input
                type="checkbox"
                id="chkReplace"
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
                className="accent-indigo-600"
              />
              <label
                htmlFor="chkReplace"
                className="text-[11px] text-slate-700 cursor-pointer"
              >
                Eliminar grupos actuales antes de importar
              </label>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto border border-slate-200 rounded-md mb-3">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-xs text-slate-500">
              <IconLoader className="animate-spin mr-2" size={14} />
              Buscando programas...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-xs text-slate-400 italic">
              No se encontraron programas con estos filtros.
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-2 py-1">Programa</th>
                  <th className="text-left px-2 py-1">Fecha</th>
                  <th className="text-left px-2 py-1">Tipo</th>
                  <th className="text-center px-2 py-1">Contenedores</th>
                  <th className="text-center px-2 py-1">Preview</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const isSelected = selectedProgramId === p.id;
                  const isExpanded = expandedId === p.id;
                  const conts = p.contenedores || [];
                  const fechaLabel = p.fecha_desde
                    ? new Date(p.fecha_desde).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })
                    : "-";
                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        className={`cursor-pointer hover:bg-indigo-50 ${
                          isSelected ? "bg-indigo-50" : ""
                        }`}
                        onClick={() => setSelectedProgramId(p.id)}
                      >
                        <td className="px-2 py-1">
                          <div className="font-semibold text-slate-800 truncate">
                            {p.nomenclador || p.nombre_gira || "Sin título"}
                          </div>
                        </td>
                        <td className="px-2 py-1 text-slate-600">
                          {fechaLabel}
                        </td>
                        <td className="px-2 py-1 text-slate-600">
                          {p.tipo || "-"}
                        </td>
                        <td className="px-2 py-1 text-center text-slate-700 font-semibold">
                          {conts.length}
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(isExpanded ? null : p.id);
                              setSelectedProgramId(p.id);
                            }}
                            className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] border rounded-full text-slate-600 hover:bg-slate-100"
                          >
                            <IconChevronDown
                              size={12}
                              className={`mr-1 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                            Ver
                          </button>
                        </td>
                      </tr>
                      {isExpanded && conts.length > 0 && (
                        <tr className="bg-slate-50/80">
                          <td
                            colSpan={5}
                            className="px-3 py-2 border-t border-slate-200"
                          >
                            <div className="text-[10px] text-slate-500 mb-1 font-semibold uppercase">
                              Contenedores / Instrumentos / Músicos
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {conts.map((c) => (
                                <span
                                  key={c.id}
                                  className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] text-slate-700"
                                >
                                  {c.nombre}
                                  {c.id_instrumento
                                    ? ` · ${c.id_instrumento}`
                                    : ""}
                                  {typeof c.peopleCount === "number"
                                    ? ` · ${c.peopleCount}`
                                    : ""}
                                  {c.peopleNames && c.peopleNames.length > 0 && (
                                    <>
                                      {" · "}
                                      {c.peopleNames
                                        .slice(0, 3)
                                        .map((n, idx) =>
                                          idx === 0 ? n : ` / ${n}`,
                                        )}
                                      {c.peopleNames.length > 3
                                        ? ` +${c.peopleNames.length - 3}`
                                        : ""}
                                    </>
                                  )}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedProgramId || loading}
            className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? (
              <IconLoader className="animate-spin" size={12} />
            ) : (
              <IconDownload size={12} />
            )}
            Importar
          </button>
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
      let currentOrderIndex = replaceCurrent ? 0 : containers.length;
      for (const srcCont of sourceContainers) {
        const { data: newCont } = await supabase.from("seating_contenedores").insert({ id_programa: programId, nombre: srcCont.nombre, id_instrumento: srcCont.id_instrumento || "00", orden: currentOrderIndex++ }).select().single();
        if (!newCont) continue;
        const itemsToInsert = sourceItems
          .filter(i => i.id_contenedor === srcCont.id)
          .map((item, idx) => ({
            id_contenedor: newCont.id,
            id_musico: item.id_musico,
            orden: idx,
          }));
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