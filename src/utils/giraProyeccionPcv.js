/**
 * Proyección PCV por demoras localidad ↔ localidad (gira_demoras_localidad).
 * Anclas: programas.hora_inicio_proyeccion / hora_fin_proyeccion.
 */
import { calculateDaysDiff } from "./viaticosDiasComputables";

export const HUBS = ["Viedma", "Valle", "Bariloche", "Bolson"];

/** Fallback IDs si localidades.hub aún no está cargado (legacy / labels). */
export const LOC_HUB_FALLBACK = {
  5: "Bariloche",
  46: "Bariloche",
  23: "Bolson",
  57: "Viedma",
  16: "Valle",
  30: "Valle",
  60: "Valle",
  14: "Valle",
  51: "Valle",
};

export const DEFAULT_SERVICIOS_ESTIMADOS = 7;
export const DEFAULT_TRAVEL_MIN_FALLBACK = 6 * 60;

export function addDaysIso(iso, n) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + Number(n || 0));
  return d.toISOString().slice(0, 10);
}

export function addMinutesToDateTime(isoDate, hhmm, addMin) {
  const [h, m] = String(hhmm || "12:00")
    .slice(0, 5)
    .split(":")
    .map(Number);
  const total = h * 60 + (m || 0) + Number(addMin || 0);
  const dayAdd = Math.floor(total / (24 * 60));
  const rem = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(rem / 60)).padStart(2, "0");
  const mm = String(rem % 60).padStart(2, "0");
  return { date: addDaysIso(isoDate, dayAdd), time: `${hh}:${mm}` };
}

export function sliceTime(t) {
  if (!t) return null;
  return String(t).slice(0, 5);
}

export function hubOfLocalidad(locId, hubByLocId = null) {
  const id = Number(locId);
  if (!Number.isFinite(id) || id <= 0) return null;
  if (hubByLocId) {
    const h = hubByLocId.get?.(id) ?? hubByLocId[id];
    if (h) return h;
  }
  return LOC_HUB_FALLBACK[id] || null;
}

export function demoraKey(origen, destino) {
  return `${origen}|${destino}`;
}

export function demoraLocKey(idOrigen, idDestino) {
  return `${Number(idOrigen)}|${Number(idDestino)}`;
}

/**
 * Indexa filas de gira_demoras_localidad → Map "idOrigen|idDestino" → row
 */
export function indexDemorasLocalidad(rows) {
  const map = new Map();
  for (const r of rows || []) {
    const o = Number(r.id_localidad_origen);
    const d = Number(r.id_localidad_destino);
    if (!Number.isFinite(o) || !Number.isFinite(d) || o <= 0 || d <= 0) continue;
    map.set(demoraLocKey(o, d), {
      id_localidad_origen: o,
      id_localidad_destino: d,
      minutos: Number(r.minutos) || 0,
      origen_nombre: r.origen_nombre || r.localidad_origen || null,
      destino_nombre: r.destino_nombre || r.localidad_destino || null,
    });
  }
  return map;
}

/** @deprecated Prefer indexDemorasLocalidad */
export function indexDemoras(rows) {
  if (rows?.[0] && "id_localidad_origen" in rows[0]) {
    return indexDemorasLocalidad(rows);
  }
  const map = new Map();
  for (const r of rows || []) {
    const o = String(r.hub_origen || "").trim();
    const d = String(r.hub_destino || "").trim();
    if (!o || !d) continue;
    map.set(demoraKey(o, d), {
      hub_origen: o,
      hub_destino: d,
      minutos: Number(r.minutos) || 0,
    });
  }
  return map;
}

export function lookupDemoraLocalidad(demorasMap, homeLocId, destLocId) {
  if (!demorasMap) return null;
  const a = Number(homeLocId);
  const b = Number(destLocId);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return (
    demorasMap.get(demoraLocKey(a, b)) ||
    demorasMap.get(demoraLocKey(b, a)) ||
    null
  );
}

/**
 * Default hora fin: 14:00 si ultimo concierto es mañana (<15:00); si no 23:00.
 */
