import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  format,
  startOfDay,
  addMonths,
  parseISO,
  isPast,
  differenceInDays,
  differenceInHours,
  formatDistanceToNow,
} from "date-fns";
import { toast } from "sonner";
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
  IconArrowRight,
  IconEye,
  IconPrinter,
  IconUpload,
  IconDownload,
  IconBus,
  IconAlertTriangle,
  IconEyeOff,
  IconUtensils,
  IconFilter,
} from "../ui/Icons";
import { useAuth } from "../../context/AuthContext";
import CommentsManager from "../comments/CommentsManager";
import CommentButton from "../comments/CommentButton";
import EventForm from "../forms/EventForm";
import IndependentRehearsalForm from "../../views/Ensembles/IndependentRehearsalForm";
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
// Función segura para guardar en caché
const saveToCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    // Si el error es por falta de espacio (QuotaExceededError)
    if (error.name === "QuotaExceededError" || error.code === 22) {
      console.warn("⚠️ LocalStorage lleno. Limpiando caché antigua...");

      // 1. Borrar todas las claves que empiecen con 'agenda_cache_'
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("agenda_cache_")) {
          localStorage.removeItem(k);
        }
      });

      // 2. Intentar guardar de nuevo ahora que hicimos espacio
      try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log("✅ Caché guardado tras limpieza.");
      } catch (retryError) {
        console.error(
          "❌ Imposible guardar en caché (datos demasiado grandes). La app funcionará sin caché.",
        );
      }
    }
  }
};
const ConnectionBadge = ({ status, lastUpdate, onRefresh, isRefreshing }) => {
  const isOnline = status === "SUBSCRIBED";
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  let timeText = "recién";
  try {
    if (lastUpdate && !isNaN(new Date(lastUpdate).getTime()) && es) {
      timeText = formatDistanceToNow(new Date(lastUpdate), {
        addSuffix: true,
        locale: es,
      });
    }
  } catch (err) {
    timeText = "hace un momento";
  }

  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className={`
        flex items-center gap-2 rounded-full font-bold shadow-sm border transition-all animate-in fade-in
        px-2 py-1 sm:px-3
        ${
          isOnline
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
        }
        ${isRefreshing ? "opacity-70 cursor-wait" : ""}
      `}
      title={`Estado: ${isOnline ? "En línea" : "Conectando"}`}
    >
      <span className="relative flex h-2.5 w-2.5 sm:h-2 sm:w-2">
        {isOnline && !isRefreshing && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 sm:h-2 sm:w-2 ${
            isOnline ? "bg-emerald-500" : "bg-amber-500"
          }`}
        ></span>
      </span>

      <div className="hidden sm:flex flex-col items-start leading-tight">
        <span className="uppercase tracking-wider text-[9px]">
          {isRefreshing
            ? "Actualizando..."
            : isOnline
              ? "En línea"
              : "Conectando..."}
        </span>
        {!isRefreshing && (
          <span className="font-normal opacity-80 text-[9px] normal-case whitespace-nowrap">
            Act. {timeText}
          </span>
        )}
      </div>
    </button>
  );
};
const getGoogleMapsUrl = (locacion) => {
  if (!locacion) return null;

  // 1. Si ya tienes un link guardado en BD, úsalo (opcional)
  if (locacion.link_mapa) return locacion.link_mapa;

  // 2. Construcción dinámica
  const partes = [];
  if (locacion.nombre) partes.push(locacion.nombre);
  if (locacion.direccion) partes.push(locacion.direccion);
  if (locacion.localidades?.localidad)
    partes.push(locacion.localidades.localidad);

  // "Rio Negro, Argentina" ayuda a la precisión si hay ciudades homónimas
  partes.push("Rio Negro, Argentina");

  const query = encodeURIComponent(partes.join(", "));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};
export default function UnifiedAgenda({
  supabase,
  giraId = null,
  onBack = null,
  title = "Agenda General",
  onOpenRepertoire = null,
  onViewChange = null,
}) {
  const { user, isEditor, isManagement } = useAuth();
  const [techFilter, setTechFilter] = useState(
    isManagement ? "all" : "no_tech",
  );

  useEffect(() => {
    if (!isManagement) setTechFilter("no_tech");
  }, [isManagement]);
  // Estado para el modal de comida en móvil
  const [mealActionTarget, setMealActionTarget] = useState(null);
  const toggleEventTechnica = async (e, eventId, currentValue) => {
    e.stopPropagation();
    if (!isEditor && !isManagement) return;
    try {
      const { error } = await supabase
        .from("eventos")
        .update({ tecnica: !currentValue })
        .eq("id", eventId);
      if (error) throw error;
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === eventId ? { ...item, tecnica: !currentValue } : item,
        ),
      );
    } catch (err) {
      console.error("Error al cambiar técnica:", err);
      alert("No se pudo guardar el cambio.");
    }
  };

  const [viewAsUserId, setViewAsUserId] = useState(null);
  const [musicianOptions, setMusicianOptions] = useState([]);

  const effectiveUserId = viewAsUserId || user.id;
  const STORAGE_KEY = `unified_agenda_filters_v4_${effectiveUserId}`;
  const defaultPersonalFilter = !isEditor && !isManagement && !user?.isGeneral;
  // --- ESTADOS ---
  const [coordinatedEnsembles, setCoordinatedEnsembles] = useState(new Set());
  const [myEnsembleObjects, setMyEnsembleObjects] = useState([]);
  const [realtimeStatus, setRealtimeStatus] = useState("CONNECTING");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // SEPARACIÓN DE ESTADOS DE CARGA (CLAVE PARA MÓVIL)
  const [loading, setLoading] = useState(false); // Carga inicial (pantalla vacía)
  const [isRefreshing, setIsRefreshing] = useState(false); // Recarga silenciosa (datos visibles)

  // --- FETCH COORDINACIÓN ---
  useEffect(() => {
    const fetchCoordination = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("ensambles_coordinadores")
        .select("id_ensamble, ensambles(id, ensamble)")
        .eq("id_integrante", user.id);
      if (data) {
        const ids = new Set(data.map((d) => d.id_ensamble));
        const objects = data.map((d) => d.ensambles).filter(Boolean);
        setCoordinatedEnsembles(ids);
        setMyEnsembleObjects(objects);
      }
    };
    fetchCoordination();
  }, [user, supabase]);

  const isGlobalEditor = [
    "admin",
    "editor",
    "coord_general",
    "director",
  ].includes(user?.rol_sistema);
  const canEdit = isGlobalEditor || coordinatedEnsembles.size > 0;

  const canUserEditEvent = (evt) => {
    if (isGlobalEditor) return true;
    if (coordinatedEnsembles.size > 0) {
      if (evt.id_tipo_evento === 13) {
        const involvedEnsembles =
          evt.eventos_ensambles?.map((ee) => ee.ensambles?.id) || [];
        const hasMatch = involvedEnsembles.some((id) =>
          coordinatedEnsembles.has(id),
        );
        if (hasMatch) return true;
      }
      if (evt.id_tipo_evento === 1 && evt.programas) {
        if (evt.programas.tipo === "Ensamble") {
          const sources = evt.programas.giras_fuentes || [];
          const hasMatch = sources.some(
            (s) =>
              s.tipo === "ENSAMBLE" &&
              coordinatedEnsembles.has(parseInt(s.valor_id)),
          );
          if (hasMatch) return true;
        }
      }
    }
    return false;
  };

  const getInitialFilterState = (key, defaultVal) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p[key] !== undefined) return p[key];
      }
    } catch (e) {
      console.error("Error reading filters", e);
    }
    return defaultVal;
  };

  const [selectedCategoryIds, setSelectedCategoryIds] = useState(() => {
    const saved = getInitialFilterState("categories", []);
    if (!isEditor && !isManagement) {
      return saved.filter((id) => id !== 3);
    }
    return saved;
  });
  const [showNonActive, setShowNonActive] = useState(() =>
    getInitialFilterState("showNonActive"),
  );
  const [showOnlyMyTransport, setShowOnlyMyTransport] = useState(() =>
    getInitialFilterState("showOnlyMyTransport", defaultPersonalFilter),
  );
  const [showOnlyMyMeals, setShowOnlyMyMeals] = useState(() =>
    getInitialFilterState("showOnlyMyMeals", defaultPersonalFilter),
  );
  const [showNoGray, setShowNoGray] = useState(() =>
    getInitialFilterState("showAllTransport", false),
  );

  useEffect(() => {
    const data = {
      categories: selectedCategoryIds,
      showNonActive,
      showOnlyMyTransport,
      showOnlyMyMeals,
      showAllTransport: showNoGray,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [
    selectedCategoryIds,
    showNonActive,
    showOnlyMyTransport,
    showOnlyMyMeals,
    showNoGray,
    STORAGE_KEY,
  ]);

  const prevUserIdRef = useRef(effectiveUserId);
  useEffect(() => {
    if (prevUserIdRef.current !== effectiveUserId) {
      // (Lógica de reset de filtros al cambiar usuario)
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const p = JSON.parse(saved);
          let loadedCats = p.categories || [];
          if (!isEditor && !isManagement) {
            loadedCats = loadedCats.filter((id) => id !== 3);
          }
          setSelectedCategoryIds(loadedCats);
          setShowNonActive(p.showNonActive || false);
          setShowOnlyMyTransport(p.showOnlyMyTransport || false);
          setShowOnlyMyMeals(p.showOnlyMyMeals || false);
          setShowNoGray(p.showAllTransport || false);
        } else {
          setSelectedCategoryIds([]);
          setShowNonActive(false);
          setShowOnlyMyTransport(false);
          setShowOnlyMyMeals(false);
          setShowNoGray(false);
        }
      } catch (e) {
        console.error(e);
      }
      prevUserIdRef.current = effectiveUserId;
    }
  }, [effectiveUserId, STORAGE_KEY, isEditor, isManagement]);

  const [items, setItems] = useState([]);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [monthsLimit, setMonthsLimit] = useState(3);
  const [availableCategories, setAvailableCategories] = useState([]);

  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef(null);
  useOutsideAlerter(filterMenuRef, () => setIsFilterMenuOpen(false));

  const [myTransportLogistics, setMyTransportLogistics] = useState({});
  const [toursWithRules, setToursWithRules] = useState(new Set());

  const [commentsState, setCommentsState] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRehearsalEditOpen, setIsRehearsalEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editingEventObj, setEditingEventObj] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFormData, setNewFormData] = useState({});
  const [formEventTypes, setFormEventTypes] = useState([]);
  const [formLocations, setFormLocations] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const fetchMusicians = async () => {
      if (isGlobalEditor && navigator.onLine) {
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
  }, [isGlobalEditor, supabase]);

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
            "*, instrumentos(familia, instrumento), integrantes_ensambles(id_ensamble), datos_residencia:localidades!id_localidad (id, id_region)",
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

  const fetchFormLocations = useCallback(async () => {
    if (!canEdit || !navigator.onLine) return;
    try {
      const { data: locs } = await supabase
        .from("locaciones")
        .select("id, nombre, localidades(localidad)")
        .order("nombre");
      if (locs) setFormLocations(locs);
    } catch (e) {
      console.error(e);
    }
  }, [canEdit, supabase]);

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
      if (userProfile) fetchAgenda(true);
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
        : [...prev, catId],
    );
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const catId = item.tipos_evento?.categorias_tipos_eventos?.id;
      if (!showNonActive) {
        const estadoGira = item.programas?.estado || "Borrador";
        if (item.isProgramMarker) {
          if (estadoGira !== "Vigente") return false;
        } else if (item.programas && estadoGira !== "Vigente") {
          return false;
        }
      }
      if (item.isProgramMarker) return true;
      if (!isManagement && item.tecnica) return false;
      if (isManagement) {
        if (techFilter === "only_tech" && !item.tecnica) return false;
        if (techFilter === "no_tech" && item.tecnica) return false;
      }
      if (selectedCategoryIds.length > 0) {
        if (catId && !selectedCategoryIds.includes(catId)) return false;
      }
      if (showOnlyMyTransport && item.id_gira_transporte) {
        const tId = String(item.id_gira_transporte);
        if (!myTransportLogistics[tId]?.assigned) return false;
      }
      if (showOnlyMyMeals) {
        const isMeal =
          [7, 8, 9, 10].includes(item.id_tipo_evento) ||
          item.tipos_evento?.nombre?.toLowerCase().includes("comida");
        if (isMeal && !item.is_convoked) return false;
      }
      return true;
    });
  }, [
    items,
    selectedCategoryIds,
    showNonActive,
    showOnlyMyTransport,
    showOnlyMyMeals,
    myTransportLogistics,
    techFilter,
    isManagement,
    isEditor,
  ]);

  const checkIsConvoked = (convocadosList, tourRole) => {
    if (!convocadosList || convocadosList.length === 0) return false;
    return convocadosList.some((tag) => {
      if (tag === "GRP:TUTTI") return true;
      if (tag === "GRP:LOCALES") return userProfile.is_local;
      if (tag === "GRP:NO_LOCALES") return !userProfile.is_local;
      if (tag === "GRP:PRODUCCION") {
        // Lista de roles que "comen" con el grupo de Producción
        const rolesProduccion = [
          "produccion",
          "chofer",
          "acompañante",
          "staff",
          "mus_prod",
          "técnico",
        ];

        // Verificamos si el rol de la persona está en esa lista
        return rolesProduccion.includes(userProfile.rol_gira);
      }
      if (tag === "GRP:SOLISTAS") return tourRole === "solista";
      if (tag === "GRP:DIRECTORES") return tourRole === "director";
      if (tag.startsWith("LOC:"))
        return userProfile.id_localidad === parseInt(tag.split(":")[1]);
      if (tag.startsWith("FAM:"))
        return userProfile.instrumentos?.familia === tag.split(":")[1];
      return false;
    });
  };
  // --- REALTIME SUBSCRIPTION (DEBOUNCE + SAFETY) ---
  // Control para cancelar peticiones viejas si llegan nuevas rápido
  const abortControllerRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  // --- FUNCIÓN FETCH BLINDADA ---
  // --- FUNCIÓN FETCH BLINDADA Y COMPLETA ---
  // --- FUNCIÓN FETCH BLINDADA Y COMPLETA ---
  const fetchAgenda = async (isBackground = false) => {
    // 1. GESTIÓN DE ABORT CONTROLLER
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);

    const CACHE_KEY = `agenda_cache_${effectiveUserId}_${giraId || "general"}_v5`;

    try {
      // 2. CARGA INICIAL DESDE CACHÉ
      if (!isBackground && items.length === 0) {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          setItems(parsedData);
          processCategories(parsedData);
        }
      }

      // 3. VERIFICACIÓN ONLINE
      if (!navigator.onLine) {
        setIsOfflineMode(true);
        throw new Error("OFFLINE_MODE");
      }

      // 4. PREPARACIÓN DE VARIABLES
      const start = startOfDay(new Date()).toISOString();
      const end = addMonths(new Date(), monthsLimit).toISOString();
      const profileRole = userProfile?.rol_sistema || "musico";

      let myEnsembles = new Set();
      let myFamily = null;

      if (userProfile) {
        userProfile.integrantes_ensambles?.forEach((ie) =>
          myEnsembles.add(ie.id_ensamble),
        );
        myFamily = userProfile.instrumentos?.familia;
      }

      // 5. FETCH DATOS AUXILIARES
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

      if (signal.aborted) return;

      const customMap = new Map();
      customAttendance.data?.forEach((c) => customMap.set(c.id_evento, c));
      const myEnsembleEventIds = new Set(
        ensembleEvents.data?.map((e) => e.id_evento),
      );

      // 6. QUERY PRINCIPAL
      let query = supabase
        .from("eventos")
        .select(
          `
            id, fecha, hora_inicio, hora_fin, tecnica, descripcion, convocados, id_tipo_evento, id_locacion, id_gira, id_gira_transporte,
            giras_transportes (
                id, detalle,
                transportes ( nombre, color ) 
            ),
            tipos_evento (
                id, nombre, color,
                categorias_tipos_eventos (id, nombre)
            ), 
            locaciones (
                id, nombre, direccion, link_mapa,
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
            ),
            eventos_ensambles (
                ensambles ( id, ensamble )
            )
        `,
        )
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true })
        .abortSignal(signal);

      if (giraId) query = query.eq("id_gira", giraId);
      else query = query.gte("fecha", start).lte("fecha", end);

      const { data: eventsData, error } = await query;

      if (error) {
        // DETECCIÓN ROBUSTA DE ABORT
        if (
          error.code === "AbortError" ||
          error.message?.includes("AbortError") ||
          signal.aborted
        )
          return;
        throw error;
      }

      // 7. LÓGICA DE LOGÍSTICA
      const activeTourIds = new Set();
      eventsData?.forEach((e) => {
        if (e.id_gira) activeTourIds.add(e.id_gira);
      });

      let logisticsMap = {};
      const foundRuleTours = new Set();

      if (activeTourIds.size > 0 && userProfile) {
        const [admRes, routesRes, transRes] = await Promise.all([
          supabase
            .from("giras_logistica_admision")
            .select("*")
            .in("id_gira", Array.from(activeTourIds)),
          supabase
            .from("giras_logistica_rutas")
            .select(
              "*, evento_subida:id_evento_subida(id, fecha, hora_inicio), evento_bajada:id_evento_bajada(id, fecha, hora_inicio)",
            )
            .in("id_gira", Array.from(activeTourIds)),
          supabase
            .from("giras_transportes")
            .select("id, id_gira, detalle, transportes(nombre)")
            .in("id_gira", Array.from(activeTourIds)),
        ]);

        const admissionData = admRes.data || [];
        const routesData = routesRes.data || [];
        const transportsData = transRes.data || [];

        if (transportsData.length > 0) {
          const admissionByGira = {};
          const routesByGira = {};
          const transportsByGira = {};

          admissionData.forEach((r) => {
            if (!admissionByGira[r.id_gira]) admissionByGira[r.id_gira] = [];
            admissionByGira[r.id_gira].push(r);
            foundRuleTours.add(r.id_gira);
          });

          routesData.forEach((r) => {
            if (!routesByGira[r.id_gira]) routesByGira[r.id_gira] = [];
            routesByGira[r.id_gira].push(r);
            foundRuleTours.add(r.id_gira);
          });

          transportsData.forEach((t) => {
            if (!transportsByGira[t.id_gira]) transportsByGira[t.id_gira] = [];
            transportsByGira[t.id_gira].push(t);
          });

          const userEnsemblesIds = (
            userProfile.integrantes_ensambles || []
          ).map((ie) => String(ie.id_ensamble));
          const cleanLocId = userProfile.id_localidad
            ? Number(userProfile.id_localidad)
            : null;
          const residenciaObj = userProfile.datos_residencia;
          const cleanRegionId = residenciaObj?.id_region
            ? Number(residenciaObj.id_region)
            : null;

          activeTourIds.forEach((gId) => {
            const sampleEvt = eventsData.find(
              (e) => String(e.id_gira) === String(gId) && e.programas,
            );

            const currentTransports = transportsByGira[gId] || [];
            if (currentTransports.length === 0) return;

            let esAdicional = false;
            let tourRole = "musico";
            let estadoGira = null;

            if (sampleEvt && sampleEvt.programas) {
              const members = sampleEvt.programas.giras_integrantes || [];
              const myRecord = members.find(
                (i) => String(i.id_integrante) === String(effectiveUserId),
              );

              if (myRecord) {
                tourRole = myRecord.rol;
                estadoGira = myRecord.estado;
                if (["baja", "no_convocado", "ausente"].includes(estadoGira))
                  return;
              }

              const sources = sampleEvt.programas.giras_fuentes || [];
              let isBase = false;

              const matchesSource = sources.some((src) => {
                if (
                  src.tipo === "ENSAMBLE" &&
                  userEnsemblesIds.includes(String(src.valor_id))
                ) {
                  isBase = true;
                  return true;
                }
                if (src.tipo === "FAMILIA" && src.valor_texto === myFamily) {
                  isBase = true;
                  return true;
                }
                return false;
              });

              if (!myRecord && !matchesSource) return;
              esAdicional = !!myRecord && !isBase;
            }

            const mockPerson = {
              ...userProfile,
              id: userProfile.id,
              id_localidad: cleanLocId,
              localidades: {
                id: cleanLocId,
                id_region: cleanRegionId,
              },
              instrumentos: userProfile.instrumentos || {},
              rol_gira: tourRole,
              estado_gira: estadoGira,
              es_adicional: esAdicional,
              logistics: {},
            };

            const result = calculateLogisticsSummary(
              [mockPerson],
              [],
              admissionByGira[gId] || [],
              routesByGira[gId] || [],
              currentTransports,
              [],
            );

            const myTransports = result[0]?.logistics?.transports || [];
            myTransports.forEach((t) => {
              logisticsMap[String(t.id)] = {
                assigned: true,
                subidaId: t.subidaId,
                bajadaId: t.bajadaId,
                priority: t.priority,
              };
            });
          });
        }
      }

      setMyTransportLogistics(logisticsMap);
      setToursWithRules(foundRuleTours);

      // 8. FILTRADO
      const visibleEvents = (eventsData || []).filter((item) => {
        if (!item.fecha) return false;
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
            (o) => o.id_integrante === effectiveUserId,
          );
          if (myOverride) {
            if (
              myOverride.estado === "baja" ||
              myOverride.estado === "no_convocado" ||
              myOverride.estado === "ausente"
            )
              return false;
            return true;
          }
          return sources.some(
            (s) =>
              (s.tipo === "ENSAMBLE" && myEnsembles.has(s.valor_id)) ||
              (s.tipo === "FAMILIA" && s.valor_texto === myFamily),
          );
        }
        return false;
      });

      // 9. MARCADORES
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

      // 10. UNIÓN
      const allItems = [...visibleEvents, ...programStartMarkers].sort(
        (a, b) => {
          const dateA = new Date(`${a.fecha}T${a.hora_inicio || "00:00:00"}`);
          const dateB = new Date(`${b.fecha}T${b.hora_inicio || "00:00:00"}`);
          if (dateA < dateB) return -1;
          if (dateA > dateB) return 1;
          if (a.isProgramMarker && !b.isProgramMarker) return -1;
          if (!a.isProgramMarker && b.isProgramMarker) return 1;
          return 0;
        },
      );

      // 11. CATEGORÍAS
      processCategories(visibleEvents);

      // 12. FLAGS Y ASISTENCIA
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
            (i) => i.id_integrante === effectiveUserId,
          );
          const myTourRole = myTourRecord?.rol || "musico";
          evt.is_convoked = checkIsConvoked(evt.convocados, myTourRole);
        });
      }

      // 13. CHEQUEO FINAL DE ABORT
      if (signal.aborted) return;

      setItems(allItems);
      // 🟢 AHORA (Solución segura)
      saveToCache(CACHE_KEY, allItems);
      setIsOfflineMode(false);
      setLastUpdate(new Date());
    } catch (err) {
      // MANEJO DE ERRORES DE CANCELACIÓN (CATCH)
      if (
        err.name === "AbortError" ||
        err.code === 20 ||
        err.message?.includes("AbortError") ||
        signal.aborted
      ) {
        console.log("Petición cancelada por actualización más reciente");
        return;
      }

      if (err.message === "OFFLINE_MODE") {
        return;
      }

      console.error("Error fetching agenda:", err);
      if (!isBackground) setIsOfflineMode(true);
    } finally {
      // Solo desactivamos loading si esta es la petición activa
      if (abortControllerRef.current === controller) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("agenda-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "eventos" },
        (payload) => {
          console.log("Cambio detectado:", payload.eventType);

          // ESTRATEGIA: "CALMA, LUEGO ACTUALIZA"
          // Si hay una ráfaga de cambios, cancelamos el timer anterior y reiniciamos.
          if (refreshTimeoutRef.current)
            clearTimeout(refreshTimeoutRef.current);

          // Feedback visual inmediato (pero no tocamos la lista todavía)
          toast.info("Detectando cambios...", {
            id: "sync-toast",
            duration: 2000,
          });

          refreshTimeoutRef.current = setTimeout(() => {
            fetchAgenda(true); // <--- Esto llamará al fetch blindado con AbortController
          }, 1500); // Esperamos 1.5 segundos de silencio total antes de recargar
        },
      )
      .subscribe((status) => {
        setRealtimeStatus(status);
      });

    return () => {
      supabase.removeChannel(channel);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort(); // Limpieza al desmontar
    };
  }, [user, giraId]);

  const processCategories = (eventsList) => {
    const categoriesMap = {};
    eventsList.forEach((evt) => {
      if (evt.isProgramMarker) return;
      const cat = evt.tipos_evento?.categorias_tipos_eventos;
      if (cat && !categoriesMap[cat.id]) categoriesMap[cat.id] = cat;
    });

    const uniqueCats = Object.values(categoriesMap).sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );

    setAvailableCategories(uniqueCats);

    if (selectedCategoryIds.length === 0 && uniqueCats.length > 0) {
      const defaultSelection = uniqueCats
        .filter((cat) => {
          if (isEditor || isManagement) return true;
          return cat.id !== 3;
        })
        .map((c) => c.id);
      setSelectedCategoryIds(defaultSelection);
    }
  };

  const toggleMealAttendance = async (eventId, newStatus) => {
    if (effectiveUserId === "guest-general") return;

    // 1. BUSCAR EL EVENTO ACTUAL EN EL ESTADO PARA VALIDAR
    const currentEvent = items.find((i) => i.id === eventId);
    if (!currentEvent) return;

    // 2. VALIDAR CONVOCATORIA
    if (!currentEvent.is_convoked) {
      toast.error("No estás convocado a esta comida.");
      return;
    }

    // 3. VALIDAR FECHA LÍMITE
    // Si quiere cancelar (newStatus === null) y ya cerró, a veces se permite avisar,
    // pero si es estricto, bloqueamos todo. Asumamos bloqueo estricto si cerró.
    const deadline = getDeadlineStatus(
      currentEvent.programas?.fecha_confirmacion_limite,
    );

    // Si ya está cerrado, solo permitimos si es un admin/gestor, sino error
    if (deadline.status === "CLOSED" && !isManagement && !isEditor) {
      toast.error("La votación para esta comida ya cerró.");
      return;
    }

    setIsRefreshing(true);
    try {
      // ... (Lógica de base de datos igual que antes) ...
      const { error } = await supabase.from("eventos_asistencia").upsert(
        {
          id_evento: eventId,
          id_integrante: effectiveUserId,
          estado: newStatus,
        },
        { onConflict: "id_evento, id_integrante" },
      );
      if (error) throw error;

      const newItems = items.map((item) =>
        item.id === eventId ? { ...item, mi_asistencia: newStatus } : item,
      );
      setItems(newItems);
      const CACHE_KEY = `agenda_cache_${effectiveUserId}_${giraId || "general"}_v5`;
      localStorage.setItem(CACHE_KEY, JSON.stringify(newItems));

      // Cerrar modal si estaba abierto
      setMealActionTarget(null);
      toast.success(
        newStatus === "P"
          ? "Asistencia confirmada"
          : newStatus === "A"
            ? "Asistencia rechazada"
            : "Selección eliminada",
      );
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setIsRefreshing(false);
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
    if (
      evt.id_tipo_evento === 13 &&
      coordinatedEnsembles.size > 0 &&
      canUserEditEvent(evt)
    ) {
      setEditingEventObj(evt);
      setIsRehearsalEditOpen(true);
      return;
    }
    setEditFormData({
      id: evt.id,
      descripcion: evt.descripcion || "",
      fecha: evt.fecha || "",
      hora_inicio: evt.hora_inicio || "",
      hora_fin: evt.hora_fin || "",
      id_tipo_evento: evt.id_tipo_evento || "",
      id_locacion: evt.id_locacion || "",
      id_gira: evt.id_gira || null,
      tecnica: evt.tecnica || false,
    });
    setIsEditOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!editFormData.id) return;
    const confirm = window.confirm(
      "¿Seguro que deseas eliminar este evento? Esta acción no se puede deshacer.",
    );
    if (!confirm) return;

    // Delete no usa background loading para dar feedback inmediato
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
      setLoading(false);
    }
  };

  const handleDuplicateEvent = async () => {
    if (!editFormData.id) return;
    const confirm = window.confirm(
      "¿Deseas duplicar este evento? Se abrirá la copia para editar.",
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
        tecnica: editFormData.tecnica || false,
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
          supabase.from("eventos_programas_asociados").insert(progPayload),
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
        tecnica: editFormData.tecnica || false,
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
      tecnica: false,
    });
    setIsCreating(true);
  };

  const handleCreateSave = async () => {
    if (!newFormData.fecha || !newFormData.hora_inicio)
      return alert("Faltan datos");
    setLoading(true); // Bloqueamos para crear
    const payload = {
      id_gira: giraId,
      descripcion: newFormData.descripcion || null,
      fecha: newFormData.fecha,
      hora_inicio: newFormData.hora_inicio,
      hora_fin: newFormData.hora_fin || newFormData.hora_inicio,
      id_tipo_evento: newFormData.id_tipo_evento || null,
      id_locacion: newFormData.id_locacion || null,
      tecnica: newFormData.tecnica,
    };
    const { error } = await supabase.from("eventos").insert([payload]);
    if (!error) {
      setIsCreating(false);
      fetchAgenda();
    } else {
      setLoading(false);
    }
  };

  const groupedByMonth = filteredItems.reduce((acc, item) => {
    try {
      // Validamos antes de formatear
      if (!item.fecha) return acc;

      const parsedDate = parseISO(item.fecha);
      if (isNaN(parsedDate.getTime())) return acc;

      const monthKey = format(parsedDate, "yyyy-MM");
      if (!acc[monthKey]) acc[monthKey] = [];
      acc[monthKey].push(item);
    } catch (err) {
      console.warn("Evento omitido por error de fecha:", item, err);
    }
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
                  "_blank",
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

          <div className="flex gap-2 items-center">
            <ConnectionBadge
              status={realtimeStatus}
              lastUpdate={lastUpdate}
              onRefresh={() => fetchAgenda(false)}
              isRefreshing={isRefreshing}
            />

            {/* BOTONES DE FILTRO ... (igual que antes) */}
            {availableCategories.length > 0 && (
              <>
                <div className="relative" ref={filterMenuRef}>
                  <button
                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all text-sm font-bold shadow-sm hover:shadow-md ${
                      isFilterMenuOpen ||
                      selectedCategoryIds.length < availableCategories.length ||
                      showOnlyMyTransport ||
                      showOnlyMyMeals ||
                      showNoGray
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <IconFilter size={16} />
                    <span className="hidden sm:inline">Filtros</span>
                    {(selectedCategoryIds.length < availableCategories.length ||
                      showOnlyMyTransport ||
                      showOnlyMyMeals ||
                      showNoGray) && (
                      <span className="flex h-2 w-2 rounded-full bg-indigo-400"></span>
                    )}
                  </button>

                  {isFilterMenuOpen && (
                    <div
                      className={`
                        /* --- MÓVIL: Centrado fijo --- */
                        fixed top-20 left-1/2 -translate-x-1/2 w-[80%] max-w-sm
                        
                        /* --- ESCRITORIO (sm+): Absoluto a la derecha --- */
                        sm:absolute sm:top-full sm:left-auto sm:right-0 sm:translate-x-0 sm:mt-2 sm:w-72 sm:max-w-none
                        
                        /* --- ESTILOS COMUNES --- */
                        bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden 
                        animate-in fade-in zoom-in-95 origin-top sm:origin-top-right
                      `}
                    >
                      {/* ... Menú de filtros (igual) ... */}
                      <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Opciones de Vista
                        </span>
                        <button
                          onClick={() => {
                            const catsToSelect = availableCategories
                              .filter((c) =>
                                isEditor || isManagement ? true : c.id !== 3,
                              )
                              .map((c) => c.id);
                            setSelectedCategoryIds(catsToSelect);
                            setShowOnlyMyTransport(false);
                            setShowOnlyMyMeals(false);
                            setShowNoGray(false);
                            if (isManagement) setTechFilter("all");
                          }}
                          className="text-[10px] text-indigo-600 hover:underline font-bold"
                        >
                          Restablecer
                        </button>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto">
                        {/* ... (Resto de filtros) ... */}
                        {isManagement && (
                          <div className="p-2 border-b border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
                              Filtro Técnica
                            </span>
                            <div className="flex bg-slate-100 p-1 rounded-lg mx-2">
                              <button
                                onClick={() => setTechFilter("all")}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${techFilter === "all" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
                              >
                                Todos
                              </button>
                              <button
                                onClick={() => setTechFilter("only_tech")}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${techFilter === "only_tech" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
                              >
                                Sólo Téc.
                              </button>
                              <button
                                onClick={() => setTechFilter("no_tech")}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${techFilter === "no_tech" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
                              >
                                Sin Téc.
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="p-2 border-b border-slate-100 space-y-1">
                          <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer group">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <IconBus size={16} className="text-indigo-500" />
                              <span>Solo mi transporte</span>
                            </div>
                            <input
                              type="checkbox"
                              className="accent-indigo-600 w-4 h-4"
                              checked={showOnlyMyTransport}
                              onChange={(e) => {
                                setShowOnlyMyTransport(e.target.checked);
                                if (e.target.checked) setShowNoGray(false);
                              }}
                            />
                          </label>
                          {canEdit && (
                            <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer group">
                              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <IconEye size={16} className="text-slate-500" />
                                <span>Sin grises</span>
                              </div>
                              <input
                                type="checkbox"
                                className="accent-slate-600 w-4 h-4"
                                checked={showNoGray}
                                onChange={(e) => {
                                  setShowNoGray(e.target.checked);
                                  if (e.target.checked)
                                    setShowOnlyMyTransport(false);
                                }}
                              />
                            </label>
                          )}
                          <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer group">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <span className="text-lg leading-none">🍴</span>
                              <span>Solo mis comidas</span>
                            </div>
                            <input
                              type="checkbox"
                              className="accent-indigo-600 w-4 h-4"
                              checked={showOnlyMyMeals}
                              onChange={(e) =>
                                setShowOnlyMyMeals(e.target.checked)
                              }
                            />
                          </label>
                        </div>
                        <div className="p-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-2">
                            Categorías
                          </span>
                          <button
                            onClick={() => {
                              if (
                                selectedCategoryIds.length ===
                                availableCategories.length
                              ) {
                                setSelectedCategoryIds([]);
                              } else {
                                const catsToSelect = availableCategories
                                  .filter((c) =>
                                    isEditor || isManagement
                                      ? true
                                      : c.id !== 3,
                                  )
                                  .map((c) => c.id);
                                setSelectedCategoryIds(catsToSelect);
                              }
                            }}
                            className="w-full px-3 py-2 mb-2 rounded text-xs font-bold border flex justify-between items-center bg-white hover:bg-slate-50 text-slate-500 border-slate-200"
                          >
                            <span>
                              {selectedCategoryIds.length ===
                              availableCategories.length
                                ? "Deseleccionar todo"
                                : "Seleccionar todo"}
                            </span>
                            <IconList size={14} />
                          </button>
                          <div className="space-y-1">
                            {availableCategories.map((cat) => {
                              const isActive = selectedCategoryIds.includes(
                                cat.id,
                              );
                              return (
                                <button
                                  key={cat.id}
                                  onClick={() => handleCategoryToggle(cat.id)}
                                  className={`w-full px-3 py-2 rounded text-xs font-bold border transition-all flex justify-between items-center ${isActive ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-transparent hover:bg-slate-50"}`}
                                >
                                  <span>{cat.nombre}</span>
                                  {isActive && <IconCheck size={14} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {canEdit && (
                          <div className="p-2 border-t border-slate-100 bg-amber-50/50">
                            <label className="flex items-center gap-2 cursor-pointer p-2">
                              <input
                                type="checkbox"
                                className="accent-amber-600 w-4 h-4"
                                checked={showNonActive}
                                onChange={(e) =>
                                  setShowNonActive(e.target.checked)
                                }
                              />
                              <span className="text-xs font-bold text-amber-800">
                                Mostrar borradores
                              </span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {canEdit && musicianOptions.length > 0 && (
                  <div className="shrink-0 w-[40px] md:w-[160px]">
                    <SearchableSelect
                      options={musicianOptions}
                      value={viewAsUserId}
                      onChange={setViewAsUserId}
                      placeholder={viewAsUserId ? "" : "Ver como..."}
                      className="w-full text-xs"
                    />
                  </div>
                )}
              </>
            )}

            <button
              onClick={handleExportPDF}
              disabled={loading || filteredItems.length === 0}
              className="p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50 border border-transparent hover:border-indigo-100"
              title="Exportar vista actual a PDF"
            >
              <IconPrinter size={20} />
            </button>

            {giraId && isGlobalEditor && !isOfflineMode && (
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

      <div className="flex-1 overflow-y-auto bg-slate-50/50 relative">
        {/* SPINNER INICIAL (SOLO SI NO HAY DATOS) */}
        {loading && items.length === 0 && (
          <div className="text-center py-10">
            <IconLoader
              className="animate-spin inline text-indigo-500"
              size={30}
            />
          </div>
        )}

        {/* MENSAJES VACÍOS */}
        {!loading &&
          !isRefreshing &&
          filteredItems.length === 0 &&
          items.length > 0 && (
            <div className="text-center text-slate-400 py-10 italic">
              No hay eventos visibles con los filtros actuales.
            </div>
          )}

        {!loading && !isRefreshing && items.length === 0 && (
          <div className="text-center text-slate-400 py-10 italic">
            No hay eventos en la agenda.
          </div>
        )}

        {/* LISTA PERSISTENTE */}
        {items.length > 0 && (
          <div
            className={`transition-opacity duration-500 ${isRefreshing ? "opacity-60 pointer-events-none" : "opacity-100"}`}
          >
            {isRefreshing && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/90 backdrop-blur rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-lg flex items-center gap-2 animate-in fade-in zoom-in">
                <IconLoader size={12} className="animate-spin" />{" "}
                Sincronizando...
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

                    // ... Lógica de estilos y props de la tarjeta ...
                    const eventColor = evt.tipos_evento?.color || "#6366f1";
                    const isMeal =
                      [7, 8, 9, 10].includes(evt.id_tipo_evento) ||
                      evt.tipos_evento?.nombre
                        ?.toLowerCase()
                        .includes("comida");
                    const isNonConvokedMeal = isMeal && !evt.is_convoked;

                    const isTransportEvent = !!evt.id_gira_transporte;
                    let isMyTransport = false;
                    let isMyUp = false;
                    let isMyDown = false;
                    let debugReason = null;

                    const transportName =
                      evt.giras_transportes?.transportes?.nombre;
                    const transportDetail = evt.giras_transportes?.detalle;
                    const transportColor =
                      evt.giras_transportes?.transportes?.color || "#6366f1";

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
                        const tourHasRules = toursWithRules.has(evt.id_gira);
                        debugReason = tourHasRules ? "No Match" : "Sin Reglas";
                      }
                    }

                    let isTransportDimmed = isTransportEvent && !isMyTransport;
                    if (showNoGray && isTransportEvent)
                      isTransportDimmed = false;

                    let shouldDim = isTransportDimmed || evt.is_absent;
                    if (!showNoGray && isNonConvokedMeal) shouldDim = true;

                    const deadlineStatus =
                      isMeal && evt.is_convoked
                        ? getDeadlineStatus(
                            evt.programas?.fecha_confirmacion_limite,
                          )
                        : null;

                    const showDay = evt.fecha !== lastDateRendered;
                    if (showDay) lastDateRendered = evt.fecha;

                    const locName = evt.locaciones?.nombre || "";
                    const locCity = evt.locaciones?.localidades?.localidad;

                    const cardStyle = { backgroundColor: `${eventColor}10` };

                    return (
                      <React.Fragment key={evt.id}>
                        {showDay && (
                          <div className="bg-slate-50/95 backdrop-blur px-4 py-1.5 text-xs font-bold text-slate-500 uppercase border-b border-slate-100 flex items-center gap-2 sticky top-[45px] z-10 shadow-sm">
                            <IconCalendar size={12} />
                            {format(parseISO(evt.fecha), "EEEE d", {
                              locale: es,
                            })}
                          </div>
                        )}

                        {/* --- CONTENEDOR MÓVIL (VISIBLE SOLO EN < md) --- */}
                        <div
                          className={`md:hidden relative flex flex-row items-stretch px-4 py-2 border-b border-slate-100 transition-colors hover:bg-slate-50 group gap-2
                            ${shouldDim ? "opacity-50 grayscale" : ""}
                            ${evt.is_guest ? "bg-emerald-50/30" : ""}
                            ${isMyTransport ? "bg-indigo-50/30 border-l-4 border-l-indigo-400" : ""}
                          `}
                          style={
                            !shouldDim && !evt.is_guest && !isMyTransport
                              ? cardStyle
                              : {}
                          }
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

                          <div className="w-10 font-mono text-s text-slate-600 font-bold shrink-0 flex flex-col items-center pt-1">
                            <span>{evt.hora_inicio?.slice(0, 5)}</span>
                            {evt.hora_fin &&
                              evt.hora_fin !== evt.hora_inicio && (
                                <span className="text-[9px] text-slate-400 block">
                                  {evt.hora_fin.slice(0, 5)}
                                </span>
                              )}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-1 py-1">
                            <div className="flex items-center gap-2 mb-0.5">
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
                              {(isManagement || isEditor) && (
                                <button
                                  onClick={(e) =>
                                    toggleEventTechnica(e, evt.id, evt.tecnica)
                                  }
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all text-[9px] font-bold uppercase ${evt.tecnica ? "bg-slate-700 text-white border-slate-700" : "bg-transparent text-slate-300 border-transparent"}`}
                                >
                                  {evt.tecnica ? (
                                    <>
                                      <IconEyeOff size={10} strokeWidth={4} />
                                      <span>TÉC</span>
                                    </>
                                  ) : (
                                    <IconEye size={12} />
                                  )}
                                </button>
                              )}
                            </div>

                            <div
                              className={`text-sm leading-tight break-words ${shouldDim ? "text-slate-400" : "text-slate-800"}`}
                            >
                              {evt.descripcion ? (
                                <div
                                  className="whitespace-pre-wrap font-medium [&>b]:font-bold [&>strong]:font-bold"
                                  dangerouslySetInnerHTML={{
                                    __html: evt.descripcion,
                                  }}
                                />
                              ) : (
                                <span>{evt.tipos_evento?.nombre}</span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {isTransportEvent && transportName && (
                                <span
                                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border"
                                  style={{
                                    backgroundColor: isMyTransport
                                      ? `${transportColor}30`
                                      : `${transportColor}15`,
                                    color: isMyTransport
                                      ? "#1e293b"
                                      : "#64748b",
                                    borderColor: `${transportColor}60`,
                                  }}
                                >
                                  <IconBus
                                    size={10}
                                    style={{ color: transportColor }}
                                  />
                                  {transportName}{" "}
                                  {transportDetail && (
                                    <span className="font-normal opacity-80">
                                      ({transportDetail})
                                    </span>
                                  )}
                                </span>
                              )}
                              {isMyUp && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <IconUpload size={12} /> Mi Subida
                                </span>
                              )}
                              {isMyDown && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  <IconDownload size={12} /> Mi Bajada
                                </span>
                              )}
                            </div>

                            {locName && (
                              <div className="flex items-start gap-1 text-xs text-slate-500 mt-0.5">
                                <IconMapPin
                                  size={14}
                                  className="text-slate-400 shrink-0 mt-0.5"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="font-semibold text-slate-700 truncate">
                                    {locName} {locCity ? `(${locCity})` : ""}
                                  </span>
                                  {evt.locaciones?.direccion && (
                                    <a
                                      href={getGoogleMapsUrl(evt.locaciones)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-blue-600 hover:underline truncate block w-full"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {evt.locaciones.direccion} ↗
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 flex items-start gap-1 pl-2 pt-1 border-l border-slate-100 flex-col justify-between min-w-[40px]">
                            {/* ACCIONES APILADAS EN MÓVIL (Como pediste en el primer prompt, o legacy si prefieres legacy estricto) */}
                            {/* Nota: En tu legacy original los botones estaban abajo en una fila. 
                                 Pero aquí estamos replicando la estructura FLEX ROW del legacy que me pasaste. 
                                 Si quieres botones apilados en el lateral derecho como el código legacy que pegaste: */}

                            <div className="flex flex-col items-end gap-2 w-full">
                              {/* BOTÓN ÚNICO DE COMIDA */}
                              {/* BOTÓN ÚNICO DE COMIDA (MÓVIL) */}
                              {isMeal &&
                                evt.is_convoked &&
                                user.id !== "guest-general" && (
                                  <button
                                    onClick={() => setMealActionTarget(evt)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all
                                        ${
                                          evt.mi_asistencia === "P"
                                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                            : evt.mi_asistencia === "A"
                                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                                              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                                        }
                                      `}
                                  >
                                    {/* Icono según estado o candado si cerró y no votó */}
                                    {(() => {
                                      const dl = getDeadlineStatus(
                                        evt.programas
                                          ?.fecha_confirmacion_limite,
                                      );
                                      const isLocked =
                                        dl.status === "CLOSED" &&
                                        !isManagement &&
                                        !isEditor;

                                      if (evt.mi_asistencia === "P")
                                        return <IconCheck size={14} />;
                                      if (evt.mi_asistencia === "A")
                                        return <IconX size={14} />;
                                      if (isLocked)
                                        return (
                                          <span className="text-[10px]">
                                            🔒
                                          </span>
                                        ); // Icono candado si cerró
                                      return <IconUtensils size={14} />;
                                    })()}

                                    <span>
                                      {evt.mi_asistencia === "P"
                                        ? "Voy"
                                        : evt.mi_asistencia === "A"
                                          ? "No voy"
                                          : getDeadlineStatus(
                                                evt.programas
                                                  ?.fecha_confirmacion_limite,
                                              ).status === "CLOSED" &&
                                              !isManagement &&
                                              !isEditor
                                            ? "Cerrado"
                                            : "¿?"}
                                    </span>
                                  </button>
                                )}
                              <DriveSmartButton evt={evt} />

                              <div className="flex flex-col gap-1 items-end">
                                <CommentButton
                                  supabase={supabase}
                                  entityType="EVENTO"
                                  entityId={evt.id}
                                  onClick={() =>
                                    setCommentsState({
                                      type: "EVENTO",
                                      id: evt.id,
                                    })
                                  }
                                  className="text-slate-300 p-1"
                                />
                                {!isOfflineMode &&
                                  (isGlobalEditor || canUserEditEvent(evt)) && (
                                    <button
                                      onClick={() => openEditModal(evt)}
                                      className="p-1 text-slate-300 bg-white rounded-full border border-slate-100"
                                    >
                                      <IconEdit size={14} />
                                    </button>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ======================================================== */}
                        {/* VISTA ESCRITORIO (Grid Columnar) - Visible solo en md+ */}
                        {/* ======================================================== */}
                        <div
                          className={`hidden md:grid md:grid-cols-12 gap-2 p-3 pl-4 items-start border-b border-slate-100 transition-colors hover:bg-slate-50 group relative
                            ${shouldDim ? "opacity-60 grayscale" : ""}
                            ${evt.is_guest ? "bg-emerald-50/30" : ""}
                            ${isMyTransport ? "bg-indigo-50/30" : ""}
                          `}
                          style={
                            !shouldDim && !evt.is_guest && !isMyTransport
                              ? cardStyle
                              : {}
                          }
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

                          {/* COLUMNA 1: HORA */}
                          <div className="col-span-1">
                            <div className="font-mono text-sm text-slate-700 font-bold">
                              {evt.hora_inicio?.slice(0, 5)}
                            </div>
                            {evt.hora_fin &&
                              evt.hora_fin !== evt.hora_inicio && (
                                <div className="font-mono text-[10px] text-slate-400">
                                  {evt.hora_fin.slice(0, 5)}
                                </div>
                              )}
                          </div>

                          {/* COLUMNA 2: TIPO */}
                          <div className="col-span-2 flex flex-col items-start gap-1.5 min-w-0">
                            <div className="flex flex-wrap gap-1 items-center">
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border truncate max-w-full"
                                style={{
                                  color: eventColor,
                                  borderColor: `${eventColor}40`,
                                  backgroundColor: `${eventColor}10`,
                                }}
                              >
                                {evt.tipos_evento?.nombre}
                              </span>
                              {(isManagement || isEditor) && (
                                <button
                                  onClick={(e) =>
                                    toggleEventTechnica(e, evt.id, evt.tecnica)
                                  }
                                  className={`flex items-center gap-1 px-1 py-0.5 rounded border transition-all text-[9px] font-bold uppercase ${evt.tecnica ? "bg-slate-700 text-white" : "text-slate-300"}`}
                                >
                                  {evt.tecnica ? "TÉC" : <IconEye size={10} />}
                                </button>
                              )}
                            </div>
                            {evt.programas?.nomenclador && (
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0 border border-indigo-100">
                                {evt.programas.nomenclador}
                              </span>
                            )}
                            {/* Chips Transporte */}
                            <div className="flex flex-col gap-1 w-full">
                              {isTransportEvent && transportName && (
                                <span
                                  className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border w-fit max-w-full truncate"
                                  style={{
                                    backgroundColor: isMyTransport
                                      ? `${transportColor}20`
                                      : "transparent",
                                    color: isMyTransport
                                      ? "#1e293b"
                                      : "#64748b",
                                    borderColor: `${transportColor}40`,
                                  }}
                                >
                                  <IconBus
                                    size={10}
                                    style={{ color: transportColor }}
                                  />
                                  <span className="truncate">
                                    {transportName}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* COLUMNA 3: DESCRIPCIÓN */}
                          <div className="col-span-4 min-w-0">
                            <div
                              className={`text-sm leading-tight break-words ${shouldDim ? "text-slate-400" : "text-slate-800"}`}
                            >
                              {evt.descripcion ? (
                                <div
                                  className="whitespace-pre-wrap font-medium [&>b]:font-bold [&>strong]:font-bold text-sm"
                                  dangerouslySetInnerHTML={{
                                    __html: evt.descripcion,
                                  }}
                                />
                              ) : (
                                <span className="font-bold text-slate-800">
                                  {evt.tipos_evento?.nombre}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* COLUMNA 4: LOCACIÓN */}
                          <div className="col-span-3 min-w-0">
                            {locName && (
                              <div className="flex items-start gap-1.5">
                                <IconMapPin
                                  size={14}
                                  className="text-slate-400 shrink-0 mt-0.5"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-semibold text-slate-700 truncate block">
                                    {locName} {locCity ? `(${locCity})` : ""}
                                  </span>
                                  {evt.locaciones?.direccion && (
                                    <a
                                      href={getGoogleMapsUrl(evt.locaciones)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-blue-600 hover:underline truncate block w-full mt-0.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {evt.locaciones.direccion} ↗
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* COLUMNA 5: ACCIONES */}
                          <div className="col-span-2 flex flex-col items-end gap-2 pl-2 border-l border-slate-100 h-full">
                            {isMeal &&
                              evt.is_convoked &&
                              user.id !== "guest-general" && (
                                <button
                                  onClick={() => setMealActionTarget(evt)}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all
                                        ${
                                          evt.mi_asistencia === "P"
                                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                            : evt.mi_asistencia === "A"
                                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                                              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                                        }
                                      `}
                                >
                                  {/* Icono según estado o candado si cerró y no votó */}
                                  {(() => {
                                    const dl = getDeadlineStatus(
                                      evt.programas?.fecha_confirmacion_limite,
                                    );
                                    const isLocked =
                                      dl.status === "CLOSED" &&
                                      !isManagement &&
                                      !isEditor;

                                    if (evt.mi_asistencia === "P")
                                      return <IconCheck size={14} />;
                                    if (evt.mi_asistencia === "A")
                                      return <IconX size={14} />;
                                    if (isLocked)
                                      return (
                                        <span className="text-[10px]">🔒</span>
                                      ); // Icono candado si cerró
                                    return <IconUtensils size={14} />;
                                  })()}

                                  <span>
                                    {evt.mi_asistencia === "P"
                                      ? "Voy"
                                      : evt.mi_asistencia === "A"
                                        ? "No voy"
                                        : getDeadlineStatus(
                                              evt.programas
                                                ?.fecha_confirmacion_limite,
                                            ).status === "CLOSED" &&
                                            !isManagement &&
                                            !isEditor
                                          ? "Cerrado"
                                          : "¿?"}
                                  </span>
                                </button>
                              )}
                            <div className="flex flex-col items-end gap-1 mt-auto">
                              <div className="flex gap-1">
                                <DriveSmartButton evt={evt} />
                                {evt.programas?.id &&
                                  onOpenRepertoire &&
                                  !isNonConvokedMeal && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenRepertoire(evt.programas.id);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                                    >
                                      <IconList size={16} />
                                    </button>
                                  )}
                              </div>
                              <div className="flex gap-1">
                                <CommentButton
                                  supabase={supabase}
                                  entityType="EVENTO"
                                  entityId={evt.id}
                                  onClick={() =>
                                    setCommentsState({
                                      type: "EVENTO",
                                      id: evt.id,
                                    })
                                  }
                                  className="p-1.5 text-slate-300 hover:text-indigo-500"
                                />
                                {!isOfflineMode &&
                                  (isGlobalEditor || canUserEditEvent(evt)) && (
                                    <button
                                      onClick={() => openEditModal(evt)}
                                      className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-slate-100 rounded-full"
                                    >
                                      <IconEdit size={14} />
                                    </button>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* FOOTER DE CARGA */}
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
        {loading && items.length === 0 && (
          /* Este spinner solo se ve si no hay datos */
          <div className="text-center py-6 text-slate-400 text-xs">
            Cargando eventos...
          </div>
        )}
      </div>

      {/* MODALES */}
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
            supabase={supabase}
            onRefreshLocations={fetchFormLocations}
          />
        </div>
      )}
      {isRehearsalEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl relative">
            <IndependentRehearsalForm
              supabase={supabase}
              initialData={editingEventObj}
              myEnsembles={myEnsembleObjects}
              onSuccess={() => {
                setIsRehearsalEditOpen(false);
                fetchAgenda();
              }}
              onCancel={() => setIsRehearsalEditOpen(false)}
            />
          </div>
        </div>
      )}
      {/* MODAL DE ACCIÓN DE COMIDA (MÓVIL) */}
      {/* MODAL DE ACCIÓN DE COMIDA (MÓVIL) */}
      {/* MODAL DE ACCIÓN DE COMIDA (MÓVIL) */}
      {mealActionTarget && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <IconUtensils className="text-indigo-600" />
                {mealActionTarget.tipos_evento?.nombre}
              </h3>
              <button onClick={() => setMealActionTarget(null)}>
                <IconX className="text-slate-400" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3">
              <p className="text-sm text-slate-600 text-center mb-2">
                {mealActionTarget.descripcion ? (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: mealActionTarget.descripcion,
                    }}
                  />
                ) : (
                  "¿Vas a asistir a esta comida?"
                )}
              </p>

              {/* LÓGICA DE ESTADO Y BLOQUEO */}
              {(() => {
                const dl = getDeadlineStatus(
                  mealActionTarget.programas?.fecha_confirmacion_limite,
                );

                // 1. Chequeo de Convocatoria
                const isConvoked = mealActionTarget.is_convoked;

                // 2. Chequeo de Cierre
                const isClosed = dl.status === "CLOSED";

                // 3. Permiso de Admin para saltar el cierre (opcional, si quieres bloqueo total quita esta parte)
                const isAdmin = isManagement || isEditor;
                const canOverride = isAdmin && isClosed;

                // 4. Bloqueo Final (UI)
                // Está bloqueado si: NO está convocado O (está cerrado Y no es admin)
                const isLocked = !isConvoked || (isClosed && !isAdmin);

                return (
                  <>
                    {/* MENSAJES DE ESTADO */}
                    {!isConvoked && (
                      <div className="text-xs text-center text-slate-500 font-bold bg-slate-100 p-2 rounded border border-slate-200 mb-2">
                        🚫 No estás convocado a esta comida
                      </div>
                    )}

                    {isConvoked && isClosed && !canOverride && (
                      <div className="text-xs text-center text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100 mb-2">
                        🔒 Votación Cerrada
                      </div>
                    )}

                    {isConvoked && canOverride && (
                      <div className="text-xs text-center text-amber-700 font-bold bg-amber-50 p-2 rounded border border-amber-100 mb-2">
                        🔓 Votación Cerrada (Acceso Admin)
                      </div>
                    )}

                    {isConvoked && !isClosed && (
                      <div className="text-xs text-center text-indigo-600 font-bold bg-indigo-50 p-2 rounded border border-indigo-100 mb-2">
                        ⏳ Cierra en: {dl.message}
                      </div>
                    )}

                    {/* BOTONES DE ACCIÓN */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() =>
                          toggleMealAttendance(mealActionTarget.id, "P")
                        }
                        disabled={isLocked}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all 
                              ${
                                mealActionTarget.mi_asistencia === "P"
                                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                  : "bg-white border-slate-100 text-slate-600"
                              }
                              ${isLocked ? "opacity-40 cursor-not-allowed grayscale pointer-events-none" : "hover:border-emerald-200"}
                            `}
                      >
                        <IconCheck size={24} />
                        <span className="text-xs font-bold">Asistiré</span>
                      </button>

                      <button
                        onClick={() =>
                          toggleMealAttendance(mealActionTarget.id, "A")
                        }
                        disabled={isLocked}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all 
                              ${
                                mealActionTarget.mi_asistencia === "A"
                                  ? "bg-rose-50 border-rose-500 text-rose-700"
                                  : "bg-white border-slate-100 text-slate-600"
                              }
                              ${isLocked ? "opacity-40 cursor-not-allowed grayscale pointer-events-none" : "hover:border-rose-200"}
                            `}
                      >
                        <IconX size={24} />
                        <span className="text-xs font-bold">No iré</span>
                      </button>
                    </div>

                    {/* BOTÓN BORRAR (Solo si no está bloqueado) */}
                    {mealActionTarget.mi_asistencia && !isLocked && (
                      <button
                        onClick={() =>
                          toggleMealAttendance(mealActionTarget.id, null)
                        }
                        className="text-xs text-slate-400 underline mt-4 hover:text-slate-600 w-full text-center"
                      >
                        Borrar mi selección
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
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
            supabase={supabase}
            onRefreshLocations={fetchFormLocations}
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
