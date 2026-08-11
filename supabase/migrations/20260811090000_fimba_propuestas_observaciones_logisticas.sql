-- FIMBA: observaciones logísticas libres por artista (propuesta).
-- Texto operativo para hotel / transfers / ad hoc (no afecta cupos ni roster).

ALTER TABLE public.fimba_propuestas
  ADD COLUMN IF NOT EXISTS observaciones_logisticas text;

COMMENT ON COLUMN public.fimba_propuestas.observaciones_logisticas IS
  'Notas logísticas libres del artista (hotel early/late, transfer, equipaje, etc.).';
