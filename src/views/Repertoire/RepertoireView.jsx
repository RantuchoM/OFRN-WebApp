import React, { useState, useEffect } from "react";
import {
  IconFolderMusic, IconPlus, IconSearch, IconEdit, IconTrash, 
  IconLink, IconLoader, IconChevronDown, IconFilter, IconUsers, IconTag, IconDrive, IconAlertCircle,
  IconMusic, IconClock, IconHistory, IconX, IconCalendar
} from "../../components/ui/Icons";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import WorkForm from "./WorkForm";
import ComposersManager from "./ComposersManager";
import TagsManager from "./TagsManager";

// --- RENDERER DE TEXTO RICO MEJORADO ---
const RichTextPreview = ({ content, className = "" }) => {
    if (!content) return null;
    return (
        <div 
            className={`whitespace-pre-wrap [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:pl-1 ${className}`} 
            dangerouslySetInnerHTML={{ __html: content }} 
        />
    );
};

// --- MODAL HISTORIAL CORREGIDO ---
const HistoryModal = ({ work, onClose, supabase }) => {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const fetchHistory = async () => {
            if(!work?.id) return;
            setLoading(true);
            try {
                // CORRECCIÓN: Filtramos a través de 'repertorio_obras' usando !inner para hacer el JOIN
                const { data, error } = await supabase
                    .from("programas_repertorios")
                    .select(`
                        id_programa, 
                        programas (id, nombre_gira, fecha_desde, mes_letra, nomenclador),
                        repertorio_obras!inner (id_obra)
                    `)
                    .eq("repertorio_obras.id_obra", work.id)
                    .order("id_programa", { ascending: false });

                if(error) throw error;
                setHistory(data || []);
            } catch (err) {
                console.error("Error history:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [work, supabase]);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><IconHistory className="text-indigo-600"/> Historial</h3>
                        <div className="text-xs text-slate-500 line-clamp-1"><RichTextPreview content={work.titulo}/></div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded"><IconX size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                    {loading ? <div className="text-center py-8 text-indigo-500"><IconLoader className="animate-spin inline"/></div> : history.length === 0 ? <div className="text-center py-8 text-slate-400 italic text-sm">Sin historial registrado.</div> : (
                        <div className="space-y-3">
                            {history.map((item, idx) => {
                                const prog = item.programas;
                                if(!prog) return null;
                                return (
                                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                                        <div>
                                            <div className="text-[10px] font-bold text-indigo-700 uppercase mb-0.5">{prog.mes_letra} | {prog.nomenclador}</div>
                                            <div className="text-sm font-bold text-slate-800">{prog.nombre_gira}</div>
                                        </div>
                                        {prog.fecha_desde && <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded flex items-center gap-1"><IconCalendar size={12}/> {format(new Date(prog.fecha_desde), "MMM yyyy", { locale: es })}</div>}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function RepertoireView({ supabase, catalogoInstrumentos }) {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados de Modales
  const [showComposersManager, setShowComposersManager] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [historyWork, setHistoryWork] = useState(null);

  // Filtros
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [filters, setFilters] = useState({ titulo: "", compositor: "", arreglador: "", pais: "", tags: "", anio_min: "", anio_max: "", duracion_min: "", duracion_max: "" });
  const [sortConfig, setSortConfig] = useState({ key: "titulo", direction: "asc" });

  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => { fetchWorks(); }, []);

  const fetchWorks = async () => {
    setLoading(true);
    let query = supabase.from("obras").select(`*, obras_compositores (rol, compositores (apellido, nombre, paises (nombre))), obras_palabras_clave (palabras_clave (tag))`).order("titulo");
    const { data, error } = await query;

    if (error) setError(error.message);
    else {
      const processed = data.map((w) => {
        const listComposers = w.obras_compositores?.filter((oc) => oc.rol === "compositor" || !oc.rol);
        const listArrangers = w.obras_compositores?.filter((oc) => oc.rol === "arreglador");
        return {
          ...w,
          compositor_full: listComposers?.map((oc) => `${oc.compositores?.apellido}, ${oc.compositores?.nombre}`).join(" / ") || "",
          arreglador_full: listArrangers?.map((oc) => `${oc.compositores?.apellido}, ${oc.compositores?.nombre}`).join(" / ") || "",
          pais_nombre: listComposers?.map((oc) => oc.compositores?.paises?.nombre).filter(Boolean).join(" / ") || "",
          tags_display: w.obras_palabras_clave?.map((opc) => opc.palabras_clave?.tag).filter(Boolean).join(", ") || "",
        };
      });
      setWorks(processed);
    }
    setLoading(false);
  };

  const handleSort = (key) => { let direction = "asc"; if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc"; setSortConfig({ key, direction }); };
  const SortIcon = ({ column }) => { if (sortConfig.key !== column) return <IconChevronDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-50 transition-opacity ml-1"/>; return <IconChevronDown size={14} className={`text-indigo-600 transition-transform ml-1 ${sortConfig.direction === "desc" ? "rotate-180" : ""}`}/>; };
  
  const processedWorks = works.filter((work) => {
      if (showPendingOnly && work.estado === 'Oficial') return false; 
      if (filters.titulo && !work.titulo?.toLowerCase().includes(filters.titulo.toLowerCase())) return false;
      if (filters.compositor && !work.compositor_full?.toLowerCase().includes(filters.compositor.toLowerCase())) return false;
      if (filters.arreglador && !work.arreglador_full?.toLowerCase().includes(filters.arreglador.toLowerCase())) return false;
      return true;
  }).sort((a, b) => {
      let valA = a[sortConfig.key]; let valB = b[sortConfig.key];
      if (typeof valA === "string") valA = valA.toLowerCase(); if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA == null) valA = ""; if (valB == null) valB = "";
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
  });

  const handleSave = async (savedId = null, shouldClose = true) => { 
    if(shouldClose) setLoading(true); 
    try { 
        await fetchWorks(); 
        if (shouldClose) { setIsAdding(false); setEditingId(null); setFormData({}); }
        return savedId; 
    } catch (err) { alert("Error: " + err.message); return null; } 
    finally { setLoading(false); } 
  };
  
  const handleDelete = async (id) => { 
      if (!confirm("¿Eliminar obra?")) return; 
      setLoading(true); 
      await supabase.from("obras").delete().eq("id", id); 
      await fetchWorks(); 
      setLoading(false); 
  };
  
  const startEdit = (work) => { 
      setEditingId(work.id); 
      const { compositor_full, arreglador_full, pais_nombre, tags_display, obras_compositores, obras_palabras_clave, instrumentacion, ...rawData } = work; 
      setFormData(rawData); 
      setIsAdding(false); 
  };
  
  const formatDuration = (secs) => { 
      if (!secs && secs !== 0) return "-"; 
      const m = Math.floor(secs / 60); 
      const s = secs % 60; 
      return `${m}:${s.toString().padStart(2, "0")}`; 
  };

  return (
    <div className="space-y-6 h-full flex flex-col overflow-hidden animate-in fade-in">
      {/* HEADER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><IconFolderMusic className="text-indigo-600" /> Archivo de Obras</h2>
            <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{processedWorks.length} resultados</div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowPendingOnly(!showPendingOnly)} className={`px-3 py-1.5 rounded border text-xs font-bold flex items-center gap-2 transition-colors ${showPendingOnly ? 'bg-amber-100 border-amber-300 text-amber-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                <IconAlertCircle size={14} className={showPendingOnly ? "text-amber-600" : "text-slate-400"}/> 
                {showPendingOnly ? "Viendo Pendientes" : "Solo Pendientes"}
            </button>
            <button onClick={() => setShowComposersManager(true)} className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 flex items-center gap-2"><IconUsers size={14}/> Compositores</button>
            <button onClick={() => setShowTagsManager(true)} className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 flex items-center gap-2"><IconTag size={14}/> Palabras Clave</button>
        </div>
      </div>

      {error && (<div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>)}

      {showComposersManager && <ComposersManager supabase={supabase} onClose={() => { setShowComposersManager(false); fetchWorks(); }} />}
      {showTagsManager && <TagsManager supabase={supabase} onClose={() => { setShowTagsManager(false); fetchWorks(); }} />}
      {historyWork && <HistoryModal work={historyWork} onClose={() => setHistoryWork(null)} supabase={supabase} />}

      <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm relative">
        {/* FORMULARIO SUPERPUESTO */}
        {isAdding || editingId ? (
          <div className="absolute inset-0 z-20 bg-white p-4 overflow-y-auto">
            <WorkForm
              supabase={supabase}
              formData={formData}
              setFormData={setFormData}
              onSave={handleSave} 
              onCancel={() => { setIsAdding(false); setEditingId(null); setFormData({}); }}
              isNew={isAdding}
              catalogoInstrumentos={catalogoInstrumentos}
            />
          </div>
        ) : (
          <>
            {/* BARRA DE FILTROS */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1"><IconFilter size={12} /> Filtros de Búsqueda</div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <div className="min-w-[160px] flex-1"><input type="text" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500" placeholder="Título..." value={filters.titulo} onChange={(e) => setFilters({ ...filters, titulo: e.target.value })}/></div>
                <div className="w-[140px]"><input type="text" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500" placeholder="Compositor..." value={filters.compositor} onChange={(e) => setFilters({ ...filters, compositor: e.target.value })}/></div>
                <div className="w-[120px]"><input type="text" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500" placeholder="Arreglador..." value={filters.arreglador} onChange={(e) => setFilters({ ...filters, arreglador: e.target.value })}/></div>
                <div className="w-[100px]"><input type="text" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500" placeholder="País..." value={filters.pais} onChange={(e) => setFilters({ ...filters, pais: e.target.value })}/></div>
                <button onClick={() => { setIsAdding(true); setFormData({}); }} className="ml-auto bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 h-[30px] whitespace-nowrap"><IconPlus size={14} /> Nuevo</button>
              </div>
            </div>

            {/* TABLA PRINCIPAL */}
            <div className="flex-1 overflow-y-auto bg-white">
              {/* HEADERS FIJOS - ANCHOS RECALIBRADOS (Total 100%) */}
              <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 flex text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {/* Compositor 18% */}
                  <div onClick={() => handleSort("compositor_full")} className="p-3 w-[18%] cursor-pointer hover:bg-slate-100 flex items-center truncate border-r border-slate-100">Compositor <SortIcon column="compositor_full"/></div>
                  
                  {/* Obra 27% */}
                  <div onClick={() => handleSort("titulo")} className="p-3 w-[27%] cursor-pointer hover:bg-slate-100 flex items-center truncate border-r border-slate-100">Obra <SortIcon column="titulo"/></div>
                  
                  {/* Arreglador 12% */}
                  <div onClick={() => handleSort("arreglador_full")} className="p-3 w-[12%] cursor-pointer hover:bg-slate-100 flex items-center truncate border-r border-slate-100">Arreglador <SortIcon column="arreglador_full"/></div>
                  
                  {/* Orgánico 10% - NUEVA COLUMNA */}
                  <div className="p-3 w-[10%] text-center border-r border-slate-100">Orgánico</div> 
                  
                  {/* Duración 8% */}
                  <div className="p-3 w-[8%] text-center border-r border-slate-100">Dur.</div>
                  
                  {/* Estado 10% */}
                  <div className="p-3 w-[10%] text-center border-r border-slate-100">Estado</div>
                  
                  {/* Acciones 15% */}
                  <div className="p-3 w-[15%] text-right pr-6">Acciones</div>
              </div>

              {/* FILAS */}
              <div className="divide-y divide-slate-100">
                  {processedWorks.map((work) => (
                    <div key={work.id} className="flex hover:bg-indigo-50/30 transition-colors group text-sm items-stretch min-h-[50px]">
                        
                        {/* 1. Compositor */}
                        <div className="p-3 w-[18%] text-slate-600 font-medium truncate flex items-center border-r border-slate-50" title={work.compositor_full}>
                            {work.compositor_full || <span className="text-slate-300 italic">Sin datos</span>}
                        </div>

                        {/* 2. Obra (Rich Text) */}
                        <div className="p-3 w-[27%] border-r border-slate-50 flex flex-col justify-center min-w-0">
                            <div className="text-slate-800 text-base leading-tight">
                                <RichTextPreview content={work.titulo} />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                {work.link_audio && <a href={work.link_audio} target="_blank" className="text-green-600 bg-green-50 p-0.5 rounded hover:scale-110" title="Audio"><IconMusic size={12}/></a>}
                                {work.link_partitura && <a href={work.link_partitura} target="_blank" className="text-blue-600 bg-blue-50 p-0.5 rounded hover:scale-110" title="Partitura"><IconLink size={12}/></a>}
                                {work.observaciones && <div className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded truncate max-w-[150px]"><RichTextPreview content={work.observaciones} className="inline"/></div>}
                            </div>
                        </div>

                        {/* 3. Arreglador */}
                        <div className="p-3 w-[12%] text-slate-500 text-xs truncate flex items-center border-r border-slate-50" title={work.arreglador_full}>
                            {work.arreglador_full || "-"}
                        </div>

                        {/* 4. Orgánico (Instrumentación) */}
                        <div className="p-3 w-[10%] text-slate-500 text-xs flex items-center justify-center border-r border-slate-50">
                            <span className="bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded font-mono truncate w-full text-center" title={work.instrumentacion}>
                                {work.instrumentacion || "-"}
                            </span>
                        </div>

                        {/* 5. Duración */}
                        <div className="p-3 w-[8%] text-slate-500 text-xs font-mono text-center flex items-center justify-center border-r border-slate-50">
                            {formatDuration(work.duracion_segundos)}
                        </div>

                        {/* 6. Estado */}
                        <div className="p-3 w-[10%] flex items-center justify-center border-r border-slate-50">
                            {work.estado === 'Solicitud' ? (
                                <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-200 shadow-sm">Pendiente</span>
                            ) : (
                                <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full border border-slate-200">Oficial</span>
                            )}
                        </div>

                        {/* 7. Acciones */}
                        <div className="p-3 w-[15%] flex items-center justify-end gap-1 pr-4">
                            <button onClick={() => setHistoryWork(work)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded transition-colors opacity-60 group-hover:opacity-100" title="Historial"><IconHistory size={16}/></button>
                            {work.link_drive && <a href={work.link_drive} target="_blank" className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors opacity-60 group-hover:opacity-100" title="Drive"><IconDrive size={16}/></a>}
                            <button onClick={() => startEdit(work)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors opacity-0 group-hover:opacity-100"><IconEdit size={16}/></button>
                            <button onClick={() => handleDelete(work.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"><IconTrash size={16}/></button>
                        </div>
                    </div>
                  ))}
                  {processedWorks.length === 0 && !loading && (
                      <div className="p-12 text-center text-slate-400 italic">No se encontraron obras.</div>
                  )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}