export function defaultHoraFinProyeccion(eventos = []) {
  const concerts = (eventos || [])
    .filter((e) => Number(e.id_tipo_evento) === 1 && e.fecha)
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  if (!concerts.length) return "23:00";
  const last = concerts[concerts.length - 1];
  const hi = sliceTime(last.hora_inicio);
  if (hi) {
    const [h, m] = hi.split(":").map(Number);
    if (h * 60 + (m || 0) < 15 * 60) return "14:00";
  }
  return "23:00";
}

export function defaultHoraInicioProyeccion() {
  return "15:00";
}

/**
 * Servicios estimados: override manual | suma eventos gira 1/2/3 | default config.
 * Concierto=1, didáctico=0.5; ensayos por duración (≥2h=1, >30min=0.5).
 * @param {object} program
 * @param {object[]} [eventos]
 * @param {number} [defaultServicios] — `ensamble_proyeccion_config.servicios_por_gira` (fallback 7)
 */
export function resolveGiraServiciosEstimate(
  program,
  eventos = [],
  defaultServicios = DEFAULT_SERVICIOS_ESTIMADOS,
) {
  if (program?.servicios_estimados != null && program.servicios_estimados !== "") {
    const n = Number(program.servicios_estimados);
    if (Number.isFinite(n) && n >= 0) {
      return { value: n, source: "manual", byKind: null };
    }
  }
  const giraEvts = (eventos || []).filter((e) => {
    const t = Number(e.id_tipo_evento);
    return t === 1 || t === 2 || t === 3;
  });
  if (giraEvts.length) {
    let sum = 0;
    const byKind = {
      concierto: 0,
      didactico: 0,
      ensayo_gira_full: 0,
      ensayo_gira_half: 0,
    };
    for (const ev of giraEvts) {
      const t = Number(ev.id_tipo_evento);
      if (t === 1) {
        const v = ev.es_didactico ? 0.5 : 1;
        sum += v;
        if (ev.es_didactico) byKind.didactico += v;
        else byKind.concierto += v;
        continue;
      }
      const hi = sliceTime(ev.hora_inicio);
      const hf = sliceTime(ev.hora_fin);
      if (!hi || !hf) continue;
      const [h1, m1] = hi.split(":").map(Number);
      const [h2, m2] = hf.split(":").map(Number);
      const secs = (h2 * 60 + m2 - (h1 * 60 + m1)) * 60;
      if (secs <= 1800) continue;
      if (secs < 7200) {
        sum += 0.5;
        byKind.ensayo_gira_half += 0.5;
      } else {
        sum += 1;
        byKind.ensayo_gira_full += 1;
      }
    }
    if (sum > 0) {
      return {
        value: Math.round(sum * 100) / 100,
        source: "eventos",
        byKind,
      };
    }
  }
  const def = Number(defaultServicios);
  const fallback =
    Number.isFinite(def) && def >= 0 ? def : DEFAULT_SERVICIOS_ESTIMADOS;
  return {
    value: fallback,
    source: "default",
    byKind: {
      concierto: 1,
      didactico: 0,
      ensayo_gira_full: Math.max(0, fallback - 1),
      ensayo_gira_half: 0,
    },
  };
}

function travelMinutesLabel(min) {
  const travel = Number(min) || 0;
  return travel >= 60
    ? `${Math.floor(travel / 60)}h${travel % 60 ? ` ${travel % 60}m` : ""}`
    : `${travel}m`;
}

function resolveTravelMin(demorasMap, a, b) {
  const dem = lookupDemoraLocalidad(demorasMap, a, b);
  return {
    minutes: dem != null ? Number(dem.minutos) || 0 : DEFAULT_TRAVEL_MIN_FALLBACK,
    missing: dem == null,
  };
}

/**
 * Agrupa tramos fuera consecutivos (por `indice`) en viajes empalmados.
 * Un tramo en casa en el medio corta el viaje. Sin índices → un solo viaje.
 */
