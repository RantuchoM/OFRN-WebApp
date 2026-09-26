import { getAsistenciaMatrixCellMark } from "./asistenciaMatrixExport";
import { timeStringToMinutes } from "./dates";
import { toIsoDateString } from "./ensembleMembership";
import {
  normalizeIsoDate,
  programOverlapsDateRange,
  toLocalDateString,
} from "./giraDateRange";
import { isIntegranteConvocadoToEnsayo, isProgramBorrador } from "./girasYearSummary";
import { integranteKey } from "./integranteIds";
import { formatSecondsToHm } from "./time";

/** @typedef {'counted'|'reemplazo'|'licencia'} ServicioMark */
/**
 * @typedef {'ensayo_ensamble_full'|'ensayo_ensamble_half'|'ensayo_gira_full'|'ensayo_gira_half'|'concierto'|'didactico'} ServicioKind
 */

export const ID_TIPO_CONCIERTO = 1;
export const ID_TIPO_ENSAYO_GIRA = 2;
export const ID_TIPO_ENSAYO_GENERAL = 3;
export const ID_TIPO_ENSAYO_ENSAMBLE = 13;

export const SERVICIO_EVENT_TYPE_IDS = [
  ID_TIPO_CONCIERTO,
  ID_TIPO_ENSAYO_GIRA,
  ID_TIPO_ENSAYO_GENERAL,
  ID_TIPO_ENSAYO_ENSAMBLE,
];

/** 2 horas en segundos (hora_inicio/hora_fin → minutos × 60). Exactamente 2 h cuenta como 1. */
export const ENSAYO_FULL_SECONDS = 2 * 3600;

export const ATOMIC_KIND_KEYS = [
  "concierto",
  "didactico",
  "ensayo_ensamble_full",
  "ensayo_ensamble_half",
  "ensayo_gira_full",
  "ensayo_gira_half",
];

/** Átomos de gira (ensayos 2/3 + conciertos/didácticos). Ensamble no entra. */
export const GIRA_ATOMIC_KIND_KEYS = [
  "concierto",
  "didactico",
  "ensayo_gira_full",
  "ensayo_gira_half",
];

/** Estimar futuros: solo programas Sinfónico (no CF / jazz / ensamble). */
export const TIPO_PROGRAMA_ESTIMAR = "Sinfónico";

export function isSinfonicoProgram(program) {
  return (program?.tipo || "") === TIPO_PROGRAMA_ESTIMAR;
}

/**
 * Columnas del listado. Ensayos ≥2h / <2h y Ensamble / Gira se solapan
 * (mismos ensayos, dos cortes); el Total suma solo los átomos.
 */
export const SERVICIO_COLUMN_DEFS = [
  {
    key: "concierto",
    label: "Conciertos",
    shortLabel: "Conc.",
    title: "Conciertos · 1 servicio c/u",
    sources: ["concierto"],
    chipClass: "bg-indigo-50 text-indigo-800",
  },
  {
    key: "didactico",
    label: "Didácticos",
    shortLabel: "Didác.",
    title: "Conciertos didácticos (es_didactico) · ½ servicio c/u",
    sources: ["didactico"],
    chipClass: "bg-violet-50 text-violet-800",
  },
  {
    key: "ensayo_ge2h",
    label: "Ensayos ≥2h",
    shortLabel: "≥2h",
    title: "Ensayos de ensamble o gira de 2 h o más · 1 servicio c/u",
    sources: ["ensayo_ensamble_full", "ensayo_gira_full"],
    chipClass: "bg-emerald-50 text-emerald-800",
  },
  {
    key: "ensayo_lt2h",
    label: "Ensayos <2h",
    shortLabel: "<2h",
    title: "Ensayos de ensamble o gira de menos de 2 h · ½ servicio c/u",
    sources: ["ensayo_ensamble_half", "ensayo_gira_half"],
    chipClass: "bg-amber-50 text-amber-900",
  },
  {
    key: "ensamble",
    label: "Ensamble",
    shortLabel: "Ensam.",
    title: "Ensayos de ensamble (misma regla 1 / ½ según duración)",
    sources: ["ensayo_ensamble_full", "ensayo_ensamble_half"],
    chipClass: "bg-cyan-50 text-cyan-800",
  },
  {
    key: "gira",
    label: "Gira",
    shortLabel: "Gira",
    title: "Ensayos de gira (Ensayo / Ensayo General; misma regla 1 / ½)",
    sources: ["ensayo_gira_full", "ensayo_gira_half"],
    chipClass: "bg-sky-50 text-sky-800",
  },
  {
    key: "total",
    label: "Total",
    shortLabel: "Total",
    title: "Total de servicios (conciertos + didácticos + ensayos; sin doble conteo)",
    sources: ATOMIC_KIND_KEYS,
    chipClass: "bg-slate-100 text-slate-800",
  },
];

