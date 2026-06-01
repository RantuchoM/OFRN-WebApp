-- Rol de gira por defecto según catálogo de instrumentos (logística / roster).
ALTER TABLE public.instrumentos
  ADD COLUMN IF NOT EXISTS rol_gira_default text;

ALTER TABLE public.instrumentos
  DROP CONSTRAINT IF EXISTS instrumentos_rol_gira_default_fkey;

ALTER TABLE public.instrumentos
  ADD CONSTRAINT instrumentos_rol_gira_default_fkey
  FOREIGN KEY (rol_gira_default) REFERENCES public.roles(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

COMMENT ON COLUMN public.instrumentos.rol_gira_default IS
  'Rol en gira inferido al convocar (giras_integrantes.rol) si no hay override manual. FK a roles.id.';

-- Backfill opcional según heurísticas previas (ajustar en producción si hace falta).
UPDATE public.instrumentos
SET rol_gira_default = 'chofer'
WHERE rol_gira_default IS NULL
  AND (
    lower(trim(instrumento)) = 'chofer'
    OR lower(trim(coalesce(familia, ''))) = 'chofer'
  );

UPDATE public.instrumentos
SET rol_gira_default = 'produccion'
WHERE rol_gira_default IS NULL
  AND familia = 'Prod.';
