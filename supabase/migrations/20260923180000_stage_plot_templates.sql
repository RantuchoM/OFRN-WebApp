-- Plantillas globales de Escenario (reutilizables entre giras).
CREATE TABLE IF NOT EXISTS public.stage_plot_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  musicos_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stage_plot_templates_nombre_not_blank
    CHECK (char_length(btrim(nombre)) > 0),
  CONSTRAINT stage_plot_templates_musicos_count_nonneg
    CHECK (musicos_count >= 0)
);

CREATE INDEX IF NOT EXISTS stage_plot_templates_nombre_idx
  ON public.stage_plot_templates (lower(btrim(nombre)));

CREATE INDEX IF NOT EXISTS stage_plot_templates_updated_at_idx
  ON public.stage_plot_templates (updated_at DESC);

COMMENT ON TABLE public.stage_plot_templates IS
  'Plantillas globales de stage plot: payload completo + nombre editable + conteo de músicos (ítems con huella de instrumento).';

COMMENT ON COLUMN public.stage_plot_templates.musicos_count IS
  'Cantidad de ítems con huella de instrumento musical en el payload (excluye director, atril, décor, tarimas).';

ALTER TABLE public.stage_plot_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY stage_plot_templates_authenticated_all
  ON public.stage_plot_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY stage_plot_templates_anon_all
  ON public.stage_plot_templates
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_plot_templates
  TO authenticated, anon, service_role;
