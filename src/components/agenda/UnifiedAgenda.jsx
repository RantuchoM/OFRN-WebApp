// src/components/agenda/UnifiedAgenda.jsx
import React, { useState, useEffect } from "react";
import { 
    format, startOfDay, addMonths, parseISO, isToday,
    differenceInHours, differenceInDays, isPast 
} from "date-fns";
import { es } from "date-fns/locale";
import {
  IconMapPin, IconLoader, IconCalendar, IconCheck, IconX,
  IconHelpCircle, IconBan, IconEdit, IconTrash, IconArrowLeft, IconPlus
} from "../ui/Icons";
import { useAuth } from "../../context/AuthContext";
import CommentsManager from "../comments/CommentsManager";
import CommentButton from "../comments/CommentButton";
import EventDetailModal from "../../views/Giras/EventDetailModal";
import EventForm from "../forms/EventForm"; // Necesario para crear nuevos eventos en modo Gira

// --- LÓGICA DE FECHA LÍMITE ---
const getDeadlineStatus = (deadlineISO) => {
    if (!deadlineISO) return { status: 'NO_DEADLINE' };
    const deadline = parseISO(deadlineISO);
    const now = new Date();
    if (isPast(deadline)) return { status: 'CLOSED', message: 'Plazo finalizado' };
    const diffDays = differenceInDays(deadline, now);
    const diffHours = differenceInHours(deadline, now);
    if (diffDays > 0) return { status: 'OPEN', message: `Quedan ${diffDays} día(s) para confirmar` };
    return { status: 'OPEN', message: `Quedan ${diffHours} hora(s) para confirmar` };
};

