-- Split obra 3663 (Oblivion + Lo que vendrá + Escualo) en 3 encargos Para arreglar.
-- Gira 138 «Concierto de tango (Piazzolla y mas)» — bloque Repertorio 110.
-- Arreglador estándar: Lema (integrante 4340365 / compositor 198).
-- Entrega 31/10/2026. Sin mail encargo_arreglo. Idempotente.

DO $$
DECLARE
  _lema_int bigint := 4340365;
  _lema_comp bigint := 198;
  _piazzolla bigint := 264;
  _tag_tango bigint;
  _block_id bigint := 110;
  _usuario_carga bigint;
  _comentarios text :=
    'Es un pedido para el arrgelador, donde se introdusca el fagot solista reemplazando todos los solos de violoin por el fagot y logrando tambien el protagonismo en donde mas se pueda en la obra.';
  _obs text :=
    'Encargo de arreglo (Lema, 31/10/2026). Gira 138 Concierto de tango. Fagot solista: reemplazar solos de violín por fagot y protagonismo del fagot donde más se pueda.';
  _id_oblivion bigint := 3663;
  _id_lo_que bigint;
  _id_escualo bigint;
  _orden int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM obras WHERE id = _id_oblivion) THEN
    RAISE EXCEPTION 'No existe obra id=%', _id_oblivion;
  END IF;

  SELECT id_usuario_carga INTO _usuario_carga FROM obras WHERE id = _id_oblivion;

  SELECT id INTO _tag_tango FROM palabras_clave WHERE tag = 'Tango' LIMIT 1;
  IF _tag_tango IS NULL THEN
    INSERT INTO palabras_clave (tag) VALUES ('Tango') RETURNING id INTO _tag_tango;
  END IF;

  -- 1) #3663 → Oblivion (reemplaza la combinada)
  UPDATE obras SET
    titulo = 'Oblivion',
    estado = 'Para arreglar',
    anio_composicion = 1982,
    duracion_segundos = 240,
    fecha_esperada = DATE '2026-10-31',
    id_integrante_arreglador = _lema_int,
    id_arreglador = _lema_comp,
    observaciones = _obs,
    comentarios = COALESCE(NULLIF(btrim(comentarios), ''), _comentarios),
    link_youtube = COALESCE(NULLIF(btrim(link_youtube), ''), 'https://www.youtube.com/watch?v=zuyH4iq9gVM'),
    encargo_arreglo_mail_enviado_at = NULL
  WHERE id = _id_oblivion;

  -- Piazzolla compositor (ya existe en 3663; asegurar)
  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_oblivion, _piazzolla, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores
    WHERE id_obra = _id_oblivion AND id_compositor = _piazzolla AND rol = 'compositor'
  );

  DELETE FROM obras_compositores
  WHERE id_obra = _id_oblivion AND rol = 'arreglador';

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  VALUES (_id_oblivion, _lema_comp, 'arreglador');

  INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
  SELECT _id_oblivion, _tag_tango
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_palabras_clave
    WHERE id_obra = _id_oblivion AND id_palabra_clave = _tag_tango
  );

  -- Refs Oblivion
  DELETE FROM arreglos_referencias WHERE id_obra = _id_oblivion;
  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden) VALUES
    (_id_oblivion, 'Obra original · Oblivion, para Cuerdas, Pn y Band', 1019, NULL, 0),
    (_id_oblivion, 'Obra original · Oblivion, para Quinteto de Cuerdas', 1512, NULL, 1),
    (_id_oblivion, 'YouTube · Oblivion', NULL, 'https://www.youtube.com/watch?v=zuyH4iq9gVM', 2);

  -- 2) Lo que vendrá
  SELECT o.id INTO _id_lo_que
  FROM obras o
  WHERE o.titulo = 'Lo que vendrá'
    AND o.estado = 'Para arreglar'
    AND o.id_integrante_arreglador = _lema_int
    AND o.fecha_esperada = DATE '2026-10-31'
  ORDER BY o.id
  LIMIT 1;

  IF _id_lo_que IS NULL THEN
    INSERT INTO obras (
      titulo, anio_composicion, duracion_segundos, estado, observaciones, comentarios,
      fecha_esperada, id_integrante_arreglador, id_arreglador, id_usuario_carga
    ) VALUES (
      'Lo que vendrá', 1954, 240, 'Para arreglar', _obs, _comentarios,
      DATE '2026-10-31', _lema_int, _lema_comp, _usuario_carga
    )
    RETURNING id INTO _id_lo_que;
  ELSE
    UPDATE obras SET
      anio_composicion = 1954,
      duracion_segundos = 240,
      observaciones = _obs,
      comentarios = _comentarios,
      id_integrante_arreglador = _lema_int,
      id_arreglador = _lema_comp
    WHERE id = _id_lo_que;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_lo_que, _piazzolla, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores
    WHERE id_obra = _id_lo_que AND id_compositor = _piazzolla AND rol = 'compositor'
  );

  DELETE FROM obras_compositores
  WHERE id_obra = _id_lo_que AND rol = 'arreglador';

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  VALUES (_id_lo_que, _lema_comp, 'arreglador');

  INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
  SELECT _id_lo_que, _tag_tango
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_palabras_clave
    WHERE id_obra = _id_lo_que AND id_palabra_clave = _tag_tango
  );

  DELETE FROM arreglos_referencias WHERE id_obra = _id_lo_que;
  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden) VALUES
    (_id_lo_que, 'Obra original · Lo que vendrá, para Orquesta', 1105, NULL, 0),
    (_id_lo_que, 'Obra original · Lo que vendrá, para Cuerdas', 1108, NULL, 1);

  -- 3) Escualo
  SELECT o.id INTO _id_escualo
  FROM obras o
  WHERE o.titulo = 'Escualo'
    AND o.estado = 'Para arreglar'
    AND o.id_integrante_arreglador = _lema_int
    AND o.fecha_esperada = DATE '2026-10-31'
  ORDER BY o.id
  LIMIT 1;

  IF _id_escualo IS NULL THEN
    INSERT INTO obras (
      titulo, anio_composicion, duracion_segundos, estado, observaciones, comentarios,
      fecha_esperada, id_integrante_arreglador, id_arreglador, id_usuario_carga,
      link_youtube
    ) VALUES (
      'Escualo', 1979, 210, 'Para arreglar', _obs, _comentarios,
      DATE '2026-10-31', _lema_int, _lema_comp, _usuario_carga,
      'https://www.youtube.com/watch?v=T5faw91jMKY'
    )
    RETURNING id INTO _id_escualo;
  ELSE
    UPDATE obras SET
      anio_composicion = 1979,
      duracion_segundos = 210,
      observaciones = _obs,
      comentarios = _comentarios,
      id_integrante_arreglador = _lema_int,
      id_arreglador = _lema_comp,
      link_youtube = COALESCE(NULLIF(btrim(link_youtube), ''), 'https://www.youtube.com/watch?v=T5faw91jMKY')
    WHERE id = _id_escualo;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_escualo, _piazzolla, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores
    WHERE id_obra = _id_escualo AND id_compositor = _piazzolla AND rol = 'compositor'
  );

  DELETE FROM obras_compositores
  WHERE id_obra = _id_escualo AND rol = 'arreglador';

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  VALUES (_id_escualo, _lema_comp, 'arreglador');

  INSERT INTO obras_palabras_clave (id_obra, id_palabra_clave)
  SELECT _id_escualo, _tag_tango
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_palabras_clave
    WHERE id_obra = _id_escualo AND id_palabra_clave = _tag_tango
  );

  DELETE FROM arreglos_referencias WHERE id_obra = _id_escualo;
  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden) VALUES
    (_id_escualo, 'Obra original · Escualo [cuerdas]', 1517, NULL, 0),
    (_id_escualo, 'Obra original · Escualo [1.1.2.1-2.1.0.0 - Str]', 3550, NULL, 1),
    (_id_escualo, 'YouTube · Escualo', NULL, 'https://www.youtube.com/watch?v=T5faw91jMKY', 2);

  -- Repertorio gira 138 / bloque 110: Oblivion ya en orden 2; insertar las otras dos a continuación
  SELECT COALESCE(MAX(orden), 0) INTO _orden
  FROM repertorio_obras
  WHERE id_repertorio = _block_id;

  -- Asegurar Oblivion sigue en el bloque
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_oblivion
  ) THEN
    _orden := _orden + 1;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_oblivion, _orden);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_lo_que
  ) THEN
    SELECT COALESCE(MAX(orden), 0) + 1 INTO _orden
    FROM repertorio_obras WHERE id_repertorio = _block_id;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_lo_que, _orden);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_escualo
  ) THEN
    SELECT COALESCE(MAX(orden), 0) + 1 INTO _orden
    FROM repertorio_obras WHERE id_repertorio = _block_id;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (_block_id, _id_escualo, _orden);
  END IF;

  RAISE NOTICE 'Oblivion=% Lo que vendrá=% Escualo=%', _id_oblivion, _id_lo_que, _id_escualo;
END $$;
