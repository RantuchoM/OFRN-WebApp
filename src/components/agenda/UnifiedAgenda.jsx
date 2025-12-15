// src/components/agenda/UnifiedAgenda.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  format,
  startOfDay,
  addMonths,
  parseISO,
  isToday,
  differenceInHours,
  differenceInDays,
  isPast,
} from "date-fns";
import { es } from "date-fns/locale";
// ASEGÚRATE DE TENER ESTOS ÍCONOS O SUSTITÚYELOS POR LOS QUE TENGAS
import {
  IconMapPin,
  IconLoader,
  IconCalendar,
  IconCheck,
  IconX,
  IconEdit,
  IconArrowLeft,
  IconPlus,
  IconFilter,
  IconDrive,
  IconList, // IconList usado para repertorio
} from "../ui/Icons";
import { useAuth } from "../../context/AuthContext";
import CommentsManager from "../comments/CommentsManager";
import CommentButton from "../comments/CommentButton";
import EventDetailModal from "../../views/Giras/EventDetailModal";
import EventForm from "../forms/EventForm";

// --- LÓGICA DE FECHA LÍMITE (Sin cambios) ---
const getDeadlineStatus = (deadlineISO) => {
  if (!deadlineISO) return { status: "NO_DEADLINE" };
  const deadline = parseISO(deadlineISO);
  const now = new Date();
  if (isPast(deadline)) return { status: "CLOSED", message: "Cerrado" };
  const diffDays = differenceInDays(deadline, now);
  const diffHours = differenceInHours(deadline, now);
  if (diffDays > 0)
    return { status: "OPEN", message: `${diffDays}d restantes` };
  return { status: "OPEN", message: `${diffHours}h restantes` };
};

// Hooks para click outside del filtro
function useOutsideAlerter(ref, callback) {
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, callback]);
}

