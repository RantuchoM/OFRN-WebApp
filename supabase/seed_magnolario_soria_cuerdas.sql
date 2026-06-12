-- Magnolario: 18 obras arr. cuerdas (Hernán Soria) → catálogo obras + particellas Drive
-- Origen: https://drive.google.com/drive/folders/1UVRL4K3OWhuNGkbqVz3-xdFTk27RHhJq
-- Generado: 2026-06-12
-- Idempotente por título con sufijo [Magnolario] + arreglador Soria.

DO $$
DECLARE
  _id_soria bigint;
  _id_obra bigint;
  _id_comp_Salg_n_Horacio bigint;
  _id_comp_Gallo_R_ bigint;
  _id_comp_Gonz_lez_R_ bigint;
  _id_comp_Chazarreta_L_ bigint;
  _id_comp_Medina_M_ bigint;
  _id_comp_Fal_Juan bigint;
  _id_comp_Pignoni_R_ bigint;
  _id_comp_Palavecino_S_ bigint;
  _id_comp_Bardi_A_ bigint;
  _id_comp_Barrionuevo_R_ bigint;
  _id_comp_Arduh_J_ bigint;
  _id_comp_Spasiuk_Ch_ bigint;
  _id_comp_Torres_D_ bigint;
  _id_comp_Rivella_H_ bigint;
  _id_comp_D_az_D_ bigint;
  _id_comp_Soria_Hern_n bigint;
  _id_comp_Novo_I_ bigint;
  _id_comp_Cabral_P_ bigint;
  _id_comp_Ciriaco_O_ bigint;
  _id_comp_Bayardo_L_ bigint;
