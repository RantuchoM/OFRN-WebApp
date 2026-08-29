-- Default insert footprint size (cm) for stage-plot items of this instrument type.
-- At scale=1 the canvas footprint is 50×50 cm; these fields drive the initial scale on place.

ALTER TABLE public.instrumentos
  ADD COLUMN IF NOT EXISTS stage_plot_width_cm numeric,
  ADD COLUMN IF NOT EXISTS stage_plot_height_cm numeric;

COMMENT ON COLUMN public.instrumentos.stage_plot_width_cm IS
  'Ancho predeterminado (cm) al insertar en Escenario; NULL = 50 cm (huella default).';

COMMENT ON COLUMN public.instrumentos.stage_plot_height_cm IS
  'Alto/profundo predeterminado (cm) al insertar en Escenario; NULL = 50 cm (huella default).';

ALTER TABLE public.instrumentos
  DROP CONSTRAINT IF EXISTS instrumentos_stage_plot_width_cm_check;
ALTER TABLE public.instrumentos
  ADD CONSTRAINT instrumentos_stage_plot_width_cm_check
  CHECK (
    stage_plot_width_cm IS NULL
    OR (stage_plot_width_cm >= 10 AND stage_plot_width_cm <= 400)
  );

ALTER TABLE public.instrumentos
  DROP CONSTRAINT IF EXISTS instrumentos_stage_plot_height_cm_check;
ALTER TABLE public.instrumentos
  ADD CONSTRAINT instrumentos_stage_plot_height_cm_check
  CHECK (
    stage_plot_height_cm IS NULL
    OR (stage_plot_height_cm >= 10 AND stage_plot_height_cm <= 400)
  );
