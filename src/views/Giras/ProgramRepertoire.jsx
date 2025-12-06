import React, { useState, useEffect } from 'react';
import { 
    IconMusic, IconPlus, IconTrash, IconSearch, IconLoader, 
    IconCheck, IconX, IconClock, IconAlertCircle, IconLink,
    IconChevronDown, IconRefresh
} from '../../components/ui/Icons';
import { formatSecondsToTime, inputToSeconds } from '../../utils/time';

// Icono Drive
const IconDrive = ({ className }) => (
    <svg className={className} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
        <path d="m6.6 66.85 25.3-43.8 25.3 43.8z" fill="#0066da"/>
        <path d="m43.65 23.05-25.3 43.8h25.3z" fill="#00ac47"/>
        <path d="m73.55 66.85-12.65-21.9-25.3 21.9z" fill="#ea4335"/>
        <path d="m43.65 23.05h33.65l-12.65 21.9-25.3-21.9z" fill="#00832d"/>
        <path d="m6.6 66.85h33.65l12.65-21.9-33.65-21.9z" fill="#2684fc"/>
        <path d="m77.3 23.05-25.3 43.8h25.3z" fill="#ffba00"/>
        <path d="m6.6 66.85 25.3-43.8 25.3 43.8z" opacity=".25"/>
        <path d="m6.6 66.85h66.95l-12.65-21.9h-41.65z" fill="#0066da"/>
        <path d="m43.65 23.05 20.9 36.2h-16.7l-29.5-51.1z" fill="#00ac47"/>
        <path d="m73.55 66.85-20.9-36.2h-16.7l12.3 21.9z" fill="#ea4335"/>
        <path d="m43.65 23.05h33.65l-12.65 21.9h-21z" fill="#00832d"/>
        <path d="m6.6 66.85h33.65l12.65-21.9-21-36.2z" fill="#2684fc"/>
        <path d="m77.3 23.05-25.3 43.8h25.3z" fill="#ffba00"/>
    </svg>
);

