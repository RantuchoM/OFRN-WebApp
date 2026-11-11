-- Marca persistente por bloque: asignación inicial de seating/partes lista
-- (editor/admin en Seating, junto a las pestañas de bloque).

ALTER TABLE public.programas_repertorios
  ADD COLUMN IF NOT EXISTS seating_inicial_listo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.programas_repertorios.seating_inicial_listo IS
  'Editor/admin: asignación inicial de seating/partes del bloque lista (jefes de fila pueden ajustar).';