/** Columna derivada: total ÷ meses feb–dic de presencia. No entra en el Total. */
export const SERVICIO_POR_MES_COLUMN = {
  key: "por_mes",
  label: "Servicios/mes",
  shortLabel: "Serv/mes",
  title:
    "Total de servicios ÷ meses de presencia en febrero–diciembre (según fecha_alta) que solapan el rango",
  chipClass: "bg-orange-50 text-orange-900",
};

/** Febrero–diciembre inclusive (enero no cuenta). */
export const SERVICIO_MES_LABORAL_DESDE = 2;
export const SERVICIO_MES_LABORAL_HASTA = 12;

export const DETAIL_SECTIONS = [
  {
    key: "concierto",
    label: "Conciertos",
    kinds: ["concierto"],
  },
  {
    key: "didactico",
    label: "Didácticos",
    kinds: ["didactico"],
  },
  {
    key: "ensamble",
    label: "Ensayos de ensamble",
    kinds: ["ensayo_ensamble_full", "ensayo_ensamble_half"],
  },
  {
    key: "gira",
    label: "Ensayos de gira",
    kinds: ["ensayo_gira_full", "ensayo_gira_half"],
  },
];

export function emptyAtomicBuckets() {
  return {
    concierto: { counted: 0, reemplazo: 0, licencia: 0 },
    didactico: { counted: 0, reemplazo: 0, licencia: 0 },
    ensayo_ensamble_full: { counted: 0, reemplazo: 0, licencia: 0 },
    ensayo_ensamble_half: { counted: 0, reemplazo: 0, licencia: 0 },
    ensayo_gira_full: { counted: 0, reemplazo: 0, licencia: 0 },
    ensayo_gira_half: { counted: 0, reemplazo: 0, licencia: 0 },
  };
}

export function emptyServiceBuckets() {
  return deriveDisplayBuckets(emptyAtomicBuckets());
}

export function bucketTotal(bucket) {
  if (!bucket) return 0;
  return (
    Number(bucket.counted || 0) +
    Number(bucket.reemplazo || 0) +
    Number(bucket.licencia || 0)
  );
}

export function deriveDisplayBuckets(atomic) {
  const display = {};
  for (const col of SERVICIO_COLUMN_DEFS) {
    display[col.key] = { counted: 0, reemplazo: 0, licencia: 0 };
    for (const src of col.sources) {
      const b = atomic?.[src];
      if (!b) continue;
      display[col.key].counted += Number(b.counted || 0);
      display[col.key].reemplazo += Number(b.reemplazo || 0);
      display[col.key].licencia += Number(b.licencia || 0);
    }
  }
  return display;
}

/**
 * Duración en minutos entre hora_inicio y hora_fin (soporta cruce de medianoche).
 * @returns {number|null}
 */
