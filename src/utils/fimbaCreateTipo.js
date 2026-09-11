/** Traslado pasajeros (EventForm / flota); default en página Transportes. */
export const FIMBA_TIPO_EVENTO_TRASLADO = 11;

/**
 * Tipo genérico del catálogo Logística («Nuevo evento»).
 * No usar como default de alta.
 */
export const FIMBA_CATALOG_TIPO_GENERICO = 16;

/**
 * Resuelve el tipo de un alta FIMBA.
 * Sin tipo explícito: Traslado (11) si `forceTransporte`; si no, `null` (hay que elegir).
 */
export function resolveFimbaCreateTipoId(
  idTipo,
  { forceTransporte = false } = {},
) {
  if (idTipo != null && idTipo !== "") {
    const n = Number(idTipo);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (forceTransporte) return FIMBA_TIPO_EVENTO_TRASLADO;
  return null;
}
