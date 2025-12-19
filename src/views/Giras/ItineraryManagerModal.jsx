import React, { useState, useEffect } from 'react';
import { IconPlus, IconTrash, IconSave, IconX, IconArrowRight, IconClock, IconEdit, IconMapPin } from '../../components/ui/Icons';
import TimeInput from '../../components/ui/TimeInput';
import DateInput from '../../components/ui/DateInput';
import SearchableSelect from '../../components/ui/SearchableSelect';

export default function ItineraryManagerModal({ supabase, isOpen, onClose, locations, localities, onApplyItinerary }) {
    const [mode, setMode] = useState('list'); // 'list', 'create', 'apply'
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Estado de edición con valores por defecto seguros
    const [editingTemplate, setEditingTemplate] = useState({ id: null, nombre: '', tramos: [] });
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [applyConfig, setApplyConfig] = useState({ fecha_inicio: '', hora_inicio: '' });

    const locationOptions = locations.map(l => ({ id: l.id, label: l.nombre, subLabel: l.ciudad }));
    const localityOptions = localities.map(l => ({ id: l.id, label: l.localidad }));

    useEffect(() => { if (isOpen) fetchTemplates(); }, [isOpen]);

    const fetchTemplates = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('plantillas_recorridos').select(`*, plantillas_recorridos_tramos(*)`).order('nombre');
        if (!error) setTemplates(data || []);
        setLoading(false);
    };

    // --- MODO EDICIÓN ---
    const handleEditTemplate = (template) => {
        const sortedTramos = (template.plantillas_recorridos_tramos || []).sort((a,b) => a.orden - b.orden);
        setEditingTemplate({
            id: template.id,
            nombre: template.nombre,
            tramos: sortedTramos.map(t => ({
                ...t,
                ids_localidades_suben: t.ids_localidades_suben || [],
                ids_localidades_bajan: t.ids_localidades_bajan || [],
                id_tipo_evento: t.id_tipo_evento || 11
            }))
        });
        setMode('create');
    };

    const handleAddTramo = () => {
        const lastTramo = editingTemplate.tramos[editingTemplate.tramos.length - 1];
        const defaultOrigen = lastTramo ? lastTramo.id_locacion_destino : '';

        setEditingTemplate({
            ...editingTemplate,
            tramos: [...editingTemplate.tramos, { 
                id_locacion_origen: defaultOrigen, 
                id_locacion_destino: '', 
                duracion_minutos: 60, 
                nota: '', 
                id_tipo_evento: 11,
                ids_localidades_suben: [],
                ids_localidades_bajan: []
            }]
        });
    };

    const updateTramo = (idx, field, value) => {
        const newTramos = [...editingTemplate.tramos];
        newTramos[idx][field] = value;
        // Encadenar origen/destino
        if (field === 'id_locacion_destino' && newTramos[idx + 1]) {
            newTramos[idx + 1].id_locacion_origen = value;
        }
        setEditingTemplate({ ...editingTemplate, tramos: newTramos });
    };

    const handleRemoveTramo = (idx) => {
        const newTramos = editingTemplate.tramos.filter((_, i) => i !== idx);
        setEditingTemplate({ ...editingTemplate, tramos: newTramos });
    };

    const saveTemplate = async () => {
        if (!editingTemplate.nombre) return alert("Nombre requerido");
        setLoading(true);

        let templateId = editingTemplate.id;

        if (templateId) {
            // Update
            await supabase.from('plantillas_recorridos').update({ nombre: editingTemplate.nombre }).eq('id', templateId);
            await supabase.from('plantillas_recorridos_tramos').delete().eq('id_plantilla', templateId);
        } else {
            // Create
            const { data, error } = await supabase.from('plantillas_recorridos').insert([{ nombre: editingTemplate.nombre }]).select().single();
            if (error) { alert("Error"); setLoading(false); return; }
            templateId = data.id;
        }

        const tramosToInsert = editingTemplate.tramos.map((t, idx) => ({
            id_plantilla: templateId,
            orden: idx + 1,
            id_locacion_origen: parseInt(t.id_locacion_origen),
            id_locacion_destino: parseInt(t.id_locacion_destino),
            duracion_minutos: parseInt(t.duracion_minutos),
            nota: t.nota,
            id_tipo_evento: parseInt(t.id_tipo_evento),
            ids_localidades_suben: t.ids_localidades_suben, // Array
            ids_localidades_bajan: t.ids_localidades_bajan  // Array
        }));

        await supabase.from('plantillas_recorridos_tramos').insert(tramosToInsert);
        fetchTemplates();
        setMode('list');
        setLoading(false);
    };

    const handleApply = () => {
        if (!selectedTemplate || !applyConfig.fecha_inicio || !applyConfig.hora_inicio) return alert("Completa fecha y hora");
        onApplyItinerary(selectedTemplate, applyConfig.fecha_inicio, applyConfig.hora_inicio);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><IconMapPin/> Gestor de Itinerarios</h3>
                    <button onClick={onClose}><IconX/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {mode === 'list' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-slate-600">Plantillas Disponibles</h4>
                                <button onClick={() => { setEditingTemplate({ id: null, nombre: '', tramos: [] }); setMode('create'); }} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 hover:bg-indigo-700">
                                    <IconPlus size={14}/> Nueva Plantilla
                                </button>
                            </div>
                            {loading ? <div className="text-center p-4">Cargando...</div> : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {templates.map(t => (
                                        <div key={t.id} className="border p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-all relative group border-l-4 border-l-indigo-500">
                                            <div className="flex justify-between items-start mb-2">
                                                <h5 className="font-bold text-slate-800 text-sm">{t.nombre}</h5>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleEditTemplate(t)} className="text-slate-300 hover:text-indigo-600 p-1"><IconEdit size={14}/></button>
                                                    <button onClick={() => deleteTemplate(t.id)} className="text-slate-300 hover:text-red-500 p-1"><IconTrash size={14}/></button>
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-500 mb-4">{t.plantillas_recorridos_tramos?.length || 0} tramos</div>
                                            <button onClick={() => { setSelectedTemplate(t); setMode('apply'); }} className="w-full py-2 bg-indigo-50 text-indigo-700 font-bold rounded text-xs hover:bg-indigo-100 flex items-center justify-center gap-2">
                                                <IconArrowRight size={12}/> Usar esta Plantilla
                                            </button>
                                        </div>
                                    ))}
                                    {templates.length === 0 && <p className="text-sm text-slate-400 italic col-span-2 text-center py-8">No hay plantillas creadas.</p>}
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'create' && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <div className="mb-6 flex justify-between items-end">
                                <div className="flex-1 max-w-md">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Nombre del Recorrido</label>
                                    <input type="text" className="w-full border p-2 rounded focus:border-indigo-500 outline-none font-bold text-slate-700" placeholder="Ej: Viedma - Bariloche" value={editingTemplate.nombre} onChange={e => setEditingTemplate({...editingTemplate, nombre: e.target.value})} />
                                </div>
                                <div className="text-xs text-slate-400 italic">Cada fila representa un tramo y su evento de SALIDA</div>
                            </div>

                            <div className="space-y-4 mb-6">
                                {editingTemplate.tramos.map((tramo, idx) => (
                                    <div key={idx} className="border rounded-lg bg-slate-50 p-3 shadow-sm relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400 rounded-l"></div>
                                        <div className="grid grid-cols-12 gap-3 items-center border-b border-slate-200 pb-3 mb-2">
                                            <div className="col-span-4">
                                                <label className="text-[9px] font-bold text-slate-400 block mb-0.5">ORIGEN (SALIDA)</label>
                                                <SearchableSelect options={locationOptions} value={tramo.id_locacion_origen} onChange={(v) => updateTramo(idx, 'id_locacion_origen', v)} placeholder="Origen..." />
                                            </div>
                                            <div className="col-span-2 flex flex-col items-center">
                                                <label className="text-[9px] font-bold text-slate-400 mb-0.5">DURACIÓN (MIN)</label>
                                                <input type="number" className="w-16 text-center text-xs border p-1.5 rounded" value={tramo.duracion_minutos} onChange={e => updateTramo(idx, 'duracion_minutos', e.target.value)} />
                                            </div>
                                            <div className="col-span-4">
                                                <label className="text-[9px] font-bold text-slate-400 block mb-0.5">DESTINO (LLEGADA)</label>
                                                <SearchableSelect options={locationOptions} value={tramo.id_locacion_destino} onChange={(v) => updateTramo(idx, 'id_locacion_destino', v)} placeholder="Destino..." />
                                            </div>
                                            <div className="col-span-2 text-right">
                                                <button onClick={() => handleRemoveTramo(idx)} className="text-red-400 hover:text-red-600"><IconTrash size={16}/></button>
                                            </div>
                                        </div>
                                        
                                        {/* Reglas y Configuración */}
                                        <div className="grid grid-cols-12 gap-3">
                                            <div className="col-span-3">
                                                <label className="text-[9px] font-bold text-indigo-400 block mb-0.5">TIPO EVENTO</label>
                                                <select className="w-full text-xs border p-1.5 rounded bg-white" value={tramo.id_tipo_evento} onChange={e => updateTramo(idx, 'id_tipo_evento', e.target.value)}>
                                                    <option value="11">Público</option>
                                                    <option value="12">Privado</option>
                                                </select>
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-[9px] font-bold text-indigo-400 block mb-0.5">NOTA</label>
                                                <input type="text" className="w-full text-xs border p-1.5 rounded bg-white" placeholder="Ej: Almuerzo en ruta" value={tramo.nota || ''} onChange={e => updateTramo(idx, 'nota', e.target.value)} />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-[9px] font-bold text-emerald-600 block mb-0.5">SUBEN AQUÍ</label>
                                                <SearchableSelect isMulti={true} options={localityOptions} value={tramo.ids_localidades_suben} onChange={(v) => updateTramo(idx, 'ids_localidades_suben', v)} placeholder="Seleccionar..." className="border-emerald-200" />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-[9px] font-bold text-rose-600 block mb-0.5">BAJAN AQUÍ</label>
                                                <SearchableSelect isMulti={true} options={localityOptions} value={tramo.ids_localidades_bajan} onChange={(v) => updateTramo(idx, 'ids_localidades_bajan', v)} placeholder="Seleccionar..." className="border-rose-200" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between border-t pt-4">
                                <button onClick={handleAddTramo} className="text-xs font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded flex items-center gap-2 hover:bg-slate-200"><IconPlus size={14}/> Agregar Tramo</button>
                                <div className="flex gap-2">
                                    <button onClick={() => setMode('list')} className="text-xs font-bold text-slate-500 px-4 py-2">Cancelar</button>
                                    <button onClick={saveTemplate} className="text-xs font-bold text-white bg-indigo-600 px-6 py-2 rounded flex items-center gap-2 hover:bg-indigo-700 shadow"><IconSave size={14}/> Guardar</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'apply' && selectedTemplate && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="bg-white p-8 rounded-xl shadow-lg border border-indigo-100 max-w-md w-full">
                                <h4 className="font-bold text-indigo-900 mb-6 text-lg text-center border-b pb-4">Configurar Salida: {selectedTemplate.nombre}</h4>
                                <div className="space-y-4 mb-8">
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Fecha</label><DateInput value={applyConfig.fecha_inicio} onChange={v => setApplyConfig({...applyConfig, fecha_inicio: v})} className="w-full h-10 border-slate-300"/></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Hora</label><TimeInput value={applyConfig.hora_inicio} onChange={v => setApplyConfig({...applyConfig, hora_inicio: v})} className="w-full h-10 border-slate-300"/></div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setMode('list')} className="flex-1 py-2.5 text-slate-500 text-xs font-bold border rounded hover:bg-slate-50">Cancelar</button>
                                    <button onClick={handleApply} className="flex-1 py-2.5 bg-indigo-600 text-white rounded text-sm font-bold hover:bg-indigo-700 shadow-md flex justify-center items-center gap-2"><IconClock size={16}/> Confirmar</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}