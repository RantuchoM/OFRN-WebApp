-- FIMBA: enlace consulta general por edición (solo lectura, sin Contrataciones/Usuarios).
-- Ruta app: /fimba/c/:token_consulta

ALTER TABLE public.fimba_ediciones
  ADD COLUMN IF NOT EXISTS token_consulta uuid NOT NULL DEFAULT gen_random_uuid();

-- Backfill por si se agregó nullable en entornos intermedios
UPDATE public.fimba_ediciones
SET token_consulta = gen_random_uuid()
WHERE token_consulta IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fimba_ediciones_token_consulta_key'
      AND conrelid = 'public.fimba_ediciones'::regclass
  ) THEN
    ALTER TABLE public.fimba_ediciones
      ADD CONSTRAINT fimba_ediciones_token_consulta_key UNIQUE (token_consulta);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS fimba_ediciones_token_consulta_idx
  ON public.fimba_ediciones (token_consulta);

COMMENT ON COLUMN public.fimba_ediciones.token_consulta IS
  'UUID para enlace solo-lectura de la edición /fimba/c/:token (sin Usuarios ni Contrataciones).';
