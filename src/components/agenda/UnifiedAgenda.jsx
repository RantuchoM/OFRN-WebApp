import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { es } from "date-fns/locale";
import {
  IconLoader,
  IconCheck,
  IconX,
  IconEdit,
  IconArrowLeft,
  IconPlus,
  IconList,
  IconChevronDown,
  IconMapPin,
  IconCalendar,
  IconEye,
  IconPrinter,
  IconUpload,
  IconDownload,
  IconBus,
  IconBusGrande,
  IconTruck,
  IconCar,
  IconVan,
  IconPlane,
  IconCalculator,
  IconAlertTriangle,
  IconEyeOff,
  IconUtensils,
  IconFilter,
  IconUndo,
  IconHistory,
  IconRefresh,
  IconTrash,
} from "../ui/Icons";
import { useAuth } from "../../context/AuthContext";
import CommentsManager from "../comments/CommentsManager";
import CommentButton from "../comments/CommentButton";
import EventForm from "../forms/EventForm";
import IndependentRehearsalForm from "../../views/Ensembles/IndependentRehearsalForm";
import SearchableSelect from "../ui/SearchableSelect";
import { exportAgendaToPDF } from "../../utils/agendaPdfExporter";
import { calculateLogisticsSummary } from "../../hooks/useLogistics";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useAgendaFilters } from "../../hooks/useAgendaFilters";
import { useAgendaData, getAgendaCacheKey } from "../../hooks/useAgendaData";
import DateInput from "../ui/DateInput";
import {
  getTodayDateStringLocal,
  getCurrentTimeLocal,
  timeStringToMinutes,
} from "../../utils/dates";
import { getTransportEventAffectedSummary } from "../../utils/transportLogisticsWarning";
import {
  getNowLinePlacement,
  getDeadlineStatus,
  getGoogleMapsUrl,
} from "../../utils/agendaHelpers";
import { getProgramBadgeClasses } from "../../utils/giraUtils";
import VenueStatusPin from "../ui/VenueStatusPin";
import FeriadoBadge from "./FeriadoBadge";
import ConnectionBadge from "./ConnectionBadge";
import DriveSmartButton from "./DriveSmartButton";
import TourDivider from "./TourDivider";
import AgendaMealActionModal from "./AgendaMealActionModal";
import EventHistoryModal from "../giras/EventHistoryModal";
import ConfirmModal from "../ui/ConfirmModal";
import EventTranspositionModal from "./EventTranspositionModal";

/** tipos_evento.id: Traslado interno — "mi transporte" para todo integrante activo (sin reglas de asignación). */
const ID_TIPO_TRASLADO_INTERNO = 35;
const DELETED_FILTERS_STORAGE_KEY_PREFIX = "unified_agenda_deleted_filters_v1_";

function getInitialDeletedFilterState(storageKey, key, defaultValue = false) {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return defaultValue;
    const parsed = JSON.parse(saved);
    return parsed?.[key] ?? defaultValue;
  } catch (error) {
    console.error("Error reading deleted filters", error);
    return defaultValue;
  }
}

const TRANSPORT_ICON_MAP = {
  IconBus,
  IconBusGrande,
  IconTruck,
  IconCar,
  IconVan,
  IconPlane,
  IconCalculator,
  Bus: IconBus,
  BusGrande: IconBusGrande,
  Truck: IconTruck,
  Car: IconCar,
  Van: IconVan,
  Plane: IconPlane,
  Calculator: IconCalculator,
};

