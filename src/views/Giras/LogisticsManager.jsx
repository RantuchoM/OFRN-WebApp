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
  IconMusic,
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import {
  useLogistics,
  getMatchStrength,
  pickWinningLogisticsRule,
  getCategoriaLogistica,
} from "../../hooks/useLogistics";
import {
  resolveRulePrimaryInstant,
  resolveRuleFieldInstant,
  categoryMatches,
  resolvePersonEnsambleIds,
  ruleHasMealMilestones,
  personIsLocalAtHit,
} from "../../utils/giraUtils";
import { toInstantKey } from "../../utils/giraTramos";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { toast } from "sonner";
import MealSlotCellEditor from "../../components/logistics/MealSlotCellEditor";
import EventForm from "../../components/forms/EventForm";
import { normalizeEventosInternasHtml } from "../../utils/eventosInternas";
import { filterAndRankMultiTokenSearch } from "../../utils/sanitize";
import ManualTrigger from "../../components/manual/ManualTrigger";
import {
  TIPO_EVENTO_CHECKIN,
  TIPO_EVENTO_CHECKOUT,
  TIPO_EVENTO_EARLY_CHECKIN,
  TIPO_EVENTO_LATE_CHECKOUT,
  LABEL_EARLY_CHECKIN,
  LABEL_LATE_CHECKOUT,
  LABEL_CHECKIN,
  LABEL_CHECKOUT,
  horaInicioForStayTipo,
  resolveEventFormSaveData,
  validateLogisticsRule,
  staySideConfig,
  stayFkPatch,
  staySideFromField,
  stayTipoForExtra,
  extraOnFromTipo,
  ruleStayDisplayEventId,
  ruleHasStayExtra,
  staySideForRuleEvent,
  isStayTipoEvento,
  STAY_SIDES,
} from "../../utils/hotelStayEvents";

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

const isPersonMissingMilestone = (m, milestoneKey, segments) => {
  const l = m.logistics;
  switch (milestoneKey) {
    case "check-in":
    case "check-out": {
      const hitKey = milestoneKey === "check-in" ? "checkin" : "checkout";
      const extraKey =
        milestoneKey === "check-in" ? "checkin_early" : "checkout_late";
      const hit = l[hitKey]?.date ? l[hitKey] : l[extraKey];
      let instant = hit?.date
        ? { fecha: hit.date, hora: hit.time || "12:00" }
        : null;
      if (!instant && segments?.length) {
        const idx = milestoneKey === "check-in" ? 0 : segments.length - 1;
        const seg = segments[idx];
        if (seg?.fecha_desde) {
          instant = { fecha: seg.fecha_desde, hora: "12:00" };
        }
      }
      if (personIsLocalAtHit(m, segments, instant)) return false;
      return !hit?.date;
    }
    case "subida":
    case "bajada": {
      const data =
        milestoneKey === "subida"
          ? l.transports[0]?.subidaData
          : l.transports[0]?.bajadaData;
      let instant = data?.date
        ? {
            fecha: data.date,
            hora: data.time || data.hora || "12:00",
          }
        : null;
      if (!instant && segments?.length) {
        const idx = milestoneKey === "subida" ? 0 : segments.length - 1;
        const seg = segments[idx];
        if (seg?.fecha_desde) {
          instant = { fecha: seg.fecha_desde, hora: "12:00" };
        }
      }
      if (personIsLocalAtHit(m, segments, instant)) return false;
      return !data?.date;
    }
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

/** Persona coincide con el chip (criterio) y la regla le aplica (fuerza > 0). */
const personMatchesLogisticsChip = (
  row,
  chipKey,
  chipId,
  person,
  allLocalities,
  matchOptions = {},
) => {
  const { segments, allEvents, fallbackTramoIdx } = matchOptions;
  let instant = resolveRulePrimaryInstant(row, allEvents);
  if (!instant?.fecha && segments?.length && fallbackTramoIdx != null) {
    const seg = segments[fallbackTramoIdx];
    if (seg?.fecha_desde) {
      instant = { fecha: seg.fecha_desde, hora: "12:00" };
    }
  }
  const localeField = ruleHasMealMilestones(row) ? "comida_inicio" : null;
  if (
    getMatchStrength(row, person, allLocalities, {
      segments,
      instant,
      field: localeField,
    }) <= 0
  )
    return false;
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
    case "target_ensambles":
      return resolvePersonEnsambleIds(person).some(
        (id) => String(id) === String(chipId),
      );
    case "target_categories":
      return categoryMatches(chipId, pCat, person, {
        segments,
        instant,
        field: localeField,
      });
    default:
      return false;
  }
};

const getProviderColorClass = (p) => {
  if (p === "Hotel") return "bg-indigo-100 text-indigo-700 border-indigo-200";
  if (p === "Colectivo") return "bg-amber-100 text-amber-700 border-amber-200";
  if (p === "Refrigerio") return "bg-cyan-100 text-cyan-700 border-cyan-200";
  if (p === "Vianda")
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-white text-slate-600 border-slate-200";
};

const cleanEventLabel = (text) => {
  const raw = String(text || "");
  let normalized = raw;
  if (typeof document !== "undefined") {
    const tmp = document.createElement("div");
    tmp.innerHTML = raw;
    normalized = tmp.textContent || tmp.innerText || "";
  } else {
    normalized = raw.replace(/<[^>]*>/g, " ");
  }
  return normalized
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, " - ")
    .trim();
};

