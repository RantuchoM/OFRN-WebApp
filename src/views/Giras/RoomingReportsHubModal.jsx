import React from "react";
import { createPortal } from "react-dom";
import {
  IconX,
  IconList,
  IconFileText,
  IconUsers,
  IconClipboard,
} from "../../components/ui/Icons";

const OPTIONS = [
  {
    id: "pedido",
    title: "Pedido Inicial",
    description:
      "Pedido de plazas por fechas, texto para hotelería y detalle de pasajeros.",
    icon: IconList,
    accent: "amber",
  },
  {
    id: "texto",
    title: "Texto pedido",
    description:
      "Texto listo para copiar y enviar a hotelería, con desglose por sexo.",
    icon: IconClipboard,
    accent: "emerald",
  },
  {
    id: "detalle",
    title: "Detalle de pasajeros",
    description:
      "Listado ordenado por check-in, con separadores por día de ingreso (sin habitaciones).",
    icon: IconUsers,
    accent: "slate",
  },
  {
    id: "rooming",
    title: "Reporte de habitaciones",
    description:
      "Distribución por hotel, tipos de habitación y lista de pasajeros asignados.",
    icon: IconFileText,
    accent: "indigo",
  },
];

const ACCENT = {
  amber: {
    border: "border-amber-200 hover:border-amber-400",
    bg: "hover:bg-amber-50",
    icon: "bg-amber-100 text-amber-700",
  },
  emerald: {
    border: "border-emerald-200 hover:border-emerald-400",
    bg: "hover:bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-700",
  },
  slate: {
    border: "border-slate-200 hover:border-slate-400",
    bg: "hover:bg-slate-50",
    icon: "bg-slate-200 text-slate-700",
  },
  indigo: {
    border: "border-indigo-200 hover:border-indigo-400",
    bg: "hover:bg-indigo-50",
    icon: "bg-indigo-100 text-indigo-700",
  },
};

/**
 * Hub de reportes de Rooming: elige Pedido Inicial (o sus vistas) / Reporte habitaciones.
 */
export default function RoomingReportsHubModal({ onClose, onSelect }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              Reportes de Rooming
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Elegí qué querés generar o imprimir
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700"
            title="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const colors = ACCENT[opt.accent] || ACCENT.slate;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect?.(opt.id)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors ${colors.border} ${colors.bg}`}
              >
                <span
                  className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colors.icon}`}
                >
                  <Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-800">
                    {opt.title}
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5 leading-snug">
                    {opt.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
