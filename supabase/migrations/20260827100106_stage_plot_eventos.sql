-- Asociación Escenario ↔ eventos (ensayo/concierto) de la misma gira.
-- Dirección preferida: el plot apunta a 0..N eventos vía junction.
-- Fallback técnico (ver resolveStagePlotForEvent):
--   1) link directo stage_plot_eventos
--   2) plot cuyo bloque_ids contiene eventos.id_repertorio (si existe)
--   3) primer plot del programa (sort_order, created_at)

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS id_repertorio bigint
    REFERENCES public.programas_repertorios(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.eventos.id_repertorio IS
  'Bloque de repertorio opcional (programas_repertorios). Usado p.ej. para resolver Escenario del técnico.';

CREATE INDEX IF NOT EXISTS eventos_id_repertorio_idx
  ON public.eventos (id_repertorio)
  WHERE id_repertorio IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.stage_plot_eventos (
  id_stage_plot uuid NOT NULL
    REFERENCES public.stage_plots(id) ON DELETE CASCADE,
  id_evento bigint NOT NULL
    REFERENCES public.eventos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_stage_plot, id_evento)
);

CREATE UNIQUE INDEX IF NOT EXISTS stage_plot_eventos_id_evento_uniq
  ON public.stage_plot_eventos (id_evento);

CREATE INDEX IF NOT EXISTS stage_plot_eventos_plot_idx
  ON public.stage_plot_eventos (id_stage_plot);

COMMENT ON TABLE public.stage_plot_eventos IS
  'Asociación N:1 evento→plot (un evento tiene a lo sumo un escenario; un plot puede cubrir varios eventos).';

ALTER TABLE public.stage_plot_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY stage_plot_eventos_authenticated_all
  ON public.stage_plot_eventos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY stage_plot_eventos_anon_all
  ON public.stage_plot_eventos
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_plot_eventos
  TO authenticated, anon, service_role;
