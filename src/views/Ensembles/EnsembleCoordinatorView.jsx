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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProgramStyle } from "../../utils/giraUtils";
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
} from "../../components/ui/Icons";
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

import { format, addMonths, getDay, setDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useGiraRoster } from "../../hooks/useGiraRoster";
import { getTransportEventAffectedSummary } from "../../utils/transportLogisticsWarning";

// --- UTILIDADES ---
const formatDateBox = (dateStr) => {
  if (!dateStr) return { day: "-", num: "-", month: "-" };
  try {
    const [y, m, d] = dateStr.split("-");
    const date = new Date(y, m - 1, d);
    return {
      day: format(date, "EEE", { locale: es }).toUpperCase().replace(".", ""),
      num: format(date, "d"),
      month: format(date, "MMM", { locale: es }).toUpperCase().replace(".", ""),
    };
  } catch (e) {
    return { day: "-", num: "-", month: "-" };
  }
};

const formatTime = (timeStr) => (timeStr ? timeStr.slice(0, 5) : "--:--");

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
const RehearsalCardItem = ({
  evt,
  activeMembersSet,
  supabase,
  onEdit,
  onDelete,
  isSelected,
  onSelect,
  feriados = [],
}) => {
  const { day, num, month } = formatDateBox(evt.fecha);
  const feriado = findFeriado(evt.fecha, feriados);

  const isMyEvent = evt.isMyRehearsal;
  const isEditable = isMyEvent;

  let count = 0;
  let loadingRoster = false;
  const rosterHook = evt.programas
    ? useGiraRoster(supabase, evt.programas)
    : { roster: [], loading: false };

  if (evt.programas) {
    loadingRoster = rosterHook.loading;
    if (!loadingRoster) {
      const myInvolvedMembers = rosterHook.roster.filter(
        (m) => activeMembersSet.has(m.id) && m.estado_gira !== "ausente",
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
            onChange={(e) => onSelect(evt.id, e.target.checked)}
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
              {evt.descripcion || "Evento"}
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
                  {prog.nomenclador ? `${prog.nomenclador} ` : ""}
                  {prog.nombre_gira}
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
              {loadingRoster
                ? "..."
                : !evt.programas || activeMembersSet.size === 0
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
                  className="text-[9px] text-slate-500 font-semibold uppercase bg-slate-100 px-1 rounded whitespace-nowrap"
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
};

const ProgramCardItem = ({ program, activeMembersSet, supabase, onEdit }) => {
  const navigate = useNavigate();
  const { roster, loading } = useGiraRoster(supabase, program);
  const programStyle = getProgramStyle(program.tipo);

  if (loading)
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm animate-pulse h-24"></div>
    );
  const myInvolvedMembers = roster.filter(
    (m) => activeMembersSet.has(m.id) && m.estado_gira !== "ausente",
  );
  const count = myInvolvedMembers.length;
  if (count === 0 && program.tipo !== "Ensamble") return null;

  const isFull =
    activeMembersSet.size > 0 && count >= activeMembersSet.size * 0.9;

  const showMembersList = (e) => {
    e.stopPropagation();
    if (count === 0) return;
    const names = myInvolvedMembers
      .map((m) => `• ${m.nombre} ${m.apellido}`)
      .join("\n");
    toast.success(`Integrantes convocados (${count}): ${names}`);
  };

  return (
    <div
      className={`rounded-lg border p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full group ${programStyle.color}`}
    >
      <div>
        <div className="flex justify-between items-start mb-1">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-inherit opacity-90">
            {program.tipo}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate({ pathname: "/", search: `?tab=giras&view=AGENDA&giraId=${program.id}` });
              }}
              className="p-1 rounded opacity-70 hover:opacity-100 transition-opacity"
              title="Ver Agenda"
            >
              <IconCalendar size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate({ pathname: "/", search: `?tab=giras&view=REPERTOIRE&giraId=${program.id}` });
              }}
              className="p-1 rounded opacity-70 hover:opacity-100 transition-opacity"
              title="Ver Repertorio"
            >
              <IconMusic size={14} />
            </button>
            {program.tipo === "Ensamble" && onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(program);
                }}
                className="p-1 rounded opacity-70 hover:opacity-100 transition-opacity"
                title="Editar"
              >
                <IconEdit size={14} />
              </button>
            )}
            <button
              onClick={showMembersList}
              className={`text-[10px] flex items-center gap-1 font-bold hover:underline ${isFull ? "text-green-600" : "text-amber-600"}`}
            >
              <IconUsers size={12} />
              {isFull ? "Todos" : count}
            </button>
          </div>
        </div>
        <h3 className="font-bold text-sm leading-tight group-hover:opacity-90 transition-opacity">
          {program.mes_letra} | {program.nomenclador} - {program.nombre_gira}
        </h3>
      </div>
      <div className="text-[10px] opacity-80 flex items-center gap-1 pt-2 border-t border-current/20 mt-2">
        <IconCalendar size={10} />{" "}
        {format(new Date(program.fecha_desde), "d MMM", { locale: es })} -{" "}
        {format(new Date(program.fecha_hasta), "d MMM", { locale: es })}
      </div>
    </div>
  );
};
// --- NUEVO COMPONENTE: GESTOR DE LOCACIONES (MODAL) ---
const LocationManagerModal = ({ supabase, onClose, onSuccess }) => {
  const [view, setView] = useState("list"); // 'list' | 'form'
  const [locations, setLocations] = useState([]);
  const [cities, setCities] = useState([]); // Localidades para el dropdown
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Estado del formulario
  const [formData, setFormData] = useState({
    id: null,
    nombre: "",
    direccion: "",
    link_mapa: "",
    id_localidad: "",
  });

  // Cargar datos al montar
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [locsRes, citiesRes] = await Promise.all([
        supabase
          .from("locaciones")
          .select("*, localidades(localidad)")
          .order("nombre"),
        supabase.from("localidades").select("id, localidad").order("localidad"),
      ]);

      if (locsRes.data) setLocations(locsRes.data);
      if (citiesRes.data) setCities(citiesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (loc) => {
    setFormData({
      id: loc.id,
      nombre: loc.nombre,
      direccion: loc.direccion || "",
      link_mapa: loc.link_mapa || "",
      id_localidad: loc.id_localidad || "",
      telefono: loc.telefono || "",
      mail: loc.mail || "",
    });
    setView("form");
  };

  const handleCreate = () => {
    setFormData({
      id: null,
      nombre: "",
      direccion: "",
      link_mapa: "",
      id_localidad: "",
      telefono: "",
      mail: "",
    });
    setView("form");
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }

    setLoading(true);
    try {
      const payload = {
        nombre: formData.nombre,
        direccion: formData.direccion || null,
        link_mapa: formData.link_mapa || null,
        id_localidad: formData.id_localidad || null,
        telefono: formData.telefono ? formData.telefono : null,
        mail: formData.mail || null,
      };

      if (formData.id) {
        // Update
        await supabase.from("locaciones").update(payload).eq("id", formData.id);
      } else {
        // Insert
        await supabase.from("locaciones").insert([payload]);
      }

      await fetchData(); // Recargar lista
      if (onSuccess) onSuccess(); // Notificar al padre para que actualice sus listas
      setView("list");
    } catch (err) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = locations.filter(
    (l) =>
      l.nombre.toLowerCase().includes(search.toLowerCase()) ||
      l.localidades?.localidad?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <IconMapPin className="text-indigo-600" />
            {view === "list"
              ? "Gestionar Locaciones"
              : formData.id
                ? "Editar Locación"
                : "Nueva Locación"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="text-center py-4">
              <IconLoader className="animate-spin inline text-indigo-600" />
            </div>
          )}

          {!loading && view === "list" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <IconSearch
                    className="absolute left-2 top-2.5 text-slate-400"
                    size={14}
                  />
                  <input
                    type="text"
                    className="w-full pl-7 p-2 text-xs border rounded outline-none focus:border-indigo-500"
                    placeholder="Buscar locación..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleCreate}
                  className="bg-indigo-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-indigo-700 flex items-center gap-1"
                >
                  <IconPlus size={14} /> Nueva
                </button>
              </div>
              <div className="divide-y divide-slate-100 border rounded-lg">
                {filteredLocations.map((loc) => (
                  <div
                    key={loc.id}
                    className="p-3 flex justify-between items-center hover:bg-slate-50 group"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-700">
                        {loc.nombre}
                      </div>
                      <div className="text-xs text-slate-500 flex gap-2">
                        {loc.localidades?.localidad && (
                          <span>📍 {loc.localidades.localidad}</span>
                        )}
                        {loc.direccion && (
                          <span className="truncate max-w-[150px] opacity-70">
                            {loc.direccion}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEdit(loc)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
                    >
                      <IconEdit size={16} />
                    </button>
                  </div>
                ))}
                {filteredLocations.length === 0 && (
                  <div className="p-4 text-center text-slate-400 text-xs italic">
                    No se encontraron resultados.
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && view === "form" && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Nombre del lugar
                </label>
                <input
                  className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej: Teatro Municipal"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Ciudad / Localidad
                </label>
                <select
                  className="w-full p-2 border rounded text-sm outline-none bg-white"
                  value={formData.id_localidad}
                  onChange={(e) =>
                    setFormData({ ...formData, id_localidad: e.target.value })
                  }
                >
                  <option value="">- Sin definir -</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.localidad}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Dirección
                </label>
                <input
                  className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                  value={formData.direccion}
                  onChange={(e) =>
                    setFormData({ ...formData, direccion: e.target.value })
                  }
                  placeholder="Calle y número"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Link Google Maps (Opcional)
                </label>
                <input
                  className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                  value={formData.link_mapa}
                  onChange={(e) =>
                    setFormData({ ...formData, link_mapa: e.target.value })
                  }
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Teléfono
                  </label>
                  <input
                    type="number" // Tipo número porque es int8
                    className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                    value={formData.telefono}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono: e.target.value })
                    }
                    placeholder="Solo números"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                    value={formData.mail}
                    onChange={(e) =>
                      setFormData({ ...formData, mail: e.target.value })
                    }
                    placeholder="contacto@lugar.com"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {view === "form" && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
            <button
              onClick={() => setView("list")}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              Volver
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 flex items-center gap-2"
            >
              <IconCheck size={14} /> Guardar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
// --- COMPONENTE PRINCIPAL ---
export default function EnsembleCoordinatorView({ supabase }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Estados de Contexto
  const [loading, setLoading] = useState(true);
  const [allEnsembles, setAllEnsembles] = useState([]);
  const [myEnsembles, setMyEnsembles] = useState([]);
  const [rawRelationships, setRawRelationships] = useState([]);
  const [memberMetadata, setMemberMetadata] = useState({});
  const [adminFilterIds, setAdminFilterIds] = useState([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [feriados, setFeriados] = useState([]);
  // Listas para Selectores
  const [locationsList, setLocationsList] = useState([]);
  const [eventTypesList, setEventTypesList] = useState([]);
  const [programasOptions, setProgramasOptions] = useState([]);
  const [ensamblesOptions, setEnsamblesOptions] = useState([]);
  const [membersOptions, setMembersOptions] = useState([]);
  const [isGiraModalOpen, setIsGiraModalOpen] = useState(false);
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
  });

  // Necesitamos este estado adicional para que GiraForm gestione los ensambles seleccionados
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState(new Set());
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [editingProgram, setEditingProgram] = useState(null);

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
      // 1. Insertar la Gira/Programa
      const { data: newGira, error: giraError } = await supabase
        .from("programas")
        .insert([giraFormData])
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
        const [progRes, locRes, fuentesRes, staffRes] = await Promise.all([
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
  const [activeTab, setActiveTab] = useState("ensayos");
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
  // FILTRO DE FECHAS (LISTA PRINCIPAL)
  const [dateFilter, setDateFilter] = useState({
    start: new Date().toISOString().split("T")[0], // Default: Hoy
    end: "", // Default: Indefinido
  });

  // Estado para Menú de Herramientas Móvil
  const [showMobileTools, setShowMobileTools] = useState(false);
  const mobileToolsRef = useRef(null);
  useClickOutside(mobileToolsRef, () => setShowMobileTools(false));

  // --- ESTADOS PARA PERSISTENCIA DEL CALENDARIO ---
  const [viewDate, setViewDate] = useState(new Date());
  const [currentView, setCurrentView] = useState("week");

  // ESTADO PARA MODAL RÁPIDO
  const [viewingEvent, setViewingEvent] = useState(null);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMassiveModalOpen, setIsMassiveModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Selección
  const [selectedIds, setSelectedIds] = useState([]);
  const [showSmartSelect, setShowSmartSelect] = useState(false);
  const [smartFilter, setSmartFilter] = useState({
    days: [],
    start: "",
    end: "",
  });

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

  const isSuperUser =
    user?.rol_sistema === "admin" || user?.rol_sistema === "produccion_general";

  // --- CARGA DE DATOS ESTÁTICOS ---
  useEffect(() => {
    const fetchContext = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const today = new Date().toISOString().split("T")[0];

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
        if (isSuperUser) {
          // Si es superusuario, puede gestionar todos los que acabamos de bajar
          ensemblesToManage = globalEnsembles || [];
        } else {
          // Si es coordinador, buscamos solo los que tiene asignados
          const { data: coordData } = await supabase
            .from("ensambles_coordinadores")
            .select(`id_ensamble, ensambles ( id, ensamble, descripcion )`)
            .eq("id_integrante", user.id);
          ensemblesToManage = coordData
            ? coordData.map((c) => c.ensambles).filter(Boolean)
            : [];
        }
        setMyEnsembles(ensemblesToManage);
        setEnsamblesOptions(
          ensemblesToManage.map((e) => ({ id: e.id, label: e.ensamble })),
        );

        if (ensemblesToManage.length > 0) {
          const ids = ensemblesToManage.map((e) => e.id);
          const { data: relData } = await supabase
            .from("integrantes_ensambles")
            .select("id_integrante, id_ensamble")
            .in("id_ensamble", ids);
          setRawRelationships(relData || []);

          const uniqueMemberIds = [
            ...new Set(relData?.map((r) => r.id_integrante) || []),
          ];
          if (uniqueMemberIds.length > 0) {
            const [memberInfos, otherEnsData] = await Promise.all([
              supabase
                .from("integrantes")
                .select("id, instrumentos(familia)")
                .in("id", uniqueMemberIds),
              supabase
                .from("integrantes_ensambles")
                .select("id_integrante, id_ensamble")
                .in("id_integrante", uniqueMemberIds),
            ]);
            const metaMap = {};
            uniqueMemberIds.forEach((id) => {
              const info = memberInfos.data?.find((m) => m.id === id);
              const otherEns =
                otherEnsData.data
                  ?.filter((oe) => oe.id_integrante === id)
                  .map((oe) => oe.id_ensamble) || [];
              metaMap[id] = {
                family: info?.instrumentos?.familia,
                allEnsembles: otherEns,
              };
            });
            setMemberMetadata(metaMap);

            // --- PROGRAMAS RELEVANTES PARA EDICIÓN MASIVA (POR MÚSICOS) ---
            const myEnsembleIds = ensemblesToManage.map((e) => e.id);
            const myFamilies = new Set();
            (memberInfos.data || []).forEach((m) => {
              if (m.instrumentos?.familia) {
                myFamilies.add(m.instrumentos.familia);
              }
            });

            const { data: sources } = await supabase
              .from("giras_fuentes")
              .select("id_gira, tipo, valor_id, valor_texto")
              .in("tipo", ["ENSAMBLE", "FAMILIA"]);

            const candidateGiraIds = new Set();

            sources?.forEach((s) => {
              if (
                s.tipo === "ENSAMBLE" &&
                myEnsembleIds.includes(parseInt(s.valor_id, 10))
              ) {
                candidateGiraIds.add(s.id_gira);
              }
              if (s.tipo === "FAMILIA" && myFamilies.has(s.valor_texto)) {
                candidateGiraIds.add(s.id_gira);
              }
            });

            if (uniqueMemberIds.length > 0) {
              const { data: memberPrograms } = await supabase
                .from("giras_integrantes")
                .select("id_gira")
                .in("id_integrante", uniqueMemberIds);
              memberPrograms?.forEach((mp) =>
                candidateGiraIds.add(mp.id_gira),
              );
            }

            const allIds = Array.from(candidateGiraIds);
            if (allIds.length > 0) {
              const { data: progsData } = await supabase
                .from("programas")
                .select(
                  "id, nombre_gira, fecha_desde, fecha_hasta, mes_letra, nomenclador",
                )
                .in("id", allIds)
                .gte("fecha_hasta", today)
                .order("fecha_desde", { ascending: true });

              setProgramasOptions(
                (progsData || []).map((p) => ({
                  id: p.id,
                  label: `${p.mes_letra || "?"} | ${p.nomenclador || ""} - ${p.nombre_gira}`,
                  subLabel: p.fecha_desde
                    ? `Inicio: ${format(new Date(p.fecha_desde), "dd/MM/yyyy")}`
                    : "",
                })),
              );
            } else {
              setProgramasOptions([]);
            }
          }
        }
      } catch (error) {
        console.error("Error context:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContext();
  }, [user, supabase, isSuperUser]);

  const activeEnsembles = useMemo(() => {
    if (isSuperUser && adminFilterIds.length > 0)
      return myEnsembles.filter((e) => adminFilterIds.includes(e.id));
    return myEnsembles;
  }, [isSuperUser, adminFilterIds, myEnsembles]);

  const activeMembersSet = useMemo(() => {
    const activeEnsembleIds = new Set(activeEnsembles.map((e) => e.id));
    const memberIds = rawRelationships
      .filter((r) => activeEnsembleIds.has(r.id_ensamble))
      .map((r) => r.id_integrante);
    return new Set(memberIds);
  }, [activeEnsembles, rawRelationships]);

  const activeMemberIdsArray = useMemo(
    () => Array.from(activeMembersSet),
    [activeMembersSet],
  );

  // --- QUERY: ENSAYOS + SUPERPOSICIONES ---
  const { data: rehearsals = [], isLoading: rehearsalsLoading } = useQuery({
    queryKey: [
      "rehearsals",
      activeEnsembles.map((e) => e.id),
      dateFilter, // Dependencia clave: rango de fechas
      overlapCategories,
    ],
    enabled: activeEnsembles.length > 0,
    keepPreviousData: true,
    queryFn: async () => {
      const ensembleIds = activeEnsembles.map((e) => e.id);

      const today = new Date().toISOString().split("T")[0];

      // PROGRAMAS RELEVANTES SEGÚN MÚSICOS ACTIVOS (ensambles + familias + asignaciones directas)
      const myEnsembleIds = ensembleIds;
      const myFamilies = new Set();

      activeMemberIdsArray.forEach((mid) => {
        const meta = memberMetadata[mid];
        if (meta?.family) {
          myFamilies.add(meta.family);
        }
      });

      const candidateProgramIds = new Set();

      const { data: sources } = await supabase
        .from("giras_fuentes")
        .select("id_gira, tipo, valor_id, valor_texto")
        .in("tipo", ["ENSAMBLE", "FAMILIA"]);

      sources?.forEach((s) => {
        if (
          s.tipo === "ENSAMBLE" &&
          myEnsembleIds.includes(parseInt(s.valor_id, 10))
        ) {
          candidateProgramIds.add(s.id_gira);
        }
        if (s.tipo === "FAMILIA" && myFamilies.has(s.valor_texto)) {
          candidateProgramIds.add(s.id_gira);
        }
      });

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
              programas ( id, nombre_gira, mes_letra, nomenclador ),
              eventos_programas_asociados ( programas ( id, nombre_gira, mes_letra, nomenclador ) ),
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
                programas ( id, nombre_gira, mes_letra, nomenclador ),
                eventos_programas_asociados ( programas ( id, nombre_gira, mes_letra, nomenclador ) ),
                eventos_ensambles ( id_ensamble ) 
            `,
          ) // ^^^ AGREGAMOS eventos_ensambles AQUI PARA PODER FILTRAR
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
                ensembleIds.includes(le.id_ensamble),
              );
            }

            if (!isRelevant) return;

            seenEventIds.add(e.id);
            allEvents.push({
              ...e,
              isMyRehearsal: false,
              eventos_asistencia_custom: [],
              eventos_ensambles: [],
            });
          });
        }
      }

      return allEvents.sort((a, b) =>
        (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
      );
    },
  });

  // --- QUERY: PROGRAMAS ---
  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ["programs", activeEnsembles.map((e) => e.id), dateFilter.start],
    enabled: activeTab === "programas" && activeEnsembles.length > 0,
    queryFn: async () => {
      // Usamos la fecha de inicio del filtro o hoy como fallback
      const filterDate =
        dateFilter.start || new Date().toISOString().split("T")[0];

      const myEnsembleIds = activeEnsembles.map((e) => e.id);
      const myFamilies = new Set();

      activeMemberIdsArray.forEach((mid) => {
        const meta = memberMetadata[mid];
        if (meta?.family) {
          myFamilies.add(meta.family);
        }
      });

      const { data: sources } = await supabase
        .from("giras_fuentes")
        .select("id_gira, tipo, valor_id, valor_texto")
        .in("tipo", ["ENSAMBLE", "FAMILIA"]);

      const candidateGiraIds = new Set();

      sources?.forEach((s) => {
        if (
          s.tipo === "ENSAMBLE" &&
          myEnsembleIds.includes(parseInt(s.valor_id))
        ) {
          candidateGiraIds.add(s.id_gira);
        }
        if (s.tipo === "FAMILIA" && myFamilies.has(s.valor_texto)) {
          candidateGiraIds.add(s.id_gira);
        }
      });

      if (activeMemberIdsArray.length > 0) {
        const { data: memberPrograms } = await supabase
          .from("giras_integrantes")
          .select("id_gira")
          .in("id_integrante", activeMemberIdsArray);

        memberPrograms?.forEach((mp) => candidateGiraIds.add(mp.id_gira));
      }

      const allIds = Array.from(candidateGiraIds);
      if (allIds.length === 0) return [];

      const { data: candidates } = await supabase
        .from("programas")
        .select(
          "id, nombre_gira, fecha_desde, fecha_hasta, tipo, zona, mes_letra, nomenclador",
        )
        .in("id", allIds)
        .gte("fecha_hasta", filterDate)
        .order("fecha_desde", { ascending: true });

      return candidates || [];
    },
  });

  const refreshData = () => {
    queryClient.invalidateQueries(["rehearsals"]);
    queryClient.invalidateQueries(["programs"]);
  };

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

  const handleSelect = (id, checked) =>
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );

  const handleSelectAllVisible = (checked) => {
    if (checked) {
      const allIds = rehearsals.filter((r) => r.isMyRehearsal).map((r) => r.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const isAllSelected =
    rehearsals.length > 0 &&
    rehearsals
      .filter((r) => r.isMyRehearsal)
      .every((r) => selectedIds.includes(r.id));

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

  if (loading)
    return (
      <div className="h-full flex items-center justify-center">
        <IconLoader className="animate-spin text-indigo-600" size={32} />
      </div>
    );

  const adminOptions = allEnsembles.map((e) => ({
    id: e.id,
    label: e.ensamble,
  }));

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
            {!isSuperUser && (
              <div className="flex gap-1 overflow-x-auto max-w-[200px] md:max-w-none no-scrollbar">
                {activeEnsembles.map((e) => (
                  <span
                    key={e.id}
                    className="text-[10px] font-bold px-2 py-0.5 bg-white text-slate-600 rounded border border-slate-200 shadow-sm flex items-center gap-1 whitespace-nowrap"
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

            {/* BOTONES ESCRITORIO: TEXTO COMPLETO */}

            <div className="hidden md:flex gap-2">
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

        {/* Filtros Admin */}
        {isSuperUser && (
          <div className="w-full md:w-1/3">
            <FilterDropdown
              placeholder="Filtrar por Ensamble..."
              options={adminOptions}
              selectedIds={adminFilterIds}
              onChange={setAdminFilterIds}
            />
          </div>
        )}

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
              onClick={() => setSelectedIds([])}
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
        </div>

        {(activeTab === "ensayos" || activeTab === "calendario") && (
          <div className="relative mb-1">
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
        )}
      </div>

      <div className="flex-1 bg-white rounded-b-lg border border-slate-200 border-t-0 p-0 shadow-sm overflow-hidden relative">
        {rehearsalsLoading ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <IconLoader className="animate-spin mr-2" /> Cargando...
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4">
            {activeTab === "ensayos" && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-2 pb-2 border-b border-slate-100 pl-1">
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
                  </div>

                  {/* FILTRO DE FECHAS EN LÍNEA */}
                  <div className="flex items-center gap-2">
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
                  </div>
                </div>

                {rehearsals.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {rehearsals.map((evt) => (
                      <RehearsalCardItem
                        key={evt.id}
                        evt={evt}
                        activeMembersSet={activeMembersSet}
                        supabase={supabase}
                        onEdit={handleEditRehearsal}
                        feriados={feriados}
                        onDelete={handleDeleteRehearsal}
                        isSelected={selectedIds.includes(evt.id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400">
                    No hay eventos visibles.
                  </div>
                )}
              </>
            )}
            {activeTab === "calendario" && (
              <div className="h-full flex flex-col">
                <div className="mb-2 px-2 text-xs text-slate-500 flex items-center gap-2 bg-blue-50 p-2 rounded border border-blue-100">
                  <IconAlertTriangle size={12} className="text-blue-500" />
                  <span>
                    Arrastra tus eventos (sólidos) para reprogramar. Click para
                    detalles.
                  </span>
                </div>
                <EnsembleCalendar
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {programs.map((prog) => (
                  <ProgramCardItem
                    key={prog.id}
                    program={prog}
                    activeMembersSet={activeMembersSet}
                    supabase={supabase}
                    onEdit={handleEditProgram}
                  />
                ))}
              </div>
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
                  <div className="bg-emerald-50 p-3 rounded border border-emerald-100">
                    <h3 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-2">
                      <IconLayers size={14} /> Reemplazar Repertorio
                    </h3>
                    <MultiSelect
                      placeholder="Seleccionar..."
                      options={programasOptions}
                      selectedIds={bulkFormData.programas}
                      onChange={(ids) =>
                        setBulkFormData({ ...bulkFormData, programas: ids })
                      }
                    />
                  </div>
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
                  queryClient.invalidateQueries(["programs"]);
                } else {
                  setIsGiraModalOpen(false);
                  setSelectedSources([]);
                }
              }}
              onSave={editingProgram ? () => {} : handleSaveGira}
              onRefresh={editingProgram ? () => queryClient.invalidateQueries(["programs"]) : undefined}
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
    </div>
  );
}
