import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "../../components/ui/Icons";

import IndependentRehearsalForm from "./IndependentRehearsalForm";
import MassiveRehearsalGenerator from "./MassiveRehearsalGenerator";
import EnsembleCalendar from "./EnsembleCalendar";
import EventQuickView from "./EventQuickView";
import FilterDropdown from "../../components/ui/FilterDropdown";
import DateInput from "../../components/ui/DateInput";
import SearchableSelect from "../../components/ui/SearchableSelect";
import MultiSelect from "../../components/ui/MultiSelect";

import { format, addMonths, getDay, setDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useGiraRoster } from "../../hooks/useGiraRoster";

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

// --- COMPONENTE TARJETA (LISTA) ---
const RehearsalCardItem = ({
  evt,
  activeMembersSet,
  supabase,
  onEdit,
  onDelete,
  isSelected,
  onSelect,
}) => {
  const { day, num, month } = formatDateBox(evt.fecha);

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

  return (
    <div
      className={`flex items-start p-2.5 border rounded-lg shadow-sm transition-all bg-white ${isSelected ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/40" : "border-slate-200"} ${!isMyEvent ? "opacity-60 grayscale-[0.5] border-dashed" : ""}`}
    >
      {isEditable && (
        <div className="mr-3 pt-2 pl-1 flex items-center justify-center">
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={(e) => onSelect(evt.id, e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        </div>
      )}
      <div className="flex flex-col items-center justify-center rounded-md p-1.5 w-12 mr-3 shrink-0 bg-slate-50 border border-slate-100">
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
                className="text-[9px] px-1.5 rounded border font-bold uppercase tracking-wider"
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
                onClick={() => onDelete(evt.id)}
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
                className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1"
              >
                <IconMusic size={10} className="text-slate-400" />{" "}
                {prog.nomenclador ? `${prog.nomenclador} ` : ""}
                {prog.nombre_gira}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
          <span className="flex items-center gap-1">
            <IconMapPin size={12} className="text-slate-400" /> {locationStr}
          </span>
          {isMyEvent && (
            <span
              className={`flex items-center gap-1 font-bold ${isFull ? "text-green-600" : "text-amber-600"}`}
            >
              <IconUsers size={12} />
              {loadingRoster ? "..." : isFull ? "Tutti" : count}
            </span>
          )}
          {evt.eventos_ensambles?.length > 0 && (
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              {evt.eventos_ensambles.map((ee) => (
                <span
                  key={ee.ensambles?.id}
                  className="text-[9px] text-slate-500 font-semibold uppercase bg-slate-100 px-1 rounded"
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

const ProgramCardItem = ({ program, activeMembersSet, supabase }) => {
  const { roster, loading } = useGiraRoster(supabase, program);
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
    alert(`Integrantes convocados (${count}):\n\n${names}`);
  };
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full group">
      <div>
        <div className="flex justify-between items-start mb-1">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border bg-slate-50 text-slate-600 border-slate-200">
            {program.tipo}
          </span>
          <button
            onClick={showMembersList}
            className={`text-[10px] flex items-center gap-1 font-bold hover:underline ${isFull ? "text-green-600" : "text-amber-600"}`}
          >
            <IconUsers size={12} />
            {isFull ? "Todos" : count}
          </button>
        </div>
        <h3 className="font-bold text-slate-800 text-sm leading-tight group-hover:text-indigo-700 transition-colors">
          {program.mes_letra} | {program.nomenclador} - {program.nombre_gira}
        </h3>
      </div>
      <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-2 border-t border-slate-100 mt-2">
        <IconCalendar size={10} />{" "}
        {format(new Date(program.fecha_desde), "d MMM", { locale: es })} -{" "}
        {format(new Date(program.fecha_hasta), "d MMM", { locale: es })}
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

  // Listas para Selectores
  const [locationsList, setLocationsList] = useState([]);
  const [eventTypesList, setEventTypesList] = useState([]);
  const [programasOptions, setProgramasOptions] = useState([]);
  const [ensamblesOptions, setEnsamblesOptions] = useState([]);
  const [membersOptions, setMembersOptions] = useState([]);

  // UI States
  const [activeTab, setActiveTab] = useState("ensayos");
  const [showOverlapOptions, setShowOverlapOptions] = useState(false);
  const [overlapCategories, setOverlapCategories] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [monthsLimit, setMonthsLimit] = useState(3);

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
    day: "",
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

        const [cats, locs, types, mems, progsData] = await Promise.all([
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
            .from("programas")
            .select("id, nombre_gira, fecha_desde, mes_letra, nomenclador")
            .gte("fecha_hasta", today)
            .order("fecha_desde", { ascending: true }),
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
        setProgramasOptions(
          (progsData.data || []).map((p) => ({
            id: p.id,
            label: `${p.mes_letra || "?"} | ${p.nomenclador || ""} - ${p.nombre_gira}`,
            subLabel: p.fecha_desde
              ? `Inicio: ${format(new Date(p.fecha_desde), "dd/MM/yyyy")}`
              : "",
          })),
        );

        let ensemblesToManage = [];
        if (isSuperUser) {
          const { data } = await supabase
            .from("ensambles")
            .select("id, ensamble, descripcion")
            .order("ensamble");
          setAllEnsembles(data || []);
          ensemblesToManage = data || [];
        } else {
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
      monthsLimit,
      overlapCategories,
    ],
    enabled: activeEnsembles.length > 0,
    keepPreviousData: true,
    queryFn: async () => {
      const ensembleIds = activeEnsembles.map((e) => e.id);
      const todayISO = new Date().toISOString().split("T")[0];
      const endDateLimit = addMonths(new Date(), monthsLimit)
        .toISOString()
        .split("T")[0];

      // 1. Fetch de MIS ENSAYOS
      const { data: myRehearsals } = await supabase
        .from("eventos_ensambles")
        .select(
          `
            eventos (
              id, fecha, hora_inicio, hora_fin, descripcion, id_tipo_evento, id_locacion, id_gira,
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
        .gte("eventos.fecha", todayISO)
        .lte("eventos.fecha", endDateLimit)
        .eq("eventos.tecnica", false); // <--- AGREGAR ESTA LÍNEA;
        

      let allEvents = [];
      const seenEventIds = new Set();

      if (myRehearsals) {
        myRehearsals.forEach((r) => {
          if (r.eventos && !seenEventIds.has(r.eventos.id)) {
            seenEventIds.add(r.eventos.id);
            const customs = r.eventos.eventos_asistencia_custom || [];
            allEvents.push({
              ...r.eventos,
              isMyRehearsal: true,
              deltaGuests: customs.filter((c) => c.tipo === "invitado").length,
              deltaAbsent: customs.filter((c) => c.tipo === "ausente").length,
            });
          }
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

        const { data: extraEvents } = await supabase
          .from("eventos")
          .select(
            `
                    id, fecha, hora_inicio, hora_fin, descripcion, id_tipo_evento, id_locacion,
                    locaciones ( nombre, localidades(localidad) ),
                    tipos_evento!inner ( nombre, color, id_categoria ),
                    programas ( id, nombre_gira, mes_letra, nomenclador )
                `,
          )
          .in("id_tipo_evento", typeIdsArray)
          .gte("fecha", todayISO)
          .lte("fecha", endDateLimit)
          .eq("tecnica", false);

        if (extraEvents) {
          extraEvents.forEach((e) => {
            if (!seenEventIds.has(e.id)) {
              seenEventIds.add(e.id);
              allEvents.push({
                ...e,
                isMyRehearsal: false,
                eventos_asistencia_custom: [],
                eventos_ensambles: [],
              });
            }
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
    queryKey: ["programs", activeEnsembles.map((e) => e.id), monthsLimit],
    enabled: activeTab === "programas" && activeEnsembles.length > 0,
    queryFn: async () => {
      const todayISO = new Date().toISOString().split("T")[0];
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
        .gte("fecha_hasta", todayISO)
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

  const applySmartSelect = () => {
    const { day, start, end } = smartFilter;
    const matches = rehearsals
      .filter((evt) => {
        if (!evt.isMyRehearsal) return false;
        const date = parseISO(evt.fecha);
        const matchDay = day === "" || getDay(date) === parseInt(day);
        const matchStart = start === "" || evt.fecha >= start;
        const matchEnd = end === "" || evt.fecha <= end;
        return matchDay && matchStart && matchEnd;
      })
      .map((e) => e.id);
    setSelectedIds((prev) => [...new Set([...prev, ...matches])]);
    setShowSmartSelect(false);
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
  const handleDeleteRehearsal = async (id) => {
    if (!confirm("¿Eliminar?")) return;
    toast.promise(
      async () => {
        await supabase.from("eventos").delete().eq("id", id);
      },
      {
        loading: "Eliminando...",
        success: () => {
          refreshData();
          return "Eliminado";
        },
        error: "Error",
      },
    );
  };

  // --- NUEVA FUNCIÓN: ELIMINACIÓN MASIVA ---
  const handleBulkDelete = async () => {
    if (
      !confirm(
        `¿Estás seguro de eliminar ${selectedIds.length} eventos? Esta acción no se puede deshacer.`,
      )
    )
      return;

    toast.promise(
      async () => {
        const { error } = await supabase
          .from("eventos")
          .delete()
          .in("id", selectedIds);
        if (error) throw error;
      },
      {
        loading: "Eliminando eventos...",
        success: () => {
          refreshData();
          setSelectedIds([]);
          return `${selectedIds.length} eventos eliminados`;
        },
        error: (err) => `Error: ${err.message}`,
      },
    );
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

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 md:p-6 gap-3 overflow-hidden">
      {/* HEADER COMPACTO */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              Coordinación
              {isSuperUser && (
                <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded uppercase tracking-wide">
                  Admin
                </span>
              )}
            </h1>
            <div className="flex gap-1">
              {activeEnsembles.map((e) => (
                <span
                  key={e.id}
                  className="text-[10px] font-bold px-2 py-0.5 bg-white text-slate-600 rounded border border-slate-200 shadow-sm flex items-center gap-1"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>{" "}
                  {e.ensamble}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
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
            <button
              onClick={() => {
                setEditingEvent(null);
                setIsModalOpen(true);
              }}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded shadow-md text-xs font-bold flex gap-2 hover:bg-indigo-700"
            >
              <IconPlus size={14} /> Nuevo
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

        {/* Filtros Inteligentes (Compacto) */}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">
                  Día
                </label>
                <select
                  className="w-full text-xs border border-slate-300 rounded p-1.5 outline-none"
                  value={smartFilter.day}
                  onChange={(e) =>
                    setSmartFilter({ ...smartFilter, day: e.target.value })
                  }
                >
                  <option value="">Todos</option>
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
                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">
                  Fechas
                </label>
                <div className="flex gap-1">
                  <DateInput
                    value={smartFilter.start}
                    onChange={(v) =>
                      setSmartFilter({ ...smartFilter, start: v })
                    }
                    placeholder="Desde"
                    className="text-xs"
                  />
                  <DateInput
                    value={smartFilter.end}
                    onChange={(v) => setSmartFilter({ ...smartFilter, end: v })}
                    placeholder="Hasta"
                    className="text-xs"
                  />
                </div>
              </div>
              <button
                onClick={applySmartSelect}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-2 h-[32px]"
              >
                <IconCheck size={14} /> Seleccionar
              </button>
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
          {/* BOTONES DE ACCIÓN MASIVA */}
          <div className="flex gap-2">
            <button
              onClick={handleBulkDelete}
              className="bg-red-500 text-white hover:bg-red-600 font-bold px-3 py-1 rounded text-xs transition-colors flex items-center gap-2 shadow-sm"
            >
              <IconTrash size={14} /> Eliminar Seleccionados
            </button>
            <button
              onClick={() => setIsBulkEditModalOpen(true)}
              className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-3 py-1 rounded text-xs transition-colors flex items-center gap-2 shadow-sm"
            >
              <IconSettings size={14} /> Editar Seleccionados
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
                {rehearsals.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {rehearsals.map((evt) => (
                      <RehearsalCardItem
                        key={evt.id}
                        evt={evt}
                        activeMembersSet={activeMembersSet}
                        supabase={supabase}
                        onEdit={handleEditRehearsal}
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
                <div className="py-6 flex justify-center">
                  <button
                    onClick={() => setMonthsLimit((prev) => prev + 3)}
                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors"
                  >
                    <IconChevronDown size={14} /> Cargar 3 meses más
                  </button>
                </div>
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
                    // Si es mío o ajeno, permitimos ver detalles
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
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                      Mover a Día de la Semana
                    </label>
                    <select
                      className="w-full border rounded p-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none"
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
                      className="w-full border rounded p-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none"
                      value={bulkFormData.eventTypeId}
                      onChange={(e) =>
                        setBulkFormData({
                          ...bulkFormData,
                          eventTypeId: e.target.value,
                        })
                      }
                    >
                      <option value="">- Sin cambios -</option>
                      {eventTypesList.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.nombre}
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
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                        Hora Inicio
                      </label>
                      <input
                        type="time"
                        className="w-full border rounded p-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none"
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
                        className="w-full border rounded p-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none"
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
                      Nuevo Título / Nota
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded p-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none"
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
                      placeholder="Seleccionar ensambles..."
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
                      placeholder="Seleccionar programas..."
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
                    <IconUsers size={14} /> Asistencia Particular (Masiva)
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
                      title="Agregar Invitado"
                    >
                      <IconUserPlus size={14} />
                    </button>
                    <button
                      onClick={() => handleAddBulkMember("ausente")}
                      disabled={!selectedMemberToAdd}
                      className="h-[38px] px-2 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 flex items-center gap-1 text-xs font-bold disabled:opacity-50"
                      title="Marcar Ausente"
                    >
                      <IconUserX size={14} />
                    </button>
                  </div>
                  {bulkFormData.customAttendance.length > 0 ? (
                    <div className="space-y-1 overflow-y-auto flex-1 max-h-40 pr-1">
                      {bulkFormData.customAttendance.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-1.5 bg-slate-50 rounded border border-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            {item.tipo === "invitado" ? (
                              <span className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded text-[9px] font-bold">
                                INVITADO
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-800 px-1 py-0.5 rounded text-[9px] font-bold">
                                AUSENTE
                              </span>
                            )}
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
                  ) : (
                    <div className="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50 rounded border border-dashed border-slate-200 flex-1 flex items-center justify-center">
                      Sin cambios de asistencia
                    </div>
                  )}
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

      {/* MODAL VISTA RÁPIDA */}
      {viewingEvent && (
        <EventQuickView
          event={viewingEvent}
          onClose={() => setViewingEvent(null)}
          onDelete={(id) => {
            setViewingEvent(null);
            handleDeleteRehearsal(id);
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
              myEnsembles={activeEnsembles} // <--- NUEVA PROP
              onSuccess={() => {
                setIsModalOpen(false);
                refreshData();
              }}
              onCancel={() => setIsModalOpen(false)}
            />
          </div>
        </div>
      )}
      {isMassiveModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <MassiveRehearsalGenerator
            supabase={supabase}
            myEnsembles={activeEnsembles} // <--- NUEVA PROP
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
