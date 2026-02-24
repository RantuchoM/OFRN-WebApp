-- Bloque "Gala Lírica" para gira (programa) ID = 12.
-- Crea el bloque, asocia compositores existentes o nuevos, inserta obras y las añade al bloque en orden.
-- Ejecutar una sola vez (idempotencia limitada: no vuelve a crear el bloque si ya existe un bloque con el mismo nombre para el programa).

DO $$
DECLARE
  _id_programa bigint := 12;
  _block_id bigint;
  _orden_block int;
  _id_obra bigint;
  _id_puccini bigint;
  _id_charbonnier bigint;
  _id_bizet bigint;
  _id_catan bigint;
  _id_villanueva bigint;
  _id_grever bigint;
  _id_desconocido bigint;
BEGIN
  -- No crear bloque duplicado si ya existe "Gala Lírica" en esta gira
  IF EXISTS (SELECT 1 FROM programas_repertorios WHERE id_programa = _id_programa AND nombre = 'Gala Lírica') THEN
    RAISE NOTICE 'El bloque "Gala Lírica" ya existe para la gira %. No se insertan obras.', _id_programa;
    RETURN;
  END IF;

  -- 1) Crear bloque de repertorio "Gala Lírica"
  SELECT COALESCE(MAX(orden), 0) + 1 INTO _orden_block
  FROM programas_repertorios WHERE id_programa = _id_programa;

  INSERT INTO programas_repertorios (id_programa, nombre, orden)
  VALUES (_id_programa, 'Gala Lírica', _orden_block)
  RETURNING id INTO _block_id;

  -- 2) Resolver IDs de compositores (existentes en compositores_rows.csv / BD)
  SELECT id INTO _id_puccini      FROM compositores WHERE apellido = 'Puccini'      AND (nombre = 'Giacomo' OR (nombre IS NULL AND 'Giacomo' IS NULL)) LIMIT 1;
  SELECT id INTO _id_charbonnier  FROM compositores WHERE apellido = 'Charbonnier'  AND (nombre = 'Mauricio' OR (nombre IS NULL AND 'Mauricio' IS NULL)) LIMIT 1;
  SELECT id INTO _id_bizet        FROM compositores WHERE apellido = 'Bizet'       AND (nombre = 'Georges' OR (nombre IS NULL AND 'Georges' IS NULL)) LIMIT 1;
  SELECT id INTO _id_desconocido  FROM compositores WHERE apellido = 'Desconocido'  LIMIT 1;

  SELECT id INTO _id_catan FROM compositores WHERE apellido = 'Catan' AND (nombre = 'Daniel' OR nombre IS NULL) LIMIT 1;
  IF _id_catan IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Catan', 'Daniel') RETURNING id INTO _id_catan;
  END IF;

  SELECT id INTO _id_villanueva FROM compositores WHERE apellido = 'Villanueva' AND (nombre = 'Felipe' OR nombre IS NULL) LIMIT 1;
  IF _id_villanueva IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Villanueva', 'Felipe') RETURNING id INTO _id_villanueva;
  END IF;

  SELECT id INTO _id_grever FROM compositores WHERE apellido = 'Grever' AND (nombre = 'Maria' OR nombre = 'María' OR nombre IS NULL) LIMIT 1;
  IF _id_grever IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Grever', 'Maria') RETURNING id INTO _id_grever;
  END IF;

  -- 3) Obras con compositor y duración; orden en el bloque según esta lista
  -- 1. Puccini - Suor Angelica - Intermezzo (7:00)
  INSERT INTO obras (titulo, duracion_segundos, estado) VALUES ('Suor Angelica - Intermezzo', 420, 'Oficial') RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_puccini, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, 1);

  -- 2. Puccini - O mío bambbino Caro (3:00)
  INSERT INTO obras (titulo, duracion_segundos, estado) VALUES ('O mío bambbino Caro', 180, 'Oficial') RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_puccini, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, 2);

  -- 3. Puccini - Un bel di vedremo. (5:00)
  INSERT INTO obras (titulo, duracion_segundos, estado) VALUES ('Un bel di vedremo.', 300, 'Oficial') RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_puccini, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, 3);

  -- 4. Puccini - intermezzo a definir (6:00)
  INSERT INTO obras (titulo, duracion_segundos, estado) VALUES ('Intermezzo a definir', 360, 'Oficial') RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_puccini, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, 4);

  -- 5. Mauricio Charbonnier - Voces latinoamericanas... (11:00)
  INSERT INTO obras (titulo, duracion_segundos, estado) VALUES ('Voces latinoamericanas ciclo de canciones para soprano y orquesta estreno mundial.', 660, 'Oficial') RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_charbonnier, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, 5);

  -- 6. Mauricio Charbonnier - Intermezzo a definir (sin duración)
  INSERT INTO obras (titulo, duracion_segundos, estado) VALUES ('Intermezzo a definir', NULL, 'Oficial') RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_charbonnier, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, 6);

  -- 7. Daniel Catan - Adiós Giovanni... (2:19)
  INSERT INTO obras (titulo, duracion_segundos, estado) VALUES ('Adiós Giovanni ópera la hija de rapaccini.', 139, 'Oficial') RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_catan, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, 7);

  -- 8. Felipe Villanueva - De mi amor al sol hermoso... (5:28)
  INSERT INTO obras (titulo, duracion_segundos, estado) VALUES ('De mi amor al sol hermoso ópera keofar', 328, 'Oficial') RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_villanueva, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, 8);

  -- 9. Bizet - obertura carmen (3:47)
  INSERT INTO obras (titulo, duracion_segundos, estado) VALUES ('Obertura Carmen', 227, 'Oficial') RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_bizet, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, 9);

  -- 10. Bizet - L'habanera (2:02)
  INSERT INTO obras (titulo, duracion_segundos, estado) VALUES ('L''habanera', 122, 'Oficial') RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_bizet, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, 10);

  -- 11. Bizet - L'umile ancella (3:30)
  INSERT INTO obras (titulo, duracion_segundos, estado) VALUES ('L''umile ancella', 210, 'Oficial') RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_bizet, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, 11);

  -- 12. (compositor no especificado) - intermezzo a definir
  INSERT INTO obras (titulo, duracion_segundos, estado) VALUES ('Intermezzo a definir', NULL, 'Oficial') RETURNING id INTO _id_obra;
  IF _id_desconocido IS NOT NULL THEN
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_desconocido, 'compositor');
  END IF;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, 12);

  -- 13. Maria Grever - dime que si (3:00)
  INSERT INTO obras (titulo, duracion_segundos, estado) VALUES ('Dime que si', 180, 'Oficial') RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_grever, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, 13);

  -- 14. Maria Grever - despedida (4:00)
  INSERT INTO obras (titulo, duracion_segundos, estado) VALUES ('Despedida', 240, 'Oficial') RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_grever, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, 14);

END $$;
