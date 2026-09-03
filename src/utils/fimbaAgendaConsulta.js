import { isFimbaBacklinePlanillaEvent } from "../services/fimbaService";
import { isFimbaRiderEmpty } from "./fimbaRider";
import {
  extractEventArtistas,
  extractEventGrupos,
} from "./venueDisplayUtils";

/**
 * Artistas FIMBA del evento (planilla usa `propuestas`; joins usan `eventos_fimba_propuestas`).
 * @param {object|null|undefined} evt
 * @returns {Array<{ id?: number|string, nombre?: string, color?: string|null, rider?: string|null }>}
 */
export function resolveEventFimbaPropuestas(evt) {
  if (!evt) return [];
  if (Array.isArray(evt.propuestas) && evt.propuestas.length > 0) {
    return evt.propuestas.filter(Boolean);
  }
  return extractEventArtistas(evt);
}

/**
 * @param {object|null|undefined} evt
 */
export function eventHasFimbaRiderContent(evt) {
  return resolveEventFimbaPropuestas(evt).some((p) => !isFimbaRiderEmpty(p?.rider));
}

/**
 * Propuestas del evento con rider no vacío (para modal consulta).
 * @param {object|null|undefined} evt
 */
export function resolveEventRidersForConsulta(evt) {
  return resolveEventFimbaPropuestas(evt).filter((p) => !isFimbaRiderEmpty(p?.rider));
}

/**
 * Icono Backline en agenda: fila de planilla Backline + staff editor/admin.
 * @param {object|null|undefined} evt
 * @param {boolean} canSee
 */
export function shouldShowAgendaBacklineIcon(evt, canSee) {
  return Boolean(canSee) && isFimbaBacklinePlanillaEvent(evt);
}

/**
 * Icono Rider en agenda: hay al menos un rider de artista tagueado + staff editor/admin.
 * @param {object|null|undefined} evt
 * @param {boolean} canSee
 */
export function shouldShowAgendaRiderIcon(evt, canSee) {
  return Boolean(canSee) && eventHasFimbaRiderContent(evt);
}

export { extractEventGrupos, isFimbaBacklinePlanillaEvent };
