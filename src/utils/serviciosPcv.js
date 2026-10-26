/**
 * Giras en casa / fuera + PCV (Prestaciones Complementarias por Viáticos)
 * para el listado Gestión → Prestaciones.
 *
 * Solo tipas Sinfónico, Camerata Filarmónica y Jazz Band.
 * Programas tipo Ensamble / Comisión no entran en Fuera / En casa / PCV.
 *
 * Casa/fuera/mixta enteros: `giraTramoPesos` con localidad efectiva de viáticos.
 * PCV: días computables (`calculateDaysDiff`) por tramo fuera de casa.
 * Conciertos (incl. didácticos): paréntesis en Fuera/En casa + columna ensamble.
 */
import { integranteKey } from "./integranteIds";
import { resolveLocalidadEfectivaViaticos } from "./integranteDomicilioViaticos";
import { isProgramBorrador } from "./girasYearSummary";
import {
  TIPOS_GIRA_INFORME_ENSAMBLE,
  giraTramoPesos,
  isGiraFueraDeCasa,
  programLocalidadLabels,
} from "./serviciosEnsambleReport";
import {
  eventGrupoIdsFromEvent,
  personPassesEventoGrupos,
} from "../services/giraGruposService";
import {
  classifyServicioEvent,
  eventInReportDateWindow,
} from "./serviciosCantidad";
import { calculateDaysDiff } from "./viaticosDiasComputables";

const TIPOS_GIRA_COLUMNAS = new Set([
  ...TIPOS_GIRA_INFORME_ENSAMBLE,
  "Jazz Band",
]);

export function isProgramaGiraParaColumnas(program) {
  return TIPOS_GIRA_COLUMNAS.has(program?.tipo || "");
}

function segmentLocalidadIds(segment) {
  const ids = [];
  for (const row of segment?.giras_tramo_localidades || []) {
    const id = Number(row?.id_localidad ?? row?.localidades?.id);
    if (Number.isFinite(id) && id > 0) ids.push(id);
  }
  return [...new Set(ids)];
}

function rosterMarkOf(rosterEntry, iid) {
  if (!iid || !rosterEntry) return null;
  if (rosterEntry.reemplazo?.has(iid)) return "reemplazo";
  if (rosterEntry.licencia?.has(iid)) return "licencia";
  if (rosterEntry.counted?.has(iid)) return "counted";
  return null;
}

function rosterMarkCounts(mark) {
  return mark === "counted" || mark === "reemplazo" || mark === "licencia";
}

/** ¿El concierto cae en tramo fuera de la localidad de viáticos? */
export function concertIsFueraDeCasa(program, homeLocalidadId, fecha) {
  const home = Number(homeLocalidadId);
  const day = String(fecha || "").slice(0, 10);
  const homeProxy = { id_localidad: home };
  const withLocs = [...(program?.giras_tramo_segmentos || [])]
    .sort((a, b) => Number(a?.indice) - Number(b?.indice))
    .map((seg) => ({
      seg,
      ids: segmentLocalidadIds(seg),
    }))
    .filter((row) => row.ids.length > 0);

  if (withLocs.length < 2 || !Number.isFinite(home) || home <= 0) {
    return isGiraFueraDeCasa(program, homeProxy);
  }

  let matchIds = null;
  for (const { seg, ids } of withLocs) {
    const desde = String(seg?.fecha_desde || program?.fecha_desde || "").slice(
      0,
      10,
    );
    const hasta = String(
      seg?.fecha_hasta || program?.fecha_hasta || desde,
    ).slice(0, 10);
    if (!desde || !day) continue;
    if (day >= desde && day <= hasta) {
      matchIds = ids;
      break;
    }
  }
  if (!matchIds) return isGiraFueraDeCasa(program, homeProxy);
  return !matchIds.includes(home);
}

function isConcertLikeHit(classified) {
  return (
    classified?.kind === "concierto" || classified?.kind === "didactico"
  );
}

