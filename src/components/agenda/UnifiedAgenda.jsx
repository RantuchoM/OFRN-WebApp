import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  format,
  startOfDay,
  addMonths,
  parseISO,
  isPast,
  differenceInDays,
  differenceInHours,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  IconLoader,
  IconCheck,
  IconX,
  IconEdit,
  IconArrowLeft,
  IconPlus,
  IconDrive,
  IconList,
  IconChevronDown,
  IconMapPin,
  IconCalendar,
  IconAlertTriangle,
  IconArrowRight,
  IconEye,
  IconPrinter,
  IconUpload,
  IconDownload,
  IconBus,
} from "../ui/Icons";
import { useAuth } from "../../context/AuthContext";
import CommentsManager from "../comments/CommentsManager";
import CommentButton from "../comments/CommentButton";
import EventForm from "../forms/EventForm";
import SearchableSelect from "../ui/SearchableSelect";
import { exportAgendaToPDF } from "../../utils/agendaPdfExporter";
import { calculateLogisticsSummary } from "../../hooks/useLogistics";

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

  const driveLinks = [];

  if (evt.programas?.google_drive_folder_id) {
    driveLinks.push({
      id: evt.programas.id,
      label: `${evt.programas.mes_letra} | ${evt.programas.nomenclador} - ${evt.programas.nombre_gira}`,
      url: `https://drive.google.com/drive/folders/${evt.programas.google_drive_folder_id}`,
    });
  }

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
  onViewChange = null,
}) {
  const { user } = useAuth();

  const [viewAsUserId, setViewAsUserId] = useState(null);
  const [musicianOptions, setMusicianOptions] = useState([]);

  const effectiveUserId = viewAsUserId || user.id;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [monthsLimit, setMonthsLimit] = useState(3);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);

  const [showNonActive, setShowNonActive] = useState(false);

  // LOGÍSTICA: Mapa de asignaciones y conjunto de giras que TIENEN reglas
  const [myTransportLogistics, setMyTransportLogistics] = useState({});
  const [toursWithRules, setToursWithRules] = useState(new Set());

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

  useEffect(() => {
    const fetchMusicians = async () => {
      if (canEdit && navigator.onLine) {
        try {
          const { data } = await supabase
            .from("integrantes")
            .select("id, nombre, apellido")
            .order("apellido");

          if (data) {
            const options = data.map((m) => ({
              id: m.id,
              label: `${m.apellido}, ${m.nombre}`,
              subLabel: null,
            }));
            setMusicianOptions(options);
          }
        } catch (error) {
          console.error("Error fetching musicians:", error);
        }
      }
    };
    fetchMusicians();
  }, [canEdit, supabase]);

  useEffect(() => {
    const fetchProfile = async () => {
      const PROFILE_CACHE_KEY = `profile_cache_${effectiveUserId}`;
      const cachedProfile = localStorage.getItem(PROFILE_CACHE_KEY);
      if (cachedProfile) {
        try {
          setUserProfile(JSON.parse(cachedProfile));
        } catch (e) {
          console.error(e);
        }
      }

      if (effectiveUserId === "guest-general") {
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

      if (!navigator.onLine) return;

      try {
        const { data } = await supabase
          .from("integrantes")
          .select(
            // CAMBIO: Usamos '!id_localidad' para especificar la FK exacta y le ponemos alias 'datos_residencia'
            "*, instrumentos(familia), integrantes_ensambles(id_ensamble), datos_residencia:localidades!id_localidad (id, id_region)"
          )
          .eq("id", effectiveUserId)
          .single();
        if (data) {
          setUserProfile(data);
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchProfile();
  }, [effectiveUserId, supabase]);

  useEffect(() => {
    const fetchCatalogs = async () => {
      if (!canEdit || !navigator.onLine) return;
      try {
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
      } catch (e) {
        console.error(e);
      }
    };
    fetchCatalogs();
  }, [canEdit, supabase]);

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

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!showNonActive) {
        const estadoGira = item.programas?.estado || "Borrador";
        if (item.isProgramMarker) {
          if (estadoGira !== "Vigente") return false;
        } else if (item.programas && estadoGira !== "Vigente") {
          return false;
        }
      }
      if (item.isProgramMarker) return true;
      const catId = item.tipos_evento?.categorias_tipos_eventos?.id;
      if (!catId) return true;
      return selectedCategoryIds.includes(catId);
    });
  }, [items, selectedCategoryIds, showNonActive]);

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

  const fetchAgenda = async () => {
    setLoading(true);
    // V4 para asegurar limpieza de caché y nueva lógica logística
    const CACHE_KEY = `agenda_cache_${effectiveUserId}_${
      giraId || "general"
    }_v4`;

    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        setItems(parsedData);
        processCategories(parsedData);
      }

      if (!navigator.onLine) {
        setIsOfflineMode(true);
        setLoading(false);
        return;
      }

      const start = startOfDay(new Date()).toISOString();
      const end = addMonths(new Date(), monthsLimit).toISOString();

      const profileRole = userProfile?.rol_sistema || "musico";

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
          .eq("id_integrante", effectiveUserId),
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

      // --- 1. TRAER EVENTOS CON DATOS DE TRANSPORTE ---
      let query = supabase
        .from("eventos")
        .select(
          `
            id, fecha, hora_inicio, hora_fin, descripcion, convocados, id_tipo_evento, id_locacion, id_gira, id_gira_transporte,
            giras_transportes (
                id, detalle,
                transportes ( nombre )
            ),
            tipos_evento (
                id, nombre, color,
                categorias_tipos_eventos (id, nombre)
            ), 
            locaciones (
                id, nombre, direccion,
                localidades (localidad)
            ),
            programas (
                id, nombre_gira, nomenclador, google_drive_folder_id, mes_letra, 
                fecha_desde, fecha_hasta, tipo, zona, estado,
                fecha_confirmacion_limite,
                giras_fuentes(tipo, valor_id, valor_texto), 
                giras_integrantes(id_integrante, estado, rol)
            ),
            eventos_programas_asociados (
                programas ( id, nombre_gira, google_drive_folder_id, mes_letra, nomenclador, estado )
            )
        `
        )
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });

      if (giraId) query = query.eq("id_gira", giraId);
      else query = query.gte("fecha", start).lte("fecha", end);

      const { data: eventsData, error } = await query;
      if (error) throw error;

      // --- 2. CÁLCULO LOGÍSTICO ROBUSTO ---
      console.log("--- DEBUG LOGISTICA: Inicio ---");
      const activeTourIds = new Set();
      eventsData?.forEach((e) => {
        if (e.id_gira) activeTourIds.add(e.id_gira);
      });

      let logisticsMap = {};
      const foundRuleTours = new Set();

      if (activeTourIds.size > 0 && userProfile) {
        const { data: rulesData } = await supabase
          .from("giras_logistica_reglas_transportes")
          .select(
            "*, giras_transportes!inner(id, id_gira, detalle, transportes(nombre))"
          )
          .in("giras_transportes.id_gira", Array.from(activeTourIds));

        if (rulesData) {
          const rulesByGira = {};
          rulesData.forEach((r) => {
            const gId = r.giras_transportes.id_gira;
            foundRuleTours.add(gId); // Marcamos que esta gira TIENE reglas
            if (!rulesByGira[gId]) rulesByGira[gId] = [];
            rulesByGira[gId].push(r);
          });

          Object.keys(rulesByGira).forEach((gId) => {
            const sampleEvt = eventsData.find(
              (e) => String(e.id_gira) === String(gId) && e.programas
            );
            if (!sampleEvt || !sampleEvt.programas) return;

            // --- Cálculo manual de 'es_adicional' ---
            const sources = sampleEvt.programas.giras_fuentes || [];
            let isBase = false;

            // Normalizamos IDs a String
            const userEnsembles = (userProfile.integrantes_ensambles || []).map(
              (ie) => String(ie.id_ensamble)
            );
            const userFamily = userProfile.instrumentos?.familia;

            sources.forEach((src) => {
              if (
                src.tipo === "ENSAMBLE" &&
                userEnsembles.includes(String(src.valor_id))
              )
                isBase = true;
              if (src.tipo === "FAMILIA" && src.valor_texto === userFamily)
                isBase = true;
            });

            const myRecord = sampleEvt.programas.giras_integrantes?.find(
              (i) => String(i.id_integrante) === String(effectiveUserId)
            );

            if (myRecord && myRecord.estado === "ausente") return;

            const esAdicional = !!myRecord && !isBase;
            // --- CORRECCIÓN FINAL: Uso de Alias Explicito ---
            // Ahora leemos desde 'datos_residencia' que definimos en el fetchProfile
            const cleanLocId = userProfile.id_localidad
              ? Number(userProfile.id_localidad)
              : null;

            // Verificamos el objeto con el alias correcto
            const residenciaObj = userProfile.datos_residencia;

            const cleanRegionId = residenciaObj?.id_region
              ? Number(residenciaObj.id_region)
              : null;

            const mockPerson = {
              ...userProfile,
              id_localidad: cleanLocId,
              // Construimos el objeto localidades explícitamente para el motor logístico
              localidades: {
                id: cleanLocId,
                id_region: cleanRegionId,
              },
              rol_gira: myRecord?.rol || "musico",
              es_adicional: esAdicional,
              logistics: {},
            };

            console.log(
              `Logística (Alias Check): LocID: ${cleanLocId}, RegID: ${cleanRegionId}`
            );
            // Ejecución del motor logístico
            const result = calculateLogisticsSummary(
              [mockPerson],
              [],
              rulesByGira[gId]
            );

            const myTransports = result[0]?.logistics?.transports || [];
            myTransports.forEach((t) => {
              // Usamos String() para asegurar coincidencia
              logisticsMap[String(t.id)] = {
                assigned: true,
                subidaId: t.subidaId,
                bajadaId: t.bajadaId,
              };
            });
          });
        }
      }
      console.log("Mapa Calculado:", logisticsMap);
      setMyTransportLogistics(logisticsMap);
      setToursWithRules(foundRuleTours);

      const visibleEvents = (eventsData || []).filter((item) => {
        if (giraId) return true;

        const isManagementProfile = [
          "admin",
          "editor",
          "coord_general",
          "director",
        ].includes(profileRole);
        if (isManagementProfile) return true;

        if (customMap.has(item.id)) return true;
        if (myEnsembleEventIds.has(item.id)) return true;
        if (item.programas) {
          const overrides = item.programas.giras_integrantes || [];
          const sources = item.programas.giras_fuentes || [];
          const myOverride = overrides.find(
            (o) => o.id_integrante === effectiveUserId
          );
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

      const programStartMarkers = [];
      const processedPrograms = new Set();

      visibleEvents.forEach((evt) => {
        if (evt.programas && !processedPrograms.has(evt.programas.id)) {
          processedPrograms.add(evt.programas.id);
          if (evt.programas.fecha_desde) {
            programStartMarkers.push({
              id: `prog-start-${evt.programas.id}`,
              fecha: evt.programas.fecha_desde,
              hora_inicio: "00:00:00",
              isProgramMarker: true,
              programas: evt.programas,
              tipos_evento: { categorias_tipos_eventos: { id: -1 } },
            });
          }
        }
      });

      const allItems = [...visibleEvents, ...programStartMarkers].sort(
        (a, b) => {
          const dateA = new Date(`${a.fecha}T${a.hora_inicio || "00:00:00"}`);
          const dateB = new Date(`${b.fecha}T${b.hora_inicio || "00:00:00"}`);
          if (dateA < dateB) return -1;
          if (dateA > dateB) return 1;
          if (a.isProgramMarker && !b.isProgramMarker) return -1;
          if (!a.isProgramMarker && b.isProgramMarker) return 1;
          return 0;
        }
      );

      processCategories(visibleEvents);

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

      if (visibleEvents.length > 0 && effectiveUserId !== "guest-general") {
        const eventIds = visibleEvents.map((e) => e.id);
        const { data: attendanceData } = await supabase
          .from("eventos_asistencia")
          .select("id_evento, estado")
          .in("id_evento", eventIds)
          .eq("id_integrante", effectiveUserId);
        const attendanceMap = {};
        attendanceData?.forEach((a) => {
          attendanceMap[a.id_evento] = a.estado;
        });
        visibleEvents.forEach((evt) => {
          evt.mi_asistencia = attendanceMap[evt.id];
          const myTourRecord = evt.programas?.giras_integrantes?.find(
            (i) => i.id_integrante === effectiveUserId
          );
          const myTourRole = myTourRecord?.rol || "musico";
          evt.is_convoked = checkIsConvoked(evt.convocados, myTourRole);
        });
      }

      setItems(allItems);
      localStorage.setItem(CACHE_KEY, JSON.stringify(allItems));
      setIsOfflineMode(false);
    } catch (err) {
      console.error("Error fetching agenda:", err);
      setIsOfflineMode(true);
    } finally {
      setLoading(false);
    }
  };

  const processCategories = (eventsList) => {
    const categoriesMap = {};
    eventsList.forEach((evt) => {
      if (evt.isProgramMarker) return;
      const cat = evt.tipos_evento?.categorias_tipos_eventos;
      if (cat && !categoriesMap[cat.id]) categoriesMap[cat.id] = cat;
    });

    const uniqueCats = Object.values(categoriesMap).sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );

    setAvailableCategories(uniqueCats);

    // CAMBIO: Si no hay selección previa, seleccionamos TODO automáticamente.
    // Eliminamos la lógica que filtraba por palabras "concierto" o "ensayo".
    if (selectedCategoryIds.length === 0 && uniqueCats.length > 0) {
      setSelectedCategoryIds(uniqueCats.map((c) => c.id));
    }
  };
  const toggleMealAttendance = async (eventId, newStatus) => {
    if (effectiveUserId === "guest-general") return;
    setLoading(true);
    try {
      const { error } = await supabase.from("eventos_asistencia").upsert(
        {
          id_evento: eventId,
          id_integrante: effectiveUserId,
          estado: newStatus,
        },
        { onConflict: "id_evento, id_integrante" }
      );
      if (error) throw error;
      const newItems = items.map((item) =>
        item.id === eventId ? { ...item, mi_asistencia: newStatus } : item
      );
      setItems(newItems);
      const CACHE_KEY = `agenda_cache_${effectiveUserId}_${
        giraId || "general"
      }_v4`;
      localStorage.setItem(CACHE_KEY, JSON.stringify(newItems));
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (filteredItems.length === 0)
      return alert("No hay eventos para exportar con los filtros actuales.");

    let subTitle = "";
    if (userProfile && userProfile.id !== user.id) {
      subTitle = `Vista simulada: ${userProfile.apellido}, ${userProfile.nombre}`;
    }
    if (showNonActive) {
      subTitle += subTitle ? " | Incluye Borradores" : "Incluye Borradores";
    }

    const hideGiraColumn = !!giraId;

    exportAgendaToPDF(filteredItems, title, subTitle, hideGiraColumn);
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
      id_gira: evt.id_gira || null,
    });
    setIsEditOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!editFormData.id) return;
    const confirm = window.confirm(
      "¿Seguro que deseas eliminar este evento? Esta acción no se puede deshacer."
    );
    if (!confirm) return;

    setLoading(true);
    try {
      const id = editFormData.id;
      await Promise.all([
        supabase
          .from("eventos_programas_asociados")
          .delete()
          .eq("id_evento", id),
        supabase.from("eventos_ensambles").delete().eq("id_evento", id),
        supabase.from("eventos_asistencia_custom").delete().eq("id_evento", id),
        supabase.from("eventos_asistencia").delete().eq("id_evento", id),
      ]);

      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;

      setIsEditOpen(false);
      fetchAgenda();
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateEvent = async () => {
    if (!editFormData.id) return;

    const confirm = window.confirm(
      "¿Deseas duplicar este evento? Se abrirá la copia para editar."
    );
    if (!confirm) return;

    setLoading(true);
    try {
      const payload = {
        descripcion: (editFormData.descripcion || "") + " - Copia",
        fecha: editFormData.fecha,
        hora_inicio: editFormData.hora_inicio,
        hora_fin: editFormData.hora_fin,
        id_tipo_evento: editFormData.id_tipo_evento || null,
        id_locacion: editFormData.id_locacion || null,
        id_gira: editFormData.id_gira || null,
      };

      const { data: newEvent, error: insertError } = await supabase
        .from("eventos")
        .insert([payload])
        .select()
        .single();
      if (insertError) throw insertError;

      const newEventId = newEvent.id;
      const originalId = editFormData.id;

      const [ensambles, programas] = await Promise.all([
        supabase
          .from("eventos_ensambles")
          .select("id_ensamble")
          .eq("id_evento", originalId),
        supabase
          .from("eventos_programas_asociados")
          .select("id_programa")
          .eq("id_evento", originalId),
      ]);

      const promises = [];
      if (ensambles.data?.length > 0) {
        const ensPayload = ensambles.data.map((e) => ({
          id_evento: newEventId,
          id_ensamble: e.id_ensamble,
        }));
        promises.push(supabase.from("eventos_ensambles").insert(ensPayload));
      }
      if (programas.data?.length > 0) {
        const progPayload = programas.data.map((p) => ({
          id_evento: newEventId,
          id_programa: p.id_programa,
        }));
        promises.push(
          supabase.from("eventos_programas_asociados").insert(progPayload)
        );
      }

      await Promise.all(promises);

      setEditFormData({
        ...editFormData,
        id: newEventId,
        descripcion: payload.descripcion,
      });

      fetchAgenda();
    } catch (err) {
      alert("Error al duplicar: " + err.message);
    } finally {
      setLoading(false);
    }
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

  const TourDivider = ({ gira }) => {
    const fechaDesde = gira.fecha_desde
      ? format(parseISO(gira.fecha_desde), "d MMM", { locale: es })
      : "";
    const fechaHasta = gira.fecha_hasta
      ? format(parseISO(gira.fecha_hasta), "d MMM", { locale: es })
      : "";

    let bgClass = "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-900";
    let borderClass = "border-fuchsia-500";

    if (gira.tipo === "Sinfónico") {
      bgClass = "bg-indigo-50 border-indigo-200 text-indigo-900";
      borderClass = "border-indigo-500";
    } else if (gira.tipo === "Ensamble") {
      bgClass = "bg-emerald-50 border-emerald-200 text-emerald-900";
      borderClass = "border-emerald-500";
    } else if (gira.tipo === "Jazz Band") {
      bgClass = "bg-amber-50 border-amber-200 text-amber-900";
      borderClass = "border-amber-500";
    }

    return (
      <div
        className={`border-l-4 ${borderClass} px-4 py-2 mt-4 mb-2 flex items-center gap-3 group animate-in fade-in rounded-r-md ${bgClass} overflow-hidden shadow-sm`}
      >
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold uppercase tracking-wider text-xs">
            {gira.tipo}
          </span>
          {gira.zona && (
            <span className="hidden sm:inline border border-current px-1.5 rounded text-[10px] opacity-70">
              {gira.zona}
            </span>
          )}
          {gira.estado === "Borrador" && (
            <span className="bg-slate-200 text-slate-600 px-1.5 rounded text-[10px] uppercase font-bold">
              Borrador
            </span>
          )}
          {gira.estado === "Pausada" && (
            <span className="bg-amber-200 text-amber-800 px-1.5 rounded text-[10px] uppercase font-bold">
              Pausada
            </span>
          )}
        </div>
        <span className="opacity-30">|</span>
        <div className="font-bold truncate text-sm sm:text-base flex items-center gap-2 min-w-0">
          <span className="whitespace-nowrap">{gira.mes_letra}</span>
          <span className="opacity-50">|</span>
          <span className="truncate">{gira.nomenclador}</span>
        </div>
        {fechaDesde && (
          <span className="hidden md:flex items-center font-normal opacity-70 text-xs whitespace-nowrap ml-auto md:ml-2">
            <span className="hidden lg:inline mr-1"></span> {fechaDesde} -{" "}
            {fechaHasta}
          </span>
        )}
        <div className="flex-1"></div>
        <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
          {gira.google_drive_folder_id && (
            <button
              onClick={() =>
                window.open(
                  `https://drive.google.com/drive/folders/${gira.google_drive_folder_id}`,
                  "_blank"
                )
              }
              className="p-1.5 bg-white/60 hover:bg-white text-current rounded transition-colors shadow-sm"
              title="Carpeta de Drive"
            >
              <IconDrive size={16} />
            </button>
          )}
          {onViewChange && (
            <button
              onClick={() => onViewChange("AGENDA", gira.id)}
              className="flex items-center gap-1 px-3 py-1 bg-white/60 hover:bg-white text-current rounded text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
            >
              Ver Gira <IconArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in relative">
      {isOfflineMode && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-1 text-[10px] sm:text-xs font-bold text-amber-800 text-center flex items-center justify-center gap-2 sticky top-0 z-40">
          <IconAlertTriangle size={14} />
          <span>Sin conexión a internet. Mostrando copia guardada.</span>
        </div>
      )}

      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30 shrink-0">
        <div className="px-4 py-3 flex items-center justify-between gap-2">
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
                <p className="text-xs text-slate-500 truncate">
                  Vista Compacta
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {/* --- BLOQUE DE FILTROS COMPACTO --- */}
            {!loading && availableCategories.length > 0 && (
              <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {canEdit && musicianOptions.length > 0 && (
                  <div className="shrink-0 w-[160px] border-r border-slate-200 pr-2 mr-1">
                    <SearchableSelect
                      options={musicianOptions}
                      value={viewAsUserId}
                      onChange={setViewAsUserId}
                      placeholder="Ver como..."
                      className="w-full text-xs"
                    />
                  </div>
                )}

                {/* Botón Toggle Todos (Reemplaza al "Ver todo") */}
                <button
                  onClick={() => {
                    if (
                      selectedCategoryIds.length === availableCategories.length
                    ) {
                      setSelectedCategoryIds([]); // Desmarcar todo
                    } else {
                      setSelectedCategoryIds(
                        availableCategories.map((c) => c.id)
                      ); // Marcar todo
                    }
                  }}
                  className={`p-1.5 rounded-md border transition-colors shrink-0 ${
                    selectedCategoryIds.length === availableCategories.length
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                  }`}
                  title={
                    selectedCategoryIds.length === availableCategories.length
                      ? "Deseleccionar todo"
                      : "Ver todo"
                  }
                >
                  <IconList size={14} />
                </button>

                {/* Lista de Categorías (Chips más pequeños) */}
                {availableCategories.map((cat) => {
                  const isActive = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryToggle(cat.id)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all whitespace-nowrap shrink-0 ${
                        isActive
                          ? "bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {cat.nombre}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={handleExportPDF}
              disabled={loading || filteredItems.length === 0}
              className="p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
              title="Exportar vista actual a PDF"
            >
              <IconPrinter size={20} />
            </button>

            {canEdit && !giraId && (
              <button
                onClick={() => setShowNonActive(!showNonActive)}
                className={`p-2 rounded-full transition-colors flex items-center gap-1 ${
                  showNonActive
                    ? "bg-amber-100 text-amber-700"
                    : "text-slate-400 hover:bg-slate-100"
                }`}
                title={
                  showNonActive ? "Ocultar borradores" : "Mostrar borradores"
                }
              >
                <IconEye
                  size={20}
                  className={showNonActive ? "" : "opacity-50"}
                />
              </button>
            )}

            {giraId && canEdit && !isOfflineMode && (
              <button
                onClick={handleOpenCreate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-sm shrink-0"
              >
                <IconPlus size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50">
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
                if (evt.isProgramMarker) {
                  return <TourDivider key={evt.id} gira={evt.programas} />;
                }

                const eventColor = evt.tipos_evento?.color || "#6366f1";
                const isMeal =
                  [7, 8, 9, 10].includes(evt.id_tipo_evento) ||
                  evt.tipos_evento?.nombre?.toLowerCase().includes("comida");
                const isNonConvokedMeal = isMeal && !evt.is_convoked;

                const isTransportEvent = !!evt.id_gira_transporte;
                let isMyTransport = false;
                let isMyUp = false;
                let isMyDown = false;
                let debugReason = null;

                // Datos para el badge de transporte
                const transportName =
                  evt.giras_transportes?.transportes?.nombre;
                const transportDetail = evt.giras_transportes?.detalle;

                if (isTransportEvent && evt.id_gira_transporte) {
                  const transportIdStr = String(evt.id_gira_transporte);
                  const myStatus = myTransportLogistics[transportIdStr];

                  if (myStatus && myStatus.assigned) {
                    isMyTransport = true;
                    if (String(myStatus.subidaId) === String(evt.id))
                      isMyUp = true;
                    if (String(myStatus.bajadaId) === String(evt.id))
                      isMyDown = true;
                  } else {
                    // Diagnóstico visual
                    const tourHasRules = toursWithRules.has(evt.id_gira);
                    debugReason = tourHasRules ? "No Match" : "Sin Reglas";
                  }
                }

                const shouldDim =
                  isNonConvokedMeal ||
                  evt.is_absent ||
                  (isTransportEvent && !isMyTransport);

                const deadlineStatus =
                  isMeal && evt.is_convoked
                    ? getDeadlineStatus(
                        evt.programas?.fecha_confirmacion_limite
                      )
                    : null;

                const showDay = evt.fecha !== lastDateRendered;
                if (showDay) lastDateRendered = evt.fecha;

                const locName = evt.locaciones?.nombre || "";
                const locCity = evt.locaciones?.localidades?.localidad;

                return (
                  <React.Fragment key={evt.id}>
                    {showDay && (
                      <div className="bg-slate-50/80 px-4 py-1.5 text-xs font-bold text-slate-500 uppercase border-b border-slate-100 flex items-center gap-2 sticky top-[45px] z-10">
                        <IconCalendar size={12} />{" "}
                        {format(parseISO(evt.fecha), "EEEE d", { locale: es })}
                      </div>
                    )}

                    <div
                      className={`relative flex flex-row items-stretch px-4 py-2 border-b border-slate-100 bg-white transition-colors hover:bg-slate-50 group gap-2 ${
                        shouldDim ? "opacity-50 grayscale" : ""
                      } ${evt.is_guest ? "bg-emerald-50/30" : ""} ${
                        isMyTransport
                          ? "bg-indigo-50/30 border-l-4 border-l-indigo-400"
                          : ""
                      }`}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-[4px]"
                        style={{
                          backgroundColor: evt.is_absent
                            ? "#94a3b8"
                            : isMyTransport
                            ? "transparent"
                            : eventColor,
                        }}
                      ></div>

                      <div className="w-10 md:w-14 font-mono text-xs md:text-sm text-slate-600 font-bold shrink-0 flex flex-col items-center md:items-end justify-center md:pr-4 md:border-r border-slate-100 pt-1 md:pt-0">
                        <span>{evt.hora_inicio?.slice(0, 5)}</span>
                        {evt.hora_fin && evt.hora_fin !== evt.hora_inicio && (
                          <span className="text-[9px] text-slate-400 block">
                            {evt.hora_fin.slice(0, 5)}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center md:gap-4 py-1">
                        <div className="flex items-center gap-2 shrink-0 md:w-48 mb-0.5 md:mb-0">
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border truncate max-w-[120px]"
                            style={{
                              color: eventColor,
                              borderColor: `${eventColor}40`,
                              backgroundColor: `${eventColor}10`,
                            }}
                          >
                            {evt.tipos_evento?.nombre}
                          </span>
                          {evt.programas?.nomenclador && (
                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                              {evt.programas.nomenclador}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center md:gap-4 flex-1 min-w-0">
                          <h4
                            className={`text-sm font-bold leading-tight truncate ${
                              shouldDim ? "text-slate-400" : "text-slate-800"
                            }`}
                          >
                            {evt.descripcion || evt.tipos_evento?.nombre}
                          </h4>

                          {/* --- BADGE DE TRANSPORTE Y MARCADORES --- */}
                          <div className="flex flex-wrap gap-1">
                            {isTransportEvent && transportName && (
                              <span
                                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  isMyTransport
                                    ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}
                              >
                                <IconBus size={10} />
                                {transportName}{" "}
                                {transportDetail && (
                                  <span className="font-normal opacity-80">
                                    ({transportDetail})
                                  </span>
                                )}
                              </span>
                            )}

                            {isMyUp && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-pulse">
                                <IconUpload size={12} /> Mi Subida
                              </span>
                            )}
                            {isMyDown && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 animate-pulse">
                                <IconDownload size={12} /> Mi Bajada
                              </span>
                            )}

                            {/* DIAGNÓSTICO VISUAL */}
                            {isTransportEvent && !isMyTransport && (
                              <span
                                className="text-[8px] text-red-300 font-mono select-none"
                                title="El sistema no te asignó este transporte."
                              >
                                [{debugReason}]
                              </span>
                            )}
                          </div>
                          {/* ------------------------------------------------ */}

                          {locName && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 md:border-l md:border-slate-200 md:pl-3 truncate mt-0.5 md:mt-0">
                              <IconMapPin
                                size={10}
                                className="text-slate-400 shrink-0"
                              />
                              <span className="truncate">
                                {locName} {locCity ? `(${locCity})` : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-start md:items-center gap-1 pl-2 md:pl-4 md:border-l border-slate-100 pt-1 md:pt-0">
                        <DriveSmartButton evt={evt} />
                        {evt.programas?.id &&
                          onOpenRepertoire &&
                          !isNonConvokedMeal && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenRepertoire(evt.programas.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-white border border-transparent hover:border-slate-100"
                              title="Ver Repertorio"
                            >
                              <IconList size={16} />
                            </button>
                          )}
                        <div className="flex flex-col items-end gap-1 relative">
                          {canEdit && !isOfflineMode && (
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
            onDelete={handleDeleteEvent}
            onDuplicate={handleDuplicateEvent}
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
