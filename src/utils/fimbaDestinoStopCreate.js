import {
  decodeFimbaTrasladoDescripcion,
  patchFimbaEventoPlanilla,
  saveFimbaEvento,
} from "../services/fimbaService";
import { eventTypeIdForCategoria } from "./giraTransportUtils";
import {
  defaultIntermediateStopSchedule,
  resolveHoraFinDisplay,
} from "./fimbaTransportBoarding";

/**
 * Prefill fecha/hora_inicio para crear parada destino (intermedia o cola).
 * Hora Fin del actual (form o persistida; si vacía, cyan next / midpoint / +30m).
 *
 * @param {object|null|undefined} currentEv
 * @param {object|null|undefined} nextEv
 * @param {string|null|undefined} [horaFinFromForm]
 * @returns {{ fecha: string|null, hora_inicio: string|null }}
 */
export function buildDestinoStopSchedule(currentEv, nextEv, horaFinFromForm) {
  const evForFin =
    horaFinFromForm !== undefined
      ? { ...currentEv, hora_fin: horaFinFromForm || null }
      : currentEv;
  const finDisp = resolveHoraFinDisplay(evForFin, nextEv);
  if (finDisp.value) {
    return {
      fecha: String(currentEv?.fecha || "").slice(0, 10) || null,
      hora_inicio: finDisp.value,
    };
  }
  const fallback = defaultIntermediateStopSchedule(currentEv, nextEv);
  return {
    fecha: fallback.fecha || String(currentEv?.fecha || "").slice(0, 10) || null,
    hora_inicio: fallback.hora_inicio || null,
  };
}

/**
 * Crea parada destino en la secuencia del vehículo y fija hora_fin en la actual.
 * Misma regla que `FimbaDestinoStopModal` / «Elegir destino…».
 *
 * @param {{
 *   currentEv: object,
 *   vehicleId: number|string,
 *   nextEv?: object|null,
 *   fecha: string,
 *   horaInicio: string,
 *   idLocacion: unknown,
 *   actividad?: string,
 *   idGira: number|string,
 *   vehiculos?: Array<object>,
 * }} params
 * @returns {Promise<{ evento: object|null, error: Error|null }>}
 */
export async function createDestinoStopEvent({
  currentEv,
  vehicleId,
  nextEv = null,
  fecha,
  horaInicio,
  idLocacion,
  actividad = "Parada intermedia",
  idGira,
  vehiculos = [],
}) {
  if (vehicleId == null || vehicleId === "") {
    return { evento: null, error: new Error("Esta fila no tiene vehículo asignado") };
  }
  if (!idGira) {
    return { evento: null, error: new Error("Edición sin gira enlazada") };
  }
  if (currentEv?.id == null || currentEv.id === "") {
    return {
      evento: null,
      error: new Error("Guardá el evento actual antes de crear el destino"),
    };
  }
  const fechaVal = String(fecha || currentEv?.fecha || "").slice(0, 10);
  if (!fechaVal) {
    return { evento: null, error: new Error("Fecha no disponible para esta parada") };
  }
  const horaVal = String(horaInicio || "").trim().slice(0, 5);
  if (!horaVal) {
    return {
      evento: null,
      error: new Error("Indicá la hora inicio de la nueva parada (Hora Fin del tramo actual)"),
    };
  }
  if (!idLocacion) {
    return {
      evento: null,
      error: new Error("Elegí el destino (locación de salida de la nueva parada)"),
    };
  }

  const act = String(actividad || "").trim() || "Parada intermedia";
  const gt =
    (vehiculos || []).find((g) => Number(g.id) === Number(vehicleId)) || null;
  const tipoId = eventTypeIdForCategoria(gt?.categoria_logistica);
  const nextHoraFin = nextEv?.hora_inicio
    ? String(nextEv.hora_inicio).slice(0, 5)
    : null;

  const { evento, error: createErr } = await saveFimbaEvento({
    id_gira: Number(idGira),
    fecha: fechaVal,
    hora_inicio: horaVal,
    hora_fin: nextHoraFin,
    actividad: act,
    id_locacion: idLocacion || null,
    observaciones_equipaje: "",
    asientos_equipaje: 0,
    sin_servicio: false,
    usa_transporte: true,
    vehiculos: [
      {
        id_gira_transporte: Number(vehicleId),
        plazas: 0,
      },
    ],
    id_propuestas: [],
    id_tipo_evento: tipoId,
    audiencia_ofrn: "none",
  });

  if (createErr) {
    return {
      evento: null,
      error: createErr instanceof Error ? createErr : new Error(String(createErr)),
    };
  }

  const decoded = decodeFimbaTrasladoDescripcion(currentEv.descripcion, {
    observaciones_equipaje: currentEv.observaciones_equipaje,
  });
  const { error: patchErr } = await patchFimbaEventoPlanilla(currentEv.id, {
    fecha: currentEv.fecha,
    hora_inicio: currentEv.hora_inicio,
    hora_fin: horaVal,
    actividad: decoded.actividad || currentEv.actividad || "",
    vuelo: decoded.vuelo || currentEv.vuelo || "",
    stripDestino: true,
  });

  if (patchErr) {
    return {
      evento,
      error: new Error(
        patchErr.message ||
          "Parada creada, pero no se pudo fijar la hora fin del tramo anterior",
      ),
    };
  }

  return { evento, error: null };
}
