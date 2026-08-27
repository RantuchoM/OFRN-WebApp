-- Plano de escenario (1 plot por programa).
CREATE TABLE IF NOT EXISTS public.stage_plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_programa bigint NOT NULL
    REFERENCES public.programas(id) ON DELETE CASCADE,
  nombre text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stage_plots_id_programa_uniq UNIQUE (id_programa)
);

CREATE INDEX IF NOT EXISTS stage_plots_id_programa_idx
  ON public.stage_plots (id_programa);

COMMENT ON TABLE public.stage_plots IS
  'Stage plot (escenario) por programa: dimensiones, ítems, formaciones y channel list.';

ALTER TABLE public.stage_plots ENABLE ROW LEVEL SECURITY;

CREATE POLICY stage_plots_authenticated_all
  ON public.stage_plots
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY stage_plots_anon_all
  ON public.stage_plots
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_plots
  TO authenticated, anon, service_role;
