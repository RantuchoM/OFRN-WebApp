import React, { useState, useEffect } from 'react';
import { 
    IconPlus, IconTrash, IconSave, IconX, IconArrowRight, 
    IconClock, IconEdit, IconMapPin, IconBuilding, IconArrowDown, IconUserPlus, IconUserMinus, IconMessageCircle 
} from '../../components/ui/Icons';
import TimeInput from '../../components/ui/TimeInput';
import DateInput from '../../components/ui/DateInput';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { formatSecondsToTime } from '../../utils/time';

export default function ItineraryManagerModal({ supabase, isOpen, onClose, locations, localities, onApplyItinerary }) {
    const [mode, setMode] = useState('list'); // 'list', 'create', 'apply'
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [localLocations, setLocalLocations] = useState([]);
    const [isCreatingLoc, setIsCreatingLoc] = useState(false);
    const [newLocData, setNewLocData] = useState({ nombre: '', direccion: '', id_localidad: '' });
    const [savingLoc, setSavingLoc] = useState(false);

    const [editingTemplate, setEditingTemplate] = useState({ id: null, nombre: '', tramos: [] });
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [applyConfig, setApplyConfig] = useState({ fecha_inicio: '', hora_inicio: '' });

    useEffect(() => { setLocalLocations(locations); }, [locations]);
    useEffect(() => { if (isOpen) fetchTemplates(); }, [isOpen]);

    const locationOptions = localLocations.map(l => {
        const locName = l.localidad || l.ciudad || ''; 
        let label = l.nombre;
        if (l.direccion) label += ` - ${l.direccion}`;
        if (locName) label += ` (${locName})`;
        return { id: l.id, label: label, subLabel: '' };
    });

    const localityOptions = localities.map(l => ({ id: l.id, label: l.localidad }));

    const fetchTemplates = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('plantillas_recorridos').select(`*, plantillas_recorridos_tramos(*)`).order('nombre');
        if (!error) setTemplates(data || []);
        setLoading(false);
    };

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

    // Agregar un tramo nuevo al final
    const handleAddTramo = () => {
        const tramos = editingTemplate.tramos;
        const lastTramo = tramos.length > 0 ? tramos[tramos.length - 1] : null;
        
        // Si hay un tramo anterior, el nuevo origen es el destino del anterior
        const defaultOrigen = lastTramo ? lastTramo.id_locacion_destino : '';

        setEditingTemplate({
            ...editingTemplate,
            tramos: [...tramos, { 
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
        
        // Sincronización de cadena:
        // Si cambio el DESTINO de este tramo, el ORIGEN del siguiente debe coincidir
        if (field === 'id_locacion_destino' && newTramos[idx + 1]) {
            newTramos[idx + 1].id_locacion_origen = value;
        }
        // Si cambio el ORIGEN de este tramo, el DESTINO del anterior debe coincidir
        if (field === 'id_locacion_origen' && idx > 0 && newTramos[idx - 1]) {
            newTramos[idx - 1].id_locacion_destino = value;
        }

        setEditingTemplate({ ...editingTemplate, tramos: newTramos });
    };

    const handleRemoveTramo = (idx) => {
        // Al eliminar, intentamos conectar el anterior con el siguiente para no romper la cadena
        const newTramos = [...editingTemplate.tramos];
        
        if (idx > 0 && idx < newTramos.length - 1) {
            // Si borramos uno del medio, el destino del anterior pasa a ser el destino del que borramos
            newTramos[idx - 1].id_locacion_destino = newTramos[idx].id_locacion_destino;
            // Y el origen del siguiente ya coincidirá por lógica o se ajusta:
            newTramos[idx + 1].id_locacion_origen = newTramos[idx].id_locacion_destino;
        }

        const filtered = newTramos.filter((_, i) => i !== idx);
        setEditingTemplate({ ...editingTemplate, tramos: filtered });
    };

    const handleSaveNewLocation = async () => {
        if (!newLocData.nombre || !newLocData.id_localidad) return alert("Nombre y Localidad requeridos");
        setSavingLoc(true);
        const payload = {
            nombre: newLocData.nombre,
            direccion: newLocData.direccion,
            id_localidad: newLocData.id_localidad
        };
        const { data, error } = await supabase.from('locaciones').insert([payload]).select().single();
        if (error) {
            alert("Error al guardar locación");
            console.error(error);
        } else {
            const selectedLocality = localities.find(l => l.id == newLocData.id_localidad);
            const enrichedLoc = { ...data, localidad: selectedLocality ? selectedLocality.localidad : '' };
            setLocalLocations(prev => [...prev, enrichedLoc]);
            setIsCreatingLoc(false);
            setNewLocData({ nombre: '', direccion: '', id_localidad: '' });
        }
        setSavingLoc(false);
    };

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
        
        // Validación básica
        const isValid = editingTemplate.tramos.every(t => t.id_locacion_origen && t.id_locacion_destino);
        if(!isValid) { alert("Revisa que todas las locaciones de origen y destino estén completas."); setLoading(false); return; }

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

    // --- RENDER HELPERS PARA LA VISTA DE TARJETAS ---
    
    // Renderiza una "Parada" en la línea de tiempo (LAYOUT 2 COLUMNAS)
    // Renderiza una "Parada" en la línea de tiempo (LAYOUT 2 COLUMNAS)
    const renderStopCard = (index, isLastDest = false) => {
        const tramos = editingTemplate.tramos;
        const isFirst = index === 0 && !isLastDest; // Identificamos si es la Salida
        
        let locationId, suben, bajan, nota, tipo;
        
        if (!isLastDest) {
            // Es el ORIGEN del tramo [index]
            const currentTramo = tramos[index];
            const prevTramo = index > 0 ? tramos[index - 1] : null;
            
            locationId = currentTramo.id_locacion_origen;
            suben = currentTramo.ids_localidades_suben;
            bajan = prevTramo ? prevTramo.ids_localidades_bajan : [];
            nota = currentTramo.nota;
            tipo = currentTramo.id_tipo_evento;
        } else {
            // Es el DESTINO FINAL
            const incomingTramo = tramos[index - 1];
            locationId = incomingTramo.id_locacion_destino;
            suben = [];
            bajan = incomingTramo.ids_localidades_bajan;
            nota = ''; 
            tipo = null;
        }

        const handleChangeLocation = (val) => {
            if (!isLastDest) {
                updateTramo(index, 'id_locacion_origen', val);
            } else {
                updateTramo(index - 1, 'id_locacion_destino', val);
            }
        };

        // Lógica de colores dinámica
        let dotColor = 'bg-indigo-500 border-indigo-600';
        let borderColor = 'border-slate-200';
        let colBg = 'bg-slate-50 border-slate-100';
        let labelText = `Parada ${index}`; // Por defecto index (para que la siguiente a salida sea 1)

        if (isFirst) {
            dotColor = 'bg-emerald-500 border-emerald-600';
            borderColor = 'border-emerald-200';
            colBg = 'bg-emerald-50 border-emerald-100';
            labelText = 'Salida';
        } else if (isLastDest) {
            dotColor = 'bg-rose-500 border-rose-600';
            borderColor = 'border-rose-100';
            colBg = 'bg-rose-50 border-rose-100';
            labelText = 'Destino Final';
        }

        return (
            <div className="relative pl-8 pb-0">
                {/* Timeline Dot */}
                <div className={`absolute left-0 top-1/2 -mt-2 w-4 h-4 rounded-full border-2 ${dotColor} z-10 box-content`}></div>
                
                {/* CARD CONTAINER */}
                <div className={`flex flex-row items-stretch border rounded-lg shadow-sm transition-all hover:shadow-md mb-2 bg-white overflow-hidden ${borderColor}`}>
                    
                    {/* COLUMNA 1: LOCACIÓN */}
                    <div className={`w-[35%] min-w-[200px] p-3 border-r ${colBg} flex flex-col justify-center`}>
                        <div className="flex justify-between items-center mb-1">
                            <label className={`text-[10px] font-bold uppercase tracking-wider block ${isFirst ? 'text-emerald-600' : (isLastDest ? 'text-rose-500' : 'text-slate-400')}`}>
                                {labelText}
                            </label>
                            {!isLastDest && !isFirst && (
                                <button onClick={() => handleRemoveTramo(index)} className="text-slate-300 hover:text-red-500 p-1" title="Eliminar parada">
                                    <IconTrash size={14}/>
                                </button>
                            )}
                        </div>
                        <SearchableSelect 
                            options={locationOptions} 
                            value={locationId} 
                            onChange={handleChangeLocation} 
                            placeholder="Seleccionar ubicación..." 
                            className="bg-white"
                        />
                    </div>

                    {/* COLUMNA 2: DETALLES */}
                    <div className="flex-1 flex flex-col">
                        
                        {!isLastDest ? (
                            <>
                                {/* FILA A: TIPO Y NOTA */}
                                <div className="flex-1 flex items-center border-b border-slate-100 p-2 gap-3">
                                    <div className="w-24 border-r border-slate-100 pr-3">
                                        <select 
                                            className="w-full text-xs border-none bg-transparent outline-none text-slate-600 font-bold focus:text-indigo-600 cursor-pointer" 
                                            value={tipo} 
                                            onChange={e => updateTramo(index, 'id_tipo_evento', e.target.value)}
                                        >
                                            <option value="11">Público</option>
                                            <option value="12">Privado</option>
                                        </select>
                                    </div>
                                    <div className="flex-1 flex items-center gap-2">
                                        <IconMessageCircle size={14} className="text-slate-300"/>
                                        <input 
                                            type="text" 
                                            className="w-full text-xs bg-transparent outline-none placeholder:text-slate-300 text-slate-600" 
                                            placeholder="Agregar nota..." 
                                            value={nota || ''} 
                                            onChange={e => updateTramo(index, 'nota', e.target.value)} 
                                        />
                                    </div>
                                </div>

                                {/* FILA B: SUBIDA Y BAJADA */}
                                <div className="flex-1 flex items-start bg-white p-2 gap-3 h-full">
                                    
                                    {/* Lado Izquierdo: BAJAN */}
                                    <div className="flex-1 min-w-0">
                                        {/* Ocultamos etiqueta "Bajan" si es la SALIDA (nadie baja en el arranque) */}
                                        {!isFirst && (
                                            <span className="block text-[9px] font-bold text-rose-500 uppercase mb-0.5 pl-6">
                                                Bajan (a la vuelta)
                                            </span>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <IconUserMinus size={14} className={`${isFirst ? 'text-slate-200' : 'text-rose-400'} shrink-0`}/>
                                            <div className="flex-1 min-w-0">
                                                {isFirst ? (
                                                    <span className="text-[10px] text-slate-300 italic">Inicio del recorrido</span>
                                                ) : (
                                                    <SearchableSelect 
                                                        isMulti={true} 
                                                        options={localityOptions} 
                                                        value={bajan} 
                                                        onChange={(v) => updateTramo(index - 1, 'ids_localidades_bajan', v)} 
                                                        placeholder="Bajan..." 
                                                        className="border-none text-xs" 
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-px h-8 bg-slate-100 self-center"></div>

                                    {/* Lado Derecho: SUBEN */}
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-[9px] font-bold text-emerald-500 uppercase mb-0.5 pl-6">
                                            Suben (a la ida)
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <IconUserPlus size={14} className="text-emerald-500 shrink-0"/>
                                            <div className="flex-1 min-w-0">
                                                <SearchableSelect 
                                                    isMulti={true} 
                                                    options={localityOptions} 
                                                    value={suben} 
                                                    onChange={(v) => updateTramo(index, 'ids_localidades_suben', v)} 
                                                    placeholder="Suben..." 
                                                    className="border-none text-xs" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* CONTENIDO PARA ÚLTIMA PARADA */
                            <div className="flex flex-col h-full">
                                <div className="flex-1 flex items-center p-2 gap-2">
                                     <IconUserMinus size={14} className="text-rose-400 shrink-0"/>
                                     <div className="flex-1">
                                        <SearchableSelect isMulti={true} options={localityOptions} value={bajan} onChange={(v) => updateTramo(index - 1, 'ids_localidades_bajan', v)} placeholder="Bajan (Fin)..." className="border-none text-xs" />
                                     </div>
                                </div>
                                <div className="border-t border-slate-100 bg-slate-50/50 p-2 flex justify-center">
                                    <button 
                                        onClick={handleAddTramo}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                                    >
                                        <IconPlus size={12}/> Extender Recorrido
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderConnector = (index) => {
        const tramo = editingTemplate.tramos[index];
        return (
            <div className="relative pl-8 py-1 min-h-[40px] flex items-center">
                {/* Timeline Line */}
                <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-slate-200"></div>
                
                {/* Duration Control Compacto */}
                <div className="flex items-center gap-2 ml-4">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 bg-white px-2 py-1 border rounded-full shadow-sm z-10">
                        <IconArrowDown size={10}/> 
                        <span>Viaje:</span>
                        <input 
                            type="number" 
                            className="w-8 text-center bg-transparent border-b border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-600"
                            value={tramo.duracion_minutos}
                            onChange={e => updateTramo(index, 'duracion_minutos', e.target.value)}
                        />
                        <span>min</span>
                        <span className="text-indigo-400 ml-1 font-bold">
                            ({formatSecondsToTime((parseInt(tramo.duracion_minutos) || 0) * 60)})
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 relative">
                
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
                        <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-col h-full">
                            {/* Header Editor */}
                            <div className="mb-6 flex justify-between items-end gap-4 border-b pb-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Nombre del Recorrido</label>
                                    <input type="text" className="w-full border p-2 rounded focus:border-indigo-500 outline-none font-bold text-slate-700 text-lg" placeholder="Ej: Viedma - Bariloche" value={editingTemplate.nombre} onChange={e => setEditingTemplate({...editingTemplate, nombre: e.target.value})} />
                                </div>
                                <button 
                                    onClick={() => setIsCreatingLoc(true)}
                                    className="h-10 px-4 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
                                >
                                    <IconPlus size={14}/> Nueva Locación
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2">
                                {editingTemplate.tramos.length === 0 && (
                                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg">
                                        <p className="text-slate-400 text-sm mb-4">El recorrido está vacío</p>
                                        <button onClick={handleAddTramo} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold text-sm hover:bg-indigo-700">Comenzar Recorrido</button>
                                    </div>
                                )}

                                {editingTemplate.tramos.length > 0 && (
                                    <div className="relative pb-10 pl-2">
                                        {/* Línea base continua */}
                                        <div className="absolute left-[9px] top-4 bottom-4 w-0.5 bg-slate-200 -z-0"></div>

                                        {editingTemplate.tramos.map((tramo, idx) => (
                                            <React.Fragment key={idx}>
                                                {/* Tarjeta de Parada (Origen) */}
                                                {renderStopCard(idx)}
                                                
                                                {/* Conector de Tiempo */}
                                                {renderConnector(idx)}

                                                {/* Si es el último tramo, renderizamos también el Destino Final */}
                                                {idx === editingTemplate.tramos.length - 1 && (
                                                    renderStopCard(idx + 1, true)
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-4 mt-4">
                                <button onClick={() => setMode('list')} className="text-xs font-bold text-slate-500 px-4 py-2 hover:bg-slate-50 rounded">Cancelar</button>
                                <button onClick={saveTemplate} className="text-xs font-bold text-white bg-indigo-600 px-6 py-2 rounded flex items-center gap-2 hover:bg-indigo-700 shadow"><IconSave size={14}/> Guardar Recorrido</button>
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