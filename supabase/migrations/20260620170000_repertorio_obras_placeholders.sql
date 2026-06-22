-- Reservas de repertorio (slots de planificación sin obra en catálogo)
ALTER TABLE public.repertorio_obras
  ALTER COLUMN id_obra DROP NOT NULL;

ALTER TABLE public.repertorio_obras
  ADD COLUMN IF NOT EXISTS titulo_placeholder text,
  ADD COLUMN IF NOT EXISTS instrumentacion_placeholder text;

ALTER TABLE public.repertorio_obras
  DROP CONSTRAINT IF EXISTS repertorio_obras_obra_o_placeholder_chk;

ALTER TABLE public.repertorio_obras
  ADD CONSTRAINT repertorio_obras_obra_o_placeholder_chk CHECK (
    (id_obra IS NOT NULL AND titulo_placeholder IS NULL)
    OR (
      id_obra IS NULL
      AND titulo_placeholder IS NOT NULL
      AND length(trim(titulo_placeholder)) > 0
    )
  );

COMMENT ON COLUMN public.repertorio_obras.titulo_placeholder IS
  'Título del slot de planificación cuando id_obra es null (ej. "Dos obras corales").';

COMMENT ON COLUMN public.repertorio_obras.instrumentacion_placeholder IS
  'Orgánico estimado del slot de planificación (solo cuando id_obra es null).';
