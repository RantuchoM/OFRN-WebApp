-- Backfill + DEFAULT 50×50 cm for Escenario insert footprint on all instruments.
-- scale = width_cm / 50 → 50 cm ⇒ scale 1.

UPDATE public.instrumentos
SET
  stage_plot_width_cm = 50,
  stage_plot_height_cm = 50
WHERE
  stage_plot_width_cm IS DISTINCT FROM 50
  OR stage_plot_height_cm IS DISTINCT FROM 50;

ALTER TABLE public.instrumentos
  ALTER COLUMN stage_plot_width_cm SET DEFAULT 50,
  ALTER COLUMN stage_plot_height_cm SET DEFAULT 50;

COMMENT ON COLUMN public.instrumentos.stage_plot_width_cm IS
  'Ancho predeterminado (cm) al insertar en Escenario; DEFAULT/legacy NULL = 50 cm (huella scale=1).';

COMMENT ON COLUMN public.instrumentos.stage_plot_height_cm IS
  'Alto/profundo predeterminado (cm) al insertar en Escenario; DEFAULT/legacy NULL = 50 cm (huella scale=1).';
