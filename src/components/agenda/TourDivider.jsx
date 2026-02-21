import React from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { IconDrive, IconArrowRight } from "../ui/Icons";

/**
 * Divisor de gira en la agenda: muestra tipo, zona, fechas y enlace a Drive / Ver Gira.
 */
export default React.memo(function TourDivider({ gira, onViewChange }) {
  const fechaDesde = gira.fecha_desde
    ? format(parseISO(gira.fecha_desde), "d MMM", { locale: es })
    : "";
  const fechaHasta = gira.fecha_hasta
    ? format(parseISO(gira.fecha_hasta), "d MMM", { locale: es })
    : "";

  let bgClass = "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-900";
  let borderClass = "border-fuchsia-500";

  if (gira.tipo === "Sinfónico") {
    bgClass = "bg-indigo-50 border-indigo-200 text-indigo-900";
    borderClass = "border-indigo-500";
  } else if (gira.tipo === "Ensamble") {
    bgClass = "bg-emerald-50 border-emerald-200 text-emerald-900";
    borderClass = "border-emerald-500";
  } else if (gira.tipo === "Jazz Band") {
    bgClass = "bg-amber-50 border-amber-200 text-amber-900";
    borderClass = "border-amber-500";
  }

  return (
    <div
      className={`border-l-4 ${borderClass} px-4 py-2 mt-4 mb-2 flex items-center gap-3 group animate-in fade-in rounded-r-md ${bgClass} overflow-hidden shadow-sm`}
    >
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-bold uppercase tracking-wider text-xs">
          {gira.tipo}
        </span>
        {gira.zona && (
          <span className="hidden sm:inline border border-current px-1.5 rounded text-[10px] opacity-70">
            {gira.zona}
          </span>
        )}
        {gira.estado === "Borrador" && (
          <span className="bg-slate-200 text-slate-600 px-1.5 rounded text-[10px] uppercase font-bold">
            Borrador
          </span>
        )}
        {gira.estado === "Pausada" && (
          <span className="bg-amber-200 text-amber-800 px-1.5 rounded text-[10px] uppercase font-bold">
            Pausada
          </span>
        )}
      </div>
      <span className="opacity-30">|</span>
      <div className="font-bold truncate text-sm sm:text-base flex items-center gap-2 min-w-0">
        <span className="whitespace-nowrap">{gira.mes_letra}</span>
        <span className="opacity-50">|</span>
        <span className="truncate">{gira.nomenclador}</span>
      </div>
      {fechaDesde && (
        <span className="hidden md:flex items-center font-normal opacity-70 text-xs whitespace-nowrap ml-auto md:ml-2">
          <span className="hidden lg:inline mr-1"></span> {fechaDesde} -{" "}
          {fechaHasta}
        </span>
      )}
      <div className="flex-1"></div>
      <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
        {gira.google_drive_folder_id && (
          <button
            onClick={() =>
              window.open(
                `https://drive.google.com/drive/folders/${gira.google_drive_folder_id}`,
                "_blank",
              )
            }
            className="p-1.5 bg-white/60 hover:bg-white text-current rounded transition-colors shadow-sm"
            title="Carpeta de Drive"
          >
            <IconDrive size={16} />
          </button>
        )}
        {onViewChange && (
          <button
            onClick={() => onViewChange("AGENDA", gira.id)}
            className="flex items-center gap-1 px-3 py-1 bg-white/60 hover:bg-white text-current rounded text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
          >
            Ver Gira <IconArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
});
