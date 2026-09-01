-- Align DB svg_icon length with app STAGE_PLOT_SVG_MAX_CHARS (500_000).

ALTER TABLE public.instrumentos
  DROP CONSTRAINT IF EXISTS instrumentos_svg_icon_len_check;

ALTER TABLE public.instrumentos
  ADD CONSTRAINT instrumentos_svg_icon_len_check
  CHECK (svg_icon IS NULL OR char_length(svg_icon) <= 500000);

ALTER TABLE public.elementos_escenario
  DROP CONSTRAINT IF EXISTS elementos_escenario_svg_icon_len_check;

ALTER TABLE public.elementos_escenario
  ADD CONSTRAINT elementos_escenario_svg_icon_len_check
  CHECK (svg_icon IS NULL OR char_length(svg_icon) <= 500000);