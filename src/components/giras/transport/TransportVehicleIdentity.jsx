import React from "react";
import { IconClock, IconFileText } from "../../ui/Icons";
import TransporteOficialBadge from "./TransporteOficialBadge";
import { isTransporteOficial } from "../../../utils/transporteOficial";

export function TransportCornerButton({ onClick, title, className = "", children }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={`absolute -top-1 -right-1 z-10 flex items-center justify-center w-4 h-4 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors ${className}`}
      title={title}
    >
      {children}
    </button>
  );
}

function VehicleDocCornerButton({ transport, onOpen }) {
  const hasDoc = transport.transportes?.documentacion;
  return (
    <TransportCornerButton
      onClick={() => onOpen(transport)}
      className={
        hasDoc
          ? "text-emerald-600 hover:text-emerald-700"
          : "text-amber-500 hover:text-amber-600 animate-pulse"
      }
      title={
        hasDoc
          ? "Editar documentación de vehículo"
          : "Cargar documentación de vehículo"
      }
    >
      <IconFileText size={10} />
    </TransportCornerButton>
  );
}

export default function TransportVehicleIdentity({
  patente,
  nombre,
  transport,
  onOpenDocs,
  scheduleBounds,
}) {
  return (
    <div className="relative shrink-0 w-full max-w-full overflow-visible">
      <div className="rounded border border-slate-200 overflow-hidden w-full bg-white/90">
        <div className="flex items-stretch min-w-0">
          <span className="bg-slate-800 text-white px-1.5 py-0.5 text-[9px] font-mono tracking-tighter text-center truncate min-h-[1.125rem] leading-tight w-[4.75rem] shrink-0">
            {patente || "—"}
          </span>
          <span
            className="inline-flex items-center justify-center gap-0.5 min-w-0 flex-1 px-1.5 py-0.5 border-l border-slate-200 bg-slate-100 text-[10px] font-medium text-slate-600 leading-none whitespace-nowrap min-h-[1.125rem] truncate text-center"
            title={nombre || "Bus"}
          >
            <span className="truncate min-w-0">{nombre || "Bus"}</span>
            <TransporteOficialBadge
              visible={isTransporteOficial(transport)}
              size={11}
            />
          </span>
        </div>
        <div
          className="flex items-center justify-center gap-1 px-1.5 py-0.5 border-t border-slate-200 bg-slate-50/80 text-[10px] font-medium text-slate-600 min-w-0 text-center"
          title={
            scheduleBounds
              ? `${scheduleBounds.stopCount} parada${scheduleBounds.stopCount === 1 ? "" : "s"}`
              : undefined
          }
        >
          <IconClock size={10} className="text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-700 tabular-nums truncate min-w-0 text-center">
            {scheduleBounds ? scheduleBounds.range : "—"}
          </span>
        </div>
      </div>
      {transport && onOpenDocs && (
        <VehicleDocCornerButton transport={transport} onOpen={onOpenDocs} />
      )}
    </div>
  );
}
