import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  startTransition,
} from "react";
import { createPortal } from "react-dom";
import { format, parseISO, subDays, subMonths } from "date-fns";
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
  IconAlertCircle,
  IconEyeOff,
  IconUtensils,
  IconFilter,
  IconUndo,
  IconRefresh,
  IconTrash,
  IconTag,
  IconSearch,
  IconLayout,
  IconLayers,
  IconFileText,
} from "../ui/Icons";
import { useAuth } from "../../context/AuthContext";
import CommentsManager from "../comments/CommentsManager";
import CommentButton from "../comments/CommentButton";
import EventForm from "../forms/EventForm";
import {
  eventGrupoIdsFromEvent,
  eventGruposMetaFromEvent,
  eventPassesEditorialGrupoFilter,
  fetchGiraGrupos,
  GIRA_GRUPO_DEFAULT_COLORS,
  GIRA_GRUPOS_TUTTI_LABEL,
  GIRA_GRUPOS_TUTTI_VALUE,
  hasEditorialGrupoFilter,
  isGiraGruposTuttiValue,
  setEventoGrupos,
} from "../../services/giraGruposService";
import IndependentRehearsalForm from "../../views/Ensembles/IndependentRehearsalForm";
import SearchableSelect from "../ui/SearchableSelect";
import MultiSelectDropdown from "../ui/MultiSelectDropdown";
import EventGruposAssignModal from "./EventGruposAssignModal";
import StagePlotViewerModal from "../../views/Giras/StagePlotViewerModal";
import FimbaBacklineConsultaModal from "../../views/Fimba/FimbaBacklineConsultaModal";
import FimbaRiderConsultaModal from "../../views/Fimba/FimbaRiderConsultaModal";
import {
  resolveEventFimbaPropuestas,
  shouldShowAgendaBacklineIcon,
  shouldShowAgendaRiderIcon,
} from "../../utils/fimbaAgendaConsulta";
import { exportAgendaToPDF } from "../../utils/agendaPdfExporter";
import { calculateLogisticsSummary } from "../../hooks/useLogistics";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useAgendaFilters } from "../../hooks/useAgendaFilters";
import {
  useAgendaData,
  getAgendaCacheKey,
  saveToCache,
} from "../../hooks/useAgendaData";
import DateInput from "../ui/DateInput";
import {
  getTodayDateStringLocal,
  getCurrentTimeLocal,
  timeStringToMinutes,
  addMonthsToDateStringLocal,
} from "../../utils/dates";
import { getTransportEventAffectedSummary } from "../../utils/transportLogisticsWarning";
import {
  getNowLinePlacement,
  getDeadlineStatus,
  getGoogleMapsUrl,
  getAgendaTransportFlags,
  buildAgendaPdfExportItems,
  eventMatchesAgendaSearch,
  eventPassesAgendaCategoryFilter,
  getAccentInsensitiveHighlightRanges,
  isFimbaOnlyAgendaEvent,
  ID_TIPO_TRASLADO_INTERNO,
} from "../../utils/agendaHelpers";
import {
  getProgramBadgeClasses,
  isMusicianExcludedDraftProgram,
  isUserConvoked,
} from "../../utils/giraUtils";
import VenueStatusPin from "../ui/VenueStatusPin";
import LocacionNombreSpan, {
  resolveLocacionNombre,
  shouldShowLocacionEnEvento,
} from "../locations/LocacionNombreSpan";
import FeriadoBadge from "./FeriadoBadge";
import ConnectionBadge from "./ConnectionBadge";
import DriveSmartButton from "./DriveSmartButton";
import TourDivider from "./TourDivider";
import AgendaMealActionModal from "./AgendaMealActionModal";
import AgendaEventDescripcionHtml from "./AgendaEventDescripcionHtml";
import EventTranspositionModal from "./EventTranspositionModal";
import EventHistoryModal from "../giras/EventHistoryModal";
import { AgendaEventHistoryButton } from "./ConcertHistoryControls";
import {
  EVENT_CREATION_SOURCES,
  isConcertHistoryEvent,
  shouldShowAgendaEventHistory,
  withConcertCreationMeta,
} from "../../utils/eventCreationLog";
import ConfirmModal from "../ui/ConfirmModal";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import RehearsalCheckInBlock from "./RehearsalCheckInBlock";
import { useEnsayoCheckin } from "../../hooks/useEnsayoCheckin";
import { isIntegranteConvocadoAEnsayo } from "../../utils/ensayoCheckinBanner";
import { notifyEnsayoEventoSoftDeleted } from "../../utils/ensayoCheckinLifecycle";
import { deriveAgendaPermissions } from "../../utils/agendaPermissions";
import { normalizeEventosInternasHtml } from "../../utils/eventosInternas";
import {
  resolveEventHoraFinForSave,
} from "../../utils/mealLogistics";
import { resolveEventFormSaveData } from "../../utils/hotelStayEvents";

const DELETED_FILTERS_STORAGE_KEY_PREFIX = "unified_agenda_deleted_filters_v1_";
const RECENT_CHANGES_ACK_STORAGE_KEY_PREFIX =
  "unified_agenda_recent_changes_ack_v1_";

const AGENDA_SEARCH_DEBOUNCE_MS = 250;

/**
 * Input aislado: el texto se pinta al instante (estado local).
 * El filtro de la agenda solo se re-calcula tras debounce, para no re-renderizar
 * toda UnifiedAgenda en cada tecla (la lag perceptual del input).
 */
function AgendaSearchField({ onQueryChange }) {
  const [localQuery, setLocalQuery] = useState("");
  const onQueryChangeRef = useRef(onQueryChange);
  const timerRef = useRef(null);

  useEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  }, [onQueryChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const commitQuery = useCallback((value, { immediate = false } = {}) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (immediate) {
      onQueryChangeRef.current(value);
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onQueryChangeRef.current(value);
    }, AGENDA_SEARCH_DEBOUNCE_MS);
  }, []);

  const handleChange = (e) => {
    const next = e.target.value;
    setLocalQuery(next);
    commitQuery(next);
  };

  const handleClear = () => {
    setLocalQuery("");
    commitQuery("", { immediate: true });
  };

  const isActive = Boolean(localQuery.trim());

  return (
    <div
      className={`relative flex min-w-[6.5rem] flex-1 items-center sm:min-w-0 sm:flex-none sm:shrink-0 transition-colors ${
        isActive
          ? "border-indigo-500 bg-white ring-1 ring-indigo-500/25"
          : "border-slate-200 bg-white"
      } border rounded-full shadow-sm`}
    >
      <IconSearch
        size={14}
        className="absolute left-2.5 text-slate-400 pointer-events-none"
      />
      <input
        type="search"
        value={localQuery}
        onChange={handleChange}
        placeholder="Buscar..."
        title="Buscar en tipo, detalle, locaciones y artistas"
        aria-label="Buscar en tipo, detalle, locaciones y artistas"
        className="w-full min-w-0 sm:w-[10.5rem] pl-8 pr-7 py-1.5 text-xs font-medium text-slate-700 bg-transparent rounded-full border-0 outline-none focus:ring-0 placeholder:text-slate-400"
      />
      {isActive && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-1.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          title="Limpiar búsqueda"
          aria-label="Limpiar búsqueda"
        >
          <IconX size={12} />
        </button>
      )}
    </div>
  );
}

