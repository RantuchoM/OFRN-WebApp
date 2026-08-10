import { parseISO, startOfDay } from "date-fns";
import { getAsistenciaMatrixCellMark } from "./asistenciaMatrixExport";
import { timeStringToMinutes } from "./dates";
import { membershipActiveOnProgramDate } from "./ensembleMembership";
import { isProgramBorrador } from "./girasYearSummary";
import { integranteKey } from "./integranteIds";

/** @typedef {'counted'|'reemplazo'|'licencia'} ServicioMark */
/** @typedef {'ensayo_ensamble'|'ensayo_gira_half'|'ensayo_gira_full'|'concierto'|'didactico'} ServicioKind */

export const ID_TIPO_CONCIERTO = 1;
export const ID_TIPO_ENSAYO_GIRA = 2;
export const ID_TIPO_ENSAYO_GENERAL = 3;
export const ID_TIPO_ENSAYO_ENSAMBLE = 13;

/** Mínimo de minutos para ½ servicio en ensayo de gira (1:15 h). */
export const ENSAYO_GIRA_HALF_MIN_MINUTES = 75;
/** Mínimo de minutos para 1 servicio en ensayo de gira (2 h). */
export const ENSAYO_GIRA_FULL_MIN_MINUTES = 120;

export const SERVICIO_COLUMN_DEFS = [
  {
    key: "ensayo_ensamble",
    label: "Ensayos ensamble",
    shortLabel: "Ens. ens.",
    title: "Ensayos de ensamble · 1 servicio c/u",
  },
  {
    key: "ensayo_gira_half",
    label: "Ens. gira ½",
    shortLabel: "Gira ½",
    title: "Ensayo de gira 1:15 h · ½ servicio c/u",
  },
  {
    key: "ensayo_gira_full",
    label: "Ens. gira 1",
    shortLabel: "Gira 1",
    title: "Ensayo de gira 2 h · 1 servicio c/u",
  },
  {
    key: "concierto",
    label: "Conciertos",
    shortLabel: "Conc.",
    title: "Conciertos · 1 servicio c/u",
  },
  {
    key: "didactico",
    label: "Didácticos",
    shortLabel: "Didác.",
    title: "Conciertos didácticos · ½ servicio c/u",
  },
  {
    key: "total",
    label: "Total",
    shortLabel: "Total",
    title: "Total de servicios",
  },
];

export function emptyServiceBuckets() {
  return {
    ensayo_ensamble: { counted: 0, reemplazo: 0, licencia: 0 },
    ensayo_gira_half: { counted: 0, reemplazo: 0, licencia: 0 },
    ensayo_gira_full: { counted: 0, reemplazo: 0, licencia: 0 },
    concierto: { counted: 0, reemplazo: 0, licencia: 0 },
    didactico: { counted: 0, reemplazo: 0, licencia: 0 },
  };
}

