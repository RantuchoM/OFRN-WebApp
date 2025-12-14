import React, { useState, useEffect } from "react";
import {
  IconFolderMusic, IconPlus, IconSearch, IconEdit, IconTrash, 
  IconLink, IconLoader, IconChevronDown, IconFilter, IconUsers, IconTag, IconDrive, IconAlertCircle
} from "../../components/ui/Icons";
import WorkForm from "./WorkForm";
import ComposersManager from "./ComposersManager";
import TagsManager from "./TagsManager";

export default function RepertoireView({ supabase, catalogoInstrumentos }) {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados de Modales Gestores
  const [showComposersManager, setShowComposersManager] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);

  // Estados Filtro
  const [showPendingOnly, setShowPendingOnly] = useState(false); // <--- NUEVO FILTRO
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
      // --- FILTRO NUEVO ---
      if (showPendingOnly && work.estado === 'Oficial') return false; 
      
      if (filters.titulo && !work.titulo?.toLowerCase().includes(filters.titulo.toLowerCase())) return false;
      if (filters.compositor && !work.compositor_full?.toLowerCase().includes(filters.compositor.toLowerCase())) return false;
      // ... resto de filtros igual ...
      return true;
  }).sort((a, b) => {
      let valA = a[sortConfig.key]; let valB = b[sortConfig.key];
      if (typeof valA === "string") valA = valA.toLowerCase(); if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA == null) valA = ""; if (valB == null) valB = "";
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
  });

  // --- SAVE CORREGIDO: Acepta argumentos para no cerrar modal en autosave ---
  const handleSave = async (savedId = null, shouldClose = true) => { 
    // Si viene del WorkForm como autosave, usually envía (id, false)
    // Si viene del botón "Guardar" manual, envía (id, true) o nada.
    
    // NOTA: WorkForm llama a onSave(id, shouldClose). 
    // Si es edición automática, no queremos loader global invasivo.
    if(shouldClose) setLoading(true); 
    
    try { 
        // La lógica de guardado real ya la hace WorkForm internamente contra la DB.
        // Aquí principalmente refrescamos la lista para que se vea reflejado en la tabla de atrás.
        await fetchWorks(); 
        
        if (shouldClose) {
            setIsAdding(false); 
            setEditingId(null); 
            setFormData({}); 
        }
        return savedId; 
    } catch (err) { 
        alert("Error refrescando: " + err.message); 
        return null; 
    } finally { 
        setLoading(false); 
    } 
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
      // No hacemos scroll top forzoso si quieres mantener contexto, pero usualmente es bueno
  };
  
  const formatDuration = (secs) => { 
      if (!secs && secs !== 0) return "-"; 
      const m = Math.floor(secs / 60); 
      const s = secs % 60; 
      return `${m}:${s.toString().padStart(2, "0")}`; 
  };

  return (
    <div className="space-y-6 h-full flex flex-col overflow-hidden animate-in fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><IconFolderMusic className="text-indigo-600" /> Archivo de Obras</h2>
            <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{processedWorks.length} resultados</div>
        </div>
        
        <div className="flex gap-2">
            {/* BOTÓN SOLO PENDIENTES */}
            <button 
                onClick={() => setShowPendingOnly(!showPendingOnly)} 
                className={`px-3 py-1.5 rounded border text-xs font-bold flex items-center gap-2 transition-colors ${showPendingOnly ? 'bg-amber-100 border-amber-300 text-amber-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                title="Mostrar solo obras no oficiales"
            >
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

      <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm relative">
        {isAdding || editingId ? (
          <div className="absolute inset-0 z-20 bg-white p-4 overflow-y-auto">
            <WorkForm
              supabase={supabase}
              formData={formData}
              setFormData={setFormData}
              // Corrección: onSave pasa (id, true) cuando es guardado final manual, 
              // WorkForm internamente pasa (id, false) para autosave.
              onSave={handleSave} 
              onCancel={() => { setIsAdding(false); setEditingId(null); setFormData({}); }}
              isNew={isAdding}
              catalogoInstrumentos={catalogoInstrumentos}
            />
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1"><IconFilter size={12} /> Filtros de Búsqueda</div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                <div className="min-w-[160px] flex-1"><input type="text" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500" placeholder="Título..." value={filters.titulo} onChange={(e) => setFilters({ ...filters, titulo: e.target.value })}/></div>
                <div className="w-[140px]"><input type="text" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500" placeholder="Compositor..." value={filters.compositor} onChange={(e) => setFilters({ ...filters, compositor: e.target.value })}/></div>
                <div className="w-[120px]"><input type="text" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500" placeholder="Arreglador..." value={filters.arreglador} onChange={(e) => setFilters({ ...filters, arreglador: e.target.value })}/></div>
                <div className="w-[100px]"><input type="text" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500" placeholder="País..." value={filters.pais} onChange={(e) => setFilters({ ...filters, pais: e.target.value })}/></div>
                <div className="w-[120px]"><input type="text" className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500" placeholder="Tags..." value={filters.tags} onChange={(e) => setFilters({ ...filters, tags: e.target.value })}/></div>
                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1"><span className="text-[10px] text-slate-400 font-bold px-1">AÑO</span><input type="number" className="w-12 py-1.5 text-xs outline-none text-center" placeholder="Min" value={filters.anio_min} onChange={(e) => setFilters({ ...filters, anio_min: e.target.value })}/><span className="text-slate-300">-</span><input type="number" className="w-12 py-1.5 text-xs outline-none text-center" placeholder="Max" value={filters.anio_max} onChange={(e) => setFilters({ ...filters, anio_max: e.target.value })}/></div>
                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1"><span className="text-[10px] text-slate-400 font-bold px-1">DUR</span><input type="number" className="w-10 py-1.5 text-xs outline-none text-center" placeholder="0" value={filters.duracion_min} onChange={(e) => setFilters({ ...filters, duracion_min: e.target.value })}/><span className="text-slate-300">-</span><input type="number" className="w-10 py-1.5 text-xs outline-none text-center" placeholder="∞" value={filters.duracion_max} onChange={(e) => setFilters({ ...filters, duracion_max: e.target.value })}/></div>
                <button onClick={() => { setIsAdding(true); setFormData({}); }} className="ml-auto bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 h-[30px] whitespace-nowrap"><IconPlus size={14} /> Nuevo</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-white text-xs uppercase text-slate-500 font-bold sticky top-0 z-10 shadow-sm">
                  {/* ... Headers ... */}
                  <tr>
                    <th onClick={() => handleSort("titulo")} className="p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 select-none min-w-[200px]"><div className="flex items-center">Obra <SortIcon column="titulo" /></div></th>
                    <th onClick={() => handleSort("compositor_full")} className="p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 select-none min-w-[150px]"><div className="flex items-center">Compositor <SortIcon column="compositor_full" /></div></th>
                    <th className="p-3 border-b border-slate-100 w-24 text-center">Estado</th>
                    {/* ... Resto de columnas ... */}
                    <th onClick={() => handleSort("duracion_segundos")} className="p-3 border-b border-slate-100 w-24 cursor-pointer hover:bg-slate-50 select-none text-center"><div className="flex items-center gap-1">Duración <SortIcon column="duracion_segundos" /></div></th>
                    <th className="p-3 border-b border-slate-100 w-28 text-center text-xs">Orgánico</th>
                    <th className="p-3 border-b border-slate-100 text-center w-20">GD</th>
                    <th className="p-3 border-b border-slate-100 text-right w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-50">
                  {processedWorks.map((work) => (
                    <tr key={work.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-3 font-medium text-slate-800">{work.titulo}{work.observaciones && <div className="text-[10px] text-slate-400 truncate max-w-[200px] font-normal mt-0.5">{work.observaciones}</div>}</td>
                      <td className="p-3 text-slate-600">{work.compositor_full || "-"}</td>
                      <td className="p-3 text-center">
                          {work.estado === 'Solicitud' ? (
                              <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-200">Pendiente</span>
                          ) : (
                              <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full border border-slate-200">Oficial</span>
                          )}
                      </td>
                      {/* ... Resto de celdas ... */}
                      <td className="p-3 text-slate-500 text-center font-mono text-xs">{formatDuration(work.duracion_segundos)}</td>
                      <td className="p-3 text-slate-500 text-xs font-mono bg-slate-50/50 text-center rounded">{work.instrumentacion || "-"}</td>
                      <td className="p-3 text-center">{work.link_drive && <a href={work.link_drive} target="_blank" rel="noreferrer" className="inline-flex justify-center hover:scale-110 transition-transform p-1" title="Ver en Google Drive"><IconDrive className="w-5 h-5"/></a>}{!work.link_drive && <span className="text-slate-200 text-xs">-</span>}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(work)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><IconEdit size={16}/></button>
                          <button onClick={() => handleDelete(work.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><IconTrash size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {processedWorks.length === 0 && !loading && <tr><td colSpan="11" className="p-8 text-center text-slate-400 italic">No se encontraron obras.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}