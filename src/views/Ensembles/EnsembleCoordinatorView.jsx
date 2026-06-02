import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useClickOutside } from "../../hooks/useClickOutside";
import {
  useQuery,
  useQueries,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { getProgramStyle, PROGRAM_TYPES, formatProgramSelectLabel } from "../../utils/giraUtils";
import { toast } from "sonner";
import {
  IconCalendar,
  IconMusic,
  IconLoader,
  IconAlertTriangle,
  IconPlus,
  IconFilter,
  IconMapPin,
  IconClock,
  IconUsers,
  IconEdit,
  IconEye,
  IconLayers,
  IconChevronDown,
  IconTrash,
  IconCheck,
  IconX,
  IconSearch,
  IconSettings,
  IconUserPlus,
  IconUserX,
  IconMenu,
  IconEyeOff,
  IconPrinter,
  IconDownload,
} from "../../components/ui/Icons";
import EnsayosPorProgramaReportModal from "./EnsayosPorProgramaReportModal";
import ManualTrigger from "../../components/manual/ManualTrigger";
import GiraForm from "../Giras/GiraForm";
import IndependentRehearsalForm from "./IndependentRehearsalForm";
import MassiveRehearsalGenerator from "./MassiveRehearsalGenerator";
import EnsembleCalendar from "./EnsembleCalendar";
import EventQuickView from "./EventQuickView";
import FilterDropdown from "../../components/ui/FilterDropdown";
import DateInput from "../../components/ui/DateInput";
import SearchableSelect from "../../components/ui/SearchableSelect";
import MultiSelect from "../../components/ui/MultiSelect";
import ConfirmModal from "../../components/ui/ConfirmModal";
import RichTextEditor from "../../components/ui/RichTextEditor";
import LocationManagerModal from "../../components/locations/LocationManagerModal";

import { format, getDay, setDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  useGiraRosterQuery,
  giraRosterQueryKey,
} from "../../hooks/useGiraRosterQuery";
import { fetchRosterForGira } from "../../hooks/useGiraRoster";
import RehearsalVirtualList from "../../components/ensembles/RehearsalVirtualList";
import GiraCard from "../Giras/GiraCard";
import { getTransportEventAffectedSummary } from "../../utils/transportLogisticsWarning";
import { integranteKey } from "../../utils/integranteIds";
import { membershipActiveOnProgramDate } from "../../utils/ensembleMembership";
import {
  mapCoordinatorEventsForAgendaPdf,
  stripHtml,
} from "../../utils/eventDisplayUtils";
import { exportAgendaToPDF } from "../../utils/agendaPdfExporter";
import { useCoordinatorPrograms } from "../../hooks/useCoordinatorPrograms";
import { GIRAS_LIST_SELECT } from "../../hooks/useGirasList";
import { programOverlapsDateRange } from "../../utils/giraDateRange";
import { getEventProgramIds } from "../../utils/rehearsalProgramas";
import { getDefaultSelectedEnsembleIds } from "../../utils/ensayosPorProgramaReport";
import RepertorioPreparacionSelect from "../../components/ensembles/RepertorioPreparacionSelect";

// --- UTILIDADES ---
/** Fecha "hoy" en zona local como YYYY-MM-DD (evita desfase por UTC). */
const toLocalDateString = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** IDs de ensamble siempre numéricos (evita fallos en .includes al filtrar). */
const normalizeEnsembleId = (id) => {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
};

const normalizeEnsembleIdList = (ids) => [
  ...new Set(
    (Array.isArray(ids) ? ids : [])
      .map(normalizeEnsembleId)
      .filter((id) => id != null),
  ),
];
/** Parsea YYYY-MM-DD como fecha local (no UTC) para mostrar el día correcto en cualquier huso. */
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split("-").map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateBox = (dateStr) => {
  if (!dateStr) return { day: "-", num: "-", month: "-" };
  try {
    const date = parseLocalDate(dateStr);
    if (!date) return { day: "-", num: "-", month: "-" };
    return {
      day: format(date, "EEE", { locale: es }).toUpperCase().replace(".", ""),
      num: format(date, "d"),
      month: format(date, "MMM", { locale: es }).toUpperCase().replace(".", ""),
    };
  } catch (e) {
    return { day: "-", num: "-", month: "-" };
  }
};

const formatProgramDateRange = (fromStr, toStr) => {
  const from = parseLocalDate(fromStr);
  const to = parseLocalDate(toStr);
  if (!from && !to) return "";
  if (from && to) {
    if (from.getTime() === to.getTime()) {
      return format(from, "dd/MM/yyyy");
    }
    return `${format(from, "dd/MM/yyyy")} – ${format(to, "dd/MM/yyyy")}`;
  }
  if (from) return `Desde ${format(from, "dd/MM/yyyy")}`;
  return `Hasta ${format(to, "dd/MM/yyyy")}`;
};

const formatTime = (timeStr) => (timeStr ? timeStr.slice(0, 5) : "--:--");

// Persistencia por pestaña con sessionStorage (se mantiene en navegación y refresh de la misma pestaña).
const coordinatorUiStorageKey = (userId) =>
  `coordinator_ui_state_${String(userId ?? "anon")}`;
const getCoordinatorUiState = (userId) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(coordinatorUiStorageKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const setCoordinatorUiState = (userId, nextState) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      coordinatorUiStorageKey(userId),
      JSON.stringify(nextState),
    );
  } catch {
    // No-op: si storage no está disponible, la vista sigue funcionando sin persistencia.
  }
};

// --- HELPER: Buscar feriado por fecha ---
const findFeriado = (fechaStr, feriadosList) => {
  if (!fechaStr || !feriadosList?.length) return null;
  return feriadosList.find((f) => f.fecha === fechaStr) || null;
};

