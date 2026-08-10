import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  IconSettingsWheel,
  IconHistory,
  IconMusicNote,
  IconGrid,
  IconCalendar,
  IconUsers,
  IconArrowLeft,
  IconMusic,
  IconClipboard,
  IconChevronDown,
  IconCheck,
} from "../../components/ui/Icons";
import { VenuesManager } from "../../components/management/VenuesManager";
import SeatingReports from "./SeatingReports";
import InstrumentationAudit from "./InstrumentationAudit";
import AsistenciaMatrixReport from "../Giras/AsistenciaMatrixReport";
import EnsayosPorProgramaReport from "../Giras/EnsayosPorProgramaReport";
import EnsayoCheckinAttendanceReport from "./EnsayoCheckinAttendanceReport";
import ConciertosView from "../Giras/ConciertosView";
import AudienceView from "./AudienceView";
import ServiciosCantidadReport from "./ServiciosCantidadReport";
import ManagementSectionCard from "./ManagementSectionCard";

const DEFAULT_SECTIONS = [
  "venues",
  "seating",
  "instrumentation",
  "convocatorias",
  "servicios",
  "ensayos",
  "asistencia_ensayos",
  "conciertos",
  "audiencia",
];

const HOME_VIEW = "home";

function parseManagementSection(pathname) {
  const match = pathname.match(/^\/management\/?(.*)$/);
  const segment = (match?.[1] || "").replace(/\/$/, "");
  return segment || HOME_VIEW;
}

function managementSectionPath(section) {
  return section === HOME_VIEW ? "/management" : `/management/${section}`;
}

const SECTION_ORDER = [
  "venues",
  "seating",
  "instrumentation",
  "convocatorias",
  "servicios",
  "ensayos",
  "asistencia_ensayos",
  "conciertos",
  "audiencia",
];

