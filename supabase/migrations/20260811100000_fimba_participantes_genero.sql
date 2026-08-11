-- Género/sexo por participante FIMBA (persona bajo el artista/propuesta).
-- No va en fimba_propuestas: el «artista» es el coro/ensamble; el dato es de cada integrante.

ALTER TABLE public.fimba_participantes
  ADD COLUMN IF NOT EXISTS genero text NOT NULL DEFAULT 'sin_especificar';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fimba_participantes_genero_chk'
  ) THEN
    ALTER TABLE public.fimba_participantes
      ADD CONSTRAINT fimba_participantes_genero_chk
      CHECK (
        genero = ANY (ARRAY[
          'femenino'::text,
          'masculino'::text,
          'otro'::text,
          'sin_especificar'::text
        ])
      );
  END IF;
END $$;

COMMENT ON COLUMN public.fimba_participantes.genero IS
  'Género/sexo del participante: femenino | masculino | otro | sin_especificar (default).';