export function eventDurationMinutes(evt) {
  if (!evt?.hora_inicio || !evt?.hora_fin) return null;
  const start = timeStringToMinutes(evt.hora_inicio);
  const end = timeStringToMinutes(evt.hora_fin);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  let diff = end - start;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

/** Duración del evento en segundos (convenio inputToSeconds / horas enteras → s). */
export function eventDurationSeconds(evt) {
  const mins = eventDurationMinutes(evt);
  if (mins == null) return null;
  return mins * 60;
}

export function formatEventDurationLabel(evt) {
  const secs = eventDurationSeconds(evt);
  if (secs == null) return "—";
  return formatSecondsToHm(secs);
}

/** R / L para exportes planos (PDF/Excel). Vacío si es asistencia normal. */
export function formatServicioMarkLetter(mark) {
  if (mark === "reemplazo") return "R";
  if (mark === "licencia") return "L";
  return "";
}

/** Banda compacta de valor/duración para el detalle. */
export function formatServicioHitBandPlain(hit) {
  if (hit?.durationBand === "ge2h") return "≥2h";
  if (hit?.durationBand === "lt2h") return "<2h";
  if (hit?.kind === "didactico") return "½";
  if (hit?.kind === "concierto") return "1";
  return "";
}

function classifyEnsayoByDuration(evt, origin) {
  const secs = eventDurationSeconds(evt);
  if (secs == null) return null;
  const isFull = secs >= ENSAYO_FULL_SECONDS;
  const kind =
    origin === "ensamble"
      ? isFull
        ? "ensayo_ensamble_full"
        : "ensayo_ensamble_half"
      : isFull
        ? "ensayo_gira_full"
        : "ensayo_gira_half";
  return {
    kind,
    value: isFull ? 1 : 0.5,
    durationSeconds: secs,
    durationBand: isFull ? "ge2h" : "lt2h",
    origin,
  };
}

/**
 * Clasifica un evento y su valor de servicio (sin resolver convocatoria).
 * @returns {{ kind: ServicioKind, value: number, durationSeconds?: number, durationBand?: string, origin: string } | null}
 */
export function classifyServicioEvent(evt) {
  if (!evt || evt.is_deleted || evt.tecnica) return null;
  const tipo = Number(evt.id_tipo_evento);
  if (tipo === ID_TIPO_ENSAYO_ENSAMBLE) {
    return classifyEnsayoByDuration(evt, "ensamble");
  }
  if (tipo === ID_TIPO_CONCIERTO) {
    if (evt.es_didactico) {
      return { kind: "didactico", value: 0.5, origin: "didactico" };
    }
    return { kind: "concierto", value: 1, origin: "concierto" };
  }
  if (tipo === ID_TIPO_ENSAYO_GIRA || tipo === ID_TIPO_ENSAYO_GENERAL) {
    return classifyEnsayoByDuration(evt, "gira");
  }
  return null;
}

export function eventAssociatedProgramaIds(evt) {
  const ids = [];
  if (evt?.id_gira != null) ids.push(evt.id_gira);
  for (const row of evt?.eventos_programas_asociados || []) {
    const pid = row.id_programa ?? row.programas?.id;
    if (pid != null) ids.push(pid);
  }
  return [...new Set(ids.map((id) => Number(id)).filter(Number.isFinite))];
}

export function eventMatchesGiraFilter(evt, giraId) {
  if (giraId == null || giraId === "") return true;
  const want = Number(giraId);
  if (!Number.isFinite(want)) return true;
  return eventAssociatedProgramaIds(evt).includes(want);
}

/**
 * ¿La fecha del evento entra en [fechaDesde, fechaHasta] (inclusive, día local)?
 */
export function eventInReportDateWindow(
  fechaStr,
  { fechaDesde, fechaHasta } = {},
) {
  if (!fechaStr) return false;
  const day = String(fechaStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  if (fechaDesde && day < String(fechaDesde).slice(0, 10)) return false;
  if (fechaHasta && day > String(fechaHasta).slice(0, 10)) return false;
  return true;
}

/**
 * @param {object} evt
 * @param {string|number} integranteId
 * @param {object} ctx
 * @returns {{ kind: ServicioKind, value: number, mark: ServicioMark, durationSeconds?: number, durationBand?: string, origin?: string } | null}
 */
export function resolveServicioForIntegrante(evt, integranteId, ctx) {
  const classified = classifyServicioEvent(evt);
  if (!classified) return null;

  const {
    rosterByGiraId = {},
    memberships = [],
    customByEventId = new Map(),
    draftGiraIds = new Set(),
    filteredProgramIds = null,
    giraIdFilter = null,
  } = ctx;

  const iid = integranteKey(integranteId);
  if (!iid) return null;
  if (!eventMatchesGiraFilter(evt, giraIdFilter)) return null;

  if (classified.kind.startsWith("ensayo_ensamble")) {
    if (evt.id_gira != null && draftGiraIds.has(evt.id_gira)) return null;
    if (
      !isIntegranteConvocadoToEnsayo(
        evt,
        iid,
        memberships,
        customMapForIntegrante(customByEventId, iid),
      )
    ) {
      return null;
    }
    return { ...classified, mark: "counted" };
  }

  const giraId = evt.id_gira;
  if (giraId == null) return null;
  if (draftGiraIds.has(giraId)) return null;
  if (filteredProgramIds instanceof Set && !filteredProgramIds.has(giraId)) {
    return null;
  }

  // Misma marca que Gestión → Convocatorias (incluye ausente+abona R/L).
  const mark = getAsistenciaMatrixCellMark(rosterByGiraId[giraId], iid);
  if (mark !== "counted" && mark !== "reemplazo" && mark !== "licencia") {
    return null;
  }

  return { ...classified, mark };
}

export function isGiraServiceKind(kind) {
  return GIRA_ATOMIC_KIND_KEYS.includes(kind);
}

export function emptyGiraKindTotals() {
  return Object.fromEntries(GIRA_ATOMIC_KIND_KEYS.map((k) => [k, 0]));
}

/**
 * Gira pasada: `fecha_hasta` estrictamente anterior a hoy (calendario del programa).
 * Sin `fecha_hasta` no es pasada.
 */
export function isPastGira(program, today = toLocalDateString()) {
  const hasta = normalizeIsoDate(program?.fecha_hasta);
  if (!hasta) return false;
  return hasta < today;
}

/**
 * Gira a estimar (toggle ON): `fecha_hasta >= hoy` o sin fin.
 * Incluye las en curso (cronograma a medias no debe subcontar).
 */
export function isEstimableGira(program, today = toLocalDateString()) {
  if (!program || isProgramBorrador(program)) return false;
  const hasta = normalizeIsoDate(program?.fecha_hasta);
  return !hasta || hasta >= today;
}

export function priorYearBoundsFromRange(fechaDesde) {
  const y = Number(String(fechaDesde || "").slice(0, 4));
  const year = Number.isFinite(y) ? y - 1 : new Date().getFullYear() - 1;
  return { fechaDesde: `${year}-01-01`, fechaHasta: `${year}-12-31` };
}

export function listPastGirasForAverage(
  programs,
  { fechaDesde, fechaHasta, today, selectedTypes, onlySinfonico = false } = {},
) {
  const day = today || toLocalDateString();
  return (programs || []).filter((p) => {
    if (!p?.id || isProgramBorrador(p)) return false;
    if (onlySinfonico && !isSinfonicoProgram(p)) return false;
    if (selectedTypes instanceof Set && p.tipo && !selectedTypes.has(p.tipo)) {
      return false;
    }
    if (!isPastGira(p, day)) return false;
    return programOverlapsDateRange(p, fechaDesde, fechaHasta, undefined, {
      calendarOnly: true,
    });
  });
}

export function listEstimableGiras(
  programs,
  { today, selectedTypes, giraIdFilter, onlySinfonico = true } = {},
) {
  const day = today || toLocalDateString();
  return (programs || []).filter((p) => {
    if (!isEstimableGira(p, day)) return false;
    if (onlySinfonico && !isSinfonicoProgram(p)) return false;
    if (selectedTypes instanceof Set && p.tipo && !selectedTypes.has(p.tipo)) {
      return false;
    }
    if (
      giraIdFilter != null &&
      giraIdFilter !== "" &&
      Number(giraIdFilter) !== Number(p.id)
    ) {
      return false;
    }
    return true;
  });
}

/** Nómina que cuenta: counted + R + L (no ausente sin abono, no pre-alta). */
export function rosterCountedMusicianIds(rosterEntry) {
  const ids = new Set();
  if (!rosterEntry) return ids;
  const add = (set) => {
    if (!set) return;
    const iter =
      set instanceof Set ? set : Array.isArray(set) ? set : [];
    for (const id of iter) {
      const k = integranteKey(id);
      if (k) ids.add(k);
    }
  };
  add(rosterEntry.counted);
  add(rosterEntry.reemplazo);
  add(rosterEntry.licencia);
  return ids;
}

function matchesGiraIdFilter(giraId, giraIdFilter) {
  if (giraIdFilter == null || giraIdFilter === "") return true;
  return Number(giraIdFilter) === Number(giraId);
}

/**
 * Promedio de servicios de gira (ensayos 2/3 + conciertos/didácticos) por
 * músico en nómina (no ausente) y por gira pasada. Ensamble no entra.
 * Giras sin ningún servicio de gira (cronograma vacío) se omiten.
 */
export function computeGiraServiciosAverage({
  programs,
  events,
  rosterByGiraId,
  ctx = {},
} = {}) {
  const eventsByGira = new Map();
  for (const evt of events || []) {
    if (evt?.id_gira == null) continue;
    const gid = Number(evt.id_gira);
    if (!eventsByGira.has(gid)) eventsByGira.set(gid, []);
    eventsByGira.get(gid).push(evt);
  }

  const resolveCtx = {
    ...ctx,
    rosterByGiraId: rosterByGiraId || ctx.rosterByGiraId || {},
    giraIdFilter: null,
    filteredProgramIds: new Set(
      (programs || []).map((p) => p.id).filter((id) => id != null),
    ),
  };

  const kindSums = emptyGiraKindTotals();
  let n = 0;
  let girasUsed = 0;

  for (const prog of programs || []) {
    const evts = eventsByGira.get(Number(prog.id)) || [];
    const musicians = rosterCountedMusicianIds(
      resolveCtx.rosterByGiraId?.[prog.id] ||
        resolveCtx.rosterByGiraId?.[Number(prog.id)],
    );
    if (musicians.size === 0) continue;

    let giraHasService = false;
    const rows = [];
    for (const iid of musicians) {
      const personKind = emptyGiraKindTotals();
      for (const evt of evts) {
        const hit = resolveServicioForIntegrante(evt, iid, resolveCtx);
        if (!hit || !isGiraServiceKind(hit.kind)) continue;
        giraHasService = true;
        const v = Number(hit.value || 0);
        personKind[hit.kind] += v;
      }
      rows.push(personKind);
    }
    if (!giraHasService) continue;

    girasUsed += 1;
    for (const personKind of rows) {
      n += 1;
      for (const k of GIRA_ATOMIC_KIND_KEYS) {
        kindSums[k] += personKind[k];
      }
    }
  }

  if (n === 0) {
    return {
      mean: null,
      byKind: emptyGiraKindTotals(),
      observations: 0,
      girasUsed: 0,
    };
  }

  const byKind = emptyGiraKindTotals();
  for (const k of GIRA_ATOMIC_KIND_KEYS) {
    byKind[k] = kindSums[k] / n;
  }
  const mean = GIRA_ATOMIC_KIND_KEYS.reduce((sum, k) => sum + byKind[k], 0);
  return { mean, byKind, observations: n, girasUsed };
}

export function formatGiraAveragePlain(avg) {
  if (avg?.mean == null) return "sin promedio";
  return `promedio ${formatServicioNumber(avg.mean)} serv./gira`;
}

function skipExactGiraHit(hit, evt, estimableIds) {
  if (!estimableIds?.size) return false;
  if (!isGiraServiceKind(hit?.kind)) return false;
  if (evt?.id_gira == null) return false;
  const gid = Number(evt.id_gira);
  return estimableIds.has(evt.id_gira) || estimableIds.has(gid);
}

function applyGiraEstimatesToAtomic(atomic, integranteId, ctx) {
  const avg = ctx?.giraAverage;
  const ids = ctx?.estimableGiraIds;
  if (!ctx?.estimarFuturos || !avg || avg.mean == null || !ids?.size) return;
  const iid = integranteKey(integranteId);
  for (const giraId of ids) {
    if (!matchesGiraIdFilter(giraId, ctx.giraIdFilter)) continue;
    const mark = getAsistenciaMatrixCellMark(ctx.rosterByGiraId?.[giraId], iid);
    if (mark !== "counted" && mark !== "reemplazo" && mark !== "licencia") {
      continue;
    }
    for (const k of GIRA_ATOMIC_KIND_KEYS) {
      const v = Number(avg.byKind?.[k] || 0);
      if (v) addToBucket(atomic, k, "counted", v);
    }
  }
}

export function buildGiraEstimateHits(integranteId, ctx) {
  const hits = [];
  const avg = ctx?.giraAverage;
  const ids = ctx?.estimableGiraIds;
  if (!ctx?.estimarFuturos || !avg || avg.mean == null || !ids?.size) {
    return hits;
  }
  const iid = integranteKey(integranteId);
  const programasById = ctx.programasById || new Map();
  const label = formatGiraAveragePlain(avg);
  for (const giraId of ids) {
    if (!matchesGiraIdFilter(giraId, ctx.giraIdFilter)) continue;
    const mark = getAsistenciaMatrixCellMark(ctx.rosterByGiraId?.[giraId], iid);
    if (mark !== "counted" && mark !== "reemplazo" && mark !== "licencia") {
      continue;
    }
    const prog = programasById.get?.(giraId) || programasById.get?.(Number(giraId));
    const fecha = normalizeIsoDate(prog?.fecha_desde) || ctx.fechaDesde;
    for (const k of GIRA_ATOMIC_KIND_KEYS) {
      const v = Number(avg.byKind?.[k] || 0);
      if (!v) continue;
      hits.push({
        kind: k,
        value: v,
        mark: "counted",
        origin: "estimado",
        durationBand:
          k === "ensayo_gira_full"
            ? "ge2h"
            : k === "ensayo_gira_half"
              ? "lt2h"
              : undefined,
        event: {
          id: `est-${giraId}-${k}`,
          fecha,
          id_gira: giraId,
          es_estimado: true,
          tipos_evento: { nombre: "Estimación" },
          descripcion: `${label} (reemplaza cronograma de gira)`,
        },
      });
    }
  }
  return hits;
}

function addToBucket(buckets, kind, mark, value) {
  if (!buckets[kind]) return;
  const key =
    mark === "reemplazo"
      ? "reemplazo"
      : mark === "licencia"
        ? "licencia"
        : "counted";
  buckets[kind][key] = Number(buckets[kind][key] || 0) + Number(value || 0);
}

/**
 * Acumula servicios de un integrante sobre la lista de eventos (columnas de display).
 */
export function accumulateServiciosForIntegrante(integranteId, events, ctx) {
  const atomic = emptyAtomicBuckets();
  const estimableIds = ctx?.estimarFuturos ? ctx.estimableGiraIds : null;
  for (const evt of events || []) {
    if (!eventInReportDateWindow(evt.fecha, ctx)) continue;
    const hit = resolveServicioForIntegrante(evt, integranteId, ctx);
    if (!hit) continue;
    if (skipExactGiraHit(hit, evt, estimableIds)) continue;
    addToBucket(atomic, hit.kind, hit.mark, hit.value);
  }
  applyGiraEstimatesToAtomic(atomic, integranteId, ctx);
  return deriveDisplayBuckets(atomic);
}

export function listServicioHitsForIntegrante(integranteId, events, ctx) {
  const hits = [];
  const estimableIds = ctx?.estimarFuturos ? ctx.estimableGiraIds : null;
  for (const evt of events || []) {
    if (!eventInReportDateWindow(evt.fecha, ctx)) continue;
    const hit = resolveServicioForIntegrante(evt, integranteId, ctx);
    if (!hit) continue;
    if (skipExactGiraHit(hit, evt, estimableIds)) continue;
    hits.push({ ...hit, event: evt });
  }
  hits.push(...buildGiraEstimateHits(integranteId, ctx));
  hits.sort((a, b) => {
    const fa = String(a.event?.fecha || "");
    const fb = String(b.event?.fecha || "");
    if (fa !== fb) return fa.localeCompare(fb);
    return String(a.event?.hora_inicio || "").localeCompare(
      String(b.event?.hora_inicio || ""),
    );
  });
  return hits;
}

export function groupHitsByDetailSection(hits) {
  return DETAIL_SECTIONS.map((section) => ({
    ...section,
    hits: (hits || []).filter((h) => section.kinds.includes(h.kind)),
    value: (hits || [])
      .filter((h) => section.kinds.includes(h.kind))
      .reduce((acc, h) => acc + Number(h.value || 0), 0),
  }));
}

export function withTotalBucket(buckets) {
  if (buckets?.total) return buckets;
  return deriveDisplayBuckets(buckets);
}

export function sumBuckets(list) {
  const acc = emptyServiceBuckets();
  for (const row of list || []) {
    for (const key of Object.keys(acc)) {
      acc[key].counted += Number(row?.[key]?.counted || 0);
      acc[key].reemplazo += Number(row?.[key]?.reemplazo || 0);
      acc[key].licencia += Number(row?.[key]?.licencia || 0);
    }
  }
  return acc;
}

/** Formato 0,5 / 1 / 1,5 (es-AR). */
export function formatServicioNumber(n) {
  const v = Number(n) || 0;
  if (Object.is(v, -0) || v === 0) return "0";
  return v.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: v % 1 === 0 ? 0 : 1,
  });
}

