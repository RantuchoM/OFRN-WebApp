import React, { useEffect, useMemo, useState } from "react";
import {
  IconSettingsWheel,
  IconHistory,
  IconMusicNote,
  IconGrid,
  IconCalendar,
  IconUsers,
  IconArrowLeft,
} from "../../components/ui/Icons";
import { VenuesManager } from "../../components/management/VenuesManager";
import SeatingReports from "./SeatingReports";
import InstrumentationAudit from "./InstrumentationAudit";
import AsistenciaMatrixReport from "../Giras/AsistenciaMatrixReport";
import ConciertosView from "../Giras/ConciertosView";
import AudienceView from "./AudienceView";
import ManagementSectionCard from "./ManagementSectionCard";

const DEFAULT_SECTIONS = [
  "venues",
  "seating",
  "instrumentation",
  "convocatorias",
  "conciertos",
  "audiencia",
];

const HOME_VIEW = "home";

const SECTION_ORDER = [
  "venues",
  "seating",
  "instrumentation",
  "convocatorias",
  "conciertos",
  "audiencia",
];

const SECTION_CONFIG = {
  venues: {
    title: "Espacios",
    subtitle: "Gestión de venues y estado operativo",
    description:
      "Administra estados de venue, seguimiento y control de espacios para conciertos.",
    icon: IconSettingsWheel,
    cardClasses:
      "border-indigo-100 hover:border-indigo-300 hover:shadow-md focus-visible:ring-indigo-300",
    iconClasses:
      "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
    titleClasses: "text-indigo-900 group-hover:text-indigo-700",
  },
  seating: {
    title: "Informes Seating",
    subtitle: "Historial y reportes por distribución",
    description:
      "Consulta comparativas de seating y reportes para analizar cambios entre versiones.",
    icon: IconHistory,
    cardClasses:
      "border-sky-100 hover:border-sky-300 hover:shadow-md focus-visible:ring-sky-300",
    iconClasses:
      "bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white",
    titleClasses: "text-sky-900 group-hover:text-sky-700",
  },
  instrumentation: {
    title: "Instrumentación",
    subtitle: "Auditoría técnica por programa",
    description:
      "Cruza instrumentación requerida vs convocados para detectar brechas rápidamente.",
    icon: IconMusicNote,
    cardClasses:
      "border-violet-100 hover:border-violet-300 hover:shadow-md focus-visible:ring-violet-300",
    iconClasses:
      "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white",
    titleClasses: "text-violet-900 group-hover:text-violet-700",
  },
  convocatorias: {
    title: "Convocatorias",
    subtitle: "Matriz de asistencia por programa",
    description:
      "Visualiza y exporta el estado de convocatorias con foco en seguimiento de asistencia.",
    icon: IconGrid,
    cardClasses:
      "border-amber-100 hover:border-amber-300 hover:shadow-md focus-visible:ring-amber-300",
    iconClasses:
      "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
    titleClasses: "text-amber-900 group-hover:text-amber-700",
  },
  conciertos: {
    title: "Conciertos",
    subtitle: "Programación y exportación consolidada",
    description:
      "Revisa calendario de conciertos con filtros dinámicos y herramientas de exportación.",
    icon: IconCalendar,
    cardClasses:
      "border-emerald-100 hover:border-emerald-300 hover:shadow-md focus-visible:ring-emerald-300",
    iconClasses:
      "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
    titleClasses: "text-emerald-900 group-hover:text-emerald-700",
  },
  audiencia: {
    title: "Audiencia",
    subtitle: "Carga y reporte de asistentes por concierto",
    description:
      "Registra audiencia por concierto y exporta reportes PDF con desglose y total filtrado.",
    icon: IconUsers,
    cardClasses:
      "border-rose-100 hover:border-rose-300 hover:shadow-md focus-visible:ring-rose-300",
    iconClasses:
      "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
    titleClasses: "text-rose-900 group-hover:text-rose-700",
  },
};

