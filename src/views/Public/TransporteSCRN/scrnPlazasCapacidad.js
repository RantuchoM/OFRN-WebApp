/**
 * Reglas de cupo SCRN (solo plazas de pasajeros, adicionales al chofer):
 * - capacidad_max = asientos totales del vehículo (incluye al chofer).
 * - El chofer siempre ocupa 1 asiento, no se cuenta como "plaza de pasajero".
 * - Tope de pasajeros = capacidad_max - 1 (hasta acá se pueden repartir reservas).
 * - plazas_pasajeros (opcional en el recorrido) = límite adicional; nunca supera ese tope.
 */

export function topeTransportePasajeros(transporte) {
  const cap = Math.max(0, Number(transporte?.capacidad_max) || 0);
  return Math.max(0, cap - 1);
}

/**
 * Tope de pasajeros que puede llevar un recorrido (tras reservar chofer y, si aplica, fijar límite por viaje).
 */
export function cupoPasajerosViaje(viaje, transporte) {
  const t = transporte || viaje?.scrn_transportes;
  const tope = topeTransportePasajeros(t);
  const o = viaje?.plazas_pasajeros;
  if (o == null || o === "") return tope;
  const n = Math.max(0, Math.floor(Number(o)));
  if (!Number.isFinite(n)) return tope;
  return Math.min(n, tope);
}

/**
 * Valor a persistir: vacío = null (usar tope del transporte); número clampado.
 */
export function parsePlazasPasajerosFormValue(raw, transporte) {
  const s = raw == null ? "" : String(raw).trim();
  if (s === "") return { plazas_pasajeros: null, error: null };
  const n = Math.floor(Number(s));
  if (!Number.isFinite(n) || n < 0) {
    return { plazas_pasajeros: null, error: "Indicá un número de plazas válido o dejá vacío." };
  }
  if (!transporte) {
    return { plazas_pasajeros: n, error: null };
  }
  const tope = topeTransportePasajeros(transporte);
  return { plazas_pasajeros: Math.min(n, tope), error: null };
}