const SECTION_CONFIG = {
  venues: {
    title: "Espacios",
    tabLabel: "Espacios",
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
    tabLabel: "Informes Seating",
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
    tabLabel: "Instrumentación",
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
    tabLabel: "Convocatorias",
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
  servicios: {
    title: "Servicios",
    tabLabel: "Servicios",
    subtitle: "Cantidad de servicios por integrante",
    description:
      "Consolida ensayos de ensamble, ensayos de gira y conciertos (con didácticos) y abona reemplazos/licencias.",
    icon: IconClipboard,
    cardClasses:
      "border-orange-100 hover:border-orange-300 hover:shadow-md focus-visible:ring-orange-300",
    iconClasses:
      "bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white",
    titleClasses: "text-orange-900 group-hover:text-orange-700",
  },
  ensayos: {
    title: "Ensayos por programa",
    tabLabel: "Ensayos",
    subtitle: "Matriz de ensayos de ensamble",
    description:
      "Cruza programas y ensambles con cantidad de ensayos; exportá a Excel o PDF.",
    icon: IconMusic,
    cardClasses:
      "border-cyan-100 hover:border-cyan-300 hover:shadow-md focus-visible:ring-cyan-300",
    iconClasses:
      "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white",
    titleClasses: "text-cyan-900 group-hover:text-cyan-700",
  },
  asistencia_ensayos: {
    title: "Asistencia a ensayos",
    tabLabel: "Asist. ensayos",
    subtitle: "Check-in y reportes por ensamble",
    description:
      "Consultá llegadas, cargá asistencias justificadas o correcciones admin y exportá informes.",
    icon: IconUsers,
    cardClasses:
      "border-teal-100 hover:border-teal-300 hover:shadow-md focus-visible:ring-teal-300",
    iconClasses:
      "bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white",
    titleClasses: "text-teal-900 group-hover:text-teal-700",
  },
  conciertos: {
    title: "Conciertos",
    tabLabel: "Conciertos",
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
    tabLabel: "Audiencia",
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

/** Selector compacto de informe (reemplaza la fila de pestañas). */
function ManagementReportPicker({
  availableSections,
  activeTab,
  onSelect,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const activeConfig = SECTION_CONFIG[activeTab];
  const ActiveIcon = activeConfig?.icon;

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [activeTab]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-full max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-bold text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 sm:min-w-[13rem]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Elegir informe de Gestión"
      >
        {ActiveIcon && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
            <ActiveIcon size={14} aria-hidden />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">
          {activeConfig?.title || "Informe"}
        </span>
        <IconChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Informes de Gestión"
          className="absolute right-0 z-[50] mt-1 max-h-[min(20rem,70vh)] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {availableSections.map((sectionKey) => {
            const cfg = SECTION_CONFIG[sectionKey];
            const Icon = cfg.icon;
            const isActive = sectionKey === activeTab;
            return (
              <button
                key={sectionKey}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onSelect(sectionKey);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-2.5 px-2.5 py-2 text-left transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                    isActive
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon size={14} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold leading-tight">
                    {cfg.title}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-medium leading-snug text-slate-500">
                    {cfg.subtitle}
                  </span>
                </span>
                {isActive && (
                  <IconCheck
                    size={14}
                    className="mt-1 shrink-0 text-indigo-600"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ManagementView({
  supabase,
  managementSections = DEFAULT_SECTIONS,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const enabledSections = useMemo(
    () => new Set(managementSections),
    [managementSections],
  );
  const availableSections = useMemo(
    () => SECTION_ORDER.filter((section) => enabledSections.has(section)),
    [enabledSections],
  );

  const activeTab = useMemo(() => {
    const section = parseManagementSection(location.pathname);
    if (section === HOME_VIEW) return HOME_VIEW;
    return enabledSections.has(section) ? section : HOME_VIEW;
  }, [location.pathname, enabledSections]);

  const setActiveTab = useCallback(
    (tab) => {
      navigate(managementSectionPath(tab));
    },
    [navigate],
  );

  const activeConfig = SECTION_CONFIG[activeTab];
  const isHomeView = activeTab === HOME_VIEW;

  useEffect(() => {
    const section = parseManagementSection(location.pathname);
    if (section !== HOME_VIEW && !enabledSections.has(section)) {
      navigate("/management", { replace: true });
    }
  }, [location.pathname, enabledSections, navigate]);

  const isFullscreenSection =
    activeTab === "convocatorias" ||
    activeTab === "servicios" ||
    activeTab === "ensayos" ||
    activeTab === "asistencia_ensayos" ||
    activeTab === "conciertos" ||
    activeTab === "audiencia";

  const headerSubtitle = isHomeView
    ? "Selecciona el informe que deseas abrir. Las vistas se cargan bajo demanda."
    : activeConfig?.subtitle;

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-2.5 lg:py-3">
        {isHomeView ? (
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight text-slate-800">
              <span className="lg:hidden">Gestión</span>
              <span className="hidden lg:inline">Módulo de Gestión</span>
            </h2>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">
              {headerSubtitle}
            </p>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight text-slate-800">
                <span className="lg:hidden">Gestión</span>
                <span className="hidden lg:inline">Módulo de Gestión</span>
              </h2>
              <p className="mt-0.5 text-xs leading-snug text-slate-500">
                {headerSubtitle}
              </p>
            </div>
            <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab(HOME_VIEW)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800 sm:px-3"
                aria-label="Volver al menú de informes"
              >
                <IconArrowLeft size={14} aria-hidden />
                <span className="max-w-[6.5rem] truncate sm:max-w-none">
                  <span className="sm:hidden">Menú</span>
                  <span className="hidden sm:inline">Menú de informes</span>
                </span>
              </button>
              <ManagementReportPicker
                availableSections={availableSections}
                activeTab={activeTab}
                onSelect={setActiveTab}
              />
            </div>
          </div>
        )}
      </div>

      <div
        className={
          isHomeView
            ? "flex-1 overflow-y-auto p-5"
            : isFullscreenSection
              ? "flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-4"
              : "flex-1 overflow-y-auto p-4"
        }
      >
        {isHomeView && (
          <div className="mx-auto w-full max-w-5xl space-y-4">
            <p className="text-sm text-slate-500">
              Selecciona una sección para abrir su informe. El sistema solo carga
              datos al entrar en cada módulo.
            </p>
            {availableSections.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {availableSections.map((sectionKey) => {
                  const sectionConfig = SECTION_CONFIG[sectionKey];
                  return (
                    <ManagementSectionCard
                      key={sectionKey}
                      to={managementSectionPath(sectionKey)}
                      title={sectionConfig.title}
                      subtitle={sectionConfig.subtitle}
                      description={sectionConfig.description}
                      icon={sectionConfig.icon}
                      cardClasses={sectionConfig.cardClasses}
                      iconClasses={sectionConfig.iconClasses}
                      titleClasses={sectionConfig.titleClasses}
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
        {activeTab === "instrumentation" &&
          enabledSections.has("instrumentation") && (
            <InstrumentationAudit supabase={supabase} />
          )}
        {activeTab === "convocatorias" &&
          enabledSections.has("convocatorias") && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <AsistenciaMatrixReport supabase={supabase} />
            </div>
          )}
        {activeTab === "servicios" && enabledSections.has("servicios") && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <ServiciosCantidadReport supabase={supabase} />
          </div>
        )}
        {activeTab === "ensayos" && enabledSections.has("ensayos") && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            <EnsayosPorProgramaReport
              supabase={supabase}
              variant="management"
            />
          </div>
        )}
        {activeTab === "asistencia_ensayos" &&
          enabledSections.has("asistencia_ensayos") && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <EnsayoCheckinAttendanceReport supabase={supabase} />
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
