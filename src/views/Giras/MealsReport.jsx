import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  IconLoader,
  IconPrinter,
  IconClipboard,
  IconCopy,
  IconX,
  IconCheck,
} from "../../components/ui/Icons";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { handlePrintExport } from "../../utils/PrintWrapper";
import { isUserConvoked } from "../../utils/giraUtils";

const SERVICE_IDS = {
  7: "Desayuno",
  8: "Almuerzo",
  9: "Merienda",
  10: "Cena",
};

// IMPORTANTE: Ahora usamos la prop 'roster' que viene del LogisticsDashboard
export default function MealsReport({
  supabase,
  gira,
  roster: enrichedRoster,
  hospedajeExcluidosIds = [],
}) {
  const reportRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(
    new Set(["Desayuno", "Almuerzo", "Merienda", "Cena"]),
  );
  const [includePending, setIncludePending] = useState(false);

  useEffect(() => {
    if (gira?.id && enrichedRoster?.length > 0) {
      fetchReportData();
    }
  }, [gira?.id, enrichedRoster, includePending, hospedajeExcluidosIds]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // 1. Filtrar solo confirmados del roster que ya viene enriquecido
      const activeRoster = enrichedRoster.filter(
        (p) => p.estado_gira === "confirmado",
      );

      if (activeRoster.length === 0) {
        setReportData([]);
        return;
      }

      // 2. Obtener Eventos de Comida
      const { data: events } = await supabase
        .from("eventos")
        .select(
          "*, tipos_evento(nombre), locaciones(nombre, localidades(localidad)), convocados",
        )
        .eq("id_gira", gira.id)
        .eq("is_deleted", false)
        .in("id_tipo_evento", [7, 8, 9, 10])
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });

      if (!events || events.length === 0) {
        setReportData([]);
        return;
      }

      // 3. Obtener Asistencias manuales
      const eventIds = events.map((e) => e.id);
      const { data: attendance } = await supabase
        .from("eventos_asistencia")
        .select("id_evento, id_integrante, estado")
        .in("id_evento", eventIds);

      const attendanceMap = {};
      attendance?.forEach((a) => {
        attendanceMap[`${a.id_evento}-${a.id_integrante}`] = a.estado;
      });

      const isConvoked = (convocadosList, person) =>
        isUserConvoked(convocadosList, person, { hospedajeExcluidosIds });

      // 4. PROCESAMIENTO CRITICAL: Cruzar Fecha de Evento vs Cobertura Logística
      const processed = events.map((evt) => {
        const counts = { Total: 0 };
        const eventDate = evt.fecha; // 'YYYY-MM-DD'

        activeRoster.forEach((person) => {
          // A. ¿Está convocado técnicamente?
          if (!isConvoked(evt.convocados, person)) return;

          // B. ¿Tiene cobertura logística para esta fecha?
          // Usamos las fechas procesadas por useLogistics que ya están en person.logistics
          const coverageFrom = person.logistics?.comida_inicio?.date;
          const coverageTo = person.logistics?.comida_fin?.date;

          if (coverageFrom && eventDate < coverageFrom) return;
          if (coverageTo && eventDate > coverageTo) return;
          // Si no hay ningún hito de comida y no es local, queda fuera.
          if (!person.is_local && !coverageFrom && !coverageTo) return;

          // C. Validar asistencia manual (Presente / Ausente / Pendiente)
          const status = attendanceMap[`${evt.id}-${person.id}`];
          let shouldCount = false;

          if (status === "P") shouldCount = true;
          else if (status === "A") shouldCount = false;
          else if (includePending && !status) shouldCount = true;

          if (shouldCount) {
            const diet = person.alimentacion || "Estándar";
            counts[diet] = (counts[diet] || 0) + 1;
            counts.Total++;
          }
        });

        const locName = evt.locaciones?.nombre || "Sin ubicación";
        const locCity = evt.locaciones?.localidades?.localidad;
        return {
          id: evt.id,
          fecha: evt.fecha,
          hora: evt.hora_inicio?.slice(0, 5),
          servicio: SERVICE_IDS[evt.id_tipo_evento] || evt.tipos_evento?.nombre,
          lugar: locCity ? `${locName} - ${locCity}` : locName,
          counts,
        };
      });

      setReportData(processed);
    } catch (error) {
      console.error("Error MealsReport:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Memorias y Totales ---
  const allDiets = useMemo(() => {
    const diets = new Set();
    reportData.forEach((row) => {
      Object.keys(row.counts).forEach((k) => {
        if (k !== "Total") diets.add(k);
      });
    });
    return Array.from(diets).sort((a, b) =>
      a === "Estándar" ? -1 : b === "Estándar" ? 1 : a.localeCompare(b),
    );
  }, [reportData]);

  const filteredReport = reportData.filter((r) =>
    selectedTypes.has(r.servicio),
  );

  const activeRoster = useMemo(
    () => (enrichedRoster || []).filter((p) => p.estado_gira === "confirmado"),
    [enrichedRoster],
  );

  const nonLocalRoster = useMemo(
    () => activeRoster.filter((p) => !p.is_local),
    [activeRoster],
  );

  const textSummary = useMemo(() => {
    const formatDayHeader = (isoDate) => {
      const label = format(parseISO(isoDate), "EEEE dd/MM", { locale: es });
      return label.charAt(0).toUpperCase() + label.slice(1);
    };

    const formatDayRange = (isoDate) => format(parseISO(isoDate), "dd/MM");

    const serviceOrder = ["Desayuno", "Almuerzo", "Merienda", "Cena"];
    const servicePlural = {
      Desayuno: "desayunos",
      Almuerzo: "almuerzos",
      Merienda: "meriendas",
      Cena: "cenas",
    };

    const perDate = {};
    filteredReport.forEach((row) => {
      if (!perDate[row.fecha]) perDate[row.fecha] = {};
      if (!perDate[row.fecha][row.servicio]) {
        perDate[row.fecha][row.servicio] = { Total: 0 };
      }
      perDate[row.fecha][row.servicio].Total += row.counts.Total || 0;
      Object.entries(row.counts).forEach(([diet, value]) => {
        if (diet === "Total" || !value) return;
        perDate[row.fecha][row.servicio][diet] =
          (perDate[row.fecha][row.servicio][diet] || 0) + value;
      });
    });

    const orderedDates = Object.keys(perDate).sort((a, b) =>
      a.localeCompare(b),
    );

    const mealBlocks = orderedDates
      .map((dateKey) => {
        const dateRows = serviceOrder
          .map((service) => {
            const counts = perDate[dateKey][service];
            if (!counts || !counts.Total) return null;

            const diets = Object.entries(counts)
              .filter(([k, v]) => k !== "Total" && v > 0)
              .sort(([a], [b]) =>
                a === "Estándar"
                  ? -1
                  : b === "Estándar"
                    ? 1
                    : a.localeCompare(b),
              )
              .map(([diet, value]) => `${value} ${diet.toLowerCase()}`);

            const details = diets.length > 0 ? ` (${diets.join(", ")})` : "";
            return `${counts.Total} ${servicePlural[service]}${details}`;
          })
          .filter(Boolean);

        if (dateRows.length === 0) return null;
        return `${formatDayHeader(dateKey)}\n${dateRows.join("\n")}`;
      })
      .filter(Boolean);

    const isMinorPerson = (person) => {
      if (person?.menor === true || person?.menor === 1) return true;
      if (!person?.fecha_nacimiento) return false;
      const birth = new Date(person.fecha_nacimiento);
      if (Number.isNaN(birth.getTime())) return false;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
      ) {
        age -= 1;
      }
      return age < 18;
    };

    const groupedByStay = {};
    nonLocalRoster.forEach((person) => {
      const inDate =
        person?.logistics?.checkin?.date || person?.logistics?.comida_inicio?.date;
      const outDate =
        person?.logistics?.checkout?.date || person?.logistics?.comida_fin?.date;
      if (!inDate || !outDate) return;
      const key = `${inDate}|${outDate}`;
      if (!groupedByStay[key]) {
        groupedByStay[key] = {
          inDate,
          outDate,
          pax: 0,
          minors: 0,
          superiorRooms: new Set(),
        };
      }
      groupedByStay[key].pax += 1;
      if (isMinorPerson(person)) groupedByStay[key].minors += 1;

      const room = person?.habitacion;
      const roomType = String(room?.tipo || "").toLowerCase();
      const isSuperiorRoom = roomType === "plus" || roomType === "superior";
      if (isSuperiorRoom && room?.id) groupedByStay[key].superiorRooms.add(room.id);
    });

    const stayBlocks = Object.values(groupedByStay)
      .sort((a, b) => a.inDate.localeCompare(b.inDate))
      .map((group) => {
        const extras = [];
        if (group.minors > 0) {
          extras.push(`${group.minors} ${group.minors === 1 ? "menor" : "menores"}`);
        }
        const roomCount = group.superiorRooms.size;
        if (roomCount > 0) {
          extras.push(
            `${roomCount} ${roomCount === 1 ? "habitación superior" : "habitaciones superiores"}`,
          );
        }
        const extraText = extras.length > 0 ? ` (${extras.join(", ")})` : "";
        return (
          `Grupo ingreso ${formatDayRange(group.inDate)} al ${formatDayRange(group.outDate)}\n` +
          `${group.pax} pasajeros${extraText}`
        );
      });

    const blocks = [];
    blocks.push(`Cantidad de pax: ${nonLocalRoster.length} pax`);
    if (mealBlocks.length > 0) blocks.push(mealBlocks.join("\n\n"));
    blocks.push("Fecha de ingreso y egreso.");
    if (stayBlocks.length > 0) blocks.push(stayBlocks.join("\n\n"));
    return blocks.join("\n\n");
  }, [filteredReport, nonLocalRoster]);

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(textSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("No se pudo copiar el resumen de comidas:", error);
    }
  };

  const calculateGroupTotals = (services) => {
    const totals = { Total: 0 };
    allDiets.forEach((d) => (totals[d] = 0));
    filteredReport
      .filter((r) => services.includes(r.servicio))
      .forEach((row) => {
        totals.Total += row.counts.Total || 0;
        allDiets.forEach((d) => {
          totals[d] += row.counts[d] || 0;
        });
      });
    return totals;
  };

  const mainMealsTotal = calculateGroupTotals(["Almuerzo", "Cena"]);
  const lightMealsTotal = calculateGroupTotals(["Desayuno", "Merienda"]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <IconLoader className="animate-spin text-indigo-500" size={32} />
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in">
      {/* Barra de Filtros */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4 bg-slate-50 print:hidden">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-slate-800">
            Reporte de Comidas
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 gap-1">
              {["Desayuno", "Almuerzo", "Merienda", "Cena"].map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    setSelectedTypes((prev) => {
                      const next = new Set(prev);
                      next.has(type) ? next.delete(type) : next.add(type);
                      return next;
                    })
                  }
                  className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                    selectedTypes.has(type)
                      ? "bg-indigo-600 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {type.charAt(0)}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={includePending}
                onChange={() => setIncludePending(!includePending)}
              />
              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full relative"></div>
              Incluir Pendientes
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSummaryModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700"
          >
            <IconClipboard size={18} /> Texto pedido
          </button>
          <button
            onClick={() =>
              handlePrintExport(
                reportRef,
                `Reporte Comidas - ${gira.nombre_gira}`,
              )
            }
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700"
          >
            <IconPrinter size={18} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Contenido Reporte */}
      <div className="meals-report-export flex-1 overflow-auto p-8" ref={reportRef}>
        <div className="mb-6 hidden print:block">
          <h1 className="text-2xl font-bold">{gira.nombre_gira}</h1>
          <p className="text-slate-500">
            Reporte de Alimentación - Cantidades por Dieta
          </p>
        </div>

        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-800">
              <th className="py-2 px-1 w-0 whitespace-nowrap" title="Fecha">Fecha</th>
              <th className="py-2 px-1 w-0 whitespace-nowrap" title="Hora">Hora</th>
              <th className="py-2 px-1 w-0 whitespace-nowrap" title="Servicio">Serv</th>
              <th className="py-2 px-2 min-w-0">Lugar</th>
              <th className="py-2 px-1 w-0 text-right bg-slate-100 whitespace-nowrap" title="Total">Tota</th>
              {allDiets.map((d) => (
                <th
                  key={d}
                  className="py-2 px-1 w-0 text-right border-l text-xs uppercase text-slate-500 font-bold whitespace-nowrap"
                  title={d}
                >
                  {d.length <= 4 ? d : d.slice(0, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredReport.map((row) => (
              <tr key={row.id} className="break-inside-avoid">
                <td className="py-3 px-2 font-medium">
                  {format(parseISO(row.fecha), "EEE dd/MM", { locale: es })}
                </td>
                <td className="py-3 px-2 text-slate-500">{row.hora}</td>
                <td className="py-3 px-2">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      row.servicio === "Almuerzo"
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : row.servicio === "Cena"
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    {row.servicio}
                  </span>
                </td>
                <td className="py-3 px-2 text-slate-600">{row.lugar}</td>
                <td className="py-3 px-2 text-right font-black text-lg bg-slate-50">
                  {row.counts.Total}
                </td>
                {allDiets.map((d) => (
                  <td
                    key={d}
                    className="py-3 px-2 text-right border-l font-mono"
                  >
                    {row.counts[d] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-4 border-slate-300 bg-slate-50">
            <tr>
              <td
                colSpan={4}
                className="py-3 px-4 text-right font-bold uppercase"
              >
                Total Almuerzos + Cenas
              </td>
              <td className="py-3 px-2 text-right font-black text-lg border-l">
                {mainMealsTotal.Total}
              </td>
              {allDiets.map((d) => (
                <td key={d} className="py-3 px-2 text-right border-l font-bold">
                  {mainMealsTotal[d] || 0}
                </td>
              ))}
            </tr>
            <tr>
              <td
                colSpan={4}
                className="py-3 px-4 text-right font-bold uppercase"
              >
                Total Desayunos + Meriendas
              </td>
              <td className="py-3 px-2 text-right font-black text-lg border-l">
                {lightMealsTotal.Total}
              </td>
              {allDiets.map((d) => (
                <td key={d} className="py-3 px-2 text-right border-l font-bold">
                  {lightMealsTotal[d] || 0}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {showSummaryModal && (
        <div
          className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
          onClick={() => setShowSummaryModal(false)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                Texto para enviar a alimentación
              </h3>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
                title="Cerrar"
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="p-4 overflow-auto">
              <textarea
                readOnly
                value={textSummary}
                className="w-full min-h-[360px] border border-slate-300 rounded-lg p-3 text-sm font-mono text-slate-700 resize-y bg-slate-50"
              />
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cerrar
              </button>
              <button
                onClick={handleCopySummary}
                className={`px-3 py-1.5 rounded text-xs font-bold text-white flex items-center gap-1 ${
                  copied ? "bg-emerald-600" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                {copied ? "Copiado" : "Copiar texto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
