SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'eventos'
  AND column_name IN (
    'ensayo_pese_conflicto',
    'ensayo_pese_conflicto_justificacion'
  )
ORDER BY column_name;
