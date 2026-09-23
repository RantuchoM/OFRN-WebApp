-- Ensambles as first-class logistics rule targets (sibling of localidad / categoría).
ALTER TABLE public.giras_logistica_reglas
  ADD COLUMN IF NOT EXISTS target_ensambles bigint[] DEFAULT '{}'::bigint[];

COMMENT ON COLUMN public.giras_logistica_reglas.target_ensambles IS
  'IDs de public.ensambles. Fuerza 4 en getMatchStrength (Persona 5 > Ensamble 4 > rol 3 > localidad 2 > catch-all 1).';
