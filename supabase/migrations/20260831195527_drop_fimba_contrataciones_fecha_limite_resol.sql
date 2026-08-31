-- Remove fecha_limite_resol from fimba_contrataciones (no longer used in UI or Sheet export).
ALTER TABLE public.fimba_contrataciones
  DROP COLUMN IF EXISTS fecha_limite_resol;
