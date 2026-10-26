-- Quitar tags [seed:…] del subtítulo de todos los programas.
UPDATE public.programas
SET subtitulo = NULLIF(
  TRIM(
    regexp_replace(
      coalesce(subtitulo, ''),
      '\[seed:[^\]]*\]\s*',
      '',
      'g'
    )
  ),
  ''
)
WHERE subtitulo LIKE '%[seed:%';

SELECT
  count(*) FILTER (WHERE subtitulo LIKE '%[seed:%')::int AS quedan_con_tag,
  count(*) FILTER (
    WHERE nombre_gira LIKE 'Ciclo de Cámara%'
      AND fecha_desde >= DATE '2027-01-01'
  )::int AS ciclos_2027,
  count(*) FILTER (
    WHERE coalesce(subtitulo, '') = 'Tango, folklore o jazz o participación en conciertos con coros'
  )::int AS ciclo_iv_limpios
FROM public.programas;
