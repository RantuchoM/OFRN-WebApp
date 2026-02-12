import React, { useState, useEffect, useMemo } from "react";
import {
  IconLoader,
  IconSearch,
  IconCheck,
  IconX,
  IconHelpCircle,
  IconClock,
  IconEdit,
  IconAlertTriangle,
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import { format, parseISO, isAfter, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// Helper: Verifica Convocatoria Técnica y Cobertura Logística
const checkEligibility = (evt, person) => {
  if (!evt || !person) return false;

  const convocadosList = evt.convocados || [];
  const isTechnicallyConvoked = convocadosList.some((tag) => {
    if (tag === "GRP:TUTTI") return true;
    if (tag === "GRP:LOCALES") return person.is_local;
    if (tag === "GRP:NO_LOCALES") return !person.is_local;
    if (tag === "GRP:PRODUCCION") return person.rol_gira === "produccion";
    if (tag === "GRP:SOLISTAS") return person.rol_gira === "solista";
    if (tag === "GRP:DIRECTORES") return person.rol_gira === "director";
    if (tag.startsWith("LOC:"))
      return String(person.id_localidad) === String(tag.split(":")[1]);
    if (tag.startsWith("FAM:"))
      return person.instrumentos?.familia === tag.split(":")[1];
    return false;
  });

  if (!isTechnicallyConvoked) return false;

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

export default function MealsAttendance({
  supabase,
  gira,
  roster: enrichedRoster,
}) {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResponse, setFilterResponse] = useState("ALL");
  const [updatingCell, setUpdatingCell] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "apellido",
    direction: "asc",
  });

  // ESTADOS PARA FECHA LÍMITE (Restaurados)
  const [deadline, setDeadline] = useState(null);
  const [deadlineTime, setDeadlineTime] = useState("12:00");
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [savingDeadline, setSavingDeadline] = useState(false);

  useEffect(() => {
    if (gira?.id) {
      fetchMatrixData();
      // Cargar fecha límite inicial
      if (gira.fecha_confirmacion_limite) {
        const dt = new Date(gira.fecha_confirmacion_limite);
        setDeadline(dt.toISOString().split("T")[0]);
        setDeadlineTime(dt.toTimeString().slice(0, 5));
      }
    }
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

      const mealEvents = (evts || []).filter(
        (e) =>
          e.tipos_evento?.id_categoria === 4 ||
          [7, 8, 9, 10].includes(e.id_tipo_evento),
      );

      if (mealEvents.length > 0) {
        const { data: att } = await supabase
          .from("eventos_asistencia")
          .select("*")
          .in(
            "id_evento",
            mealEvents.map((e) => e.id),
          );

        const map = {};
        att?.forEach((a) => {
          map[`${a.id_evento}-${a.id_integrante}`] = {
            estado: a.estado,
            id: a.id,
          };
        });
        setAttendanceMap(map);
      }
      setEvents(mealEvents);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDeadline = async () => {
    if (!deadline) return;
    setSavingDeadline(true);
    try {
      const isoString = new Date(
        `${deadline}T${deadlineTime}:00`,
      ).toISOString();
      const { error } = await supabase
        .from("programas")
        .update({ fecha_confirmacion_limite: isoString })
        .eq("id", gira.id);

      if (error) throw error;
      setIsEditingDeadline(false);
      // Aquí podrías disparar un toast de éxito si tuvieras el sistema montado
    } catch (err) {
      alert("Error al guardar fecha límite: " + err.message);
    } finally {
      setSavingDeadline(false);
    }
  };

  const sortedRoster = useMemo(() => {
    if (!enrichedRoster) return [];
    let data = enrichedRoster.filter((p) => p.estado_gira !== "ausente");

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(
        (p) =>
          p.nombre.toLowerCase().includes(lower) ||
          p.apellido.toLowerCase().includes(lower) ||
          p.instrumentos?.instrumento?.toLowerCase().includes(lower),
      );
    }

    if (filterResponse !== "ALL") {
      data = data.filter((person) => {
        let req = 0,
          ans = 0;
        events.forEach((evt) => {
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
      const valA = `${a.apellido} ${a.nombre}`,
        valB = `${b.apellido} ${b.nombre}`;
      return sortConfig.direction === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }, [
    enrichedRoster,
    searchTerm,
    sortConfig,
    filterResponse,
    events,
    attendanceMap,
  ]);

  const eventsByDate = useMemo(() => {
    const groups = {};
    events.forEach((e) => {
      if (!groups[e.fecha]) groups[e.fecha] = [];
      groups[e.fecha].push(e);
    });
    return groups;
  }, [events]);

  const handleAttendanceChange = async (eventId, memberId, currentStatus) => {
    let newStatus =
      currentStatus === "P" ? "A" : currentStatus === "A" ? null : "P";
    const key = `${eventId}-${memberId}`;
    setUpdatingCell(key);
    try {
      if (newStatus === null) {
        await supabase
          .from("eventos_asistencia")
          .delete()
          .match({ id_evento: eventId, id_integrante: memberId });
        setAttendanceMap((prev) => {
          const c = { ...prev };
          delete c[key];
          return c;
        });
      } else {
        const { data } = await supabase
          .from("eventos_asistencia")
          .upsert(
            { id_evento: eventId, id_integrante: memberId, estado: newStatus },
            { onConflict: "id_evento, id_integrante" },
          )
          .select()
          .single();
        setAttendanceMap((prev) => ({
          ...prev,
          [key]: { estado: data.estado, id: data.id },
        }));
      }
    } catch (e) {
      alert("Error");
    } finally {
      setUpdatingCell(null);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <IconLoader className="animate-spin text-indigo-500" size={32} />
      </div>
    );

  const isExpired =
    deadline && isAfter(new Date(), new Date(`${deadline}T${deadlineTime}:00`));

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
      {/* HEADER PRINCIPAL */}
      <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-start shrink-0 gap-4">
        {/* Lado Izquierdo: Título y Configuración de Deadline */}
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Control de Asistencia
            </h2>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
              Sincronizado con Cobertura Logística
            </p>
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-full ${isExpired ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}
              >
                <IconClock size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Cierre de Confirmación
                </span>
                {isEditingDeadline ? (
                  <div className="flex items-center gap-2 mt-1">
                    <DateInput
                      value={deadline}
                      onChange={setDeadline}
                      className="h-7 text-xs w-32 bg-white border-slate-300 focus:border-indigo-500"
                    />
                    <TimeInput
                      value={deadlineTime}
                      onChange={setDeadlineTime}
                      className="h-7 text-xs w-20 bg-white border-slate-300 focus:border-indigo-500"
                    />
                    <button
                      onClick={handleSaveDeadline}
                      disabled={savingDeadline}
                      className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {savingDeadline ? (
                        <IconLoader className="animate-spin" size={14} />
                      ) : (
                        <IconCheck size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => setIsEditingDeadline(false)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 group cursor-pointer"
                    onClick={() => setIsEditingDeadline(true)}
                  >
                    <span
                      className={`text-sm font-bold ${isExpired ? "text-red-600" : "text-slate-700"}`}
                    >
                      {deadline ? (
                        <>
                          {format(parseISO(deadline), "d 'de' MMMM", {
                            locale: es,
                          })}{" "}
                          • {deadlineTime} hs
                          <span className="text-[10px] font-normal text-slate-400 ml-2 normal-case">
                            (
                            {isExpired
                              ? `Cerró hace ${formatDistanceToNow(new Date(`${deadline}T${deadlineTime}`), { locale: es })}`
                              : `Cierra en ${formatDistanceToNow(new Date(`${deadline}T${deadlineTime}`), { locale: es })}`}
                            )
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">
                          Sin fecha límite definida
                        </span>
                      )}
                    </span>
                    <IconEdit
                      size={12}
                      className="text-slate-300 group-hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100"
                    />
                  </div>
                )}
              </div>
            </div>
            {isExpired && !isEditingDeadline && (
              <div className="border-l border-slate-200 pl-3 ml-1 flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">
                <IconAlertTriangle size={14} /> <span>CERRADO</span>
              </div>
            )}
          </div>

          {/* PANEL DE DEADLINE (RESTAURADO) */}
        </div>

        {/* Lado Derecho: Filtros de Tabla */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <select
              value={filterResponse}
              onChange={(e) => setFilterResponse(e.target.value)}
              className="text-xs border rounded px-2 py-1 font-bold outline-none bg-white hover:border-slate-400 transition-colors cursor-pointer"
            >
              <option value="ALL">Todos los Integrantes</option>
              <option value="COMPLETE">✅ Completos</option>
              <option value="PARTIAL">⚠️ Parciales</option>
              <option value="NONE">❌ Sin Respuesta</option>
            </select>
            <div className="relative">
              <IconSearch
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                type="text"
                placeholder="Buscar músico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs border rounded pl-8 pr-2 py-1 outline-none w-48 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>
          <div className="text-[10px] text-slate-400 text-right">
            Mostrando <b>{sortedRoster.length}</b> integrantes
          </div>
        </div>
      </div>

      {/* CONTENEDOR DE SCROLL ÚNICO (Crucial para sticky) */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white border border-slate-300 rounded-lg shadow-sm">
          {/* border-separate y border-spacing-0 para que los bordes no desaparezcan al fijar filas */}
          <table className="w-full text-left border-separate border-spacing-0 text-sm table-fixed min-w-[800px]">
            <thead>
              {/* FILA 1: FECHAS (Fija arriba) */}
              <tr className="sticky top-0 z-40 shadow-sm">
                <th className="sticky left-0 top-0 z-50 bg-slate-100 border-r border-b border-slate-300 w-[250px] p-2 text-[10px] text-slate-500 uppercase font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Integrante
                </th>
                {Object.keys(eventsByDate)
                  .sort()
                  .map((date) => (
                    <th
                      key={date}
                      colSpan={eventsByDate[date].length}
                      className="text-center border-r border-b border-slate-300 px-2 py-1 bg-slate-200 text-[10px] font-bold text-slate-600 uppercase"
                    >
                      {format(parseISO(date), "EEE d MMM", { locale: es })}
                    </th>
                  ))}
              </tr>
              {/* FILA 2: SERVICIOS (Fija debajo de la fila 1) */}
              <tr className="sticky top-[33px] z-40 shadow-sm">
                <th className="sticky left-0 z-50 bg-slate-50 border-r border-b border-slate-300 p-2 text-[9px] font-bold text-slate-400 uppercase shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Dieta / Instrumento
                </th>
                {events.map((evt) => (
                  <th
                    key={evt.id}
                    className="border-r border-b border-slate-200 p-1 text-center bg-white w-[50px]"
                  >
                    <span className="block text-[8px] text-slate-400 font-mono">
                      {evt.hora_inicio?.slice(0, 5)}
                    </span>
                    <span
                      className={`inline-flex w-5 h-5 items-center justify-center rounded-full text-[9px] font-bold border ${evt.id_tipo_evento === 8 ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-indigo-50 text-indigo-600 border-indigo-200"}`}
                    >
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
                  <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-30 border-r border-slate-200 px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold truncate text-slate-700 text-xs">
                        {person.apellido}, {person.nombre}
                      </span>
                      <span className="text-[9px] text-purple-500 font-medium truncate uppercase">
                        {person.instrumentos?.instrumento ||
                          person.alimentacion ||
                          "Estándar"}
                      </span>
                    </div>
                  </td>
                  {events.map((evt) => {
                    const isEligible = checkEligibility(evt, person);
                    const key = `${evt.id}-${person.id}`;
                    const status = attendanceMap[key]?.estado;

                    if (!isEligible) {
                      return (
                        <td
                          key={evt.id}
                          className="bg-slate-50/50 border-r border-slate-100 text-center"
                        >
                          <span className="w-1 h-1 rounded-full bg-slate-200 inline-block"></span>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={evt.id}
                        className="p-1 border-r border-slate-100 text-center relative"
                      >
                        {updatingCell === key && (
                          <IconLoader
                            className="absolute inset-0 m-auto animate-spin text-indigo-400"
                            size={12}
                          />
                        )}
                        <button
                          onClick={() =>
                            handleAttendanceChange(evt.id, person.id, status)
                          }
                          className={`w-7 h-7 rounded-md flex items-center justify-center mx-auto border-2 transition-all ${status === "P" ? "bg-emerald-100 border-emerald-400 text-emerald-700" : status === "A" ? "bg-red-50 border-red-200 text-red-400" : "bg-white border-slate-200 text-slate-200 hover:border-slate-300"}`}
                        >
                          {status === "P" ? (
                            <IconCheck size={14} strokeWidth={3} />
                          ) : status === "A" ? (
                            <IconX size={14} strokeWidth={3} />
                          ) : (
                            <IconHelpCircle size={12} />
                          )}
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
