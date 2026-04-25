-- Paradas por persona en scrn_reserva_pasajeros (NULL = heredar de scrn_reservas del mismo id_reserva).
-- Permite que cada pasajero con perfil gestione sus datos; admins siguen con políticas existentes.

ALTER TABLE public.scrn_reserva_pasajeros
  ADD COLUMN IF NOT EXISTS tramo text,
  ADD COLUMN IF NOT EXISTS localidad_subida text,
  ADD COLUMN IF NOT EXISTS localidad_bajada text,
  ADD COLUMN IF NOT EXISTS obs_subida text,
  ADD COLUMN IF NOT EXISTS obs_bajada text;

ALTER TABLE public.scrn_reserva_pasajeros
  DROP CONSTRAINT IF EXISTS scrn_reserva_pasajeros_tramo_check;
ALTER TABLE public.scrn_reserva_pasajeros
  ADD CONSTRAINT scrn_reserva_pasajeros_tramo_check
  CHECK (tramo IS NULL OR tramo IN ('ida', 'vuelta', 'ambos'));

COMMENT ON COLUMN public.scrn_reserva_pasajeros.tramo IS
  'NULL = mismas paradas que scrn_reservas.tramo de la reserva.';
COMMENT ON COLUMN public.scrn_reserva_pasajeros.localidad_subida IS
  'NULL = heredar localidad_subida de scrn_reservas.';
COMMENT ON COLUMN public.scrn_reserva_pasajeros.localidad_bajada IS
  'NULL = heredar localidad_bajada de scrn_reservas.';

-- Pasajero vinculado (perfil) lee su propia fila
DROP POLICY IF EXISTS "Pasajero lee su fila de pasajero" ON public.scrn_reserva_pasajeros;
CREATE POLICY "Pasajero lee su fila de pasajero"
  ON public.scrn_reserva_pasajeros FOR SELECT
  USING (id_perfil IS NOT NULL AND id_perfil = auth.uid());

-- Pasajero vinculado actualiza su propia fila (paradas y estado; la app limita campos si hace falta)
DROP POLICY IF EXISTS "Pasajero actualiza su fila de pasajero" ON public.scrn_reserva_pasajeros;
CREATE POLICY "Pasajero actualiza su fila de pasajero"
  ON public.scrn_reserva_pasajeros FOR UPDATE
  USING (id_perfil IS NOT NULL AND id_perfil = auth.uid())
  WITH CHECK (id_perfil IS NOT NULL AND id_perfil = auth.uid());
