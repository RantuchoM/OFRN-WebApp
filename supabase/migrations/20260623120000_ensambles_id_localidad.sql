-- Asociación ensamble → localidad (sede/base del ensamble).

ALTER TABLE public.ensambles
  ADD COLUMN IF NOT EXISTS id_localidad bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ensambles_id_localidad_fkey'
  ) THEN
    ALTER TABLE public.ensambles
      ADD CONSTRAINT ensambles_id_localidad_fkey
      FOREIGN KEY (id_localidad) REFERENCES public.localidades(id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.ensambles.id_localidad IS 'Localidad sede/base del ensamble.';
