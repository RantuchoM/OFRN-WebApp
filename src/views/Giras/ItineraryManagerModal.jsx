import React, { useState, useEffect } from 'react';
import { 
    IconPlus, IconTrash, IconSave, IconX, IconArrowRight, 
    IconClock, IconEdit, IconMapPin, IconBuilding 
} from '../../components/ui/Icons'; // Asegúrate de tener IconBuilding o similar, sino usa IconMapPin
import TimeInput from '../../components/ui/TimeInput';
import DateInput from '../../components/ui/DateInput';
import SearchableSelect from '../../components/ui/SearchableSelect';

export default function ItineraryManagerModal({ supabase, isOpen, onClose, locations, localities, onApplyItinerary }) {
    const [mode, setMode] = useState('list'); // 'list', 'create', 'apply'
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Estado local para locaciones (permite agregar nuevas sin refetch del padre inmediato)
    const [localLocations, setLocalLocations] = useState([]);

    // Estado para crear nueva locación
    const [isCreatingLoc, setIsCreatingLoc] = useState(false);
    const [newLocData, setNewLocData] = useState({ nombre: '', direccion: '', id_localidad: '' });
    const [savingLoc, setSavingLoc] = useState(false);

    // Estado de edición con valores por defecto seguros
    const [editingTemplate, setEditingTemplate] = useState({ id: null, nombre: '', tramos: [] });
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [applyConfig, setApplyConfig] = useState({ fecha_inicio: '', hora_inicio: '' });

    // Sincronizar props con estado local
    useEffect(() => { setLocalLocations(locations); }, [locations]);
    useEffect(() => { if (isOpen) fetchTemplates(); }, [isOpen]);

    // --- FORMATEO DE OPCIONES (CAMBIO SOLICITADO) ---
    const locationOptions = localLocations.map(l => {
        // Asumimos que 'l.localidad' viene como string del join, o intentamos resolverlo
        // Si la estructura de 'locations' trae la relación anidada, ajusta aquí (ej: l.localidades?.localidad)
        const locName = l.localidad || l.ciudad || ''; 
        
        let label = l.nombre;
        if (l.direccion) label += ` - ${l.direccion}`;
        if (locName) label += ` (${locName})`;

        return { 
            id: l.id, 
            label: label, 
            // Sublabel opcional si quieres mantener info extra limpia
            subLabel: '' 
        };
    });

    const localityOptions = localities.map(l => ({ id: l.id, label: l.localidad }));

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

    // --- GUARDAR NUEVA LOCACIÓN ---
    const handleSaveNewLocation = async () => {
        if (!newLocData.nombre || !newLocData.id_localidad) return alert("Nombre y Localidad requeridos");
        
        setSavingLoc(true);
        const payload = {
            nombre: newLocData.nombre,
            direccion: newLocData.direccion,
            id_localidad: newLocData.id_localidad
            // id_gira: ... si fuera necesario vincularlo a una gira específica, aunque locaciones suelen ser globales
        };

        const { data, error } = await supabase.from('locaciones').insert([payload]).select().single();

        if (error) {
            alert("Error al guardar locación");
            console.error(error);
        } else {
            // Encontrar nombre de localidad para la UI local
            const selectedLocality = localities.find(l => l.id == newLocData.id_localidad);
            const enrichedLoc = {
                ...data,
                localidad: selectedLocality ? selectedLocality.localidad : '' 
            };
            
            // Actualizar estado local para que aparezca en los selectores inmediatamente
            setLocalLocations(prev => [...prev, enrichedLoc]);
            setIsCreatingLoc(false);
            setNewLocData({ nombre: '', direccion: '', id_localidad: '' });
        }
        setSavingLoc(false);
    };

    // --- GUARDAR PLANTILLA ---
    const saveTemplate = async () => {
        if (!editingTemplate.nombre) return alert("Nombre requerido");
        setLoading(true);

        let templateId = editingTemplate.id;

        if (templateId) {
            await supabase.from('plantillas_recorridos').update({ nombre: editingTemplate.nombre }).eq('id', templateId);
            await supabase.from('plantillas_recorridos_tramos').delete().eq('id_plantilla', templateId);
        } else {
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
            ids_localidades_suben: t.ids_localidades_suben,
            ids_localidades_bajan: t.ids_localidades_bajan
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
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 relative">
                
                {/* HEADER */}
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><IconMapPin/> Gestor de Itinerarios</h3>
                    <button onClick={onClose}><IconX/></button>
                </div>

                {/* CONTENT */}
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
                                                    <button onClick={() => { if(confirm('Eliminar?')) { /* Add delete logic */ } }} className="text-slate-300 hover:text-red-500 p-1"><IconTrash size={14}/></button>
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
                            <div className="mb-6 flex justify-between items-end gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Nombre del Recorrido</label>
                                    <input type="text" className="w-full border p-2 rounded focus:border-indigo-500 outline-none font-bold text-slate-700" placeholder="Ej: Viedma - Bariloche" value={editingTemplate.nombre} onChange={e => setEditingTemplate({...editingTemplate, nombre: e.target.value})} />
                                </div>
                                <button 
                                    onClick={() => setIsCreatingLoc(true)}
                                    className="h-10 px-4 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
                                >
                                    <IconPlus size={14}/> Nueva Locación
                                </button>
                            </div>

                            <div className="text-xs text-slate-400 italic mb-2">Cada fila representa un tramo y su evento de SALIDA</div>

                            <div className="space-y-4 mb-6">
                                {editingTemplate.tramos.map((tramo, idx) => (
                                    <div key={idx} className="border rounded-lg bg-slate-50 p-3 shadow-sm relative transition-all hover:shadow-md">
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
                                        <div className="grid grid-cols-12 gap-3 bg-white p-2 rounded border border-slate-100">
                                            <div className="col-span-3">
                                                <label className="text-[9px] font-bold text-indigo-400 block mb-0.5">TIPO EVENTO</label>
                                                <select className="w-full text-xs border p-1.5 rounded bg-slate-50 outline-none focus:border-indigo-300" value={tramo.id_tipo_evento} onChange={e => updateTramo(idx, 'id_tipo_evento', e.target.value)}>
                                                    <option value="11">Público</option>
                                                    <option value="12">Privado</option>
                                                </select>
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-[9px] font-bold text-indigo-400 block mb-0.5">NOTA</label>
                                                <input type="text" className="w-full text-xs border p-1.5 rounded bg-slate-50 outline-none focus:border-indigo-300" placeholder="Ej: Almuerzo en ruta" value={tramo.nota || ''} onChange={e => updateTramo(idx, 'nota', e.target.value)} />
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
                            <div className="flex justify-between border-t pt-4 sticky bottom-0 bg-white z-10">
                                <button onClick={handleAddTramo} className="text-xs font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded flex items-center gap-2 hover:bg-slate-200"><IconPlus size={14}/> Agregar Tramo</button>
                                <div className="flex gap-2">
                                    <button onClick={() => setMode('list')} className="text-xs font-bold text-slate-500 px-4 py-2 hover:bg-slate-50 rounded">Cancelar</button>
                                    <button onClick={saveTemplate} className="text-xs font-bold text-white bg-indigo-600 px-6 py-2 rounded flex items-center gap-2 hover:bg-indigo-700 shadow"><IconSave size={14}/> Guardar Recorrido</button>
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

                {/* MODAL CREAR LOCACIÓN (OVERLAY) */}
                {isCreatingLoc && (
                    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden">
                            <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex justify-between items-center">
                                <h5 className="font-bold text-emerald-800 flex items-center gap-2"><IconBuilding size={16}/> Nueva Locación</h5>
                                <button onClick={() => setIsCreatingLoc(false)} className="text-emerald-400 hover:text-emerald-700"><IconX size={18}/></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nombre del lugar *</label>
                                    <input 
                                        autoFocus
                                        className="w-full border p-2 rounded text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                                        placeholder="Ej: Teatro Municipal" 
                                        value={newLocData.nombre} 
                                        onChange={e => setNewLocData({...newLocData, nombre: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Dirección (Opcional)</label>
                                    <input 
                                        className="w-full border p-2 rounded text-sm outline-none focus:border-emerald-500" 
                                        placeholder="Calle 123" 
                                        value={newLocData.direccion} 
                                        onChange={e => setNewLocData({...newLocData, direccion: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Localidad *</label>
                                    <select 
                                        className="w-full border p-2 rounded text-sm outline-none focus:border-emerald-500 bg-white"
                                        value={newLocData.id_localidad}
                                        onChange={e => setNewLocData({...newLocData, id_localidad: e.target.value})}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {localities.sort((a,b) => a.localidad.localeCompare(b.localidad)).map(l => (
                                            <option key={l.id} value={l.id}>{l.localidad}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                                <button onClick={() => setIsCreatingLoc(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded">Cancelar</button>
                                <button 
                                    onClick={handleSaveNewLocation} 
                                    disabled={savingLoc}
                                    className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 shadow-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    {savingLoc ? 'Guardando...' : <><IconSave size={14}/> Guardar</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}   