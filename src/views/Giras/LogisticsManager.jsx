import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  IconPlus,
  IconTrash,
  IconCheck,
  IconSettings,
  IconLayoutList,
  IconLayoutGrid,
  IconChevronDown,
  IconChevronRight,
  IconMapPin,
  IconAlertCircle,
  IconBus,
  IconUtensils,
  IconHotel,
  IconX,
  IconLink,
  IconEdit,
  IconCalendarPlus,
  IconSearch,
  IconLinkOff,
  IconExchange,
  IconHelpCircle,
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import {
  useLogistics,
  getMatchStrength,
  getCategoriaLogistica,
} from "../../hooks/useLogistics";
import EventForm from "../../components/forms/EventForm";
import ManualTrigger from "../../components/manual/ManualTrigger";

// --- CONSTANTES ---
const CATEGORIA_OPTIONS = [
  { val: "SOLISTAS", label: "Solistas" },
  { val: "DIRECTORES", label: "Directores" },
  { val: "PRODUCCION", label: "Producción" },
  { val: "EXTERNOS", label: "Externos" },
  { val: "LOCALES", label: "Locales" },
  { val: "NO_LOCALES", label: "No Locales" },
];
const normalize = (str) => (str || "").toLowerCase().trim();
const SERVICIOS_COMIDA = ["Desayuno", "Almuerzo", "Merienda", "Cena"];
const PROVEEDORES_COMIDA = [
  "-",
  "No lleva",
  "Hotel",
  "Colectivo",
  "Refrigerio",
  "Vianda",
];

const MILESTONES = [
  { key: "check-in", label: "Check-in", icon: IconHotel, colorType: "inicio" },
  { key: "check-out", label: "Check-out", icon: IconHotel, colorType: "fin" },
  { key: "subida", label: "Subida", icon: IconBus, colorType: "inicio" },
  { key: "bajada", label: "Bajada", icon: IconBus, colorType: "fin" },
  { key: "inicio_comida", label: "Inicio Comida", icon: IconUtensils, colorType: "inicio" },
  { key: "fin_comida", label: "Fin Comida", icon: IconUtensils, colorType: "fin" },
];

const MILESTONE_BLOCKS = [
  {
    label: "Hotel",
    keys: ["check-in", "check-out"],
    activeClass:
      "border-orange-400 bg-orange-50",
  },
  {
    label: "Bus",
    keys: ["subida", "bajada"],
    activeClass:
      "border-blue-400 bg-blue-50",
  },
  {
    label: "Comidas",
    keys: ["inicio_comida", "fin_comida"],
    activeClass:
      "border-emerald-400 bg-emerald-50",
  },
];

const isPersonMissingMilestone = (m, milestoneKey) => {
  const l = m.logistics;
  const isLocal = m.is_local;
  switch (milestoneKey) {
    case "check-in":
    case "check-out":
      if (isLocal) return false;
      return milestoneKey === "check-in"
        ? !l.checkin?.date
        : !l.checkout?.date;
    case "subida":
    case "bajada":
      if (isLocal) return false;
      return milestoneKey === "subida"
        ? !l.transports[0]?.subidaData?.date
        : !l.transports[0]?.bajadaData?.date;
    case "inicio_comida":
      return !l.comida_inicio?.date;
    case "fin_comida":
      return !l.comida_fin?.date;
    default:
      return false;
  }
};

// --- UTILIDADES ---
const getDayLong = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  return date
    .toLocaleDateString("es-ES", { weekday: "short" }) // Cambiado a 'short' para "lun."
    .replace(/^\w/, (c) => c.toUpperCase()); // Capitalizar primera letra
};

// Nueva utilidad para formato breve en tarjeta
const formatDateBrief = (dateStr) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  const date = new Date(dateStr + "T00:00:00");
  const dayName = date.toLocaleDateString("es-ES", { weekday: "short" });
  return `${dayName} ${day}/${month}/${year.slice(2)}`;
};

const formatDiff = (ms) => {
  if (ms <= 0) return null;
  const totalHrs = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHrs / 24);
  const remHrs = totalHrs % 24;
  return days > 0 ? `${days}d ${remHrs}h` : `${remHrs}h`;
};

// Mantiene consistencia con el motor central: NO_LOCALES incluye EXTERNOS.
const matchesCategoryChip = (chipCategory, personCategory, person) => {
  if (!chipCategory || !personCategory) return false;
  if (chipCategory === "LOCALES") return Boolean(person?.is_local);
  if (chipCategory === "NO_LOCALES") return !Boolean(person?.is_local);
  if (chipCategory === personCategory) return true;
  if (chipCategory === "NO_LOCALES" && personCategory === "EXTERNOS")
    return true;
  return false;
};

/** Persona coincide con el chip (criterio) y la regla le aplica (fuerza > 0). */
const personMatchesLogisticsChip = (
  row,
  chipKey,
  chipId,
  person,
  allLocalities,
) => {
  if (getMatchStrength(row, person, allLocalities) <= 0) return false;
  const pId = String(person.id ?? person.id_integrante);
  const pLoc = person.id_localidad ? String(person.id_localidad) : "";
  const locInfo = (allLocalities || []).find((l) => String(l.id) === pLoc);
  const pReg = String(
    person.id_region ??
      person.localidades?.id_region ??
      locInfo?.id_region ??
      "",
  );
  const pCat = getCategoriaLogistica(person);
  switch (chipKey) {
    case "target_ids":
      return pId === String(chipId);
    case "target_localities":
      return pLoc === String(chipId);
    case "target_regions":
      return pReg === String(chipId);
    case "target_categories":
      return matchesCategoryChip(chipId, pCat, person);
    default:
      return false;
  }
};

/** Misma lógica que calculateLogisticsSummary: última regla aplicada gana (mayor fuerza; empate → última en el listado). */
const getWinningLogisticsRule = (person, rules, allLocalities) => {
  if (!rules?.length) return null;
  const matched = rules
    .map((r, idx) => ({
      r,
      s: getMatchStrength(r, person, allLocalities),
      idx,
    }))
    .filter((x) => x.s > 0)
    .sort((a, b) => {
      if (a.s !== b.s) return a.s - b.s;
      return a.idx - b.idx;
    });
  if (matched.length === 0) return null;
  return matched[matched.length - 1].r;
};

const getProviderColorClass = (p) => {
  if (p === "Hotel") return "bg-indigo-100 text-indigo-700 border-indigo-200";
  if (p === "Colectivo") return "bg-amber-100 text-amber-700 border-amber-200";
  if (p === "Refrigerio") return "bg-cyan-100 text-cyan-700 border-cyan-200";
  if (p === "Vianda")
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-white text-slate-600 border-slate-200";
};

// --- SUB-COMPONENTES ---
const getBadgeColorClass = (src) => {
  switch (src) {
    case "R":
      return "bg-blue-100 text-blue-600 border-blue-300"; // Región
    case "L":
      return "bg-cyan-100 text-cyan-600 border-cyan-300"; // Localidad
    case "C":
      return "bg-purple-100 text-purple-600 border-purple-300"; // Categoría
    case "P":
      return "bg-amber-100 text-amber-600 border-amber-300"; // Persona
    case "G":
      return "bg-slate-100 text-slate-500 border-slate-300"; // General
    default:
      return "bg-slate-50 text-slate-400 border-slate-200";
  }
};

