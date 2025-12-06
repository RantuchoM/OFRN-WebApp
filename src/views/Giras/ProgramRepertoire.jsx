import React, { useState, useEffect } from 'react';
import { 
    IconMusic, IconPlus, IconTrash, IconSearch, IconLoader, 
    IconCheck, IconX, IconClock, IconAlertCircle, IconLink,
    IconChevronDown
} from '../../components/ui/Icons';
import { formatSecondsToTime, inputToSeconds } from '../../utils/time';

export default function ProgramRepertoire({ supabase, program, onBack }) {
    const [repertorios, setRepertorios] = useState([]);
    const [musicians, setMusicians] = useState([]); 
    const [loading, setLoading] = useState(false);
    
    // --- ESTADOS DEL MODAL ---
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeRepertorioId, setActiveRepertorioId] = useState(null);
    const [worksLibrary, setWorksLibrary] = useState([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [filters, setFilters] = useState({ titulo: '', compositor: '', tags: '' });
    
    // --- ESTADO SOLICITUD ---
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [requestData, setRequestData] = useState({ titulo: '', compositor: '', duracion: '', link: '' });

    useEffect(() => {
        fetchFullRepertoire();
        fetchMusicians();
    }, [program.id]);

    useEffect(() => {
        if (isAddModalOpen && worksLibrary.length === 0) fetchLibrary();
    }, [isAddModalOpen]);

    // --- CARGAS DE DATOS ---
    const fetchMusicians = async () => {
        const { data } = await supabase.from('integrantes').select('id, nombre, apellido, instrumentos(instrumento)').order('apellido');
        if (data) setMusicians(data);
    };

    const fetchFullRepertoire = async () => {
        setLoading(true);
        const { data: reps, error } = await supabase
            .from('programas_repertorios')
            .select(`
                *,
                repertorio_obras (
                    id, orden, notas_especificas, id_solista,
                    obras (
                        id, titulo, duracion_segundos, estado, link_youtube, 
                        anio_composicion, instrumentacion,
                        compositores (apellido, nombre),
                        obras_compositores (rol, compositores(apellido, nombre))
                    ),
                    integrantes (id, apellido, nombre) 
                )
            `)
            .eq('id_programa', program.id)
            .order('orden', { ascending: true });

        if (error) alert("Error: " + error.message);
        else {
            const sorted = reps.map(r => ({
                ...r,
                repertorio_obras: r.repertorio_obras?.sort((a, b) => a.orden - b.orden) || []
            }));
            setRepertorios(sorted);
        }
        setLoading(false);
    };

    const fetchLibrary = async () => {
        setLoadingLibrary(true);
        const { data, error } = await supabase
            .from('obras')
            .select(`*, obras_compositores (compositores (apellido, nombre)), obras_palabras_clave (palabras_clave (tag))`)
            .order('titulo');
        
        if (!error && data) {
            const processed = data.map(w => ({
                ...w,
                compositor_full: w.obras_compositores?.map(oc => `${oc.compositores?.apellido}, ${oc.compositores?.nombre}`).join(" / ") || "",
                tags_display: w.obras_palabras_clave?.map(opc => opc.palabras_clave?.tag).join(", ") || ""
            }));
            setWorksLibrary(processed);
        }
        setLoadingLibrary(false);
    };

    const filteredLibrary = worksLibrary.filter(work => {
        if (filters.titulo && !work.titulo?.toLowerCase().includes(filters.titulo.toLowerCase())) return false;
        if (filters.compositor && !work.compositor_full?.toLowerCase().includes(filters.compositor.toLowerCase())) return false;
        return true;
    });

    // --- ACCIONES DE REORDENAMIENTO (SUBIR / BAJAR) ---
    const moveWork = async (repertorioId, workId, direction) => {
        const repIndex = repertorios.findIndex(r => r.id === repertorioId);
        if (repIndex === -1) return;
        
        const obras = [...repertorios[repIndex].repertorio_obras];
        const workIndex = obras.findIndex(o => o.id === workId);
        if (workIndex === -1) return;

        // Validar límites
        if (direction === -1 && workIndex === 0) return; 
        if (direction === 1 && workIndex === obras.length - 1) return;

        // Intercambiar elementos
        const itemA = obras[workIndex];
        const itemB = obras[workIndex + direction];
        
        // Intercambiar orden visualmente
        const tempOrder = itemA.orden;
        itemA.orden = itemB.orden;
        itemB.orden = tempOrder;

        // Reordenar array en memoria
        obras[workIndex] = itemB;
        obras[workIndex + direction] = itemA;
        
        // Actualizar estado local (UI instantánea)
        const newRepertorios = [...repertorios];
        newRepertorios[repIndex].repertorio_obras = obras;
        setRepertorios(newRepertorios);

        // Guardar en DB
        await supabase.from('repertorio_obras').upsert([
            { id: itemA.id, orden: itemA.orden },
            { id: itemB.id, orden: itemB.orden }
        ]);
    };

    // --- OTRAS ACCIONES ---
    const addRepertoireBlock = async () => {
        const nombre = prompt("Nombre del bloque:", "Nuevo Bloque");
        if (!nombre) return;
        const nextOrder = repertorios.length + 1;
        await supabase.from('programas_repertorios').insert([{ id_programa: program.id, nombre, orden: nextOrder }]);
        fetchFullRepertoire();
    };

    const deleteRepertoireBlock = async (id) => {
        if (!confirm("¿Eliminar bloque?")) return;
        await supabase.from('programas_repertorios').delete().eq('id', id);
        fetchFullRepertoire();
    };

    const addWorkToBlock = async (workId) => {
        if (!activeRepertorioId) return;
        const currentRep = repertorios.find(r => r.id === activeRepertorioId);
        const maxOrder = currentRep?.repertorio_obras?.reduce((max, o) => o.orden > max ? o.orden : max, 0) || 0;
        
        const { error } = await supabase.from('repertorio_obras').insert([{
            id_repertorio: activeRepertorioId,
            id_obra: workId,
            orden: maxOrder + 1
        }]);

        if (error) alert(error.message);
        else {
            setIsAddModalOpen(false);
            setFilters({ titulo: '', compositor: '', tags: '' });
            fetchFullRepertoire();
        }
    };

    const createRequest = async () => {
        if (!requestData.titulo) return alert("Título requerido");
        const { data: { user } } = await supabase.auth.getUser();
        const payload = {
            titulo: requestData.titulo,
            duracion_segundos: inputToSeconds(requestData.duracion),
            estado: 'Solicitud',
            solicitado_por: user?.id,
            datos_provisorios: { compositor_texto: requestData.compositor, link_referencia: requestData.link }
        };
        const { data, error } = await supabase.from('obras').insert([payload]).select().single();
        if (error) return alert(error.message);
        await addWorkToBlock(data.id);
    };

    const updateWorkDetail = async (itemId, field, value) => {
        // Actualizar estado local primero para evitar saltos
        const newRepertorios = repertorios.map(rep => ({
            ...rep,
            repertorio_obras: rep.repertorio_obras.map(obra => 
                obra.id === itemId ? { ...obra, [field]: value } : obra
            )
        }));
        setRepertorios(newRepertorios);

        // Guardar silenciosamente
        await supabase.from('repertorio_obras').update({ [field]: value }).eq('id', itemId);
    };

    const removeWork = async (itemId) => {
        if(!confirm("¿Quitar obra?")) return;
        await supabase.from('repertorio_obras').delete().eq('id', itemId);
        fetchFullRepertoire();
    };

    const calculateTotalDuration = (works) => {
        const total = works.reduce((acc, item) => acc + (item.obras?.duracion_segundos || 0), 0);
        return formatSecondsToTime(total);
    };

    // Helper para mostrar compositores reales
    const getComposers = (obra) => {
        if (obra.estado === 'Solicitud') {
            return obra.datos_provisorios?.compositor_texto || 'S/D';
        }
        
        // Priorizar la relación N:N
        if (obra.obras_compositores && obra.obras_compositores.length > 0) {
            const list = obra.obras_compositores.filter(oc => oc.rol === 'compositor' || !oc.rol);
            if (list.length > 0) {
                return list.map(oc => `${oc.compositores?.apellido}, ${oc.compositores?.nombre || ''}`).join(" / ");
            }
        }
        
        // Fallback al campo simple si existe
        if (obra.compositores) {
            return `${obra.compositores.apellido}, ${obra.compositores.nombre || ''}`;
        }
        
        return 'Anónimo';
    };

    const getArranger = (obra) => {
        if (obra.obras_compositores) {
            const arr = obra.obras_compositores.find(oc => oc.rol === 'arreglador');
            if (arr) return `${arr.compositores.apellido}`;
        }
        return '-';
    };

    return (
        <div className="flex flex-col h-full bg-slate-100 animate-in fade-in">
            {/* Header */}
            <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 text-sm font-bold">← Volver</button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{program.nombre_gira}</h2>
                        <span className="text-xs bg-slate-100 px-2 border rounded">{program.tipo}</span>
                    </div>
                </div>
                <button onClick={addRepertoireBlock} className="bg-indigo-600 text-white px-3 py-2 rounded text-sm font-bold shadow hover:bg-indigo-700 flex items-center gap-2">
                    <IconPlus size={16}/> Bloque
                </button>
            </div>

            {/* Contenido Principal */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8">
                {repertorios.map((rep) => (
                    <div key={rep.id} className="bg-white shadow-sm border border-slate-300">
                        {/* Cabecera del Bloque */}
                        <div className="bg-indigo-100/50 p-2 border-b border-slate-300 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <IconMusic size={16} className="text-indigo-600"/> {rep.nombre}
                            </h3>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2 border border-slate-300">
                                    Total: {calculateTotalDuration(rep.repertorio_obras)}
                                </span>
                                <button onClick={() => deleteRepertoireBlock(rep.id)} className="text-slate-400 hover:text-red-600"><IconTrash size={14}/></button>
                            </div>
                        </div>

                        {/* TABLA DE OBRAS */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse table-fixed">
                                <thead className="bg-blue-200 text-slate-700 border-b-2 border-slate-400 font-bold uppercase tracking-tight">
                                    <tr>
                                        <th className="p-2 border-r border-slate-300 w-12 text-center">Ord</th>
                                        <th className="p-2 border-r border-slate-300 w-48">Compositor</th>
                                        <th className="p-2 border-r border-slate-300 w-64">Obra</th>
                                        <th className="p-2 border-r border-slate-300 w-24 text-center">Instr.</th>
                                        <th className="p-2 border-r border-slate-300 w-16 text-center">Año</th>
                                        <th className="p-2 border-r border-slate-300 w-32">Arreglador</th>
                                        <th className="p-2 border-r border-slate-300 w-16 text-center">Dur.</th>
                                        <th className="p-2 border-r border-slate-300 w-40">Solista</th>
                                        <th className="p-2 border-r border-slate-300">Comentarios</th>
                                        <th className="p-2 border-r border-slate-300 w-10 text-center">YT</th>
                                        <th className="p-2 w-8 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-300">
                                    {rep.repertorio_obras.map((item, idx) => {
                                        const obra = item.obras;
                                        const isSolicitud = obra.estado === 'Solicitud';
                                        
                                        return (
                                            <tr key={item.id} className="hover:bg-yellow-50 transition-colors group text-slate-700">
                                                {/* Orden */}
                                                <td className="p-1 border-r border-slate-200 text-center bg-slate-50">
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <button onClick={() => moveWork(rep.id, item.id, -1)} className="text-slate-300 hover:text-indigo-600 disabled:opacity-0" disabled={idx === 0}>
                                                            <IconChevronDown size={12} className="rotate-180"/>
                                                        </button>
                                                        <span className="font-bold text-[10px] text-slate-500 leading-none">{idx + 1}</span>
                                                        <button onClick={() => moveWork(rep.id, item.id, 1)} className="text-slate-300 hover:text-indigo-600 disabled:opacity-0" disabled={idx === rep.repertorio_obras.length - 1}>
                                                            <IconChevronDown size={12}/>
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Compositor */}
                                                <td className="p-2 border-r border-slate-200 truncate" title={getComposers(obra)}>
                                                    {getComposers(obra)}
                                                </td>

                                                {/* Obra */}
                                                <td className="p-2 border-r border-slate-200 font-semibold truncate bg-slate-50/30" title={obra.titulo}>
                                                    {obra.titulo}
                                                    {isSolicitud && <span className="ml-2 text-[9px] bg-amber-200 text-amber-800 px-1 rounded">PEND</span>}
                                                </td>

                                                {/* Instrumentación */}
                                                <td className="p-2 border-r border-slate-200 text-center truncate" title={obra.instrumentacion}>
                                                    {obra.instrumentacion || '-'}
                                                </td>

                                                {/* Año */}
                                                <td className="p-2 border-r border-slate-200 text-center">
                                                    {obra.anio_composicion || '-'}
                                                </td>

                                                {/* Arreglador */}
                                                <td className="p-2 border-r border-slate-200 truncate">
                                                    {getArranger(obra)}
                                                </td>

                                                {/* Duración */}
                                                <td className="p-2 border-r border-slate-200 text-center font-mono">
                                                    {formatSecondsToTime(obra.duracion_segundos)}
                                                </td>

                                                {/* Solista */}
                                                <td className="p-0 border-r border-slate-200">
                                                    <select 
                                                        className="w-full h-full p-2 bg-transparent outline-none focus:bg-indigo-50 cursor-pointer text-xs appearance-none border-none"
                                                        value={item.id_solista || ""}
                                                        onChange={(e) => updateWorkDetail(item.id, 'id_solista', e.target.value || null)}
                                                    >
                                                        <option value="" className="text-slate-300">-</option>
                                                        {musicians.map(m => (
                                                            <option key={m.id} value={m.id}>
                                                                {m.apellido}, {m.nombre}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>

                                                {/* Comentarios */}
                                                <td className="p-0 border-r border-slate-200">
                                                    <input 
                                                        type="text" 
                                                        className="w-full h-full p-2 bg-transparent outline-none focus:bg-indigo-50 placeholder:text-slate-300 text-xs border-none"
                                                        placeholder="..."
                                                        value={item.notas_especificas || ""}
                                                        onChange={(e) => updateWorkDetail(item.id, 'notas_especificas', e.target.value)}
                                                    />
                                                </td>

                                                {/* Link */}
                                                <td className="p-2 border-r border-slate-200 text-center">
                                                    {obra.link_youtube ? (
                                                        <a href={obra.link_youtube} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex justify-center">
                                                            <IconLink size={14}/>
                                                        </a>
                                                    ) : null}
                                                </td>

                                                {/* Eliminar */}
                                                <td className="p-2 text-center">
                                                    <button onClick={() => removeWork(item.id)} className="text-slate-300 hover:text-red-600 transition-colors">
                                                        <IconX size={14}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Botón Agregar al final */}
                        <div className="bg-slate-50 border-t border-slate-300 p-1">
                            <button 
                                onClick={() => { setActiveRepertorioId(rep.id); setIsAddModalOpen(true); }}
                                className="w-full py-1 text-slate-500 hover:text-indigo-700 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                            >
                                <IconPlus size={12}/> Agregar Obra
                            </button>
                        </div>
                    </div>
                ))}

                {repertorios.length === 0 && !loading && (
                    <div className="p-10 text-center border-2 border-dashed border-slate-300 rounded-xl bg-white">
                        <p className="text-slate-400">Sin bloques. Crea uno arriba.</p>
                    </div>
                )}
            </div>

            {/* --- MODAL BUSQUEDA --- */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2"><IconSearch size={18}/> Buscar Obra</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><IconX size={24}/></button>
                        </div>

                        {!showRequestForm ? (
                            <>
                                <div className="p-3 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white shrink-0">
                                    <div className="relative">
                                        <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                                        <input type="text" autoFocus placeholder="Título..." className="w-full pl-8 p-2 border rounded text-sm bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500" value={filters.titulo} onChange={e => setFilters({...filters, titulo: e.target.value})}/>
                                    </div>
                                    <input type="text" placeholder="Compositor..." className="w-full p-2 border rounded text-sm bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500" value={filters.compositor} onChange={e => setFilters({...filters, compositor: e.target.value})}/>
                                    <button onClick={() => setShowRequestForm(true)} className="bg-indigo-600 text-white px-3 rounded text-sm font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"><IconPlus size={14}/> Crear Solicitud</button>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {loadingLibrary ? <div className="p-8 text-center text-indigo-600"><IconLoader className="animate-spin inline"/></div> : (
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-xs text-slate-500 uppercase sticky top-0 font-bold">
                                                <tr><th className="p-3">Obra</th><th className="p-3">Compositor</th><th className="p-3 text-center">Duración</th><th className="p-3 text-right"></th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredLibrary.map(work => (
                                                    <tr key={work.id} className="hover:bg-indigo-50 transition-colors group">
                                                        <td className="p-3 font-medium text-slate-700">{work.titulo}</td>
                                                        <td className="p-3 text-slate-500">{work.compositor_full}</td>
                                                        <td className="p-3 text-center font-mono text-xs text-slate-400">{formatSecondsToTime(work.duracion_segundos)}</td>
                                                        <td className="p-3 text-right"><button onClick={() => addWorkToBlock(work.id)} className="bg-white border border-indigo-200 text-indigo-600 px-3 py-1 rounded text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm">Seleccionar</button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
                                <div className="max-w-lg mx-auto bg-white p-6 rounded-xl border shadow-sm">
                                    <h4 className="font-bold text-lg text-indigo-900 mb-4 flex items-center gap-2"><IconAlertCircle className="text-amber-500"/> Solicitud de Obra</h4>
                                    <div className="space-y-4">
                                        <input type="text" className="w-full border p-2 rounded" value={requestData.titulo} onChange={e => setRequestData({...requestData, titulo: e.target.value})} placeholder="Título Obra"/>
                                        <input type="text" className="w-full border p-2 rounded" value={requestData.compositor} onChange={e => setRequestData({...requestData, compositor: e.target.value})} placeholder="Compositor"/>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" className="w-full border p-2 rounded" value={requestData.duracion} onChange={e => setRequestData({...requestData, duracion: e.target.value})} placeholder="Duración (mm:ss)"/>
                                            <input type="text" className="w-full border p-2 rounded" value={requestData.link} onChange={e => setRequestData({...requestData, link: e.target.value})} placeholder="Link (Opcional)"/>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button onClick={() => setShowRequestForm(false)} className="flex-1 py-2 border rounded">Cancelar</button>
                                        <button onClick={createRequest} className="flex-1 py-2 bg-indigo-600 text-white rounded font-bold">Crear</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}