-- Denormaliza la fecha del último cambio de «Último estado conocido»
-- para ordenar la planilla Contrataciones por timestamp (no por texto).

ALTER TABLE public.fimba_contrataciones
  ADD COLUMN IF NOT EXISTS ultimo_estado_at timestamptz;

COMMENT ON COLUMN public.fimba_contrataciones.ultimo_estado_at IS
  'Denorm del último cambio de estado: created_at del log append-only, o now() al limpiar estado.';

-- Backfill desde el log (max created_at por contratación).
UPDATE public.fimba_contrataciones c
SET ultimo_estado_at = sub.max_at
FROM (
  SELECT id_contratacion, max(created_at) AS max_at
  FROM public.fimba_contrataciones_estado_log
  GROUP BY id_contratacion
) sub
WHERE c.id = sub.id_contratacion
  AND (c.ultimo_estado_at IS DISTINCT FROM sub.max_at);

CREATE INDEX IF NOT EXISTS fimba_contrataciones_ultimo_estado_at_idx
  ON public.fimba_contrataciones (ultimo_estado_at DESC NULLS LAST);
