import {
  boardingMetricsForEventRow,
  formatEventLocation,
  isVehiclePauseBetweenStops,
  nextAssignedStopInVehicleSequence,
  previousAssignedStopInVehicleSequence,
  resolveStopBoardAlightChips,
  TRANSPORT_DESTINO_SIN_LOCACION,
  TRANSPORT_DESTINO_SIN_SIGUIENTE,
} from "./fimbaTransportBoarding";
import { buildMovimientosIntermediosDefaults } from "./fimbaDestinoStopCreate";
import {
  giraTransporteIdsFromEvent,
  isFimbaActividadConVehiculo,
  labelGiraTransporte,
} from "../services/fimbaService";
import { isFimbaPendingCreateEvent } from "./fimbaProgramarTransporte";
import { fimbaTipoRowTintStyle } from "./fimbaEventCategories";

function sliceTime(t) {
  if (!t) return "—";
  return String(t).slice(0, 5);
}

/**
 * View-model de una fila de planilla Transportes (desktop + cards móvil).
 * Misma fuente que el map de `FimbaTransportPage` (boarding, pausas, chips).
 */
export function buildTransportRowView(ev, idx, ctx) {
  const {
    eventosFiltrados = [],
    vehiculos = [],
    sequencesByVehicle,
    preferVehicleIdsForMetrics,
    showVehiclePauses = false,
    propuestaRoutes,
    propuestas,
    ofrnRouteRules,
    ofrnPassengers,
    ofrnLocalities,
    ofrnRegions,
    giraGrupos,
    eventByIdForBoarding,
    tipoById,
    creatingIntermediateFromId = null,
    deletingEventId = null,
    highlightEventIds = [],
    readOnly = false,
  } = ctx;

  const dayKey = String(ev.fecha || "").slice(0, 10);
  const prevDayKey =
    idx > 0
      ? String(eventosFiltrados[idx - 1]?.fecha || "").slice(0, 10)
      : "";
  const showDayDivider = idx > 0 && dayKey !== prevDayKey;
  const isContext = Boolean(ev.es_contexto_agenda);
  const ofrnVeh =
    vehiculos.find((g) => Number(g.id) === Number(ev.id_gira_transporte)) ||
    null;
  const vehLabel = isContext
    ? "—"
    : (ev.vehiculos || []).length > 0
      ? (ev.vehiculos || [])
          .map((r) => {
            const label = labelGiraTransporte(r.giras_transportes);
            const pl = Math.max(0, Number(r.plazas) || 0);
            return pl > 0 ? `${label} (reserva ${pl})` : label;
          })
          .join(", ") || "—"
      : ofrnVeh
        ? labelGiraTransporte(ofrnVeh)
        : ev.es_ofrn && !ev.es_fimba
          ? "—"
          : "SIN SERVICIO";
  const metrics = isContext
    ? {
        primary: null,
        perVehicle: [],
        location: formatEventLocation(ev),
        destino_siguiente: null,
        hora_fin_display: {
          value: ev.hora_fin ? String(ev.hora_fin).slice(0, 5) : null,
          isCalculated: false,
        },
        next_event: null,
      }
    : boardingMetricsForEventRow(ev, sequencesByVehicle, preferVehicleIdsForMetrics, {
        enablePause: showVehiclePauses,
      });
  const stop = metrics.primary?.stop || null;
  const multiVeh = (metrics.perVehicle || []).filter((p) => p.stop).length > 1;
  const locacion = metrics.location || formatEventLocation(ev);
  const destinoSiguiente = isContext
    ? "—"
    : metrics.destino_siguiente != null && metrics.destino_siguiente !== "—"
      ? metrics.destino_siguiente
      : TRANSPORT_DESTINO_SIN_SIGUIENTE;
  const horaFinDisp = metrics.hora_fin_display || {
    value: null,
    isCalculated: false,
  };
  const enTransito = stop?.en_transito;
  const cap = stop?.capacidad;
  const libres = stop?.libres;
  const overbook = Boolean(stop?.overbook);
  const isActividadVehiculo = !isContext && isFimbaActividadConVehiculo(ev);
  const rowClass = isContext
    ? "fimba-row-contexto"
    : isActividadVehiculo
      ? "fimba-row-actividad-vehiculo"
      : ev.origen === "ofrn"
        ? "fimba-row-ofrn"
        : ev.origen === "ambos"
          ? "fimba-row-ambos"
          : "";
  const tipoTint =
    isActividadVehiculo && !isContext
      ? fimbaTipoRowTintStyle(ev.tipo_color)
      : undefined;
  const canEditStops =
    !readOnly &&
    !isContext &&
    (giraTransporteIdsFromEvent(ev).length > 0 || vehiculos.length > 0);
  const primaryVehicleId =
    metrics.primary?.id_gira_transporte ??
    metrics.perVehicle?.[0]?.id_gira_transporte ??
    giraTransporteIdsFromEvent(ev)[0] ??
    null;
  const upsBoard = isContext
    ? { chips: [], total: 0 }
    : resolveStopBoardAlightChips({
        eventId: ev.id,
        idGiraTransporte: primaryVehicleId,
        type: "up",
        propuestaRoutes,
        propuestas,
        stop,
        ofrnRouteRules,
        ofrnPassengers,
        ofrnLocalities,
        ofrnRegions,
        giraGrupos,
        eventById: eventByIdForBoarding,
        tipoById,
      });
  const downsBoard = isContext
    ? { chips: [], total: 0 }
    : resolveStopBoardAlightChips({
        eventId: ev.id,
        idGiraTransporte: primaryVehicleId,
        type: "down",
        propuestaRoutes,
        propuestas,
        stop,
        ofrnRouteRules,
        ofrnPassengers,
        ofrnLocalities,
        ofrnRegions,
        giraGrupos,
        eventById: eventByIdForBoarding,
        tipoById,
      });
  const isCreatingIntermediateHere =
    creatingIntermediateFromId != null &&
    creatingIntermediateFromId === String(ev.id);
  const canAddIntermediate =
    !readOnly &&
    !isContext &&
    creatingIntermediateFromId == null &&
    primaryVehicleId != null &&
    primaryVehicleId !== "";
  const nextEvForRow = metrics?.next_event_raw || metrics?.next_event || null;
  const pauseAfterRow = showVehiclePauses && Boolean(metrics?.pause_after);
  const pausePrevEv =
    showVehiclePauses &&
    !isContext &&
    (() => {
      const vid = Number(primaryVehicleId);
      if (!Number.isFinite(vid)) return null;
      const seq = sequencesByVehicle.get(vid);
      return previousAssignedStopInVehicleSequence(seq, ev.id, vid);
    })();
  const prevStopForVehicle = (() => {
    if (isContext) return null;
    const vid = Number(primaryVehicleId);
    if (!Number.isFinite(vid)) return null;
    const seq = sequencesByVehicle.get(vid);
    return previousAssignedStopInVehicleSequence(seq, ev.id, vid);
  })();
  const nextStopForVehicle = (() => {
    if (isContext) return null;
    const vid = Number(primaryVehicleId);
    if (!Number.isFinite(vid)) return null;
    const seq = sequencesByVehicle.get(vid);
    return nextAssignedStopInVehicleSequence(seq, ev.id, vid);
  })();
  const movimientosDefaults = !isContext
    ? buildMovimientosIntermediosDefaults(ev, prevStopForVehicle, {
        horaFinHint: ev?.hora_fin ? String(ev.hora_fin).slice(0, 5) : null,
        horaFinFecha: ev?.hora_fin ? String(ev.fecha || "").slice(0, 10) : null,
        nextEv: nextStopForVehicle || null,
      })
    : { ok: false, reason: "no_prev" };
  const movimientosDisabledReason = (() => {
    if (!movimientosDefaults || movimientosDefaults.ok) {
      return null;
    }
    const map = {
      no_prev: "Sin parada anterior en este vehículo",
      no_prev_loc: "La parada anterior no tiene locación",
      no_anchor_loc: "Este evento no tiene locación de catálogo",
      same_loc:
        "Misma locación que la anterior (usá recorrido intermedio en la pausa)",
      no_gap:
        "No hay hueco horario entre la anterior/siguiente para ida y vuelta",
    };
    return map[movimientosDefaults.reason] || "No se pueden crear movimientos";
  })();
  const warnInterveningMovimientos = (() => {
    if (!prevStopForVehicle?.id || !primaryVehicleId) {
      return false;
    }
    const vid = Number(primaryVehicleId);
    const seq = sequencesByVehicle.get(vid);
    const immediateNext = nextAssignedStopInVehicleSequence(
      seq,
      prevStopForVehicle.id,
      vid,
    );
    return immediateNext != null && String(immediateNext.id) !== String(ev.id);
  })();
  const pauseBeforeRow =
    showVehiclePauses &&
    Boolean(pausePrevEv) &&
    (() => {
      const vid = Number(primaryVehicleId);
      if (!Number.isFinite(vid)) return false;
      if (isVehiclePauseBetweenStops(pausePrevEv, ev)) {
        return true;
      }
      const prevMetrics = boardingMetricsForEventRow(
        pausePrevEv,
        sequencesByVehicle,
        [vid],
        { enablePause: true },
      );
      return Boolean(prevMetrics?.pause_after);
    })();
  const pauseActionKeyTop = pausePrevEv ? `pause-top:${pausePrevEv.id}` : null;
  const pauseActionKeyBottom = `pause-bottom:${ev.id}`;
  const isCreatingPauseTop =
    creatingIntermediateFromId != null &&
    creatingIntermediateFromId === pauseActionKeyTop;
  const isCreatingPauseBottom =
    creatingIntermediateFromId != null &&
    creatingIntermediateFromId === pauseActionKeyBottom;
  const canPauseCreate =
    !readOnly &&
    pauseBeforeRow &&
    pausePrevEv &&
    primaryVehicleId != null &&
    primaryVehicleId !== "" &&
    creatingIntermediateFromId == null;
  const nextEvHasRealStop = Boolean(nextEvForRow);
  const horaCom = sliceTime(ev.hora_inicio);
  const aBordo = stop?.a_bordo || null;
  const isPendingCreate = isFimbaPendingCreateEvent(ev);
  const isHighlighted = highlightEventIds.some(
    (id) => String(id) === String(ev.id),
  );
  const isDeletingRow =
    deletingEventId != null && deletingEventId === String(ev.id);
  const destinoIsPlaceholder =
    destinoSiguiente === TRANSPORT_DESTINO_SIN_SIGUIENTE ||
    destinoSiguiente === TRANSPORT_DESTINO_SIN_LOCACION;

  return {
    ev,
    idx,
    dayKey,
    showDayDivider,
    isContext,
    vehLabel,
    metrics,
    stop,
    multiVeh,
    locacion,
    destinoSiguiente,
    destinoIsPlaceholder,
    horaFinDisp,
    enTransito,
    cap,
    libres,
    overbook,
    isActividadVehiculo,
    rowClass,
    tipoTint,
    canEditStops,
    primaryVehicleId,
    upsBoard,
    downsBoard,
    isCreatingIntermediateHere,
    canAddIntermediate,
    nextEvForRow,
    pauseAfterRow,
    pausePrevEv,
    prevStopForVehicle,
    nextStopForVehicle,
    movimientosDisabledReason,
    warnInterveningMovimientos,
    pauseBeforeRow,
    pauseActionKeyTop,
    pauseActionKeyBottom,
    isCreatingPauseTop,
    isCreatingPauseBottom,
    canPauseCreate,
    nextEvHasRealStop,
    horaCom,
    aBordo,
    isPendingCreate,
    isHighlighted,
    isDeletingRow,
  };
}