// --- COMPONENTE: Badge de Feriado Interactivo ---
const FeriadoBadge = ({ feriado }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (badgeRef.current && !badgeRef.current.contains(event.target)) {
        setShowTooltip(false);
      }
    };
    if (showTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTooltip]);

  if (!feriado) return null;

  const isFeriado = feriado.es_feriado;
  const colorClass = isFeriado ? "text-red-600" : "text-yellow-600";
  const bgClass = isFeriado ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200";
  const textColor = isFeriado ? "text-red-700" : "text-yellow-700";

  return (
    <div className="relative" ref={badgeRef}>
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        className={`cursor-pointer hover:scale-110 transition-transform ${colorClass}`}
        title={`⚠️ ${isFeriado ? "Feriado" : "Día no laborable"}: ${feriado.detalle}`}
      >
        <IconAlertTriangle size={14} />
      </button>
      {showTooltip && (
        <div
          className={`absolute top-full right-0 mt-1 z-50 px-2 py-1.5 rounded-lg border shadow-lg text-xs font-medium whitespace-nowrap ${bgClass} ${textColor} animate-in fade-in zoom-in-95 duration-150`}
          style={{ minWidth: "180px" }}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="flex items-center gap-1.5">
            <IconAlertTriangle size={12} />
            <span className="font-bold uppercase text-[10px]">
              {isFeriado ? "Feriado" : "No Laborable"}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-normal">{feriado.detalle}</div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE TARJETA (LISTA) ---
const RehearsalCardItem = React.memo(function RehearsalCardItem({
  evt,
  activeMembersSet,
  onEdit,
  onDelete,
  isSelected,
  onSelect,
  listIndex,
  feriados = [],
  programRoster = null,
}) {
  const { day, num, month } = formatDateBox(evt.fecha);
  const feriado = findFeriado(evt.fecha, feriados);

  const isMyEvent = evt.isMyRehearsal;
  const isEditable = isMyEvent;

  let count = 0;
  if (evt.programas) {
    if (programRoster) {
      const myInvolvedMembers = programRoster.filter(
        (m) =>
          activeMembersSet.has(integranteKey(m.id)) && m.estado_gira !== "ausente",
      );
      count = myInvolvedMembers.length;
    }
  } else {
    const baseCount = activeMembersSet.size;
    const delta = (evt.deltaGuests || 0) - (evt.deltaAbsent || 0);
    count = Math.max(0, baseCount + delta);
  }

  const isFull =
    activeMembersSet.size > 0 && count >= activeMembersSet.size * 0.9;
  const eventColor = evt.tipos_evento?.color || "#64748b";
  const tagStyle = {
    color: eventColor,
    backgroundColor: `${eventColor}15`,
    borderColor: `${eventColor}30`,
  };
  const customs = evt.eventos_asistencia_custom || [];
  const guests = customs.filter(
    (c) => c.tipo === "invitado" || c.tipo === "adicional",
  );
  const absents = customs.filter((c) => c.tipo === "ausente");
  const linkedPrograms =
    evt.eventos_programas_asociados
      ?.map((epa) => epa.programas)
      .filter(Boolean) || [];
  if (evt.programas) linkedPrograms.push(evt.programas);
  const locationStr = evt.locaciones
    ? `${evt.locaciones.nombre}${evt.locaciones.localidades?.localidad ? ` (${evt.locaciones.localidades.localidad})` : ""}`
    : "TBA";

  const isDeleted = evt.is_deleted === true;

  return (
    <div
      className={`flex items-start p-2.5 border rounded-lg shadow-sm transition-all bg-white ${isSelected ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/40" : "border-slate-200"} ${!isMyEvent ? "opacity-60 grayscale-[0.5] border-dashed" : ""} ${isDeleted ? "line-through opacity-50 grayscale" : ""}`}
    >
      {/* COLUMNA IZQUIERDA: CHECKBOX + FECHA */}
      <div className="flex flex-col items-center gap-2 mr-3 shrink-0 relative">
        {isEditable && (
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={(e) =>
              onSelect(evt.id, e.target.checked, listIndex, e.nativeEvent)
            }
            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        )}

        <div className="flex flex-col items-center justify-center rounded-md p-1 w-12 bg-slate-50 border border-slate-100">
          <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">
            {day}
          </span>
          <span className="text-xl font-bold leading-none text-slate-700">
            {num}
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mt-0.5">
            {month}
          </span>
        </div>
        {feriado && (
          <div className="absolute -top-1 -right-1">
            <FeriadoBadge feriado={feriado} />
          </div>
        )}
      </div>

      <div
        className="flex-1 min-w-0 pl-3 relative border-l-2"
        style={{ borderLeftColor: eventColor }}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-slate-600 bg-slate-100 px-1.5 rounded">
                {formatTime(evt.hora_inicio)} - {formatTime(evt.hora_fin)}
              </span>
              <span
                className="text-[9px] px-1.5 rounded border font-bold uppercase tracking-wider truncate max-w-[120px]"
                style={tagStyle}
              >
                {evt.tipos_evento?.nombre}
              </span>
            </div>
            <h3
              className={`font-bold text-sm mt-1 truncate ${isMyEvent ? "text-slate-800" : "text-slate-600 italic"}`}
            >
              {stripHtml(evt.descripcion) || "Evento"}
            </h3>
            {isDeleted && (
              <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">
                Se elimina definitivamente en 24 h
              </span>
            )}
          </div>
          {isEditable && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(evt)}
                className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-100 transition-colors"
                title="Editar Evento"
              >
                <IconEdit size={14} />
              </button>
              <button
                onClick={() => onDelete(evt.id, evt)}
                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100 transition-colors"
                title="Eliminar Evento"
              >
                <IconTrash size={14} />
              </button>
            </div>
          )}
        </div>
        {linkedPrograms.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {linkedPrograms.map((prog) => (
              <span
                key={prog.id}
                className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1 max-w-full truncate"
              >
                <IconMusic size={10} className="text-slate-400 shrink-0" />{" "}
                <span className="truncate">
                  {formatProgramSelectLabel(prog)}
                </span>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
          <span className="flex items-center gap-1 truncate max-w-[150px]">
            <IconMapPin size={12} className="text-slate-400 shrink-0" />{" "}
            {locationStr}
          </span>
          {(isMyEvent || (evt.programas && activeMembersSet.size > 0)) && (
            <span
              className={`flex items-center gap-1 font-bold ${
                isMyEvent
                  ? isFull
                    ? "text-green-600"
                    : "text-amber-600"
                  : "text-slate-600"
              }`}
            >
              <IconUsers size={12} />
              {!evt.programas || activeMembersSet.size === 0
                ? isMyEvent
                  ? isFull
                    ? "Tutti"
                    : count
                  : count
                : isMyEvent
                  ? isFull
                    ? "Tutti"
                    : count
                  : count === activeMembersSet.size
                    ? "Todos"
                    : `${count} músicos`}
            </span>
          )}
          {evt.eventos_ensambles?.length > 0 && (
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2 overflow-x-auto no-scrollbar max-w-[100px]">
              {evt.eventos_ensambles.map((ee) => (
                <span
                  key={ee.ensambles?.id}
                  className="text-[10px] text-slate-500 font-semibold uppercase bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap"
                >
                  {ee.ensambles?.ensamble}
                </span>
              ))}
            </div>
          )}
        </div>
        {(guests.length > 0 || absents.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-100 border-dashed">
            {guests.map((g) => (
              <span
                key={g.id_integrante}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"
              >
                <IconUserPlus size={10} /> {g.integrantes?.apellido}{" "}
                {g.integrantes?.nombre?.charAt(0)}.
              </span>
            ))}
            {absents.map((a) => (
              <span
                key={a.id_integrante}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100"
              >
                <IconUserX size={10} /> {a.integrantes?.apellido}{" "}
                {a.integrantes?.nombre?.charAt(0)}.
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

const ConvokedMembersBadge = ({
  roster,
  loading,
  activeMembersSet,
  className = "",
}) => {
  const myInvolvedMembers = (roster || []).filter(
    (m) =>
      activeMembersSet.has(integranteKey(m.id)) && m.estado_gira !== "ausente",
  );
  const count = myInvolvedMembers.length;
  const isFull =
    !loading &&
    activeMembersSet.size > 0 &&
    count >= activeMembersSet.size * 0.9;

  const showMembersList = (e) => {
    e.stopPropagation();
    if (count === 0) return;
    const names = myInvolvedMembers
      .map((m) => `• ${m.nombre} ${m.apellido}`)
      .join("\n");
    toast.success(`Integrantes convocados (${count}):\n${names}`, {
      duration: 8000,
    });
  };

  return (
    <button
      type="button"
      onClick={showMembersList}
      disabled={loading || count === 0}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shadow-md border bg-white/95 backdrop-blur-sm disabled:opacity-50 pointer-events-auto ${isFull ? "text-green-700 border-green-200" : "text-amber-700 border-amber-200"} ${className}`}
      title="Integrantes del ensamble convocados en esta gira"
    >
      <IconUsers size={12} />
      {loading ? "…" : isFull ? "Todos" : count}
    </button>
  );
};

const CoordinatorProgramGiraCard = ({
  gira,
  activeMembersSet,
  supabase,
  onEdit,
  ensemblesList,
  updateView,
  showRepertoireInCards,
}) => {
  const { roster, loading } = useGiraRosterQuery(supabase, gira);
  const canEdit = gira.tipo === "Ensamble" && Boolean(onEdit);

  return (
    <div className="relative">
      <ConvokedMembersBadge
        roster={roster}
        loading={loading}
        activeMembersSet={activeMembersSet}
        className="absolute top-3 right-14 z-[55]"
      />
      <GiraCard
        gira={gira}
        updateView={updateView}
        isEditor={canEdit}
        isPersonal={false}
        userRole={null}
        startEdit={canEdit ? () => onEdit(gira) : () => {}}
        setGlobalCommentsGiraId={() => {}}
        setCommentsState={() => {}}
        activeMenuId={null}
        setActiveMenuId={() => {}}
        showRepertoireInCards={showRepertoireInCards}
        ensemblesList={ensemblesList}
        supabase={supabase}
        onMove={() => {}}
        onDuplicate={() => {}}
        onDelete={() => {}}
        isHighlighted={false}
      />
    </div>
  );
};
// --- COMPONENTE: TAB DE PROGRAMACIÓN DE REPERTORIO ---
const LinkedProgramPreview = ({ programId, supabase, showGiraCards = false }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gira, setGira] = useState(null);

  useEffect(() => {
    if (!open || gira) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("programas")
          .select(
            `
          *,
          giras_localidades(id_localidad, localidades(localidad)),
          giras_integrantes(
            id_integrante, rol, estado,
            integrantes(
              id, nombre, apellido,
              id_localidad,
              instrumentos(familia)
            )
          ),
          giras_fuentes(*),
          eventos(
            id, fecha, hora_inicio, hora_fin, descripcion, id_estado_venue,
            locaciones(nombre, localidades(localidad)),
            tipos_evento(nombre, id_categoria),
            eventos_asistencia(id_integrante, estado)
          )
        `,
          )
          .eq("id", programId)
          .single();
        if (cancelled) return;
        if (error) throw error;
        setGira(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          toast.error("No se pudo cargar el programa asociado");
          setOpen(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, programId, supabase, gira]);

  const toggle = () => {
    setOpen((prev) => !prev);
  };

  const isExpanded = open || showGiraCards;

  return (
    <div className="mt-2">
      {!showGiraCards && (
      <button
        type="button"
        onClick={toggle}
        className="text-[11px] font-bold text-fixed-indigo-600 hover:text-fixed-indigo-800 flex items-center gap-1"
      >
        <IconChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
        {open ? "Ocultar programa" : "Ver programa"}
      </button>
      )}
      {isExpanded && (
        <div className={showGiraCards ? "" : "mt-2"}>
          {!open && showGiraCards && !gira && !loading && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-[11px] font-bold text-fixed-indigo-600 hover:text-fixed-indigo-800 flex items-center gap-1 mb-2"
            >
              <IconChevronDown size={12} />
              Ver programa
            </button>
          )}
          {loading && (
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <IconLoader className="animate-spin" size={12} /> Cargando GiraCard...
            </div>
          )}
          {!loading && gira && (
            <GiraCard
              gira={gira}
              updateView={(mode, giraId, subTab) => {
                const params = new URLSearchParams();
                params.set("tab", "giras");
                if (mode && mode !== "LIST") {
                  params.set("view", mode);
                  if (giraId) params.set("giraId", giraId);
                  if (subTab) params.set("subTab", subTab);
                }
                navigate({ pathname: "/", search: params.toString() });
              }}
              isEditor={true}
              isPersonal={false}
              userRole={null}
              startEdit={() => {}}
              setGlobalCommentsGiraId={() => {}}
              setCommentsState={() => {}}
              activeMenuId={null}
              setActiveMenuId={() => {}}
              showRepertoireInCards={false}
              ensemblesList={[]}
              supabase={supabase}
              onMove={() => {}}
              onDuplicate={() => {}}
              onDelete={() => {}}
              isHighlighted={false}
            />
          )}
        </div>
      )}
    </div>
  );
};

const CycleProposalCard = ({
  proposal,
  ensemble,
  supabase,
  programsMap,
  proposalFields,
  handleUpdateProposalField,
  handleAssociateProgram,
  onCreateProgramFromProposal,
  editingProposalId,
  setEditingProposalId,
  showGiraCards,
}) => {
  const cardRef = useRef(null);
  const isEditing = editingProposalId === proposal.id;

  const linkedProgramFromMap =
    proposal.id_programa != null && programsMap
      ? programsMap[String(proposal.id_programa)] || null
      : null;
  const linkedProgramEstadoFromRelation = proposal.programas?.estado || null;
  // Priorizar el estado reactivo proveniente del programsMap por sobre la relación anidada
  const estado = linkedProgramFromMap?.estado || linkedProgramEstadoFromRelation || null;
  const estadoBadgeLabel =
    estado || (proposal.id_programa != null ? `Prog #${proposal.id_programa}` : null);
  let borderClass = "border-slate-300";
  let bgClass = "bg-slate-50/40";
  if (estado === "Vigente") {
    borderClass = "border-emerald-300";
    bgClass = "bg-emerald-50/40";
  } else if (estado === "Pausada") {
    borderClass = "border-amber-300";
    bgClass = "bg-amber-50/40";
  }

  const resumenVentana =
    proposalFields[proposal.id]?.ventana_fechas ??
    proposal.ventana_fechas ??
    "";
  const resumenObs =
    proposalFields[proposal.id]?.observaciones ??
    proposal.observaciones ??
    "";

  const programDateRangeText = linkedProgramFromMap
    ? formatProgramDateRange(
        linkedProgramFromMap.fecha_desde,
        linkedProgramFromMap.fecha_hasta,
      )
    : "";

  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (event) => {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        setEditingProposalId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, setEditingProposalId]);

  return (
    <div
      ref={cardRef}
      className={`border ${borderClass} rounded-lg ${bgClass} shadow-xs p-3 space-y-2`}
    >
      {!isEditing && (
        <button
          type="button"
          className="w-full text-left space-y-1"
          onClick={() => setEditingProposalId(proposal.id)}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Nombre de programa
            </span>
            <div className="flex items-center gap-2">
              {estadoBadgeLabel && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${
                    estado === "Vigente"
                      ? "border-emerald-300 bg-emerald-50/40 text-emerald-700"
                      : estado === "Pausada"
                        ? "border-amber-300 bg-amber-50/40 text-amber-700"
                        : "border-slate-300 bg-slate-50/40 text-slate-700"
                  }`}
                >
                  {estadoBadgeLabel}
                </span>
              )}
              <span className="text-[10px] text-slate-300">
                ID #{proposal.id}
              </span>
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-800 truncate">
            {proposal.nombre_programa || "—"}
          </div>
          {(programDateRangeText || resumenVentana) && (
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                Ventana de fechas
              </span>
              {programDateRangeText && (
                <div className="text-[10px] text-slate-400 font-medium">
                  {programDateRangeText}
                </div>
              )}
              {resumenVentana && (
                <div
                  className="text-xs text-slate-700 line-clamp-1"
                  dangerouslySetInnerHTML={{
                    __html: resumenVentana,
                  }}
                />
              )}
            </div>
          )}
          {resumenObs && (
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                Observaciones internas
              </span>
              <div
                className="text-xs text-slate-700 line-clamp-1"
                dangerouslySetInnerHTML={{
                  __html: resumenObs,
                }}
              />
            </div>
          )}
        </button>
      )}

      {isEditing && (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Nombre de programa
              </label>
              <input
                type="text"
                defaultValue={proposal.nombre_programa || ""}
                onBlur={(e) =>
                  handleUpdateProposalField(
                    proposal.id,
                    "nombre_programa",
                    e.target.value,
                  )
                }
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-fixed-indigo-100 outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              {estadoBadgeLabel && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full border bg-white/70 text-slate-600 font-bold uppercase">
                  {estadoBadgeLabel}
                </span>
              )}
              <span className="text-[10px] text-slate-400 uppercase font-bold">
                ID #{proposal.id}
              </span>
              <button
                type="button"
                onClick={() => setEditingProposalId(null)}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
              >
                Cerrar
              </button>
            </div>
          </div>

          <div className="space-y-3 mt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Ventana de fechas (texto libre)
              </label>
              <RichTextEditor
                value={resumenVentana}
                onChange={(val) =>
                  handleUpdateProposalField(
                    proposal.id,
                    "ventana_fechas",
                    val,
                  )
                }
                placeholder="Ej: Enero - Marzo, semanas pares..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Observaciones internas
              </label>
              <RichTextEditor
                value={resumenObs}
                onChange={(val) =>
                  handleUpdateProposalField(
                    proposal.id,
                    "observaciones",
                    val,
                  )
                }
                placeholder="Notas, criterios de selección, etc."
              />
            </div>
          </div>
        </>
      )}

      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        {!proposal.id_programa ? (
          <>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Asociar o Crear Programa
              </span>
              <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <div className="flex-1">
                  <SearchableSelect
                    options={Object.values(programsMap || {}).map((p) => ({
                      id: p.id,
                      label: p.label,
                      subLabel: p.subLabel,
                    }))}
                    value={proposal.id_programa || ""}
                    onChange={(val) => handleAssociateProgram(proposal.id, val)}
                    placeholder="Buscar programa existente..."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onCreateProgramFromProposal(proposal, ensemble)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-full bg-fixed-indigo-600 text-white hover:bg-fixed-indigo-700"
                >
                  <IconPlus size={12} /> Crear Programa
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1 w-full">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">
              Programa asociado
            </span>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <div className="text-xs text-slate-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-1.5">
                    {programsMap[String(proposal.id_programa)]?.label ||
                      `Programa #${proposal.id_programa}`}
                  </div>
                  {programsMap[String(proposal.id_programa)] && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleEditProgramFromProposal(
                            programsMap[String(proposal.id_programa)],
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <IconEdit size={12} /> Editar programa
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <LinkedProgramPreview
                programId={proposal.id_programa}
                supabase={supabase}
                showGiraCards={showGiraCards}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const RepertoireCyclesTab = ({
  supabase,
  activeEnsembles,
  programasOptions,
  repertoireYear,
  setRepertoireYear,
  queryClient,
  onCreateProgramFromProposal,
  onEditProgram,
  isGlobalEditor,
  adminOptions,
  adminFilterIds,
  onChangeAdminFilterIds,
}) => {
  const [cycleComments, setCycleComments] = useState({});
  const [proposalFields, setProposalFields] = useState({});
  const [editingProposalId, setEditingProposalId] = useState(null);
  const [showGiraCards, setShowGiraCards] = useState(false);
  const [isCreateCycleModalOpen, setIsCreateCycleModalOpen] = useState(false);
  const [selectedEnsembleForCycle, setSelectedEnsembleForCycle] =
    useState(null);
  const [showEnsemblesPicker, setShowEnsemblesPicker] = useState(false);
  const [membersModal, setMembersModal] = useState({
    open: false,
    ensemble: null,
    members: [],
    loading: false,
  });

  const handleEditProgramFromProposal = (programMeta) => {
    if (!programMeta?.id || !onEditProgram) return;
    onEditProgram({ id: programMeta.id });
  };

  const handleOpenMembers = async (ensemble) => {
    if (!supabase || !ensemble?.id) return;
    setMembersModal({
      open: true,
      ensemble,
      members: [],
      loading: true,
    });
    try {
      // 1) Obtener los IDs de integrantes asociados al ensamble
      const hoyModal = toLocalDateString();
      const { data: rels, error: relError } = await supabase
        .from("integrantes_ensambles")
        .select("id_integrante, fecha_desde, fecha_hasta")
        .eq("id_ensamble", ensemble.id);
      if (relError) throw relError;

      const ids = (rels || [])
        .filter((r) => membershipActiveOnProgramDate(r, hoyModal))
        .map((r) => r.id_integrante)
        .filter(Boolean);
      if (ids.length === 0) {
        setMembersModal((prev) => ({
          ...prev,
          members: [],
          loading: false,
        }));
        return;
      }

      // 2) Traer datos de cada integrante (apellido, nombre, instrumento)
      const { data: membersData, error: membersError } = await supabase
        .from("integrantes")
        .select("id, apellido, nombre, instrumentos ( instrumento )")
        .in("id", ids)
        .order("apellido", { ascending: true });
      if (membersError) throw membersError;

      const members =
        membersData?.map((m) => ({
          id: m.id,
          apellido: m.apellido,
          nombre: m.nombre,
          instrumento:
            m.instrumentos?.instrumento?.trim() || "Instrumento no definido",
        })) || [];

      setMembersModal((prev) => ({
        ...prev,
        members,
        loading: false,
      }));
    } catch (e) {
      console.error("Error cargando integrantes del ensamble:", e);
      setMembersModal((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  const closeMembersModal = () =>
    setMembersModal({
      open: false,
      ensemble: null,
      members: [],
      loading: false,
    });

  const {
    data: availableYearsData = [],
    isLoading: loadingYears,
  } = useQuery({
    queryKey: [
      "repertoireYears",
      activeEnsembles.map((e) => e.id),
    ],
    enabled: activeEnsembles.length > 0,
    queryFn: async () => {
      const ensembleIds = activeEnsembles.map((e) => e.id);
      if (ensembleIds.length === 0) return [];
      const { data, error } = await supabase
        .from("ciclos_ensambles_anios")
        .select("anio")
        .in("id_ensamble", ensembleIds)
        .order("anio", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const uniqueYearOptions = Array.from(
    new Set(
      (availableYearsData || [])
        .map((y) => y.anio)
        .filter((y) => y != null),
    ),
  ).sort((a, b) => b - a);

  const {
    data: cyclesData = { cycles: [], proposals: [], programsMap: {} },
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      "repertoireCycles",
      activeEnsembles.map((e) => e.id),
      repertoireYear,
    ],
    enabled: activeEnsembles.length > 0 && !!repertoireYear,
    queryFn: async () => {
      const ensembleIds = activeEnsembles.map((e) => e.id);
      if (ensembleIds.length === 0) return { cycles: [], proposals: [], programsMap: {} };

      const { data: cycles, error: cyclesError } = await supabase
        .from("ciclos_ensambles_anios")
        .select("id, id_ensamble, anio, comentarios_generales")
        .in("id_ensamble", ensembleIds)
        .eq("anio", repertoireYear);
      if (cyclesError) throw cyclesError;

      const cycleIds = (cycles || []).map((c) => c.id);
      let proposals = [];
      if (cycleIds.length > 0) {
        const { data: propsData, error: propsError } = await supabase
          .from("ciclos_propuestas")
          .select(
            "id, id_ciclo, nombre_programa, ventana_fechas, observaciones, id_programa",
          )
          .in("id_ciclo", cycleIds);
        if (propsError) throw propsError;
        proposals = propsData || [];
      }

      // Cargar programas efectivamente usados por las propuestas (sin depender de relaciones/FKs)
      const usedProgramIds = Array.from(
        new Set(
          (proposals || [])
            .map((p) => p.id_programa)
            .filter((id) => id !== null && id !== undefined),
        ),
      );

      let programsMap = {};
      if (usedProgramIds.length > 0) {
        const { data: progsData, error: progsError } = await supabase
          .from("programas")
          .select(
            "id, nombre_gira, fecha_desde, fecha_hasta, mes_letra, nomenclador, estado, zona",
          )
          .in("id", usedProgramIds);
        if (progsError) throw progsError;

        (progsData || []).forEach((p) => {
          programsMap[String(p.id)] = {
            id: p.id,
            label: formatProgramSelectLabel(p),
            subLabel: p.fecha_desde
              ? `Inicio: ${format(parseLocalDate(p.fecha_desde), "dd/MM/yyyy")}`
              : "",
            estado: p.estado || "Borrador",
            fecha_desde: p.fecha_desde,
            fecha_hasta: p.fecha_hasta,
          };
        });
      }

      return { cycles: cycles || [], proposals, programsMap };
    },
  });

  const cycles = cyclesData.cycles;
  const proposals = cyclesData.proposals;
  const programsMap = cyclesData.programsMap || {};

  const handleCreateCycle = async (ensembleId) => {
    const { error } = await supabase.from("ciclos_ensambles_anios").insert([
      {
        id_ensamble: ensembleId,
        anio: repertoireYear,
      },
    ]);
    if (error) {
      toast.error("Error creando ciclo: " + error.message);
      return;
    }
    toast.success("Ciclo creado");
    queryClient.invalidateQueries({ queryKey: ["repertoireCycles"], exact: false });
  };

  const handleCreateCycleFromHeader = () => {
    if (activeEnsembles.length === 0) return;
    if (activeEnsembles.length === 1) {
      handleCreateCycle(activeEnsembles[0].id);
      return;
    }
    setSelectedEnsembleForCycle(
      activeEnsembles.find((e) => e.id === adminFilterIds?.[0]) ||
        activeEnsembles[0],
    );
    setIsCreateCycleModalOpen(true);
  };

  const handleCreateProposal = async (cycleId) => {
    const { error } = await supabase.from("ciclos_propuestas").insert([
      {
        id_ciclo: cycleId,
        nombre_programa: "Nuevo programa",
      },
    ]);
    if (error) {
      toast.error("Error creando propuesta: " + error.message);
      return;
    }
    toast.success("Propuesta creada");
    queryClient.invalidateQueries({ queryKey: ["repertoireCycles"], exact: false });
  };

  const handleUpdateProposalField = async (proposalId, field, value) => {
    setProposalFields((prev) => ({
      ...prev,
      [proposalId]: {
        ...(prev[proposalId] || {}),
        [field]: value,
      },
    }));
    const { error } = await supabase
      .from("ciclos_propuestas")
      .update({ [field]: value })
      .eq("id", proposalId);
    if (error) {
      console.error("Error guardando propuesta:", error);
      toast.error("Error guardando propuesta");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["repertoireCycles"], exact: false });
  };

  const handleAssociateProgram = async (proposalId, programId) => {
    await toast.promise(
      supabase
        .from("ciclos_propuestas")
        .update({ id_programa: programId })
        .eq("id", proposalId),
      {
        loading: "Guardando asociación...",
        success: "Programa asociado",
        error: "Error asociando programa",
      },
    );
    queryClient.invalidateQueries({ queryKey: ["repertoireCycles"], exact: false });
  };

  const handleUpdateCycleYear = async (cycleId, newYear) => {
    const parsed = parseInt(newYear, 10);
    if (!parsed || String(parsed).length !== 4) return;
    const { error } = await supabase
      .from("ciclos_ensambles_anios")
      .update({ anio: parsed })
      .eq("id", cycleId);
    if (error) {
      console.error("Error guardando año:", error);
      toast.error("Error guardando año");
      return;
    }
    setRepertoireYear(parsed);
    queryClient.invalidateQueries({ queryKey: ["repertoireCycles"], exact: false });
  };

  const handleUpdateCycleComments = async (cycleId, value) => {
    setCycleComments((prev) => ({ ...prev, [cycleId]: value }));
    const { error } = await supabase
      .from("ciclos_ensambles_anios")
      .update({ comentarios_generales: value })
      .eq("id", cycleId);
    if (error) {
      console.error("Error guardando comentarios:", error);
      toast.error("Error guardando comentarios");
      return;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-4 flex-1 min-w-0">
          <div className="flex flex-col gap-1 min-w-[220px]">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              Ensambles
            </span>
            {isGlobalEditor ? (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setShowEnsemblesPicker((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                >
                  <IconFilter size={12} className="text-slate-500" />
                  <span>
                    {adminFilterIds && adminFilterIds.length > 0
                      ? `Filtrando ${adminFilterIds.length} ensamble${
                          adminFilterIds.length > 1 ? "s" : ""
                        }`
                      : "Elegir ensambles..."}
                  </span>
                  <IconChevronDown
                    size={10}
                    className={`transition-transform ${
                      showEnsemblesPicker ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showEnsemblesPicker && (
                  <div className="w-72 max-w-full mt-1 border border-slate-200 rounded-lg bg-white shadow-lg p-2">
                    <MultiSelect
                      placeholder="Elegí uno o varios ensambles..."
                      options={adminOptions}
                      selectedIds={adminFilterIds}
                      onChange={(ids) => {
                        const next = Array.isArray(ids) ? ids : [];
                        onChangeAdminFilterIds(next);
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-1 flex-wrap">
                {activeEnsembles.map((e) => (
                  <span
                    key={e.id}
                    className="text-[10px] font-bold px-2 py-0.5 bg-white text-slate-600 rounded border border-slate-200 shadow-sm flex items-center gap-1 whitespace-nowrap"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                    {e.ensamble}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              Año
            </span>
            <div className="flex items-center gap-2">
              <select
                value={
                  uniqueYearOptions.includes(Number(repertoireYear))
                    ? Number(repertoireYear)
                    : repertoireYear || ""
                }
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (val && String(val).length === 4) {
                    setRepertoireYear(val);
                  }
                }}
                className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
              >
                {!repertoireYear && (
                  <option value="">
                    {loadingYears ? "Cargando años..." : "Elegir año"}
                  </option>
                )}
                {uniqueYearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
                {repertoireYear &&
                  !uniqueYearOptions.includes(Number(repertoireYear)) && (
                    <option value={repertoireYear}>{repertoireYear}</option>
                  )}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGiraCards((prev) => !prev)}
            className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            {showGiraCards ? (
              <IconEyeOff size={12} className="text-slate-500" />
            ) : (
              <IconEye size={12} className="text-slate-500" />
            )}
            <span>
              {showGiraCards ? "Ocultar programas" : "Ver programas"}
            </span>
          </button>
          <button
            type="button"
            onClick={handleCreateCycleFromHeader}
            className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-full bg-fixed-indigo-600 text-white hover:bg-fixed-indigo-700"
          >
            <IconPlus size={12} /> Nuevo ciclo
          </button>
        </div>
      </div>

      {isCreateCycleModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-2">
              Crear ciclo para ensamble
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Seleccioná el ensamble al que querés asignar el ciclo {repertoireYear}.
            </p>
            <div className="mb-3">
              <SearchableSelect
                options={activeEnsembles.map((e) => ({
                  id: e.id,
                  label: e.ensamble,
                }))}
                value={selectedEnsembleForCycle?.id || ""}
                onChange={(id) => {
                  const found = activeEnsembles.find((e) => e.id === id);
                  setSelectedEnsembleForCycle(found || null);
                }}
                placeholder="Elegí un ensamble..."
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsCreateCycleModalOpen(false)}
                className="px-3 py-1 text-[11px] font-bold rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedEnsembleForCycle) {
                    handleCreateCycle(selectedEnsembleForCycle.id);
                    setIsCreateCycleModalOpen(false);
                  }
                }}
                disabled={!selectedEnsembleForCycle}
                className="px-3 py-1 text-[11px] font-bold rounded-full bg-fixed-indigo-600 text-white hover:bg-fixed-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear ciclo
              </button>
            </div>
          </div>
        </div>
      )}

      {activeEnsembles.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          No hay ensambles activos para gestionar.
        </div>
      )}

      <div className="space-y-3">
        {activeEnsembles.map((ens) => {
          const cycle = cycles.find((c) => c.id_ensamble === ens.id);
          const cycleProposals = proposals
            .filter((p) => p.id_ciclo === cycle?.id)
            .slice()
            .sort((a, b) => {
              const progA = a.id_programa
                ? programsMap[String(a.id_programa)]
                : null;
              const progB = b.id_programa
                ? programsMap[String(b.id_programa)]
                : null;

              const dA =
                progA?.fecha_desde || progA?.fecha_hasta || null;
              const dB =
                progB?.fecha_desde || progB?.fecha_hasta || null;

              const dateA = dA ? parseLocalDate(dA) : null;
              const dateB = dB ? parseLocalDate(dB) : null;

              if (!dateA && !dateB) {
                // si ninguno tiene programa/fecha, mantener orden original
                return 0;
              }
              if (!dateA) return 1; // sin programa/fecha al final
              if (!dateB) return -1;

              // Orden cronológico: primero lo más antiguo, luego lo posterior
              return dateA.getTime() - dateB.getTime();
            });
          const cycleCommentsValue =
            cycle && cycleComments[cycle.id] !== undefined
              ? cycleComments[cycle.id]
              : cycle?.comentarios_generales || "";

          return (
            <div
              key={ens.id}
              className="border border-slate-200 rounded-lg bg-slate-50/60 overflow-hidden"
            >
              <div className="px-4 py-2 bg-white flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <IconMusic size={14} className="text-fixed-indigo-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-bold text-slate-800">
                        {ens.ensamble}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenMembers(ens)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                        title="Ver integrantes actuales del ensamble"
                      >
                        Integrantes
                      </button>
                    </div>
                    {cycle ? (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase mt-0.5">
                        <span>Ciclo</span>
                        <input
                          type="number"
                          className="w-16 border border-slate-300 rounded px-1 py-0.5 text-[10px] bg-white"
                          defaultValue={cycle.anio}
                          onBlur={(e) =>
                            handleUpdateCycleYear(cycle.id, e.target.value)
                          }
                        />
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 uppercase mt-0.5">
                        Ciclo {repertoireYear}
                      </div>
                    )}
                  </div>
                </div>
                {!cycle && (
                  <button
                    type="button"
                    onClick={() => handleCreateCycle(ens.id)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-full bg-fixed-indigo-50 text-fixed-indigo-700 border border-fixed-indigo-200 hover:bg-fixed-indigo-100"
                  >
                    <IconPlus size={12} /> Crear ciclo
                  </button>
                )}
              </div>

              {cycle ? (
                <div className="p-3 space-y-3 bg-white/60">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Comentarios Generales del Año
                    </label>
                    <RichTextEditor
                      value={cycleCommentsValue}
                      onChange={(val) => handleUpdateCycleComments(cycle.id, val)}
                      placeholder="Notas o lineamientos generales para este año..."
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-slate-500">
                      Propuestas de programa para este ensamble en {repertoireYear}.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCreateProposal(cycle.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    >
                      <IconPlus size={12} /> Nueva propuesta
                    </button>
                  </div>

                  {cycleProposals.length === 0 ? (
                    <div className="text-center text-[11px] text-slate-400 py-4 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                      Sin propuestas aún.
                    </div>
                  ) : (
                    <div className="space-y-3">
                  {cycleProposals.map((p) => {
                        const isEditing = editingProposalId === p.id;
                        const resumenVentana =
                          proposalFields[p.id]?.ventana_fechas ??
                          p.ventana_fechas ??
                          "";
                        const resumenObs =
                          proposalFields[p.id]?.observaciones ??
                          p.observaciones ??
                          "";

                        const linkedProgramFromMap =
                          p.id_programa != null && programsMap
                            ? programsMap[String(p.id_programa)] || null
                            : null;
                        const rawEstado = linkedProgramFromMap?.estado || null;
                        const programDateRangeText = linkedProgramFromMap
                          ? formatProgramDateRange(
                              linkedProgramFromMap.fecha_desde,
                              linkedProgramFromMap.fecha_hasta,
                            )
                          : "";
                        const estado =
                          typeof rawEstado === "string" && rawEstado.length > 0
                            ? rawEstado
                            : null;
                        const estadoBadgeLabel =
                          estado ||
                          (p.id_programa != null ? `Prog #${p.id_programa}` : null);
                        let borderClass = "border-slate-300";
                        let bgClass = "bg-slate-50/40";
                        if (estado === "Vigente") {
                          borderClass = "border-emerald-300";
                          bgClass = "bg-emerald-50/40";
                        } else if (estado === "Pausada") {
                          borderClass = "border-amber-300";
                          bgClass = "bg-amber-50/40";
                        }

                        return (
                          <div
                            key={p.id}
                            className={`border ${borderClass} rounded-lg ${bgClass} shadow-xs p-3 space-y-2`}
                          >
                            {!isEditing && (
                              <button
                                type="button"
                                className="w-full text-left space-y-1"
                                onClick={() => setEditingProposalId(p.id)}
                              >
                              <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    Nombre de programa
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {estadoBadgeLabel && (
                                      <span
                                        className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${
                                          estado === "Vigente"
                                            ? "border-emerald-300 bg-emerald-50/40 text-emerald-700"
                                            : estado === "Pausada"
                                              ? "border-amber-300 bg-amber-50/40 text-amber-700"
                                              : "border-slate-300 bg-slate-50/40 text-slate-700"
                                        }`}
                                      >
                                        {estadoBadgeLabel}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-300">
                                      ID #{p.id}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-xs font-semibold text-slate-800 truncate">
                                  {p.nombre_programa || "—"}
                                </div>
                                {(programDateRangeText || resumenVentana) && (
                                  <div>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                      Ventana de fechas
                                    </span>
                                    {programDateRangeText && (
                                      <div className="text-[10px] text-slate-400 font-medium">
                                        {programDateRangeText}
                                      </div>
                                    )}
                                    {resumenVentana && (
                                      <div
                                        className="text-xs text-slate-700 line-clamp-1"
                                        dangerouslySetInnerHTML={{
                                          __html: resumenVentana,
                                        }}
                                      />
                                    )}
                                  </div>
                                )}
                                {resumenObs && (
                                  <div>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                      Observaciones internas
                                    </span>
                                    <div
                                      className="text-xs text-slate-700 line-clamp-1"
                                      dangerouslySetInnerHTML={{
                                        __html: resumenObs,
                                      }}
                                    />
                                  </div>
                                )}
                              </button>
                            )}

                            {isEditing && (
                              <>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                      Nombre de programa
                                    </label>
                                    <input
                                      type="text"
                                      defaultValue={p.nombre_programa || ""}
                                      onBlur={(e) =>
                                        handleUpdateProposalField(
                                          p.id,
                                          "nombre_programa",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-fixed-indigo-100 outline-none"
                                    />
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">
                                      ID #{p.id}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setEditingProposalId(null)}
                                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                                    >
                                      Cerrar
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-3 mt-2">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                      Ventana de fechas (texto libre)
                                    </label>
                                    <RichTextEditor
                                      value={resumenVentana}
                                      onChange={(val) =>
                                        handleUpdateProposalField(
                                          p.id,
                                          "ventana_fechas",
                                          val,
                                        )
                                      }
                                      placeholder="Ej: Enero - Marzo, semanas pares..."
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                      Observaciones internas
                                    </label>
                                    <RichTextEditor
                                      value={resumenObs}
                                      onChange={(val) =>
                                        handleUpdateProposalField(
                                          p.id,
                                          "observaciones",
                                          val,
                                        )
                                      }
                                      placeholder="Notas, criterios de selección, etc."
                                    />
                                  </div>
                                </div>
                              </>
                            )}

                            <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                            {!p.id_programa ? (
                              <>
                                  <div className="flex-1 flex flex-col gap-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    Asociar o Crear Programa
                                  </span>
                                  <div className="flex flex-col md:flex-row gap-2 md:items-center">
                                    <div className="flex-1">
                                      <SearchableSelect
                                        options={programasOptions.map((opt) => ({
                                          id: opt.id,
                                          label: opt.label,
                                          subLabel: opt.subLabel,
                                        }))}
                                        value={p.id_programa || ""}
                                        onChange={(val) =>
                                          handleAssociateProgram(p.id, val)
                                        }
                                        placeholder="Buscar programa existente..."
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onCreateProgramFromProposal(p, ens)
                                      }
                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-full bg-fixed-indigo-600 text-white hover:bg-fixed-indigo-700"
                                    >
                                      <IconPlus size={12} /> Crear Programa
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col gap-1 w-full">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase">
                                  Programa asociado
                                </span>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="text-xs text-slate-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-1.5 flex-1">
                      {programsMap[String(p.id_programa)]?.label ||
                        `Programa #${p.id_programa}`}
                    </div>
                    {programsMap[String(p.id_programa)] && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            handleEditProgramFromProposal(
                              programsMap[String(p.id_programa)],
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <IconEdit size={12} /> Editar programa
                        </button>
                      </div>
                    )}
                  </div>
                                  <LinkedProgramPreview
                                    programId={p.id_programa}
                                    supabase={supabase}
                                showGiraCards={showGiraCards}
                                  />
                                </div>
                              </div>
                            )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 text-[11px] text-slate-400 bg-slate-50">
                  Crea el ciclo anual para empezar a cargar propuestas.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {membersModal.open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <div className="text-[11px] font-bold uppercase text-slate-400">
                  Integrantes actuales del ensamble
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {membersModal.ensemble?.ensamble || ""}
                </div>
              </div>
              <button
                type="button"
                onClick={closeMembersModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {membersModal.loading ? (
                <div className="flex items-center justify-center text-xs text-slate-500 gap-2 py-6">
                  <IconLoader className="animate-spin text-indigo-600" size={16} />
                  Cargando integrantes...
                </div>
              ) : membersModal.members.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                  Este ensamble no tiene integrantes asignados actualmente.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 text-xs">
                  {membersModal.members.map((m) => (
                    <li
                      key={m.id}
                      className="py-1.5 flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-700">
                        {m.apellido}, {m.nombre}
                      </span>
                      <span className="text-[11px] text-slate-500 italic">
                        {m.instrumento}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// --- COMPONENTE PRINCIPAL ---
export default function EnsembleCoordinatorView({ supabase }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const persistedUiState = getCoordinatorUiState(user?.id);
  const hydratedUiUserRef = useRef(null);
  const suppressNextUiPersistRef = useRef(false);

  // Estados de Contexto
  const [loading, setLoading] = useState(true);
  const [allEnsembles, setAllEnsembles] = useState([]);
  const [myEnsembles, setMyEnsembles] = useState([]);
  const [rawRelationships, setRawRelationships] = useState([]);
  const [adminFilterIds, setAdminFilterIds] = useState(
    () => persistedUiState?.adminFilterIds || [],
  );
  const [ensembleTooltipMap, setEnsembleTooltipMap] = useState({});
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [feriados, setFeriados] = useState([]);
  // Listas para Selectores
  const [locationsList, setLocationsList] = useState([]);
  const [eventTypesList, setEventTypesList] = useState([]);
  const [ensamblesOptions, setEnsamblesOptions] = useState([]);
  const [membersOptions, setMembersOptions] = useState([]);
  const [isGiraModalOpen, setIsGiraModalOpen] = useState(false);
  const [repertoireYear, setRepertoireYear] = useState(
    () => persistedUiState?.repertoireYear || new Date().getFullYear(),
  );
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    id: null,
    ids: null,
    message: "",
    messageIsHtml: false,
    hasLogisticsLinks: false,
  });
  const [giraFormData, setGiraFormData] = useState({
    nombre_gira: "",
    subtitulo: "",
    tipo: "Ensamble",
    fecha_desde: "",
    fecha_hasta: "",
    estado: "Borrador",
    zona: "",
    token_publico: null,
    otros_comentarios: "",
  });

  // Necesitamos este estado adicional para que GiraForm gestione los ensambles seleccionados
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState(new Set());
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [editingProgram, setEditingProgram] = useState(null);
  const [proposalToLink, setProposalToLink] = useState(null);

  // Efecto para preseleccionar tu ensamble cuando se abre el modal
  useEffect(() => {
    if (
      isGiraModalOpen &&
      myEnsembles.length > 0 &&
      selectedSources.length === 0
    ) {
      // Preseleccionamos los ensambles que el usuario coordina
      const initialSources = myEnsembles.map((e) => ({
        tipo: "ENSAMBLE",
        valor_id: e.id.toString(),
        label: e.ensamble,
      }));
      setSelectedSources(initialSources);
    }
  }, [isGiraModalOpen, myEnsembles]);
  const handleSaveGira = async () => {
    try {
      const { otros_comentarios, ...programPayload } = giraFormData;
      // 1. Insertar la Gira/Programa
      const { data: newGira, error: giraError } = await supabase
        .from("programas")
        .insert([programPayload])
        .select()
        .single();

      if (giraError) throw giraError;

      // 2. Insertar las fuentes (Ensambles seleccionados)
      if (selectedSources.length > 0) {
        const sourcesPayload = selectedSources.map((s) => ({
          id_gira: newGira.id,
          tipo: s.tipo,
          valor_id: s.valor_id,
          valor_texto: s.label,
        }));

        const { error: sourcesError } = await supabase
          .from("giras_fuentes")
          .insert(sourcesPayload);

        if (sourcesError) throw sourcesError;
      }

      // 3. Si estamos creando desde una propuesta de ciclo, vincularla
      if (proposalToLink && newGira?.id) {
        const { error: linkError } = await supabase
          .from("ciclos_propuestas")
          .update({ id_programa: newGira.id })
          .eq("id", proposalToLink);
        if (linkError) throw linkError;
        setProposalToLink(null);
        queryClient.invalidateQueries({
          queryKey: ["repertoireCycles"],
          exact: false,
        });
      }

      toast.success("Programa creado correctamente");
      setIsGiraModalOpen(false);
      refreshData();
      setSelectedSources([]); // Limpiamos para la próxima
    } catch (error) {
      toast.error("Error al crear: " + error.message);
    }
  };

  const handleEditProgram = useCallback(
    async (program) => {
      if (!supabase || !program?.id) return;
      try {
        const [progRes, locRes, fuentesRes, staffRes, difusionRes] = await Promise.all([
          supabase
            .from("programas")
            .select("*")
            .eq("id", program.id)
            .single(),
          supabase
            .from("giras_localidades")
            .select("id_localidad")
            .eq("id_gira", program.id),
          supabase
            .from("giras_fuentes")
            .select("id_gira, tipo, valor_id, valor_texto")
            .eq("id_gira", program.id),
          supabase
            .from("giras_integrantes")
            .select("id_integrante, rol, integrantes(apellido, nombre)")
            .eq("id_gira", program.id)
            .in("rol", ["director", "solista"]),
          supabase
            .from("gira_difusion")
            .select("otros_comentarios")
            .eq("id_gira", program.id)
            .maybeSingle(),
        ]);

        const gira = progRes.data;
        if (progRes.error || !gira) {
          toast.error("No se pudo cargar el programa");
          return;
        }

        setGiraFormData({
          nombre_gira: gira.nombre_gira ?? "",
          subtitulo: gira.subtitulo ?? "",
          tipo: gira.tipo ?? "Ensamble",
          fecha_desde: gira.fecha_desde ?? "",
          fecha_hasta: gira.fecha_hasta ?? "",
          estado: gira.estado ?? "Borrador",
          zona: gira.zona ?? "",
          token_publico: gira.token_publico ?? null,
          nomenclador: gira.nomenclador ?? "",
          notificaciones_habilitadas: gira.notificaciones_habilitadas !== false,
          otros_comentarios: difusionRes.data?.otros_comentarios ?? "",
        });

        setSelectedLocations(
          locRes.data
            ? new Set(locRes.data.map((d) => d.id_localidad))
            : new Set(),
        );

        const fuentes = (fuentesRes.data || []).map((f) => {
          let label = f.valor_texto;
          if (f.tipo === "ENSAMBLE") {
            const found = allEnsembles.find(
              (e) => String(e.id) === String(f.valor_id),
            );
            label = found ? found.ensamble : `Ensamble ${f.valor_id}`;
          }
          return {
            tipo: f.tipo,
            valor_id: f.valor_id,
            valor_texto: f.valor_texto,
            label,
          };
        });
        setSelectedSources(fuentes);

        const staff = (staffRes.data || []).map((i) => ({
          id_integrante: i.id_integrante,
          rol: i.rol,
          label: i.integrantes
            ? `${i.integrantes.apellido}, ${i.integrantes.nombre}`
            : "Desconocido",
        }));
        setSelectedStaff(staff);

        setEditingProgram(program);
      } catch (err) {
        console.error("[EnsembleCoordinator] handleEditProgram:", err);
        toast.error("Error al cargar el programa: " + (err?.message ?? err));
      }
    },
    [supabase, allEnsembles],
  );

  // UI States
  const [activeTab, setActiveTab] = useState(
    () => persistedUiState?.activeTab || "ensayos",
  );
  const [programTypeFilter, setProgramTypeFilter] = useState(
    () => persistedUiState?.programTypeFilter || "ALL",
  );
  const [programDateFilter, setProgramDateFilter] = useState({
    start: persistedUiState?.programDateFilter?.start || toLocalDateString(),
    end: persistedUiState?.programDateFilter?.end || "",
  });
  const [showRepertoireInCards, setShowRepertoireInCards] = useState(
    () => persistedUiState?.showRepertoireInCards || false,
  );
  const [showOverlapOptions, setShowOverlapOptions] = useState(false);
  const [overlapCategories, setOverlapCategories] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const refreshLocations = async () => {
    const { data } = await supabase
      .from("locaciones")
      .select("id, nombre, localidades(localidad)")
      .order("nombre");
    if (data) setLocationsList(data);
  };
  // FILTRO DE FECHAS (LISTA PRINCIPAL) — uso de hora local para evitar desfase en UTC-3
  const [dateFilter, setDateFilter] = useState({
    start: persistedUiState?.dateFilter?.start || toLocalDateString(),
    end: persistedUiState?.dateFilter?.end || "",
  });

  // Estado para Menú de Herramientas Móvil
  const [showMobileTools, setShowMobileTools] = useState(false);
  const mobileToolsRef = useRef(null);
  const calendarExportRef = useRef(null);
  const listScrollRef = useRef(null);
  const [listScrollElement, setListScrollElement] = useState(null);
  const attachListScrollRef = useCallback((node) => {
    listScrollRef.current = node;
    setListScrollElement(node);
  }, []);
  useClickOutside(mobileToolsRef, () => setShowMobileTools(false));

  // --- ESTADOS PARA PERSISTENCIA DEL CALENDARIO ---
  const [viewDate, setViewDate] = useState(() => {
    const persistedDate = persistedUiState?.viewDate;
    if (!persistedDate) return new Date();
    const parsed = new Date(persistedDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  });
  const [currentView, setCurrentView] = useState(
    () => persistedUiState?.currentView || "week",
  );

  // ESTADO PARA MODAL RÁPIDO
  const [viewingEvent, setViewingEvent] = useState(null);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMassiveModalOpen, setIsMassiveModalOpen] = useState(false);
  const [isEnsayosReportModalOpen, setIsEnsayosReportModalOpen] =
    useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Selección
  const [selectedIds, setSelectedIds] = useState([]);
  const [listProgramFilterIds, setListProgramFilterIds] = useState(
    () => persistedUiState?.listProgramFilterIds || [],
  );
  const [showListProgramFilter, setShowListProgramFilter] = useState(false);
  /** Índice en la lista visible para Shift+clic (rango consecutivo). */
  const lastSelectedRehearsalIndexRef = useRef(null);
  const shiftKeyHeldRef = useRef(false);
  const [showSmartSelect, setShowSmartSelect] = useState(false);
  const [smartFilter, setSmartFilter] = useState({
    days: [],
    start: "",
    end: "",
  });

  // Picker de ensambles para admins / coordinadores en el header principal
  const [showHeaderEnsemblesPicker, setShowHeaderEnsemblesPicker] =
    useState(false);

  // Bulk Edit
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkFormData, setBulkFormData] = useState({
    day: "",
    startTime: "",
    endTime: "",
    locationId: "",
    eventTypeId: "",
    description: "",
    ensambles: [],
    programas: [],
    customAttendance: [],
  });
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    if (hydratedUiUserRef.current === user.id) return;

    const saved = getCoordinatorUiState(user.id);
    if (saved) {
      suppressNextUiPersistRef.current = true;
      setAdminFilterIds(saved.adminFilterIds || []);
      setRepertoireYear(saved.repertoireYear || new Date().getFullYear());
      setActiveTab(saved.activeTab || "ensayos");
      setProgramTypeFilter(saved.programTypeFilter || "ALL");
      setProgramDateFilter({
        start: saved.programDateFilter?.start || toLocalDateString(),
        end: saved.programDateFilter?.end || "",
      });
      setShowRepertoireInCards(Boolean(saved.showRepertoireInCards));
      setDateFilter({
        start: saved.dateFilter?.start || toLocalDateString(),
        end: saved.dateFilter?.end || "",
      });
      if (saved.viewDate) {
        const parsed = new Date(saved.viewDate);
        if (!Number.isNaN(parsed.getTime())) setViewDate(parsed);
      }
      setCurrentView(saved.currentView || "week");
      setListProgramFilterIds(saved.listProgramFilterIds || []);
    }

    hydratedUiUserRef.current = user.id;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (hydratedUiUserRef.current !== user.id) return;
    if (suppressNextUiPersistRef.current) {
      suppressNextUiPersistRef.current = false;
      return;
    }

    setCoordinatorUiState(user?.id, {
      adminFilterIds,
      repertoireYear,
      activeTab,
      programTypeFilter,
      programDateFilter,
      showRepertoireInCards,
      dateFilter,
      viewDate: viewDate?.toISOString?.() || null,
      currentView,
      listProgramFilterIds,
    });
  }, [
    user?.id,
    adminFilterIds,
    repertoireYear,
    activeTab,
    programTypeFilter,
    programDateFilter,
    showRepertoireInCards,
    dateFilter,
    viewDate,
    currentView,
    listProgramFilterIds,
  ]);

  // Roles con acceso global de edición de ciclos y programación de repertorio
  // Incluye rol específico "curador" para curaduría de repertorio en todos los ensambles
  const editorRoles = ["admin", "editor", "curador", "coord_general", "director"];
  const userRoles = (() => {
    const r = user?.rol_sistema;
    if (r == null) return [];
    if (Array.isArray(r))
      return r.map((x) => String(x).toLowerCase().trim()).filter(Boolean);
    return [String(r).toLowerCase().trim()];
  })();
  const isGlobalEditor = userRoles.some((role) => editorRoles.includes(role));

  const isSuperUser =
    userRoles.includes("admin") ||
    userRoles.includes("produccion_general") ||
    userRoles.includes("curador");

  // Coordinador general puede ver/gestionar todos los ensambles para filtrar.
  const canSelectAllEnsembles = isSuperUser || userRoles.includes("coord_general");

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Shift") shiftKeyHeldRef.current = true;
    };
    const onKeyUp = (e) => {
      if (e.key === "Shift") shiftKeyHeldRef.current = false;
    };
    const clearShift = () => {
      shiftKeyHeldRef.current = false;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") shiftKeyHeldRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearShift);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearShift);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // --- CARGA DE DATOS ESTÁTICOS ---
  useEffect(() => {
    const fetchContext = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const today = toLocalDateString();

        const [cats, locs, types, mems, feriadosData] = await Promise.all([
          supabase
            .from("categorias_tipos_eventos")
            .select("id, nombre")
            .order("nombre"),
          supabase
            .from("locaciones")
            .select("id, nombre, localidades(localidad)")
            .order("nombre"),
          supabase
            .from("tipos_evento")
            .select("id, nombre, color, id_categoria")
            .order("nombre"),
          supabase
            .from("integrantes")
            .select("id, nombre, apellido")
            .order("apellido"),
          supabase
            .from("feriados")
            .select("*")
            .order("fecha", { ascending: true }),
        ]);

        setCategoryOptions(
          cats.data?.map((c) => ({ id: c.id, label: c.nombre })) || [],
        );
        setLocationsList(locs.data || []);
        setEventTypesList(types.data || []);
        setMembersOptions(
          (mems.data || []).map((m) => ({
            id: m.id,
            label: `${m.apellido}, ${m.nombre}`,
          })),
        );
        setFeriados(feriadosData.data || []);

        const { data: globalEnsembles } = await supabase
          .from("ensambles")
          .select("id, ensamble, descripcion")
          .order("ensamble");

        setAllEnsembles(globalEnsembles || []);

        let ensemblesToManage = [];
        if (canSelectAllEnsembles) {
          // Admin / coordinador general: puede gestionar todos los que acabamos de bajar
          ensemblesToManage = globalEnsembles || [];
        } else {
          // Coordinador "normal": solo los que tiene asignados
          const { data: coordData } = await supabase
            .from("ensambles_coordinadores")
            .select(`id_ensamble, ensambles ( id, ensamble, descripcion )`)
            .eq("id_integrante", user.id);
          ensemblesToManage = coordData
            ? coordData.map((c) => c.ensambles).filter(Boolean)
            : [];
        }
        setMyEnsembles(ensemblesToManage);
        // Por defecto, mostramos "todos" los ensambles que gestiona el usuario.
        // Así el multiselect colapsado puede renderizar los chips sin confundir con "Elegir...".
        setAdminFilterIds((prev) =>
          prev?.length > 0
            ? normalizeEnsembleIdList(prev)
            : normalizeEnsembleIdList(
                getDefaultSelectedEnsembleIds(ensemblesToManage),
              ),
        );
        setEnsamblesOptions(
          ensemblesToManage.map((e) => ({ id: e.id, label: e.ensamble })),
        );

        if (ensemblesToManage.length > 0) {
          const ids = ensemblesToManage.map((e) => e.id);
          const { data: relData } = await supabase
            .from("integrantes_ensambles")
            .select("id_integrante, id_ensamble, fecha_desde, fecha_hasta")
            .in("id_ensamble", ids);
          setRawRelationships(relData || []);

          // Tooltip por ensamble: integrantes + instrumento
          // (para mostrar en filtros "plegado" y "desplegado" al hacer hover).
          const { data: ensCoordRels, error: ensCoordsError } =
            await supabase
              .from("ensambles_coordinadores")
              .select("id_ensamble, integrantes(apellido, nombre)")
              .in("id_ensamble", ids);

          if (ensCoordsError) throw ensCoordsError;

          const coordMap = {};
          (ensCoordRels || []).forEach((r) => {
            const ensembleId = r?.id_ensamble;
            const ap = r?.integrantes?.apellido;
            const nom = r?.integrantes?.nombre;
            if (!ensembleId || !ap || !nom) return;
            const entry = `${ap}, ${nom} (coord.)`;
            if (!coordMap[ensembleId]) coordMap[ensembleId] = [];
            coordMap[ensembleId].push(entry);
          });

          const { data: ensMemberRels, error: ensMembersError } = await supabase
            .from("integrantes_ensambles")
            .select(
              "id_ensamble, fecha_desde, fecha_hasta, integrantes(apellido, nombre, instrumentos ( instrumento ))",
            )
            .in("id_ensamble", ids);

          if (ensMembersError) throw ensMembersError;

          const hoyTip = toLocalDateString();
          const memberMap = {};
          (ensMemberRels || []).forEach((r) => {
            if (!membershipActiveOnProgramDate(r, hoyTip)) return;
            const ensembleId = r?.id_ensamble;
            const ap = r?.integrantes?.apellido;
            const nom = r?.integrantes?.nombre;
            const inst = r?.integrantes?.instrumentos?.instrumento;
            if (!ensembleId || !ap || !nom) return;
            const entry = inst
              ? `${ap}, ${nom} (${String(inst).trim()})`
              : `${ap}, ${nom}`;
            if (!memberMap[ensembleId]) memberMap[ensembleId] = [];
            memberMap[ensembleId].push(entry);
          });

          Object.keys(coordMap).forEach((ensembleId) => {
            coordMap[ensembleId].sort((a, b) => a.localeCompare(b));
          });
          Object.keys(memberMap).forEach((ensembleId) => {
            memberMap[ensembleId].sort((a, b) => a.localeCompare(b));
          });

          // Tooltip final: arriba coordinadores, luego integrantes (con salto si hay ambos)
          const tooltipMap = {};
          ids.forEach((ensembleId) => {
            const coords = coordMap[ensembleId] || [];
            const members = memberMap[ensembleId] || [];
            const spacer = coords.length > 0 && members.length > 0 ? [""] : [];
            tooltipMap[ensembleId] = [...coords, ...spacer, ...members].join(
              "\n",
            );
          });

          setEnsembleTooltipMap(tooltipMap);
        }
      } catch (error) {
        console.error("Error context:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContext();
  }, [user, supabase, isSuperUser]);

  const canUseEnsembleFilter = canSelectAllEnsembles || myEnsembles.length > 0;

  const adminFilterIdSet = useMemo(
    () => new Set(normalizeEnsembleIdList(adminFilterIds)),
    [adminFilterIds],
  );

  const activeEnsembles = useMemo(() => {
    if (canUseEnsembleFilter) {
      if (adminFilterIdSet.size === 0) return [];
      return myEnsembles.filter((e) => adminFilterIdSet.has(Number(e.id)));
    }
    return myEnsembles;
  }, [canUseEnsembleFilter, adminFilterIdSet, myEnsembles]);

  const activeEnsembleIdsKey = useMemo(
    () =>
      activeEnsembles
        .map((e) => Number(e.id))
        .filter((id) => Number.isFinite(id))
        .sort((a, b) => a - b),
    [activeEnsembles],
  );

  const activeMembersSet = useMemo(() => {
    const activeEnsembleIds = new Set(activeEnsembles.map((e) => e.id));
    const todayStr = toLocalDateString();
    const memberIds = rawRelationships
      .filter(
        (r) =>
          activeEnsembleIds.has(r.id_ensamble) &&
          membershipActiveOnProgramDate(r, todayStr),
      )
      .map((r) => integranteKey(r.id_integrante))
      .filter(Boolean);
    return new Set(memberIds);
  }, [activeEnsembles, rawRelationships]);

  const activeMemberIdsArray = useMemo(
    () => Array.from(activeMembersSet),
    [activeMembersSet],
  );

  const activeEnsembleIds = useMemo(
    () => activeEnsembles.map((e) => e.id),
    [activeEnsembles],
  );

  const {
    programs,
    programasOptions,
    isLoading: programsLoading,
  } = useCoordinatorPrograms(supabase, {
    ensembleIds: activeEnsembleIds,
    memberIds: activeMemberIdsArray,
    enabled: activeEnsembles.length > 0,
  });

  const locationSelectOptions = useMemo(
    () =>
      (locationsList || []).map((l) => ({
        id: l.id,
        label: `${l.nombre} (${l.localidades?.localidad || "Sin localidad"})`,
        originalName: l.nombre,
      })),
    [locationsList],
  );

  // --- QUERY: ENSAYOS + SUPERPOSICIONES ---
  const {
    data: rehearsals = [],
    isPending: rehearsalsPending,
    isFetching: rehearsalsFetching,
  } = useQuery({
    queryKey: [
      "rehearsals",
      activeEnsembleIdsKey,
      dateFilter.start,
      dateFilter.end,
      overlapCategories,
    ],
    enabled: activeEnsembles.length > 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const ensembleIds = activeEnsembles.map((e) => e.id);

      const today = toLocalDateString();

      // PROGRAMAS RELEVANTES SEGÚN MÚSICOS ACTIVOS (participación real en giras)
      const candidateProgramIds = new Set();

      if (activeMemberIdsArray.length > 0) {
        const { data: memberPrograms } = await supabase
          .from("giras_integrantes")
          .select("id_gira")
          .in("id_integrante", activeMemberIdsArray);

        memberPrograms?.forEach((mp) => candidateProgramIds.add(mp.id_gira));
      }

      // CONFIGURACIÓN DE FECHAS
      let queryMyRehearsals = supabase
        .from("eventos_ensambles")
        .select(
          `
            eventos (
              id, fecha, hora_inicio, hora_fin, descripcion, id_tipo_evento, id_locacion, id_gira, is_deleted,
              locaciones ( nombre, localidades(localidad) ),
              tipos_evento ( nombre, color, id_categoria ),
              programas ( id, nombre_gira, mes_letra, nomenclador, zona ),
              eventos_programas_asociados ( programas ( id, nombre_gira, mes_letra, nomenclador, zona ) ),
              eventos_ensambles ( ensambles ( id, ensamble ) ),
              eventos_asistencia_custom ( tipo, id_integrante, integrantes(nombre, apellido) ) 
            )
          `,
        )
        .in("id_ensamble", ensembleIds)
        .eq("eventos.tecnica", false);

      // APLICAR FILTROS DE FECHA
      if (dateFilter.start) {
        queryMyRehearsals = queryMyRehearsals.gte(
          "eventos.fecha",
          dateFilter.start,
        );
      }
      if (dateFilter.end) {
        queryMyRehearsals = queryMyRehearsals.lte(
          "eventos.fecha",
          dateFilter.end,
        );
      }

      const { data: myRehearsals } = await queryMyRehearsals;

      let allEvents = [];
      const seenEventIds = new Set();

      if (myRehearsals) {
        myRehearsals.forEach((r) => {
          if (!r.eventos || seenEventIds.has(r.eventos.id)) return;
          const e = r.eventos;
          // Ocultar eliminados cuya fecha no sea hoy (soft delete: se muestran solo hoy)
          if (e.is_deleted && e.fecha !== today) return;
          seenEventIds.add(e.id);
          const customs = e.eventos_asistencia_custom || [];
          allEvents.push({
            ...e,
            isMyRehearsal: true,
            deltaGuests: customs.filter((c) => c.tipo === "invitado").length,
            deltaAbsent: customs.filter((c) => c.tipo === "ausente").length,
          });
        });
      }

      // 2. Fetch de SUPERPOSICIONES
      const targetTypeIds = new Set();

      if (overlapCategories.length > 0) {
        eventTypesList.forEach((t) => {
          if (overlapCategories.includes(t.id_categoria)) {
            targetTypeIds.add(t.id);
          }
        });
      }

      if (targetTypeIds.size > 0) {
        const typeIdsArray = Array.from(targetTypeIds);

        let queryExtra = supabase
          .from("eventos")
          .select(
            `
                id, fecha, hora_inicio, hora_fin, descripcion, id_tipo_evento, id_locacion, is_deleted,
                locaciones ( nombre, localidades(localidad) ),
                tipos_evento!inner ( nombre, color, id_categoria ),
                programas ( id, nombre_gira, mes_letra, nomenclador, zona ),
                eventos_programas_asociados ( programas ( id, nombre_gira, mes_letra, nomenclador, zona ) ),
                eventos_ensambles ( ensambles ( id, ensamble ) )
            `,
          )
          .in("id_tipo_evento", typeIdsArray)
          .eq("tecnica", false);

        if (dateFilter.start) {
          queryExtra = queryExtra.gte("fecha", dateFilter.start);
        }
        if (dateFilter.end) {
          queryExtra = queryExtra.lte("fecha", dateFilter.end);
        }

        const { data: extraEvents } = await queryExtra;

        if (extraEvents) {
          extraEvents.forEach((e) => {
            if (seenEventIds.has(e.id)) return;
            if (e.is_deleted && e.fecha !== today) return;
            const linkedEnsembles = e.eventos_ensambles || [];

            const directProgram = e.programas || null;
            const associatedPrograms =
              e.eventos_programas_asociados
                ?.map((epa) => epa.programas)
                .filter(Boolean) || [];

            const allProgramIds = new Set();
            if (directProgram?.id != null) allProgramIds.add(directProgram.id);
            associatedPrograms.forEach((p) => {
              if (p?.id != null) allProgramIds.add(p.id);
            });

            let isRelevant = true;

            // Priorizar coincidencia por programa (músicos compartidos) cuando haya programas asociados
            if (allProgramIds.size > 0 && candidateProgramIds.size > 0) {
              isRelevant = Array.from(allProgramIds).some((pid) =>
                candidateProgramIds.has(pid),
              );
            } else if (linkedEnsembles.length > 0) {
              // Fallback: si solo hay ensambles vinculados, mantener el filtro de "mis" ensambles
              isRelevant = linkedEnsembles.some((le) =>
                ensembleIds.includes(le.ensambles?.id ?? le.id_ensamble),
              );
            }

            if (!isRelevant) return;

            seenEventIds.add(e.id);
            allEvents.push({
              ...e,
              isMyRehearsal: false,
              eventos_asistencia_custom: [],
            });
          });
        }
      }

      return allEvents.sort((a, b) =>
        (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
      );
    },
  });

  useEffect(() => {
    if (listScrollRef.current) listScrollRef.current.scrollTop = 0;
  }, [activeEnsembleIdsKey.join(",")]);

  const filteredRehearsals = useMemo(() => {
    if (!listProgramFilterIds.length) return rehearsals;
    const filterSet = new Set(listProgramFilterIds);
    return rehearsals.filter((evt) =>
      [...getEventProgramIds(evt)].some((id) => filterSet.has(id)),
    );
  }, [rehearsals, listProgramFilterIds]);

  const selectedIdSet = useMemo(
    () => new Set(selectedIds.map((id) => String(id))),
    [selectedIds],
  );

  const programsForRosterPrefetch = useMemo(() => {
    const map = new Map();
    for (const evt of filteredRehearsals) {
      if (evt.programas?.id) map.set(evt.programas.id, evt.programas);
    }
    return Array.from(map.values());
  }, [filteredRehearsals]);

  const rosterQueries = useQueries({
    queries: programsForRosterPrefetch.map((gira) => ({
      queryKey: giraRosterQueryKey(gira),
      queryFn: async () => {
        const { roster, sources } = await fetchRosterForGira(supabase, gira);
        return { roster, sources };
      },
      enabled: Boolean(supabase && gira?.id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const rostersByProgramId = useMemo(() => {
    const map = new Map();
    programsForRosterPrefetch.forEach((gira, index) => {
      const roster = rosterQueries[index]?.data?.roster;
      if (roster) map.set(gira.id, roster);
    });
    return map;
  }, [programsForRosterPrefetch, rosterQueries]);

  const showRehearsalsFullLoading =
    activeTab === "ensayos" &&
    activeEnsembles.length > 0 &&
    rehearsalsPending &&
    rehearsals.length === 0;

  const minSelectedRehearsalDate = useMemo(() => {
    if (!selectedIds.length || !rehearsals.length) return null;
    const dates = rehearsals
      .filter((r) => selectedIds.includes(r.id))
      .map((r) => r.fecha)
      .filter(Boolean)
      .sort();
    return dates[0] || null;
  }, [selectedIds, rehearsals]);

  useEffect(() => {
    lastSelectedRehearsalIndexRef.current = null;
  }, [
    dateFilter.start,
    dateFilter.end,
    activeEnsembles.map((e) => e.id).join(","),
    listProgramFilterIds.join(","),
  ]);

  // --- QUERY: PROGRAMAS ---
  // (programas y programasOptions vienen de useCoordinatorPrograms arriba)

  const programTypeOptions = useMemo(() => {
    const tipos = Array.from(new Set(programs.map((p) => p?.tipo).filter(Boolean)));
    const order = Object.keys(PROGRAM_TYPES).filter((k) => k !== "default");

    return tipos
      .map((tipo) => ({
        value: tipo,
        label: PROGRAM_TYPES[tipo]?.label || tipo,
      }))
      .sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    let list = programs;
    if (programTypeFilter !== "ALL") {
      list = list.filter((p) => p?.tipo === programTypeFilter);
    }
    if (programDateFilter.start || programDateFilter.end) {
      list = list.filter((p) =>
        programOverlapsDateRange(
          p,
          programDateFilter.start || null,
          programDateFilter.end || null,
        ),
      );
    }
    return list;
  }, [
    programs,
    programTypeFilter,
    programDateFilter.start,
    programDateFilter.end,
  ]);

  const filteredProgramIds = useMemo(
    () => filteredPrograms.map((p) => p.id),
    [filteredPrograms],
  );

  const ensemblesListForCards = useMemo(
    () =>
      allEnsembles.map((e) => ({
        value: e.id,
        label: e.ensamble,
      })),
    [allEnsembles],
  );

  const updateGiraView = useCallback(
    (mode, giraId, subTab) => {
      const params = new URLSearchParams();
      params.set("tab", "giras");
      if (mode && mode !== "LIST") {
        params.set("view", mode);
        if (giraId) params.set("giraId", giraId);
        if (subTab) params.set("subTab", subTab);
      }
      navigate({ pathname: "/", search: params.toString() });
    },
    [navigate],
  );

  const { data: programGiras = [], isLoading: programGirasLoading } = useQuery({
    queryKey: ["coordinator-program-giras", filteredProgramIds.join(",")],
    enabled: activeTab === "programas" && filteredProgramIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programas")
        .select(GIRAS_LIST_SELECT)
        .in("id", filteredProgramIds)
        .order("fecha_desde", { ascending: true });
      if (error) throw error;
      const byId = new Map((data || []).map((g) => [g.id, g]));
      return filteredProgramIds.map((id) => byId.get(id)).filter(Boolean);
    },
  });

  useEffect(() => {
    if (programTypeFilter === "ALL") return;
    if (programsLoading) return;
    if (programs.length === 0) return;
    const stillExists = programs.some((p) => p?.tipo === programTypeFilter);
    if (!stillExists) setProgramTypeFilter("ALL");
  }, [programTypeFilter, programs, programsLoading]);

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["rehearsals"] });
    queryClient.invalidateQueries({ queryKey: ["coordinator-programs"] });
    queryClient.invalidateQueries({ queryKey: ["coordinator-program-giras"] });
    queryClient.invalidateQueries({ queryKey: ["gira-roster"] });
  };

  const buildCoordinatorPdfMeta = useCallback(() => {
    const ensembleLabel =
      activeEnsembles.map((e) => e.ensamble).join(", ") || "Ensambles";
    const rangeLabel =
      formatProgramDateRange(dateFilter.start, dateFilter.end) ||
      "Sin filtro de fechas";
    const viewLabels = { week: "Semana", month: "Mes", day: "Día" };
    const subTitleParts = [ensembleLabel, rangeLabel];
    if (overlapCategories.length > 0) {
      subTitleParts.push("Incluye superposiciones");
    }
    return { subTitle: subTitleParts.join(" | "), viewLabels };
  }, [
    activeEnsembles,
    dateFilter.start,
    dateFilter.end,
    overlapCategories.length,
  ]);

  const handleExportListaPdf = useCallback(() => {
    if (!filteredRehearsals.length) {
      toast.error("No hay eventos para exportar con los filtros actuales.");
      return;
    }
    const { subTitle } = buildCoordinatorPdfMeta();
    exportAgendaToPDF(
      mapCoordinatorEventsForAgendaPdf(filteredRehearsals),
      "Coordinación — Cronograma",
      subTitle,
      false,
    );
  }, [filteredRehearsals, buildCoordinatorPdfMeta]);

  const handleExportCalendarPdf = useCallback(() => {
    const root = calendarExportRef.current;
    if (!root) {
      toast.error("No se pudo capturar el calendario.");
      return;
    }

    const { subTitle, viewLabels } = buildCoordinatorPdfMeta();
    const calendarSubTitle = [
      subTitle,
      `Vista ${viewLabels[currentView] || currentView}: ${format(viewDate, "EEEE d MMMM yyyy", { locale: es })}`,
    ].join(" | ");

    const orientation = currentView === "month" ? "p" : "l";

    toast.promise(
      exportCoordinatorCalendarToPdf(root, {
        title: "Coordinación — Calendario",
        subTitle: calendarSubTitle,
        orientation,
      }),
      {
        loading: "Generando PDF del calendario...",
        success: "Calendario exportado a PDF",
        error: (err) =>
          err?.message || "No se pudo generar el PDF del calendario",
      },
    );
  }, [buildCoordinatorPdfMeta, currentView, viewDate]);

  const handleCalendarUpdate = async (eventId, patch) => {
    toast.promise(
      async () => {
        const { error } = await supabase
          .from("eventos")
          .update(patch)
          .eq("id", eventId);
        if (error) throw error;
      },
      {
        loading: "Reprogramando...",
        success: () => {
          refreshData();
          return "Evento reprogramado";
        },
        error: (err) => `Error: ${err.message}`,
      },
    );
  };

  const handleSelect = (id, checked, listIndex, nativeEvent) => {
    const ne = nativeEvent;
    const shiftFromEvent =
      ne &&
      typeof ne.getModifierState === "function" &&
      ne.getModifierState("Shift");
    const shiftHeld = shiftKeyHeldRef.current || shiftFromEvent;

    if (
      shiftHeld &&
      lastSelectedRehearsalIndexRef.current !== null &&
      listIndex != null
    ) {
      const start = Math.min(lastSelectedRehearsalIndexRef.current, listIndex);
      const end = Math.max(lastSelectedRehearsalIndexRef.current, listIndex);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          const row = filteredRehearsals[i];
          if (row?.isMyRehearsal) next.add(row.id);
        }
        return [...next];
      });
      lastSelectedRehearsalIndexRef.current = listIndex;
      return;
    }

    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );
    if (listIndex != null) lastSelectedRehearsalIndexRef.current = listIndex;
  };

  const handleSelectAllVisible = (checked) => {
    lastSelectedRehearsalIndexRef.current = null;
    if (checked) {
      const allIds = filteredRehearsals
        .filter((r) => r.isMyRehearsal)
        .map((r) => r.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const isAllSelected =
    filteredRehearsals.length > 0 &&
    filteredRehearsals
      .filter((r) => r.isMyRehearsal)
      .every((r) => selectedIdSet.has(String(r.id)));

  const applySmartSelect = () => {
    const { days, start, end } = smartFilter;
    const matches = rehearsals
      .filter((evt) => {
        if (!evt.isMyRehearsal) return false;
        const date = parseISO(evt.fecha);
        const dayStr = String(getDay(date));
        const matchDay = days.length === 0 || days.includes(dayStr);

        const matchStart = start === "" || evt.fecha >= start;
        const matchEnd = end === "" || evt.fecha <= end;
        return matchDay && matchStart && matchEnd;
      })
      .map((e) => e.id);
    setSelectedIds((prev) => [...new Set([...prev, ...matches])]);
    setShowSmartSelect(false);
  };

  const toggleSmartDay = (dayValue) => {
    setSmartFilter((prev) => {
      const exists = prev.days.includes(dayValue);
      const newDays = exists
        ? prev.days.filter((d) => d !== dayValue)
        : [...prev.days, dayValue];
      return { ...prev, days: newDays };
    });
  };

  const handleAddBulkMember = (tipo) => {
    if (!selectedMemberToAdd) return;
    if (
      bulkFormData.customAttendance.some(
        (c) => c.id_integrante === selectedMemberToAdd,
      )
    )
      return;
    const memberObj = membersOptions.find((m) => m.id === selectedMemberToAdd);
    setBulkFormData((prev) => ({
      ...prev,
      customAttendance: [
        ...prev.customAttendance,
        { id_integrante: selectedMemberToAdd, tipo, label: memberObj?.label },
      ],
    }));
    setSelectedMemberToAdd("");
  };

  const handleRemoveBulkMember = (id) => {
    setBulkFormData((prev) => ({
      ...prev,
      customAttendance: prev.customAttendance.filter(
        (x) => x.id_integrante !== id,
      ),
    }));
  };

  const handleAdvancedBulkUpdate = async () => {
    const {
      day,
      startTime,
      endTime,
      locationId,
      eventTypeId,
      description,
      ensambles,
      programas,
      customAttendance,
    } = bulkFormData;
    const hasChanges =
      day ||
      startTime ||
      endTime ||
      locationId ||
      eventTypeId ||
      description ||
      ensambles.length > 0 ||
      programas.length > 0 ||
      customAttendance.length > 0;
    if (!hasChanges) return toast.warning("Sin cambios seleccionados.");

    toast.promise(
      async () => {
        const eventsToUpdate = rehearsals.filter((r) =>
          selectedIds.includes(r.id),
        );
        const eventIds = eventsToUpdate.map((e) => e.id);
        const updates = eventsToUpdate.map((evt) => {
          const patch = {};
          if (day !== "") {
            const current = parseISO(evt.fecha);
            const newDate = setDay(current, parseInt(day), { weekStartsOn: 1 });
            patch.fecha = format(newDate, "yyyy-MM-dd");
          }
          if (startTime) patch.hora_inicio = startTime;
          if (endTime) patch.hora_fin = endTime;
          if (locationId) patch.id_locacion = locationId;
          if (eventTypeId) patch.id_tipo_evento = eventTypeId;
          if (description) patch.descripcion = description;
          if (Object.keys(patch).length > 0)
            return supabase.from("eventos").update(patch).eq("id", evt.id);
          return Promise.resolve();
        });
        await Promise.all(updates);

        if (ensambles.length > 0) {
          await supabase
            .from("eventos_ensambles")
            .delete()
            .in("id_evento", eventIds);
          const newRelations = eventIds.flatMap((eid) =>
            ensambles.map((ensId) => ({ id_evento: eid, id_ensamble: ensId })),
          );
          if (newRelations.length > 0)
            await supabase.from("eventos_ensambles").insert(newRelations);
        }

        if (programas.length > 0) {
          await supabase
            .from("eventos_programas_asociados")
            .delete()
            .in("id_evento", eventIds);
          const newRelations = eventIds.flatMap((eid) =>
            programas.map((progId) => ({
              id_evento: eid,
              id_programa: progId,
            })),
          );
          if (newRelations.length > 0)
            await supabase
              .from("eventos_programas_asociados")
              .insert(newRelations);
        }

        if (customAttendance.length > 0) {
          await supabase
            .from("eventos_asistencia_custom")
            .delete()
            .in("id_evento", eventIds);
          const newAttendance = eventIds.flatMap((eid) =>
            customAttendance.map((item) => ({
              id_evento: eid,
              id_integrante: item.id_integrante,
              tipo: item.tipo,
            })),
          );
          if (newAttendance.length > 0)
            await supabase
              .from("eventos_asistencia_custom")
              .insert(newAttendance);
        }

        return "Actualización completada";
      },
      {
        loading: "Actualizando...",
        success: (msg) => {
          setSelectedIds([]);
          setIsBulkEditModalOpen(false);
          setBulkFormData({
            day: "",
            startTime: "",
            endTime: "",
            locationId: "",
            eventTypeId: "",
            description: "",
            ensambles: [],
            programas: [],
            customAttendance: [],
          });
          refreshData();
          return msg;
        },
        error: (err) => `Error: ${err.message}`,
      },
    );
  };

  const handleEditRehearsal = (evt) => {
    setEditingEvent(evt);
    setIsModalOpen(true);
  };
  const handleDeleteRehearsal = async (id, eventOptional) => {
    const ev =
      eventOptional ??
      rehearsals.find((e) => String(e.id) === String(id));
    const isTransport =
      ev && [11, 12].includes(Number(ev.id_tipo_evento));

    let hasLogisticsLinks = false;
    let detail = "";
    let detailHtml = null;
    if (isTransport) {
      const summary = await getTransportEventAffectedSummary(supabase, id);
      hasLogisticsLinks = summary.hasLinks;
      detail = summary.detail;
      detailHtml = summary.detailHtml ?? null;
    }

    const message =
      hasLogisticsLinks && (detailHtml || detail)
        ? `Este evento está vinculado como subida/bajada en logística. Afecta a: ${detailHtml || detail}. Tené en cuenta que si lo eliminás, se afectará el cálculo de Viáticos y deberás crear un evento nuevo para tal fin. Se ocultará de la vista y se eliminará definitivamente en 24 horas. ¿Continuar?`
        : hasLogisticsLinks
          ? "Este evento está vinculado como subida/bajada de personal o regiones. Si lo eliminás, se afectará el cálculo de Viáticos; deberás crear un evento nuevo para tal fin. Se ocultará y se eliminará definitivamente en 24 horas. ¿Continuar?"
          : "¿Marcar este evento como eliminado? Se ocultará de la vista y se eliminará definitivamente en 24 horas.";
    setDeleteConfirm({
      isOpen: true,
      id,
      ids: null,
      message,
      messageIsHtml: !!detailHtml,
      hasLogisticsLinks,
    });
  };

  const handleConfirmDeleteRehearsal = () => {
    const { id, ids, message: _msg, hasLogisticsLinks } = deleteConfirm;
    setDeleteConfirm({
      isOpen: false,
      id: null,
      ids: null,
      message: "",
      messageIsHtml: false,
      hasLogisticsLinks: false,
    });
    const softDeletePayload = {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    };

    if (ids?.length) {
      toast.promise(
        async () => {
          const { error } = await supabase
            .from("eventos")
            .update(softDeletePayload)
            .in("id", ids);
          if (error) throw error;
        },
        {
          loading: "Marcando eventos como eliminados...",
          success: () => {
            refreshData();
            setSelectedIds([]);
            return `${ids.length} eventos marcados como eliminados. Se eliminarán definitivamente en 24 horas.`;
          },
          error: (err) => `Error: ${err.message}`,
        },
      );
      return;
    }
    if (id) {
      toast.promise(
        async () => {
          const { error } = await supabase
            .from("eventos")
            .update(softDeletePayload)
            .eq("id", id);
          if (error) throw error;
        },
        {
          loading: "Marcando como eliminado...",
          success: () => {
            refreshData();
            if (hasLogisticsLinks) {
              toast.warning(
                "Evento marcado como eliminado. Revisá la logística de integrantes/regiones y creá un evento nuevo para viáticos si corresponde. Se eliminará definitivamente en 24 horas.",
              );
            }
            return "Marcado como eliminado. Se eliminará definitivamente en 24 horas.";
          },
          error: "Error",
        },
      );
    }
  };

  const handleBulkDelete = () => {
    setDeleteConfirm({
      isOpen: true,
      id: null,
      ids: [...selectedIds],
      message: `¿Estás seguro de eliminar ${selectedIds.length} eventos? Esta acción no se puede deshacer.`,
      hasLogisticsLinks: false,
    });
  };

  const renderRehearsalCard = useCallback(
    (evt, listIndex) => (
      <RehearsalCardItem
        evt={evt}
        listIndex={listIndex}
        activeMembersSet={activeMembersSet}
        onEdit={handleEditRehearsal}
        feriados={feriados}
        onDelete={handleDeleteRehearsal}
        isSelected={selectedIdSet.has(String(evt.id))}
        onSelect={handleSelect}
        programRoster={
          evt.programas?.id
            ? rostersByProgramId.get(evt.programas.id) ?? null
            : null
        }
      />
    ),
    [
      activeMembersSet,
      feriados,
      selectedIdSet,
      handleSelect,
      handleEditRehearsal,
      handleDeleteRehearsal,
      rostersByProgramId,
    ],
  );

  if (loading)
    return (
      <div className="h-full flex items-center justify-center">
        <IconLoader className="animate-spin text-indigo-600" size={32} />
      </div>
    );

  const adminOptions = allEnsembles.map((e) => ({
    id: e.id,
    label: e.ensamble,
    tooltip: ensembleTooltipMap[e.id],
  }));

  // Opciones concretas que efectivamente puede gestionar este usuario
  const manageableEnsembleOptions = myEnsembles.map((e) => ({
    id: e.id,
    label: e.ensamble,
    tooltip: ensembleTooltipMap[e.id],
  }));

  // Opciones que se muestran dentro del selector de ensambles del header
  const headerEnsembleOptions = isSuperUser
    ? adminOptions
    : manageableEnsembleOptions;
  const headerEnsembleAllIds = headerEnsembleOptions.map((o) => o.id);

  const weekDays = [
    { val: "1", label: "Lu" },
    { val: "2", label: "Ma" },
    { val: "3", label: "Mi" },
    { val: "4", label: "Ju" },
    { val: "5", label: "Vi" },
    { val: "6", label: "Sa" },
    { val: "0", label: "Do" },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 md:p-6 gap-3 overflow-hidden">
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() =>
          setDeleteConfirm({
            isOpen: false,
            id: null,
            ids: null,
            message: "",
            messageIsHtml: false,
            hasLogisticsLinks: false,
          })
        }
        onConfirm={handleConfirmDeleteRehearsal}
        title={deleteConfirm.ids?.length ? "Eliminar eventos" : "Eliminar evento"}
        message={deleteConfirm.message}
        messageIsHtml={deleteConfirm.messageIsHtml}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
      {/* HEADER */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              Coordinación
              <ManualTrigger section="coordinacion" size="sm" />
              {isSuperUser && (
                <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded uppercase tracking-wide">
                  Admin
                </span>
              )}
            </h1>
            {!isSuperUser && !canUseEnsembleFilter && (
              <div className="flex gap-1 overflow-x-auto max-w-[200px] md:max-w-none no-scrollbar">
                {activeEnsembles.map((e) => (
                  <span
                    key={e.id}
                    className="text-[10px] font-bold px-2 py-0.5 bg-white text-slate-600 rounded border border-slate-200 shadow-sm flex items-center gap-1 whitespace-nowrap"
                    title={ensembleTooltipMap[e.id] || undefined}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>{" "}
                    {e.ensamble}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {/* BOTONES MÓVIL: SOLO ICONOS */}
            <div className="md:hidden relative" ref={mobileToolsRef}>
              <button
                onClick={() => setShowMobileTools(!showMobileTools)}
                className="bg-white border px-2 py-1.5 rounded shadow-sm text-slate-700 hover:bg-slate-50"
              >
                <IconSettings size={18} />
              </button>
              {showMobileTools && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setShowMobileTools(false);
                      setShowSmartSelect(!showSmartSelect);
                    }}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 flex items-center gap-2"
                  >
                    <IconFilter size={14} /> Selección Inteligente
                  </button>
                  {/* BOTÓN CREAR PROGRAMA DE ENSAMBLE */}
                  <button
                    onClick={() => setIsGiraModalOpen(true)}
                    className="bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded shadow-sm text-xs font-bold flex gap-2 hover:bg-indigo-50 items-center transition-colors"
                    title="Crear un nuevo programa o ciclo para el ensamble"
                  >
                    <IconMusic size={14} />
                    <span className="hidden sm:inline">Nuevo Programa</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMobileTools(false);
                      setIsLocationModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-50 flex items-center gap-2"
                  >
                    <IconMapPin size={14} /> Gestionar Locaciones
                  </button>
                  <button
                    onClick={() => {
                      setShowMobileTools(false);
                      setIsMassiveModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <IconCalendar size={14} /> Generación Múltiple
                  </button>
                </div>
              )}
            </div>

            {/* Filtro ensambles: móvil */}
            {canUseEnsembleFilter && (
              <div className="md:hidden relative">
                <button
                  type="button"
                  onClick={() =>
                    setShowHeaderEnsemblesPicker((prev) => !prev)
                  }
                  className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold rounded shadow-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  title="Filtrar ensambles"
                >
                  <IconFilter size={14} className="text-slate-500" />
                  <div className="flex flex-nowrap items-center gap-1 overflow-x-auto no-scrollbar max-w-[120px]">
                    {activeEnsembles.length > 0 ? (
                      activeEnsembles.map((e) => (
                        <span
                          key={e.id}
                          className="text-[10px] font-bold px-2 py-0.5 bg-white text-slate-600 rounded border border-slate-200 shadow-sm flex items-center whitespace-nowrap"
                          title={ensembleTooltipMap[e.id] || undefined}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          {e.ensamble}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">Elegir...</span>
                    )}
                  </div>
                  <IconChevronDown
                    size={10}
                    className={`transition-transform ${
                      showHeaderEnsemblesPicker ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showHeaderEnsemblesPicker && (
                  <div className="absolute left-0 top-full mt-1 w-72 max-w-[calc(100vw-2rem)] border border-slate-200 rounded-lg bg-white shadow-lg p-2 z-50">
                    <div className="flex items-center justify-between gap-2 mb-2 px-1">
                      <button
                        type="button"
                        onClick={() =>
                          setAdminFilterIds(
                            normalizeEnsembleIdList(headerEnsembleAllIds),
                          )
                        }
                        className="text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded px-2 py-1"
                        disabled={headerEnsembleAllIds.length === 0}
                      >
                        Seleccionar todo
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminFilterIds([])}
                        className="text-[11px] font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded px-2 py-1"
                        disabled={adminFilterIds.length === 0}
                      >
                        Deseleccionar todo
                      </button>
                    </div>
                    <MultiSelect
                      placeholder="Elegí uno o varios ensambles..."
                      options={
                        isSuperUser ? adminOptions : manageableEnsembleOptions
                      }
                      selectedIds={adminFilterIds}
                      onChange={(ids) =>
                        setAdminFilterIds(normalizeEnsembleIdList(ids))
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {/* BOTONES ESCRITORIO: TEXTO COMPLETO */}

            <div className="hidden md:flex gap-2">
              {/* Filtro ensambles: escritorio (izquierda de Nuevo Programa) */}
              {canUseEnsembleFilter && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setShowHeaderEnsemblesPicker((prev) => !prev)
                    }
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold rounded shadow-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    title="Filtrar ensambles"
                  >
                    <IconFilter size={14} className="text-slate-500" />
                    <div className="flex flex-nowrap items-center gap-1 overflow-x-auto no-scrollbar max-w-[240px]">
                      {activeEnsembles.length > 0 ? (
                        activeEnsembles.map((e) => (
                          <span
                            key={e.id}
                            className="text-[10px] font-bold px-2 py-0.5 bg-white text-slate-600 rounded border border-slate-200 shadow-sm flex items-center whitespace-nowrap"
                            title={ensembleTooltipMap[e.id] || undefined}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            {e.ensamble}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">Elegir...</span>
                      )}
                    </div>
                    <IconChevronDown
                      size={10}
                      className={`transition-transform ${
                        showHeaderEnsemblesPicker ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showHeaderEnsemblesPicker && (
                    <div className="absolute left-0 top-full mt-1 w-72 max-w-[calc(100vw-2rem)] border border-slate-200 rounded-lg bg-white shadow-lg p-2 z-50">
                      <div className="flex items-center justify-between gap-2 mb-2 px-1">
                        <button
                          type="button"
                          onClick={() =>
                            setAdminFilterIds(
                              normalizeEnsembleIdList(headerEnsembleAllIds),
                            )
                          }
                          className="text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded px-2 py-1"
                          disabled={headerEnsembleAllIds.length === 0}
                        >
                          Seleccionar todo
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdminFilterIds([])}
                          className="text-[11px] font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded px-2 py-1"
                          disabled={adminFilterIds.length === 0}
                        >
                          Deseleccionar todo
                        </button>
                      </div>
                      <MultiSelect
                        placeholder="Elegí uno o varios ensambles..."
                        options={
                          isSuperUser ? adminOptions : manageableEnsembleOptions
                        }
                        selectedIds={adminFilterIds}
                        onChange={(ids) =>
                          setAdminFilterIds(normalizeEnsembleIdList(ids))
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setIsGiraModalOpen(true)}
                className="bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded shadow-sm text-xs font-bold flex gap-2 hover:bg-indigo-50 items-center transition-colors"
                title="Crear un nuevo programa o ciclo para el ensamble"
              >
                <IconMusic size={14} />
                <span className="hidden sm:inline">Nuevo Programa</span>
              </button>

              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="bg-white border px-3 py-1.5 rounded shadow-sm text-xs font-bold flex gap-2 text-slate-700 hover:bg-slate-50"
                title="Agregar o editar salas y lugares"
              >
                <IconMapPin size={14} /> Locaciones
              </button>

              <button
                onClick={() => setShowSmartSelect(!showSmartSelect)}
                className="bg-white border px-3 py-1.5 rounded shadow-sm text-xs font-bold flex gap-2 text-slate-700 hover:bg-slate-50"
              >
                <IconFilter size={14} /> Selección Inteligente
              </button>
              <button
                onClick={() => setIsMassiveModalOpen(true)}
                className="bg-white border px-3 py-1.5 rounded shadow-sm text-xs font-bold flex gap-2 text-slate-700 hover:bg-slate-50"
              >
                <IconCalendar size={14} /> Generación Múltiple
              </button>
            </div>

            <button
              onClick={() => {
                setEditingEvent(null);
                setIsModalOpen(true);
              }}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded shadow-md text-xs font-bold flex gap-2 hover:bg-indigo-700 items-center"
            >
              <IconPlus size={14} />{" "}
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          </div>
        </div>

        {/* Filtros Inteligentes */}
        {showSmartSelect && (
          <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 max-w-2xl absolute z-50 mt-10 ml-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                <IconSearch size={14} /> Filtrar y Seleccionar
              </h3>
              <button
                onClick={() => setShowSmartSelect(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <IconX size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">
                  Días (Selección Múltiple)
                </label>
                <div className="flex flex-wrap gap-1">
                  {weekDays.map((d) => (
                    <button
                      key={d.val}
                      onClick={() => toggleSmartDay(d.val)}
                      className={`
                                w-7 h-7 rounded text-[10px] font-bold border transition-colors
                                ${
                                  smartFilter.days.includes(d.val)
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }
                            `}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">
                  Rango de Fechas
                </label>
                <div className="flex gap-1">
                  <DateInput
                    value={smartFilter.start}
                    onChange={(v) =>
                      setSmartFilter({ ...smartFilter, start: v })
                    }
                    placeholder="Desde"
                    className="text-xs w-full"
                  />
                  <DateInput
                    value={smartFilter.end}
                    onChange={(v) => setSmartFilter({ ...smartFilter, end: v })}
                    placeholder="Hasta"
                    className="text-xs w-full"
                  />
                </div>
              </div>
              <div className="flex items-end h-full">
                <button
                  onClick={applySmartSelect}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-2 w-full"
                >
                  <IconCheck size={14} /> Seleccionar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-md flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 px-2 py-0.5 rounded-full font-bold text-xs flex items-center gap-2">
              <IconCheck size={12} /> {selectedIds.length}
            </div>
            <button
              onClick={() => {
                lastSelectedRehearsalIndexRef.current = null;
                setSelectedIds([]);
              }}
              className="text-xs hover:underline opacity-90"
            >
              Descartar
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkDelete}
              className="bg-red-500 text-white hover:bg-red-600 font-bold px-3 py-1 rounded text-xs transition-colors flex items-center gap-2 shadow-sm"
            >
              <IconTrash size={14} />{" "}
              <span className="hidden sm:inline">Eliminar</span>
            </button>
            <button
              onClick={() => setIsBulkEditModalOpen(true)}
              className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-3 py-1 rounded text-xs transition-colors flex items-center gap-2 shadow-sm"
            >
              <IconSettings size={14} />{" "}
              <span className="hidden sm:inline">Editar</span>
            </button>
          </div>
        </div>
      )}

      {/* TABS Y NAVEGACIÓN */}
      <div className="flex flex-col md:flex-row items-end justify-between border-b border-slate-200 bg-white rounded-t-lg px-4 pt-2 shadow-sm gap-2 mt-1 shrink-0">
        <div className="flex">
          <button
            onClick={() => setActiveTab("ensayos")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${activeTab === "ensayos" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"}`}
          >
            Lista
          </button>
          <button
            onClick={() => setActiveTab("calendario")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "calendario" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"}`}
          >
            <IconCalendar size={14} /> Calendario
          </button>
          <button
            onClick={() => setActiveTab("programas")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${activeTab === "programas" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"}`}
          >
            Programas
          </button>
          <button
            onClick={() => setActiveTab("repertorio")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "repertorio" ? "border-fixed-indigo-600 text-fixed-indigo-600" : "border-transparent text-slate-500"}`}
          >
            <IconMusic size={14} /> Programación de Repertorio
          </button>
        </div>

        {(activeTab === "ensayos" || activeTab === "calendario") && (
          <div className="mb-1 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEnsayosReportModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              title="Matriz de ensayos por programa y ensamble"
            >
              <IconDownload size={14} />
              <span className="hidden sm:inline">Reporte ensayos</span>
              <span className="sm:hidden">Reporte</span>
            </button>
            <div className="relative">
            <button
              onClick={() => setShowOverlapOptions(!showOverlapOptions)}
              className={`flex items-center gap-2 px-3 py-1 text-xs font-bold border rounded-lg ${overlapCategories.length > 0 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white text-slate-500 hover:bg-slate-50"}`}
            >
              <IconEye size={14} />{" "}
              {overlapCategories.length > 0
                ? `+${overlapCategories.length} Filtros`
                : "Ver Superposiciones"}
            </button>
            {showOverlapOptions && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-3 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-1">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase">
                    Categorías a mostrar
                  </h4>
                  <button
                    onClick={() => setShowOverlapOptions(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <IconX size={12} />
                  </button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {categoryOptions.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        checked={overlapCategories.includes(t.id)}
                        onChange={() =>
                          setOverlapCategories((prev) =>
                            prev.includes(t.id)
                              ? prev.filter((id) => id !== t.id)
                              : [...prev, t.id],
                          )
                        }
                      />
                      <span className="text-xs text-slate-700 font-medium">
                        {t.label}
                      </span>
                    </label>
                  ))}
                </div>
                {overlapCategories.length > 0 && (
                  <button
                    onClick={() => setOverlapCategories([])}
                    className="mt-2 w-full text-xs text-red-500 hover:bg-red-50 py-1 rounded font-bold"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-b-lg border border-slate-200 border-t-0 p-0 shadow-sm overflow-hidden relative">
        {showRehearsalsFullLoading ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <IconLoader className="animate-spin mr-2" /> Cargando...
          </div>
        ) : (
          <div
            className={
              activeTab === "ensayos"
                ? "h-full flex flex-col overflow-hidden p-4"
                : "h-full overflow-y-auto p-4"
            }
          >
            {activeTab === "ensayos" && (
              <>
                <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 mb-2 pb-2 border-b border-slate-100 pl-1">
                  {/* Checkbox "Select All" */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAllVisible(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-500">
                      Seleccionar todo lo visible
                    </span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      · Shift+clic: rango consecutivo
                    </span>
                  </div>

                  {/* FILTRO DE FECHAS EN LÍNEA */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowListProgramFilter((v) => !v)}
                      className={`inline-flex items-center gap-1 px-2 py-1 h-6 text-[10px] font-bold rounded border transition-colors shrink-0 ${
                        showListProgramFilter || listProgramFilterIds.length > 0
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50"
                      }`}
                      title="Filtrar ensayos por programa"
                    >
                      <IconFilter size={12} />
                      Programa
                      {listProgramFilterIds.length > 0 && (
                        <span className="bg-indigo-600 text-white rounded-full px-1 min-w-[14px] text-center text-[9px] leading-4">
                          {listProgramFilterIds.length}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Desde:
                      </span>
                      <DateInput
                        value={dateFilter.start}
                        onChange={(v) =>
                          setDateFilter((prev) => ({ ...prev, start: v }))
                        }
                        className="h-6 text-xs w-28 bg-slate-50 border-slate-200"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Hasta:
                      </span>
                      <DateInput
                        value={dateFilter.end}
                        onChange={(v) =>
                          setDateFilter((prev) => ({ ...prev, end: v }))
                        }
                        className="h-6 text-xs w-28 bg-slate-50 border-slate-200"
                        placeholder="Indefinido"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleExportListaPdf}
                      disabled={
                        rehearsalsFetching || filteredRehearsals.length === 0
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 disabled:pointer-events-none transition-colors shrink-0"
                      title="Exportar cronograma (vista agenda) a PDF"
                    >
                      <IconPrinter size={16} />
                      PDF
                    </button>
                  </div>
                </div>

                {showListProgramFilter && (
                  <div className="shrink-0 mb-3">
                    <RepertorioPreparacionSelect
                      title="Filtrar por Programa"
                      placeholder="Seleccionar programas..."
                      helperText="Sin selección: se muestran todos los ensayos."
                      options={programasOptions}
                      selectedIds={listProgramFilterIds}
                      onChange={setListProgramFilterIds}
                      supabase={supabase}
                      activeMembersSet={activeMembersSet}
                    />
                  </div>
                )}

                <div
                  ref={attachListScrollRef}
                  className="relative flex-1 min-h-0 overflow-y-auto mt-1"
                >
                  {rehearsalsFetching && filteredRehearsals.length > 0 && (
                    <div className="sticky top-0 z-10 mb-2 flex items-center justify-center gap-2 rounded-md border border-indigo-100 bg-indigo-50/90 px-2 py-1 text-[10px] font-bold text-indigo-700">
                      <IconLoader className="animate-spin" size={12} />
                      Actualizando ensayos…
                    </div>
                  )}
                  {activeEnsembles.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      Elegí al menos un ensamble para ver ensayos.
                    </div>
                  ) : filteredRehearsals.length > 0 ? (
                    <RehearsalVirtualList
                      items={filteredRehearsals}
                      scrollElement={listScrollElement}
                      scrollElementRef={listScrollRef}
                      renderItem={renderRehearsalCard}
                    />
                  ) : (
                    <div className="text-center py-10 text-slate-400">
                      {rehearsalsFetching
                        ? "Cargando ensayos…"
                        : rehearsals.length > 0
                          ? "Ningún ensayo coincide con los programas seleccionados."
                          : "No hay eventos visibles."}
                    </div>
                  )}
                </div>
              </>
            )}
            {activeTab === "calendario" && (
              <div className="h-full flex flex-col">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex-1 px-2 text-xs text-slate-500 flex items-center gap-2 bg-blue-50 p-2 rounded border border-blue-100 min-w-0">
                    <IconAlertTriangle size={12} className="text-blue-500 shrink-0" />
                    <span>
                      Arrastra tus eventos (sólidos) para reprogramar. Click para
                      detalles.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCalendarPdf}
                    disabled={rehearsalsFetching}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 disabled:pointer-events-none transition-colors shrink-0"
                    title="Descargar calendario visible como PDF"
                  >
                    <IconPrinter size={16} />
                    PDF
                  </button>
                </div>
                <EnsembleCalendar
                  ref={calendarExportRef}
                  events={rehearsals}
                  onEventUpdate={handleCalendarUpdate}
                  onSelectEvent={(evt) => {
                    setViewingEvent(evt);
                  }}
                  date={viewDate}
                  onNavigate={setViewDate}
                  view={currentView}
                  onView={setCurrentView}
                />
              </div>
            )}
            {activeTab === "programas" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        Tipo
                      </label>
                      <select
                        value={programTypeFilter}
                        onChange={(e) => setProgramTypeFilter(e.target.value)}
                        className="border border-slate-300 rounded px-2 py-1 text-xs bg-white outline-none"
                      >
                        <option value="ALL">Todos</option>
                        {programTypeOptions.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Desde:
                      </span>
                      <DateInput
                        value={programDateFilter.start}
                        onChange={(v) =>
                          setProgramDateFilter((prev) => ({ ...prev, start: v }))
                        }
                        className="h-7 text-xs w-28 bg-slate-50 border-slate-200"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Hasta:
                      </span>
                      <DateInput
                        value={programDateFilter.end}
                        onChange={(v) =>
                          setProgramDateFilter((prev) => ({ ...prev, end: v }))
                        }
                        className="h-7 text-xs w-28 bg-slate-50 border-slate-200"
                        placeholder="Indefinido"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setShowRepertoireInCards((prev) => !prev)
                      }
                      className={`px-2 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
                        showRepertoireInCards
                          ? "bg-indigo-600 border-indigo-600"
                          : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                      }`}
                      title="Ver repertorio en tarjetas"
                    >
                      <IconMusic
                        size={16}
                        className={
                          showRepertoireInCards ? "text-slate-300" : ""
                        }
                      />
                    </button>
                  </div>

                  <div className="text-[10px] font-bold text-slate-500">
                    {filteredPrograms.length}{" "}
                    {filteredPrograms.length === 1 ? "programa" : "programas"}
                  </div>
                </div>

                {programsLoading ||
                (programGirasLoading && filteredProgramIds.length > 0) ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                    <IconLoader className="animate-spin" size={14} />
                    Cargando programas...
                  </div>
                ) : programGiras.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {programGiras.map((gira) => (
                      <CoordinatorProgramGiraCard
                        key={gira.id}
                        gira={gira}
                        activeMembersSet={activeMembersSet}
                        supabase={supabase}
                        onEdit={handleEditProgram}
                        ensemblesList={ensemblesListForCards}
                        updateView={updateGiraView}
                        showRepertoireInCards={showRepertoireInCards}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs font-bold">
                    No hay programas en el rango seleccionado.
                  </div>
                )}
              </div>
            )}
            {activeTab === "repertorio" && (
              <RepertoireCyclesTab
                supabase={supabase}
                activeEnsembles={activeEnsembles}
                programasOptions={programasOptions}
                repertoireYear={repertoireYear}
                setRepertoireYear={setRepertoireYear}
                queryClient={queryClient}
                onEditProgram={handleEditProgram}
                isGlobalEditor={isGlobalEditor}
                adminOptions={adminOptions}
                adminFilterIds={adminFilterIds}
                onChangeAdminFilterIds={setAdminFilterIds}
                onCreateProgramFromProposal={(proposal, ensemble) => {
                  const baseName =
                    proposal?.nombre_programa ||
                    `${ensemble?.ensamble || "Programa"} ${repertoireYear}`;
                  setGiraFormData((prev) => ({
                    ...prev,
                    nombre_gira: baseName,
                    subtitulo: `Ciclo ${repertoireYear} - ${ensemble?.ensamble || ""}`,
                    tipo: "Ensamble",
                    fecha_desde: "",
                    fecha_hasta: "",
                    estado: "Borrador",
                    zona: prev.zona || "",
                  }));
                  setProposalToLink(proposal?.id || null);
                  setEditingProgram(null);
                  setSelectedSources([
                    {
                      tipo: "ENSAMBLE",
                      valor_id: ensemble.id,
                      label: ensemble.ensamble,
                    },
                  ]);
                  setIsGiraModalOpen(true);
                }}
              />
            )}
          </div>
        )}
      </div>

      {isBulkEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <IconSettings className="text-indigo-600" /> Edición Masiva
              </h3>
              <button onClick={() => setIsBulkEditModalOpen(false)}>
                <IconX className="text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="text-sm text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-2 items-start">
                <IconAlertTriangle
                  className="text-blue-500 shrink-0 mt-0.5"
                  size={16}
                />
                <div>
                  Estás editando <strong>{selectedIds.length} eventos</strong>.{" "}
                  <span className="block text-xs mt-1">
                    Solo se modificarán los campos que rellenes o selecciones a
                    continuación.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna 1 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                      Mover a Día
                    </label>
                    <select
                      className="w-full border rounded p-2 text-sm bg-slate-50 outline-none"
                      value={bulkFormData.day}
                      onChange={(e) =>
                        setBulkFormData({
                          ...bulkFormData,
                          day: e.target.value,
                        })
                      }
                    >
                      <option value="">- Sin cambios -</option>
                      <option value="1">Lunes</option>
                      <option value="2">Martes</option>
                      <option value="3">Miércoles</option>
                      <option value="4">Jueves</option>
                      <option value="5">Viernes</option>
                      <option value="6">Sábado</option>
                      <option value="0">Domingo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                      Tipo de Evento
                    </label>
                    <select
                      className="w-full border rounded p-2 text-sm bg-slate-50 outline-none"
                      value={bulkFormData.eventTypeId}
                      onChange={(e) =>
                        setBulkFormData({
                          ...bulkFormData,
                          eventTypeId: e.target.value,
                        })
                      }
                    >
                      <option value="">- Sin cambios -</option>
                      {eventTypesList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                      Nueva Ubicación
                    </label>
                    <SearchableSelect
                      options={locationsList.map((l) => ({
                        id: l.id,
                        label: `${l.nombre} ${l.localidades?.localidad ? `(${l.localidades.localidad})` : ""}`,
                      }))}
                      value={bulkFormData.locationId}
                      onChange={(val) =>
                        setBulkFormData({ ...bulkFormData, locationId: val })
                      }
                      placeholder="- Sin cambios -"
                    />
                  </div>
                </div>
                {/* Columna 2 */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                        Hora Inicio
                      </label>
                      <input
                        type="time"
                        className="w-full border rounded p-2 text-sm bg-slate-50 outline-none"
                        value={bulkFormData.startTime}
                        onChange={(e) =>
                          setBulkFormData({
                            ...bulkFormData,
                            startTime: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                        Hora Fin
                      </label>
                      <input
                        type="time"
                        className="w-full border rounded p-2 text-sm bg-slate-50 outline-none"
                        value={bulkFormData.endTime}
                        onChange={(e) =>
                          setBulkFormData({
                            ...bulkFormData,
                            endTime: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                      Nuevo Título
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded p-2 text-sm bg-slate-50 outline-none"
                      placeholder="Ej: Ensayo General..."
                      value={bulkFormData.description}
                      onChange={(e) =>
                        setBulkFormData({
                          ...bulkFormData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <IconMusic size={14} /> Reemplazar Ensambles
                    </h3>
                    <MultiSelect
                      placeholder="Seleccionar..."
                      options={ensamblesOptions}
                      selectedIds={bulkFormData.ensambles}
                      onChange={(ids) =>
                        setBulkFormData({ ...bulkFormData, ensambles: ids })
                      }
                    />
                  </div>
                  <RepertorioPreparacionSelect
                    title="Reemplazar Repertorio"
                    placeholder="Seleccionar..."
                    options={programasOptions}
                    selectedIds={bulkFormData.programas}
                    onChange={(ids) =>
                      setBulkFormData({ ...bulkFormData, programas: ids })
                    }
                    minRehearsalDate={minSelectedRehearsalDate}
                    helperText=""
                    supabase={supabase}
                    activeMembersSet={activeMembersSet}
                  />
                </div>
                <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col h-full">
                  <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <IconUsers size={14} /> Asistencia Particular
                  </h3>
                  <div className="flex gap-2 items-end mb-3">
                    <div className="flex-1">
                      <label className="text-[9px] text-slate-400 uppercase mb-1 block">
                        Buscar Integrante
                      </label>
                      <SearchableSelect
                        options={membersOptions}
                        value={selectedMemberToAdd}
                        onChange={setSelectedMemberToAdd}
                        placeholder="Buscar..."
                        className="w-full"
                      />
                    </div>
                    <button
                      onClick={() => handleAddBulkMember("invitado")}
                      disabled={!selectedMemberToAdd}
                      className="h-[38px] px-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 flex items-center gap-1 text-xs font-bold disabled:opacity-50"
                    >
                      <IconUserPlus size={14} />
                    </button>
                    <button
                      onClick={() => handleAddBulkMember("ausente")}
                      disabled={!selectedMemberToAdd}
                      className="h-[38px] px-2 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 flex items-center gap-1 text-xs font-bold disabled:opacity-50"
                    >
                      <IconUserX size={14} />
                    </button>
                  </div>
                  <div className="space-y-1 overflow-y-auto flex-1 max-h-40 pr-1">
                    {bulkFormData.customAttendance.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-1.5 bg-slate-50 rounded border border-slate-100"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1 py-0.5 rounded text-[9px] font-bold ${item.tipo === "invitado" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                          >
                            {item.tipo.toUpperCase()}
                          </span>
                          <span className="font-medium text-slate-700 truncate max-w-[120px]">
                            {item.label}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleRemoveBulkMember(item.id_integrante)
                          }
                          className="text-slate-400 hover:text-red-600"
                        >
                          <IconTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsBulkEditModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdvancedBulkUpdate}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md flex items-center gap-2"
              >
                <IconCheck size={16} /> Confirmar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
      {(isGiraModalOpen || editingProgram) && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl p-4">
            <GiraForm
              supabase={supabase}
              giraId={editingProgram?.id ?? null}
              isNew={!editingProgram}
              formData={giraFormData}
              setFormData={setGiraFormData}
              onCancel={() => {
                if (editingProgram) {
                  setEditingProgram(null);
                  queryClient.invalidateQueries(["coordinator-programs"]);
                } else {
                  setIsGiraModalOpen(false);
                  setSelectedSources([]);
                }
              }}
              onSave={editingProgram ? () => {} : handleSaveGira}
              onRefresh={editingProgram ? () => queryClient.invalidateQueries(["coordinator-programs"]) : undefined}
              enableAutoSave={!!editingProgram}
              isCoordinator={true}
              coordinatedEnsembles={myEnsembles.map((e) => e.id)}
              ensemblesList={allEnsembles.map((e) => ({
                value: e.id,
                label: e.ensamble,
              }))}
              allIntegrantes={membersOptions}
              selectedSources={selectedSources}
              setSelectedSources={setSelectedSources}
              selectedStaff={editingProgram ? selectedStaff : []}
              setSelectedStaff={editingProgram ? setSelectedStaff : () => {}}
              selectedLocations={editingProgram ? selectedLocations : new Set()}
              setSelectedLocations={editingProgram ? setSelectedLocations : () => {}}
              locationsList={locationsList}
            />
          </div>
        </div>
      )}
      {/* MODAL VISTA RÁPIDA */}
      {viewingEvent && (
        <EventQuickView
          event={viewingEvent}
          onClose={() => setViewingEvent(null)}
          onDelete={(id) => {
            setViewingEvent(null);
            handleDeleteRehearsal(id, viewingEvent);
          }}
          onEdit={(evt) => {
            setViewingEvent(null);
            if (evt.isMyRehearsal) {
              handleEditRehearsal(evt);
            } else {
              toast.error("No tienes permiso para editar este evento");
            }
          }}
        />
      )}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl relative">
            <IndependentRehearsalForm
              supabase={supabase}
              initialData={editingEvent}
              myEnsembles={activeEnsembles}
              programasOptions={programasOptions}
              locationsOptions={locationSelectOptions}
              membersOptions={membersOptions}
              ensamblesOptions={ensamblesOptions}
              activeMemberIds={activeMemberIdsArray}
              onSuccess={() => {
                setIsModalOpen(false);
                refreshData();
              }}
              onCancel={() => setIsModalOpen(false)}
            />
          </div>
        </div>
      )}
      {isLocationModalOpen && (
        <LocationManagerModal
          supabase={supabase}
          onClose={() => setIsLocationModalOpen(false)}
          onSuccess={refreshLocations}
        />
      )}
      {isMassiveModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <MassiveRehearsalGenerator
            supabase={supabase}
            myEnsembles={activeEnsembles}
            onSuccess={() => {
              setIsMassiveModalOpen(false);
              refreshData();
            }}
            onCancel={() => setIsMassiveModalOpen(false)}
          />
        </div>
      )}
      <EnsayosPorProgramaReportModal
        isOpen={isEnsayosReportModalOpen}
        onClose={() => setIsEnsayosReportModalOpen(false)}
        supabase={supabase}
        activeEnsembles={activeEnsembles}
      />
    </div>
  );
}
