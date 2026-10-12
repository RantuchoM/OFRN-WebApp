-- Último modo del listado de programas (tarjetas o tabla) por usuario.
-- Null = vista tradicional (tarjetas).

ALTER TABLE public.integrantes
  ADD COLUMN IF NOT EXISTS giras_vista_lista text;

ALTER TABLE public.integrantes
  DROP CONSTRAINT IF EXISTS integrantes_giras_vista_lista_check;

ALTER TABLE public.integrantes
  ADD CONSTRAINT integrantes_giras_vista_lista_check
  CHECK (giras_vista_lista IS NULL OR giras_vista_lista IN ('cards', 'table'));

COMMENT ON COLUMN public.integrantes.giras_vista_lista IS
  'Último modo del listado de Giras: cards (tarjetas) o table. Null abre en tarjetas.';
