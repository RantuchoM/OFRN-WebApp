import { normEstado } from "./viajeReservaParadasUtils";

/** Clases para badges (pill) alineadas con MisReservas / panel operativo */
export const scrnEstadoBadgeClasses = {
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  aceptada: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rechazada: "bg-rose-100 text-rose-800 border-rose-200",
  cancelada: "bg-slate-200 text-slate-800 border-slate-300",
};

export function scrnEstadoBadgeClass(estado) {
  const e = normEstado(estado);
  return (
    scrnEstadoBadgeClasses[e] || "bg-slate-100 text-slate-700 border-slate-200"
  );
}

/**
 * Clases adicionales para <select> de estado: borde y fondo según el valor
 * (complementar con clases base de tamaño/tipografía).
 */
export function scrnEstadoSelectClassName(estado) {
  const e = normEstado(estado);
  const base = "font-semibold border-2";
  switch (e) {
    case "pendiente":
      return `${base} border-amber-300 bg-amber-50/90 text-amber-950 ring-0`;
    case "aceptada":
      return `${base} border-emerald-300 bg-emerald-50/90 text-emerald-950 ring-0`;
    case "rechazada":
      return `${base} border-rose-300 bg-rose-50/90 text-rose-950 ring-0`;
    case "cancelada":
      return `${base} border-slate-400 bg-slate-100/90 text-slate-900 ring-0`;
    default:
      return `${base} border-slate-300 bg-white text-slate-800 ring-0`;
  }
}
