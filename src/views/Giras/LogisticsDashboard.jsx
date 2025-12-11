import React, { useState, useEffect } from "react";
import {
  IconTruck,
  IconUtensils,
  IconLoader,
  IconUsers,
  IconPrinter,
  IconBus,
} from "../../components/ui/Icons";
import LogisticsManager from "./LogisticsManager";
import MealsManager from "./MealsManager";
import MealsAttendance from "./MealsAttendance";
import MealsReport from "./MealsReport"; // <--- Importamos el reporte
import GirasTransportesManager from "./GirasTransportesManager"; // <--- IMPORTAR ESTO

export default function LogisticsDashboard({ supabase, gira, onBack }) {
  const [activeTab, setActiveTab] = useState("coverage"); // 'coverage' | 'meals' | 'attendance' | 'report'
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  useEffect(() => {
    if (gira?.id) fetchSharedRoster();
  }, [gira?.id]);

  const fetchSharedRoster = async () => {
    setLoadingRoster(true);
    try {
      const { data: tourLocs } = await supabase
        .from("giras_localidades")
        .select("id_localidad")
        .eq("id_gira", gira.id);

      const locIds = new Set(tourLocs?.map((l) => l.id_localidad) || []);

      // Traemos también la columna 'alimentacion' para el reporte
      const { data: members } = await supabase
        .from("integrantes")
        .select(
          `
                    id, nombre, apellido, id_localidad, alimentacion,
                    instrumentos(instrumento, familia), 
                    localidades(id, localidad, id_region)
                `
        )
        .order("apellido");

      const processedRoster = (members || []).map((m) => ({
        ...m,
        is_local: locIds.has(m.id_localidad),
        rol_gira: m.instrumentos?.familia?.includes("Prod")
          ? "produccion"
          : "musico",
      }));

      setRoster(processedRoster);
    } catch (error) {
      console.error("Error cargando roster:", error);
    } finally {
      setLoadingRoster(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
      {/* HEADER DEL DASHBOARD */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-4 py-3 flex flex-col gap-4 print:hidden">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-indigo-600 font-medium text-sm"
            >
              ← Volver
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {gira.nombre_gira || "Gestión de Gira"}
              </h2>
              <p className="text-xs text-slate-400">Logística Integral</p>
            </div>
          </div>
          {loadingRoster && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <IconLoader className="animate-spin" /> Cargando padrón...
            </div>
          )}
        </div>

        <div className="flex gap-6 text-sm font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab("coverage")}
            className={`pb-2 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "coverage"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconTruck size={16} /> Logística y Cobertura
          </button>
          <button
            onClick={() => setActiveTab("meals")}
            className={`pb-2 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "meals"
                ? "border-orange-600 text-orange-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconUtensils size={16} /> Agenda de Comidas
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`pb-2 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "attendance"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconUsers size={16} /> Control Asistencia
          </button>
          {/* NUEVA PESTAÑA DE REPORTES */}

          <button
            onClick={() => setActiveTab("report")}
            className={`pb-2 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "report"
                ? "border-slate-800 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconPrinter size={16} /> Reporte de Comidas
          </button>
          <button
            onClick={() => setActiveTab("transporte")}
            className={`pb-2 flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "report"
                ? "border-slate-800 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconBus size={16} /> Transporte
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "coverage" && (
          <LogisticsManager supabase={supabase} gira={gira} onBack={null} />
        )}
        {activeTab === "meals" && (
          <MealsManager supabase={supabase} gira={gira} roster={roster} />
        )}
        {activeTab === "attendance" && (
          <MealsAttendance supabase={supabase} gira={gira} roster={roster} />
        )}
        {activeTab === "report" && (
          <MealsReport supabase={supabase} gira={gira} roster={roster} />
        )}
        {activeTab === "transporte" && gira?.id && (
          <GirasTransportesManager supabase={supabase} giraId={gira.id} />
        )}
      </div>
    </div>
  );
}
