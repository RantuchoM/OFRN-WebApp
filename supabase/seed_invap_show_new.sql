-- Show Invap Jazz Band — altas nuevas
-- Generado: 2026-08-12

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Hancock_Herbie bigint;
  _id_comp_Young_Lester bigint;
  _id_comp_Joel_ bigint;
  _id_comp_Lema_Germ_n bigint;
  _id_arr_Lema_Germ_n bigint;
BEGIN
  SELECT id INTO _id_comp_Hancock_Herbie FROM compositores WHERE apellido = 'Hancock' AND (nombre = 'Herbie' OR (nombre IS NULL AND 'Herbie' IS NULL)) LIMIT 1;
  IF _id_comp_Hancock_Herbie IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Hancock', 'Herbie') RETURNING id INTO _id_comp_Hancock_Herbie;
  END IF;

  SELECT id INTO _id_comp_Young_Lester FROM compositores WHERE apellido = 'Young' AND (nombre = 'Lester' OR (nombre IS NULL AND 'Lester' IS NULL)) LIMIT 1;
  IF _id_comp_Young_Lester IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Young', 'Lester') RETURNING id INTO _id_comp_Young_Lester;
  END IF;

  SELECT id INTO _id_comp_Joel_ FROM compositores WHERE apellido = 'Joel' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_Joel_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Joel', NULL) RETURNING id INTO _id_comp_Joel_;
  END IF;

  SELECT id INTO _id_comp_Lema_Germ_n FROM compositores WHERE apellido = 'Lema' AND (nombre = 'Germán' OR (nombre IS NULL AND 'Germán' IS NULL)) LIMIT 1;
  IF _id_comp_Lema_Germ_n IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Lema', 'Germán') RETURNING id INTO _id_comp_Lema_Germ_n;
  END IF;

  SELECT id INTO _id_arr_Lema_Germ_n FROM compositores WHERE apellido = 'Lema' AND (nombre = 'Germán' OR (nombre IS NULL AND 'Germán' IS NULL)) LIMIT 1;
  IF _id_arr_Lema_Germ_n IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Lema', 'Germán') RETURNING id INTO _id_arr_Lema_Germ_n;
  END IF;

  -- Cantaloupe Island
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Cantaloupe Island' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (
      titulo, id_arreglador, duracion_segundos, estado, observaciones,
      instrumentacion, link_drive, id_integrante_arreglador
    ) VALUES (
      'Cantaloupe Island',
      _id_arr_Lema_Germ_n,
      73,
      'Oficial',
      'Show Invap / Jazz Band — Hancock-Lema - Cantaloupe Island',
      '0.0.0.0 - 2.1.1.0 - Perc - Key',
      'https://drive.google.com/drive/folders/1FVWqsCDApN1waW9mi8hyX0ts8BwtVB2m',
      4340365
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Hancock_Herbie, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/18BlHEw5APHrnVHohbD-y2Ep_lstgh1Dv/view?usp=drivesdk","description":"Corno F 1 - Cantaloupe Island - Hancock-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1JiVgDAYhH_ogHGuo3sPB4Sd5WP3lUoXK/view?usp=drivesdk","description":"Corno F 2 - Cantaloupe Island - Hancock-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Órgano', '[{"url":"https://drive.google.com/file/d/1aSOnxaZ6UA4nE54eutk6USZ9ta3Ve07Q/view?usp=drivesdk","description":"Órgano - Cantaloupe Island - Hancock-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1l_K6ZVelvd4owZ_kS4jXhGW9RSP0z5Ir/view?usp=drivesdk","description":"Perc Batería - Cantaloupe Island - Hancock-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1d0BQtJEBk8ZSPQnhGMKxH2hRLfCfjoDh/view?usp=drivesdk","description":"SCORE - Cantaloupe Island - Hancock-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1SRgUtm8dyvBpEF1E0o9mQBtJxpsHF8EQ/view?usp=drivesdk","description":"Trombón Bajo - Cantaloupe Island - Hancock-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/183Mj-ebMa3GrZWkiuO9t8I9mCh_oRpxz/view?usp=drivesdk","description":"Trompeta - Cantaloupe Island - Hancock-Lema.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Cantaloupe Island';
  END IF;

  -- Lester Leaps In
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Lester Leaps In' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (
      titulo, id_arreglador, duracion_segundos, estado, observaciones,
      instrumentacion, link_drive, id_integrante_arreglador
    ) VALUES (
      'Lester Leaps In',
      _id_arr_Lema_Germ_n,
      71,
      'Oficial',
      'Show Invap / Jazz Band — Young-Lema - Lester Leaps In',
      '0.0.0.0 - 2.1.1.0 - Perc',
      'https://drive.google.com/drive/folders/1igXSELxCFxSQbN1O0JQ7CBWvbR8WZ0J6',
      4340365
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Young_Lester, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/18d9CJY5XIKiwoLApo-Fr5uSUJrG00NCx/view?usp=drivesdk","description":"Corno F 1 - Lester Leaps In - Young-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1fBsvjPrKIHNlQ9u-dU6y12vjG9v5R2FI/view?usp=drivesdk","description":"Corno F 2 - Lester Leaps In - Young-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1xB6F6_1goNWYkdOL-M5VH2vzzY6bs27V/view?usp=drivesdk","description":"Perc Batería - Lester Leaps In - Young-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1knJ69kH4of6enw-w4ke1IamIWgPoUSUT/view?usp=drivesdk","description":"SCORE - Lester Leaps In - Young-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1eUuG_eA1LNv4depVVubY_sluB-ZbF8C4/view?usp=drivesdk","description":"Trombón Bajo - Lester Leaps In - Young-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1ftRHUjtfQWn9KyPLpAYRr3E3zjJSzdOQ/view?usp=drivesdk","description":"Trompeta - Lester Leaps In - Young-Lema.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Lester Leaps In';
  END IF;

  -- The Mexican Connection
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'The Mexican Connection' AND oc.id_compositor = _id_arr_Lema_Germ_n
  ) THEN
    INSERT INTO obras (
      titulo, id_arreglador, duracion_segundos, estado, observaciones,
      instrumentacion, link_drive, id_integrante_arreglador
    ) VALUES (
      'The Mexican Connection',
      _id_arr_Lema_Germ_n,
      220,
      'Oficial',
      'Show Invap / Jazz Band — Joel-Lema - The Mexican Connection',
      '0.0.0.0 - 2.1.1.0 - Perc - Key + Saxofón',
      'https://drive.google.com/drive/folders/13ScywyXUnA4tIA7Jl-kjyTEaNYIlkyGF',
      4340365
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Joel_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Lema_Germ_n, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Lema_Germ_n
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1NXGI4Gu5QHutnJBtxZDBvM1IausZhYxv/view?usp=drivesdk","description":"Corno F 1 - The Mexican Connection - Joel-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/19dSlDv0YxJqonju1hyFGab81zxhMnVDZ/view?usp=drivesdk","description":"Corno F 2 - The Mexican Connection - Joel-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Órgano', '[{"url":"https://drive.google.com/file/d/18Sl1UhLgyWOJQID6Hwbn7Crkp9yScqlC/view?usp=drivesdk","description":"Órgano - The Mexican Connection - Joel-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1jwem7EL13zIoUOC5Fn9QnJ8dU3ZHROW-/view?usp=drivesdk","description":"Perc Batería - The Mexican Connection - Joel-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1EIq59HZjGRIBtGcq-FxLBAdywxXU6dPB/view?usp=drivesdk","description":"Saxo Tenor - The Mexican Connection - Joel-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1iAaJl2PPGIRtOB5brIgE6ylM7k2b_kkM/view?usp=drivesdk","description":"SCORE - The Mexican Connection - Joel-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1X9VcexUG8J8G75bVlo9nhrHjWMbxhff_/view?usp=drivesdk","description":"Trombón Bajo - The Mexican Connection - Joel-Lema.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1F_Z6DR0d34pG1lQEKd55G9uWSSdhvUeE/view?usp=drivesdk","description":"Trompeta - The Mexican Connection - Joel-Lema.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): The Mexican Connection';
  END IF;

  -- El Vuelo del Wachinango
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'compositor'
    WHERE o.titulo = 'El Vuelo del Wachinango' AND oc.id_compositor = _id_comp_Lema_Germ_n
      AND NOT EXISTS (
        SELECT 1 FROM obras_compositores oc2
        WHERE oc2.id_obra = o.id AND oc2.rol = 'arreglador'
      )
  ) THEN
    INSERT INTO obras (
      titulo, id_arreglador, duracion_segundos, estado, observaciones,
      instrumentacion, link_drive, id_integrante_arreglador
    ) VALUES (
      'El Vuelo del Wachinango',
      NULL,
      NULL,
      'Oficial',
      'Show Invap / Jazz Band — Lema, G. - El Vuelo del Wachinango',
      '0.0.0.0 - 2.1.1.0 - Perc - Key + Saxofón',
      'https://drive.google.com/drive/folders/1vuGArbaTph0DatrE3OMqbsJJlDNv8DBe',
      NULL
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Lema_Germ_n, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/18DtA1oB-Z-epAPgj0w_LXC5e4PK77k6U/view?usp=drivesdk","description":"Corno F 1 - El Vuelo del Wachinango - Lema, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1dfP5iHNGbtT0s3v9K8r7tmSEu3Mnkzw8/view?usp=drivesdk","description":"Corno F 2 - El Vuelo del Wachinango - Lema, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Batería', '[{"url":"https://drive.google.com/file/d/1t1WudPPVW23JoaRihtVjxUcNzfTl0t8F/view?usp=drivesdk","description":"Perc Batería - El Vuelo del Wachinango - Lema, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1pD6AIXrZS69cGli2MhI-L1BD9mfGtUer/view?usp=drivesdk","description":"Piano - El Vuelo del Wachinango - Lema, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/18ck07ji2PIps-vZs6sIHONH7bkrHgr_y/view?usp=drivesdk","description":"Saxo Tenor - El Vuelo del Wachinango - Lema, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1VuIL9nmj7hHrS0MKnyFeVkNqsd2axWkJ/view?usp=drivesdk","description":"Trombón Bajo - El Vuelo del Wachinango - Lema, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/13yEpOtYOrXuBOiavhi4xr43jsnaca0Fp/view?usp=drivesdk","description":"Trompeta - El Vuelo del Wachinango - Lema, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): El Vuelo del Wachinango';
  END IF;

END $$;
