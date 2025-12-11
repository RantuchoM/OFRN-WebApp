import React, { useState, useEffect } from "react";
import { format, startOfDay, addMonths, parseISO, isToday } from "date-fns";
import { es } from "date-fns/locale";
import {
  IconMapPin,
  IconLoader,
  IconCalendar,
  IconCheck,
  IconX,
  IconHelpCircle,
  IconUtensils,
  IconBan,
  IconEdit,  // <--- NUEVO
  IconTrash, // <--- NUEVO
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import CommentsManager from "../../components/comments/CommentsManager";
import CommentButton from "../../components/comments/CommentButton";
// IMPORTE DEL MODAL
import EventDetailModal from "../Giras/EventDetailModal"; 

export default function AgendaGeneral({ supabase }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para comentarios y edición
  const [commentsState, setCommentsState] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [userProfile, setUserProfile] = useState(null);

  // Determinar si tiene permisos de edición
  const canEdit = ["admin", "editor", "coord_general", "director"].includes(user?.rol_sistema);

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

  useEffect(() => {
    if (userProfile) {
      fetchContinuousAgenda();
    }
  }, [userProfile]);

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

  const fetchContinuousAgenda = async () => {
    setLoading(true);
    const start = startOfDay(new Date()).toISOString();
    const end = addMonths(new Date(), 12).toISOString();

    try {
      const userRole = user?.rol_sistema || "";
      const isPersonal = userRole === "consulta_personal" || userRole === "personal";

      let myEnsembles = new Set();
      userProfile.integrantes_ensambles?.forEach((ie) => myEnsembles.add(ie.id_ensamble));
      const myFamily = userProfile.instrumentos?.familia;

      const { data: eventsData, error } = await supabase
        .from("eventos")
        .select(
          `
            id, fecha, hora_inicio, hora_fin, descripcion, convocados, id_tipo_evento,
            tipos_evento (nombre, color), locaciones (nombre),
            programas (
                id, nombre_gira, nomenclador, google_drive_folder_id, 
                giras_fuentes(tipo, valor_id, valor_texto), 
                giras_integrantes(id_integrante, estado, rol)
            )
          `
        )
        .gte("fecha", start)
        .lte("fecha", end)
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });

      if (error) throw error;

      const visibleEvents = (eventsData || []).filter((item) => {
        if (!isPersonal) return true;
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- NUEVAS FUNCIONES DE EDICIÓN Y BORRADO ---

  const handleDelete = async (eventId) => {
    if (!window.confirm("¿Seguro que deseas eliminar este evento? Esta acción no se puede deshacer.")) return;
    
    try {
        const { error } = await supabase.from("eventos").delete().eq("id", eventId);
        if (error) throw error;
        // Recargar lista
        fetchContinuousAgenda();
    } catch (error) {
        alert("Error al eliminar: " + error.message);
    }
  };

  const openEditModal = (evt) => {
      // Transformamos el evento de Supabase al formato que espera el Modal (React Big Calendar style)
      const startIso = `${evt.fecha}T${evt.hora_inicio}`;
      // Si no hay hora fin, asumimos 2 horas después o la misma hora
      const endIso = evt.hora_fin ? `${evt.fecha}T${evt.hora_fin}` : startIso;

      const modalData = {
          id: evt.id,
          title: evt.descripcion,
          start: startIso,
          end: endIso,
          location: evt.locaciones?.nombre,
          programType: evt.tipos_evento?.nombre,
          programLabel: evt.programas?.nombre_gira,
          giraId: evt.programas?.id,
          subtitle: evt.programas?.nomenclador
      };

      setEditingEvent(modalData);
      setIsModalOpen(true);
  };

  const handleUpdateEvent = async (formData) => {
      try {
          // Transformamos de vuelta del formato Modal a Supabase (fecha y hora separados)
          const fecha = formData.start.split('T')[0];
          const hora_inicio = formData.start.split('T')[1]?.slice(0,5); // HH:mm
          const hora_fin = formData.end.split('T')[1]?.slice(0,5); // HH:mm

          const updates = {
              fecha,
              hora_inicio,
              hora_fin,
              descripcion: formData.title,
              // Nota: location es string en el modal, pero id_locacion en DB. 
              // Si EventDetailModal solo edita el texto 'location', no guardamos id_locacion a menos que cambiemos el modal
              // Para este ejemplo asumimos que solo actualizamos título y horas.
          };

          const { error } = await supabase.from("eventos").update(updates).eq("id", formData.id);
          if (error) throw error;
          
          setIsModalOpen(false);
          setEditingEvent(null);
          fetchContinuousAgenda();
      } catch (error) {
          alert("Error al actualizar: " + error.message);
      }
  };

  // ---------------------------------------------

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

  return (
    <div className="p-4 space-y-8 pb-20 animate-in fade-in bg-slate-50 min-h-full">
      {loading && (
        <div className="text-center py-10">
          <IconLoader className="animate-spin inline text-indigo-500" size={30} />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center text-slate-400 py-10 italic">
          No hay eventos próximos agendados.
        </div>
      )}

      {Object.entries(groupedByMonth).map(([monthKey, monthEvents]) => {
        const monthDate = parseISO(monthEvents[0].fecha);
        const daysInMonth = monthEvents.reduce((acc, evt) => {
          const dKey = evt.fecha;
          if (!acc[dKey]) acc[dKey] = [];
          acc[dKey].push(evt);
          return acc;
        }, {});

        return (
          <div key={monthKey} className="relative max-w-5xl mx-auto">
            <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur py-3 border-b border-slate-200 mb-6 text-slate-600 font-bold uppercase tracking-wider text-sm flex items-center gap-2 shadow-sm">
              <IconCalendar size={16} className="text-indigo-600" />
              {format(monthDate, "MMMM yyyy", { locale: es })}
            </div>

            <div className="flex flex-col gap-8">
              {Object.entries(daysInMonth).map(([date, dayEvts]) => (
                <div key={date} className="flex flex-col md:flex-row gap-4 md:gap-8 items-start">
                  
                  {/* FECHA */}
                  <div className="md:w-32 shrink-0 md:sticky md:top-20 flex flex-row md:flex-col items-center md:items-start gap-2 md:gap-0">
                    <div className="text-sm md:text-xs text-slate-400 uppercase font-bold">
                      {format(parseISO(date), "EEE", { locale: es })}
                    </div>
                    <div className={`text-2xl md:text-3xl font-black leading-none ${isToday(parseISO(date)) ? "text-indigo-600" : "text-slate-800"}`}>
                      {format(parseISO(date), "d", { locale: es })}
                    </div>
                    {isToday(parseISO(date)) && (
                      <span className="ml-2 md:ml-0 md:mt-1 text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">HOY</span>
                    )}
                  </div>

                  {/* EVENTOS */}
                  <div className="flex-1 w-full space-y-3">
                    {dayEvts.map((evt) => {
                      const borderClass = getEventBorderColor(evt.tipos_evento?.nombre);
                      const isMeal = [7, 8, 9, 10].includes(evt.id_tipo_evento) || evt.tipos_evento?.nombre?.toLowerCase().includes("comida");
                      const isNonConvokedMeal = isMeal && !evt.is_convoked;

                      return (
                        <div key={evt.id} className={`group relative rounded-lg border transition-all overflow-hidden ${isNonConvokedMeal ? "bg-slate-100 border-slate-100 opacity-60 hover:opacity-100 grayscale-[0.8] hover:grayscale-0" : "bg-white border-slate-200 shadow-sm hover:shadow-md"}`}>
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${borderClass.replace("border-", "bg-")}`}></div>

                          <div className="pl-4 p-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                            
                            {/* HORA Y TIPO */}
                            <div className="flex flex-col items-center md:items-start justify-center gap-1 md:w-24 shrink-0 border-r border-slate-200 pr-3 md:border-none md:pr-0">
                              <span className={`font-bold text-lg leading-none ${isNonConvokedMeal ? "text-slate-500" : "text-slate-700"}`}>
                                {evt.hora_inicio?.slice(0, 5)}
                              </span>
                              <span className={`text-[9px] font-black uppercase tracking-wider text-center md:text-left px-1.5 py-0.5 rounded w-full md:w-fit ${isNonConvokedMeal ? "bg-slate-200 text-slate-400" : "bg-slate-100 text-slate-400"}`}>
                                {evt.tipos_evento?.nombre}
                              </span>
                            </div>

                            {/* INFO PRINCIPAL */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-0.5">
                                {evt.programas?.nomenclador && (
                                  <span className="font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                    {evt.programas.nomenclador}
                                  </span>
                                )}
                                <span className="truncate font-medium cursor-default" title={evt.programas?.nombre_gira}>
                                  {evt.programas?.nombre_gira}
                                </span>
                              </div>

                              <div className="flex items-start justify-between gap-2">
                                <h4 className={`font-bold text-sm md:text-base leading-tight truncate pr-2 ${isNonConvokedMeal ? "text-slate-500 line-through decoration-slate-300" : "text-slate-800"}`} title={evt.descripcion}>
                                  {evt.descripcion}
                                </h4>
                                
                                {/* --- ACCIONES (EDITAR / BORRAR / COMENTAR) --- */}
                                <div className="flex items-center gap-1 shrink-0">
                                    {canEdit && (
                                        <>
                                            <button 
                                                onClick={() => openEditModal(evt)}
                                                className="p-1 text-slate-300 hover:text-indigo-600 transition-colors"
                                                title="Editar Evento"
                                            >
                                                <IconEdit size={14}/>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(evt.id)}
                                                className="p-1 text-slate-300 hover:text-red-600 transition-colors"
                                                title="Eliminar Evento"
                                            >
                                                <IconTrash size={14}/>
                                            </button>
                                            <div className="w-px h-3 bg-slate-200 mx-1"></div>
                                        </>
                                    )}
                                    <CommentButton
                                        supabase={supabase}
                                        entityType="EVENTO"
                                        entityId={evt.id}
                                        onClick={() => setCommentsState({ type: "EVENTO", id: evt.id, title: evt.descripcion })}
                                        className="p-0 text-slate-300 hover:text-indigo-500"
                                    />
                                </div>
                              </div>
                            </div>

                            {/* ESTADO / INFO SECUNDARIA */}
                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 md:gap-0.5 w-full md:w-48 shrink-0 border-t md:border-t-0 border-slate-100 pt-2 md:pt-0 mt-1 md:mt-0">
                              <div className="flex items-center gap-1 text-xs text-slate-500 truncate max-w-[150px]">
                                <IconMapPin size={12} className="shrink-0" />
                                <span className="truncate" title={evt.locaciones?.nombre}>
                                  {evt.locaciones?.nombre || "A confirmar"}
                                </span>
                              </div>

                              {evt.programas?.google_drive_folder_id && !isNonConvokedMeal && (
                                <a href={`https://drive.google.com/drive/folders/${evt.programas.google_drive_folder_id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-indigo-600 hover:underline">
                                  Ver Material
                                </a>
                              )}

                              {isMeal && (
                                <div className="md:mt-1">
                                  {!evt.is_convoked ? (
                                    <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-transparent px-2 py-0.5 rounded cursor-help" title="No aplica">
                                      <IconBan size={10} /> No convocada
                                    </span>
                                  ) : (
                                    <>
                                      {evt.mi_asistencia === "P" && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100"><IconCheck size={10} /> Presente</span>}
                                      {evt.mi_asistencia === "A" && <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100"><IconX size={10} /> Ausente</span>}
                                      {!evt.mi_asistencia && <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100"><IconHelpCircle size={10} /> Sin confirmar</span>}
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

      {/* RENDERIZADO DEL MODAL */}
      <EventDetailModal 
        isOpen={isModalOpen}
        event={editingEvent}
        onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}
        onSave={handleUpdateEvent}
      />

      {commentsState && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]" onClick={() => setCommentsState(null)}>
          <div onClick={(e) => e.stopPropagation()} className="h-full">
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