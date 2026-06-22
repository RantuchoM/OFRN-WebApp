-- Viáticos opcionales en solicitudes SCRN (prefill hacia /viaticos-manual).
-- Shape esperado en viaticos_opciones:
-- {
--   "porcentaje": 100,
--   "temporada_alta": false,
--   "gasto_alojamiento": 0,
--   "gasto_pasajes": 0,
--   "gasto_combustible": 0,
--   "gasto_otros": 0,
--   "gastos_capacit": 0,
--   "gastos_movil_otros": 0,
--   "gasto_ceremonial": 0
-- }
-- En propuestas de nuevo viaje, cada item de pasajeros_json puede incluir viaticos_opciones propio.

ALTER TABLE public.scrn_reservas
  ADD COLUMN IF NOT EXISTS viaticos_opciones jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.scrn_reserva_pasajeros
  ADD COLUMN IF NOT EXISTS viaticos_opciones jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.scrn_solicitudes_nuevo_viaje
  ADD COLUMN IF NOT EXISTS viaticos_opciones jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.scrn_reservas.viaticos_opciones IS
  'Datos opcionales de viático del titular (% viático, temporada alta, gastos). Usado para prefill en viaticos-manual.';

COMMENT ON COLUMN public.scrn_reserva_pasajeros.viaticos_opciones IS
  'Datos opcionales de viático por pasajero extra. Usado para prefill en viaticos-manual.';

COMMENT ON COLUMN public.scrn_solicitudes_nuevo_viaje.viaticos_opciones IS
  'Datos opcionales de viático del proponente. Se copian a scrn_reservas al aprobar la propuesta.';
