import React, { useState, useEffect } from 'react';
import { IconPlus, IconAlertCircle, IconMap, IconEdit, IconTrash, IconUsers, IconLoader, IconMapPin, IconCalendar, IconMusic } from '../../components/ui/Icons';
import GiraForm from './GiraForm';
import GiraRoster from './GiraRoster';
import GiraAgenda from './GiraAgenda';
import ProgramRepertoire from './ProgramRepertoire'; // NUEVO COMPONENTE

export default function GirasView({ supabase }) {
    const [giras, setGiras] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // --- ESTADOS DE NAVEGACIÓN INTERNA ---
    const [selectedGira, setSelectedGira] = useState(null); // Para ver el Roster (Integrantes)
    const [selectedGiraAgenda, setSelectedGiraAgenda] = useState(null); // Para ver la Agenda (Eventos)
    const [selectedGiraRepertoire, setSelectedGiraRepertoire] = useState(null); // NUEVO: Para ver Repertorio
    
    // --- ESTADOS DE EDICIÓN/CREACIÓN ---
    const [editingId, setEditingId] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    
    // --- ESTADOS DEL FORMULARIO ---
    const [formData, setFormData] = useState({ nombre_gira: '', fecha_desde: '', fecha_hasta: '' });
    const [selectedLocations, setSelectedLocations] = useState(new Set());
    const [locationsList, setLocationsList] = useState([]);

    useEffect(() => { 
        fetchGiras(); 
        fetchLocationsList();
    }, []);

    const fetchGiras = async () => {
        setLoading(true);
        // Nota: Seguimos usando la tabla 'giras' en el backend aunque visualmente sean 'Programas'
        // Si renombraste la tabla en SQL, cambia 'giras' por 'programas' aquí abajo.
        const { data, error } = await supabase
            .from('programas') 
            .select('*, giras_localidades(localidades(localidad))') 
            .order('fecha_desde', { ascending: false });
        
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

    const handleSave = async () => {
        if (!formData.nombre_gira) return alert("El nombre es obligatorio");
        setLoading(true);
        try {
            let targetId = editingId;
            if (editingId) {
                const { error } = await supabase.from('giras').update(formData).eq('id', editingId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('giras').insert([formData]).select();
                if (error) throw error;
                if (data && data.length > 0) targetId = data[0].id;
            }
            if (targetId) await updateGiraLocations(targetId, selectedLocations);
            await fetchGiras();
            closeForm();
        } catch (err) { alert("Error: " + err.message); } finally { setLoading(false); }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if(!confirm("¿Eliminar este programa?")) return;
        setLoading(true);
        const { error } = await supabase.from('giras').delete().eq('id', id);
        if(error) alert("Error: " + error.message); else await fetchGiras();
        setLoading(false);
    };

    const startEdit = async (e, gira) => {
        e.stopPropagation();
        setEditingId(gira.id);
        setFormData({ nombre_gira: gira.nombre_gira, fecha_desde: gira.fecha_desde || '', fecha_hasta: gira.fecha_hasta || '' });
        const { data } = await supabase.from('giras_localidades').select('id_localidad').eq('id_gira', gira.id);
        if (data) setSelectedLocations(new Set(data.map(d => d.id_localidad)));
        else setSelectedLocations(new Set());
        setIsAdding(false);
    };

    const closeForm = () => { 
        setIsAdding(false); setEditingId(null); 
        setFormData({ nombre_gira: '', fecha_desde: '', fecha_hasta: '' }); 
        setSelectedLocations(new Set());
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const [year, month, day] = dateString.split('-'); 
        return `${day}/${month}/${year}`;
    };

    // --- RENDERIZADO CONDICIONAL ---

    if (selectedGiraAgenda) {
        return <GiraAgenda supabase={supabase} gira={selectedGiraAgenda} onBack={() => setSelectedGiraAgenda(null)} />;
    }

    if (selectedGiraRepertoire) {
        return <ProgramRepertoire supabase={supabase} program={selectedGiraRepertoire} onBack={() => setSelectedGiraRepertoire(null)} />;
    }

    if (selectedGira) {
        return <GiraRoster supabase={supabase} gira={selectedGira} onBack={() => setSelectedGira(null)} />;
    }

    return (
        <div className="space-y-6 h-full flex flex-col overflow-hidden animate-in fade-in">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><IconMap className="text-indigo-600"/> Gestión de Programas</h2>
                <div className="text-xs text-slate-500">{loading ? "Cargando..." : `${giras.length} programas`}</div>
            </div>

            {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3"><IconAlertCircle className="shrink-0 mt-0.5" /><div><p className="font-bold text-sm">Error</p><p className="text-sm opacity-90">{error}</p></div></div>)}

            <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-2">
                {!isAdding && !editingId && (
                    <button onClick={() => { setIsAdding(true); setFormData({ nombre_gira: '', fecha_desde: '', fecha_hasta: '' }); setSelectedLocations(new Set()); }} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-medium">
                        <IconPlus size={20} /> Crear Nuevo Programa
                    </button>
                )}

                {(isAdding || editingId) && (
                    <GiraForm 
                        formData={formData} 
                        setFormData={setFormData} 
                        onCancel={closeForm} 
                        onSave={handleSave} 
                        loading={loading} 
                        isNew={isAdding}
                        locationsList={locationsList}
                        selectedLocations={selectedLocations}
                        setSelectedLocations={setSelectedLocations}
                    />
                )}

                {giras.map((gira) => {
                    if (editingId === gira.id) return null; 
                    const locs = gira.giras_localidades?.map(gl => gl.localidades?.localidad).filter(Boolean) || [];

                    return (
                        <div key={gira.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex justify-between items-center group">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{gira.nombre_gira}</h3>
                                    {gira.tipo && <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-bold uppercase">{gira.tipo}</span>}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                                    <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex items-center gap-1">📅 {formatDate(gira.fecha_desde)} - {formatDate(gira.fecha_hasta)}</span>
                                    {locs.length > 0 && (<div className="flex items-center gap-1 text-slate-600"><IconMapPin size={14} className="text-indigo-500"/><span className="text-xs font-medium">{locs.join(", ")}</span></div>)}
                                </div>
                            </div>
                            
                            <div className="flex gap-2 items-center">
                                {/* Botón REPERTORIO */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setSelectedGiraRepertoire(gira); }} 
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex flex-col items-center group/btn relative" 
                                    title="Repertorio"
                                >
                                    <IconMusic size={20}/>
                                    <span className="text-[9px] font-bold mt-0.5">Obras</span>
                                </button>

                                {/* Botón AGENDA */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setSelectedGiraAgenda(gira); }} 
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex flex-col items-center group/btn" 
                                    title="Agenda"
                                >
                                    <IconCalendar size={20}/>
                                    <span className="text-[9px] font-bold mt-0.5">Agenda</span>
                                </button>

                                {/* Botón INTEGRANTES */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setSelectedGira(gira); }} 
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex flex-col items-center group/btn" 
                                    title="Integrantes"
                                >
                                    <IconUsers size={20}/>
                                    <span className="text-[9px] font-bold mt-0.5">Personal</span>
                                </button>

                                <div className="h-8 w-px bg-slate-200 mx-1"></div>

                                <button onClick={(e) => startEdit(e, gira)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Editar"><IconEdit size={20}/></button>
                                <button onClick={(e) => handleDelete(e, gira.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar"><IconTrash size={20}/></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}