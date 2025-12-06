import React, { useState, useEffect } from 'react';
import { 
    IconPlus, IconAlertCircle, IconMap, IconEdit, IconTrash, 
    IconUsers, IconLoader, IconMapPin, IconCalendar, IconMusic, IconFilter, IconClock, IconDrive, IconHotel
} from '../../components/ui/Icons';
import GiraForm from './GiraForm';
import GiraRoster from './GiraRoster';
import GiraAgenda from './GiraAgenda';
import ProgramRepertoire from './ProgramRepertoire'; 
import ProgramHoteleria from './ProgramHoteleria'; // Importamos la nueva vista de Hotelería

export default function GirasView({ supabase }) {
    const [giras, setGiras] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [syncing, setSyncing] = useState(false);
    
    // --- FILTROS ---
    const [filterType, setFilterType] = useState('Todos');
    
    // Filtro de Fechas (Por defecto HOY para "desde")
    const today = new Date().toISOString().split('T')[0];
    const [filterDateStart, setFilterDateStart] = useState(today);
    const [filterDateEnd, setFilterDateEnd] = useState('');

    // --- ESTADOS DE NAVEGACIÓN ---
    const [selectedGira, setSelectedGira] = useState(null); 
    const [selectedGiraAgenda, setSelectedGiraAgenda] = useState(null);
    const [selectedGiraRepertoire, setSelectedGiraRepertoire] = useState(null);
    const [selectedGiraHotel, setSelectedGiraHotel] = useState(null); // Nuevo estado de navegación
    
    // --- ESTADOS DE EDICIÓN ---
    const [editingId, setEditingId] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    
    // --- FORMULARIO ---
    const [formData, setFormData] = useState({ nombre_gira: '', fecha_desde: '', fecha_hasta: '', tipo: 'Sinfónico', zona: '' });
    const [selectedLocations, setSelectedLocations] = useState(new Set());
    const [locationsList, setLocationsList] = useState([]);

    useEffect(() => { 
        fetchGiras(); 
        fetchLocationsList();
    }, []);

    const fetchGiras = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('programas') 
            .select(`
                *, 
                giras_localidades(localidades(localidad)),
                eventos (
                    id, fecha, hora_inicio, 
                    locaciones(nombre), 
                    tipos_evento(nombre)
                )
            `) 
            .order('fecha_desde', { ascending: true });
        
        if (error) setError(error.message); 
        else setGiras(data || []);
        setLoading(false);
    };

    const fetchLocationsList = async () => {
        const { data } = await supabase.from('localidades').select('id, localidad').order('localidad');
        if (data) setLocationsList(data);
    };

    const updateGiraLocations = async (giraId, locationIds) => {
        await supabase.from('giras_localidades').delete().eq('id_gira', giraId);
        if (locationIds.size > 0) {
            const inserts = Array.from(locationIds).map(locId => ({
                id_gira: giraId,
                id_localidad: parseInt(locId)
            }));
            await supabase.from('giras_localidades').insert(inserts);
        }
    };

    const triggerDriveSync = async (programId) => {
        setSyncing(true);
        try {
            await supabase.functions.invoke('manage-drive', {
                body: { action: 'sync_program', programId: programId }
            });
        } catch (err) {
            console.error("Error invocando función:", err);
        } finally {
            setSyncing(false);
        }
    };

    const handleSave = async () => {
        if (!formData.nombre_gira) return alert("El nombre es obligatorio");
        setLoading(true);
        try {
            let targetId = editingId;
            if (editingId) {
                const { error } = await supabase.from('programas').update(formData).eq('id', editingId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('programas').insert([formData]).select();
                if (error) throw error;
                if (data && data.length > 0) targetId = data[0].id;
            }
            
            if (targetId) {
                await updateGiraLocations(targetId, selectedLocations);
                triggerDriveSync(targetId);
            }

            await fetchGiras();
            closeForm();
        } catch (err) { 
            alert("Error: " + err.message); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleRefresh = async () => {
        await fetchGiras();
        closeForm();
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if(!confirm("¿Eliminar este programa?")) return;
        setLoading(true);
        
        await supabase.functions.invoke('manage-drive', {
            body: { action: 'delete_program', programId: id }
        });

        const { error } = await supabase.from('programas').delete().eq('id', id);
        if(error) alert("Error: " + error.message); else await fetchGiras();
        setLoading(false);
    };

    const startEdit = async (e, gira) => {
        e.stopPropagation();
        setEditingId(gira.id);
        setFormData({ 
            nombre_gira: gira.nombre_gira, 
            fecha_desde: gira.fecha_desde || '', 
            fecha_hasta: gira.fecha_hasta || '',
            tipo: gira.tipo || 'Sinfónico',
            zona: gira.zona || ''
        });
        
        const { data } = await supabase.from('giras_localidades').select('id_localidad').eq('id_gira', gira.id);
        if (data) setSelectedLocations(new Set(data.map(d => d.id_localidad)));
        else setSelectedLocations(new Set());
        
        setIsAdding(false);
    };

    const closeForm = () => { 
        setIsAdding(false); setEditingId(null); 
        setFormData({ nombre_gira: '', fecha_desde: '', fecha_hasta: '', tipo: 'Sinfónico', zona: '' }); 
        setSelectedLocations(new Set());
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const [year, month, day] = dateString.split('-'); 
        return `${day}/${month}/${year}`;
    };

    // LÓGICA DE NUMERACIÓN DINÁMICA
    const getProgramLabel = (currentGira) => {
        if (!currentGira.fecha_desde) return currentGira.tipo;
        const currentYear = currentGira.fecha_desde.split('-')[0];
        const sameTypePrograms = giras
            .filter(g => g.tipo === currentGira.tipo && g.fecha_desde && g.fecha_desde.startsWith(currentYear))
            .sort((a, b) => new Date(a.fecha_desde) - new Date(b.fecha_desde)); 
        const index = sameTypePrograms.findIndex(g => g.id === currentGira.id);
        if (index === -1) return currentGira.tipo;
        const number = (index + 1).toString().padStart(2, '0');
        return `${currentGira.tipo} ${number}`;
    };

    const getConcerts = (gira) => {
        if (!gira.eventos) return [];
        return gira.eventos
            .filter(e => e.tipos_evento?.nombre?.toLowerCase().includes('concierto'))
            .sort((a,b) => new Date(a.fecha + 'T' + a.hora_inicio) - new Date(b.fecha + 'T' + b.hora_inicio));
    };

    // LÓGICA DE FILTRADO
    const filteredGiras = giras.filter(g => {
        if (filterType !== 'Todos' && g.tipo !== filterType) return false;
        if (filterDateStart) {
            if (g.fecha_hasta < filterDateStart) return false;
        }
        if (filterDateEnd) {
            if (g.fecha_desde > filterDateEnd) return false;
        }
        return true;
    });

    // --- RENDERIZADO CONDICIONAL DE VISTAS SECUNDARIAS ---
    if (selectedGiraAgenda) return <GiraAgenda supabase={supabase} gira={selectedGiraAgenda} onBack={() => setSelectedGiraAgenda(null)} />;
    if (selectedGiraRepertoire) return <ProgramRepertoire supabase={supabase} program={selectedGiraRepertoire} onBack={() => setSelectedGiraRepertoire(null)} />;
    if (selectedGira) return <GiraRoster supabase={supabase} gira={selectedGira} onBack={() => setSelectedGira(null)} />;
    if (selectedGiraHotel) return <ProgramHoteleria supabase={supabase} program={selectedGiraHotel} onBack={() => setSelectedGiraHotel(null)} />; // Nueva vista de Hotelería

    return (
        <div className="space-y-6 h-full flex flex-col overflow-hidden animate-in fade-in">
            {/* Header con Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><IconMap className="text-indigo-600"/> Programas</h2>
                    {syncing && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center gap-1"><IconLoader className="animate-spin" size={12}/> Drive...</span>}
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    
                    {/* Filtro Fechas */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <IconCalendar size={14} className="text-slate-400"/>
                        <input type="date" className="bg-transparent text-xs text-slate-600 outline-none w-24" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} title="Desde"/>
                        <span className="text-slate-300">-</span>
                        <input type="date" className="bg-transparent text-xs text-slate-600 outline-none w-24" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} title="Hasta"/>
                        {(filterDateStart || filterDateEnd) && (
                            <button onClick={() => { setFilterDateStart(''); setFilterDateEnd(''); }} className="text-slate-400 hover:text-red-500 ml-1">
                                <IconTrash size={12}/>
                            </button>
                        )}
                    </div>

                    {/* Filtro Tipo */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <IconFilter size={14} className="text-slate-400"/>
                        <select className="bg-transparent text-sm text-slate-600 font-medium outline-none cursor-pointer" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                            <option value="Todos">Todos los tipos</option>
                            <option value="Sinfónico">Sinfónico</option>
                            <option value="Camerata Filarmónica">Camerata Filarmónica</option>
                            <option value="Ensamble">Ensamble</option>
                        </select>
                    </div>
                    
                    <div className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
                        {filteredGiras.length}
                    </div>
                </div>
            </div>

            {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3"><IconAlertCircle className="shrink-0 mt-0.5" /><div><p className="font-bold text-sm">Error</p><p className="text-sm opacity-90">{error}</p></div></div>)}

            <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-2">
                {!isAdding && !editingId && (
                    <button onClick={() => { setIsAdding(true); setFormData({ nombre_gira: '', fecha_desde: '', fecha_hasta: '', tipo: 'Sinfónico', zona: '' }); setSelectedLocations(new Set()); }} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-medium">
                        <IconPlus size={20} /> Crear Nuevo Programa
                    </button>
                )}

                {(isAdding || editingId) && (
                    <GiraForm 
                        supabase={supabase} 
                        giraId={editingId}  
                        formData={formData} 
                        setFormData={setFormData} 
                        onCancel={closeForm} 
                        onSave={handleSave} 
                        onRefresh={handleRefresh}
                        loading={loading} 
                        isNew={isAdding}
                        locationsList={locationsList}
                        selectedLocations={selectedLocations}
                        setSelectedLocations={setSelectedLocations}
                    />
                )}

                {filteredGiras.map((gira) => {
                    if (editingId === gira.id) return null; 
                    const locs = gira.giras_localidades?.map(gl => gl.localidades?.localidad).filter(Boolean) || [];
                    const programLabel = getProgramLabel(gira);
                    const concerts = getConcerts(gira);

                    return (
                        <div key={gira.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 cursor-pointer" onClick={() => setSelectedGiraRepertoire(gira)}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{gira.nombre_gira}</h3>
                                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-bold uppercase tracking-wide">{programLabel}</span>
                                        {gira.zona && <span className="text-[10px] text-slate-500 border border-slate-200 bg-slate-50 px-2 py-0.5 rounded uppercase">{gira.zona}</span>}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-3">
                                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex items-center gap-2">
                                            <IconCalendar size={14} className="text-slate-400"/> {formatDate(gira.fecha_desde)} - {formatDate(gira.fecha_hasta)}
                                        </span>
                                        {locs.length > 0 && (<div className="flex items-center gap-1 text-slate-600"><IconMapPin size={14} className="text-indigo-500"/><span className="text-xs font-medium">{locs.join(", ")}</span></div>)}
                                    </div>

                                    {/* LISTA DE CONCIERTOS */}
                                    {concerts.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {concerts.map(c => (
                                                <div key={c.id} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                                                    <IconMusic size={12} className="text-indigo-400"/>
                                                    <span className="font-bold">{formatDate(c.fecha)}</span>
                                                    <span className="text-slate-400">|</span>
                                                    <span>{c.hora_inicio?.slice(0,5)}</span>
                                                    <span className="text-slate-400">|</span>
                                                    <span className="truncate">{c.locaciones?.nombre || 'Sin lugar'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex gap-2 items-center ml-4">
                                    {gira.google_drive_folder_id && (
                                        <a 
                                            href={`https://drive.google.com/drive/folders/${gira.google_drive_folder_id}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex flex-col items-center group/btn"
                                            title="Abrir en Drive"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <IconDrive size={20} />
                                            <span className="text-[9px] font-bold mt-0.5">Drive</span>
                                        </a>
                                    )}
                                    
                                    {/* Botón Hotelería añadido aquí */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedGiraHotel(gira); }} 
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex flex-col items-center group/btn" 
                                        title="Hospedaje"
                                    >
                                        <IconHotel size={20}/>
                                        <span className="text-[9px] font-bold mt-0.5">Hotel</span>
                                    </button>

                                    <button onClick={(e) => { e.stopPropagation(); setSelectedGiraRepertoire(gira); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex flex-col items-center group/btn" title="Repertorio"><IconMusic size={20}/><span className="text-[9px] font-bold mt-0.5">Obras</span></button>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedGiraAgenda(gira); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex flex-col items-center group/btn" title="Agenda"><IconCalendar size={20}/><span className="text-[9px] font-bold mt-0.5">Agenda</span></button>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedGira(gira); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex flex-col items-center group/btn" title="Integrantes"><IconUsers size={20}/><span className="text-[9px] font-bold mt-0.5">Personal</span></button>
                                    
                                    <div className="h-8 w-px bg-slate-200 mx-1"></div>
                                    <button onClick={(e) => startEdit(e, gira)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Editar"><IconEdit size={20}/></button>
                                    <button onClick={(e) => handleDelete(e, gira.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar"><IconTrash size={20}/></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {!loading && filteredGiras.length === 0 && (
                    <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No hay programas que coincidan con los filtros.
                    </div>
                )}
            </div>
        </div>
    );
}