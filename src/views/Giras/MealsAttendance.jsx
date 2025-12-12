// src/views/Giras/MealsAttendance.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  IconLoader, IconSearch, IconClock, IconUsers, IconAlertTriangle,
  IconCheck, IconX, IconHelpCircle, IconArrowUp, IconArrowDown,
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import { format, parseISO, isAfter, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useGiraRoster } from "../../hooks/useGiraRoster"; // <--- IMPORTAR HOOK

// Helper simplificado: Ya no necesita calcular lógica compleja, solo verifica
const parseConvocation = (convocadosList, person) => {
  if (!convocadosList || convocadosList.length === 0) return false;
  return convocadosList.some((tag) => {
    if (tag === "GRP:TUTTI") return true;
    // Usamos las propiedades ya calculadas por el hook (is_local, rol_gira)
    if (tag === "GRP:LOCALES") return person.is_local;
    if (tag === "GRP:NO_LOCALES") return !person.is_local;
    
    if (tag === "GRP:PRODUCCION") return person.rol_gira === "produccion";
    if (tag === "GRP:SOLISTAS") return person.rol_gira === "solista";
    if (tag === "GRP:DIRECTORES") return person.rol_gira === "director";
    
    if (tag.startsWith("LOC:")) return person.id_localidad === parseInt(tag.split(":")[1]);
    if (tag.startsWith("FAM:")) return person.instrumentos?.familia === tag.split(":")[1];
    return false;
  });
};

