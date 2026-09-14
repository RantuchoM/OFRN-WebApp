/**
 * Corte «desde ahora» de la agenda FIMBA (hora local del dispositivo).
 *
 * Visible por defecto (incluye en curso): el corte (`hora_fin`, o `hora_inicio`
 * si no hay fin) no es estrictamente anterior a now.
 * - Futuro: start >= now.
 * - En curso: ya empezó y aún no terminó (`hora_fin` >= now).
 * - Overnight: solo si `hora_fin` < `hora_inicio` (cruza medianoche). Iguales
 *   (`14:00`–`14:00`) son un punto en ese instante, no 24 h.
 * - Sin `hora_fin` (o sin duración): punto en `hora_inicio` (se oculta apenas start < now).
 * `fecha` es calendario `yyyy-MM-dd` anclado con `new Date(y, m, d, …)` local
 * del dispositivo (ART en teléfonos Argentina); no se parsea como UTC.
 * Filas pending de create se tratan siempre como actuales.
 * Independiente de filtros (artista, origen, grupos, URL). No usa Realtime.
 */

import { getNowLocal } from "./dates";

function parseHms(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3] || 0);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || !Number.isFinite(ss)) {
    return null;
  }
  return { hh, mm, ss };
}

function localDateAt(fecha, time) {
  const day = String(fecha || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const y = Number(day.slice(0, 4));
  const mo = Number(day.slice(5, 7));
  const d = Number(day.slice(8, 10));
  const t = time || { hh: 0, mm: 0, ss: 0 };
  const dt = new Date(y, mo - 1, d, t.hh, t.mm, t.ss, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function isPendingCreateRow(ev) {
  return (
    Boolean(ev?._pendingCreate) || String(ev?.id || "").startsWith("pending:")
  );
}

export function fimbaAgendaEventStartDate(ev) {
  if (!ev) return null;
  return localDateAt(
    ev.fecha,
    parseHms(ev.hora_inicio) || { hh: 0, mm: 0, ss: 0 },
  );
}

export function fimbaAgendaEventEndDate(ev) {
  if (!ev) return null;
  const t = parseHms(ev.hora_fin);
  if (!t) return null;
  const end = localDateAt(ev.fecha, t);
  if (!end) return null;
  const start = fimbaAgendaEventStartDate(ev);
  // Overnight only when fin is earlier than inicio (crosses midnight).
  // Equal times are zero-duration / point-in-time — not a 24h wrap.
  if (start && end.getTime() < start.getTime()) {
    end.setDate(end.getDate() + 1);
  }
  return end;
}

/**
 * ¿La fila debe verse en la vista por defecto (desde ahora)?
 * @param {object|null|undefined} ev
 * @param {Date} [now]
 */
export function isFimbaAgendaEventFromNow(ev, now = getNowLocal()) {
  if (!ev) return false;
  if (isPendingCreateRow(ev)) return true;
  const start = fimbaAgendaEventStartDate(ev);
  if (!start) return true;
  const nowDate = now instanceof Date ? now : getNowLocal();
  const nowMs = nowDate.getTime();
  const end = fimbaAgendaEventEndDate(ev);
  const cutoff = end || start;
  return cutoff.getTime() >= nowMs;
}

/**
 * Id de evento deep-link: `?evento=` / `?event=` / `?id_evento=` o hash `#123` / `#evento-123`.
 * @param {{ get?: (k: string) => string|null }|null|undefined} searchParams
 * @param {string} [hash]
 */
export function parseFimbaAgendaFocusEventId(searchParams, hash = "") {
  const q =
    searchParams?.get?.("evento") ||
    searchParams?.get?.("event") ||
    searchParams?.get?.("id_evento");
  const nq = Number(q);
  if (Number.isFinite(nq) && nq > 0) return nq;
  const h = String(hash || "")
    .replace(/^#/, "")
    .trim();
  if (!h) return null;
  const m = h.match(/^(?:evento-?|event-?|e-)?(\d+)$/i);
  if (!m) return null;
  const nh = Number(m[1]);
  return Number.isFinite(nh) && nh > 0 ? nh : null;
}

/**
 * @param {object[]} events
 * @param {{ now?: Date, showPast?: boolean }} [opts]
 */
export function splitFimbaAgendaFromNow(events, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : getNowLocal();
  const showPast = Boolean(opts.showPast);
  const list = Array.isArray(events) ? events : [];
  const pastEvents = [];
  const fromNowEvents = [];
  for (const ev of list) {
    if (isFimbaAgendaEventFromNow(ev, now)) fromNowEvents.push(ev);
    else pastEvents.push(ev);
  }
  return {
    pastEvents,
    fromNowEvents,
    visibleEvents: showPast ? list : fromNowEvents,
    pastCount: pastEvents.length,
  };
}
