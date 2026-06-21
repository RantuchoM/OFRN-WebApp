-- Modo definición a nivel de bloque (persiste aunque el bloque no tenga obras aún)
ALTER TABLE public.programas_repertorios
  ADD COLUMN IF NOT EXISTS en_definicion boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.programas_repertorios.en_definicion IS
  'Indica si el bloque de repertorio está en curaduría/definición abierta.';

-- Sincronizar bloques existentes cuyas obras ya tenían el flag activo
UPDATE public.programas_repertorios pr
SET en_definicion = true
WHERE EXISTS (
  SELECT 1
  FROM public.repertorio_obras ro
  WHERE ro.id_repertorio = pr.id
    AND ro.en_definicion = true
);
