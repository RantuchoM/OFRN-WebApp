import React, { useState, useEffect } from 'react';
// Importaciones unificadas de Iconos
import { 
    IconCalendar, 
    IconClock, 
    IconPlus, 
    IconTrash, 
    IconEdit, 
    IconLoader, 
    IconMapPin, 
    IconRefresh,
    IconUsers 
} from '../../components/ui/Icons';

// Componentes de Inputs personalizados
import TimeInput from '../../components/ui/TimeInput'; 
import DateInput from '../../components/ui/DateInput'; // Importamos el input de fecha formateado

export default function GiraAgenda({ supabase, gira, onBack }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    
    const [eventTypes, setEventTypes] = useState([]);
    const [locations, setLocations] = useState([]);

    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [googleId, setGoogleId] = useState(null);
    
    const [formData, setFormData] = useState({
        id_tipo_evento: '', 
        id_locacion: '', 
        fecha: '', 
        hora_inicio: '', 
        hora_fin: '', 
        descripcion: '',
        invitar_todos: true 
    });

    useEffect(() => { loadData(); }, [gira.id]);

    const loadData = async () => {
        setLoading(true);
        const { data: types } = await supabase.from('tipos_evento').select('*').order('nombre');
        if (types) setEventTypes(types);

        const { data: locs } = await supabase.from('locaciones').select('id, nombre, localidades(localidad)').order('nombre');
        if (locs) setLocations(locs);

        await fetchEvents();
        setLoading(false);
    };

    const fetchEvents = async () => {
        const { data, error } = await supabase
            .from('eventos')
            .select(`*, tipos_evento (nombre, color), locaciones (nombre, localidades(localidad))`)
            .eq('id_gira', gira.id)
            .order('fecha', { ascending: true })
            .order('hora_inicio', { ascending: true });
        
        if (!error) setEvents(data || []);
    };

    // --- FUNCIÓN AUXILIAR PARA CORREGIR EL PROBLEMA DE LA HORA ---
    const normalizeTime = (t) => {
        if (!t) return '';
        // Si viene con segundos (08:00:00), cortamos
        if (t.length > 5) return t.slice(0, 5);
        // Si viene corta (8:00), agregamos cero (08:00)
        if (t.length === 4) return `0${t}`;
        return t;
    };

    // --- LÓGICA DE EMAILS (INVITACIONES) ---
    const getTourEmails = async () => {
        const { data: fuentes } = await supabase.from('giras_fuentes').select('*').eq('id_gira', gira.id);
        const { data: overrides } = await supabase.from('giras_integrantes').select('id_integrante, estado').eq('id_gira', gira.id);
        const overrideMap = {}; 
        overrides?.forEach(o => overrideMap[o.id_integrante] = o.estado);

        const idsToFetch = new Set();
        
        const ensambleIds = fuentes?.filter(f => f.tipo === 'ENSAMBLE').map(f => f.valor_id) || [];
        if (ensambleIds.length > 0) {
            const { data: rels } = await supabase.from('integrantes_ensambles').select('id_integrante').in('id_ensamble', ensambleIds);
            rels?.forEach(r => idsToFetch.add(r.id_integrante));
        }
        
        const familiaNames = fuentes?.filter(f => f.tipo === 'FAMILIA').map(f => f.valor_texto) || [];
        if (familiaNames.length > 0) {
            const { data: famMembers } = await supabase.from('integrantes').select('id, instrumentos!inner(familia)').in('instrumentos.familia', familiaNames);
            famMembers?.forEach(m => idsToFetch.add(m.id));
        }
        
        overrides?.forEach(o => idsToFetch.add(o.id_integrante));

        if (idsToFetch.size === 0) return [];

        const { data: musicians } = await supabase
            .from('integrantes')
            .select('id, email_google')
            .in('id', Array.from(idsToFetch));

        if (!musicians) return [];

        const validEmails = musicians
            .filter(m => m.email_google && overrideMap[m.id] !== 'ausente')
            .map(m => m.email_google);

        return [...new Set(validEmails)];
    };

    // --- SINCRONIZACIÓN GOOGLE ---
    const syncWithGoogle = async (action, eventoData, googleEventId = null, shouldInvite = false) => {
        setSyncing(true);
        try {
            const tipoNombre = eventTypes.find(t => t.id == eventoData.id_tipo_evento)?.nombre || 'Evento';
            const locNombre = locations.find(l => l.id == eventoData.id_locacion)?.nombre || '';
            
            let invitados = [];
            if (action !== 'delete' && shouldInvite) {
                invitados = await getTourEmails();
            }

            const payload = {
                action, 
                evento: {
                    ...eventoData,
                    titulo: `${tipoNombre} - ${gira.nombre_gira}`,
                    ubicacion: locNombre,
                    google_event_id: googleEventId,
                    invitados: invitados,
                    // Aseguramos que la hora vaya limpia también a la API
                    hora_inicio: normalizeTime(eventoData.hora_inicio),
                    hora_fin: normalizeTime(eventoData.hora_fin)
                }
            };

            const { data, error } = await supabase.functions.invoke('create-calendar-event', { body: payload });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error("Error Google Sync:", err);
            return null;
        } finally {
            setSyncing(false);
        }
    };

    const unsyncedEvents = events.filter(e => !e.google_event_id);
    const handleSyncAll = async () => {
        if (!confirm(`Sincronizar ${unsyncedEvents.length} eventos?\nSe enviarán invitaciones a los músicos confirmados.`)) return;
        setLoading(true);
        for (const evt of unsyncedEvents) {
            const gRes = await syncWithGoogle('create', evt, null, true);
            if (gRes?.google_id) await supabase.from('eventos').update({ google_event_id: gRes.google_id }).eq('id', evt.id);
        }
        await fetchEvents();
        setLoading(false);
    };

    // --- MANEJO DEL FORMULARIO ---
    const resetForm = () => {
        setFormData({ id_tipo_evento: '', id_locacion: '', fecha: '', hora_inicio: '', hora_fin: '', descripcion: '', invitar_todos: true });
        setIsEditing(false);
        setEditId(null);
        setGoogleId(null);
    };

    const handleSave = async () => {
        if (!formData.fecha || !formData.id_tipo_evento) return alert("Fecha y Tipo son obligatorios");
        
        // --- VALIDACIÓN DE HORA CORREGIDA ---
        const start = normalizeTime(formData.hora_inicio);
        const end = normalizeTime(formData.hora_fin);

        if (start && end) {
            // Al comparar strings normalizados (ej: "08:30" vs "13:00"), la comparación léxica funciona correctamente
            if (end <= start) {
                return alert("⚠️ La hora de fin debe ser posterior a la de inicio.");
            }
        }

        setLoading(true);
        // Excluir 'invitar_todos' para DB
        const { invitar_todos, ...dbPayload } = formData;
        // Guardar horas normalizadas en DB para evitar problemas futuros
        dbPayload.hora_inicio = start;
        dbPayload.hora_fin = end;

        const payload = { ...dbPayload, id_gira: gira.id, id_locacion: formData.id_locacion || null };

        try {
            let savedEvent;
            
            if (editId) {
                const { data, error } = await supabase.from('eventos').update(payload).eq('id', editId).select().single();
                if (error) throw error;
                savedEvent = data;

                if (googleId) {
                    await syncWithGoogle('update', payload, googleId, invitar_todos);
                } else {
                    const gRes = await syncWithGoogle('create', payload, null, invitar_todos);
                    if (gRes?.google_id) await supabase.from('eventos').update({ google_event_id: gRes.google_id }).eq('id', savedEvent.id);
                }
            } else {
                const { data, error } = await supabase.from('eventos').insert([payload]).select().single();
                if (error) throw error;
                savedEvent = data;

                const gRes = await syncWithGoogle('create', payload, null, invitar_todos);
                if (gRes?.google_id) await supabase.from('eventos').update({ google_event_id: gRes.google_id }).eq('id', savedEvent.id);
            }

            resetForm();
            await fetchEvents();
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, googleEventId) => {
        if(!confirm("¿Eliminar este evento?")) return;
        setLoading(true);
        if (googleEventId) await syncWithGoogle('delete', {}, googleEventId);
        await supabase.from('eventos').delete().eq('id', id);
        await fetchEvents();
        setLoading(false);
    };

    const startEdit = (evt) => {
        setEditId(evt.id);
        setGoogleId(evt.google_event_id);
        setFormData({
            id_tipo_evento: evt.id_tipo_evento,
            id_locacion: evt.id_locacion || '',
            fecha: evt.fecha,
            hora_inicio: normalizeTime(evt.hora_inicio), // Normalizamos al cargar
            hora_fin: normalizeTime(evt.hora_fin),
            descripcion: evt.descripcion || '',
            invitar_todos: true
        });
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- FORMATOS ---
    const formatTime = (timeStr) => normalizeTime(timeStr);
    
    const formatDateHeader = (dateStr) => {
        if(!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        const dateObj = new Date(y, m - 1, d);
        const dayName = dateObj.toLocaleDateString('es-AR', { weekday: 'long' });
        const monthName = dateObj.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''); 
        return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${d}/${monthName}`;
    };

    const groupedEvents = {};
    events.forEach(evt => {
        if (!groupedEvents[evt.fecha]) groupedEvents[evt.fecha] = [];
        groupedEvents[evt.fecha].push(evt);
    });
    const sortedDates = Object.keys(groupedEvents).sort();

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 font-medium text-sm flex items-center gap-1">← Volver</button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{gira.nombre_gira}</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-500 flex items-center gap-1"><IconCalendar size={12}/> Agenda</p>
                            {syncing && <span className="text-[10px] text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full"><IconLoader className="animate-spin" size={10}/> Sincronizando Google...</span>}
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    {!loading && unsyncedEvents.length > 0 && (
                        <button 
                            onClick={handleSyncAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold hover:bg-amber-100 transition-colors animate-pulse"
                            title="Hay eventos locales que no están en Google"
                        >
                            <IconRefresh size={14}/>
                            Sync ({unsyncedEvents.length})
                        </button>
                    )}
                    <div className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 font-bold flex items-center">
                        {events.length} Eventos
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
                
                {/* Formulario */}
                <div className={`p-5 rounded-xl border mb-8 transition-all ${isEditing ? 'bg-amber-50 border-amber-200 shadow-md ring-1 ring-amber-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <h3 className={`text-sm font-bold uppercase flex items-center gap-2 ${isEditing ? 'text-amber-700' : 'text-indigo-600'}`}>
                            {isEditing ? <><IconEdit size={16}/> Editando Evento</> : <><IconPlus size={16}/> Nuevo Evento</>}
                        </h3>
                        {isEditing && <button onClick={resetForm} className="text-xs text-slate-500 underline">Cancelar</button>}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Tipo</label>
                            <select className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.id_tipo_evento} onChange={e => setFormData({...formData, id_tipo_evento: e.target.value})}>
                                <option value="">-- Seleccionar --</option>
                                {eventTypes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Locación</label>
                            <select className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.id_locacion} onChange={e => setFormData({...formData, id_locacion: e.target.value})}>
                                <option value="">-- Lugar (Opcional) --</option>
                                {locations.map(l => (<option key={l.id} value={l.id}>{l.nombre} {l.localidades?.localidad ? `(${l.localidades.localidad})` : ''}</option>))}
                            </select>
                        </div>
                        
                        {/* CAMPO FECHA FORMATEADO */}
                        <div className="md:col-span-3">
                            <DateInput 
                                label="Fecha" 
                                value={formData.fecha} 
                                onChange={(val) => setFormData({...formData, fecha: val})} 
                            />
                        </div>

                        <div className="md:col-span-2 flex gap-1">
                            <div className="flex-1"><TimeInput label="Inicio" value={formData.hora_inicio} onChange={(val) => setFormData({...formData, hora_inicio: val})} /></div>
                            <div className="flex-1"><TimeInput label="Fin" value={formData.hora_fin} onChange={(val) => setFormData({...formData, hora_fin: val})} /></div>
                        </div>
                        <div className="md:col-span-8">
                            <input type="text" placeholder="Descripción / Notas (Opcional)" className="w-full border-b border-slate-300 py-1 text-sm focus:border-indigo-500 outline-none bg-transparent" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
                        </div>
                        
                        {/* CHECKBOX DE INVITACIÓN */}
                        <div className="md:col-span-4 flex items-center justify-end pb-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" checked={formData.invitar_todos} onChange={(e) => setFormData({...formData, invitar_todos: e.target.checked})} />
                                <span className="text-xs text-slate-600 flex items-center gap-1"><IconUsers size={12}/> Enviar Invitaciones</span>
                            </label>
                        </div>

                        <div className="md:col-span-12">
                            <button onClick={handleSave} disabled={loading} className={`w-full py-2 rounded text-sm font-bold text-white shadow-sm flex items-center justify-center gap-1 h-[38px] transition-colors ${isEditing ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                {isEditing ? 'Actualizar' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="space-y-8 pb-10">
                    {loading && <div className="p-4 text-center text-indigo-600"><IconLoader className="animate-spin inline"/></div>}
                    
                    {!loading && sortedDates.map((date) => (
                        <div key={date} className="relative">
                            <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm py-2 mb-2 flex items-center gap-4">
                                <div className="text-sm font-black text-slate-600 uppercase tracking-wider border bg-white px-3 py-1 rounded-lg shadow-sm">
                                    {formatDateHeader(date)}
                                </div>
                                <div className="h-px bg-slate-300 flex-1"></div>
                            </div>

                            <div className="space-y-3 pl-2">
                                {groupedEvents[date].map((evt) => {
                                    const eventColor = evt.tipos_evento?.color || '#cbd5e1'; 
                                    const isConcert = evt.tipos_evento?.nombre?.toLowerCase().includes('concierto');
                                    
                                    return (
                                        <div 
                                            key={evt.id} 
                                            className={`relative bg-white rounded-lg border shadow-sm hover:shadow-md transition-all group overflow-hidden ${isConcert ? 'border-l-4 p-4' : 'border-l-4 p-3'}`}
                                            style={{ borderLeftColor: eventColor, backgroundColor: isConcert ? `${eventColor}08` : 'white' }}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="min-w-[80px] text-right">
                                                    <div className="text-sm font-bold text-slate-700">{formatTime(evt.hora_inicio)}</div>
                                                    <div className="text-xs text-slate-400">{formatTime(evt.hora_fin)}</div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-bold uppercase tracking-wide ${isConcert ? 'text-base' : ''}`} style={{ color: eventColor }}>
                                                            {evt.tipos_evento?.nombre}
                                                        </span>
                                                        {evt.google_event_id && (
                                                            <span title="Sincronizado con Google Calendar" className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded border border-blue-100 cursor-help font-bold">G</span>
                                                        )}
                                                    </div>
                                                    <h4 className={`font-medium text-slate-800 flex items-center gap-2 ${isConcert ? 'text-lg mt-1' : 'text-sm'}`}>
                                                        {evt.locaciones?.nombre || <span className="text-slate-400 italic font-normal">Sin ubicación</span>}
                                                        {evt.locaciones?.localidades && (
                                                            <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-1.5 rounded border border-slate-200">
                                                                <IconMapPin size={10} className="inline mr-0.5"/> {evt.locaciones.localidades.localidad}
                                                            </span>
                                                        )}
                                                    </h4>
                                                    {evt.descripcion && <p className="text-xs text-slate-500 mt-1 italic">{evt.descripcion}</p>}
                                                </div>
                                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                                                    <button onClick={() => startEdit(evt)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><IconEdit size={16}/></button>
                                                    <button onClick={() => handleDelete(evt.id, evt.google_event_id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><IconTrash size={16}/></button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {!loading && events.length === 0 && <div className="p-8 bg-white border border-dashed border-slate-200 rounded-xl text-center text-slate-400 italic">No hay actividades programadas.</div>}
                </div>
            </div>
        </div>
    );
}