// src/views/Giras/ProgramSeating.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  IconUsers, IconLoader, IconX, IconChevronDown, IconCheck, IconPlus,
  IconTrash, IconArrowUp, IconArrowDown, IconSettings, IconLayers,
  IconExternalLink, IconAlertCircle, IconDownload, IconHistory// <--- Nuevo
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
    useEffect(() => { const instrName = instrumentList.find(i => i.id === selectedInstr)?.instrumento; if (instrName) setName(`PENDIENTE - ${instrName}`); else setName("PENDIENTE - Nueva Particella"); }, [selectedInstr, instrumentList]);
    if (!isOpen) return null;
    const handleSubmit = (e) => { e.preventDefault(); onConfirm(selectedInstr, name); };
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 border border-slate-200"><h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><IconPlus className="text-indigo-600" /> Crear Particella Pendiente</h3><form onSubmit={handleSubmit} className="flex flex-col gap-3"><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Instrumento (Base de Datos)</label><select className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500 bg-white" value={selectedInstr} onChange={e => setSelectedInstr(e.target.value)} required><option value="" disabled>Seleccionar...</option>{instrumentList.map(i => (<option key={i.id} value={i.id}>{i.instrumento}</option>))}</select></div><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre de Particella</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Flauta 1" autoFocus/></div><div className="flex justify-end gap-2 mt-2"><button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded">Cancelar</button><button type="submit" className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm">Crear y Asignar</button></div></form></div></div>
    );
};

