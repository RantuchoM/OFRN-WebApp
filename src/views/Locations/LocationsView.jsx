import React, { useState, useEffect } from 'react';
import { IconMap, IconGlobe, IconMapPin, IconBuilding, IconPlus, IconTrash, IconLoader, IconEdit, IconX, IconCheck, IconFilter } from '../../components/ui/Icons';

export default function LocationsView({ supabase }) {
    const [activeTab, setActiveTab] = useState('locaciones'); // 'regiones' | 'localidades' | 'locaciones'
    const [dataList, setDataList] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Estados para formularios y edición
    const [formData, setFormData] = useState({}); 
    const [editingId, setEditingId] = useState(null); // Si no es null, estamos editando
    const [parentsList, setParentsList] = useState([]); // Listas para selects (Regiones o Localidades)
    
    // Estado para Filtros
    const [filterId, setFilterId] = useState(''); // ID para filtrar (ej: id_region o id_localidad)

    // Al cambiar de pestaña, reseteamos todo
    useEffect(() => {
        setFormData({});
        setEditingId(null);
        setFilterId('');
        fetchParents(); 
    }, [activeTab]);

    // Recargar datos cuando cambia la pestaña o el filtro
    useEffect(() => {
        fetchData();
    }, [activeTab, filterId]);

    // --- LÓGICA DE CARGA DE DATOS ---
    const fetchData = async () => {
        setLoading(true);
        let query;
        
        if (activeTab === 'regiones') {
            query = supabase.from('regiones').select('*').order('region');
        } else if (activeTab === 'localidades') {
            query = supabase.from('localidades').select('*, regiones(region)').order('localidad');
            if (filterId) query = query.eq('id_region', filterId);
        } else {
            query = supabase.from('locaciones').select('*, localidades(localidad, regiones(region))').order('nombre');
            if (filterId) query = query.eq('id_localidad', filterId);
        }

        const { data, error } = await query;
        if (error) alert("Error cargando datos: " + error.message);
        else setDataList(data || []);
        setLoading(false);
    };

    // Cargar listas para los Dropdowns (tanto del formulario como del filtro)
    const fetchParents = async () => {
        let data = [];
        if (activeTab === 'localidades') {
            const res = await supabase.from('regiones').select('id, region').order('region');
            data = res.data;
        } else if (activeTab === 'locaciones') {
            const res = await supabase.from('localidades').select('id, localidad').order('localidad');
            data = res.data;
        }
        setParentsList(data || []);
    };

    // --- LÓGICA DE GUARDADO (CREAR / EDITAR) ---
    const handleSave = async () => {
        setLoading(true);
        let table = activeTab;
        let payload = {};

        // 1. Construir Payload según la tabla
        if (activeTab === 'regiones') {
            if (!formData.region) return alert("Nombre requerido");
            payload = { region: formData.region };
        } else if (activeTab === 'localidades') {
            if (!formData.localidad || !formData.id_region) return alert("Datos incompletos");
            payload = { localidad: formData.localidad, id_region: formData.id_region };
        } else {
            if (!formData.nombre || !formData.id_localidad) return alert("Nombre y Localidad requeridos");
            payload = { 
                nombre: formData.nombre, 
                direccion: formData.direccion, 
                capacidad: formData.capacidad ? parseInt(formData.capacidad) : null,
                id_localidad: formData.id_localidad 
            };
        }

        // 2. Ejecutar Insert o Update
        let error = null;
        if (editingId) {
            const { error: err } = await supabase.from(table).update(payload).eq('id', editingId);
            error = err;
        } else {
            const { error: err } = await supabase.from(table).insert([payload]);
            error = err;
        }
        
        if (error) {
            alert("Error al guardar: " + error.message);
        } else {
            cancelEdit(); // Limpiar form
            fetchData();  // Recargar lista
        }
        setLoading(false);
    };

    // --- ACCIONES DE EDICIÓN ---
    const startEdit = (item) => {
        setEditingId(item.id);
        // Rellenar formulario con los datos actuales
        if (activeTab === 'regiones') {
            setFormData({ region: item.region });
        } else if (activeTab === 'localidades') {
            setFormData({ localidad: item.localidad, id_region: item.id_region });
        } else {
            setFormData({ 
                nombre: item.nombre, 
                direccion: item.direccion, 
                capacidad: item.capacidad, 
                id_localidad: item.id_localidad 
            });
        }
        // Scroll suave hacia arriba para ver el formulario
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({});
    };

    const handleDelete = async (id) => {
        if(!confirm("¿Eliminar este elemento?")) return;
        setLoading(true);
        const { error } = await supabase.from(activeTab).delete().eq('id', id);
        if (error) alert("Error al eliminar (puede que tenga elementos relacionados): " + error.message);
        else fetchData();
        setLoading(false);
    };

    // --- RENDERIZADO DEL FORMULARIO ---
    const renderForm = () => {
        const isEditing = !!editingId;
        return (
            <div className={`p-4 rounded-lg border mb-4 flex flex-col md:flex-row gap-3 items-end transition-colors ${isEditing ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                
                {/* Campos Regiones */}
                {activeTab === 'regiones' && (
                    <div className="flex-1 w-full">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Nombre Región</label>
                        <input type="text" className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: Región Sur" value={formData.region || ''} onChange={e => setFormData({...formData, region: e.target.value})} />
                    </div>
                )}

                {/* Campos Localidades */}
                {activeTab === 'localidades' && (
                    <>
                        <div className="flex-1 w-full">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Nombre Localidad</label>
                            <input type="text" className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: Viedma" value={formData.localidad || ''} onChange={e => setFormData({...formData, localidad: e.target.value})} />
                        </div>
                        <div className="w-full md:w-64">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Región</label>
                            <select className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.id_region || ''} onChange={e => setFormData({...formData, id_region: e.target.value})}>
                                <option value="">-- Seleccionar --</option>
                                {parentsList.map(p => <option key={p.id} value={p.id}>{p.region}</option>)}
                            </select>
                        </div>
                    </>
                )}

                {/* Campos Locaciones */}
                {activeTab === 'locaciones' && (
                    <>
                        <div className="flex-1 w-full">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Nombre Lugar</label>
                            <input type="text" className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: Centro Cultural" value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Dirección</label>
                            <input type="text" className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Calle 123" value={formData.direccion || ''} onChange={e => setFormData({...formData, direccion: e.target.value})} />
                        </div>
                        <div className="w-24">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Cap.</label>
                            <input type="number" className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" value={formData.capacidad || ''} onChange={e => setFormData({...formData, capacidad: e.target.value})} />
                        </div>
                        <div className="w-full md:w-48">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Localidad</label>
                            <select className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.id_localidad || ''} onChange={e => setFormData({...formData, id_localidad: e.target.value})}>
                                <option value="">-- Seleccionar --</option>
                                {parentsList.map(p => <option key={p.id} value={p.id}>{p.localidad}</option>)}
                            </select>
                        </div>
                    </>
                )}

                {/* Botones de Acción */}
                <div className="flex gap-2">
                    {isEditing && (
                        <button onClick={cancelEdit} className="px-3 py-2 rounded text-slate-500 hover:bg-slate-200 border border-slate-300 h-[38px]">
                            <IconX size={18}/>
                        </button>
                    )}
                    <button onClick={handleSave} className={`px-4 py-2 rounded text-sm font-bold flex items-center gap-2 h-[38px] text-white shadow-sm ${isEditing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                        {isEditing ? <><IconCheck size={18}/> Actualizar</> : <><IconPlus size={18}/> Agregar</>}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Header y Pestañas */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
                <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><IconBuilding className="text-indigo-600"/> Sedes y Territorio</h2>
                
                <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
                    <button onClick={() => setActiveTab('regiones')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'regiones' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
                        <IconGlobe size={14}/> Regiones
                    </button>
                    <button onClick={() => setActiveTab('localidades')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'localidades' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
                        <IconMap size={14}/> Localidades
                    </button>
                    <button onClick={() => setActiveTab('locaciones')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'locaciones' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
                        <IconMapPin size={14}/> Locaciones
                    </button>
                </div>
            </div>

            {/* Formulario de Agregar/Editar */}
            {renderForm()}

            {/* Barra de Filtros (Solo visible en Localidades y Locaciones) */}
            {activeTab !== 'regiones' && (
                <div className="flex items-center gap-2 px-1 animate-in fade-in">
                    <IconFilter size={16} className="text-slate-400"/>
                    <span className="text-xs font-bold text-slate-500 uppercase">Filtrar por:</span>
                    <select 
                        className="border border-slate-300 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                        value={filterId}
                        onChange={(e) => setFilterId(e.target.value)}
                    >
                        <option value="">{activeTab === 'localidades' ? 'Todas las Regiones' : 'Todas las Localidades'}</option>
                        {parentsList.map(p => (
                            <option key={p.id} value={p.id}>{p.region || p.localidad}</option>
                        ))}
                    </select>
                    {filterId && (
                        <button onClick={() => setFilterId('')} className="text-xs text-indigo-600 hover:text-indigo-800 underline ml-2">
                            Ver todos
                        </button>
                    )}
                </div>
            )}

            {/* Listado */}
            <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-sm relative">
                {loading && <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center text-indigo-600"><IconLoader className="animate-spin"/></div>}
                
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold sticky top-0 z-10">
                        <tr>
                            <th className="p-3">Nombre</th>
                            {activeTab !== 'regiones' && <th className="p-3">Pertenece a</th>}
                            {activeTab === 'locaciones' && <th className="p-3">Dirección / Cap.</th>}
                            <th className="p-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {dataList.map(item => (
                            <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${editingId === item.id ? 'bg-amber-50' : ''}`}>
                                <td className="p-3 font-medium text-slate-700">
                                    {item.region || item.localidad || item.nombre}
                                    {editingId === item.id && <span className="ml-2 text-[10px] text-amber-600 font-bold uppercase">(Editando)</span>}
                                </td>
                                
                                {activeTab !== 'regiones' && (
                                    <td className="p-3 text-slate-500">
                                        {/* Lógica para mostrar padre */}
                                        {activeTab === 'localidades' && (item.regiones?.region || '-')}
                                        {activeTab === 'locaciones' && (
                                            <span>
                                                {item.localidades?.localidad} <span className="text-xs text-slate-300 mx-1">/</span> <span className="text-xs text-slate-400">{item.localidades?.regiones?.region}</span>
                                            </span>
                                        )}
                                    </td>
                                )}

                                {activeTab === 'locaciones' && (
                                    <td className="p-3 text-slate-500 text-xs">
                                        <div className="truncate max-w-[200px]">{item.direccion || '-'}</div>
                                        {item.capacidad && <div className="text-slate-400">Cap: {item.capacidad}</div>}
                                    </td>
                                )}

                                <td className="p-3 text-right">
                                    <div className="flex justify-end gap-1">
                                        <button onClick={() => startEdit(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Editar">
                                            <IconEdit size={16}/>
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar">
                                            <IconTrash size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {dataList.length === 0 && !loading && (
                            <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic">No hay datos registrados con este filtro.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}