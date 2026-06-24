-- Clona las 5 obras del bloque "Con Coro" (gira 15) al archivo general.
-- Copia metadatos, link_drive, compositores, particellas y arcos.
-- Las nuevas obras quedan en estado 'Oficial' y NO se asocian a repertorio_obras.

DO $$
DECLARE
  source_ids bigint[] := ARRAY[3101, 3347, 3348, 3350, 3514];
  src_id bigint;
  new_id bigint;
BEGIN
  FOREACH src_id IN ARRAY source_ids
  LOOP
    IF NOT EXISTS (SELECT 1 FROM obras WHERE id = src_id) THEN
      RAISE EXCEPTION 'Obra origen % no encontrada.', src_id;
    END IF;

    INSERT INTO obras (
      titulo,
      id_arreglador,
      anio_composicion,
      duracion_segundos,
      link_drive,
      link_youtube,
      observaciones,
      dificultad,
      instrumentacion,
      estado,
      comentarios,
      fecha_esperada,
      id_folder_arcos,
      id_usuario_carga,
      id_integrante_arreglador
    )
    SELECT
      titulo,
      id_arreglador,
      anio_composicion,
      duracion_segundos,
      link_drive,
      link_youtube,
      observaciones,
      dificultad,
      instrumentacion,
      'Oficial',
      comentarios,
      fecha_esperada,
      id_folder_arcos,
      id_usuario_carga,
      id_integrante_arreglador
    FROM obras
    WHERE id = src_id
    RETURNING id INTO new_id;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT new_id, id_compositor, rol
    FROM obras_compositores
    WHERE id_obra = src_id;

    INSERT INTO obras_particellas (
      id_obra,
      id_instrumento,
      nombre_archivo,
      url_archivo,
      nota_organico,
      es_solista
    )
    SELECT
      new_id,
      id_instrumento,
      nombre_archivo,
      url_archivo,
      nota_organico,
      es_solista
    FROM obras_particellas
    WHERE id_obra = src_id;

    INSERT INTO obras_arcos (id_obra, nombre, descripcion, link, id_drive_folder)
    SELECT new_id, nombre, descripcion, link, id_drive_folder
    FROM obras_arcos
    WHERE id_obra = src_id;

    INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
    SELECT new_id, id_palabra_clave
    FROM obras_palabras_clave
    WHERE id_obra = src_id;

    RAISE NOTICE 'Clonada obra % -> %', src_id, new_id;
  END LOOP;
END $$;
