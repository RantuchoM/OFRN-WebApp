-- Validación de orgánico por bloque de repertorio (reemplaza el flag de programa).

ALTER TABLE public.programas_repertorios
  ADD COLUMN IF NOT EXISTS organico_revisado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS organico_comentario TEXT;

COMMENT ON COLUMN public.programas_repertorios.organico_revisado IS
  'Adaptación de orgánico validada para este bloque de repertorio.';
COMMENT ON COLUMN public.programas_repertorios.organico_comentario IS
  'Comentario de adaptaciones artísticas validadas en este bloque.';

UPDATE public.programas_repertorios pr
SET
  organico_revisado = COALESCE(p.organico_revisado, FALSE),
  organico_comentario = NULLIF(btrim(p.organico_comentario), '')
FROM public.programas p
WHERE pr.id_programa = p.id
  AND (
    COALESCE(p.organico_revisado, FALSE) = TRUE
    OR NULLIF(btrim(p.organico_comentario), '') IS NOT NULL
  );

COMMENT ON COLUMN public.programas.organico_revisado IS
  'OBSOLETO: usar programas_repertorios.organico_revisado. Conservado por compatibilidad.';
COMMENT ON COLUMN public.programas.organico_comentario IS
  'OBSOLETO: usar programas_repertorios.organico_comentario. Conservado por compatibilidad.';
