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
