/** Estados de scrn_solicitudes_paquete.estado */
export function labelEstadoPaquete(estado) {
  const x = String(estado || "").toLowerCase();
  if (x === "aceptada") return "Aceptada";
  if (x === "rechazada") return "Rechazada";
  if (x === "cancelada") return "Cancelada";
  return "Pendiente";
}

export function badgeClassEstadoPaquete(estado) {
  const x = String(estado || "").toLowerCase();
  if (x === "aceptada") {
    return "text-emerald-900 bg-emerald-100 border border-emerald-200/90";
  }
  if (x === "rechazada") {
    return "text-rose-900 bg-rose-100 border border-rose-200/90";
  }
  if (x === "cancelada") {
    return "text-slate-800 bg-slate-200 border border-slate-300/90";
  }
  return "text-amber-900 bg-amber-100 border border-amber-200/90";
}