export function bucketTotal(bucket) {
  if (!bucket) return 0;
  return (
    Number(bucket.counted || 0) +
    Number(bucket.reemplazo || 0) +
    Number(bucket.licencia || 0)
  );
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

/**
 * Clasifica un evento y su valor de servicio (sin resolver convocatoria).
 * @returns {{ kind: ServicioKind, value: number } | null}
 */
export function classifyServicioEvent(evt) {
  if (!evt || evt.is_deleted || evt.tecnica) return null;
  const tipo = Number(evt.id_tipo_evento);
  if (tipo === ID_TIPO_ENSAYO_ENSAMBLE) {
    return { kind: "ensayo_ensamble", value: 1 };
  }
  if (tipo === ID_TIPO_CONCIERTO) {
    if (evt.es_didactico) return { kind: "didactico", value: 0.5 };
    return { kind: "concierto", value: 1 };
  }
  if (tipo === ID_TIPO_ENSAYO_GIRA || tipo === ID_TIPO_ENSAYO_GENERAL) {
    const mins = eventDurationMinutes(evt);
    if (mins == null) return null;
    if (mins >= ENSAYO_GIRA_FULL_MIN_MINUTES) {
      return { kind: "ensayo_gira_full", value: 1 };
    }
    if (mins >= ENSAYO_GIRA_HALF_MIN_MINUTES) {
      return { kind: "ensayo_gira_half", value: 0.5 };
    }
    return null;
  }
  return null;
}

/**
 * ¿La fecha del evento entra en la ventana del informe (misma idea que la matriz)?
 */
export function eventInReportDateWindow(fechaStr, { showPastInYear, today = new Date() } = {}) {
  if (!fechaStr) return false;
  let fd;
  try {
    fd = startOfDay(parseISO(String(fechaStr).slice(0, 10)));
  } catch {
    return false;
  }
  if (Number.isNaN(fd.getTime())) return false;
  const todayStart = startOfDay(today);
  const currentYear = todayStart.getFullYear();
  if (fd >= todayStart) return true;
  if (showPastInYear && fd < todayStart && fd.getFullYear() === currentYear) {
    return true;
  }
  return false;
}

/**
 * Mapa id_grupo → Set&lt;integranteKey&gt;
 */
export function buildGrupoMembersMap(grupoMembershipRows = []) {
  const map = new Map();
  for (const row of grupoMembershipRows) {
    const gid = Number(row.id_grupo);
    const iid = integranteKey(row.id_integrante);
    if (!Number.isFinite(gid) || !iid) continue;
    if (!map.has(gid)) map.set(gid, new Set());
    map.get(gid).add(iid);
  }
  return map;
}

export function integranteInEventGrupos(evt, integranteId, grupoMembersMap) {
  const grupos = evt?.eventos_grupos || [];
  if (!grupos.length) return true;
  const iid = integranteKey(integranteId);
  if (!iid) return false;
  return grupos.some((eg) => {
    const gid = Number(eg.id_grupo ?? eg.giras_grupos?.id);
    if (!Number.isFinite(gid)) return false;
    return grupoMembersMap.get(gid)?.has(iid);
  });
}

/**
 * @param {object} evt
 * @param {string|number} integranteId
 * @param {object} ctx
 * @returns {{ kind: ServicioKind, value: number, mark: ServicioMark } | null}
 */
export function resolveServicioForIntegrante(evt, integranteId, ctx) {
  const classified = classifyServicioEvent(evt);
  if (!classified) return null;

  const {
    rosterByGiraId = {},
    memberships = [],
    customByEventId = new Map(),
    grupoMembersMap = new Map(),
    draftGiraIds = new Set(),
    filteredProgramIds = null,
  } = ctx;

  const iid = integranteKey(integranteId);
  if (!iid) return null;

  if (classified.kind === "ensayo_ensamble") {
    if (evt.id_gira != null && draftGiraIds.has(evt.id_gira)) return null;
    if (
      !isIntegranteConvocadoEnsayoMulti(
        evt,
        iid,
        memberships,
        customByEventId,
      )
    ) {
      return null;
    }
    return { ...classified, mark: "counted" };
  }

  const giraId = evt.id_gira;
  if (giraId == null) return null;
  if (draftGiraIds.has(giraId)) return null;
  if (
    filteredProgramIds instanceof Set &&
    !filteredProgramIds.has(giraId)
  ) {
    return null;
  }

  const mark = getAsistenciaMatrixCellMark(rosterByGiraId[giraId], iid);
  if (mark !== "counted" && mark !== "reemplazo" && mark !== "licencia") {
    return null;
  }
  if (!integranteInEventGrupos(evt, iid, grupoMembersMap)) return null;

  return { ...classified, mark };
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
 * Acumula servicios de un integrante sobre la lista de eventos.
 */
export function accumulateServiciosForIntegrante(integranteId, events, ctx) {
  const buckets = emptyServiceBuckets();
  for (const evt of events || []) {
    if (!eventInReportDateWindow(evt.fecha, ctx)) continue;
    const hit = resolveServicioForIntegrante(evt, integranteId, ctx);
    if (!hit) continue;
    addToBucket(buckets, hit.kind, hit.mark, hit.value);
  }
  return withTotalBucket(buckets);
}

export function withTotalBucket(buckets) {
  const total = { counted: 0, reemplazo: 0, licencia: 0 };
  for (const key of Object.keys(buckets)) {
    if (key === "total") continue;
    const b = buckets[key];
    total.counted += Number(b.counted || 0);
    total.reemplazo += Number(b.reemplazo || 0);
    total.licencia += Number(b.licencia || 0);
  }
  return { ...buckets, total };
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
  return withTotalBucket(acc);
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
  // Solo R sin base: mostrar número en celeste sin "+"
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

/**
 * Convocatoria a ensayo de ensamble (tipo 13), multi-integrante.
 * Misma semántica que `isIntegranteConvocadoToEnsayo` en girasYearSummary.
 */
export function isIntegranteConvocadoEnsayoMulti(
  evt,
  integranteId,
  memberships,
  customByEventId,
) {
  if (!evt || evt.is_deleted) return false;
  if (Number(evt.id_tipo_evento) !== ID_TIPO_ENSAYO_ENSAMBLE) return false;
  if (evt.tecnica) return false;

  const uid = integranteKey(integranteId);
  if (!uid) return false;

  const custom = customByEventId?.get(evt.id)?.get(uid);
  if (custom?.tipo === "ausente") return false;
  if (custom?.tipo === "invitado" || custom?.tipo === "adicional") return true;

  const ensambleIds = (evt.eventos_ensambles || [])
    .map((row) => Number(row.id_ensamble))
    .filter(Number.isFinite);
  if (!ensambleIds.length) return false;

  const myMemberships = (memberships || []).filter(
    (m) => integranteKey(m.id_integrante) === uid,
  );

  return ensambleIds.some((ensId) => {
    const mem = myMemberships.find(
      (m) => Number(m.id_ensamble) === ensId,
    );
    if (!mem) return false;
    return membershipActiveOnProgramDate(mem, evt.fecha);
  });
}
