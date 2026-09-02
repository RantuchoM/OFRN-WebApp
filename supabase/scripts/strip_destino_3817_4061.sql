-- Remove legacy Destino line from eventos 3817, 4061 (id_locacion already set).
UPDATE eventos e
SET descripcion = COALESCE(
  NULLIF(
    trim(both E'\n' from (
      SELECT string_agg(line, E'\n' ORDER BY ord)
      FROM (
        SELECT ord, raw_line AS line
        FROM unnest(string_to_array(e.descripcion, E'\n')) WITH ORDINALITY AS t(raw_line, ord)
      ) sub
      WHERE NOT (regexp_replace(line, '\s+$', '') ~* '^Destino:\s*')
    )),
    ''
  ),
  ''
)
WHERE e.id IN (3817, 4061);