BEGIN
  -- Arreglador Hernán Soria
  SELECT id INTO _id_soria FROM compositores WHERE apellido = 'Soria' AND nombre = 'Hernán' LIMIT 1;
  IF _id_soria IS NULL THEN
    RAISE EXCEPTION 'Compositor arreglador Hernán Soria no encontrado en compositores';
  END IF;

  SELECT id INTO _id_comp_Salg_n_Horacio FROM compositores WHERE apellido = 'Salgán' AND (nombre = 'Horacio' OR (nombre IS NULL AND 'Horacio' IS NULL)) LIMIT 1;
  IF _id_comp_Salg_n_Horacio IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Salgán', 'Horacio') RETURNING id INTO _id_comp_Salg_n_Horacio;
  END IF;

  SELECT id INTO _id_comp_Gallo_R_ FROM compositores WHERE apellido = 'Gallo' AND (nombre = 'R.' OR (nombre IS NULL AND 'R.' IS NULL)) LIMIT 1;
  IF _id_comp_Gallo_R_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Gallo', 'R.') RETURNING id INTO _id_comp_Gallo_R_;
  END IF;

  SELECT id INTO _id_comp_Gonz_lez_R_ FROM compositores WHERE apellido = 'González' AND (nombre = 'R.' OR (nombre IS NULL AND 'R.' IS NULL)) LIMIT 1;
  IF _id_comp_Gonz_lez_R_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('González', 'R.') RETURNING id INTO _id_comp_Gonz_lez_R_;
  END IF;

  SELECT id INTO _id_comp_Chazarreta_L_ FROM compositores WHERE apellido = 'Chazarreta' AND (nombre = 'L.' OR (nombre IS NULL AND 'L.' IS NULL)) LIMIT 1;
  IF _id_comp_Chazarreta_L_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Chazarreta', 'L.') RETURNING id INTO _id_comp_Chazarreta_L_;
  END IF;

  SELECT id INTO _id_comp_Medina_M_ FROM compositores WHERE apellido = 'Medina' AND (nombre = 'M.' OR (nombre IS NULL AND 'M.' IS NULL)) LIMIT 1;
  IF _id_comp_Medina_M_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Medina', 'M.') RETURNING id INTO _id_comp_Medina_M_;
  END IF;

  SELECT id INTO _id_comp_Fal_Juan FROM compositores WHERE apellido = 'Falú' AND (nombre = 'Juan' OR (nombre IS NULL AND 'Juan' IS NULL)) LIMIT 1;
  IF _id_comp_Fal_Juan IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Falú', 'Juan') RETURNING id INTO _id_comp_Fal_Juan;
  END IF;

  SELECT id INTO _id_comp_Pignoni_R_ FROM compositores WHERE apellido = 'Pignoni' AND (nombre = 'R.' OR (nombre IS NULL AND 'R.' IS NULL)) LIMIT 1;
  IF _id_comp_Pignoni_R_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Pignoni', 'R.') RETURNING id INTO _id_comp_Pignoni_R_;
  END IF;

  SELECT id INTO _id_comp_Palavecino_S_ FROM compositores WHERE apellido = 'Palavecino' AND (nombre = 'S.' OR (nombre IS NULL AND 'S.' IS NULL)) LIMIT 1;
  IF _id_comp_Palavecino_S_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Palavecino', 'S.') RETURNING id INTO _id_comp_Palavecino_S_;
  END IF;

  SELECT id INTO _id_comp_Bardi_A_ FROM compositores WHERE apellido = 'Bardi' AND (nombre = 'A.' OR (nombre IS NULL AND 'A.' IS NULL)) LIMIT 1;
  IF _id_comp_Bardi_A_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Bardi', 'A.') RETURNING id INTO _id_comp_Bardi_A_;
  END IF;

  SELECT id INTO _id_comp_Barrionuevo_R_ FROM compositores WHERE apellido = 'Barrionuevo' AND (nombre = 'R.' OR (nombre IS NULL AND 'R.' IS NULL)) LIMIT 1;
  IF _id_comp_Barrionuevo_R_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Barrionuevo', 'R.') RETURNING id INTO _id_comp_Barrionuevo_R_;
  END IF;

  SELECT id INTO _id_comp_Arduh_J_ FROM compositores WHERE apellido = 'Arduh' AND (nombre = 'J.' OR (nombre IS NULL AND 'J.' IS NULL)) LIMIT 1;
  IF _id_comp_Arduh_J_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Arduh', 'J.') RETURNING id INTO _id_comp_Arduh_J_;
  END IF;

  SELECT id INTO _id_comp_Spasiuk_Ch_ FROM compositores WHERE apellido = 'Spasiuk' AND (nombre = 'Ch.' OR (nombre IS NULL AND 'Ch.' IS NULL)) LIMIT 1;
  IF _id_comp_Spasiuk_Ch_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Spasiuk', 'Ch.') RETURNING id INTO _id_comp_Spasiuk_Ch_;
  END IF;

  SELECT id INTO _id_comp_Torres_D_ FROM compositores WHERE apellido = 'Torres' AND (nombre = 'D.' OR (nombre IS NULL AND 'D.' IS NULL)) LIMIT 1;
  IF _id_comp_Torres_D_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Torres', 'D.') RETURNING id INTO _id_comp_Torres_D_;
  END IF;

  SELECT id INTO _id_comp_Rivella_H_ FROM compositores WHERE apellido = 'Rivella' AND (nombre = 'H.' OR (nombre IS NULL AND 'H.' IS NULL)) LIMIT 1;
  IF _id_comp_Rivella_H_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Rivella', 'H.') RETURNING id INTO _id_comp_Rivella_H_;
  END IF;

  SELECT id INTO _id_comp_D_az_D_ FROM compositores WHERE apellido = 'Díaz' AND (nombre = 'D.' OR (nombre IS NULL AND 'D.' IS NULL)) LIMIT 1;
  IF _id_comp_D_az_D_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Díaz', 'D.') RETURNING id INTO _id_comp_D_az_D_;
  END IF;

  SELECT id INTO _id_comp_Soria_Hern_n FROM compositores WHERE apellido = 'Soria' AND (nombre = 'Hernán' OR (nombre IS NULL AND 'Hernán' IS NULL)) LIMIT 1;
  IF _id_comp_Soria_Hern_n IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Soria', 'Hernán') RETURNING id INTO _id_comp_Soria_Hern_n;
  END IF;

  SELECT id INTO _id_comp_Novo_I_ FROM compositores WHERE apellido = 'Novo' AND (nombre = 'I.' OR (nombre IS NULL AND 'I.' IS NULL)) LIMIT 1;
  IF _id_comp_Novo_I_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Novo', 'I.') RETURNING id INTO _id_comp_Novo_I_;
  END IF;

  SELECT id INTO _id_comp_Cabral_P_ FROM compositores WHERE apellido = 'Cabral' AND (nombre = 'P.' OR (nombre IS NULL AND 'P.' IS NULL)) LIMIT 1;
  IF _id_comp_Cabral_P_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Cabral', 'P.') RETURNING id INTO _id_comp_Cabral_P_;
  END IF;

  SELECT id INTO _id_comp_Ciriaco_O_ FROM compositores WHERE apellido = 'Ciriaco' AND (nombre = 'O.' OR (nombre IS NULL AND 'O.' IS NULL)) LIMIT 1;
  IF _id_comp_Ciriaco_O_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Ciriaco', 'O.') RETURNING id INTO _id_comp_Ciriaco_O_;
  END IF;

  SELECT id INTO _id_comp_Bayardo_L_ FROM compositores WHERE apellido = 'Bayardo' AND (nombre = 'L.' OR (nombre IS NULL AND 'L.' IS NULL)) LIMIT 1;
  IF _id_comp_Bayardo_L_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Bayardo', 'L.') RETURNING id INTO _id_comp_Bayardo_L_;
  END IF;

  -- A Fuego Lento [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'A Fuego Lento [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'A Fuego Lento [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1XMEhgfAdrkeeDMCdEXLSOpNdMfed1Myx'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Salg_n_Horacio, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1UquOdhQLOUpkEs0WwRAh0GqM6K93fDpq/view?usp=drivesdk","description":"SCORE - A Fuego Lento (Salgán, H). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1YDmyiLjjr9hsc4dXJYngvbA3Hx1nZ3pB/view?usp=drivesdk","description":"Viola - A Fuego Lento (Salgán, H). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Y6ULQ-aZ-9hftZnY6BsN8GSdfN-tU8bw/view?usp=drivesdk","description":"Violín 1 - A Fuego Lento (Salgán, H). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1YDF5mOQtav6AQu_jcwrcDkzPkWBsFrc0/view?usp=drivesdk","description":"Violín 2 - A Fuego Lento (Salgán, H). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1YdDWJqJjsSOZT9irzPe7q6wft8wuA02f/view?usp=drivesdk","description":"Violoncello - A Fuego Lento (Salgán, H). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): A Fuego Lento [Magnolario]';
  END IF;

  -- Barrio Sur [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Barrio Sur [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Barrio Sur [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1WMMcKhNkEQZNWyRFKTkQ1iNmONfVNt5Z'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Gallo_R_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1W53sI_rABmKYq-mQFr7xqB0_f9Yv2NnN/view?usp=drivesdk","description":"SCORE - Barrio Sur (Gallo, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Z59vpnbgBF0-YZsfRHKSuPOIBDVnkv_i/view?usp=drivesdk","description":"Viola - Barrio Sur (Gallo, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1YyVgEvDib5bdBuVVqXxPaKIXjvCnAi7p/view?usp=drivesdk","description":"Violín 1 - Barrio Sur (Gallo, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Z-WH-VG7uanw5V_QxRhv9VI-iwkWfMWj/view?usp=drivesdk","description":"Violín 2 - Barrio Sur (Gallo, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ZCaANgwcL0LAbDpCfQ_SlW3hZu3MxrVw/view?usp=drivesdk","description":"Violoncello - Barrio Sur (Gallo, R). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Barrio Sur [Magnolario]';
  END IF;

  -- Chacarera Vidalera [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Chacarera Vidalera [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Chacarera Vidalera [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1WRyOJ7HOiCtpBe0ko10vYXbhj2K-OuDU'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Gonz_lez_R_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1W1j-T8Klakw7ZpmB5FUn-Qp4JOwY5BtD/view?usp=drivesdk","description":"SCORE - Chacarera Vidalera (González, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1ZNJ6Cg7_TqdsyZb5hOIxzdX_82i3u_sb/view?usp=drivesdk","description":"Viola - Chacarera Vidalera (González, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ZG1zaebsTdbROUdTGVo36eoVfnRnIXah/view?usp=drivesdk","description":"Violín 1 - Chacarera Vidalera (González, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1ZIzwlCzbs6ekNqMhR4yLXfVBTt8KC5Qg/view?usp=drivesdk","description":"Violín 2 - Chacarera Vidalera (González, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ZOCiezVQo48-OIEiV5pmygQo0D1ch3Dp/view?usp=drivesdk","description":"Violoncello - Chacarera Vidalera (González, R). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Chacarera Vidalera [Magnolario]';
  END IF;

  -- Chayera [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Chayera [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Chayera [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1WbQgcW7jPeLK13SdF-8AnjYrFS8LKXBB'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Chazarreta_L_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1VpoeL83p2mbAoisqWcJwtctf2ReAZpyd/view?usp=drivesdk","description":"SCORE - Chayera (Chazarreta, L). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1ZarlbzZQaSKdscRl-aSeV8pUOe9Oae3g/view?usp=drivesdk","description":"Viola - Chayera (Chazarreta, L). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ZUobtPFpsGLDx-4iwgpOwolORcekRCvN/view?usp=drivesdk","description":"Violín 1 - Chayera (Chazarreta, L). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1ZZ9_auOSh_uOq-xoIuD9wq8e_usRqOc0/view?usp=drivesdk","description":"Violín 2 - Chayera (Chazarreta, L). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ZdUsZCD6qebAd5x8l-0kSqzk0bGpX6ti/view?usp=drivesdk","description":"Violoncello - Chayera (Chazarreta, L). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Chayera [Magnolario]';
  END IF;

  -- Comienzo [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Comienzo [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Comienzo [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1XYBgHKSAOogvOj6lsXgiL57q9W3D_YPZ'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Medina_M_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1UWf8pj3RxvC5zW7ErzWXq3hbmBlxq89f/view?usp=drivesdk","description":"SCORE - Comienzo (Medina, M). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Xe8xaBPKC5B3tmqGA9llqSNQas0mrRq9/view?usp=drivesdk","description":"Viola - Comienzo (Medina, M). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Xa3dX8m9dk6IDJNIojix1iRouPZr32gY/view?usp=drivesdk","description":"Violín 1 - Comienzo (Medina, M). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Xcu0Pzj52-AqAkOeJp9r8OLUiOhNyi0E/view?usp=drivesdk","description":"Violín 2 - Comienzo (Medina, M). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1XgIqjkfxy6n9gisphgBHHlFGpSa2589Z/view?usp=drivesdk","description":"Violoncello - Comienzo (Medina, M). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Comienzo [Magnolario]';
  END IF;

  -- Como el aire [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Como el aire [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Como el aire [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1XGL3iY-T8EcFI3e7mXit3pUuzNw7lWZ-'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Fal_Juan, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Uv-GeAHhVwFM0UUDcBKWhbb98htrxI6M/view?usp=drivesdk","description":"SCORE - Como el aire (Falú, J). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1_xwJxzjReRYtz83OEmxwPH_WzwPs1mZJ/view?usp=drivesdk","description":"Viola - Como el aire (Falú, J). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1_zVSs5HQ9_SUreV97w4NwBrI3fB7v500/view?usp=drivesdk","description":"Violín 1 - Como el aire (Falú, J). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1_yTn5JLFoIKaxoo8dzCeIzIVyrI_j01s/view?usp=drivesdk","description":"Violín 2 - Como el aire (Falú, J). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1_xGLcxkPaR0AlO4uD01PcuNTEStcCEsG/view?usp=drivesdk","description":"Violoncello - Como el aire (Falú, J). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Como el aire [Magnolario]';
  END IF;

  -- Coyita mía [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Coyita mía [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Coyita mía [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1X7scnAK71d3woLJV0HMq2K11vsOad7kR'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Pignoni_R_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Uxf3w-PfDLPMrM3qFopwh7rE2ryMhf57/view?usp=drivesdk","description":"SCORE - Coyita Mía (Pignoni, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1aCRK4Nc817zP0C_CkSpBow86gcQN3M90/view?usp=drivesdk","description":"Viola - Coyita Mía (Pignoni, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1aDsfQp8QTHLS6rOxWjRP30g3axFKlhQz/view?usp=drivesdk","description":"Violín 1 - Coyita Mía (Pignoni, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1aD-0fnM0jsliX7hZGEAJuZulL3XCzps1/view?usp=drivesdk","description":"Violín 2 - Coyita Mía (Pignoni, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1a8xpu4aL6catCpzAAQgGZ7itFtJoRB83/view?usp=drivesdk","description":"Violoncello - Coyita Mía (Pignoni, R). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Coyita mía [Magnolario]';
  END IF;

  -- El Misquishitu [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'El Misquishitu [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'El Misquishitu [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1XRS80xyF_aQCSeOD3QEfuGGkjtJB0Kaa'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Palavecino_S_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Uq_JgfWJceEt1qKTJlJ4qtpLgq_SDUaD/view?usp=drivesdk","description":"SCORE - El Misquishitu (Palavecino, S). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Y5MaywX7TEJnWTOryaFwBcYYhrCJYshS/view?usp=drivesdk","description":"Viola - El Misquishitu (Palavecino, S). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Y1tEdlIoAeT4P2reyVdsEt3oRxXbiCEE/view?usp=drivesdk","description":"Violín 1 - El Misquishitu (Palavecino, S). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Y2BB9AeZmj37iMYnIm9Cgsvspu81D3Dy/view?usp=drivesdk","description":"Violín 2 - El Misquishitu (Palavecino, S). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Y5rMO1u35mlPmE9DaKysA6v6VIfS_bHL/view?usp=drivesdk","description":"Violoncello - El Misquishitu (Palavecino, S). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): El Misquishitu [Magnolario]';
  END IF;

  -- Gallo Ciego [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Gallo Ciego [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Gallo Ciego [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1WgZYdeptlandSG-JTqBWyGd0Q1GwXEMB'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Bardi_A_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1VaazGYwbPYxYpZqxiZ5GQm01lbaB73cz/view?usp=drivesdk","description":"SCORE - Gallo Ciego (Bardi, A). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1_LzKa6W-HdXbiO1UGKQZh6vaSHltNHE8/view?usp=drivesdk","description":"Viola - Gallo Ciego (Bardi, A). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1_AWIU7DIInl5Hf1aoTByuo6RzC-01htX/view?usp=drivesdk","description":"Violín 1 - Gallo Ciego (Bardi, A). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1_Bt14OYQC1H0a_q9zo5Ec1wL1MGJpX72/view?usp=drivesdk","description":"Violín 2 - Gallo Ciego (Bardi, A). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1_Th0mtH2Ma6ilC7R9IcraBYitOPek7W2/view?usp=drivesdk","description":"Violoncello - Gallo Ciego (Bardi, A). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Gallo Ciego [Magnolario]';
  END IF;

  -- Huella de los Labriegos [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Huella de los Labriegos [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Huella de los Labriegos [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1WdIUYYVCj3XySpv8EQo-69b16kRn7FH7'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Barrionuevo_R_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1ViXlrTtybjaRYi-ojq19aXNC53LV5k8Z/view?usp=drivesdk","description":"SCORE - Huella de los Labriegos (Barrionuevo, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1ZqF9J3iwCr5IZL6LsPoCOQyhNTyUIptA/view?usp=drivesdk","description":"Viola - Huella de los Labriegos (Barrionuevo, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ZhAuAs-QktF13h1Cd64mHAEEqcSir5ez/view?usp=drivesdk","description":"Violín 1 - Huella de los Labriegos (Barrionuevo, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Zp4tQszvgxRjGixpUK92FqjvlIpyoXjR/view?usp=drivesdk","description":"Violín 2 - Huella de los Labriegos (Barrionuevo, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ZxPsKFigt4-70YpdlVUaCjmbqpTG-M-m/view?usp=drivesdk","description":"Violoncello - Huella de los Labriegos (Barrionuevo, R). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Huella de los Labriegos [Magnolario]';
  END IF;

  -- Los Pinta [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Los Pinta [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Los Pinta [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1WJDWJgMIatZ1v8QMaxL-stOBDKQmV9dM'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Arduh_J_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1W74y9HCl402m9R0J7GtJOq4ELySTsB5J/view?usp=drivesdk","description":"SCORE - Los Pinta (Arduh, J). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1YuYNE9DZFdcaD8sVOt0QBlJhmuq_x75U/view?usp=drivesdk","description":"Viola - Los Pinta (Arduh, J). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Ygy-HWQ6oWITLyyXKh3BUFtUJRTWy1iH/view?usp=drivesdk","description":"Violín 1 - Los Pinta (Arduh, J). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Yj9bm_KVAnSFBbt9VAj3eSFpYQ631pmr/view?usp=drivesdk","description":"Violín 2 - Los Pinta (Arduh, J). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Yub8gzB2fxlufDpacVc1Q81I0NPpp7bP/view?usp=drivesdk","description":"Violoncello - Los Pinta (Arduh, J). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Los Pinta [Magnolario]';
  END IF;

  -- Mi pueblo, mi casa, la soledad [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Mi pueblo, mi casa, la soledad [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Mi pueblo, mi casa, la soledad [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Vc - Str',
      'https://drive.google.com/drive/folders/1WzfqeddxO7l6oKNwD79kLmXpYl-nuRrt'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Spasiuk_Ch_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1VNr3WhqjRwlQeAbCicxTVXJ4GjBwwCT1/view?usp=drivesdk","description":"SCORE - Mi pueblo, mi casa, la soledad (Spasiuk, Ch). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1ajvJ0Wh5JXPCco8dUha6Oz_KnNTC7AFC/view?usp=drivesdk","description":"Viola - Mi pueblo, mi casa, la soledad (Spasiuk, Ch). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1UZaCpOcSqHdZtlV6jN0L6bjdymQ0m-tJ/view?usp=drivesdk","description":"Violín 1 - Mi pueblo, mi casa, la soledad (Spasiuk, Ch). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1arCR52QheTt5J9NQaRyQrk9R093YzNP1/view?usp=drivesdk","description":"Violín 2 - Mi pueblo, mi casa, la soledad (Spasiuk, Ch). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ag8DzAkIpXZWZZSW4dfg2VOahIcR9-vB/view?usp=drivesdk","description":"Violoncello - Mi pueblo, mi casa, la soledad (Spasiuk, Ch). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello SOLO', '[{"url":"https://drive.google.com/file/d/1ahCDNVKCQLnHWVQsznYuXhZArtQgZ3IC/view?usp=drivesdk","description":"Violoncello SOLO - Mi pueblo, mi casa, la soledad (Spasiuk, Ch). Magnolario - arr. Soria, H.pdf"}]', true);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Mi pueblo, mi casa, la soledad [Magnolario]';
  END IF;

  -- Milonga para el Rata [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Milonga para el Rata [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Milonga para el Rata [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1X5dc4HpISiJdbl7OWdNGca5nfFJKqRBm'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Torres_D_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1V0uf4z2lvYrdyWjMio1FuvQJJsvt6mmp/view?usp=drivesdk","description":"SCORE - Milonga para el Rata (Torres, D). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1aVIuLx6YICmY5IbCZxFLzsQu5kHI3PKw/view?usp=drivesdk","description":"Viola - Milonga para el Rata (Torres, D). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1aWUbf-NH69IjtkvegPp6ai6cYJiEfl3g/view?usp=drivesdk","description":"Violín 1 - Milonga para el Rata (Torres, D). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1aW9lb3F6ZE9Kn0KlrOhN40CKWNleNl2h/view?usp=drivesdk","description":"Violín 2 - Milonga para el Rata (Torres, D). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1aIYiBd-r7T24mC4mb3gf9eQFPefdHPk2/view?usp=drivesdk","description":"Violoncello - Milonga para el Rata (Torres, D). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Milonga para el Rata [Magnolario]';
  END IF;

  -- Nacida en agua de guerra [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Nacida en agua de guerra [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Nacida en agua de guerra [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1Wo2ZvtA3dByaDgG2cZRO78t_MGX1cCxG'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Rivella_H_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_D_az_D_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1VSB6Pg6JUCCmJD67DYGgrqq6TeO16K3B/view?usp=drivesdk","description":"SCORE - Nacida en agua de guerra (Rivella, H-Díaz,D). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1_fwWtCP0OgL61sv7WBD2-mR4s2JmXOVA/view?usp=drivesdk","description":"Viola - Nacida en agua de guerra (Rivella, H-Díaz,D). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1_cqCzIUQERe3ZYlE4xlQcsra4tO2mm5f/view?usp=drivesdk","description":"Violín 1 - Nacida en agua de guerra (Rivella, H-Díaz,D). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1_degF_4MqOVLHqYGja_tAVm1zdTROTSe/view?usp=drivesdk","description":"Violín 2 - Nacida en agua de guerra (Rivella, H-Díaz,D). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1_g22EFPGuMZz6dz2_xPCN49D86qaSqtG/view?usp=drivesdk","description":"Violoncello - Nacida en agua de guerra (Rivella, H-Díaz,D). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Nacida en agua de guerra [Magnolario]';
  END IF;

  -- P'al Turco Deb [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'P''al Turco Deb [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'P''al Turco Deb [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1XVhNZT8Bq_t6C_sr9tJR_AtFa6c1G_c1'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Pignoni_R_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Um2LpBIE5vQc7X5XKcdbYo7fUl3idXYw/view?usp=drivesdk","description":"SCORE - P''al Turco Deb (Pignoni, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1XwWCIFVgJ_Gtq4olGtUXrCeRece-Uv6j/view?usp=drivesdk","description":"Viola - P''al Turco Deb (Pignoni, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1XkZRExcm7YBgyKqSLmNn4LnhERr9Kkjd/view?usp=drivesdk","description":"Violín 1 - P''al Turco Deb (Pignoni, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Xo_BD8Be55Mr2Tu03wXoa_jhlPyhuCzK/view?usp=drivesdk","description":"Violín 2 - P''al Turco Deb (Pignoni, R). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Y-OVGSBfnwiOXZVzRGEKLKEjTe5wVtEJ/view?usp=drivesdk","description":"Violoncello - P''al Turco Deb (Pignoni, R). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): P''al Turco Deb [Magnolario]';
  END IF;

  -- Se acaba la mufa [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Se acaba la mufa [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Se acaba la mufa [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1X5T4Tas5z6ujx1I3zCa9peJNcnLkzBPN'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Soria_Hern_n, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1VLRNggbjDmJSgvzLWtCLLWWXI0oP4Z2C/view?usp=drivesdk","description":"SCORE - Se acaba la mufa (Soria, H). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1aa8pS6CtK_m_XAHDpzVY4RH9_A6PNqDj/view?usp=drivesdk","description":"Viola - Se acaba la mufa (Soria, H). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1afx0tcRpJwyZy2NUZxLzkAOLFjTUx1Bi/view?usp=drivesdk","description":"Violín 1 - Se acaba la mufa (Soria, H). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1aetSrTQjCeXxxjCqWjqwSeUt_MLdx6Uq/view?usp=drivesdk","description":"Violín 2 - Se acaba la mufa (Soria, H). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1aYMYI_zhtFR96LVreIeVujKR90jM1ZWd/view?usp=drivesdk","description":"Violoncello - Se acaba la mufa (Soria, H). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Se acaba la mufa [Magnolario]';
  END IF;

  -- Serenatero de Bombos [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Serenatero de Bombos [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Serenatero de Bombos [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1Wz2cIP1psWp407wXuoZTiVX5rmh-yAQb'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Novo_I_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Cabral_P_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1VS3jSbPDqC3n9w9eZihqSvBTVeQ6L5TY/view?usp=drivesdk","description":"SCORE - Serenatero de Bombos (Novo, I-Cabral, P). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1_ne1SAXAQp_CUt7aJ_voDibLC0M-F0Dr/view?usp=drivesdk","description":"Viola - Serenatero de Bombos (Novo, I-Cabral, P). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1_grz-dvW2KCCB_l4dAJL6KX0qZ4ZnrGq/view?usp=drivesdk","description":"Violín 1 - Serenatero de Bombos (Novo, I-Cabral, P). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1_izm2kzfI-s2iA7x6EnAkHMWldNNmsID/view?usp=drivesdk","description":"Violín 2 - Serenatero de Bombos (Novo, I-Cabral, P). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1_vEvlsO1v2d0oOmnBjx5Yx5noOIQ2qLF/view?usp=drivesdk","description":"Violoncello - Serenatero de Bombos (Novo, I-Cabral, P). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Serenatero de Bombos [Magnolario]';
  END IF;

  -- Viaje a Argüello [Magnolario]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Viaje a Argüello [Magnolario]' AND oc.id_compositor = _id_soria
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Viaje a Argüello [Magnolario]',
      _id_soria,
      NULL,
      'Oficial',
      'Magnolario — arr. cuerdas (Hernán Soria)',
      'Str',
      'https://drive.google.com/drive/folders/1WidqNt4-zFPgA4bN37O-8ecAYd4qYAT5'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Ciriaco_O_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Bayardo_L_, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_soria, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_soria
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1VWTv58A5oBIwa8gDBFmw6S7sh5N4worV/view?usp=drivesdk","description":"SCORE - Viaje a Argüello (Ciriaco, O-Bayardo, L). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1_XikwiYXsemC2n1X5koO27WzAvonhhTh/view?usp=drivesdk","description":"Viola - Viaje a Argüello (Ciriaco, O-Bayardo, L). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1_V__U1DmUZL8zT4GHTL2R0edHrG4d07K/view?usp=drivesdk","description":"Violín 1 - Viaje a Argüello (Ciriaco, O-Bayardo, L). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1_WcVWukcTkIM1B6ebDx3APP9WWvprWfg/view?usp=drivesdk","description":"Violín 2 - Viaje a Argüello (Ciriaco, O-Bayardo, L). Magnolario - arr. Soria, H.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1_cZHQhjj0Q-wB6o3u3VtLoRiIfiaO-hX/view?usp=drivesdk","description":"Violoncello - Viaje a Argüello (Ciriaco, O-Bayardo, L). Magnolario - arr. Soria, H.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Viaje a Argüello [Magnolario]';
  END IF;

END $$;
