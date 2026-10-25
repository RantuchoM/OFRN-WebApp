SELECT
  count(*)::int AS n,
  count(id_locacion)::int AS con_locacion,
  count(*) FILTER (WHERE id_locacion IS NULL)::int AS sin_locacion
FROM public.ensamble_proyeccion_ensayos;

SELECT e.id_ensamble, en.ensamble, e.iso_dow, e.hora_inicio, e.hora_fin, e.id_locacion, l.nombre AS locacion
FROM public.ensamble_proyeccion_ensayos e
LEFT JOIN public.ensambles en ON en.id = e.id_ensamble
LEFT JOIN public.locaciones l ON l.id = e.id_locacion
ORDER BY e.id_ensamble, e.iso_dow, e.hora_inicio
LIMIT 15;
