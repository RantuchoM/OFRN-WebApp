import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import SectionStatusControl from "../../components/giras/SectionStatusControl";
import {
  IconClock,
  IconCheck,
  IconArrowRight,
  IconUsers,
  IconAlertCircle,
  IconBed,
  IconBus,
  IconUtensils,
  IconMusic,
  IconMegaphone,
  IconCalculator,
  IconSettings,
  IconLayers,
  IconFileText,
  IconMap,
  IconCalendar,
} from "../../components/ui/Icons";

// --- CONFIGURACIÓN ESTRUCTURAL ---
const TOUR_SECTIONS = [
  {
    id: "artistic",
    label: "Artística",
    colorClass: "text-purple-600 border-purple-100",
    items: [
      {
        label: "Repertorio",
        view: "REPERTOIRE",
        subTab: null,
        icon: IconMusic,
        statusKey: "REPERTOIRE",
      },
      {
        label: "Seating",
        view: "REPERTOIRE",
        subTab: "seating",
        icon: IconLayers,
        statusKey: "SEATING",
      },
      {
        label: "Mis Partes",
        view: "REPERTOIRE",
        subTab: "my_parts",
        icon: IconFileText,
        statusKey: null,
      },
    ],
  },
  {
    id: "logistics",
    label: "Logística",
    colorClass: "text-orange-600 border-orange-100",
    items: [
      {
        label: "Rooming",
        view: "LOGISTICS",
        subTab: "rooming",
        icon: IconBed,
        statusKey: "ROOMING",
      },
      {
        label: "Transporte",
        view: "LOGISTICS",
        subTab: "transporte",
        icon: IconBus,
        statusKey: "TRANSPORTE",
      },
      {
        label: "Viáticos",
        view: "LOGISTICS",
        subTab: "viaticos",
        icon: IconCalculator,
        statusKey: "VIATICOS",
      },
      {
        label: "Comidas",
        view: "LOGISTICS",
        subTab: "meals",
        icon: IconUtensils,
        statusKey: "MEALS",
      },
      {
        label: "Reglas Gral.",
        view: "LOGISTICS",
        subTab: "coverage",
        icon: IconMap,
        statusKey: "LOGISTICA_GRAL",
      },
    ],
  },
  {
    id: "staff",
    label: "Gestión",
    colorClass: "text-blue-600 border-blue-100",
    items: [
      {
        label: "Staff / Nómina",
        view: "ROSTER",
        subTab: null,
        icon: IconUsers,
        statusKey: "ROSTER",
        checkVacancies: true,
      },
      {
        label: "Agenda",
        view: "AGENDA",
        subTab: null,
        icon: IconCalendar,
        statusKey: "AGENDA",
      },
      {
        label: "Difusión",
        view: "DIFUSION",
        subTab: null,
        icon: IconMegaphone,
        statusKey: "DIFUSION",
      },
    ],
  },
  {
    id: "admin",
    label: "Config",
    colorClass: "text-slate-500 border-slate-100",
    items: [
      {
        label: "Edición",
        view: "EDICION",
        subTab: null,
        icon: IconSettings,
        statusKey: null,
      },
    ],
  },
];

// --- LOGICA DE COLOR SEGUN TIPO ---
const getTypeColor = (tipo) => {
  switch (tipo) {
    case "Sinfónico":
      return "border-l-indigo-500 bg-indigo-50/30";
    case "Camerata Filarmónica":
      return "border-l-purple-500 bg-purple-50/30";
    case "Ensamble":
      return "border-l-emerald-500 bg-emerald-50/30";
    case "Jazz Band":
      return "border-l-amber-500 bg-amber-50/30";
    default:
      return "border-l-slate-400 bg-white";
  }
};

