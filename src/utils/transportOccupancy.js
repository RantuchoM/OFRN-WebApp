import { matchesRule } from "./giraUtils";
import {
  personWithViaticosAsResidence,
  viaticosDiffersFromResidencia,
} from "./integranteDomicilioViaticos";

function hasEndpointId(value) {
  return value != null && String(value).trim() !== "";
}

export function isInternalTransportCategoria(categoria) {
  return String(categoria || "PASAJEROS").toUpperCase() === "INTERNO";
}

export function getPersonTransportRide(person, transportId) {
  if (person == null || transportId == null) return null;
  return (
    (person.logistics?.transports || []).find(
      (tr) => String(tr.id) === String(transportId),
    ) || null
  );
}

/** Ride cerrado: tiene ↑ y ↓ resueltos en este vehículo. */
export function personHasCompleteRideOnTransport(person, transportId) {
  const ride = getPersonTransportRide(person, transportId);
  return Boolean(
    ride && hasEndpointId(ride.subidaId) && hasEndpointId(ride.bajadaId),
  );
}

function personMatchesRouteRule(rule, person, localities) {
  if (matchesRule(rule, person, localities)) return true;
  if (!viaticosDiffersFromResidencia(person)) return false;
  return matchesRule(rule, personWithViaticosAsResidence(person), localities);
}

/**
 * Traslado interno: ocupa plaza solo si sube y baja en este vehículo.
 * 1) Ride logístico con subidaId + bajadaId, o
 * 2) Matchea al menos una regla ↑ y una ↓ (incluye inf. viáticos ≠ residencia).
 * No cambia el ranker de admisión; es conteo de ocupación / listado.
 */
export function personHasInternoBoardAndAlight({
  person,
  transportId,
  routeRules = [],
  localities = [],
}) {
  if (personHasCompleteRideOnTransport(person, transportId)) return true;

  const rules = (routeRules || []).filter(
    (r) => String(r.id_transporte_fisico) === String(transportId),
  );
  if (rules.length === 0) return false;

  const hasUp = rules.some(
    (r) =>
      hasEndpointId(r.id_evento_subida) &&
      personMatchesRouteRule(r, person, localities),
  );
  const hasDown = rules.some(
    (r) =>
      hasEndpointId(r.id_evento_bajada) &&
      personMatchesRouteRule(r, person, localities),
  );
  return hasUp && hasDown;
}

/**
 * Pasajeros que ocupan el vehículo (y el cuadro de firmas).
 * PASAJEROS / LOGISTICO: admitidos (`logistics.transports`).
 * INTERNO: solo quienes tienen ↑ y ↓ en este viaje — no toda la orquesta
 * (la categoría admite a todos los no ausentes para visibilidad de agenda).
 * `pasajeros_ids` no se usa: en INTERNO inflaría al roster completo.
 */
export function getTransportOccupancyPassengers({
  passengerList = [],
  transport,
  routeRules = [],
  localities = [],
}) {
  if (!transport) return [];
  const tid = transport.id;
  const admitted = (passengerList || []).filter((p) => {
    if (p?.estado_gira === "ausente" || p?.estado_gira === "baja") return false;
    return Boolean(getPersonTransportRide(p, tid));
  });

  if (!isInternalTransportCategoria(transport.categoria_logistica)) {
    return admitted;
  }

  return admitted.filter((p) =>
    personHasInternoBoardAndAlight({
      person: p,
      transportId: tid,
      routeRules,
      localities,
    }),
  );
}

export function countTransportOccupancySeats(passengers = []) {
  const people = passengers.length;
  const instruments = passengers.filter((p) =>
    Boolean(p?.instrumentos?.plaza_extra),
  ).length;
  return { people, instruments, butacas: people + instruments };
}

export function formatTransportOccupancyLabel(
  { people, instruments, butacas },
  { maxCap = 0, compact = false } = {},
) {
  if (compact) {
    return instruments > 0
      ? `${people}+${instruments}=${butacas}${maxCap > 0 ? `/${maxCap}` : ""}`
      : `${people}${maxCap > 0 ? `/${maxCap}` : ""} pax`;
  }
  const body =
    instruments > 0
      ? `${people} + ${instruments} ins = ${butacas}`
      : `${String(people)}`;
  return `${body} butacas${maxCap > 0 ? ` / ${maxCap}` : ""}`;
}
