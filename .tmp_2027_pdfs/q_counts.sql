SELECT
  count(*)::int AS n,
  count(id_locacion)::int AS con_locacion,
  count(*) FILTER (WHERE id_locacion IS NULL)::int AS sin_locacion
FROM public.ensamble_proyeccion_ensayos;