export default function MealsAttendance({ supabase, gira }) {
  // 1. Usar el Hook para obtener la "Verdad Única" del roster
  const { roster, loading: rosterLoading } = useGiraRoster(supabase, gira);

  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingCell, setUpdatingCell] = useState(null);

  // Fecha límite
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");

  const [sortConfig, setSortConfig] = useState({ key: "apellido", direction: "asc" });

  useEffect(() => {
    if (gira?.id) {
      // Configurar fecha límite visual
      if (gira.fecha_confirmacion_limite) {
        try {
          const dateObj = new Date(gira.fecha_confirmacion_limite);
          if (!isNaN(dateObj.getTime())) {
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
            const dd = String(dateObj.getDate()).padStart(2, "0");
            const hh = String(dateObj.getHours()).padStart(2, "0");
            const min = String(dateObj.getMinutes()).padStart(2, "0");
            setDeadlineDate(`${yyyy}-${mm}-${dd}`);
            setDeadlineTime(`${hh}:${min}`);
          }
        } catch (e) { console.error("Error parsing deadline:", e); }
      } else {
        setDeadlineDate("");
        setDeadlineTime("");
      }
      fetchMatrixData();
    }
  }, [gira]);

  const fetchMatrixData = async () => {
    setLoading(true);
    try {
      // Traer eventos de comida (Tipos 7, 8, 9, 10)
      const { data: evts, error: errEvt } = await supabase
        .from("eventos")
        .select(`*, tipos_evento (nombre)`)
        .eq("id_gira", gira.id)
        .in("id_tipo_evento", [7, 8, 9, 10])
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });

      if (errEvt) throw errEvt;

      if (evts.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
      }

      // Traer asistencias
      const { data: att, error: errAtt } = await supabase
        .from("eventos_asistencia")
        .select("*")
        .in("id_evento", evts.map((e) => e.id));

      if (errAtt) throw errAtt;

      const map = {};
      att.forEach((a) => {
        map[`${a.id_evento}-${a.id_integrante}`] = { estado: a.estado, id: a.id };
      });

      setEvents(evts);
      setAttendanceMap(map);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = async (eventId, memberId, currentStatus) => {
    // Toggle: null -> P -> A -> null
    let newStatus = "P";
    if (currentStatus === "P") newStatus = "A";
    else if (currentStatus === "A") newStatus = null;

    const key = `${eventId}-${memberId}`;
    setUpdatingCell(key);
    try {
      if (newStatus === null) {
        await supabase.from("eventos_asistencia").delete().match({ id_evento: eventId, id_integrante: memberId });
        setAttendanceMap((prev) => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
      } else {
        const { data, error } = await supabase
          .from("eventos_asistencia")
          .upsert({ id_evento: eventId, id_integrante: memberId, estado: newStatus }, { onConflict: "id_evento, id_integrante" })
          .select().single();
        if (error) throw error;
        setAttendanceMap((prev) => ({ ...prev, [key]: { estado: data.estado, id: data.id } }));
      }
    } catch (error) {
      alert("Error guardando asistencia");
    } finally {
      setUpdatingCell(null);
    }
  };

  const saveDeadline = async (dateVal, timeVal) => {
    if (!dateVal && !timeVal) {
        updateDbDeadline(null);
        return;
    }
    if (dateVal && timeVal) {
      const combinedStr = `${dateVal}T${timeVal}:00`;
      const dateObj = new Date(combinedStr);
      if (!isNaN(dateObj.getTime())) updateDbDeadline(dateObj.toISOString());
    }
  };

  const updateDbDeadline = async (isoString) => {
    await supabase.from("programas").update({ fecha_confirmacion_limite: isoString }).eq("id", gira.id);
  };

  const getDeadlineStatus = () => {
    if (!deadlineDate || !deadlineTime) return null;
    const combined = new Date(`${deadlineDate}T${deadlineTime}:00`);
    if (isNaN(combined.getTime())) return null;

    if (isAfter(new Date(), combined)) {
      return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 flex items-center gap-1"><IconAlertTriangle size={12} /> FINALIZADO</span>;
    } else {
      const dist = formatDistanceToNow(combined, { locale: es });
      return <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 flex items-center gap-1"><IconClock size={12} /> Quedan {dist}</span>;
    }
  };

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Filtrado y Ordenamiento usando el Roster del Hook
  const sortedRoster = useMemo(() => {
    if (!roster) return [];
    
    // Filtrar visualmente (pero usamos el estado_gira del hook)
    // Generalmente aquí mostramos a todos los "confirmados" o quizás todos para gestionar?
    // Asumiremos que mostramos a todos los que trae el hook (incluye ausentes al final)
    let data = [...roster]; 

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter((p) =>
          p.nombre.toLowerCase().includes(lower) ||
          p.apellido.toLowerCase().includes(lower) ||
          p.instrumentos?.instrumento?.toLowerCase().includes(lower)
      );
    }

    return data.sort((a, b) => {
      let valA, valB;
      switch (sortConfig.key) {
        case "apellido":
          valA = `${a.apellido} ${a.nombre}`; valB = `${b.apellido} ${b.nombre}`;
          break;
        case "localidad":
          valA = a.localidades?.localidad || ""; valB = b.localidades?.localidad || "";
          break;
        case "localia":
          valA = a.is_local ? 1 : 0; valB = b.is_local ? 1 : 0;
          break;
        case "rol":
          valA = a.instrumentos?.instrumento || a.rol_gira || "";
          valB = b.instrumentos?.instrumento || b.rol_gira || "";
          break;
        default:
          valA = a.apellido; valB = b.apellido;
      }
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [roster, searchTerm, sortConfig]);

  const eventsByDate = useMemo(() => {
    const groups = {};
    events.forEach((e) => {
      if (!groups[e.fecha]) groups[e.fecha] = [];
      groups[e.fecha].push(e);
    });
    return groups;
  }, [events]);

  const SortIcon = ({ colKey }) => {
    if (sortConfig.key !== colKey) return <span className="w-3"></span>;
    return sortConfig.direction === "asc" ? <IconArrowDown size={10} /> : <IconArrowUp size={10} />;
  };

  if (rosterLoading) return <div className="flex justify-center py-20"><IconLoader className="animate-spin text-indigo-500" size={32} /></div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
      <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <IconUsers className="text-indigo-600" /> Control de Asistencia
          </h2>
          <p className="text-xs text-slate-400">Click en la celda para alternar: Pendiente → Presente → Ausente.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Cierre Confirmación</span>
              <div className="flex items-center gap-2">
                <div className="w-36"><DateInput value={deadlineDate} onChange={(val) => { setDeadlineDate(val); saveDeadline(val, deadlineTime); }} className="bg-white text-xs py-1 w-full" /></div>
                <div className="w-28"><TimeInput value={deadlineTime} onChange={(val) => { setDeadlineTime(val); saveDeadline(deadlineDate, val); }} className="bg-white text-xs py-1 w-full" /></div>
              </div>
            </div>
            <div className="ml-2 min-w-[100px]">{getDeadlineStatus()}</div>
          </div>

          <div className="relative">
            <IconSearch className="absolute left-2 top-2 text-slate-400" size={16} />
            <input type="text" placeholder="Buscar..." className="pl-8 pr-4 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-40" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex justify-center py-20"><IconLoader className="animate-spin text-indigo-500" size={32} /></div>
        ) : (
          <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden relative">
            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-left border-collapse text-sm table-fixed">
                <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] sticky top-0 z-40 shadow-sm">
                  {/* FILA 1: FECHAS */}
                  <tr>
                    <th className="p-0 bg-slate-100 sticky left-0 z-50 border-r border-b border-slate-300 w-[380px] min-w-[380px] max-w-[380px] align-bottom">
                       <div className="absolute bottom-0 right-0 bg-slate-100 text-[9px] text-slate-400 px-1 border-t border-l border-slate-200">{`${sortedRoster.length} integrantes`}</div>
                    </th>
                    {Object.keys(eventsByDate).sort().map((date) => (
                        <th key={date} colSpan={eventsByDate[date].length} className="text-center border-r border-b border-slate-300 px-2 py-1 bg-slate-200/50 z-30">
                          {format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })}
                        </th>
                    ))}
                  </tr>

                  {/* FILA 2: CONTROLES */}
                  <tr>
                    <th className="p-0 bg-slate-50 sticky left-0 z-50 border-r border-slate-300 align-bottom w-[380px] min-w-[380px] max-w-[380px]">
                      <div className="flex items-center h-full w-full text-[10px] text-slate-500 font-bold uppercase">
                        <div className="flex-1 h-full border-b border-slate-200">
                          <button onClick={() => handleSort("apellido")} className="w-full h-full px-3 flex items-center justify-between hover:bg-white hover:text-indigo-600 transition-colors"><span>Nombre</span> <SortIcon colKey="apellido" /></button>
                        </div>
                        <div className="w-[40px] h-full border-l border-b border-slate-200">
                          <button onClick={() => handleSort("localia")} className="w-full h-full flex items-center justify-center hover:bg-white hover:text-indigo-600 transition-colors" title="Localía">L <SortIcon colKey="localia" /></button>
                        </div>
                        <div className="w-[80px] h-full border-l border-b border-slate-200 hidden sm:block">
                          <button onClick={() => handleSort("localidad")} className="w-full h-full flex items-center justify-center gap-1 hover:bg-white hover:text-indigo-600 transition-colors" title="Ciudad">Ciu <SortIcon colKey="localidad" /></button>
                        </div>
                        <div className="w-[80px] h-full border-l border-b border-slate-200">
                          <button onClick={() => handleSort("rol")} className="w-full h-full flex items-center justify-center gap-1 hover:bg-white hover:text-indigo-600 transition-colors" title="Rol / Instrumento">Rol <SortIcon colKey="rol" /></button>
                        </div>
                      </div>
                    </th>
                    {events.map((evt) => {
                      const time = evt.hora_inicio?.slice(0, 5) || "";
                      const typeName = evt.tipos_evento?.nombre || "Comida";
                      const initial = typeName.charAt(0).toUpperCase();
                      return (
                        <th key={evt.id} className="min-w-[50px] border-r border-slate-200 px-1 py-2 text-center align-middle bg-white group hover:bg-slate-50 z-30">
                          <div className="flex flex-col items-center gap-0.5" title={`${typeName} ${time}`}>
                            <span className="text-[10px] text-slate-400 font-normal">{time}</span>
                            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold border ${evt.id_tipo_evento === 8 ? "bg-amber-50 text-amber-700 border-amber-200" : evt.id_tipo_evento === 10 ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>{initial}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {sortedRoster.map((person) => (
                    <tr key={person.id} className="hover:bg-slate-50 group">
                      <td className="p-0 sticky left-0 bg-white group-hover:bg-slate-50 z-40 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[380px] min-w-[380px] max-w-[380px]">
                        <div className="flex items-center h-12 w-full text-xs">
                          <div className="flex-1 px-3 min-w-0 flex flex-col justify-center h-full">
                            <div className={`font-bold truncate ${person.estado_gira === 'ausente' ? 'text-red-400 line-through' : 'text-slate-700'}`} title={`${person.apellido}, ${person.nombre}`}>
                              {person.apellido}, {person.nombre}
                            </div>
                            {person.alimentacion && <span className="text-[9px] text-purple-600 bg-purple-50 w-fit px-1 rounded truncate">{person.alimentacion}</span>}
                          </div>
                          <div className="w-[40px] h-full border-l border-slate-100 flex items-center justify-center">
                            {person.is_local ? <span className="font-bold text-[10px] text-orange-600 bg-orange-50 border border-orange-100 px-1 rounded cursor-default" title="Local">L</span> : <span className="text-slate-300">-</span>}
                          </div>
                          <div className="w-[80px] h-full border-l border-slate-100 hidden sm:flex items-center justify-center px-1">
                            <span className="text-slate-500 truncate text-[11px]" title={person.localidades?.localidad}>{person.localidades?.localidad}</span>
                          </div>
                          <div className="w-[80px] h-full border-l border-slate-100 flex items-center justify-center px-1">
                            <span className="text-slate-600 font-medium truncate text-[11px] uppercase" title={person.instrumentos?.instrumento || person.rol_gira}>{person.instrumentos?.instrumento || person.rol_gira?.substring(0, 8)}</span>
                          </div>
                        </div>
                      </td>

                      {events.map((evt) => {
                        const isConvoked = parseConvocation(evt.convocados, person);
                        const key = `${evt.id}-${person.id}`;
                        const record = attendanceMap[key];
                        const status = record?.estado;
                        const isUpdating = updatingCell === key;

                        if (!isConvoked) {
                          return <td key={evt.id} className="p-1 border-r border-slate-100 bg-slate-50/30 text-center h-12"><div className="w-full h-full flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span></div></td>;
                        }

                        return (
                          <td key={evt.id} className="p-1 border-r border-slate-100 text-center relative h-12 align-middle">
                            {isUpdating && <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20"><IconLoader className="animate-spin text-indigo-500" size={14} /></div>}
                            <button onClick={() => handleAttendanceChange(evt.id, person.id, status)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 mx-auto border-2 ${status === "P" ? "bg-emerald-100 border-emerald-400 text-emerald-700 shadow-sm scale-100" : status === "A" ? "bg-red-50 border-red-200 text-red-400 opacity-60 scale-95" : "bg-slate-50 border-slate-200 text-slate-300 hover:border-slate-300 hover:bg-white"}`}>
                              {status === "P" && <IconCheck size={18} strokeWidth={3} />}
                              {status === "A" && <IconX size={18} strokeWidth={3} />}
                              {!status && <IconHelpCircle size={16} className="opacity-50" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}