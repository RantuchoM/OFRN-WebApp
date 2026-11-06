-- Claves de plano independientes para corno inglés y clarinete bajo.
-- El instrumento principal conserva la clave (piezas ya colocadas como oboe/clarinet).
-- No toca svg_icon ni stage_plot_raster_url.

UPDATE public.instrumentos
SET stage_plot_type = 'cor_anglais'
WHERE id = '06b'
  AND stage_plot_type = 'oboe';

UPDATE public.instrumentos
SET stage_plot_type = 'bass_clarinet'
WHERE id = '07b'
  AND stage_plot_type = 'clarinet';
