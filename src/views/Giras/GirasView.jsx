import React, { useState, useEffect } from 'react';
import { IconPlus, IconAlertCircle, IconMap, IconEdit, IconTrash, IconUsers, IconLoader } from '../../components/ui/Icons';
import GiraForm from './GiraForm';
import GiraRoster from './GiraRoster'; // Importamos el nuevo componente

export default function GirasView({ supabase }) {
    const [giras, setGiras] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Estados de navegación interna
    const [selectedGira, setSelectedGira] = useState(null); // Si tiene valor, mostramos el Roster
    const [editingId, setEditingId] = useState(null); // Si tiene valor, mostramos el form de edición
    const [isAdding, setIsAdding] = useState(false); // Si es true, mostramos form de creación

    const [formData, setFormData] = useState({ nombre_gira: '', fecha_desde: '', fecha_hasta: '' });

    useEffect(() => { fetchGiras(); }, []);

    const fetchGiras = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('giras').select('*').order('fecha_desde', { ascending: false });
        if (error) setError(error.message); else setGiras(data || []);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!formData.nombre_gira) return alert("El nombre es obligatorio");
        setLoading(true);
        try {
            if (editingId) {
                const { error } = await supabase.from('giras').update(formData).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('giras').insert([formData]);
                if (error) throw error;
            }
            await fetchGiras();
            closeForm();
        } catch (err) { alert("Error: " + err.message); } finally { setLoading(false); }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Evitar entrar al roster al hacer click en borrar
        if(!confirm("¿Eliminar esta gira?")) return;
        setLoading(true);
        const { error } = await supabase.from('giras').delete().eq('id', id);
        if(error) alert("Error: " + error.message); else await fetchGiras();
        setLoading(false);
    };

    const startEdit = (e, gira) => {
        e.stopPropagation();
        setEditingId(gira.id);
        setFormData({ nombre_gira: gira.nombre_gira, fecha_desde: gira.fecha_desde || '', fecha_hasta: gira.fecha_hasta || '' });
        setIsAdding(false);
    };

    const closeForm = () => { setIsAdding(false); setEditingId(null); setFormData({ nombre_gira: '', fecha_desde: '', fecha_hasta: '' }); };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const [year, month, day] = dateString.split('-'); 
        return `${day}/${month}/${year}`;
    };

    // --- RENDERIZADO CONDICIONAL ---
    
    // 1. Si hay una gira seleccionada, mostramos el GiraRoster
    if (selectedGira) {
        return <GiraRoster supabase={supabase} gira={selectedGira} onBack={() => setSelectedGira(null)} />;
    }

    // 2. Vista por defecto (Listado)
    return (
        <div className="space-y-6 h-full flex flex-col overflow-hidden animate-in fade-in">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><IconMap className="text-indigo-600"/> Gestión de Giras</h2>
                <div className="text-xs text-slate-500">{loading ? "Cargando..." : `${giras.length} giras`}</div>
            </div>

            {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3"><IconAlertCircle className="shrink-0 mt-0.5" /><div><p className="font-bold text-sm">Error</p><p className="text-sm opacity-90">{error}</p></div></div>)}

            <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-2">
                {!isAdding && !editingId && (
                    <button onClick={() => { setIsAdding(true); setFormData({ nombre_gira: '', fecha_desde: '', fecha_hasta: '' }); }} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-medium">
                        <IconPlus size={20} /> Crear Nueva Gira
                    </button>
                )}

                {(isAdding || editingId) && (
                    <GiraForm formData={formData} setFormData={setFormData} onCancel={closeForm} onSave={handleSave} loading={loading} isNew={isAdding} />
                )}

                {giras.map((gira) => {
                    // Si estamos editando ESTA gira, no mostramos la tarjeta, sino el form
                    if (editingId === gira.id) return null; 

                    return (
                        <div 
                            key={gira.id} 
                            onClick={() => setSelectedGira(gira)} // Al hacer click en la tarjeta, entramos al Roster
                            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex justify-between items-center group cursor-pointer"
                        >
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{gira.nombre_gira}</h3>
                                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                    <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                                        Desde: <b>{formatDate(gira.fecha_desde)}</b>
                                    </span>
                                    <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                                        Hasta: <b>{formatDate(gira.fecha_hasta)}</b>
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => startEdit(e, gira)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><IconEdit size={20}/></button>
                                <button onClick={(e) => handleDelete(e, gira.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><IconTrash size={20}/></button>
                                <div className="p-2 text-slate-300"><IconUsers size={20}/></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}