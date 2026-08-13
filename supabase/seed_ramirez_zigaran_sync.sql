-- Ramírez / Zigarán — Suite Mujeres Argentinas (9 archivo + 9 encargos)
-- Generado: 2026-08-13
-- Parent Drive: https://drive.google.com/drive/folders/12GOBbDTk0ScrqVy_0VT72a0e7x242GOO
-- No envía mail encargo_arreglo.

DO $$
DECLARE
  _id_obra bigint;
  _id_arr_obra bigint;
  _id_comp_Ram_rez_Ariel bigint;
  _id_comp_Tradicional_ bigint;
  _id_arr_Zigaran_Juan_Cruz bigint;
BEGIN
  SELECT id INTO _id_comp_Ram_rez_Ariel FROM compositores WHERE apellido = 'Ramírez' AND (nombre = 'Ariel' OR (nombre IS NULL AND 'Ariel' IS NULL)) LIMIT 1;
  IF _id_comp_Ram_rez_Ariel IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Ramírez', 'Ariel') RETURNING id INTO _id_comp_Ram_rez_Ariel;
  END IF;

  SELECT id INTO _id_comp_Tradicional_ FROM compositores WHERE apellido = 'Tradicional' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_Tradicional_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Tradicional', NULL) RETURNING id INTO _id_comp_Tradicional_;
  END IF;

  SELECT id INTO _id_arr_Zigaran_Juan_Cruz FROM compositores WHERE apellido = 'Zigaran' AND (nombre = 'Juan Cruz' OR (nombre IS NULL AND 'Juan Cruz' IS NULL)) LIMIT 1;
  IF _id_arr_Zigaran_Juan_Cruz IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Zigaran', 'Juan Cruz') RETURNING id INTO _id_arr_Zigaran_Juan_Cruz;
  END IF;

  -- Alfonsina y el Mar. Suite Mujeres Argentinas
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = 'Alfonsina y el Mar. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Oficial'
    AND o.observaciones LIKE '%Suite Mujeres Argentinas%'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (
      titulo, id_arreglador, anio_composicion, duracion_segundos, estado,
      observaciones, instrumentacion, link_drive
    ) VALUES (
      'Alfonsina y el Mar. <i>Suite Mujeres Argentinas</i>',
      _id_arr_Zigaran_Juan_Cruz,
      1969,
      211,
      'Oficial',
      'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Alfonsina y el Mar. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán. Partitura incluye soprano (sin particella de voz extraída).',
      'Str',
      'https://drive.google.com/drive/folders/1e0ZrqwhwT2qlwkMlEcdQzvAOn_yBshDz'
    )
    RETURNING id INTO _id_obra;
  ELSE
    UPDATE obras SET
      id_arreglador = _id_arr_Zigaran_Juan_Cruz,
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(211, duracion_segundos),
      observaciones = 'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Alfonsina y el Mar. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán. Partitura incluye soprano (sin particella de voz extraída).',
      instrumentacion = 'Str',
      link_drive = 'https://drive.google.com/drive/folders/1e0ZrqwhwT2qlwkMlEcdQzvAOn_yBshDz'
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_arr_Zigaran_Juan_Cruz, 'arreglador'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Zigaran_Juan_Cruz AND oc.rol = 'arreglador'
  );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1sGwTVvhdAOP5JUjkNboDO-eYVrfHlVzr/view?usp=drivesdk","description":"SCORE - Alfonsina y el Mar. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1onvguuDKC7UNeUdo40V9uUakFj-jGN3A/view?usp=drivesdk","description":"Viola - Alfonsina y el Mar. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1eFUCr49H3MapeMIEAMaLOAjRvjkmNEk3/view?usp=drivesdk","description":"Violín 1 - Alfonsina y el Mar. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1ge0NZw4ibtnmGzoEIHFKafZKmGSIEWNP/view?usp=drivesdk","description":"Violín 2 - Alfonsina y el Mar. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1NoNzKoEI5iyU8dnFbaKM64m3ku5XmZAR/view?usp=drivesdk","description":"Violoncello - Alfonsina y el Mar. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
  SELECT o.id INTO _id_arr_obra
  FROM obras o
  WHERE o.titulo = 'Alfonsina y el Mar. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Para arreglar'
    AND o.id_integrante_arreglador = 4340365
    AND o.fecha_esperada = '2026-09-16'
  LIMIT 1;

  IF _id_arr_obra IS NULL THEN
    INSERT INTO obras (
      titulo, anio_composicion, duracion_segundos, estado, observaciones,
      instrumentacion, fecha_esperada, id_integrante_arreglador
    ) VALUES (
      'Alfonsina y el Mar. <i>Suite Mujeres Argentinas</i>',
      1969,
      211,
      'Para arreglar',
      'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570. Además: transportar la voz de soprano a flauta en Sol, respetando lo escrito; si el cambio de tonalidad se complica, avisar.',
      'Str',
      '2026-09-16',
      4340365
    )
    RETURNING id INTO _id_arr_obra;
  ELSE
    UPDATE obras SET
      observaciones = 'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570. Además: transportar la voz de soprano a flauta en Sol, respetando lo escrito; si el cambio de tonalidad se complica, avisar.',
      instrumentacion = 'Str',
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(211, duracion_segundos)
    WHERE id = _id_arr_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_arr_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_arr_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Obra original · Alfonsina y el Mar. Suite Mujeres Argentinas', _id_obra, NULL, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.id_obra_referencia = _id_obra
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Drive · particellas (Para acomodar)', NULL, 'https://drive.google.com/drive/folders/1e0ZrqwhwT2qlwkMlEcdQzvAOn_yBshDz', 1
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.link = 'https://drive.google.com/drive/folders/1e0ZrqwhwT2qlwkMlEcdQzvAOn_yBshDz'
  );

  RAISE NOTICE 'Suite % → archivo % / encargo %', 'Alfonsina y el Mar', _id_obra, _id_arr_obra;

  -- Dorotea, La Cautiva. Suite Mujeres Argentinas
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = 'Dorotea, La Cautiva. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Oficial'
    AND o.observaciones LIKE '%Suite Mujeres Argentinas%'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (
      titulo, id_arreglador, anio_composicion, duracion_segundos, estado,
      observaciones, instrumentacion, link_drive
    ) VALUES (
      'Dorotea, La Cautiva. <i>Suite Mujeres Argentinas</i>',
      _id_arr_Zigaran_Juan_Cruz,
      1969,
      168,
      'Oficial',
      'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Dorotea, La Cautiva. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán.',
      'Str',
      'https://drive.google.com/drive/folders/12lhZCnpICbqOqVv5kuGo5CJXNM_JDCR6'
    )
    RETURNING id INTO _id_obra;
  ELSE
    UPDATE obras SET
      id_arreglador = _id_arr_Zigaran_Juan_Cruz,
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(168, duracion_segundos),
      observaciones = 'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Dorotea, La Cautiva. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán.',
      instrumentacion = 'Str',
      link_drive = 'https://drive.google.com/drive/folders/12lhZCnpICbqOqVv5kuGo5CJXNM_JDCR6'
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_arr_Zigaran_Juan_Cruz, 'arreglador'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Zigaran_Juan_Cruz AND oc.rol = 'arreglador'
  );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1CdYlpxBFNuaOx0S_e-N1mTtmaOvJzbCf/view?usp=drivesdk","description":"SCORE - Dorotea, La Cautiva. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1wO6_ePU1o4LUNUUNud3WP24oUrMy77SS/view?usp=drivesdk","description":"Viola - Dorotea, La Cautiva. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/13g-mOBAWX0xCfLFwOsav4Ba47onJZ2_f/view?usp=drivesdk","description":"Violín 1 - Dorotea, La Cautiva. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1TsaA-CO26r6cFlMARBJAYH_jTnqybFRK/view?usp=drivesdk","description":"Violín 2 - Dorotea, La Cautiva. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1DJ63o55BrBcrmVT0Gi06r-jS_Xx_arhb/view?usp=drivesdk","description":"Violoncello - Dorotea, La Cautiva. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
  SELECT o.id INTO _id_arr_obra
  FROM obras o
  WHERE o.titulo = 'Dorotea, La Cautiva. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Para arreglar'
    AND o.id_integrante_arreglador = 4340365
    AND o.fecha_esperada = '2026-09-16'
  LIMIT 1;

  IF _id_arr_obra IS NULL THEN
    INSERT INTO obras (
      titulo, anio_composicion, duracion_segundos, estado, observaciones,
      instrumentacion, fecha_esperada, id_integrante_arreglador
    ) VALUES (
      'Dorotea, La Cautiva. <i>Suite Mujeres Argentinas</i>',
      1969,
      168,
      'Para arreglar',
      'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      'Str',
      '2026-09-16',
      4340365
    )
    RETURNING id INTO _id_arr_obra;
  ELSE
    UPDATE obras SET
      observaciones = 'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      instrumentacion = 'Str',
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(168, duracion_segundos)
    WHERE id = _id_arr_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_arr_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_arr_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Obra original · Dorotea, La Cautiva. Suite Mujeres Argentinas', _id_obra, NULL, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.id_obra_referencia = _id_obra
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Drive · particellas (Para acomodar)', NULL, 'https://drive.google.com/drive/folders/12lhZCnpICbqOqVv5kuGo5CJXNM_JDCR6', 1
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.link = 'https://drive.google.com/drive/folders/12lhZCnpICbqOqVv5kuGo5CJXNM_JDCR6'
  );

  RAISE NOTICE 'Suite % → archivo % / encargo %', 'Dorotea, La Cautiva', _id_obra, _id_arr_obra;

  -- Duerme Negrito. Suite Mujeres Argentinas
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = 'Duerme Negrito. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Oficial'
    AND o.observaciones LIKE '%Suite Mujeres Argentinas%'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (
      titulo, id_arreglador, anio_composicion, duracion_segundos, estado,
      observaciones, instrumentacion, link_drive
    ) VALUES (
      'Duerme Negrito. <i>Suite Mujeres Argentinas</i>',
      _id_arr_Zigaran_Juan_Cruz,
      NULL,
      131,
      'Oficial',
      'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Duerme Negrito. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán. Partitura incluye soprano (sin particella de voz extraída).',
      'Str',
      'https://drive.google.com/drive/folders/1qImL_dIXmbThziw-QWw8bJHSfVxz-atB'
    )
    RETURNING id INTO _id_obra;
  ELSE
    UPDATE obras SET
      id_arreglador = _id_arr_Zigaran_Juan_Cruz,
      anio_composicion = COALESCE(NULL, anio_composicion),
      duracion_segundos = COALESCE(131, duracion_segundos),
      observaciones = 'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Duerme Negrito. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán. Partitura incluye soprano (sin particella de voz extraída).',
      instrumentacion = 'Str',
      link_drive = 'https://drive.google.com/drive/folders/1qImL_dIXmbThziw-QWw8bJHSfVxz-atB'
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_comp_Tradicional_, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_comp_Tradicional_ AND oc.rol = 'compositor'
  );

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_arr_Zigaran_Juan_Cruz, 'arreglador'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Zigaran_Juan_Cruz AND oc.rol = 'arreglador'
  );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Xv94M67NwLHy-_NxZcecQfGxVtXSJ1Yy/view?usp=drivesdk","description":"SCORE - Duerme Negrito. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Q_oX7BixXgNgQew2CQV4fv9UV1LGReWK/view?usp=drivesdk","description":"Viola - Duerme Negrito. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1NRzXF6V32ALadM2c4062g08co3WpNusr/view?usp=drivesdk","description":"Violín 1 - Duerme Negrito. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1F5WPwmRySFmqzkU8XBKqP3Mz1HxZqx_T/view?usp=drivesdk","description":"Violín 2 - Duerme Negrito. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1jEGGkxD3z1um6ujuJYoCgcWX_kTCJYcW/view?usp=drivesdk","description":"Violoncello - Duerme Negrito. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
  SELECT o.id INTO _id_arr_obra
  FROM obras o
  WHERE o.titulo = 'Duerme Negrito. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Para arreglar'
    AND o.id_integrante_arreglador = 4340365
    AND o.fecha_esperada = '2026-09-16'
  LIMIT 1;

  IF _id_arr_obra IS NULL THEN
    INSERT INTO obras (
      titulo, anio_composicion, duracion_segundos, estado, observaciones,
      instrumentacion, fecha_esperada, id_integrante_arreglador
    ) VALUES (
      'Duerme Negrito. <i>Suite Mujeres Argentinas</i>',
      NULL,
      131,
      'Para arreglar',
      'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      'Str',
      '2026-09-16',
      4340365
    )
    RETURNING id INTO _id_arr_obra;
  ELSE
    UPDATE obras SET
      observaciones = 'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      instrumentacion = 'Str',
      anio_composicion = COALESCE(NULL, anio_composicion),
      duracion_segundos = COALESCE(131, duracion_segundos)
    WHERE id = _id_arr_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_arr_obra, _id_comp_Tradicional_, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_arr_obra AND oc.id_compositor = _id_comp_Tradicional_ AND oc.rol = 'compositor'
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Obra original · Duerme Negrito. Suite Mujeres Argentinas', _id_obra, NULL, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.id_obra_referencia = _id_obra
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Drive · particellas (Para acomodar)', NULL, 'https://drive.google.com/drive/folders/1qImL_dIXmbThziw-QWw8bJHSfVxz-atB', 1
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.link = 'https://drive.google.com/drive/folders/1qImL_dIXmbThziw-QWw8bJHSfVxz-atB'
  );

  RAISE NOTICE 'Suite % → archivo % / encargo %', 'Duerme Negrito', _id_obra, _id_arr_obra;

  -- En Casa de Mariquita. Suite Mujeres Argentinas
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = 'En Casa de Mariquita. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Oficial'
    AND o.observaciones LIKE '%Suite Mujeres Argentinas%'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (
      titulo, id_arreglador, anio_composicion, duracion_segundos, estado,
      observaciones, instrumentacion, link_drive
    ) VALUES (
      'En Casa de Mariquita. <i>Suite Mujeres Argentinas</i>',
      _id_arr_Zigaran_Juan_Cruz,
      1969,
      153,
      'Oficial',
      'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - En Casa de Mariquita. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán.',
      'Str',
      'https://drive.google.com/drive/folders/1XM6yuBOXwIU_0eLIzKeGfBoekU2Lp8DF'
    )
    RETURNING id INTO _id_obra;
  ELSE
    UPDATE obras SET
      id_arreglador = _id_arr_Zigaran_Juan_Cruz,
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(153, duracion_segundos),
      observaciones = 'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - En Casa de Mariquita. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán.',
      instrumentacion = 'Str',
      link_drive = 'https://drive.google.com/drive/folders/1XM6yuBOXwIU_0eLIzKeGfBoekU2Lp8DF'
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_arr_Zigaran_Juan_Cruz, 'arreglador'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Zigaran_Juan_Cruz AND oc.rol = 'arreglador'
  );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1hd3XOQjq1zjIzdvYuLgfu5_hLrzdxXgU/view?usp=drivesdk","description":"SCORE - En Casa de Mariquita. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1MmgSpdKNdu9DgQJC4CRf_OEQ-lH_Wxs1/view?usp=drivesdk","description":"Viola - En Casa de Mariquita. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1RohEccSaH3vLT4HXre6NHI3xhAyF0pYS/view?usp=drivesdk","description":"Violín 1 - En Casa de Mariquita. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1ztkh_g0t1RjtvP48X-mOimt-9b4AgAJO/view?usp=drivesdk","description":"Violín 2 - En Casa de Mariquita. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1u7WxBXnIuMcpWebHl58UGxjxFSILICnZ/view?usp=drivesdk","description":"Violoncello - En Casa de Mariquita. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
  SELECT o.id INTO _id_arr_obra
  FROM obras o
  WHERE o.titulo = 'En Casa de Mariquita. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Para arreglar'
    AND o.id_integrante_arreglador = 4340365
    AND o.fecha_esperada = '2026-09-16'
  LIMIT 1;

  IF _id_arr_obra IS NULL THEN
    INSERT INTO obras (
      titulo, anio_composicion, duracion_segundos, estado, observaciones,
      instrumentacion, fecha_esperada, id_integrante_arreglador
    ) VALUES (
      'En Casa de Mariquita. <i>Suite Mujeres Argentinas</i>',
      1969,
      153,
      'Para arreglar',
      'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      'Str',
      '2026-09-16',
      4340365
    )
    RETURNING id INTO _id_arr_obra;
  ELSE
    UPDATE obras SET
      observaciones = 'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      instrumentacion = 'Str',
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(153, duracion_segundos)
    WHERE id = _id_arr_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_arr_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_arr_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Obra original · En Casa de Mariquita. Suite Mujeres Argentinas', _id_obra, NULL, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.id_obra_referencia = _id_obra
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Drive · particellas (Para acomodar)', NULL, 'https://drive.google.com/drive/folders/1XM6yuBOXwIU_0eLIzKeGfBoekU2Lp8DF', 1
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.link = 'https://drive.google.com/drive/folders/1XM6yuBOXwIU_0eLIzKeGfBoekU2Lp8DF'
  );

  RAISE NOTICE 'Suite % → archivo % / encargo %', 'En Casa de Mariquita', _id_obra, _id_arr_obra;

  -- Gringa Chaqueña. Suite Mujeres Argentinas
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = 'Gringa Chaqueña. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Oficial'
    AND o.observaciones LIKE '%Suite Mujeres Argentinas%'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (
      titulo, id_arreglador, anio_composicion, duracion_segundos, estado,
      observaciones, instrumentacion, link_drive
    ) VALUES (
      'Gringa Chaqueña. <i>Suite Mujeres Argentinas</i>',
      _id_arr_Zigaran_Juan_Cruz,
      1969,
      231,
      'Oficial',
      'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Gringa Chaqueña. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán.',
      'Str',
      'https://drive.google.com/drive/folders/1hnZY9gmJw8Ri_63ibU3ItDbujpMzuDvh'
    )
    RETURNING id INTO _id_obra;
  ELSE
    UPDATE obras SET
      id_arreglador = _id_arr_Zigaran_Juan_Cruz,
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(231, duracion_segundos),
      observaciones = 'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Gringa Chaqueña. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán.',
      instrumentacion = 'Str',
      link_drive = 'https://drive.google.com/drive/folders/1hnZY9gmJw8Ri_63ibU3ItDbujpMzuDvh'
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_arr_Zigaran_Juan_Cruz, 'arreglador'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Zigaran_Juan_Cruz AND oc.rol = 'arreglador'
  );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1_d6Xsg5KAs4gvobNDrxSLOjnEKgjUrMu/view?usp=drivesdk","description":"SCORE - Gringa Chaqueña. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Fes-kMWMivdKIRUiAsr1mY7PeDZeI22y/view?usp=drivesdk","description":"Viola - Gringa Chaqueña. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1PK1m8FXmNaUVvXpM_AElQUWFt6K20ipO/view?usp=drivesdk","description":"Violín 1 - Gringa Chaqueña. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/11CtbnYIWs4OssXcMAOM9ZRBZf_Bo8DrP/view?usp=drivesdk","description":"Violín 2 - Gringa Chaqueña. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/18IiON2-q3LPRFFRNFfNmHx4yNmf1RBFn/view?usp=drivesdk","description":"Violoncello - Gringa Chaqueña. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
  SELECT o.id INTO _id_arr_obra
  FROM obras o
  WHERE o.titulo = 'Gringa Chaqueña. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Para arreglar'
    AND o.id_integrante_arreglador = 4340365
    AND o.fecha_esperada = '2026-09-16'
  LIMIT 1;

  IF _id_arr_obra IS NULL THEN
    INSERT INTO obras (
      titulo, anio_composicion, duracion_segundos, estado, observaciones,
      instrumentacion, fecha_esperada, id_integrante_arreglador
    ) VALUES (
      'Gringa Chaqueña. <i>Suite Mujeres Argentinas</i>',
      1969,
      231,
      'Para arreglar',
      'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      'Str',
      '2026-09-16',
      4340365
    )
    RETURNING id INTO _id_arr_obra;
  ELSE
    UPDATE obras SET
      observaciones = 'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      instrumentacion = 'Str',
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(231, duracion_segundos)
    WHERE id = _id_arr_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_arr_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_arr_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Obra original · Gringa Chaqueña. Suite Mujeres Argentinas', _id_obra, NULL, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.id_obra_referencia = _id_obra
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Drive · particellas (Para acomodar)', NULL, 'https://drive.google.com/drive/folders/1hnZY9gmJw8Ri_63ibU3ItDbujpMzuDvh', 1
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.link = 'https://drive.google.com/drive/folders/1hnZY9gmJw8Ri_63ibU3ItDbujpMzuDvh'
  );

  RAISE NOTICE 'Suite % → archivo % / encargo %', 'Gringa Chaqueña', _id_obra, _id_arr_obra;

  -- Juana Azurduy. Suite Mujeres Argentinas
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = 'Juana Azurduy. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Oficial'
    AND o.observaciones LIKE '%Suite Mujeres Argentinas%'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (
      titulo, id_arreglador, anio_composicion, duracion_segundos, estado,
      observaciones, instrumentacion, link_drive
    ) VALUES (
      'Juana Azurduy. <i>Suite Mujeres Argentinas</i>',
      _id_arr_Zigaran_Juan_Cruz,
      1969,
      164,
      'Oficial',
      'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Juana Azurduy. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán. Partitura incluye soprano (sin particella de voz extraída).',
      'Str',
      'https://drive.google.com/drive/folders/1qvJzlTRqTcHQmFZ_7CdLBqwG9epCIqHR'
    )
    RETURNING id INTO _id_obra;
  ELSE
    UPDATE obras SET
      id_arreglador = _id_arr_Zigaran_Juan_Cruz,
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(164, duracion_segundos),
      observaciones = 'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Juana Azurduy. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán. Partitura incluye soprano (sin particella de voz extraída).',
      instrumentacion = 'Str',
      link_drive = 'https://drive.google.com/drive/folders/1qvJzlTRqTcHQmFZ_7CdLBqwG9epCIqHR'
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_arr_Zigaran_Juan_Cruz, 'arreglador'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Zigaran_Juan_Cruz AND oc.rol = 'arreglador'
  );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1AP7y-qmprJBpevqLTgjyxAAAI3mkLNM1/view?usp=drivesdk","description":"SCORE - Juana Azurduy. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1zg2Z7QZwD7S8dxvsT-RBxO0staK-JoyL/view?usp=drivesdk","description":"Viola - Juana Azurduy. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1gpr2ZAc_41zdYDLnyB38LAXkwlImDIK6/view?usp=drivesdk","description":"Violín 1 - Juana Azurduy. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1MDztrJ47tcyzL8GjI5GGCxeBJOG529Nf/view?usp=drivesdk","description":"Violín 2 - Juana Azurduy. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1UDkd70aMJqTPyBSBXchNCwdEkMxFa82A/view?usp=drivesdk","description":"Violoncello - Juana Azurduy. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
  SELECT o.id INTO _id_arr_obra
  FROM obras o
  WHERE o.titulo = 'Juana Azurduy. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Para arreglar'
    AND o.id_integrante_arreglador = 4340365
    AND o.fecha_esperada = '2026-09-16'
  LIMIT 1;

  IF _id_arr_obra IS NULL THEN
    INSERT INTO obras (
      titulo, anio_composicion, duracion_segundos, estado, observaciones,
      instrumentacion, fecha_esperada, id_integrante_arreglador
    ) VALUES (
      'Juana Azurduy. <i>Suite Mujeres Argentinas</i>',
      1969,
      164,
      'Para arreglar',
      'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      'Str',
      '2026-09-16',
      4340365
    )
    RETURNING id INTO _id_arr_obra;
  ELSE
    UPDATE obras SET
      observaciones = 'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      instrumentacion = 'Str',
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(164, duracion_segundos)
    WHERE id = _id_arr_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_arr_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_arr_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Obra original · Juana Azurduy. Suite Mujeres Argentinas', _id_obra, NULL, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.id_obra_referencia = _id_obra
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Drive · particellas (Para acomodar)', NULL, 'https://drive.google.com/drive/folders/1qvJzlTRqTcHQmFZ_7CdLBqwG9epCIqHR', 1
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.link = 'https://drive.google.com/drive/folders/1qvJzlTRqTcHQmFZ_7CdLBqwG9epCIqHR'
  );

  RAISE NOTICE 'Suite % → archivo % / encargo %', 'Juana Azurduy', _id_obra, _id_arr_obra;

  -- Las Cartas de Guadalupe. Suite Mujeres Argentinas
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = 'Las Cartas de Guadalupe. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Oficial'
    AND o.observaciones LIKE '%Suite Mujeres Argentinas%'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (
      titulo, id_arreglador, anio_composicion, duracion_segundos, estado,
      observaciones, instrumentacion, link_drive
    ) VALUES (
      'Las Cartas de Guadalupe. <i>Suite Mujeres Argentinas</i>',
      _id_arr_Zigaran_Juan_Cruz,
      1969,
      164,
      'Oficial',
      'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Las Cartas de Guadalupe. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán.',
      'Str',
      'https://drive.google.com/drive/folders/1myGKg4Mj608LiDOxD5bHzO3OfeEZYc3c'
    )
    RETURNING id INTO _id_obra;
  ELSE
    UPDATE obras SET
      id_arreglador = _id_arr_Zigaran_Juan_Cruz,
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(164, duracion_segundos),
      observaciones = 'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Las Cartas de Guadalupe. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán.',
      instrumentacion = 'Str',
      link_drive = 'https://drive.google.com/drive/folders/1myGKg4Mj608LiDOxD5bHzO3OfeEZYc3c'
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_arr_Zigaran_Juan_Cruz, 'arreglador'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Zigaran_Juan_Cruz AND oc.rol = 'arreglador'
  );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1UyVGNqiJn3CPeBcTmpWu1CU5nWA3Jotz/view?usp=drivesdk","description":"SCORE - Las Cartas de Guadalupe. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1gm4V1P8fNMugy5KwVnQoCCgeQ32UPf9O/view?usp=drivesdk","description":"Viola - Las Cartas de Guadalupe. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1b6bwq_0ChNcjyn_0neS4cjmEmHcJpGMU/view?usp=drivesdk","description":"Violín 1 - Las Cartas de Guadalupe. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1L6khaVotNwwssyG2On13TgPuhwcp6X6O/view?usp=drivesdk","description":"Violín 2 - Las Cartas de Guadalupe. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ADJZJcXTNToR3qihzsy4iVn7aWarM_im/view?usp=drivesdk","description":"Violoncello - Las Cartas de Guadalupe. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
  SELECT o.id INTO _id_arr_obra
  FROM obras o
  WHERE o.titulo = 'Las Cartas de Guadalupe. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Para arreglar'
    AND o.id_integrante_arreglador = 4340365
    AND o.fecha_esperada = '2026-09-16'
  LIMIT 1;

  IF _id_arr_obra IS NULL THEN
    INSERT INTO obras (
      titulo, anio_composicion, duracion_segundos, estado, observaciones,
      instrumentacion, fecha_esperada, id_integrante_arreglador
    ) VALUES (
      'Las Cartas de Guadalupe. <i>Suite Mujeres Argentinas</i>',
      1969,
      164,
      'Para arreglar',
      'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      'Str',
      '2026-09-16',
      4340365
    )
    RETURNING id INTO _id_arr_obra;
  ELSE
    UPDATE obras SET
      observaciones = 'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      instrumentacion = 'Str',
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(164, duracion_segundos)
    WHERE id = _id_arr_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_arr_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_arr_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Obra original · Las Cartas de Guadalupe. Suite Mujeres Argentinas', _id_obra, NULL, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.id_obra_referencia = _id_obra
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Drive · particellas (Para acomodar)', NULL, 'https://drive.google.com/drive/folders/1myGKg4Mj608LiDOxD5bHzO3OfeEZYc3c', 1
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.link = 'https://drive.google.com/drive/folders/1myGKg4Mj608LiDOxD5bHzO3OfeEZYc3c'
  );

  RAISE NOTICE 'Suite % → archivo % / encargo %', 'Las Cartas de Guadalupe', _id_obra, _id_arr_obra;

  -- Manuela, La Tucumana. Suite Mujeres Argentinas
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = 'Manuela, La Tucumana. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Oficial'
    AND o.observaciones LIKE '%Suite Mujeres Argentinas%'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (
      titulo, id_arreglador, anio_composicion, duracion_segundos, estado,
      observaciones, instrumentacion, link_drive
    ) VALUES (
      'Manuela, La Tucumana. <i>Suite Mujeres Argentinas</i>',
      _id_arr_Zigaran_Juan_Cruz,
      1969,
      159,
      'Oficial',
      'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Manuela, La Tucumana. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán.',
      'Str',
      'https://drive.google.com/drive/folders/1Yap07db3fPuFW32G_Kk439jRLJduHWep'
    )
    RETURNING id INTO _id_obra;
  ELSE
    UPDATE obras SET
      id_arreglador = _id_arr_Zigaran_Juan_Cruz,
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(159, duracion_segundos),
      observaciones = 'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Manuela, La Tucumana. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán.',
      instrumentacion = 'Str',
      link_drive = 'https://drive.google.com/drive/folders/1Yap07db3fPuFW32G_Kk439jRLJduHWep'
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_arr_Zigaran_Juan_Cruz, 'arreglador'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Zigaran_Juan_Cruz AND oc.rol = 'arreglador'
  );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1vtva5T6zCGdXLLl_Mc6eua6T_OULr61Q/view?usp=drivesdk","description":"SCORE - Manuela, La Tucumana. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1ZkE8ggzGflMT0WoWR-gTR6R_laoJpzJK/view?usp=drivesdk","description":"Viola - Manuela, La Tucumana. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1_uWZnQQThPOpw9ZPeAfrG3gPJkQfI89t/view?usp=drivesdk","description":"Violín 1 - Manuela, La Tucumana. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/14vrX3X23-oD_DzAeNYXduICL3zNWieW9/view?usp=drivesdk","description":"Violín 2 - Manuela, La Tucumana. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1cZFl-lODnx_d2QtBwaNjwyMNK38s1x8I/view?usp=drivesdk","description":"Violoncello - Manuela, La Tucumana. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
  SELECT o.id INTO _id_arr_obra
  FROM obras o
  WHERE o.titulo = 'Manuela, La Tucumana. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Para arreglar'
    AND o.id_integrante_arreglador = 4340365
    AND o.fecha_esperada = '2026-09-16'
  LIMIT 1;

  IF _id_arr_obra IS NULL THEN
    INSERT INTO obras (
      titulo, anio_composicion, duracion_segundos, estado, observaciones,
      instrumentacion, fecha_esperada, id_integrante_arreglador
    ) VALUES (
      'Manuela, La Tucumana. <i>Suite Mujeres Argentinas</i>',
      1969,
      159,
      'Para arreglar',
      'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      'Str',
      '2026-09-16',
      4340365
    )
    RETURNING id INTO _id_arr_obra;
  ELSE
    UPDATE obras SET
      observaciones = 'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      instrumentacion = 'Str',
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(159, duracion_segundos)
    WHERE id = _id_arr_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_arr_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_arr_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Obra original · Manuela, La Tucumana. Suite Mujeres Argentinas', _id_obra, NULL, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.id_obra_referencia = _id_obra
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Drive · particellas (Para acomodar)', NULL, 'https://drive.google.com/drive/folders/1Yap07db3fPuFW32G_Kk439jRLJduHWep', 1
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.link = 'https://drive.google.com/drive/folders/1Yap07db3fPuFW32G_Kk439jRLJduHWep'
  );

  RAISE NOTICE 'Suite % → archivo % / encargo %', 'Manuela, La Tucumana', _id_obra, _id_arr_obra;

  -- Rosarito Vera, Maestra. Suite Mujeres Argentinas
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = 'Rosarito Vera, Maestra. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Oficial'
    AND o.observaciones LIKE '%Suite Mujeres Argentinas%'
  LIMIT 1;

  IF _id_obra IS NULL THEN
    INSERT INTO obras (
      titulo, id_arreglador, anio_composicion, duracion_segundos, estado,
      observaciones, instrumentacion, link_drive
    ) VALUES (
      'Rosarito Vera, Maestra. <i>Suite Mujeres Argentinas</i>',
      _id_arr_Zigaran_Juan_Cruz,
      1969,
      220,
      'Oficial',
      'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Rosarito Vera, Maestra. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán.',
      'Str',
      'https://drive.google.com/drive/folders/1WE4K1nJJzGKaTrfyEiMX_9zvkNNkKhre'
    )
    RETURNING id INTO _id_obra;
  ELSE
    UPDATE obras SET
      id_arreglador = _id_arr_Zigaran_Juan_Cruz,
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(220, duracion_segundos),
      observaciones = 'Para acomodar — Ramírez-Zigarán / Suite Mujeres Argentinas — Ramírez-Zigarán - Rosarito Vera, Maestra. Suite Mujeres Argentinas. Arr. cuerdas Juan Cruz Zigarán.',
      instrumentacion = 'Str',
      link_drive = 'https://drive.google.com/drive/folders/1WE4K1nJJzGKaTrfyEiMX_9zvkNNkKhre'
    WHERE id = _id_obra;
    DELETE FROM obras_particellas WHERE id_obra = _id_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_arr_Zigaran_Juan_Cruz, 'arreglador'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Zigaran_Juan_Cruz AND oc.rol = 'arreglador'
  );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/182uyASBCf8_F4mXHlphZOkQNUogGavIy/view?usp=drivesdk","description":"SCORE - Rosarito Vera, Maestra. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1LxQBzWzEsruV_kCjx_lSurnq-SNNKaiA/view?usp=drivesdk","description":"Viola - Rosarito Vera, Maestra. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1TVCSNp-FiPF_-IiakZ1cvqUarCflOvCU/view?usp=drivesdk","description":"Violín 1 - Rosarito Vera, Maestra. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/19d0PH_PapDvZU_6Fitgu5_szkI9xaKYj/view?usp=drivesdk","description":"Violín 2 - Rosarito Vera, Maestra. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1buTH1PN2y2juC8penEdJHo-8wSLDMIi3/view?usp=drivesdk","description":"Violoncello - Rosarito Vera, Maestra. Suite Mujeres Argentinas - Ramírez-Zigarán.pdf"}]', false);
  SELECT o.id INTO _id_arr_obra
  FROM obras o
  WHERE o.titulo = 'Rosarito Vera, Maestra. <i>Suite Mujeres Argentinas</i>'
    AND o.estado = 'Para arreglar'
    AND o.id_integrante_arreglador = 4340365
    AND o.fecha_esperada = '2026-09-16'
  LIMIT 1;

  IF _id_arr_obra IS NULL THEN
    INSERT INTO obras (
      titulo, anio_composicion, duracion_segundos, estado, observaciones,
      instrumentacion, fecha_esperada, id_integrante_arreglador
    ) VALUES (
      'Rosarito Vera, Maestra. <i>Suite Mujeres Argentinas</i>',
      1969,
      220,
      'Para arreglar',
      'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      'Str',
      '2026-09-16',
      4340365
    )
    RETURNING id INTO _id_arr_obra;
  ELSE
    UPDATE obras SET
      observaciones = 'Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.',
      instrumentacion = 'Str',
      anio_composicion = COALESCE(1969, anio_composicion),
      duracion_segundos = COALESCE(220, duracion_segundos)
    WHERE id = _id_arr_obra;
  END IF;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_arr_obra, _id_comp_Ram_rez_Ariel, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_arr_obra AND oc.id_compositor = _id_comp_Ram_rez_Ariel AND oc.rol = 'compositor'
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Obra original · Rosarito Vera, Maestra. Suite Mujeres Argentinas', _id_obra, NULL, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.id_obra_referencia = _id_obra
  );

  INSERT INTO arreglos_referencias (id_obra, titulo, id_obra_referencia, link, orden)
  SELECT _id_arr_obra, 'Drive · particellas (Para acomodar)', NULL, 'https://drive.google.com/drive/folders/1WE4K1nJJzGKaTrfyEiMX_9zvkNNkKhre', 1
  WHERE NOT EXISTS (
    SELECT 1 FROM arreglos_referencias ar
    WHERE ar.id_obra = _id_arr_obra AND ar.link = 'https://drive.google.com/drive/folders/1WE4K1nJJzGKaTrfyEiMX_9zvkNNkKhre'
  );

  RAISE NOTICE 'Suite % → archivo % / encargo %', 'Rosarito Vera, Maestra', _id_obra, _id_arr_obra;

END $$;