/** Resalta coincidencias de búsqueda en texto plano (detalle/locación). */
function AgendaSearchHighlight({ text, query, className = "" }) {
  const rawText = String(text ?? "");
  const ranges = getAccentInsensitiveHighlightRanges(rawText, query);
  if (!ranges.length) {
    return className ? (
      <span className={className}>{rawText}</span>
    ) : (
      <>{rawText}</>
    );
  }
  const parts = [];
  let cursor = 0;
  ranges.forEach(([start, end], idx) => {
    if (cursor < start) {
      parts.push(
        <span key={`t-${idx}`}>{rawText.slice(cursor, start)}</span>,
      );
    }
    parts.push(
      <mark
        key={`m-${idx}`}
        className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5"
      >
        {rawText.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < rawText.length) {
    parts.push(<span key="tail">{rawText.slice(cursor)}</span>);
  }
  return <span className={className || undefined}>{parts}</span>;
}

function getRecentChangesAckAt(storageKey) {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return null;
    const parsed = Number(saved);
    return Number.isFinite(parsed) ? parsed : null;
  } catch (error) {
    console.error("Error reading recent changes ack", error);
    return null;
  }
}

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

/** En paradas de transporte: ojo = `visible_agenda` (mismo toggle que GirasTransportesManager). */
function AgendaEventAdminToggle({
  evt,
  isTransportEvent,
  canEditAdmin,
  isTechnicianRole,
  onToggleVisibleAgenda,
  onToggleTechnica,
  compact = false,
}) {
  const iconSize = compact ? 10 : 12;

  if (isTransportEvent && canEditAdmin) {
    const hidden = evt.visible_agenda === false;
    return (
      <button
        type="button"
        onClick={(e) => onToggleVisibleAgenda(e, evt.id, hidden)}
        className={`flex items-center gap-1 rounded border transition-all text-[9px] font-bold uppercase ${
          compact ? "px-1 py-0.5" : "px-1.5 py-0.5"
        } ${
          hidden
            ? "bg-slate-700 text-white border-slate-700"
            : "bg-transparent text-slate-300 border-transparent hover:text-slate-500"
        }`}
        title={
          hidden
            ? "Mostrar en agenda (todos los músicos)"
            : "Ocultar de agenda (pasajeros del bus y subida/bajada siguen viendo la parada)"
        }
      >
        {hidden ? (
          compact ? (
            "TÉC"
          ) : (
            <>
              <IconEyeOff size={10} strokeWidth={4} />
              <span>TÉC</span>
            </>
          )
        ) : (
          <IconEye size={iconSize} />
        )}
      </button>
    );
  }

  if (canEditAdmin) {
    return (
      <button
        type="button"
        onClick={(e) => onToggleTechnica(e, evt.id, evt.tecnica)}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all text-[9px] font-bold uppercase ${
          evt.tecnica
            ? "bg-slate-700 text-white border-slate-700"
            : "bg-transparent text-slate-300 border-transparent"
        }`}
        title={evt.tecnica ? "Quitar marca técnica" : "Marcar como técnico"}
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
    );
  }

  if (isTechnicianRole && evt.tecnica) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 text-white text-[9px] font-bold uppercase">
        TÉC
      </span>
    );
  }

  return null;
}

function AgendaEventTagChip({ nombre, color, fallbackColor = "#6366f1" }) {
  const c = color || fallbackColor;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-tight w-fit max-w-full truncate"
      style={{
        backgroundColor: `${c}18`,
        color: c,
        borderColor: `${c}44`,
      }}
      title={nombre}
    >
      {nombre}
    </span>
  );
}

/** Tag de grupos OFRN + chips de artista FIMBA apilados en vertical. */
function AgendaEventGruposBlock({
  evt,
  canManage,
  onOpenAssign,
  compact = false,
}) {
  const grupos = eventGruposMetaFromEvent(evt);
  const artistas = resolveEventFimbaPropuestas(evt);
  if (!canManage && grupos.length === 0 && artistas.length === 0) return null;

  const iconSize = compact ? 10 : 12;
  const hasGrupos = grupos.length > 0;
  const hasArtistas = artistas.length > 0;

  return (
    <div className="flex items-start gap-1 min-w-0">
      {canManage && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenAssign?.(evt);
          }}
          className={`flex items-center justify-center shrink-0 rounded border transition-all ${
            compact ? "px-1 py-0.5" : "px-1.5 py-0.5"
          } ${
            hasGrupos
              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
              : "bg-transparent text-slate-300 border-transparent hover:text-indigo-500"
          }`}
          title="Asignar grupos de convocatoria"
        >
          <IconTag size={iconSize} />
        </button>
      )}
      {(hasGrupos || hasArtistas) && (
        <div className="flex flex-col gap-1 min-w-0">
          {grupos.map((g) => (
            <AgendaEventTagChip
              key={`grp-${g.id}`}
              nombre={g.nombre}
              color={g.color}
            />
          ))}
          {artistas.map((p) => (
            <AgendaEventTagChip
              key={`art-${p.id}`}
              nombre={p.nombre}
              color={p.color}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AgendaEventSelectCheck({ checked, onToggle, compact = false }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? "Quitar de la selección" : "Seleccionar evento"}
      title={checked ? "Quitar de la selección" : "Seleccionar evento"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      className={`mt-1 shrink-0 flex items-center justify-center rounded border transition-colors ${
        compact ? "h-3.5 w-3.5" : "h-4 w-4"
      } ${
        checked
          ? "bg-indigo-600 border-indigo-600 text-white"
          : "bg-white border-slate-300 text-slate-300 hover:border-indigo-400"
      }`}
    >
      <IconCheck
        size={compact ? 9 : 11}
        className={checked ? "text-white" : "opacity-40"}
      />
    </button>
  );
}

/** Hora + check: el tilde queda centrado bajo el texto de la hora (p. ej. 20:00). */
function AgendaEventTimeCluster({
  horaInicio,
  horaFin,
  timeClassName,
  endClassName,
  showSelect,
  selected,
  onToggle,
  compact = false,
  checkIn = null,
}) {
  const select = showSelect ? (
    <AgendaEventSelectCheck
      checked={selected}
      onToggle={onToggle}
      compact={compact}
    />
  ) : null;

  if (checkIn) {
    return (
      <div className="inline-flex flex-col items-start font-mono">
        {checkIn}
        {select ? (
          <div className="w-[5ch] flex justify-center">{select}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-center font-mono">
      <span className={`text-sm font-bold leading-none tabular-nums ${timeClassName}`}>
        {horaInicio}
      </span>
      {horaFin ? (
        <span
          className={`mt-0.5 text-sm font-normal leading-none tabular-nums ${endClassName}`}
        >
          {horaFin}
        </span>
      ) : null}
      {select}
    </div>
  );
}

function AgendaEventRowTrashButton({ onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
      title="Mover a la papelera"
      aria-label="Mover a la papelera"
    >
      <IconTrash size={compact ? 14 : 16} />
    </button>
  );
}

function AgendaBulkActionsBar({
  count,
  onDelete,
  onHide,
  onTagGrupos,
  gruposDisabled = false,
  gruposReason = "",
  hideDisabled = false,
  hideReason = "",
  onClear,
  busy = false,
}) {
  if (count < 1) return null;
  return createPortal(
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] flex flex-wrap items-center justify-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 max-w-[calc(100vw-1.5rem)]"
      role="status"
      aria-live="polite"
    >
      <span className="text-xs font-bold px-1">
        {count} seleccionado{count === 1 ? "" : "s"}
      </span>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold disabled:opacity-50"
      >
        <IconTrash size={14} />
        Eliminar
      </button>
      <button
        type="button"
        onClick={onHide}
        disabled={busy || hideDisabled}
        title={hideDisabled ? hideReason : "Ocultar en agenda"}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-bold disabled:opacity-50"
      >
        <IconEyeOff size={14} />
        Ocultar
      </button>
      <button
        type="button"
        onClick={onTagGrupos}
        disabled={busy || gruposDisabled}
        title={
          gruposDisabled
            ? gruposReason
            : "Etiqueta de grupo de convocatoria"
        }
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold disabled:opacity-50"
      >
        <IconTag size={14} />
        Etiqueta de grupo
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={busy}
        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300"
        title="Limpiar selección"
        aria-label="Limpiar selección"
      >
        <IconX size={16} />
      </button>
    </div>,
    document.body,
  );
}

export default function UnifiedAgenda({
  supabase,
  giraId = null,
  onBack = null,
  title = "Agenda General",
  onOpenRepertoire = null,
  onViewChange = null,
  /** Agenda de un programa Ensamble: incluir ensayos de ensamble asociados por eventos_programas_asociados */
  includeAssociatedEnsembleRehearsals = false,
  /** Grupos / filtro controlados desde el shell de gira (opcionales). */
  giraGruposProp = null,
  filterGrupoIds: filterGrupoIdsProp = null,
  setFilterGrupoIds: setFilterGrupoIdsProp = null,
  includeGeneralEvents: includeGeneralEventsProp = null,
  setIncludeGeneralEvents: setIncludeGeneralEventsProp = null,
  hideGruposToolbarFilter = false,
}) {
  const { confirm, dialog } = useConfirmDialog();
  const {
    user,
    roles,
    isEditor,
    isManagement,
    isGuest,
    isAdmin: isAdminFlag,
    isActuallyAdmin,
    isTechnician,
  } = useAuth();
  const selfAgendaPermissions = useMemo(
    () => deriveAgendaPermissions(roles),
    [roles],
  );
  const canEditAgendaTechVisibility =
    (isManagement || isEditor) && selfAgendaPermissions.canSeeTechEvents;
  // Estado para el modal de comida en móvil
  const [mealActionTarget, setMealActionTarget] = useState(null);
  const [isTranspositionOpen, setIsTranspositionOpen] = useState(false);
  const toggleEventTechnica = async (e, eventId, currentValue) => {
    e.stopPropagation();
    if (!canEditAgendaTechVisibility) return;
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
  const toggleEventVisibleAgenda = async (e, eventId, currentlyHidden) => {
    e.stopPropagation();
    if (!canEditAgendaTechVisibility) return;
    const nextVisible = currentlyHidden ? true : false;
    try {
      const { error } = await supabase
        .from("eventos")
        .update({ visible_agenda: nextVisible })
        .eq("id", eventId);
      if (error) throw error;
      markLocalEventMutation(eventId);
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === eventId
            ? { ...item, visible_agenda: nextVisible }
            : item,
        ),
      );
    } catch (err) {
      console.error("Error al cambiar visibilidad en agenda:", err);
      toast.error("No se pudo guardar la visibilidad.");
    }
  };

  const [viewAsUserId, setViewAsUserId] = useState(null);
  const [musicianOptions, setMusicianOptions] = useState([]);
  const [giraGruposLocal, setGiraGruposLocal] = useState([]);
  const [filterGrupoIdsLocal, setFilterGrupoIdsLocal] = useState([]);
  const [includeGeneralEventsLocal, setIncludeGeneralEventsLocal] =
    useState(false);
  const [gruposAssignTarget, setGruposAssignTarget] = useState(null);
  const [gruposAssignBulk, setGruposAssignBulk] = useState(null);
  const [selectedEventIds, setSelectedEventIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [stagePlotViewerEvent, setStagePlotViewerEvent] = useState(null);
  const [backlineConsultaEvento, setBacklineConsultaEvento] = useState(null);
  const [riderConsultaEvento, setRiderConsultaEvento] = useState(null);
  // Query usada para filtrar/resaltar (debounced vía AgendaSearchField).
  const [agendaSearchQuery, setAgendaSearchQuery] = useState("");
  const handleAgendaSearchQueryChange = useCallback((query) => {
    startTransition(() => {
      setAgendaSearchQuery(query);
    });
  }, []);

  const filterControlled =
    filterGrupoIdsProp != null && setFilterGrupoIdsProp != null;
  const giraGrupos =
    giraGruposProp != null ? giraGruposProp : giraGruposLocal;
  const setGiraGrupos = setGiraGruposLocal;
  const filterGrupoIds = filterControlled
    ? filterGrupoIdsProp
    : filterGrupoIdsLocal;
  const setFilterGrupoIds = filterControlled
    ? setFilterGrupoIdsProp
    : setFilterGrupoIdsLocal;
  const includeGeneralEvents =
    includeGeneralEventsProp != null
      ? includeGeneralEventsProp
      : includeGeneralEventsLocal;
  const setIncludeGeneralEvents =
    setIncludeGeneralEventsProp != null
      ? setIncludeGeneralEventsProp
      : setIncludeGeneralEventsLocal;

  const effectiveUserId = viewAsUserId || user.id;
  const isViewAsMode = !!viewAsUserId;
  const isPersonalGuest = isGuest && !user?.isGeneral && !!user?.token_original;
  const defaultPersonalFilter =
    isPersonalGuest ||
    ((!isEditor && !isManagement && !user?.isGeneral) || isTechnician);
  const viewAsPermissions = useMemo(() => {
    if (!viewAsUserId) return null;
    const viewed = musicianOptions.find(
      (m) => String(m.id) === String(viewAsUserId),
    );
    if (!viewed) return null;
    return deriveAgendaPermissions(viewed.rol_sistema ?? ["musico"]);
  }, [viewAsUserId, musicianOptions]);
  const filterPermissions = useMemo(() => {
    if (isViewAsMode) {
      return viewAsPermissions ?? deriveAgendaPermissions(["musico"]);
    }
    return {
      ...deriveAgendaPermissions(roles),
      // Respetar defaultPersonalFilter ya calculado (guest / personal link)
      defaultPersonalFilter,
    };
  }, [
    isViewAsMode,
    viewAsPermissions,
    roles,
    defaultPersonalFilter,
  ]);
  const {
    isEditor: filterIsEditor,
    isManagement: filterIsManagement,
    isTechnician: filterIsTechnician,
    canSeeTechEvents: filterCanSeeTechEvents,
    canSeeHiddenAgendaEvents: filterCanSeeHiddenAgendaEvents,
    defaultPersonalFilter: filterDefaultPersonalFilter,
  } = filterPermissions;

  /** Staff (editor/gestión/técnico): pueden revelar eventos solo-FIMBA. Músicos: nunca. */
  const canToggleConFimba =
    filterIsEditor || filterIsManagement || filterIsTechnician;
  /** OFF por defecto: agenda OFRN limpia (sin eventos solo-FIMBA). */
  const [showWithFimba, setShowWithFimba] = useState(false);

  // --- ESTADOS ---
  const [coordinatedEnsembles, setCoordinatedEnsembles] = useState(new Set());
  const [coordinationReady, setCoordinationReady] = useState(false);
  const [myEnsembleObjects, setMyEnsembleObjects] = useState([]);
  // SEPARACIÓN DE ESTADOS DE CARGA (loading, isRefreshing, lastUpdate, realtimeStatus vienen de useAgendaData) (CLAVE PARA MÓVIL)
  // IDs de eventos actualizados en esta sesión (indicador titilante; se limpia al refrescar)
  // --- FETCH COORDINACIÓN ---
  useEffect(() => {
    let cancelled = false;
    const fetchCoordination = async () => {
      if (!user) {
        if (!cancelled) setCoordinationReady(true);
        return;
      }
      // Si el usuario es Coordinador General, tiene alcance sobre todos los ensambles.
      const userRoles = (() => {
        const r = user.rol_sistema;
        if (r == null) return [];
        return Array.isArray(r)
          ? r.map((x) => String(x).toLowerCase().trim())
          : [String(r).toLowerCase().trim()];
      })();
      const isCoordGeneralUser = userRoles.includes("coord_general");

      try {
        if (isCoordGeneralUser) {
          const { data } = await supabase
            .from("ensambles")
            .select("id, ensamble");
          if (cancelled) return;
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
        if (cancelled) return;
        if (data) {
          const ids = new Set(data.map((d) => d.id_ensamble));
          const objects = data.map((d) => d.ensambles).filter(Boolean);
          setCoordinatedEnsembles(ids);
          setMyEnsembleObjects(objects);
        }
      } finally {
        if (!cancelled) setCoordinationReady(true);
      }
    };
    setCoordinationReady(false);
    fetchCoordination();
    return () => {
      cancelled = true;
    };
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
  /**
   * Músico de fila (no editor, no gestión, no técnico, no coordinador de ensamble).
   * En «Ver como» se trata al simulado como músico si sus roles lo son.
   */
  const isMusicianDraftAudience =
    !isGuest &&
    !filterIsEditor &&
    !filterIsManagement &&
    !filterIsTechnician &&
    (isViewAsMode ||
      (coordinationReady && coordinatedEnsembles.size === 0));
  /**
   * Backline / Rider consulta RO en agenda OFRN.
   * Staff de gestión (incl. `consulta_general`); no músicos / técnicos solos.
   */
  const canSeeAgendaLogisticaConsulta = Boolean(isManagement);
  /** Filtro / Tag de grupos: solo editores y admins, y solo si la gira ya tiene grupos. */
  const canManageGiraGrupos =
    !!giraId && (isEditor || isAdmin) && giraGrupos.length > 0;

  /** Opciones para asignar grupos a un evento (sin sentinel Tutti). */
  const grupoFilterOptions = useMemo(
    () =>
      giraGrupos.map((g) => ({
        value: Number(g.id),
        label: g.nombre,
        color: g.color || GIRA_GRUPO_DEFAULT_COLORS[0],
      })),
    [giraGrupos],
  );

  /** Toolbar filtro: Actividades Tutti primero, luego grupos nombrados. */
  const grupoToolbarFilterOptions = useMemo(
    () => [
      {
        value: GIRA_GRUPOS_TUTTI_VALUE,
        label: GIRA_GRUPOS_TUTTI_LABEL,
        color: "#0369a1",
      },
      ...grupoFilterOptions,
    ],
    [grupoFilterOptions],
  );

  const selectedGrupoToolbarValues = useMemo(
    () => [
      ...(includeGeneralEvents ? [GIRA_GRUPOS_TUTTI_VALUE] : []),
      ...filterGrupoIds.map(Number).filter(Number.isFinite),
    ],
    [includeGeneralEvents, filterGrupoIds],
  );

  const handleGrupoToolbarFilterChange = useCallback(
    (next) => {
      const list = Array.isArray(next) ? next : [];
      setIncludeGeneralEvents(list.some((v) => isGiraGruposTuttiValue(v)));
      setFilterGrupoIds(
        list
          .filter((v) => !isGiraGruposTuttiValue(v))
          .map((id) => Number(id))
          .filter(Number.isFinite),
      );
    },
    [setFilterGrupoIds, setIncludeGeneralEvents],
  );

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

  const canEditorMutateEvent = (evt) =>
    !!evt &&
    evt.is_deleted !== true &&
    (isGlobalEditor || canUserEditEvent(evt));

  const toggleEventSelected = useCallback((eventId) => {
    const id = String(eventId);
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearEventSelection = useCallback(() => {
    setSelectedEventIds(new Set());
  }, []);

  const canImportEvents = !!giraId && isEditor && !user?.isGeneral;

  const [monthsLimit, setMonthsLimit] = useState(3);
  const [availableCategories, setAvailableCategories] = useState([]);
  const deletedFiltersStorageKey = `${DELETED_FILTERS_STORAGE_KEY_PREFIX}${effectiveUserId}`;
  const recentChangesAckStorageKey = `${RECENT_CHANGES_ACK_STORAGE_KEY_PREFIX}${effectiveUserId}_${giraId ?? "general"}`;
  const [recentChangesAckAt, setRecentChangesAckAt] = useState(() =>
    getRecentChangesAckAt(recentChangesAckStorageKey),
  );
  const [isHideRecentChangesOpen, setIsHideRecentChangesOpen] = useState(false);
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
    commitShowNonActive,
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
    isEditor: filterIsEditor,
    isManagement: filterIsManagement,
    availableCategories,
    defaultPersonalFilter: filterDefaultPersonalFilter,
    isPersonalGuest,
    isTechnician: filterIsTechnician,
    canSeeTechEvents: filterCanSeeTechEvents,
    isViewAsMode,
    preferDrafts: isMusicianDraftAudience,
  });

  const [userProfile, setUserProfile] = useState(null);
  const [hospedajeExcluidosIds, setHospedajeExcluidosIds] = useState([]);

  useEffect(() => {
    if (!supabase || !giraId) {
      setHospedajeExcluidosIds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("giras_hospedajes_excluidos")
        .select("id_integrante")
        .eq("id_programa", giraId);
      if (cancelled) return;
      if (error) {
        setHospedajeExcluidosIds([]);
        return;
      }
      setHospedajeExcluidosIds((data || []).map((r) => r.id_integrante));
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, giraId]);

  const checkIsConvoked = useCallback(
    (convocadosList, tourRole) => {
      if (!userProfile) return false;
      return isUserConvoked(
        convocadosList,
        {
          ...userProfile,
          id: userProfile.id ?? effectiveUserId,
          rol_gira: tourRole || userProfile.rol_gira,
        },
        { hospedajeExcluidosIds },
      );
    },
    [userProfile, hospedajeExcluidosIds, effectiveUserId],
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
    markLocalEventMutation,
    refreshEventById,
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
    isEditor: filterIsEditor,
    isManagement: filterIsManagement,
    user,
    includeDeletedBeyond24h: isAdmin && showDeletedEvents,
    includeAssociatedEnsembleRehearsals,
  });

  /** Columna de chips: grupos OFRN y/o artistas FIMBA tagueados. */
  const showGruposColumn = useMemo(() => {
    const hasFimbaArtistas = items.some(
      (i) =>
        !i.isProgramMarker && resolveEventFimbaPropuestas(i).length > 0,
    );
    if (hasFimbaArtistas) return true;
    if (!giraId) return false;
    if (canManageGiraGrupos) return true;
    return items.some(
      (i) => !i.isProgramMarker && eventGrupoIdsFromEvent(i).length > 0,
    );
  }, [giraId, canManageGiraGrupos, items]);

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

  useEffect(() => {
    setRecentChangesAckAt(getRecentChangesAckAt(recentChangesAckStorageKey));
  }, [recentChangesAckStorageKey]);

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
  // Solo admin (sesión real) mientras se prueba check-in en producción.
  // El integrante efectivo (incl. “Ver como”) debe estar autenticado numérico.
  const canEnsayoCheckIn =
    isActuallyAdmin &&
    effectiveUserId &&
    effectiveUserId !== "guest-general" &&
    !Number.isNaN(Number(effectiveUserId));
  const showEnsayoCheckInBlock = useCallback(
    (evt) => {
      if (Number(evt?.id_tipo_evento) !== 13 || !canEnsayoCheckIn) return false;
      if (!userProfile || userProfile.id === "guest-general") return false;
      if (evt.is_deleted === true) return false;
      const custom = evt.is_absent
        ? { tipo: "ausente" }
        : evt.is_guest
          ? { tipo: "invitado" }
          : null;
      return isIntegranteConvocadoAEnsayo(
        evt,
        custom,
        userProfile.integrantes_ensambles || [],
      );
    },
    [canEnsayoCheckIn, userProfile],
  );
  const ensayoCheckInEvents = useMemo(
    () =>
      canEnsayoCheckIn
        ? (items || []).filter((e) => showEnsayoCheckInBlock(e))
        : [],
    [canEnsayoCheckIn, items, showEnsayoCheckInBlock],
  );
  const {
    getEstado: getEnsayoCheckinEstado,
    patchEstado: patchEnsayoCheckinEstado,
    refresh: refreshEnsayoCheckin,
  } = useEnsayoCheckin({
      integranteId: canEnsayoCheckIn ? effectiveUserId : null,
      events: ensayoCheckInEvents,
      todayStr,
    });
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
      !filterCanSeeTechEvents
    )
      return;
    finishedGiraTechDefaultsRef.current = true;
    setTechFilter("all");
  }, [isGiraFinishedTour, loading, filterCanSeeTechEvents]);

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
    eventIds: [],
  });
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null);
  const [editingEventObj, setEditingEventObj] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFormData, setNewFormData] = useState({});
  const [formEventTypes, setFormEventTypes] = useState([]);
  const [formLocations, setFormLocations] = useState([]);
  const [formSaving, setFormSaving] = useState(false);
  useEffect(() => {
    const fetchMusicians = async () => {
      if (isGlobalEditor && navigator.onLine) {
        try {
          const { data } = await supabase
            .from("integrantes")
            .select("id, nombre, apellido, rol_sistema")
            .order("apellido");

          if (data) {
            const options = data.map((m) => ({
              id: m.id,
              label: `${m.apellido}, ${m.nombre}`,
              subLabel: null,
              rol_sistema: m.rol_sistema,
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
    if (giraGruposProp != null) return;
    if (!giraId || !(isEditor || isAdmin)) {
      setGiraGruposLocal([]);
      if (!filterControlled) setFilterGrupoIdsLocal([]);
      return;
    }
    if (!navigator.onLine) return;
    let cancelled = false;
    fetchGiraGrupos(supabase, giraId).then(({ grupos, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn("UnifiedAgenda grupos:", error.message);
        setGiraGruposLocal([]);
        return;
      }
      setGiraGruposLocal(grupos || []);
      if (!filterControlled) {
        const validIds = new Set((grupos || []).map((g) => Number(g.id)));
        setFilterGrupoIdsLocal((prev) =>
          prev.filter((id) => validIds.has(Number(id))),
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    giraId,
    isEditor,
    isAdmin,
    supabase,
    giraGruposProp,
    filterControlled,
  ]);

  useEffect(() => {
    const fetchProfile = async () => {
      const PROFILE_CACHE_KEY = `profile_cache_${effectiveUserId}_v3`;
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
            "*, instrumentos(familia, instrumento), integrantes_ensambles(id_ensamble, fecha_desde, fecha_hasta, ensambles(id, ensamble)), datos_residencia:localidades!id_localidad (id, id_region)",
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
          .select("id, nombre, color, categorias_tipos_eventos ( id, nombre )")
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
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [userProfile, fetchAgenda]);

  useEffect(() => {
    if (!userProfile) return;
    const background = items.length > 0;
    const delay = background ? 250 : 0;
    const t = setTimeout(() => fetchAgenda(background), delay);
    return () => clearTimeout(t);
    // items.length no va en deps (evitar loop al pintar).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- background vs spinner
  }, [
    userProfile,
    giraId,
    monthsLimit,
    filterDateFrom,
    filterDateTo,
    showDeletedEvents,
    fetchAgenda,
  ]);

  /** Ancla de scroll al expandir el pasado (semana/mes antes). */
  const pastExpandScrollAnchorRef = useRef(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (hideDeletedEvents && item.is_deleted === true) return false;

      if (item.fecha) {
        if (item.fecha < effectiveDateFromForFilter) return false;
        if (filterDateTo && item.fecha > filterDateTo) return false;
      }

      // Solo-FIMBA: staff via toggle «con FIMBA»; músicos siempre ocultos
      // (salvo que el evento también convoque OFRN / su grupo — entonces no es solo-FIMBA).
      if (isFimbaOnlyAgendaEvent(item)) {
        if (!canToggleConFimba) return false;
        if (!showWithFimba) return false;
      }

      const {
        isTransportEvent,
        isMyTransport,
        isMyAssignedTransportParada,
        blockedByVisibility,
      } = getAgendaTransportFlags(item, myTransportLogistics);

      // Único toggle de visibilidad (GirasTransportesManager → visible_agenda).
      // Músicos / Consulta General: oculto salvo paradas del vehículo asignado.
      // Staff de gestión (sin consulta_general): siempre ve paradas ocultas.
      if (blockedByVisibility && !filterCanSeeHiddenAgendaEvents) return false;

      // Filtro de giras activas: permitir paradas de mi transporte aunque el programa no esté vigente.
      // Músicos: «Mostrar borradores» (activo por defecto) revela eventos de programas Borrador,
      // salvo Sinfónico, Comisión y Camerata Filarmónica, que nunca entran.
      // Staff: conciertos de programa en Borrador visibles sin el toggle; el resto, con «Mostrar borradores».
      if (
        isMusicianDraftAudience &&
        isMusicianExcludedDraftProgram(item.programas)
      ) {
        return false;
      }

      if (isMusicianDraftAudience && item.programas) {
        const estadoGira = item.programas.estado || "Borrador";
        if (estadoGira === "Borrador" && !showNonActiveForFilter) {
          return false;
        }
        if (
          estadoGira !== "Vigente" &&
          estadoGira !== "Borrador" &&
          !isMyAssignedTransportParada
        ) {
          return false;
        }
      } else if (!showNonActiveForFilter) {
        const estadoGira = item.programas?.estado || "Borrador";
        const isDraftConcert =
          !item.isProgramMarker &&
          Number(item.id_tipo_evento) === 1 &&
          estadoGira === "Borrador";
        if (item.isProgramMarker) {
          if (estadoGira !== "Vigente" && !isMyAssignedTransportParada)
            return false;
        } else if (item.programas && estadoGira !== "Vigente") {
          if (!isMyAssignedTransportParada && !isDraftConcert) return false;
        }
      }

      if (item.isProgramMarker) {
        // Durante búsqueda de texto, ocultar separadores de programa.
        return !String(agendaSearchQuery || "").trim();
      }

      // Filtro técnico: no ocultar paradas de mi transporte asignado
      // Consulta General no ve eventos `tecnica` (igual que músicos).
      if (
        !filterCanSeeTechEvents &&
        item.tecnica &&
        !isMyAssignedTransportParada
      )
        return false;
      if (filterCanSeeTechEvents) {
        if (
          techFilter === "only_tech" &&
          !item.tecnica &&
          !isMyAssignedTransportParada
        )
          return false;
        if (
          techFilter === "no_tech" &&
          item.tecnica &&
          !isMyAssignedTransportParada
        )
          return false;
      }

      // Categoría = interruptor de visibilidad. Transporte destildado oculta
      // todas las paradas/traslados (incl. vehículo asignado / INTERNO).
      // Con Transporte tildado, la excepción de convocatoria sigue en
      // useAgendaData (`isAssignedVehicleAgendaStop`).
      if (!eventPassesAgendaCategoryFilter(item, selectedCategoryIds)) {
        return false;
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

      // Filtro por grupos de convocatoria (editores/admins en agenda de gira)
      if (
        hasEditorialGrupoFilter(filterGrupoIds, includeGeneralEvents) &&
        !eventPassesEditorialGrupoFilter(
          item,
          filterGrupoIds,
          includeGeneralEvents,
        )
      ) {
        return false;
      }

      if (!eventMatchesAgendaSearch(item, agendaSearchQuery)) return false;

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
    filterCanSeeTechEvents,
    filterCanSeeHiddenAgendaEvents,
    filterGrupoIds,
    includeGeneralEvents,
    agendaSearchQuery,
    canToggleConFimba,
    showWithFimba,
    isMusicianDraftAudience,
  ]);

  const visibleSelectedEvents = useMemo(() => {
    if (selectedEventIds.size === 0) return [];
    return filteredItems.filter(
      (evt) =>
        selectedEventIds.has(String(evt.id)) && canEditorMutateEvent(evt),
    );
  }, [filteredItems, selectedEventIds]);

  const bulkSharedGiraId = useMemo(() => {
    if (visibleSelectedEvents.length === 0) return null;
    const ids = [
      ...new Set(
        visibleSelectedEvents
          .map((e) => e.id_gira)
          .filter((id) => id != null && id !== ""),
      ),
    ];
    return ids.length === 1 ? ids[0] : null;
  }, [visibleSelectedEvents]);

  const [bulkGiraGruposCount, setBulkGiraGruposCount] = useState(null);
  useEffect(() => {
    if (!bulkSharedGiraId || visibleSelectedEvents.length === 0) {
      setBulkGiraGruposCount(null);
      return;
    }
    if (giraId && String(giraId) === String(bulkSharedGiraId)) {
      setBulkGiraGruposCount(giraGrupos.length);
      return;
    }
    let cancelled = false;
    fetchGiraGrupos(supabase, bulkSharedGiraId).then(({ grupos }) => {
      if (cancelled) return;
      setBulkGiraGruposCount((grupos || []).length);
    });
    return () => {
      cancelled = true;
    };
  }, [
    bulkSharedGiraId,
    giraId,
    giraGrupos.length,
    supabase,
    visibleSelectedEvents.length,
  ]);

  const canBulkTagGrupos =
    (isEditor || isAdmin) &&
    bulkSharedGiraId != null &&
    Number(bulkGiraGruposCount) > 0;
  const bulkGruposReason = (() => {
    if (!(isEditor || isAdmin)) return "Solo editores pueden etiquetar grupos";
    if (visibleSelectedEvents.length === 0) return "";
    const giraCount = new Set(
      visibleSelectedEvents
        .map((e) => e.id_gira)
        .filter((id) => id != null && id !== ""),
    ).size;
    const missingGira = visibleSelectedEvents.some(
      (e) => e.id_gira == null || e.id_gira === "",
    );
    if (giraCount > 1 || (giraCount === 1 && missingGira)) {
      return "Hay giras distintas";
    }
    if (giraCount === 0) return "Sin gira asociada";
    if (bulkGiraGruposCount === 0) return "Esta gira no tiene grupos";
    if (bulkGiraGruposCount == null) return "Cargando grupos…";
    return "";
  })();
  const canBulkHide = canEditAgendaTechVisibility;
  const bulkHideReason = canBulkHide
    ? ""
    : "Sin permiso para ocultar (ojo / TÉC)";

  const minFilterDateFrom = giraId && giraFirstDate ? giraFirstDate : null;
  const currentFilterDateFrom =
    filterDateFrom || getTodayDateStringLocal();
  const canExpandPast =
    !minFilterDateFrom || currentFilterDateFrom > minFilterDateFrom;

  const shiftFilterDateFromBack = useCallback(
    (computeNext) => {
      if (!canExpandPast) return;
      const base = filterDateFrom || getTodayDateStringLocal();
      let nextFrom = computeNext(base);
      if (minFilterDateFrom && nextFrom < minFilterDateFrom) {
        nextFrom = minFilterDateFrom;
      }
      if (nextFrom === base) return;

      // Mantener en vista el primer evento actual; el pasado nuevo queda arriba al scrollear.
      const firstVisible = filteredItems.find(
        (item) => !item.isProgramMarker && item.id != null,
      );
      pastExpandScrollAnchorRef.current = firstVisible?.id ?? null;
      setFilterDateFrom(nextFrom);
    },
    [canExpandPast, filterDateFrom, minFilterDateFrom, filteredItems, setFilterDateFrom],
  );

  const handleOneWeekBefore = useCallback(() => {
    shiftFilterDateFromBack((base) =>
      format(subDays(parseISO(base), 7), "yyyy-MM-dd"),
    );
  }, [shiftFilterDateFromBack]);

  const handleOneMonthBefore = useCallback(() => {
    shiftFilterDateFromBack((base) =>
      format(subMonths(parseISO(base), 1), "yyyy-MM-dd"),
    );
  }, [shiftFilterDateFromBack]);

  // Tras expandir pasado: recolocar el ancla (contenido nuevo queda arriba para scrollear).
  useEffect(() => {
    const anchorId = pastExpandScrollAnchorRef.current;
    if (anchorId == null) return;
    if (loading || isRefreshing) return;
    if (!filteredItems.some((item) => item.id === anchorId)) return;

    pastExpandScrollAnchorRef.current = null;
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-event-id="${anchorId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
      }
    });
  }, [filteredItems, loading, isRefreshing, filterDateFrom]);

  const getRecentChangesThreshold = useCallback(() => {
    if (recentChangesAckAt) return recentChangesAckAt;
    return Date.now() - 24 * 60 * 60 * 1000;
  }, [recentChangesAckAt]);

  const isEventRecentlyModified = useCallback(
    (evt) => {
      if (!evt?.updated_at) return false;
      return new Date(evt.updated_at).getTime() > getRecentChangesThreshold();
    },
    [getRecentChangesThreshold],
  );

  const hasUnacknowledgedRecentChanges = useMemo(
    () =>
      filteredItems.some(
        (evt) => !evt.isProgramMarker && isEventRecentlyModified(evt),
      ),
    [filteredItems, isEventRecentlyModified],
  );

  const handleAckRecentChanges = useCallback(() => {
    const now = Date.now();
    try {
      localStorage.setItem(recentChangesAckStorageKey, String(now));
    } catch (error) {
      console.error("Error saving recent changes ack", error);
    }
    setRecentChangesAckAt(now);
  }, [recentChangesAckStorageKey]);

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
      saveToCache(
        getAgendaCacheKey(
          effectiveUserId,
          giraId,
          includeAssociatedEnsembleRehearsals,
        ),
        newItems,
        { effectiveUserId },
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
      observaciones_internas: evt.observaciones_internas || "",
      observaciones_aforo: evt.observaciones_aforo || "",
      fecha: evt.fecha || "",
      hora_inicio: evt.hora_inicio || "",
      hora_fin: evt.hora_fin || "",
      id_tipo_evento: evt.id_tipo_evento ?? evt.tipos_evento?.id ?? "",
      id_locacion: evt.id_locacion || "",
      id_gira: evt.id_gira || null,
      id_gira_transporte: evt.id_gira_transporte ?? null,
      tecnica: evt.tecnica || false,
      es_didactico: evt.es_didactico || false,
      id_estado_venue: evt.id_estado_venue || null,
      venue_status_note: lastVenueNote,
      selectedGrupos: eventGrupoIdsFromEvent(evt),
      created_at: evt.created_at || null,
      created_by: evt.created_by || null,
      creation_source: evt.creation_source || null,
      creador: evt.creador || null,
    });
    setIsEditOpen(true);
  };

  const emptyDeleteConfirm = {
    isOpen: false,
    message: "",
    messageIsHtml: false,
    hasLogisticsLinks: false,
    eventIds: [],
  };

  const requestMoveEventsToTrash = async (events) => {
    const list = (Array.isArray(events) ? events : [events]).filter(
      (e) => e?.id && canEditorMutateEvent(e),
    );
    if (list.length === 0) return;
    const ids = list.map((e) => e.id);
    let hasLogisticsLinks = false;
    let detail = "";
    let detailHtml = null;
    for (const row of list) {
      if (![11, 12].includes(Number(row.id_tipo_evento))) continue;
      const summary = await getTransportEventAffectedSummary(supabase, row.id);
      if (!summary.hasLinks) continue;
      hasLogisticsLinks = true;
      if (summary.detail) {
        detail = detail ? `${detail}; ${summary.detail}` : summary.detail;
      }
      if (summary.detailHtml) {
        detailHtml = detailHtml
          ? `${detailHtml}; ${summary.detailHtml}`
          : summary.detailHtml;
      }
    }
    const n = ids.length;
    const baseMsg =
      n === 1
        ? "¿Mover este evento a la papelera? Se ocultará en 24 horas. Puedes restaurarlo hasta entonces."
        : `¿Mover ${n} eventos a la papelera? Se ocultarán en 24 horas. Puedes restaurarlos hasta entonces.`;
    const transportMsgPlain =
      hasLogisticsLinks && detail
        ? `\n\nHay eventos vinculados como subida/bajada en logística. Afecta a: ${detail}. Si los movés a la papelera, se afectará el cálculo de Viáticos; deberás crear un evento nuevo para tal fin si corresponde.`
        : hasLogisticsLinks
          ? "\n\nHay eventos vinculados como subida/bajada. Si los movés a la papelera, se afectará el cálculo de Viáticos; deberás crear un evento nuevo para tal fin si corresponde."
          : "";
    const transportMsgHtml =
      hasLogisticsLinks && detailHtml
        ? `\n\nHay eventos vinculados como subida/bajada en logística. Afecta a: ${detailHtml}. Si los movés a la papelera, se afectará el cálculo de Viáticos; deberás crear un evento nuevo para tal fin si corresponde.`
        : transportMsgPlain;
    setDeleteConfirm({
      isOpen: true,
      message: baseMsg + (detailHtml ? transportMsgHtml : transportMsgPlain),
      messageIsHtml: !!detailHtml,
      hasLogisticsLinks,
      eventIds: ids,
    });
  };

  const handleDeleteEvent = async () => {
    const evt = editingEventObj || {
      id: editFormData.id,
      id_tipo_evento: editFormData.id_tipo_evento,
      is_deleted: false,
    };
    await requestMoveEventsToTrash([evt]);
  };

  const handleConfirmDeleteEvent = async () => {
    const ids = (deleteConfirm.eventIds || []).filter(Boolean);
    if (ids.length === 0 && editFormData.id) ids.push(editFormData.id);
    if (ids.length === 0) return;
    const hadLinks = deleteConfirm.hasLogisticsLinks;
    setDeleteConfirm(emptyDeleteConfirm);
    setLoading(true);
    try {
      const deletedAt = new Date().toISOString();
      const { error } = await supabase
        .from("eventos")
        .update({
          is_deleted: true,
          deleted_at: deletedAt,
        })
        .in("id", ids);
      if (error) throw error;
      ids.forEach((id) => {
        notifyEnsayoEventoSoftDeleted(id);
        markLocalEventMutation(id);
      });
      setIsEditOpen(false);
      clearEventSelection();
      await Promise.all(ids.map((id) => refreshEventById(id)));
      if (hadLinks) {
        toast.warning(
          ids.length > 1
            ? "Eventos movidos a la papelera. Revisá la logística de integrantes/regiones y creá un evento nuevo para viáticos si corresponde."
            : "Evento movido a la papelera. Revisá la logística de integrantes/regiones y creá un evento nuevo para viáticos si corresponde.",
        );
      } else {
        toast.success(
          ids.length > 1
            ? `${ids.length} eventos movidos a la papelera. Podés restaurarlos en 24 horas.`
            : "Evento movido a la papelera. Podés restaurarlo en 24 horas.",
        );
      }
    } catch (err) {
      toast.error("Error al eliminar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkHideSelected = async () => {
    if (!canBulkHide || visibleSelectedEvents.length === 0) return;
    const transportIds = [];
    const otherIds = [];
    visibleSelectedEvents.forEach((evt) => {
      const { isTransportEvent } = getAgendaTransportFlags(
        evt,
        myTransportLogistics,
      );
      if (isTransportEvent) transportIds.push(evt.id);
      else otherIds.push(evt.id);
    });
    setBulkBusy(true);
    try {
      if (transportIds.length > 0) {
        const { error } = await supabase
          .from("eventos")
          .update({ visible_agenda: false })
          .in("id", transportIds);
        if (error) throw error;
      }
      if (otherIds.length > 0) {
        const { error } = await supabase
          .from("eventos")
          .update({ tecnica: true })
          .in("id", otherIds);
        if (error) throw error;
      }
      const allIds = [...transportIds, ...otherIds];
      allIds.forEach((id) => markLocalEventMutation(id));
      setItems((prev) =>
        prev.map((item) => {
          if (transportIds.some((id) => String(id) === String(item.id))) {
            return { ...item, visible_agenda: false };
          }
          if (otherIds.some((id) => String(id) === String(item.id))) {
            return { ...item, tecnica: true };
          }
          return item;
        }),
      );
      toast.success(
        allIds.length > 1
          ? `${allIds.length} eventos ocultos`
          : "Evento oculto",
      );
      clearEventSelection();
    } catch (err) {
      toast.error("No se pudo ocultar: " + (err?.message || err));
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkTagGrupos = async () => {
    if (!canBulkTagGrupos || !bulkSharedGiraId) return;
    let options = grupoFilterOptions;
    if (
      !(giraId && String(giraId) === String(bulkSharedGiraId)) ||
      options.length === 0
    ) {
      const { grupos, error } = await fetchGiraGrupos(
        supabase,
        bulkSharedGiraId,
      );
      if (error) {
        toast.error("No se pudieron cargar los grupos");
        return;
      }
      options = (grupos || []).map((g) => ({
        value: Number(g.id),
        label: g.nombre,
        color: g.color || GIRA_GRUPO_DEFAULT_COLORS[0],
      }));
    }
    if (options.length === 0) {
      toast.error("Esta gira no tiene grupos");
      return;
    }
    setGruposAssignBulk({
      events: visibleSelectedEvents,
      grupoOptions: options,
    });
  };

  useEffect(() => {
    if (selectedEventIds.size === 0) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (
        deleteConfirm.isOpen ||
        gruposAssignTarget ||
        gruposAssignBulk ||
        isEditOpen ||
        isCreating ||
        isRehearsalEditOpen
      ) {
        return;
      }
      clearEventSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedEventIds.size,
    deleteConfirm.isOpen,
    gruposAssignTarget,
    gruposAssignBulk,
    isEditOpen,
    isCreating,
    isRehearsalEditOpen,
    clearEventSelection,
  ]);

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
      markLocalEventMutation(eventId);
      await refreshEventById(eventId);
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
      markLocalEventMutation(id);
      await refreshEventById(id, { eventType: "DELETE" });
    } catch (err) {
      console.error("Error al eliminar definitivamente:", err);
      toast.error("Error al eliminar definitivamente: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateEvent = async () => {
    if (!editFormData.id) return;
    const confirmed = await confirm({
      title: "Duplicar evento",
      message: "¿Deseas duplicar este evento? Se abrirá la copia para editar.",
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const payload = withConcertCreationMeta(
        {
          descripcion: (editFormData.descripcion || "") + " - Copia",
          observaciones_internas: normalizeEventosInternasHtml(
            editFormData.observaciones_internas,
          ),
          observaciones_aforo:
            Number(editFormData.id_tipo_evento) === 1
              ? String(editFormData.observaciones_aforo || "").trim() || null
              : null,
          fecha: editFormData.fecha,
          hora_inicio: editFormData.hora_inicio,
          hora_fin: editFormData.hora_fin,
          id_tipo_evento: editFormData.id_tipo_evento || null,
          id_locacion: editFormData.id_locacion || null,
          id_gira_transporte: editFormData.id_gira_transporte ?? null,
          tecnica: editFormData.tecnica || false,
          es_didactico:
            Number(editFormData.id_tipo_evento) === 1
              ? Boolean(editFormData.es_didactico)
              : false,
          id_gira: editFormData.id_gira || null,
        },
        user,
        EVENT_CREATION_SOURCES.AGENDA,
        {
          tipos_evento: formEventTypes.find(
            (t) => String(t.id) === String(editFormData.id_tipo_evento),
          ),
        },
      );

      const { data: newEvent, error: insertError } = await supabase
        .from("eventos")
        .insert([payload])
        .select()
        .single();
      if (insertError) throw insertError;

      const newEventId = newEvent.id;
      const originalId = editFormData.id;

      const [ensambles, programas, grupos, artistaTags] = await Promise.all([
        supabase
          .from("eventos_ensambles")
          .select("id_ensamble")
          .eq("id_evento", originalId),
        supabase
          .from("eventos_programas_asociados")
          .select("id_programa")
          .eq("id_evento", originalId),
        supabase
          .from("eventos_grupos")
          .select("id_grupo")
          .eq("id_evento", originalId),
        supabase
          .from("eventos_fimba_propuestas")
          .select("id_propuesta")
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
      if (grupos.data?.length > 0) {
        const grupPayload = grupos.data.map((g) => ({
          id_evento: newEventId,
          id_grupo: g.id_grupo,
        }));
        promises.push(supabase.from("eventos_grupos").insert(grupPayload));
      }
      if (artistaTags.data?.length > 0) {
        const artPayload = artistaTags.data.map((p) => ({
          id_evento: newEventId,
          id_propuesta: p.id_propuesta,
        }));
        promises.push(
          supabase.from("eventos_fimba_propuestas").insert(artPayload),
        );
      }
      await Promise.all(promises);
      setEditFormData({
        ...editFormData,
        id: newEventId,
        descripcion: payload.descripcion,
      });
      markLocalEventMutation(newEventId);
      await refreshEventById(newEventId);
    } catch (err) {
      toast.error("Error al duplicar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async (snapshot) => {
    const form = resolveEventFormSaveData(editFormData, snapshot);
    if (!form.fecha || !form.hora_inicio) {
      toast.error("Faltan datos");
      return;
    }
    if (!form.id_tipo_evento) {
      toast.error("Elegí un tipo de evento");
      return;
    }

    // Validar nota obligatoria si hay cambio de estado de venue (solo conciertos)
    const isConcierto = Number(form.id_tipo_evento) === 1;
    const prevStatus =
      editingEventObj?.id_estado_venue == null
        ? null
        : editingEventObj.id_estado_venue;
    const newStatus = !isConcierto
      ? null
      : form.id_estado_venue == null
        ? null
        : form.id_estado_venue;
    if (isConcierto && prevStatus !== newStatus && newStatus != null) {
      if (
        !form.venue_status_note ||
        !form.venue_status_note.trim()
      ) {
        toast.error("Agrega una nota para el cambio de estado de venue.");
        return;
      }
    }

    setFormSaving(true);
    try {
      const payload = {
        descripcion: form.descripcion,
        observaciones_internas: normalizeEventosInternasHtml(
          form.observaciones_internas,
        ),
        observaciones_aforo: isConcierto
          ? String(form.observaciones_aforo || "").trim() || null
          : null,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: resolveEventHoraFinForSave(
          form.hora_fin,
          form.hora_inicio,
          {
            id_tipo_evento: form.id_tipo_evento,
            tipos_evento: formEventTypes.find(
              (t) => String(t.id) === String(form.id_tipo_evento),
            ),
          },
        ),
        id_tipo_evento: form.id_tipo_evento || null,
        id_locacion: form.id_locacion || null,
        id_gira_transporte: form.id_gira_transporte ?? null,
        tecnica: form.tecnica || false,
        es_didactico: isConcierto
          ? Boolean(form.es_didactico)
          : false,
        id_estado_venue: isConcierto
          ? form.id_estado_venue || null
          : null,
      };
      const { error } = await supabase
        .from("eventos")
        .update(payload)
        .eq("id", form.id);
      if (error) throw error;

      const { error: gruposError } = await setEventoGrupos(
        supabase,
        form.id,
        form.selectedGrupos || [],
      );
      if (gruposError) throw gruposError;

      // Log de cambio de estado de venue (solo conciertos)

      if (prevStatus !== newStatus && newStatus != null) {
        try {
          await supabase.from("eventos_venue_log").insert({
            id_evento: form.id,
            id_estado_venue: newStatus,
            nota: form.venue_status_note || null,
            id_integrante: user.id,
          });
        } catch (logError) {
          console.error("Error guardando log de estado de venue:", logError);
        }
      }

      const editId = form.id;
      const tipoMeta = formEventTypes.find(
        (t) => String(t.id) === String(payload.id_tipo_evento),
      );
      const locMeta = formLocations.find(
        (l) => String(l.id) === String(payload.id_locacion),
      );
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== editId) return item;
          return {
            ...item,
            ...payload,
            tipos_evento: tipoMeta
              ? {
                  id: tipoMeta.id,
                  nombre: tipoMeta.nombre,
                  color: tipoMeta.color,
                  categorias_tipos_eventos:
                    tipoMeta.categorias_tipos_eventos || null,
                }
              : item.tipos_evento,
            locaciones: locMeta
              ? {
                  ...(item.locaciones || {}),
                  id: locMeta.id,
                  nombre: locMeta.nombre,
                  localidades: locMeta.localidades || item.locaciones?.localidades,
                }
              : payload.id_locacion
                ? item.locaciones
                : null,
            eventos_grupos: (form.selectedGrupos || []).map((gid) => {
              const g = giraGrupos.find((x) => Number(x.id) === Number(gid));
              return {
                id_grupo: Number(gid),
                giras_grupos: g
                  ? { id: g.id, nombre: g.nombre, color: g.color }
                  : {
                      id: Number(gid),
                      nombre: `Grupo ${gid}`,
                      color: "#6366f1",
                    },
              };
            }),
            updated_at: new Date().toISOString(),
          };
        }),
      );

      setIsEditOpen(false);
      setEditFormData({});
      markLocalEventMutation(editId);
      toast.success("Cambios guardados");
      void refreshEventById(editId).then((ok) => {
        if (ok === false) {
          toast.error(
            "Se guardó, pero no se pudo refrescar la agenda. Tocá actualizar.",
          );
        }
      });
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setFormSaving(false);
    }
  };

  const handleOpenCreate = () => {
    setNewFormData({
      id: null,
      descripcion: "",
      observaciones_internas: "",
      observaciones_aforo: "",
      fecha: "",
      hora_inicio: "10:00",
      hora_fin: "",
      id_tipo_evento: "",
      id_locacion: "",
      id_gira_transporte: null,
      tecnica: false,
      es_didactico: false,
      id_estado_venue: null,
      venue_status_note: "",
      selectedGrupos:
        filterGrupoIds.length > 0 ? filterGrupoIds.map(Number) : [],
    });
    setIsCreating(true);
  };

  const upsertAgendaItem = useCallback(
    (evt) => {
      if (!evt?.id) return;
      setItems((prev) => {
        const without = prev.filter((item) => item.id !== evt.id);
        return [...without, evt].sort((a, b) => {
          const dateA = new Date(`${a.fecha}T${a.hora_inicio || "00:00:00"}`);
          const dateB = new Date(`${b.fecha}T${b.hora_inicio || "00:00:00"}`);
          if (dateA < dateB) return -1;
          if (dateA > dateB) return 1;
          if (a.isProgramMarker && !b.isProgramMarker) return -1;
          if (!a.isProgramMarker && b.isProgramMarker) return 1;
          return 0;
        });
      });
    },
    [setItems],
  );

  const handleCreateSave = async (snapshot) => {
    const form = resolveEventFormSaveData(newFormData, snapshot);
    if (!form.fecha || !form.hora_inicio) {
      toast.error("Faltan datos");
      return;
    }
    if (!form.id_tipo_evento) {
      toast.error("Elegí un tipo de evento");
      return;
    }

    // Validar nota obligatoria si se asigna estado de venue al crear (solo conciertos)
    const isConcierto = Number(form.id_tipo_evento) === 1;
    if (isConcierto && form.id_estado_venue) {
      if (
        !form.venue_status_note ||
        !form.venue_status_note.trim()
      ) {
        toast.error("Agrega una nota para el estado de venue inicial.");
        return;
      }
    }

    setFormSaving(true);
    const payload = withConcertCreationMeta(
      {
        id_gira: giraId,
        descripcion: form.descripcion || null,
        observaciones_internas: normalizeEventosInternasHtml(
          form.observaciones_internas,
        ),
        observaciones_aforo: isConcierto
          ? String(form.observaciones_aforo || "").trim() || null
          : null,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: resolveEventHoraFinForSave(
          form.hora_fin,
          form.hora_inicio,
          {
            id_tipo_evento: form.id_tipo_evento,
            tipos_evento: formEventTypes.find(
              (t) => String(t.id) === String(form.id_tipo_evento),
            ),
          },
        ),
        id_tipo_evento: form.id_tipo_evento || null,
        id_locacion: form.id_locacion || null,
        id_gira_transporte: form.id_gira_transporte ?? null,
        tecnica: form.tecnica,
        es_didactico: isConcierto ? Boolean(form.es_didactico) : false,
        id_estado_venue: isConcierto
          ? form.id_estado_venue || null
          : null,
      },
      user,
      EVENT_CREATION_SOURCES.AGENDA,
      {
        tipos_evento: formEventTypes.find(
          (t) => String(t.id) === String(form.id_tipo_evento),
        ),
      },
    );
    const { data, error } = await supabase
      .from("eventos")
      .insert([payload])
      .select()
      .single();
    if (error) {
      setFormSaving(false);
      toast.error("Error al crear evento: " + error.message);
      return;
    }

    const selectedGrupoIds = (form.selectedGrupos || []).map(Number);
    const { error: gruposError } = await setEventoGrupos(
      supabase,
      data.id,
      selectedGrupoIds,
    );
    if (gruposError) {
      setFormSaving(false);
      toast.error(
        "Evento creado, pero falló asignar grupos: " + gruposError.message,
      );
      return;
    }

    // Log inicial de estado de venue si corresponde (solo conciertos)
    if (isConcierto && form.id_estado_venue) {
      try {
        await supabase.from("eventos_venue_log").insert({
          id_evento: data.id,
          id_estado_venue: form.id_estado_venue,
          nota: form.venue_status_note || null,
          id_integrante: user.id,
        });
      } catch (logError) {
        console.error(
          "Error guardando log inicial de estado de venue:",
          logError,
        );
      }
    }

    // Pintar de inmediato en la lista (sin esperar el refetch completo)
    const tipoMeta = formEventTypes.find(
      (t) => String(t.id) === String(data.id_tipo_evento),
    );
    const locMeta = formLocations.find(
      (l) => String(l.id) === String(data.id_locacion),
    );
    const programaSeed =
      items.find(
        (i) =>
          Number(i.id_gira) === Number(giraId) ||
          Number(i.programas?.id) === Number(giraId),
      )?.programas || null;
    const optimisticEvent = {
      ...data,
      visible_agenda: data.visible_agenda !== false,
      updated_at: data.updated_at || new Date().toISOString(),
      is_deleted: false,
      deleted_at: null,
      tipos_evento: tipoMeta
        ? {
            id: tipoMeta.id,
            nombre: tipoMeta.nombre,
            color: tipoMeta.color,
            categorias_tipos_eventos: tipoMeta.categorias_tipos_eventos || null,
          }
        : null,
      locaciones: locMeta
        ? {
            id: locMeta.id,
            nombre: locMeta.nombre,
            direccion: locMeta.direccion || null,
            link_mapa: locMeta.link_mapa || null,
            localidades: locMeta.localidades || null,
          }
        : null,
      programas: programaSeed,
      giras_transportes: null,
      eventos_programas_asociados: [],
      eventos_ensambles: [],
      eventos_grupos: selectedGrupoIds.map((gid) => {
        const g = giraGrupos.find((x) => Number(x.id) === Number(gid));
        return {
          id_grupo: gid,
          giras_grupos: g
            ? { id: g.id, nombre: g.nombre, color: g.color }
            : { id: gid, nombre: `Grupo ${gid}`, color: "#6366f1" },
        };
      }),
      is_convoked: true,
      created_at: data.created_at || new Date().toISOString(),
      creador: userProfile
        ? {
            id: userProfile.id,
            nombre: userProfile.nombre,
            apellido: userProfile.apellido,
          }
        : null,
    };

    markLocalEventMutation(data.id);
    upsertAgendaItem(optimisticEvent);
    setIsCreating(false);
    setNewFormData({});
    setFormSaving(false);
    toast.success("Evento creado");

    // Hidratar relaciones completas en segundo plano
    void refreshEventById(data.id).then((ok) => {
      if (ok === false) {
        toast.error(
          "Se creó, pero no se pudo refrescar la agenda. Tocá actualizar.",
        );
      }
    });
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

  const agendaPdfExportItems = useMemo(
    () =>
      buildAgendaPdfExportItems(filteredItems, {
        collapsedEarlierTodayIds: showEarlierToday
          ? new Set()
          : earlierTodayEventIds,
      }),
    [filteredItems, showEarlierToday, earlierTodayEventIds],
  );

  const handleExportPDF = useCallback(() => {
    if (agendaPdfExportItems.length === 0) {
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
    if (filterDateTo) {
      const rangeLabel = `Desde ${effectiveDateFromForFilter} hasta ${filterDateTo}`;
      subTitle += subTitle ? ` | ${rangeLabel}` : rangeLabel;
    } else if (
      effectiveDateFromForFilter &&
      effectiveDateFromForFilter !== getTodayDateStringLocal()
    ) {
      const rangeLabel = `Desde ${effectiveDateFromForFilter}`;
      subTitle += subTitle ? ` | ${rangeLabel}` : rangeLabel;
    }
    if (
      availableCategories.length > 0 &&
      selectedCategoryIds.length > 0 &&
      selectedCategoryIds.length < availableCategories.length
    ) {
      const catNames = availableCategories
        .filter((c) => selectedCategoryIds.includes(c.id))
        .map((c) => c.nombre)
        .join(", ");
      const catsLabel = `Categorías: ${catNames}`;
      subTitle += subTitle ? ` | ${catsLabel}` : catsLabel;
    }
    if (showOnlyMyTransport) {
      subTitle += subTitle ? " | Solo mi transporte" : "Solo mi transporte";
    }
    if (showOnlyMyMeals) {
      subTitle += subTitle ? " | Solo mis comidas" : "Solo mis comidas";
    }
    if (techFilter === "only_tech") {
      subTitle += subTitle ? " | Sólo técnica" : "Sólo técnica";
    } else if (techFilter === "no_tech") {
      subTitle += subTitle ? " | Sin técnica" : "Sin técnica";
    }
    if (hideDeletedEvents) {
      subTitle += subTitle ? " | Sin eliminados" : "Sin eliminados";
    }
    const hideGiraColumn = !!giraId;
    exportAgendaToPDF(agendaPdfExportItems, title, subTitle, hideGiraColumn);
  }, [
    agendaPdfExportItems,
    userProfile,
    user.id,
    showNonActiveForFilter,
    filterDateTo,
    effectiveDateFromForFilter,
    availableCategories,
    selectedCategoryIds,
    showOnlyMyTransport,
    showOnlyMyMeals,
    techFilter,
    hideDeletedEvents,
    giraId,
    title,
  ]);

  const hasAutoScrolledRef = useRef(false);
  const autoScrollScopeRef = useRef(giraId);

  // Auto-scroll al evento actual solo en la carga inicial de cada agenda (no tras ediciones ni realtime)
  useEffect(() => {
    if (autoScrollScopeRef.current !== giraId) {
      autoScrollScopeRef.current = giraId;
      hasAutoScrolledRef.current = false;
    }
    if (hasAutoScrolledRef.current) return;
    if (loading || filteredItems.length === 0 || !currentEventId) return;
    if (earlierTodayEventIds.size > 0) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-event-id="${currentEventId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        hasAutoScrolledRef.current = true;
      }
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
    <div className="relative flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-slate-50 animate-in fade-in">
      {dialog}
      {isOfflineMode && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-1 text-[10px] sm:text-xs font-bold text-amber-800 text-center flex items-center justify-center gap-2 sticky top-0 z-40">
          <IconAlertTriangle size={14} />
          <span>Sin conexión a internet. Mostrando copia guardada.</span>
        </div>
      )}

      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30 shrink-0 min-w-0">
        <div className="px-3 sm:px-4 py-2 sm:py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between min-w-0">
          <div
            className={`flex items-center gap-3 overflow-hidden min-w-0 flex-1 ${giraId ? "hidden md:flex" : ""}`}
          >
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

          <div className="flex flex-wrap items-center gap-2 min-w-0 w-full md:w-auto md:flex-nowrap">
            <ConnectionBadge
              status={realtimeStatus}
              lastUpdate={lastUpdate}
              onRefresh={() => fetchAgenda(false)}
              isRefreshing={isRefreshing}
              isUpdating={isRefreshing || (loading && items.length > 0)}
            />

            {hasUnacknowledgedRecentChanges && (
              <button
                type="button"
                onClick={() => setIsHideRecentChangesOpen(true)}
                className="inline-flex items-center justify-center p-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-600 shadow-sm hover:bg-blue-100 animate-pulse"
                title="Ocultar cambios recientes"
                aria-label="Ocultar cambios recientes"
              >
                <IconAlertCircle size={16} />
              </button>
            )}

            {canImportEvents && (
              <button
                type="button"
                onClick={() => setIsTranspositionOpen(true)}
                className="inline-flex shrink-0 items-center gap-1 px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold shadow-sm hover:bg-indigo-100 hover:text-indigo-800"
              >
                <IconRefresh size={14} />
                <span>Importar</span>
              </button>
            )}

            {canToggleConFimba && (
              <button
                type="button"
                onClick={() => setShowWithFimba((v) => !v)}
                className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shadow-sm transition-all ${
                  showWithFimba
                    ? "bg-[#d73289] text-white border-[#d73289] hover:bg-[#c02a7a]"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
                title={
                  showWithFimba
                    ? "Ocultar eventos solo FIMBA"
                    : "Mostrar eventos solo FIMBA"
                }
                aria-pressed={showWithFimba}
              >
                <IconTag size={14} />
                <span>con FIMBA</span>
              </button>
            )}

            {/* Búsqueda por detalle / locación (input local + filtro debounced) */}
            <AgendaSearchField onQueryChange={handleAgendaSearchQueryChange} />

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
                                filterIsEditor || filterIsManagement
                                  ? true
                                  : c.id !== 3,
                              )
                              .map((c) => c.id);
                            setSelectedCategoryIds(catsToSelect);
                            setShowOnlyMyTransport(filterDefaultPersonalFilter);
                            setShowOnlyMyMeals(filterDefaultPersonalFilter);
                            setShowNoGray(false);
                            if (isGiraFinishedTour && giraFirstDate) {
                              setFilterDateFrom(giraFirstDate);
                            } else {
                              setFilterDateFrom(getTodayDateStringLocal());
                            }
                            setFilterDateTo(null);
                            if (isGiraFinishedTour) setShowNonActive(true);
                            else if (isMusicianDraftAudience)
                              commitShowNonActive(true);
                            setTechFilter(
                              filterCanSeeTechEvents ? "all" : "no_tech",
                            );
                          }}
                          className="text-[10px] text-indigo-600 hover:underline font-bold"
                        >
                          Restablecer
                        </button>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto">
                        {/* ... (Resto de filtros) ... */}
                        {filterCanSeeTechEvents && (
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
                                    filterIsEditor || filterIsManagement
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
                        {(canEdit || isMusicianDraftAudience) && (
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
                                  (isMusicianDraftAudience
                                    ? commitShowNonActive(e.target.checked)
                                    : setShowNonActive(e.target.checked))
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
                          {isAdmin && (
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
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {canManageGiraGrupos && !hideGruposToolbarFilter && (
                  <div
                    className={`inline-flex items-stretch rounded-lg border overflow-visible h-[34px] shadow-sm ${
                      hasEditorialGrupoFilter(
                        filterGrupoIds,
                        includeGeneralEvents,
                      )
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-slate-200 bg-white"
                    }`}
                    title="Filtro por grupos (Actividades Tutti = sin grupo asignado)"
                  >
                    <div className="relative min-w-0 w-[7.5rem] sm:min-w-[8.5rem] max-w-full">
                      <MultiSelectDropdown
                        compact
                        summaryMode="names"
                        label="Grupos"
                        placeholder="Grupos..."
                        options={grupoToolbarFilterOptions}
                        value={selectedGrupoToolbarValues}
                        onChange={handleGrupoToolbarFilterChange}
                        className="w-full [&_button]:w-full [&_button]:h-[32px] [&_button]:border-0 [&_button]:rounded-none [&_button]:bg-transparent [&_button]:shadow-none [&_button]:hover:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {canEdit && musicianOptions.length > 0 && (
                  <div className="w-[min(100%,10rem)] sm:w-[160px] min-w-0">
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
              disabled={loading || agendaPdfExportItems.length === 0}
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

      <div className={`flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-slate-50/50 relative ${visibleSelectedEvents.length > 0 ? "pb-24" : ""}`}>
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
              {agendaSearchQuery.trim()
                ? `No hay eventos que coincidan con “${agendaSearchQuery.trim()}”.`
                : "No hay eventos visibles con los filtros actuales."}
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
            {Object.entries(groupedByMonth).map(
              ([monthKey, monthEvents], monthIndex) => {
              const monthDate = parseISO(monthEvents[0].fecha);
              let lastDateRendered = null;
              const isFirstMonth = monthIndex === 0;

              return (
                <div key={monthKey} className="mb-0">
                  <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 py-2 shadow-sm">
                    <div className="flex items-center justify-center gap-2 px-3">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                        {format(monthDate, "MMMM yyyy", { locale: es })}
                      </span>
                      {isFirstMonth && isEditor && (
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-center">
                          <button
                            type="button"
                            onClick={handleOneWeekBefore}
                            disabled={!canExpandPast || isRefreshing}
                            title="Retroceder el filtro de fechas una semana"
                            className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                          >
                            1 semana antes
                          </button>
                          <button
                            type="button"
                            onClick={handleOneMonthBefore}
                            disabled={!canExpandPast || isRefreshing}
                            title="Retroceder el filtro de fechas un mes"
                            className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                          >
                            1 mes antes
                          </button>
                        </div>
                      )}
                    </div>
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

                    const transportFlags = getAgendaTransportFlags(
                      evt,
                      myTransportLogistics,
                    );
                    const isTransportEvent = transportFlags.isTransportEvent;
                    const isMyTransport = transportFlags.isMyTransport;
                    const myStatus = evt.id_gira_transporte
                      ? myTransportLogistics[String(evt.id_gira_transporte)]
                      : null;
                    const isMyUp =
                      isMyTransport &&
                      myStatus &&
                      String(myStatus.subidaId) === String(evt.id);
                    const isMyDown =
                      isMyTransport &&
                      myStatus &&
                      String(myStatus.bajadaId) === String(evt.id);
                    let debugReason = null;

                    if (isTransportEvent && !isMyTransport) {
                      const tourHasRules = toursWithRules.has(evt.id_gira);
                      debugReason = tourHasRules ? "No Match" : "Sin Reglas";
                    }

                    const transportName =
                      evt.giras_transportes?.transportes?.nombre;
                    const transportDetail = evt.giras_transportes?.detalle;
                    const transportColor =
                      evt.giras_transportes?.transportes?.color || "#6366f1";
                    const transportIconName =
                      evt.giras_transportes?.transportes?.icon || "IconBus";
                    const TransportIcon =
                      TRANSPORT_ICON_MAP[transportIconName] || IconBus;

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
                    const locDisplayName = resolveLocacionNombre({
                      nombre: locName,
                      idLocacion: evt.id_locacion,
                      locacion: evt.locaciones,
                    });
                    const isConcertEvent =
                      Number(evt.id_tipo_evento) === 1 ||
                      isConcertHistoryEvent(evt);
                    const isDraftProgramConcert =
                      isConcertEvent &&
                      (evt.programas?.estado || "Borrador") === "Borrador";
                    const showHistoryControl = shouldShowAgendaEventHistory(
                      evt,
                      { isMeal, isTransport: isTransportEvent },
                    );

                    const cardStyle = { backgroundColor: `${eventColor}10` };

                    const feriado = feriados.find((f) => f.fecha === evt.fecha);

                    const isRecentlyModified = isEventRecentlyModified(evt);
                    const isDeleted = evt.is_deleted === true;
                    const canAdminEditDeleted = isAdmin && showDeletedEvents;
                    const isReadOnlyDeleted = isDeleted && !canAdminEditDeleted;
                    const showEventSelect =
                      !isOfflineMode && canEditorMutateEvent(evt);
                    const isEventSelected =
                      showEventSelect && selectedEventIds.has(String(evt.id));
                    const isAgendaHiddenTransport =
                      isTransportEvent &&
                      evt.visible_agenda === false &&
                      filterCanSeeHiddenAgendaEvents;

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
                                className={`md:hidden relative flex min-w-0 max-w-full flex-row items-stretch overflow-x-hidden px-3 sm:px-4 py-2 border-b border-slate-200 transition-colors group gap-2
                            ${shouldDim && !isDeleted ? "opacity-50 grayscale hover:bg-slate-50" : ""}
                            ${isDeleted ? "bg-orange-50 opacity-80 line-through" : ""}
                            ${isAgendaHiddenTransport ? "bg-slate-100 opacity-80" : ""}
                            ${isReadOnlyDeleted ? " pointer-events-none" : ""}
                            ${!isDeleted && evt.is_guest ? "bg-emerald-50/30 hover:bg-slate-50" : ""}
                            ${!isDeleted && isMyTransport ? "bg-indigo-50/30 border-l-4 border-l-indigo-400 hover:bg-slate-50" : ""}
                            ${isEventSelected && !isDeleted ? "ring-2 ring-inset ring-indigo-400 bg-indigo-50/50" : ""}
                            ${isRecentlyModified && !isDeleted && !isEventSelected ? "ring-2 ring-blue-500 animate-pulse" : ""}
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
                                  className={`shrink-0 pt-1 ${showEnsayoCheckInBlock(evt) ? "min-w-[6.5rem]" : ""} ${isDeleted ? "text-orange-700" : "text-slate-600"}`}
                                >
                                  <AgendaEventTimeCluster
                                    horaInicio={evt.hora_inicio?.slice(0, 5)}
                                    horaFin={
                                      evt.hora_fin &&
                                      evt.hora_fin !== evt.hora_inicio
                                        ? evt.hora_fin.slice(0, 5)
                                        : null
                                    }
                                    timeClassName={
                                      isDeleted
                                        ? "text-orange-700"
                                        : "text-slate-600"
                                    }
                                    endClassName={
                                      isDeleted
                                        ? "text-orange-600"
                                        : "text-slate-600"
                                    }
                                    showSelect={showEventSelect}
                                    selected={isEventSelected}
                                    onToggle={() => toggleEventSelected(evt.id)}
                                    checkIn={
                                      showEnsayoCheckInBlock(evt) ? (
                                        <RehearsalCheckInBlock
                                          evt={evt}
                                          integranteId={effectiveUserId}
                                          isToday={evt.fecha === todayStr}
                                          estado={getEnsayoCheckinEstado(
                                            evt.id,
                                          )}
                                          onSuccess={refreshEnsayoCheckin}
                                          onEstadoPatch={
                                            patchEnsayoCheckinEstado
                                          }
                                          pairWithSchedule
                                          scheduleTimeClassName={`text-sm font-bold ${isDeleted ? "text-orange-700" : "text-slate-600"}`}
                                          scheduleEndClassName={`text-sm font-normal ${isDeleted ? "text-orange-600" : "text-slate-600"}`}
                                        />
                                      ) : null
                                    }
                                  />
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col gap-1 py-1">
                                  <div className="flex items-start gap-1.5 mb-0.5">
                                    <div className="min-w-0 max-w-[9rem] shrink flex flex-col gap-1">
                                      <div className="flex flex-wrap gap-1 items-center">
                                        <span
                                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border truncate max-w-full [&_mark]:bg-yellow-200 [&_mark]:text-yellow-900 [&_mark]:rounded-sm [&_mark]:px-0.5"
                                          style={{
                                            color: eventColor,
                                            borderColor: `${eventColor}40`,
                                            backgroundColor: `${eventColor}10`,
                                          }}
                                        >
                                          <AgendaSearchHighlight
                                            text={evt.tipos_evento?.nombre}
                                            query={agendaSearchQuery}
                                          />
                                        </span>
                                        {isDraftProgramConcert && (
                                          <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold shrink-0">
                                            Borrador
                                          </span>
                                        )}
                                        {(canEditAgendaTechVisibility ||
                                          isTechnician) && (
                                          <AgendaEventAdminToggle
                                            evt={evt}
                                            isTransportEvent={isTransportEvent}
                                            canEditAdmin={
                                              canEditAgendaTechVisibility
                                            }
                                            isTechnicianRole={isTechnician}
                                            onToggleVisibleAgenda={
                                              toggleEventVisibleAgenda
                                            }
                                            onToggleTechnica={
                                              toggleEventTechnica
                                            }
                                          />
                                        )}
                                      </div>
                                      {evt.programas?.nomenclador && (
                                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0 w-fit">
                                          {evt.programas.nomenclador}
                                        </span>
                                      )}
                                    </div>
                                    {showGruposColumn && (
                                      <div className="min-w-0 flex-1">
                                        <AgendaEventGruposBlock
                                          evt={evt}
                                          canManage={canManageGiraGrupos}
                                          onOpenAssign={setGruposAssignTarget}
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Descripción + chips para móvil */}
                                  {evt.id_tipo_evento === 13 ? (
                                    <>
                                      {/* Descripción con chips de ensamble al costado */}
                                      <div className="flex min-w-0 items-start gap-2">
                                        <div
                                          className={`flex-1 text-sm leading-tight break-words ${isDeleted ? "text-orange-700" : shouldDim ? "text-slate-400" : "text-slate-800"}`}
                                        >
                                          {evt.descripcion ? (
                                            <AgendaEventDescripcionHtml
                                              html={evt.descripcion}
                                              query={agendaSearchQuery}
                                              htmlClassName="whitespace-pre-wrap font-medium [&>b]:font-bold [&>strong]:font-bold [&>mark]:bg-yellow-200 [&>mark]:text-yellow-900"
                                            />
                                          ) : (
                                            <span>
                                              <AgendaSearchHighlight
                                                text={evt.tipos_evento?.nombre}
                                                query={agendaSearchQuery}
                                              />
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex min-w-0 max-w-[48%] flex-wrap gap-1">
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
                                        <AgendaEventDescripcionHtml
                                          html={evt.descripcion}
                                          query={agendaSearchQuery}
                                          htmlClassName="whitespace-pre-wrap font-medium [&>b]:font-bold [&>strong]:font-bold [&>mark]:bg-yellow-200 [&>mark]:text-yellow-900"
                                        />
                                      ) : (
                                        <span>
                                          <AgendaSearchHighlight
                                            text={evt.tipos_evento?.nombre}
                                            query={agendaSearchQuery}
                                          />
                                        </span>
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
                                            (
                                            <AgendaSearchHighlight
                                              text={transportDetail}
                                              query={agendaSearchQuery}
                                            />
                                            )
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
                                    {shouldShowLocacionEnEvento(evt) && (
                                      <div
                                        className={`flex min-w-0 items-start gap-1 text-xs mt-0.5 ${isDeleted ? "text-orange-700" : "text-slate-500"}`}
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
                                            className={`block min-w-0 font-semibold truncate ${isDeleted ? "text-orange-700" : "text-slate-700"}`}
                                          >
                                            {agendaSearchQuery.trim() ? (
                                              <AgendaSearchHighlight
                                                text={locDisplayName}
                                                query={agendaSearchQuery}
                                              />
                                            ) : (
                                              <LocacionNombreSpan
                                                nombre={locName}
                                                idLocacion={evt.id_locacion}
                                                locacion={evt.locaciones}
                                              />
                                            )}
                                            {locCity ? (
                                              <>
                                                {" ("}
                                                <AgendaSearchHighlight
                                                  text={locCity}
                                                  query={agendaSearchQuery}
                                                />
                                                )
                                              </>
                                            ) : null}
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
                                              <AgendaSearchHighlight
                                                text={evt.locaciones.direccion}
                                                query={agendaSearchQuery}
                                              />{" "}
                                              ↗
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-start gap-1 pl-2 pt-1 border-l border-slate-100 flex-col justify-between">
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
                                      {shouldShowAgendaBacklineIcon(
                                        evt,
                                        canSeeAgendaLogisticaConsulta,
                                      ) && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setBacklineConsultaEvento(evt);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-fuchsia-700 rounded hover:bg-fuchsia-50"
                                          title="Ver Backline"
                                          aria-label="Ver Backline"
                                        >
                                          <IconLayers size={16} />
                                        </button>
                                      )}
                                      {shouldShowAgendaRiderIcon(
                                        evt,
                                        canSeeAgendaLogisticaConsulta,
                                      ) && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setRiderConsultaEvento(evt);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-fuchsia-700 rounded hover:bg-fuchsia-50"
                                          title="Ver Rider"
                                          aria-label="Ver Rider"
                                        >
                                          <IconFileText size={16} />
                                        </button>
                                      )}
                                      {(isConcertEvent ||
                                        Number(evt.id_tipo_evento) === 13) &&
                                        (evt.id_gira || evt.programas?.id) &&
                                        (isTechnician ||
                                          isEditor ||
                                          isManagement) && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setStagePlotViewerEvent(evt);
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                                            title="Ver escenario"
                                          >
                                            <IconLayout size={16} />
                                          </button>
                                        )}
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
                                        {showHistoryControl && (
                                          <AgendaEventHistoryButton
                                            event={evt}
                                            compact
                                            prominent={isConcertEvent}
                                            onOpen={setEventHistoryEvent}
                                          />
                                        )}
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
                                        {showEventSelect && (
                                          <AgendaEventRowTrashButton
                                            compact
                                            onClick={() =>
                                              requestMoveEventsToTrash([evt])
                                            }
                                          />
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
                            ${isAgendaHiddenTransport ? "bg-slate-100 opacity-80" : ""}
                            ${isReadOnlyDeleted ? " pointer-events-none" : ""}
                            ${!isDeleted && evt.is_guest ? "bg-emerald-50/30 hover:bg-slate-50" : ""}
                            ${!isDeleted && isMyTransport ? "bg-indigo-50/30 hover:bg-slate-50" : ""}
                            ${isEventSelected && !isDeleted ? "ring-2 ring-inset ring-indigo-400 bg-indigo-50/50" : ""}
                            ${isRecentlyModified && !isDeleted && !isEventSelected ? "ring-2 ring-blue-500 animate-pulse" : ""}
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
                                <div className="col-span-1 min-w-0">
                                  <AgendaEventTimeCluster
                                    horaInicio={evt.hora_inicio?.slice(0, 5)}
                                    horaFin={
                                      evt.hora_fin &&
                                      evt.hora_fin !== evt.hora_inicio
                                        ? evt.hora_fin.slice(0, 5)
                                        : null
                                    }
                                    timeClassName={
                                      isDeleted
                                        ? "text-orange-700"
                                        : "text-slate-700"
                                    }
                                    endClassName={
                                      isDeleted
                                        ? "text-orange-600"
                                        : "text-slate-600"
                                    }
                                    showSelect={showEventSelect}
                                    selected={isEventSelected}
                                    onToggle={() => toggleEventSelected(evt.id)}
                                    compact
                                    checkIn={
                                      showEnsayoCheckInBlock(evt) ? (
                                        <RehearsalCheckInBlock
                                          evt={evt}
                                          integranteId={effectiveUserId}
                                          isToday={evt.fecha === todayStr}
                                          estado={getEnsayoCheckinEstado(
                                            evt.id,
                                          )}
                                          onSuccess={refreshEnsayoCheckin}
                                          onEstadoPatch={
                                            patchEnsayoCheckinEstado
                                          }
                                          pairWithSchedule
                                          scheduleTimeClassName={`text-sm font-bold ${isDeleted ? "text-orange-700" : "text-slate-700"}`}
                                          scheduleEndClassName={`text-sm font-normal ${isDeleted ? "text-orange-600" : "text-slate-600"}`}
                                        />
                                      ) : null
                                    }
                                  />
                                </div>

                                {/* COLUMNA 2: TIPO */}
                                <div
                                  className={`${showGruposColumn ? "col-span-1" : "col-span-2"} flex flex-col items-start gap-1.5 min-w-0`}
                                >
                                  <div className="flex flex-wrap gap-1 items-center">
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border truncate max-w-full [&_mark]:bg-yellow-200 [&_mark]:text-yellow-900 [&_mark]:rounded-sm [&_mark]:px-0.5"
                                      style={{
                                        color: eventColor,
                                        borderColor: `${eventColor}40`,
                                        backgroundColor: `${eventColor}10`,
                                      }}
                                    >
                                      <AgendaSearchHighlight
                                        text={evt.tipos_evento?.nombre}
                                        query={agendaSearchQuery}
                                      />
                                    </span>
                                    {isDraftProgramConcert && (
                                      <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold shrink-0">
                                        Borrador
                                      </span>
                                    )}
                                    {(canEditAgendaTechVisibility ||
                                      isTechnician) && (
                                      <AgendaEventAdminToggle
                                        evt={evt}
                                        isTransportEvent={isTransportEvent}
                                        canEditAdmin={
                                          canEditAgendaTechVisibility
                                        }
                                        isTechnicianRole={isTechnician}
                                        onToggleVisibleAgenda={
                                          toggleEventVisibleAgenda
                                        }
                                        onToggleTechnica={toggleEventTechnica}
                                        compact
                                      />
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

                                {showGruposColumn && (
                                  <div className="col-span-1 min-w-0">
                                    <AgendaEventGruposBlock
                                      evt={evt}
                                      canManage={canManageGiraGrupos}
                                      onOpenAssign={setGruposAssignTarget}
                                      compact
                                    />
                                  </div>
                                )}

                                {/* COLUMNA 3: DESCRIPCIÓN + ENSAMBLES + PROGRAMAS */}
                                <div
                                  className={`${showGruposColumn ? "col-span-5" : "col-span-4"} min-w-0`}
                                >
                                  <div className="flex items-start gap-2">
                                    <div
                                      className={`flex-1 text-sm leading-tight break-words ${isDeleted ? "text-orange-700" : shouldDim ? "text-slate-400" : "text-slate-800"}`}
                                    >
                                      {evt.descripcion ? (
                                        <AgendaEventDescripcionHtml
                                          html={evt.descripcion}
                                          query={agendaSearchQuery}
                                          htmlClassName="whitespace-pre-wrap font-medium [&>b]:font-bold [&>strong]:font-bold [&>mark]:bg-yellow-200 [&>mark]:text-yellow-900 text-sm"
                                        />
                                      ) : (
                                        <span
                                          className={
                                            isDeleted
                                              ? "font-bold text-orange-700"
                                              : "font-bold text-slate-800"
                                          }
                                        >
                                          <AgendaSearchHighlight
                                            text={evt.tipos_evento?.nombre}
                                            query={agendaSearchQuery}
                                          />
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
                                <div
                                  className={`${showGruposColumn ? "col-span-2" : "col-span-3"} min-w-0`}
                                >
                                  {shouldShowLocacionEnEvento(evt) && (
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
                                          {agendaSearchQuery.trim() ? (
                                            <AgendaSearchHighlight
                                              text={locDisplayName}
                                              query={agendaSearchQuery}
                                            />
                                          ) : (
                                            <LocacionNombreSpan
                                              nombre={locName}
                                              idLocacion={evt.id_locacion}
                                              locacion={evt.locaciones}
                                            />
                                          )}
                                          {locCity ? (
                                            <>
                                              {" ("}
                                              <AgendaSearchHighlight
                                                text={locCity}
                                                query={agendaSearchQuery}
                                              />
                                              )
                                            </>
                                          ) : null}
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
                                            <AgendaSearchHighlight
                                              text={evt.locaciones.direccion}
                                              query={agendaSearchQuery}
                                            />{" "}
                                            ↗
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
                                          {shouldShowAgendaBacklineIcon(
                                            evt,
                                            canSeeAgendaLogisticaConsulta,
                                          ) && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setBacklineConsultaEvento(evt);
                                              }}
                                              className="p-1.5 text-slate-400 hover:text-fuchsia-700 rounded hover:bg-fuchsia-50"
                                              title="Ver Backline"
                                              aria-label="Ver Backline"
                                            >
                                              <IconLayers size={16} />
                                            </button>
                                          )}
                                          {shouldShowAgendaRiderIcon(
                                            evt,
                                            canSeeAgendaLogisticaConsulta,
                                          ) && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setRiderConsultaEvento(evt);
                                              }}
                                              className="p-1.5 text-slate-400 hover:text-fuchsia-700 rounded hover:bg-fuchsia-50"
                                              title="Ver Rider"
                                              aria-label="Ver Rider"
                                            >
                                              <IconFileText size={16} />
                                            </button>
                                          )}
                                          {(isConcertEvent ||
                                            Number(evt.id_tipo_evento) ===
                                              13) &&
                                            (evt.id_gira ||
                                              evt.programas?.id) &&
                                            (isTechnician ||
                                              isEditor ||
                                              isManagement) && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setStagePlotViewerEvent(evt);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                                                title="Ver escenario"
                                              >
                                                <IconLayout size={16} />
                                              </button>
                                            )}
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
                                          {showHistoryControl && (
                                            <AgendaEventHistoryButton
                                              event={evt}
                                              prominent={isConcertEvent}
                                              onOpen={setEventHistoryEvent}
                                            />
                                          )}
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
                                          {showEventSelect && (
                                            <AgendaEventRowTrashButton
                                              onClick={() =>
                                                requestMoveEventsToTrash([evt])
                                              }
                                            />
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
              onClick={() => {
                setMonthsLimit((prev) => prev + 3);
                setFilterDateTo((prev) =>
                  prev ? addMonthsToDateStringLocal(prev, 3) : prev,
                );
              }}
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
      <AgendaBulkActionsBar
        count={visibleSelectedEvents.length}
        onDelete={() => requestMoveEventsToTrash(visibleSelectedEvents)}
        onHide={handleBulkHideSelected}
        onTagGrupos={handleBulkTagGrupos}
        gruposDisabled={!canBulkTagGrupos}
        gruposReason={bulkGruposReason}
        hideDisabled={!canBulkHide}
        hideReason={bulkHideReason}
        onClear={clearEventSelection}
        busy={bulkBusy || loading}
      />
      <EventGruposAssignModal
        isOpen={!!gruposAssignTarget || !!gruposAssignBulk}
        evt={gruposAssignBulk?.events?.[0] || gruposAssignTarget}
        events={
          gruposAssignBulk?.events ||
          (gruposAssignTarget ? [gruposAssignTarget] : [])
        }
        grupoOptions={
          gruposAssignBulk?.grupoOptions || grupoFilterOptions
        }
        supabase={supabase}
        onClose={() => {
          setGruposAssignTarget(null);
          setGruposAssignBulk(null);
        }}
        onSaved={async (eventIds) => {
          const ids = (
            Array.isArray(eventIds) ? eventIds : eventIds ? [eventIds] : []
          ).filter(Boolean);
          if (ids.length === 0) return;
          ids.forEach((id) => markLocalEventMutation(id));
          await Promise.all(ids.map((id) => refreshEventById(id)));
          if (ids.length > 1) clearEventSelection();
        }}
      />
      <StagePlotViewerModal
        open={!!stagePlotViewerEvent}
        onClose={() => setStagePlotViewerEvent(null)}
        supabase={supabase}
        evento={stagePlotViewerEvent}
        gira={stagePlotViewerEvent?.programas || mainProgram}
      />
      <FimbaBacklineConsultaModal
        open={!!backlineConsultaEvento}
        evento={backlineConsultaEvento}
        onClose={() => setBacklineConsultaEvento(null)}
        supabaseClient={supabase}
      />
      <FimbaRiderConsultaModal
        open={!!riderConsultaEvento}
        evento={riderConsultaEvento}
        onClose={() => setRiderConsultaEvento(null)}
      />
      <ConfirmDialog
        isOpen={isHideRecentChangesOpen}
        onClose={() => setIsHideRecentChangesOpen(false)}
        onConfirm={handleAckRecentChanges}
        title="Ocultar cambios recientes"
        message="¿Ocultar cambios recientes? (ya no titilarán los cambios previos a este momento)"
        confirmText="Ocultar"
        cancelText="Cancelar"
      />
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm(emptyDeleteConfirm)}
        onConfirm={handleConfirmDeleteEvent}
        title="Mover a la papelera"
        message={deleteConfirm.message}
        messageIsHtml={deleteConfirm.messageIsHtml}
        confirmText="Mover a la papelera"
        cancelText="Cancelar"
        overlayClassName="z-[110]"
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
      {isEditOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <EventForm
              formData={editFormData}
              setFormData={setEditFormData}
              onSave={handleEditSave}
              onClose={() => setIsEditOpen(false)}
              onDelete={handleDeleteEvent}
              onDuplicate={handleDuplicateEvent}
              onOpenHistory={
                isConcertHistoryEvent(editFormData) ||
                isConcertHistoryEvent(editingEventObj)
                  ? () =>
                      setEventHistoryEvent({
                        id: editFormData.id,
                        label: `${
                          formEventTypes.find(
                            (t) =>
                              String(t.id) ===
                              String(editFormData.id_tipo_evento),
                          )?.nombre || "Concierto"
                        } ${editFormData.fecha || ""}`,
                        event: editingEventObj || editFormData,
                      })
                  : undefined
              }
              loading={formSaving}
              eventTypes={formEventTypes}
              locations={formLocations}
              isNew={false}
              supabase={supabase}
              onRefreshLocations={fetchFormLocations}
              giraId={giraId}
            />
          </div>,
          document.body,
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
          event={eventHistoryEvent.event || null}
          nested={isEditOpen || isCreating}
          onClose={() => setEventHistoryEvent(null)}
        />
      )}
      {isCreating &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <EventForm
              formData={newFormData}
              setFormData={setNewFormData}
              onSave={handleCreateSave}
              onClose={() => setIsCreating(false)}
              loading={formSaving}
              eventTypes={formEventTypes}
              locations={formLocations}
              isNew={true}
              supabase={supabase}
              onRefreshLocations={fetchFormLocations}
              giraId={giraId}
            />
          </div>,
          document.body,
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
            await fetchAgenda(true);
          }}
        />
      )}
    </div>
  );
}