/** Color de `tipos_evento` para Check-in (22) / Check-Out (23). */
const STAY_TIPO_COLOR_FALLBACK = "#24ebc3";

function normalizeTipoHex(raw) {
  const s = String(raw || "").trim();
  if (!s) return STAY_TIPO_COLOR_FALLBACK;
  if (s.startsWith("#")) {
    if (s.length === 4) {
      return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
    }
    return s.length >= 7 ? s.slice(0, 7) : STAY_TIPO_COLOR_FALLBACK;
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`;
  return STAY_TIPO_COLOR_FALLBACK;
}

function tipoHexWithAlpha(hex, alpha) {
  return `${normalizeTipoHex(hex)}${alpha}`;
}

function resolveEventTipoColor(idTipoEvento, eventTypes, event) {
  const fromEvent = event?.tipos_evento?.color;
  if (fromEvent) return normalizeTipoHex(fromEvent);
  const id = Number(idTipoEvento);
  const fromCatalog = (eventTypes || []).find(
    (t) => Number(t.id) === id,
  )?.color;
  if (fromCatalog) return normalizeTipoHex(fromCatalog);
  if (
    id === TIPO_EVENTO_CHECKIN ||
    id === TIPO_EVENTO_CHECKOUT ||
    id === TIPO_EVENTO_EARLY_CHECKIN ||
    id === TIPO_EVENTO_LATE_CHECKOUT
  ) {
    return STAY_TIPO_COLOR_FALLBACK;
  }
  return "#6366f1";
}

function stayColorTheme(hex) {
  const color = normalizeTipoHex(hex);
  return {
    color,
    cardStyle: {
      backgroundColor: "#ffffff",
      borderColor: color,
    },
    tagStyle: {
      backgroundColor: tipoHexWithAlpha(color, "28"),
      color,
      borderColor: color,
    },
    dateStyle: { color },
    iconStyle: { color: tipoHexWithAlpha(color, "99") },
    headerStyle: { backgroundColor: tipoHexWithAlpha(color, "22") },
  };
}

const getEventTypeLabel = (idTipoEvento) => {
  const id = Number(idTipoEvento);
  if (id === TIPO_EVENTO_CHECKIN) return LABEL_CHECKIN;
  if (id === TIPO_EVENTO_CHECKOUT) return LABEL_CHECKOUT;
  if (id === TIPO_EVENTO_EARLY_CHECKIN) return LABEL_EARLY_CHECKIN;
  if (id === TIPO_EVENTO_LATE_CHECKOUT) return LABEL_LATE_CHECKOUT;
  if (id === 7) return "Desayuno";
  if (id === 8) return "Almuerzo";
  if (id === 9) return "Merienda";
  if (id === 10) return "Cena";
  return "Evento";
};

const RULE_STAY_EVENT_FIELDS = [
  "id_evento_checkin",
  "id_evento_checkout",
  "id_evento_checkin_early",
  "id_evento_checkout_late",
];

function ruleReferencesEvent(rule, eventId) {
  if (!rule || eventId == null || eventId === "") return false;
  return RULE_STAY_EVENT_FIELDS.some(
    (f) => String(rule[f]) === String(eventId),
  );
}

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
  const { confirm, dialog } = useConfirmDialog();
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
    if (colorClass.includes("bg-teal"))
      return {
        bg: "bg-teal-50/50",
        border: "border-teal-100",
        text: "text-teal-400",
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
            className="fixed bg-white border border-slate-300 shadow-2xl rounded-lg p-2 z-[100] flex flex-col"
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
              {filterAndRankMultiTokenSearch(
                options,
                (o) => [o.label],
                search,
              ).map((opt) => (
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

const StayExtraToggle = ({
  checked,
  label,
  title,
  activeClass,
  onToggle,
  disabled,
}) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      onToggle(!checked);
    }}
    className={`shrink-0 w-8 min-h-[56px] rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-colors ${
      checked
        ? activeClass
        : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-500"
    } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
  >
    <span
      className={`w-4 h-4 rounded border flex items-center justify-center ${
        checked ? "bg-white/20 border-white" : "border-slate-300 bg-white"
      }`}
    >
      {checked ? <IconCheck size={11} className="text-white" /> : null}
    </span>
    <span className="text-[7px] font-black uppercase leading-none tracking-tight">
      {label}
    </span>
  </button>
);

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
  eventTypes,
  onBeforeLink,
  extraOn = false,
}) => {
  const { confirm, dialog } = useConfirmDialog();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pickerExtraOn, setPickerExtraOn] = useState(Boolean(extraOn));
  const loading = isProcessing || isExternalProcessing;
  const event = allEvents?.find((e) => String(e.id) === String(eventId));
  const stayCfg = staySideConfig(field);

  useEffect(() => {
    if (isOpen) setPickerExtraOn(Boolean(extraOn));
  }, [isOpen, extraOn]);
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
    const ev = allEvents?.find((e) => String(e.id) === String(id));
    const effectiveExtra = stayCfg
      ? Boolean(
          pickerExtraOn || extraOnFromTipo(stayCfg.side, ev?.id_tipo_evento),
        )
      : false;
    const patch = stayCfg
      ? stayFkPatch(stayCfg.side, effectiveExtra, id)
      : { [`id_evento_${field}`]: id };

    if (onBeforeLink) {
      const ok = await onBeforeLink(rule, field, id, patch);
      if (!ok) return;
    }
    setIsProcessing(true);
    try {
      if (stayCfg && ev) {
        const wantedTipo = stayTipoForExtra(stayCfg.side, effectiveExtra);
        if (
          wantedTipo &&
          Number(ev.id_tipo_evento) !== Number(wantedTipo)
        ) {
          const { error: tipoErr } = await supabase
            .from("eventos")
            .update({ id_tipo_evento: wantedTipo })
            .eq("id", id);
          if (tipoErr) throw tipoErr;
        }
      }
      const { error } = await supabase
        .from("giras_logistica_reglas")
        .update(patch)
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
    if (
      !(await confirm({
        title: "Desvincular evento",
        message: "¿Desvincular evento de esta regla?",
        destructive: true,
        confirmText: "Desvincular",
      }))
    )
      return;

    setIsProcessing(true);
    try {
      const patch = stayCfg
        ? stayFkPatch(stayCfg.side, false, null)
        : { [`id_evento_${field}`]: null };
      await supabase
        .from("giras_logistica_reglas")
        .update(patch)
        .eq("id", rule.id);

      onRefresh();
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const typeLabel = extraOn && stayCfg
    ? stayCfg.extraLabel
    : getEventTypeLabel(
        event?.id_tipo_evento || tipoEventoIds?.[0],
      ) || labelDefault;
  const tipoId =
    extraOn && stayCfg
      ? stayCfg.extraTipo
      : event?.id_tipo_evento || tipoEventoIds?.[0];
  const stayTheme = stayColorTheme(
    resolveEventTipoColor(tipoId, eventTypes, event),
  );
  const cleanDesc = event ? cleanEventLabel(event.descripcion) : "";
  const foldLabel = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[\s\-]+/g, "");
  const showDesc =
    Boolean(cleanDesc) && foldLabel(cleanDesc) !== foldLabel(typeLabel);

  const pickerPortal =
    isOpen &&
    createPortal(
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={() => setIsOpen(false)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="p-4 border-b flex justify-between items-center"
            style={stayTheme.headerStyle}
          >
            <h4 className="text-xs font-black uppercase text-slate-700">
              Vincular: {labelDefault}
            </h4>
            <button type="button" onClick={() => setIsOpen(false)}>
              <IconX size={18} />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="max-h-60 overflow-y-auto border rounded-xl divide-y">
              {allEvents
                ?.filter((e) =>
                  tipoEventoIds.includes(Number(e.id_tipo_evento)),
                )
                .sort((a, b) => {
                  const ka = toInstantKey(a.fecha, a.hora_inicio) ?? "";
                  const kb = toInstantKey(b.fecha, b.hora_inicio) ?? "";
                  return ka.localeCompare(kb);
                })
                .map((ev) => {
                  const rowTheme = stayColorTheme(
                    resolveEventTipoColor(
                      ev.id_tipo_evento,
                      eventTypes,
                      ev,
                    ),
                  );
                  const eventTypeLabel = getEventTypeLabel(ev.id_tipo_evento);
                  const cleanDescription = cleanEventLabel(ev.descripcion);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => handleLink(ev.id)}
                      className="p-3 cursor-pointer flex justify-between items-center transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md border text-[9px] font-semibold uppercase tracking-wide"
                            style={rowTheme.tagStyle}
                            title={eventTypeLabel}
                          >
                            {eventTypeLabel}
                          </span>
                        </div>
                        <div className="text-[13px] font-medium text-slate-800 break-words leading-snug">
                          {cleanDescription || "Sin descripción"}
                        </div>
                        <div
                          className="text-[12px] font-medium mt-1"
                          style={rowTheme.dateStyle}
                        >
                          {formatDateBrief(ev.fecha)} •{" "}
                          {ev.hora_inicio?.slice(0, 5)} hs
                        </div>
                      </div>
                      <span className="shrink-0" style={rowTheme.iconStyle}>
                        <IconLink size={14} />
                      </span>
                    </div>
                  );
                })}
            </div>
            {stayCfg ? (
              <div className="flex items-stretch gap-2">
                <StayExtraToggle
                  checked={pickerExtraOn}
                  label={stayCfg.extraShort}
                  title={stayCfg.extraTitle}
                  activeClass={
                    stayCfg.side === "checkin"
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-amber-600 bg-amber-600 text-white"
                  }
                  onToggle={setPickerExtraOn}
                />
                <button
                  type="button"
                  onClick={() => {
                    const createTipo = stayTipoForExtra(
                      stayCfg.side,
                      pickerExtraOn,
                    );
                    onEditEvent({
                      id_gira: giraId,
                      id_tipo_evento: createTipo,
                      fecha:
                        manualDate || new Date().toISOString().split("T")[0],
                      hora_inicio: horaInicioForStayTipo(createTipo),
                      descripcion: labelDefault,
                      visible_agenda: true,
                      _isNew: true,
                      _linkTo: { ruleId: rule.id, field: field },
                    });
                    setIsOpen(false);
                  }}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                >
                  <IconCalendarPlus size={16} /> Crear nuevo
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onEditEvent({
                    id_gira: giraId,
                    id_tipo_evento: tipoEventoIds[0],
                    fecha: manualDate || new Date().toISOString().split("T")[0],
                    hora_inicio: horaInicioForStayTipo(tipoEventoIds[0]),
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
            )}
          </div>
        </div>
      </div>,
      document.body,
    );

  if (event) {
    return (
      <div
        className="group relative border-2 rounded-lg px-2 py-2.5 flex flex-col items-center justify-center text-center shadow-sm w-full min-h-[56px]"
        style={stayTheme.cardStyle}
      >
        {dialog}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex flex-col items-center justify-center gap-1 min-h-[40px]"
          title="Cambiar evento"
        >
          <span
            className="text-[11px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md border whitespace-nowrap"
            style={stayTheme.tagStyle}
          >
            {loading ? "Procesando..." : typeLabel}
          </span>
          <div className="text-[11px] font-bold leading-tight whitespace-nowrap text-slate-900">
            {formatDateBrief(event.fecha)}
            {event?.hora_inicio ? ` · ${event.hora_inicio.slice(0, 5)}` : ""}
          </div>
          {showDesc && (
            <div className="text-[10px] font-medium text-slate-500 leading-tight line-clamp-2">
              {cleanDesc}
            </div>
          )}
        </button>
        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEditEvent(event, () => setIsOpen(true))}
            className="p-0.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
            title="Editar"
          >
            <IconEdit size={11} />
          </button>
          <button
            type="button"
            onClick={handleUnlink}
            disabled={isProcessing}
            className="p-0.5 hover:bg-red-50 rounded text-red-500 transition-colors"
            title="Desvincular"
          >
            <IconLinkOff
              size={11}
              className={isProcessing ? "animate-spin" : ""}
            />
          </button>
        </div>
        {pickerPortal}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full overflow-hidden">
      {dialog}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={loading}
        className={`w-full min-h-[56px] px-2 py-2 border border-dashed border-slate-300 rounded-lg text-[12px] font-black uppercase tracking-wide flex items-center justify-center text-center transition-all bg-slate-50/20 ${loading ? "opacity-50" : "hover:border-[color:var(--stay-color)] hover:text-[color:var(--stay-color)]"}`}
        style={{ ["--stay-color"]: stayTheme.color }}
      >
        {loading ? "Vinculando..." : "Vincular"}
      </button>
      {pickerPortal}
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
export default function LogisticsManager({
  supabase,
  gira,
  activeTramoIdx = 0,
  onLogisticsChange,
}) {
  const { confirm, dialog } = useConfirmDialog();
  const {
    summary,
    roster,
    logisticsRules,
    allEvents,
    sedeIds,
    refresh: refreshLocal,
    allLocalities,
    segments,
  } = useLogistics(supabase, gira);

  const refresh = () => {
    refreshLocal();
    onLogisticsChange?.();
  };
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
  const [catalogs, setCatalogs] = useState({
    locations: [],
    regions: [],
    ensambles: [],
  });
  const [managingHito, setManagingHito] = useState(null);
  const [editingFormData, setEditingFormData] = useState(null);
  
  const [conflictModal, setConflictModal] = useState(null);
  const [chipPreviewModal, setChipPreviewModal] = useState(null);
  const [attemptErrors, setAttemptErrors] = useState({});
  const [stayExtraPending, setStayExtraPending] = useState({});

  const debounceRef = useRef({});

  useEffect(() => {
    if (logisticsRules?.length > 0)
      setLocalRules(
        [...logisticsRules].sort((a, b) =>
          (a.fecha_checkin || "9999").localeCompare(b.fecha_checkin || "9999"),
        ),
      );
  }, [logisticsRules]);

  const derivedRuleErrors = useMemo(() => {
    const map = {};
    (localRules || []).forEach((r) => {
      const errs = validateLogisticsRule(r, allEvents);
      if (errs.length) map[r.id] = errs;
    });
    return map;
  }, [localRules, allEvents]);

  const blockIfInvalidRule = useCallback(
    (rule, events = allEvents) => {
      const errs = validateLogisticsRule(rule, events);
      if (errs.length) {
        setAttemptErrors((p) => ({ ...p, [rule.id]: errs }));
        toast.error(errs[0]);
        return true;
      }
      setAttemptErrors((p) => {
        if (!p[rule.id]) return p;
        const n = { ...p };
        delete n[rule.id];
        return n;
      });
      return false;
    },
    [allEvents],
  );

  const handleBeforeStayLink = useCallback(
    async (rule, field, eventId, patch) => {
      const cfg = staySideConfig(field);
      const ev = (allEvents || []).find(
        (e) => String(e.id) === String(eventId),
      );
      const extraOn = cfg
        ? extraOnFromTipo(cfg.side, ev?.id_tipo_evento)
        : false;
      const resolved =
        patch ||
        (cfg
          ? stayFkPatch(cfg.side, extraOn, eventId)
          : { [`id_evento_${field}`]: eventId });
      return !blockIfInvalidRule({ ...rule, ...resolved }, allEvents);
    },
    [allEvents, blockIfInvalidRule],
  );

  const handleStayExtraToggle = async (idx, side, nextOn) => {
    const row = localRules[idx];
    if (!row) return;
    const pendingKey = `${row.id}-${side}`;
    const eventId = ruleStayDisplayEventId(row, side);
    if (!eventId) {
      setStayExtraPending((p) => {
        if (!nextOn) {
          if (!p[pendingKey]) return p;
          const n = { ...p };
          delete n[pendingKey];
          return n;
        }
        return { ...p, [pendingKey]: true };
      });
      return;
    }

    const tipo = stayTipoForExtra(side, nextOn);
    const patch = stayFkPatch(side, nextOn, eventId);
    if (blockIfInvalidRule({ ...row, ...patch }, allEvents)) return;

    const related = getRelatedRules(eventId, logisticsRules);
    if (related.length > 1) {
      const cfg = STAY_SIDES[side];
      const ok = await confirm({
        title: nextOn
          ? `¿Marcar ${cfg.extraLabel}?`
          : `¿Quitar ${cfg.extraLabel}?`,
        message: `Este evento está en ${related.length} reglas. El tipo de agenda cambiará para todas.`,
      });
      if (!ok) return;
    }

    setStayExtraPending((p) => {
      if (!p[pendingKey]) return p;
      const n = { ...p };
      delete n[pendingKey];
      return n;
    });
    const relatedIds = new Set(
      (related.length ? related : [row]).map((r) => String(r.id)),
    );
    setLocalRules((prev) =>
      prev.map((r) =>
        relatedIds.has(String(r.id))
          ? {
              ...r,
              ...stayFkPatch(
                staySideForRuleEvent(r, eventId) || side,
                nextOn,
                eventId,
              ),
            }
          : r,
      ),
    );

    try {
      if (tipo) {
        const { error: tipoErr } = await supabase
          .from("eventos")
          .update({ id_tipo_evento: tipo })
          .eq("id", eventId);
        if (tipoErr) throw tipoErr;
      }
      const targets = related.length ? related : [row];
      for (const r of targets) {
        const rSide = staySideForRuleEvent(r, eventId) || side;
        const { error } = await supabase
          .from("giras_logistica_reglas")
          .update(stayFkPatch(rSide, nextOn, eventId))
          .eq("id", r.id);
        if (error) throw error;
      }
      refresh();
    } catch (err) {
      toast.error(err?.message || "No se pudo actualizar early/late");
      refresh();
    }
  };

  const fetchVenues = useCallback(async () => {
    const { data } = await supabase
      .from("locaciones")
      .select("id, nombre, id_localidad, localidades(localidad)");
    setCatalogs((prev) => ({ ...prev, venues: data || [] }));
  }, [supabase]);

  useEffect(() => {
    const fetchC = async () => {
      const [l, r, v, t, ens] = await Promise.all([
        supabase.from("localidades").select("id, localidad"),
        supabase.from("regiones").select("id, region"),
        supabase
          .from("locaciones")
          .select("id, nombre, id_localidad, localidades(localidad)"),
        supabase.from("tipos_evento").select("id, nombre, color, categorias_tipos_eventos ( id, nombre )"),
        supabase.from("ensambles").select("id, ensamble").order("ensamble"),
      ]);

      setCatalogs({
        locations: (l.data || []).map((x) => ({
          id: x.id,
          label: x.localidad,
        })),
        regions: (r.data || []).map((x) => ({ id: x.id, label: x.region })),
        venues: v.data || [],
        eventTypes: t.data || [],
        ensambles: (ens.data || []).map((x) => ({
          id: x.id,
          label: x.ensamble,
        })),
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

  const chipMatchOptions = useMemo(
    () => ({
      segments,
      allEvents,
      fallbackTramoIdx: activeTramoIdx,
    }),
    [segments, allEvents, activeTramoIdx],
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
          chipMatchOptions,
        ),
    );
    const byCity = {};
    filtered.forEach((p) => {
      const city = p.localidades?.localidad || "Sin localidad";
      if (!byCity[city]) byCity[city] = [];
      const winner = pickWinningLogisticsRule(
        p,
        logisticsRules,
        allLocalities,
        (r) => {
          const field = ruleHasMealMilestones(row)
            ? "comida_fin"
            : "checkin";
          return {
            segments: chipMatchOptions.segments,
            instant: resolveRuleFieldInstant(
              r,
              field,
              chipMatchOptions.allEvents,
            ),
            field,
          };
        },
      );
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
  }, [
    chipPreviewModal,
    roster,
    logisticsRules,
    allLocalities,
    chipMatchOptions,
  ]);

  const listBeforeMilestoneFilter = useMemo(() => {
    // Excluir ausentes de todos los filtros de la Línea de Tiempo
    let list = (summary || []).filter(
      (m) => (m.estado_gira || "").toLowerCase() !== "ausente",
    );
    if (searchTerm.trim()) {
      list = filterAndRankMultiTokenSearch(
        list,
        (m) => [
          m.nombre,
          m.apellido,
          [m.apellido, m.nombre].filter(Boolean).join(" "),
          [m.nombre, m.apellido].filter(Boolean).join(" "),
        ],
        searchTerm,
      );
    }
    if (showOnlyMissing) {
      list = list.filter((m) =>
        ["check-in", "check-out", "subida", "bajada"].some((key) =>
          isPersonMissingMilestone(m, key, segments),
        ),
      );
    }
    return list;
  }, [summary, searchTerm, showOnlyMissing, segments]);

  const missingCountsByMilestone = useMemo(() => {
    const counts = {};
    MILESTONES.forEach((m) => {
      counts[m.key] = listBeforeMilestoneFilter.filter((p) =>
        isPersonMissingMilestone(p, m.key, segments),
      ).length;
    });
    return counts;
  }, [listBeforeMilestoneFilter, segments]);

  const groupedSummary = useMemo(() => {
    let list = listBeforeMilestoneFilter;
    if (activeMilestones.size > 0) {
      list = list.filter((m) =>
        Array.from(activeMilestones).some((key) =>
          isPersonMissingMilestone(m, key, segments),
        ),
      );
    }
    return list.reduce((acc, p) => {
      const city = p.localidades?.localidad || "Sin Localidad";
      if (!acc[city]) acc[city] = [];
      acc[city].push(p);
      return acc;
    }, {});
  }, [listBeforeMilestoneFilter, activeMilestones, segments]);

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

    const relatedRules = logisticsRules.filter((r) =>
      ruleReferencesEvent(r, eventId),
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
      (r.target_ensambles || []).forEach((id) => {
        const label = (catalogs.ensambles || []).find(
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
    return rules.filter((r) => ruleReferencesEvent(r, eventId));
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
        hora_inicio: event.hora_inicio || horaInicioForStayTipo(event.id_tipo_evento),
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


  const handleSaveEvent = async (snapshot) => {
    const form = resolveEventFormSaveData(editingFormData, snapshot);
    if (!form || (!form.id && !form._isNew)) return;

    const { id, _isNew, _linkTo: rawLinkTo, ...rest } = form;
    const staySide = rawLinkTo ? staySideFromField(rawLinkTo.field) : null;
    const extraOn = staySide
      ? extraOnFromTipo(staySide, rest.id_tipo_evento)
      : false;
    const linkTo = rawLinkTo
      ? {
          ...rawLinkTo,
          field: staySide || rawLinkTo.field,
        }
      : null;

    const statusKey = linkTo ? `${linkTo.ruleId}-${linkTo.field}` : null;
    if (statusKey) setSavingStatus((p) => ({ ...p, [statusKey]: "saving" }));

    const cleanPayload = {
      fecha: rest.fecha || form.date,
      hora_inicio: rest.hora_inicio || form.time,
      descripcion: rest.descripcion,
      observaciones_internas: normalizeEventosInternasHtml(
        rest.observaciones_internas,
      ),
      observaciones_aforo:
        Number(rest.id_tipo_evento) === 1
          ? String(rest.observaciones_aforo || "").trim() || null
          : null,
      id_tipo_evento: rest.id_tipo_evento,
      id_locacion: rest.id_locacion,
      id_gira_transporte: rest.id_gira_transporte ?? null,
      visible_agenda: rest.visible_agenda,
      convocados: rest.convocados,
      notas: rest.notas,
      id_gira: rest.id_gira,
    };

    const previewEvent = {
      id: id || "__draft__",
      fecha: cleanPayload.fecha,
      hora_inicio: cleanPayload.hora_inicio,
    };
    const eventsPreview = [
      ...(allEvents || []).filter(
        (e) => String(e.id) !== String(previewEvent.id),
      ),
      previewEvent,
    ];
    if (linkTo) {
      const rule =
        (localRules || []).find(
          (r) => String(r.id) === String(linkTo.ruleId),
        ) ||
        (logisticsRules || []).find(
          (r) => String(r.id) === String(linkTo.ruleId),
        );
      if (rule) {
        const rulePatch = staySide
          ? stayFkPatch(staySide, extraOn, previewEvent.id)
          : {
              [String(linkTo.field).startsWith("id_evento_")
                ? linkTo.field
                : `id_evento_${linkTo.field}`]: previewEvent.id,
            };
        if (blockIfInvalidRule({ ...rule, ...rulePatch }, eventsPreview)) {
          if (statusKey) {
            setSavingStatus((p) => {
              const n = { ...p };
              delete n[statusKey];
              return n;
            });
          }
          return;
        }
      }
    } else if (id) {
      const related = getRelatedRules(id, logisticsRules);
      const previewTipo = cleanPayload.id_tipo_evento;
      if (
        related.some((r) => {
          const side = staySideForRuleEvent(r, id);
          const patched =
            side && isStayTipoEvento(previewTipo)
              ? {
                  ...r,
                  ...stayFkPatch(
                    side,
                    extraOnFromTipo(side, previewTipo),
                    id,
                  ),
                }
              : r;
          return blockIfInvalidRule(patched, eventsPreview);
        })
      ) {
        if (statusKey) {
          setSavingStatus((p) => {
            const n = { ...p };
            delete n[statusKey];
            return n;
          });
        }
        return;
      }
    }

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

      if (linkTo) {
        const rulePatch = staySide
          ? stayFkPatch(staySide, extraOn, finalEventId)
          : {
              [String(linkTo.field).startsWith("id_evento_")
                ? linkTo.field
                : `id_evento_${linkTo.field}`]: finalEventId,
            };
        await supabase
          .from("giras_logistica_reglas")
          .update(rulePatch)
          .eq("id", linkTo.ruleId);
        setStayExtraPending((p) => {
          const key = `${linkTo.ruleId}-${staySide || linkTo.field}`;
          if (!p[key]) return p;
          const n = { ...p };
          delete n[key];
          return n;
        });
      } else if (id && isStayTipoEvento(cleanPayload.id_tipo_evento)) {
        const related = getRelatedRules(id, logisticsRules);
        for (const r of related) {
          const side = staySideForRuleEvent(r, id);
          if (!side) continue;
          await supabase
            .from("giras_logistica_reglas")
            .update(
              stayFkPatch(
                side,
                extraOnFromTipo(side, cleanPayload.id_tipo_evento),
                id,
              ),
            )
            .eq("id", r.id);
        }
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
      toast.error("Error: " + error.message);
    }
  };

  const handleUnlinkGlobal = async (ruleId, field) => {
    if (!ruleId || !field) return;

    const staySide = staySideFromField(field);
    const patch = staySide
      ? stayFkPatch(staySide, false, null)
      : {
          [String(field).startsWith("id_evento_")
            ? field
            : `id_evento_${field}`]: null,
        };

    const { error } = await supabase
      .from("giras_logistica_reglas")
      .update(patch)
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
      {dialog}
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
                      className="px-2 py-4 w-[14%] border-r border-white/10 bg-orange-900/40 text-center"
                      title="La tilde al lado marca Early check-in (+0,5 noche)"
                    >
                      Check-In
                    </th>
                    <th
                      className="px-2 py-4 w-[14%] border-r border-white/10 bg-orange-900/40 text-center"
                      title="La tilde al lado marca Late check-out (+0,5 noche)"
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
                          { k: "target_ensambles", c: "bg-teal-600" },
                          { k: "target_categories", c: "bg-purple-600" },
                          { k: "target_ids", c: "bg-amber-600" },
                        ].flatMap((s) =>
                          (row[s.k] || []).map((id) => {
                            const chipLabel =
                              (s.k === "target_regions"
                                ? catalogs.regions
                                : s.k === "target_localities"
                                  ? catalogs.locations
                                  : s.k === "target_ensambles"
                                    ? catalogs.ensambles
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
                      // VISTA EDITOR
                      <div className="grid grid-cols-5 gap-1 w-full animate-in fade-in slide-in-from-left-2 duration-200">
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
                          placeholder="Ensambles"
                          options={catalogs.ensambles || []}
                          selectedIds={row.target_ensambles}
                          onChange={(v) =>
                            handleRowChange(idx, "target_ensambles", v)
                          }
                          colorClass="bg-teal-600 text-white"
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
                    {(attemptErrors[row.id] || derivedRuleErrors[row.id])?.length >
                      0 && (
                      <div
                        className="mt-1.5 flex items-start gap-1 rounded-md border border-red-200 bg-red-50 px-1.5 py-1 text-[9px] font-bold leading-snug text-red-700"
                        role="alert"
                      >
                        <IconAlertCircle size={12} className="mt-0.5 shrink-0" />
                        <span>
                          {(
                            attemptErrors[row.id] || derivedRuleErrors[row.id]
                          ).join(" ")}
                        </span>
                      </div>
                    )}
                  </td>
                  {!collapsedGroups.hotel && (
                    <>
                      <td className="p-1 border-r border-slate-200 bg-orange-50/10 min-w-0">
                        <div className="flex items-stretch gap-0.5">
                          <div className="flex-1 min-w-0">
                            <EventCellEditor
                              rule={row}
                              field="checkin"
                              eventId={ruleStayDisplayEventId(row, "checkin")}
                              allEvents={allEvents}
                              extraOn={
                                ruleHasStayExtra(row, "checkin") ||
                                Boolean(stayExtraPending[`${row.id}-checkin`])
                              }
                              tipoEventoIds={
                                ruleHasStayExtra(row, "checkin") ||
                                stayExtraPending[`${row.id}-checkin`]
                                  ? [
                                      TIPO_EVENTO_EARLY_CHECKIN,
                                      TIPO_EVENTO_CHECKIN,
                                    ]
                                  : [
                                      TIPO_EVENTO_CHECKIN,
                                      TIPO_EVENTO_EARLY_CHECKIN,
                                    ]
                              }
                              onRefresh={refresh}
                              supabase={supabase}
                              giraId={gira.id}
                              labelDefault={LABEL_CHECKIN}
                              onManualUpdate={(f, v) => handleRowChange(idx, f, v)}
                              onEditEvent={(evt, triggerOpen) => handleRequestEditEvent(evt, row.id, "checkin", triggerOpen)}
                              locations={catalogs.venues}
                              eventTypes={catalogs.eventTypes}
                              onBeforeLink={handleBeforeStayLink}
                            />
                          </div>
                          <StayExtraToggle
                            checked={
                              ruleHasStayExtra(row, "checkin") ||
                              Boolean(stayExtraPending[`${row.id}-checkin`])
                            }
                            label={STAY_SIDES.checkin.extraShort}
                            title={STAY_SIDES.checkin.extraTitle}
                            activeClass="border-sky-600 bg-sky-600 text-white"
                            onToggle={(next) =>
                              handleStayExtraToggle(idx, "checkin", next)
                            }
                          />
                        </div>
                      </td>
                      <td className="p-1 border-r border-slate-200 bg-orange-50/10 min-w-0">
                        <div className="flex items-stretch gap-0.5">
                          <div className="flex-1 min-w-0">
                            <EventCellEditor
                              rule={row}
                              field="checkout"
                              eventId={ruleStayDisplayEventId(row, "checkout")}
                              allEvents={allEvents}
                              extraOn={
                                ruleHasStayExtra(row, "checkout") ||
                                Boolean(stayExtraPending[`${row.id}-checkout`])
                              }
                              tipoEventoIds={
                                ruleHasStayExtra(row, "checkout") ||
                                stayExtraPending[`${row.id}-checkout`]
                                  ? [
                                      TIPO_EVENTO_LATE_CHECKOUT,
                                      TIPO_EVENTO_CHECKOUT,
                                    ]
                                  : [
                                      TIPO_EVENTO_CHECKOUT,
                                      TIPO_EVENTO_LATE_CHECKOUT,
                                    ]
                              }
                              onRefresh={refresh}
                              supabase={supabase}
                              giraId={gira.id}
                              labelDefault={LABEL_CHECKOUT}
                              onManualUpdate={(f, v) => handleRowChange(idx, f, v)}
                              onEditEvent={(evt, triggerOpen) => handleRequestEditEvent(evt, row.id, "checkout", triggerOpen)}
                              locations={catalogs.venues}
                              eventTypes={catalogs.eventTypes}
                              onBeforeLink={handleBeforeStayLink}
                            />
                          </div>
                          <StayExtraToggle
                            checked={
                              ruleHasStayExtra(row, "checkout") ||
                              Boolean(stayExtraPending[`${row.id}-checkout`])
                            }
                            label={STAY_SIDES.checkout.extraShort}
                            title={STAY_SIDES.checkout.extraTitle}
                            activeClass="border-amber-600 bg-amber-600 text-white"
                            onToggle={(next) =>
                              handleStayExtraToggle(idx, "checkout", next)
                            }
                          />
                        </div>
                      </td>
                    </>
                  )}
                  {!collapsedGroups.range && (
                    <>
                      <td className="p-1 border-r border-slate-200 bg-emerald-50/10 min-w-0">
                        <MealSlotCellEditor
                          rule={row}
                          which="inicio"
                          gira={gira}
                          supabase={supabase}
                          onRefresh={refresh}
                          labelDefault="Inicio"
                          onValidate={(patch) => {
                            const errs = validateLogisticsRule(
                              { ...row, ...patch },
                              allEvents,
                            );
                            if (errs.length) {
                              setAttemptErrors((p) => ({
                                ...p,
                                [row.id]: errs,
                              }));
                            }
                            return errs;
                          }}
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200 bg-emerald-50/10 min-w-0">
                        <MealSlotCellEditor
                          rule={row}
                          which="fin"
                          gira={gira}
                          supabase={supabase}
                          onRefresh={refresh}
                          labelDefault="Fin"
                          onValidate={(patch) => {
                            const errs = validateLogisticsRule(
                              { ...row, ...patch },
                              allEvents,
                            );
                            if (errs.length) {
                              setAttemptErrors((p) => ({
                                ...p,
                                [row.id]: errs,
                              }));
                            }
                            return errs;
                          }}
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
                        if (
                          !(await confirm({
                            title: "Eliminar bloque",
                            message: "¿Eliminar bloque de reglas?",
                            destructive: true,
                            confirmText: "Eliminar",
                          }))
                        )
                          return;
                        await supabase
                          .from("giras_logistica_reglas")
                          .delete()
                          .eq("id", row.id);
                        refresh();
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
                        show: isPersonMissingMilestone(m, "subida", segments),
                        icon: IconBus,
                      },
                      {
                        id: "checkin",
                        show: isPersonMissingMilestone(m, "check-in", segments),
                        icon: IconHotel,
                      },
                      {
                        id: "checkout",
                        show: isPersonMissingMilestone(m, "check-out", segments),
                        icon: IconHotel,
                      },
                      {
                        id: "baj",
                        show: isPersonMissingMilestone(m, "bajada", segments),
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
                        isLinked: false,
                      },
                      {
                        id: "c_in",
                        ...(l.checkin?.date ? l.checkin : l.checkin_early),
                        label:
                          l.checkin_early?.date || l.checkin_early?.id_evento
                            ? LABEL_EARLY_CHECKIN
                            : "Check-In",
                        icon: IconHotel,
                        colorClass:
                          l.checkin_early?.date || l.checkin_early?.id_evento
                            ? "text-sky-600 border-sky-600 bg-sky-50"
                            : "text-orange-600 border-orange-600 bg-orange-50",
                        field: "id_evento_checkin",
                      },
                      {
                        id: "c_out",
                        ...(l.checkout?.date ? l.checkout : l.checkout_late),
                        label:
                          l.checkout_late?.date || l.checkout_late?.id_evento
                            ? LABEL_LATE_CHECKOUT
                            : "Check-Out",
                        icon: IconHotel,
                        colorClass:
                          l.checkout_late?.date || l.checkout_late?.id_evento
                            ? "text-amber-700 border-amber-600 bg-amber-50"
                            : "text-orange-600 border-orange-600 bg-orange-50",
                        field: "id_evento_checkout",
                      },
                      {
                        id: "f_out",
                        ...l.comida_fin,
                        label: `Fin ${l.comida_fin?.svc || "Com."}`,
                        icon: IconUtensils,
                        colorClass:
                          "text-emerald-600 border-emerald-600 bg-emerald-50",
                        isLinked: false,
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
                  {chipPreviewModal.chipKey === "target_ensambles" ? (
                    <IconMusic className="text-teal-600 shrink-0" size={16} />
                  ) : null}
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
                &gt; ensamble &gt; rol/familia &gt; localidad &gt; no
                locales/general) es la que define los hitos en la práctica.
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
              isNew={Boolean(editingFormData._isNew)}
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