-- Unifica tags "Película" / "Películas" y etiqueta obras de cine detectadas sin tag.

DO $$
DECLARE
  _id_pelicula bigint;
  _id_peliculas bigint;
BEGIN
  SELECT id INTO _id_pelicula FROM palabras_clave WHERE tag = 'Película' LIMIT 1;
  IF _id_pelicula IS NULL THEN
    INSERT INTO palabras_clave (tag) VALUES ('Película') RETURNING id INTO _id_pelicula;
  END IF;

  SELECT id INTO _id_peliculas FROM palabras_clave WHERE tag = 'Películas' LIMIT 1;

  IF _id_peliculas IS NOT NULL THEN
    -- Obras que solo tenían "Películas" pasan a "Película".
    UPDATE obras_palabras_clave opc
    SET id_palabra_clave = _id_pelicula
    WHERE opc.id_palabra_clave = _id_peliculas
      AND NOT EXISTS (
        SELECT 1
        FROM obras_palabras_clave dup
        WHERE dup.id_obra = opc.id_obra
          AND dup.id_palabra_clave = _id_pelicula
      );

    -- Duplicados tras la migración.
    DELETE FROM obras_palabras_clave
    WHERE id_palabra_clave = _id_peliculas;

    DELETE FROM palabras_clave
    WHERE id = _id_peliculas;
  END IF;

  -- Obras detectadas en auditoría sin tag de película.
  INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
  SELECT obra_id, _id_pelicula
  FROM unnest(ARRAY[1307, 3468, 3591, 3594]::bigint[]) AS obra_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM obras_palabras_clave opc
    WHERE opc.id_obra = obra_id
      AND opc.id_palabra_clave = _id_pelicula
  );
END $$;
