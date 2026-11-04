-- Dos tipos de constancia por persona/gira: convocatoria | participacion

ALTER TABLE public.constancias_solicitudes
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'convocatoria';

ALTER TABLE public.constancias_solicitudes
  DROP CONSTRAINT IF EXISTS constancias_solicitudes_tipo_check;

ALTER TABLE public.constancias_solicitudes
  ADD CONSTRAINT constancias_solicitudes_tipo_check
  CHECK (tipo = ANY (ARRAY['convocatoria'::text, 'participacion'::text]));

UPDATE public.constancias_solicitudes
SET tipo = 'convocatoria'
WHERE tipo IS NULL OR btrim(tipo) = '';

ALTER TABLE public.constancias_solicitudes
  DROP CONSTRAINT IF EXISTS constancias_solicitudes_persona_gira_uq;

ALTER TABLE public.constancias_solicitudes
  DROP CONSTRAINT IF EXISTS constancias_solicitudes_persona_gira_tipo_uq;

ALTER TABLE public.constancias_solicitudes
  ADD CONSTRAINT constancias_solicitudes_persona_gira_tipo_uq
  UNIQUE (id_integrante, id_gira, tipo);

COMMENT ON COLUMN public.constancias_solicitudes.tipo IS
  'convocatoria (cualquier gira elegible) | participacion (solo giras ya finalizadas).';

COMMENT ON TABLE public.constancias_solicitudes IS
  'Solicitudes de constancia (convocatoria o participación) a giras Sinfónico / Camerata Filarmónica.';
