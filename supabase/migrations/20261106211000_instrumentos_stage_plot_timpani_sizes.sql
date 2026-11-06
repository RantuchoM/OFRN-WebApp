-- Huellas cm de timbal 29/26/23. El 32 sigue en stage_plot_width_cm / height_cm.
-- Null = proporción medida/32 sobre el 32.

ALTER TABLE public.instrumentos
  ADD COLUMN IF NOT EXISTS stage_plot_timpani_sizes jsonb;

COMMENT ON COLUMN public.instrumentos.stage_plot_timpani_sizes IS
  'Huellas cm de timbal 29/26/23. El 32 vive en stage_plot_width_cm/height_cm. Null = proporción medida/32.';