const MultiSelectCell = ({
  options = [],
  selectedIds,
  onChange,
  placeholder,
  colorClass,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const current = Array.isArray(selectedIds) ? selectedIds : [];

  const theme = useMemo(() => {
    if (colorClass.includes("bg-blue"))
      return {
        bg: "bg-blue-50/50",
        border: "border-blue-100",
        text: "text-blue-400",
      };
    if (colorClass.includes("bg-cyan"))
      return {
        bg: "bg-cyan-50/50",
        border: "border-cyan-100",
        text: "text-cyan-400",
      };
    if (colorClass.includes("bg-purple"))
      return {
        bg: "bg-purple-50/50",
        border: "border-purple-100",
        text: "text-purple-400",
      };
    if (colorClass.includes("bg-amber"))
      return {
        bg: "bg-amber-50/50",
        border: "border-amber-100",
        text: "text-amber-400",
      };
    return {
      bg: "bg-slate-50",
      border: "border-slate-200",
      text: "text-slate-400",
    };
  }, [colorClass]);

  const toggleSelection = (val) => {
    const next = current.includes(val)
      ? current.filter((id) => id !== val)
      : [...current, val];
    onChange(next);
  };

  return (
    <div className="relative min-w-0 flex-1" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`min-h-[30px] p-1 border rounded cursor-pointer flex flex-wrap gap-1 items-center transition-colors ${
          current.length > 0
            ? colorClass + " border-black/10 shadow-sm"
            : `${theme.bg} ${theme.border}`
        }`}
      >
        {current.length === 0 ? (
          <span
            className={`text-[8px] uppercase font-black px-1 ${theme.text}`}
          >
            {placeholder}
          </span>
        ) : (
          current.map((id) => (
            <div
              key={id}
              className="bg-white/30 border border-black/5 px-1.5 py-0.5 rounded text-[8px] font-bold truncate max-w-full"
            >
              {options.find((o) => String(o.val || o.id) === String(id))?.label}
            </div>
          ))
        )}
      </div>
      {isOpen &&
        createPortal(
          <div
            className="fixed bg-white border border-slate-300 shadow-2xl rounded-lg p-2 z-[99999] flex flex-col"
            style={{
              top: containerRef.current?.getBoundingClientRect().bottom + 4,
              left: containerRef.current?.getBoundingClientRect().left,
              width: 280,
              maxHeight: 300,
            }}
          >
            <input
              autoFocus
              className="w-full text-xs border rounded p-1.5 mb-2 outline-none"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="overflow-y-auto flex-1">
              {options
                .filter((o) =>
                  o.label?.toLowerCase().includes(search.toLowerCase()),
                )
                .map((opt) => (
                  <div
                    key={opt.val || opt.id}
                    onClick={() => toggleSelection(opt.val || opt.id)}
                    className={`p-1.5 rounded cursor-pointer hover:bg-slate-100 flex gap-2 items-center text-xs ${current.includes(opt.val || opt.id) ? "font-bold text-indigo-600 bg-indigo-50" : "text-slate-600"}`}
                  >
                    <div
                      className={`w-3.5 h-3.5 border rounded flex items-center justify-center ${current.includes(opt.val || opt.id) ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}
                    >
                      {current.includes(opt.val || opt.id) && (
                        <IconCheck size={10} className="text-white" />
                      )}
                    </div>
                    {opt.label}
                  </div>
                ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

const EventCellEditor = ({
  rule,
  field,
  eventId,
  allEvents,
  tipoEventoIds,
  onRefresh,
  supabase,
  giraId,
  labelDefault,
  onManualUpdate,
  onEditEvent,
  isExternalProcessing,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const loading = isProcessing || isExternalProcessing;
  const event = allEvents?.find((e) => String(e.id) === String(eventId));
  const manualDate =
    field === "comida_inicio"
      ? rule?.comida_inicio_fecha
      : field === "comida_fin"
        ? rule?.comida_fin_fecha
        : rule?.[`fecha_${field}`];

  useEffect(() => {
    setIsProcessing(false);
  }, [eventId]);

  const handleLink = async (id) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("giras_logistica_reglas")
        .update({ [`id_evento_${field}`]: id })
        .eq("id", rule.id);

      if (error) throw error;

      setIsOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const handleUnlink = async (e) => {
    e.stopPropagation();
    if (!confirm("¿Desvincular evento de esta regla?")) return;

    setIsProcessing(true);
    try {
      await supabase
        .from("giras_logistica_reglas")
        .update({ [`id_evento_${field}`]: null })
        .eq("id", rule.id);

      onRefresh();
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  if (event) {
    return (
      <div className="group relative bg-white border border-slate-200 rounded-lg p-2 flex flex-col justify-center shadow-sm w-full min-h-[56px]">
        <div className="flex justify-between items-center mb-1 shrink-0">
          <span
            className={`text-[6px] font-black uppercase px-1 rounded ${field.includes("comida") ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}
          >
            {loading ? "Procesando..." : "Agenda"}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              // AQUI PASAMOS EL CALLBACK setIsOpen(true) para que al desvincular se abra el menú
              onClick={() => onEditEvent(event, () => setIsOpen(true))}
              className="p-0.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              title="Editar"
            >
              <IconEdit size={10} />
            </button>
            <button
              onClick={handleUnlink}
              disabled={isProcessing}
              className="p-0.5 hover:bg-red-50 rounded text-red-500 transition-colors"
              title="Desvincular"
            >
              <IconLinkOff
                size={10}
                className={isProcessing ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>
        <div className="text-[9px] font-black text-slate-800 break-words whitespace-normal leading-tight w-full mb-1">
          {event.descripcion}
        </div>
        {/* FORMATO DE FECHA BREVE AQUI */}
        <div className="text-[8px] font-bold text-slate-400 leading-none shrink-0 italic">
          {formatDateBrief(event.fecha)} • {event?.hora_inicio?.slice(0, 5)} hs
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full overflow-hidden">
      <button
        onClick={() => setIsOpen(true)}
        disabled={loading}
        className={`w-full py-0.5 border border-dashed border-slate-300 rounded text-[8px] font-black uppercase transition-all ${loading ? "opacity-50" : "hover:border-indigo-400 hover:text-indigo-600 bg-slate-50/20"}`}
      >
        {loading ? "Vinculando..." : "Vincular"}
      </button>
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                <h4 className="text-xs font-black uppercase text-slate-700">
                  Vincular: {labelDefault}
                </h4>
                <button onClick={() => setIsOpen(false)}>
                  <IconX size={18} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="max-h-60 overflow-y-auto border rounded-xl divide-y">
                  {allEvents
                    ?.filter((e) =>
                      tipoEventoIds.includes(Number(e.id_tipo_evento)),
                    )
                    .sort((a, b) => a.fecha.localeCompare(b.fecha))
                    .map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => handleLink(ev.id)}
                        className="p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {ev.descripcion}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {formatDateBrief(ev.fecha)} •{" "}
                            {ev.hora_inicio?.slice(0, 5)} hs
                          </div>
                        </div>
                        <IconLink
                          size={14}
                          className="text-slate-300 shrink-0"
                        />
                      </div>
                    ))}
                </div>
                <button
                  onClick={() => {
                    onEditEvent({
                      id_gira: giraId,
                      id_tipo_evento: tipoEventoIds[0],
                      fecha:
                        manualDate || new Date().toISOString().split("T")[0],
                      hora_inicio: "12:00:00",
                      descripcion: labelDefault,
                      visible_agenda: true,
                      _isNew: true,
                      _linkTo: { ruleId: rule.id, field: field },
                    });
                    setIsOpen(false);
                  }}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                >
                  <IconCalendarPlus size={16} /> Crear nuevo
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

const TimelineNode = ({
  icon: Icon,
  date,
  time,
  label,
  colorClass,
  src,
  isLinked,
  onManage,
}) => (
  <div
    onClick={onManage}
    className="flex flex-col items-center min-w-[90px] relative cursor-pointer transition-transform hover:scale-105"
  >
    <div
      className={`p-2.5 rounded-full border-2 bg-white shadow-md mb-2 z-10 relative ${colorClass} ${isLinked ? "ring-2 ring-offset-2 ring-indigo-400" : "border-dashed opacity-70"}`}
    >
      <Icon size={18} />
      {isLinked && (
        <IconLink
          size={10}
          className="absolute -bottom-1 -left-1 bg-indigo-600 text-white rounded-full p-0.5"
        />
      )}

      {src && src !== "-" && (
        <span
          className={`absolute -top-1 -right-2 text-[8px] font-black px-1 rounded border shadow-sm z-20 ${getBadgeColorClass(src)}`}
        >
          {src}
        </span>
      )}
    </div>

    <div className="flex flex-col items-center text-center text-slate-800">
      <span className="text-[7px] font-black uppercase opacity-50 leading-none mb-1 tracking-tighter">
        {label}
      </span>
      <span className="text-[9px] font-black whitespace-nowrap">
        {date
          ? `${getDayLong(date)} ${date?.split("-").reverse().slice(0, 2).join("/")}`
          : "Pendiente"}
      </span>
      <span className="text-[11px] font-black leading-none mt-0.5">
        {time?.slice(0, 5) || "--:--"}
      </span>
    </div>
  </div>
);

// --- 4. COMPONENTE PRINCIPAL ---
export default function LogisticsManager({ supabase, gira }) {
  const {
    summary,
    roster,
    logisticsRules,
    allEvents,
    sedeIds,
    refresh,
    allLocalities,
  } = useLogistics(supabase, gira);
  const [localRules, setLocalRules] = useState([]);
  const [savingStatus, setSavingStatus] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({
    hotel: false,
    range: false,
    meals: true,
  });
  const [collapsedLocalities, setCollapsedLocalities] = useState(new Set());
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMilestones, setActiveMilestones] = useState(() => new Set());
  const [criteriaCollapsed, setCriteriaCollapsed] = useState(true);
  const [catalogs, setCatalogs] = useState({ locations: [], regions: [] });
  const [managingHito, setManagingHito] = useState(null);
  const [editingFormData, setEditingFormData] = useState(null);
  
  const [conflictModal, setConflictModal] = useState(null);
  const [chipPreviewModal, setChipPreviewModal] = useState(null);

  const debounceRef = useRef({});

  useEffect(() => {
    if (logisticsRules?.length > 0)
      setLocalRules(
        [...logisticsRules].sort((a, b) =>
          (a.fecha_checkin || "9999").localeCompare(b.fecha_checkin || "9999"),
        ),
      );
  }, [logisticsRules]);

  const fetchVenues = useCallback(async () => {
    const { data } = await supabase
      .from("locaciones")
      .select("id, nombre, id_localidad, localidades(localidad)");
    setCatalogs((prev) => ({ ...prev, venues: data || [] }));
  }, [supabase]);

  useEffect(() => {
    const fetchC = async () => {
      const [l, r, v, t] = await Promise.all([
        supabase.from("localidades").select("id, localidad"),
        supabase.from("regiones").select("id, region"),
        supabase
          .from("locaciones")
          .select("id, nombre, id_localidad, localidades(localidad)"),
        supabase.from("tipos_evento").select("id, nombre"),
      ]);

      setCatalogs({
        locations: (l.data || []).map((x) => ({
          id: x.id,
          label: x.localidad,
        })),
        regions: (r.data || []).map((x) => ({ id: x.id, label: x.region })),
        venues: v.data || [],
        eventTypes: t.data || [],
      });
    };
    fetchC();
  }, [supabase]);

  const rosterOptions = useMemo(
    () =>
      (roster || [])
        .map((m) => ({ id: m.id, label: `${m.apellido}, ${m.nombre}` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [roster],
  );

  const chipPreviewGrouped = useMemo(() => {
    if (!chipPreviewModal || !roster?.length) return null;
    const { row, chipKey, chipId } = chipPreviewModal;
    const filtered = roster.filter(
      (p) =>
        normalize(p.estado_gira) !== "ausente" &&
        personMatchesLogisticsChip(
          row,
          chipKey,
          chipId,
          p,
          allLocalities,
        ),
    );
    const byCity = {};
    filtered.forEach((p) => {
      const city = p.localidades?.localidad || "Sin localidad";
      if (!byCity[city]) byCity[city] = [];
      const winner = getWinningLogisticsRule(p, logisticsRules, allLocalities);
      byCity[city].push({
        person: p,
        overridden: Boolean(
          winner && Number(winner.id) !== Number(row.id),
        ),
        winnerRule: winner,
      });
    });
    Object.values(byCity).forEach((arr) =>
      arr.sort((a, b) =>
        `${a.person.apellido || ""}, ${a.person.nombre || ""}`.localeCompare(
          `${b.person.apellido || ""}, ${b.person.nombre || ""}`,
          "es",
        ),
      ),
    );
    const cities = Object.keys(byCity).sort((a, b) => a.localeCompare(b, "es"));
    return { byCity, cities, total: filtered.length };
  }, [chipPreviewModal, roster, logisticsRules, allLocalities]);

  const listBeforeMilestoneFilter = useMemo(() => {
    // Excluir ausentes de todos los filtros de la Línea de Tiempo
    let list = (summary || []).filter(
      (m) => (m.estado_gira || "").toLowerCase() !== "ausente",
    );
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (m) =>
          m.nombre?.toLowerCase().includes(term) ||
          m.apellido?.toLowerCase().includes(term),
      );
    }
    if (showOnlyMissing) {
      list = list.filter((m) => {
        const l = m.logistics;
        const isLocal = m.is_local;
        const missingCheckIn = !isLocal && !l.checkin?.date;
        const missingCheckOut = !isLocal && !l.checkout?.date;
        const missingSubida = !l.transports[0]?.subidaData?.date;
        const missingBajada = !l.transports[0]?.bajadaData?.date;
        return (
          missingCheckIn || missingCheckOut || missingSubida || missingBajada
        );
      });
    }
    return list;
  }, [summary, searchTerm, showOnlyMissing]);

  const missingCountsByMilestone = useMemo(() => {
    const counts = {};
    MILESTONES.forEach((m) => {
      counts[m.key] = listBeforeMilestoneFilter.filter((p) =>
        isPersonMissingMilestone(p, m.key),
      ).length;
    });
    return counts;
  }, [listBeforeMilestoneFilter]);

  const groupedSummary = useMemo(() => {
    let list = listBeforeMilestoneFilter;
    if (activeMilestones.size > 0) {
      list = list.filter((m) =>
        Array.from(activeMilestones).some((key) =>
          isPersonMissingMilestone(m, key),
        ),
      );
    }
    return list.reduce((acc, p) => {
      const city = p.localidades?.localidad || "Sin Localidad";
      if (!acc[city]) acc[city] = [];
      acc[city].push(p);
      return acc;
    }, {});
  }, [listBeforeMilestoneFilter, activeMilestones]);

  const filteredCount =
    activeMilestones.size > 0
      ? Object.values(groupedSummary).reduce(
          (acc, members) => acc + members.length,
          0,
        )
      : null;

  const handleRowChange = (idx, field, val) => {
    setLocalRules((prev) => {
      const n = [...prev];
      n[idx] = { ...n[idx], [field]: val };
      const rId = n[idx].id;
      if (debounceRef.current[`${rId}-${field}`])
        clearTimeout(debounceRef.current[`${rId}-${field}`]);
      debounceRef.current[`${rId}-${field}`] = setTimeout(async () => {
        setSavingStatus((p) => ({ ...p, [`${rId}-${field}`]: "saving" }));
        await supabase
          .from("giras_logistica_reglas")
          .update({ [field]: val })
          .eq("id", rId);
        setSavingStatus((p) => ({ ...p, [`${rId}-${field}`]: "success" }));
        refresh();
        setTimeout(
          () =>
            setSavingStatus((p) => {
              const next = { ...p };
              delete next[`${rId}-${field}`];
              return next;
            }),
          2000,
        );
      }, 800);
      return n;
    });
  };

  const getEventAssociations = (eventId) => {
    if (!eventId || !logisticsRules) return "";

    const relatedRules = logisticsRules.filter(
      (r) =>
        Number(r.id_evento_checkin) === Number(eventId) ||
        Number(r.id_evento_checkout) === Number(eventId) ||
        Number(r.id_evento_comida_inicio) === Number(eventId) ||
        Number(r.id_evento_comida_fin) === Number(eventId),
    );

    if (relatedRules.length === 0) return "No se encontraron asociaciones";

    const associations = new Set();
    relatedRules.forEach((r) => {
      if (normalize(r.alcance) === "general") associations.add("Toda la gira");

      (r.target_regions || []).forEach((id) => {
        const label = catalogs.regions.find(
          (x) => Number(x.id) === Number(id),
        )?.label;
        if (label) associations.add(label);
      });
      (r.target_localities || []).forEach((id) => {
        const label = catalogs.locations.find(
          (x) => Number(x.id) === Number(id),
        )?.label;
        if (label) associations.add(label);
      });
      (r.target_categories || []).forEach((cat) => {
        const label = CATEGORIA_OPTIONS.find((x) => x.val === cat)?.label;
        if (label) associations.add(label);
      });
      (r.target_ids || []).forEach((id) => {
        const label = rosterOptions.find(
          (x) => Number(x.id) === Number(id),
        )?.label;
        if (label) associations.add(label);
      });

      if (r.id_integrante)
        associations.add(
          rosterOptions.find((x) => Number(x.id) === Number(r.id_integrante))
            ?.label,
        );
      if (r.id_localidad)
        associations.add(
          catalogs.locations.find(
            (x) => Number(x.id) === Number(r.id_localidad),
          )?.label,
        );
      if (r.id_region)
        associations.add(
          catalogs.regions.find((x) => Number(x.id) === Number(r.id_region))
            ?.label,
        );
    });

    return Array.from(associations).filter(Boolean).join(", ");
  };

  const getRelatedRules = (eventId, rules) => {
    if (!eventId || !rules) return [];
    return rules.filter(
      (r) =>
        String(r.id_evento_checkin) === String(eventId) ||
        String(r.id_evento_checkout) === String(eventId) ||
        String(r.id_evento_comida_inicio) === String(eventId) ||
        String(r.id_evento_comida_fin) === String(eventId)
    );
  };

  // --- LÓGICA DE CONFLICTOS ---
  const handleRequestEditEvent = (event, ruleId, field, openLinkMenu) => {
    const related = getRelatedRules(event.id, logisticsRules);
    
    // Si solo se usa en 1 regla (o ninguna, raro), editamos directo
    if (related.length <= 1) {
      setEditingFormData(event);
      return;
    }

    // Si hay conflicto, mostramos modal y guardamos el callback del hijo
    const summaryText = getEventAssociations(event.id);
    setConflictModal({
      isOpen: true,
      event,
      ruleId,
      field,
      summary: summaryText,
      count: related.length,
      onRelink: openLinkMenu // Guardamos la función para abrir el popup del hijo
    });
  };

  const confirmEditShared = () => {
    if (conflictModal?.event) {
      setEditingFormData(conflictModal.event);
    }
    setConflictModal(null);
  };

  const confirmCreateNew = () => {
    if (conflictModal?.event) {
      const { event, ruleId, field } = conflictModal;
      setEditingFormData({
        ...event,
        id: undefined, 
        _isNew: true,
        _linkTo: { ruleId, field }, 
        fecha: event.fecha || new Date().toISOString().split("T")[0],
        hora_inicio: event.hora_inicio || "12:00:00",
      });
    }
    setConflictModal(null);
  };

  // --- NUEVA FUNCIÓN PARA DESVINCULAR Y RE-VINCULAR ---
  const confirmRelink = async () => {
     if (!conflictModal) return;
     const { ruleId, field, onRelink } = conflictModal;
     
     // 1. Desvincular en BD (usando tu función existente)
     await handleUnlinkGlobal(ruleId, field);
     
     // 2. Cerrar modal de conflicto
     setConflictModal(null);
     
     // 3. Activar el popup "Vincular" en el hijo (si se pasó el callback)
     if (onRelink) {
         // Pequeño timeout para dar tiempo a que se cierre el modal anterior y se refresque la UI
         setTimeout(() => onRelink(), 100);
     }
  };


  const handleSaveEvent = async () => {
    if (!editingFormData) return;

    const { id, _isNew, _linkTo, ...rest } = editingFormData;

    const statusKey = _linkTo ? `${_linkTo.ruleId}-${_linkTo.field}` : null;
    if (statusKey) setSavingStatus((p) => ({ ...p, [statusKey]: "saving" }));

    const cleanPayload = {
      fecha: rest.fecha || editingFormData.date,
      hora_inicio: rest.hora_inicio || editingFormData.time,
      descripcion: rest.descripcion,
      id_tipo_evento: rest.id_tipo_evento,
      id_locacion: rest.id_locacion,
      id_gira_transporte: rest.id_gira_transporte ?? null,
      visible_agenda: rest.visible_agenda,
      convocados: rest.convocados,
      notas: rest.notas,
      id_gira: rest.id_gira,
    };

    try {
      let finalEventId = id;
      if (_isNew) {
        const { data, error } = await supabase
          .from("eventos")
          .insert(cleanPayload)
          .select()
          .single();
        if (error) throw error;
        finalEventId = data.id;
      } else {
        const { error } = await supabase
          .from("eventos")
          .update(cleanPayload)
          .eq("id", id);
        if (error) throw error;
      }

      if (_linkTo) {
        const columnName = _linkTo.field.startsWith("id_evento_")
          ? _linkTo.field
          : `id_evento_${_linkTo.field}`;
        await supabase
          .from("giras_logistica_reglas")
          .update({ [columnName]: finalEventId })
          .eq("id", _linkTo.ruleId);
      }

      if (statusKey) setSavingStatus((p) => ({ ...p, [statusKey]: "success" }));
      setEditingFormData(null);
      refresh();

      if (statusKey)
        setTimeout(
          () =>
            setSavingStatus((p) => {
              const n = { ...p };
              delete n[statusKey];
              return n;
            }),
          2000,
        );
    } catch (error) {
      if (statusKey)
        setSavingStatus((p) => {
          const n = { ...p };
          delete n[statusKey];
          return n;
        });
      alert("Error: " + error.message);
    }
  };

  const handleUnlinkGlobal = async (ruleId, field) => {
    if (!ruleId || !field) return;

    const columnName = field.startsWith("id_evento_")
      ? field
      : `id_evento_${field}`;

    const { error } = await supabase
      .from("giras_logistica_reglas")
      .update({ [columnName]: null })
      .eq("id", ruleId);

    if (!error) {
      setManagingHito(null);
      refresh();
    }
  };

  const toggleLocality = (city) => {
    setCollapsedLocalities((prev) => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city);
      else next.add(city);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-200 animate-in fade-in font-sans overflow-hidden">
      <div className="flex-1 overflow-auto p-4 space-y-8">
        {/* HEADER */}
        <div className="bg-white border-2 border-slate-300 rounded-xl shadow-2xl overflow-hidden overflow-x-auto">
          {/* TABLA ADAPTATIVA */}
          <div className="bg-white border-b border-slate-300 p-1.5 md:p-2 flex justify-between items-center z-0 shrink-0 mb-2">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                <IconSettings className="text-indigo-500" size={18} /> Logística
              </h3>
              <ManualTrigger section="logistica_chips" />

              <button
                onClick={() => setCriteriaCollapsed(!criteriaCollapsed)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] md:text-[9px] font-black uppercase transition-all border-2 ${criteriaCollapsed ? "bg-indigo-600 text-white border-indigo-800 shadow-sm" : "bg-white text-slate-500 border-slate-300"}`}
              >
                {criteriaCollapsed ? "Chips" : "Editor"}
              </button>
            </div>

            <div className="flex gap-1">
              {[
                { key: "hotel", label: "Hotel", color: "bg-orange-600" },
                { key: "range", label: "Comidas", color: "bg-emerald-600" },
                { key: "meals", label: "Proveedores", color: "bg-amber-600" },
              ].map((g) => (
                <button
                  key={g.key}
                  onClick={() =>
                    setCollapsedGroups((p) => ({ ...p, [g.key]: !p[g.key] }))
                  }
                  className={`px-2 py-0.5 rounded-md text-[8px] md:text-[9px] font-black uppercase border-2 transition-all ${!collapsedGroups[g.key] ? `${g.color} text-white border-black/10` : "bg-slate-300 text-slate-500 border-slate-400"}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-800 text-white uppercase font-black text-[9px] z-10">
              <tr>
                <th
                  className={`px-3 py-4 border-r border-white/10 sticky left-0 z-40 bg-slate-800 ${criteriaCollapsed ? "w-[18%]" : "w-[45%]"}`}
                >
                  Aplicación
                </th>
                {!collapsedGroups.hotel && (
                  <>
                    <th
                      className={`px-2 py-4 ${criteriaCollapsed ? "w-[18%]" : "w-[12%]"} border-r border-white/10 bg-orange-900/40 text-center`}
                    >
                      Check-In
                    </th>
                    <th
                      className={`px-2 py-4 ${criteriaCollapsed ? "w-[18%]" : "w-[12%]"} border-r border-white/10 bg-orange-900/40 text-center`}
                    >
                      Check-Out
                    </th>
                  </>
                )}
                {!collapsedGroups.range && (
                  <>
                    <th
                      className={`px-2 py-4 ${criteriaCollapsed ? "w-[18%]" : "w-[12%]"} border-r border-white/10 bg-emerald-900/40 text-center text-emerald-200`}
                    >
                      Inicio
                    </th>
                    <th
                      className={`px-2 py-4 ${criteriaCollapsed ? "w-[18%]" : "w-[12%]"} border-r border-white/10 bg-emerald-900/40 text-center text-emerald-200`}
                    >
                      Fin
                    </th>
                  </>
                )}
                {!collapsedGroups.meals && (
                  <th className="px-2 py-4 w-[15%] border-r border-white/10 bg-amber-900/40 text-center">
                    Proveedores
                  </th>
                )}
                <th className="px-2 py-4 w-10 text-center bg-slate-800 shrink-0"></th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-slate-100">
              {localRules.map((row, idx) => (
                <tr
                  key={row.id}
                  className="odd:bg-white even:bg-slate-50/80 align-top"
                >
                  <td className="p-2 border-r border-slate-200 sticky left-0 z-20 bg-inherit shadow-r overflow-hidden min-w-0">
                    {criteriaCollapsed ? (
                      // VISTA COMPACTA (CHIPS)
                      <div className="flex flex-col gap-0.5 w-full">
                        {[
                          { k: "target_regions", c: "bg-blue-600" },
                          { k: "target_localities", c: "bg-cyan-600" },
                          { k: "target_categories", c: "bg-purple-600" },
                          { k: "target_ids", c: "bg-amber-600" },
                        ].flatMap((s) =>
                          (row[s.k] || []).map((id) => {
                            const chipLabel =
                              (s.k === "target_regions"
                                ? catalogs.regions
                                : s.k === "target_localities"
                                  ? catalogs.locations
                                  : s.k === "target_categories"
                                    ? CATEGORIA_OPTIONS
                                    : rosterOptions
                              )?.find(
                                (o) => String(o.val || o.id) === String(id),
                              )?.label ?? "?";
                            return (
                              <div
                                key={`${row.id}-${s.k}-${id}`}
                                className="flex items-stretch gap-0.5 min-w-0"
                              >
                                <div
                                  className={`${s.c} text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase truncate shadow-sm flex-1 min-w-0`}
                                >
                                  {chipLabel}
                                </div>
                                <button
                                  type="button"
                                  title="Ver quiénes aplican por este criterio"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setChipPreviewModal({
                                      row,
                                      chipKey: s.k,
                                      chipId: id,
                                      chipLabel,
                                    });
                                  }}
                                  className="shrink-0 flex items-center justify-center w-5 rounded border border-white/30 bg-white/15 text-white/90 hover:bg-white hover:text-indigo-700 hover:border-indigo-300 transition-colors"
                                >
                                  <IconHelpCircle size={12} />
                                </button>
                              </div>
                            );
                          }),
                        )}
                      </div>
                    ) : (
                      // VISTA EDITOR (4 COLUMNAS)
                      <div className="grid grid-cols-4 gap-1 w-full animate-in fade-in slide-in-from-left-2 duration-200">
                        <MultiSelectCell
                          placeholder="Regiones"
                          options={catalogs.regions}
                          selectedIds={row.target_regions}
                          onChange={(v) =>
                            handleRowChange(idx, "target_regions", v)
                          }
                          colorClass="bg-blue-600 text-white"
                        />
                        <MultiSelectCell
                          placeholder="Localidades"
                          options={catalogs.locations}
                          selectedIds={row.target_localities}
                          onChange={(v) =>
                            handleRowChange(idx, "target_localities", v)
                          }
                          colorClass="bg-cyan-600 text-white"
                        />
                        <MultiSelectCell
                          placeholder="Categorías"
                          options={CATEGORIA_OPTIONS}
                          selectedIds={row.target_categories}
                          onChange={(v) =>
                            handleRowChange(idx, "target_categories", v)
                          }
                          colorClass="bg-purple-600 text-white"
                        />
                        <MultiSelectCell
                          placeholder="Personas"
                          options={rosterOptions}
                          selectedIds={row.target_ids}
                          onChange={(v) =>
                            handleRowChange(idx, "target_ids", v)
                          }
                          colorClass="bg-amber-600 text-white"
                        />
                      </div>
                    )}
                  </td>
                  {!collapsedGroups.hotel && (
                    <>
                      <td className="p-1 border-r border-slate-200 bg-orange-50/10 min-w-0">
                        <EventCellEditor
                          rule={row}
                          field="checkin"
                          eventId={row.id_evento_checkin}
                          allEvents={allEvents}
                          tipoEventoIds={[22]}
                          onRefresh={refresh}
                          supabase={supabase}
                          giraId={gira.id}
                          labelDefault="Check-In"
                          onManualUpdate={(f, v) => handleRowChange(idx, f, v)}
                          // PASAMOS EL CALLBACK
                          onEditEvent={(evt, triggerOpen) => handleRequestEditEvent(evt, row.id, "checkin", triggerOpen)}
                          locations={catalogs.venues}
                          eventTypes={catalogs.eventTypes}
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200 bg-orange-50/10 min-w-0">
                        <EventCellEditor
                          rule={row}
                          field="checkout"
                          eventId={row.id_evento_checkout}
                          allEvents={allEvents}
                          tipoEventoIds={[23]}
                          onRefresh={refresh}
                          supabase={supabase}
                          giraId={gira.id}
                          labelDefault="Check-Out"
                          onManualUpdate={(f, v) => handleRowChange(idx, f, v)}
                          onEditEvent={(evt, triggerOpen) => handleRequestEditEvent(evt, row.id, "checkout", triggerOpen)}
                          locations={catalogs.venues}
                          eventTypes={catalogs.eventTypes}
                        />
                      </td>
                    </>
                  )}
                  {!collapsedGroups.range && (
                    <>
                      <td className="p-1 border-r border-slate-200 bg-emerald-50/10 min-w-0">
                        <EventCellEditor
                          rule={row}
                          field="comida_inicio"
                          eventId={row.id_evento_comida_inicio}
                          allEvents={allEvents}
                          tipoEventoIds={[7, 8, 9, 10]}
                          onRefresh={refresh}
                          supabase={supabase}
                          giraId={gira.id}
                          labelDefault={row.comida_inicio_servicio || "Inicio"}
                          onManualUpdate={(f, v) => handleRowChange(idx, f, v)}
                          onEditEvent={(evt, triggerOpen) => handleRequestEditEvent(evt, row.id, "comida_inicio", triggerOpen)}
                          locations={catalogs.venues}
                          eventTypes={catalogs.eventTypes}
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200 bg-emerald-50/10 min-w-0">
                        <EventCellEditor
                          rule={row}
                          field="comida_fin"
                          eventId={row.id_evento_comida_fin}
                          allEvents={allEvents}
                          tipoEventoIds={[7, 8, 9, 10]}
                          onRefresh={refresh}
                          supabase={supabase}
                          giraId={gira.id}
                          labelDefault={row.comida_fin_servicio || "Fin"}
                          onManualUpdate={(f, v) => handleRowChange(idx, f, v)}
                          onEditEvent={(evt, triggerOpen) => handleRequestEditEvent(evt, row.id, "comida_fin", triggerOpen)}
                          locations={catalogs.venues}
                          eventTypes={catalogs.eventTypes}
                        />
                      </td>
                    </>
                  )}
                  {!collapsedGroups.meals && (
                    <td className="p-2 border-r border-slate-200 bg-amber-50/10 min-w-0">
                      <div className="grid grid-cols-2 gap-1">
                        {["desayuno", "almuerzo", "merienda", "cena"].map(
                          (m) => (
                            <div
                              key={m}
                              className="flex flex-col border border-amber-200 rounded p-1 bg-white"
                            >
                              <span className="text-[6px] font-black text-amber-500 uppercase px-1 shrink-0">
                                {m.slice(0, 3)}
                              </span>
                              <select
                                className={`w-full text-[9px] font-black bg-transparent border-none outline-none ${getProviderColorClass(row[`prov_${m}`])}`}
                                value={row[`prov_${m}`] || ""}
                                onChange={(e) =>
                                  handleRowChange(
                                    idx,
                                    `prov_${m}`,
                                    e.target.value,
                                  )
                                }
                              >
                                {PROVEEDORES_COMIDA.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ),
                        )}
                      </div>
                    </td>
                  )}
                  <td className="p-1 text-center w-10 shrink-0">
                    <button
                      onClick={async () => {
                        if (confirm("¿Eliminar bloque de reglas?")) {
                          await supabase
                            .from("giras_logistica_reglas")
                            .delete()
                            .eq("id", row.id);
                          refresh();
                        }
                      }}
                      className="mx-auto w-7 h-7 flex items-center justify-center rounded-full text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                    >
                      <IconTrash size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={async () => {
              // 1. Insertamos el nuevo bloque
              await supabase
                .from("giras_logistica_reglas")
                .insert({ id_gira: gira.id, alcance: "Combinado" });

              // 2. Refrescamos los datos
              refresh();

              // 3. CAMBIO: Forzamos la vista de "Editor" para poder cargar los datos inmediatamente
              setCriteriaCollapsed(false);
            }}
            className="w-full py-4 bg-slate-50 hover:bg-indigo-700 hover:text-white text-indigo-700 text-xs font-black uppercase transition-all tracking-widest border-t border-slate-200 shrink-0"
          >
            <IconPlus size={18} className="inline mr-2" /> Nuevo Bloque
          </button>
        </div>

        {/* WATERFALL */}
        <div className="pb-24 space-y-6">
          <div className="flex justify-between items-center border-b-2 border-slate-300 pb-2">
            <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
              <IconCheck className="text-indigo-500" size={20} /> Línea de
              Tiempo
              <ManualTrigger section="logistica_linea_de_tiempo" />
            </h3>

            {/* CONTENEDOR DE FILTROS */}
            <div className="flex gap-2 items-center">
              {/* CANTIDAD FILTRADOS (izquierda del buscador) */}
              {filteredCount !== null && (
                <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-lg shrink-0">
                  {filteredCount} filtrados
                </span>
              )}
              {/* BUSCADOR DE NOMBRE */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="BUSCAR POR NOMBRE..."
                  className="pl-3 pr-8 py-1.5 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:border-indigo-400 w-44 transition-all placeholder:text-slate-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                  >
                    <IconX size={14} />
                  </button>
                )}
              </div>

              {/* BOTÓN FALTANTES */}
              <button
                onClick={() => setShowOnlyMissing(!showOnlyMissing)}
                className={`px-3 py-1.5 rounded-xl text-[9px] md:text-[10px] font-black border-2 transition-all ${
                  showOnlyMissing
                    ? "bg-red-600 text-white border-red-700 shadow-md"
                    : "bg-white text-slate-400 border-slate-200"
                }`}
              >
                {showOnlyMissing ? "Viendo Faltantes" : "Filtrar Faltantes"}
              </button>

              {/* FILTRO POR HITOS: mostrar a quiénes les falta alguno seleccionado */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3 ml-1">
                <span className="text-[8px] font-black text-slate-400 uppercase mr-1 shrink-0">
                  Falta:
                </span>
                <div className="flex gap-2 flex-wrap">
                  {MILESTONE_BLOCKS.map(({ label, keys, activeClass }) => {
                    const hasAnySelected = keys.some((k) =>
                      activeMilestones.has(k),
                    );
                    const containerClass = hasAnySelected
                      ? activeClass
                      : "border-slate-200 bg-slate-50";
                    return (
                      <div
                        key={label}
                        className={`flex items-center gap-1 p-1.5 rounded-xl border-2 transition-colors ${containerClass}`}
                      >
                        <div className="flex gap-0.5">
                          {keys.map((key) => {
                            const m = MILESTONES.find((x) => x.key === key);
                            const Icon = m?.icon;
                            const isActive = activeMilestones.has(key);
                            const count = missingCountsByMilestone[key] ?? 0;
                            const buttonActiveClass =
                              m?.colorType === "inicio"
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-red-600 text-white border-red-600";
                            const buttonInactiveClass =
                              "bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300";
                            return (
                              <div
                                key={key}
                                className="flex flex-col items-center gap-0.5"
                              >
                                <span className="text-[9px] font-black text-slate-500">
                                  {count}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMilestones((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(key)) next.delete(key);
                                      else next.add(key);
                                      return next;
                                    });
                                  }}
                                  title={`Filtrar: sin ${m?.label}`}
                                  className={`p-1 rounded-lg border-2 transition-all ${
                                    isActive ? buttonActiveClass : buttonInactiveClass
                                  }`}
                                >
                                  <Icon size={14} />
                                  <span className="sr-only">{m?.label}</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {Object.entries(groupedSummary).map(([city, members]) => (
            <div
              key={city}
              className="bg-white border-2 border-slate-300 rounded-2xl shadow-lg overflow-hidden mb-6"
            >
              <div
                onClick={() => toggleLocality(city)}
                className="bg-slate-50 p-3 flex items-center justify-between cursor-pointer border-b border-slate-200 hover:bg-white transition-colors"
              >
                <span className="flex items-center gap-2 font-black text-slate-700 uppercase tracking-widest text-xs">
                  <IconMapPin size={14} className="text-indigo-500" /> {city}{" "}
                  <span className="ml-2 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px]">
                    {members.length}
                  </span>
                </span>
                {collapsedLocalities.has(city) ? (
                  <IconChevronRight size={16} />
                ) : (
                  <IconChevronDown size={16} />
                )}
              </div>
              {!collapsedLocalities.has(city) && (
                <div className="divide-y-2 divide-slate-50 overflow-x-auto bg-slate-50/30 no-scrollbar">
                  {members.map((m) => {
                    const l = m.logistics;
                    const missingNodes = [
                      {
                        id: "sub",
                        show: !l.transports[0]?.subidaData?.date,
                        icon: IconBus,
                      },
                      {
                        id: "checkin",
                        show: !m.is_local && !l.checkin?.date,
                        icon: IconHotel,
                      },
                      {
                        id: "checkout",
                        show: !m.is_local && !l.checkout?.date,
                        icon: IconHotel,
                      },
                      {
                        id: "baj",
                        show: !l.transports[0]?.bajadaData?.date,
                        icon: IconBus,
                      },
                    ].filter((n) => n.show);
                    const allPossible = [
                      {
                        id: "sub",
                        date: l.transports[0]?.subidaData?.date,
                        time: l.transports[0]?.subidaData?.time,
                        label: `Subida ${l.transports[0]?.nombre || ""}`,
                        icon: IconBus,
                        colorClass: "text-blue-600 border-blue-600 bg-blue-50",
                        isLinked: true,
                        id_evento: l.transports[0]?.subidaData?.id_evento,
                        descripcion: l.transports[0]?.subidaData?.descripcion,
                      },
                      {
                        id: "f_in",
                        ...l.comida_inicio,
                        label: `In. ${l.comida_inicio?.svc || "Com."}`,
                        icon: IconUtensils,
                        colorClass:
                          "text-emerald-600 border-emerald-600 bg-emerald-50",
                        field: "id_evento_comida_inicio",
                      },
                      {
                        id: "c_in",
                        ...l.checkin,
                        label: "Check-In",
                        icon: IconHotel,
                        colorClass:
                          "text-orange-600 border-orange-600 bg-orange-50",
                        field: "id_evento_checkin",
                      },
                      {
                        id: "c_out",
                        ...l.checkout,
                        label: "Check-Out",
                        icon: IconHotel,
                        colorClass:
                          "text-orange-600 border-orange-600 bg-orange-50",
                        field: "id_evento_checkout",
                      },
                      {
                        id: "f_out",
                        ...l.comida_fin,
                        label: `Fin ${l.comida_fin?.svc || "Com."}`,
                        icon: IconUtensils,
                        colorClass:
                          "text-emerald-600 border-emerald-600 bg-emerald-50",
                        field: "id_evento_comida_fin",
                      },
                      {
                        id: "baj",
                        date: l.transports[0]?.bajadaData?.date,
                        time: l.transports[0]?.bajadaData?.time,
                        label: `Bajada ${l.transports[0]?.nombre || ""}`,
                        icon: IconBus,
                        colorClass: "text-blue-600 border-blue-600 bg-blue-50",
                        isLinked: true,
                        id_evento: l.transports[0]?.bajadaData?.id_evento,
                        descripcion: l.transports[0]?.bajadaData?.descripcion,
                      },
                    ];
                    const established = allPossible
                      .filter((e) => e.date)
                      .sort(
                        (a, b) =>
                          new Date(`${a.date}T${a.time || "00:00"}`) -
                          new Date(`${b.date}T${b.time || "00:00"}`),
                      );
                    return (
                      <div
                        key={m.id}
                        className="p-4 flex items-center gap-6 min-w-full hover:bg-white group"
                      >
                        <div className="w-44 shrink-0">
                          <div className="font-black text-slate-900 uppercase leading-tight text-xs tracking-tighter">
                            {m.apellido}, {m.nombre}
                          </div>
                          <div className="text-[8px] text-slate-400 font-bold uppercase mt-1">
                            {m.rol_gira || m.rol}
                          </div>
                        </div>
                        <div className="flex-1 flex items-center justify-between gap-2 px-2">
                          {established.map((node, idx) => {
                            const next = established[idx + 1];
                            const diff = next
                              ? formatDiff(
                                  new Date(
                                    `${next.date}T${next.time || "00:00"}`,
                                  ) -
                                    new Date(
                                      `${node.date}T${node.time || "00:00"}`,
                                    ),
                                )
                              : null;
                            return (
                              <React.Fragment key={node.id}>
                                <TimelineNode
                                  {...node}
                                  onManage={() =>
                                    node.isLinked &&
                                    setManagingHito({ ...node })
                                  }
                                />
                                {next && (
                                  <div className="flex-grow h-[2px] min-w-[20px] bg-slate-200 relative">
                                    <div className="absolute inset-0 border-t-2 border-dotted border-slate-300"></div>
                                    {diff && (
                                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-0.5 rounded-full border text-[10px] font-black text-slate-600 shadow-sm z-20">
                                        {diff}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                        {missingNodes.length > 0 && (
                          <div className="flex gap-1.5 items-center pl-4 border-l-2 border-red-100 border-dashed shrink-0 animate-pulse">
                            {missingNodes.map((node) => (
                              <div
                                key={node.id}
                                className="p-1.5 rounded-full border-2 border-red-500 text-red-500 bg-red-50 shadow-sm"
                                title="Dato faltante"
                              >
                                <node.icon size={14} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* POPUP VÍNCULO */}
      {managingHito && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setManagingHito(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER DEL POPUP */}
            <div
              className={`p-6 text-center ${managingHito.colorClass} border-b-4 border-black/5`}
            >
              <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg mb-4">
                <managingHito.icon size={32} />
              </div>
              <h4 className="font-black uppercase text-xl tracking-tighter">
                {managingHito.label}
              </h4>
              <p className="text-[10px] font-bold opacity-70 mt-1 uppercase text-slate-600">
                Vínculo Agenda
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* DESCRIPCIÓN DEL EVENTO */}
              <span className="text-sm font-bold text-slate-800 leading-tight block text-center">
                {managingHito.descripcion}
              </span>

              {/* --- NUEVO BLOQUE DE ASOCIACIONES --- */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">
                  Afecta a:
                </p>
                <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                  {getEventAssociations(managingHito.id_evento)}{" "}
                </p>
              </div>
              {/* ------------------------------------ */}

              <div className="flex justify-center">
                <button
                  onClick={() => {
                    const targetEv = allEvents?.find(
                      (e) => Number(e.id) === Number(managingHito.id_evento),
                    );
                    if (targetEv) {
                      setEditingFormData(targetEv);
                      setManagingHito(null);
                    }
                  }}
                  className="flex flex-col items-center p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all group"
                >
                  <IconEdit size={20} />
                  <span className="text-[9px] font-black uppercase mt-2">
                    Editar
                  </span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setManagingHito(null)}
              className="w-full py-4 bg-slate-50 text-slate-400 text-[10px] font-black uppercase hover:bg-slate-100 border-t"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {chipPreviewModal && (
        <div
          className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-[280] flex items-center justify-center p-4"
          onClick={() => setChipPreviewModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-start gap-2 bg-slate-50">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                  <IconHelpCircle className="text-indigo-500 shrink-0" size={18} />
                  <span className="truncate">
                    {chipPreviewModal.chipLabel}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                  Criterio en regla #{chipPreviewModal.row.id}
                  {chipPreviewGrouped != null && (
                    <span className="text-slate-700">
                      {" "}
                      · {chipPreviewGrouped.total} persona
                      {chipPreviewGrouped.total !== 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChipPreviewModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200"
                aria-label="Cerrar"
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="px-4 py-2 bg-amber-50/80 border-b border-amber-100">
              <p className="text-[10px] text-amber-900 leading-snug">
                <span className="font-bold">Prioridad:</span> si una persona
                aparece en ámbar, otra regla con mayor especificidad (persona
                &gt; categoría &gt; localidad &gt; región &gt; general) es la
                que define los hitos en la práctica.
              </p>
            </div>
            <div className="overflow-y-auto flex-1 p-0 min-h-0">
              {!chipPreviewGrouped || chipPreviewGrouped.total === 0 ? (
                <p className="p-6 text-sm text-slate-500 text-center">
                  Nadie del roster coincide con este criterio bajo esta regla
                  (o todos están ausentes).
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {chipPreviewGrouped.cities.map((city) => (
                    <div key={city} className="px-4 py-3">
                      <div className="text-[10px] font-black uppercase text-slate-400 mb-2 flex items-center gap-1 border-b border-slate-100 pb-1">
                        <IconMapPin size={12} className="text-cyan-500" />
                        {city}
                      </div>
                      <ul className="space-y-1.5">
                        {chipPreviewGrouped.byCity[city].map(
                          ({ person, overridden, winnerRule }) => (
                            <li
                              key={person.id}
                              className={`text-[11px] rounded-lg px-2 py-1.5 border ${
                                overridden
                                  ? "bg-amber-50 border-amber-200 text-amber-950"
                                  : "bg-slate-50 border-slate-100 text-slate-800"
                              }`}
                            >
                              <div className="font-bold">
                                {person.apellido}, {person.nombre}
                              </div>
                              {overridden && winnerRule && (
                                <div className="text-[9px] mt-0.5 font-semibold text-amber-800">
                                  Gana otra regla (más específica): #
                                  {winnerRule.id}
                                  {normalize(winnerRule.alcance) === "general"
                                    ? " · alcance general"
                                    : ""}
                                </div>
                              )}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* CONFLICT MODAL */}
      {conflictModal && conflictModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
             <div className="p-5 border-b bg-slate-50">
               <h3 className="font-black text-slate-800 uppercase flex items-center gap-2">
                 <IconAlertCircle className="text-orange-500" /> Evento Compartido
               </h3>
             </div>
             <div className="p-6 space-y-4 text-sm text-slate-600">
               <p>
                 Estás intentando editar el evento <strong>"{conflictModal.event.descripcion}"</strong>.
               </p>
               <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl">
                 <p className="text-xs font-bold text-orange-800 mb-1 uppercase">Afecta a {conflictModal.count} reglas:</p>
                 <p className="text-xs text-orange-900 italic leading-relaxed">
                   {conflictModal.summary}
                 </p>
               </div>
               <p className="font-medium">¿Qué deseas hacer?</p>
             </div>
             <div className="p-4 bg-slate-50 border-t flex flex-col gap-2">
               <button 
                 onClick={confirmEditShared}
                 className="w-full py-3 bg-white border-2 border-orange-200 text-orange-700 rounded-xl font-bold uppercase text-xs hover:bg-orange-50 transition-colors shadow-sm"
               >
                 Editar para TODOS (Mantener vínculo)
               </button>
               <button 
                 onClick={confirmCreateNew}
                 className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs hover:bg-indigo-700 transition-colors shadow-lg"
               >
                 <IconCalendarPlus size={14} className="inline mr-1"/> Crear Copia Individual
               </button>
               
               {/* NUEVO BOTÓN: DESVINCULAR Y ASIGNAR OTRO */}
               <button 
                 onClick={confirmRelink}
                 className="w-full py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold uppercase text-xs hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-2"
               >
                 <IconExchange size={14} /> Desvincular y Asignar Otro
               </button>

               <button 
                 onClick={() => setConflictModal(null)}
                 className="mt-2 text-xs font-bold text-slate-400 uppercase hover:text-slate-600"
               >
                 Cancelar
               </button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL EVENTFORM */}
      {editingFormData && (editingFormData.id || editingFormData._isNew) && (
        <div
          className="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in"
          onClick={() => setEditingFormData(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
            <EventForm
              formData={editingFormData}
              setFormData={setEditingFormData}
              onSave={handleSaveEvent}
              onClose={() => setEditingFormData(null)}
              locations={catalogs.venues}
              eventTypes={catalogs.eventTypes}
              supabase={supabase}
              onRefreshLocations={fetchVenues}
              giraId={editingFormData?.id_gira}
            />
          </div>
        </div>
      )}

      <style>{`
        .shadow-r { box-shadow: 6px 0 12px -4px rgba(0,0,0,0.15); }
        input[type="date"], input[type="time"] { text-align: center !important; font-weight: 800; border: none !important; background: transparent !important; width: 100% !important; font-size: 9px !important; outline: none !important; padding: 0 !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}