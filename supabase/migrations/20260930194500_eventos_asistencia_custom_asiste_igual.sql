-- Tutti-N (Coordinación → Lista): tildar «asiste igual» pese a estar
-- convocado a una gira. Reusa eventos_asistencia_custom (IDs numéricos).
-- Default = sin fila (no asiste al ensayo; se espera en la gira).

DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'eventos_asistencia_custom'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%adicional%'
    AND pg_get_constraintdef(c.oid) ILIKE '%invitado%'
  LIMIT 1;
  IF conname IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.eventos_asistencia_custom DROP CONSTRAINT %I',
      conname
    );
  END IF;
END $$;

ALTER TABLE public.eventos_asistencia_custom
  ADD CONSTRAINT eventos_asistencia_custom_tipo_check
  CHECK (
    tipo = ANY (
      ARRAY[
        'adicional'::text,
        'ausente'::text,
        'invitado'::text,
        'asiste_igual'::text
      ]
    )
  );

COMMENT ON COLUMN public.eventos_asistencia_custom.tipo IS
  'adicional/invitado = extra en el ensayo; ausente = no convocado; asiste_igual = Tutti-N asiste al ensayo pese a estar en roster de otra gira.';
