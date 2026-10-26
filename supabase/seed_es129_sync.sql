-- ES 04/26 / gira 129 — obras nuevas desde Para acomodar + repertorio
-- Generado: 2026-10-26

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Williams_Alberto bigint;
  _id_comp_Barbieri_Antonio_Mar_a bigint;
  _id_comp_Esnaola_Juan_Pedro bigint;
  _id_comp_Soro_Enrique bigint;
  _id_comp_Cervantes_Ignacio bigint;
  _id_comp_Revueltas_Silvestre bigint;
  _id_comp_Piazzolla_Astor bigint;
  _id_arr_Montgomery_Lourdes bigint;
  _id_arr_Aponte_Cupido_Gerardo bigint;
  _id_arr_Kremer_Gidon bigint;
BEGIN
  SELECT id INTO _id_comp_Williams_Alberto FROM compositores WHERE apellido = 'Williams' AND (nombre = 'Alberto' OR (nombre IS NULL AND 'Alberto' IS NULL)) LIMIT 1;
  IF _id_comp_Williams_Alberto IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Williams', 'Alberto') RETURNING id INTO _id_comp_Williams_Alberto;
  END IF;

  SELECT id INTO _id_comp_Barbieri_Antonio_Mar_a FROM compositores WHERE apellido = 'Barbieri' AND (nombre = 'Antonio María' OR (nombre IS NULL AND 'Antonio María' IS NULL)) LIMIT 1;
  IF _id_comp_Barbieri_Antonio_Mar_a IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Barbieri', 'Antonio María') RETURNING id INTO _id_comp_Barbieri_Antonio_Mar_a;
  END IF;

  SELECT id INTO _id_comp_Esnaola_Juan_Pedro FROM compositores WHERE apellido = 'Esnaola' AND (nombre = 'Juan Pedro' OR (nombre IS NULL AND 'Juan Pedro' IS NULL)) LIMIT 1;
  IF _id_comp_Esnaola_Juan_Pedro IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Esnaola', 'Juan Pedro') RETURNING id INTO _id_comp_Esnaola_Juan_Pedro;
  END IF;

  SELECT id INTO _id_comp_Soro_Enrique FROM compositores WHERE apellido = 'Soro' AND (nombre = 'Enrique' OR (nombre IS NULL AND 'Enrique' IS NULL)) LIMIT 1;
  IF _id_comp_Soro_Enrique IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Soro', 'Enrique') RETURNING id INTO _id_comp_Soro_Enrique;
  END IF;

  SELECT id INTO _id_comp_Cervantes_Ignacio FROM compositores WHERE apellido = 'Cervantes' AND (nombre = 'Ignacio' OR (nombre IS NULL AND 'Ignacio' IS NULL)) LIMIT 1;
  IF _id_comp_Cervantes_Ignacio IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Cervantes', 'Ignacio') RETURNING id INTO _id_comp_Cervantes_Ignacio;
  END IF;

  SELECT id INTO _id_comp_Revueltas_Silvestre FROM compositores WHERE apellido = 'Revueltas' AND (nombre = 'Silvestre' OR (nombre IS NULL AND 'Silvestre' IS NULL)) LIMIT 1;
  IF _id_comp_Revueltas_Silvestre IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Revueltas', 'Silvestre') RETURNING id INTO _id_comp_Revueltas_Silvestre;
  END IF;

  SELECT id INTO _id_comp_Piazzolla_Astor FROM compositores WHERE apellido = 'Piazzolla' AND (nombre = 'Astor' OR (nombre IS NULL AND 'Astor' IS NULL)) LIMIT 1;
  IF _id_comp_Piazzolla_Astor IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Piazzolla', 'Astor') RETURNING id INTO _id_comp_Piazzolla_Astor;
  END IF;

  SELECT id INTO _id_arr_Montgomery_Lourdes FROM compositores WHERE apellido = 'Montgomery' AND (nombre = 'Lourdes' OR (nombre IS NULL AND 'Lourdes' IS NULL)) LIMIT 1;
  IF _id_arr_Montgomery_Lourdes IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Montgomery', 'Lourdes') RETURNING id INTO _id_arr_Montgomery_Lourdes;
  END IF;

  SELECT id INTO _id_arr_Aponte_Cupido_Gerardo FROM compositores WHERE apellido = 'Aponte Cupido' AND (nombre = 'Gerardo' OR (nombre IS NULL AND 'Gerardo' IS NULL)) LIMIT 1;
  IF _id_arr_Aponte_Cupido_Gerardo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Aponte Cupido', 'Gerardo') RETURNING id INTO _id_arr_Aponte_Cupido_Gerardo;
  END IF;

  SELECT id INTO _id_arr_Kremer_Gidon FROM compositores WHERE apellido = 'Kremer' AND (nombre = 'Gidon' OR (nombre IS NULL AND 'Gidon' IS NULL)) LIMIT 1;
  IF _id_arr_Kremer_Gidon IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Kremer', 'Gidon') RETURNING id INTO _id_arr_Kremer_Gidon;
  END IF;

  -- <p>Miniatura Op. 31 Nº 3</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Miniatura Op. 31 Nº 3</p>'
      AND o.observaciones = 'Para acomodar — Williams, A. - Miniatura Op. 31 Nº 3. Orquesta de cuerdas (1892). Edición Instituto de Investigación en Etnomusicología © 2016.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Miniatura Op. 31 Nº 3</p>',
      NULL,
      1892,
      180,
      'Oficial',
      'Para acomodar — Williams, A. - Miniatura Op. 31 Nº 3. Orquesta de cuerdas (1892). Edición Instituto de Investigación en Etnomusicología © 2016.',
      'Str',
      'https://drive.google.com/open?id=1WLQkiOuy1IS4d6rq6h2ok_2d3fYRjL11'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Williams_Alberto, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1SWOCqD5z7oW6QrRx9P8LQ3xJ6fBZ6-BA/view?usp=drivesdk","description":"Contrabajo - op.31 Nº 3. Miniatura Op. 31 Nº 3 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/113hk8GsdubwHIpl2ROxGhWNZbr4670-G/view?usp=drivesdk","description":"SCORE - op.31 Nº 3. Miniatura Op. 31 Nº 3 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1s090Lbt7L0wk4B0mUnek0jg0RRsTzSGq/view?usp=drivesdk","description":"Viola - op.31 Nº 3. Miniatura Op. 31 Nº 3 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Yi6nejUFHrOaJNTm5Zq14QGUGxH7BzDF/view?usp=drivesdk","description":"Violín 1 - op.31 Nº 3. Miniatura Op. 31 Nº 3 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1km77oJsKC60OnKdNo3Oa-qjqufaE62Cr/view?usp=drivesdk","description":"Violín 2 - op.31 Nº 3. Miniatura Op. 31 Nº 3 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ceuPR5Bhtv7jqZQTlRHAHG-7qNrAaYX8/view?usp=drivesdk","description":"Violoncello - op.31 Nº 3. Miniatura Op. 31 Nº 3 - Williams, A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Miniatura Op. 31 Nº 3</p>';
  END IF;

  -- <p>Ave Maria</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Ave Maria</p>'
      AND o.observaciones = 'Para acomodar — Barbieri, A.M. - Ave Maria. Coro mixto SATB a cappella. Edición Rodrigo Ruelas Villela 2017 (IMSLP).'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Ave Maria</p>',
      NULL,
      NULL,
      240,
      'Oficial',
      'Para acomodar — Barbieri, A.M. - Ave Maria. Coro mixto SATB a cappella. Edición Rodrigo Ruelas Villela 2017 (IMSLP).',
      '',
      'https://drive.google.com/open?id=1_8AELe5DuiPvvjGkPnVqZsD8BN-g7GRc'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Barbieri_Antonio_Mar_a, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1ngpxpZUMYrBv0tPLrRAHFuzTr2bMTTbw/view?usp=drivesdk","description":"SCORE - Ave Maria - Barbieri, A.M.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Ave Maria</p>';
  END IF;

  -- <p>Minué en Fa mayor</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Minué en Fa mayor</p>'
      AND o.observaciones = 'Para acomodar — Esnaola, J.P. - Minué en Fa mayor. Orquesta de cuerdas.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Minué en Fa mayor</p>',
      NULL,
      NULL,
      180,
      'Oficial',
      'Para acomodar — Esnaola, J.P. - Minué en Fa mayor. Orquesta de cuerdas.',
      'Str',
      'https://drive.google.com/open?id=1P_nXzhDGoHpamC6e1_hitT8WcfqOayIq'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Esnaola_Juan_Pedro, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1PmPkHRXQY-n7PCLUftcnF6X3y0UQPAny/view?usp=drivesdk","description":"Contrabajo - Minué en Fa mayor - Esnaola, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/12mrCQ4lACQp48VVSVNAcjVVR-0-Tlazx/view?usp=drivesdk","description":"SCORE - Minué en Fa mayor - Esnaola, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1-O0ibwDfgpex4QKp2BFX-wYUbyVs7pYx/view?usp=drivesdk","description":"Viola - Minué en Fa mayor - Esnaola, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1eXZtelYeoYr_VItCvQT4-rzH19AoNuE7/view?usp=drivesdk","description":"Violín 1 - Minué en Fa mayor - Esnaola, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1qyhoaW4ZN6cGpzR0pNBTGgW0ys6fBCYJ/view?usp=drivesdk","description":"Violín 2 - Minué en Fa mayor - Esnaola, J.P.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1_jbsKzdYjQBTqt7VoH0HiAFuKBMKp-rV/view?usp=drivesdk","description":"Violoncello - Minué en Fa mayor - Esnaola, J.P.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Minué en Fa mayor</p>';
  END IF;

  -- <p>Andante Appassionato, Op. 2</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Andante Appassionato, Op. 2</p>'
      AND o.observaciones = 'Para acomodar — Soro, E. - Andante Appassionato, Op. 2. Partitura de piano (fuente). Pendiente arreglo para cuarteto de cuerdas.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Andante Appassionato, Op. 2</p>',
      NULL,
      NULL,
      390,
      'Oficial',
      'Para acomodar — Soro, E. - Andante Appassionato, Op. 2. Partitura de piano (fuente). Pendiente arreglo para cuarteto de cuerdas.',
      'Key',
      'https://drive.google.com/open?id=1DUMQguQ80gy5FvEbHCCSOaVU7xQ-jHYR'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Soro_Enrique, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1Y8bdkCTDFFGYQgXzyvUT5Ojz1XRdl-21/view?usp=drivesdk","description":"Piano - op.2. Andante Appassionato, Op. 2 - Soro, E.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Andante Appassionato, Op. 2</p>';
  END IF;

  -- <p>Danza Cubana Nro. 2</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '<p>Danza Cubana Nro. 2</p>' AND oc.id_compositor = _id_arr_Montgomery_Lourdes
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Danza Cubana Nro. 2</p>',
      _id_arr_Montgomery_Lourdes,
      NULL,
      180,
      'Oficial',
      'Para acomodar — Cervantes, I. - Danza Cubana Nro. 2. Arr. orquesta de cuerdas Lourdes Montgomery. Solo partes (sin SCORE).',
      'Str',
      'https://drive.google.com/open?id=1RAagxRRJXxj34-qs4mGCyADRSdHNXfJ2'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Cervantes_Ignacio, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Montgomery_Lourdes, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Montgomery_Lourdes
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1DOEmdrN_ZV_jdWo88Z2jkP-X4xbl8wMV/view?usp=drivesdk","description":"Contrabajo - Danza Cubana Nro. 2 - Cervantes, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1WBPUMQVK4VYvl0TAshIKm-qoaEacp1eg/view?usp=drivesdk","description":"Viola - Danza Cubana Nro. 2 - Cervantes, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1gh0SfE0cs0i8pRbXHwJTWhgWuvsiYCWn/view?usp=drivesdk","description":"Violín 1 - Danza Cubana Nro. 2 - Cervantes, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1io_TSDkY-LBy17TclyDrj83iApcSaOOD/view?usp=drivesdk","description":"Violín 2 - Danza Cubana Nro. 2 - Cervantes, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/102C58nXnJUkzp_m-_L0BfZAJvl7FKMoG/view?usp=drivesdk","description":"Violoncello - Danza Cubana Nro. 2 - Cervantes, I.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Danza Cubana Nro. 2</p>';
  END IF;

  -- <p>Retablo</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '<p>Retablo</p>' AND oc.id_compositor = _id_arr_Aponte_Cupido_Gerardo
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Retablo</p>',
      _id_arr_Aponte_Cupido_Gerardo,
      NULL,
      480,
      'Oficial',
      'Para acomodar — Revueltas, S. - Retablo. Texto Xavier Villaurrutia. Adaptación para quinteto de cuerdas y voz: Gerardo Aponte Cupido. La voz figura en el SCORE (no hay particella vocal separada).',
      'Str',
      'https://drive.google.com/open?id=1sG-Et4XB2wt1vaJyo2C0OfK7P1p8TNU9'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Revueltas_Silvestre, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Aponte_Cupido_Gerardo, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Aponte_Cupido_Gerardo
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1WIe4vXS6eeNboHuoH9Qs37G11Gp-g1CK/view?usp=drivesdk","description":"Contrabajo - Retablo - Revueltas, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1emVS9jjJoP2IeCyDFtS8ItQ0yu_3biPr/view?usp=drivesdk","description":"SCORE - Retablo - Revueltas, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Mtc9VxStq8zZbAsKld9BSIu2PjkKx6-v/view?usp=drivesdk","description":"Viola - Retablo - Revueltas, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Yh2j1xvt2hoiIPi10dn4MAlGliPEzAlN/view?usp=drivesdk","description":"Violín 1 - Retablo - Revueltas, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/18qdTkLYuw_o5AZQ8CGUs83vhHutrguvg/view?usp=drivesdk","description":"Violín 2 - Retablo - Revueltas, S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1lqmdrOzHesZtyv9vy2URvn6rwQQvIk5j/view?usp=drivesdk","description":"Violoncello - Retablo - Revueltas, S.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Retablo</p>';
  END IF;

  -- <p>Oblivion</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = '<p>Oblivion</p>' AND oc.id_compositor = _id_arr_Kremer_Gidon
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Oblivion</p>',
      _id_arr_Kremer_Gidon,
      NULL,
      180,
      'Oficial',
      'Para acomodar — Piazzolla, A. - Oblivion [arr. Kremer]. SCORE de cuerdas con línea solista + particella Violín Solo manuscrita (arr. Gidon Kremer). Sin partes de orquesta separadas en el PDF fuente.',
      'Vn',
      'https://drive.google.com/open?id=17jMfxEpmCT9g54XmYYfiBRiSTCHyYFQg'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Piazzolla_Astor, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Kremer_Gidon, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Kremer_Gidon
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1jXKMtzEPuvNiIHVyLuyPHo0hsHb12IXu/view?usp=drivesdk","description":"SCORE - Oblivion - Piazzolla, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín Solo', '[{"url":"https://drive.google.com/file/d/1gI1-CzP6FABKntLtbAIOFbfPrTXxNzle/view?usp=drivesdk","description":"Violín Solo - Oblivion - Piazzolla, A.pdf"}]', true);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Oblivion</p>';
  END IF;

