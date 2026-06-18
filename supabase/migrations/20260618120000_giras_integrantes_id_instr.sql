-- Instrumento efectivo por gira (override opcional sobre integrantes.id_instr).
ALTER TABLE public.giras_integrantes
  ADD COLUMN IF NOT EXISTS id_instr text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'giras_integrantes_id_instr_fkey'
  ) THEN
    ALTER TABLE public.giras_integrantes
      ADD CONSTRAINT giras_integrantes_id_instr_fkey
      FOREIGN KEY (id_instr) REFERENCES public.instrumentos(id);
  END IF;
END $$;

COMMENT ON COLUMN public.giras_integrantes.id_instr IS
  'Instrumento que toca en esta gira. Si es NULL, se usa integrantes.id_instr.';
