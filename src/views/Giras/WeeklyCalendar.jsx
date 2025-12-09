// src/views/Giras/WeeklyCalendar.jsx
import React, { useState, useMemo, useEffect } from "react";
import {
  processEventsForLayout,
  getTopPercent,
  getHeightPercent,
} from "../../utils/calendarLayout";
import {
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconX,
  IconLoader,
  IconMapPin,
  IconCalendar,
  IconClock,
  IconMusic, // Importado para el ícono de drive, aunque se usa un SVG, lo mantengo por si se usa en otro lado
} from "../../components/ui/Icons";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";
import CommentsManager from "../../components/comments/CommentsManager";
import CommentButton from "../../components/comments/CommentButton";
import EventForm from "../../components/forms/EventForm";

// --- SUBCOMPONENTE DE MODAL DE LECTURA DE EVENTO CON DETALLES ---
const ReadOnlyEventDetailModal = ({
  eventDetails,
  onClose,
  onEdit,
  onComment,
  isEditor,
  tour,
  loading,
}) => {
  if (loading || !eventDetails) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <IconLoader className="animate-spin text-white" size={36} />
      </div>
    );
  }

  const startTime = eventDetails.hora_inicio
    ? eventDetails.hora_inicio.slice(0, 5)
    : "N/A";
  const endTime = eventDetails.hora_fin
    ? eventDetails.hora_fin.slice(0, 5)
    : "N/A";

  // Usamos el tipo de evento real del fetch secundario
  const typeName =
    eventDetails.tipos_evento?.nombre || eventDetails.eventType || "Evento";
  const colorClass = eventDetails.eventType
    ? ReadOnlyEventDetailModal.getEventColorClass(typeName)
    : "bg-indigo-400 text-indigo-900 border-indigo-500";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className={`bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col border-l-8 border-l-4 ${
          colorClass.split(" ").find((c) => c.startsWith("border-")) ||
          "border-slate-200"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header/Title Block */}
        <div className="p-4 flex justify-between items-start">
          <div className="flex-1 pr-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {eventDetails.programLabel}
            </span>
            <h2 className="text-xl font-bold mt-1 text-slate-800 leading-tight">
              {eventDetails.descripcion || eventDetails.title}{" "}
              {/* Usamos la descripción real */}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Gira: {tour?.nombre_gira || eventDetails.programName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Details Section */}
        <div className="p-4 pt-0 space-y-2 text-sm text-slate-700">
          <div className="flex items-center gap-3">
            <IconCalendar size={16} className="text-slate-400" />{" "}
            {eventDetails.fecha}
          </div>
          <div className="flex items-center gap-3">
            <IconClock size={16} className="text-slate-400" /> {startTime} -{" "}
            {endTime} hs
          </div>
          <div className="flex items-center gap-3">
            <IconMapPin size={16} className="text-slate-400" />{" "}
            {eventDetails.location || "Ubicación a confirmar"}
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="p-3 bg-slate-50 border-t flex justify-between items-center">
          {/* BOTÓN DE PARTITURAS AÑADIDO */}
          {tour?.google_drive_folder_id && (
            <a
              href={`https://drive.google.com/drive/folders/${tour.google_drive_folder_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 text-xs font-bold hover:bg-indigo-100 transition-colors"
            >
              {/* SVG de Partituras (Drive) */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z" />
              </svg>
              Partituras
            </a>
          )}
          {/* Contenedor para acciones de edición/comentarios */}
          <div className="flex gap-2 items-center ml-auto">
            {isEditor && (
              <button
                onClick={onEdit}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm text-xs font-bold transition-transform active:scale-95"
              >
                <IconEdit size={14} /> EDITAR DETALLES
              </button>
            )}
            {isEditor && (
              <CommentButton
                supabase={supabase}
                entityType="EVENTO"
                entityId={eventDetails.id}
                onClick={onComment}
                className="p-0.5"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Adjuntar la lógica de colores (para que la modal la pueda usar)
ReadOnlyEventDetailModal.getEventColorClass = (typeName) => {
  const t = (typeName || "").toLowerCase();
  if (t.includes("concierto") || t.includes("función"))
    return "bg-amber-400 text-amber-900 border-amber-500 hover:bg-amber-300";
  if (t.includes("general"))
    return "bg-rose-400 text-rose-900 border-rose-500 hover:bg-rose-300";
  if (t.includes("ensayo") || t.includes("parcial"))
    return "bg-slate-400 text-slate-900 border-slate-500 hover:bg-slate-300";
  if (t.includes("viaje") || t.includes("salida"))
    return "bg-blue-400 text-blue-900 border-blue-500 hover:bg-blue-300";
  return "bg-indigo-400 text-indigo-900 border-indigo-500 hover:bg-indigo-300";
};

export default function WeeklyCalendar({
  rawEvents = [],
  tours = [],
  updateEventInSupabase,
}) {
  const { user, isEditor } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState(null); // Objeto ligero de GirasView
  const [selectedEventDetails, setSelectedEventDetails] = useState(null); // Objeto completo del DB
  const [loadingDetails, setLoadingDetails] = useState(false); // Estado de carga del fetch secundario
  const [currentDate, setCurrentDate] = useState(new Date());
  // Estados para Edición y Comentarios
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [eventTypes, setEventTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [commentsState, setCommentsState] = useState(null);

  const [filters, setFilters] = useState({
    Sinfónico: true,
    Camerata: true,
    Ensamble: true,
    Otros: true,
  });

  // --- LÓGICA DE COLORES UNIFICADA (DENTRO DEL COMPONENTE) ---
  const getEventColorClass = (typeName) => {
    const t = (typeName || "").toLowerCase();
    if (t.includes("concierto") || t.includes("función"))
      return "bg-amber-400 text-amber-900 border-amber-500 hover:bg-amber-300";
    if (t.includes("general"))
      return "bg-rose-400 text-rose-900 border-rose-500 hover:bg-rose-300";
    if (t.includes("ensayo") || t.includes("parcial"))
      return "bg-slate-400 text-slate-900 border-slate-500 hover:bg-slate-300";
    if (t.includes("viaje") || t.includes("salida"))
      return "bg-blue-400 text-blue-900 border-blue-500 hover:bg-blue-300";
    return "bg-indigo-400 text-indigo-900 border-indigo-500 hover:bg-indigo-300";
  };

  const getTourColorClass = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("sinfón"))
      return "bg-indigo-500 text-white border-indigo-600";
    if (t.includes("camerata"))
      return "bg-fuchsia-500 text-white border-fuchsia-600";
    if (t.includes("ensamble"))
      return "bg-emerald-500 text-white border-emerald-600";
    return "bg-slate-500 text-white border-slate-600";
  };
  // -------------------------------------------------------------------

  // Efecto para cargar detalles del evento seleccionado
  useEffect(() => {
    if (selectedEvent) {
      fetchEventDetails(selectedEvent.id);
    } else {
      setSelectedEventDetails(null);
    }
  }, [selectedEvent]);

  const fetchEventDetails = async (eventId) => {
    setLoadingDetails(true);
    // Traemos todos los campos necesarios para la card y la edición
    const { data: fullEvt } = await supabase
      .from("eventos")
      .select(`*, tipos_evento(nombre)`)
      .eq("id", eventId)
      .single();

    if (fullEvt) {
      // Buscamos el contexto ligero (programLabel, giraId) del rawEvents
      const context = normalizedEvents.find((e) => e.id === eventId);
      setSelectedEventDetails({ ...context, ...fullEvt, fecha: fullEvt.fecha });
    }
    setLoadingDetails(false);
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    const { data: types } = await supabase
      .from("tipos_evento")
      .select("id, nombre")
      .order("nombre");
    const { data: locs } = await supabase
      .from("locaciones")
      .select("id, nombre")
      .order("nombre");

    if (types) setEventTypes(types);
    if (locs) setLocations(locs);
  };

  const handleEditEvent = async (event) => {
    if (!isEditor) return;
    setLoadingModal(true);
    setSelectedEvent(null); // Close read-only modal

    // Fetch the complete event data (redundante si selectedEventDetails ya está cargado, pero más seguro)
    const { data: fullEvt } = await supabase
      .from("eventos")
      .select("*")
      .eq("id", event.id)
      .single();

    if (fullEvt) {
      setEditFormData({
        id: fullEvt.id,
        descripcion: fullEvt.descripcion || "",
        fecha: fullEvt.fecha || "",
        hora_inicio: fullEvt.hora_inicio || "",
        hora_fin: fullEvt.hora_fin || "",
        id_tipo_evento: fullEvt.id_tipo_evento || "",
        id_locacion: fullEvt.id_locacion || "",
      });
      setShowEditModal(true);
    }
    setLoadingModal(false);
  };

  const handleSaveEdit = async () => {
    if (!editFormData.fecha || !editFormData.hora_inicio)
      return alert("Fecha y Hora Inicio son requeridas");

    setLoadingModal(true);
    try {
      const payload = {
        descripcion: editFormData.descripcion.trim() || null,
        fecha: editFormData.fecha,
        hora_inicio: editFormData.hora_inicio,
        hora_fin: editFormData.hora_fin.trim() || editFormData.hora_inicio,
        id_tipo_evento: editFormData.id_tipo_evento || null,
        id_locacion: editFormData.id_locacion || null,
      };

      const { error } = await supabase
        .from("eventos")
        .update(payload)
        .eq("id", editFormData.id);
      if (error) throw error;

      setShowEditModal(false);
      setEditFormData({});

      // Llamar a la función del padre para recargar la vista (Actualizar GirasView)
      if (updateEventInSupabase) {
        await updateEventInSupabase({
          id: editFormData.id,
          start: editFormData.fecha + "T" + editFormData.hora_inicio,
          end:
            editFormData.fecha +
            "T" +
            (editFormData.hora_fin || editFormData.hora_inicio),
        });
      }
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Error al guardar evento: " + error.message);
    } finally {
      setLoadingModal(false);
    }
  };

  const handleCommentOpen = (event) => {
    setSelectedEvent(null); // Close read-only modal
    setCommentsState({
      type: "EVENTO",
      id: event.id,
      title: event.descripcion || event.programLabel,
    });
  };

  // --- CALCULAR DÍAS DE LA SEMANA ---
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // --- PROCESAR GIRAS (TOURS) DE LA SEMANA ---
  const weekTours = useMemo(() => {
    if (!tours || tours.length === 0) return { tours: [], totalRows: 0 };

    const weekStart = new Date(weekDays[0]);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekDays[6]);
    weekEnd.setHours(23, 59, 59, 999);

    const activeTours = tours.filter((t) => {
      let typeKey = "Otros";
      const tType = (t.tipo || "").toLowerCase();
      if (tType.includes("sinf")) typeKey = "Sinfónico";
      else if (tType.includes("camerata")) typeKey = "Camerata";
      else if (tType.includes("ensamble")) typeKey = "Ensamble";

      if (!filters[typeKey]) return false;

      const tStart = new Date(t.fecha_desde);
      const tEnd = new Date(t.fecha_hasta);
      tEnd.setHours(23, 59, 59, 999);

      return tStart <= weekEnd && tEnd >= weekStart;
    });

    activeTours.sort(
      (a, b) => new Date(a.fecha_desde) - new Date(b.fecha_desde)
    );

    const processed = activeTours.map((tour) => {
      const tStart = new Date(tour.fecha_desde + "T00:00:00");
      const tEnd = new Date(tour.fecha_hasta + "T23:59:59");

      const effectiveStart = tStart < weekStart ? weekStart : tStart;
      const effectiveEnd = tEnd > weekEnd ? weekEnd : tEnd;

      const diffStart = Math.floor(
        (effectiveStart - weekStart) / (1000 * 60 * 60 * 24)
      );
      const diffEnd = Math.floor(
        (effectiveEnd - weekStart) / (1000 * 60 * 60 * 24)
      );
      const startIdx = Math.max(0, diffStart);
      const endIdx = Math.min(6, diffEnd);
      const duration = endIdx - startIdx + 1;

      return {
        ...tour,
        startIdx,
        duration,
        leftPercent: (startIdx / 7) * 100,
        widthPercent: (duration / 7) * 100,
      };
    });

    const rows = [];
    processed.forEach((tour) => {
      let placed = false;
      for (let i = 0; i < rows.length; i++) {
        const clash = rows[i].some((existing) => {
          const startA = tour.startIdx;
          const endA = tour.startIdx + tour.duration;
          const startB = existing.startIdx;
          const endB = existing.startIdx + existing.duration;
          return startA < endB && endA > startB;
        });
        if (!clash) {
          rows[i].push(tour);
          tour.rowIndex = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        rows.push([tour]);
        tour.rowIndex = rows.length - 1;
      }
    });

    return { tours: processed, totalRows: rows.length };
  }, [tours, weekDays, filters]);

  // --- RENDERS ---
  const renderDayColumn = (dayDate) => {
    const dayEvents = normalizedEvents.filter((evt) => {
      return (
        evt.startObj.toDateString() === dayDate.toDateString() &&
        filters[evt.programType]
      );
    });
    const layoutEvents = processEventsForLayout(dayEvents);
    const isToday = dayDate.toDateString() === new Date().toDateString();

    return (
      <div
        key={dayDate.toISOString()}
        className={`flex-1 border-r border-slate-100 relative min-w-[80px] ${
          isToday ? "bg-indigo-50/30" : "bg-white"
        }`}
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-full border-b border-slate-50"
            style={{ top: `${(i / 24) * 100}%`, height: `${(1 / 24) * 100}%` }}
          />
        ))}

        {layoutEvents.map((event) => {
          const top = getTopPercent(event.start);
          const height = getHeightPercent(event.start, event.end);
          const colorClass = getEventColorClass(
            event.eventType || event.subtitle
          );

          return (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className={`absolute rounded border p-1 text-[10px] leading-tight cursor-pointer hover:z-50 hover:shadow-md transition-all overflow-hidden select-none ${colorClass}`}
              style={{
                top: `${top}%`,
                height: `${height}%`,
                left: `${event.left}%`,
                width: `${event.width}%`,
                maxWidth: `${event.width - 2}%`,
                zIndex: 10,
              }}
            >
              {height > 4 && (
                <div className="font-black opacity-60 uppercase truncate tracking-tighter">
                  {event.programLabel}
                </div>
              )}
              <div className="font-bold truncate">{event.title}</div>
              {height > 8 && event.location && (
                <div className="truncate opacity-80 italic">
                  {event.location}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const weekRangeLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    const m1 = first.toLocaleDateString("es-AR", { month: "short" });
    const m2 = last.toLocaleDateString("es-AR", { month: "short" });
    if (m1 === m2) return `${m1} ${first.getDate()} - ${last.getDate()}`;
    return `${m1} ${first.getDate()} - ${m2} ${last.getDate()}`;
  }, [weekDays]);

  const normalizedEvents = useMemo(() => {
    if (!rawEvents || !Array.isArray(rawEvents)) return [];
    return rawEvents.map((evt) => {
      let pType = evt.programType || "Otros";
      if (pType.toLowerCase().includes("sinf")) pType = "Sinfónico";
      else if (pType.toLowerCase().includes("camerata")) pType = "Camerata";
      else if (pType.toLowerCase().includes("ensamble")) pType = "Ensamble";
      return {
        ...evt,
        programType: pType,
        programLabel: evt.programLabel || evt.title,
        startObj: new Date(evt.start),
      };
    });
  }, [rawEvents]);

  const changeWeek = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + offset * 7);
    setCurrentDate(newDate);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 overflow-hidden">
      {/* HEADER NAVEGACIÓN (Omitted) */}
      <div className="px-4 py-2 border-b flex justify-between items-center bg-white shadow-sm z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeWeek(-1)}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition"
          >
            <IconChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition"
          >
            Hoy
          </button>
          <button
            onClick={() => changeWeek(1)}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition"
          >
            <IconChevronRight size={20} />
          </button>
          <span className="text-sm font-bold text-slate-800 ml-2 capitalize tracking-tight">
            {weekRangeLabel}
          </span>
        </div>
        <div className="flex gap-1.5">
          {Object.keys(filters).map((type) => (
            <label
              key={type}
              className={`cursor-pointer px-2 py-1 rounded text-[10px] font-bold border select-none transition ${
                filters[type]
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-400 border-slate-200"
              }`}
            >
              <input
                type="checkbox"
                checked={filters[type]}
                onChange={() => setFilters((p) => ({ ...p, [type]: !p[type] }))}
                className="hidden"
              />
              {type.toUpperCase().slice(0, 4)}
            </label>
          ))}
        </div>
      </div>

      {/* CABECERA DÍAS (Omitted) */}
      <div className="flex border-b bg-slate-50 z-20 ml-10">
        {weekDays.map((d) => {
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div
              key={d.toString()}
              className={`flex-1 text-center py-2 border-r border-slate-200 ${
                isToday ? "bg-indigo-50" : ""
              }`}
            >
              <div
                className={`text-[10px] font-black uppercase tracking-wider ${
                  isToday ? "text-indigo-600" : "text-slate-400"
                }`}
              >
                {d.toLocaleDateString("es-AR", { weekday: "short" })}
              </div>
              <div
                className={`text-base font-bold ${
                  isToday ? "text-indigo-700" : "text-slate-700"
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- SECCIÓN GIRAS (ALL-DAY) --- */}
      {weekTours.tours.length > 0 && (
        <div className="flex border-b border-slate-200 bg-white">
          <div className="w-10 flex-shrink-0 border-r border-slate-200 bg-slate-50 flex items-center justify-center">
            <span className="text-[8px] font-black text-slate-400 -rotate-90 uppercase tracking-widest">
              Giras
            </span>
          </div>
          <div
            className="flex-1 relative transition-all duration-300"
            style={{ height: `${(weekTours.totalRows || 1) * 28 + 4}px` }}
          >
            {weekTours.tours.map((tour) => (
              <div
                key={tour.id}
                className={`absolute h-6 rounded px-2 text-[10px] font-bold text-white shadow-sm flex items-center truncate border ${getTourColorClass(
                  tour.tipo
                )}`}
                style={{
                  top: `${tour.rowIndex * 28 + 2}px`,
                  left: `${tour.leftPercent}%`,
                  width: `${tour.widthPercent}%`,
                  maxWidth: `${tour.widthPercent - 0.5}%`,
                }}
                title={tour.nombre_gira}
              >
                {`${tour.nomenclador} - ${tour.nombre_gira}`}{" "}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CUERPO DEL CALENDARIO (Auto Height) */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* Eje Y: Horas */}
        <div className="w-10 border-r border-slate-200 bg-white flex flex-col justify-between text-[9px] text-slate-400 font-medium py-1 select-none">
          {hours.map((h) => (
            <div
              key={h}
              className="flex-1 flex items-start justify-end pr-1.5 -mt-1.5"
            >
              {h}:00
            </div>
          ))}
        </div>
        {/* Columnas Días */}
        <div className="flex-1 flex relative">
          {weekDays.map((day) => renderDayColumn(day))}
        </div>
      </div>

      {/* 1. MODAL DE VISTA LECTURA / DETALLE */}
      {selectedEvent && (
        <ReadOnlyEventDetailModal
          eventDetails={selectedEventDetails}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => handleEditEvent(selectedEvent)}
          onComment={() => handleCommentOpen(selectedEvent)}
          isEditor={isEditor}
          tour={tours.find((t) => t.id === selectedEvent.giraId)}
          loading={loadingDetails}
        />
      )}

      {/* 2. MODAL DE EDICIÓN */}
      {showEditModal && isEditor && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <EventForm
            formData={editFormData}
            setFormData={setEditFormData}
            onSave={handleSaveEdit}
            onClose={() => setShowEditModal(false)}
            loading={loadingModal}
            eventTypes={eventTypes}
            locations={locations}
            isNew={false}
          />
        </div>
      )}

      {/* 3. PANEL LATERAL DE COMENTARIOS */}
      {commentsState && isEditor && (
        <div
          className="fixed inset-0 z-[70] flex justify-end bg-black/20 backdrop-blur-[1px]"
          onClick={() => setCommentsState(null)}
        >
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