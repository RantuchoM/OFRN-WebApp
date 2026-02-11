import React, { useState, useEffect, useMemo } from "react";
import {
  IconLoader,
  IconSearch,
  IconClock,
  IconUsers,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconHelpCircle,
  IconArrowUp,
  IconArrowDown,
  IconFilter,
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import { format, parseISO, isAfter, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// Helper: Verifica Convocatoria Técnica y Cobertura Logística (Filtro Tutti corregido)
const checkEligibility = (evt, person) => {
  if (!evt || !person) return false;

  // 1. Convocatoria Técnica
  const convocadosList = evt.convocados || [];
  const isTechnicallyConvoked = convocadosList.some((tag) => {
    if (tag === "GRP:TUTTI") return true;
    if (tag === "GRP:LOCALES") return person.is_local;
    if (tag === "GRP:NO_LOCALES") return !person.is_local;
    if (tag === "GRP:PRODUCCION") return person.rol_gira === "produccion";
    if (tag === "GRP:SOLISTAS") return person.rol_gira === "solista";
    if (tag === "GRP:DIRECTORES") return person.rol_gira === "director";
    if (tag.startsWith("LOC:")) return String(person.id_localidad) === String(tag.split(":")[1]);
    if (tag.startsWith("FAM:")) return person.instrumentos?.familia === tag.split(":")[1];
    return false;
  });

  if (!isTechnicallyConvoked) return false;

  // 2. Cobertura Logística (Fechas)
  const eventDate = evt.fecha; 
  const coverageFrom = person.logistics?.comida_inicio?.date;
  const coverageTo = person.logistics?.comida_fin?.date;

  if (coverageFrom && coverageTo) {
    if (eventDate < coverageFrom || eventDate > coverageTo) return false;
  } else {
    if (!person.is_local) return false;
  }

  return true;
};

export default function MealsAttendance({ supabase, gira, roster: enrichedRoster }) {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResponse, setFilterResponse] = useState("ALL");
  const [updatingCell, setUpdatingCell] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "apellido", direction: "asc" });

  useEffect(() => {
    if (gira?.id) fetchMatrixData();
  }, [gira?.id]);

  const fetchMatrixData = async () => {
    setLoading(true);
    try {
      const { data: evts } = await supabase
        .from("eventos")
        .select(`*, tipos_evento (nombre, id_categoria)`)
        .eq("id_gira", gira.id)
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });

      const mealEvents = (evts || []).filter((e) => 
        e.tipos_evento?.id_categoria === 4 || [7, 8, 9, 10].includes(e.id_tipo_evento)
      );

      if (mealEvents.length > 0) {
        const { data: att } = await supabase
          .from("eventos_asistencia")
          .select("*")
          .in("id_evento", mealEvents.map((e) => e.id));

        const map = {};
        att?.forEach((a) => {
          map[`${a.id_evento}-${a.id_integrante}`] = { estado: a.estado, id: a.id };
        });
        setAttendanceMap(map);
      }
      setEvents(mealEvents);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const sortedRoster = useMemo(() => {
    if (!enrichedRoster) return [];
    let data = enrichedRoster.filter((p) => p.estado_gira !== "ausente");

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(p => 
        p.nombre.toLowerCase().includes(lower) || 
        p.apellido.toLowerCase().includes(lower) ||
        p.instrumentos?.instrumento?.toLowerCase().includes(lower)
      );
    }

    if (filterResponse !== "ALL") {
      data = data.filter(person => {
        let req = 0, ans = 0;
        events.forEach(evt => {
          if (checkEligibility(evt, person)) {
            req++;
            if (attendanceMap[`${evt.id}-${person.id}`]?.estado) ans++;
          }
        });
        if (req === 0) return false;
        if (filterResponse === "COMPLETE") return ans === req;
        if (filterResponse === "PARTIAL") return ans > 0 && ans < req;
        if (filterResponse === "NONE") return ans === 0;
        return true;
      });
    }

    return data.sort((a, b) => {
      const valA = `${a.apellido} ${a.nombre}`, valB = `${b.apellido} ${b.nombre}`;
      return sortConfig.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [enrichedRoster, searchTerm, sortConfig, filterResponse, events, attendanceMap]);

  const eventsByDate = useMemo(() => {
    const groups = {};
    events.forEach((e) => {
      if (!groups[e.fecha]) groups[e.fecha] = [];
      groups[e.fecha].push(e);
    });
    return groups;
  }, [events]);

  const handleAttendanceChange = async (eventId, memberId, currentStatus) => {
    let newStatus = currentStatus === "P" ? "A" : currentStatus === "A" ? null : "P";
    const key = `${eventId}-${memberId}`;
    setUpdatingCell(key);
    try {
      if (newStatus === null) {
        await supabase.from("eventos_asistencia").delete().match({ id_evento: eventId, id_integrante: memberId });
        setAttendanceMap(prev => { const c = {...prev}; delete c[key]; return c; });
      } else {
        const { data } = await supabase.from("eventos_asistencia").upsert({ id_evento: eventId, id_integrante: memberId, estado: newStatus }, { onConflict: "id_evento, id_integrante" }).select().single();
        setAttendanceMap(prev => ({ ...prev, [key]: { estado: data.estado, id: data.id } }));
      }
    } catch (e) { alert("Error"); }
    finally { setUpdatingCell(null); }
  };

  if (loading) return <div className="flex justify-center py-20"><IconLoader className="animate-spin text-indigo-500" size={32} /></div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
      <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Control de Asistencia</h2>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Sincronizado con Cobertura Logística</p>
        </div>
        <div className="flex gap-2">
            <select value={filterResponse} onChange={(e) => setFilterResponse(e.target.value)} className="text-xs border rounded px-2 py-1 font-bold outline-none">
                <option value="ALL">Todos</option>
                <option value="COMPLETE">Completos</option>
                <option value="PARTIAL">Parciales</option>
                <option value="NONE">Sin Respuesta</option>
            </select>
            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="text-xs border rounded px-2 py-1 outline-none w-32" />
        </div>
      </div>

      {/* CONTENEDOR DE SCROLL ÚNICO (Crucial para sticky) */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white border border-slate-300 rounded-lg shadow-sm">
          {/* border-separate y border-spacing-0 para que los bordes no desaparezcan al fijar filas */}
          <table className="w-full text-left border-separate border-spacing-0 text-sm table-fixed min-w-[800px]">
            <thead>
              {/* FILA 1: FECHAS (Fija arriba) */}
              <tr className="sticky top-0 z-40">
                <th className="sticky left-0 top-0 z-50 bg-slate-100 border-r border-b border-slate-300 w-[250px] p-2 text-[10px] text-slate-500 uppercase font-bold">
                  Integrante
                </th>
                {Object.keys(eventsByDate).sort().map((date) => (
                  <th key={date} colSpan={eventsByDate[date].length} className="text-center border-r border-b border-slate-300 px-2 py-1 bg-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                    {format(parseISO(date), "EEE d MMM", { locale: es })}
                  </th>
                ))}
              </tr>
              {/* FILA 2: SERVICIOS (Fija debajo de la fila 1) */}
              {/* Nota: top-[33px] es un estimado de la altura de la fila 1 */}
              <tr className="sticky top-[33px] z-40">
                <th className="sticky left-0 z-50 bg-slate-50 border-r border-b border-slate-300 p-2 text-[9px] font-bold text-slate-400 uppercase">
                  Dieta / Instrumento
                </th>
                {events.map((evt) => (
                  <th key={evt.id} className="border-r border-b border-slate-200 p-1 text-center bg-white w-[50px]">
                    <span className="block text-[8px] text-slate-400 font-mono">{evt.hora_inicio?.slice(0, 5)}</span>
                    <span className={`inline-flex w-5 h-5 items-center justify-center rounded-full text-[9px] font-bold border ${evt.id_tipo_evento === 8 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                      {evt.tipos_evento?.nombre?.charAt(0)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRoster.map((person) => (
                <tr key={person.id} className="hover:bg-slate-50 group h-12">
                  {/* COLUMNA FIJA (Izquierda) */}
                  <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-30 border-r border-slate-200 px-3">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold truncate text-slate-700 text-xs">{person.apellido}, {person.nombre}</span>
                      <span className="text-[9px] text-purple-500 font-medium truncate uppercase">{person.instrumentos?.instrumento || person.alimentacion || "Estándar"}</span>
                    </div>
                  </td>
                  {events.map((evt) => {
                    const isEligible = checkEligibility(evt, person);
                    const key = `${evt.id}-${person.id}`;
                    const status = attendanceMap[key]?.estado;

                    if (!isEligible) {
                      return <td key={evt.id} className="bg-slate-50/50 border-r border-slate-100 text-center"><span className="w-1 h-1 rounded-full bg-slate-200 inline-block"></span></td>;
                    }

                    return (
                      <td key={evt.id} className="p-1 border-r border-slate-100 text-center relative">
                        {updatingCell === key && <IconLoader className="absolute inset-0 m-auto animate-spin text-indigo-400" size={12} />}
                        <button
                          onClick={() => handleAttendanceChange(evt.id, person.id, status)}
                          className={`w-7 h-7 rounded-md flex items-center justify-center mx-auto border-2 transition-all ${status === "P" ? "bg-emerald-100 border-emerald-400 text-emerald-700" : status === "A" ? "bg-red-50 border-red-200 text-red-400" : "bg-white border-slate-200 text-slate-200 hover:border-slate-300"}`}
                        >
                          {status === "P" ? <IconCheck size={14} strokeWidth={3} /> : status === "A" ? <IconX size={14} strokeWidth={3} /> : <IconHelpCircle size={12} />}
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
    </div>
  );
}