function padMonthDay(n) {
  return String(n).padStart(2, "0");
}

function monthStartIso(year, month) {
  return `${year}-${padMonthDay(month)}-01`;
}

function monthEndIso(year, month) {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${padMonthDay(month)}-${padMonthDay(last)}`;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && aEnd >= bStart;
}

/**
 * Meses feb–dic de presencia que solapan [fechaDesde, fechaHasta].
 * Alta en/antes de febrero (o sin fecha_alta) → hasta 11 en un año calendario.
 * Alta en marzo → 10; abril → 9; diciembre → 1. Enero nunca suma.
 * Si el rango no es un año completo, solo cuentan los meses feb–dic que caen en el rango.
 *
 * @returns {number}
 */
export function countServicioMesesDivisor({
  fechaAlta,
  fechaBaja,
  fechaDesde,
  fechaHasta,
} = {}) {
  const desde = toIsoDateString(fechaDesde);
  const hasta = toIsoDateString(fechaHasta);
  if (!desde || !hasta) return 0;
  const alta = toIsoDateString(fechaAlta);
  const baja = toIsoDateString(fechaBaja);

  const y0 = Number(desde.slice(0, 4));
  const y1 = Number(hasta.slice(0, 4));
  if (!Number.isFinite(y0) || !Number.isFinite(y1) || y0 > y1) return 0;

  let months = 0;
  for (let y = y0; y <= y1; y++) {
    for (
      let m = SERVICIO_MES_LABORAL_DESDE;
      m <= SERVICIO_MES_LABORAL_HASTA;
      m++
    ) {
      const ms = monthStartIso(y, m);
      const me = monthEndIso(y, m);
      if (!rangesOverlap(ms, me, desde, hasta)) continue;
      if (alta && alta > me) continue;
      if (baja && baja < ms) continue;
      months += 1;
    }
  }
  return months;
}

/**
 * Total de servicios ÷ meses feb–dic de presencia.
 * @returns {{ months: number, rate: number|null }}
 */
export function computeServiciosPorMes(totalServicios, integrante, range) {
  const months = countServicioMesesDivisor({
    fechaAlta: integrante?.fecha_alta,
    fechaBaja: integrante?.fecha_baja,
    fechaDesde: range?.fechaDesde,
    fechaHasta: range?.fechaHasta,
  });
  const total = Number(totalServicios) || 0;
  if (months <= 0) return { months: 0, rate: null };
  return { months, rate: total / months };
}

/** Texto de celda Servicios/mes: `1,23 (10)` o `—`. */
export function formatServiciosPorMesPlain(totalServicios, integrante, range) {
  const { months, rate } = computeServiciosPorMes(
    totalServicios,
    integrante,
    range,
  );
  if (rate == null) return "—";
  return `${formatServicioNumber(rate)} (${months})`;
}

/**
 * Segmentos para UI/export: base + (reemplazo sky) + (licencia amber).
 * @returns {{ text: string, tone: 'base'|'reemplazo'|'licencia' }[]}
 */
export function formatServicioParts(bucket) {
  const counted = Number(bucket?.counted || 0);
  const reemplazo = Number(bucket?.reemplazo || 0);
  const licencia = Number(bucket?.licencia || 0);
  const total = counted + reemplazo + licencia;
  if (total === 0) return [{ text: "—", tone: "base" }];

  if (reemplazo === 0 && licencia === 0) {
    return [{ text: formatServicioNumber(counted), tone: "base" }];
  }

  const parts = [];
  if (counted > 0) {
    parts.push({ text: formatServicioNumber(counted), tone: "base" });
  }
  if (reemplazo > 0) {
    parts.push({
      text: `${counted > 0 || licencia > 0 ? "+" : ""}${formatServicioNumber(reemplazo)}`,
      tone: "reemplazo",
    });
  }
  if (licencia > 0) {
    parts.push({
      text: `+${formatServicioNumber(licencia)}`,
      tone: "licencia",
    });
  }
  if (parts.length === 1 && parts[0].tone === "reemplazo") {
    parts[0] = {
      text: formatServicioNumber(reemplazo),
      tone: "reemplazo",
    };
  }
  if (parts.length === 1 && parts[0].tone === "licencia") {
    parts[0] = {
      text: formatServicioNumber(licencia),
      tone: "licencia",
    };
  }
  return parts;
}

export function formatServicioPartsPlain(bucket) {
  return formatServicioParts(bucket)
    .map((p) => p.text)
    .join("");
}

export function buildDraftGiraIds(programas = []) {
  return new Set(
    (programas || [])
      .filter((p) => isProgramBorrador(p))
      .map((p) => p.id)
      .filter((id) => id != null),
  );
}

/**
 * Lookup multi-integrante: id_evento → Map(integranteKey → { tipo, ... })
 */
export function buildCustomByEventId(customRows = []) {
  const map = new Map();
  for (const row of customRows || []) {
    const eid = row.id_evento;
    const iid = integranteKey(row.id_integrante);
    if (eid == null || !iid) continue;
    if (!map.has(eid)) map.set(eid, new Map());
    map.get(eid).set(iid, row);
  }
  return map;
}

/** Adapta el mapa multi-persona al shape de `isIntegranteConvocadoToEnsayo`. */
export function customMapForIntegrante(customByEventId, integranteId) {
  const map = new Map();
  const uid = integranteKey(integranteId);
  if (!customByEventId || !uid) return map;
  for (const [eid, byPerson] of customByEventId) {
    const row = byPerson?.get?.(uid);
    if (row) map.set(eid, row);
  }
  return map;
}