export default function UnifiedAgenda({
  supabase,
  giraId = null,
  onBack = null,
  title = "Agenda General",
  onOpenRepertoire = null, // NUEVO PROP: Función para navegar al repertorio
}) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- ESTADOS PARA FILTROS ---
  const [availableTypes, setAvailableTypes] = useState([]); // Lista de objetos {id, nombre, color}
  const [selectedTypeIds, setSelectedTypeIds] = useState([]); // Array de IDs seleccionados
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);
  useOutsideAlerter(filterRef, () => setIsFilterOpen(false));

  // Estados para modales
  const [commentsState, setCommentsState] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFormData, setNewFormData] = useState({});
  const [userProfile, setUserProfile] = useState(null);

  const canEdit = ["admin", "editor", "coord_general", "director"].includes(
    user?.rol_sistema
  );

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

  // Cargar Agenda
  useEffect(() => {
    if (userProfile) fetchAgenda();
  }, [userProfile, giraId]);

  // --- LÓGICA DE FILTRADO ---
  const handleTypeToggle = (typeId) => {
    setSelectedTypeIds((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleSelectAllTypes = (selectAll) => {
    setSelectedTypeIds(selectAll ? availableTypes.map((t) => t.id) : []);
  };

  // Aplicar filtro a los items
  const filteredItems = items.filter((item) =>
    selectedTypeIds.includes(item.id_tipo_evento)
  );

  // --- FUNCIONES PRINCIPALES ---
  const checkIsConvoked = (convocadosList, tourRole) => {
    // (Lógica de convocados sin cambios...)
    if (!convocadosList || convocadosList.length === 0) return false;
    return convocadosList.some((tag) => {
      if (tag === "GRP:TUTTI") return true;
      if (tag === "GRP:LOCALES") return userProfile.is_local;
      if (tag === "GRP:NO_LOCALES") return !userProfile.is_local;
      if (tag === "GRP:PRODUCCION") return tourRole === "produccion";
      if (tag === "GRP:SOLISTAS") return tourRole === "solista";
      if (tag === "GRP:DIRECTORES") return tourRole === "director";
      if (tag.startsWith("LOC:"))
        return userProfile.id_localidad === parseInt(tag.split(":")[1]);
      if (tag.startsWith("FAM:"))
        return userProfile.instrumentos?.familia === tag.split(":")[1];
      return false;
    });
  };

  const fetchAgenda = async () => {
    setLoading(true);
    const start = startOfDay(new Date()).toISOString();
    const end = addMonths(new Date(), 12).toISOString();

    try {
      const userRole = user?.rol_sistema || "";
      const isPersonal =
        userRole === "consulta_personal" || userRole === "personal";
      let myEnsembles = new Set();
      userProfile.integrantes_ensambles?.forEach((ie) =>
        myEnsembles.add(ie.id_ensamble)
      );
      const myFamily = userProfile.instrumentos?.familia;

      let query = supabase
        .from("eventos")
        .select(
          `
            id, fecha, hora_inicio, hora_fin, descripcion, convocados, id_tipo_evento, id_locacion,
            tipos_evento (id, nombre, color), locaciones (id, nombre),
            programas (
                id, nombre_gira, nomenclador, google_drive_folder_id, mes_letra,
                fecha_confirmacion_limite,
                giras_fuentes(tipo, valor_id, valor_texto), 
                giras_integrantes(id_integrante, estado, rol)
            )
        `
        )
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });

      if (giraId) {
        query = query.eq("id_gira", giraId);
      } else {
        query = query.gte("fecha", start).lte("fecha", end);
      }

      const { data: eventsData, error } = await query;
      if (error) throw error;

      const visibleEvents = (eventsData || []).filter((item) => {
        // (Logica de filtrado personal sin cambios...)
        if (giraId) return true;
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

      // --- EXTRAER TIPOS ÚNICOS PARA EL FILTRO ---
      const typesMap = {};
      visibleEvents.forEach((evt) => {
        if (evt.tipos_evento && !typesMap[evt.tipos_evento.id]) {
          typesMap[evt.tipos_evento.id] = evt.tipos_evento;
        }
      });
      const uniqueTypes = Object.values(typesMap).sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      );
      setAvailableTypes(uniqueTypes);
      // Si es la primera carga, seleccionar todos
      if (selectedTypeIds.length === 0 && uniqueTypes.length > 0) {
        setSelectedTypeIds(uniqueTypes.map((t) => t.id));
      }
      // -------------------------------------------

      if (visibleEvents.length > 0) {
        const eventIds = visibleEvents.map((e) => e.id);
        const { data: attendanceData } = await supabase
          .from("eventos_asistencia")
          .select("id_evento, estado")
          .in("id_evento", eventIds)
          .eq("id_integrante", user.id);

        const attendanceMap = {};
        attendanceData?.forEach((a) => {
          attendanceMap[a.id_evento] = a.estado;
        });

        visibleEvents.forEach((evt) => {
          evt.mi_asistencia = attendanceMap[evt.id];
          const myTourRecord = evt.programas?.giras_integrantes?.find(
            (i) => i.id_integrante === user.id
          );
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

  const toggleMealAttendance = async (eventId, newStatus) => {
    // (Sin cambios)
    setLoading(true);
    try {
      const { error } = await supabase
        .from("eventos_asistencia")
        .upsert(
          { id_evento: eventId, id_integrante: user.id, estado: newStatus },
          { onConflict: "id_evento, id_integrante" }
        );
      if (error) throw error;
      setItems((prev) =>
        prev.map((item) =>
          item.id === eventId ? { ...item, mi_asistencia: newStatus } : item
        )
      );
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- MODALES Y CREACIÓN (Sin cambios significativos) ---
  const openEditModal = (evt) => {
    /* ... (Código igual al anterior) ... */
    const startIso = `${evt.fecha}T${evt.hora_inicio}`;
    const endIso = evt.hora_fin ? `${evt.fecha}T${evt.hora_fin}` : startIso;
    setEditingEvent({
      id: evt.id,
      title: evt.descripcion,
      start: startIso,
      end: endIso,
      location: evt.locaciones?.nombre,
      programType: evt.tipos_evento?.nombre,
      programLabel: evt.programas?.nombre_gira,
      giraId: evt.programas?.id,
      subtitle: evt.programas?.nomenclador,
    });
    setIsDetailOpen(true);
  };
  const handleUpdateEvent = async (formData) => {
    /* ... (Código igual al anterior) ... */
    const fecha = formData.start.split("T")[0];
    const hora_inicio = formData.start.split("T")[1]?.slice(0, 5);
    const hora_fin = formData.end.split("T")[1]?.slice(0, 5);
    const { error } = await supabase
      .from("eventos")
      .update({ fecha, hora_inicio, hora_fin, descripcion: formData.title })
      .eq("id", formData.id);
    if (!error) {
      setIsDetailOpen(false);
      setEditingEvent(null);
      fetchAgenda();
    }
  };
  const handleOpenCreate = () => {
    /* ... (Código igual al anterior) ... */
    setNewFormData({
      id: null,
      descripcion: "",
      fecha: "",
      hora_inicio: "10:00",
      hora_fin: "12:00",
      id_tipo_evento: "",
      id_locacion: "",
    });
    setIsCreating(true);
  };
  const handleCreateSave = async () => {
    /* ... (Código igual al anterior) ... */
    if (!newFormData.fecha || !newFormData.hora_inicio)
      return alert("Datos requeridos incompletos");
    const payload = {
      id_gira: giraId,
      descripcion: newFormData.descripcion || null,
      fecha: newFormData.fecha,
      hora_inicio: newFormData.hora_inicio,
      hora_fin: newFormData.hora_fin || newFormData.hora_inicio,
      id_tipo_evento: newFormData.id_tipo_evento || null,
      id_locacion: newFormData.id_locacion || null,
    };
    const { error } = await supabase.from("eventos").insert([payload]);
    if (!error) {
      setIsCreating(false);
      fetchAgenda();
    }
  };

  // Agrupar usando la lista FILTRADA
  const groupedByMonth = filteredItems.reduce((acc, item) => {
    const monthKey = format(parseISO(item.fecha), "yyyy-MM");
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(item);
    return acc;
  }, {});

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in relative">
      {/* HEADER CON FILTRO */}
      <div className="px-4 py-2 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between sticky top-0 z-30 shrink-0 gap-2">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="text-slate-500 hover:text-indigo-600 shrink-0"
            >
              <IconArrowLeft size={22} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate leading-tight">
              {title}
            </h2>
            {giraId && (
              <p className="text-xs text-slate-500 truncate">Vista Compacta</p>
            )}
          </div>
        </div>

        {/* BOTONES HEADER: NUEVO y FILTRO */}
        <div className="flex items-center gap-2 shrink-0" ref={filterRef}>
          {/* Dropdown Filtro */}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 rounded-full flex items-center justify-center shadow-sm transition-colors ${
                isFilterOpen || selectedTypeIds.length < availableTypes.length
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <IconFilter size={18} />
              {selectedTypeIds.length < availableTypes.length && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {/* Menú Desplegable */}
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2 animate-in zoom-in-95 origin-top-right">
                <div className="flex justify-between text-xs pb-2 mb-2 border-b border-slate-100 font-medium text-indigo-600 cursor-pointer">
                  <span onClick={() => handleSelectAllTypes(true)}>
                    Marcar Todos
                  </span>
                  <span onClick={() => handleSelectAllTypes(false)}>
                    Desmarcar
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {availableTypes.map((type) => (
                    <label
                      key={type.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                        checked={selectedTypeIds.includes(type.id)}
                        onChange={() => handleTypeToggle(type.id)}
                      />
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: type.color }}
                      ></span>
                      <span className="text-sm text-slate-700 truncate">
                        {type.nombre}
                      </span>
                    </label>
                  ))}
                  {availableTypes.length === 0 && (
                    <div className="text-xs text-slate-400 italic p-2">
                      Sin tipos disponibles
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botón Nuevo (si corresponde) */}
          {giraId && canEdit && (
            <button
              onClick={handleOpenCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-sm shrink-0"
            >
              <IconPlus size={20} />
            </button>
          )}
        </div>
      </div>

      {/* LISTA CONTINUA */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="text-center py-10">
            <IconLoader
              className="animate-spin inline text-indigo-500"
              size={30}
            />
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="text-center text-slate-400 py-10 italic flex flex-col items-center gap-2">
            <span>No hay eventos visibles.</span>
            {selectedTypeIds.length < availableTypes.length && (
              <button
                onClick={() => handleSelectAllTypes(true)}
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                Restablecer filtros
              </button>
            )}
          </div>
        )}

        {Object.entries(groupedByMonth).map(([monthKey, monthEvents]) => {
          // (Renderizado de meses y días igual al anterior...)
          const monthDate = parseISO(monthEvents[0].fecha);
          const daysInMonth = monthEvents.reduce((acc, evt) => {
            const dKey = evt.fecha;
            if (!acc[dKey]) acc[dKey] = [];
            acc[dKey].push(evt);
            return acc;
          }, {});

          return (
            <div key={monthKey} className="mb-0">
              <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 text-center py-2 shadow-sm">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                  {format(monthDate, "MMMM yyyy", { locale: es })}
                </span>
              </div>
              {Object.entries(daysInMonth).map(([date, dayEvts]) => {
                const dateObj = parseISO(date);
                const isTodayDate = isToday(dateObj);
                return (
                  <div key={date}>
                    <div
                      className={`px-4 py-1.5 flex justify-between items-center text-xs border-b border-slate-100 ${
                        isTodayDate
                          ? "bg-amber-50 text-amber-800"
                          : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      <span className="font-bold uppercase">
                        {format(dateObj, "EEEE d", { locale: es })}
                      </span>
                      {isTodayDate && (
                        <span className="font-bold text-[10px]">HOY</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      {dayEvts.map((evt) => {
                        // (Variables de evento iguales...)
                        const eventColor = evt.tipos_evento?.color || "#6366f1";
                        const isMeal =
                          [7, 8, 9, 10].includes(evt.id_tipo_evento) ||
                          evt.tipos_evento?.nombre
                            ?.toLowerCase()
                            .includes("comida");
                        const isNonConvokedMeal = isMeal && !evt.is_convoked;
                        const deadlineStatus =
                          isMeal && evt.is_convoked
                            ? getDeadlineStatus(
                                evt.programas?.fecha_confirmacion_limite
                              )
                            : null;
                        const rowBaseClass =
                          "relative flex items-center px-3 py-3 border-b border-slate-100 bg-white transition-colors hover:bg-slate-50 group";
                        const rowInactiveClass =
                          "opacity-50 grayscale bg-slate-50";

                        return (
                          <div
                            key={evt.id}
                            className={`${rowBaseClass} ${
                              isNonConvokedMeal ? rowInactiveClass : ""
                            }`}
                          >
                            <div
                              className="absolute left-0 top-0 bottom-0 w-[4px]"
                              style={{ backgroundColor: eventColor }}
                            ></div>
                            <div className="w-12 shrink-0 flex flex-col items-center mr-3">
                              <span
                                className={`text-sm font-bold leading-none ${
                                  isNonConvokedMeal
                                    ? "text-slate-400"
                                    : "text-slate-700"
                                }`}
                              >
                                {evt.hora_inicio?.slice(0, 5)}
                              </span>
                              {evt.hora_fin &&
                                evt.hora_fin !== evt.hora_inicio && (
                                  <span className="text-[10px] text-slate-400 leading-none mt-1">
                                    {evt.hora_fin.slice(0, 5)}
                                  </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h4
                                  className={`text-sm font-semibold truncate ${
                                    isNonConvokedMeal
                                      ? "line-through text-slate-500"
                                      : "text-slate-900"
                                  }`}
                                >
                                  {evt.descripcion}
                                </h4>
                                {/* Nomenclador / Mes de Gira */}
                                {!giraId && evt.programas && (
                                  <button
                                    onClick={(e) => {
                                      // Evitamos propagación si la fila tuviera click, y navegamos
                                      e.stopPropagation();
                                      if (
                                        onOpenRepertoire &&
                                        evt.programas.id
                                      ) {
                                        onOpenRepertoire(evt.programas.id);
                                      }
                                    }}
                                    // Si hay función de navegación, mostramos cursor y hover; si no, se ve estático
                                    className={`text-[9px] px-1 border rounded shrink-0 transition-colors ${
                                      onOpenRepertoire
                                        ? "bg-white text-slate-500 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 cursor-pointer"
                                        : "bg-slate-100 text-slate-500 border-slate-200 cursor-default"
                                    }`}
                                    title={
                                      onOpenRepertoire
                                        ? "Ir al Repertorio de esta Gira"
                                        : ""
                                    }
                                  >
                                    {/* Renderizado condicional limpio: Mes | Nomenclador */}
                                    {evt.programas.mes_letra && (
                                      <span className="font-bold">
                                        {evt.programas.mes_letra}
                                      </span>
                                    )}
                                    {evt.programas.mes_letra &&
                                      evt.programas.nomenclador && (
                                        <span className="mx-0.5 opacity-50">
                                          |
                                        </span>
                                      )}
                                    {evt.programas.nomenclador}
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center text-[11px] text-slate-500 truncate gap-2">
                                <span
                                  className="uppercase font-bold tracking-wide text-[10px]"
                                  style={{
                                    color: isNonConvokedMeal
                                      ? undefined
                                      : eventColor,
                                  }}
                                >
                                  {evt.tipos_evento?.nombre}
                                </span>
                                {evt.locaciones?.nombre && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="truncate">
                                      {evt.locaciones.nombre}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* --- ÁREA DE ACCIONES DERECHA (Actualizada) --- */}
                            <div className="shrink-0 flex items-center justify-end gap-2">
                              {/* Grupo de Enlaces Externos (Repertorio y Drive) */}
                              {(evt.programas?.google_drive_folder_id ||
                                (evt.programas?.id && onOpenRepertoire)) &&
                                !isNonConvokedMeal && (
                                  <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-100 p-0.5 mr-1">
                                    {/* Ícono Drive */}
                                    {evt.programas?.google_drive_folder_id && (
                                      <a
                                        href={`https://drive.google.com/drive/folders/${evt.programas.google_drive_folder_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-white"
                                        title="Abrir Carpeta de Drive"
                                      >
                                        <IconDrive size={16} />{" "}
                                        {/* Usé External Link, cámbialo si tienes el de Drive */}
                                      </a>
                                    )}
                                    {/* Ícono Repertorio */}
                                    {evt.programas?.id && onOpenRepertoire && (
                                      <button
                                        onClick={() =>
                                          onOpenRepertoire(evt.programas.id)
                                        }
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-white"
                                        title="Ver Repertorio de la Gira"
                                      >
                                        <IconList size={16} />{" "}
                                        {/* Usé IconList, cámbialo si tienes IconMusic */}
                                      </button>
                                    )}
                                  </div>
                                )}

                              {/* Acciones de Edición y Comentarios */}
                              <div className="flex flex-col items-end gap-1 relative">
                                {canEdit && !isNonConvokedMeal && (
                                  <div className="absolute right-full top-0 hidden group-hover:flex items-center pr-2 h-full">
                                    <button
                                      onClick={() => openEditModal(evt)}
                                      className="p-1 text-slate-300 hover:text-indigo-600 bg-white rounded-full shadow-sm border border-slate-100"
                                    >
                                      <IconEdit size={14} />
                                    </button>
                                  </div>
                                )}
                                <CommentButton
                                  supabase={supabase}
                                  entityType="EVENTO"
                                  entityId={evt.id}
                                  onClick={() =>
                                    setCommentsState({
                                      type: "EVENTO",
                                      id: evt.id,
                                      title: evt.descripcion,
                                    })
                                  }
                                  className="text-slate-300 hover:text-indigo-500 p-1"
                                />
                              </div>

                              {/* Checkboxes de Asistencia (Comidas) */}
                              {isMeal && evt.is_convoked && (
                                <div className="flex flex-col gap-1 ml-1">
                                  {evt.mi_asistencia === "P" && (
                                    <button
                                      onClick={() =>
                                        deadlineStatus?.status === "OPEN" &&
                                        toggleMealAttendance(evt.id, null)
                                      }
                                      className="bg-emerald-100 text-emerald-700 p-1 rounded-md"
                                    >
                                      <IconCheck size={14} />
                                    </button>
                                  )}
                                  {evt.mi_asistencia === "A" && (
                                    <button
                                      onClick={() =>
                                        deadlineStatus?.status === "OPEN" &&
                                        toggleMealAttendance(evt.id, null)
                                      }
                                      className="bg-rose-100 text-rose-700 p-1 rounded-md"
                                    >
                                      <IconX size={14} />
                                    </button>
                                  )}
                                  {!evt.mi_asistencia &&
                                    deadlineStatus?.status === "OPEN" && (
                                      <div className="flex flex-col gap-1">
                                        <button
                                          onClick={() =>
                                            toggleMealAttendance(evt.id, "P")
                                          }
                                          className="bg-slate-100 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 p-1 rounded-sm leading-none"
                                        >
                                          <IconCheck size={14} />
                                        </button>
                                        <button
                                          onClick={() =>
                                            toggleMealAttendance(evt.id, "A")
                                          }
                                          className="bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 p-1 rounded-sm leading-none"
                                        >
                                          <IconX size={14} />
                                        </button>
                                      </div>
                                    )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {/* MODALES (Sin cambios) */}
      <EventDetailModal
        isOpen={isDetailOpen}
        event={editingEvent}
        onClose={() => {
          setIsDetailOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleUpdateEvent}
      />
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          {" "}
          <EventForm
            formData={newFormData}
            setFormData={setNewFormData}
            onSave={handleCreateSave}
            onClose={() => setIsCreating(false)}
            loading={false}
            eventTypes={[]}
            locations={[]}
            isNew={true}
          />{" "}
        </div>
      )}
      {commentsState && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]"
          onClick={() => setCommentsState(null)}
        >
          {" "}
          <div onClick={(e) => e.stopPropagation()} className="h-full">
            {" "}
            <CommentsManager
              supabase={supabase}
              entityType={commentsState.type}
              entityId={commentsState.id}
              title={commentsState.title}
              onClose={() => setCommentsState(null)}
            />{" "}
          </div>{" "}
        </div>
      )}
    </div>
  );
}
