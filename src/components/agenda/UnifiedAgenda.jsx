import React, { useState, useEffect, useRef } from "react";
import {
  format,
  startOfDay,
  addMonths,
  parseISO,
  isPast,
  differenceInDays,
  differenceInHours,
  isSameDay,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  IconLoader,
  IconCheck,
  IconX,
  IconEdit,
  IconArrowLeft,
  IconPlus,
  IconFilter,
  IconDrive,
  IconList,
  IconChevronDown,
  IconUserPlus,
  IconMapPin,
  IconCalendar,
  IconAlertTriangle,
} from "../ui/Icons";
import { useAuth } from "../../context/AuthContext";
import CommentsManager from "../comments/CommentsManager";
import CommentButton from "../comments/CommentButton";
import EventForm from "../forms/EventForm";

// --- LÓGICA DE FECHA LÍMITE ---
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

// Hook para cerrar al hacer click fuera
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

// COMPONENTE: BOTÓN DRIVE INTELIGENTE
const DriveSmartButton = ({ evt }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  useOutsideAlerter(containerRef, () => setIsOpen(false));

  // Recolectar carpetas
  const driveLinks = [];

  // 1. Programa Principal
  if (evt.programas?.google_drive_folder_id) {
    driveLinks.push({
      id: evt.programas.id,
      label: `${evt.programas.mes_letra} | ${evt.programas.nomenclador} - ${evt.programas.nombre_gira}`,
      url: `https://drive.google.com/drive/folders/${evt.programas.google_drive_folder_id}`,
    });
  }

  // 2. Programas Asociados
  if (evt.eventos_programas_asociados?.length > 0) {
    evt.eventos_programas_asociados.forEach((ep) => {
      if (
        ep.programas?.google_drive_folder_id &&
        ep.programas.id !== evt.programas?.id
      ) {
        driveLinks.push({
          id: ep.programas.id,
          label: `${ep.programas.mes_letra} | ${ep.programas.nomenclador} - ${ep.programas.nombre_gira}`,
          url: `https://drive.google.com/drive/folders/${ep.programas.google_drive_folder_id}`,
        });
      }
    });
  }

  if (driveLinks.length === 0) return null;

  // Caso: Un solo link
  if (driveLinks.length === 1) {
    return (
      <a
        href={driveLinks[0].url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 text-slate-400 hover:text-green-600 rounded hover:bg-green-50 transition-colors flex items-center gap-1"
        title={`Drive: ${driveLinks[0].label}`}
      >
        <IconDrive size={16} />
      </a>
    );
  }

  // Caso: Múltiples links (Dropdown)
  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 text-slate-400 hover:text-green-600 rounded hover:bg-green-50 transition-colors flex items-center gap-1 font-bold text-[10px]"
        title="Múltiples carpetas de Drive"
      >
        <IconDrive size={16} />
        <span>{driveLinks.length}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden animate-in zoom-in-95 origin-bottom-right">
          <div className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 border-b border-slate-100 uppercase">
            Carpetas de Drive
          </div>
          <div className="max-h-48 overflow-y-auto">
            {driveLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 text-xs text-slate-700 hover:bg-green-50 hover:text-green-700 border-b border-slate-50 last:border-0 leading-tight"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function UnifiedAgenda({
  supabase,
  giraId = null,
  onBack = null,
  title = "Agenda General",
  onOpenRepertoire = null,
}) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estado para modo offline
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

  const [monthsLimit, setMonthsLimit] = useState(3);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([1, 2]);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);
  useOutsideAlerter(filterRef, () => setIsFilterOpen(false));

  const [commentsState, setCommentsState] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [newFormData, setNewFormData] = useState({});

  const [formEventTypes, setFormEventTypes] = useState([]);
  const [formLocations, setFormLocations] = useState([]);

  const [userProfile, setUserProfile] = useState(null);

  const canEdit = ["admin", "editor", "coord_general", "director"].includes(
    user?.rol_sistema
  );

  // 1. Cargar Perfil
  // 1. Cargar Perfil (CON SOPORTE OFFLINE)
  useEffect(() => {
    const fetchProfile = async () => {
      const PROFILE_CACHE_KEY = `profile_cache_${user.id}`;

      // A. Intentar cargar del caché local inmediatamente
      const cachedProfile = localStorage.getItem(PROFILE_CACHE_KEY);
      if (cachedProfile) {
        try {
          setUserProfile(JSON.parse(cachedProfile));
        } catch (e) {
          console.error("Error parsing cached profile", e);
        }
      }

      // Si es invitado general, hardcodeamos y salimos
      if (user.id === "guest-general") {
        setUserProfile({
          id: "guest-general",
          nombre: "Invitado",
          apellido: "General",
          is_local: false,
          instrumentos: { familia: "Invitado" },
          integrantes_ensambles: [],
        });
        return;
      }

      // B. Si no hay conexión, nos quedamos con lo local y no intentamos conectar
      if (!navigator.onLine) return;

      // C. Si hay conexión, actualizamos datos frescos
      try {
        const { data, error } = await supabase
          .from("integrantes")
          .select(
            "*, instrumentos(familia), integrantes_ensambles(id_ensamble)"
          )
          .eq("id", user.id)
          .single();

        if (data) {
          setUserProfile(data);
          // Guardamos la versión fresca en el celular
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
        }
      } catch (error) {
        console.error("Error actualizando perfil:", error);
      }
    };

    fetchProfile();
  }, [user.id, supabase]);

  // 2. Cargar Catálogos (Solo Admin/Editor)
  useEffect(() => {
    const fetchCatalogs = async () => {
      if (!canEdit) return;
      const { data: types } = await supabase
        .from("tipos_evento")
        .select("id, nombre")
        .order("nombre");
      const { data: locs } = await supabase
        .from("locaciones")
        .select("id, nombre, localidades(localidad)")
        .order("nombre");
      if (types) setFormEventTypes(types);
      if (locs) setFormLocations(locs);
    };
    fetchCatalogs();
  }, [canEdit]);

  // 3. Detectar Conexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineMode(false);
      if (userProfile) fetchAgenda();
    };
    const handleOffline = () => setIsOfflineMode(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (userProfile) fetchAgenda();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [userProfile, giraId, monthsLimit]);

  const handleCategoryToggle = (catId) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId]
    );
  };

  const handleSelectAllCategories = (selectAll) => {
    setSelectedCategoryIds(
      selectAll ? availableCategories.map((c) => c.id) : []
    );
  };

  const filteredItems = items.filter((item) => {
    const catId = item.tipos_evento?.categorias_tipos_eventos?.id;
    return catId && selectedCategoryIds.includes(catId);
  });

  const checkIsConvoked = (convocadosList, tourRole) => {
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

  // 4. FETCH PRINCIPAL (Con Caché y Offline)
  const fetchAgenda = async () => {
    setLoading(true);
    const CACHE_KEY = `agenda_cache_${user.id}_${giraId || "general"}`;

    try {
      // A. Cargar Caché
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        setItems(parsedData);

        // Reconstruir categorías para filtros offline
        const catsMap = {};
        parsedData.forEach((evt) => {
          if (evt.tipos_evento?.categorias_tipos_eventos) {
            catsMap[evt.tipos_evento.categorias_tipos_eventos.id] =
              evt.tipos_evento.categorias_tipos_eventos;
          }
        });
        const cachedCats = Object.values(catsMap).sort((a, b) =>
          a.nombre.localeCompare(b.nombre)
        );
        if (cachedCats.length > 0) setAvailableCategories(cachedCats);
      }

      // B. Si offline, detener
      if (!navigator.onLine) {
        setIsOfflineMode(true);
        setLoading(false);
        return;
      }

      // C. Fetch Live
      const start = startOfDay(new Date()).toISOString();
      const end = addMonths(new Date(), monthsLimit).toISOString();

      const isPersonal =
        user.rol_sistema === "consulta_personal" ||
        user.rol_sistema === "personal";

      let myEnsembles = new Set();
      let myFamily = null;

      if (userProfile) {
        userProfile.integrantes_ensambles?.forEach((ie) =>
          myEnsembles.add(ie.id_ensamble)
        );
        myFamily = userProfile.instrumentos?.familia;
      }

      const [customAttendance, ensembleEvents] = await Promise.all([
        supabase
          .from("eventos_asistencia_custom")
          .select("id_evento, tipo, nota")
          .eq("id_integrante", user.id),

        myEnsembles.size > 0
          ? supabase
              .from("eventos_ensambles")
              .select("id_evento")
              .in("id_ensamble", Array.from(myEnsembles))
          : Promise.resolve({ data: [] }),
      ]);

      const customMap = new Map();
      customAttendance.data?.forEach((c) => customMap.set(c.id_evento, c));

      const myEnsembleEventIds = new Set(
        ensembleEvents.data?.map((e) => e.id_evento)
      );

      let query = supabase
        .from("eventos")
        .select(
          `
            id, fecha, hora_inicio, hora_fin, descripcion, convocados, id_tipo_evento, id_locacion,
            tipos_evento (
                id, nombre, color,
                categorias_tipos_eventos (id, nombre)
            ), 
            locaciones (id, nombre),
            programas (
                id, nombre_gira, nomenclador, google_drive_folder_id, mes_letra,
                fecha_confirmacion_limite,
                giras_fuentes(tipo, valor_id, valor_texto), 
                giras_integrantes(id_integrante, estado, rol)
            ),
            eventos_programas_asociados (
                programas ( id, nombre_gira, google_drive_folder_id, mes_letra, nomenclador )
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
        if (giraId) return true;
        if (!isPersonal) return true;

        if (customMap.has(item.id)) return true;
        if (myEnsembleEventIds.has(item.id)) return true;

        if (item.programas) {
          const overrides = item.programas.giras_integrantes || [];
          const sources = item.programas.giras_fuentes || [];
          const myOverride = overrides.find((o) => o.id_integrante === user.id);

          if (myOverride && myOverride.estado === "ausente") return false;
          if (myOverride) return true;

          return sources.some(
            (s) =>
              (s.tipo === "ENSAMBLE" && myEnsembles.has(s.valor_id)) ||
              (s.tipo === "FAMILIA" && s.valor_texto === myFamily)
          );
        }

        return false;
      });

      const categoriesMap = {};
      visibleEvents.forEach((evt) => {
        const cat = evt.tipos_evento?.categorias_tipos_eventos;
        if (cat && !categoriesMap[cat.id]) {
          categoriesMap[cat.id] = cat;
        }
      });
      const uniqueCats = Object.values(categoriesMap).sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      );

      setAvailableCategories((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const newCats = uniqueCats.filter((c) => !existingIds.has(c.id));
        return [...prev, ...newCats].sort((a, b) =>
          a.nombre.localeCompare(b.nombre)
        );
      });

      visibleEvents.forEach((evt) => {
        const custom = customMap.get(evt.id);
        if (custom) {
          if (custom.tipo === "invitado" || custom.tipo === "adicional") {
            evt.is_guest = true;
            evt.guest_note = custom.nota;
          } else if (custom.tipo === "ausente") {
            evt.is_absent = true;
          }
        }
      });

      if (visibleEvents.length > 0 && user.id !== "guest-general") {
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

      // Guardar y Actualizar
      setItems(visibleEvents);
      localStorage.setItem(CACHE_KEY, JSON.stringify(visibleEvents));
      setIsOfflineMode(false);
    } catch (err) {
      console.error("Error fetching agenda:", err);
      setIsOfflineMode(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleMealAttendance = async (eventId, newStatus) => {
    if (user.id === "guest-general") return;
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

  const openEditModal = (evt) => {
    setEditFormData({
      id: evt.id,
      descripcion: evt.descripcion || "",
      fecha: evt.fecha || "",
      hora_inicio: evt.hora_inicio || "",
      hora_fin: evt.hora_fin || "",
      id_tipo_evento: evt.id_tipo_evento || "",
      id_locacion: evt.id_locacion || "",
    });
    setIsEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editFormData.fecha || !editFormData.hora_inicio)
      return alert("Faltan datos");
    setLoading(true);
    try {
      const payload = {
        descripcion: editFormData.descripcion,
        fecha: editFormData.fecha,
        hora_inicio: editFormData.hora_inicio,
        hora_fin: editFormData.hora_fin || editFormData.hora_inicio,
        id_tipo_evento: editFormData.id_tipo_evento || null,
        id_locacion: editFormData.id_locacion || null,
      };
      const { error } = await supabase
        .from("eventos")
        .update(payload)
        .eq("id", editFormData.id);
      if (error) throw error;
      setIsEditOpen(false);
      setEditFormData({});
      fetchAgenda();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
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
    if (!newFormData.fecha || !newFormData.hora_inicio)
      return alert("Faltan datos");
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

  const groupedByMonth = filteredItems.reduce((acc, item) => {
    const monthKey = format(parseISO(item.fecha), "yyyy-MM");
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(item);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in relative">
      {/* AVISO OFFLINE */}
      {isOfflineMode && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-1 text-[10px] sm:text-xs font-bold text-amber-800 text-center flex items-center justify-center gap-2">
          <IconAlertTriangle size={14} />
          <span>Sin conexión a internet. Mostrando copia guardada.</span>
        </div>
      )}

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
        <div
          className={`flex items-center gap-2 shrink-0 ${
            isOfflineMode ? "opacity-50 pointer-events-none" : ""
          }`}
          ref={filterRef}
        >
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 rounded-full flex items-center justify-center shadow-sm transition-colors ${
                isFilterOpen
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              <IconFilter size={18} />
              {selectedCategoryIds.length < availableCategories.length && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2 animate-in zoom-in-95 origin-top-right">
                <div className="flex justify-between text-xs pb-2 mb-2 border-b border-slate-100 font-medium text-indigo-600 cursor-pointer">
                  <span onClick={() => handleSelectAllCategories(true)}>
                    Marcar Todos
                  </span>
                  <span onClick={() => handleSelectAllCategories(false)}>
                    Desmarcar
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {availableCategories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                        checked={selectedCategoryIds.includes(cat.id)}
                        onChange={() => handleCategoryToggle(cat.id)}
                      />
                      <span className="text-sm text-slate-700 truncate">
                        {cat.nombre}
                      </span>
                    </label>
                  ))}
                  {availableCategories.length === 0 && (
                    <div className="text-xs text-slate-400 italic p-2">
                      Sin categorías disponibles
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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

      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 && (
          <div className="text-center py-10">
            <IconLoader
              className="animate-spin inline text-indigo-500"
              size={30}
            />
          </div>
        )}
        {!loading && filteredItems.length === 0 && (
          <div className="text-center text-slate-400 py-10 italic">
            No hay eventos visibles.
          </div>
        )}

        {Object.entries(groupedByMonth).map(([monthKey, monthEvents]) => {
          const monthDate = parseISO(monthEvents[0].fecha);
          let lastDateRendered = null;

          return (
            <div key={monthKey} className="mb-0">
              <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 text-center py-2 shadow-sm">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                  {format(monthDate, "MMMM yyyy", { locale: es })}
                </span>
              </div>
              {monthEvents.map((evt) => {
                const eventColor = evt.tipos_evento?.color || "#6366f1";
                const isMeal =
                  [7, 8, 9, 10].includes(evt.id_tipo_evento) ||
                  evt.tipos_evento?.nombre?.toLowerCase().includes("comida");
                const isNonConvokedMeal = isMeal && !evt.is_convoked;
                const deadlineStatus =
                  isMeal && evt.is_convoked
                    ? getDeadlineStatus(
                        evt.programas?.fecha_confirmacion_limite
                      )
                    : null;

                const showDay = evt.fecha !== lastDateRendered;
                if (showDay) lastDateRendered = evt.fecha;

                let rowStyle =
                  "relative flex items-center px-3 py-3 border-b border-slate-100 bg-white transition-colors hover:bg-slate-50 group";
                if (isNonConvokedMeal || evt.is_absent)
                  rowStyle =
                    "relative flex items-center px-3 py-3 border-b border-slate-100 bg-slate-50 transition-colors opacity-60 grayscale";
                if (evt.is_guest) rowStyle += " bg-emerald-50/30";

                return (
                  <React.Fragment key={evt.id}>
                    {showDay && (
                      <div className="bg-slate-50/80 px-4 py-1.5 text-xs font-bold text-slate-500 uppercase border-b border-slate-100 flex items-center gap-2">
                        <IconCalendar size={12} />{" "}
                        {format(parseISO(evt.fecha), "EEEE d", { locale: es })}
                      </div>
                    )}

                    <div className={rowStyle}>
                      <div
                        className="absolute left-0 top-0 bottom-0 w-[4px]"
                        style={{
                          backgroundColor: evt.is_absent
                            ? "#94a3b8"
                            : eventColor,
                        }}
                      ></div>
                      <div className="w-12 shrink-0 flex flex-col items-center mr-3">
                        <span
                          className={`text-sm font-bold leading-none ${
                            isNonConvokedMeal || evt.is_absent
                              ? "text-slate-400"
                              : "text-slate-700"
                          }`}
                        >
                          {evt.hora_inicio?.slice(0, 5)}
                        </span>
                        {evt.hora_fin && evt.hora_fin !== evt.hora_inicio && (
                          <span className="text-[10px] text-slate-400 leading-none mt-1">
                            {evt.hora_fin.slice(0, 5)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4
                            className={`text-sm font-semibold truncate ${
                              isNonConvokedMeal || evt.is_absent
                                ? "line-through text-slate-500"
                                : "text-slate-900"
                            }`}
                          >
                            {evt.descripcion || evt.tipos_evento?.nombre}
                          </h4>
                          {evt.is_guest && (
                            <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 rounded flex items-center gap-1">
                              <IconUserPlus size={10} /> Invitado
                            </span>
                          )}
                          {evt.is_absent && (
                            <span className="bg-slate-200 text-slate-500 text-[9px] font-bold px-1.5 rounded">
                              Ausente
                            </span>
                          )}

                          {!giraId && evt.programas && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenRepertoire && evt.programas.id)
                                  onOpenRepertoire(evt.programas.id);
                              }}
                              className={`text-[9px] px-1 border rounded shrink-0 transition-colors ${
                                onOpenRepertoire
                                  ? "bg-white text-slate-500 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 cursor-pointer"
                                  : "bg-slate-100 text-slate-500 cursor-default"
                              }`}
                            >
                              {evt.programas.mes_letra}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center text-[11px] text-slate-500 truncate gap-2">
                          <span
                            className="uppercase font-bold tracking-wide text-[10px]"
                            style={{
                              color:
                                isNonConvokedMeal || evt.is_absent
                                  ? undefined
                                  : eventColor,
                            }}
                          >
                            {evt.tipos_evento?.nombre}
                          </span>
                          {evt.locaciones?.nombre && (
                            <>
                              {" "}
                              <span className="text-slate-300">•</span>{" "}
                              <span className="truncate flex items-center gap-1">
                                <IconMapPin size={10} /> {evt.locaciones.nombre}
                              </span>{" "}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-end gap-2">
                        {/* BOTÓN DRIVE INTELIGENTE */}
                        <DriveSmartButton evt={evt} />

                        {evt.programas?.id &&
                          onOpenRepertoire &&
                          !isNonConvokedMeal && (
                            <button
                              onClick={() => onOpenRepertoire(evt.programas.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-white border border-transparent hover:border-slate-100"
                            >
                              <IconList size={16} />
                            </button>
                          )}

                        <div className="flex flex-col items-end gap-1 relative">
                          {canEdit && !isNonConvokedMeal && (
                            <button
                              onClick={() => openEditModal(evt)}
                              className="p-1 text-slate-300 hover:text-indigo-600 bg-white rounded-full shadow-sm border border-slate-100 mb-1"
                            >
                              <IconEdit size={14} />
                            </button>
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
                        {isMeal &&
                          evt.is_convoked &&
                          user.id !== "guest-general" && (
                            <div className="flex flex-col gap-1 ml-1">
                              {evt.mi_asistencia === "P" && (
                                <button
                                  onClick={() =>
                                    !isOfflineMode &&
                                    deadlineStatus?.status === "OPEN" &&
                                    toggleMealAttendance(evt.id, null)
                                  }
                                  className={`bg-emerald-100 text-emerald-700 p-1 rounded-md ${
                                    isOfflineMode ? "opacity-50" : ""
                                  }`}
                                >
                                  <IconCheck size={14} />
                                </button>
                              )}
                              {evt.mi_asistencia === "A" && (
                                <button
                                  onClick={() =>
                                    !isOfflineMode &&
                                    deadlineStatus?.status === "OPEN" &&
                                    toggleMealAttendance(evt.id, null)
                                  }
                                  className={`bg-rose-100 text-rose-700 p-1 rounded-md ${
                                    isOfflineMode ? "opacity-50" : ""
                                  }`}
                                >
                                  <IconX size={14} />
                                </button>
                              )}
                              {!evt.mi_asistencia &&
                                deadlineStatus?.status === "OPEN" && (
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() =>
                                        !isOfflineMode &&
                                        toggleMealAttendance(evt.id, "P")
                                      }
                                      className="bg-slate-100 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 p-1 rounded-sm disabled:opacity-50"
                                      disabled={isOfflineMode}
                                    >
                                      <IconCheck size={14} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        !isOfflineMode &&
                                        toggleMealAttendance(evt.id, "A")
                                      }
                                      className="bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 p-1 rounded-sm disabled:opacity-50"
                                      disabled={isOfflineMode}
                                    >
                                      <IconX size={14} />
                                    </button>
                                  </div>
                                )}
                            </div>
                          )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
        {!giraId && !loading && (
          <div className="p-6 flex justify-center pb-12">
            <button
              onClick={() => setMonthsLimit((prev) => prev + 3)}
              disabled={isOfflineMode}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-indigo-200 text-indigo-700 font-bold rounded-full shadow-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconChevronDown size={18} /> Cargar más meses
            </button>
          </div>
        )}
        {loading && (
          <div className="text-center py-6 text-slate-400 text-xs">
            Cargando eventos...
          </div>
        )}
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <EventForm
            formData={editFormData}
            setFormData={setEditFormData}
            onSave={handleEditSave}
            onClose={() => setIsEditOpen(false)}
            loading={loading}
            eventTypes={formEventTypes}
            locations={formLocations}
            isNew={false}
          />
        </div>
      )}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <EventForm
            formData={newFormData}
            setFormData={setNewFormData}
            onSave={handleCreateSave}
            onClose={() => setIsCreating(false)}
            loading={loading}
            eventTypes={formEventTypes}
            locations={formLocations}
            isNew={true}
          />
        </div>
      )}
      {commentsState && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]"
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
