/**
 * Corte «desde ahora» de Transportes FIMBA (paridad Agenda + fin = next stop).
 * Standalone (imports Vite sin extensión). Mirror de fimbaAgendaNow.js.
 *
 * Run: node scripts/verify-fimba-transport-from-now.mjs
 */

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

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

function fimbaAgendaEventStartDate(ev) {
  if (!ev) return null;
  return localDateAt(
    ev.fecha,
    parseHms(ev.hora_inicio) || { hh: 0, mm: 0, ss: 0 },
  );
}

function fimbaAgendaEventEndDate(ev) {
  if (!ev) return null;
  const t = parseHms(ev.hora_fin);
  if (!t) return null;
  const end = localDateAt(ev.fecha, t);
  if (!end) return null;
  const start = fimbaAgendaEventStartDate(ev);
  if (start && end.getTime() < start.getTime()) {
    end.setDate(end.getDate() + 1);
  }
  return end;
}

function nextCalendarDay(fecha) {
  const day = String(fecha || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const y = Number(day.slice(0, 4));
  const mo = Number(day.slice(5, 7));
  const d = Number(day.slice(8, 10));
  const dt = new Date(y, mo - 1, d + 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function fimbaTransportNextIsOngoingLeg(ev, nextEv) {
  if (!ev || !nextEv) return false;
  const a = String(ev.fecha || "").slice(0, 10);
  const b = String(nextEv.fecha || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) {
    return false;
  }
  if (a === b) return true;
  return nextCalendarDay(a) === b;
}

function resolveFimbaTransportFromNowEnd(ev, nextEv) {
  if (!ev) return null;
  if (ev.es_contexto_agenda) return fimbaAgendaEventEndDate(ev);
  if (nextEv && fimbaTransportNextIsOngoingLeg(ev, nextEv)) {
    const nextStart = fimbaAgendaEventStartDate(nextEv);
    if (nextStart) return nextStart;
  }
  return fimbaAgendaEventEndDate(ev);
}

function isFimbaAgendaEventFromNow(ev, now, getEndDate) {
  if (!ev) return false;
  if (isPendingCreateRow(ev)) return true;
  const start = fimbaAgendaEventStartDate(ev);
  if (!start) return true;
  const nowMs = now.getTime();
  const customEnd = typeof getEndDate === "function" ? getEndDate(ev) : null;
  const end = customEnd instanceof Date ? customEnd : fimbaAgendaEventEndDate(ev);
  const cutoff = end || start;
  return cutoff.getTime() >= nowMs;
}

function splitFimbaAgendaFromNow(events, opts = {}) {
  const now = opts.now;
  const showPast = Boolean(opts.showPast);
  const getEndDate = opts.getEndDate;
  const list = Array.isArray(events) ? events : [];
  const pastEvents = [];
  const fromNowEvents = [];
  for (const ev of list) {
    if (isFimbaAgendaEventFromNow(ev, now, getEndDate)) fromNowEvents.push(ev);
    else pastEvents.push(ev);
  }
  return {
    pastEvents,
    fromNowEvents,
    visibleEvents: showPast ? list : fromNowEvents,
    pastCount: pastEvents.length,
  };
}

function fimbaFromNowSectionDayKey(fecha, opts = {}) {
  const day = String(fecha || "").slice(0, 10);
  const todayKey = String(opts.todayKey || "").slice(0, 10);
  if (opts.showPast) return day;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayKey)) return day;
  return day < todayKey ? todayKey : day;
}

const now = new Date(2026, 8, 18, 11, 0, 0, 0);

const pastPoint = {
  id: 1,
  fecha: "2026-09-18",
  hora_inicio: "09:00",
  hora_fin: null,
};
const inTransit = {
  id: 2,
  fecha: "2026-09-18",
  hora_inicio: "10:00",
  hora_fin: null,
};
const nextStop = {
  id: 3,
  fecha: "2026-09-18",
  hora_inicio: "12:30",
  hora_fin: null,
};
const futureStop = {
  id: 4,
  fecha: "2026-09-18",
  hora_inicio: "15:00",
  hora_fin: null,
};
const overnightLeg = {
  id: 5,
  fecha: "2026-09-17",
  hora_inicio: "23:00",
  hora_fin: null,
};
const overnightNext = {
  id: 6,
  fecha: "2026-09-18",
  hora_inicio: "08:00",
  hora_fin: null,
};
const pending = {
  id: "pending:abc",
  _pendingCreate: true,
  fecha: "2026-09-17",
  hora_inicio: "08:00",
};
const contextPast = {
  id: 7,
  es_contexto_agenda: true,
  fecha: "2026-09-18",
  hora_inicio: "08:00",
  hora_fin: "09:30",
};
const contextLive = {
  id: 8,
  es_contexto_agenda: true,
  fecha: "2026-09-18",
  hora_inicio: "10:30",
  hora_fin: "11:30",
};

assert(
  !isFimbaAgendaEventFromNow(pastPoint, now),
  "parada sin next y start < now queda oculta (punto)",
);
assert(
  isFimbaAgendaEventFromNow(
    inTransit,
    now,
    (ev) => resolveFimbaTransportFromNowEnd(ev, nextStop),
  ),
  "trayecto en curso (next a las 12:30) sigue visible a las 11:00",
);
assert(
  !isFimbaAgendaEventFromNow(
    inTransit,
    new Date(2026, 8, 18, 13, 0, 0, 0),
    (ev) => resolveFimbaTransportFromNowEnd(ev, nextStop),
  ),
  "mismo trayecto se oculta después de la llegada (next)",
);
assert(isFimbaAgendaEventFromNow(futureStop, now), "parada futura visible");
assert(
  isFimbaAgendaEventFromNow(
    overnightLeg,
    now,
    (ev) => resolveFimbaTransportFromNowEnd(ev, overnightNext),
  ) === false,
  "tramo overnight 17/09 23:00 → 18/09 08:00 ya terminó a las 11:00",
);
assert(
  isFimbaAgendaEventFromNow(
    overnightLeg,
    new Date(2026, 8, 18, 7, 0, 0, 0),
    (ev) => resolveFimbaTransportFromNowEnd(ev, overnightNext),
  ),
  "tramo overnight sigue en curso a las 07:00",
);
assert(
  isFimbaAgendaEventFromNow(pending, now),
  "fila pending de create siempre visible",
);
assert(
  !isFimbaAgendaEventFromNow(
    contextPast,
    now,
    (ev) => resolveFimbaTransportFromNowEnd(ev, nextStop),
  ),
  "contexto agenda pasado usa hora_fin persistida, no next de transporte",
);
assert(
  isFimbaAgendaEventFromNow(
    contextLive,
    now,
    (ev) => resolveFimbaTransportFromNowEnd(ev, null),
  ),
  "contexto agenda en curso (hora_fin 11:30) visible",
);
assert(
  !isFimbaAgendaEventFromNow(
    inTransit,
    now,
    (ev) => resolveFimbaTransportFromNowEnd(ev, null),
  ),
  "pausa / sin next: punto en hora_inicio, se oculta tras largar",
);

const parkedUnload = {
  id: 10,
  fecha: "2026-09-13",
  hora_inicio: "16:00",
  hora_fin: null,
};
const parkedNextWeek = {
  id: 11,
  fecha: "2026-09-20",
  hora_inicio: "08:00",
  hora_fin: null,
};
assert(
  !isFimbaAgendaEventFromNow(
    parkedUnload,
    now,
    (ev) => resolveFimbaTransportFromNowEnd(ev, parkedNextWeek),
  ),
  "hueco 13/09 → 20/09 (divisores de día) no queda en curso el 18/09",
);

const overnightOut = {
  id: 12,
  fecha: "2026-09-17",
  hora_inicio: "21:30",
  hora_fin: null,
};
const overnightIn = {
  id: 13,
  fecha: "2026-09-18",
  hora_inicio: "08:00",
  hora_fin: null,
};
assert(
  !isFimbaAgendaEventFromNow(
    overnightOut,
    now,
    (ev) => resolveFimbaTransportFromNowEnd(ev, overnightIn),
  ),
  "overnight 17/09 21:30 → 18/09 08:00 ya llegó a las 11:00",
);
assert(
  isFimbaAgendaEventFromNow(
    overnightOut,
    new Date(2026, 8, 18, 7, 0, 0, 0),
    (ev) => resolveFimbaTransportFromNowEnd(ev, overnightIn),
  ),
  "overnight sigue en curso a las 07:00 del día siguiente",
);
assert(
  fimbaFromNowSectionDayKey("2026-09-17", {
    todayKey: "2026-09-18",
    showPast: false,
  }) === "2026-09-18",
  "vista colapsada: overnight de ayer se agrupa en hoy (sin divisor de ayer)",
);
assert(
  fimbaFromNowSectionDayKey("2026-09-17", {
    todayKey: "2026-09-18",
    showPast: true,
  }) === "2026-09-17",
  "Ver eventos anteriores: ayer vuelve a ser su propio día",
);
assert(
  fimbaFromNowSectionDayKey("2026-09-18", {
    todayKey: "2026-09-18",
    showPast: false,
  }) === "2026-09-18",
  "hoy permanece hoy",
);

const list = [pastPoint, inTransit, nextStop, futureStop];
const getEndDate = (ev) => {
  if (ev.id === 2) return resolveFimbaTransportFromNowEnd(ev, nextStop);
  if (ev.id === 3) return resolveFimbaTransportFromNowEnd(ev, futureStop);
  return resolveFimbaTransportFromNowEnd(ev, null);
};
const collapsed = splitFimbaAgendaFromNow(list, { now, getEndDate });
assert(collapsed.pastCount === 1, "un evento pasado (09:00)");
assert(
  collapsed.visibleEvents.map((e) => e.id).join(",") === "2,3,4",
  "vista default = en curso + futuros",
);
const expanded = splitFimbaAgendaFromNow(list, {
  now,
  showPast: true,
  getEndDate,
});
assert(
  expanded.visibleEvents.map((e) => e.id).join(",") === "1,2,3,4",
  "Ver eventos anteriores revela la lista completa",
);

if (process.exitCode) {
  console.error("verify-fimba-transport-from-now: FAILED");
} else {
  console.log("verify-fimba-transport-from-now: all ok");
}
