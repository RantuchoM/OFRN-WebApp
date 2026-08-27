-- Multi-canvas Escenario: N plots por programa + asociación opcional a bloques.
-- Filas existentes quedan como primer lienzo (sort_order=0, bloque_ids={}).

ALTER TABLE public.stage_plots
  DROP CONSTRAINT IF EXISTS stage_plots_id_programa_uniq;

ALTER TABLE public.stage_plots
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.stage_plots
  ADD COLUMN IF NOT EXISTS bloque_ids bigint[] NOT NULL DEFAULT '{}'::bigint[];

COMMENT ON COLUMN public.stage_plots.sort_order IS
  'Orden de visualización de lienzos dentro del programa (0 = primero).';

COMMENT ON COLUMN public.stage_plots.bloque_ids IS
  'IDs de programas_repertorios asociados (opcional). Vacío = orgánico de toda la gira.';

COMMENT ON TABLE public.stage_plots IS
  'Stage plots (escenario) por programa: varios lienzos; payload + bloques opcionales.';

CREATE INDEX IF NOT EXISTS stage_plots_id_programa_sort_idx
  ON public.stage_plots (id_programa, sort_order, created_at);
