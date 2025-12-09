// src/views/Giras/GiraAgenda.jsx
import React, { useState, useEffect } from 'react';
import { 
    IconArrowLeft, IconPlus, IconEdit, IconTrash, IconMapPin, 
    IconCalendar, IconClock, IconLoader, IconX, IconCheck 
} from '../../components/ui/Icons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import CommentButton from '../../components/comments/CommentButton';
import CommentsManager from '../../components/comments/CommentsManager';
import EventForm from '../../components/forms/EventForm'; 

export default function GiraAgenda({ supabase, gira, onBack }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Estados para el Formulario (Modal o Inline)
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ 
        id: null, descripcion: "", fecha: "", 
        hora_inicio: "", hora_fin: "",
        id_tipo_evento: "", id_locacion: "" 
    });
    const [saving, setSaving] = useState(false);
    
    // Catálogos
    const [eventTypes, setEventTypes] = useState([]);
    const [locations, setLocations] = useState([]);

    // Estado para Comentarios
    const [commentsState, setCommentsState] = useState(null);

    useEffect(() => {
        if(gira?.id) {
            fetchEvents();
            fetchCatalogs();
        }
    }, [gira]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('eventos')
                .select(`
                    *,
                    tipos_evento (id, nombre, color),
                    locaciones (id, nombre)
                `)
                .eq('id_gira', gira.id)
                .order('fecha', { ascending: true })
                .order('hora_inicio', { ascending: true });

            if (error) throw error;
            setEvents(data || []);
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCatalogs = async () => {
        const { data: types } = await supabase.from('tipos_evento').select('id, nombre').order('nombre');
        const { data: locsDirect } = await supabase.from('locaciones').select('id, nombre').order('nombre');
        
        if(types) setEventTypes(types);
        if(locsDirect) setLocations(locsDirect);
    };

    const handleEdit = (evt) => {
        setFormData({
            id: evt.id,
            descripcion: evt.descripcion || '',
            fecha: evt.fecha,
            hora_inicio: evt.hora_inicio,
            hora_fin: evt.hora_fin || '',
            id_tipo_evento: evt.id_tipo_evento || '',
            id_locacion: evt.id_locacion || ''
        });
        setIsEditing(true);
    };

    const handleCreate = () => {
        setFormData({
            id: null,
            descripcion: "",
            fecha: gira.fecha_desde || "",
            hora_inicio: "10:00",
            hora_fin: "12:00",
            id_tipo_evento: "",
            id_locacion: ""
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        // FIX: Cambiamos la validación para requerir solo fecha y hora_inicio
        if (!formData.fecha || !formData.hora_inicio) return alert("Fecha y Hora Inicio son requeridas");
        setSaving(true);
        try {
            const payload = {
                id_gira: gira.id,
                // FIX: Si la descripción está vacía, se envía null (o el valor recortado)
                descripcion: formData.descripcion.trim() || null, 
                fecha: formData.fecha,
                hora_inicio: formData.hora_inicio,
                // Si hora_fin está vacía, usa hora_inicio, sino usa el valor recortado.
                hora_fin: formData.hora_fin.trim() || formData.hora_inicio, 
                id_tipo_evento: formData.id_tipo_evento || null,
                id_locacion: formData.id_locacion || null
            };

            if (formData.id) {
                await supabase.from('eventos').update(payload).eq('id', formData.id);
            } else {
                await supabase.from('eventos').insert([payload]);
            }
            setIsEditing(false);
            fetchEvents();
        } catch (error) {
            console.error("Error saving:", error);
            alert("Error al guardar evento");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if(!confirm("¿Eliminar este evento?")) return;
        try {
            await supabase.from('eventos').delete().eq('id', id);
            fetchEvents();
        } catch (error) {
            console.error(error);
        }
    };

    // Renderizado de lista agrupada por fecha
    const groupedEvents = events.reduce((acc, evt) => {
        const d = evt.fecha;
        if(!acc[d]) acc[d] = [];
        acc[d].push(evt);
        return acc;
    }, {});

    const getBorderColor = (typeName) => {
        const t = typeName?.toLowerCase() || '';
        if (t.includes('concierto')) return 'border-amber-500';
        if (t.includes('general')) return 'border-rose-500';
        if (t.includes('ensayo')) return 'border-slate-500';
        if (t.includes('viaje')) return 'border-blue-500';
        return 'border-indigo-500';
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 relative">
            {/* HEADER (Omitted) */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <IconArrowLeft size={20}/>
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 leading-none">Agenda</h2>
                        <p className="text-xs text-slate-500">{gira.nombre_gira}</p>
                    </div>
                </div>
                <button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 shadow-sm transition-colors">
                    <IconPlus size={16}/> <span className="hidden sm:inline">Nuevo Evento</span>
                </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {loading && <div className="flex justify-center py-10"><IconLoader className="animate-spin text-indigo-500" size={32}/></div>}
                
                {!loading && events.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <IconCalendar size={48} className="mx-auto mb-2 opacity-20"/>
                        <p>No hay eventos registrados en esta gira.</p>
                    </div>
                )}

                {Object.entries(groupedEvents).map(([date, dayEvents]) => (
                    <div key={date} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="sticky top-0 bg-slate-50/95 backdrop-blur z-10 py-2 mb-2 flex items-center gap-2 border-b border-slate-200/60">
                            <span className="font-bold text-slate-700 text-sm bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm capitalize">
                                {format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })}
                            </span>
                        </div>
                        <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-slate-200 ml-3">
                            {dayEvents.map(evt => (
                                <div key={evt.id} className={`bg-white rounded-lg border border-slate-200 shadow-sm p-3 flex gap-3 relative group hover:shadow-md transition-all border-l-4 ${getBorderColor(evt.tipos_evento?.nombre)}`}>
                                    <div className="flex flex-col items-center justify-center min-w-[3.5rem] border-r border-slate-100 pr-3 text-slate-600">
                                        <span className="text-lg font-black">{evt.hora_inicio?.slice(0,5)}</span>
                                        {evt.hora_fin && <span className="text-xs text-slate-400">a {evt.hora_fin.slice(0,5)}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{evt.tipos_evento?.nombre || 'Evento'}</span>
                                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <CommentButton supabase={supabase} entityType="EVENTO" entityId={evt.id} onClick={() => setCommentsState({ type: 'EVENTO', id: evt.id, title: evt.descripcion })} className="p-1"/>
                                                <button onClick={() => handleEdit(evt)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><IconEdit size={14}/></button>
                                                <button onClick={() => handleDelete(evt.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><IconTrash size={14}/></button>
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-slate-800">{evt.descripcion || 'Sin descripción'}</h4>
                                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                            <IconMapPin size={12}/> {evt.locaciones?.nombre || "Sin ubicación"}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* FORM MODAL (Usando EventForm) */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <EventForm
                        formData={formData}
                        setFormData={setFormData}
                        onSave={handleSave}
                        onClose={() => setIsEditing(false)}
                        loading={saving}
                        eventTypes={eventTypes}
                        locations={locations}
                        isNew={!formData.id}
                    />
                </div>
            )}

            {/* COMENTARIOS LATERALES (Omitted) */}
            {commentsState && (
                <div className="fixed inset-0 z-[60] flex justify-end bg-black/20 backdrop-blur-[1px]" onClick={() => setCommentsState(null)}>
                    <div onClick={e => e.stopPropagation()} className="h-full">
                        <CommentsManager 
                            supabase={supabase} 
                            entityType={commentsState.type} 
                            entityId={commentsState.id} 
                            title={commentsState.title}
                            onClose={() => setCommentsState(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}