export function groupFueraTrips(fueraSegs) {
  const sorted = [...(fueraSegs || [])].sort((a, b) => {
    const ia = Number(a?.indice);
    const ib = Number(b?.indice);
    if (Number.isFinite(ia) && Number.isFinite(ib)) return ia - ib;
    return 0;
  });
  if (!sorted.length) return [];
  const allIndexed = sorted.every((s) => Number.isFinite(Number(s?.indice)));
  if (!allIndexed) return [sorted];

  const trips = [];
  let run = [];
  for (const seg of sorted) {
    const idx = Number(seg.indice);
    if (!run.length) {
      run = [seg];
      continue;
    }
    const prevIdx = Number(run[run.length - 1].indice);
    if (idx === prevIdx + 1) {
      run.push(seg);
    } else {
      trips.push(run);
      run = [seg];
    }
  }
  if (run.length) trips.push(run);
  return trips;
}

/**
 * Estima ventana PCV ida/vuelta.
 * Tramos empalmados: ida casa→primer destino; vuelta desde último destino→casa
 * (`destBackLocId` distinto de `destLocId`).
 * @param {object} opts
 * @param {number} opts.homeLocId localidad de localía (casa)
 * @param {number} opts.destLocId localidad de llegada (inicio)
 * @param {number} [opts.destBackLocId] localidad de partida de vuelta (default = destLocId)
 * @param {string} opts.fechaDesde
 * @param {string} opts.fechaHasta
 * @param {string} [opts.horaInicioProy] ancla en destino (default 15:00)
 * @param {string} [opts.horaFinProy] ancla cierre (default 23:00)
 * @param {Map} [opts.demorasMap] indexDemorasLocalidad
 * @param {Map|object} [opts.locNameById] id → nombre (solo labels)
 */
export function estimatePcvWindow({
  homeLocId,
  destLocId,
  destBackLocId,
  fechaDesde,
  fechaHasta,
  horaInicioProy,
  horaFinProy,
  demorasMap,
  locNameById,
  hubByLocId: _hubByLocId, // legacy no-op
} = {}) {
  const desde = String(fechaDesde || "").slice(0, 10);
  const hasta = String(fechaHasta || fechaDesde || "").slice(0, 10);
  if (!desde || !hasta) {
    return { dias: 0, nota: "Sin fechas", out: null, back: null };
  }

  const home = Number(homeLocId);
  const destOut = Number(destLocId);
  const destBack =
    destBackLocId != null && Number.isFinite(Number(destBackLocId))
      ? Number(destBackLocId)
      : destOut;
  const hIni = sliceTime(horaInicioProy) || defaultHoraInicioProyeccion();
  const hFin = sliceTime(horaFinProy) || "23:00";

  if (
    !Number.isFinite(home) ||
    home <= 0 ||
    !Number.isFinite(destOut) ||
    destOut <= 0
  ) {
    return { dias: 0, nota: "Sin localidades", out: null, back: null };
  }

  if (home === destOut && home === destBack) {
    return { dias: 0, nota: "Misma localidad — sin PCV", out: null, back: null };
  }

  const outTravel = resolveTravelMin(demorasMap, home, destOut);
  const backTravel = resolveTravelMin(demorasMap, destBack, home);
  const travelOut = outTravel.minutes;
  const travelBack = backTravel.minutes;
  const missing = outTravel.missing || backTravel.missing;

  // Anclas: llegada al 1er destino = inicio; salida del último = fin.
  // Salida de casa = inicio − demora ida; llegada a casa = fin + demora vuelta.
  const leave = addMinutesToDateTime(desde, hIni, -travelOut);
  const outDate = leave.date;
  const outTime = leave.time;
  const outArrive = { date: desde, time: hIni };
  const backLeave = { date: hasta, time: hFin };
  const backArrive = addMinutesToDateTime(hasta, hFin, travelBack);

  const dias = calculateDaysDiff(
    outDate,
    outTime,
    backArrive.date,
    backArrive.time,
  );

  const nameOf = (id) => {
    const n = locNameById?.get?.(id) ?? locNameById?.[id];
    return n || `loc ${id}`;
  };

  const route =
    destOut === destBack
      ? `${nameOf(home)}→${nameOf(destOut)}`
      : `${nameOf(home)}→${nameOf(destOut)}…${nameOf(destBack)}→${nameOf(home)}`;
  const travelLabel =
    destOut === destBack && travelOut === travelBack
      ? travelMinutesLabel(travelOut)
      : `ida ${travelMinutesLabel(travelOut)} / vuelta ${travelMinutesLabel(travelBack)}`;
  const nota = missing
    ? `${route}: sin tramo (usando ${travelLabel} fallback)`
    : `${route} (${travelLabel}). Ida ${outDate} ${outTime} → vuelta llega ${backArrive.date} ${backArrive.time}`;

  return {
    dias,
    nota,
    out: { date: outDate, time: outTime, arrive: outArrive },
    back: { leave: backLeave, arrive: backArrive },
    travelMin: travelOut,
    travelMinBack: travelBack,
    missingTramo: missing,
  };
}

