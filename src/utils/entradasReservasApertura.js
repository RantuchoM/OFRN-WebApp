import { fechaHoraDesdeConciertoEntrada } from "./entradasConciertoEvento";
import { ENTRADAS_CONCIERTO_TIMEZONE } from "./entradasReservaCopy";

/**
 * Apertura guardada o, si es NULL, jueves 19:00 AR de la semana anterior al concierto.
 * @param {{ apertura_reservas_at?: string|null, evento?: { fecha?: string, hora_inicio?: string } }} concierto
 * @returns {Date|null}
 */
export function aperturaReservasEfectivaAt(concierto) {
  const raw = concierto?.apertura_reservas_at;
  if (raw) {
    const t = new Date(raw);
    if (!Number.isNaN(t.getTime())) return t;
  }
  const fh = fechaHoraDesdeConciertoEntrada(concierto);
  if (!fh) return null;
  return defaultAperturaReservasAtFromConcierto(fh, { clampPast: false });
}

/** Reservas abiertas: flag admin + fecha de apertura (efectiva) ya alcanzada. */
export function entradaConciertoReservasAbiertas(concierto) {
  if (!concierto || concierto.activo === false) return false;
  if (concierto.reservas_habilitadas === false) return false;
  const apertura = aperturaReservasEfectivaAt(concierto);
  if (!apertura) return true;
  return apertura.getTime() <= Date.now();
}

/** Hoy aún no llegó la fecha/hora de apertura (efectiva). */
export function conciertoAntesDeAperturaReservas(concierto) {
  if (!concierto || concierto.reservas_habilitadas === false) return false;
  const apertura = aperturaReservasEfectivaAt(concierto);
  if (!apertura) return false;
  return apertura.getTime() > Date.now();
}

/** Aún no se pueden sacar entradas (admin: solo stats de recordatorios programados). */
export function entradaConciertoAperturaPendiente(concierto) {
  if (!concierto || concierto.activo === false) return false;
  return !entradaConciertoReservasAbiertas(concierto);
}

/** Vista admin reducida: antes de apertura o reservas deshabilitadas. */
export function conciertoAdminSoloRecordatoriosProgramados(concierto) {
  if (!concierto || concierto.activo === false) return false;
  if (concierto.reservas_habilitadas === false) return true;
  return conciertoAntesDeAperturaReservas(concierto);
}

/**
 * Misma regla que `entrada_concierto_acepta_recordatorio` en SQL.
 * @param {Date} [finVentanaCatalogo] fin inclusive de la ventana de 14 días del catálogo
 */
export function conciertoAceptaRecordatorioApertura(concierto, finVentanaCatalogo) {
  if (!concierto || concierto.activo === false) return false;
  const ms = fechaHoraConciertoMs(concierto);
  if (ms == null || ms <= Date.now()) return false;
  if (!entradaConciertoReservasAbiertas(concierto)) return true;
  if (!finVentanaCatalogo) return false;
  const finMs = finVentanaCatalogo instanceof Date ? finVentanaCatalogo.getTime() : new Date(finVentanaCatalogo).getTime();
  if (Number.isNaN(finMs)) return false;
  return ms > finMs;
}

/** Al editar en admin, aplica apertura y flags del formulario sobre el concierto del listado. */
export function conciertoParaReglasEntradas(concierto, form, { editing = false } = {}) {
  if (!concierto || !editing || !form) return concierto;
  const aperturaRaw = form.apertura_reservas_at;
  let apertura_reservas_at = concierto.apertura_reservas_at;
  if (aperturaRaw !== undefined) {
    if (!String(aperturaRaw || "").trim()) {
      apertura_reservas_at = null;
    } else {
      const d = new Date(aperturaRaw);
      apertura_reservas_at = Number.isNaN(d.getTime()) ? concierto.apertura_reservas_at : d.toISOString();
    }
  }
  return {
    ...concierto,
    reservas_habilitadas: form.reservas_habilitadas ?? concierto.reservas_habilitadas,
    activo: form.activo ?? concierto.activo,
    apertura_reservas_at,
  };
}

export const ADMIN_CONCIERTO_VISTAS = [
  { id: "actuales", label: "Actuales" },
  { id: "futuros", label: "Futuros" },
  { id: "historicos", label: "Históricos" },
];

function fechaHoraConciertoMs(concierto) {
  const fh = fechaHoraDesdeConciertoEntrada(concierto);
  if (!fh) return null;
  const t = new Date(fh);
  return Number.isNaN(t.getTime()) ? null : t.getTime();
}

