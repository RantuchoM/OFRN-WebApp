-- Resolución de ensayo de ensamble que se hizo pese a solapar una gira.
-- Un solo flag por evento (como is_deleted); no hace falta tabla de historial.

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS ensayo_pese_conflicto boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.eventos.ensayo_pese_conflicto IS
  'True = se ensayó igual aunque hubiera conflicto con gira. El informe de conflictos lo excluye.';
