/** Fecha/hora del concierto como Date o null. */
export function conciertoDateFromReserva(reserva) {
  const raw = reserva?.concierto?.fecha_hora;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isReservaHistorica(reserva, nowMs = Date.now()) {
  const d = conciertoDateFromReserva(reserva);
  if (!d) return false;
  return d.getTime() < nowMs;
}

export function isReservaCancelada(reserva) {
  return String(reserva?.estado || "").toLowerCase() !== "activa";
}

export function isReservaActivaFutura(reserva, nowMs = Date.now()) {
  if (isReservaCancelada(reserva)) return false;
  const d = conciertoDateFromReserva(reserva);
  if (!d) return false;
  return d.getTime() >= nowMs;
}

/** "Faltan 2 días, 5 horas, 12 minutos, 34 segundos" */
export function formatEntradasCountdown(targetIso, nowMs = Date.now()) {
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return null;
  const ms = target - nowMs;
  if (ms <= 0) return null;

  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hrs = Math.floor((totalSec % 86400) / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} día${days === 1 ? "" : "s"}`);
  parts.push(`${hrs} hora${hrs === 1 ? "" : "s"}`);
  parts.push(`${min} minuto${min === 1 ? "" : "s"}`);
  parts.push(`${sec} segundo${sec === 1 ? "" : "s"}`);
  return `Faltan ${parts.join(", ")}`;
}

export function splitMisReservas(reservas, nowMs = Date.now()) {
  const proximas = [];
  const historicas = [];
  for (const r of reservas || []) {
    if (isReservaHistorica(r, nowMs)) historicas.push(r);
    else proximas.push(r);
  }
  const byFecha = (a, b) => {
    const ta = conciertoDateFromReserva(a)?.getTime() ?? 0;
    const tb = conciertoDateFromReserva(b)?.getTime() ?? 0;
    return ta - tb;
  };
  proximas.sort(byFecha);
  historicas.sort((a, b) => (conciertoDateFromReserva(b)?.getTime() ?? 0) - (conciertoDateFromReserva(a)?.getTime() ?? 0));
  return { proximas, historicas };
}

export function entradasIngresadasCount(reserva) {
  return (reserva?.entradas || []).filter((x) => x.estado_ingreso === "ingresada").length;
}

export function entradasTodasIngresadas(reserva) {
  const total = Number(reserva?.cantidad_solicitada) || 0;
  if (!total) return false;
  return entradasIngresadasCount(reserva) >= total;
}
