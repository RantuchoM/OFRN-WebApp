-- Haydn Hob.VIIe1 + Bach BWV 1067 (Para acomodar)
-- Generado: 2026-08-17

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Haydn_Franz_Joseph bigint;
  _id_comp_Bach_Johann_Sebastian bigint;
  _id_arr_Rondeau_Michel bigint;
BEGIN
  SELECT id INTO _id_comp_Haydn_Franz_Joseph FROM compositores WHERE apellido = 'Haydn' AND (nombre = 'Franz Joseph' OR (nombre IS NULL AND 'Franz Joseph' IS NULL)) LIMIT 1;
  IF _id_comp_Haydn_Franz_Joseph IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Haydn', 'Franz Joseph') RETURNING id INTO _id_comp_Haydn_Franz_Joseph;
  END IF;

  SELECT id INTO _id_comp_Bach_Johann_Sebastian FROM compositores WHERE apellido = 'Bach' AND (nombre = 'Johann Sebastian' OR (nombre IS NULL AND 'Johann Sebastian' IS NULL)) LIMIT 1;
  IF _id_comp_Bach_Johann_Sebastian IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Bach', 'Johann Sebastian') RETURNING id INTO _id_comp_Bach_Johann_Sebastian;
  END IF;

  SELECT id INTO _id_arr_Rondeau_Michel FROM compositores WHERE apellido = 'Rondeau' AND (nombre = 'Michel' OR (nombre IS NULL AND 'Michel' IS NULL)) LIMIT 1;
  IF _id_arr_Rondeau_Michel IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Rondeau', 'Michel') RETURNING id INTO _id_arr_Rondeau_Michel;
  END IF;

  -- Concierto para Trompeta en Mib M
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Concierto para Trompeta en Mib M' AND oc.id_compositor = _id_arr_Rondeau_Michel
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Concierto para Trompeta en Mib M',
      _id_arr_Rondeau_Michel,
      1796,
      864,
      'Oficial',
      'Para acomodar — Haydn, J. - Concierto para Trompeta en Mib M. Hob.VIIe1. Ed. Michel Rondeau. Falta particella de trompeta solo (está en score y en .MUS del zip IMSLP).',
      '2.2.0.2 - 2.2.0.0 - Timp - Str',
      'https://drive.google.com/open?id=1MDj3YECQ8VAMOW0b-IUw-oJIBnxQp4r3'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Haydn_Franz_Joseph, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Rondeau_Michel, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Rondeau_Michel
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1SNBvK4yWfE8eIQ9LoK5KnsiheHkaEhKR/view?usp=drivesdk","description":"Contrabajo - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/14utrCDEaYnNIGVFUZ7YU-DMsD6fucFj2/view?usp=drivesdk","description":"Corno F 1 - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1OxoaV6-gGHBQKfZe1e3hvCbD_LM9C1M5/view?usp=drivesdk","description":"Corno F 2 - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/176F3cunR1fjChqzLAnbqwibYQJpxEqcj/view?usp=drivesdk","description":"Fagot 1 - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/15QeAIvN6iNBgwV8twMPyBUce54N2F4bY/view?usp=drivesdk","description":"Fagot 2 - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1kDx0Qjc8sfNAmwCZU8yEMxQGtzvdiF61/view?usp=drivesdk","description":"Flauta 1 - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1M0RQOoJ8O_Cxl5zB_WImxTT_sHMmc_EG/view?usp=drivesdk","description":"Flauta 2 - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1Y356uskiB56w9CcFNfDGZIk2wJuwuP5w/view?usp=drivesdk","description":"Oboe 1 - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1uP1TEwG3ebXkCa6N38lu0cEERUE984Or/view?usp=drivesdk","description":"Oboe 2 - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1-z3Zw0V6SluOW9JxZe7Fj6k-4Tp-lUBW/view?usp=drivesdk","description":"Perc Timbal - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1YyGyUuLFtjmI9TJUS8u0Wq_nxOmMXZDi/view?usp=drivesdk","description":"SCORE - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1JcgzqfNBpJ5zdUqUl49myYSSQ7FHWdK1/view?usp=drivesdk","description":"Trompeta 1 - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1gVyz9GuQz-1QuND8ZTccsDipf2Frn1oa/view?usp=drivesdk","description":"Trompeta 2 - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1fu3mb1xNIRHUde43QfjZAHvJxBVdTWZ9/view?usp=drivesdk","description":"Viola - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/11jcxI391AxNpJtZ2XqFJuSWsrWjfLvaK/view?usp=drivesdk","description":"Violín 1 - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1QPmzv8YN59RG5kkYo9tKvXsNnKFK8wJl/view?usp=drivesdk","description":"Violín 2 - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1KnA_vDl-s-r37p4vTPYk1NAnJhkXGaXV/view?usp=drivesdk","description":"Violoncello - Hob.VIIe1. Concierto para Trompeta en Mib M - Haydn, J.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Concierto para Trompeta en Mib M';
  END IF;

  -- Suite Orquestal no. 2 en Si menor
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Suite Orquestal no. 2 en Si menor'
      AND o.observaciones = 'Para acomodar — Bach, J.S. - Suite Orquestal no. 2 en Si menor, BWV 1067. Flauta solista; continuo de teclado mapeado a Piano.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Suite Orquestal no. 2 en Si menor',
      NULL,
      1738,
      1202,
      'Oficial',
      'Para acomodar — Bach, J.S. - Suite Orquestal no. 2 en Si menor, BWV 1067. Flauta solista; continuo de teclado mapeado a Piano.',
      'Fl - Key - Str',
      'https://drive.google.com/open?id=1Zikakmr-j9RzTHWsp9nDP8-7szJrf5NG'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Bach_Johann_Sebastian, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1xMm_gA9Jh8P66EUWmr6DH4jNkLd1ZDvB/view?usp=drivesdk","description":"Flauta - BWV 1067. Suite Orquestal no. 2 en Si menor - Bach, J.S.pdf"}]', true);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1eYGA_b6TmLr6X-g9_X5Ei224zThCE1eD/view?usp=drivesdk","description":"Piano - BWV 1067. Suite Orquestal no. 2 en Si menor - Bach, J.S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1tPSPbpmIio0uaXNt79qNsA-zg1Api6mj/view?usp=drivesdk","description":"SCORE - BWV 1067. Suite Orquestal no. 2 en Si menor - Bach, J.S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1x5zU-Bu0VqujQaEGpxx1BFWpNugTVDUI/view?usp=drivesdk","description":"Viola - BWV 1067. Suite Orquestal no. 2 en Si menor - Bach, J.S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1K5yefLbwYaYlN7MAJ14R5qvnxRHk8_M9/view?usp=drivesdk","description":"Violín 1 - BWV 1067. Suite Orquestal no. 2 en Si menor - Bach, J.S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1MwQ9bDEaNKb6GVAAKmRCX6-qdzNerR93/view?usp=drivesdk","description":"Violín 2 - BWV 1067. Suite Orquestal no. 2 en Si menor - Bach, J.S.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/192DfoXT2OBzrUCsknGd7fBZfUCdgp9ik/view?usp=drivesdk","description":"Violoncello - BWV 1067. Suite Orquestal no. 2 en Si menor - Bach, J.S.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Suite Orquestal no. 2 en Si menor';
  END IF;

END $$;
