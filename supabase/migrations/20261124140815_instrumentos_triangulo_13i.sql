-- Triángulo (percusión): id 13i, stage_plot_type triangle.
-- SVG OFRN-original (currentColor, viewBox 64). Idempotente.

INSERT INTO public.instrumentos (
  id,
  instrumento,
  familia,
  abreviatura,
  funcion,
  stage_plot_type,
  stage_plot_width_cm,
  stage_plot_height_cm,
  svg_icon
)
SELECT
  '13i',
  'Triángulo',
  'Percusión',
  'Tri',
  'percusionista',
  'triangle',
  50::numeric,
  50::numeric,
  $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><!-- OFRN: triangulo --><path fill="currentColor" fill-rule="evenodd" d="M32 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 10L54 52H10L32 15zm0 9.5L18.5 48h27L32 24.5zM37.2 40.8l11.5 11.5-2.8 2.8-11.5-11.5 2.8-2.8z"/></svg>$svg$
WHERE NOT EXISTS (
  SELECT 1 FROM public.instrumentos i WHERE i.id = '13i'
);

-- Si ya existía sin ícono / tipo, completar (no pisa raster ni SVG propio).
UPDATE public.instrumentos
SET
  instrumento = COALESCE(NULLIF(btrim(instrumento), ''), 'Triángulo'),
  familia = COALESCE(NULLIF(btrim(familia), ''), 'Percusión'),
  abreviatura = COALESCE(NULLIF(btrim(abreviatura), ''), 'Tri'),
  funcion = COALESCE(NULLIF(btrim(funcion), ''), 'percusionista'),
  stage_plot_type = COALESCE(NULLIF(btrim(stage_plot_type), ''), 'triangle'),
  stage_plot_width_cm = COALESCE(stage_plot_width_cm, 50),
  stage_plot_height_cm = COALESCE(stage_plot_height_cm, 50),
  svg_icon = CASE
    WHEN svg_icon IS NULL OR btrim(svg_icon) = '' THEN
      $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><!-- OFRN: triangulo --><path fill="currentColor" fill-rule="evenodd" d="M32 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 10L54 52H10L32 15zm0 9.5L18.5 48h27L32 24.5zM37.2 40.8l11.5 11.5-2.8 2.8-11.5-11.5 2.8-2.8z"/></svg>$svg$
    ELSE svg_icon
  END
WHERE id = '13i';