const InteractiveSectionItem = ({
  item,
  gira,
  go,
  supabase,
  userId,
  onStatusChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const status = item.statusKey ? gira.statusMap[item.statusKey] : null;
  const ItemIcon = item.icon;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Handle update from SectionStatusControl
  const handleUpdate = (newStatus) => {
    if (onStatusChange && item.statusKey) {
      onStatusChange(gira.id, item.statusKey, newStatus);
    }
  };

  const renderBadge = () => {
    if (item.checkVacancies && gira.vacantesCount > 0) {
      return (
        <span className="flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 animate-pulse whitespace-nowrap">
          <IconAlertCircle size={10} /> {gira.vacantesCount} Vacantes
        </span>
      );
    }
    if (!item.statusKey) return null;

    let colorClass =
      "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100";
    let icon = <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />;
    let text = "Pendiente";

    if (status === "IN_PROGRESS") {
      colorClass =
        "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
      icon = <IconClock size={10} />;
      text = "En curso";
    } else if (status === "COMPLETED") {
      colorClass =
        "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
      icon = <IconCheck size={10} />;
      text = "OK";
    }

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${colorClass}`}
      >
        {icon}
        <span>{text}</span>
      </button>
    );
  };

  return (
    <div className="relative group/item">
      <div
        onClick={() => go(item.view, item.subTab)}
        className="w-full text-left flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0 mr-2">
          <ItemIcon
            size={14}
            className="text-slate-400 group-hover/item:text-indigo-500 transition-colors shrink-0"
          />
          <span className="text-xs font-medium text-slate-600 group-hover/item:text-slate-900 truncate">
            {item.label}
          </span>
        </div>
        <div className="shrink-0 relative z-10">{renderBadge()}</div>
      </div>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-xl border border-slate-200 p-2 min-w-[200px] animate-in fade-in zoom-in-95 origin-top-right"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Estado: {item.label}
          </div>
          <SectionStatusControl
            supabase={supabase}
            giraId={gira.id}
            sectionKey={item.statusKey}
            sectionLabel={item.label}
            currentUserId={userId}
            onUpdate={handleUpdate} // <-- Callback para refrescar UI
          />
        </div>
      )}
    </div>
  );
};

export default function DashboardTourCard({
  gira,
  onViewChange,
  supabase,
  onStatusChange,
}) {
  const { user } = useAuth();

  const go = (view, subTab) => {
    onViewChange("GIRAS", gira.id, view, subTab);
  };

  // --- CÁLCULO DE PROGRESO ---
  const progressStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let inProgress = 0;

    TOUR_SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        if (item.statusKey) {
          total++;
          const st = gira.statusMap[item.statusKey];
          if (st === "COMPLETED") completed++;
          else if (st === "IN_PROGRESS") inProgress++;
        }
      });
    });

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, inProgress, percentage };
  }, [gira.statusMap]);

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 w-full overflow-visible flex flex-col border-l-4 ${getTypeColor(
        gira.tipo
      )}`}
    >
      {/* --- HEADER --- */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-start gap-4">
        <div className="flex items-center gap-4 w-full">
          {/* Fecha */}
          <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-lg h-12 w-12 shadow-sm shrink-0">
            <span className="text-[10px] font-bold text-rose-600 uppercase">
              {new Date(gira.fecha_desde)
                .toLocaleString("es-ES", { month: "short" })
                .replace(".", "")}
            </span>
            <span className="text-lg font-bold text-slate-800 leading-none">
              {new Date(gira.fecha_desde).getDate()}
            </span>
          </div>

          {/* Info + Barra Progreso */}
          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-slate-800 text-lg truncate">
                    {`${gira.nomenclador} | ${gira.mes_letra}`}
                  </h3>
                  {gira.nomenclador && (
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                      {gira.zona}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium truncate mb-2">
                  {gira.tipo} • {gira.nombre_gira || ""}
                </p>
              </div>

              {/* Botón Desktop */}
              <button
                onClick={() => go("AGENDA")}
                className="hidden sm:flex shrink-0 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 bg-white px-3 py-1.5 rounded-full border border-indigo-100 hover:border-indigo-200 transition-all shadow-sm items-center gap-1"
              >
                Ver Agenda <IconArrowRight size={14} />
              </button>
            </div>

            {/* Barra de Progreso */}
            <div className="w-full max-w-md">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                <span>Progreso General - {progressStats.percentage}% ({progressStats.completed}/
                  {progressStats.total})</span>
                  
              </div>
              <div className="h-1.5 w-full bg-rose-300 rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${
                      (progressStats.completed / progressStats.total) * 100
                    }%`,
                  }}
                  className="bg-emerald-500 h-full transition-all duration-500"
                ></div>
                <div
                  style={{
                    width: `${
                      (progressStats.inProgress / progressStats.total) * 100
                    }%`,
                  }}
                  className="bg-amber-400 h-full transition-all duration-500"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- BODY: COLUMNAS DINÁMICAS --- */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {TOUR_SECTIONS.map((section) => (
          <div key={section.id} className="flex flex-col gap-2">
            <h4
              className={`text-[10px] font-bold uppercase tracking-wider mb-1 border-b pb-1 ${section.colorClass}`}
            >
              {section.label}
            </h4>
            <div className="space-y-1">
              {section.items.map((item, idx) => (
                <InteractiveSectionItem
                  key={`${section.id}-${idx}`}
                  item={item}
                  gira={gira}
                  go={go}
                  supabase={supabase}
                  userId={user?.id}
                  onStatusChange={onStatusChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