export default function UnifiedAgenda({ supabase, giraId = null, onBack = null, title = "Agenda General" }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para modales
  const [commentsState, setCommentsState] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null); // Para EventDetailModal (Ver/Editar)
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [isCreating, setIsCreating] = useState(false); // Para EventForm (Crear)
  const [newFormData, setNewFormData] = useState({});

  const [userProfile, setUserProfile] = useState(null);

  // Permisos
  const canEdit = ["admin", "editor", "coord_general", "director"].includes(user?.rol_sistema);

  // Cargar Perfil
  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("integrantes")
        .select("*, instrumentos(familia), integrantes_ensambles(id_ensamble)")
        .eq("id", user.id)
        .single();
      setUserProfile(data);
    };
    fetchProfile();
  }, [user.id]);

  // Cargar Agenda cuando hay perfil y (si es modo gira) tenemos ID
  useEffect(() => {
    if (userProfile) {
        fetchAgenda();
    }
  }, [userProfile, giraId]);

  const checkIsConvoked = (convocadosList, tourRole) => {
    if (!convocadosList || convocadosList.length === 0) return false;
    return convocadosList.some((tag) => {
      if (tag === "GRP:TUTTI") return true;
      if (tag === "GRP:LOCALES") return userProfile.is_local;
      if (tag === "GRP:NO_LOCALES") return !userProfile.is_local;
      if (tag === "GRP:PRODUCCION") return tourRole === "produccion";
      if (tag === "GRP:SOLISTAS") return tourRole === "solista";
      if (tag === "GRP:DIRECTORES") return tourRole === "director";
      if (tag.startsWith("LOC:")) return userProfile.id_localidad === parseInt(tag.split(":")[1]);
      if (tag.startsWith("FAM:")) return userProfile.instrumentos?.familia === tag.split(":")[1];
      return false;
    });
  };

  const fetchAgenda = async () => {
    setLoading(true);
    const start = startOfDay(new Date()).toISOString();
    const end = addMonths(new Date(), 12).toISOString();

    try {
      const userRole = user?.rol_sistema || "";
      const isPersonal = userRole === "consulta_personal" || userRole === "personal";

      // Preparar filtros de perfil
      let myEnsembles = new Set();
      userProfile.integrantes_ensambles?.forEach((ie) => myEnsembles.add(ie.id_ensamble));
      const myFamily = userProfile.instrumentos?.familia;

      // Construir Query
      let query = supabase
        .from("eventos")
        .select(`
            id, fecha, hora_inicio, hora_fin, descripcion, convocados, id_tipo_evento, id_locacion,
            tipos_evento (id, nombre, color), locaciones (id, nombre),
            programas (
                id, nombre_gira, nomenclador, google_drive_folder_id, 
                fecha_confirmacion_limite,
                giras_fuentes(tipo, valor_id, valor_texto), 
                giras_integrantes(id_integrante, estado, rol)
            )
        `)
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });

      if (giraId) {
          // MODO GIRA: Filtramos solo por esa gira (mostramos todo el historial, no solo futuro)
          query = query.eq("id_gira", giraId);
      } else {
          // MODO GENERAL: Filtramos fecha futura
          query = query.gte("fecha", start).lte("fecha", end);
      }

      const { data: eventsData, error } = await query;
      if (error) throw error;

      // Filtrado en memoria
      const visibleEvents = (eventsData || []).filter((item) => {
        // Si estamos en una Gira específica, mostramos TODO (como admin/gestor)
        if (giraId) return true;

        // Si estamos en Agenda General, aplicamos filtros de usuario
        if (!isPersonal) return true; // Admins ven todo en general
        
        const overrides = item.programas?.giras_integrantes || [];
        const sources = item.programas?.giras_fuentes || [];
        const myOverride = overrides.find((o) => o.id_integrante === user.id);

        if (myOverride && myOverride.estado === "ausente") return false;
        if (myOverride) return true;

        return sources.some(
          (s) =>
            (s.tipo === "ENSAMBLE" && myEnsembles.has(s.valor_id)) ||
            (s.tipo === "FAMILIA" && s.valor_texto === myFamily)
        );
      });

      if (visibleEvents.length > 0) {
        const eventIds = visibleEvents.map((e) => e.id);
        const { data: attendanceData } = await supabase
          .from("eventos_asistencia")
          .select("id_evento, estado")
          .in("id_evento", eventIds)
          .eq("id_integrante", user.id);

        const attendanceMap = {};
        attendanceData?.forEach((a) => { attendanceMap[a.id_evento] = a.estado; });

        visibleEvents.forEach((evt) => {
          evt.mi_asistencia = attendanceMap[evt.id];
          const myTourRecord = evt.programas?.giras_integrantes?.find((i) => i.id_integrante === user.id);
          const myTourRole = myTourRecord?.rol || "musico";
          evt.is_convoked = checkIsConvoked(evt.convocados, myTourRole);
        });
      }

      setItems(visibleEvents);
    } catch (err) {
      console.error("Error fetching agenda:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---
  const toggleMealAttendance = async (eventId, newStatus) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("eventos_asistencia")
        .upsert({ id_evento: eventId, id_integrante: user.id, estado: newStatus }, { onConflict: "id_evento, id_integrante" });
      if (error) throw error;
      setItems(prev => prev.map(item => item.id === eventId ? { ...item, mi_asistencia: newStatus } : item));
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm("¿Eliminar evento?")) return;
    const { error } = await supabase.from("eventos").delete().eq("id", eventId);
    if (!error) fetchAgenda();
  };

  // --- MODAL HANDLERS ---
  const openEditModal = (evt) => {
      const startIso = `${evt.fecha}T${evt.hora_inicio}`;
      const endIso = evt.hora_fin ? `${evt.fecha}T${evt.hora_fin}` : startIso;
      setEditingEvent({
          id: evt.id, title: evt.descripcion, start: startIso, end: endIso,
          location: evt.locaciones?.nombre,
          programType: evt.tipos_evento?.nombre,
          programLabel: evt.programas?.nombre_gira,
          giraId: evt.programas?.id,
          subtitle: evt.programas?.nomenclador
      });
      setIsDetailOpen(true);
  };

  const handleUpdateEvent = async (formData) => {
      const fecha = formData.start.split('T')[0];
      const hora_inicio = formData.start.split('T')[1]?.slice(0,5);
      const hora_fin = formData.end.split('T')[1]?.slice(0,5);
      const { error } = await supabase.from("eventos").update({ fecha, hora_inicio, hora_fin, descripcion: formData.title }).eq("id", formData.id);
      if (!error) { setIsDetailOpen(false); setEditingEvent(null); fetchAgenda(); }
  };

  // --- CREACIÓN (Solo modo Gira) ---
  const handleOpenCreate = () => {
      setNewFormData({
          id: null, descripcion: "", fecha: "", hora_inicio: "10:00", hora_fin: "12:00",
          id_tipo_evento: "", id_locacion: ""
      });
      setIsCreating(true);
  };

  const handleCreateSave = async () => {
      if (!newFormData.fecha || !newFormData.hora_inicio) return alert("Datos requeridos incompletos");
      const payload = {
          id_gira: giraId,
          descripcion: newFormData.descripcion || null,
          fecha: newFormData.fecha,
          hora_inicio: newFormData.hora_inicio,
          hora_fin: newFormData.hora_fin || newFormData.hora_inicio,
          id_tipo_evento: newFormData.id_tipo_evento || null,
          id_locacion: newFormData.id_locacion || null
      };
      const { error } = await supabase.from('eventos').insert([payload]);
      if(!error) { setIsCreating(false); fetchAgenda(); }
  };

  // --- RENDER HELPERS ---
  const getEventBorderColor = (typeName) => {
    const t = typeName?.toLowerCase() || "";
    if (t.includes("concierto") || t.includes("función")) return "border-amber-500";
    if (t.includes("general")) return "border-rose-500";
    if (t.includes("ensayo")) return "border-slate-500";
    if (t.includes("viaje")) return "border-blue-500";
    if (t.includes("almuerzo") || t.includes("cena") || t.includes("comida")) return "border-emerald-500";
    return "border-indigo-500";
  };

  const groupedByMonth = items.reduce((acc, item) => {
    const monthKey = format(parseISO(item.fecha), "yyyy-MM");
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(item);
    return acc;
  }, {});

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
        {/* HEADER UNIFICADO */}
        <div className="p-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
                {onBack && (
                    <button onClick={onBack} className="text-slate-400 hover:text-indigo-600">
                        <IconArrowLeft size={20}/>
                    </button>
                )}
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                    {giraId && <p className="text-xs text-slate-500">Eventos de la gira</p>}
                </div>
            </div>
            {giraId && canEdit && (
                <button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow-sm">
                    <IconPlus size={16}/> Nuevo
                </button>
            )}
        </div>

        {/* CONTENIDO LISTA */}
        <div className="flex-1 overflow-y-auto p-4 pb-20">
            {loading && <div className="text-center py-10"><IconLoader className="animate-spin inline text-indigo-500" size={30} /></div>}
            
            {!loading && items.length === 0 && (
                <div className="text-center text-slate-400 py-10 italic">No hay eventos para mostrar.</div>
            )}

            {Object.entries(groupedByMonth).map(([monthKey, monthEvents]) => {
                const monthDate = parseISO(monthEvents[0].fecha);
                const daysInMonth = monthEvents.reduce((acc, evt) => {
                    const dKey = evt.fecha; if (!acc[dKey]) acc[dKey] = []; acc[dKey].push(evt); return acc;
                }, {});

                return (
                    <div key={monthKey} className="relative max-w-5xl mx-auto mb-8">
                        <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur py-2 border-b border-slate-200 mb-4 text-slate-600 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                            <IconCalendar size={16} className="text-indigo-600" />
                            {format(monthDate, "MMMM yyyy", { locale: es })}
                        </div>
                        <div className="flex flex-col gap-6">
                            {Object.entries(daysInMonth).map(([date, dayEvts]) => (
                                <div key={date} className="flex flex-col md:flex-row gap-4 md:gap-8 items-start">
                                    {/* COLUMNA FECHA */}
                                    <div className="md:w-28 shrink-0 md:sticky md:top-20 flex flex-row md:flex-col items-center md:items-start gap-2 md:gap-0">
                                        <div className="text-sm md:text-xs text-slate-400 uppercase font-bold">{format(parseISO(date), "EEE", { locale: es })}</div>
                                        <div className={`text-2xl md:text-3xl font-black leading-none ${isToday(parseISO(date)) ? "text-indigo-600" : "text-slate-800"}`}>
                                            {format(parseISO(date), "d", { locale: es })}
                                        </div>
                                        {isToday(parseISO(date)) && <span className="ml-2 md:ml-0 md:mt-1 text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">HOY</span>}
                                    </div>

                                    {/* LISTA DE EVENTOS */}
                                    <div className="flex-1 w-full space-y-3">
                                        {dayEvts.map((evt) => {
                                            const borderClass = getEventBorderColor(evt.tipos_evento?.nombre);
                                            const isMeal = [7, 8, 9, 10].includes(evt.id_tipo_evento) || evt.tipos_evento?.nombre?.toLowerCase().includes("comida");
                                            const isNonConvokedMeal = isMeal && !evt.is_convoked;
                                            const deadlineStatus = isMeal && evt.is_convoked ? getDeadlineStatus(evt.programas?.fecha_confirmacion_limite) : null;
                                            
                                            return (
                                                <div key={evt.id} className={`group relative rounded-lg border transition-all overflow-hidden ${isNonConvokedMeal ? "bg-slate-100 border-slate-100 opacity-60 grayscale-[0.8]" : "bg-white border-slate-200 shadow-sm hover:shadow-md"}`}>
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${borderClass.replace("border-", "bg-")}`}></div>
                                                    <div className="pl-4 p-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                                                        {/* HORA Y TIPO */}
                                                        <div className="flex flex-col items-center md:items-start justify-center gap-1 md:w-20 shrink-0">
                                                            <span className={`font-bold text-lg leading-none ${isNonConvokedMeal ? "text-slate-500" : "text-slate-700"}`}>
                                                                {evt.hora_inicio?.slice(0, 5)}
                                                            </span>
                                                            <span className={`text-[9px] font-black uppercase tracking-wider text-center md:text-left px-1.5 py-0.5 rounded w-full md:w-fit ${isNonConvokedMeal ? "bg-slate-200 text-slate-400" : "bg-slate-100 text-slate-400"}`}>
                                                                {evt.tipos_evento?.nombre}
                                                            </span>
                                                        </div>

                                                        {/* DETALLES */}
                                                        <div className="flex-1 min-w-0">
                                                            {!giraId && evt.programas?.nomenclador && (
                                                                <span className="inline-block mb-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                                                    {evt.programas.nomenclador}
                                                                </span>
                                                            )}
                                                            <div className="flex justify-between items-start">
                                                                <h4 className={`font-bold text-sm leading-tight truncate pr-2 ${isNonConvokedMeal ? "text-slate-500 line-through" : "text-slate-800"}`}>
                                                                    {evt.descripcion}
                                                                </h4>
                                                                {/* ACCIONES */}
                                                                <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {canEdit && (
                                                                        <>
                                                                            <button onClick={() => openEditModal(evt)} className="p-1 text-slate-300 hover:text-indigo-600"><IconEdit size={14}/></button>
                                                                            <button onClick={() => handleDelete(evt.id)} className="p-1 text-slate-300 hover:text-red-600"><IconTrash size={14}/></button>
                                                                        </>
                                                                    )}
                                                                    <CommentButton supabase={supabase} entityType="EVENTO" entityId={evt.id} onClick={() => setCommentsState({ type: "EVENTO", id: evt.id, title: evt.descripcion })} className="p-0 text-slate-300 hover:text-indigo-500"/>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                                <IconMapPin size={12}/> {evt.locaciones?.nombre || "A confirmar"}
                                                            </div>
                                                        </div>

                                                        {/* ESTADO / COMIDAS */}
                                                        <div className="w-full md:w-40 shrink-0 border-t md:border-t-0 border-slate-100 pt-2 md:pt-0">
                                                            {evt.programas?.google_drive_folder_id && !isNonConvokedMeal && (
                                                                <a href={`https://drive.google.com/drive/folders/${evt.programas.google_drive_folder_id}`} target="_blank" rel="noopener noreferrer" className="block text-right text-[10px] font-bold text-indigo-600 hover:underline mb-1">Ver Material</a>
                                                            )}
                                                            {isMeal && (
                                                                <div className="flex flex-col items-end gap-1">
                                                                    {!evt.is_convoked ? (
                                                                        <span className="flex items-center gap-1 text-[10px] text-slate-400"><IconBan size={10} /> No aplica</span>
                                                                    ) : (
                                                                        <>
                                                                            {evt.mi_asistencia === "P" && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100"><IconCheck size={10} /> Confirmado</span>}
                                                                            {evt.mi_asistencia === "A" && <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100"><IconX size={10} /> Ausente</span>}
                                                                            {!evt.mi_asistencia && <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100"><IconHelpCircle size={10} /> Pendiente</span>}
                                                                            
                                                                            {deadlineStatus?.status === 'OPEN' && (
                                                                                <div className="flex gap-1 mt-1">
                                                                                    <button onClick={() => toggleMealAttendance(evt.id, evt.mi_asistencia === 'P' ? null : 'P')} className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200"><IconCheck size={12}/></button>
                                                                                    <button onClick={() => toggleMealAttendance(evt.id, evt.mi_asistencia === 'A' ? null : 'A')} className="p-1 bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-200"><IconX size={12}/></button>
                                                                                </div>
                                                                            )}
                                                                            {deadlineStatus?.status === 'CLOSED' && !evt.mi_asistencia && <span className="text-[9px] text-red-500">Cerrado</span>}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>

        {/* MODALES */}
        <EventDetailModal isOpen={isDetailOpen} event={editingEvent} onClose={() => { setIsDetailOpen(false); setEditingEvent(null); }} onSave={handleUpdateEvent} />
        
        {isCreating && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                <EventForm 
                    formData={newFormData} setFormData={setNewFormData} 
                    onSave={handleCreateSave} onClose={() => setIsCreating(false)} 
                    loading={false} eventTypes={[]} locations={[]} isNew={true} // Se pueden pasar catálogos reales si se desea
                />
            </div>
        )}

        {commentsState && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]" onClick={() => setCommentsState(null)}>
                <div onClick={(e) => e.stopPropagation()} className="h-full">
                    <CommentsManager supabase={supabase} entityType={commentsState.type} entityId={commentsState.id} title={commentsState.title} onClose={() => setCommentsState(null)} />
                </div>
            </div>
        )}
    </div>
  );
}