function sliceTime(value) {
  if (!value) return null;
  return String(value).slice(0, 5);
}

function compareEventChrono(a, b) {
  const fa = String(a?.fecha || "");
  const fb = String(b?.fecha || "");
  if (fa !== fb) return fa.localeCompare(fb);
  return String(a?.hora_inicio || a?.hora || "").localeCompare(
    String(b?.hora_inicio || b?.hora || ""),
  );
}

function programLabel(program) {
  const nom = String(program?.nomenclador || "").trim();
  const name = String(program?.nombre_gira || "").trim();
  const joined = [nom, name].filter(Boolean).join(" ");
  return joined || `Programa ${program?.id ?? "?"}`;
}

/**
 * Ventana salida/llegada en un rango de fechas, usando eventos de transporte
 * de la gira si hay; si no, mediodía (mismo default que viáticos).
 */
export function travelWindowForDateRange(fechaDesde, fechaHasta, transportEvents) {
  const desde = String(fechaDesde || "").slice(0, 10);
  const hasta = String(fechaHasta || fechaDesde || "").slice(0, 10);
  if (!desde || !hasta) {
    return {
      fecha_salida: null,
      hora_salida: null,
      fecha_llegada: null,
      hora_llegada: null,
      fromTransport: false,
    };
  }
  const inRange = (transportEvents || []).filter((evt) => {
    const f = String(evt?.fecha || "").slice(0, 10);
    return f && f >= desde && f <= hasta;
  });
  if (!inRange.length) {
    return {
      fecha_salida: desde,
      hora_salida: "12:00",
      fecha_llegada: hasta,
      hora_llegada: "12:00",
      fromTransport: false,
    };
  }
  const sorted = [...inRange].sort(compareEventChrono);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return {
    fecha_salida: String(first.fecha).slice(0, 10),
    hora_salida: sliceTime(first.hora_inicio || first.hora) || "12:00",
    fecha_llegada: String(last.fecha).slice(0, 10),
    hora_llegada: sliceTime(last.hora_inicio || last.hora) || "12:00",
    fromTransport: true,
  };
}

/**
 * Ventanas PCV de una gira (solo tramos fuera). Incluye metadatos para el detalle.
 */
export function pcvWindowsForProgram(program, homeLocalidadId, transportEvents) {
  const home = Number(homeLocalidadId);
  const windows = [];
  if (!Number.isFinite(home) || home <= 0) return windows;

  const withLocs = [...(program?.giras_tramo_segmentos || [])]
    .sort((a, b) => Number(a?.indice) - Number(b?.indice))
    .map((seg) => ({
      seg,
      ids: segmentLocalidadIds(seg),
    }))
    .filter((row) => row.ids.length > 0);

  const pushWindow = (fechaDesde, fechaHasta, { tramoLabel, localidades }) => {
    const win = travelWindowForDateRange(
      fechaDesde,
      fechaHasta,
      transportEvents,
    );
    const dias = calculateDaysDiff(
      win.fecha_salida,
      win.hora_salida,
      win.fecha_llegada,
      win.hora_llegada,
    );
    if (!(dias > 0)) return;
    windows.push({
      programId: program?.id ?? null,
      programLabel: programLabel(program),
      tipo: program?.tipo || "",
      tramoLabel: tramoLabel || "",
      localidades: localidades || "",
      fecha_salida: win.fecha_salida,
      hora_salida: win.hora_salida,
      fecha_llegada: win.fecha_llegada,
      hora_llegada: win.hora_llegada,
      fromTransport: win.fromTransport,
      dias,
    });
  };

  if (withLocs.length < 2) {
    if (!isGiraFueraDeCasa(program, { id_localidad: home })) return windows;
    pushWindow(program?.fecha_desde, program?.fecha_hasta || program?.fecha_desde, {
      tramoLabel: "Gira completa",
      localidades: (programLocalidadLabels(program) || []).join(", "),
    });
    return windows;
  }

  for (const { seg, ids } of withLocs) {
    if (ids.includes(home)) continue;
    const desde = seg?.fecha_desde || program?.fecha_desde;
    const hasta = seg?.fecha_hasta || program?.fecha_hasta || desde;
    if (!desde) continue;
    const idx = Number(seg?.indice);
    const locNames = (seg?.giras_tramo_localidades || [])
      .map((r) => String(r?.localidades?.localidad || "").trim())
      .filter(Boolean);
    pushWindow(desde, hasta, {
      tramoLabel: Number.isFinite(idx) ? `Tramo ${idx + 1}` : "Tramo",
      localidades: locNames.join(", "),
    });
  }
  return windows;
}

