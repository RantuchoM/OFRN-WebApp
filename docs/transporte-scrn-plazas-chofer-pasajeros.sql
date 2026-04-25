-- =============================================================================
-- Transporte SCRN: chofer por viaje + cupo de pasajeros por recorrido
-- =============================================================================
-- - scrn_transportes.capacidad_max: asientos totales del vehículo.
-- - El chofer del viaje ocupa SIEMPRE 1 asiento (se descuenta en frontend/backend de cálculo).
-- - scrn_viajes.id_chofer: perfil de la persona que maneja ese recorrido.
-- - scrn_viajes.plazas_pasajeros: NULL = usa capacidad_max - 1; si se informa, limita aún más.
-- =============================================================================

COMMENT ON COLUMN public.scrn_transportes.capacidad_max IS
  'Asientos totales del vehículo. El cupo de pasajeros efectivo descuenta 1 por chofer.';

ALTER TABLE public.scrn_viajes
  ADD COLUMN IF NOT EXISTS id_chofer uuid NULL REFERENCES public.scrn_perfiles (id) ON DELETE SET NULL;

ALTER TABLE public.scrn_viajes
  ADD COLUMN IF NOT EXISTS plazas_pasajeros integer NULL;

COMMENT ON COLUMN public.scrn_viajes.id_chofer IS
  'Persona que maneja este recorrido (chofer específico del viaje).';
COMMENT ON COLUMN public.scrn_viajes.plazas_pasajeros IS
  'Tope manual de plazas pasajero para este recorrido; NULL = capacidad_max - 1.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scrn_viajes_plazas_pasajeros_check'
  ) THEN
    ALTER TABLE public.scrn_viajes
      ADD CONSTRAINT scrn_viajes_plazas_pasajeros_check CHECK (plazas_pasajeros IS NULL OR plazas_pasajeros >= 0);
  END IF;
END $$;

-- Opcional: saneo de datos existentes (si no tienen chofer cargado aún)
-- UPDATE public.scrn_viajes SET id_chofer = NULL WHERE id_chofer IS NULL;

-- =============================================================================
-- Fin. Luego de ejecutar, cada recorrido debería cargar su chofer.
-- =============================================================================
