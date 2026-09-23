-- Título opcional por fila de programa (override de difusión / listado).
-- No modifica obras.titulo.
ALTER TABLE public.repertorio_obras
  ADD COLUMN IF NOT EXISTS titulo_concierto text;

ALTER TABLE public.repertorio_obras
  DROP CONSTRAINT IF EXISTS repertorio_obras_titulo_concierto_chk;

ALTER TABLE public.repertorio_obras
  ADD CONSTRAINT repertorio_obras_titulo_concierto_chk
  CHECK (
    titulo_concierto IS NULL
    OR length(TRIM(BOTH FROM titulo_concierto)) > 0
  );

COMMENT ON COLUMN public.repertorio_obras.titulo_concierto IS
  'Título de esta obra solo en este bloque/programa (listado y difusión). NULL = usar obras.titulo. No modifica el catálogo.';