END $$;


-- Gira 129 bloque «Repertorio» (id=99)
DO $$
DECLARE
  _block_id bigint := 99;
  _id_obra bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM programas_repertorios WHERE id = _block_id AND id_programa = 129) THEN
    RAISE EXCEPTION 'Bloque repertorio 99 no pertenece a gira 129';
  END IF;

  -- orden 1
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = '<p>Miniatura Op. 31 Nº 3</p>'
    AND o.observaciones = 'Para acomodar — Williams, A. - Miniatura Op. 31 Nº 3. Orquesta de cuerdas (1892). Edición Instituto de Investigación en Etnomusicología © 2016.'
  ORDER BY o.id DESC
  LIMIT 1;
  IF _id_obra IS NULL THEN
    RAISE EXCEPTION 'No se encontró obra recién sembrada: <p>Miniatura Op. 31 Nº 3</p>';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden, excluir)
    VALUES (_block_id, _id_obra, 1, false);
  ELSE
    UPDATE repertorio_obras
    SET orden = 1, excluir = false
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- orden 2
  _id_obra := 3232;
  UPDATE obras SET duracion_segundos = 180
    WHERE id = _id_obra
      AND (duracion_segundos IS NULL OR duracion_segundos = 0 OR id = 3232);
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden, excluir)
    VALUES (_block_id, _id_obra, 2, false);
  ELSE
    UPDATE repertorio_obras
    SET orden = 2, excluir = false
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- orden 3
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = '<p>Ave Maria</p>'
    AND o.observaciones = 'Para acomodar — Barbieri, A.M. - Ave Maria. Coro mixto SATB a cappella. Edición Rodrigo Ruelas Villela 2017 (IMSLP).'
  ORDER BY o.id DESC
  LIMIT 1;
  IF _id_obra IS NULL THEN
    RAISE EXCEPTION 'No se encontró obra recién sembrada: <p>Ave Maria</p>';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden, excluir)
    VALUES (_block_id, _id_obra, 3, false);
  ELSE
    UPDATE repertorio_obras
    SET orden = 3, excluir = false
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- orden 4
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = '<p>Minué en Fa mayor</p>'
    AND o.observaciones = 'Para acomodar — Esnaola, J.P. - Minué en Fa mayor. Orquesta de cuerdas.'
  ORDER BY o.id DESC
  LIMIT 1;
  IF _id_obra IS NULL THEN
    RAISE EXCEPTION 'No se encontró obra recién sembrada: <p>Minué en Fa mayor</p>';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden, excluir)
    VALUES (_block_id, _id_obra, 4, false);
  ELSE
    UPDATE repertorio_obras
    SET orden = 4, excluir = false
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- orden 5
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = '<p>Andante Appassionato, Op. 2</p>'
    AND o.observaciones = 'Para acomodar — Soro, E. - Andante Appassionato, Op. 2. Partitura de piano (fuente). Pendiente arreglo para cuarteto de cuerdas.'
  ORDER BY o.id DESC
  LIMIT 1;
  IF _id_obra IS NULL THEN
    RAISE EXCEPTION 'No se encontró obra recién sembrada: <p>Andante Appassionato, Op. 2</p>';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden, excluir)
    VALUES (_block_id, _id_obra, 5, false);
  ELSE
    UPDATE repertorio_obras
    SET orden = 5, excluir = false
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- orden 6
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
  JOIN compositores ca ON ca.id = oc.id_compositor
  WHERE o.titulo = '<p>Danza Cubana Nro. 2</p>'
    AND ca.apellido = 'Montgomery'
    AND (ca.nombre = 'Lourdes' OR ('Lourdes' IS NULL AND ca.nombre IS NULL))
  ORDER BY o.id DESC
  LIMIT 1;
  IF _id_obra IS NULL THEN
    RAISE EXCEPTION 'No se encontró obra recién sembrada: <p>Danza Cubana Nro. 2</p>';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden, excluir)
    VALUES (_block_id, _id_obra, 6, false);
  ELSE
    UPDATE repertorio_obras
    SET orden = 6, excluir = false
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- orden 7
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
  JOIN compositores ca ON ca.id = oc.id_compositor
  WHERE o.titulo = '<p>Retablo</p>'
    AND ca.apellido = 'Aponte Cupido'
    AND (ca.nombre = 'Gerardo' OR ('Gerardo' IS NULL AND ca.nombre IS NULL))
  ORDER BY o.id DESC
  LIMIT 1;
  IF _id_obra IS NULL THEN
    RAISE EXCEPTION 'No se encontró obra recién sembrada: <p>Retablo</p>';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden, excluir)
    VALUES (_block_id, _id_obra, 7, false);
  ELSE
    UPDATE repertorio_obras
    SET orden = 7, excluir = false
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- orden 8
  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
  JOIN compositores ca ON ca.id = oc.id_compositor
  WHERE o.titulo = '<p>Oblivion</p>'
    AND ca.apellido = 'Kremer'
    AND (ca.nombre = 'Gidon' OR ('Gidon' IS NULL AND ca.nombre IS NULL))
  ORDER BY o.id DESC
  LIMIT 1;
  IF _id_obra IS NULL THEN
    RAISE EXCEPTION 'No se encontró obra recién sembrada: <p>Oblivion</p>';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden, excluir)
    VALUES (_block_id, _id_obra, 8, false);
  ELSE
    UPDATE repertorio_obras
    SET orden = 8, excluir = false
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;

  -- orden 9
  _id_obra := 2925;
  UPDATE obras SET duracion_segundos = 900
    WHERE id = _id_obra
      AND (duracion_segundos IS NULL OR duracion_segundos = 0 OR id = 2925);
  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden, excluir)
    VALUES (_block_id, _id_obra, 9, false);
  ELSE
    UPDATE repertorio_obras
    SET orden = 9, excluir = false
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;
END $$;