/** @deprecated usar pcvWindowsForProgram + sum; se mantiene por compat. */
export function pcvDaysForProgram(program, homeLocalidadId, transportEvents) {
  return pcvWindowsForProgram(program, homeLocalidadId, transportEvents).reduce(
    (acc, w) => acc + (Number(w.dias) || 0),
    0,
  );
}

/**
 * @returns {{
 *   girasFuera: number,
 *   girasEnCasa: number,
 *   girasMixtas: number,
 *   conciertosFuera: number,
 *   conciertosEnCasa: number,
 *   conciertosEnsamble: number,
 *   pcv: number,
 *   girasDetalle: object[],
 *   pcvDetalle: object[],
 * }}
 */
export function computeIntegranteGirasYPcv(
  integrante,
  {
    programs,
    rosterByGiraId,
    transportEventsByGiraId,
    events,
    fechaDesde,
    fechaHasta,
    giraIdFilter = null,
    integranteGrupoIdsByGiraId = null,
  } = {},
) {
  const iid = integranteKey(integrante?.id);
  const homeLoc = resolveLocalidadEfectivaViaticos(integrante);
  const homeId = homeLoc.id;
  const homeProxy = { id_localidad: homeId };
  const programsById = new Map();
  for (const p of programs || []) {
    if (p?.id == null) continue;
    programsById.set(Number(p.id), p);
    programsById.set(p.id, p);
  }

  let girasFuera = 0;
  let girasEnCasa = 0;
  let girasMixtas = 0;
  let pcv = 0;
  const girasDetalle = [];
  const pcvDetalle = [];

  for (const program of programs || []) {
    if (!isProgramaGiraParaColumnas(program)) continue;

    const gid = Number(program?.id);
    const roster =
      rosterByGiraId?.[program?.id] ||
      rosterByGiraId?.[gid] ||
      rosterByGiraId?.[String(program?.id)];
    const mark = rosterMarkOf(roster, iid);
    if (!rosterMarkCounts(mark)) continue;

    const pesos = giraTramoPesos(program, homeProxy);
    const pesoFuera = Number(pesos.pesoFuera) || 0;
    const pesoEnCasa = Number(pesos.pesoEnCasa) || 0;
    const pesoMixta = Number(pesos.pesoMixta) || 0;
    girasFuera += pesoFuera;
    girasEnCasa += pesoEnCasa;
    girasMixtas += pesoMixta;

    const transportEvents =
      transportEventsByGiraId?.get?.(gid) ||
      transportEventsByGiraId?.[gid] ||
      [];
    const windows = pcvWindowsForProgram(program, homeId, transportEvents);
    const pcvGira = windows.reduce((acc, w) => acc + (Number(w.dias) || 0), 0);
    pcv += pcvGira;
    for (const w of windows) pcvDetalle.push(w);

    girasDetalle.push({
      programId: program.id,
      label: programLabel(program),
      tipo: program.tipo || "",
      zona: String(program.zona || "").trim(),
      fechaDesde: program.fecha_desde || "",
      fechaHasta: program.fecha_hasta || "",
      pesoFuera,
      pesoEnCasa,
      pesoMixta,
      kind: pesos.kind || null,
      tramoCount: pesos.tramoCount,
      tramosFuera: pesos.tramosFuera,
      pcv: pcvGira,
      mark,
    });
  }

  let conciertosFuera = 0;
  let conciertosEnCasa = 0;
  let conciertosEnsamble = 0;
  const giraFilter =
    giraIdFilter != null && giraIdFilter !== ""
      ? Number(giraIdFilter)
      : null;

  for (const evt of events || []) {
    if (!eventInReportDateWindow(evt.fecha, { fechaDesde, fechaHasta })) {
      continue;
    }
    const classified = classifyServicioEvent(evt);
    if (!isConcertLikeHit(classified)) continue;

    const giraId = evt?.id_gira;
    if (giraId == null) continue;
    if (Number.isFinite(giraFilter) && Number(giraId) !== giraFilter) continue;

    const program =
      programsById.get(Number(giraId)) ||
      programsById.get(giraId) ||
      programsById.get(String(giraId));
    if (!program || isProgramBorrador(program)) continue;

    const roster =
      rosterByGiraId?.[program?.id] ||
      rosterByGiraId?.[Number(giraId)] ||
      rosterByGiraId?.[giraId] ||
      rosterByGiraId?.[String(giraId)];
    const mark = rosterMarkOf(roster, iid);
    if (!rosterMarkCounts(mark)) continue;

    const eventoGrupoIds = eventGrupoIdsFromEvent(evt);
    if (eventoGrupoIds.length) {
      const byGira =
        integranteGrupoIdsByGiraId?.get?.(Number(giraId)) ||
        integranteGrupoIdsByGiraId?.get?.(giraId);
      const personGrupos = byGira?.get?.(iid) || byGira?.get?.(String(iid));
      if (!personPassesEventoGrupos(iid, eventoGrupoIds, personGrupos)) {
        continue;
      }
    }

    const tipo = program.tipo || "";
    if (tipo === "Ensamble") {
      conciertosEnsamble += 1;
      continue;
    }
    if (!isProgramaGiraParaColumnas(program)) continue;

    if (concertIsFueraDeCasa(program, homeId, evt.fecha)) {
      conciertosFuera += 1;
    } else {
      conciertosEnCasa += 1;
    }
  }

  girasDetalle.sort((a, b) =>
    String(a.fechaDesde || "").localeCompare(String(b.fechaDesde || "")),
  );
  pcvDetalle.sort((a, b) => {
    const byProg = String(a.fecha_salida || "").localeCompare(
      String(b.fecha_salida || ""),
    );
    if (byProg !== 0) return byProg;
    return String(a.programLabel || "").localeCompare(
      String(b.programLabel || ""),
      "es",
    );
  });

  return {
    girasFuera,
    girasEnCasa,
    girasMixtas,
    conciertosFuera,
    conciertosEnCasa,
    conciertosEnsamble,
    pcv,
    girasDetalle,
    pcvDetalle,
    homeId: homeId ?? null,
    homeLabel: homeLoc.nombre || "",
  };
}

/**
 * Mapa integranteId → meta (totales + detalle).
 */
export function buildPrestacionesMetaByIntegranteId(
  integrantes,
  {
    programs,
    rosterByGiraId,
    transportEventsByGiraId,
    events,
    fechaDesde,
    fechaHasta,
    giraIdFilter = null,
    integranteGrupoIdsByGiraId = null,
  } = {},
) {
  const map = new Map();
  for (const row of integrantes || []) {
    const iid = integranteKey(row?.id);
    if (!iid) continue;
    map.set(
      iid,
      computeIntegranteGirasYPcv(row, {
        programs,
        rosterByGiraId,
        transportEventsByGiraId,
        events,
        fechaDesde,
        fechaHasta,
        giraIdFilter,
        integranteGrupoIdsByGiraId,
      }),
    );
  }
  return map;
}
