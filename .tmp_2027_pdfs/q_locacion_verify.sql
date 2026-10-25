select
  count(*)::int as n,
  count(id_locacion)::int as con_locacion,
  (select count(*)::int from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ensamble_proyeccion_ensayos'
      and column_name = 'id_localidad') as still_has_id_localidad,
  (select count(*)::int from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ensamble_proyeccion_ensayos'
      and column_name = 'id_locacion') as has_id_locacion;
