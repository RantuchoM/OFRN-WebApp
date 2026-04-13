import React, { useState, useEffect, useMemo, useRef } from "react";
import { IconLoader, IconPrinter } from "../../components/ui/Icons";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { handlePrintExport } from "../../utils/PrintWrapper";

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
}) {
  const reportRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState(
    new Set(["Desayuno", "Almuerzo", "Merienda", "Cena"]),
  );
  const [includePending, setIncludePending] = useState(false);

  useEffect(() => {
    if (gira?.id && enrichedRoster?.length > 0) {
      fetchReportData();
    }
  }, [gira?.id, enrichedRoster, includePending]);

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

      // Helper para convocatoria técnica
      const isConvoked = (convocadosList, person) => {
        if (!convocadosList || convocadosList.length === 0) return false;
        return convocadosList.some((tag) => {
          if (tag === "GRP:TUTTI") return true;
          if (tag === "GRP:LOCALES") return person.is_local;
          if (tag === "GRP:NO_LOCALES") return !person.is_local;
          if (tag === "GRP:PRODUCCION") {
            // Lista de roles que "comen" con el grupo de Producción
            const rolesProduccion = [
              "produccion",
              "chofer",
              "acompañante",
              "staff",
              "mus_prod",
              "técnico",
              "iluminacion",
            ];

            // Verificamos si el rol de la persona está en esa lista
            return rolesProduccion.includes(person.rol_gira);
          }
          if (tag === "GRP:SOLISTAS") return person.rol_gira === "solista";
          if (tag === "GRP:DIRECTORES") return person.rol_gira === "director";
          if (tag.startsWith("LOC:"))
            return person.id_localidad === String(tag.split(":")[1]);
          if (tag.startsWith("FAM:"))
            return person.instrumentos?.familia === tag.split(":")[1];
          return false;
        });
      };

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
              <th className="py-2 px-1 w-0 whitespace-nowrap" title="Fecha">Fcha</th>
              <th className="py-2 px-1 w-0 whitespace-nowrap" title="Hora">Hora</th>
              <th className="py-2 px-1 w-0 whitespace-nowrap" title="Servicio">Serv</th>
              <th className="py-2 px-2 min-w-0">Lugr</th>
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
    </div>
  );
}