export default function UnifiedAgenda({
  supabase,
  giraId = null,
  onBack = null,
  title = "Agenda General",
  onOpenRepertoire = null,
  onViewChange = null,
}) {
  const {
    user,
    isEditor,
    isManagement,
    isGuest,
    isAdmin: isAdminFlag,
    isTechnician,
  } = useAuth();
  // Estado para el modal de comida en móvil
  const [mealActionTarget, setMealActionTarget] = useState(null);
  const [isTranspositionOpen, setIsTranspositionOpen] = useState(false);
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
      toast.error("No se pudo guardar el cambio.");
    }
  };

  const [viewAsUserId, setViewAsUserId] = useState(null);
  const [musicianOptions, setMusicianOptions] = useState([]);

  const effectiveUserId = viewAsUserId || user.id;
  const isPersonalGuest = isGuest && !user?.isGeneral && !!user?.token_original;
  const defaultPersonalFilter =
    isPersonalGuest ||
    ((!isEditor && !isManagement && !user?.isGeneral) || isTechnician);
  // --- ESTADOS ---
  const [coordinatedEnsembles, setCoordinatedEnsembles] = useState(new Set());
  const [myEnsembleObjects, setMyEnsembleObjects] = useState([]);
  // SEPARACIÓN DE ESTADOS DE CARGA (loading, isRefreshing, lastUpdate, realtimeStatus vienen de useAgendaData) (CLAVE PARA MÓVIL)
  // IDs de eventos actualizados en esta sesión (indicador titilante; se limpia al refrescar)
  // --- FETCH COORDINACIÓN ---
  useEffect(() => {
    const fetchCoordination = async () => {
      if (!user) return;
      // Si el usuario es Coordinador General, tiene alcance sobre todos los ensambles.
      const userRoles = (() => {
        const r = user.rol_sistema;
        if (r == null) return [];
        return Array.isArray(r)
          ? r.map((x) => String(x).toLowerCase().trim())
          : [String(r).toLowerCase().trim()];
      })();
      const isCoordGeneralUser = userRoles.includes("coord_general");

      if (isCoordGeneralUser) {
        const { data } = await supabase
          .from("ensambles")
          .select("id, ensamble");
        if (data) {
          const ids = new Set(data.map((d) => d.id));
          setCoordinatedEnsembles(ids);
          setMyEnsembleObjects(data);
        }
        return;
      }

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

  const editorRoles = ["admin", "editor", "coord_general", "director"];
  const userRoles = (() => {
    const r = user?.rol_sistema;
    if (r == null) return [];
    return Array.isArray(r)
      ? r.map((x) => String(x).toLowerCase().trim())
      : [String(r).toLowerCase().trim()];
  })();
  const isAdmin = isAdminFlag || userRoles.includes("admin");
  const isGlobalEditor = userRoles.some((role) => editorRoles.includes(role));
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

  const canImportEvents = !!giraId && isEditor && !user?.isGeneral;

  const [monthsLimit, setMonthsLimit] = useState(3);
  const [availableCategories, setAvailableCategories] = useState([]);
  const deletedFiltersStorageKey = `${DELETED_FILTERS_STORAGE_KEY_PREFIX}${effectiveUserId}`;
  const [showDeletedEvents, setShowDeletedEvents] = useState(() =>
    getInitialDeletedFilterState(
      deletedFiltersStorageKey,
      "showDeletedEvents",
      false,
    ),
  );
  const [hideDeletedEvents, setHideDeletedEvents] = useState(() =>
    getInitialDeletedFilterState(
      deletedFiltersStorageKey,
      "hideDeletedEvents",
      false,
    ),
  );

  const {
    selectedCategoryIds,
    setSelectedCategoryIds,
    showNonActive,
    setShowNonActive,
    showOnlyMyTransport,
    setShowOnlyMyTransport,
    showOnlyMyMeals,
    setShowOnlyMyMeals,
    showNoGray,
    setShowNoGray,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    techFilter,
    setTechFilter,
    effectiveDateFrom,
    handleCategoryToggle,
  } = useAgendaFilters({
    effectiveUserId,
    giraId,
    isEditor,
    isManagement,
    availableCategories,
    defaultPersonalFilter,
    isPersonalGuest,
    isTechnician,
  });

  const [userProfile, setUserProfile] = useState(null);

  const checkIsConvoked = useCallback(
    (convocadosList, tourRole) => {
      if (!convocadosList || convocadosList.length === 0) return false;
      if (!userProfile) return false;
      return convocadosList.some((tag) => {
        if (tag === "GRP:TUTTI") return true;
        if (tag === "GRP:LOCALES") return userProfile.is_local;
        if (tag === "GRP:NO_LOCALES") return !userProfile.is_local;
        if (tag === "GRP:PRODUCCION") {
          // Mantenemos aquí una lista acotada por compatibilidad con vistas antiguas
          const rolesProduccion = [
            "produccion",
            "chofer",
            "acompañante",
            "staff",
            "mus_prod",
            "técnico",
            "iluminacion",
          ];
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
    },
    [userProfile],
  );

  const {
    items,
    setItems,
    loading,
    setLoading,
    isRefreshing,
    setIsRefreshing,
    fetchAgenda,
    feriados,
    myTransportLogistics,
    toursWithRules,
    recentlyUpdatedEventIds,
    isOfflineMode,
    setIsOfflineMode,
    lastUpdate,
    setLastUpdate,
    realtimeStatus,
    processCategories,
  } = useAgendaData({
    supabase,
    effectiveUserId,
    giraId,
    userProfile,
    monthsLimit,
    filterDateFrom,
    filterDateTo,
    checkIsConvoked,
    setSelectedCategoryIds,
    selectedCategoryIds,
    setAvailableCategories,
    isEditor,
    isManagement,
    user,
    includeDeletedBeyond24h: isAdmin && showDeletedEvents,
  });

  useEffect(() => {
    if (!isAdmin) return;
    fetchAgenda();
  }, [isAdmin, showDeletedEvents, fetchAgenda]);

  useEffect(() => {
    try {
      localStorage.setItem(
        deletedFiltersStorageKey,
        JSON.stringify({
          showDeletedEvents,
          hideDeletedEvents,
        }),
      );
    } catch (error) {
      console.error("Error saving deleted filters", error);
    }
  }, [deletedFiltersStorageKey, showDeletedEvents, hideDeletedEvents]);

  useEffect(() => {
    setShowDeletedEvents(
      getInitialDeletedFilterState(
        deletedFiltersStorageKey,
        "showDeletedEvents",
        false,
      ),
    );
    setHideDeletedEvents(
      getInitialDeletedFilterState(
        deletedFiltersStorageKey,
        "hideDeletedEvents",
        false,
      ),
    );
  }, [deletedFiltersStorageKey]);

  const mainProgram = useMemo(
    () => items.find((i) => i.programas)?.programas || null,
    [items],
  );

  /** Primer y último día con evento en la gira (solo con giraId). */
  const { giraFirstDate, giraLastDate } = useMemo(() => {
    if (!giraId || !items.length) return { giraFirstDate: null, giraLastDate: null };
    const fechas = items.map((i) => i.fecha).filter(Boolean);
    if (!fechas.length) return { giraFirstDate: null, giraLastDate: null };
    const sorted = [...fechas].sort();
    return {
      giraFirstDate: sorted[0],
      giraLastDate: sorted[sorted.length - 1],
    };
  }, [giraId, items]);

  const todayStr = getTodayDateStringLocal();
  const isGiraFinishedTour = Boolean(
    giraId && giraLastDate && todayStr > giraLastDate,
  );

  /** Gira ya cerrada: el "desde hoy" por defecto excluye todos los eventos; mostrar desde el inicio. */
  const effectiveDateFromForFilter = useMemo(() => {
    if (!giraId || !giraFirstDate || !giraLastDate) return effectiveDateFrom;
    if (todayStr <= giraLastDate) return effectiveDateFrom;
    if (effectiveDateFrom > giraLastDate || effectiveDateFrom < giraFirstDate) {
      return giraFirstDate;
    }
    return effectiveDateFrom;
  }, [
    giraId,
    giraFirstDate,
    giraLastDate,
    effectiveDateFrom,
    todayStr,
  ]);

  const showNonActiveForFilter = showNonActive || isGiraFinishedTour;

  /** En gira terminada, "Desde" = primer evento no cuenta como filtro activo (vista completa por defecto). */
  const dateRangeFilterLooksActive = Boolean(
    filterDateTo ||
      (filterDateFrom &&
        filterDateFrom !== getTodayDateStringLocal() &&
        !(
          isGiraFinishedTour &&
          giraFirstDate &&
          filterDateFrom === giraFirstDate
        )),
  );

  const finishedGiraTechDefaultsRef = useRef(false);
  useEffect(() => {
    finishedGiraTechDefaultsRef.current = false;
  }, [giraId]);

  // Gira ya terminada: una vez, técnica "Todos" (equivalente a quitar ese filtro); el usuario puede volver a acotar después.
  useEffect(() => {
    if (
      !isGiraFinishedTour ||
      loading ||
      finishedGiraTechDefaultsRef.current ||
      !(isManagement || isTechnician)
    )
      return;
    finishedGiraTechDefaultsRef.current = true;
    setTechFilter("all");
  }, [isGiraFinishedTour, loading, isManagement, isTechnician]);

  // Alinear el control "Desde" con la fecha real del filtro (evita mostrar "hoy" cuando la vista ya es toda la gira)
  useEffect(() => {
    if (!isGiraFinishedTour || !giraFirstDate || !giraLastDate || loading) return;
    if (filterDateFrom > giraLastDate) {
      setFilterDateFrom(giraFirstDate);
      setFilterDateTo(null);
    } else if (filterDateFrom < giraFirstDate) {
      setFilterDateFrom(giraFirstDate);
    }
  }, [
    isGiraFinishedTour,
    giraFirstDate,
    giraLastDate,
    loading,
    filterDateFrom,
    setFilterDateFrom,
    setFilterDateTo,
  ]);

  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef(null);
  useClickOutside(filterMenuRef, () => setIsFilterMenuOpen(false));

  const [commentsState, setCommentsState] = useState(null);
  const [eventHistoryEvent, setEventHistoryEvent] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRehearsalEditOpen, setIsRehearsalEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    message: "",
    messageIsHtml: false,
    hasLogisticsLinks: false,
  });
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null);
  const [editingEventObj, setEditingEventObj] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFormData, setNewFormData] = useState({});
  const [formEventTypes, setFormEventTypes] = useState([]);
  const [formLocations, setFormLocations] = useState([]);
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

  // Re-nutrir desde BD cuando el usuario elige una "Desde" anterior a hoy (solo agenda general)
  const prevFilterDateFromRef = useRef(undefined);
  useEffect(() => {
    if (giraId || !userProfile) return;
    const todayStr = getTodayDateStringLocal();
    const prev = prevFilterDateFromRef.current;
    prevFilterDateFromRef.current = filterDateFrom;
    if (!filterDateFrom || filterDateFrom >= todayStr) return;
    // Refetch solo cuando el usuario cambia el filtro (no en carga inicial)
    if (prev === undefined) return;
    const wasPast = prev < todayStr;
    if (!wasPast || prev !== filterDateFrom) fetchAgenda(true);
  }, [giraId, filterDateFrom, userProfile]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (hideDeletedEvents && item.is_deleted === true) return false;

      if (item.fecha) {
        if (item.fecha < effectiveDateFromForFilter) return false;
        if (filterDateTo && item.fecha > filterDateTo) return false;
      }

      // Detectar si este evento de transporte es MI subida/bajada
      const isTransportEvent = !!item.id_gira_transporte;
      let isMyTransport = false;
      let isMyUpOrDown = false;
      if (showOnlyMyTransport && isTransportEvent && item.id_gira_transporte) {
        const tId = String(item.id_gira_transporte);
        const myStatus = myTransportLogistics[tId];
        const isTrasladoInterno =
          Number(item.id_tipo_evento) === ID_TIPO_TRASLADO_INTERNO;
        if (isTrasladoInterno || myStatus?.assigned) {
          isMyTransport = true;
          const itemIdStr = String(item.id);
          if (
            isTrasladoInterno ||
            String(myStatus?.subidaId) === itemIdStr ||
            String(myStatus?.bajadaId) === itemIdStr
          ) {
            isMyUpOrDown = true;
          }
        }
      }

      const catId = item.tipos_evento?.categorias_tipos_eventos?.id;

      // Filtro de giras activas: permitir siempre mi subida/bajada aunque el programa no esté vigente
      if (!showNonActiveForFilter) {
        const estadoGira = item.programas?.estado || "Borrador";
        if (item.isProgramMarker) {
          if (
            estadoGira !== "Vigente" &&
            !(showOnlyMyTransport && isMyUpOrDown)
          )
            return false;
        } else if (item.programas && estadoGira !== "Vigente") {
          if (!(showOnlyMyTransport && isMyUpOrDown)) return false;
        }
      }

      if (item.isProgramMarker) return true;

      // Filtro técnico: no debe ocultar mi propia subida/bajada cuando está activo "Mi transporte"
      const hasTechVisibility = isManagement || isTechnician;
      if (
        !hasTechVisibility &&
        item.tecnica &&
        !(showOnlyMyTransport && isMyUpOrDown)
      )
        return false;
      if (hasTechVisibility) {
        if (
          techFilter === "only_tech" &&
          !item.tecnica &&
          !(showOnlyMyTransport && isMyUpOrDown)
        )
          return false;
        if (
          techFilter === "no_tech" &&
          item.tecnica &&
          !(showOnlyMyTransport && isMyUpOrDown)
        )
          return false;
      }

      // Filtro por categorías: permitir siempre mi subida/bajada aunque el tipo no esté seleccionado
      if (selectedCategoryIds.length > 0) {
        if (catId && !selectedCategoryIds.includes(catId)) {
          if (!(showOnlyMyTransport && isMyUpOrDown)) return false;
        }
      }

      // Filtro "Solo mi transporte": ocultar resto de logística, pero nunca mis subidas/bajadas
      if (showOnlyMyTransport && isTransportEvent) {
        if (!isMyTransport) return false;
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
    effectiveDateFromForFilter,
    filterDateTo,
    selectedCategoryIds,
    showNonActiveForFilter,
    showOnlyMyTransport,
    showOnlyMyMeals,
    hideDeletedEvents,
    myTransportLogistics,
    techFilter,
    isManagement,
    isTechnician,
    isEditor,
  ]);

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
      localStorage.setItem(
        getAgendaCacheKey(effectiveUserId, giraId),
        JSON.stringify(newItems),
      );

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
    if (filteredItems.length === 0) {
      toast.error("No hay eventos para exportar con los filtros actuales.");
      return;
    }
    let subTitle = "";
    if (userProfile && userProfile.id !== user.id) {
      subTitle = `Vista simulada: ${userProfile.apellido}, ${userProfile.nombre}`;
    }
    if (showNonActiveForFilter) {
      subTitle += subTitle ? " | Incluye Borradores" : "Incluye Borradores";
    }
    const hideGiraColumn = !!giraId;
    exportAgendaToPDF(filteredItems, title, subTitle, hideGiraColumn);
  };

  const openEditModal = async (evt) => {
    if (
      evt.id_tipo_evento === 13 &&
      coordinatedEnsembles.size > 0 &&
      canUserEditEvent(evt)
    ) {
      setEditingEventObj(evt);
      setIsRehearsalEditOpen(true);
      return;
    }
    let lastVenueNote = "";
    if (Number(evt.id_tipo_evento) === 1) {
      try {
        const { data, error } = await supabase
          .from("eventos_venue_log")
          .select("nota, created_at")
          .eq("id_evento", evt.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data && data.nota) {
          lastVenueNote = data.nota;
        }
      } catch (err) {
        console.warn("No se pudo cargar la última nota de venue:", err);
      }
    }

    setEditingEventObj(evt);
    setEditFormData({
      id: evt.id,
      descripcion: evt.descripcion || "",
      fecha: evt.fecha || "",
      hora_inicio: evt.hora_inicio || "",
      hora_fin: evt.hora_fin || "",
      id_tipo_evento: evt.id_tipo_evento || "",
      id_locacion: evt.id_locacion || "",
      id_gira: evt.id_gira || null,
      id_gira_transporte: evt.id_gira_transporte ?? null,
      tecnica: evt.tecnica || false,
      id_estado_venue: evt.id_estado_venue || null,
      venue_status_note: lastVenueNote,
    });
    setIsEditOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!editFormData.id) return;
    const id = editFormData.id;
    const isTransport = [11, 12].includes(Number(editFormData.id_tipo_evento));
    let hasLogisticsLinks = false;
    let detail = "";
    let detailHtml = null;
    if (isTransport) {
      const summary = await getTransportEventAffectedSummary(supabase, id);
      hasLogisticsLinks = summary.hasLinks;
      detail = summary.detail;
      detailHtml = summary.detailHtml ?? null;
    }
    const baseMsg =
      "¿Mover este evento a la papelera? Se ocultará en 24 horas. Puedes restaurarlo hasta entonces.";
    const transportMsgPlain =
      hasLogisticsLinks && detail
        ? `\n\nEste evento está vinculado como subida/bajada en logística. Afecta a: ${detail}. Si lo movés a la papelera, se afectará el cálculo de Viáticos; deberás crear un evento nuevo para tal fin si corresponde.`
        : hasLogisticsLinks
          ? "\n\nEste evento está vinculado como subida/bajada. Si lo movés a la papelera, se afectará el cálculo de Viáticos; deberás crear un evento nuevo para tal fin si corresponde."
          : "";
    const transportMsgHtml =
      hasLogisticsLinks && detailHtml
        ? `\n\nEste evento está vinculado como subida/bajada en logística. Afecta a: ${detailHtml}. Si lo movés a la papelera, se afectará el cálculo de Viáticos; deberás crear un evento nuevo para tal fin si corresponde.`
        : transportMsgPlain;
    setDeleteConfirm({
      isOpen: true,
      message: baseMsg + (detailHtml ? transportMsgHtml : transportMsgPlain),
      messageIsHtml: !!detailHtml,
      hasLogisticsLinks,
    });
  };

  const handleConfirmDeleteEvent = async () => {
    if (!editFormData.id) return;
    const id = editFormData.id;
    const hadLinks = deleteConfirm.hasLogisticsLinks;
    setDeleteConfirm({
      isOpen: false,
      message: "",
      messageIsHtml: false,
      hasLogisticsLinks: false,
    });
    setLoading(true);
    try {
      const { error } = await supabase
        .from("eventos")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      setIsEditOpen(false);
      fetchAgenda();
      if (hadLinks) {
        toast.warning(
          "Evento movido a la papelera. Revisá la logística de integrantes/regiones y creá un evento nuevo para viáticos si corresponde.",
        );
      } else {
        toast.success(
          "Evento movido a la papelera. Podés restaurarlo en 24 horas.",
        );
      }
    } catch (err) {
      toast.error("Error al eliminar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreEvent = async (eventId) => {
    try {
      const { error } = await supabase
        .from("eventos")
        .update({ is_deleted: false, deleted_at: null })
        .eq("id", eventId);
      if (error) throw error;
      toast.success(
        "Evento restaurado exitosamente. Ha vuelto a la agenda activa.",
        { icon: "✅" },
      );
      fetchAgenda(true);
    } catch (err) {
      toast.error("Error al restaurar: " + err.message);
    }
  };

  const handlePermanentDeleteEvent = async () => {
    if (!permanentDeleteTarget) return;
    const id = permanentDeleteTarget.id;
    setPermanentDeleteTarget(null);
    setLoading(true);
    try {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;
      toast.success("Evento eliminado definitivamente.");
      fetchAgenda(true);
    } catch (err) {
      console.error("Error al eliminar definitivamente:", err);
      toast.error("Error al eliminar definitivamente: " + err.message);
    } finally {
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
        id_gira_transporte: editFormData.id_gira_transporte ?? null,
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
      toast.error("Error al duplicar: " + err.message);
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editFormData.fecha || !editFormData.hora_inicio) {
      toast.error("Faltan datos");
      return;
    }

    // Validar nota obligatoria si hay cambio de estado de venue
    const prevStatus =
      editingEventObj?.id_estado_venue == null
        ? null
        : editingEventObj.id_estado_venue;
    const newStatus =
      editFormData.id_estado_venue == null
        ? null
        : editFormData.id_estado_venue;
    if (prevStatus !== newStatus && newStatus != null) {
      if (
        !editFormData.venue_status_note ||
        !editFormData.venue_status_note.trim()
      ) {
        toast.error("Agrega una nota para el cambio de estado de venue.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        descripcion: editFormData.descripcion,
        fecha: editFormData.fecha,
        hora_inicio: editFormData.hora_inicio,
        hora_fin: editFormData.hora_fin || editFormData.hora_inicio,
        id_tipo_evento: editFormData.id_tipo_evento || null,
        id_locacion: editFormData.id_locacion || null,
        id_gira_transporte: editFormData.id_gira_transporte ?? null,
        tecnica: editFormData.tecnica || false,
        id_estado_venue: editFormData.id_estado_venue || null,
      };
      const { error } = await supabase
        .from("eventos")
        .update(payload)
        .eq("id", editFormData.id);
      if (error) throw error;

      // Log de cambio de estado de venue (solo conciertos)

      if (prevStatus !== newStatus && newStatus != null) {
        try {
          await supabase.from("eventos_venue_log").insert({
            id_evento: editFormData.id,
            id_estado_venue: newStatus,
            nota: editFormData.venue_status_note || null,
            id_integrante: user.id,
          });
        } catch (logError) {
          console.error("Error guardando log de estado de venue:", logError);
        }
      }

      setIsEditOpen(false);
      setEditFormData({});
      fetchAgenda();
    } catch (err) {
      toast.error("Error: " + err.message);
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
      id_gira_transporte: null,
      tecnica: false,
      id_estado_venue: null,
      venue_status_note: "",
    });
    setIsCreating(true);
  };

  const handleCreateSave = async () => {
    if (!newFormData.fecha || !newFormData.hora_inicio) {
      toast.error("Faltan datos");
      return;
    }

    // Validar nota obligatoria si se asigna estado de venue al crear
    if (newFormData.id_estado_venue) {
      if (
        !newFormData.venue_status_note ||
        !newFormData.venue_status_note.trim()
      ) {
        toast.error("Agrega una nota para el estado de venue inicial.");
        return;
      }
    }

    setLoading(true); // Bloqueamos para crear
    const payload = {
      id_gira: giraId,
      descripcion: newFormData.descripcion || null,
      fecha: newFormData.fecha,
      hora_inicio: newFormData.hora_inicio,
      hora_fin: newFormData.hora_fin || newFormData.hora_inicio,
      id_tipo_evento: newFormData.id_tipo_evento || null,
      id_locacion: newFormData.id_locacion || null,
      id_gira_transporte: newFormData.id_gira_transporte ?? null,
      tecnica: newFormData.tecnica,
      id_estado_venue: newFormData.id_estado_venue || null,
    };
    const { data, error } = await supabase
      .from("eventos")
      .insert([payload])
      .select()
      .single();
    if (error) {
      setLoading(false);
      toast.error("Error al crear evento: " + error.message);
      return;
    }

    // Log inicial de estado de venue si corresponde
    if (newFormData.id_estado_venue) {
      try {
        await supabase.from("eventos_venue_log").insert({
          id_evento: data.id,
          id_estado_venue: newFormData.id_estado_venue,
          nota: newFormData.venue_status_note || null,
          id_integrante: user.id,
        });
      } catch (logError) {
        console.error(
          "Error guardando log inicial de estado de venue:",
          logError,
        );
      }
    }

    setIsCreating(false);
    fetchAgenda();
  };

  const groupedByMonth = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      try {
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
  }, [filteredItems]);

  // Dónde va la línea "ahora" (dentro de un evento o entre dos) y evento "actual" para filtro/scroll
  const linePlacement = useMemo(
    () => getNowLinePlacement(filteredItems),
    [filteredItems],
  );

  const currentEventId = useMemo(() => {
    if (!linePlacement) return null;
    if (linePlacement.type === "inside") return linePlacement.eventId;
    if (linePlacement.type === "between") return linePlacement.nextId;
    return null;
  }, [linePlacement]);

  const currentEvent = useMemo(
    () => filteredItems.find((i) => i.id === currentEventId) ?? null,
    [filteredItems, currentEventId],
  );

  // Eventos de hoy que terminan antes de que empiece el evento actual (para colapsar "anteriores")
  const earlierTodayEventIds = useMemo(() => {
    if (!currentEvent) return new Set();
    const today = getTodayDateStringLocal();
    const currentStart = timeStringToMinutes(currentEvent.hora_inicio);
    return new Set(
      filteredItems
        .filter(
          (i) =>
            !i.isProgramMarker &&
            i.fecha === today &&
            i.id !== currentEvent.id &&
            timeStringToMinutes(i.hora_fin || i.hora_inicio) <= currentStart,
        )
        .map((i) => i.id),
    );
  }, [filteredItems, currentEvent]);

  const [showEarlierToday, setShowEarlierToday] = useState(false);

  // Auto-scroll al evento actual (Agenda General y Agenda de la Gira): al cargar y cuando no hay "anteriores"
  useEffect(() => {
    if (loading || filteredItems.length === 0 || !currentEventId) return;
    if (earlierTodayEventIds.size > 0) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-event-id="${currentEventId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(timer);
  }, [
    loading,
    filteredItems.length,
    currentEventId,
    earlierTodayEventIds.size,
    giraId,
  ]);

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
          <div className="flex items-center gap-3 overflow-hidden flex-1">
            {onBack && (
              <button
                onClick={onBack}
                className="text-slate-500 hover:text-indigo-600 shrink-0"
              >
                <IconArrowLeft size={22} />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate leading-tight">
                  {title}
                </h2>
                {isTechnician && !isEditor && !isManagement && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-50 uppercase tracking-wide shrink-0">
                    Téc
                  </span>
                )}
              </div>
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
              isUpdating={isRefreshing || (loading && items.length > 0)}
            />

            {canImportEvents && (
              <button
                type="button"
                onClick={() => setIsTranspositionOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold shadow-sm hover:bg-indigo-100 hover:text-indigo-800"
              >
                <IconRefresh size={14} />
                <span>Importar</span>
              </button>
            )}

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
                      showNoGray ||
                      dateRangeFilterLooksActive
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
                            if (isGiraFinishedTour && giraFirstDate) {
                              setFilterDateFrom(giraFirstDate);
                            } else {
                              setFilterDateFrom(getTodayDateStringLocal());
                            }
                            setFilterDateTo(null);
                            if (isGiraFinishedTour) setShowNonActive(true);
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
                        <div className="p-2 border-b border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-2 flex items-center gap-1">
                            <IconCalendar size={12} />
                            Rango de fechas
                          </span>
                          <div className="grid grid-cols-2 gap-2 px-2">
                            <DateInput
                              label="Desde"
                              value={
                                filterDateFrom || getTodayDateStringLocal()
                              }
                              onChange={(v) =>
                                setFilterDateFrom(
                                  v || getTodayDateStringLocal(),
                                )
                              }
                              className="mt-1 w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <DateInput
                              label="Hasta"
                              value={filterDateTo || ""}
                              onChange={(v) => setFilterDateTo(v || null)}
                              className="mt-1 w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 px-2 mt-1">
                            Por defecto desde hoy. Opcional: hasta para acotar.
                          </p>
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
                            <label
                              className={`flex items-center gap-2 p-2 ${isGiraFinishedTour ? "cursor-default opacity-90" : "cursor-pointer"}`}
                            >
                              <input
                                type="checkbox"
                                className="accent-amber-600 w-4 h-4"
                                checked={showNonActiveForFilter}
                                disabled={isGiraFinishedTour}
                                onChange={(e) =>
                                  !isGiraFinishedTour &&
                                  setShowNonActive(e.target.checked)
                                }
                              />
                              <span className="text-xs font-bold text-amber-800">
                                Mostrar borradores
                                {isGiraFinishedTour && (
                                  <span className="block font-normal text-[10px] text-amber-700/90 mt-0.5">
                                    En giras finalizadas siempre se incluyen
                                    programas no vigentes.
                                  </span>
                                )}
                              </span>
                            </label>
                          </div>
                        )}
                        {isAdmin && (
                          <div className="p-2 border-t border-slate-100 bg-rose-50/60">
                            <label className="flex items-center gap-2 cursor-pointer p-2">
                              <input
                                type="checkbox"
                                className="accent-rose-600 w-4 h-4"
                                checked={hideDeletedEvents}
                                onChange={(e) =>
                                  setHideDeletedEvents(e.target.checked)
                                }
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-rose-900">
                                  Ocultar eliminados
                                </span>
                                <span className="text-[10px] text-rose-700">
                                  Oculta todos los eventos eliminados, incluso
                                  los recientes.
                                </span>
                              </div>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer p-2">
                              <input
                                type="checkbox"
                                className="accent-rose-600 w-4 h-4"
                                checked={showDeletedEvents}
                                onChange={(e) =>
                                  setShowDeletedEvents(e.target.checked)
                                }
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-rose-900">
                                  Mostrar eliminados antiguos
                                </span>
                                <span className="text-[10px] text-rose-700">
                                  Incluye eventos eliminados hace más de
                                  24&nbsp;h (solo admins).
                                </span>
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {canEdit && musicianOptions.length > 0 && (
                  <div className="w-[140px] sm:w-[160px]">
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
                      return (
                        <TourDivider
                          key={evt.id}
                          gira={evt.programas}
                          onViewChange={onViewChange}
                        />
                      );
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
                    const transportIconName =
                      evt.giras_transportes?.transportes?.icon || "IconBus";
                    const TransportIcon =
                      TRANSPORT_ICON_MAP[transportIconName] || IconBus;

                    if (isTransportEvent && evt.id_gira_transporte) {
                      const transportIdStr = String(evt.id_gira_transporte);
                      const myStatus = myTransportLogistics[transportIdStr];
                      const isTrasladoInterno =
                        Number(evt.id_tipo_evento) === ID_TIPO_TRASLADO_INTERNO;

                      if (isTrasladoInterno || (myStatus && myStatus.assigned)) {
                        isMyTransport = true;
                        if (myStatus && String(myStatus.subidaId) === String(evt.id))
                          isMyUp = true;
                        if (myStatus && String(myStatus.bajadaId) === String(evt.id))
                          isMyDown = true;
                      } else {
                        const tourHasRules = toursWithRules.has(evt.id_gira);
                        debugReason = tourHasRules ? "No Match" : "Sin Reglas";
                      }
                    }

                    let isTransportDimmed = isTransportEvent && !isMyTransport;
                    if (showNoGray && isTransportEvent)
                      isTransportDimmed = false;
                    if (Number(evt.id_tipo_evento) === ID_TIPO_TRASLADO_INTERNO)
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
                    const isConcertEvent = Number(evt.id_tipo_evento) === 1;

                    const cardStyle = { backgroundColor: `${eventColor}10` };

                    const feriado = feriados.find((f) => f.fecha === evt.fecha);

                    const isRecentlyModified =
                      evt.updated_at &&
                      new Date(evt.updated_at).getTime() >
                        Date.now() - 24 * 60 * 60 * 1000;
                    const isDeleted = evt.is_deleted === true;
                    const canAdminEditDeleted = isAdmin && showDeletedEvents;
                    const isReadOnlyDeleted = isDeleted && !canAdminEditDeleted;

                    return (
                      <React.Fragment key={evt.id}>
                        {showDay && (
                          <div className="bg-slate-50/95 backdrop-blur px-4 py-1.5 text-xs font-bold text-slate-500 uppercase border-b border-slate-100 flex items-center gap-2 sticky top-[45px] z-10 shadow-sm">
                            <IconCalendar size={12} />
                            {format(parseISO(evt.fecha), "EEEE d", {
                              locale: es,
                            })}
                            {feriado && <FeriadoBadge feriado={feriado} />}
                          </div>
                        )}

                        {showDay &&
                          evt.fecha === getTodayDateStringLocal() &&
                          earlierTodayEventIds.size > 0 &&
                          !showEarlierToday && (
                            <button
                              type="button"
                              onClick={() => setShowEarlierToday(true)}
                              className="w-full px-4 py-2.5 text-left text-sm font-medium text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80 border-b border-emerald-100 transition-colors flex items-center gap-2"
                            >
                              <IconChevronDown
                                size={16}
                                className="rotate-[-90deg]"
                                aria-hidden
                              />
                              Ver eventos anteriores de hoy
                            </button>
                          )}

                        {linePlacement?.type === "between" &&
                          linePlacement.nextId === evt.id && (
                            <div
                              className="relative min-h-[2.75rem] flex items-center bg-slate-50/50 border-b border-slate-100 px-0"
                              aria-hidden
                            >
                              <div className="absolute left-0 right-0 flex items-center z-10 pointer-events-none animate-agenda-now-line">
                                <span
                                  className="shrink-0 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[11px] border-l-emerald-500"
                                  style={{
                                    boxShadow:
                                      "0 0 8px rgba(16, 185, 129, 0.4)",
                                  }}
                                  aria-hidden
                                />
                                <span
                                  className="flex-1 h-0.5 bg-emerald-500/90 min-w-0"
                                  style={{
                                    boxShadow:
                                      "0 0 10px rgba(16, 185, 129, 0.35)",
                                  }}
                                  aria-hidden
                                />
                              </div>
                            </div>
                          )}

                        {!(
                          earlierTodayEventIds.has(evt.id) && !showEarlierToday
                        ) && (
                          <>
                            <div
                              data-event-id={evt.id}
                              className={`relative ${currentEventId === evt.id ? "scroll-mt-24" : ""}`}
                            >
                              {linePlacement?.type === "inside" &&
                                linePlacement.eventId === evt.id && (
                                  <div
                                    className="absolute left-0 right-0 flex items-center z-10 pointer-events-none animate-agenda-now-line"
                                    style={{
                                      top: `${linePlacement.progress * 100}%`,
                                    }}
                                    aria-hidden
                                  >
                                    <span
                                      className="shrink-0 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[11px] border-l-emerald-500"
                                      style={{
                                        boxShadow:
                                          "0 0 8px rgba(16, 185, 129, 0.4)",
                                      }}
                                      aria-hidden
                                    />
                                    <span
                                      className="flex-1 h-0.5 bg-emerald-500/90 min-w-0"
                                      style={{
                                        boxShadow:
                                          "0 0 10px rgba(16, 185, 129, 0.35)",
                                      }}
                                      aria-hidden
                                    />
                                  </div>
                                )}
                              {/* --- CONTENEDOR MÓVIL (VISIBLE SOLO EN < md) --- */}
                              <div
                                className={`md:hidden relative flex flex-row items-stretch px-4 py-2 border-b border-slate-200 transition-colors group gap-2
                            ${shouldDim && !isDeleted ? "opacity-50 grayscale hover:bg-slate-50" : ""}
                            ${isDeleted ? "bg-orange-50 opacity-80 line-through" : ""}
                            ${isReadOnlyDeleted ? " pointer-events-none" : ""}
                            ${!isDeleted && evt.is_guest ? "bg-emerald-50/30 hover:bg-slate-50" : ""}
                            ${!isDeleted && isMyTransport ? "bg-indigo-50/30 border-l-4 border-l-indigo-400 hover:bg-slate-50" : ""}
                            ${isRecentlyModified && !isDeleted ? "ring-2 ring-blue-500 animate-pulse" : ""}
                          `}
                                style={
                                  isDeleted
                                    ? { backgroundColor: "#fff7ed" }
                                    : !shouldDim &&
                                        !evt.is_guest &&
                                        !isMyTransport
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

                                <div
                                  className={`w-10 font-mono text-s font-bold shrink-0 flex flex-col items-center pt-1 ${isDeleted ? "text-orange-700" : "text-slate-600"}`}
                                >
                                  <span>{evt.hora_inicio?.slice(0, 5)}</span>
                                  {evt.hora_fin &&
                                    evt.hora_fin !== evt.hora_inicio && (
                                      <span
                                        className={`text-[9px] block ${isDeleted ? "text-orange-600" : "text-slate-400"}`}
                                      >
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
                                          toggleEventTechnica(
                                            e,
                                            evt.id,
                                            evt.tecnica,
                                          )
                                        }
                                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all text-[9px] font-bold uppercase ${evt.tecnica ? "bg-slate-700 text-white border-slate-700" : "bg-transparent text-slate-300 border-transparent"}`}
                                      >
                                        {evt.tecnica ? (
                                          <>
                                            <IconEyeOff
                                              size={10}
                                              strokeWidth={4}
                                            />
                                            <span>TÉC</span>
                                          </>
                                        ) : (
                                          <IconEye size={12} />
                                        )}
                                      </button>
                                    )}
                                    {!isManagement &&
                                      !isEditor &&
                                      isTechnician &&
                                      evt.tecnica && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 text-white text-[9px] font-bold uppercase">
                                          TÉC
                                        </span>
                                      )}
                                  </div>

                                  {/* Descripción + chips para móvil */}
                                  {evt.id_tipo_evento === 13 ? (
                                    <>
                                      {/* Descripción con chips de ensamble al costado */}
                                      <div className="flex items-start gap-2">
                                        <div
                                          className={`flex-1 text-sm leading-tight break-words ${isDeleted ? "text-orange-700" : shouldDim ? "text-slate-400" : "text-slate-800"}`}
                                        >
                                          {evt.descripcion ? (
                                            <div
                                              className="whitespace-pre-wrap font-medium [&>b]:font-bold [&>strong]:font-bold"
                                              dangerouslySetInnerHTML={{
                                                __html: evt.descripcion,
                                              }}
                                            />
                                          ) : (
                                            <span>
                                              {evt.tipos_evento?.nombre}
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex flex-wrap gap-1 shrink-0">
                                          {(evt.eventos_ensambles?.length > 0
                                            ? evt.eventos_ensambles
                                                .map(
                                                  (ee) =>
                                                    ee.ensambles?.ensamble,
                                                )
                                                .filter(Boolean)
                                            : []
                                          ).length > 0 ? (
                                            (evt.eventos_ensambles || [])
                                              .filter(
                                                (ee) => ee.ensambles?.ensamble,
                                              )
                                              .map((ee) => (
                                                <span
                                                  key={ee.ensambles?.id}
                                                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-tight"
                                                >
                                                  {ee.ensambles.ensamble}
                                                </span>
                                              ))
                                          ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-tight">
                                              S/E
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Chips de programa debajo de la descripción */}
                                      {Array.isArray(
                                        evt.eventos_programas_asociados,
                                      ) &&
                                        evt.eventos_programas_asociados.length >
                                          0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {evt.eventos_programas_asociados
                                              .map((ep) => ep.programas)
                                              .filter(Boolean)
                                              .map((prog) => {
                                                const badgeClasses =
                                                  getProgramBadgeClasses(prog);
                                                return (
                                                  <div
                                                    key={prog.id}
                                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${badgeClasses}`}
                                                    title={prog.nombre_gira}
                                                  >
                                                    <span className="font-bold">
                                                      [
                                                      {prog.nomenclador ||
                                                        "Sin código"}
                                                      ]
                                                    </span>
                                                    <span className="opacity-70">
                                                      |
                                                    </span>
                                                    <span className="truncate max-w-[150px] italic">
                                                      {prog.nombre_gira}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                          </div>
                                        )}
                                    </>
                                  ) : (
                                    <div
                                      className={`text-sm leading-tight break-words ${isDeleted ? "text-orange-700" : shouldDim ? "text-slate-400" : "text-slate-800"}`}
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
                                  )}

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
                                        <TransportIcon
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
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    {isMyUp && (
                                      <span className="md:hidden flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mb-0.5">
                                        <IconUpload size={12} /> Mi Subida
                                      </span>
                                    )}
                                    {isMyDown && (
                                      <span className="md:hidden flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 mb-0.5">
                                        <IconDownload size={12} /> Mi Bajada
                                      </span>
                                    )}
                                    {locName && (
                                      <div
                                        className={`flex items-start gap-1 text-xs mt-0.5 ${isDeleted ? "text-orange-700" : "text-slate-500"}`}
                                      >
                                        <VenueStatusPin
                                          eventId={evt.id}
                                          idEstadoVenue={evt.id_estado_venue}
                                          label={`${evt.tipos_evento?.nombre || "Evento"} ${evt.fecha || ""} ${evt.hora_inicio?.slice(0, 5) || ""}`}
                                          supabase={supabase}
                                          className="mt-0.5"
                                          size={14}
                                        />
                                        <div className="flex flex-col min-w-0">
                                          <span
                                            className={`font-semibold truncate ${isDeleted ? "text-orange-700" : "text-slate-700"}`}
                                          >
                                            {locName}{" "}
                                            {locCity ? `(${locCity})` : ""}
                                          </span>
                                          {evt.locaciones?.direccion && (
                                            <a
                                              href={getGoogleMapsUrl(
                                                evt.locaciones,
                                              )}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[10px] text-blue-600 hover:underline truncate block w-full"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            >
                                              {evt.locaciones.direccion} ↗
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-start gap-1 pl-2 pt-1 border-l border-slate-100 flex-col justify-between min-w-[40px]">
                                  {isDeleted &&
                                  (isEditor || isAdmin || isManagement) ? (
                                    <div className="flex flex-col gap-1 items-end">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRestoreEvent(evt.id);
                                        }}
                                        className="pointer-events-auto p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                        title="Restaurar evento"
                                      >
                                        <IconUndo size={18} />
                                      </button>
                                      {isAdmin && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPermanentDeleteTarget({
                                              id: evt.id,
                                              label: `${evt.tipos_evento?.nombre || "Evento"} ${evt.fecha || ""} ${evt.hora_inicio?.slice(0, 5) || ""}`,
                                            });
                                          }}
                                          className="pointer-events-auto p-1.5 text-violet-600 hover:bg-violet-50 rounded-full transition-colors"
                                          title="Eliminar definitivamente"
                                        >
                                          <IconTrash size={18} />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      {isMeal &&
                                        evt.is_convoked &&
                                        user.id !== "guest-general" && (
                                          <button
                                            onClick={() =>
                                              setMealActionTarget(evt)
                                            }
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
                                                );
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
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setEventHistoryEvent({
                                              id: evt.id,
                                              label: `${evt.tipos_evento?.nombre || "Evento"} ${evt.fecha || ""} ${evt.hora_inicio?.slice(0, 5) || ""}`,
                                            })
                                          }
                                          className="p-1 text-slate-300 hover:text-indigo-500 rounded-full border border-transparent hover:border-indigo-100"
                                          title="Ver historial de cambios"
                                        >
                                          <IconHistory size={14} />
                                        </button>
                                        {!isOfflineMode &&
                                          (isGlobalEditor ||
                                            canUserEditEvent(evt)) && (
                                            <button
                                              onClick={() => openEditModal(evt)}
                                              className="p-1 text-slate-300 bg-white rounded-full border border-slate-100"
                                            >
                                              <IconEdit size={14} />
                                            </button>
                                          )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* ======================================================== */}
                              {/* VISTA ESCRITORIO (Grid Columnar) - Visible solo en md+ */}
                              {/* ======================================================== */}
                              <div
                                className={`hidden md:grid md:grid-cols-12 gap-2 p-3 pl-4 items-start border-b border-slate-100 transition-colors group relative
                            ${shouldDim && !isDeleted ? "opacity-60 grayscale hover:bg-slate-50" : ""}
                            ${isDeleted ? "bg-orange-50 opacity-80 line-through" : ""}
                            ${isReadOnlyDeleted ? " pointer-events-none" : ""}
                            ${!isDeleted && evt.is_guest ? "bg-emerald-50/30 hover:bg-slate-50" : ""}
                            ${!isDeleted && isMyTransport ? "bg-indigo-50/30 hover:bg-slate-50" : ""}
                            ${isRecentlyModified && !isDeleted ? "ring-2 ring-blue-500 animate-pulse" : ""}
                          `}
                                style={
                                  isDeleted
                                    ? { backgroundColor: "#fff7ed" }
                                    : !shouldDim &&
                                        !evt.is_guest &&
                                        !isMyTransport
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
                                  <div
                                    className={`font-mono text-sm font-bold ${isDeleted ? "text-orange-700" : "text-slate-700"}`}
                                  >
                                    {evt.hora_inicio?.slice(0, 5)}
                                  </div>
                                  {evt.hora_fin &&
                                    evt.hora_fin !== evt.hora_inicio && (
                                      <div
                                        className={`font-mono text-[10px] ${isDeleted ? "text-orange-600" : "text-slate-400"}`}
                                      >
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
                                          toggleEventTechnica(
                                            e,
                                            evt.id,
                                            evt.tecnica,
                                          )
                                        }
                                        className={`flex items-center gap-1 px-1 py-0.5 rounded border transition-all text-[9px] font-bold uppercase ${evt.tecnica ? "bg-slate-700 text-white" : "text-slate-300"}`}
                                      >
                                        {evt.tecnica ? (
                                          "TÉC"
                                        ) : (
                                          <IconEye size={10} />
                                        )}
                                      </button>
                                    )}
                                    {!isManagement &&
                                      !isEditor &&
                                      isTechnician &&
                                      evt.tecnica && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 text-white text-[9px] font-bold uppercase">
                                          TÉC
                                        </span>
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
                                            : `${transportColor}12`,
                                          color: isMyTransport
                                            ? "#1e293b"
                                            : "#64748b",
                                          borderColor: `${transportColor}40`,
                                        }}
                                      >
                                        <TransportIcon
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

                                {/* COLUMNA 3: DESCRIPCIÓN + ENSAMBLES + PROGRAMAS */}
                                <div className="col-span-4 min-w-0">
                                  <div className="flex items-start gap-2">
                                    <div
                                      className={`flex-1 text-sm leading-tight break-words ${isDeleted ? "text-orange-700" : shouldDim ? "text-slate-400" : "text-slate-800"}`}
                                    >
                                      {evt.descripcion ? (
                                        <div
                                          className="whitespace-pre-wrap font-medium [&>b]:font-bold [&>strong]:font-bold text-sm"
                                          dangerouslySetInnerHTML={{
                                            __html: evt.descripcion,
                                          }}
                                        />
                                      ) : (
                                        <span
                                          className={
                                            isDeleted
                                              ? "font-bold text-orange-700"
                                              : "font-bold text-slate-800"
                                          }
                                        >
                                          {evt.tipos_evento?.nombre}
                                        </span>
                                      )}
                                    </div>

                                    {/* Chip(es) de ensamble al lado de la descripción */}
                                    {evt.id_tipo_evento === 13 && (
                                      <div className="flex flex-wrap gap-1 shrink-0">
                                        {(evt.eventos_ensambles?.length > 0
                                          ? evt.eventos_ensambles
                                              .map(
                                                (ee) => ee.ensambles?.ensamble,
                                              )
                                              .filter(Boolean)
                                          : []
                                        ).length > 0 ? (
                                          (evt.eventos_ensambles || [])
                                            .filter(
                                              (ee) => ee.ensambles?.ensamble,
                                            )
                                            .map((ee) => (
                                              <span
                                                key={ee.ensambles?.id}
                                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-tight"
                                              >
                                                {ee.ensambles.ensamble}
                                              </span>
                                            ))
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-tight">
                                            S/E
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {/* Badges de Logística Personal (Escritorio) */}
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {isMyUp && (
                                        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                          <IconUpload size={10} /> Mi Subida
                                        </span>
                                      )}
                                      {isMyDown && (
                                        <span className="flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                          <IconDownload size={10} /> Mi Bajada
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Chips de programas DEBAJO de la descripción */}
                                  {evt.id_tipo_evento === 13 &&
                                    Array.isArray(
                                      evt.eventos_programas_asociados,
                                    ) &&
                                    evt.eventos_programas_asociados.length >
                                      0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {evt.eventos_programas_asociados
                                          .map((ep) => ep.programas)
                                          .filter(Boolean)
                                          .map((prog) => {
                                            const badgeClasses =
                                              getProgramBadgeClasses(prog);
                                            return (
                                              <div
                                                key={prog.id}
                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${badgeClasses}`}
                                                title={prog.nombre_gira}
                                              >
                                                <span className="font-bold">
                                                  [
                                                  {prog.nomenclador ||
                                                    "Sin código"}
                                                  ]
                                                </span>
                                                <span className="opacity-70">
                                                  |
                                                </span>
                                                <span className="truncate max-w-[150px] italic">
                                                  {prog.nombre_gira}
                                                </span>
                                              </div>
                                            );
                                          })}
                                      </div>
                                    )}
                                </div>

                                {/* COLUMNA 4: LOCACIÓN */}
                                <div className="col-span-3 min-w-0">
                                  {locName && (
                                    <div
                                      className={`flex items-start gap-1.5 ${isDeleted ? "text-orange-700" : ""}`}
                                    >
                                      <VenueStatusPin
                                        eventId={evt.id}
                                        idEstadoVenue={evt.id_estado_venue}
                                        label={`${evt.tipos_evento?.nombre || "Evento"} ${evt.fecha || ""} ${evt.hora_inicio?.slice(0, 5) || ""}`}
                                        supabase={supabase}
                                        className="mt-0.5"
                                        size={14}
                                      />
                                      <div className="flex flex-col min-w-0">
                                        <span
                                          className={`text-xs font-semibold truncate block ${isDeleted ? "text-orange-700" : "text-slate-700"}`}
                                        >
                                          {locName}{" "}
                                          {locCity ? `(${locCity})` : ""}
                                        </span>
                                        {evt.locaciones?.direccion && (
                                          <a
                                            href={getGoogleMapsUrl(
                                              evt.locaciones,
                                            )}
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
                                  {isDeleted && (isEditor || isManagement) ? (
                                    <div className="flex flex-col items-end gap-1 mt-auto">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRestoreEvent(evt.id);
                                        }}
                                        className="pointer-events-auto p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                        title="Restaurar evento"
                                      >
                                        <IconUndo size={18} />
                                      </button>
                                      {isAdmin && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPermanentDeleteTarget({
                                              id: evt.id,
                                              label: `${evt.tipos_evento?.nombre || "Evento"} ${evt.fecha || ""} ${evt.hora_inicio?.slice(0, 5) || ""}`,
                                            });
                                          }}
                                          className="pointer-events-auto p-1.5 text-violet-600 hover:bg-violet-50 rounded-full transition-colors"
                                          title="Eliminar definitivamente"
                                        >
                                          <IconTrash size={18} />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      {isMeal &&
                                        evt.is_convoked &&
                                        user.id !== "guest-general" && (
                                          <button
                                            onClick={() =>
                                              setMealActionTarget(evt)
                                            }
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
                                      <div className="flex flex-col items-end gap-1 mt-auto">
                                        <div className="flex gap-1">
                                          <DriveSmartButton evt={evt} />
                                          {evt.programas?.id &&
                                            onOpenRepertoire &&
                                            !isNonConvokedMeal && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onOpenRepertoire(
                                                    evt.programas.id,
                                                  );
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
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEventHistoryEvent({
                                                id: evt.id,
                                                label: `${evt.tipos_evento?.nombre || "Evento"} ${evt.fecha || ""} ${evt.hora_inicio?.slice(0, 5) || ""}`,
                                              })
                                            }
                                            className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-slate-100 rounded-full"
                                            title="Ver historial de cambios"
                                          >
                                            <IconHistory size={14} />
                                          </button>
                                          {!isOfflineMode &&
                                            (isGlobalEditor ||
                                              canUserEditEvent(evt)) && (
                                              <button
                                                onClick={() =>
                                                  openEditModal(evt)
                                                }
                                                className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-slate-100 rounded-full"
                                              >
                                                <IconEdit size={14} />
                                              </button>
                                            )}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div
                              className="h-px bg-slate-300 shrink-0"
                              aria-hidden
                            />
                          </>
                        )}
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
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() =>
          setDeleteConfirm({
            isOpen: false,
            message: "",
            messageIsHtml: false,
            hasLogisticsLinks: false,
          })
        }
        onConfirm={handleConfirmDeleteEvent}
        title="Mover a la papelera"
        message={deleteConfirm.message}
        messageIsHtml={deleteConfirm.messageIsHtml}
        confirmText="Mover a la papelera"
        cancelText="Cancelar"
      />
      <ConfirmModal
        isOpen={!!permanentDeleteTarget}
        onClose={() => setPermanentDeleteTarget(null)}
        onConfirm={handlePermanentDeleteEvent}
        title="Eliminar definitivamente"
        message={
          permanentDeleteTarget
            ? `¿Eliminar definitivamente el evento "${permanentDeleteTarget.label}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Eliminar definitivamente"
        cancelText="Cancelar"
        confirmVariant="danger"
      />
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
            giraId={giraId}
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
      <AgendaMealActionModal
        event={mealActionTarget}
        onClose={() => setMealActionTarget(null)}
        onToggleAttendance={toggleMealAttendance}
        isManagement={isManagement}
        isEditor={isEditor}
      />
      {eventHistoryEvent && (
        <EventHistoryModal
          supabase={supabase}
          eventId={eventHistoryEvent.id}
          eventLabel={eventHistoryEvent.label}
          onClose={() => setEventHistoryEvent(null)}
        />
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
            giraId={giraId}
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
      {isTranspositionOpen && (
        <EventTranspositionModal
          isOpen={isTranspositionOpen}
          onClose={() => setIsTranspositionOpen(false)}
          supabase={supabase}
          giraDestino={mainProgram}
          giraId={giraId}
          currentEvents={items}
          onImported={async () => {
            await fetchAgenda(false);
          }}
        />
      )}
    </div>
  );
}