export default function ManagementView({ supabase, managementSections = DEFAULT_SECTIONS }) {
  const [activeTab, setActiveTab] = useState(HOME_VIEW);
  const enabledSections = useMemo(() => new Set(managementSections), [managementSections]);
  const availableSections = useMemo(
    () => SECTION_ORDER.filter((section) => enabledSections.has(section)),
    [enabledSections],
  );
  const activeConfig = SECTION_CONFIG[activeTab];
  const isHomeView = activeTab === HOME_VIEW;

  useEffect(() => {
    if (activeTab !== HOME_VIEW && !enabledSections.has(activeTab)) {
      setActiveTab(HOME_VIEW);
    }
  }, [activeTab, enabledSections]);

  const isFullscreenSection =
    activeTab === "convocatorias" ||
    activeTab === "conciertos" ||
    activeTab === "audiencia";

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Módulo de Gestión
          </h2>
          <p className="text-xs text-slate-500">
            {isHomeView
              ? "Selecciona el informe que deseas abrir. Las vistas se cargan bajo demanda."
              : activeConfig?.subtitle}
          </p>
        </div>
        {!isHomeView && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(HOME_VIEW)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:text-slate-800 hover:border-slate-300"
            >
              <IconArrowLeft size={14} />
              <span>Menú de informes</span>
            </button>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
              {enabledSections.has("venues") && (
                <button
                  type="button"
                  onClick={() => setActiveTab("venues")}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
                    activeTab === "venues"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <IconSettingsWheel size={14} />
                  <span>Espacios</span>
                </button>
              )}
              {enabledSections.has("seating") && (
                <button
                  type="button"
                  onClick={() => setActiveTab("seating")}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
                    activeTab === "seating"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <IconHistory size={14} />
                  <span>Informes Seating</span>
                </button>
              )}
              {enabledSections.has("instrumentation") && (
                <button
                  type="button"
                  onClick={() => setActiveTab("instrumentation")}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
                    activeTab === "instrumentation"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <IconMusicNote size={14} />
                  <span>Instrumentación</span>
                </button>
              )}
              {enabledSections.has("convocatorias") && (
                <button
                  type="button"
                  onClick={() => setActiveTab("convocatorias")}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
                    activeTab === "convocatorias"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <IconGrid size={14} />
                  <span>Convocatorias</span>
                </button>
              )}
              {enabledSections.has("conciertos") && (
                <button
                  type="button"
                  onClick={() => setActiveTab("conciertos")}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
                    activeTab === "conciertos"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <IconCalendar size={14} />
                  <span>Conciertos</span>
                </button>
              )}
              {enabledSections.has("audiencia") && (
                <button
                  type="button"
                  onClick={() => setActiveTab("audiencia")}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
                    activeTab === "audiencia"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <IconUsers size={14} />
                  <span>Audiencia</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        className={
          isHomeView
            ? "flex-1 overflow-y-auto p-5"
            : isFullscreenSection
            ? "flex min-h-0 flex-1 flex-col overflow-hidden p-4"
            : "flex-1 overflow-y-auto p-4"
        }
      >
        {isHomeView && (
          <div className="mx-auto w-full max-w-5xl space-y-4">
            <p className="text-sm text-slate-500">
              Selecciona una sección para abrir su informe. El sistema solo carga datos al entrar
              en cada módulo.
            </p>
            {availableSections.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {availableSections.map((sectionKey) => {
                  const sectionConfig = SECTION_CONFIG[sectionKey];
                  return (
                    <ManagementSectionCard
                      key={sectionKey}
                      title={sectionConfig.title}
                      subtitle={sectionConfig.subtitle}
                      description={sectionConfig.description}
                      icon={sectionConfig.icon}
                      cardClasses={sectionConfig.cardClasses}
                      iconClasses={sectionConfig.iconClasses}
                      titleClasses={sectionConfig.titleClasses}
                      onClick={() => setActiveTab(sectionKey)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                No hay secciones de Gestión habilitadas para tu perfil.
              </div>
            )}
          </div>
        )}
        {activeTab === "venues" && enabledSections.has("venues") && (
          <VenuesManager supabase={supabase} />
        )}
        {activeTab === "seating" && enabledSections.has("seating") && (
          <SeatingReports supabase={supabase} />
        )}
        {activeTab === "instrumentation" && enabledSections.has("instrumentation") && (
          <InstrumentationAudit supabase={supabase} />
        )}
        {activeTab === "convocatorias" && enabledSections.has("convocatorias") && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            <AsistenciaMatrixReport supabase={supabase} />
          </div>
        )}
        {activeTab === "conciertos" && enabledSections.has("conciertos") && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <ConciertosView supabase={supabase} />
          </div>
        )}
        {activeTab === "audiencia" && enabledSections.has("audiencia") && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <AudienceView supabase={supabase} />
          </div>
        )}
      </div>
    </div>
  );
}

