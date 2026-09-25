/** ¿El vehículo de catálogo / join de logística es oficial (flota OFRN)? */
export function isTransporteOficial(source) {
  if (!source) return false;
  if (source.es_oficial === true) return true;
  if (source.transportes?.es_oficial === true) return true;
  if (source.transporteData?.es_oficial === true) return true;
  return false;
}

/**
 * Check de "vehículo oficial" en viáticos/destaques.
 * Si el transporte asignado es oficial, el PDF se tilda aunque el stored esté en false.
 */
export function resolveCheckPatenteOficial(stored, esOficial) {
  return Boolean(stored) || Boolean(esOficial);
}

const trimPatente = (value) => String(value ?? "").trim();

/** Patente de una unidad: catálogo, override de gira o join de logística. */
export function pickPatenteFromTransport(transport) {
  if (!transport) return "";
  return (
    trimPatente(transport.patente) ||
    trimPatente(transport.transportes?.patente) ||
    trimPatente(transport.transporteData?.patente)
  );
}

/**
 * Patente oficial para PDF/Excel: misma prioridad que la tabla de viáticos.
 * Override guardado → logística de la fila (primera ↑) → travel del lote → cualquier bus del integrante.
 */
export function resolvePatenteOficialValue({
  stored,
  logisticsPatente,
  travelPatente,
  transports = [],
} = {}) {
  const fromTransports = (Array.isArray(transports) ? transports : [])
    .map(pickPatenteFromTransport)
    .find(Boolean);
  for (const candidate of [stored, logisticsPatente, travelPatente, fromTransports]) {
    const value = trimPatente(candidate);
    if (value) return value;
  }
  return "";
}