// --- SELECTOR INTELIGENTE DE PARTICELLA ---
const ParticellaSelect = ({ 
  options, 
  value, 
  onChange, 
  onRequestCreate, 
  placeholder = "-", 
  disabled = false,
  preferredInstrumentId = null,
  counts = {} 
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
  const currentAssignedCount = value ? (counts[value] || 0) : 0;
  const showCountLabel = currentAssignedCount > 1;

  if (disabled) return (
    <div className="w-full h-full min-h-[24px] px-1 text-[10px] border border-transparent flex items-center justify-center text-slate-600 bg-transparent truncate cursor-default" title={selectedOption?.nombre_archivo}>
       {selectedOption ? (
        <span>
          {selectedOption.nombre_archivo || selectedOption.instrumentos?.instrumento}
          {showCountLabel && <span className="font-bold ml-1 text-slate-800">[x{currentAssignedCount}]</span>}
        </span>
       ) : "-"}
    </div>
  );

  const filteredOptions = options.filter((o) => 
    (o.nombre_archivo || "").toLowerCase().includes(search.toLowerCase()) || 
    (o.instrumentos?.instrumento || "").toLowerCase().includes(search.toLowerCase())
  );

  const recommendedOptions = filteredOptions.filter(o => o.id_instrumento === preferredInstrumentId);
  const otherOptions = filteredOptions.filter(o => o.id_instrumento !== preferredInstrumentId);
  
  const handleSelect = (id) => { onChange(id); setIsOpen(false); setSearch(""); };

  const renderOption = (opt) => {
    const assignedCount = counts[opt.id] || 0; 
    return (
      <button key={opt.id} onClick={() => handleSelect(opt.id)} className={`w-full text-left px-2 py-1 text-[10px] rounded hover:bg-indigo-50 flex items-center justify-between group ${value === opt.id ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700"}`}>
        <div className="truncate w-full">
          <div className="flex items-center justify-between w-full">
             <span className="block font-medium truncate text-slate-800">
                {opt.nombre_archivo || "Sin nombre"}
             </span>
             {assignedCount > 0 && (
                <span className="ml-1 text-[8px] bg-slate-100 text-slate-500 px-1 rounded-full border border-slate-200 shrink-0">
                   {assignedCount}
                </span>
             )}
          </div>
          <span className="text-[9px] text-slate-400 font-normal truncate block">
              {opt.instrumentos?.instrumento || "Sin instr."}
          </span>
        </div>
        {value === opt.id && (<IconCheck size={10} className="text-indigo-600 shrink-0 ml-1" />)}
      </button>
    );
  };

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={`w-full h-full min-h-[24px] text-left px-1 text-[10px] border rounded transition-colors flex items-center justify-between gap-0.5 ${value ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"}`}>
        <span className="truncate block w-full">
            {selectedOption 
                ? (
                    <>
                        {selectedOption.nombre_archivo || selectedOption.instrumentos?.instrumento}
                        {showCountLabel && <span className="text-indigo-900 ml-1 font-extrabold">[x{currentAssignedCount}]</span>}
                    </>
                  ) 
                : placeholder
            }
        </span>
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
            {recommendedOptions.length > 0 && (
              <>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 bg-slate-50 mt-1 mb-0.5 rounded">Sugeridos</div>
                {recommendedOptions.map(renderOption)}
                {otherOptions.length > 0 && <div className="border-t border-slate-100 my-1"></div>}
              </>
            )}
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

// --- MODAL REPORTE HISTÓRICO DE SEATING ---
const SeatingHistoryModal = ({ isOpen, onClose, roster, supabase }) => {
  const [historyData, setHistoryData] = useState({});
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtramos solo las cuerdas del roster actual para mostrar en la tabla
  const stringMusicians = useMemo(() => {
    return roster.filter(m => ["01", "02", "03", "04", "05"].includes(m.id_instr));
  }, [roster]);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // 1. Obtener las últimas 6 giras (incluyendo o excluyendo la actual, según prefieras)
      // Aquí traemos las últimas 6 por fecha descendente
      const { data: progs } = await supabase
        .from("programas")
        .select("id, mes_letra, nomenclador, fecha_desde")
        .order("fecha_desde", { ascending: true })
        .limit(6);

      if (!progs) return;
      setPrograms(progs);

      // 2. Obtener la configuración de asientos de ESOS programas
      const progIds = progs.map(p => p.id);
      
      // Hacemos un join para traer items y saber a qué contenedor y programa pertenecen
      const { data: items } = await supabase
        .from("seating_contenedores_items")
        .select(`
          orden,
          id_musico,
          seating_contenedores!inner (
            id_programa,
            nombre
          )
        `)
        .in("seating_contenedores.id_programa", progIds);

      // 3. Procesar datos para acceso rápido: map[musicoId][programaId] = "Violin 1 (3)"
      const map = {};
      items?.forEach(item => {
        const mId = item.id_musico;
        const pId = item.seating_contenedores.id_programa;
        // Sumamos 1 al orden porque en programación empieza en 0, pero en música leemos 1
        const label = `${item.seating_contenedores.nombre} (${item.orden + 1})`;

        if (!map[mId]) map[mId] = {};
        map[mId][pId] = label;
      });

      setHistoryData(map);

    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[80vh] flex flex-col border border-slate-200">
        
        {/* Header del Modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
            <IconHistory className="text-indigo-600" /> Historial de Seating (Cuerdas)
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-500">
            <IconX size={20} />
          </button>
        </div>

        {/* Contenido (Tabla con Scroll) */}
        <div className="flex-1 overflow-auto p-0">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-500 gap-2">
              <IconLoader className="animate-spin" /> Cargando historial...
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-white sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-3 w-48 bg-slate-100 border-b border-r border-slate-200 font-bold text-slate-600 sticky left-0 z-20">
                    Músico
                  </th>
                  {programs.map(p => (
                    <th key={p.id} className="p-2 min-w-[120px] bg-slate-50 border-b border-r border-slate-200 text-slate-600 font-bold text-center">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">{p.mes_letra}</div>
                      <div className="text-indigo-900">{p.nomenclador}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stringMusicians.map((musician, idx) => (
                  <tr key={musician.id} className={idx % 2 === 0 ? "bg-white hover:bg-indigo-50/30" : "bg-slate-50/30 hover:bg-indigo-50/30"}>
                    <td className="p-2 border-r border-slate-200 font-medium text-slate-700 sticky left-0 bg-inherit truncate">
                      {musician.apellido}, {musician.nombre}
                    </td>
                    {programs.map(p => {
                      const cellData = historyData[musician.id]?.[p.id];
                      return (
                        <td key={p.id} className="p-2 border-r border-slate-100 text-center text-slate-600">
                          {cellData ? (
                            <span className="inline-block px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium text-[10px]">
                              {cellData}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-right rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded font-bold text-xs hover:bg-slate-50 shadow-sm">
            Cerrar Reporte
          </button>
        </div>
      </div>
    </div>
  );
};
// --- GESTOR DE CUERDAS CON DRAG AND DROP E IMPORTACIÓN ---
const GlobalStringsManager = ({ programId, roster, containers, onUpdate, supabase, readOnly }) => {
  const stringMusicians = useMemo(() => roster.filter((m) => ["01", "02", "03", "04", "05"].includes(m.id_instr)), [roster]);
  const assignedIds = new Set();
  containers.forEach((c) => c.items?.forEach((i) => assignedIds.add(i.id_musico)));
  const available = stringMusicians.filter((m) => !assignedIds.has(m.id));

  // Estados
  const [dragOverContainerId, setDragOverContainerId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
 
  const [isImporting, setIsImporting] = useState(false);

  // Funciones básicas
  const createContainer = async () => { if (readOnly) return; const name = prompt("Nombre:", `Grupo ${containers.length + 1}`); if (!name) return; await supabase.from("seating_contenedores").insert({ id_programa: programId, nombre: name, orden: containers.length, id_instrumento: "00" }); onUpdate(); };
  const deleteContainer = async (id) => { if (readOnly) return; if (!confirm("¿Eliminar?")) return; await supabase.from("seating_contenedores").delete().eq("id", id); onUpdate(); };
  const addMusician = async (containerId, musicianId) => { if (readOnly) return; const container = containers.find((c) => c.id === containerId); await supabase.from("seating_contenedores_items").insert({ id_contenedor: containerId, id_musico: musicianId, orden: container.items.length }); onUpdate(); };
  const removeMusician = async (itemId) => { if (readOnly) return; await supabase.from("seating_contenedores_items").delete().eq("id", itemId); onUpdate(); };
  const moveItem = async (itemId, direction, currentOrder, containerId) => { if (readOnly) return; const container = containers.find((c) => c.id === containerId); const swapItem = container.items.find((i) => i.orden === currentOrder + direction); if (swapItem) { await supabase.from("seating_contenedores_items").update({ orden: currentOrder }).eq("id", swapItem.id); await supabase.from("seating_contenedores_items").update({ orden: currentOrder + direction }).eq("id", itemId); onUpdate(); } };

  // --- MODAL IMPORTAR DISPOSICIÓN ---
// --- MODAL IMPORTAR DISPOSICIÓN ---
const ImportSeatingModal = ({ isOpen, onClose, onConfirm, currentProgramId, supabase }) => {
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [loading, setLoading] = useState(false);
  const [replace, setReplace] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchPrograms = async () => {
        setLoading(true);
        // Usamos tus columnas reales
        const { data, error } = await supabase
          .from("programas")
          .select("id, nombre_gira, nomenclador, mes_letra, fecha_desde")
          .neq("id", currentProgramId)
          .order("fecha_desde", { ascending: true })
          .limit(20);

        if (error) {
          console.error("Error cargando giras:", error);
        } else {
          setPrograms(data || []);
        }
        setLoading(false);
      };
      fetchPrograms();
    }
  }, [isOpen, currentProgramId, supabase]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedProgram) return;
    onConfirm(selectedProgram, replace);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <IconDownload className="text-indigo-600" /> Importar Disposición
        </h3>
        
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Desde la Gira:</label>
            {loading ? (
              <div className="text-xs text-slate-400">Cargando giras...</div>
            ) : (
              <select 
                className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500 bg-white"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
              >
                <option value="" disabled>Seleccionar Gira anterior...</option>
                {programs.map(p => (
                  /* AQUÍ ESTÁ EL CAMBIO DE FORMATO */
                  <option key={p.id} value={p.id}>
                    {p.mes_letra} | {p.nomenclador}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 border p-2 rounded bg-slate-50 border-slate-200">
            <input 
              type="checkbox" 
              id="chkReplace" 
              checked={replace} 
              onChange={(e) => setReplace(e.target.checked)} 
              className="accent-indigo-600"
            />
            <label htmlFor="chkReplace" className="text-xs text-slate-700 select-none cursor-pointer">
              Eliminar grupos actuales antes de importar
            </label>
          </div>

          <p className="text-[10px] text-slate-400 italic">
            * Solo se importarán los músicos que estén convocados en la gira actual.
          </p>

          <div className="flex justify-end gap-2 mt-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
            <button 
              onClick={handleConfirm} 
              disabled={!selectedProgram}
              className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm disabled:opacity-50"
            >
              Importar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
  // --- LÓGICA DE IMPORTACIÓN ---
  const handleImportSeating = async (sourceProgramId, replaceCurrent) => {
    setIsImporting(true);
    setShowImportModal(false);
    try {
      // 1. (Opcional) Borrar configuración actual
      if (replaceCurrent && containers.length > 0) {
        await supabase.from("seating_contenedores").delete().eq("id_programa", programId);
      }

      // 2. Traer contenedores de la gira origen
      const { data: sourceContainers } = await supabase
        .from("seating_contenedores")
        .select("*")
        .eq("id_programa", sourceProgramId)
        .order("orden");
      
      if (!sourceContainers || sourceContainers.length === 0) {
        alert("La gira seleccionada no tiene configuración de cuerdas.");
        setIsImporting(false);
        return;
      }

      // 3. Traer los items (músicos) de esos contenedores
      const sourceContainerIds = sourceContainers.map(c => c.id);
      const { data: sourceItems } = await supabase
        .from("seating_contenedores_items")
        .select("*")
        .in("id_contenedor", sourceContainerIds)
        .order("orden");

      // 4. Preparar IDs válidos del Roster Actual (Conjunto para búsqueda rápida)
      //    Importante: Solo nos importan los músicos que ESTÁN en el roster de ESTA gira (props.roster)
      const validMusicianIds = new Set(roster.map(m => m.id));

      // 5. Crear los nuevos contenedores e items
      let currentOrderIndex = replaceCurrent ? 0 : containers.length;

      for (const srcCont of sourceContainers) {
        // Crear contenedor
        const { data: newCont, error: contError } = await supabase
          .from("seating_contenedores")
          .insert({
            id_programa: programId,
            nombre: srcCont.nombre,
            id_instrumento: srcCont.id_instrumento || "00",
            orden: currentOrderIndex
          })
          .select()
          .single();

        if (contError) continue;
        currentOrderIndex++;

        // Filtrar items de este contenedor fuente
        const itemsInThisContainer = sourceItems.filter(i => i.id_contenedor === srcCont.id);
        
        // Mapear a nuevos inserts SOLO si el músico existe en el roster actual
        const itemsToInsert = itemsInThisContainer
          .filter(item => validMusicianIds.has(item.id_musico))
          .map((item, idx) => ({
            id_contenedor: newCont.id,
            id_musico: item.id_musico,
            orden: idx // Reordenamos secuencialmente para evitar huecos de los que faltan
          }));

        if (itemsToInsert.length > 0) {
          await supabase.from("seating_contenedores_items").insert(itemsToInsert);
        }
      }

      onUpdate(); // Recargar interfaz
    } catch (error) {
      console.error("Error importando:", error);
      alert("Hubo un error al importar la configuración.");
    } finally {
      setIsImporting(false);
    }
  };

  // --- LOGICA DRAG AND DROP ---
  const handleDragStart = (e, musicianId) => { if (readOnly) return; e.dataTransfer.setData("musicianId", musicianId); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e, containerId) => { if (readOnly) return; e.preventDefault(); setDragOverContainerId(containerId); };
  const handleDragLeave = (e) => { setDragOverContainerId(null); };
  const handleDrop = async (e, containerId) => { if (readOnly) return; e.preventDefault(); setDragOverContainerId(null); const musicianId = e.dataTransfer.getData("musicianId"); if (musicianId) { await addMusician(containerId, musicianId); } };

  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 animate-in fade-in shrink-0">
      <ImportSeatingModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)} 
        onConfirm={handleImportSeating} 
        currentProgramId={programId}
        supabase={supabase}
      />
     

      <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm"><IconLayers size={16} /> Disposición de Cuerdas</h3>
          {!readOnly && (
            <div className="flex items-center gap-2">
                 <span className="text-[10px] text-slate-400 italic mr-2 hidden sm:inline">Arrastra los músicos a los grupos</span>
                 
                 {/* BOTÓN IMPORTAR */}
                 <button 
                   onClick={() => setShowImportModal(true)} 
                   disabled={isImporting}
                   className="bg-white border border-slate-300 text-slate-600 px-2 py-1 rounded text-[10px] font-bold hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-1 transition-colors disabled:opacity-50"
                   title="Importar de otra gira"
                 >
                   {isImporting ? <IconLoader className="animate-spin" size={12}/> : <IconDownload size={12} />} 
                   Importar
                 </button>

                 <button onClick={createContainer} className="bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-indigo-700 flex items-center gap-1"><IconPlus size={12} /> Nuevo Grupo</button>
            </div>
          )}
      </div>
      <div className="grid grid-cols-12 gap-4 h-[350px]">
        
        {/* COLUMNA: LISTA DE MÚSICOS SIN ASIGNAR */}
        {!readOnly && (
            <div className="col-span-3 bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden shadow-sm">
                <div className="p-2 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                    <span>Sin Asignar ({available.length})</span>
                </div>
                <div className="overflow-y-auto p-1 space-y-0.5 flex-1 select-none">
                    {available.map((m) => (
                        <div 
                            key={m.id} 
                            draggable={!readOnly}
                            onDragStart={(e) => handleDragStart(e, m.id)}
                            className="relative text-[10px] p-1.5 bg-slate-50 border border-slate-100 rounded flex justify-between items-center group hover:border-indigo-300 hover:bg-indigo-50 cursor-grab active:cursor-grabbing transition-all"
                        >
                            <div className="truncate pointer-events-none">
                                <span className="font-bold text-slate-700">{m.apellido}</span> <span className="text-slate-500">{m.nombre.charAt(0)}.</span>
                                <span className="text-[8px] text-indigo-400 ml-1">({m.instrumentos?.instrumento})</span>
                            </div>
                            
                            {/* MENU FLOTANTE */}
                            <div className="hidden group-hover:flex flex-col gap-0.5 absolute right-2 top-0 mt-1 bg-white shadow-xl p-1 rounded border border-slate-200 z-50 animate-in fade-in zoom-in-95">
                                {containers.map((c) => (
                                    <button key={c.id} onClick={() => addMusician(c.id, m.id)} className="text-[9px] text-left hover:bg-indigo-50 px-2 py-0.5 rounded whitespace-nowrap text-indigo-700 font-medium">
                                        → {c.nombre}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    {available.length === 0 && <div className="text-center text-[10px] text-slate-300 italic mt-4">Todos asignados</div>}
                </div>
            </div>
        )}

        {/* COLUMNA: CONTENEDORES (GRUPOS) */}
        <div className={`${readOnly ? "col-span-12" : "col-span-9"} grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto content-start pr-1`}>
            {containers.map((c) => (
                <div 
                    key={c.id} 
                    onDragOver={(e) => handleDragOver(e, c.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, c.id)}
                    className={`bg-white border rounded-lg shadow-sm flex flex-col h-fit transition-all duration-200 ${
                        dragOverContainerId === c.id ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50 scale-[1.02]" : "border-indigo-100"
                    }`}
                >
                    <div className="p-1.5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30 rounded-t-lg">
                        <span className="font-bold text-[10px] text-indigo-900 truncate uppercase tracking-wider" title={c.nombre}>{c.nombre}</span>
                        {!readOnly && <button onClick={() => deleteContainer(c.id)} className="text-slate-300 hover:text-red-500"><IconTrash size={10} /></button>}
                    </div>
                    <div className="p-1 space-y-0.5 min-h-[40px]">
                        {c.items.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-1.5 p-1 bg-white border border-slate-100 rounded text-[10px] group hover:shadow-sm">
                                {!readOnly && (
                                    <div className="flex flex-col gap-0.5 opacity-20 group-hover:opacity-100 transition-opacity">
                                        <button disabled={idx === 0} onClick={() => moveItem(item.id, -1, item.orden, c.id)} className="hover:text-indigo-600 disabled:opacity-0"><IconArrowUp size={8} /></button>
                                        <button disabled={idx === c.items.length - 1} onClick={() => moveItem(item.id, 1, item.orden, c.id)} className="hover:text-indigo-600 disabled:opacity-0"><IconArrowDown size={8} /></button>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <span className="truncate block font-medium text-slate-700">{item.integrantes?.nombre} {item.integrantes?.apellido}</span>
                                </div>
                                {!readOnly && <button onClick={() => removeMusician(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><IconX size={10} /></button>}
                            </div>
                        ))}
                        {!readOnly && c.items.length === 0 && (
                            <div className="text-center text-[9px] text-indigo-200 py-4 border-2 border-dashed border-indigo-50 rounded italic pointer-events-none">
                                {dragOverContainerId === c.id ? "Soltar aquí" : "Arrastra músicos aquí"}
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {containers.length === 0 && <div className="col-span-full text-center py-10 text-slate-400 italic text-xs">
              No hay grupos de cuerdas. <br/> Crea uno nuevo o importa de una gira anterior.
            </div>}
        </div>
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
    const [showHistory, setShowHistory] = useState(false);
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

  // CALCULO DE CONTEOS DE ASIGNACIONES
  const particellaCounts = useMemo(() => {
    const counts = {};
    Object.values(assignments).forEach(partId => {
      if (partId) counts[partId] = (counts[partId] || 0) + 1;
    });
    return counts;
  }, [assignments]);

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
      {/* --- AGREGA ESTO AQUÍ PARA QUE FUNCIONE EL REPORTE --- */}
      <SeatingHistoryModal 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
        roster={filteredRoster} 
        supabase={supabase} 
      />
      {/* ----------------------------------------------------- */}
      {/* HEADER PRINCIPAL */}
      <div className="px-4 py-2 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><IconUsers className="text-indigo-600" /> Seating & Particellas</h2>
        <div className="flex gap-2">
         <button 
            onClick={() => setShowHistory(!showHistory)} 
            className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
          >
            <IconHistory size={16} /> Reporte Histórico
          </button>
          <button onClick={() => setShowConfig(!showConfig)} className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors ${showConfig ? "bg-indigo-600 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`}><IconSettings size={16} /> {isEditor ? "Configurar Cuerdas" : "Ver Grupos Cuerdas"}</button><button onClick={onBack} className="text-sm font-medium text-slate-500 hover:text-indigo-600 ml-4">← Volver</button></div>
      </div>

      {/* ÁREA DE CONTENIDO */}
      <div className="flex-1 overflow-hidden p-4 flex flex-col">
        {showConfig && <GlobalStringsManager programId={program.id} roster={filteredRoster} containers={containers} onUpdate={fetchContainers} supabase={supabase} readOnly={!isEditor} />}
        
        {/* TABLA PRINCIPAL */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-auto max-h-full">
            <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
              <thead className="bg-slate-800 text-white font-bold sticky top-0 z-30 shadow-md">
                <tr>
                  <th className="p-2 w-64 sticky left-0 bg-slate-800 z-40 border-r border-slate-600 pl-4">Contenedor / Músico</th>
                  {obras.map((obra) => {
                    const obraParts = particellas.filter(p => p.id_obra === obra.obra_id);
                    const unassignedParts = obraParts.filter(p => !particellaCounts[p.id]);
                    const hasUnassigned = unassignedParts.length > 0;

                    return (
                        <th key={obra.id} className="p-1 min-w-[140px] border-l border-slate-600 align-bottom relative group">
                            <div className="flex flex-col gap-0.5 items-center w-full pb-1">
                                <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                                    <span className="text-[9px] uppercase tracking-wide">{obra.composer}</span>
                                    {obra.link && <a href={`https://drive.google.com/drive/folders/${obra.link}`} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:text-white" title="Abrir en Drive"><IconExternalLink size={10} /></a>}
                                </div>
                                <div className="text-[10px] font-bold text-white leading-tight text-center px-1 mb-1 flex items-center justify-center gap-1">
                                    {obra.shortTitle}
                                    {hasUnassigned && (
                                        <div className="relative group/icon">
                                            <IconAlertCircle size={12} className="text-amber-400 cursor-help" />
                                            {/* LISTA FLOTANTE HOVER */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-40 bg-white text-slate-700 shadow-xl rounded border border-slate-200 p-2 z-50 hidden group-hover/icon:block animate-in fade-in zoom-in-95 pointer-events-none">
                                                <div className="text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100 mb-1 pb-1">Sin Asignar ({unassignedParts.length})</div>
                                                <ul className="space-y-0.5">
                                                    {unassignedParts.map(p => (
                                                        <li key={p.id} className="text-[9px] font-medium truncate">• {p.nombre_archivo}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {containers.length > 0 && (
                  <>
                    <tr className="bg-indigo-50/50"><td colSpan={obras.length + 1} className="p-1 px-4 text-[10px] font-bold text-indigo-800 uppercase tracking-wider border-b border-indigo-100">Sección de Cuerdas</td></tr>
                    {containers.map((c) => (
                      <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="p-2 sticky left-0 bg-white group-hover:bg-indigo-50/30 border-r border-slate-200 z-20 pl-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
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
                                preferredInstrumentId={c.id_instrumento} 
                                counts={particellaCounts}
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
                        <td className="p-2 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-20 pl-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
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
                                preferredInstrumentId={musician.id_instr}
                                counts={particellaCounts} 
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
  );
}