/**
 * PCV total de tramos fuera: viajes empalmados (no vuelven a casa entre tramos
 * consecutivos). Un tramo en casa propia corta el viaje.
 */
export function estimatePcvFromFueraSegs({
  homeLocId,
  fueraSegs,
  fechaDesdeFallback,
  fechaHastaFallback,
  horaInicioProy,
  horaFinProy,
  demorasMap,
  locNameById,
  pickDest,
} = {}) {
  const home = Number(homeLocId);
  const pick =
    typeof pickDest === "function"
      ? pickDest
      : (seg) =>
          (seg?.localidad_ids || []).find((id) => Number(id) !== home) || null;

  let dias = 0;
  const notas = [];
  const windows = [];
  for (const trip of groupFueraTrips(fueraSegs)) {
    const first = trip[0];
    const last = trip[trip.length - 1];
    const destOut = Number(pick(first));
    const destBack = Number(pick(last)) || destOut;
    if (!Number.isFinite(destOut) || destOut <= 0) continue;
    const win = estimatePcvWindow({
      homeLocId: home,
      destLocId: destOut,
      destBackLocId: destBack,
      fechaDesde: first?.fecha_desde || fechaDesdeFallback,
      fechaHasta: last?.fecha_hasta || fechaHastaFallback || fechaDesdeFallback,
      horaInicioProy,
      horaFinProy,
      demorasMap,
      locNameById,
    });
    dias += Number(win?.dias) || 0;
    if (win?.nota) notas.push(win.nota);
    windows.push(win);
  }
  return {
    dias: Math.round(dias * 100) / 100,
    nota: notas.join(" · "),
    windows,
  };
}

const WEEKDAY_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function weekdayEs(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return WEEKDAY_ES[new Date(y, m - 1, d).getDay()] || "";
}

function dayMonth(iso) {
  if (!iso) return "";
  const [, m, d] = String(iso).slice(0, 10).split("-");
  return `${Number(d)}/${Number(m)}`;
}

function hourHs(hhmm) {
  const [h, m] = String(hhmm || "00:00")
    .slice(0, 5)
    .split(":")
    .map(Number);
  if (!Number.isFinite(h)) return "";
  if (!m) return `${h} hs`;
  return `${h}:${String(m).padStart(2, "0")} hs`;
}

export function formatPcvFranja(win) {
  if (!win?.out?.date) return "";
  const outDate = win.out.date;
  const outTime = win.out.time || "12:00";
  const arrDate = win.back?.arrive?.date || win.back?.date;
  const arrTime = win.back?.arrive?.time || win.back?.time || "12:00";
  if (!arrDate) return "";
  const dias = Number(win.dias) || 0;
  const diasLabel = String(dias).replace(".", ",");
  const diasTxt = dias === 1 ? `${diasLabel} día` : `${diasLabel} días`;
  return `${weekdayEs(outDate)} ${dayMonth(outDate)}, ${hourHs(outTime)} a ${weekdayEs(arrDate)} ${dayMonth(arrDate)}, ${hourHs(arrTime)}. ${diasTxt}`;
}
