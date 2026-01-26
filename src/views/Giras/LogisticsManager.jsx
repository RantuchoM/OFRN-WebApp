import React, { useState, useEffect, useMemo, useRef } from "react";
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
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import { useLogistics } from "../../hooks/useLogistics";
import EventForm from "../../components/forms/EventForm";
import ManualTrigger from "../../components/manual/ManualTrigger"; // Ajusta la ruta según donde estés

// --- CONSTANTES ---
const CATEGORIA_OPTIONS = [
  { val: "SOLISTAS", label: "Solistas" },
  { val: "DIRECTORES", label: "Directores" },
  { val: "PRODUCCION", label: "Producción" },
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

// --- UTILIDADES ---
const getDayLong = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  return date
    .toLocaleDateString("es-ES", { weekday: "long" })
    .replace(/^\w/, (c) => c.toUpperCase());
};

const formatDiff = (ms) => {
  if (ms <= 0) return null;
  const totalHrs = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHrs / 24);
  const remHrs = totalHrs % 24;
  return days > 0 ? `${days}d ${remHrs}h` : `${remHrs}h`;
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

  // --- NUEVA LÓGICA DE COLOR TEMÁTICO SUAVE ---
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
        // CAMBIO EN CLASSNAME: Ahora usa 'theme' si está vacío
        className={`min-h-[30px] p-1 border rounded cursor-pointer flex flex-wrap gap-1 items-center transition-colors ${
          current.length > 0
            ? colorClass + " border-black/10 shadow-sm"
            : `${theme.bg} ${theme.border}`
        }`}
      >
        {current.length === 0 ? (
          // CAMBIO EN EL SPAN: Usa el color del texto del tema
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
  isExternalProcessing, // <--- Nueva Prop
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
    setIsProcessing(true); // <--- AÑADIR ESTO
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
      setIsProcessing(false); // <--- SI FALLA, APAGAMOS EL CARGANDO
    }
  };

  const handleUnlink = async (e) => {
    e.stopPropagation();
    if (!confirm("¿Desvincular evento de esta regla?")) return;

    setIsProcessing(true); // Iniciamos señal visual
    try {
      await supabase
        .from("giras_logistica_reglas")
        .update({ [`id_evento_${field}`]: null })
        .eq("id", rule.id);

      onRefresh(); // El refresh del padre desmontará este componente
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
              onClick={() => onEditEvent(event)}
              className="p-0.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
            >
              <IconEdit size={10} />
            </button>
            <button
              onClick={handleUnlink}
              disabled={isProcessing}
              className="p-0.5 hover:bg-red-50 rounded text-red-500 transition-colors"
            >
              {/* 3. Si está procesando, el icono puede cambiar o girar */}
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
        <div className="text-[8px] font-bold text-slate-400 leading-none shrink-0 italic">
          {event?.fecha?.split("-").reverse().slice(0, 2).join("/")} •{" "}
          {event?.hora_inicio?.slice(0, 5)} hs
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
                            {ev.fecha.split("-").reverse().join("/")} •{" "}
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
                    // En lugar de insertar, abrimos el formulario con datos iniciales
                    onEditEvent({
                      id_gira: giraId,
                      id_tipo_evento: tipoEventoIds[0],
                      fecha:
                        manualDate || new Date().toISOString().split("T")[0],
                      hora_inicio: "12:00:00",
                      descripcion: labelDefault,
                      visible_agenda: true,
                      // Metadatos para que el Manager sepa qué hacer al guardar
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

      {/* BADGE CON COLOR RECUPERADO */}
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
  const { summary, roster, logisticsRules, allEvents, sedeIds, refresh } =
    useLogistics(supabase, gira);
  const [localRules, setLocalRules] = useState([]);
  const [savingStatus, setSavingStatus] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({
    hotel: false,
    range: false,
    meals: true,
  });
  const [collapsedLocalities, setCollapsedLocalities] = useState(new Set());
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // <--- NUEVO ESTADO
  const [criteriaCollapsed, setCriteriaCollapsed] = useState(true);
  const [catalogs, setCatalogs] = useState({ locations: [], regions: [] });
  const [managingHito, setManagingHito] = useState(null);
  const [editingFormData, setEditingFormData] = useState(null);
  const debounceRef = useRef({});

  useEffect(() => {
    if (logisticsRules?.length > 0)
      setLocalRules(
        [...logisticsRules].sort((a, b) =>
          (a.fecha_checkin || "9999").localeCompare(b.fecha_checkin || "9999"),
        ),
      );
  }, [logisticsRules]);

  // Dentro de LogisticsManager
  useEffect(() => {
    const fetchC = async () => {
      const [l, r, v, t] = await Promise.all([
        supabase.from("localidades").select("id, localidad"),
        supabase.from("regiones").select("id, region"),
        // Traemos el lugar físico + el nombre de la ciudad
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
        venues: v.data || [], // Estos son los lugares para el EventForm
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

  // Busca esta parte en tu componente y reemplázala:
  const groupedSummary = useMemo(() => {
    let list = summary || [];
    // --- NUEVO FILTRO DE BÚSQUEDA ---
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
        const isLocal = m.is_local; // Propiedad que viene del hook

        // Definimos qué es obligatorio
        const missingCheckIn = !isLocal && !l.checkin?.date;
        const missingCheckOut = !isLocal && !l.checkout?.date;
        const missingSubida = !l.transports[0]?.subidaData?.date;
        const missingBajada = !l.transports[0]?.bajadaData?.date;

        // Retorna true si le falta al menos una cosa obligatoria
        return (
          missingCheckIn || missingCheckOut || missingSubida || missingBajada
        );
      });
    }

    return list.reduce((acc, p) => {
      const city = p.localidades?.localidad || "Sin Localidad";
      if (!acc[city]) acc[city] = [];
      acc[city].push(p);
      return acc;
    }, {});
  }, [summary, showOnlyMissing, searchTerm]); // <--- AÑADIR searchTerm AQUÍ

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

  const handleSaveEvent = async () => {
    if (!editingFormData) return;

    const { id, _isNew, _linkTo, ...rest } = editingFormData;

    // 1. Si vamos a vincular, marcamos la celda en el estado global
    const statusKey = _linkTo ? `${_linkTo.ruleId}-${_linkTo.field}` : null;
    if (statusKey) setSavingStatus((p) => ({ ...p, [statusKey]: "saving" }));

    // ... (tu lógica de cleanPayload se mantiene igual)
    const cleanPayload = {
      fecha: rest.fecha || editingFormData.date,
      hora_inicio: rest.hora_inicio || editingFormData.time,
      descripcion: rest.descripcion,
      id_tipo_evento: rest.id_tipo_evento,
      id_locacion: rest.id_locacion,
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

      // 2. Feedback de éxito y limpieza
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
  // Añadir esto dentro de LogisticsManager
  const handleUnlinkGlobal = async (ruleId, field) => {
    if (!ruleId || !field) return;

    // Normalizamos el nombre de la columna (id_evento_checkin, etc)
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

      // Arrays de selección múltiple
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

      // Campos individuales legacy
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
  return (
    <div className="flex flex-col h-full bg-slate-200 animate-in fade-in font-sans overflow-hidden">
      <div className="flex-1 overflow-auto p-4 space-y-8">
        {/* HEADER */}

        <div className="bg-white border-2 border-slate-300 rounded-xl shadow-2xl overflow-hidden overflow-x-auto">
          {/* TABLA ADAPTATIVA */}
          <div className="bg-white border-b border-slate-300 p-3 flex justify-between items-center z-0 shrink-0 mb-2">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                <IconSettings className="text-indigo-500" size={18} /> Logística
              </h3>
              <ManualTrigger section="logistica_chips" />

              <button
                onClick={() => setCriteriaCollapsed(!criteriaCollapsed)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${criteriaCollapsed ? "bg-indigo-600 text-white border-indigo-800 shadow-sm" : "bg-white text-slate-500 border-slate-300"}`}
              >
                {criteriaCollapsed ? "Chips" : "Editor"}
              </button>
            </div>

            <div className="flex gap-2">
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
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border-2 transition-all ${!collapsedGroups[g.key] ? `${g.color} text-white border-black/10` : "bg-slate-300 text-slate-500 border-slate-400"}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-800 text-white uppercase font-black text-[9px] z-10">
              {" "}
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
                        ].map((s) =>
                          row[s.k]?.map((id) => (
                            <div
                              key={id}
                              className={`${s.c} text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase truncate shadow-sm`}
                            >
                              {
                                (s.k === "target_regions"
                                  ? catalogs.regions
                                  : s.k === "target_localities"
                                    ? catalogs.locations
                                    : s.k === "target_categories"
                                      ? CATEGORIA_OPTIONS
                                      : rosterOptions
                                )?.find(
                                  (o) => String(o.val || o.id) === String(id),
                                )?.label
                              }
                            </div>
                          )),
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
                          onEditEvent={setEditingFormData}
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
                          onEditEvent={setEditingFormData}
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
                          onEditEvent={setEditingFormData}
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
                          onEditEvent={setEditingFormData}
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
              {/* BUSCADOR DE NOMBRE */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="BUSCAR POR NOMBRE..."
                  className="pl-3 pr-8 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:border-indigo-400 w-48 transition-all placeholder:text-slate-300"
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
                className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${
                  showOnlyMissing
                    ? "bg-red-600 text-white border-red-700 shadow-md"
                    : "bg-white text-slate-400 border-slate-200"
                }`}
              >
                {showOnlyMissing ? "Viendo Faltantes" : "Filtrar Faltantes"}
              </button>
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
      {/* MODAL EVENTFORM */}
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
