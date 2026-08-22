import { fechaHoraDesdeConciertoEntrada } from "./entradasConciertoEvento";
import { entradaConciertoReservasAbiertas } from "./entradasReservasApertura";

export const ENTRADAS_MAX_POR_RESERVA = 4;

/** Fecha/hora del concierto como Date o null (desde evento OFRN si está disponible). */
export function conciertoDateFromReserva(reserva) {
  const raw = fechaHoraDesdeConciertoEntrada(reserva?.concierto);
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

export function labelVerQrReserva(reserva) {
  return entradasTodasIngresadas(reserva) ? "Ver QR (ya ingresadas)" : "Ver QR";
}

/** Estilo gris (sigue clickeable) cuando todas las plazas ya ingresaron. */
export function verQrReservaToneClass(isDark, reserva) {
  if (!entradasTodasIngresadas(reserva)) return null;
  return isDark
    ? "bg-slate-700 text-slate-400 hover:bg-slate-700 border border-slate-600 shadow-none"
    : "bg-slate-300 text-slate-600 hover:bg-slate-300 border border-slate-300 shadow-none";
}

export function entradasTodasPendientes(reserva) {
  const entradas = reserva?.entradas || [];
  if (!entradas.length) return true;
  return entradas.every((e) => String(e.estado_ingreso || "pendiente") === "pendiente");
}

/** Máximo al que se puede subir: tope 4 y plazas que quedan en el concierto. */
export function maxCantidadEditable(reserva, plazasLibres) {
  const actual = Math.max(1, Number(reserva?.cantidad_solicitada) || 1);
  if (plazasLibres == null || Number.isNaN(Number(plazasLibres))) {
    return ENTRADAS_MAX_POR_RESERVA;
  }
  const libres = Math.max(0, Number(plazasLibres));
  return Math.min(ENTRADAS_MAX_POR_RESERVA, actual + libres);
}

export function puedeCambiarCantidadReserva(reserva, { nowMs = Date.now(), concierto } = {}) {
  if (!reserva || isReservaCancelada(reserva) || isReservaHistorica(reserva, nowMs)) return false;
  if (!entradasTodasPendientes(reserva)) return false;
  const c = concierto || reserva.concierto;
  if (c && !entradaConciertoReservasAbiertas(c)) return false;
  return true;
}

export function labelCantidadEntradas(n) {
  const qty = Number(n) || 0;
  return `${qty} entrada${qty === 1 ? "" : "s"}`;
}

export function mensajeAvisoCambioCantidadQr() {
  return (
    "Al confirmar se van a generar códigos QR nuevos: el de la reserva y el de cada entrada.\n\n" +
    "Si ya imprimiste o guardaste el PDF, ese archivo queda desactualizado y no va a servir para ingresar. Solo tenés que volver a descargar el PDF con los códigos nuevos."
  );
}
