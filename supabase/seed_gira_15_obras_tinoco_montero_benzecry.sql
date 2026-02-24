-- Inserta 3 obras (Luis Tinoco, Claudia Montero, Esteban Benzecry) en el bloque de repertorio
-- ya existente de la gira (programa) ID = 15. Incluye nota interna en observaciones.
-- Respeta schema: obras (titulo, duracion_segundos, observaciones, estado), obras_compositores, repertorio_obras.

DO $$
DECLARE
  _id_programa bigint := 15;
  _block_id bigint;
  _next_orden int;
  _id_obra bigint;
  _id_tinoco bigint;
  _id_montero bigint;
  _id_benzecry bigint;
BEGIN
  -- 1) Obtener el primer bloque de repertorio existente para la gira 15 (por orden)
  SELECT id INTO _block_id
  FROM programas_repertorios
  WHERE id_programa = _id_programa
  ORDER BY orden ASC
  LIMIT 1;

  IF _block_id IS NULL THEN
    RAISE EXCEPTION 'No existe ningún bloque de repertorio para la gira (id_programa) %. Crear uno antes de ejecutar este script.', _id_programa;
  END IF;

  -- Siguiente orden en el bloque
  SELECT COALESCE(MAX(orden), 0) + 1 INTO _next_orden
  FROM repertorio_obras
  WHERE id_repertorio = _block_id;

  -- 2) Resolver o crear compositores
  SELECT id INTO _id_tinoco FROM compositores WHERE apellido = 'Tinoco' AND (nombre = 'Luis' OR nombre IS NULL) LIMIT 1;
  IF _id_tinoco IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Tinoco', 'Luis') RETURNING id INTO _id_tinoco;
  END IF;

  SELECT id INTO _id_montero FROM compositores WHERE apellido = 'Montero' AND (nombre = 'Claudia' OR nombre IS NULL) LIMIT 1;
  IF _id_montero IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Montero', 'Claudia') RETURNING id INTO _id_montero;
  END IF;

  SELECT id INTO _id_benzecry FROM compositores WHERE apellido = 'Benzecry' AND (nombre = 'Esteban' OR nombre IS NULL) LIMIT 1;
  IF _id_benzecry IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Benzecry', 'Esteban') RETURNING id INTO _id_benzecry;
  END IF;

  -- 3) Luis Tinoco - Chant for East Timor - Cuerdas - 13:00 (780 s)
  INSERT INTO obras (titulo, duracion_segundos, estado, observaciones)
  VALUES ('Chant for East Timor', 780, 'Solicitud', 'Cuerdas')
  RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_tinoco, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, _next_orden);
  _next_orden := _next_orden + 1;

  -- 4) Claudia Montero - Mágica y Misteriosa - Arpa - Cuerdas - 13:00 (780 s)
  INSERT INTO obras (titulo, duracion_segundos, estado, observaciones)
  VALUES ('Mágica y Misteriosa', 780, 'Solicitud', 'Arpa - Cuerdas')
  RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_montero, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, _next_orden);
  _next_orden := _next_orden + 1;

  -- 5) Esteban Benzecry - Bajo la constelación del hombre pájaro (2016) - Arpa, flauta, clarinete y cuerdas - 14:00 (840 s)
  INSERT INTO obras (titulo, duracion_segundos, estado, observaciones)
  VALUES ('Bajo la constelación del hombre pájaro (2016)', 840, 'Solicitud', 'Arpa, flauta, clarinete y cuerdas')
  RETURNING id INTO _id_obra;
  INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_benzecry, 'compositor');
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (_block_id, _id_obra, _next_orden);

END $$;