export default function ProgramRepertoire({ supabase, program, onBack }) {
    const [repertorios, setRepertorios] = useState([]);
    const [musicians, setMusicians] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [syncingDrive, setSyncingDrive] = useState(false);
    
    // --- ESTADOS DEL MODAL ---
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeRepertorioId, setActiveRepertorioId] = useState(null);
    const [worksLibrary, setWorksLibrary] = useState([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [filters, setFilters] = useState({ titulo: '', compositor: '', tags: '' });
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
                    id, orden, notas_especificas, id_solista, google_drive_shortcut_id,
                    obras (
                        id, titulo, duracion_segundos, estado, link_drive, link_youtube, 
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
        const { data, error } = await supabase.from('obras').select(`*, obras_compositores (compositores (apellido, nombre)), obras_palabras_clave (palabras_clave (tag))`).order('titulo');
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

    // --- SINCRONIZACIÓN DRIVE AUTOMÁTICA ---
    const autoSyncDrive = async (customAction = 'sync_program', customPayload = {}) => {
        setSyncingDrive(true);
        try {
            await supabase.functions.invoke('manage-drive', {
                body: { action: customAction, programId: program.id, ...customPayload }
            });
            // Recargar datos para obtener los IDs nuevos de los shortcuts si fue un sync
            if (customAction === 'sync_program') fetchFullRepertoire(); 
        } catch (err) {
            console.error("Error auto-syncing Drive:", err);
        } finally {
            setSyncingDrive(false);
        }
    };

    // --- ACCIONES MODIFICADORAS ---

    const moveWork = async (repertorioId, workId, direction) => {
        const repIndex = repertorios.findIndex(r => r.id === repertorioId);
        if (repIndex === -1) return;
        const obras = [...repertorios[repIndex].repertorio_obras];
        const workIndex = obras.findIndex(o => o.id === workId);
        if (workIndex === -1) return;
        if (direction === -1 && workIndex === 0) return; 
        if (direction === 1 && workIndex === obras.length - 1) return;

        const itemA = obras[workIndex];
        const itemB = obras[workIndex + direction];
        
        // Intercambio visual
        const tempOrder = itemA.orden;
        itemA.orden = itemB.orden;
        itemB.orden = tempOrder;
        obras[workIndex] = itemB;
        obras[workIndex + direction] = itemA;
        
        const newRepertorios = [...repertorios];
        newRepertorios[repIndex].repertorio_obras = obras;
        setRepertorios(newRepertorios);

        // --- FIX: USAR UPDATE EN VEZ DE UPSERT PARA EVITAR ERROR 400 ---
        await supabase.from('repertorio_obras').update({ orden: itemA.orden }).eq('id', itemA.id);
        await supabase.from('repertorio_obras').update({ orden: itemB.orden }).eq('id', itemB.id);

        autoSyncDrive(); // Reordenar en Drive (renombrar prefijos 01, 02)
    };

    const deleteRepertoireBlock = async (id, driveFolderId) => {
        if (!confirm("¿Eliminar bloque? Se borrarán los accesos directos asociados.")) return;
        
        // Borrar primero en DB
        const { error } = await supabase.from('programas_repertorios').delete().eq('id', id);
        
        if (!error) {
            await fetchFullRepertoire();
            // Disparamos Sync. Como el bloque ya no está en DB, el Sync NO lo procesará.
            // PERO: Si tenía carpeta en Drive, quedará huérfana. 
            // Para ser limpios, deberíamos borrarla manualmente si tenemos el ID.
            // Por ahora, el Sync se encargará de ordenar lo que queda.
            
            // TODO: Podríamos implementar un 'delete_folder' en la edge function si tenemos el ID.
            // Para simplificar, hacemos sync normal para reacomodar el resto.
            autoSyncDrive(); 
        }
    };

    const addWorkToBlock = async (workId) => {
        if (!activeRepertorioId) return;
        const currentRep = repertorios.find(r => r.id === activeRepertorioId);
        const maxOrder = currentRep?.repertorio_obras?.reduce((max, o) => o.orden > max ? o.orden : max, 0) || 0;
        
        await supabase.from('repertorio_obras').insert([{ id_repertorio: activeRepertorioId, id_obra: workId, orden: maxOrder + 1 }]);
        
        setIsAddModalOpen(false);
        setFilters({ titulo: '', compositor: '', tags: '' });
        await fetchFullRepertoire();
        autoSyncDrive(); // Crear shortcut
    };

    const removeWork = async (itemId) => {
        if(!confirm("¿Quitar obra?")) return;
        
        // Esperamos a que se borre en DB
        await supabase.from('repertorio_obras').delete().eq('id', itemId);
        
        // Actualizamos estado local
        await fetchFullRepertoire();
        
        // Disparamos Sync para que detecte la ausencia y borre el shortcut
        autoSyncDrive(); 
    };

    const addRepertoireBlock = async () => {
        const nombre = prompt("Nombre del bloque:", "Nuevo Bloque");
        if (!nombre) return;
        const nextOrder = repertorios.length + 1;
        await supabase.from('programas_repertorios').insert([{ id_programa: program.id, nombre, orden: nextOrder }]);
        fetchFullRepertoire();
    };

    const updateWorkDetail = async (itemId, field, value) => {
        const newRepertorios = repertorios.map(rep => ({
            ...rep,
            repertorio_obras: rep.repertorio_obras.map(obra => obra.id === itemId ? { ...obra, [field]: value } : obra)
        }));
        setRepertorios(newRepertorios);
        await supabase.from('repertorio_obras').update({ [field]: value }).eq('id', itemId);
    };

    const createRequest = async () => {
        if (!requestData.titulo) return alert("Título requerido");
        const { data: { user } } = await supabase.auth.getUser();
        const payload = {
            titulo: requestData.titulo,
            duracion_segundos: inputToSeconds(requestData.duracion),
            estado: 'Solicitud',
            solicitado_por: user?.id,
            link_drive: requestData.link, 
            datos_provisorios: { compositor_texto: requestData.compositor }
        };
        const { data, error } = await supabase.from('obras').insert([payload]).select().single();
        if (error) return alert(error.message);
        await addWorkToBlock(data.id);
    };

    // Helpers
    const calculateTotalDuration = (works) => formatSecondsToTime(works.reduce((acc, item) => acc + (item.obras?.duracion_segundos || 0), 0));
    
    const getComposers = (obra) => {
        if (obra.estado === 'Solicitud') return obra.datos_provisorios?.compositor_texto || 'S/D';
        if (obra.obras_compositores?.length > 0) {
            const list = obra.obras_compositores.filter(oc => oc.rol === 'compositor' || !oc.rol);
            if (list.length > 0) return list.map(oc => `${oc.compositores?.apellido}, ${oc.compositores?.nombre || ''}`).join(" / ");
        }
        return obra.compositores ? `${obra.compositores.apellido}, ${obra.compositores.nombre || ''}` : 'Anónimo';
    };

    const getArranger = (obra) => {
        const arr = obra.obras_compositores?.find(oc => oc.rol === 'arreglador');
        return arr ? `${arr.compositores.apellido}` : '-';
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
                <div className="flex gap-2 items-center">
                    {syncingDrive && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100 animate-pulse">
                            <IconLoader size={12} className="animate-spin"/> Sync Drive...
                        </div>
                    )}
                    <button onClick={addRepertoireBlock} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                        <IconPlus size={16}/> Bloque
                    </button>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8">
                {repertorios.map((rep) => (
                    <div key={rep.id} className="bg-white shadow-sm border border-slate-300">
                        {/* Cabecera Bloque */}
                        <div className="bg-indigo-100/50 p-2 border-b border-slate-300 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <IconMusic size={16} className="text-indigo-600"/> {rep.nombre}
                            </h3>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2 border border-slate-300">Total: {calculateTotalDuration(rep.repertorio_obras)}</span>
                                <button onClick={() => deleteRepertoireBlock(rep.id, rep.google_drive_folder_id)} className="text-slate-400 hover:text-red-600"><IconTrash size={14}/></button>
                            </div>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse table-fixed">
                                <thead className="bg-blue-200 text-slate-700 border-b-2 border-slate-400 font-bold uppercase tracking-tight">
                                    <tr>
                                        <th className="p-2 border-r border-slate-300 w-12 text-center">Ord</th>
                                        <th className="p-2 border-r border-slate-300 w-8 text-center" title="Drive">GD</th>
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
                                    {rep.repertorio_obras.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-yellow-50 transition-colors group text-slate-700">
                                            <td className="p-1 border-r border-slate-200 text-center bg-slate-50">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <button onClick={() => moveWork(rep.id, item.id, -1)} className="text-slate-300 hover:text-indigo-600 disabled:opacity-0" disabled={idx === 0}><IconChevronDown size={12} className="rotate-180"/></button>
                                                    <span className="font-bold text-[10px] text-slate-500 leading-none">{idx + 1}</span>
                                                    <button onClick={() => moveWork(rep.id, item.id, 1)} className="text-slate-300 hover:text-indigo-600 disabled:opacity-0" disabled={idx === rep.repertorio_obras.length - 1}><IconChevronDown size={12}/></button>
                                                </div>
                                            </td>
                                            <td className="p-1 border-r border-slate-200 text-center">
                                                {item.google_drive_shortcut_id ? <IconDrive className="w-4 h-4 mx-auto"/> : (item.obras.link_drive ? <span className="w-2 h-2 bg-yellow-400 rounded-full mx-auto block" title="Pendiente Sync"/> : <span className="text-slate-200">-</span>)}
                                            </td>
                                            <td className="p-2 border-r border-slate-200 truncate" title={getComposers(item.obras)}>{getComposers(item.obras)}</td>
                                            <td className="p-2 border-r border-slate-200 font-semibold truncate bg-slate-50/30" title={item.obras.titulo}>
                                                {item.obras.titulo}
                                                {item.obras.estado === 'Solicitud' && <span className="ml-2 text-[9px] bg-amber-200 text-amber-800 px-1 rounded">PEND</span>}
                                            </td>
                                            <td className="p-2 border-r border-slate-200 text-center truncate">{item.obras.instrumentacion || '-'}</td>
                                            <td className="p-2 border-r border-slate-200 text-center">{item.obras.anio_composicion || '-'}</td>
                                            <td className="p-2 border-r border-slate-200 truncate">{getArranger(item.obras)}</td>
                                            <td className="p-2 border-r border-slate-200 text-center font-mono">{formatSecondsToTime(item.obras.duracion_segundos)}</td>
                                            <td className="p-0 border-r border-slate-200">
                                                <select className="w-full h-full p-2 bg-transparent outline-none focus:bg-indigo-50 cursor-pointer text-xs appearance-none border-none" value={item.id_solista || ""} onChange={(e) => updateWorkDetail(item.id, 'id_solista', e.target.value || null)}>
                                                    <option value="" className="text-slate-300">-</option>
                                                    {musicians.map(m => <option key={m.id} value={m.id}>{m.apellido}, {m.nombre}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-0 border-r border-slate-200">
                                                <input type="text" className="w-full h-full p-2 bg-transparent outline-none focus:bg-indigo-50 placeholder:text-slate-300 text-xs border-none" placeholder="..." value={item.notas_especificas || ""} onChange={(e) => updateWorkDetail(item.id, 'notas_especificas', e.target.value)}/>
                                            </td>
                                            <td className="p-2 border-r border-slate-200 text-center">
                                                {item.obras.link_youtube && <a href={item.obras.link_youtube} target="_blank" rel="noreferrer" className="text-red-500 hover:underline flex justify-center"><IconLink size={14}/></a>}
                                            </td>
                                            <td className="p-2 text-center">
                                                <button onClick={() => removeWork(item.id)} className="text-slate-300 hover:text-red-600 transition-colors"><IconX size={14}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-slate-50 border-t border-slate-300 p-1">
                            <button onClick={() => { setActiveRepertorioId(rep.id); setIsAddModalOpen(true); }} className="w-full py-1 text-slate-500 hover:text-indigo-700 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                                <IconPlus size={12}/> Agregar Obra
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- MODAL --- */}
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
                                            <input type="text" className="w-full border p-2 rounded" value={requestData.link} onChange={e => setRequestData({...requestData, link: e.target.value})} placeholder="Link Drive (Opcional)"/>
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