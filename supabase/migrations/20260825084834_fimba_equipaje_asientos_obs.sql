-- FIMBA: asientos / observaciones de equipaje (evento + reglas de subida/bajada).
-- `# PAX` / Observaciones dejan de usarse como headcount de pasajeros:
-- el conteo de pasajeros viene de reglas de boarding + tags de artistas.

-- 1) Evento: equipaje a nivel parada
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS asientos_equipaje integer;

ALTER TABLE public.eventos
  DROP CONSTRAINT IF EXISTS eventos_asientos_equipaje_nonnegative;

ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_asientos_equipaje_nonnegative
  CHECK (asientos_equipaje IS NULL OR asientos_equipaje >= 0);

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS observaciones_equipaje text;

COMMENT ON COLUMN public.eventos.asientos_equipaje IS
  'Asientos reservados para equipaje en la parada FIMBA (no es headcount de pasajeros).';
COMMENT ON COLUMN public.eventos.observaciones_equipaje IS
  'Notas de equipaje del evento/parada FIMBA.';

-- 2) Reglas artista (fimba_propuesta_rutas): equipaje por ride
ALTER TABLE public.fimba_propuesta_rutas
  ADD COLUMN IF NOT EXISTS asientos_equipaje integer NOT NULL DEFAULT 0;

ALTER TABLE public.fimba_propuesta_rutas
  DROP CONSTRAINT IF EXISTS fimba_propuesta_rutas_asientos_equipaje_chk;

ALTER TABLE public.fimba_propuesta_rutas
  ADD CONSTRAINT fimba_propuesta_rutas_asientos_equipaje_chk
  CHECK (asientos_equipaje >= 0);

ALTER TABLE public.fimba_propuesta_rutas
  ADD COLUMN IF NOT EXISTS observaciones_equipaje text;

COMMENT ON COLUMN public.fimba_propuesta_rutas.asientos_equipaje IS
  'Asientos de equipaje asociados a la regla de subida/bajada del artista.';
COMMENT ON COLUMN public.fimba_propuesta_rutas.observaciones_equipaje IS
  'Observaciones de equipaje de la regla de subida/bajada.';

-- 3) Backfill evento: audiencia FIMBA histórica → asientos_equipaje
--    (eventos con tags artista o audiencia_ofrn = none).
UPDATE public.eventos e
SET asientos_equipaje = e.audiencia
WHERE e.asientos_equipaje IS NULL
  AND e.audiencia IS NOT NULL
  AND e.audiencia > 0
  AND (
    e.audiencia_ofrn = 'none'
    OR EXISTS (
      SELECT 1
      FROM public.eventos_fimba_propuestas t
      WHERE t.id_evento = e.id
    )
  );

-- 4) Backfill Obs: embebido en descripcion → observaciones_equipaje
UPDATE public.eventos e
SET observaciones_equipaje = NULLIF(
  trim(substring(e.descripcion from '(?ni)(?:^|\n)Obs:\s*([^\n]*)')),
  ''
)
WHERE (e.observaciones_equipaje IS NULL OR btrim(e.observaciones_equipaje) = '')
  AND e.descripcion ~* '(^|\n)Obs:\s*\S';
