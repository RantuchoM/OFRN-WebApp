-- Walsh Manuelita + Disney Favorites (Para acomodar) → gira 170
-- Generado: 2026-09-07

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Walsh_Mar_a_Elena bigint;
  _id_comp_Varios_ bigint;
BEGIN
  SELECT id INTO _id_comp_Walsh_Mar_a_Elena FROM compositores WHERE apellido = 'Walsh' AND (nombre = 'María Elena' OR (nombre IS NULL AND 'María Elena' IS NULL)) LIMIT 1;
  IF _id_comp_Walsh_Mar_a_Elena IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Walsh', 'María Elena') RETURNING id INTO _id_comp_Walsh_Mar_a_Elena;
  END IF;

  SELECT id INTO _id_comp_Varios_ FROM compositores WHERE apellido = 'Varios' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_comp_Varios_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Varios', NULL) RETURNING id INTO _id_comp_Varios_;
  END IF;

  -- Manuelita, la tortuga
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Manuelita, la tortuga'
      AND o.observaciones = 'Para acomodar — Walsh, M.E. - Manuelita, la tortuga. Cuarteto de maderas (Flauta 1, Oboe, Clarinete Bb, Fagot). Sibelius.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Manuelita, la tortuga',
      NULL,
      1962,
      183,
      'Oficial',
      'Para acomodar — Walsh, M.E. - Manuelita, la tortuga. Cuarteto de maderas (Flauta 1, Oboe, Clarinete Bb, Fagot). Sibelius.',
      '1.1.1.1 - 0.0.0.0',
      'https://drive.google.com/open?id=1-8whIq8YVQr--4E51o2Dft6Orm7QfQc5'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Walsh_Mar_a_Elena, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1UU_kWthKWoKuRex0rP2bfp8winOdyqcE/view?usp=drivesdk","description":"Clarinete Bb - Manuelita, la tortuga - Walsh, M.E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1a5Y6CmIbuv6apeIwTVO6Ld9NXGxaLALP/view?usp=drivesdk","description":"Fagot - Manuelita, la tortuga - Walsh, M.E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1lxWbXPzu4Vwc4AsajrEUPybw1Xg-rsik/view?usp=drivesdk","description":"Flauta 1 - Manuelita, la tortuga - Walsh, M.E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1ALV65Tl3gE6naeM7KyOJFbVPthvuwgml/view?usp=drivesdk","description":"Oboe - Manuelita, la tortuga - Walsh, M.E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/11duejMn3bP7q8-TI27_m5sqQPl0KVGSX/view?usp=drivesdk","description":"SCORE - Manuelita, la tortuga - Walsh, M.E.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Manuelita, la tortuga';
  END IF;

  -- Disney Favorites [quinteto de vientos]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Disney Favorites [quinteto de vientos]'
      AND o.observaciones = 'Para acomodar — Varios - Disney Favorites [quinteto de vientos]. Medley MuseScore (Flauta, Oboe, Clarinete Bb, Corno F, Fagot).'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Disney Favorites [quinteto de vientos]',
      NULL,
      NULL,
      211,
      'Oficial',
      'Para acomodar — Varios - Disney Favorites [quinteto de vientos]. Medley MuseScore (Flauta, Oboe, Clarinete Bb, Corno F, Fagot).',
      '1.1.1.1 - 1.0.0.0',
      'https://drive.google.com/open?id=1vBQIAqhX9LWzajNuH7EaB0tA31oQ5m9I'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Varios_, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/19YN06Pi9crXv5_w20Ztm2YdEt0kQ-A33/view?usp=drivesdk","description":"Clarinete Bb - Disney Favorites [quinteto de vientos] - Varios.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1VksW3Jjrp4iNEeBo7t4bKkrRQeZk02Jw/view?usp=drivesdk","description":"Corno F - Disney Favorites [quinteto de vientos] - Varios.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/11gnBVh3kI2ttrHdLFyDzCzbkCoNM35uQ/view?usp=drivesdk","description":"Fagot - Disney Favorites [quinteto de vientos] - Varios.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1mIq4sWpxs2mFmLir2YEiGZ_emWW9oR1f/view?usp=drivesdk","description":"Flauta - Disney Favorites [quinteto de vientos] - Varios.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/14Zn37a805uz1NQaCDYW7qbI48o7YWqVe/view?usp=drivesdk","description":"Oboe - Disney Favorites [quinteto de vientos] - Varios.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1xSog0p6Gjc4WViaqTCQg35zn9iqjBFG0/view?usp=drivesdk","description":"SCORE - Disney Favorites [quinteto de vientos] - Varios.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Disney Favorites [quinteto de vientos]';
  END IF;

END $$;
