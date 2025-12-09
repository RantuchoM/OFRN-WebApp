import React, { useState, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isWithinInterval,
  differenceInCalendarDays,
  isBefore,
  isAfter,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  IconChevronLeft,
  IconChevronRight,
  IconMapPin,
  IconX,
  IconLoader,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";

export default function MusicianCalendar({ supabase }) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });

    try {
      const userRole = user?.rol_sistema || "";
      const isPersonal =
        userRole === "consulta_personal" || userRole === "personal";
      let myEnsembles = new Set();
      let myFamily = null;

      if (isPersonal) {
        const { data: me } = await supabase
          .from("integrantes")
          .select(
            "*, instrumentos(familia), integrantes_ensambles(id_ensamble)"
          )
          .eq("id", user.id)
          .single();
        if (me) {
          myFamily = me.instrumentos?.familia;
          me.integrantes_ensambles?.forEach((ie) =>
            myEnsembles.add(ie.id_ensamble)
          );
        }
      }

      const { data: eventsData } = await supabase
        .from("eventos")
        .select(
          `id, fecha, hora_inicio, descripcion, tipos_evento (nombre, color), locaciones (nombre), programas (id, google_drive_folder_id, giras_fuentes (tipo, valor_id), giras_integrantes (id_integrante, estado))`
        )
        .gte("fecha", start.toISOString())
        .lte("fecha", end.toISOString());
      const { data: toursData } = await supabase
        .from("programas")
        .select(
          `id, nombre_gira, fecha_desde, fecha_hasta, tipo, google_drive_folder_id, giras_fuentes (tipo, valor_id, valor_texto), giras_integrantes (id_integrante, estado)`
        )
        .lte("fecha_desde", end.toISOString())
        .gte("fecha_hasta", start.toISOString());

      const filterLogic = (item) => {
        if (!isPersonal) return true;
        const overrides =
          item.giras_integrantes || item.programas?.giras_integrantes || [];
        const sources =
          item.giras_fuentes || item.programas?.giras_fuentes || [];
        const myOverride = overrides.find((o) => o.id_integrante === user.id);
        if (myOverride && myOverride.estado === "ausente") return false;
        if (myOverride) return true;
        return sources.some(
          (s) =>
            (s.tipo === "ENSAMBLE" && myEnsembles.has(s.valor_id)) ||
            (s.tipo === "FAMILIA" && s.valor_texto === myFamily)
        );
      };

      setEvents((eventsData || []).filter((evt) => filterLogic(evt)));
      setTours((toursData || []).filter((tour) => filterLogic(tour)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- COLOR SYSTEM UNIFICADO ---
  const getEventColorClass = (typeName) => {
    const t = typeName?.toLowerCase() || "";
    if (t.includes("concierto") || t.includes("función"))
      return "bg-amber-400 text-amber-900 border-amber-500"; // Dorado
    if (t.includes("general"))
      return "bg-rose-400 text-rose-900 border-rose-500"; // Rojo
    if (t.includes("ensayo") || t.includes("parcial"))
      return "bg-slate-400 text-slate-900 border-slate-500"; // Gris
    if (t.includes("viaje") || t.includes("salida"))
      return "bg-blue-400 text-blue-900 border-blue-500"; // Azul
    return "bg-indigo-400 text-indigo-900 border-indigo-500"; // Default
  };

  const getTourColorClass = (typeName) => {
    const t = typeName?.toLowerCase() || "";
    if (t.includes("sinfónico")) return "bg-indigo-500";
    if (t.includes("ensamble")) return "bg-emerald-500";
    if (t.includes("camerata")) return "bg-fuchsia-500";
    return "bg-slate-500";
  };

  const renderWeeks = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const viewStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const viewEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const weeks = eachWeekOfInterval(
      { start: viewStart, end: viewEnd },
      { weekStartsOn: 1 }
    );

    return weeks.map((weekStart, weekIdx) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const activeToursInWeek = tours.filter((t) => {
        const tStart = parseISO(t.fecha_desde);
        const tEnd = parseISO(t.fecha_hasta);
        return (
          (isBefore(tStart, weekEnd) || isSameDay(tStart, weekEnd)) &&
          (isAfter(tEnd, weekStart) || isSameDay(tEnd, weekStart))
        );
      });

      return (
        <div
          key={weekIdx}
          className="flex flex-col border-b border-slate-200 last:border-0"
        >
          {/* CAPA 1: GIRAS (Barras Finas en Móvil, Barras con Texto en Desktop) */}
          <div className="relative h-2 md:h-7 bg-white w-full mt-1">
            {activeToursInWeek.map((tour) => {
              const tStart = parseISO(tour.fecha_desde);
              const tEnd = parseISO(tour.fecha_hasta);
              const effectiveStart = isBefore(tStart, weekStart)
                ? weekStart
                : tStart;
              const effectiveEnd = isAfter(tEnd, weekEnd) ? weekEnd : tEnd;
              const startDayIndex = differenceInCalendarDays(
                effectiveStart,
                weekStart
              );
              const durationDays =
                differenceInCalendarDays(effectiveEnd, effectiveStart) + 1;

              const isRealStart = isSameDay(tStart, effectiveStart);
              const isRealEnd = isSameDay(tEnd, effectiveEnd);

              // Bordes redondeados
              const roundedClass = `${isRealStart ? "rounded-l-full" : ""} ${
                isRealEnd ? "rounded-r-full" : ""
              }`;

              return (
                <div
                  key={tour.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(effectiveStart);
                  }}
                  className={`absolute top-0 bottom-0 z-10 cursor-pointer shadow-sm ${getTourColorClass(
                    tour.tipo
                  )} ${roundedClass}`}
                  style={{
                    left: `${startDayIndex * 14.2857}%`,
                    width: `${durationDays * 14.2857}%`,
                  }}
                >
                  {/* Texto SOLO visible en Desktop (md) */}
                  {(isRealStart || startDayIndex === 0) && (
                    <div className="hidden md:flex items-center gap-1 w-full px-1 h-full">
                      <span className="font-bold text-xs text-white truncate drop-shadow-md">
                        {tour.nombre_gira}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CAPA 2: DÍAS Y PUNTITOS */}
          <div className="grid grid-cols-7 min-h-[50px] md:min-h-[80px]">
            {eachDayOfInterval({ start: weekStart, end: weekEnd }).map(
              (day, dayIdx) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const dayEvents = events.filter((e) =>
                  isSameDay(parseISO(e.fecha), day)
                );

                // Ordenar eventos por hora
                dayEvents.sort((a, b) =>
                  a.hora_inicio.localeCompare(b.hora_inicio)
                );

                return (
                  <div
                    key={dayIdx}
                    onClick={() =>
                      (dayEvents.length > 0 || activeToursInWeek.length > 0) &&
                      setSelectedDate(day)
                    }
                    className={`p-1 border-r border-slate-100 last:border-r-0 relative flex flex-col items-center md:items-start cursor-pointer transition-colors hover:bg-slate-50 ${
                      !isCurrentMonth
                        ? "bg-slate-50/30 text-slate-300"
                        : "bg-white text-slate-700"
                    }`}
                  >
                    {/* Número de día */}
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                        isToday(day) ? "bg-indigo-600 text-white" : ""
                      }`}
                    >
                      {format(day, "d")}
                    </span>

                    {/* MÓVIL: PUNTITOS (Dots) */}
                    <div className="flex md:hidden flex-wrap justify-center gap-1 w-full px-1">
                      {dayEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            getEventColorClass(evt.tipos_evento?.nombre).split(
                              " "
                            )[0]
                          }`} // Solo toma la clase bg-...
                        />
                      ))}
                    </div>

                    {/* DESKTOP: TEXTO COMPLETO */}
                    <div className="hidden md:flex flex-col gap-1 w-full mt-1">
                      {dayEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className={`text-[9px] px-1 py-0.5 rounded border truncate ${getEventColorClass(
                            evt.tipos_evento?.nombre
                          ).replace("bg-", "bg-opacity-20 bg-")}`}
                        >
                          <span className="font-bold mr-1">
                            {evt.hora_inicio.slice(0, 5)}
                          </span>
                          {evt.tipos_evento?.nombre}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-white relative animate-in fade-in">
      {/* Header de Mes */}
      <div className="bg-white px-2 py-2 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="font-bold text-slate-700 capitalize flex items-center gap-2 text-sm md:text-base">
          {format(currentDate, "MMMM yyyy", { locale: es })}
          {loading && (
            <IconLoader className="animate-spin text-indigo-500" size={14} />
          )}
        </div>
        <div className="flex items-center bg-slate-50 rounded-lg border border-slate-100">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-200 rounded-l-lg text-slate-500"
          >
            <IconChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 text-xs font-bold border-x border-slate-200 hover:bg-slate-200 h-full text-slate-600"
          >
            Hoy
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-200 rounded-r-lg text-slate-500"
          >
            <IconChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Calendario Responsive */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full">
          {/* Header Días */}
          <div className="grid grid-cols-7 bg-slate-800 text-white sticky top-0 z-20">
            {/* CORRECCIÓN: Agregamos el segundo argumento (i) al map y lo usamos como key */}
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
              <div key={i} className="text-center text-xs font-bold py-2">
                {d}
              </div>
            ))}
          </div>
          {/* Semanas */}
          <div className="flex flex-col">{renderWeeks()}</div>
        </div>
      </div>

      {/* Modal de Detalle */}
      {selectedDate && (
        <div
          className="absolute inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-black text-slate-800 capitalize leading-none">
                  {format(selectedDate, "EEEE d", { locale: es })}
                </h3>
                <p className="text-slate-400 text-xs font-bold uppercase mt-1">
                  {format(selectedDate, "MMMM yyyy", { locale: es })}
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="bg-white p-1.5 rounded-full hover:bg-slate-200 text-slate-500 shadow-sm"
              >
                <IconX size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {/* Giras en Modal */}
              {tours
                .filter((t) =>
                  isWithinInterval(selectedDate, {
                    start: parseISO(t.fecha_desde),
                    end: parseISO(t.fecha_hasta),
                  })
                )
                .map((tour) => (
                  <div
                    key={tour.id}
                    className={`p-3 rounded-lg border-l-4 shadow-sm bg-slate-50 ${getTourColorClass(
                      tour.tipo
                    ).replace("bg-", "border-")}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                          Programa
                        </div>
                        <div className="font-bold text-base leading-tight text-slate-800">
                          {tour.nombre_gira}
                        </div>
                      </div>
                      {tour.google_drive_folder_id && (
                        <a
                          href={`https://drive.google.com/drive/folders/${tour.google_drive_folder_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-2 rounded-lg border border-indigo-200 shrink-0"
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z" />
                          </svg>
                          <span className="text-[9px] font-bold mt-1">
                            Partituras
                          </span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              {/* Eventos en Modal (Con Color de Borde) */}
              {events
                .filter((e) => isSameDay(parseISO(e.fecha), selectedDate))
                .map((evt) => {
                  const colorClass = getEventColorClass(
                    evt.tipos_evento?.nombre
                  );
                  // Extraer solo el color del borde para el estilo lateral
                  const borderClass =
                    colorClass
                      .split(" ")
                      .find((c) => c.startsWith("border-")) ||
                    "border-slate-200";

                  return (
                    <div
                      key={evt.id}
                      className={`flex gap-3 items-start bg-white p-2 rounded-lg border border-slate-100 shadow-sm border-l-4 ${borderClass}`}
                    >
                      <div className="w-12 text-center pt-1 shrink-0">
                        <div className="text-sm font-bold text-slate-700 bg-slate-100 rounded px-1">
                          {evt.hora_inicio?.slice(0, 5)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border inline-block mb-1 ${colorClass
                            .replace("text-", "bg-opacity-20 text-")
                            .replace("border-", "border-opacity-0 ")}`}
                        >
                          {evt.tipos_evento?.nombre}
                        </span>
                        <div className="text-sm text-slate-700 font-medium leading-tight">
                          {evt.descripcion || "Sin descripción"}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                          <IconMapPin size={12} /> {evt.locaciones?.nombre}
                        </div>
                        {evt.programas?.google_drive_folder_id && (
                          <a
                            href={`https://drive.google.com/drive/folders/${evt.programas.google_drive_folder_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 text-[10px] font-bold"
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z" />
                            </svg>{" "}
                            Partituras
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