function ymdInTimezone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    y: Number(parts.find((p) => p.type === "year").value),
    m: Number(parts.find((p) => p.type === "month").value),
    d: Number(parts.find((p) => p.type === "day").value),
  };
}

function isoWeekdayInTimezone(y, m, d, timeZone) {
  const noon = wallClockToDate(y, m, d, 12, 0, timeZone);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noon);
  const map = { Sun: 7, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd] ?? 1;
}

function addCalendarDays(y, m, d, delta) {
  const t = new Date(Date.UTC(y, m - 1, d + delta, 12, 0, 0));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function wallClockPartsInTimezone(instant, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  return {
    y: Number(parts.find((p) => p.type === "year").value),
    m: Number(parts.find((p) => p.type === "month").value),
    d: Number(parts.find((p) => p.type === "day").value),
    h: Number(parts.find((p) => p.type === "hour").value),
    min: Number(parts.find((p) => p.type === "minute").value),
  };
}

function wallClockToDate(y, m, d, hour, minute, timeZone) {
  let lo = Date.UTC(y, m - 1, d - 1, hour, minute, 0) - 8 * 3600 * 1000;
  let hi = Date.UTC(y, m - 1, d + 1, hour, minute, 0) + 8 * 3600 * 1000;
  for (let i = 0; i < 40; i += 1) {
    const mid = Math.floor((lo + hi) / 2);
    const got = wallClockPartsInTimezone(new Date(mid), timeZone);
    const cmp =
      got.y !== y ? got.y - y
      : got.m !== m ? got.m - m
      : got.d !== d ? got.d - d
      : got.h !== hour ? got.h - hour
      : got.min - minute;
    if (cmp === 0) return new Date(mid);
    if (cmp < 0) lo = mid + 1;
    else hi = mid - 1;
  }
  return new Date(Math.floor((lo + hi) / 2));
}

/** Inicio del día de hoy a las 00:00 (hora Argentina). */
export function inicioDelDiaArgentinaMs(ahora = new Date()) {
  const tz = ENTRADAS_CONCIERTO_TIMEZONE;
  const { y, m, d } = ymdInTimezone(ahora, tz);
  return wallClockToDate(y, m, d, 0, 0, tz).getTime();
}

/** Función antes de las 00:00 de hoy (AR), no por hora del reloj. */
export function conciertoAdminEsHistorico(concierto, inicioDiaMs = inicioDelDiaArgentinaMs()) {
  const ms = fechaHoraConciertoMs(concierto);
  return ms != null && ms < inicioDiaMs;
}

/**
 * Filtro admin (excluyente): Históricos = antes de hoy 00:00 AR; Futuros = hoy o después y reservas cerradas;
 * Actuales = hoy o después y reservas abiertas.
 */
export function conciertoCumpleFiltroAdminVista(concierto, vista, inicioDiaMs = inicioDelDiaArgentinaMs()) {
  const ms = fechaHoraConciertoMs(concierto);
  if (ms == null) return vista === "futuros";

  if (vista === "historicos") {
    return ms < inicioDiaMs;
  }

  if (ms < inicioDiaMs) return false;

  if (vista === "futuros") {
    return !entradaConciertoReservasAbiertas(concierto);
  }

  if (vista === "actuales") {
    return entradaConciertoReservasAbiertas(concierto);
  }

  return true;
}

/**
 * Jueves de la semana anterior al concierto, 19:00 (hora Argentina).
 * @param {string|Date} fechaHora
 * @param {{ clampPast?: boolean }} [opts] — en formulario admin: si ya pasó, usar ahora
 */
export function defaultAperturaReservasAtFromConcierto(fechaHora, { clampPast = true } = {}) {
  const base = fechaHora instanceof Date ? fechaHora : new Date(fechaHora);
  if (Number.isNaN(base.getTime())) return null;

  const tz = ENTRADAS_CONCIERTO_TIMEZONE;
  const { y, m, d } = ymdInTimezone(base, tz);
  const isoDow = isoWeekdayInTimezone(y, m, d, tz);
  const monday = addCalendarDays(y, m, d, -(isoDow - 1));
  const juevesSemanaAnterior = addCalendarDays(monday.y, monday.m, monday.d, -4);
  let apertura = wallClockToDate(juevesSemanaAnterior.y, juevesSemanaAnterior.m, juevesSemanaAnterior.d, 19, 0, tz);
  if (clampPast) {
    const now = new Date();
    if (apertura.getTime() < now.getTime()) apertura = now;
  }
  return apertura;
}
