SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ensamble_proyeccion_ensayos'
ORDER BY ordinal_position;
