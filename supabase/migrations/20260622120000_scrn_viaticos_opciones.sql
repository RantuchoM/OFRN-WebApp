-- Opciones de viático por pasajero en transporte SCRN (prefill hacia /viaticos-manual).

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
